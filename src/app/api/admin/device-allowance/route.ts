import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

const MAX_EXTRA_PLAYS_PER_GRANT = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeDeviceId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length < 8 || trimmed.length > 128) {
    return null;
  }

  if (!/^[A-Za-z0-9-]+$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function normalizeExtraPlays(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const integer = Math.trunc(value);
  if (integer < 1 || integer > MAX_EXTRA_PLAYS_PER_GRANT) {
    return null;
  }

  return integer;
}

export async function POST(request: Request): Promise<NextResponse> {
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

  if (!isRecord(body)) {
    return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
  }

  const deviceId = normalizeDeviceId(body.deviceId);
  if (!deviceId) {
    return NextResponse.json({ error: "Invalid deviceId" }, { status: 400 });
  }

  const extraPlays = normalizeExtraPlays(body.extraPlays);
  if (!extraPlays) {
    return NextResponse.json(
      { error: `extraPlays must be an integer from 1 to ${MAX_EXTRA_PLAYS_PER_GRANT}` },
      { status: 400 },
    );
  }

  try {
    const allowance = await prisma.devicePlayAllowance.upsert({
      where: { deviceId },
      create: {
        deviceId,
        extraPlaysRemaining: extraPlays,
      },
      update: {
        extraPlaysRemaining: {
          increment: extraPlays,
        },
      },
      select: {
        deviceId: true,
        extraPlaysRemaining: true,
      },
    });

    return NextResponse.json(allowance);
  } catch (error) {
    console.error("POST /api/admin/device-allowance failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
