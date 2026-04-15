import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect } from "react";
import { LEVEL_TABLE } from "@/game/config/xpConfig";
import styles from "./LevelRewardsPopup.module.css";
import { useSoundManager } from "@/audio/useSoundManager";

interface LevelRewardsPopupProps {
  isOpen: boolean;
  onClose: () => void;
  currentLevel: number;
}

const RESOURCE_ICONS: Record<string, string> = {
  wood: "🪵",
  stone: "🪨",
  iron: "⛏️",
  food: "🌾",
  gems: "💎",
};

function RewardCard({
  level,
  reward,
  isCurrentLevel,
  isClaimed,
}: {
  level: number;
  reward: typeof LEVEL_TABLE[0]["reward"];
  isCurrentLevel: boolean;
  isClaimed: boolean;
}) {
  const icon = reward.type === "gems"
    ? "💎"
    : RESOURCE_ICONS[reward.resourceType || ""] || "📦";

  const amount = reward.type === "gems"
    ? `${reward.amount} 💎`
    : `${reward.amount} ${icon}`;

  return (
    <div
      className={`${styles.rewardCard} ${isCurrentLevel ? styles.rewardCardCurrent : ""} ${isClaimed ? styles.rewardCardClaimed : ""}`}
    >
      <div className={styles.cardLevel}>
        <span className={styles.levelNumber}>{level}</span>
        {isClaimed && <span className={styles.claimedBadge}>✓</span>}
      </div>
      <div className={styles.cardIcon}>{icon}</div>
      <div className={styles.cardAmount}>{amount}</div>
      <div className={styles.cardDescription}>{reward.description}</div>
    </div>
  );
}

export function LevelRewardsPopup({
  isOpen,
  onClose,
  currentLevel,
}: LevelRewardsPopupProps) {
  const { play } = useSoundManager();

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleEsc);
    }
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleClose = useCallback(() => {
    play("modal_close");
    onClose();
  }, [onClose, play]);

  const handleOpen = useCallback(() => {
    play("modal_open");
  }, [play]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Popup Modal */}
          <motion.div
            className={styles.popupWrapper}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: [0.33, 1, 0.68, 1] }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span>🏆</span> Level Rewards
              </h2>
              <button className={styles.closeButton} onClick={handleClose}>
                ✕
              </button>
            </div>

            {/* Content - Scrollable Grid */}
            <div className={styles.panelContent}>
              <div className={styles.rewardGrid}>
                {LEVEL_TABLE.map((lvl) => (
                  <RewardCard
                    key={lvl.level}
                    level={lvl.level}
                    reward={lvl.reward}
                    isCurrentLevel={lvl.level === currentLevel}
                    isClaimed={lvl.level < currentLevel}
                  />
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className={styles.panelFooter}>
              <span className={styles.footerHint}>
                🎁 Rewards are automatically claimed when you level up
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
