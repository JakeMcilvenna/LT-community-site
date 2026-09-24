import { createHash, randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import {
  englishLevels,
  foreverExperienceLevels,
  foreverFaction,
  foreverGoals,
  foreverRoles,
  microphoneOptions,
  raidNights,
  wowClasses,
} from "@/data/recruitment-application";
import { verifyApplicationToken, type ApplicationTokenPayload } from "@/lib/application-token";
import { sendBotGhostApplication } from "@/lib/botghost";
import { createBotGhostVariable, type BotGhostWebhookVariable } from "@/lib/botghost-values";
import { resolveVerifiedCharacter } from "@/lib/battlenet/client";
import {
  BATTLE_NET_SESSION_COOKIE,
  readRecruitmentSession,
} from "@/lib/battlenet/session";
import { BATTLE_NET_REGIONS } from "@/lib/battlenet/types";
import { uploadRecruitmentScreenshot } from "@/lib/recruitment-screenshot";
import { isWarcraftLogsUrl } from "@/lib/recruitment-validation";
import { buildCharacterProfileLinks } from "@/lib/character-profile-links";
import { getClassColor } from "@/lib/warcraft";
import { getClassIconUrl } from "@/lib/warcraft-server";

export const runtime = "nodejs";

const MAX_SCREENSHOT_SIZE = 4 * 1024 * 1024;
const ALLOWED_SCREENSHOT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RATE_LIMIT_WINDOW = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 3;
const DUPLICATE_WINDOW = 24 * 60 * 60 * 1000;
// Temporarily disabled to allow repeat successful submissions during testing.
const DUPLICATE_SUBMISSION_LIMIT_ENABLED = false;
const SUBMISSION_COOKIES = {
  retail: "last_try_retail_application_submitted",
  forever: "last_try_forever_application_submitted",
} as const;

const rateLimitStore = new Map<string, number[]>();
const duplicateApplicationStore = new Map<string, number>();

const requiredText = (label: string, max = 2_000) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

const contactFields = {
    battleTag: requiredText("BattleTag", 80),
    discordUsername: requiredText("Discord username", 80),
    email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address.").max(160)]),
    country: requiredText("Country", 80),
    age: z.coerce.number().int().min(13, "Enter a valid age.").max(100, "Enter a valid age."),
    referral: requiredText("Referral", 300),
    consent: z.literal("accepted"),
    website: z.string().max(0).optional(),
};

const retailFormFields = {
  ...contactFields,
  characterName: requiredText("Character name", 40),
  realm: requiredText("Realm", 80),
  className: z.enum(wowClasses),
  specialization: requiredText("Specialisation", 80),
  warcraftLogsUrl: z
    .string()
    .trim()
    .url("Enter a valid Warcraft Logs URL.")
    .max(500)
    .refine(isWarcraftLogsUrl, "Enter a Warcraft Logs URL."),
  englishAbility: z.union([z.literal(""), z.enum(englishLevels)]),
  availability: z.array(z.enum(raidNights)).max(raidNights.length),
  microphone: z.union([z.literal(""), z.enum(microphoneOptions)]),
  joinReason: requiredText("Why you want to join"),
  guildOffer: requiredText("What you can offer"),
  previousGuilds: requiredText("Previous guilds"),
  raidExperience: requiredText("Raiding experience"),
  computerDetails: requiredText("Computer details"),
  connectionDetails: requiredText("Connection details"),
};

const battleNetRetailApplicationSchema = z.object({
  applicationType: z.literal("retail"),
  characterSource: z.literal("battlenet"),
  ...retailFormFields,
  characterId: requiredText("Character ID", 100),
  realmSlug: requiredText("Realm slug", 100),
  region: z.enum(BATTLE_NET_REGIONS),
  level: z.number().int().nonnegative(),
  faction: z.string().max(80).optional(),
  itemLevel: z.number().nonnegative().optional(),
  raiderIoScore: z.number().nonnegative().optional(),
  raidProgression: z.string().max(2_000).optional(),
  raiderIoProfileUrl: z.string().url().max(500).optional(),
  battleNetVerified: z.literal(true),
  battleNetAccountId: requiredText("Battle.net account ID", 200),
  battleNetRegion: z.enum(BATTLE_NET_REGIONS),
});

const manualRetailApplicationSchema = z.object({
  applicationType: z.literal("retail"),
  characterSource: z.literal("manual"),
  ...retailFormFields,
  battleNetVerified: z.literal(false),
});

const retailApplicationSchema = z.discriminatedUnion("characterSource", [
  battleNetRetailApplicationSchema,
  manualRetailApplicationSchema,
]);

const foreverFormFields = {
  ...contactFields,
  faction: z.literal(foreverFaction),
  roleInterests: z.array(z.enum(foreverRoles)).min(1, "Choose at least one role that interests you.").max(foreverRoles.length),
  characterPlans: requiredText("Character plans", 1_200),
  gameGoals: z.array(z.enum(foreverGoals)).min(1, "Choose at least one goal.").max(foreverGoals.length),
  experienceLevel: z.enum(foreverExperienceLevels),
  typicalAvailability: requiredText("Typical availability", 1_200),
  foreverMotivation: requiredText("Forever motivation"),
  communityContribution: requiredText("Community contribution"),
};

const battleNetForeverApplicationSchema = z.object({
  applicationType: z.literal("forever"),
  battleTagSource: z.literal("battlenet"),
  battleNetVerified: z.literal(true),
  battleNetRegion: z.enum(BATTLE_NET_REGIONS),
  ...foreverFormFields,
});

const manualForeverApplicationSchema = z.object({
  applicationType: z.literal("forever"),
  battleTagSource: z.literal("manual"),
  battleNetVerified: z.literal(false),
  ...foreverFormFields,
});

const foreverApplicationSchema = z.discriminatedUnion("battleTagSource", [
  battleNetForeverApplicationSchema,
  manualForeverApplicationSchema,
]);

const applicationSchema = z.union([retailApplicationSchema, foreverApplicationSchema]);

type Application = z.infer<typeof applicationSchema>;
type RetailApplication = z.infer<typeof retailApplicationSchema>;
type BattleNetRetailApplication = z.infer<typeof battleNetRetailApplicationSchema>;
type ForeverApplication = z.infer<typeof foreverApplicationSchema>;

const getClientKey = (request: NextRequest) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";

const isRateLimited = (key: string) => {
  const now = Date.now();
  const recent = (rateLimitStore.get(key) ?? []).filter((time) => now - time < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) return true;
  rateLimitStore.set(key, [...recent, now]);
  return false;
};

const duplicateKeys = (application: Application) =>
  [application.battleTag, application.discordUsername].map((value) =>
    createHash("sha256").update(`${application.applicationType}:${value.trim().toLowerCase()}`).digest("hex"),
  );

const hasRecentDuplicate = (keys: string[]) => {
  const now = Date.now();
  for (const [key, submittedAt] of duplicateApplicationStore) {
    if (now - submittedAt >= DUPLICATE_WINDOW) duplicateApplicationStore.delete(key);
  }
  return keys.some((key) => duplicateApplicationStore.has(key));
};

const isAllowedOrigin = (request: NextRequest) => {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    const originHost = new URL(origin).host;
    const requestHost = request.headers.get("host");
    const configuredHost = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
      : undefined;
    return originHost === requestHost || originHost === configuredHost;
  } catch {
    return false;
  }
};

