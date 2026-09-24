import "server-only";

import { z } from "zod";

import { guildConfig } from "@/config/guild";

const BlizzardTokenSchema = z.object({ access_token: z.string().min(1) });

const GuildRosterSchema = z.object({
  members: z.array(z.object({
    character: z.object({ name: z.string().min(1) }),
    rank: z.number().int().nonnegative(),
  })),
});

const characterKey = (name: string) => name.trim().toLocaleLowerCase("en-GB");

export interface BlizzardGuildRank {
  index: number;
  label: "Guild Master" | "Officer" | "Member";
}

// Blizzard exposes a rank index, rather than a guild's custom rank label.
// Rank 0 is always the guild master; this guild uses rank 1 for officers.
const toGuildRank = (index: number): BlizzardGuildRank => ({
  index,
  label: index === 0 ? "Guild Master" : index === 1 ? "Officer" : "Member",
});

export async function getBlizzardGuildRanks(): Promise<Map<string, BlizzardGuildRank> | null> {
  const clientId = process.env.BLIZZARD_CLIENT_ID?.trim();
  const clientSecret = process.env.BLIZZARD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const region = guildConfig.region.toLowerCase();
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const tokenResponse = await fetch(`https://${region}.battle.net/oauth/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!tokenResponse.ok) return null;

    const token = BlizzardTokenSchema.safeParse(await tokenResponse.json());
    if (!token.success) return null;

    const realmSlug = guildConfig.realm.toLowerCase().replaceAll(" ", "-");
    const guildSlug = guildConfig.name.toLowerCase().replaceAll(" ", "-");
    const rosterUrl = new URL(`https://${region}.api.blizzard.com/data/wow/guild/${realmSlug}/${guildSlug}/roster`);
    rosterUrl.searchParams.set("namespace", `profile-${region}`);
    rosterUrl.searchParams.set("locale", "en_GB");

    const rosterResponse = await fetch(rosterUrl, {
      headers: { Authorization: `Bearer ${token.data.access_token}` },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!rosterResponse.ok) return null;

    const roster = GuildRosterSchema.safeParse(await rosterResponse.json());
    if (!roster.success) return null;

    return new Map(roster.data.members.map((member) => [characterKey(member.character.name), toGuildRank(member.rank)]));
  } catch {
    return null;
  }
}
