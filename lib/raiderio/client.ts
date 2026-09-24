import "server-only";

import { z } from "zod";

import type { VerifiedWowCharacter } from "@/lib/battlenet/types";
import type { RaiderIoCharacterEnrichment } from "./types";

const schema = z.object({
  active_spec_name: z.string().optional(),
  profile_url: z.string().url().optional(),
  thumbnail_url: z.string().url().optional(),
  gear: z.object({ item_level_equipped: z.number().optional(), item_level_total: z.number().optional() }).optional(),
  mythic_plus_scores_by_season: z.array(z.object({
    scores: z.object({ all: z.number().optional() }),
  })).optional(),
  raid_progression: z.record(z.string(), z.object({ summary: z.string().optional() })).optional(),
});

export async function getRaiderIoCharacter(
  character: VerifiedWowCharacter,
): Promise<RaiderIoCharacterEnrichment | null> {
  const url = new URL("https://raider.io/api/v1/characters/profile");
  url.searchParams.set("region", character.region);
  url.searchParams.set("realm", character.realmSlug);
  url.searchParams.set("name", character.name);
  url.searchParams.set("fields", "gear,mythic_plus_scores_by_season:current,raid_progression");
  const accessKey = process.env.RAIDER_IO_ACCESS_KEY?.trim();
  if (accessKey) url.searchParams.set("access_key", accessKey);

  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json" },
    });
    if (response.status === 429) return null;
    if (!response.ok) return null;
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) return null;
    const progression = Object.entries(parsed.data.raid_progression ?? {})
      .map(([raid, value]) => `${raid}: ${value.summary ?? "No progress"}`)
      .join("; ");
    return {
      specialization: parsed.data.active_spec_name,
      itemLevel: parsed.data.gear?.item_level_equipped ?? parsed.data.gear?.item_level_total,
      score: parsed.data.mythic_plus_scores_by_season?.[0]?.scores.all,
      raidProgression: progression || undefined,
      profileUrl: parsed.data.profile_url,
      thumbnailUrl: parsed.data.thumbnail_url,
    };
  } catch {
    return null;
  }
}
