// src/components/game/Auth/AuthScreen.tsx
import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { useGameState } from "@/stores/gameStore";
import styles from "./AuthScreen.module.css";
import { EmailSetupModal } from "./EmailSetupModal";

export function AuthScreen() {
  const { connected } = useWallet();
  const { loginWithWallet, player, isLoading, error } = useAuth();
  const { currentScene, setCurrentScene } = useGameState();
  const [showEmailModal, setShowEmailModal] = useState(false);

  // If player is authenticated and has an email, enter game
  useEffect(() => {
    if (player && currentScene === "MainMenu") {
      if (!player.email) {
        setShowEmailModal(true);
      } else {
        setCurrentScene("Village");
      }
    }
  }, [player, currentScene, setCurrentScene]);

  // If we're already in game, don't show the auth screen
  if (currentScene === "Village") return null;

  const handlePlayNow = async () => {
    if (connected && !player) {
      await loginWithWallet();
    }
  };

  return (
    <>
      <div className={styles.overlay}>
        <img
          src="/assets/realmkin-bg.jpeg"
          alt="Realmkin Splash"
          className={styles.background}
        />

        <div className={styles.modal}>
          <div className={styles.header}>
            <h2>Identify Yourself!</h2>
          </div>

          <p className="text-stone-300 mb-6 text-center text-sm md:text-base leading-relaxed font-['Manrope']">
            Connect your wallet to establish your identity and secure your
            settlement.
          </p>

          <div className="flex flex-col items-center gap-4 w-full">
            <div className={`${styles.authOption} ${styles.authPrimary}`}>
              <div className={styles.buttonTitle}>Connect via Solana</div>
              <div className={styles.buttonSub}>
                Recommended for Web3 features
              </div>
              <WalletMultiButton
                style={{
                  marginTop: "0.5rem",
                  width: "100%",
                  justifyContent: "center",
                }}
              />
            </div>

            {connected && !player && (
              <button
                className="w-full bg-[#d4a017] text-[#1a120b] py-3 rounded font-bold font-['MedievalSharp'] text-xl hover:bg-[#ffaa00] transition-colors"
                onClick={handlePlayNow}
                disabled={isLoading}
              >
                {isLoading ? "Signing..." : "Sign to Enter"}
              </button>
            )}

            {connected && player && !showEmailModal && (
              <button
                className="w-full bg-[#d4a017] text-[#1a120b] py-3 rounded font-bold font-['MedievalSharp'] text-xl hover:bg-[#ffaa00] transition-colors"
                onClick={() => {
                  if (!player.email) {
                    setShowEmailModal(true);
                  } else {
                    setCurrentScene("Village");
                  }
                }}
              >
                Enter Village
              </button>
            )}

            <div className={styles.divider} />

            <div
              className={styles.authOption}
              onClick={() => alert("Email login coming soon!")}
            >
              <div className={styles.buttonTitle}>Continue with Email</div>
              <div className={styles.buttonSub}>Standard Account</div>
            </div>
          </div>

          {error && (
            <div
              style={{
                color: "#ff4d4d",
                marginTop: "1rem",
                textAlign: "center",
              }}
            >
              {error.message}
            </div>
          )}

          <div className={styles.footer}>
            By continuing, you agree to our{" "}
            <span className={styles.footerLink}>Terms of Service</span> and{" "}
            <span className={styles.footerLink}>Privacy Policy</span>.
          </div>
        </div>
      </div>

      {showEmailModal && (
        <EmailSetupModal onClose={() => setCurrentScene("Village")} />
      )}
    </>
  );
}
