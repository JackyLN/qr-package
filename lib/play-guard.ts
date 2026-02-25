import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export const DEVICE_ID_COOKIE_NAME = "tet_device_id";
export const PLAYED_COOKIE_NAME = "tet_played_once";

const DEVICE_ID_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
const PLAYED_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type DeviceContext = {
  deviceId: string;
  shouldSetDeviceCookie: boolean;
};

export function resolveDeviceContext(request: NextRequest): DeviceContext {
  const existing = request.cookies.get(DEVICE_ID_COOKIE_NAME)?.value?.trim();
  const deviceId = existing && existing.length > 0 ? existing : crypto.randomUUID();

  return {
    deviceId,
    shouldSetDeviceCookie: !existing,
  };
}

function playedCookieNameForVersion(playSessionVersion: number): string {
  return `${PLAYED_COOKIE_NAME}_v${Math.max(1, Math.trunc(playSessionVersion))}`;
}

export function hasPlayedInSession(request: NextRequest, playSessionVersion: number): boolean {
  const cookieName = playedCookieNameForVersion(playSessionVersion);
  const value = request.cookies.get(cookieName)?.value?.trim();
  return value === "1";
}

export function applyDeviceCookie(response: NextResponse, deviceId: string): void {
  response.cookies.set({
    name: DEVICE_ID_COOKIE_NAME,
    value: deviceId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEVICE_ID_COOKIE_MAX_AGE_SECONDS,
  });
}

export function applyPlayedCookie(response: NextResponse, playSessionVersion: number): void {
  const cookieName = playedCookieNameForVersion(playSessionVersion);

  response.cookies.set({
    name: cookieName,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PLAYED_COOKIE_MAX_AGE_SECONDS,
  });

  // Cleanup legacy fixed cookie from older builds.
  response.cookies.delete({
    name: PLAYED_COOKIE_NAME,
    path: "/",
  });
}

export async function consumeExtraPlay(deviceId: string): Promise<boolean> {
  const result = await prisma.devicePlayAllowance.updateMany({
    where: {
      deviceId,
      extraPlaysRemaining: { gt: 0 },
    },
    data: {
      extraPlaysRemaining: { decrement: 1 },
    },
  });

  return result.count > 0;
}

export async function refundExtraPlay(deviceId: string): Promise<void> {
  await prisma.devicePlayAllowance.updateMany({
    where: { deviceId },
    data: {
      extraPlaysRemaining: { increment: 1 },
    },
  });
}
