-- CreateTable
CREATE TABLE "GameConfig" (
    "key" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "envelopeCount" INTEGER NOT NULL DEFAULT 10,
    "prizeCount" INTEGER NOT NULL DEFAULT 10,
    "minAmountVnd" INTEGER NOT NULL DEFAULT 10000,
    "maxAmountVnd" INTEGER NOT NULL DEFAULT 200000,
    "stepVnd" INTEGER NOT NULL DEFAULT 10000,
    "enableDoubleOrNothing" BOOLEAN NOT NULL DEFAULT false,
    "doubleOrNothingProbability" REAL NOT NULL DEFAULT 0.5,
    "doubleMultiplier" INTEGER NOT NULL DEFAULT 2,
    "floorOnLoseVnd" INTEGER NOT NULL DEFAULT 10000,
    "capOnWinVnd" INTEGER NOT NULL DEFAULT 200000,
    "allowDoubleOrNothingOncePerClaim" BOOLEAN NOT NULL DEFAULT true,
    "bankLastSyncedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Bank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "code" TEXT,
    "bin" TEXT NOT NULL,
    "swiftCode" TEXT,
    "logoUrl" TEXT,
    "localLogoPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Claim" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "prizeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CLAIMED',
    "winnerName" TEXT,
    "winnerPhone" TEXT,
    "bankBin" TEXT,
    "bankAccountNo" TEXT,
    "transferNote" TEXT,
    "finalAmountVnd" INTEGER,
    "doubleOrNothingPlayed" BOOLEAN NOT NULL DEFAULT false,
    "doubleOrNothingOutcome" TEXT,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "paidRef" TEXT,
    CONSTRAINT "Claim_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Claim" ("bankAccountNo", "bankBin", "claimedAt", "id", "paidAt", "paidRef", "prizeId", "status", "transferNote", "winnerName", "winnerPhone") SELECT "bankAccountNo", "bankBin", "claimedAt", "id", "paidAt", "paidRef", "prizeId", "status", "transferNote", "winnerName", "winnerPhone" FROM "Claim";
DROP TABLE "Claim";
ALTER TABLE "new_Claim" RENAME TO "Claim";
CREATE UNIQUE INDEX "Claim_prizeId_key" ON "Claim"("prizeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Bank_bin_key" ON "Bank"("bin");