const safeDiscordText = (value: string) => value.replaceAll("@", "@\u200b").trim();

const truncate = (value: string, max: number) => {
  const cleaned = safeDiscordText(value) || "Not provided";
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max - 1)}…`;
};

const codeBlockText = (value: string) => value.replaceAll("`", "'");

const getCharacterLinks = (application: BattleNetRetailApplication) => {
  return buildCharacterProfileLinks(application);
};

const buildFullRetailApplication = (application: RetailApplication) => {
  const verified = application.characterSource === "battlenet";
  const rows: Array<[string, string]> = [
    ["Character source", verified ? "Battle.net" : "Manual"],
    ["BattleTag", application.battleTag],
    ["Battle.net verified", verified ? "Yes" : "No"],
    ["Battle.net account ID", verified ? application.battleNetAccountId : "Not provided"],
    ["Battle.net region", verified ? application.battleNetRegion.toUpperCase() : "Not provided"],
    ["Discord", application.discordUsername],
    ["Email", application.email || "Not provided"],
    ["Country", application.country],
    ["Age", application.age.toString()],
    ["Character", application.characterName],
    ["Realm", application.realm],
    ["Class", application.className],
    ["Specialisation", application.specialization],
    ["Character ID", verified ? application.characterId : "Not provided"],
    ["Region", verified ? application.region.toUpperCase() : "Not provided"],
    ["Level", verified ? application.level.toString() : "Not provided"],
    ["Faction", verified ? application.faction || "Not available" : "Not provided"],
    ["Item level", verified ? application.itemLevel?.toString() || "Not available" : "Not provided"],
    ["Raider.IO score", verified ? application.raiderIoScore?.toString() || "Not available" : "Not provided"],
    ["Raid progression", verified ? application.raidProgression || "Not available" : "Not provided"],
    ["Raider.IO profile", verified ? application.raiderIoProfileUrl || "Not available" : "Not provided"],
    ["Warcraft Logs", application.warcraftLogsUrl],
    ["English ability", application.englishAbility || "Not provided"],
    ["Raid availability", application.availability.join("; ") || "Not provided"],
    ["Microphone", application.microphone || "Not provided"],
    ["Why do you want to join our guild?", application.joinReason],
    ["What can you offer the guild?", application.guildOffer],
    ["Previous guilds and reasons for leaving", application.previousGuilds],
    ["Raiding experience", application.raidExperience],
    ["Computer details", application.computerDetails],
    ["Connection speed and reliability", application.connectionDetails],
    ["Referral", application.referral],
  ];

  return [
    "LAST TRY RETAIL GUILD APPLICATION",
    `Submitted: ${new Date().toISOString()}`,
    "",
    ...rows.flatMap(([label, value]) => [label.toUpperCase(), value, ""]),
  ].join("\n");
};

