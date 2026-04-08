import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "@/stores/gameStore";
import { useSoundManager } from "@/audio/useSoundManager";
import {
  BUILDINGS,
  getBuildingCost,
  getLevelBuildTimeMs,
} from "@/game/config/buildings";
import {
  RESOURCE_ICONS,
  RESOURCE_EMOJIS,
} from "../BuildPanel/buildings.config";
import styles from "./UpgradePanel.module.css";
import { GAME_EVENT_UPGRADE } from "@/game/events";

interface UpgradePanelProps {
  buildingId: string;
  col?: number;
  row?: number;
  onClose: () => void;
}

interface UpgradeData {
  name: string;
  currentLevel: number;
  maxLevel: number;
  stats: Array<{
    name: string;
    icon: string;
    currentValue: number | string;
    nextValue: number | string;
    diff?: number;
  }>;
  costs: Array<{
    type: string;
    amount: number;
    owned: number;
  }>;
  upgradeTime: string;
  buildersFree: number;
  buildersTotal: number;
}

export function UpgradePanel({ buildingId, onClose }: UpgradePanelProps) {
  const store = useGameState();
  const { play } = useSoundManager();
  const [isVisible, setIsVisible] = useState(false);
  const [data, setData] = useState<UpgradeData | null>(null);
  const [isMaxLevel, setIsMaxLevel] = useState(false);
  const [canAfford, setCanAfford] = useState(true);
  const [hasBuilder, setHasBuilder] = useState(true);
  const [needsTHUpgrade, setNeedsTHUpgrade] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    play('modal_open');
  }, []);

  const handleClose = useCallback(() => {
    play('modal_close');
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  useEffect(() => {
    const building = store.buildings.find((b) => b.id === buildingId);
    if (!building) return;

    const cfg = BUILDINGS[building.type];
    if (!cfg) return;

    const currentLevel = building.level;
    const maxLevel = cfg.maxLevel;
    const isMax = currentLevel >= maxLevel;
    const resources = store.resources;
    const builderCount = store.getBuilderCount();

    const thLvl = store.getTownHallLevel();
    const thReq = currentLevel + 1 > thLvl && building.type !== "town-hall";

    // Show the build time for the NEXT level (what the player is upgrading TO)
    const nextLevel = Math.min(currentLevel + 1, maxLevel) as 1 | 2 | 3 | 4 | 5;

    // Get upgrade costs for the NEXT level
    const cost = getBuildingCost(building.type, nextLevel);
    const costs = [
      { type: "wood", amount: cost.wood, owned: resources.wood },
      { type: "clay", amount: cost.clay, owned: resources.clay },
      { type: "iron", amount: cost.iron, owned: resources.iron },
      { type: "crop", amount: cost.crop, owned: resources.crop },
    ];

    // Check affordability
    const affordable =
      resources.wood >= cost.wood &&
      resources.clay >= cost.clay &&
      resources.iron >= cost.iron &&
      resources.crop >= cost.crop;

    // Build stats
    const stats = [];

    // Hitpoints
    const currentHp = 500 + (currentLevel - 1) * 250;
    const nextHp = isMax ? currentHp : 500 + currentLevel * 250;
    stats.push({
      name: "Hitpoints",
      icon: "❤️",
      currentValue: currentHp,
      nextValue: nextHp,
      diff: nextHp - currentHp,
    });

    // Housing capacity (for applicable buildings)
    if (cfg.housingCapacity) {
      const currentCap = Math.floor(
        cfg.housingCapacity * (1 + 0.5 * (currentLevel - 1)),
      );
      const nextCap = isMax
        ? currentCap
        : Math.floor(cfg.housingCapacity * (1 + 0.5 * currentLevel));
      stats.push({
        name: "Capacity",
        icon: "👥",
        currentValue: currentCap,
        nextValue: nextCap,
        diff: nextCap - currentCap,
      });
    }

    // Production (for resource buildings)
    if (cfg.production) {
      Object.entries(cfg.production).forEach(([key, value]) => {
        const currentProd = value || 0;
        const nextProd = isMax ? currentProd : Math.floor(value * 1.3);
        stats.push({
          name: key.charAt(0).toUpperCase() + key.slice(1),
          icon: "📦",
          currentValue: currentProd,
          nextValue: nextProd,
          diff: nextProd - currentProd,
        });
      });
    }

    // Show the build time for the NEXT level (what the player is upgrading TO)
    const upgradeMs = getLevelBuildTimeMs(building.type, nextLevel);
    const upgradeSecs = Math.floor(upgradeMs / 1000);
    const upgradeTimeStr =
      upgradeSecs >= 3600
        ? `${Math.floor(upgradeSecs / 3600)}h ${Math.floor((upgradeSecs % 3600) / 60)}m`
        : upgradeSecs >= 60
          ? `${Math.floor(upgradeSecs / 60)}m ${upgradeSecs % 60}s`
          : `${upgradeSecs}s`;

    setData({
      name: cfg.name,
      currentLevel,
      maxLevel,
      stats,
      costs,
      upgradeTime: upgradeTimeStr,
      buildersFree: builderCount.total - builderCount.busy,
      buildersTotal: builderCount.total,
    });

    setIsMaxLevel(isMax);
    setCanAfford(affordable);
    setHasBuilder(builderCount.busy < builderCount.total);
    setNeedsTHUpgrade(thReq);
  }, [buildingId, store]);

  const handleUpgrade = useCallback(() => {
    if (!data || isMaxLevel || !canAfford || !hasBuilder || needsTHUpgrade)
      return;

    play('upgrade_start');

    const cost = data.costs.reduce(
      (acc, c) => {
        acc[c.type] = c.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Find building coordinates for Phuket/Phaser
    const building = store.buildings.find((b) => b.id === buildingId);
    if (!building) return;
    const col = building.slotIndex % 50;
    const row = Math.floor(building.slotIndex / 50);

    // Dispatch event to Phaser BEFORE consuming in React
    // Phaser handleUpgrade will do the consumption
    window.dispatchEvent(
      new CustomEvent(GAME_EVENT_UPGRADE, {
        detail: {
          buildingId,
          col,
          row,
          nextLevel: data.currentLevel + 1,
          cost,
        },
      }),
    );

    handleClose();
  }, [data, isMaxLevel, canAfford, hasBuilder, store, buildingId, handleClose]);

  if (!data) return null;

  const progressPercent = (data.currentLevel / data.maxLevel) * 100;
  const canUpgrade = !isMaxLevel && canAfford && hasBuilder && !needsTHUpgrade;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="upgrade-backdrop"
        className={`${styles.backdrop} ${isVisible ? styles.backdropVisible : styles.backdropHidden}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 0.4 : 0 }}
        exit={{ opacity: 0 }}
      />

      {/* Side Panel */}
      <motion.div
        key="upgrade-panel"
        className={styles.upgradePanelWrapper}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        initial={{ x: "-100%" }}
        animate={{ x: isVisible ? 0 : "-100%" }}
        transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
      >
        {/* Header */}
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            <span>⚒</span> {data.name}
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className={styles.panelContent}>
          {/* Max Level Badge */}
          {isMaxLevel ? (
            <div className={styles.maxLevelBadge}>
              <div className={styles.maxLevelIcon}>👑</div>
              <div className={styles.maxLevelText}>Max Level</div>
              <div className={styles.maxLevelSubtext}>
                This building is fully upgraded
              </div>
            </div>
          ) : (
            <>
              {/* Level Progress */}
              <div className={styles.levelSection}>
                <div className={styles.levelHeader}>
                  <span className={styles.levelText}>
                    Level {data.currentLevel}
                  </span>
                  <span className={styles.levelCount}>
                    {data.currentLevel} / {data.maxLevel}
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Stats */}
              <div className={styles.statsSection}>
                <h3 className={styles.sectionTitle}>Stats</h3>
                {data.stats.map((stat, index) => (
                  <div key={index} className={styles.statRow}>
                    <div className={styles.statName}>
                      <span className={styles.statIcon}>{stat.icon}</span>
                      <span>{stat.name}</span>
                    </div>
                    <div className={styles.statValues}>
                      <span className={styles.statCurrent}>
                        {stat.currentValue}
                      </span>
                      <span className={styles.statArrow}>→</span>
                      <span className={styles.statNext}>{stat.nextValue}</span>
                      {stat.diff !== undefined && stat.diff > 0 && (
                        <span className={styles.statDiff}>+{stat.diff}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Upgrade Cost */}
              <div className={styles.costSection}>
                <h3 className={styles.sectionTitle}>Upgrade Cost</h3>
                <div className={styles.costGrid}>
                  {data.costs.map((cost) => {
                    const affordable = cost.owned >= cost.amount;
                    const iconPath = RESOURCE_ICONS[cost.type];
                    const emoji = RESOURCE_EMOJIS[cost.type];

                    return (
                      <div
                        key={cost.type}
                        className={`${styles.costCard} ${
                          affordable
                            ? styles.costCardAffordable
                            : styles.costCardUnaffordable
                        }`}
                      >
                        {iconPath ? (
                          <img
                            src={iconPath}
                            alt={cost.type}
                            className={styles.costIcon}
                          />
                        ) : (
                          <span className={styles.costIcon}>{emoji}</span>
                        )}
                        <span
                          className={`${styles.costAmount} ${
                            affordable
                              ? styles.costAmountAffordable
                              : styles.costAmountUnaffordable
                          }`}
                        >
                          {cost.amount}
                        </span>
                        <span className={styles.costOwned}>
                          {cost.owned} owned
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info Row */}
              <div className={styles.infoRow}>
                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>⏱</span>
                  <span>{data.upgradeTime}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoIcon}>🔨</span>
                  <span>
                    {data.buildersFree}/{data.buildersTotal} free
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className={styles.actionsSection}>
          {isMaxLevel ? (
            <div className={styles.maxLevelBadge}>
              <div className={styles.maxLevelText}>✦ Max Level ✦</div>
            </div>
          ) : (
            <>
              {needsTHUpgrade ? (
                <div className={styles.thReqBadge}>
                  <div className={styles.thReqText}>
                    🔒 Requires Town Hall Lv {data.currentLevel + 1}
                  </div>
                </div>
              ) : (
                <button
                  className={styles.upgradeButton}
                  onClick={handleUpgrade}
                  disabled={!canUpgrade}
                >
                  <span>⚒</span>
                  Upgrade to Lv {data.currentLevel + 1}
                </button>
              )}
              <button className={styles.cancelButton} onClick={handleClose}>
                Cancel
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default UpgradePanel;
