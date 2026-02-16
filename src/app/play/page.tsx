"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import EnvelopeGrid from "@/components/EnvelopeGrid";
import EnvelopeOpenModal from "@/components/EnvelopeOpenModal";
import { ENVELOPE_COUNT } from "@/lib/constants";

type PlayApiResponse = {
  claimId: string;
  amountVnd: number;
};

export default function PlayPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noPrizeMessage, setNoPrizeMessage] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ claimId: string; amountVnd: number } | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [copiedDeviceId, setCopiedDeviceId] = useState(false);

  const envelopeCount = useMemo(() => Math.min(Math.max(ENVELOPE_COUNT, 10), 20), []);

  useEffect(() => {
    const loadDeviceId = async (): Promise<void> => {
      try {
        const response = await fetch("/api/play/device", { cache: "no-store" });
        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { deviceId?: string };
        if (typeof data.deviceId === "string" && data.deviceId.trim().length > 0) {
          setDeviceId(data.deviceId);
        }
      } catch {
        // Device ID is optional UI info for admin support.
      }
    };

    void loadDeviceId();
  }, []);

  const copyDeviceId = async (): Promise<void> => {
    if (!deviceId) {
      return;
    }

    try {
      await navigator.clipboard.writeText(deviceId);
      setCopiedDeviceId(true);
      setTimeout(() => setCopiedDeviceId(false), 1200);
    } catch {
      // Ignore clipboard failures.
    }
  };

  const play = async (envelopeIndex: number): Promise<void> => {
    if (loading || reveal) {
      return;
    }

    setLoading(true);
    setError(null);
    setNoPrizeMessage(null);

    try {
      const response = await fetch("/api/play", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ envelopeIndex }),
      });

      const data = (await response.json()) as PlayApiResponse & { error?: string };

      if (response.status === 409) {
        setNoPrizeMessage("Phong bao da het. Chuc ban nam moi may man va hen gap lai!");
        return;
      }

      if (response.status === 429) {
        setNoPrizeMessage("Ban da mo phong bao roi. Moi nguoi chi duoc mo 1 lan.");
        return;
      }

      if (!response.ok) {
        throw new Error(data.error ?? "Khong the mo phong bao luc nay");
      }

      setReveal({ claimId: data.claimId, amountVnd: data.amountVnd });
    } catch (playError) {
      setError(playError instanceof Error ? playError.message : "Da co loi xay ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="tet-pattern min-h-screen px-3 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <section className="tet-panel p-4 sm:p-7">
          <h1 className="tet-heading text-2xl font-black uppercase tracking-[0.1em] sm:text-4xl sm:tracking-[0.12em]">
            Chon mot phong bao
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#f4d8af]">Nhan vao mot phong bao do bat ky de thu van may dau nam.</p>

          <div className="mt-6">
            <EnvelopeGrid envelopeCount={envelopeCount} disabled={loading || !!reveal} onPick={(idx) => void play(idx)} />
          </div>

          {loading ? <p className="mt-4 text-sm text-[#ffdca1]">Dang rut li xi...</p> : null}
          {error ? <p className="mt-4 text-sm text-[#ffb5b5]">{error}</p> : null}
          {noPrizeMessage ? <p className="mt-4 text-sm text-[#ffe2ab]">{noPrizeMessage}</p> : null}
          {deviceId ? (
            <div className="mt-5 rounded-lg border border-[#f4c260]/35 bg-[#5e0e12]/45 p-3 text-xs text-[#f5dcb3]">
              <p>Device ID: {deviceId}</p>
              <p className="mt-1">Gửi mã này cho admin nếu cần xin thêm lượt cho thiết bị này.</p>
              <button type="button" className="tet-btn-outline mt-2 inline-flex px-3 py-1.5 text-xs" onClick={() => void copyDeviceId()}>
                {copiedDeviceId ? "Copied" : "Copy Device ID"}
              </button>
            </div>
          ) : null}
        </section>
      </div>

      {reveal ? (
        <EnvelopeOpenModal
          open={!!reveal}
          amountVnd={reveal.amountVnd}
          onAnimationDone={() => router.push(`/result/${reveal.claimId}`)}
        />
      ) : null}
    </main>
  );
}
