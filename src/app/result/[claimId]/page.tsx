"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";

import { BANKS } from "@/lib/constants";

const DOUBLE_OR_NOTHING_MIN_SPIN_MS = 1400;

type ClaimResponse = {
  claimId: string;
  status: "CLAIMED" | "PAID";
  amountVnd: number;
  baseAmountVnd?: number;
  finalAmountVnd?: number | null;
  winnerName: string | null;
  winnerPhone: string | null;
  bankBin: string | null;
  bankAccountNo: string | null;
  transferNote: string | null;
  doubleOrNothingPlayed?: boolean;
  doubleOrNothingOutcome?: "WIN" | "LOSE" | null;
  doubleOrNothingEnabled?: boolean;
  allowDoubleOrNothingOncePerClaim?: boolean;
  claimedAt: string;
  paidAt: string | null;
  paidRef: string | null;
  prizeStatus: "NEW" | "CLAIMED" | "PAID";
};

type BankItem = {
  id: string;
  name: string;
  shortName: string;
  code: string | null;
  bin: string;
  logoUrl: string | null;
};

type BanksResponse = {
  banks?: BankItem[];
};

function normalizeBankList(raw: unknown): BankItem[] {
  if (!raw || typeof raw !== "object") {
    return [];
  }

  const data = raw as BanksResponse;
  if (!Array.isArray(data.banks)) {
    return [];
  }

  return data.banks
    .map((bank) => ({
      id: typeof bank.id === "string" ? bank.id : bank.bin,
      name: typeof bank.name === "string" ? bank.name : bank.shortName,
      shortName: typeof bank.shortName === "string" ? bank.shortName : bank.name,
      code: typeof bank.code === "string" ? bank.code : null,
      bin: typeof bank.bin === "string" ? bank.bin : "",
      logoUrl: typeof bank.logoUrl === "string" ? bank.logoUrl : null,
    }))
    .filter((bank) => bank.bin.length > 0);
}

