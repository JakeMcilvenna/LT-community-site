import "server-only";

export {
  OAUTH_FLOW_LIFETIME_SECONDS,
  RECRUITMENT_SESSION_LIFETIME_SECONDS,
  createOAuthFlow,
  createRecruitmentSession,
  isOAuthStateValid,
  readOAuthFlow,
  readRecruitmentSession,
} from "./session-core";
export type { BattleNetOAuthFlow } from "./session-core";

export const BATTLE_NET_FLOW_COOKIE = "last_try_bnet_oauth";
export const BATTLE_NET_SESSION_COOKIE = "last_try_bnet_session";

export const battleNetCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});
