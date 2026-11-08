import "server-only";

import { findOwnedForeverCharacter, normalizeForeverAccountCharacters } from "./forever-verification";
import { enrichForeverCharacter } from "./forever-character-details";
import type { BattleNetRecruitmentSession } from "./types";

export async function getOwnedForeverCharacters(session: BattleNetRecruitmentSession) {
  const url = new URL(`https://${session.region}.api.blizzard.com/profile/user/wow`);
  url.searchParams.set("namespace", `profile-forever-${session.region}`);
  url.searchParams.set("locale", session.region === "us" ? "en_US" : session.region === "kr" ? "ko_KR" : session.region === "tw" ? "zh_TW" : "en_GB");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401 || response.status === 403) throw new Error("BATTLENET_SESSION_EXPIRED");
  if (!response.ok) throw new Error("BATTLENET_UNAVAILABLE");
  return normalizeForeverAccountCharacters(await response.json(), session.region);
}

export async function resolveOwnedForeverCharacter(session: BattleNetRecruitmentSession, fullName: string) {
  return findOwnedForeverCharacter(await getOwnedForeverCharacters(session), fullName);
}

export async function getForeverCharacterDetails(session: BattleNetRecruitmentSession, fullName: string) {
  const owned = await resolveOwnedForeverCharacter(session, fullName);
  if (!owned) return null;
  const slug = encodeURIComponent(`${owned.name}-${owned.surname}`.toLowerCase());
  const readProfile = async (suffix: string): Promise<unknown> => {
    const url = new URL(`https://${session.region}.api.blizzard.com/profile/wow/character/${slug}${suffix}`);
    url.searchParams.set("namespace", `profile-forever-${session.region}`);
    url.searchParams.set("locale", session.region === "us" ? "en_US" : session.region === "kr" ? "ko_KR" : session.region === "tw" ? "zh_TW" : "en_GB");
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${session.accessToken}` }, cache: "no-store", signal: AbortSignal.timeout(6_000),
      });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  };
  const [profile, talents] = await Promise.all([readProfile(""), readProfile("/specializations")]);
  return enrichForeverCharacter(owned, profile, talents);
}
