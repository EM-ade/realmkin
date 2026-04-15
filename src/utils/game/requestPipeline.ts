import { logError } from "./errorLogger";

const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;

type RequestFn<T> = () => Promise<T>;

export interface PipelineOptions {
  playerId?: string;
  retries?: number;
  timeoutMs?: number;
  onQueueOffline?: () => void;
  /** If true, bypass online check (e.g. for beacon saves) */
  noOnlineCheck?: boolean;
}

export interface PipelineResult<T> {
  success: boolean;
  data?: T;
  statusCode?: number;
  error?: string;
  offline?: boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("REQUEST_TIMEOUT")), ms);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

/**
 * Central request pipeline for ALL Supabase / API calls.
 *
 * Flow:
 *  1. Online check
 *  2. Execute request with timeout
 *  3. Retry with backoff on failure
 *  4. Handle specific HTTP error codes
 *  5. Fallback to offline queue if all retries fail
 */
export async function requestPipeline<T>(
  fn: RequestFn<T>,
  options: PipelineOptions = {},
): Promise<PipelineResult<T>> {
  const {
    playerId,
    retries = MAX_RETRIES,
    timeoutMs = REQUEST_TIMEOUT_MS,
    onQueueOffline,
  } = options;

  // ── Step 1: Check browser online status ────────────────────────────────────
  if (!options.noOnlineCheck && !navigator.onLine) {
    onQueueOffline?.();
    return { success: false, offline: true, error: "Browser is offline" };
  }

  let lastError: string = "Unknown error";

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // ── Step 2: Execute with timeout ──────────────────────────────────────
      const result = await withTimeout(fn(), timeoutMs);
      return { success: true, data: result };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      lastError = message;

      // ── Step 3: Classify error ────────────────────────────────────────────
      if (message === "REQUEST_TIMEOUT") {
        if (attempt < retries) {
          await sleep(1000 * Math.pow(2, attempt)); // exponential backoff
          continue;
        }
        // All retries exhausted
        break;
      }

      // Fetch/network errors
      if (
        message.includes("Failed to fetch") ||
        message.includes("NetworkError")
      ) {
        if (!navigator.onLine) {
          onQueueOffline?.();
          return { success: false, offline: true, error: message };
        }
        if (attempt < retries) {
          await sleep(2000 * (attempt + 1));
          continue;
        }
        break;
      }

      // Status-code based handling (Supabase returns errors as objects not thrown)
      // These come through normally so we handle them in the caller.
      // But any other error → log + retry.
      logError({
        player_id: playerId,
        error_type: "REQUEST_PIPELINE_ERROR",
        error_message: message,
        severity: 1,
      });

      if (attempt < retries) {
        await sleep(1500 * (attempt + 1));
        continue;
      }
    }
  }

  // ── Step 5: All retries exhausted → offline fallback ─────────────────────
  logError({
    player_id: playerId,
    error_type: "REQUEST_ALL_RETRIES_FAILED",
    error_message: lastError,
    severity: 2,
  });

  onQueueOffline?.();
  return { success: false, error: lastError, offline: false };
}

/**
 * Supabase-specific pipeline that unwraps the { data, error } response shape.
 */
export async function supabasePipeline<T>(
  fn: () => Promise<{
    data: T | null;
    error: { message: string; code?: string } | null;
  }>,
  options: PipelineOptions = {},
): Promise<PipelineResult<T>> {
  const result = await requestPipeline(fn, options);
  if (!result.success) return result as PipelineResult<T>;

  const { data, error } = result.data as {
    data: T | null;
    error: { message: string; code?: string } | null;
  };

  if (error) {
    logError({
      player_id: options.playerId,
      error_type: `SUPABASE_${error.code ?? "ERROR"}`,
      error_message: error.message,
      severity: 2,
    });
    return { success: false, error: error.message };
  }

  return { success: true, data: data ?? undefined };
}
