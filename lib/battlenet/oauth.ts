import "server-only";

import { z } from "zod";

import type { BattleNetRegion } from "./types";

const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().int().positive(),
  scope: z.string().optional(),
});

const userInfoSchema = z.object({
  sub: z.union([z.string(), z.number()]).transform(String),
  battletag: z.string().min(1).max(100),
});

const getCredentials = () => {
  const clientId =
    process.env.BATTLENET_CLIENT_ID?.trim() || process.env.BLIZZARD_CLIENT_ID?.trim();
  const clientSecret =
    process.env.BATTLENET_CLIENT_SECRET?.trim() || process.env.BLIZZARD_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("Battle.net OAuth is not configured.");
  return { clientId, clientSecret };
};

export const getBattleNetRedirectUri = () => {
  const configured = process.env.BATTLENET_REDIRECT_URI?.trim();
  if (configured) return configured;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) throw new Error("NEXT_PUBLIC_SITE_URL is required for Battle.net OAuth.");
  return new URL("/api/auth/battlenet/callback", siteUrl).toString();
};

export const createAuthorizationUrl = (region: BattleNetRegion, state: string) => {
  const { clientId } = getCredentials();
  const url = new URL("https://oauth.battle.net/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getBattleNetRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid wow.profile");
  url.searchParams.set("state", state);
  url.searchParams.set("region", region.toUpperCase());
  return url;
};

export const exchangeAuthorizationCode = async (
  region: BattleNetRegion,
  code: string,
) => {
  const { clientId, clientSecret } = getCredentials();
  const response = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getBattleNetRedirectUri(),
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Battle.net token exchange failed.");
  const parsed = tokenSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Battle.net returned an invalid token response.");
  return parsed.data;
};

export const getBattleNetUserInfo = async (
  region: BattleNetRegion,
  accessToken: string,
) => {
  const response = await fetch("https://oauth.battle.net/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Battle.net identity request failed.");
  const parsed = userInfoSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Battle.net returned an invalid identity response.");
  return parsed.data;
};
