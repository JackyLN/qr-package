import { NextRequest, NextResponse } from "next/server";

import { getOrCreateGameConfig } from "@/lib/game-config";
import { applyDeviceCookie, hasPlayedInSession, resolveDeviceContext } from "@/lib/play-guard";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const deviceContext = resolveDeviceContext(request);
  const config = await getOrCreateGameConfig();
  const alreadyPlayed = hasPlayedInSession(request, config.playSessionVersion);

  const response = NextResponse.json({
    deviceId: deviceContext.deviceId,
    alreadyPlayed,
    playSessionVersion: config.playSessionVersion,
  });

  if (deviceContext.shouldSetDeviceCookie) {
    applyDeviceCookie(response, deviceContext.deviceId);
  }
  response.headers.set("x-play-session-version", String(config.playSessionVersion));

  return response;
}
