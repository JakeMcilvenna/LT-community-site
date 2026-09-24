import { NextResponse, type NextRequest } from "next/server";

import { exchangeAuthorizationCode, getBattleNetUserInfo } from "@/lib/battlenet/oauth";
import {
  BATTLE_NET_FLOW_COOKIE,
  BATTLE_NET_SESSION_COOKIE,
  battleNetCookieOptions,
  createRecruitmentSession,
  isOAuthStateValid,
  readOAuthFlow,
} from "@/lib/battlenet/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const errorRedirect = (request: NextRequest, returnTo: string, error: string) => {
  const redirect = new URL(returnTo, request.url);
  redirect.searchParams.set("battlenetError", error);
  redirect.hash = "application-form";
  const response = NextResponse.redirect(redirect);
  response.cookies.delete(BATTLE_NET_FLOW_COOKIE);
  return response;
};

export async function GET(request: NextRequest) {
  const flow = readOAuthFlow(request.cookies.get(BATTLE_NET_FLOW_COOKIE)?.value);
  const fallback = "/recruitment";
  if (!flow) return errorRedirect(request, fallback, "expired_state");

  const url = new URL(request.url);
  const returnedState = url.searchParams.get("state");
  if (!isOAuthStateValid(flow, returnedState)) {
    return errorRedirect(request, flow.returnTo, "invalid_state");
  }
  if (url.searchParams.has("error")) {
    return errorRedirect(request, flow.returnTo, "cancelled");
  }
  const code = url.searchParams.get("code");
  if (!code) return errorRedirect(request, flow.returnTo, "missing_code");

  try {
    const token = await exchangeAuthorizationCode(flow.region, code);
    const identity = await getBattleNetUserInfo(flow.region, token.access_token);
    const session = createRecruitmentSession({
      accessToken: token.access_token,
      battleTag: identity.battletag,
      accountId: identity.sub,
      region: flow.region,
      providerExpiresIn: token.expires_in,
    });
    const response = NextResponse.redirect(new URL(flow.returnTo, request.url));
    response.cookies.delete(BATTLE_NET_FLOW_COOKIE);
    response.cookies.set(
      BATTLE_NET_SESSION_COOKIE,
      session.cookieValue,
      battleNetCookieOptions(session.maxAge),
    );
    return response;
  } catch {
    return errorRedirect(request, flow.returnTo, "provider_failure");
  }
}
