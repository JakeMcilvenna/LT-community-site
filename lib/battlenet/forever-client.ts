import "server-only";

import { findOwnedForeverCharacter, normalizeForeverAccountCharacters } from "./forever-verification";
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
