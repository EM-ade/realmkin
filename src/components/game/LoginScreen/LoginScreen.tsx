"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { useGameState } from "@/stores/gameStore";
import styles from "./LoginScreen.module.css";

export function LoginScreen() {
  const { connected: walletConnected } = useWallet();
  const { account, connectWallet, disconnectWallet } = useWeb3();
  const { loginWithWallet, loginWithEmail, player, isLoading, error, clearError } = useAuth();
  const { currentScene, setCurrentScene } = useGameState();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    if (player && currentScene === "MainMenu") {
      setCurrentScene("Village");
    }
  }, [player, currentScene, setCurrentScene]);

  // If we're already in game, don't show the login screen
  if (currentScene === "Village") return null;

  // Skip showing full UI if we're just flashing while auto-detecting existing session
  if (isLoading && !error && !walletConnected) {
    return (
      <div className={styles.overlay}>
        <div className={styles.loadingPulse}>Awakening the Realm...</div>
      </div>
    );
  }

  const handleConnectWallet = async () => {
    clearError();
    // Use Realmkin's wallet connection (shared with the main site)
    if (walletConnected && account) {
      // Already connected — trigger player lookup/create
      await loginWithWallet();
    } else {
      connectWallet();
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setEmailLoading(true);
    clearError();
    try {
      await loginWithEmail(email, password);
    } finally {
      setEmailLoading(false);
    }
  };

  if (showEmailForm) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Sign In</h2>
            <button
              className={styles.closeBtn}
              onClick={() => { setShowEmailForm(false); clearError(); }}
            >
              ×
            </button>
          </div>

          <div className={styles.content}>
            <form onSubmit={handleEmailLogin} className={styles.emailForm}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                required
              />
              <button
                type="submit"
                className={styles.primaryButton}
                disabled={emailLoading}
              >
                {emailLoading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {error && <div className={styles.error}>{error.message}</div>}

            <p className={styles.footerText}>
              Don't have an account?{" "}
              <button
                className={styles.linkButton}
                onClick={() => {
                  // Switch to register mode — for now, just close and let them use wallet
                  setShowEmailForm(false);
                }}
              >
                Connect Wallet instead
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Enter the Realm</h2>
          <div className={styles.headerDeco} />
        </div>

        <div className={styles.content}>
          <p className={styles.subtitle}>
            Connect your wallet or sign in with email to begin your journey.
          </p>

          {/* Primary action: Connect Wallet / Sign In */}
          <button
            className={styles.primaryButton}
            onClick={handleConnectWallet}
            disabled={isLoading}
          >
            {isLoading
              ? "Entering..."
              : walletConnected && account
                ? `Sign In (${account.slice(0, 4)}...${account.slice(-4)})`
                : "Connect Wallet"}
          </button>

          {walletConnected && !player && !isLoading && (
            <p className={styles.hintText}>
              Wallet connected. Click above to sign in and create your character.
            </p>
          )}

          {walletConnected && player && (
            <button
              className={styles.secondaryButton}
              onClick={() => setCurrentScene("Village")}
            >
              Enter Village
            </button>
          )}

          {/* Divider */}
          <div className={styles.divider}>
            <span>or</span>
          </div>

          {/* Email option */}
          <button
            className={styles.ghostButton}
            onClick={() => setShowEmailForm(true)}
          >
            Continue with Email
          </button>

          {error && (
            <div className={styles.error}>
              {error.message}
              {error.retryable && (
                <button className={styles.retryButton} onClick={clearError}>
                  Dismiss
                </button>
              )}
            </div>
          )}

          <p className={styles.versionText}>v1.0.0 BETA</p>
        </div>
      </div>
    </div>
  );
}
