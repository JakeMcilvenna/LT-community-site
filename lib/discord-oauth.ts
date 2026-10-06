import "server-only";

import { z } from "zod";

const DISCORD_API_BASE = "https://discord.com/api/v10";

const tokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().min(1),
  expires_in: z.number().positive(),
  scope: z.string(),
});

const userSchema = z.object({
  id: z.string().regex(/^\d{17,20}$/),
  username: z.string().min(1).max(100),
  discriminator: z.string().max(4).optional(),
  global_name: z.string().max(100).nullable().optional(),
});

export type DiscordOAuthUser = z.infer<typeof userSchema>;

const getRequiredEnvironmentValue = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const getDiscordRedirectUri = () => {
  const configured = process.env.DISCORD_REDIRECT_URI?.trim();
  if (configured) return new URL(configured).toString();
  return new URL(
    "/api/auth/discord/callback",
    getRequiredEnvironmentValue("NEXT_PUBLIC_SITE_URL"),
  ).toString();
};

export const createDiscordAuthorizationUrl = (state: string) => {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", getRequiredEnvironmentValue("DISCORD_CLIENT_ID"));
  url.searchParams.set("redirect_uri", getDiscordRedirectUri());
  url.searchParams.set("scope", "identify guilds.join");
  url.searchParams.set("state", state);
  return url;
};

export const exchangeDiscordAuthorizationCode = async (code: string) => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getDiscordRedirectUri(),
  });
  const clientId = getRequiredEnvironmentValue("DISCORD_CLIENT_ID");
  const clientSecret = getRequiredEnvironmentValue("DISCORD_CLIENT_SECRET");
  const authorization = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Discord rejected the OAuth code exchange.");
  return tokenSchema.parse(await response.json());
};

export const getDiscordOAuthUser = async (accessToken: string) => {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error("Discord could not verify the user.");
  return userSchema.parse(await response.json());
};

export const addDiscordGuildMember = async (userId: string, accessToken: string) => {
  const guildId = getRequiredEnvironmentValue("DISCORD_GUILD_ID");
  const response = await fetch(`${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${getRequiredEnvironmentValue("DISCORD_BOT_TOKEN")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ access_token: accessToken }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (response.status !== 201 && response.status !== 204) {
    throw new Error("Discord could not add the user to the server.");
  }
};

export const getDiscordDisplayTag = (user: DiscordOAuthUser) =>
  user.discriminator && user.discriminator !== "0"
    ? `${user.username}#${user.discriminator}`
    : user.username;
