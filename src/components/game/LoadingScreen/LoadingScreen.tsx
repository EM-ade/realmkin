// src/components/game/LoadingScreen/LoadingScreen.tsx
import React, { useState, useEffect } from "react";
import { useLoadingOrchestrator } from "./useLoadingOrchestrator";
import { LoadingBar } from "./LoadingBar";
import { LoadingTip } from "./LoadingTip";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
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
  const [authMode, setAuthMode] = useState<"choices" | "email">("choices");
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const hasAttemptedSign = React.useRef(false);

  useEffect(() => {
    // Only fade out once loading is done AND we have a player session
    if (isComplete && isAuthenticated) {
      setIsFading(true);
      const timer = setTimeout(() => {
        onFadeComplete();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isComplete, isAuthenticated, onFadeComplete]);

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
