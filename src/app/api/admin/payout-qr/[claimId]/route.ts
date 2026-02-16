import { ClaimStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import QRCode from "qrcode";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { buildDefaultTransferNote } from "@/lib/game";
import { buildVietQrPayload } from "@/lib/vietqr";

type ClaimRouteParams = {
  params: Promise<{ claimId: string }>;
};

export async function GET(request: Request, { params }: ClaimRouteParams): Promise<NextResponse> {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { claimId } = await params;

  const claim = await prisma.claim.findUnique({
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
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== ClaimStatus.CLAIMED) {
    return NextResponse.json({ error: "Claim is already paid" }, { status: 400 });
  }

  if (!claim.bankBin || !claim.bankAccountNo) {
    return NextResponse.json({ error: "Claim has no bank information yet" }, { status: 400 });
  }

  const transferNote = claim.transferNote ?? buildDefaultTransferNote(claim.id);

  if (!claim.transferNote) {
    await prisma.claim.update({
      where: { id: claim.id },
      data: { transferNote },
    });
  }

  const payload = buildVietQrPayload({
    bankBin: claim.bankBin,
    bankAccountNo: claim.bankAccountNo,
    amountVnd: claim.finalAmountVnd ?? claim.prize.amountVnd,
    transferNote,
  });

  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    type: "image/png",
    width: 512,
  });

  return NextResponse.json({ payload, dataUrl });
}
