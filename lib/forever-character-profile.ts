import type { VerifiedForeverCharacter } from "./battlenet/types.ts";

// Raider.IO Forever uses rulesets in the realm position, and the full name.
const raiderIoRulesets: Record<number, string> = {
  1: "pvp",
  2: "normal",
  3: "rp",
  15: "pvp-rp",
};

export function buildForeverCharacterProfileLinks(character: Pick<VerifiedForeverCharacter, "region" | "name" | "surname" | "rulesetId">) {
  const locale = character.region === "us" ? "en-us" : character.region === "kr" ? "ko-kr" : character.region === "tw" ? "zh-tw" : "en-gb";
  const slug = encodeURIComponent(`${character.name}-${character.surname}`.toLowerCase());
  const ruleset = character.rulesetId === undefined ? undefined : raiderIoRulesets[character.rulesetId];
  return {
    armoryUrl: `https://worldofwarcraft.blizzard.com/${locale}/forever/${character.region}/armory/character/${slug}`,
    raiderIoProfileUrl: ruleset
      ? `https://forever.raider.io/characters/${character.region}/${ruleset}/${encodeURIComponent(`${character.name} ${character.surname}`)}`
      : undefined,
  };
}
