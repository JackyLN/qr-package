export const PRIZE_AMOUNTS_VND: number[] = [
  10000,
  10000,
  20000,
  20000,
  50000,
  50000,
  100000,
  100000,
  200000,
  500000,
];

export const DEFAULT_TRANSFER_NOTE_PREFIX = "CHUC MUNG NAM MOI - LIXI";
export const ENVELOPE_COUNT = 16;

export const GAME_CONFIG_DEFAULTS = {
  isGameEnabled: true,
  envelopeCount: 10,
  prizeCount: 10,
  minAmountVnd: 10000,
  maxAmountVnd: 200000,
  stepVnd: 10000,
  enableDoubleOrNothing: false,
  doubleOrNothingProbability: 0.5,
  doubleMultiplier: 2,
  floorOnLoseVnd: 10000,
  capOnWinVnd: 200000,
  allowDoubleOrNothingOncePerClaim: true,
} as const;

export const BANKS = [
  { bin: "970436", shortName: "VIETCOMBANK" },
  { bin: "970418", shortName: "BIDV" },
  { bin: "970415", shortName: "VIETINBANK" },
  { bin: "970405", shortName: "AGRIBANK" },
  { bin: "970422", shortName: "MBBANK" },
  { bin: "970407", shortName: "TECHCOMBANK" },
  { bin: "970432", shortName: "VPBANK" },
  { bin: "970423", shortName: "TPBANK" },
  { bin: "970403", shortName: "SACOMBANK" },
  { bin: "970437", shortName: "HDBANK" },
  { bin: "970448", shortName: "OCB" },
] as const;
