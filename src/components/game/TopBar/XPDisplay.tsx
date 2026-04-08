import { useState } from "react";
import { useXPSystem } from "@/hooks/game/useXPSystem";
import styles from "./XPDisplay.module.css";
import { LEVEL_TABLE } from "@/game/config/xpConfig";

export function XPDisplay() {
  const { currentXP, currentLevel, xpProgress } = useXPSystem();

  return (
    <div
      className={styles.xpContainer}
      // onClick={() => {
      //   // Dispatch custom event to open popup from App level
      //   window.dispatchEvent(new CustomEvent("open-level-rewards"));
      // }}
      role="button"
      tabIndex={0}
      aria-label="Open level rewards"
    >
      <div className={styles.levelBadge}>⭐ Lv.{currentLevel}</div>
      <div className={styles.progressBarBg}>
        <div
          className={styles.progressBarFill}
          style={{ width: `${Math.max(2, xpProgress * 100)}%` }}
        />
      </div>
    </div>
  );
}
