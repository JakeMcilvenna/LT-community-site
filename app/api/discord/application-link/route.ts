import { createHash, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { APPLICATION_TYPES, APPLICATION_TYPE_VALUES } from "@/config/application-types";
import { createApplicationToken } from "@/lib/application-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;
const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;

const requestSchema = z
  .object({
    discordUserId: z.string().regex(DISCORD_SNOWFLAKE_PATTERN, "Invalid Discord user ID."),
    discordTag: z.string().trim().min(1, "Discord tag is required.").max(100),
    guildId: z.string().regex(DISCORD_SNOWFLAKE_PATTERN, "Invalid Discord guild ID."),
    applicationType: z.enum(APPLICATION_TYPE_VALUES),
  })
  .strict();

const json = (body: object, status = 200) =>
  NextResponse.json(body, { status, headers: NO_STORE_HEADERS });

const getRequiredEnvironmentValue = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const secretsMatch = (supplied: string, expected: string) => {
  const suppliedDigest = createHash("sha256").update(supplied, "utf8").digest();
  const expectedDigest = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(suppliedDigest, expectedDigest);
};

export async function POST(request: Request) {
  try {
    const expectedSecret = getRequiredEnvironmentValue("BOTGHOST_LINK_SECRET");
    const suppliedSecret = request.headers.get("x-botghost-secret");
    if (!suppliedSecret || !secretsMatch(suppliedSecret, expectedSecret)) {
      return json({ error: "Unauthorized." }, 401);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400);
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
        400,
      );
    }

    const configuredGuildId = getRequiredEnvironmentValue("DISCORD_GUILD_ID");
    if (parsed.data.guildId !== configuredGuildId) {
      return json({ error: "Invalid Discord guild ID." }, 403);
    }

    const token = createApplicationToken(parsed.data);
    const siteUrl = new URL(getRequiredEnvironmentValue("NEXT_PUBLIC_SITE_URL"));
    if (siteUrl.protocol !== "http:" && siteUrl.protocol !== "https:") {
      throw new Error("NEXT_PUBLIC_SITE_URL must use HTTP or HTTPS.");
    }

    const applicationUrl = new URL(
      APPLICATION_TYPES[parsed.data.applicationType].route,
      siteUrl,
    );
    applicationUrl.searchParams.set("token", token);

    return json({ url: applicationUrl.toString() });
  } catch {
    return json({ error: "The application link could not be created." }, 500);
  }
}
