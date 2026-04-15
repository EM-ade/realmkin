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
  const gems = useGameState((state) => state.resources.gems);
  const unlockedBuilders = useGameState((state) => state.unlockedBuilders);
  const addResources = useGameState((state) => state.addResources);
  const setUnlockedBuilders = useGameState((state) => state.setUnlockedBuilders);

  const { player } = useAuth();
  const playerGems = player?.gemBalance ?? 0;

  const [newUsername, setNewUsername] = useState("");
  const [changingUsername, setChangingUsername] = useState(false);
  const [usernameMsg, setUsernameMsg] = useState("");
  const [successState, setSuccessState] = useState<{
    gems: number;
    pack: string;
  } | null>(null);
  const [solPrice, setSolPrice] = useState<number>(0);
  const [storeError, setStoreError] = useState<string | null>(null);
  const [autominerMsg, setAutominerMsg] = useState("");

  useEffect(() => {
    fetchSolPrice().then(setSolPrice);
  }, []);

  // Pre-fill username field if player has one
  useEffect(() => {
    if (player?.username) {
      setNewUsername(player.username);
    }
  }, [player]);

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

  // ── Second Builder — persist to Supabase ──
  const handleBuyBuilder = async () => {
    play("button_click");
    setStoreError(null);

    if (!player) return;
    if (playerGems < 500) {
      setStoreError("Not enough gems! You need 500 gems.");
      return;
    }

    try {
      // Deduct gems from Supabase
      const { error: dbErr } = await supabase
        .from("players")
        .update({ gem_balance: playerGems - 500, builders_total: 2 })
        .eq("id", player.id);

      if (dbErr) throw dbErr;

      // Update local Zustand state
      addResources({ gems: -500 });
      setUnlockedBuilders(2);

      play("level_up");
      onClose();
    } catch (err) {
      console.error("[GemStore] Builder purchase failed:", err);
      setStoreError("Failed to unlock builder. Please try again.");
    }
  };

  // ── Autominer — sync local state after DB write ──
  const handleBuyAutominer = async () => {
    play("button_click");
    setStoreError(null);
    setAutominerMsg("");

    if (!player) return;
    if (playerGems < 500) {
      setAutominerMsg("Not enough gems! You need 500 gems.");
      return;
    }

    try {
      // Deduct gems and enable autominer in Supabase
      const { error: dbErr } = await supabase
        .from("players")
        .update({ has_autominer: true, gem_balance: playerGems - 500 })
        .eq("id", player.id);

      if (dbErr) throw dbErr;

      // Update local Zustand gem count
      addResources({ gems: -500 });

      play("level_up");
      setAutominerMsg("Unlocked! Resources generate while offline.");
      setTimeout(() => {
        setAutominerMsg("");
        onClose();
      }, 1500);
    } catch (err) {
      console.error("[GemStore] Autominer purchase failed:", err);
      setAutominerMsg("Failed to unlock. Please try again.");
    }
  };

  // ── Change Username (was Change Email) — 150 gems ──
  const handleChangeUsername = async () => {
    if (!player) return;
    const trimmed = newUsername.trim();

    if (trimmed.length < 3) {
      setUsernameMsg("Username must be at least 3 characters");
      return;
    }
    if (trimmed.length > 20) {
      setUsernameMsg("Username must be 20 characters or less");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameMsg("Only letters, numbers, and underscores allowed");
      return;
    }
    if (playerGems < 150) {
      setUsernameMsg("Not enough gems! You need 150 gems.");
      return;
    }

    setChangingUsername(true);
    setUsernameMsg("");

    try {
      // Check if username is taken by another player
      const { data: existing } = await supabase
        .from("players")
        .select("id")
        .eq("username", trimmed)
        .neq("id", player.id)
        .single();

      if (existing) {
        setUsernameMsg("This username is already taken!");
        setChangingUsername(false);
        return;
      }

      // Update username and deduct gems in Supabase
      const { error: updateErr } = await supabase
        .from("players")
        .update({ username: trimmed, gem_balance: playerGems - 150 })
        .eq("id", player.id);

      if (updateErr) {
        const errMsg = updateErr.message || "";
        if (errMsg.includes("duplicate") || errMsg.includes("unique") || errMsg.includes("players_username_key")) {
          setUsernameMsg("This username is already taken!");
        } else {
          setUsernameMsg(updateErr.message || "Failed to change username");
        }
        setChangingUsername(false);
        return;
      }

      // Update local Zustand gem count
      addResources({ gems: -150 });

      play("level_up");
      setUsernameMsg("Username changed successfully!");
      setTimeout(() => {
        setUsernameMsg("");
        onClose();
      }, 1500);
    } catch (err) {
      console.error("[GemStore] Username change failed:", err);
      setUsernameMsg("Failed to change username. Please try again.");
    } finally {
      setChangingUsername(false);
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
                      disabled={playerGems < 500}
                    >
                      500 💎
                    </button>
                  </div>
                )}

                {!(player as any)?.has_autominer && (
                  <div className={styles.packCard} style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: 0, color: "#f1deb3", fontSize: "1rem", fontFamily: "MedievalSharp" }}>Autominer</h3>
                        <span className={styles.gemAmount}>
                          Collect resources offline &amp; online automatically.
                        </span>
                      </div>
                      <button
                        className={styles.buyBtn}
                        style={{ backgroundColor: "#8c6239", border: "1px solid #d4af37" }}
                        onClick={handleBuyAutominer}
                        disabled={playerGems < 500}
                      >
                        500 💎
                      </button>
                    </div>
                    {autominerMsg && (
                      <div style={{ fontSize: "0.8rem", color: autominerMsg.includes("Unlocked") ? "#4caf50" : "#ff4d4d", textAlign: "center" }}>
                        {autominerMsg}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : null}

            <div className={styles.upgradeSection}>
              <h3 className={styles.upgradeTitle}>Account</h3>
              <div className={styles.packCard} style={{ flexDirection: "column", alignItems: "stretch", gap: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: 0, color: "#f1deb3", fontSize: "1.2rem", fontFamily: "MedievalSharp" }}>
                      Change Username
                    </h3>
                    <span style={{ fontSize: "0.85rem", color: "#aaa", fontFamily: "Inter" }}>
                      Costs 150 Gems. Choose wisely!
                    </span>
                  </div>
                  <button
                    className={styles.buyBtn}
                    style={{ backgroundColor: "#8c6239", border: "1px solid #d4af37", width: "auto", padding: "0.5rem 1rem" }}
                    onClick={handleChangeUsername}
                    disabled={playerGems < 150 || changingUsername || !newUsername.trim()}
                  >
                    {changingUsername ? "Saving..." : "150 💎"}
                  </button>
                </div>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => {
                    setNewUsername(e.target.value);
                    setUsernameMsg("");
                  }}
                  placeholder="New Username"
                  maxLength={20}
                  style={{ padding: "0.5rem", background: "#1a120b", border: "1px solid #8c6a2e", color: "white", borderRadius: "4px", fontFamily: "Inter", outline: "none" }}
                />
                {usernameMsg && (
                  <div style={{ fontSize: "0.8rem", color: usernameMsg.includes("success") ? "#4caf50" : "#ff4d4d" }}>
                    {usernameMsg}
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