export default function ResultPage() {
  const params = useParams<{ claimId: string }>();
  const claimId = params.claimId;

  const [claim, setClaim] = useState<ClaimResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [playingDouble, setPlayingDouble] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [winnerName, setWinnerName] = useState("");
  const [winnerPhone, setWinnerPhone] = useState("");
  const [bankBin, setBankBin] = useState<string>(BANKS[0]?.bin ?? "");
  const [bankAccountNo, setBankAccountNo] = useState("");

  const [banks, setBanks] = useState<BankItem[]>([]);
  const [bankSearch, setBankSearch] = useState("");

  const isPaid = claim?.status === "PAID";

  useEffect(() => {
    const loadClaim = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/claim/${claimId}`, { cache: "no-store" });
        const data = (await response.json()) as ClaimResponse & { error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Khong tim thay claim");
        }

        setClaim(data);
        setWinnerName(data.winnerName ?? "");
        setWinnerPhone(data.winnerPhone ?? "");
        setBankBin(data.bankBin ?? BANKS[0]?.bin ?? "");
        setBankAccountNo(data.bankAccountNo ?? "");
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Da co loi");
      } finally {
        setLoading(false);
      }
    };

    void loadClaim();
  }, [claimId]);

  useEffect(() => {
    const loadBanks = async (): Promise<void> => {
      try {
        const response = await fetch("/api/banks", { cache: "no-store" });
        const raw = (await response.json()) as unknown;

        if (!response.ok) {
          return;
        }

        const normalized = normalizeBankList(raw);

        if (normalized.length > 0) {
          setBanks(normalized);
          if (!bankBin) {
            setBankBin(normalized[0]?.bin ?? "");
          }
        }
      } catch {
        // Keep static fallback when bank API fails.
      }
    };

    void loadBanks();
  }, [bankBin]);

  const effectiveBanks = useMemo(() => {
    if (banks.length > 0) {
      return banks;
    }

    return BANKS.map((bank) => ({
      id: bank.bin,
      name: bank.shortName,
      shortName: bank.shortName,
      code: null,
      bin: bank.bin,
      logoUrl: null,
    }));
  }, [banks]);

  const filteredBanks = useMemo(() => {
    const keyword = bankSearch.trim().toLowerCase();

    if (!keyword) {
      return effectiveBanks;
    }

    return effectiveBanks.filter((bank) => {
      return [bank.shortName, bank.name, bank.code ?? "", bank.bin]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [bankSearch, effectiveBanks]);

  const selectedBank = useMemo(() => {
    return effectiveBanks.find((bank) => bank.bin === bankBin) ?? null;
  }, [effectiveBanks, bankBin]);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();

    if (!claim || isPaid) {
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/claim/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerName: winnerName.trim() || undefined,
          winnerPhone: winnerPhone.trim() || undefined,
          bankBin,
          bankAccountNo,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Không cập nhật được thông tin nhận lì xì");
      }

      setSuccess("Đã gửi thông tin nhận lì xì!");
      setClaim((prev) =>
        prev
          ? {
              ...prev,
              winnerName: winnerName.trim() || null,
              winnerPhone: winnerPhone.trim() || null,
              bankBin,
              bankAccountNo,
            }
          : prev,
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Đã có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  const canPlayDoubleOrNothing =
    !!claim &&
    claim.status === "CLAIMED" &&
    claim.doubleOrNothingEnabled === true &&
    (!claim.allowDoubleOrNothingOncePerClaim || !claim.doubleOrNothingPlayed);

  const playDoubleOrNothing = async (): Promise<void> => {
    if (!claim || !canPlayDoubleOrNothing) {
      return;
    }

    const spinStartAt = Date.now();
    setPlayingDouble(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/claim/${claimId}/double-or-nothing`, {
        method: "POST",
      });

      const data = (await response.json()) as {
        error?: string;
        outcome?: "WIN" | "LOSE";
        finalAmountVnd?: number;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Không thể chơi double-or-nothing");
      }

      const elapsedMs = Date.now() - spinStartAt;
      if (elapsedMs < DOUBLE_OR_NOTHING_MIN_SPIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, DOUBLE_OR_NOTHING_MIN_SPIN_MS - elapsedMs));
      }

      const outcome = data.outcome ?? "LOSE";
      const finalAmountVnd = data.finalAmountVnd ?? claim.amountVnd;

      setClaim((prev) =>
        prev
          ? {
              ...prev,
              amountVnd: finalAmountVnd,
              finalAmountVnd,
              doubleOrNothingPlayed: true,
              doubleOrNothingOutcome: outcome,
            }
          : prev,
      );

      setSuccess(
        outcome === "WIN"
          ? `Bạn đã THẮNG! Số tiền mới: ${finalAmountVnd.toLocaleString("vi-VN")}đ`
          : `Rất tiếc, bạn THUA. Số tiền mới: ${finalAmountVnd.toLocaleString("vi-VN")}đ`,
      );
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : "Đã có lỗi xảy ra");
    } finally {
      setPlayingDouble(false);
    }
  };

  return (
    <main className="tet-pattern min-h-screen px-3 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <section className="tet-panel p-4 sm:p-7">
          <h1 className="tet-heading text-2xl font-black uppercase tracking-[0.1em] sm:text-3xl sm:tracking-[0.14em]">
            Kết quả lì xì
          </h1>

          {loading ? <p className="mt-4 text-sm text-[#f7dbb1]">Đang tải thông tin claim...</p> : null}
          {error ? <p className="mt-4 text-sm text-[#ffb5b5]">{error}</p> : null}

          {claim ? (
            <>
              <div className="mt-4 rounded-xl border border-[#f4c260]/45 bg-[#681015]/58 p-4 text-center">
                <p className="text-sm uppercase tracking-[0.2em] text-[#ffd88f]">Bạn đã nhận được</p>
                <p className="tet-heading mt-2 text-3xl font-black sm:text-5xl">
                  {claim.amountVnd.toLocaleString("vi-VN")}đ
                </p>
                <p className="mt-2 text-sm text-[#f4d7ac]">Chúc bạn một năm mới an khang - tài lộc đầy nhà.</p>
              </div>

              {claim.doubleOrNothingPlayed ? (
                <p className="mt-3 text-sm text-[#ffe2a5]">
                  Double-or-Nothing: {claim.doubleOrNothingOutcome === "WIN" ? "WIN" : "LOSE"}
                </p>
              ) : null}

              {canPlayDoubleOrNothing ? (
                <button
                  type="button"
                  className="tet-btn mt-4 inline-flex w-full items-center justify-center gap-2 px-5 py-3 disabled:opacity-60"
                  onClick={() => void playDoubleOrNothing()}
                  disabled={playingDouble}
                >
                  {playingDouble ? (
                    <>
                      <span
                        aria-hidden
                        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-[#6f0909]/30 border-t-[#6f0909]"
                      />
                      Đang quay kết quả...
                    </>
                  ) : (
                    "Double or Nothing"
                  )}
                </button>
              ) : null}

              {isPaid ? (
                <p className="mt-4 rounded-lg border border-[#f4ca78]/50 bg-[#6f1419]/55 p-3 text-sm text-[#ffe7ba]">
                  Claim nay da duoc thanh toan vao {claim.paidAt ? new Date(claim.paidAt).toLocaleString("vi-VN") : ""}.
                </p>
              ) : null}

              <form className="mt-5 space-y-3.5 sm:mt-6 sm:space-y-4" onSubmit={(event) => void submit(event)}>
                <div>
                  <label htmlFor="winnerName" className="tet-label">
                    Họ tên (tuỳ chọn)
                  </label>
                  <input
                    id="winnerName"
                    className="tet-input mt-1"
                    value={winnerName}
                    onChange={(event) => setWinnerName(event.target.value)}
                    disabled={isPaid}
                  />
                </div>

                <div>
                  <label htmlFor="winnerPhone" className="tet-label">
                    Số điện thoại (tuỳ chọn)
                  </label>
                  <input
                    id="winnerPhone"
                    className="tet-input mt-1"
                    value={winnerPhone}
                    onChange={(event) => setWinnerPhone(event.target.value)}
                    disabled={isPaid}
                  />
                </div>

                <div>
                  <label htmlFor="bankSearch" className="tet-label">
                    Tìm ngân hàng
                  </label>
                  <input
                    id="bankSearch"
                    className="tet-input mt-1"
                    value={bankSearch}
                    onChange={(event) => setBankSearch(event.target.value)}
                    placeholder="Nhập tên ngân hàng, mã, BIN"
                    disabled={isPaid}
                  />
                </div>

                <div>
                  <label className="tet-label">Chọn ngân hàng</label>
                  <div className="mt-1 max-h-52 overflow-y-auto overscroll-contain rounded-lg border border-[#f4c260]/50 bg-[#4f0c11]/70 sm:max-h-56">
                    {filteredBanks.map((bank) => {
                      const selected = bank.bin === bankBin;

                      return (
                        <button
                          key={bank.id}
                          type="button"
                          className={`flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                            selected ? "bg-[#7b171c]" : "hover:bg-[#681015]"
                          }`}
                          onClick={() => setBankBin(bank.bin)}
                          disabled={isPaid}
                        >
                          {bank.logoUrl ? (
                            <Image
                              src={bank.logoUrl}
                              alt={bank.shortName}
                              width={32}
                              height={32}
                              unoptimized
                              className="h-8 w-8 rounded bg-white object-contain"
                            />
                          ) : (
                            <span className="inline-block h-8 w-8 rounded-full bg-[#f4c260]/60" />
                          )}
                          <span className="leading-tight">
                            {bank.shortName} ({bank.bin})
                          </span>
                        </button>
                      );
                    })}
                    {filteredBanks.length === 0 ? (
                      <p className="px-3 py-2 text-sm text-[#f4d7ac]">Không tìm thấy ngân hàng phù hợp.</p>
                    ) : null}
                  </div>
                  {selectedBank ? (
                    <p className="mt-2 text-sm text-[#f4d7ac]">Đã chọn: {selectedBank.shortName} ({selectedBank.bin})</p>
                  ) : null}
                </div>

                <div>
                  <label htmlFor="bankAccountNo" className="tet-label">
                    Số tài khoản
                  </label>
                  <input
                    id="bankAccountNo"
                    className="tet-input mt-1"
                    value={bankAccountNo}
                    onChange={(event) => setBankAccountNo(event.target.value)}
                    disabled={isPaid}
                    required
                  />
                </div>

                <button type="submit" disabled={submitting || isPaid} className="tet-btn w-full px-5 py-3 disabled:opacity-60">
                  {submitting ? "Đang gửi..." : "Gửi thông tin nhận lì xì"}
                </button>
                {success ? <p className="text-sm text-[#ffe2a5]">{success}</p> : null}
              </form>
            </>
          ) : null}

          <div className="mt-6">
            <Link href="/play" className="tet-btn-outline inline-flex px-5 py-2.5 text-sm">
              Chơi thêm lượt nữa
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
