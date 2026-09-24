import { NextResponse, type NextRequest } from "next/server";

import { BATTLE_NET_SESSION_COOKIE, readRecruitmentSession } from "@/lib/battlenet/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readRecruitmentSession(request.cookies.get(BATTLE_NET_SESSION_COOKIE)?.value);

  if (!session) {
    return NextResponse.json(
      { connected: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      connected: true,
      battleTag: session.battleTag,
      region: session.region,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
