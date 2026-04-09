// src/components/game/LoadingScreen/LoadingScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { useLoadingOrchestrator } from "./useLoadingOrchestrator";
import { LoadingBar } from "./LoadingBar";
import { LoadingTip } from "./LoadingTip";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { supabase } from "@/lib/supabase";
import styles from "./LoadingScreen.module.css";

interface LoadingScreenProps {
  onFadeComplete: () => void;
}

export function LoadingScreen({ onFadeComplete }: LoadingScreenProps) {
  const {
    visualProgress,
    isComplete,
    error: loadError,
  } = useLoadingOrchestrator();
  const {
    player,
    isAuthenticated,
    loginWithWallet,
    loginWithEmail,
    register,
    error: authError,
    isLoading: isAuthLoading,
  } = useAuth();
  const [isFading, setIsFading] = useState(false);
  const [authMode, setAuthMode] = useState<"choices" | "email" | "username_setup">("choices");
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [setupUsername, setSetupUsername] = useState("");
  const [setupError, setSetupError] = useState("");
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const hasAttemptedSign = useRef(false);
  const hasCheckedUsername = useRef(false);

  // Check if authenticated player needs username setup
  const needsUsernameSetup = isAuthenticated && player && (
    player.authMethod === "wallet" &&
    (!player.username || player.username.startsWith("Hero_"))
  );

  useEffect(() => {
    // If player needs username setup, switch to that mode
    if (needsUsernameSetup && !hasCheckedUsername.current) {
      hasCheckedUsername.current = true;
      setAuthMode("username_setup");
    }
  }, [needsUsernameSetup]);

  const handleSetupUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError("");

    const trimmed = setupUsername.trim();
    if (trimmed.length < 3) {
      setSetupError("Username must be at least 3 characters");
      return;
    }
    if (trimmed.length > 20) {
      setSetupError("Username must be 20 characters or less");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setSetupError("Only letters, numbers, and underscores allowed");
      return;
    }

    setIsSettingUsername(true);

    try {
      // Check if username is taken
      const { data: existing } = await supabase
        .from("players")
        .select("id")
        .eq("username", trimmed)
        .neq("id", player?.id || "")
        .single();

      if (existing) {
        setSetupError("This username is already taken!");
        setIsSettingUsername(false);
        return;
      }

      // Update player username
      const { error: updateErr } = await supabase
        .from("players")
        .update({ username: trimmed })
        .eq("id", player?.id);

      if (updateErr) {
        const errMsg = updateErr.message || "";
        if (errMsg.includes("duplicate") || errMsg.includes("unique") || errMsg.includes("players_username_key")) {
          setSetupError("This username is already taken!");
        } else {
          setSetupError(updateErr.message || "Failed to set username");
        }
        setIsSettingUsername(false);
        return;
      }

      // Success — proceed to game
      setIsFading(true);
      setTimeout(() => onFadeComplete(), 800);
    } catch (err) {
      console.error("[LoadingScreen] Failed to set username:", err);
      setSetupError("Failed to set username. Please try again.");
    } finally {
      setIsSettingUsername(false);
    }
  };

  useEffect(() => {
    // Only fade out once loading is done AND we have a player session
    // AND they don't need username setup
    if (isComplete && isAuthenticated && !needsUsernameSetup) {
      setIsFading(true);
      const timer = setTimeout(() => {
        onFadeComplete();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isComplete, isAuthenticated, needsUsernameSetup, onFadeComplete]);

  const { publicKey } = useWallet();

  useEffect(() => {
    // Automatically trigger signing when wallet connects
    if (
      publicKey &&
      !isAuthenticated &&
      isComplete &&
      !isAuthLoading &&
      !hasAttemptedSign.current
    ) {
      hasAttemptedSign.current = true;
      loginWithWallet().catch(() => {
        hasAttemptedSign.current = false; // Allow retry if failed
      });
    }
  }, [publicKey, isAuthenticated, isComplete, isAuthLoading, loginWithWallet]);

  return (
    <div className={`${styles.overlay} ${isFading ? styles.fadeOut : ""}`}>
      <img
        src="/assets/realmkin-bg.jpeg"
        alt="Realmkin Splash"
        className={styles.background}
      />

      <div className={styles.titleContainer}>
        <h1 className={styles.mainTitle}></h1>
        <div className={styles.subTitle}></div>
      </div>

      <div className={styles.bottomSection}>
        {!isComplete ? (
          <>
            <LoadingBar progress={visualProgress} />
            <LoadingTip />
          </>
        ) : !isAuthenticated ? (
          <div className={styles.authSuite}>
            {/* Header with ornamental divider */}
            <div className={styles.authHeader}>
              <div className={styles.authHeaderDivider}>
                <span className={styles.dash}>───</span>
                <span className={styles.diamond}>◆</span>
                <span className={styles.dash}>───</span>
              </div>
              <h2 className={styles.authTitle}>ENTER THE REALM</h2>
              <p className={styles.authSubtitle}>
                Choose how to begin your journey
              </p>
            </div>

            {authMode === "choices" ? (
              // Initial choice screen
              <div className={styles.authContent}>
                <div className={styles.walletButtonWrapper}>
                  <WalletMultiButton className={styles.walletButtonOverride} />
                </div>
                <p className={styles.walletSubtext}>
                  Phantom · Solflare · Any Solana Wallet
                </p>

                <div className={styles.orDivider}>
                  <span className={styles.line}>──</span>
                  <span className={styles.or}>or</span>
                  <span className={styles.line}>──</span>
                </div>

                <button
                  type="button"
                  className={styles.btnEmail}
                  onClick={() => setAuthMode("email")}
                >
                  <span className={styles.btnLabel}>✉ CONTINUE WITH EMAIL</span>
                </button>

                <div className={styles.authFooter}>
                  <span className={styles.footerText}>Already a hero?</span>
                  <button
                    type="button"
                    className={styles.signInLink}
                    onClick={() => setIsSignup(false)}
                  >
                    Sign In
                  </button>
                </div>
              </div>
            ) : (
              // Email login form
              <form
                className={styles.emailForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isSignup) {
                    register(email, password, username);
                  } else {
                    loginWithEmail(email, password);
                  }
                }}
              >
                <div className={styles.formHeader}>
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={() => setAuthMode("choices")}
                  >
                    ← Back
                  </button>
                  <h3 className={styles.formTitle}>ENTER THE REALM</h3>
                </div>

                {isSignup && (
                  <input
                    type="text"
                    placeholder="Realm Username"
                    className={styles.authInput}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                )}
                <input
                  type="email"
                  placeholder="✉ your@email.com"
                  className={styles.authInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  placeholder="🔒 Password"
                  className={styles.authInput}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  className={styles.btnEnterRealm}
                  disabled={isAuthLoading}
                >
                  ⚔ {isAuthLoading
                    ? "Processing..."
                    : isSignup
                    ? "Create Realm"
                    : "Enter Realm"} ⚔
                </button>

                <div className={styles.authFooter}>
                  {isSignup ? (
                    <>
                      <span className={styles.footerText}>
                        Already have a realm?
                      </span>
                      <button
                        type="button"
                        className={styles.signInLink}
                        onClick={() => setIsSignup(false)}
                      >
                        Login
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={styles.footerText}>New hero?</span>
                      <button
                        type="button"
                        className={styles.signInLink}
                        onClick={() => setIsSignup(true)}
                      >
                        Create a Realm
                      </button>
                    </>
                  )}
                </div>

                <div className={styles.forgotPassword}>
                  <button
                    type="button"
                    className={styles.forgotLink}
                    onClick={() => {
                      /* TODO: Implement forgot password */
                    }}
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            <div className={styles.versionText}>v1.1.0 BETA</div>
          </div>
        ) : authMode === "username_setup" ? (
          // Username setup for new wallet users
          <div className={styles.authSuite}>
            <div className={styles.authHeader}>
              <div className={styles.authHeaderDivider}>
                <span className={styles.dash}>───</span>
                <span className={styles.diamond}>◆</span>
                <span className={styles.dash}>───</span>
              </div>
              <h2 className={styles.authTitle}>CHOOSE YOUR NAME</h2>
              <p className={styles.authSubtitle}>
                Pick a name to be known across the kingdom
              </p>
            </div>

            <form className={styles.emailForm} onSubmit={handleSetupUsername}>
              <input
                type="text"
                placeholder="Realm Username"
                className={styles.authInput}
                value={setupUsername}
                onChange={(e) => {
                  setSetupUsername(e.target.value);
                  setSetupError("");
                }}
                autoFocus
                maxLength={20}
                required
              />

              {setupError && (
                <p className={styles.errorMessage} style={{ marginBottom: 8 }}>
                  {setupError}
                </p>
              )}

              <p className={styles.hintText} style={{ fontSize: "11px", color: "#888", textAlign: "center", margin: "0 0 8px" }}>
                3-20 characters · Letters, numbers, underscores
              </p>

              <button
                type="submit"
                className={styles.btnEnterRealm}
                disabled={isSettingUsername || setupUsername.trim().length < 3}
              >
                ⚔ {isSettingUsername ? "Saving..." : "Enter the Realm"} ⚔
              </button>
            </form>

            <div className={styles.versionText}>v1.1.0 BETA</div>
          </div>
        ) : (
          <div className={styles.welcomeBack}>
            Welcome Back, {player?.username || "Hero"}...
          </div>
        )}

        {(loadError || authError) && (
          <div className={styles.errorMessage}>
            {loadError || authError?.message}
          </div>
        )}
      </div>
    </div>
  );
}
