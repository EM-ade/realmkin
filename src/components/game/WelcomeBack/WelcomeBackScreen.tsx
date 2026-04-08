import { useEffect, useRef, useState } from "react";
import { useOfflineSimulation } from "@/hooks/game/useOfflineSimulation";
import { useSoundManager } from "@/audio/useSoundManager";
import { useXPSystem } from "@/hooks/game/useXPSystem";
import styles from "./WelcomeBackScreen.module.css";

interface ResourceCounterProps {
  label: string;
  emoji: string;
  value: number;
  delay?: number;
}

function ResourceCounter({
  label,
  emoji,
  value,
  delay = 0,
}: ResourceCounterProps) {
  const [displayed, setDisplayed] = useState(0);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const DURATION = 1200;

  useEffect(() => {
    if (value === 0) return;
    const startDelay = setTimeout(() => {
      startRef.current = null;
      function tick(now: number) {
        if (!startRef.current) startRef.current = now;
        const elapsed = now - startRef.current;
        const progress = Math.min(elapsed / DURATION, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        setDisplayed(Math.floor(ease * value));
        if (progress < 1) frameRef.current = requestAnimationFrame(tick);
      }
      frameRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(startDelay);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [value, delay]);

  if (value === 0) return null;
  return (
    <div className={styles.resourceItem}>
      <span className={styles.resourceEmoji}>{emoji}</span>
      <span className={styles.resourceLabel}>{label}</span>
      <span className={styles.resourceValue}>
        +{displayed.toLocaleString()}
      </span>
    </div>
  );
}

export function WelcomeBackScreen() {
  const { offlineGains, dismissGains } = useOfflineSimulation();
  const { play } = useSoundManager();

  useEffect(() => {
    if (offlineGains?.wasOffline) {
      play("welcome_back");
      if (offlineGains.streakGemsEarned > 0) {
        setTimeout(() => play("daily_login"), 500);
      }

      if (offlineGains.streakUpdated) {
        useXPSystem.getState().awardXP("daily_login");
        const streak = offlineGains.newStreak || 1;
        if (streak >= 30) useXPSystem.getState().awardXP("login_streak_30");
        else if (streak >= 14)
          useXPSystem.getState().awardXP("login_streak_14");
        else if (streak >= 7) useXPSystem.getState().awardXP("login_streak_7");
        else if (streak >= 3) useXPSystem.getState().awardXP("login_streak_3");
      }
    }
  }, [offlineGains, play]);

  if (!offlineGains?.wasOffline) return null;

  const {
    durationFormatted,
    resources,
    hasAutominer,
    completedBuildings,
    streakUpdated,
    newStreak,
    streakGemsEarned,
  } = offlineGains;

  const hasResources = Object.values(resources).some((v) => v > 0);

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.swords}>⚔️</span>
          <h1 className={styles.title}>Welcome Back!</h1>
          <span className={styles.swords}>⚔️</span>
        </div>

        <p className={styles.awayText}>
          You were away for <strong>{durationFormatted}</strong>
        </p>

        {/* Resource gains */}
        <div className={styles.section}>
          {hasAutominer && hasResources ? (
            <>
              <div className={styles.resourceGrid}>
                <ResourceCounter
                  label="Wood"
                  emoji="🌾"
                  value={resources.wood}
                  delay={0}
                />
                <ResourceCounter
                  label="Stone"
                  emoji="⛏️"
                  value={resources.stone}
                  delay={150}
                />
                <ResourceCounter
                  label="Iron"
                  emoji="🔩"
                  value={resources.iron}
                  delay={300}
                />
                <ResourceCounter
                  label="Food"
                  emoji="🍖"
                  value={resources.food}
                  delay={450}
                />
              </div>
              <div className={styles.autominerBadge}>
                <span>⚒️</span> Autominer active
              </div>
            </>
          ) : (
            <div className={styles.noAutominerBox}>
              <p>💤 Your village didn't produce while you were away.</p>
              <button className={styles.autominerCta} onClick={dismissGains}>
                🛒 Get the Autominer (150 gems) to earn resources offline!
              </button>
            </div>
          )}
        </div>

        {/* Completed buildings */}
        {completedBuildings.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Buildings completed:</h3>
            <ul className={styles.buildingList}>
              {completedBuildings.map((b) => (
                <li key={b.buildingId} className={styles.buildingItem}>
                  ✅{" "}
                  <span className={styles.buildingName}>
                    {formatBuildingName(b.buildingType)}
                  </span>
                  {b.newLevel > 1
                    ? ` upgraded to Level ${b.newLevel}`
                    : " finished building"}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Login streak */}
        {streakUpdated && newStreak > 0 && (
          <div className={styles.streakBox}>
            🔥 Login streak:{" "}
            <strong>
              {newStreak} day{newStreak !== 1 ? "s" : ""}!
            </strong>
            {streakGemsEarned > 0 && (
              <span className={styles.streakGems}>
                {" "}
                (+{streakGemsEarned} 💎 gems)
              </span>
            )}
          </div>
        )}

        <button className={styles.continueBtn} onClick={dismissGains}>
          Continue Playing
        </button>
      </div>
    </div>
  );
}

function formatBuildingName(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
