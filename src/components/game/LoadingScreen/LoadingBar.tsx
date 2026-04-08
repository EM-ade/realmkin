// src/components/game/LoadingScreen/LoadingBar.tsx
import React from "react";
import styles from "./LoadingScreen.module.css";

interface LoadingBarProps {
  progress: number;
}

export function LoadingBar({ progress }: LoadingBarProps) {
  const isHeld = progress >= 90 && progress < 100;

  return (
    <div className={styles.progressContainer}>
      <div className={styles.progressHeader}>
        <span className={styles.percentage}>{Math.floor(progress)}%</span>
      </div>
      <div className={styles.barTrack}>
        <div
          className={`${styles.barFill} ${isHeld ? styles.barFillActive : ""}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
