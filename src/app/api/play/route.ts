import { NextRequest, NextResponse } from "next/server";

import { GameDisabledError, NoPrizeAvailableError, claimRandomPrize } from "@/lib/game";
import { getOrCreateGameConfig } from "@/lib/game-config";
import {
  applyDeviceCookie,
  applyPlayedCookie,
  consumeExtraPlay,
  hasPlayedInSession,
  refundExtraPlay,
  resolveDeviceContext,
} from "@/lib/play-guard";

type PlayBody = {
  envelopeIndex?: number;
};

function withPlaySessionHeader(response: NextResponse, playSessionVersion: number): NextResponse {
  response.headers.set("x-play-session-version", String(playSessionVersion));
  return response;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const deviceContext = resolveDeviceContext(request);
  const config = await getOrCreateGameConfig();

  let body: PlayBody = {};

  try {
    body = (await request.json()) as PlayBody;
  } catch {
    body = {};
  }

  if (body.envelopeIndex !== undefined && typeof body.envelopeIndex !== "number") {
    const response = NextResponse.json({ error: "envelopeIndex must be a number" }, { status: 400 });
    if (deviceContext.shouldSetDeviceCookie) {
      applyDeviceCookie(response, deviceContext.deviceId);
    }
    return withPlaySessionHeader(response, config.playSessionVersion);
  }

  let consumedExceptionPlay = false;
  const alreadyPlayedInCurrentSession = hasPlayedInSession(request, config.playSessionVersion);

  if (alreadyPlayedInCurrentSession) {
    consumedExceptionPlay = await consumeExtraPlay(deviceContext.deviceId);
    if (!consumedExceptionPlay) {
      const response = NextResponse.json(
        { error: "You already opened an envelope on this device" },
        { status: 429 },
      );
      if (deviceContext.shouldSetDeviceCookie) {
        applyDeviceCookie(response, deviceContext.deviceId);
      }
      return withPlaySessionHeader(response, config.playSessionVersion);
    }
  }

  try {
    const result = await claimRandomPrize();
    const response = NextResponse.json(result);
    if (deviceContext.shouldSetDeviceCookie) {
      applyDeviceCookie(response, deviceContext.deviceId);
    }
    applyPlayedCookie(response, config.playSessionVersion);
    return withPlaySessionHeader(response, config.playSessionVersion);
  } catch (error) {
    if (consumedExceptionPlay) {
      try {
        await refundExtraPlay(deviceContext.deviceId);
      } catch (refundError) {
        console.error("POST /api/play refund extra play failed", refundError);
      }
    }

    if (error instanceof GameDisabledError) {
      const response = NextResponse.json({ error: "Game is currently turned off by admin" }, { status: 403 });
      if (deviceContext.shouldSetDeviceCookie) {
        applyDeviceCookie(response, deviceContext.deviceId);
      }
      return withPlaySessionHeader(response, config.playSessionVersion);
    }

    if (error instanceof NoPrizeAvailableError) {
      const response = NextResponse.json({ error: "No prizes left" }, { status: 409 });
      if (deviceContext.shouldSetDeviceCookie) {
        applyDeviceCookie(response, deviceContext.deviceId);
      }
      return withPlaySessionHeader(response, config.playSessionVersion);
    }

    console.error("POST /api/play failed", error);
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    if (deviceContext.shouldSetDeviceCookie) {
      applyDeviceCookie(response, deviceContext.deviceId);
    }
    return withPlaySessionHeader(response, config.playSessionVersion);
  }
}
