import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const APPLICATION_TYPE_VALUES = ["retail", "forever"] as const;
type ApplicationType = (typeof APPLICATION_TYPE_VALUES)[number];

export const DISCORD_OAUTH_FLOW_LIFETIME_SECONDS = 10 * 60;

const flowSchema = z
  .object({
    version: z.literal(1),
    state: z.string().min(32).max(200),
    applicationType: z.enum(APPLICATION_TYPE_VALUES),
    issuedAt: z.number().int().nonnegative(),
    expiresAt: z.number().int().positive(),
  })
  .strict();

export type DiscordOAuthFlow = z.infer<typeof flowSchema>;

const getSecret = () => {
  const secret = process.env.APPLICATION_TOKEN_SECRET?.trim();
  if (!secret) throw new Error("APPLICATION_TOKEN_SECRET is required for Discord OAuth.");
  return secret;
};

const sign = (encodedPayload: string) =>
  createHmac("sha256", getSecret()).update(encodedPayload).digest();

const seal = (value: object) => {
  const encodedPayload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${encodedPayload}.${sign(encodedPayload).toString("base64url")}`;
};

const unseal = (value: string): unknown => {
  if (value.length > 8_000) return null;
  const parts = value.split(".");
  if (
    parts.length !== 2 ||
    parts.some((part) => !part || !/^[A-Za-z0-9_-]+$/.test(part))
  ) {
    return null;
  }

  try {
    const [encodedPayload, encodedSignature] = parts;
    const suppliedSignature = Buffer.from(encodedSignature, "base64url");
    const expectedSignature = sign(encodedPayload);
    if (
      suppliedSignature.length !== expectedSignature.length ||
      suppliedSignature.toString("base64url") !== encodedSignature ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    return JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

export const createDiscordOAuthFlow = (applicationType: ApplicationType) => {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const flow: DiscordOAuthFlow = {
    version: 1,
    state: randomBytes(32).toString("base64url"),
    applicationType,
    issuedAt,
    expiresAt: issuedAt + DISCORD_OAUTH_FLOW_LIFETIME_SECONDS,
  };
  return { flow, cookieValue: seal(flow) };
};

export const readDiscordOAuthFlow = (value: string | undefined) => {
  if (!value) return null;
  const parsed = flowSchema.safeParse(unseal(value));
  if (!parsed.success) return null;

  const now = Math.floor(Date.now() / 1_000);
  return parsed.data.issuedAt <= now &&
    parsed.data.expiresAt > now &&
    parsed.data.expiresAt - parsed.data.issuedAt === DISCORD_OAUTH_FLOW_LIFETIME_SECONDS
    ? parsed.data
    : null;
};

export const isDiscordOAuthStateValid = (
  flow: DiscordOAuthFlow,
  returnedState: string | null,
) => {
  if (!returnedState) return false;
  const expected = Buffer.from(flow.state, "utf8");
  const supplied = Buffer.from(returnedState, "utf8");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
};
