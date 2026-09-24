import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import {
  findApplicationChannel,
  isApplicationStatusId,
  recordApplicationChannel,
} from "@/lib/application-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;

const callbackSchema = z
  .object({
    applicationStatusId: z.string().uuid(),
    channelId: z.string().regex(DISCORD_SNOWFLAKE_PATTERN),
  })
  .strict();

const json = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: NO_STORE_HEADERS });

const secretsMatch = (supplied: string, expected: string) => {
  const suppliedDigest = createHash("sha256").update(supplied, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
};

export async function GET(request: Request) {
  const applicationStatusId = new URL(request.url).searchParams.get("id") ?? "";
  if (!isApplicationStatusId(applicationStatusId)) {
    return json({ error: "Invalid application status ID." }, 400);
  }

  try {
    const channelId = await findApplicationChannel(applicationStatusId);
    if (!channelId) return json({ ready: false }, 202);

    const guildId = process.env.DISCORD_GUILD_ID?.trim();
    if (!guildId || !DISCORD_SNOWFLAKE_PATTERN.test(guildId)) {
      return json({ error: "Discord is not configured." }, 503);
    }

    return json({
      ready: true,
      url: `https://discord.com/channels/${guildId}/${channelId}`,
    });
  } catch {
    return json({ ready: false }, 202);
  }
}

export async function POST(request: Request) {
  const expectedSecret = process.env.BOTGHOST_LINK_SECRET?.trim();
  const suppliedSecret = request.headers.get("x-botghost-secret");
  if (!expectedSecret || !suppliedSecret || !secretsMatch(suppliedSecret, expectedSecret)) {
    return json({ error: "Unauthorized." }, 401);
  }

  try {
    const parsed = callbackSchema.safeParse(await request.json());
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? "Invalid request body." }, 400);
    }

    await recordApplicationChannel(
      parsed.data.applicationStatusId,
      parsed.data.channelId,
    );
    return json({ ok: true });
  } catch {
    return json({ error: "The application channel could not be recorded." }, 500);
  }
}
