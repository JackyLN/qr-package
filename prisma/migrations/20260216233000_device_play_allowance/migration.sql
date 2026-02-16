-- CreateTable
CREATE TABLE "DevicePlayAllowance" (
    "deviceId" TEXT NOT NULL PRIMARY KEY,
    "extraPlaysRemaining" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
