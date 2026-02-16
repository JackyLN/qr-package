"use client";

import Image from "next/image";
import { FormEvent, Fragment, useCallback, useEffect, useState } from "react";

const PASSCODE_KEY = "adminPasscode";

type PendingClaim = {
  id: string;
  amountVnd: number;
  winnerName: string | null;
  winnerPhone: string | null;
  bankBin: string | null;
  bankAccountNo: string | null;
  transferNote: string | null;
  claimedAt: string;
};

type PendingResponse = {
  claims?: unknown;
  items?: unknown;
  data?: unknown;
};

type QrState = {
  loading?: boolean;
  error?: string;
  dataUrl?: string;
  payload?: string;
};

type ApiError = {
  error?: string;
};

type GameConfig = {
  isGameEnabled: boolean;
  envelopeCount: number;
  prizeCount: number;
  minAmountVnd: number;
  maxAmountVnd: number;
  stepVnd: number;
  enableDoubleOrNothing: boolean;
  doubleOrNothingProbability: number;
  doubleMultiplier: number;
  floorOnLoseVnd: number;
  capOnWinVnd: number;
  allowDoubleOrNothingOncePerClaim: boolean;
  bankLastSyncedAt: string | null;
};

const DEFAULT_CONFIG: GameConfig = {
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
  bankLastSyncedAt: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

function toDateString(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return "";
}

function normalizePendingClaim(raw: unknown, index: number): PendingClaim {
  const data = isRecord(raw) ? raw : {};
  const id = toNullableString(data.id) ?? toNullableString(data.claimId) ?? `row-${index}`;

  return {
    id,
    amountVnd: toNumber(data.amountVnd),
    winnerName: toNullableString(data.winnerName),
    winnerPhone: toNullableString(data.winnerPhone),
    bankBin: toNullableString(data.bankBin),
    bankAccountNo: toNullableString(data.bankAccountNo),
    transferNote: toNullableString(data.transferNote),
    claimedAt: toDateString(data.claimedAt),
  };
}

function normalizePendingResponse(raw: unknown): PendingClaim[] {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => normalizePendingClaim(item, index));
  }

  if (!isRecord(raw)) {
    return [];
  }

  const list = Array.isArray(raw.claims)
    ? raw.claims
    : Array.isArray(raw.items)
      ? raw.items
      : Array.isArray(raw.data)
        ? raw.data
        : [];

  return list.map((item, index) => normalizePendingClaim(item, index));
}

function normalizeGameConfig(raw: unknown): GameConfig {
  if (!isRecord(raw)) {
    return DEFAULT_CONFIG;
  }

  return {
    isGameEnabled:
      typeof raw.isGameEnabled === "boolean"
        ? raw.isGameEnabled
        : DEFAULT_CONFIG.isGameEnabled,
    envelopeCount: Math.max(1, Math.trunc(toNumber(raw.envelopeCount) || DEFAULT_CONFIG.envelopeCount)),
    prizeCount: Math.max(1, Math.trunc(toNumber(raw.prizeCount) || DEFAULT_CONFIG.prizeCount)),
    minAmountVnd: Math.max(1000, Math.trunc(toNumber(raw.minAmountVnd) || DEFAULT_CONFIG.minAmountVnd)),
    maxAmountVnd: Math.max(1000, Math.trunc(toNumber(raw.maxAmountVnd) || DEFAULT_CONFIG.maxAmountVnd)),
    stepVnd: Math.max(1000, Math.trunc(toNumber(raw.stepVnd) || DEFAULT_CONFIG.stepVnd)),
    enableDoubleOrNothing:
      typeof raw.enableDoubleOrNothing === "boolean"
        ? raw.enableDoubleOrNothing
        : DEFAULT_CONFIG.enableDoubleOrNothing,
    doubleOrNothingProbability:
      typeof raw.doubleOrNothingProbability === "number"
        ? raw.doubleOrNothingProbability
        : DEFAULT_CONFIG.doubleOrNothingProbability,
    doubleMultiplier: Math.max(
      1,
      Math.trunc(toNumber(raw.doubleMultiplier) || DEFAULT_CONFIG.doubleMultiplier),
    ),
    floorOnLoseVnd: Math.max(
      1000,
      Math.trunc(toNumber(raw.floorOnLoseVnd) || DEFAULT_CONFIG.floorOnLoseVnd),
    ),
    capOnWinVnd: Math.max(1000, Math.trunc(toNumber(raw.capOnWinVnd) || DEFAULT_CONFIG.capOnWinVnd)),
    allowDoubleOrNothingOncePerClaim:
      typeof raw.allowDoubleOrNothingOncePerClaim === "boolean"
        ? raw.allowDoubleOrNothingOncePerClaim
        : DEFAULT_CONFIG.allowDoubleOrNothingOncePerClaim,
    bankLastSyncedAt: toNullableString(raw.bankLastSyncedAt),
  };
}

