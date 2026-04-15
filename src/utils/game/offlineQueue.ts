import type { QueuedAction, SaveQueue } from "@/types/game/supabase";
import { logError } from "./errorLogger";

const QUEUE_KEY = "kingdom_save_queue";
const MAX_QUEUE_AGE_MS = 48 * 60 * 60 * 1000; // 48 hours → discard
const WARN_QUEUE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours → warn

export function readQueue(): SaveQueue {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return { actions: [], lastStateSnapshot: null, lastSync: null };
    return JSON.parse(raw) as SaveQueue;
  } catch {
    return { actions: [], lastStateSnapshot: null, lastSync: null };
  }
}

export function writeQueue(queue: SaveQueue): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    logError({
      error_type: "QUEUE_WRITE_FAILURE",
      error_message: "Failed to write save queue to localStorage",
      severity: 2,
    });
  }
}

export function enqueueAction(action: Omit<QueuedAction, "id">): void {
  const queue = readQueue();

  // Check if queue is dangerously old
  const oldest = queue.actions[0];
  if (oldest) {
    const age = Date.now() - new Date(oldest.timestamp).getTime();
    if (age > MAX_QUEUE_AGE_MS) {
      // Discard — server state wins
      logError({
        error_type: "QUEUE_EXPIRED",
        error_message: "Offline queue exceeded 48 hours — discarding",
        severity: 4,
      });
      writeQueue({
        actions: [],
        lastStateSnapshot: null,
        lastSync: queue.lastSync,
      });
      return;
    }
  }

  queue.actions.push({
    id: crypto.randomUUID(),
    ...action,
  });

  writeQueue(queue);
}

export function saveStateSnapshot(snapshot: Record<string, unknown>): void {
  const queue = readQueue();
  queue.lastStateSnapshot = snapshot;
  writeQueue(queue);
}

export function clearQueue(): void {
  const queue = readQueue();
  const now = new Date().toISOString();
  writeQueue({
    actions: [],
    lastStateSnapshot: queue.lastStateSnapshot,
    lastSync: now,
  });
}

export function getQueueLength(): number {
  return readQueue().actions.length;
}

export function isQueueStale(): "ok" | "warn" | "expired" {
  const queue = readQueue();
  if (queue.actions.length === 0) return "ok";
  const oldest = queue.actions[0];
  const age = Date.now() - new Date(oldest.timestamp).getTime();
  if (age > MAX_QUEUE_AGE_MS) return "expired";
  if (age > WARN_QUEUE_AGE_MS) return "warn";
  return "ok";
}
