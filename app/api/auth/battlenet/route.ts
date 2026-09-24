import { NextResponse } from "next/server";
import { z } from "zod";

import {
  BATTLE_NET_FLOW_COOKIE,
  OAUTH_FLOW_LIFETIME_SECONDS,
  battleNetCookieOptions,
  createOAuthFlow,
} from "@/lib/battlenet/session";
import { createAuthorizationUrl } from "@/lib/battlenet/oauth";
import { BATTLE_NET_REGIONS } from "@/lib/battlenet/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  region: z.enum(BATTLE_NET_REGIONS).default("eu"),
  returnTo: z.string().max(5_000).optional(),
});

const safeReturnTo = (value: string | undefined) => {
  if (!value) return "/recruitment#application-form";
  try {
    const url = new URL(value, "https://recruitment.invalid");
    if (url.origin !== "https://recruitment.invalid" || url.pathname !== "/recruitment") {
      return "/recruitment#application-form";
    }
    return `${url.pathname}${url.search}#application-form`;
  } catch {
    return "/recruitment#application-form";
  }
};

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      region: url.searchParams.get("region") ?? undefined,
      returnTo: url.searchParams.get("returnTo") ?? undefined,
    });
    if (!parsed.success) return NextResponse.redirect(new URL("/recruitment?battlenetError=invalid_request", request.url));

    const { flow, cookieValue } = createOAuthFlow(
      parsed.data.region,
      safeReturnTo(parsed.data.returnTo),
    );
    const response = NextResponse.redirect(createAuthorizationUrl(flow.region, flow.state));
    response.cookies.set(
      BATTLE_NET_FLOW_COOKIE,
      cookieValue,
      battleNetCookieOptions(OAUTH_FLOW_LIFETIME_SECONDS),
    );
    return response;
  } catch {
    return NextResponse.redirect(new URL("/recruitment?battlenetError=unavailable", request.url));
  }
}
