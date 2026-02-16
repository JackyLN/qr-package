"use client";

import Image from "next/image";

type VietQrPanelProps = {
  claimId: string;
  amountVnd: number;
  bankBin: string;
  bankAccountNo: string;
  transferNote: string;
  dataUrl?: string;
  loading?: boolean;
  onLoadQr: () => void;
};

function copyText(value: string): void {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return;
  }

  navigator.clipboard.writeText(value).catch(() => undefined);
}

export default function VietQrPanel({
  claimId,
  amountVnd,
  bankBin,
  bankAccountNo,
  transferNote,
  dataUrl,
  loading = false,
  onLoadQr,
}: VietQrPanelProps) {
  return (
    <div className="mt-4 rounded-xl border border-[#f3c15f]/50 bg-[#651014]/55 p-4">
      <p className="text-sm font-semibold text-[#ffe6b7]">Thanh toan cho claim: {claimId}</p>

      {!dataUrl ? (
        <button
          type="button"
          onClick={onLoadQr}
          disabled={loading}
          className="tet-btn mt-3 w-full px-4 py-2.5 text-sm disabled:opacity-60"
        >
          {loading ? "Dang tai QR..." : "Lay QR chuyen tien"}
        </button>
      ) : (
        <div className="mt-3 flex flex-col items-center gap-3">
          <Image
            unoptimized
            src={dataUrl}
            alt={`VietQR ${claimId}`}
            width={280}
            height={280}
            className="h-[280px] w-[280px] rounded-lg border border-[#ffd489]/80 bg-white p-2"
          />
          <div className="grid w-full grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <button type="button" className="tet-btn-outline px-3 py-2" onClick={() => copyText(bankAccountNo)}>
              Copy STK: {bankAccountNo}
            </button>
            <button type="button" className="tet-btn-outline px-3 py-2" onClick={() => copyText(amountVnd.toString())}>
              Copy so tien: {amountVnd.toLocaleString("vi-VN")}
            </button>
            <button type="button" className="tet-btn-outline px-3 py-2" onClick={() => copyText(transferNote)}>
              Copy noi dung: {transferNote}
            </button>
            <button type="button" className="tet-btn-outline px-3 py-2" onClick={() => copyText(bankBin)}>
              Copy BIN: {bankBin}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
