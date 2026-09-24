import "server-only";

import { z } from "zod";

import { getRaiderIoCharacter } from "@/lib/raiderio/client";
import type {
  BattleNetRecruitmentSession,
  VerifiedCharacterDetails,
  VerifiedWowCharacter,
} from "./types";
import { findOwnedCharacter, normalizeAccountCharacters } from "./verification";

const localizedNameSchema = z.object({ name: z.string().min(1) });
const characterSummarySchema = z.object({
  id: z.union([z.number().int().nonnegative(), z.string().min(1)]),
  name: z.string().min(1),
  level: z.number().int().nonnegative(),
  equipped_item_level: z.number().nonnegative().optional(),
  active_spec: localizedNameSchema.optional(),
  character_class: localizedNameSchema.extend({ id: z.number().int().positive().optional() }).optional(),
  faction: z.object({ name: z.string().min(1).optional(), type: z.string().min(1).optional() }).optional(),
  realm: z.object({
    id: z.number().int().nonnegative().optional(),
    name: z.string().min(1),
    slug: z.string().min(1),
  }),
});

const localeForRegion = (region: BattleNetRecruitmentSession["region"]) =>
  region === "us" ? "en_US" : region === "kr" ? "ko_KR" : region === "tw" ? "zh_TW" : "en_GB";

const factionName = (value: { name?: string; type?: string } | undefined) =>
  value?.name ?? (value?.type ? value.type[0] + value.type.slice(1).toLowerCase() : undefined);

export async function getOwnedCharacters(
  session: BattleNetRecruitmentSession,
): Promise<VerifiedWowCharacter[]> {
  const url = new URL(`https://${session.region}.api.blizzard.com/profile/user/wow`);
  url.searchParams.set("namespace", `profile-${session.region}`);
  url.searchParams.set("locale", localeForRegion(session.region));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("BATTLENET_SESSION_EXPIRED");
  }
  if (!response.ok) throw new Error("BATTLENET_UNAVAILABLE");
  return normalizeAccountCharacters(await response.json(), session.region);
}

const getCharacterSummary = async (
  session: BattleNetRecruitmentSession,
  owned: VerifiedWowCharacter,
) => {
  const url = new URL(
    `https://${session.region}.api.blizzard.com/profile/wow/character/${encodeURIComponent(owned.realmSlug)}/${encodeURIComponent(owned.name.toLowerCase())}`,
  );
  url.searchParams.set("namespace", `profile-${session.region}`);
  url.searchParams.set("locale", localeForRegion(session.region));
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const parsed = characterSummarySchema.safeParse(await response.json());
  if (!parsed.success || String(parsed.data.id) !== owned.id) return null;
  return parsed.data;
};

export async function resolveVerifiedCharacter(
  session: BattleNetRecruitmentSession,
  characterId: string,
): Promise<VerifiedCharacterDetails | null> {
  const characters = await getOwnedCharacters(session);
  const owned = findOwnedCharacter(characters, characterId);
  if (!owned) return null;

  const [summary, raiderIo] = await Promise.all([
    getCharacterSummary(session, owned),
    getRaiderIoCharacter(owned),
  ]);
  return {
    ...owned,
    name: summary?.name ?? owned.name,
    realmName: summary?.realm.name ?? owned.realmName,
    realmSlug: summary?.realm.slug ?? owned.realmSlug,
    realmId: summary?.realm.id ?? owned.realmId,
    level: summary?.level ?? owned.level,
    className: summary?.character_class?.name ?? owned.className,
    classId: summary?.character_class?.id ?? owned.classId,
    faction: factionName(summary?.faction) ?? owned.faction,
    specialization: summary?.active_spec?.name ?? raiderIo?.specialization,
    itemLevel: summary?.equipped_item_level ?? raiderIo?.itemLevel,
    raiderIoScore: raiderIo?.score,
    raidProgression: raiderIo?.raidProgression,
    raiderIoProfileUrl: raiderIo?.profileUrl,
    thumbnailUrl: raiderIo?.thumbnailUrl,
  };
}
