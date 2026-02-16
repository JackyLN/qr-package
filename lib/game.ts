import { ClaimStatus, Prisma, PrizeStatus } from "@prisma/client";

import { DEFAULT_TRANSFER_NOTE_PREFIX } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { generatePrizeAmountsFromConfig, getOrCreateGameConfig } from "@/lib/game-config";
import { normalizeTransferNote } from "@/lib/normalize";

const CLAIM_RETRIES = 8;

export class NoPrizeAvailableError extends Error {
  constructor() {
    super("No prizes left");
    this.name = "NoPrizeAvailableError";
  }
}

export class GameDisabledError extends Error {
  constructor() {
    super("Game is currently disabled");
    this.name = "GameDisabledError";
  }
}

class RetryableClaimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableClaimError";
  }
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof RetryableClaimError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2002" || error.code === "P2034";
  }

  return false;
}

export function buildDefaultTransferNote(seed: string): string {
  const suffix = seed.slice(-10).toUpperCase();
  return normalizeTransferNote(`${DEFAULT_TRANSFER_NOTE_PREFIX}${suffix}`, "LIXI");
}

export async function claimRandomPrize(): Promise<{ claimId: string; amountVnd: number }> {
  const config = await getOrCreateGameConfig();

  if (!config.isGameEnabled) {
    throw new GameDisabledError();
  }

  for (let attempt = 0; attempt < CLAIM_RETRIES; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const availableCount = await tx.prize.count({
            where: { status: PrizeStatus.NEW },
          });

          if (availableCount === 0) {
            throw new NoPrizeAvailableError();
          }

          const offset = Math.floor(Math.random() * availableCount);
          const prize = await tx.prize.findFirst({
            where: { status: PrizeStatus.NEW },
            orderBy: { createdAt: "asc" },
            skip: offset,
            select: {
              id: true,
              amountVnd: true,
            },
          });

          if (!prize) {
            throw new RetryableClaimError("Prize disappeared before claim creation");
          }

          const prizeUpdate = await tx.prize.updateMany({
            where: { id: prize.id, status: PrizeStatus.NEW },
            data: { status: PrizeStatus.CLAIMED },
          });

          if (prizeUpdate.count !== 1) {
            throw new RetryableClaimError("Lost race while updating prize status");
          }

          const claim = await tx.claim.create({
            data: {
              prizeId: prize.id,
              status: ClaimStatus.CLAIMED,
              transferNote: buildDefaultTransferNote(prize.id),
              claimedAt: new Date(),
            },
            select: {
              id: true,
            },
          });

          return {
            claimId: claim.id,
            amountVnd: prize.amountVnd,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );

      return result;
    } catch (error) {
      if (error instanceof NoPrizeAvailableError) {
        throw error;
      }

      if (isRetryableError(error) && attempt < CLAIM_RETRIES - 1) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to allocate prize after retries");
}

export async function resetGameState(): Promise<{ prizeCount: number; envelopeCount: number }> {
  const config = await getOrCreateGameConfig();
  const generatedPrizeAmounts = generatePrizeAmountsFromConfig(config);

  await prisma.$transaction(async (tx) => {
    await tx.claim.deleteMany();
    await tx.prize.deleteMany();

    if (generatedPrizeAmounts.length > 0) {
      await tx.prize.createMany({
        data: generatedPrizeAmounts.map((amountVnd) => ({
          amountVnd,
          status: PrizeStatus.NEW,
        })),
      });
    }
  });

  return {
    prizeCount: generatedPrizeAmounts.length,
    envelopeCount: config.envelopeCount,
  };
}
