import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { resolveVerifiedCharacter } from "@/lib/battlenet/client";
import { BATTLE_NET_SESSION_COOKIE, readRecruitmentSession } from "@/lib/battlenet/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ characterId: z.string().min(1).max(100) }).strict();

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "This request origin is not allowed." }, { status: 403 });
  }
  const session = readRecruitmentSession(request.cookies.get(BATTLE_NET_SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "Reconnect Battle.net to continue." }, { status: 401 });

  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Choose a valid character." }, { status: 400 });
    const character = await resolveVerifiedCharacter(session, parsed.data.characterId);
    if (!character) {
      return NextResponse.json({ error: "That character is no longer available on this Battle.net account." }, { status: 409 });
    }
    return NextResponse.json(
      { battleTag: session.battleTag, region: session.region, character },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const reconnect = error instanceof Error && error.message === "BATTLENET_SESSION_EXPIRED";
    return NextResponse.json(
      { error: reconnect ? "Your Battle.net connection expired. Reconnect to continue." : "Character details are temporarily unavailable." },
      { status: reconnect ? 401 : 502 },
    );
  }
}
