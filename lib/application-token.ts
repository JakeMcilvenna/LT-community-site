import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { APPLICATION_TYPE_VALUES, type ApplicationType } from "@/config/application-types";

const TOKEN_VERSION = 1 as const;
const TOKEN_LIFETIME_SECONDS = 24 * 60 * 60;
const DISCORD_SNOWFLAKE_PATTERN = /^\d{17,20}$/;

const applicationTokenPayloadSchema = z
  .object({
    version: z.literal(TOKEN_VERSION),
    discordUserId: z.string().regex(DISCORD_SNOWFLAKE_PATTERN),
    discordTag: z.string().min(1).max(100),
    guildId: z.string().regex(DISCORD_SNOWFLAKE_PATTERN),
    applicationType: z.enum(APPLICATION_TYPE_VALUES),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
    nonce: z.string().min(20).max(100),
  })
  .strict();

export type ApplicationTokenPayload = z.infer<typeof applicationTokenPayloadSchema>;

type CreateApplicationTokenInput = {
  discordUserId: string;
  discordTag: string;
  guildId: string;
  applicationType: ApplicationType;
};

const getRequiredEnvironmentValue = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const getConfiguredGuildId = () => {
  const guildId = getRequiredEnvironmentValue("DISCORD_GUILD_ID");
  if (!DISCORD_SNOWFLAKE_PATTERN.test(guildId)) {
    throw new Error("DISCORD_GUILD_ID is not a valid Discord snowflake.");
  }
  return guildId;
};

const sign = (encodedPayload: string) =>
  createHmac("sha256", getRequiredEnvironmentValue("APPLICATION_TOKEN_SECRET"))
    .update(encodedPayload)
    .digest();

export function createApplicationToken(input: CreateApplicationTokenInput) {
  const configuredGuildId = getConfiguredGuildId();
  if (input.guildId !== configuredGuildId) {
    throw new Error("The token guild does not match the configured Discord guild.");
  }

  const issuedAt = Math.floor(Date.now() / 1_000);
  const payload = applicationTokenPayloadSchema.parse({
    version: TOKEN_VERSION,
    ...input,
    issuedAt,
    expiresAt: issuedAt + TOKEN_LIFETIME_SECONDS,
    nonce: randomBytes(18).toString("base64url"),
  });
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const encodedSignature = sign(encodedPayload).toString("base64url");

  return `${encodedPayload}.${encodedSignature}`;
}

export function verifyApplicationToken(token: string): ApplicationTokenPayload | null {
  if (token.length > 4_096) return null;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [encodedPayload, encodedSignature] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(encodedPayload) || !/^[A-Za-z0-9_-]+$/.test(encodedSignature)) {
    return null;
  }

  try {
    const suppliedSignature = Buffer.from(encodedSignature, "base64url");
    const expectedSignature = sign(encodedPayload);
    if (
      suppliedSignature.length !== expectedSignature.length ||
      suppliedSignature.toString("base64url") !== encodedSignature ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const decodedPayload: unknown = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    const parsed = applicationTokenPayloadSchema.safeParse(decodedPayload);
    if (!parsed.success) return null;

    const payload = parsed.data;
    const now = Math.floor(Date.now() / 1_000);
    if (
      payload.guildId !== getConfiguredGuildId() ||
      payload.expiresAt <= now ||
      payload.issuedAt > now ||
      payload.expiresAt - payload.issuedAt !== TOKEN_LIFETIME_SECONDS
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
