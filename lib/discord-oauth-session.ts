import "server-only";

export {
  DISCORD_OAUTH_FLOW_LIFETIME_SECONDS,
  createDiscordOAuthFlow,
  isDiscordOAuthStateValid,
  readDiscordOAuthFlow,
} from "@/lib/discord-oauth-flow-core";

export const DISCORD_OAUTH_FLOW_COOKIE = "last_try_discord_oauth";
export const DISCORD_APPLICATION_COOKIE = "last_try_discord_application";

export const discordCookieOptions = (maxAge: number, path = "/") => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path,
  maxAge,
});