function formatClaimedAt(value: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("vi-VN");
}

function getStoredPasscode(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(PASSCODE_KEY) ?? "";
}

async function readApiJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & ApiError;

  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }

  return data;
}

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState("");
  const [wrongPasscode, setWrongPasscode] = useState(false);

  const [claims, setClaims] = useState<PendingClaim[]>([]);
  const [qrByClaim, setQrByClaim] = useState<Record<string, QrState>>({});
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);

  const [loadingClaims, setLoadingClaims] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [togglingGame, setTogglingGame] = useState(false);
  const [syncingBanks, setSyncingBanks] = useState(false);
  const [grantingExtraPlays, setGrantingExtraPlays] = useState(false);
  const [markingClaimId, setMarkingClaimId] = useState<string | null>(null);
  const [allowanceDeviceId, setAllowanceDeviceId] = useState("");
  const [allowanceExtraPlays, setAllowanceExtraPlays] = useState(1);

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    window.localStorage.removeItem(PASSCODE_KEY);
    setIsLoggedIn(false);
    setPasscodeInput("");
    setClaims([]);
    setQrByClaim({});
    setExpandedRows({});
    setWrongPasscode(true);
    setNotice(null);
    setError(null);
  }, []);

  // All admin calls include x-admin-passcode from localStorage.
  const adminFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const headers = new Headers(init?.headers);
      headers.set("x-admin-passcode", getStoredPasscode());

      if (init?.body && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(input, {
        ...init,
        headers,
        cache: "no-store",
      });

      if (response.status === 401) {
        handleUnauthorized();
        throw new Error("Wrong passcode");
      }

      return response;
    },
    [handleUnauthorized],
  );

  const loadPendingClaims = useCallback(async () => {
    setError(null);
    setLoadingClaims(true);

    try {
      const response = await adminFetch("/api/admin/pending");
      const data = await readApiJson<PendingResponse>(response);
      setClaims(normalizePendingResponse(data));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load claims");
    } finally {
      setLoadingClaims(false);
    }
  }, [adminFetch]);

  const loadConfig = useCallback(async () => {
    setError(null);
    setLoadingConfig(true);

    try {
      const response = await adminFetch("/api/admin/config");
      const data = await readApiJson<Record<string, unknown>>(response);
      setConfig(normalizeGameConfig(data));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load config");
    } finally {
      setLoadingConfig(false);
    }
  }, [adminFetch]);

  useEffect(() => {
    const storedPasscode = getStoredPasscode();
    if (storedPasscode) {
      setPasscodeInput(storedPasscode);
      setIsLoggedIn(true);
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    void Promise.all([loadPendingClaims(), loadConfig()]);
  }, [isLoggedIn, loadPendingClaims, loadConfig]);

  const onLogin = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const normalized = passcodeInput.trim();
    if (!normalized) {
      return;
    }

    window.localStorage.setItem(PASSCODE_KEY, normalized);
    setWrongPasscode(false);
    setError(null);
    setNotice(null);
    setIsLoggedIn(true);
  };

  const logoutAndReload = (): void => {
    window.localStorage.removeItem(PASSCODE_KEY);
    window.location.reload();
  };

  const refreshClaims = async (): Promise<void> => {
    setRefreshing(true);
    await loadPendingClaims();
    setRefreshing(false);
  };

  const resetGame = async (): Promise<void> => {
    setResetting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await adminFetch("/api/admin/reset", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const data = await readApiJson<{ prizeCount?: number }>(response);
      setNotice(`Game reset complete. New prizes: ${data.prizeCount ?? 0}`);
      await loadPendingClaims();
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  };

  const saveConfig = async (): Promise<void> => {
    setSavingConfig(true);
    setError(null);
    setNotice(null);

    try {
      const response = await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          isGameEnabled: config.isGameEnabled,
          envelopeCount: config.envelopeCount,
          prizeCount: config.prizeCount,
          minAmountVnd: config.minAmountVnd,
          maxAmountVnd: config.maxAmountVnd,
          stepVnd: config.stepVnd,
          enableDoubleOrNothing: config.enableDoubleOrNothing,
          doubleOrNothingProbability: config.doubleOrNothingProbability,
          doubleMultiplier: config.doubleMultiplier,
          floorOnLoseVnd: config.floorOnLoseVnd,
          capOnWinVnd: config.capOnWinVnd,
          allowDoubleOrNothingOncePerClaim: config.allowDoubleOrNothingOncePerClaim,
        }),
      });

      const data = await readApiJson<Record<string, unknown>>(response);
      setConfig(normalizeGameConfig(data));
      setNotice("Config saved");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Save config failed");
    } finally {
      setSavingConfig(false);
    }
  };

  const toggleGameStatus = async (): Promise<void> => {
    setTogglingGame(true);
    setError(null);
    setNotice(null);

    try {
      const response = await adminFetch("/api/admin/config", {
        method: "PUT",
        body: JSON.stringify({
          isGameEnabled: !config.isGameEnabled,
        }),
      });

      const data = await readApiJson<Record<string, unknown>>(response);
      const next = normalizeGameConfig(data);
      setConfig(next);
      setNotice(next.isGameEnabled ? "Game is now ON" : "Game is now OFF");
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Toggle game failed");
    } finally {
      setTogglingGame(false);
    }
  };

  const syncBanks = async (): Promise<void> => {
    setSyncingBanks(true);
    setError(null);
    setNotice(null);

    try {
      const response = await adminFetch("/api/admin/banks/sync", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const data = await readApiJson<{ total?: number; logosDownloaded?: number }>(response);
      setNotice(`Banks synced. Total: ${data.total ?? 0}, logos downloaded: ${data.logosDownloaded ?? 0}`);
      await loadConfig();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : "Bank sync failed");
    } finally {
      setSyncingBanks(false);
    }
  };

  const grantExtraPlays = async (): Promise<void> => {
    const deviceId = allowanceDeviceId.trim();
    if (!deviceId) {
      setError("Device ID is required");
      return;
    }

    const extraPlays = Math.max(1, Math.trunc(allowanceExtraPlays || 1));

    setGrantingExtraPlays(true);
    setError(null);
    setNotice(null);

    try {
      const response = await adminFetch("/api/admin/device-allowance", {
        method: "POST",
        body: JSON.stringify({
          deviceId,
          extraPlays,
        }),
      });

      const data = await readApiJson<{ extraPlaysRemaining?: number }>(response);
      setNotice(
        `Granted ${extraPlays} extra play(s). Remaining for device: ${data.extraPlaysRemaining ?? "-"}`,
      );
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : "Grant extra plays failed");
    } finally {
      setGrantingExtraPlays(false);
    }
  };

  const toggleQr = async (claim: PendingClaim): Promise<void> => {
    const rowOpen = expandedRows[claim.id];
    setExpandedRows((prev) => ({ ...prev, [claim.id]: !rowOpen }));

    const qrState = qrByClaim[claim.id];
    if (rowOpen || qrState?.dataUrl || qrState?.loading) {
      return;
    }

    setQrByClaim((prev) => ({ ...prev, [claim.id]: { loading: true } }));

    try {
      const response = await adminFetch(`/api/admin/payout-qr/${claim.id}`);
      const data = await readApiJson<Record<string, unknown>>(response);
      const dataUrl = toNullableString(data.dataUrl) ?? toNullableString(data.qrDataUrl);
      const payload = toNullableString(data.payload) ?? "";

      if (!dataUrl) {
        throw new Error("QR data missing");
      }

      setQrByClaim((prev) => ({
        ...prev,
        [claim.id]: {
          loading: false,
          dataUrl,
          payload,
        },
      }));
    } catch (qrError) {
      setQrByClaim((prev) => ({
        ...prev,
        [claim.id]: {
          loading: false,
          error: qrError instanceof Error ? qrError.message : "Failed to load QR",
        },
      }));
    }
  };

  const copyText = async (value: string, label: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied`);
    } catch {
      setError("Clipboard copy failed");
    }
  };

  const markPaid = async (claim: PendingClaim): Promise<void> => {
    const confirmed = window.confirm("Mark this claim as paid?");
    if (!confirmed) {
      return;
    }

    const paidRefInput = window.prompt("Paid reference (optional)", "");
    if (paidRefInput === null) {
      return;
    }

    setMarkingClaimId(claim.id);
    setError(null);
    setNotice(null);

    try {
      await readApiJson(
        await adminFetch(`/api/admin/mark-paid/${claim.id}`, {
          method: "POST",
          body: JSON.stringify({ paidRef: paidRefInput.trim() || undefined }),
        }),
      );

      setClaims((prev) => prev.filter((item) => item.id !== claim.id));
      setNotice("Marked as paid");
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Mark paid failed");
    } finally {
      setMarkingClaimId(null);
    }
  };

  if (!ready) {
    return <main className="min-h-screen bg-white p-6 text-gray-900">Loading...</main>;
  }

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-white p-4 text-gray-900 sm:p-6">
        <div className="mx-auto mt-12 w-full max-w-md rounded border border-gray-300 bg-white p-6">
          <h1 className="text-2xl font-semibold">Admin Login</h1>
          <p className="mt-1 text-sm text-gray-600">Enter admin passcode to continue.</p>
          {wrongPasscode ? <p className="mt-3 text-sm text-red-600">Wrong passcode</p> : null}

          <form className="mt-4 space-y-3" onSubmit={onLogin}>
            <input
              type="password"
              value={passcodeInput}
              onChange={(event) => setPasscodeInput(event.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
              placeholder="Passcode"
              required
            />
            <button type="submit" className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Save Passcode
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white p-4 text-gray-900 sm:p-6">
      <div className="mx-auto w-full max-w-7xl space-y-4">
        <section className="rounded border border-gray-300 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void refreshClaims()}
                disabled={refreshing || loadingClaims}
                className="rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 disabled:opacity-60"
              >
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                onClick={() => void resetGame()}
                disabled={resetting}
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {resetting ? "Resetting..." : "Reset Game"}
              </button>
              <button
                type="button"
                onClick={() => void toggleGameStatus()}
                disabled={togglingGame || loadingConfig}
                className={`rounded px-3 py-2 text-sm text-white disabled:opacity-60 ${
                  config.isGameEnabled ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {togglingGame ? "Updating..." : config.isGameEnabled ? "Turn Game Off" : "Turn Game On"}
              </button>
              <button
                type="button"
                onClick={() => void syncBanks()}
                disabled={syncingBanks}
                className="rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm hover:bg-gray-200 disabled:opacity-60"
              >
                {syncingBanks ? "Syncing..." : "Sync Banks"}
              </button>
              <button
                type="button"
                onClick={logoutAndReload}
                className="rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-100"
              >
                Logout
              </button>
            </div>
          </div>

          {notice ? <p className="mt-3 text-sm text-green-700">{notice}</p> : null}
          {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        </section>

        <section className="rounded border border-gray-300 bg-white p-4">
          <h2 className="text-lg font-semibold">Game Config</h2>
          {loadingConfig ? <p className="mt-2 text-sm text-gray-600">Loading config...</p> : null}

          <div className="mt-3 rounded border border-gray-200 bg-gray-50 p-3">
            <p className="text-sm font-medium">Grant extra plays for a specific device</p>
            <p className="mt-1 text-xs text-gray-600">
              Ask user for their Device ID shown on the play page, then grant 1+ extra plays.
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <label className="text-sm">
                Device ID
                <input
                  className="mt-1 block w-[22rem] max-w-full rounded border border-gray-300 px-2 py-1"
                  type="text"
                  value={allowanceDeviceId}
                  onChange={(event) => setAllowanceDeviceId(event.target.value)}
                  placeholder="e.g. 5d8f2f4e-..."
                />
              </label>
              <label className="text-sm">
                Extra plays
                <input
                  className="mt-1 block w-28 rounded border border-gray-300 px-2 py-1"
                  type="number"
                  min={1}
                  max={100}
                  value={allowanceExtraPlays}
                  onChange={(event) => setAllowanceExtraPlays(Math.max(1, Number(event.target.value) || 1))}
                />
              </label>
              <button
                type="button"
                onClick={() => void grantExtraPlays()}
                disabled={grantingExtraPlays}
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {grantingExtraPlays ? "Granting..." : "Grant Extra Plays"}
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              Envelope Count
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                type="number"
                value={config.envelopeCount}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, envelopeCount: Math.max(1, Number(event.target.value) || 1) }))
                }
              />
            </label>

            <label className="text-sm">
              Prize Count
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                type="number"
                value={config.prizeCount}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, prizeCount: Math.max(1, Number(event.target.value) || 1) }))
                }
              />
            </label>

            <label className="text-sm">
              Min Amount VND
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                type="number"
                value={config.minAmountVnd}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, minAmountVnd: Math.max(1000, Number(event.target.value) || 1000) }))
                }
              />
            </label>

            <label className="text-sm">
              Max Amount VND
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                type="number"
                value={config.maxAmountVnd}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, maxAmountVnd: Math.max(1000, Number(event.target.value) || 1000) }))
                }
              />
            </label>

            <label className="text-sm">
              Step VND
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                type="number"
                value={config.stepVnd}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, stepVnd: Math.max(1000, Number(event.target.value) || 1000) }))
                }
              />
            </label>

            <label className="text-sm">
              Double Probability (0-1)
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={config.doubleOrNothingProbability}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, doubleOrNothingProbability: Number(event.target.value) || 0 }))
                }
              />
            </label>

            <label className="text-sm">
              Double Multiplier
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                type="number"
                value={config.doubleMultiplier}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, doubleMultiplier: Math.max(1, Number(event.target.value) || 1) }))
                }
              />
            </label>

            <label className="text-sm">
              Floor On Lose VND
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                type="number"
                value={config.floorOnLoseVnd}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, floorOnLoseVnd: Math.max(1000, Number(event.target.value) || 1000) }))
                }
              />
            </label>

            <label className="text-sm">
              Cap On Win VND
              <input
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
                type="number"
                value={config.capOnWinVnd}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, capOnWinVnd: Math.max(1000, Number(event.target.value) || 1000) }))
                }
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-6 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.isGameEnabled}
                onChange={(event) => setConfig((prev) => ({ ...prev, isGameEnabled: event.target.checked }))}
              />
              Game Enabled
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.enableDoubleOrNothing}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, enableDoubleOrNothing: event.target.checked }))
                }
              />
              Enable Double or Nothing
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.allowDoubleOrNothingOncePerClaim}
                onChange={(event) =>
                  setConfig((prev) => ({ ...prev, allowDoubleOrNothingOncePerClaim: event.target.checked }))
                }
              />
              Allow Double Once Per Claim
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saveConfig()}
              disabled={savingConfig}
              className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {savingConfig ? "Saving..." : "Save Config"}
            </button>
            <p className="text-sm text-gray-600">
              Last bank sync: {config.bankLastSyncedAt ? formatClaimedAt(config.bankLastSyncedAt) : "Never"}
            </p>
          </div>
        </section>

        <section className="rounded border border-gray-300 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">Pending Claims</h2>
          {loadingClaims ? <p className="text-sm text-gray-600">Loading claims...</p> : null}
          {!loadingClaims && claims.length === 0 ? <p className="text-sm text-gray-600">No pending claims.</p> : null}

          <div className="overflow-x-auto">
            <table className="min-w-[1100px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="border border-gray-300 px-3 py-2">Claimed At</th>
                  <th className="border border-gray-300 px-3 py-2">Amount (VND)</th>
                  <th className="border border-gray-300 px-3 py-2">Name</th>
                  <th className="border border-gray-300 px-3 py-2">Phone</th>
                  <th className="border border-gray-300 px-3 py-2">Bank BIN</th>
                  <th className="border border-gray-300 px-3 py-2">Account</th>
                  <th className="border border-gray-300 px-3 py-2">Note</th>
                  <th className="border border-gray-300 px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => {
                  const qrState = qrByClaim[claim.id];
                  const expanded = expandedRows[claim.id];

                  return (
                    <Fragment key={claim.id}>
                      <tr>
                        <td className="border border-gray-300 px-3 py-2">{formatClaimedAt(claim.claimedAt)}</td>
                        <td className="border border-gray-300 px-3 py-2">{claim.amountVnd.toLocaleString("vi-VN")}</td>
                        <td className="border border-gray-300 px-3 py-2">{claim.winnerName ?? "-"}</td>
                        <td className="border border-gray-300 px-3 py-2">{claim.winnerPhone ?? "-"}</td>
                        <td className="border border-gray-300 px-3 py-2">{claim.bankBin ?? "-"}</td>
                        <td className="border border-gray-300 px-3 py-2">{claim.bankAccountNo ?? "-"}</td>
                        <td className="border border-gray-300 px-3 py-2">{claim.transferNote ?? "-"}</td>
                        <td className="border border-gray-300 px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void toggleQr(claim)}
                              className="rounded border border-gray-300 bg-gray-100 px-2 py-1 hover:bg-gray-200"
                            >
                              {expanded ? "Hide QR" : "Show QR"}
                            </button>
                            <button
                              type="button"
                              onClick={() => void markPaid(claim)}
                              disabled={markingClaimId === claim.id}
                              className="rounded bg-blue-600 px-2 py-1 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              {markingClaimId === claim.id ? "Marking..." : "Mark Paid"}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {expanded ? (
                        <tr key={`${claim.id}-details`}>
                          <td className="border border-gray-300 p-4" colSpan={8}>
                            {qrState?.loading ? <p className="text-sm text-gray-600">Loading QR...</p> : null}
                            {qrState?.error ? <p className="text-sm text-red-700">{qrState.error}</p> : null}

                            {qrState?.dataUrl ? (
                              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                                <Image
                                  src={qrState.dataUrl}
                                  alt={`QR ${claim.id}`}
                                  width={320}
                                  height={320}
                                  unoptimized
                                  className="h-[280px] w-[280px] border border-gray-300"
                                />

                                <div className="space-y-2 text-sm">
                                  <p>
                                    <span className="font-medium">Transfer note:</span> {claim.transferNote ?? "-"}
                                  </p>
                                  <p>
                                    <span className="font-medium">Account number:</span> {claim.bankAccountNo ?? "-"}
                                  </p>
                                  <p>
                                    <span className="font-medium">Amount:</span>{" "}
                                    {claim.amountVnd.toLocaleString("vi-VN")} VND
                                  </p>

                                  <div className="flex flex-wrap gap-2 pt-2">
                                    <button
                                      type="button"
                                      className="rounded border border-gray-300 bg-gray-100 px-2 py-1 hover:bg-gray-200"
                                      onClick={() => void copyText(claim.transferNote ?? "", "Transfer note")}
                                    >
                                      Copy Note
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded border border-gray-300 bg-gray-100 px-2 py-1 hover:bg-gray-200"
                                      onClick={() => void copyText(claim.bankAccountNo ?? "", "Account")}
                                    >
                                      Copy Account
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded border border-gray-300 bg-gray-100 px-2 py-1 hover:bg-gray-200"
                                      onClick={() => void copyText(claim.amountVnd.toString(), "Amount")}
                                    >
                                      Copy Amount
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
