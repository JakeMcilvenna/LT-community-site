import "server-only";

import { cache } from "react";
import { z } from "zod";

import { guildConfig } from "@/config/guild";
import { raidTiers as localRaidTiers } from "@/data/raid-progression";
import type { RaidBossProgress, RaidDifficulty, RaidTier } from "@/types/guild";

const RAIDER_IO_API_BASE = "https://raider.io/api/v1";

const GuildEncountersSchema = z.object({
  name: z.string(),
  realm: z.string(),
  profile_url: z.string().url(),
  raid_encounters: z.array(z.object({
    slug: z.string(),
    name: z.string(),
    defeatedAt: z.string(),
  })).optional().default([]),
});

const RaiderIoBooleanSchema = z.union([z.boolean(), z.literal(0), z.literal(1)])
  .transform((value) => Boolean(value));

const LiveRaidProgressSchema = z.object({
  bosses: z.array(z.object({
    boss: z.object({
      slug: z.string(),
    }),
    bestPercent: z.number().min(0).max(100).nullable().optional(),
    pullCount: z.number().int().nonnegative().optional().default(0),
    pullEndedAt: z.string().nullable().optional(),
    // The live endpoint currently returns 1 for defeated bosses but false for
    // an undefeated boss, despite its published schema declaring a boolean.
    isDefeated: RaiderIoBooleanSchema,
  })).optional().default([]),
});

export interface RaidProgressionData {
  tiers: RaidTier[];
  source: "raiderio" | "local";
  profileUrl?: string;
}

const addAccessKey = (params: URLSearchParams) => {
  const accessKey = process.env.RAIDER_IO_ACCESS_KEY?.trim();
  if (accessKey) params.set("access_key", accessKey);
};

const fetchDefeatedEncounters = async (raidSlug: string, difficulty: RaidDifficulty) => {
  const params = new URLSearchParams({
    region: guildConfig.region.toLowerCase(),
    realm: guildConfig.realm,
    name: guildConfig.name,
    fields: `raid_encounters:${raidSlug}:${difficulty}`,
  });
  addAccessKey(params);

  const response = await fetch(`${RAIDER_IO_API_BASE}/guilds/profile?${params}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Raider.IO request failed with ${response.status}`);

  const parsed = GuildEncountersSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Unexpected Raider.IO response");

  return {
    profileUrl: parsed.data.profile_url,
    defeated: new Set(parsed.data.raid_encounters.map((encounter) => encounter.slug)),
  };
};

const fetchLiveRaidProgress = async (raidSlug: string, difficulty: RaidDifficulty) => {
  const params = new URLSearchParams({
    region: guildConfig.region.toLowerCase(),
    realm: guildConfig.realm,
    guild: guildConfig.name,
    raid: raidSlug,
    difficulty,
    period: "all",
  });
  addAccessKey(params);

  const response = await fetch(`${RAIDER_IO_API_BASE}/live-tracking/guild/raid-progress?${params}`, {
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Raider.IO live progress request failed with ${response.status}`);

  const parsed = LiveRaidProgressSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Unexpected Raider.IO live progress response");

  return new Map<string, RaidBossProgress>(parsed.data.bosses.flatMap((entry) => {
    if (entry.isDefeated || entry.pullCount === 0 || entry.bestPercent == null) return [];

    return [[entry.boss.slug, {
      bestPercent: entry.bestPercent,
      pullCount: entry.pullCount,
      ...(entry.pullEndedAt ? { lastPullAt: entry.pullEndedAt } : {}),
    }]];
  }));
};

export const getRaidProgression = cache(async (): Promise<RaidProgressionData> => {
  if (!guildConfig.realm) return { tiers: localRaidTiers, source: "local" };

  try {
    const raids = localRaidTiers.flatMap((tier) =>
      [...new Set(tier.instances.flatMap((instance) => instance.raiderIoSlug ?? []))]
        .map((raidSlug) => ({ tierSlug: tier.slug, raidSlug })),
    );
    const results = await Promise.all(
      raids.flatMap((raid) => (["normal", "heroic", "mythic"] as const).map(async (difficulty) => ({
        tierSlug: raid.tierSlug,
        raidSlug: raid.raidSlug,
        difficulty,
        ...(await fetchDefeatedEncounters(raid.raidSlug, difficulty)),
      }))),
    );

    const progression = new Map(
      results.map((result) => [`${result.tierSlug}:${result.raidSlug}:${result.difficulty}`, result.defeated]),
    );
    const currentTier = localRaidTiers[0];
    const orderedBosses = currentTier.instances
      .flatMap((instance) => instance.bosses.map((boss) => ({ boss, instance })))
      .sort((a, b) => a.boss.order - b.boss.order);
    const isDefeated = ({ boss, instance }: (typeof orderedBosses)[number], difficulty: RaidDifficulty) => {
      const encounterSlug = boss.raiderIoSlug ?? boss.id;
      const progressionKey = `${currentTier.slug}:${instance.raiderIoSlug}:${difficulty}`;
      const fallbackKey = `${difficulty}Defeated` as const;
      return progression.get(progressionKey)?.has(encounterSlug) ?? boss[fallbackKey];
    };
    const hasDefeated = (difficulty: RaidDifficulty) => orderedBosses.some((entry) => isDefeated(entry, difficulty));
    const hasCleared = (difficulty: RaidDifficulty) => orderedBosses.every((entry) => isDefeated(entry, difficulty));
    const activeDifficulty: RaidDifficulty = hasDefeated("mythic") || hasCleared("heroic")
      ? "mythic"
      : hasDefeated("heroic") || hasCleared("normal")
        ? "heroic"
        : "normal";
    const currentBoss = orderedBosses.find((entry) => !isDefeated(entry, activeDifficulty));
    const currentRaidSlug = currentBoss?.instance.raiderIoSlug;
    const currentLiveProgress = currentRaidSlug
      ? await fetchLiveRaidProgress(currentRaidSlug, activeDifficulty).catch(() => new Map<string, RaidBossProgress>())
      : new Map<string, RaidBossProgress>();
    const tiers = localRaidTiers.map((tier) => ({
      ...tier,
      instances: tier.instances.map((instance) => ({
        ...instance,
        bosses: instance.bosses.map((boss) => {
          const encounterSlug = boss.raiderIoSlug ?? boss.id;
          const progressionKey = `${tier.slug}:${instance.raiderIoSlug}`;
          const bossProgress = Object.fromEntries(
            (["normal", "heroic", "mythic"] as const).flatMap((difficulty) => {
              const progress = instance.raiderIoSlug === currentRaidSlug && difficulty === activeDifficulty
                ? currentLiveProgress.get(encounterSlug)
                : undefined;
              return progress ? [[difficulty, progress]] : [];
            }),
          );
          return {
            ...boss,
            normalDefeated: progression.get(`${progressionKey}:normal`)?.has(encounterSlug) ?? boss.normalDefeated,
            heroicDefeated: progression.get(`${progressionKey}:heroic`)?.has(encounterSlug) ?? boss.heroicDefeated,
            mythicDefeated: progression.get(`${progressionKey}:mythic`)?.has(encounterSlug) ?? boss.mythicDefeated,
            ...(Object.keys(bossProgress).length ? { progress: bossProgress } : {}),
          };
        }),
      })),
    }));

    return {
      tiers,
      source: "raiderio",
      profileUrl: results[0]?.profileUrl,
    };
  } catch {
    return { tiers: localRaidTiers, source: "local" };
  }
});
