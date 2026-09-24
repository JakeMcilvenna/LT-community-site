export const guildConfig = {
  name: "Last Try",
  shortName: "LT",
  tagline: "Good pulls, bad jokes, one last try.",
  description:
    "A relaxed progression guild on Silvermoon. We take raid nights seriously enough, and ourselves not very.",
  realm: "Silvermoon",
  region: "EU",
  timezone: "Europe/London",
  applicationUrl: "",
  navigation: [
    { label: "Home", href: "/" },
    { label: "Members", href: "/members" },
    { label: "Events", href: "/events" },
    { label: "Recruitment", href: "/recruitment" },
    { label: "Social", href: "/social" },
  ],
} as const;

export type GuildLinkKey = "discord" | "twitch" | "warcraftLogs" | "raiderIo" | "armory" | "wowProgress" | "youtube";

export const guildLinks: Record<GuildLinkKey, string> = {
  discord: "",
  twitch: "",
  warcraftLogs: "https://www.warcraftlogs.com/guild/eu/silvermoon/last%20try",
  raiderIo: "https://raider.io/guilds/eu/silvermoon/Last%20try",
  armory: "https://worldofwarcraft.blizzard.com/en-gb/guild/eu/silvermoon/last-try",
  wowProgress: "https://www.wowprogress.com/guild/eu/silvermoon/Last+Try",
  youtube: "",
};
