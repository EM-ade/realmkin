import { supabase, isSupabaseConfigured } from "@/lib/supabase";

const isDev = process.env.NODE_ENV === "development";

export type ErrorSeverity = 1 | 2 | 3 | 4 | 5;

export interface GameErrorLog {
  player_id?: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  browser?: string;
  game_state_hash?: string;
  severity: ErrorSeverity;
  metadata?: Record<string, unknown>;
}

type ToastFn = (message: string, type: "info" | "warning" | "error") => void;

let toastCallback: ToastFn | null = null;

/**
 * Register a toast function from outside (e.g. from a UI component).
 * This avoids circular imports.
 */
export function registerToastCallback(fn: ToastFn) {
  toastCallback = fn;
}

/**
 * Log a game error with the given severity.
 *
 * Level 1 — SILENT: Retry internally, never surface to player.
 * Level 2 — SUBTLE: Small indicator only (handled by caller).
 * Level 3 — INFORMATIONAL: Toast notification.
 * Level 4 — ACTION REQUIRED: Modal/dialog (handled by caller).
 * Level 5 — CRITICAL: Full-screen (handled by caller).
 */
export async function logError(error: GameErrorLog): Promise<void> {
  // Always log to console in development
  if (isDev) {
    const prefix = `[GameError L${error.severity}][${error.error_type}]`;
    if (error.severity >= 3) {
      console.error(prefix, error.error_message, error.stack_trace ?? "");
    } else {
      console.warn(prefix, error.error_message);
    }
  }

  // Level 3+ → show toast if callback is registered
  if (error.severity >= 3 && error.severity <= 3 && toastCallback) {
    toastCallback(error.error_message, "info");
  }

  // Persist to Supabase errors table (fire-and-forget, never blocks gameplay)
  if (!isSupabaseConfigured) return;

  try {
    const browser = navigator.userAgent.substring(0, 120);
    await (supabase as any).from("errors").insert({
      player_id: error.player_id ?? null,
      error_type: error.error_type,
      error_message: error.error_message.substring(0, 500),
      stack_trace: error.stack_trace?.substring(0, 1000) ?? null,
      browser,
      game_state_hash: error.game_state_hash ?? null,
      severity: error.severity,
      metadata: error.metadata ?? null,
      created_at: new Date().toISOString(),
    });
  } catch {
    // Never let logging itself crash the game
  }
}

export function createErrorFromUnknown(
  err: unknown,
  errorType: string,
  severity: ErrorSeverity = 1,
): GameErrorLog {
  if (err instanceof Error) {
    return {
      error_type: errorType,
      error_message: err.message,
      stack_trace: err.stack,
      severity,
    };
  }
  return {
    error_type: errorType,
    error_message: String(err),
    severity,
  };
}
