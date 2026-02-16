import { promises as fs } from "node:fs";
import path from "node:path";

import { prisma } from "@/lib/db";
import { getOrCreateGameConfig, setBankLastSyncedAt } from "@/lib/game-config";

const VIETQR_BANKS_URL = "https://api.vietqr.io/v2/banks";
const LOGO_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type VietQrBank = {
  name?: unknown;
  shortName?: unknown;
  code?: unknown;
  bin?: unknown;
  swift_code?: unknown;
  logo?: unknown;
};

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function logoExtFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname.toLowerCase();

    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
      return ".jpg";
    }

    if (pathname.endsWith(".webp")) {
      return ".webp";
    }

    if (pathname.endsWith(".svg")) {
      return ".svg";
    }
  } catch {
    // Use png fallback.
  }

  return ".png";
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadLogo(bin: string, logoUrl: string): Promise<string | null> {
  const ext = logoExtFromUrl(logoUrl);
  const publicDir = path.join(process.cwd(), "public", "banks");
  const filename = `${bin}${ext}`;
  const absolutePath = path.join(publicDir, filename);

  await fs.mkdir(publicDir, { recursive: true });

  const response = await fetch(logoUrl);
  if (!response.ok) {
    return null;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(absolutePath, buffer);

  return `/banks/${filename}`;
}

export async function syncBanks(): Promise<{ total: number; logosDownloaded: number; lastSyncedAt: string }> {
  const config = await getOrCreateGameConfig();
  const now = new Date();
  const isFresh =
    config.bankLastSyncedAt !== null && now.getTime() - config.bankLastSyncedAt.getTime() < LOGO_TTL_MS;

  const response = await fetch(VIETQR_BANKS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to fetch VietQR banks: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: unknown };
  const list = Array.isArray(payload.data) ? payload.data : [];

  let logosDownloaded = 0;

  for (const rawBank of list) {
    if (typeof rawBank !== "object" || rawBank === null) {
      continue;
    }

    const bank = rawBank as VietQrBank;

    const bin = toNullableString(bank.bin);
    const shortName = toNullableString(bank.shortName);
    const name = toNullableString(bank.name);

    if (!bin || !shortName || !name) {
      continue;
    }

    const code = toNullableString(bank.code);
    const swiftCode = toNullableString(bank.swift_code);
    const logoUrl = toNullableString(bank.logo);

    const existing = await prisma.bank.findUnique({
      where: { bin },
      select: {
        localLogoPath: true,
      },
    });

    let localLogoPath = existing?.localLogoPath ?? null;

    if (logoUrl) {
      const shouldSkipDownload =
        isFresh &&
        !!localLogoPath &&
        (await fileExists(path.join(process.cwd(), "public", localLogoPath.replace(/^\//, ""))));

      if (!shouldSkipDownload) {
        try {
          const downloadedPath = await downloadLogo(bin, logoUrl);
          if (downloadedPath) {
            localLogoPath = downloadedPath;
            logosDownloaded += 1;
          }
        } catch {
          // Keep bank record even when logo download fails.
        }
      }
    }

    await prisma.bank.upsert({
      where: { bin },
      update: {
        name,
        shortName,
        code,
        swiftCode,
        logoUrl,
        localLogoPath,
      },
      create: {
        name,
        shortName,
        code,
        bin,
        swiftCode,
        logoUrl,
        localLogoPath,
      },
    });
  }

  await setBankLastSyncedAt(now);

  return {
    total: list.length,
    logosDownloaded,
    lastSyncedAt: now.toISOString(),
  };
}

export async function listPublicBanks(): Promise<
  Array<{
    id: string;
    name: string;
    shortName: string;
    code: string | null;
    bin: string;
    logoUrl: string | null;
    localLogoPath: string | null;
  }>
> {
  const banks = await prisma.bank.findMany({
    orderBy: [{ shortName: "asc" }, { bin: "asc" }],
    select: {
      id: true,
      name: true,
      shortName: true,
      code: true,
      bin: true,
      logoUrl: true,
      localLogoPath: true,
    },
  });

  return banks;
}
