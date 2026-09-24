import "server-only";

import { cache } from "react";

import { foreverMembersFromCsv } from "@/lib/forever-roster-core";
import type { GuildMember } from "@/types/guild";

const FOREVER_ROSTER_URL =
  "https://docs.google.com/spreadsheets/d/1l4Eygr61YeO0lXiJIyRONhSRofI98YuMRS17zwkijVg/gviz/tq?tqx=out:csv&gid=183785319";

export interface ForeverGuildMemberData {
  members: GuildMember[];
  integrationStatus: "connected" | "unavailable";
}

export const getForeverGuildMemberData = cache(async (): Promise<ForeverGuildMemberData> => {
  try {
    const response = await fetch(FOREVER_ROSTER_URL, {
      headers: { Accept: "text/csv" },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) return { members: [], integrationStatus: "unavailable" };

    const members = foreverMembersFromCsv(await response.text());
    return {
      members,
      integrationStatus: members.length ? "connected" : "unavailable",
    };
  } catch {
    return { members: [], integrationStatus: "unavailable" };
  }
});
