import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  BuildingRecord,
  OfflineGains,
  SaveStatus,
} from "@/types/game/supabase";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { useNetworkStatus } from "@/providers/game/NetworkStatusProvider";
import { useGameState } from "@/stores/gameStore";
import {
  enqueueAction,
  readQueue,
  saveStateSnapshot,
} from "@/utils/game/offlineQueue";
import { logError } from "@/utils/game/errorLogger";
import { supabase } from "@/lib/supabase";

// ─────────────────────────────────────────────────────────────────────────────
// Context shape
// ─────────────────────────────────────────────────────────────────────────────
interface GameStateContextValue {
  buildings: BuildingRecord[];
  isSaving: boolean;
  isSyncing: boolean;
  lastSaved: Date | null;
  saveStatus: SaveStatus;
  saveVersion: number;
  offlineGains: OfflineGains | null;
  dismissGains: () => void;
  forceSave: () => Promise<void>;
  queueOrSave: (action: Parameters<typeof enqueueAction>[0]) => void;
  refreshBuildings: () => Promise<void>;
}

const GameStateContext = createContext<GameStateContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Auto-save constants
// ─────────────────────────────────────────────────────────────────────────────
const DEBOUNCE_MS = 2_000; // batch rapid changes
const MAX_DELAY_MS = 10_000; // force-save if changes keep coming
const CHECKPOINT_MS = 30_000; // periodic localStorage checkpoint
const HEARTBEAT_MS = 60_000; // update last_active on server

