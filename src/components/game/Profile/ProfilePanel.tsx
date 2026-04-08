import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/components/game/providers/GameAuthProvider";
import { usePowerLevel } from "@/hooks/game/usePowerLevel";
import { TITLES, getTitleById, TITLE_RARITY_COLORS, checkTitleUnlock } from "@/game/config/titles";
import { useGameState } from "@/stores/gameStore";
import { useXPSystem } from "@/hooks/game/useXPSystem";
import { supabase } from "@/lib/supabase";
import styles from "./ProfilePanel.module.css";
import { useSoundManager } from "@/audio/useSoundManager";

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfilePanel({ isOpen, onClose }: ProfilePanelProps) {
  const { player } = useAuth();
  const { powerLevel, powerTier, breakdown } = usePowerLevel();
  const { currentLevel, currentXP, xpToNextLevel, xpProgress, completedMilestones } = useXPSystem();
  const { buildings } = useGameState();
  const { play } = useSoundManager();

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleClose = useCallback(() => {
    play("modal_close");
    onClose();
  }, [onClose, play]);

  if (!player) return null;

  const username = player.username || player.walletAddress?.slice(0, 8) || "Hero";
  const avatarUrl = player.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(username)}`;
  const activeTitle = getTitleById(player.activeTitle || "realm_born") || TITLES.realm_born;

  // Build context for title unlock checking
  const buildingTypesPlaced = new Set(buildings.map((b) => b.type));
  const titleContext = {
    powerLevel,
    playerLevel: currentLevel,
    loginStreak: player.loginStreak || 0,
    buildings: buildings.map((b) => ({ type: b.type, level: b.level })),
    buildingTypesPlaced,
  };

  const unlockedTitles = player.unlockedTitles || ["realm_born"];

  // Calculate percentages for breakdown bars
  const totalForPercent = breakdown.total || 1;
  const getPercent = (val: number) => Math.min(100, (val / totalForPercent) * 100);

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

          {/* Panel */}
          <motion.div
            className={styles.panelWrapper}
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.panelHeader}>
              <h2 className={styles.panelTitle}>
                <span>👤</span> Profile
              </h2>
              <button className={styles.closeButton} onClick={handleClose}>
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className={styles.panelContent}>
              {/* Player Card */}
              <div className={styles.playerCard}>
                <div className={styles.avatarContainer}>
                  <img
                    src={avatarUrl}
                    alt={username}
                    className={styles.avatar}
                    style={{ borderColor: powerTier.color, borderWidth: 3, borderStyle: "solid" }}
                  />
                </div>
                <div className={styles.username}>{username}</div>
                <div
                  className={styles.activeTitle}
                  style={{
                    borderColor: activeTitle.color,
                    color: activeTitle.color,
                  }}
                >
                  ◆ {activeTitle.name} ◆
                </div>
              </div>

              {/* Stat Cards */}
              <div className={styles.statCards}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>⚔️</div>
                  <div className={styles.statValue} style={{ color: powerTier.color }}>
                    {powerLevel.toLocaleString()}
                  </div>
                  <div className={styles.statLabel}>Power</div>
                  <div className={styles.statSublabel} style={{ color: powerTier.color }}>
                    {powerTier.icon} {powerTier.name}
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>⭐</div>
                  <div className={styles.statValue}>Lv.{currentLevel}</div>
                  <div className={styles.statLabel}>Level</div>
                  {/* XP Progress Bar matching TopBar style */}
                  <div className={styles.xpBarContainer}>
                    <div className={styles.xpBarBg}>
                      <div
                        className={styles.xpBarFill}
                        style={{ width: `${Math.max(2, xpProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className={styles.statSublabel}>
                    {Math.floor(currentXP)}/{Math.floor(currentXP + xpToNextLevel)} XP
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon}>💎</div>
                  <div className={styles.statValue}>{player.gemBalance || 0}</div>
                  <div className={styles.statLabel}>Gems</div>
                  <div className={styles.statSublabel}>💎</div>
                </div>
              </div>

              {/* Power Breakdown */}
              <div className={styles.sectionDivider}>
                <span>⚡ Power Breakdown</span>
              </div>

              <div className={styles.breakdownRow}>
                <span className={styles.breakdownIcon}>🏗️</span>
                <span className={styles.breakdownName}>Buildings</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: `${getPercent(breakdown.buildingPower)}%`, backgroundColor: powerTier.color }}
                  />
                </div>
                <span className={styles.breakdownValue}>{breakdown.buildingPower.toLocaleString()}</span>
                <span className={styles.breakdownPercent}>{getPercent(breakdown.buildingPower).toFixed(0)}%</span>
              </div>

              <div className={styles.breakdownRow}>
                <span className={styles.breakdownIcon}>⭐</span>
                <span className={styles.breakdownName}>Level</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: `${getPercent(breakdown.levelPower)}%`, backgroundColor: powerTier.color }}
                  />
                </div>
                <span className={styles.breakdownValue}>{breakdown.levelPower.toLocaleString()}</span>
                <span className={styles.breakdownPercent}>{getPercent(breakdown.levelPower).toFixed(0)}%</span>
              </div>

              <div className={styles.breakdownRow}>
                <span className={styles.breakdownIcon}>⚒️</span>
                <span className={styles.breakdownName}>Production</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: `${getPercent(breakdown.productionPower)}%`, backgroundColor: powerTier.color }}
                  />
                </div>
                <span className={styles.breakdownValue}>{breakdown.productionPower.toLocaleString()}</span>
                <span className={styles.breakdownPercent}>{getPercent(breakdown.productionPower).toFixed(0)}%</span>
              </div>

              <div className={styles.breakdownRow}>
                <span className={styles.breakdownIcon}>⚔️</span>
                <span className={styles.breakdownName}>Army</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: `${getPercent(breakdown.armyPower)}%`, backgroundColor: "#666" }}
                  />
                </div>
                <span className={styles.breakdownValue}>{breakdown.armyPower}</span>
                <span className={styles.breakdownPercent}>Soon</span>
              </div>

              <div className={styles.breakdownRow}>
                <span className={styles.breakdownIcon}>🏆</span>
                <span className={styles.breakdownName}>Achievements</span>
                <div className={styles.breakdownBar}>
                  <div
                    className={styles.breakdownFill}
                    style={{ width: `${getPercent(breakdown.achievementPower)}%`, backgroundColor: powerTier.color }}
                  />
                </div>
                <span className={styles.breakdownValue}>{breakdown.achievementPower}</span>
                <span className={styles.breakdownPercent}>{getPercent(breakdown.achievementPower).toFixed(0)}%</span>
              </div>

              {/* Titles */}
              <div className={styles.sectionDivider}>
                <span>🏅 My Titles</span>
              </div>

              <div className={styles.titleGrid}>
                {Object.values(TITLES).map((title) => {
                  const isUnlocked = unlockedTitles.includes(title.id);
                  const isActive = player.activeTitle === title.id;
                  const isLocked = !isUnlocked;

                  return (
                    <div
                      key={title.id}
                      className={`${styles.titleBadge} ${isActive ? styles.titleBadgeActive : ""} ${isLocked ? styles.titleLocked : ""}`}
                      style={{
                        borderColor: title.color,
                        color: isUnlocked ? title.color : "#666",
                        backgroundColor: isActive ? `${title.color}22` : "transparent",
                      }}
                      onClick={async () => {
                        if (isLocked) return;
                        try {
                          const { data: session } = await supabase.auth.getSession();
                          if (session?.session?.user) {
                            await supabase
                              .from("players")
                              .update({ active_title: title.id })
                              .eq("id", session.session.user.id);
                          }
                        } catch (err) {
                          console.error("[Profile] Failed to equip title:", err);
                        }
                      }}
                      title={isUnlocked ? title.description : `Unlock: ${title.requirement}`}
                    >
                      {isUnlocked ? title.name : `🔒 ${title.name}`}
                      {isActive && " ✓"}
                    </div>
                  );
                })}
              </div>
              <p className={styles.titleEquipHint}>Tap a title to equip it</p>

              {/* Season Stats */}
              <div className={styles.sectionDivider}>
                <span>Season 1: Rise of the Realm</span>
              </div>

              <div className={styles.seasonStats}>
                <div className={styles.seasonStat}>
                  <span className={styles.seasonStatIcon}>📅</span>
                  <div className={styles.seasonStatContent}>
                    <div className={styles.seasonStatLabel}>Days Active</div>
                    <div className={styles.seasonStatValue}>{player.daysActive || 1} days</div>
                  </div>
                </div>
                <div className={styles.seasonStat}>
                  <span className={styles.seasonStatIcon}>🏗️</span>
                  <div className={styles.seasonStatContent}>
                    <div className={styles.seasonStatLabel}>Buildings Built</div>
                    <div className={styles.seasonStatValue}>{buildings.filter((b) => b.type !== "wall" && b.type !== "tower").length} total</div>
                  </div>
                </div>
                <div className={styles.seasonStat}>
                  <span className={styles.seasonStatIcon}>🔥</span>
                  <div className={styles.seasonStatContent}>
                    <div className={styles.seasonStatLabel}>Login Streak</div>
                    <div className={styles.seasonStatValue}>{player.loginStreak || 0} days</div>
                  </div>
                </div>
                <div className={styles.seasonStat}>
                  <span className={styles.seasonStatIcon}>📊</span>
                  <div className={styles.seasonStatContent}>
                    <div className={styles.seasonStatLabel}>Milestones</div>
                    <div className={styles.seasonStatValue}>{completedMilestones?.length || 0} done</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
