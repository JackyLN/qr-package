"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import VietQrPanel from "@/components/VietQrPanel";

type PendingClaim = {
  claimId: string;
  status: string;
  amountVnd: number;
  winnerName: string | null;
  winnerPhone: string | null;
  bankBin: string | null;
  bankAccountNo: string | null;
  transferNote: string | null;
  claimedAt: string;
};

type PendingResponse = {
  claims: PendingClaim[];
};

type QrMap = Record<string, { dataUrl?: string; payload?: string; loading?: boolean; error?: string }>;

type AdminPendingListProps = {
  passcode: string;
  refreshTick: number;
  onUnauthorized: () => void;
};

async function parseApiResponse<T>(response: Response): Promise<T> {
  const json = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    const error = (json as { error?: string }).error;
    throw new Error(error ?? "Request failed");
  }

  return json;
}

export default function AdminPendingList({ passcode, refreshTick, onUnauthorized }: AdminPendingListProps) {
  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [qrByClaim, setQrByClaim] = useState<QrMap>({});
  const [markingClaimId, setMarkingClaimId] = useState<string | null>(null);

  const adminHeaders = useMemo(
    () => ({
      "x-admin-passcode": passcode,
      "Content-Type": "application/json",
    }),
    [passcode],
  );

  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/pending", {
        headers: adminHeaders,
        cache: "no-store",
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await parseApiResponse<PendingResponse>(response);
      setClaims(data.claims);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Khong tai duoc du lieu");
    } finally {
      setLoading(false);
    }
  }, [adminHeaders, onUnauthorized]);

  useEffect(() => {
    void fetchPending();
  }, [fetchPending, refreshTick]);

  const toggleQr = async (claim: PendingClaim): Promise<void> => {
    const isOpen = expanded[claim.claimId];
    setExpanded((prev) => ({ ...prev, [claim.claimId]: !isOpen }));

    if (isOpen || qrByClaim[claim.claimId]?.dataUrl || qrByClaim[claim.claimId]?.loading) {
      return;
    }

    setQrByClaim((prev) => ({
      ...prev,
      [claim.claimId]: { ...prev[claim.claimId], loading: true, error: undefined },
    }));

    try {
      const response = await fetch(`/api/admin/payout-qr/${claim.claimId}`, {
        headers: adminHeaders,
        cache: "no-store",
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      const data = await parseApiResponse<{ payload: string; dataUrl: string }>(response);

      setQrByClaim((prev) => ({
        ...prev,
        [claim.claimId]: {
          dataUrl: data.dataUrl,
          payload: data.payload,
          loading: false,
        },
      }));
    } catch (fetchError) {
      setQrByClaim((prev) => ({
        ...prev,
        [claim.claimId]: {
          ...prev[claim.claimId],
          loading: false,
          error: fetchError instanceof Error ? fetchError.message : "Khong tao duoc QR",
        },
      }));
    }
  };

  const markPaid = async (claimId: string): Promise<void> => {
    setMarkingClaimId(claimId);

    try {
      const response = await fetch(`/api/admin/mark-paid/${claimId}`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({}),
      });

      if (response.status === 401) {
        onUnauthorized();
        return;
      }

      await parseApiResponse(response);
      await fetchPending();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Khong cap nhat duoc trang thai");
    } finally {
      setMarkingClaimId(null);
    }
  };

  return (
    <section className="tet-panel p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-[#ffe7bd]">Danh sach cho thanh toan</h2>
        <button type="button" onClick={() => void fetchPending()} className="tet-btn-outline px-4 py-2 text-sm">
          Tai lai
        </button>
      </div>

      {loading ? <p className="text-sm text-[#f4d7ab]">Dang tai danh sach...</p> : null}
      {error ? <p className="mb-3 text-sm text-[#ffb5b5]">{error}</p> : null}
      {!loading && claims.length === 0 ? <p className="text-sm text-[#f4d7ab]">Khong co claim nao dang cho.</p> : null}

      <div className="space-y-4">
        {claims.map((claim) => {
          const qrInfo = qrByClaim[claim.claimId];
          const isExpanded = expanded[claim.claimId];

          return (
            <article key={claim.claimId} className="rounded-xl border border-[#efc46d]/40 bg-[#581014]/55 p-4">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="text-[#f9d893]">So tien:</span> {claim.amountVnd.toLocaleString("vi-VN")}đ
                </p>
                <p>
                  <span className="text-[#f9d893]">Nguoi nhan:</span> {claim.winnerName ?? "-"}
                </p>
                <p>
                  <span className="text-[#f9d893]">Dien thoai:</span> {claim.winnerPhone ?? "-"}
                </p>
                <p>
                  <span className="text-[#f9d893]">BIN:</span> {claim.bankBin ?? "-"}
                </p>
                <p>
                  <span className="text-[#f9d893]">STK:</span> {claim.bankAccountNo ?? "-"}
                </p>
                <p>
                  <span className="text-[#f9d893]">Noi dung:</span> {claim.transferNote ?? "-"}
                </p>
                <p className="sm:col-span-2">
                  <span className="text-[#f9d893]">Claimed:</span> {new Date(claim.claimedAt).toLocaleString("vi-VN")}
                </p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="tet-btn px-4 py-2 text-sm" onClick={() => void toggleQr(claim)}>
                  {isExpanded ? "An QR" : "Hien QR chuyen tien"}
                </button>
                <button
                  type="button"
                  className="tet-btn-outline px-4 py-2 text-sm"
                  disabled={markingClaimId === claim.claimId}
                  onClick={() => void markPaid(claim.claimId)}
                >
                  {markingClaimId === claim.claimId ? "Dang cap nhat..." : "Mark paid"}
                </button>
              </div>

              {isExpanded ? (
                <>
                  <VietQrPanel
                    claimId={claim.claimId}
                    amountVnd={claim.amountVnd}
                    bankBin={claim.bankBin ?? ""}
                    bankAccountNo={claim.bankAccountNo ?? ""}
                    transferNote={claim.transferNote ?? ""}
                    dataUrl={qrInfo?.dataUrl}
                    loading={qrInfo?.loading}
                    onLoadQr={() => void toggleQr(claim)}
                  />
                  {qrInfo?.error ? <p className="mt-2 text-sm text-[#ffb5b5]">{qrInfo.error}</p> : null}
                </>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
