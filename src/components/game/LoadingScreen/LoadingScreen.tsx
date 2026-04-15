// src/components/game/LoadingScreen/LoadingScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import { useLoadingContext } from "@/context/LoadingContext";
import { LoadingBar } from "./LoadingBar";
import { LoadingTip } from "./LoadingTip";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import type { LoadingGate, GateStatus } from "@/types/loading.types";
import styles from "./LoadingScreen.module.css";

interface LoadingScreenProps {
  onFadeComplete: () => void;
}

export function LoadingScreen({ onFadeComplete }: LoadingScreenProps) {
  const { state, progress, showLogin } = useLoadingContext();
  const isComplete = state.isFullyReady;
  
  const {
    isAuthenticated,
    loginWithWallet,
    loginWithEmail,
    register,
    error: authError,
    isLoading: isAuthLoading,
  } = useAuth();
  const { publicKey } = useWallet();
  const [isFading, setIsFading] = useState(false);
  const [authMode, setAuthMode] = useState<"choices" | "email">("choices");
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const hasAttemptedWalletLogin = useRef(false);

  // Auto-trigger wallet login when wallet connects
  useEffect(() => {
    if (showLogin && publicKey && !isAuthenticated && !hasAttemptedWalletLogin.current) {
      hasAttemptedWalletLogin.current = true;
      loginWithWallet().catch(() => {
        hasAttemptedWalletLogin.current = false;
      });
    }
  }, [showLogin, publicKey, isAuthenticated, loginWithWallet]);

  useEffect(() => {
    if (isComplete) {
      setIsFading(true);
      const timer = setTimeout(() => {
        onFadeComplete();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isComplete, onFadeComplete]);

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
        {showLogin ? (
          <div className={styles.authSuite}>
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
              </form>
            )}

            <div className={styles.versionText}>v1.1.0 BETA</div>
          </div>
        ) : !isComplete ? (
          <>
            <LoadingBar progress={progress} />
            <LoadingTip />
            {process.env.NODE_ENV === 'development' && (
              <div style={{
                position: 'fixed',
                bottom: 10,
                left: 10,
                background: 'rgba(0,0,0,0.85)',
                color: '#fff',
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '8px 12px',
                borderRadius: 8,
                zIndex: 99999,
                maxWidth: 300,
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: 4, color: '#fbbf24' }}>
                  Loading Gates ({progress}%)
                </div>
                {(Object.entries(state.gates) as [LoadingGate, GateStatus][]).map(([gate, status]) => (
                  <div key={gate} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ color: status === 'complete' ? '#4ade80' : status === 'failed' ? '#ff6b6b' : status === 'loading' ? '#fbbf24' : '#888' }}>
                      {status === 'complete' ? '✅' : status === 'failed' ? '❌' : status === 'loading' ? '⏳' : '⬜'}
                    </span>
                    <span style={{ flex: 1 }}>{gate}</span>
                    <span style={{ color: status === 'complete' ? '#4ade80' : status === 'failed' ? '#ff6b6b' : '#888' }}>
                      {status}
                    </span>
                  </div>
                ))}
                {state.failedGates.length > 0 && (
                  <div style={{ color: '#ff6b6b', marginTop: 4 }}>
                    Failed: {state.failedGates.join(', ')}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className={styles.welcomeBack}>
            Loading complete...
          </div>
        )}

        {authError && (
          <div className={styles.errorMessage}>
            {authError?.message}
          </div>
        )}
      </div>
    </div>
  );
}
