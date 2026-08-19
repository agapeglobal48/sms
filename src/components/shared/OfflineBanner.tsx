"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WifiOff, RefreshCw } from "lucide-react";
import { countPendingAttendance } from "@/lib/offline/db";
import { syncPendingAttendance } from "@/lib/offline/syncAttendance";

export default function OfflineBanner() {
  const router = useRouter();
  // Must start as `true` on every render — the server has no concept of
  // "online," so starting any other way causes a hydration mismatch. The
  // real value is applied in the effect below, once we're on the client.
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    setPending(await countPendingAttendance());
  }, []);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    await syncPendingAttendance();
    await refreshPendingCount();
    setSyncing(false);
    router.refresh();
  }, [refreshPendingCount, router]);

  useEffect(() => {
    // This is the one legitimate case for this rule: navigator.onLine only
    // exists client-side, so the real value can only be read here, after
    // hydration — setting it any earlier would cause a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    refreshPendingCount();

    const goOnline = () => {
      setOnline(true);
      sync();
    };
    const goOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const interval = setInterval(refreshPendingCount, 5000);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount, sync]);

  if (online && pending === 0) return null;

  return (
    <div
      className={
        "flex items-center justify-between gap-3 px-4 sm:px-6 py-2 text-sm " +
        (online ? "bg-gold-soft text-ink" : "bg-danger-soft text-ink")
      }
    >
      <div className="flex items-center gap-2">
        {!online && <WifiOff size={15} className="text-danger shrink-0" />}
        {!online ? (
          <span>
            You&apos;re offline — changes are being saved on this device.
            {pending > 0 && ` (${pending} pending)`}
          </span>
        ) : syncing ? (
          <span className="flex items-center gap-1.5">
            <RefreshCw size={14} className="animate-spin" />
            Syncing {pending} change{pending === 1 ? "" : "s"}…
          </span>
        ) : (
          <span>
            {pending} change{pending === 1 ? "" : "s"} waiting to sync.
          </span>
        )}
      </div>
      {online && !syncing && pending > 0 && (
        <button
          onClick={sync}
          className="text-brand-light hover:text-brand font-medium whitespace-nowrap"
        >
          Sync now
        </button>
      )}
    </div>
  );
}
