import { NextResponse, type NextRequest } from "next/server";

import { getOwnedForeverCharacters } from "@/lib/battlenet/forever-client";
import { BATTLE_NET_SESSION_COOKIE, readRecruitmentSession } from "@/lib/battlenet/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const session = readRecruitmentSession(request.cookies.get(BATTLE_NET_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "Connect Battle.net to choose your Forever character." }, { status: 401, headers });
  }

  try {
    const characters = await getOwnedForeverCharacters(session);
    return NextResponse.json({ characters, region: session.region }, { headers });
  } catch (error) {
    const reconnect = error instanceof Error && error.message === "BATTLENET_SESSION_EXPIRED";
    return NextResponse.json({
      error: reconnect
        ? "Your Battle.net connection expired. Reconnect or enter your character manually."
        : "Battle.net could not load your Forever characters. Try refreshing or enter your character manually.",
    }, { status: reconnect ? 401 : 502, headers });
  }
}
