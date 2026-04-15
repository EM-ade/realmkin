import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/hooks/game/useNetworkStatus";
import styles from "./OfflineBanner.module.css";

export function OfflineBanner() {
  const { isOnline, isSyncing, queuedActions, offlineDuration } =
    useNetworkStatus();
  const [showSynced, setShowSynced] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handler = () => {
      if (wasOffline) {
        setShowSynced(true);
        setTimeout(() => setShowSynced(false), 3000);
        setWasOffline(false);
      }
    };
    window.addEventListener("game:syncComplete", handler);
    return () => window.removeEventListener("game:syncComplete", handler);
  }, [wasOffline]);

  useEffect(() => {
    if (!isOnline) setWasOffline(true);
  }, [isOnline]);

  const formatDuration = (ms: number | null) => {
    if (!ms) return "";
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  if (showSynced) {
    return (
      <div className={`${styles.banner} ${styles.synced}`}>
        ✅ Progress synced
      </div>
    );
  }

  if (isSyncing) {
    return (
      <div className={`${styles.banner} ${styles.syncing}`}>
        <span className={styles.spinner} /> Syncing {queuedActions} actions…
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={`${styles.banner} ${styles.offline}`}>
        <span>⚡</span>
        Offline
        {offlineDuration ? ` — ${formatDuration(offlineDuration)}` : ""}
        {queuedActions > 0
          ? ` · ${queuedActions} action${queuedActions !== 1 ? "s" : ""} queued`
          : ""}
        <span className={styles.subtext}> · progress saved locally</span>
      </div>
    );
  }

  return null;
}
