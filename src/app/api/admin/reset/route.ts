import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { resetGameState } from "@/lib/game";

export async function POST(request: Request): Promise<NextResponse> {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const { prizeCount, envelopeCount } = await resetGameState();
    return NextResponse.json({ ok: true, prizeCount, envelopeCount });
  } catch (error) {
    console.error("POST /api/admin/reset failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