const buildRetailEmbed = (application: RetailApplication, screenshotFilename?: string) => {
  const classIconUrl = getClassIconUrl(application.className);
  const verified = application.characterSource === "battlenet";
  const characterLinks = verified ? getCharacterLinks(application) : null;
  const summary = [
    `${application.specialization} ${application.className}`,
    `${application.characterName}-${application.realm}`,
  ].join(" • ");

  const fields = [
    {
      name: "👤 Applicant",
      value: `\`\`\`text\nCharacter  ${verified ? "BATTLE.NET VERIFIED" : "MANUALLY ENTERED"}\nBattle.net ${verified ? "VERIFIED" : "NOT VERIFIED"}\nBattleTag  ${codeBlockText(application.battleTag)}\nDiscord    ${codeBlockText(application.discordUsername)}\nEmail      ${codeBlockText(application.email || "Not provided")}\n\`\`\``,
      inline: false,
    },
    { name: verified ? "⚔️ Verified character" : "⚔️ Manually entered character", value: verified ? `**Name:** ${application.characterName}\n**Realm:** ${application.realm} (${application.region.toUpperCase()})\n**Class:** ${application.specialization} ${application.className}\n**Level / faction:** ${application.level} / ${application.faction || "Not available"}\n**Item level:** ${application.itemLevel ?? "Not available"}\n**Mythic+ score:** ${application.raiderIoScore ?? "Not available"}\n**Raid progression:** ${application.raidProgression || "Not available"}` : `**Name:** ${application.characterName}\n**Realm:** ${application.realm}\n**Class:** ${application.specialization} ${application.className}\n\n*Ownership has not been verified through Battle.net.*`, inline: false },
    { name: "📋 Details", value: `**Country:** ${application.country}\n**Age:** ${application.age}\n**English:** ${application.englishAbility || "Not provided"}\n**Microphone:** ${application.microphone || "Not provided"}`, inline: false },
    { name: "🔗 Character links", value: verified && characterLinks ? `[Warcraft Logs](${application.warcraftLogsUrl}) • [Raider.IO](${application.raiderIoProfileUrl || characterLinks.raiderIo}) • [Armory](${characterLinks.armory})` : `[Warcraft Logs](${application.warcraftLogsUrl})`, inline: false },
    { name: "📅 Raid availability", value: application.availability.join("\n") || "Not provided", inline: false },
    { name: "💬 Why Last Try?", value: application.joinReason, inline: false },
    { name: "🤝 What they offer", value: application.guildOffer, inline: false },
    { name: "🏰 Previous guilds", value: application.previousGuilds, inline: false },
    { name: "🏆 Raiding experience", value: application.raidExperience, inline: false },
    { name: "🖥️ Computer", value: application.computerDetails, inline: false },
    { name: "🌐 Connection", value: application.connectionDetails, inline: false },
    { name: "📣 Referral", value: application.referral, inline: false },
  ];

  if (screenshotFilename) {
    fields.push({ name: "🖼️ UI Screenshot", value: "Uploaded by the applicant and shown below.", inline: false });
  }

  const fittedFields = fields.map((field) => {
    const name = truncate(field.name, 256);
    const value = truncate(field.value, 430);
    return { ...field, name, value };
  });

  return {
    title: `New application: ${truncate(application.characterName, 180)}`,
    description: `${truncate(summary, 700)}\n\nThe complete application is attached as a text file.`,
    color: Number.parseInt(getClassColor(application.className).slice(1), 16),
    fields: fittedFields,
    ...(classIconUrl ? { thumbnail: { url: classIconUrl } } : {}),
    ...(screenshotFilename ? { image: { url: `attachment://${screenshotFilename}` } } : {}),
    timestamp: new Date().toISOString(),
    footer: { text: "Last Try recruitment" },
  };
};

const buildFullForeverApplication = (application: ForeverApplication) => {
  const rows: Array<[string, string]> = [
    ["BattleTag", application.battleTag],
    ["BattleTag source", application.battleTagSource === "battlenet" ? "Battle.net verified" : "Manual"],
    ["Battle.net region", application.battleTagSource === "battlenet" ? application.battleNetRegion.toUpperCase() : "Not provided"],
    ["Discord", application.discordUsername],
    ["Email", application.email || "Not provided"],
    ["Country or timezone", application.country],
    ["Age", application.age.toString()],
    ["Guild faction", application.faction],
    ["Role interests", application.roleInterests.join("; ")],
    ["Character plans", application.characterPlans],
    ["Goals", application.gameGoals.join("; ")],
    ["Warcraft background", application.experienceLevel],
    ["Typical availability", application.typicalAvailability],
    ["What would make Forever a lasting home?", application.foreverMotivation],
    ["Community contribution", application.communityContribution],
    ["Referral", application.referral],
  ];

  return [
    "LAST TRY WARCRAFT FOREVER APPLICATION",
    `Submitted: ${new Date().toISOString()}`,
    "",
    ...rows.flatMap(([label, value]) => [label.toUpperCase(), value, ""]),
  ].join("\n");
};

