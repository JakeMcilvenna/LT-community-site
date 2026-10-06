import { NextResponse } from "next/server";
import { z } from "zod";

import { APPLICATION_TYPE_VALUES } from "@/config/application-types";
import { createDiscordAuthorizationUrl } from "@/lib/discord-oauth";
import {
  DISCORD_OAUTH_FLOW_COOKIE,
  DISCORD_OAUTH_FLOW_LIFETIME_SECONDS,
  createDiscordOAuthFlow,
  discordCookieOptions,
} from "@/lib/discord-oauth-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ application: z.enum(APPLICATION_TYPE_VALUES) });

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      application: url.searchParams.get("application"),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid application type." }, { status: 400 });
    }

    const { flow, cookieValue } = createDiscordOAuthFlow(parsed.data.application);
    const response = NextResponse.redirect(createDiscordAuthorizationUrl(flow.state));
    response.cookies.set(
      DISCORD_OAUTH_FLOW_COOKIE,
      cookieValue,
      discordCookieOptions(DISCORD_OAUTH_FLOW_LIFETIME_SECONDS, "/api/auth/discord"),
    );
    return response;
  } catch {
    return NextResponse.json(
      { error: "Discord sign-in is temporarily unavailable." },
      { status: 503 },
    );
  }
}
