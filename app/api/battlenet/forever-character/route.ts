import { NextResponse, type NextRequest } from "next/server";

import { getForeverCharacterDetails } from "@/lib/battlenet/forever-client";
import { BATTLE_NET_SESSION_COOKIE, readRecruitmentSession } from "@/lib/battlenet/session";
import { isValidForeverCharacterName } from "@/lib/recruitment-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const headers = { "Cache-Control": "no-store" };
  const session = readRecruitmentSession(request.cookies.get(BATTLE_NET_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Reconnect Battle.net to load character details." }, { status: 401, headers });
  const name = request.nextUrl.searchParams.get("name");
  if (!name || name.length > 25 || !isValidForeverCharacterName(name)) {
    return NextResponse.json({ error: "Choose a valid Forever character." }, { status: 400, headers });
  }
  try {
    const character = await getForeverCharacterDetails(session, name);
    if (!character) return NextResponse.json({ error: "That character is no longer on this Battle.net account. Refresh the character list." }, { status: 409, headers });
    return NextResponse.json({ character }, { headers });
  } catch (error) {
    const expired = error instanceof Error && error.message === "BATTLENET_SESSION_EXPIRED";
    return NextResponse.json({ error: expired ? "Reconnect Battle.net to load character details." : "Extra character details are temporarily unavailable." }, { status: expired ? 401 : 502, headers });
  }
}
