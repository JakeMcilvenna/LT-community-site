export const BATTLE_NET_REGIONS = ["eu", "us", "kr", "tw"] as const;

export type BattleNetRegion = (typeof BATTLE_NET_REGIONS)[number];

export type VerifiedWowCharacter = {
  id: string;
  name: string;
  realmName: string;
  realmSlug: string;
  realmId?: number;
  region: BattleNetRegion;
  level: number;
  className?: string;
  classId?: number;
  faction?: string;
};

export type VerifiedCharacterDetails = VerifiedWowCharacter & {
  specialization?: string;
  itemLevel?: number;
  raiderIoScore?: number;
  raidProgression?: string;
  raiderIoProfileUrl?: string;
  thumbnailUrl?: string;
};

export type VerifiedForeverCharacter = {
  id: string;
  name: string;
  surname: string;
  fullName: string;
  region: BattleNetRegion;
  level: number;
  className?: string;
  faction?: string;
  rulesetId?: number;
  rulesetName?: string;
};

export type VerifiedForeverCharacterDetails = VerifiedForeverCharacter & {
  specialization?: string;
  armoryUrl: string;
  raiderIoProfileUrl?: string;
};

export type BattleNetRecruitmentSession = {
  version: 1;
  accessToken: string;
  battleTag: string;
  accountId: string;
  region: BattleNetRegion;
  issuedAt: number;
  expiresAt: number;
};
