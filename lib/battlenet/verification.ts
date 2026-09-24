import { z } from "zod";

import type { BattleNetRegion, VerifiedWowCharacter } from "./types";

const accountCharacterSchema = z.object({
  id: z.union([z.number().int().nonnegative(), z.string().min(1)]),
  name: z.string().min(1),
  level: z.number().int().nonnegative(),
  realm: z.object({ id: z.number().int().nonnegative().optional(), name: z.string().min(1), slug: z.string().min(1) }),
  playable_class: z.object({ name: z.string().min(1), id: z.number().int().positive().optional() }).optional(),
  faction: z.object({ name: z.string().min(1).optional(), type: z.string().min(1).optional() }).optional(),
});
const accountProfileSchema = z.object({ wow_accounts: z.array(z.object({ characters: z.array(accountCharacterSchema).default([]) })).default([]) });
const factionName = (value: { name?: string; type?: string } | undefined) =>
  value?.name ?? (value?.type ? value.type[0] + value.type.slice(1).toLowerCase() : undefined);

export const normalizeAccountCharacters = (value: unknown, region: BattleNetRegion): VerifiedWowCharacter[] => {
  const parsed = accountProfileSchema.safeParse(value);
  if (!parsed.success) throw new Error("Battle.net returned an invalid account profile.");
  const byIdentity = new Map<string, VerifiedWowCharacter>();
  for (const account of parsed.data.wow_accounts) for (const character of account.characters) {
    const normalized: VerifiedWowCharacter = {
      id: String(character.id), name: character.name, realmName: character.realm.name,
      realmSlug: character.realm.slug, realmId: character.realm.id, region, level: character.level,
      className: character.playable_class?.name, classId: character.playable_class?.id,
      faction: factionName(character.faction),
    };
    byIdentity.set(`${normalized.id}:${normalized.realmSlug}`, normalized);
  }
  return [...byIdentity.values()].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
};

export const findOwnedCharacter = (characters: VerifiedWowCharacter[], characterId: string) =>
  characters.find((character) => character.id === characterId) ?? null;