const buildForeverEmbed = (application: ForeverApplication) => {
  const fields = [
    {
      name: "👤 Applicant",
      value: `\`\`\`text\nBattleTag  ${codeBlockText(application.battleTag)}\nDiscord    ${codeBlockText(application.discordUsername)}\nEmail      ${codeBlockText(application.email || "Not provided")}\n\`\`\``,
      inline: false,
    },
    { name: "🧭 Direction", value: `**Faction:** ${application.faction}\n**Roles:** ${application.roleInterests.join(", ")}\n**Background:** ${application.experienceLevel}`, inline: false },
    { name: "🗺️ Character plans", value: application.characterPlans, inline: false },
    { name: "🎯 Goals", value: application.gameGoals.join("\n"), inline: false },
    { name: "📅 Typical availability", value: application.typicalAvailability, inline: false },
    { name: "🌿 A lasting home", value: application.foreverMotivation, inline: false },
    { name: "🤝 Community contribution", value: application.communityContribution, inline: false },
    { name: "📣 Referral", value: application.referral, inline: false },
  ].map((field) => ({ ...field, name: truncate(field.name, 256), value: truncate(field.value, 520) }));

  return {
    title: `New Forever application: ${truncate(application.battleTag, 170)}`,
    description: `${truncate(application.faction, 80)} • ${truncate(application.experienceLevel, 120)}\n\nThe complete application is attached as a text file.`,
    color: 0x79c9c2,
    fields,
    timestamp: new Date().toISOString(),
    footer: { text: "Last Try · Warcraft Forever recruitment" },
  };
};

const getWebhookUrl = (value: string | undefined) => {
  if (!value?.trim()) return null;

  try {
    const webhookUrl = new URL(value.trim());
    if (webhookUrl.protocol !== "https:" || webhookUrl.hostname !== "discord.com" || !webhookUrl.pathname.startsWith("/api/webhooks/")) {
      return null;
    }
    webhookUrl.searchParams.set("wait", "true");
    return webhookUrl;
  } catch {
    return null;
  }
};

const safeFilename = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "applicant";

