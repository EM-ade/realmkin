import styles from "./GemStore.module.css";
import { useSolanaPayment, GEM_PACKS } from "@/hooks/game/useSolanaPayment";
import { useSoundManager } from "@/audio/useSoundManager";
import { useGameState } from "@/stores/gameStore";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/game/providers/GameAuthProvider";

interface GemStoreProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GemStore({ isOpen, onClose }: GemStoreProps) {
  const { initiateGemPurchase, verifyAndCreditGems, isPurchasing, error: paymentError, clearError } =
    useSolanaPayment();
  const { play } = useSoundManager();
  const { connected } = useWallet();
  const { connectWallet } = useWeb3();
  const unlockNextBuilder = useGameState((state) => state.unlockNextBuilder);
  const gems = useGameState((state) => state.resources.gems);
  const unlockedBuilders = useGameState((state) => state.unlockedBuilders);
  const addResources = useGameState((state) => state.addResources);

  const { player } = useAuth();

  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [successState, setSuccessState] = useState<{
    gems: number;
    pack: string;
  } | null>(null);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [storeError, setStoreError] = useState<string | null>(null);

  useEffect(() => {
    fetchSolPrice().then(setSolPrice);
  }, []);

  const maxBuilders = 2;

  if (!isOpen) return null;

  const fetchSolPrice = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
      );
      const data = await res.json();
      return data.solana?.usd ?? 150;
    } catch {
      return 150;
    }
  }, []);

  const handleBuyGems = async (packId: string) => {
    play("button_click");
    clearError();
    setStoreError(null);
    setSuccessState(null);

    if (!connected) {
      connectWallet();
      return;
    }

    if (!player) {
      setStoreError("Player data not loaded. Please refresh.");
      return;
    }

    try {
      const solPrice = await fetchSolPrice();
      const pack = GEM_PACKS.find((p) => p.id === packId);
      if (!pack) return;

      const solAmount = pack.usdPrice / solPrice;
      const result = await initiateGemPurchase(packId as any, solAmount);

      if ("error" in result) {
        if (result.error === "cancelled") return;
        setStoreError(result.error || "Transaction failed. Check wallet connection.");
        return;
      }

      const verifyResult = await verifyAndCreditGems(
        result.signature,
        packId as any,
        player.id,
        solAmount
      );

      if (!verifyResult.success) {
        setStoreError(verifyResult.error || "Server verification failed.");
        return;
      }

      addResources({ gems: verifyResult.gemsAdded });
      setSuccessState({ gems: verifyResult.gemsAdded, pack: verifyResult.packName });
      play("gem_purchase");
      setTimeout(() => setSuccessState(null), 3000);
    } catch (err) {
      console.error("[GemStore] Purchase error:", err);
      setStoreError("Unexpected error. Please try again.");
    }
  };

  const handleBuyBuilder = async () => {
    play("button_click");
    if (gems >= 500) {
      if (unlockNextBuilder()) {
        play("level_up");
        onClose();
      }
    } else {
      alert("Not enough gems!");
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail || !player) return;
    if (gems < 50) {
      setEmailMsg("Not enough gems (Cost: 50)");
      return;
    }

    setChangingEmail(true);
    setEmailMsg("");
    try {
      const { data, error: fnErr } = await supabase.functions.invoke(
        "change-player-email",
        { body: { playerId: player.id, newEmail } }
      );
      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      play("level_up");
      setEmailMsg("Email successfully modified!");
      setNewEmail("");
    } catch (e: any) {
      setEmailMsg(e.message || "Failed to change email");
    } finally {
      setChangingEmail(false);
    }
  };

  const handleBuyAutominer = async () => {
    play("button_click");
    if (!player) return;
    if (gems < 500) {
      alert("Not enough gems!");
      return;
    }

    try {
      const { error: dbErr } = await supabase
        .from("players")
        .update({ has_autominer: true, gems: gems - 500 } as any)
        .eq("id", player.id);

      if (dbErr) throw dbErr;
      play("level_up");
      alert("Autominer Unlocked! Resources will now generate up to 8h while offline.");
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to unlock autominer");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            play("modal_close");
            onClose();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{ pointerEvents: "auto" }}
        >
          <motion.div
            className={styles.modal}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            initial={{ y: 20, scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: 20, scale: 0.95 }}
          >
            <div className={styles.header}>
              <h2>Treasury</h2>
              <button className={styles.closeBtn} onClick={onClose}>×</button>
            </div>

            <p className={styles.subtitle}>
              Acquire gems to accelerate village growth and employ additional builders.
            </p>

            {(storeError || paymentError || successState) && (
              <div className={successState ? styles.successBanner : styles.errorBanner}>
                {successState
                  ? `+${successState.gems} gems from ${successState.pack} purchase!`
                  : storeError || paymentError}
              </div>
            )}

            <div className={styles.packsContainer}>
              {GEM_PACKS.map((pack) => {
                const solAmount = solPrice > 0 ? (pack.usdPrice / solPrice).toFixed(4) : "—";
                const loading = isPurchasing(pack.id);
                return (
                  <div key={pack.id} className={styles.packCard}>
                    <div className={styles.packIcon}>💎</div>
                    <div className={styles.packDetails}>
                      <h3>{pack.displayName}</h3>
                      <span className={styles.gemAmount}>{pack.gems} Gems</span>
                      <span className={styles.priceInfo}>
                        {solAmount} SOL (~${pack.usdPrice})
                      </span>
                    </div>
                    <button
                      className={styles.buyBtn}
                      onClick={() => handleBuyGems(pack.id)}
                      disabled={loading}
                      style={loading ? { opacity: 0.6, cursor: "wait" } : {}}
                    >
                      {loading ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                          <span className={styles.spinner} />
                          Processing...
                        </span>
                      ) : !connected ? (
                        "Connect Wallet"
                      ) : (
                        "Buy"
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {unlockedBuilders < maxBuilders || !(player as any)?.has_autominer ? (
              <div className={styles.upgradeSection}>
                <h3 className={styles.upgradeTitle}>Village Upgrades</h3>

                {unlockedBuilders < maxBuilders && (
                  <div className={styles.packCard}>
                    <div className={styles.packIcon}>👷</div>
                    <div className={styles.packDetails}>
                      <h3>Second Builder</h3>
                      <span className={styles.gemAmount}>Build 2 things at once!</span>
                    </div>
                    <button
                      className={styles.buyBtn}
                      style={{ backgroundColor: "#8c6239", border: "1px solid #d4af37" }}
                      onClick={handleBuyBuilder}
                      disabled={gems < 500}
                    >
                      500 💎
                    </button>
                  </div>
                )}

                {!(player as any)?.has_autominer && (
                  <div className={styles.packCard}>
                    <div className={styles.packIcon}>⚙️</div>
                    <div className={styles.packDetails}>
                      <h3>Autominer</h3>
                      <span className={styles.gemAmount}>
                        Collect resources offline & online automatically.
                      </span>
                    </div>
                    <button
                      className={styles.buyBtn}
                      style={{ backgroundColor: "#8c6239", border: "1px solid #d4af37" }}
                      onClick={handleBuyAutominer}
                      disabled={gems < 500}
                    >
                      500 💎
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            <div className={styles.upgradeSection}>
              <h3 className={styles.upgradeTitle}>Account Security</h3>
              <div className={styles.packCard} style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: "#f1deb3", fontSize: "1.2rem", fontFamily: "MedievalSharp" }}>
                      Change Email
                    </h3>
                    <span style={{ fontSize: "0.85rem", color: "#aaa", fontFamily: "Inter" }}>
                      Costs 50 Gems. Will require reverification.
                    </span>
                  </div>
                  <button
                    className={styles.buyBtn}
                    style={{ backgroundColor: "#8c6239", border: "1px solid #d4af37", width: "auto", padding: "0.5rem 1rem" }}
                    onClick={handleChangeEmail}
                    disabled={gems < 50 || changingEmail || !newEmail}
                  >
                    {changingEmail ? "Securing..." : "50 💎"}
                  </button>
                </div>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New Email Address"
                  style={{ padding: "0.5rem", background: "#1a120b", border: "1px solid #8c6a2e", color: "white", borderRadius: "4px", fontFamily: "Inter", outline: "none" }}
                />
                {emailMsg && (
                  <div style={{ fontSize: "0.8rem", color: emailMsg.includes("success") ? "#4caf50" : "#ff4d4d" }}>
                    {emailMsg}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.footerInfo}>
              Purchases process immediately via Solana. Connections are secure.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