function generateSessionId() {
  return crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function GameStateProvider({ children }: { children: ReactNode }) {
  const { player, accessToken } = useAuth();
  const { isOnline, onSyncComplete } = useNetworkStatus();

  const [buildings, setBuildings] = useState<BuildingRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveVersion, setSaveVersion] = useState(0);
  const [offlineGains, setOfflineGains] = useState<OfflineGains | null>(null);

  const sessionIdRef = useRef(generateSessionId());
  const saveVersionRef = useRef(0);
  const pendingChangesRef = useRef<Record<string, unknown>[]>([]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDelayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkpointTimerRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Listen for offline gains from AuthProvider ────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent<OfflineGains>;
      setOfflineGains(ev.detail);
    };
    window.addEventListener("game:offlineGains", handler);
    return () => window.removeEventListener("game:offlineGains", handler);
  }, []);

  // ── Load buildings when player authenticates ──────────────────────────────
  useEffect(() => {
    if (player && isOnline) {
      refreshBuildings();
    }
  }, [player?.id, isOnline]);

  async function refreshBuildings() {
    if (!player || !accessToken) return;
    try {
      if (accessToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: "",
        });
      }
      const { data } = await supabase
        .from("buildings")
        .select("*")
        .eq("player_id", player.id);
      if (data) {
        setBuildings(data.map(mapBuildingRow));
        // Import into game store
        useGameState.getState().importSupabaseData(data, {
          wood: player.resources.wood ?? 100,
          stone: player.resources.stone ?? 100,
          iron: player.resources.iron ?? 100,
          food: player.resources.food ?? 100,
          gem_balance: player.gemBalance ?? 50,
        });
      }
    } catch (err) {
      logError({
        player_id: player?.id,
        error_type: "BUILDINGS_LOAD_FAIL",
        error_message: String(err),
        severity: 2,
      });
    }
  }

  // ── Core save function ────────────────────────────────────────────────────
  const forceSave = useCallback(async () => {
    if (!player || !accessToken || pendingChangesRef.current.length === 0)
      return;
    if (!isOnline) {
      setSaveStatus("offline");
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    const version = ++saveVersionRef.current;
    setSaveVersion(version);

    const changes = Object.assign({}, ...pendingChangesRef.current);
    pendingChangesRef.current = [];

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || accessToken;

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const resp = await fetch(`${supabaseUrl}/functions/v1/save-game`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          saveVersion: version,
          sessionId: sessionIdRef.current,
          changes,
        }),
      });

      if (resp.status === 409) {
        // Conflict logic: we are behind the server.
        // Get the latest from server to resolve the conflict locally.
        const errorData = await resp.json().catch(() => ({}));
        if (errorData.serverVersion) {
          saveVersionRef.current = Math.max(
            saveVersionRef.current,
            errorData.serverVersion,
          );
          setSaveVersion(saveVersionRef.current);
        }
        await refreshBuildings();
        setSaveStatus("error");
        return;
      }

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const result = await resp.json();
      if (result.saveVersion) {
        saveVersionRef.current = result.saveVersion;
        setSaveVersion(result.saveVersion);
      }

      setLastSaved(new Date());
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      // Queue for retry when back online
      enqueueAction({
        action: "place", // generic — save-game handles full diff
        timestamp: new Date().toISOString(),
        data: changes,
      });
      setSaveStatus("offline");
      logError({
        player_id: player.id,
        error_type: "SAVE_FAILED",
        error_message: String(err),
        severity: 2,
      });
    } finally {
      setIsSaving(false);
    }
  }, [player, accessToken, isOnline]);

  // ── Debounced save trigger ─────────────────────────────────────────────────
  const debouncedSave = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      if (maxDelayTimerRef.current) clearTimeout(maxDelayTimerRef.current);
      maxDelayTimerRef.current = null;
      forceSave();
    }, DEBOUNCE_MS);

    // Max delay: force save even if changes keep coming
    if (!maxDelayTimerRef.current) {
      maxDelayTimerRef.current = setTimeout(() => {
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        maxDelayTimerRef.current = null;
        forceSave();
      }, MAX_DELAY_MS);
    }
  }, [forceSave]);

  // ── Handle save events from GameStore ─────────────────────────────────────
  useEffect(() => {
    const handleSaveTriggered = (e: Event) => {
      const ev = e as CustomEvent<{
        buildings: any[];
        resources: any;
      }>;

      const changes = {
        // Buildings sent as "sync" actions — server upserts each row
        buildings: ev.detail.buildings.map((b) => ({
          id: b.id,
          action: "sync" as const,
          data: {
            building_type: b.type.replace(/-/g, "_"), // "town-hall" → "town_hall"
            level: b.level,
            grid_x: b.slotIndex % 50,
            grid_y: Math.floor(b.slotIndex / 50),
            status: b.underConstruction
              ? b.isUpgrade
                ? "upgrading"
                : "building"
              : "idle",
            construction_end:
              typeof b.constructionFinishesAt === "number" &&
              !isNaN(b.constructionFinishesAt)
                ? new Date(b.constructionFinishesAt).toISOString()
                : null,
            last_collected_at:
              typeof b.lastTickAt === "number" && !isNaN(b.lastTickAt)
                ? new Date(b.lastTickAt).toISOString()
                : new Date().toISOString(),
          },
        })),
        // Absolute resource values — remap gameStore keys to DB column names
        resources: {
          wood: ev.detail.resources.wood ?? 0,
          stone: ev.detail.resources.clay ?? 0, // gameStore "clay" = DB "stone"
          iron: ev.detail.resources.iron ?? 0,
          food: ev.detail.resources.crop ?? 0, // gameStore "crop" = DB "food"
        },
      };

      pendingChangesRef.current.push(changes);
      debouncedSave();
    };

    window.addEventListener("game:saveTriggered", handleSaveTriggered);
    return () =>
      window.removeEventListener("game:saveTriggered", handleSaveTriggered);
  }, [debouncedSave]);

  // ── Queue or save an action ───────────────────────────────────────────────
  const queueOrSave = useCallback(
    (action: Parameters<typeof enqueueAction>[0]) => {
      pendingChangesRef.current.push(action.data);
      if (!isOnline) {
        enqueueAction(action);
        setSaveStatus("offline");
      } else {
        debouncedSave();
      }
    },
    [isOnline, debouncedSave],
  );

  // ── Sync offline queue when back online ──────────────────────────────────
  useEffect(() => {
    onSyncComplete(async () => {
      const queue = readQueue();
      if (queue.actions.length === 0) return;
      setIsSyncing(true);
      try {
        // Merge all queued actions into one save call
        const mergedChanges = Object.assign(
          {},
          ...queue.actions.map((a: any) => a.data),
        );
        pendingChangesRef.current.push(mergedChanges);
        await forceSave();
      } finally {
        setIsSyncing(false);
      }
    });
  }, [onSyncComplete, forceSave]);

  // ── visibilitychange: immediate save when tab hides ───────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && pendingChangesRef.current.length > 0) {
        forceSave();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [forceSave]);

  // ── beforeunload: sendBeacon emergency save ───────────────────────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (!player || !accessToken) return;
      const payload = JSON.stringify({
        playerId: player.id,
        accessToken,
        sessionId: sessionIdRef.current,
        saveVersion: saveVersionRef.current,
        snapshot: { buildings, resources: player.resources },
      });
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        navigator.sendBeacon(
          `${supabaseUrl}/functions/v1/beacon-save`,
          payload,
        );
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [player, accessToken, buildings]);

  // ── Periodic checkpoint to localStorage ──────────────────────────────────
  useEffect(() => {
    checkpointTimerRef.current = setInterval(() => {
      if (player) {
        saveStateSnapshot({
          buildings,
          resources: player.resources,
          timestamp: Date.now(),
        });
      }
    }, CHECKPOINT_MS);
    return () => {
      if (checkpointTimerRef.current) clearInterval(checkpointTimerRef.current);
    };
  }, [player, buildings]);

  // ── Heartbeat: update last_active every 60 seconds ───────────────────────
  useEffect(() => {
    if (!player || !isOnline) return;
    heartbeatTimerRef.current = setInterval(async () => {
      try {
        // Cast needed: Supabase SDK v2 requires full Relationships in Database
        // type for update() to resolve correctly; this call is safe.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("players")
          .update({ last_active: new Date().toISOString() })
          .eq("id", player.id);
      } catch {
        /* silent */
      }
    }, HEARTBEAT_MS);
    return () => {
      if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
    };
  }, [player, isOnline]);

  const dismissGains = useCallback(() => setOfflineGains(null), []);

  return (
    <GameStateContext.Provider
      value={{
        buildings,
        isSaving,
        isSyncing,
        lastSaved,
        saveStatus,
        saveVersion,
        offlineGains,
        dismissGains,
        forceSave,
        queueOrSave,
        refreshBuildings,
      }}
    >
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameStateContext(): GameStateContextValue {
  const ctx = useContext(GameStateContext);
  if (!ctx)
    throw new Error(
      "useGameStateContext must be used within GameStateProvider",
    );
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────────────────────────
function mapBuildingRow(row: Record<string, unknown>): BuildingRecord {
  return {
    id: row.id as string,
    playerId: row.player_id as string,
    buildingType: row.building_type as string,
    level: row.level as number,
    gridX: row.grid_x as number,
    gridY: row.grid_y as number,
    status: row.status as BuildingRecord["status"],
    constructionStart: row.construction_start
      ? new Date(row.construction_start as string)
      : null,
    constructionEnd: row.construction_end
      ? new Date(row.construction_end as string)
      : null,
    lastCollectedAt: new Date(row.last_collected_at as string),
    productionRate: row.production_rate as number,
    createdAt: new Date(row.created_at as string),
  };
}
