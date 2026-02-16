import { ClaimStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET(request: Request): Promise<NextResponse> {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  const claims = await prisma.claim.findMany({
    where: {
      status: ClaimStatus.CLAIMED,
    },
    include: {
      prize: {
        select: {
          amountVnd: true,
        },
      },
    },
    orderBy: {
      claimedAt: "asc",
    },
  });

  return NextResponse.json({
    claims: claims.map((claim) => ({
      claimId: claim.id,
      status: claim.status,
      amountVnd: claim.finalAmountVnd ?? claim.prize.amountVnd,
      winnerName: claim.winnerName,
      winnerPhone: claim.winnerPhone,
      bankBin: claim.bankBin,
      bankAccountNo: claim.bankAccountNo,
      transferNote: claim.transferNote,
      claimedAt: claim.claimedAt,
    })),
  });
}
