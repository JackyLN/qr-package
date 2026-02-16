import { ClaimStatus, Prisma, PrizeStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

type ClaimRouteParams = {
  params: Promise<{ claimId: string }>;
};

type MarkPaidBody = {
  paidRef?: string;
};

export async function POST(request: Request, { params }: ClaimRouteParams): Promise<NextResponse> {
  const unauthorized = requireAdmin(request);
  if (unauthorized) {
    return unauthorized;
  }

  const { claimId } = await params;

  let body: MarkPaidBody = {};
  try {
    body = (await request.json()) as MarkPaidBody;
  } catch {
    body = {};
  }

  const paidRef =
    typeof body.paidRef === "string" && body.paidRef.trim().length > 0
      ? body.paidRef.trim().slice(0, 64)
      : null;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const claim = await tx.claim.findUnique({
        where: { id: claimId },
        select: {
          id: true,
          status: true,
          prizeId: true,
        },
      });

      if (!claim) {
        return null;
      }

      if (claim.status !== ClaimStatus.CLAIMED) {
        throw new Error("Claim is already paid");
      }

      const now = new Date();

      const paidClaim = await tx.claim.update({
        where: { id: claim.id },
        data: {
          status: ClaimStatus.PAID,
          paidAt: now,
          paidRef,
        },
        select: {
          id: true,
          status: true,
          paidAt: true,
          paidRef: true,
          prizeId: true,
        },
      });

      await tx.prize.update({
        where: { id: claim.prizeId },
        data: {
          status: PrizeStatus.PAID,
        },
      });

      return paidClaim;
    });

    if (!result) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Claim is already paid") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("POST /api/admin/mark-paid failed", error.code, error.message);
    } else {
      console.error("POST /api/admin/mark-paid failed", error);
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
