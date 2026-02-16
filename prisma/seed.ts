import { PrismaClient, PrizeStatus } from "@prisma/client";

import { GAME_CONFIG_DEFAULTS } from "../lib/constants";

const prisma = new PrismaClient();

function generateAmounts(): number[] {
  const min = GAME_CONFIG_DEFAULTS.minAmountVnd;
  const max = GAME_CONFIG_DEFAULTS.maxAmountVnd;
  const step = GAME_CONFIG_DEFAULTS.stepVnd;
  const values: number[] = [];

  for (let amount = min; amount <= max; amount += step) {
    values.push(amount);
  }

  return Array.from({ length: GAME_CONFIG_DEFAULTS.prizeCount }, () => {
    const index = Math.floor(Math.random() * values.length);
    return values[index] ?? min;
  });
}

async function main(): Promise<void> {
  await prisma.claim.deleteMany();
  await prisma.prize.deleteMany();
  await prisma.gameConfig.upsert({
    where: { key: "default" },
    create: {
      key: "default",
      ...GAME_CONFIG_DEFAULTS,
    },
    update: {
      ...GAME_CONFIG_DEFAULTS,
    },
  });

  const prizeAmounts = generateAmounts();

  if (prizeAmounts.length > 0) {
    await prisma.prize.createMany({
      data: prizeAmounts.map((amountVnd) => ({
        amountVnd,
        status: PrizeStatus.NEW,
      })),
    });
  }

  console.log(`Seeded ${prizeAmounts.length} prizes with current config defaults.`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
