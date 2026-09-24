import "server-only";

import { cache } from "react";
import { z } from "zod";

import { guildMembers } from "@/data/members";
import type { LiveStream, OfflineStreamer } from "@/types/guild";

const TokenSchema = z.object({ access_token: z.string(), expires_in: z.number() });
const StreamsSchema = z.object({
  data: z.array(z.object({
    id: z.string(),
    user_login: z.string(),
    user_name: z.string(),
    game_name: z.string(),
    title: z.string(),
    viewer_count: z.number(),
    thumbnail_url: z.string().url(),
  })),
});
const UsersSchema = z.object({
  data: z.array(z.object({
    login: z.string(),
    display_name: z.string(),
    profile_image_url: z.string().url(),
  })),
});

interface TwitchToken {
  accessToken: string;
  expiresAt: number;
}

let tokenCache: TwitchToken | null = null;

const getToken = async (clientId: string, clientSecret: string) => {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken;

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const response = await fetch(`https://id.twitch.tv/oauth2/token?${params}`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Twitch authentication failed");

  const parsed = TokenSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error("Unexpected Twitch token response");
  tokenCache = {
    accessToken: parsed.data.access_token,
    expiresAt: Date.now() + parsed.data.expires_in * 1_000,
  };
  return tokenCache.accessToken;
};

export interface GuildStreamData {
  live: LiveStream[];
  offline: OfflineStreamer[];
  status: "available" | "unconfigured" | "unavailable";
}

export const getLiveGuildStreams = cache(async (): Promise<GuildStreamData> => {
  const configured = guildMembers.filter((member) => member.twitchUsername);
  if (configured.length === 0) return { live: [], offline: [], status: "unconfigured" };

  const clientId = process.env.TWITCH_CLIENT_ID?.trim();
  const clientSecret = process.env.TWITCH_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return {
      live: [],
      offline: configured.map((member) => ({
        username: member.twitchUsername!,
        memberName: member.characterName,
        url: `https://twitch.tv/${member.twitchUsername}`,
      })),
      status: "unconfigured",
    };
  }

  try {
    const token = await getToken(clientId, clientSecret);
    const streamQuery = configured.map((member) => `user_login=${encodeURIComponent(member.twitchUsername!)}`).join("&");
    const userQuery = configured.map((member) => `login=${encodeURIComponent(member.twitchUsername!)}`).join("&");
    const headers = { "Client-Id": clientId, Authorization: `Bearer ${token}` };
    const [streamsResponse, usersResponse] = await Promise.all([
      fetch(`https://api.twitch.tv/helix/streams?${streamQuery}`, {
        headers,
        next: { revalidate: 60 },
        signal: AbortSignal.timeout(8_000),
      }),
      fetch(`https://api.twitch.tv/helix/users?${userQuery}`, {
        headers,
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(8_000),
      }),
    ]);
    if (!streamsResponse.ok || !usersResponse.ok) throw new Error("Twitch data request failed");

    const streams = StreamsSchema.safeParse(await streamsResponse.json());
    const users = UsersSchema.safeParse(await usersResponse.json());
    if (!streams.success || !users.success) throw new Error("Unexpected Twitch response");

    const userMap = new Map(users.data.data.map((user) => [user.login.toLowerCase(), user]));
    const memberMap = new Map(configured.map((member) => [member.twitchUsername!.toLowerCase(), member]));
    const liveNames = new Set(streams.data.data.map((stream) => stream.user_login.toLowerCase()));

    const live: LiveStream[] = streams.data.data.map((stream) => {
      const username = stream.user_login.toLowerCase();
      const member = memberMap.get(username);
      const user = userMap.get(username);
      return {
        id: stream.id,
        username: stream.user_login,
        memberName: member?.characterName ?? stream.user_name,
        title: stream.title,
        gameName: stream.game_name,
        viewerCount: stream.viewer_count,
        thumbnailUrl: stream.thumbnail_url.replace("{width}", "720").replace("{height}", "405"),
        profileImageUrl: user?.profile_image_url,
        url: `https://twitch.tv/${stream.user_login}`,
        isLive: true,
      };
    });

    const offline: OfflineStreamer[] = configured
      .filter((member) => !liveNames.has(member.twitchUsername!.toLowerCase()))
      .map((member) => ({
        username: member.twitchUsername!,
        memberName: member.characterName,
        profileImageUrl: userMap.get(member.twitchUsername!.toLowerCase())?.profile_image_url,
        url: `https://twitch.tv/${member.twitchUsername}`,
      }));

    return { live, offline, status: "available" };
  } catch {
    return {
      live: [],
      offline: configured.map((member) => ({
        username: member.twitchUsername!,
        memberName: member.characterName,
        url: `https://twitch.tv/${member.twitchUsername}`,
      })),
      status: "unavailable",
    };
  }
});
