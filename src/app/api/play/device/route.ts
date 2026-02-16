import { NextRequest, NextResponse } from "next/server";

import { applyDeviceCookie, resolveDeviceContext } from "@/lib/play-guard";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const deviceContext = resolveDeviceContext(request);

  const response = NextResponse.json({
    deviceId: deviceContext.deviceId,
    alreadyPlayed: deviceContext.alreadyPlayed,
  });

  if (deviceContext.shouldSetDeviceCookie) {
    applyDeviceCookie(response, deviceContext.deviceId);
  }

  return response;
}
