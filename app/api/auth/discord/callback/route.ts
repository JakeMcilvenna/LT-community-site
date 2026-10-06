import { randomBytes } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { APPLICATION_TOKEN_LIFETIME_SECONDS, createApplicationToken } from "@/lib/application-token";
import {
  addDiscordGuildMember,
  exchangeDiscordAuthorizationCode,
  getDiscordDisplayTag,
  getDiscordOAuthUser,
} from "@/lib/discord-oauth";
import {
  DISCORD_APPLICATION_COOKIE,
  DISCORD_OAUTH_FLOW_COOKIE,
  discordCookieOptions,
  isDiscordOAuthStateValid,
  readDiscordOAuthFlow,
} from "@/lib/discord-oauth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PopupResult =
  | {
      ok: true;
      identity: {
        discordUserId: string;
        discordTag: string;
        applicationType: "retail" | "forever";
        discordReturnUrl: string;
      };
    }
  | { ok: false; error: string };

const popupResponse = (request: NextRequest, result: PopupResult) => {
  const nonce = randomBytes(18).toString("base64url");
  const targetOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
  const serializedResult = JSON.stringify({
    type: "last-try-discord-oauth",
    ...result,
  }).replaceAll("<", "\\u003c");
  const serializedOrigin = JSON.stringify(targetOrigin);
  const title = result.ok ? "Discord connected" : "Discord connection failed";
  const message = result.ok
    ? "You have joined Last Try. Your application will now be submitted."
    : result.error;

  const response = new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body><main><h1>${title}</h1><p>${message}</p><p>You can close this window.</p></main><script nonce="${nonce}">if(window.opener){window.opener.postMessage(${serializedResult},${serializedOrigin});setTimeout(()=>window.close(),250);}</script></body></html>`,
    {
      status: result.ok ? 200 : 400,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'none'; base-uri 'none'; frame-ancestors 'none'`,
        "Referrer-Policy": "no-referrer",
      },
    },
  );
  response.cookies.set(
    DISCORD_OAUTH_FLOW_COOKIE,
    "",
    discordCookieOptions(0, "/api/auth/discord"),
  );
  return response;
};

export async function GET(request: NextRequest) {
  const flow = readDiscordOAuthFlow(
    request.cookies.get(DISCORD_OAUTH_FLOW_COOKIE)?.value,
  );
  if (!flow) {
    return popupResponse(request, {
      ok: false,
      error: "The Discord sign-in expired. Return to the application and try again.",
    });
  }

  const url = new URL(request.url);
  if (!isDiscordOAuthStateValid(flow, url.searchParams.get("state"))) {
    return popupResponse(request, {
      ok: false,
      error: "Discord returned an invalid sign-in. Return to the application and try again.",
    });
  }
  if (url.searchParams.has("error")) {
    return popupResponse(request, {
      ok: false,
      error: "Discord authorization was cancelled. Your application has not been submitted.",
    });
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return popupResponse(request, {
      ok: false,
      error: "Discord did not return an authorization code.",
    });
  }

  try {
    const oauthToken = await exchangeDiscordAuthorizationCode(code);
    const user = await getDiscordOAuthUser(oauthToken.access_token);
    await addDiscordGuildMember(user.id, oauthToken.access_token);

    const guildId = process.env.DISCORD_GUILD_ID?.trim();
    if (!guildId) throw new Error("Discord guild is not configured.");
    const discordTag = getDiscordDisplayTag(user);
    const applicationToken = createApplicationToken({
      discordUserId: user.id,
      discordTag,
      guildId,
      applicationType: flow.applicationType,
    });
    const identity = {
      discordUserId: user.id,
      discordTag,
      applicationType: flow.applicationType,
      discordReturnUrl: `https://discord.com/channels/${guildId}`,
    };

    const response = popupResponse(request, { ok: true, identity });
    response.cookies.set(
      DISCORD_APPLICATION_COOKIE,
      applicationToken,
      discordCookieOptions(APPLICATION_TOKEN_LIFETIME_SECONDS),
    );
    return response;
  } catch {
    return popupResponse(request, {
      ok: false,
      error: "Discord could not verify your account or add you to the server. Please try again.",
    });
  }
}