const safeSummaryText = (value: string, max = 160) => {
  const cleaned = safeDiscordText(value)
    .replace(/([\\`*_~|>])/g, "\\$1")
    .replace(/\s*\n\s*/g, "\n")
    .trim() || "Not provided";
  return cleaned.length <= max ? cleaned : `${cleaned.slice(0, max - 1)}…`;
};

const fitApplicationSummary = (summary: string) =>
  summary.length <= 1_950 ? summary : `${summary.slice(0, 1_949).trimEnd()}…`;

const buildRetailApplicationSummary = (
  application: RetailApplication,
  discordIdentity: ApplicationTokenPayload,
) => {
  const verified = application.characterSource === "battlenet";
  return fitApplicationSummary([
  "## Retail Application",
  "",
  `**Applicant:** <@${discordIdentity.discordUserId}>`,
  `**Discord:** ${safeSummaryText(discordIdentity.discordTag, 100)}`,
  `**Character source:** ${verified ? "Battle.net" : "Manual"}`,
  `**Battle.net:** ${verified ? "Verified" : "Not verified"}`,
  `**BattleTag:** ${safeSummaryText(application.battleTag, 80)}`,
  `**Battle.net:** ${application.battleNetVerified ? `Verified (${application.battleNetRegion?.toUpperCase()})` : "Not verified"}`,
  `**Character:** ${safeSummaryText(application.characterName, 40)}`,
  `**Realm:** ${safeSummaryText(application.realm, 80)}${verified ? ` (${application.region.toUpperCase()})` : ""}`,
  `**Class:** ${safeSummaryText(`${application.specialization} ${application.className}`, 120)}`,
  `**Level:** ${verified ? application.level : "Not provided"}`,
  `**Faction:** ${verified ? safeSummaryText(application.faction || "Not available", 80) : "Not provided"}`,
  `**Item level:** ${verified ? application.itemLevel ?? "Not available" : "Not provided"}`,
  `**Raider.IO:** ${verified ? application.raiderIoScore ?? "Not available" : "Not provided"}`,
  `**Raid progression:** ${verified ? safeSummaryText(application.raidProgression || "Not available", 180) : "Not provided"}`,
  `**Country:** ${safeSummaryText(application.country, 80)}`,
  `**Age:** ${application.age}`,
  `**English:** ${safeSummaryText(application.englishAbility || "Not provided", 40)}`,
  `**Raid availability:** ${safeSummaryText(application.availability.join(", ") || "Not provided", 140)}`,
  `**Microphone:** ${safeSummaryText(application.microphone || "Not provided", 40)}`,
  `**Warcraft Logs:** ${safeSummaryText(application.warcraftLogsUrl, 220)}`,
  "",
  "### Why are you applying?",
  safeSummaryText(application.joinReason),
  "",
  "### What can you offer?",
  safeSummaryText(application.guildOffer),
  "",
  "### Previous guilds",
  safeSummaryText(application.previousGuilds),
  "",
  "### Raiding experience",
  safeSummaryText(application.raidExperience),
  "",
  "### Computer",
  safeSummaryText(application.computerDetails, 120),
  "",
  "### Connection",
  safeSummaryText(application.connectionDetails, 120),
  "",
  `**Referral:** ${safeSummaryText(application.referral, 140)}`,
].join("\n"));
};

const buildForeverApplicationSummary = (
  application: ForeverApplication,
  discordIdentity: ApplicationTokenPayload,
) => fitApplicationSummary([
  "## Warcraft Forever Application",
  "",
  `**Applicant:** <@${discordIdentity.discordUserId}>`,
  `**Discord:** ${safeSummaryText(discordIdentity.discordTag, 100)}`,
  `**BattleTag:** ${safeSummaryText(application.battleTag, 80)}`,
  `**Country / timezone:** ${safeSummaryText(application.country, 80)}`,
  `**Age:** ${application.age}`,
  `**Faction:** ${safeSummaryText(application.faction, 40)}`,
  `**Roles:** ${safeSummaryText(application.roleInterests.join(", "), 140)}`,
  `**Goals:** ${safeSummaryText(application.gameGoals.join(", "), 180)}`,
  `**Warcraft background:** ${safeSummaryText(application.experienceLevel, 100)}`,
  "",
  "### Character plans",
  safeSummaryText(application.characterPlans, 220),
  "",
  "### Typical availability",
  safeSummaryText(application.typicalAvailability, 180),
  "",
  "### What would make Forever a lasting home?",
  safeSummaryText(application.foreverMotivation, 240),
  "",
  "### Community contribution",
  safeSummaryText(application.communityContribution, 240),
  "",
  `**Referral:** ${safeSummaryText(application.referral, 140)}`,
].join("\n"));

const buildChannelName = (
  applicationType: Application["applicationType"],
  applicantName: string,
  discordUserId: string,
) => {
  const applicantSlug = applicantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "applicant";
  return `${applicationType}-${applicantSlug}-${discordUserId.slice(-4)}`.slice(0, 90).replace(/-+$/g, "");
};

const buildBotGhostVariables = (
  application: Application,
  discordIdentity: ApplicationTokenPayload,
  submittedAt: string,
  applicationStatusId: string,
  uiImageUrl?: string,
): BotGhostWebhookVariable[] => {
  const applicantName = application.applicationType === "retail"
    ? application.characterName
    : application.battleTag.split("#")[0] || application.battleTag;
  const applicationSummary = application.applicationType === "retail"
    ? buildRetailApplicationSummary(application, discordIdentity)
    : buildForeverApplicationSummary(application, discordIdentity);

  const coreVariables = [
    createBotGhostVariable("application_type", discordIdentity.applicationType),
    createBotGhostVariable("discord_user_id", discordIdentity.discordUserId),
    createBotGhostVariable("discord_tag", discordIdentity.discordTag),
    createBotGhostVariable(
      "channel_name",
      buildChannelName(discordIdentity.applicationType, applicantName, discordIdentity.discordUserId),
    ),
    createBotGhostVariable("application_summary", applicationSummary),
    createBotGhostVariable("submitted_at", submittedAt),
    createBotGhostVariable("applicant_name", applicantName),
    createBotGhostVariable("application_status_id", applicationStatusId),
    createBotGhostVariable(
      "application_status_callback_url",
      new URL("/api/discord/application-status", process.env.NEXT_PUBLIC_SITE_URL).toString(),
    ),
  ];
  const sharedVariables = [
    createBotGhostVariable("battletag", application.battleTag),
    createBotGhostVariable("email", application.email),
    createBotGhostVariable("country", application.country),
    createBotGhostVariable("age", application.age),
    createBotGhostVariable("referral", application.referral),
  ];

  if (application.applicationType === "retail") {
    return [
      ...coreVariables,
      ...sharedVariables,
      createBotGhostVariable("character", application.characterName),
      createBotGhostVariable("realm", application.realm),
      createBotGhostVariable("class", application.className),
      createBotGhostVariable("specialisation", application.specialization),
      createBotGhostVariable("character_source", application.characterSource === "battlenet" ? "Battle.net" : "Manual"),
      createBotGhostVariable("battle_net_verified", application.battleNetVerified),
      createBotGhostVariable("battle_net_account_id", application.characterSource === "battlenet" ? application.battleNetAccountId : undefined),
      createBotGhostVariable("battle_net_region", application.characterSource === "battlenet" ? application.battleNetRegion : undefined),
      createBotGhostVariable("character_id", application.characterSource === "battlenet" ? application.characterId : undefined),
      createBotGhostVariable("realm_slug", application.characterSource === "battlenet" ? application.realmSlug : undefined),
      createBotGhostVariable("region", application.characterSource === "battlenet" ? application.region : undefined),
      createBotGhostVariable("level", application.characterSource === "battlenet" ? application.level : undefined),
      createBotGhostVariable("faction", application.characterSource === "battlenet" ? application.faction : undefined),
      createBotGhostVariable("item_level", application.characterSource === "battlenet" ? application.itemLevel : undefined),
      createBotGhostVariable("raider_io_score", application.characterSource === "battlenet" ? application.raiderIoScore : undefined),
      createBotGhostVariable("raid_progression", application.characterSource === "battlenet" ? application.raidProgression : undefined),
      createBotGhostVariable("raider_io_profile_url", application.characterSource === "battlenet" ? application.raiderIoProfileUrl : undefined),
      createBotGhostVariable("warcraft_logs", application.warcraftLogsUrl),
      createBotGhostVariable("english_ability", application.englishAbility),
      createBotGhostVariable("raid_availability", application.availability),
      createBotGhostVariable("microphone", application.microphone),
      createBotGhostVariable("join_reason", application.joinReason),
      createBotGhostVariable("guild_contribution", application.guildOffer),
      createBotGhostVariable("previous_guilds", application.previousGuilds),
      createBotGhostVariable("raid_experience", application.raidExperience),
      createBotGhostVariable("computer_details", application.computerDetails),
      createBotGhostVariable("connection_details", application.connectionDetails),
      createBotGhostVariable("class_color", getClassColor(application.className)),
      createBotGhostVariable("class_icon_url", getClassIconUrl(application.className)),
      {
        name: "ui_image_url",
        variable: "{event_ui_image_url}",
        value: uiImageUrl ?? "",
      },
    ];
  }

  return [
    ...coreVariables,
    ...sharedVariables,
    createBotGhostVariable("battle_net_verified", application.battleNetVerified),
    createBotGhostVariable("battle_net_region", application.battleTagSource === "battlenet" ? application.battleNetRegion : undefined),
    createBotGhostVariable("role_interests", application.roleInterests),
    createBotGhostVariable("character_plans", application.characterPlans),
    createBotGhostVariable("goals", application.gameGoals),
    createBotGhostVariable("experience_level", application.experienceLevel),
    createBotGhostVariable("typical_availability", application.typicalAvailability),
    createBotGhostVariable("forever_motivation", application.foreverMotivation),
    createBotGhostVariable("community_contribution", application.communityContribution),
  ];
};

const rememberSubmission = (keys: string[]) => {
  if (!DUPLICATE_SUBMISSION_LIMIT_ENABLED) return;

  const submittedAt = Date.now();
  keys.forEach((key) => duplicateApplicationStore.set(key, submittedAt));
};

const withSubmissionCookie = (response: NextResponse, cookieName: string) => {
  if (!DUPLICATE_SUBMISSION_LIMIT_ENABLED) return response;

  response.cookies.set(cookieName, "1", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: DUPLICATE_WINDOW / 1_000,
    path: "/",
  });
  return response;
};

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "This submission origin is not allowed." }, { status: 403 });
  }

  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) {
    return NextResponse.json(
      { error: "Too many applications were submitted. Please wait a few minutes and try again." },
      { status: 429 },
    );
  }

  try {
    const formData = await request.formData();
    const submittedApplicationType = formData.get("applicationType");
    const submittedCharacterSource = formData.get("characterSource");
    const submittedBattleTagSource = formData.get("battleTagSource");
    const applicationTokenValue = formData.get("applicationToken");
    let verifiedDiscordIdentity: ApplicationTokenPayload | null = null;

    if (applicationTokenValue !== null) {
      if (typeof applicationTokenValue !== "string" || !applicationTokenValue.trim()) {
        return NextResponse.json({ error: "The Discord application link is invalid or expired." }, { status: 400 });
      }

      verifiedDiscordIdentity = verifyApplicationToken(applicationTokenValue);
      if (!verifiedDiscordIdentity) {
        return NextResponse.json({ error: "The Discord application link is invalid or expired." }, { status: 400 });
      }
      if (submittedApplicationType !== verifiedDiscordIdentity.applicationType) {
        return NextResponse.json({ error: "This Discord application link is for a different application form." }, { status: 400 });
      }
    }

    const website = formData.get("website");
    if (typeof website === "string" && website.length > 0) {
      return NextResponse.json({ ok: true });
    }

    let verifiedRetail:
      | {
          battleTag: string;
          battleNetAccountId: string;
          battleNetRegion: (typeof BATTLE_NET_REGIONS)[number];
          characterId: string;
          characterName: string;
          realm: string;
          realmSlug: string;
          region: (typeof BATTLE_NET_REGIONS)[number];
          className: string;
          specialization: string;
          level: number;
          faction?: string;
          itemLevel?: number;
          raiderIoScore?: number;
          raidProgression?: string;
          raiderIoProfileUrl?: string;
          warcraftLogsUrl: string;
        }
      | undefined;

    if (submittedApplicationType === "retail" && submittedCharacterSource === "battlenet") {
      const battleNetSession = readRecruitmentSession(
        request.cookies.get(BATTLE_NET_SESSION_COOKIE)?.value,
      );
      if (!battleNetSession) {
        return NextResponse.json(
          { error: "Your Battle.net connection expired. Reconnect and choose your character again." },
          { status: 401 },
        );
      }
      const characterId = formData.get("characterId");
      if (typeof characterId !== "string" || !characterId.trim()) {
        return NextResponse.json({ error: "Choose a verified Battle.net character." }, { status: 400 });
      }

      try {
        const character = await resolveVerifiedCharacter(battleNetSession, characterId);
        if (!character) {
          return NextResponse.json(
            { error: "The selected character is no longer available on this Battle.net account." },
            { status: 409 },
          );
        }
        verifiedRetail = {
          battleTag: battleNetSession.battleTag,
          battleNetAccountId: battleNetSession.accountId,
          battleNetRegion: battleNetSession.region,
          characterId: character.id,
          characterName: character.name,
          realm: character.realmName,
          realmSlug: character.realmSlug,
          region: character.region,
          className: character.className ?? "",
          specialization: character.specialization ?? "Not available",
          level: character.level,
          faction: character.faction,
          itemLevel: character.itemLevel,
          raiderIoScore: character.raiderIoScore,
          raidProgression: character.raidProgression,
          raiderIoProfileUrl: character.raiderIoProfileUrl,
          warcraftLogsUrl: buildCharacterProfileLinks({
            region: character.region,
            realmSlug: character.realmSlug,
            characterName: character.name,
          }).warcraftLogs,
        };
      } catch (error) {
        const expired = error instanceof Error && error.message === "BATTLENET_SESSION_EXPIRED";
        return NextResponse.json(
          { error: expired ? "Your Battle.net connection expired. Reconnect and try again." : "Battle.net could not verify the selected character. Please try again shortly." },
          { status: expired ? 401 : 502 },
        );
      }
    }

    const foreverBattleNetSession = submittedApplicationType === "forever" && submittedBattleTagSource === "battlenet"
      ? readRecruitmentSession(request.cookies.get(BATTLE_NET_SESSION_COOKIE)?.value)
      : null;
    if (submittedApplicationType === "forever" && submittedBattleTagSource === "battlenet" && !foreverBattleNetSession) {
      return NextResponse.json(
        { error: "Your Battle.net connection expired. Reconnect or enter your BattleTag manually." },
        { status: 401 },
      );
    }

    const parsed = applicationSchema.safeParse({
      applicationType: submittedApplicationType,
      characterSource: submittedApplicationType === "retail" ? submittedCharacterSource : undefined,
      battleTagSource: submittedApplicationType === "forever" ? submittedBattleTagSource : undefined,
      battleTag: verifiedRetail?.battleTag ?? foreverBattleNetSession?.battleTag ?? formData.get("battleTag"),
      battleNetVerified: submittedApplicationType === "forever" ? Boolean(foreverBattleNetSession) : submittedCharacterSource === "battlenet" ? Boolean(verifiedRetail) : false,
      battleNetRegion: foreverBattleNetSession?.region ?? verifiedRetail?.battleNetRegion,
      discordUsername: verifiedDiscordIdentity?.discordTag ?? formData.get("discordUsername"),
      email: formData.get("email"),
      country: formData.get("country"),
      age: formData.get("age"),
      characterName: verifiedRetail?.characterName ?? formData.get("characterName"),
      characterId: verifiedRetail?.characterId,
      realm: verifiedRetail?.realm ?? formData.get("realm"),
      realmSlug: verifiedRetail?.realmSlug,
      region: verifiedRetail?.region,
      className: verifiedRetail?.className ?? formData.get("className"),
      specialization: verifiedRetail?.specialization ?? formData.get("specialization"),
      level: verifiedRetail?.level,
      faction: submittedApplicationType === "forever" ? foreverFaction : verifiedRetail?.faction,
      itemLevel: verifiedRetail?.itemLevel,
      raiderIoScore: verifiedRetail?.raiderIoScore,
      raidProgression: verifiedRetail?.raidProgression,
      raiderIoProfileUrl: verifiedRetail?.raiderIoProfileUrl,
      battleNetAccountId: verifiedRetail?.battleNetAccountId,
      warcraftLogsUrl: verifiedRetail?.warcraftLogsUrl ?? formData.get("warcraftLogsUrl"),
      englishAbility: formData.get("englishAbility") ?? "",
      availability: formData.getAll("availability"),
      microphone: formData.get("microphone") ?? "",
      joinReason: formData.get("joinReason"),
      guildOffer: formData.get("guildOffer"),
      previousGuilds: formData.get("previousGuilds"),
      raidExperience: formData.get("raidExperience"),
      computerDetails: formData.get("computerDetails"),
      connectionDetails: formData.get("connectionDetails"),
      roleInterests: formData.getAll("roleInterests"),
      characterPlans: formData.get("characterPlans"),
      gameGoals: formData.getAll("gameGoals"),
      experienceLevel: formData.get("experienceLevel"),
      typicalAvailability: formData.get("typicalAvailability"),
      foreverMotivation: formData.get("foreverMotivation"),
      communityContribution: formData.get("communityContribution"),
      referral: formData.get("referral"),
      consent: formData.get("consent"),
      website: formData.get("website"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Check the form and try again." },
        { status: 400 },
      );
    }

    const cookieName = SUBMISSION_COOKIES[parsed.data.applicationType];
    if (DUPLICATE_SUBMISSION_LIMIT_ENABLED && request.cookies.get(cookieName)?.value === "1") {
      return NextResponse.json(
        { error: `A ${parsed.data.applicationType === "retail" ? "Retail" : "Warcraft Forever"} application was already submitted from this browser in the last 24 hours. Contact an officer on Discord if you need to make a correction.` },
        { status: 409 },
      );
    }

    const legacyWebhookUrl = verifiedDiscordIdentity
      ? null
      : getWebhookUrl(
          parsed.data.applicationType === "retail"
            ? process.env.DISCORD_RECRUITMENT_WEBHOOK_URL
            : process.env.DISCORD_FOREVER_RECRUITMENT_WEBHOOK_URL,
        );
    if (!verifiedDiscordIdentity && !legacyWebhookUrl) {
      return NextResponse.json(
        { error: `${parsed.data.applicationType === "retail" ? "Retail" : "Warcraft Forever"} applications are temporarily unavailable. Please contact an officer.` },
        { status: 503 },
      );
    }

    const applicantDuplicateKeys = duplicateKeys(parsed.data);
    if (DUPLICATE_SUBMISSION_LIMIT_ENABLED && hasRecentDuplicate(applicantDuplicateKeys)) {
      return NextResponse.json(
        { error: "An application using this BattleTag or Discord username was already submitted in the last 24 hours. Contact an officer on Discord if you need to make a correction." },
        { status: 409 },
      );
    }

    const screenshotValue = parsed.data.applicationType === "retail" ? formData.get("uiScreenshot") : null;
    const screenshot = screenshotValue instanceof File && screenshotValue.size > 0 ? screenshotValue : undefined;
    if (screenshot) {
      if (!ALLOWED_SCREENSHOT_TYPES.has(screenshot.type)) {
        return NextResponse.json({ error: "The UI screenshot must be a JPG, PNG, or WebP image." }, { status: 400 });
      }
      if (screenshot.size > MAX_SCREENSHOT_SIZE) {
        return NextResponse.json({ error: "The UI screenshot must be smaller than 4 MB." }, { status: 400 });
      }
    }

    let uiImageUrl: string | undefined;
    if (verifiedDiscordIdentity && parsed.data.applicationType === "retail" && screenshot) {
      try {
        uiImageUrl = await uploadRecruitmentScreenshot(screenshot);
      } catch {
        return NextResponse.json(
          { error: "The UI screenshot could not be stored for the private Discord handoff. Please try again shortly." },
          { status: 502 },
        );
      }
    }

    if (verifiedDiscordIdentity) {
      const applicationStatusId = randomUUID();
      try {
        await sendBotGhostApplication({
          variables: buildBotGhostVariables(
            parsed.data,
            verifiedDiscordIdentity,
            new Date().toISOString(),
            applicationStatusId,
            uiImageUrl,
          ),
        });
      } catch {
        rememberSubmission(applicantDuplicateKeys);
        return withSubmissionCookie(
          NextResponse.json(
            { error: "Your application was received, but its private Discord handoff could not be completed. Please contact an officer on Discord and do not resubmit the form." },
            { status: 502 },
          ),
          cookieName,
        );
      }

      rememberSubmission(applicantDuplicateKeys);
      return withSubmissionCookie(
        NextResponse.json({ ok: true, applicationStatusId }),
        cookieName,
      );
    } else {
      let fullApplication: string;
      let applicantSlug: string;
      let applicationLabel: "retail" | "forever";
      let webhookUsername: string;
      let embed: ReturnType<typeof buildRetailEmbed> | ReturnType<typeof buildForeverEmbed>;

      if (parsed.data.applicationType === "retail") {
        fullApplication = buildFullRetailApplication(parsed.data);
        applicantSlug = safeFilename(parsed.data.characterName);
        applicationLabel = "retail";
        webhookUsername = "Last Try Retail Recruitment";
        embed = buildRetailEmbed(parsed.data, screenshot?.name);
      } else {
        fullApplication = buildFullForeverApplication(parsed.data);
        applicantSlug = safeFilename(parsed.data.battleTag.split("#")[0]);
        applicationLabel = "forever";
        webhookUsername = "Last Try Forever Recruitment";
        embed = buildForeverEmbed(parsed.data);
      }

      const discordForm = new FormData();
      const attachments = [
        { id: 0, filename: `${applicantSlug}-${applicationLabel}-application.txt`, description: `Full ${applicationLabel === "retail" ? "Retail" : "Warcraft Forever"} guild application` },
      ];

      discordForm.set(
        "files[0]",
        new Blob([fullApplication], { type: "text/plain;charset=utf-8" }),
        `${applicantSlug}-${applicationLabel}-application.txt`,
      );

      let screenshotFilename: string | undefined;
      if (screenshot) {
        const extension = screenshot.type === "image/png" ? "png" : screenshot.type === "image/webp" ? "webp" : "jpg";
        screenshotFilename = `${applicantSlug}-ui.${extension}`;
        attachments.push({ id: 1, filename: screenshotFilename, description: "Applicant UI screenshot" });
        discordForm.set("files[1]", screenshot, screenshotFilename);
      }

      discordForm.set(
        "payload_json",
        JSON.stringify({
          username: webhookUsername,
          allowed_mentions: { parse: [] },
          embeds: [applicationLabel === "retail" && screenshotFilename && parsed.data.applicationType === "retail" ? buildRetailEmbed(parsed.data, screenshotFilename) : embed],
          attachments,
        }),
      );

      const discordResponse = await fetch(legacyWebhookUrl!, {
        method: "POST",
        body: discordForm,
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });

      if (!discordResponse.ok) {
        return NextResponse.json(
          { error: "Discord could not accept the application. Please try again shortly." },
          { status: 502 },
        );
      }
    }

    rememberSubmission(applicantDuplicateKeys);

    return withSubmissionCookie(NextResponse.json({ ok: true }), cookieName);
  } catch {
    return NextResponse.json(
      { error: "The application could not be submitted. Please try again." },
      { status: 500 },
    );
  }
}
