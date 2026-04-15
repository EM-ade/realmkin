import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ConnectionQuality } from "@/types/game/supabase";
import { logError } from "@/utils/game/errorLogger";
import {
  getQueueLength,
  isQueueStale,
  clearQueue,
} from "@/utils/game/offlineQueue";

const PING_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`
  : null;
const HEARTBEAT_INTERVAL_MS = 60_000; // 1 minute
const RECONNECT_CHECK_MS = 3_000; // 3 second poll when offline

interface NetworkStatusContextValue {
  isOnline: boolean;
  connectionQuality: ConnectionQuality;
  lastOnline: Date | null;
  offlineDuration: number | null;
  queuedActions: number;
  isSyncing: boolean;
  forcePing: () => Promise<boolean>;
  forceSync: () => Promise<void>;
  onSyncComplete: (cb: () => Promise<void>) => void;
}

const NetworkStatusContext = createContext<NetworkStatusContextValue | null>(
  null,
);

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(
    navigator.onLine ? "good" : "offline",
  );
  const [lastOnline, setLastOnline] = useState<Date | null>(
    navigator.onLine ? new Date() : null,
  );
  const [offlineDuration, setOfflineDuration] = useState<number | null>(null);
  const [queuedActions, setQueuedActions] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncCallbackRef = useRef<(() => Promise<void>) | null>(null);
  const offlineTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onSyncComplete = useCallback((cb: () => Promise<void>) => {
    syncCallbackRef.current = cb;
  }, []);

  // ── Ping the server ────────────────────────────────────────────────────────
  const forcePing = useCallback(async (): Promise<boolean> => {
    if (!PING_URL) return navigator.onLine;
    try {
      const start = Date.now();
      const resp = await fetch(PING_URL, {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      const latency = Date.now() - start;
      if (resp.ok || resp.status < 500) {
        setConnectionQuality(latency < 300 ? "good" : "slow");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // ── Go online ─────────────────────────────────────────────────────────────
  const handleOnline = useCallback(async () => {
    const pingOk = await forcePing();
    if (!pingOk) return; // browser says online but server unreachable

    setIsOnline(true);
    setConnectionQuality("good");
    setLastOnline(new Date());
    setOfflineDuration(null);

    if (reconnectPollRef.current) {
      clearInterval(reconnectPollRef.current);
      reconnectPollRef.current = null;
    }

    // Dispatch queued actions
    const qLen = getQueueLength();
    if (qLen > 0 && syncCallbackRef.current) {
      setIsSyncing(true);
      try {
        await syncCallbackRef.current();
        clearQueue();
        setQueuedActions(0);
        window.dispatchEvent(new CustomEvent("game:syncComplete"));
      } catch (err) {
        logError({
          error_type: "SYNC_FAILED",
          error_message: String(err),
          severity: 2,
        });
      } finally {
        setIsSyncing(false);
      }
    }
  }, [forcePing]);

  // ── Go offline ────────────────────────────────────────────────────────────
  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setConnectionQuality("offline");

    // Poll until back online
    if (!reconnectPollRef.current) {
      reconnectPollRef.current = setInterval(async () => {
        const back = await forcePing();
        if (back) handleOnline();
      }, RECONNECT_CHECK_MS);
    }

    // Track offline duration
    const wentOfflineAt = Date.now();
    if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
    offlineTimerRef.current = setInterval(() => {
      setOfflineDuration(Date.now() - wentOfflineAt);

      // Update queued count
      const stale = isQueueStale();
      if (stale === "expired") {
        logError({
          error_type: "QUEUE_EXPIRED_48H",
          error_message: "Offline queue discarded after 48h",
          severity: 4,
        });
      }
      setQueuedActions(getQueueLength());
    }, 5000);
  }, [forcePing, handleOnline]);

  // ── Browser event listeners ───────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (!navigator.onLine) handleOffline();

    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      forcePing().then((ok) => {
        if (!ok && isOnline) handleOffline();
      });
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (offlineTimerRef.current) clearInterval(offlineTimerRef.current);
      if (reconnectPollRef.current) clearInterval(reconnectPollRef.current);
    };
  }, [handleOnline, handleOffline, forcePing, isOnline]);

  const forceSync = useCallback(async () => {
    if (isOnline && syncCallbackRef.current) {
      setIsSyncing(true);
      try {
        await syncCallbackRef.current();
      } finally {
        setIsSyncing(false);
      }
    }
  }, [isOnline]);

  return (
    <NetworkStatusContext.Provider
      value={{
        isOnline,
        connectionQuality,
        lastOnline,
        offlineDuration,
        queuedActions,
        isSyncing,
        forcePing,
        forceSync,
        onSyncComplete,
      }}
    >
      {children}
    </NetworkStatusContext.Provider>
  );
}

export function useNetworkStatus(): NetworkStatusContextValue {
  const ctx = useContext(NetworkStatusContext);
  if (!ctx)
    throw new Error(
      "useNetworkStatus must be used within NetworkStatusProvider",
    );
  return ctx;
}
