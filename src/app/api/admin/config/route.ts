import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { getOrCreateGameConfig, updateGameConfig } from "@/lib/game-config";

export async function GET(request: Request): Promise<NextResponse> {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  try {
    const config = await getOrCreateGameConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("GET /api/admin/config failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  try {
    const config = await updateGameConfig(body);
    return NextResponse.json(config);
  } catch (error) {
    console.error("PUT /api/admin/config failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
