import { NextResponse } from "next/server";

import { listPublicBanks } from "@/lib/banks";
import { BANKS } from "@/lib/constants";

export async function GET(): Promise<NextResponse> {
  try {
    const banks = await listPublicBanks();

    if (banks.length > 0) {
      return NextResponse.json({
        banks: banks.map((bank) => ({
          id: bank.id,
          name: bank.name,
          shortName: bank.shortName,
          code: bank.code,
          bin: bank.bin,
          logoUrl: bank.localLogoPath,
        })),
      });
    }

    return NextResponse.json({
      banks: BANKS.map((bank) => ({
        id: bank.bin,
        name: bank.shortName,
        shortName: bank.shortName,
        code: null,
        bin: bank.bin,
        logoUrl: null,
      })),
    });
  } catch (error) {
    console.error("GET /api/banks failed", error);
    return NextResponse.json({ error: "Unable to load banks" }, { status: 500 });
  }
}
