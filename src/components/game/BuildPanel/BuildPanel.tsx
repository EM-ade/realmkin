import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "@/stores/gameStore";
import { useSoundManager } from "@/audio/useSoundManager";
import {
  BUILDINGS,
  getBuildingCost,
  getMaxCount,
} from "@/game/config/buildings";
import { useUIStore } from "@/stores/uiStore";
import {
  PLACEABLE_BUILDINGS,
  BUILDING_THUMBNAILS,
  RESOURCE_ICONS,
  RESOURCE_EMOJIS,
  BUILDING_CATEGORIES,
} from "./buildings.config";
import styles from "./BuildPanel.module.css";
import type { BuildingType } from "@/stores/gameStore";

interface BuildPanelProps {
  col: number;
  row: number;
  onClose: () => void;
}

interface BuildingCardProps {
  type: BuildingType;
  onSelect: () => void;
}

function BuildingCard({ type, onSelect }: BuildingCardProps) {
  const store = useGameState();
  const cfg = BUILDINGS[type];
  const cost = getBuildingCost(type, 1);
  const { allowed } = store.canBuild(type);
  const count = store.getBuildingCount(type);
  const maxCount = getMaxCount(type, store.getTownHallLevel());
  const resources = store.resources;

  const canAfford =
    resources.wood >= (cost.wood || 0) &&
    resources.clay >= (cost.clay || 0) &&
    resources.iron >= (cost.iron || 0) &&
    resources.crop >= (cost.crop || 0);

  const isLocked = !allowed;
  const thumbnailPath = BUILDING_THUMBNAILS[type];

  return (
    <motion.div
      className={`
        ${styles.buildingCard}
        ${!canAfford ? styles.buildingCardDisabled : ""}
        ${isLocked ? styles.buildingCardLocked : ""}
      `}
      data-tutorial={`build-card-${type}`}
      onClick={isLocked || !canAfford ? undefined : onSelect}
      whileHover={!isLocked && canAfford ? { scale: 1.02, y: -1 } : {}}
      whileTap={!isLocked && canAfford ? { scale: 0.99 } : {}}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
    >
      {/* Footprint Badge */}
      <span className={styles.footprintBadge}>
        {cfg.footprint.w}×{cfg.footprint.h}
      </span>

      {/* Building Image */}
      <div className={styles.cardImageWrapper}>
        <img
          src={thumbnailPath}
          alt={cfg.name}
          className={styles.cardImage}
          onError={(e) => {
            // Fallback to emoji if image fails
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        {isLocked && <div className={styles.cardLockedOverlay}>🔒</div>}
      </div>

      {/* Building Name */}
      <h3 className={styles.cardName}>{cfg.name}</h3>

      {/* Count */}
      <span className={styles.cardCount}>
        {maxCount === -1 ? `Built: ${count}` : `${count}/${maxCount}`}
      </span>

      {/* Resource Costs */}
      <div className={styles.cardCosts}>
        {Object.entries(cost).map(([res, amount]) => {
          if (!amount || amount === 0) return null;
          const hasEnough = resources[res as keyof typeof resources] >= amount;
          const iconPath = RESOURCE_ICONS[res];
          const emoji = RESOURCE_EMOJIS[res];

          return (
            <span
              key={res}
              className={`${styles.costItem} ${
                hasEnough
                  ? styles.costItemAffordable
                  : styles.costItemUnaffordable
              }`}
            >
              {iconPath ? (
                <img src={iconPath} alt={res} className={styles.costIcon} />
              ) : (
                <span>{emoji}</span>
              )}
              {amount}
            </span>
          );
        })}
      </div>
    </motion.div>
  );
}

export function BuildPanel({ col: _col, row: _row, onClose }: BuildPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState(
    BUILDING_CATEGORIES[0].id,
  );
  const { play } = useSoundManager();

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    // Play modal open sound
    play('modal_open');
  }, []);

  const handleClose = useCallback(() => {
    play('modal_close');
    setIsVisible(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  const startPlacement = useUIStore((state) => state.startPlacement);
  const handleBuild = useCallback(
    (type: BuildingType) => {
      play('button_click');
      startPlacement(type);
      handleClose();
    },
    [startPlacement, handleClose],
  );

  // Get buildings for active category
  const currentCategory = BUILDING_CATEGORIES.find(
    (c) => c.id === activeCategory,
  );
  const categoryBuildings = currentCategory?.buildingIds.filter((id) =>
    PLACEABLE_BUILDINGS.includes(id),
  );

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="build-backdrop"
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

      {/* Side Panel - Left Side */}
      <motion.div
        key="build-panel"
        className={styles.buildPanelWrapper}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        initial={{ x: "-100%" }}
        animate={{ x: isVisible ? 0 : "-100%" }}
        transition={{ duration: 0.3, ease: [0.33, 1, 0.68, 1] }}
      >
        {/* Header */}
        <div className={styles.panelHeader}>
          <h2 className={styles.panelTitle}>
            <span>⚒</span> Build
          </h2>
          <button className={styles.closeButton} onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Zone Label */}
        <div className={styles.zoneLabel}>
          <span className={styles.zoneLabelText}>
            <span>🟩</span> Inner Village Tile
          </span>
        </div>

        {/* Category Tabs */}
        <div className={styles.categoryBar}>
          {BUILDING_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.categoryTab} ${activeCategory === cat.id ? styles.categoryTabActive : ""}`}
              onClick={() => { play('tab_switch'); setActiveCategory(cat.id); }}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Building Grid - Scrollable */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            className={styles.buildingGrid}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {categoryBuildings?.map((type) => (
              <BuildingCard
                key={type}
                type={type}
                onSelect={() => handleBuild(type)}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {/* Hint Footer */}
        <div className={styles.hintFooter}>
          <span className={styles.hintText}>
            <span>👆</span> Drag building or tap map to position
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default BuildPanel;
