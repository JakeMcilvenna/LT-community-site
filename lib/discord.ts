import "server-only";

import { z } from "zod";

const DiscordWidgetSchema = z.object({
  id: z.string(),
  name: z.string(),
  instant_invite: z.string().url().nullable(),
  presence_count: z.number().int().nonnegative(),
  channels: z.array(z.object({ id: z.string(), name: z.string(), position: z.number() })),
});

export type DiscordServerStatus =
  | { status: "available"; name: string; inviteUrl?: string; onlineCount: number; channelCount: number }
  | { status: "unconfigured" | "unavailable" };

export async function getDiscordServerStatus(): Promise<DiscordServerStatus> {
  const guildId = process.env.DISCORD_GUILD_ID?.trim();
  if (!guildId || !/^\d+$/.test(guildId)) return { status: "unconfigured" };

  try {
    const response = await fetch(`https://discord.com/api/guilds/${guildId}/widget.json`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { status: "unavailable" };

    const parsed = DiscordWidgetSchema.safeParse(await response.json());
    if (!parsed.success) return { status: "unavailable" };

    return {
      status: "available",
      name: parsed.data.name,
      inviteUrl: parsed.data.instant_invite ?? undefined,
      onlineCount: parsed.data.presence_count,
      channelCount: parsed.data.channels.length,
    };
  } catch {
    return { status: "unavailable" };
  }
}
