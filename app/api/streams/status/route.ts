import { NextResponse } from "next/server";

import { getLiveGuildStreams } from "@/lib/twitch";

export const dynamic = "force-dynamic";

export async function GET() {
  const streams = await getLiveGuildStreams();

  return NextResponse.json(
    { live: streams.live.length > 0 },
    { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=30" } },
  );
}
