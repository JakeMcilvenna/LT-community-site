import "server-only";

import { cache } from "react";

const RAID_HELPER_API_BASE = (process.env.RAID_HELPER_API_BASE?.trim() || "https://raid-helper.xyz/api/v4").replace(/\/$/, "");

export interface RaidHelperEvent {
  id: string;
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  signupLabel?: string;
  status?: string;
  signupUrl: string;
}

export interface RaidHelperEventData {
  events: RaidHelperEvent[];
  integrationStatus: "connected" | "unconfigured" | "unavailable";
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

const stringValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
};

const numberValue = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  }
  return undefined;
};

const toIso = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value < 10_000_000_000 ? value * 1_000 : value).toISOString();
  if (typeof value !== "string" || !value.trim()) return undefined;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && /^\d+(\.\d+)?$/.test(value.trim())) return new Date(numeric < 10_000_000_000 ? numeric * 1_000 : numeric).toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
};

const getEventRecords = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;
  const record = asRecord(payload);
  const events = record?.events ?? record?.postedEvents ?? record?.data;
  return Array.isArray(events) ? events : [];
};

const normalizeEvent = (payload: unknown): RaidHelperEvent | null => {
  const root = asRecord(payload);
  const record = root && (asRecord(root.event) ?? asRecord(root.data) ?? root);
  if (!record) return null;
  const eventId = stringValue(record, ["id", "eventId", "messageId", "message_id"]);
  const title = stringValue(record, ["title", "name", "eventName"]);
  const startAt = toIso(record.startTime ?? record.start_time ?? record.start ?? record.time ?? record.date);
  if (!eventId || !title || !startAt) return null;
  const signupCount = numberValue(record, ["signupCount", "signUpCount", "signups", "signedUp"])
    ?? (Array.isArray(record.signUps) ? record.signUps.length : undefined)
    ?? (Array.isArray(record.signups) ? record.signups.length : undefined);
  const max = numberValue(record, ["max", "maxSignups", "maxPlayers", "limit"]);
  return {
    id: eventId, title, startAt,
    description: stringValue(record, ["description", "info", "text"]),
    endAt: toIso(record.endTime ?? record.end_time ?? record.end),
    status: stringValue(record, ["status", "state"]),
    signupLabel: signupCount == null ? undefined : max == null ? `${signupCount} signed up` : `${signupCount} of ${max} signed up`,
    signupUrl: `https://raid-helper.dev/event/${eventId}`,
  };
};

export const getRaidHelperEventData = cache(async (): Promise<RaidHelperEventData> => {
  const serverId = process.env.RAID_HELPER_SERVER_ID?.trim() || process.env.DISCORD_GUILD_ID?.trim();
  const apiKey = process.env.RAID_HELPER_API_KEY?.trim();
  if (!serverId || !apiKey) return { events: [], integrationStatus: "unconfigured" };
  try {
    const response = await fetch(`${RAID_HELPER_API_BASE}/servers/${serverId}/events`, {
      headers: { Accept: "application/json", Authorization: apiKey },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return { events: [], integrationStatus: "unavailable" };
    const events = getEventRecords(await response.json())
      .map(normalizeEvent)
      .filter((event): event is RaidHelperEvent => event !== null)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    return { events, integrationStatus: "connected" };
  } catch { return { events: [], integrationStatus: "unavailable" }; }
});
