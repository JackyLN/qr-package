import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { syncBanks } from "@/lib/banks";

export async function POST(request: Request): Promise<NextResponse> {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const result = await syncBanks();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("POST /api/admin/banks/sync failed", error);
    return NextResponse.json({ error: "Unable to sync banks" }, { status: 500 });
  }
}
