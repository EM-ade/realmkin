// src/components/game/LoadingScreen/LoadingTip.tsx
import React, { useState, useEffect } from "react";
import styles from "./LoadingScreen.module.css";

const TIPS = [
  "Your builders work tirelessly, even while you sleep.",
  "Upgrade your Town Hall to unlock new buildings.",
  "The Autominer keeps your village productive while you're away.",
  "Collect resources daily to maintain your login streak.",
  "Gems can speed up any construction instantly.",
  "Higher level buildings produce resources faster.",
  "A second builder lets you construct two buildings at once.",
  "Your storage capacity limits how much you can hold — upgrade it!",
  "Season 1: Rise of the Realm — Initium. Your legend begins.",
];

export function LoadingTip() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % TIPS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.tipContainer}>
      <span className={styles.tipText}>⚔️ {TIPS[index]}</span>
    </div>
  );
}
