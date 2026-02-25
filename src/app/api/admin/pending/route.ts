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

  const bins = claims
    .map((claim) => claim.bankBin)
    .filter((bin): bin is string => typeof bin === "string" && bin.length > 0);

  const banks = bins.length
    ? await prisma.bank.findMany({
        where: { bin: { in: Array.from(new Set(bins)) } },
        select: {
          bin: true,
          shortName: true,
          code: true,
        },
      })
    : [];

  const bankByBin = new Map(
    banks.map((bank) => [bank.bin, { shortName: bank.shortName, code: bank.code }]),
  );

  return NextResponse.json({
    claims: claims.map((claim) => ({
      bank: claim.bankBin ? bankByBin.get(claim.bankBin) ?? null : null,
      claimId: claim.id,
      status: claim.status,
      amountVnd: claim.finalAmountVnd ?? claim.prize.amountVnd,
      winnerName: claim.winnerName,
      winnerPhone: claim.winnerPhone,
      bankBin: claim.bankBin,
      bankShortName: claim.bankBin ? bankByBin.get(claim.bankBin)?.shortName ?? null : null,
      bankCode: claim.bankBin ? bankByBin.get(claim.bankBin)?.code ?? null : null,
      bankAccountNo: claim.bankAccountNo,
      transferNote: claim.transferNote,
      claimedAt: claim.claimedAt,
    })),
  });
}
