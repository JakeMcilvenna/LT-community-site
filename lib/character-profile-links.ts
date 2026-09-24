import type { BattleNetRegion } from "./battlenet/types.ts";

type CharacterProfileIdentity = {
  region: BattleNetRegion;
  realmSlug: string;
  characterName: string;
  raiderIoProfileUrl?: string;
};

export function buildCharacterProfileLinks(character: CharacterProfileIdentity) {
  const locale = character.region === "us"
    ? "en-us"
    : character.region === "kr"
      ? "ko-kr"
      : character.region === "tw"
        ? "zh-tw"
        : "en-gb";
  const region = encodeURIComponent(character.region);
  const realm = encodeURIComponent(decodeURIComponent(character.realmSlug));
  const name = encodeURIComponent(decodeURIComponent(character.characterName.toLowerCase()));

  return {
    raiderIo: character.raiderIoProfileUrl || `https://raider.io/characters/${region}/${realm}/${name}`,
    warcraftLogs: `https://www.warcraftlogs.com/character/${region}/${realm}/${name}`,
    armory: `https://worldofwarcraft.blizzard.com/${locale}/character/${region}/${realm}/${name}`,
  };
}
