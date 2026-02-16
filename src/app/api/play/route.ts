import { NextRequest, NextResponse } from "next/server";

import { GameDisabledError, NoPrizeAvailableError, claimRandomPrize } from "@/lib/game";
import {
  applyDeviceCookie,
  applyPlayedCookie,
  consumeExtraPlay,
  refundExtraPlay,
  resolveDeviceContext,
} from "@/lib/play-guard";

type PlayBody = {
  envelopeIndex?: number;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const deviceContext = resolveDeviceContext(request);

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
    return response;
  }

  let consumedExceptionPlay = false;

  if (deviceContext.alreadyPlayed) {
    consumedExceptionPlay = await consumeExtraPlay(deviceContext.deviceId);
    if (!consumedExceptionPlay) {
      const response = NextResponse.json(
        { error: "You already opened an envelope on this device" },
        { status: 429 },
      );
      if (deviceContext.shouldSetDeviceCookie) {
        applyDeviceCookie(response, deviceContext.deviceId);
      }
      return response;
    }
  }

  try {
    const result = await claimRandomPrize();
    const response = NextResponse.json(result);
    if (deviceContext.shouldSetDeviceCookie) {
      applyDeviceCookie(response, deviceContext.deviceId);
    }
    applyPlayedCookie(response);
    return response;
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
      return response;
    }

    if (error instanceof NoPrizeAvailableError) {
      const response = NextResponse.json({ error: "No prizes left" }, { status: 409 });
      if (deviceContext.shouldSetDeviceCookie) {
        applyDeviceCookie(response, deviceContext.deviceId);
      }
      return response;
    }

    console.error("POST /api/play failed", error);
    const response = NextResponse.json({ error: "Internal server error" }, { status: 500 });
    if (deviceContext.shouldSetDeviceCookie) {
      applyDeviceCookie(response, deviceContext.deviceId);
    }
    return response;
  }
}
