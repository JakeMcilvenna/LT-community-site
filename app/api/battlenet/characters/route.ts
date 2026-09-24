import { NextResponse, type NextRequest } from "next/server";

import { getOwnedCharacters } from "@/lib/battlenet/client";
import { BATTLE_NET_SESSION_COOKIE, readRecruitmentSession } from "@/lib/battlenet/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readRecruitmentSession(request.cookies.get(BATTLE_NET_SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ connected: false, error: "Connect Battle.net to continue." }, { status: 401 });
  }
  try {
    const characters = await getOwnedCharacters(session);
    return NextResponse.json(
      {
        connected: true,
        battleTag: session.battleTag,
        region: session.region,
        characters,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const reconnect = error instanceof Error && error.message === "BATTLENET_SESSION_EXPIRED";
    return NextResponse.json(
      { connected: true, reconnect, error: reconnect ? "Your Battle.net connection expired. Reconnect to continue." : "Battle.net could not return your characters. Please try again shortly." },
      { status: reconnect ? 401 : 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
