import { Prisma, type GameConfig } from "@prisma/client";

import { GAME_CONFIG_DEFAULTS } from "@/lib/constants";
import { prisma } from "@/lib/db";

const GAME_CONFIG_KEY = "default";

type ConfigDbClient = Prisma.TransactionClient | typeof prisma;

type GameConfigInput = Partial<
  Omit<
    GameConfig,
    "key" | "createdAt" | "updatedAt" | "bankLastSyncedAt"
  > & {
    bankLastSyncedAt: Date | null;
  }
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }

  return fallback;
}

function toFloat(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    if (value === "true") {
      return true;
    }

    if (value === "false") {
      return false;
    }
  }

  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function alignRange(minAmountVnd: number, maxAmountVnd: number, stepVnd: number): {
  min: number;
  max: number;
  step: number;
} {
  const step = Math.max(1000, stepVnd);

  const rawMin = Math.max(1000, minAmountVnd);
  const rawMax = Math.max(rawMin, maxAmountVnd);

  let alignedMin = Math.ceil(rawMin / step) * step;
  let alignedMax = Math.floor(rawMax / step) * step;

  if (alignedMin > alignedMax) {
    const safe = Math.max(step, Math.round(rawMin / step) * step);
    alignedMin = safe;
    alignedMax = safe;
  }

  return {
    min: alignedMin,
    max: alignedMax,
    step,
  };
}

export function normalizeGameConfig(input: GameConfigInput, current?: GameConfig): Omit<GameConfig, "createdAt" | "updatedAt"> {
  const base = current ?? ({
    key: GAME_CONFIG_KEY,
    ...GAME_CONFIG_DEFAULTS,
    bankLastSyncedAt: null,
  } as GameConfig);

  const envelopeCount = Math.max(1, toInt(input.envelopeCount, base.envelopeCount));
  const requestedPrizeCount = toInt(input.prizeCount, base.prizeCount);
  const prizeCount = Math.max(1, requestedPrizeCount || envelopeCount);
  const isGameEnabled = toBool(input.isGameEnabled, base.isGameEnabled);

  const stepRequested = toInt(input.stepVnd, base.stepVnd);
  const range = alignRange(
    toInt(input.minAmountVnd, base.minAmountVnd),
    toInt(input.maxAmountVnd, base.maxAmountVnd),
    stepRequested,
  );

  const minAmountVnd = range.min;
  const maxAmountVnd = range.max;
  const stepVnd = range.step;

  const enableDoubleOrNothing = toBool(input.enableDoubleOrNothing, base.enableDoubleOrNothing);
  const doubleOrNothingProbability = clamp(
    toFloat(input.doubleOrNothingProbability, base.doubleOrNothingProbability),
    0,
    1,
  );
  const doubleMultiplier = Math.max(1, toInt(input.doubleMultiplier, base.doubleMultiplier));

  const floorRaw = toInt(input.floorOnLoseVnd, base.floorOnLoseVnd);
  const floorOnLoseVnd = Math.max(1000, floorRaw);

  const capRaw = toInt(input.capOnWinVnd, base.capOnWinVnd);
  const capOnWinVnd = Math.max(minAmountVnd, capRaw);

  const allowDoubleOrNothingOncePerClaim = toBool(
    input.allowDoubleOrNothingOncePerClaim,
    base.allowDoubleOrNothingOncePerClaim,
  );

  const bankLastSyncedAt =
    input.bankLastSyncedAt === undefined ? base.bankLastSyncedAt : input.bankLastSyncedAt;

  return {
    key: base.key,
    isGameEnabled,
    envelopeCount,
    prizeCount,
    minAmountVnd,
    maxAmountVnd,
    stepVnd,
    enableDoubleOrNothing,
    doubleOrNothingProbability,
    doubleMultiplier,
    floorOnLoseVnd,
    capOnWinVnd,
    allowDoubleOrNothingOncePerClaim,
    bankLastSyncedAt,
  };
}

export function generatePrizeAmountsFromConfig(config: Pick<GameConfig, "prizeCount" | "minAmountVnd" | "maxAmountVnd" | "stepVnd">): number[] {
  const aligned = alignRange(config.minAmountVnd, config.maxAmountVnd, config.stepVnd);

  const values: number[] = [];

  for (let amount = aligned.min; amount <= aligned.max; amount += aligned.step) {
    values.push(amount);
  }

  const safeValues = values.length > 0 ? values : [aligned.min];
  const prizeCount = Math.max(1, Math.trunc(config.prizeCount));

  return Array.from({ length: prizeCount }, () => {
    const randomIndex = Math.floor(Math.random() * safeValues.length);
    return safeValues[randomIndex] ?? aligned.min;
  });
}

export async function getOrCreateGameConfig(db: ConfigDbClient = prisma): Promise<GameConfig> {
  return db.gameConfig.upsert({
    where: { key: GAME_CONFIG_KEY },
    create: {
      key: GAME_CONFIG_KEY,
      ...GAME_CONFIG_DEFAULTS,
    },
    update: {},
  });
}

export async function updateGameConfig(input: unknown): Promise<GameConfig> {
  const safeInput = isRecord(input) ? (input as GameConfigInput) : {};
  const current = await getOrCreateGameConfig();
  const next = normalizeGameConfig(safeInput, current);

  return prisma.gameConfig.update({
    where: { key: GAME_CONFIG_KEY },
    data: {
      isGameEnabled: next.isGameEnabled,
      envelopeCount: next.envelopeCount,
      prizeCount: next.prizeCount,
      minAmountVnd: next.minAmountVnd,
      maxAmountVnd: next.maxAmountVnd,
      stepVnd: next.stepVnd,
      enableDoubleOrNothing: next.enableDoubleOrNothing,
      doubleOrNothingProbability: next.doubleOrNothingProbability,
      doubleMultiplier: next.doubleMultiplier,
      floorOnLoseVnd: next.floorOnLoseVnd,
      capOnWinVnd: next.capOnWinVnd,
      allowDoubleOrNothingOncePerClaim: next.allowDoubleOrNothingOncePerClaim,
      bankLastSyncedAt: next.bankLastSyncedAt,
    },
  });
}

export async function setBankLastSyncedAt(date: Date): Promise<void> {
  await prisma.gameConfig.update({
    where: { key: GAME_CONFIG_KEY },
    data: {
      bankLastSyncedAt: date,
    },
  });
}
