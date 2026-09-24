import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { BattleNetRecruitmentSession } from "./types";

const BATTLE_NET_REGIONS = ["eu", "us", "kr", "tw"] as const;

export const OAUTH_FLOW_LIFETIME_SECONDS = 10 * 60;
export const RECRUITMENT_SESSION_LIFETIME_SECONDS = 30 * 60;
const flowSchema = z.object({ version: z.literal(1), state: z.string().min(32).max(200), region: z.enum(BATTLE_NET_REGIONS), returnTo: z.string().startsWith("/recruitment").max(5_000), issuedAt: z.number().int(), expiresAt: z.number().int() }).strict();
const sessionSchema = z.object({ version: z.literal(1), accessToken: z.string().min(1).max(4_096), battleTag: z.string().min(1).max(100), accountId: z.string().min(1).max(200), region: z.enum(BATTLE_NET_REGIONS), issuedAt: z.number().int(), expiresAt: z.number().int() }).strict();
export type BattleNetOAuthFlow = z.infer<typeof flowSchema>;

const getEncryptionKey = () => {
  const secret = process.env.BATTLENET_SESSION_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("BATTLENET_SESSION_SECRET must contain at least 32 characters.");
  return createHash("sha256").update(secret, "utf8").digest();
};
const seal = (value: object) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
};
const unseal = (value: string): unknown => {
  if (value.length > 8_000) return null;
  const parts = value.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
  try {
    const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url"));
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8"));
  } catch { return null; }
};
const isCurrent = (issuedAt: number, expiresAt: number, lifetime: number) => {
  const now = Math.floor(Date.now() / 1_000);
  return issuedAt <= now && expiresAt > now && expiresAt - issuedAt <= lifetime;
};
export const isOAuthStateValid = (flow: BattleNetOAuthFlow, returnedState: string | null) => {
  if (!returnedState) return false;
  const expected = Buffer.from(flow.state, "utf8");
  const supplied = Buffer.from(returnedState, "utf8");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
};
export const createOAuthFlow = (region: BattleNetOAuthFlow["region"], returnTo: string) => {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const flow: BattleNetOAuthFlow = { version: 1, state: randomBytes(32).toString("base64url"), region, returnTo, issuedAt, expiresAt: issuedAt + OAUTH_FLOW_LIFETIME_SECONDS };
  return { flow, cookieValue: seal(flow) };
};
export const readOAuthFlow = (value: string | undefined) => {
  if (!value) return null;
  const parsed = flowSchema.safeParse(unseal(value));
  if (!parsed.success) return null;
  return isCurrent(parsed.data.issuedAt, parsed.data.expiresAt, OAUTH_FLOW_LIFETIME_SECONDS) ? parsed.data : null;
};
export const createRecruitmentSession = (input: Omit<BattleNetRecruitmentSession, "version" | "issuedAt" | "expiresAt"> & { providerExpiresIn: number }) => {
  const issuedAt = Math.floor(Date.now() / 1_000);
  const lifetime = Math.max(60, Math.min(RECRUITMENT_SESSION_LIFETIME_SECONDS, input.providerExpiresIn));
  const session: BattleNetRecruitmentSession = { version: 1, accessToken: input.accessToken, battleTag: input.battleTag, accountId: input.accountId, region: input.region, issuedAt, expiresAt: issuedAt + lifetime };
  return { session, cookieValue: seal(session), maxAge: lifetime };
};
export const readRecruitmentSession = (value: string | undefined) => {
  if (!value) return null;
  const parsed = sessionSchema.safeParse(unseal(value));
  if (!parsed.success) return null;
  return isCurrent(parsed.data.issuedAt, parsed.data.expiresAt, RECRUITMENT_SESSION_LIFETIME_SECONDS) ? parsed.data : null;
};
