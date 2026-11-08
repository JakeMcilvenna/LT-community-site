import { z } from "zod";

import type { BattleNetRegion, VerifiedForeverCharacter } from "./types";

// Forever account profiles contain name + surname and do not contain a realm.
// https://github.com/Pinta365/blizzard_api/blob/main/src/wow_forever/account.ts
const foreverCharacterSchema = z.object({
  id: z.union([z.number().int().nonnegative(), z.string().min(1)]),
  name: z.string().trim().min(1),
  surname: z.string().trim().min(1),
  level: z.number().int().nonnegative(),
  playable_class: z.object({ name: z.string().min(1) }).optional(),
  faction: z.object({ name: z.string().optional(), type: z.string().optional() }).optional(),
});

const foreverAccountSchema = z.object({
  wow_accounts: z.array(z.object({ characters: z.array(foreverCharacterSchema).default([]) })).default([]),
});

export function normalizeForeverAccountCharacters(value: unknown, region: BattleNetRegion): VerifiedForeverCharacter[] {
  const parsed = foreverAccountSchema.safeParse(value);
  if (!parsed.success) throw new Error("Battle.net returned an invalid Forever account profile.");

  const byName = new Map<string, VerifiedForeverCharacter>();
  for (const account of parsed.data.wow_accounts) for (const character of account.characters) {
    const fullName = `${character.name} ${character.surname}`;
    byName.set(fullName, {
      id: String(character.id),
      name: character.name,
      surname: character.surname,
      fullName,
      region,
      level: character.level,
      className: character.playable_class?.name,
      faction: character.faction?.name ?? character.faction?.type,
    });
  }
  return [...byName.values()].sort((a, b) => b.level - a.level || a.fullName.localeCompare(b.fullName));
}

export const findOwnedForeverCharacter = (characters: VerifiedForeverCharacter[], fullName: string) =>
  characters.find((character) => character.fullName === fullName) ?? null;
