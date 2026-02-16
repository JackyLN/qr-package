import { ClaimStatus, DoubleOrNothingOutcome, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getOrCreateGameConfig } from "@/lib/game-config";

type ClaimRouteParams = {
  params: Promise<{ claimId: string }>;
};

export async function POST(_: Request, { params }: ClaimRouteParams): Promise<NextResponse> {
  const { claimId } = await params;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const config = await getOrCreateGameConfig(tx);

        if (!config.enableDoubleOrNothing) {
          throw new Error("Double or nothing is disabled");
        }

        const claim = await tx.claim.findUnique({
          where: { id: claimId },
          include: {
            prize: {
              select: {
                amountVnd: true,
              },
            },
          },
        });

        if (!claim) {
          return null;
        }

        if (claim.status !== ClaimStatus.CLAIMED) {
          throw new Error("Claim is already paid");
        }

        if (config.allowDoubleOrNothingOncePerClaim && claim.doubleOrNothingPlayed) {
          throw new Error("Double or nothing already played");
        }

        const currentAmount = claim.finalAmountVnd ?? claim.prize.amountVnd;
        const didWin = Math.random() < config.doubleOrNothingProbability;

        const finalAmountVnd = didWin
          ? Math.min(currentAmount * config.doubleMultiplier, config.capOnWinVnd)
          : config.floorOnLoseVnd;

        const outcome = didWin ? DoubleOrNothingOutcome.WIN : DoubleOrNothingOutcome.LOSE;

        const updated = await tx.claim.update({
          where: { id: claim.id },
          data: {
            finalAmountVnd,
            doubleOrNothingPlayed: true,
            doubleOrNothingOutcome: outcome,
          },
          select: {
            id: true,
            finalAmountVnd: true,
            doubleOrNothingOutcome: true,
            doubleOrNothingPlayed: true,
          },
        });

        return updated;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!result) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json({
      outcome: result.doubleOrNothingOutcome,
      finalAmountVnd: result.finalAmountVnd,
      played: result.doubleOrNothingPlayed,
    });
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "Double or nothing is disabled",
        "Claim is already paid",
        "Double or nothing already played",
      ].includes(error.message)
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("POST /api/claim/[claimId]/double-or-nothing failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
