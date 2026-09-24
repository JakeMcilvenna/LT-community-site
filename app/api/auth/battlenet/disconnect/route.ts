import { NextResponse, type NextRequest } from "next/server";

import { BATTLE_NET_SESSION_COOKIE } from "@/lib/battlenet/session";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request origin is not allowed." }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete(BATTLE_NET_SESSION_COOKIE);
  return response;
}
