"use client";

/**
 * GameAuthProvider — Copied directly from kingdom/src/providers/AuthProvider.tsx
 * Only import paths adapted for Next.js. This is the exact working auth flow.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type { AuthError, AuthMode, Player } from "@/types/game/supabase";
import { useGameState } from "@/stores/gameStore";

const AUTH_MODE = (process.env.NEXT_PUBLIC_AUTH_MODE || "standalone") as AuthMode;

interface AuthContextValue {
  player: Player | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authMode: AuthMode;
  error: AuthError | null;
  accessToken: string | null;

  loginWithWallet: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapPlayer(row: Record<string, unknown>): Player {
  return {
    id: row.id as string,
    walletAddress: (row.wallet_address as string) ?? null,
    email: (row.email as string) ?? null,
    username: (row.username as string) ?? null,
    authMethod: row.auth_method as "wallet" | "email",
    level: (row.level as number) ?? 1,
    xp: (row.xp as number) ?? 0,
    gemBalance: (row.gem_balance as number) ?? 0,
    tutorialFlags: (row.tutorial_flags as number) ?? 0,
    tutorialComplete: (row.tutorial_complete as boolean) ?? false,
    hasAutominer: (row.has_autominer as boolean) ?? false,
    autominerPurchasedAt: row.autominer_purchased_at
      ? new Date(row.autominer_purchased_at as string)
      : null,
    lastLogin: new Date((row.last_login as string) ?? Date.now()),
    lastSave: new Date((row.last_save as string) ?? Date.now()),
    lastActive: new Date((row.last_active as string) ?? Date.now()),
    createdAt: new Date((row.created_at as string) ?? Date.now()),
    resources: {
      wood: (row.wood as number) ?? 100,
      stone: (row.stone as number) ?? 100,
      iron: (row.iron as number) ?? 100,
      food: (row.food as number) ?? 100,
    },
    maxStorage: (row.max_storage as number) ?? 500,
    buildersTotal: (row.builders_total as number) ?? 1,
    buildersBusy: (row.builders_busy as number) ?? 0,
    loginStreak: (row.login_streak as number) ?? 0,
    lastStreakDate: row.last_streak_date
      ? new Date(row.last_streak_date as string)
      : null,
    season: (row.season as number) ?? 1,
    seasonData: (row.season_data as Record<string, unknown>) ?? {},
    powerLevel: (row.power_level as number) ?? 0,
    unlockedTitles: (row.unlocked_titles as string[]) ?? ["realm_born"],
    activeTitle: (row.active_title as string) ?? "realm_born",
    avatarUrl: (row.avatar_url as string) ?? null,
    totalBuildingsBuilt: (row.total_buildings_built as number) ?? 0,
    daysActive: (row.days_active as number) ?? 0,
  };
}

export function GameAuthProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const sessionRef = useRef<string | null>(null);

  const loadPlayer = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const invokeOptions: { headers?: Record<string, string> } = {};
      if (session?.access_token) {
        invokeOptions.headers = {
          Authorization: `Bearer ${session.access_token}`,
        };
      }

      const { data, error: funcErr } = await supabase.functions.invoke(
        "load-game",
        invokeOptions
      );

      if (funcErr || !data?.player) {
        setIsLoading(false);
        return;
      }
      setPlayer(mapPlayer(data.player));

      // Import buildings and resources into game store
      if (data.buildings && data.buildings.length > 0) {
        useGameState.getState().importSupabaseData(data.buildings, {
          wood: data.player.wood ?? 100,
          stone: data.player.stone ?? 100,
          iron: data.player.iron ?? 100,
          food: data.player.food ?? 100,
          gem_balance: data.player.gem_balance ?? 50,
        });
      } else if (data.player) {
        // Even if no buildings, still import resources
        useGameState.getState().addResources({
          wood: data.player.wood ?? 100,
          clay: data.player.stone ?? 100,
          iron: data.player.iron ?? 100,
          crop: data.player.food ?? 100,
          gems: data.player.gem_balance ?? 50,
        });
      }

      // Dispatch offline gains only if player has autominer
      if (data.offlineGains?.wasOffline && data.player.has_autominer) {
        window.dispatchEvent(
          new CustomEvent("game:offlineGains", {
            detail: data.offlineGains,
          })
        );
      }
    } catch (err) {
      console.error("[GameAuth] loadPlayer failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const validateEmbeddedToken = useCallback(
    async (token: string) => {
      try {
        const {
          data: { user },
          error: authErr,
        } = await supabase.auth.getUser(token);
        if (authErr || !user) {
          setError({
            code: "EMBEDDED_TOKEN_INVALID",
            message: "Session from main site is invalid.",
            retryable: false,
          });
          setIsLoading(false);
          return;
        }
        setAccessToken(token);
        await loadPlayer();
      } catch {
        setIsLoading(false);
      }
    },
    [loadPlayer]
  );

  const restoreSession = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        setAccessToken(session.access_token);
        await loadPlayer();
      }
    } catch (err) {
      console.error("[GameAuth] restoreSession failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [loadPlayer]);

  // ── Embedded mode: check for token in URL ──────────────────────────────────
  useEffect(() => {
    if (AUTH_MODE === "embedded") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("token");
      if (token) {
        validateEmbeddedToken(token);
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.toString());
      } else {
        restoreSession();
      }
    } else {
      restoreSession();
    }
  }, [restoreSession, validateEmbeddedToken]);

  // ── Wallet login (EXACT kingdom logic) ────────────────────────────────────────
  const loginWithWallet = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signMessage) {
      setError({
        code: "WALLET_NOT_CONNECTED",
        message: "Please connect your wallet first.",
        retryable: true,
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (!isSupabaseConfigured) {
        setError({
          code: "NOT_CONFIGURED",
          message: "Supabase not configured. Running in offline mode.",
          retryable: false,
        });
        setIsLoading(false);
        return;
      }

      // 1. Generate nonce
      const nonce = crypto.randomUUID();
      const walletAddress = wallet.publicKey.toBase58();

      // Store nonce
      await supabase.from("auth_nonces").insert({
        nonce,
        wallet_address: walletAddress,
      } as any);

      // 2. Build challenge
      const timestamp = new Date().toISOString();
      const message = [
        "Sign to verify your identity",
        `Nonce: ${nonce}`,
        "App: KingdomGame",
        `Timestamp: ${timestamp}`,
      ].join("\n");

      // 3. Sign
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = await wallet.signMessage(messageBytes);

      // 4. Verify with Edge Function
      const { data: authData, error: authError } =
        await supabase.functions.invoke("verify-wallet", {
          body: {
            walletAddress,
            signature: Array.from(signatureBytes),
            message,
            nonce,
            timestamp,
          },
        });

      if (authError || !authData?.access_token) {
        throw new Error(authError?.message || "Verification failed");
      }

      setAccessToken(authData.access_token);

      await supabase.auth.setSession({
        access_token: authData.access_token,
        refresh_token: authData.refresh_token,
      });

      // Load player
      const { data: loadData, error: loadError } =
        await supabase.functions.invoke("load-game");

      if (loadError) throw new Error(loadError.message);

      if (loadData.player) {
        setPlayer(mapPlayer(loadData.player));
        if (loadData.offlineGains?.wasOffline) {
          window.dispatchEvent(
            new CustomEvent("game:offlineGains", {
              detail: loadData.offlineGains,
            })
          );
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Wallet authentication failed";
      setError({ code: "WALLET_AUTH_FAILED", message, retryable: true });
      console.error("[GameAuth] Wallet auth failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  // ── Email login ───────────────────────────────────────────────────────────
  const loginWithEmail = useCallback(
    async (email: string, password: string) => {
      if (isLoading) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: authErr } = await supabase.auth.signInWithPassword(
          { email, password }
        );
        if (authErr) throw new Error(authErr.message);
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          setAccessToken(data.session.access_token);
          await loadPlayer();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Login failed";
        setError({ code: "EMAIL_LOGIN_FAILED", message: msg, retryable: true });
        setIsLoading(false);
      }
    },
    [isLoading, loadPlayer]
  );

  // ── Register ──────────────────────────────────────────────────────────────
  const register = useCallback(
    async (email: string, password: string, username: string) => {
      if (isLoading) return;
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: authErr } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (authErr) throw new Error(authErr.message);
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          });
          setAccessToken(data.session.access_token);
          await loadPlayer();
        } else if (data.user) {
          setError({
            code: "VERIFICATION_SENT",
            message: "A verification email has been sent. Please confirm it to enter your realm!",
            retryable: false,
          });
          setIsLoading(false);
        }
      } catch (err) {
        let msg = err instanceof Error ? err.message : "Registration failed";
        if (
          msg.includes("players_username_key") ||
          (msg.includes("duplicate key value violates unique constraint") &&
            msg.includes("username"))
        ) {
          msg = "This username is already taken by another hero!";
        } else if (
          msg.includes("User already registered") ||
          msg.includes("email_key")
        ) {
          msg = "A hero with this email already exists!";
        } else if (msg.includes("Password should be at least")) {
          msg = "Password must be at least 6 characters long.";
        } else if (msg.includes("weak_password")) {
          msg = "Password is too weak. Please use a stronger password.";
        } else if (
          msg.includes("invalid claim") ||
          msg.toLowerCase().includes("unprocessable")
        ) {
          msg =
            "Signup failed. Please check your email and ensure your password is at least 6 characters.";
        }

        setError({ code: "REGISTER_FAILED", message: msg, retryable: true });
        setIsLoading(false);
      }
    },
    [isLoading, loadPlayer]
  );

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    setPlayer(null);
    setAccessToken(null);
    sessionRef.current = null;
    await supabase.auth.signOut();
    await wallet.disconnect().catch(() => {});
  }, [wallet]);

  // ── Refresh session ───────────────────────────────────────────────────────
  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (!error && data.session) {
      setAccessToken(data.session.access_token);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        player,
        isAuthenticated: !!player,
        isLoading,
        authMode: AUTH_MODE,
        error,
        accessToken,
        loginWithWallet,
        loginWithEmail,
        register,
        logout,
        refreshSession,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within GameAuthProvider");
  return ctx;
}
