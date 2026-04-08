import { useXPSystem } from "@/hooks/game/useXPSystem";
import styles from "./LevelUpScreen.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { useSoundManager } from "@/audio/useSoundManager";
import { useEffect } from "react";
import { useGameState } from "@/stores/gameStore";

export function LevelUpScreen() {
  const { pendingLevelUp, acknowledgeLevelUp } = useXPSystem();
  const { play } = useSoundManager();
  const addResources = useGameState((state) => state.addResources);

  useEffect(() => {
    if (pendingLevelUp) {
      play("level_up"); // make sure to add this sound later
    }
  }, [pendingLevelUp]);

  if (!pendingLevelUp) return null;

  const { previousLevel, newLevel, reward } = pendingLevelUp;

  const handleClaim = () => {
    play("button_click");

    // Auto-claim logic for gems or resources
    if (reward.type === "gems" && reward.amount) {
      addResources({ gems: reward.amount });
    } else if (
      reward.type === "resources" &&
      reward.amount &&
      reward.resourceType
    ) {
      addResources({ [reward.resourceType]: reward.amount });
    }

    // This updates state AND persists to DB
    acknowledgeLevelUp();
  };

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className={styles.modal}
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className={styles.sparkleContainer}>✨ LEVEL UP! ✨</div>

          <div className={styles.levelTransition}>
            ⭐ Level {previousLevel} <span className={styles.arrow}>→</span>{" "}
            Level {newLevel} ⭐
          </div>

          <h2 className={styles.milestoneText}>Milestone Reached!</h2>

          <motion.div
            className={styles.rewardCard}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className={styles.rewardIcon}>
              {reward.type === "gems"
                ? "💎"
                : reward.type === "resources"
                  ? "📦"
                  : reward.type === "building_unlock"
                    ? "🏗️"
                    : reward.type === "storage_increase"
                      ? "🎒"
                      : reward.type === "title"
                        ? "🎖️"
                        : "🎁"}
            </div>
            <div className={styles.rewardDetails}>
              <h3>
                {reward.type === "building_unlock"
                  ? "New Unlock!"
                  : reward.type === "gems"
                    ? `+${reward.amount} Gems`
                    : reward.type === "resources"
                      ? `+${reward.amount} ${reward.resourceType}`
                      : "Reward Received"}
              </h3>
              <p>{reward.description}</p>
            </div>
          </motion.div>

          <button className={styles.claimButton} onClick={handleClaim}>
            Claim Rewards
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
