import "server-only";

import { cache } from "react";
import { z } from "zod";

import { guildConfig } from "@/config/guild";
import { guildMembers as localGuildMembers } from "@/data/members";
import { localRecruitmentNeeds } from "@/data/recruitment";
import { getBlizzardGuildRanks } from "@/lib/blizzard";
import type { GuildMember, GuildRole, RecruitmentNeed } from "@/types/guild";

const WOWAUDIT_API_BASE = "https://api.wowaudit.com/v1";

const RaidDaySchema = z.object({
  week_day: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  current_instance: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  difficulty: z.string().nullable().optional(),
  active_from: z.string().nullable().optional(),
  active_until: z.string().nullable().optional(),
  optional: z.boolean().optional().default(false),
  activity_type: z.string().nullable().optional(),
});

const TeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  guild_name: z.string(),
  url: z.string().url(),
  raid_days: z.array(RaidDaySchema).optional().default([]),
});

export type WowauditTeam = z.infer<typeof TeamSchema>;

const RaidSchema = z.object({
  id: z.number(),
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string(),
  end_time: z.string(),
  instance: z.string().nullable().optional(),
  instances: z.array(z.string()).optional().default([]),
  season_id: z.number().nullable().optional(),
  optional: z.boolean().optional().default(false),
  difficulty: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  present_size: z.number().nullable().optional(),
  total_size: z.number().nullable().optional(),
});

const RaidsSchema = z.object({ raids: z.array(RaidSchema) });

export type WowauditRaid = z.infer<typeof RaidSchema>;

const CharacterSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  realm: z.string().min(1),
  class: z.string().min(1),
  role: z.string().nullable().optional(),
  rank: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

const CharactersSchema = z.union([
  z.array(CharacterSchema),
  z.object({ characters: z.array(CharacterSchema) }).transform((value) => value.characters),
]);

const normalizeRole = (role?: string | null): GuildRole | undefined => {
  if (role === "Tank") return "Tank";
  if (role === "Heal" || role === "Healer") return "Healer";
  if (role === "Melee" || role === "Ranged" || role === "Damage" || role === "DPS") return "DPS";
  return undefined;
};

export interface GuildMemberData {
  members: GuildMember[];
  source: "wowaudit" | "none";
  integrationStatus: "connected" | "unconfigured" | "unavailable";
}

export interface RecruitmentData {
  needs: RecruitmentNeed[];
  applicationUrl: string;
  teamName?: string;
  source: "local" | "wowaudit-team";
  integrationStatus: "connected" | "unconfigured" | "unavailable";
}

export interface WowauditRaidData {
  raids: WowauditRaid[];
  integrationStatus: "connected" | "unconfigured" | "unavailable";
}

const toApplicationUrl = (team: WowauditTeam) => {
  try {
    const path = new URL(team.url).pathname.replace(/\/$/, "");
    if (path.startsWith("/guild/")) return `https://apply.wowaudit.com${path}`;

    const parts = path.split("/").filter(Boolean);
    if (parts.length >= 4) {
      const [region, realm, guild, teamSlug] = parts;
      return `https://apply.wowaudit.com/guild/${region}/${realm}/${guild}/teams/${teamSlug}`;
    }
  } catch {
    return "";
  }
  return "";
};

export const getWowauditTeam = cache(async (): Promise<WowauditTeam | null> => {
  const apiKey = process.env.WOWAUDIT_API_KEY?.trim();
  if (!apiKey) return null;

  try {
    const response = await fetch(`${WOWAUDIT_API_BASE}/team`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return null;
    const parsed = TeamSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
});

export const getRecruitmentData = cache(async (): Promise<RecruitmentData> => {
  const configuredUrl = guildConfig.applicationUrl;
  const hasApiKey = Boolean(process.env.WOWAUDIT_API_KEY?.trim());
  const team = await getWowauditTeam();
  const applicationUrl = (team ? toApplicationUrl(team) : "") || configuredUrl || "/recruitment#application";

  return {
    needs: localRecruitmentNeeds,
    applicationUrl,
    teamName: team?.name,
    source: team ? "wowaudit-team" : "local",
    integrationStatus: team ? "connected" : hasApiKey ? "unavailable" : "unconfigured",
  };
});

export const getGuildMemberData = cache(async (): Promise<GuildMemberData> => {
  const apiKey = process.env.WOWAUDIT_API_KEY?.trim();
  if (!apiKey) {
    return { members: [], source: "none", integrationStatus: "unconfigured" };
  }

  try {
    const response = await fetch(`${WOWAUDIT_API_BASE}/characters`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return { members: [], source: "none", integrationStatus: "unavailable" };
    }

    const parsed = CharactersSchema.safeParse(await response.json());
    if (!parsed.success) {
      return { members: [], source: "none", integrationStatus: "unavailable" };
    }

    const [blizzardRanks] = await Promise.all([getBlizzardGuildRanks()]);
    const localByName = new Map(
      localGuildMembers.map((member) => [member.characterName.toLowerCase(), member]),
    );
    const members: GuildMember[] = parsed.data
      .map((character) => {
        const local = localByName.get(character.name.toLowerCase());
        const blizzardRank = blizzardRanks?.get(character.name.trim().toLocaleLowerCase("en-GB"));
        return {
          id: `wowaudit-${character.id}`,
          characterName: character.name,
          rank: blizzardRank?.label || character.rank || "Member",
          guildRankIndex: blizzardRank?.index,
          className: character.class,
          realm: character.realm,
          specialization: local?.specialization,
          role: normalizeRole(character.role),
          status: character.status || undefined,
          avatar: local?.avatar,
          twitchUsername: local?.twitchUsername,
        };
      })
      .sort((a, b) => a.characterName.localeCompare(b.characterName));

    return { members, source: "wowaudit", integrationStatus: "connected" };
  } catch {
    return { members: [], source: "none", integrationStatus: "unavailable" };
  }
});

export const getWowauditRaidData = cache(async (): Promise<WowauditRaidData> => {
  const apiKey = process.env.WOWAUDIT_API_KEY?.trim();
  if (!apiKey) return { raids: [], integrationStatus: "unconfigured" };

  try {
    const response = await fetch(`${WOWAUDIT_API_BASE}/raids`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return { raids: [], integrationStatus: "unavailable" };
    const parsed = RaidsSchema.safeParse(await response.json());
    if (!parsed.success) return { raids: [], integrationStatus: "unavailable" };

    return { raids: parsed.data.raids, integrationStatus: "connected" };
  } catch {
    return { raids: [], integrationStatus: "unavailable" };
  }
});
