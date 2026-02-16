import { ClaimStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getOrCreateGameConfig } from "@/lib/game-config";
import { buildDefaultTransferNote } from "@/lib/game";

type ClaimRouteParams = {
  params: Promise<{ claimId: string }>;
};

type ClaimUpdateBody = {
  winnerName?: string;
  winnerPhone?: string;
  bankBin?: string;
  bankAccountNo?: string;
};

function toNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(_: Request, { params }: ClaimRouteParams): Promise<NextResponse> {
  const { claimId } = await params;

  const [claim, config] = await Promise.all([
    prisma.claim.findUnique({
      where: { id: claimId },
      include: {
        prize: {
          select: {
            amountVnd: true,
            status: true,
          },
        },
      },
    }),
    getOrCreateGameConfig(),
  ]);

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  const amountVnd = claim.finalAmountVnd ?? claim.prize.amountVnd;

  return NextResponse.json({
    claimId: claim.id,
    status: claim.status,
    amountVnd,
    baseAmountVnd: claim.prize.amountVnd,
    finalAmountVnd: claim.finalAmountVnd,
    winnerName: claim.winnerName,
    winnerPhone: claim.winnerPhone,
    bankBin: claim.bankBin,
    bankAccountNo: claim.bankAccountNo,
    transferNote: claim.transferNote,
    doubleOrNothingPlayed: claim.doubleOrNothingPlayed,
    doubleOrNothingOutcome: claim.doubleOrNothingOutcome,
    doubleOrNothingEnabled: config.enableDoubleOrNothing,
    allowDoubleOrNothingOncePerClaim: config.allowDoubleOrNothingOncePerClaim,
    claimedAt: claim.claimedAt,
    paidAt: claim.paidAt,
    paidRef: claim.paidRef,
    prizeStatus: claim.prize.status,
  });
}

export async function PATCH(request: Request, { params }: ClaimRouteParams): Promise<NextResponse> {
  const { claimId } = await params;

  let body: ClaimUpdateBody;

  try {
    body = (await request.json()) as ClaimUpdateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const winnerName = toNonEmptyString(body.winnerName);
  const winnerPhone = toNonEmptyString(body.winnerPhone);
  const rawBankBin = toNonEmptyString(body.bankBin);
  const rawBankAccountNo = toNonEmptyString(body.bankAccountNo);

  const bankBin = rawBankBin?.replace(/\D/g, "") ?? null;
  const bankAccountNo = rawBankAccountNo?.replace(/[^A-Za-z0-9]/g, "") ?? null;

  if (!bankBin || !bankAccountNo) {
    return NextResponse.json(
      {
        error: "bankBin and bankAccountNo are required",
      },
      { status: 400 },
    );
  }

  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    select: {
      id: true,
      status: true,
      transferNote: true,
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== ClaimStatus.CLAIMED) {
    return NextResponse.json({ error: "Claim is already paid" }, { status: 400 });
  }

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: {
      winnerName,
      winnerPhone,
      bankBin,
      bankAccountNo,
      transferNote: claim.transferNote ?? buildDefaultTransferNote(claim.id),
    },
    select: {
      id: true,
      status: true,
      winnerName: true,
      winnerPhone: true,
      bankBin: true,
      bankAccountNo: true,
      transferNote: true,
    },
  });

  return NextResponse.json(updated);
}
