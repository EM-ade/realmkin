import Phaser from "phaser";
import {
  BUILDINGS,
  getBuildingScale,
  getBuildingOffset,
  TILE_STYLE_BUILDINGS,
} from "@/game/config/buildings";
import { useGameState } from "@/stores/gameStore";

export interface BuildingRendererConfig {
  scene: Phaser.Scene;
  slotPos: Map<
    number,
    {
      cx: number;
      cy: number;
      dWaist: number;
      dBot: number;
      dTop: number;
      halfW: number;
      tileW: number;
      imgX: number;
      imgY: number;
      depth: number;
    }
  >;
  slotSprite: Map<number, Phaser.GameObjects.Image>;
  levelBadges: Map<number, Phaser.GameObjects.Text>;
  damagedOverlays: Map<number, Phaser.GameObjects.Graphics>;
  constructionOverlays: Map<number, Phaser.GameObjects.Container>;
  onConstructionComplete?: (slot: number) => void;
}

/**
 * BuildingRenderer — Handles all building sprite rendering and overlays.
 *
 * Responsibilities:
 * - Building sprite rendering (tile-style and on-tile styles)
 * - Construction animations (bounce, fade-in)
 * - Level badge display
 * - Damage overlays
 * - Construction progress overlays
 * - Wall flipping for defense ring positioning
 *
 * Not responsible for:
 * - Building placement logic (handled by VillageScene)
 * - Game state management (handled by gameStore)
 */
export class BuildingRenderer {
  private scene: Phaser.Scene;
  private slotPos: Map<number, any>;
  private slotSprite: Map<number, Phaser.GameObjects.Image>;
  private levelBadges: Map<number, Phaser.GameObjects.Text>;
  private damagedOverlays: Map<number, Phaser.GameObjects.Graphics>;
  private constructionOverlays: Map<number, Phaser.GameObjects.Container>;

  constructor(config: BuildingRendererConfig) {
    this.scene = config.scene;
    this.slotPos = config.slotPos;
    this.slotSprite = config.slotSprite;
    this.levelBadges = config.levelBadges;
    this.damagedOverlays = config.damagedOverlays;
    this.constructionOverlays = config.constructionOverlays;
  }

  /**
   * Render a building sprite with animation
   */
  animateBuilding(
    col: number,
    row: number,
    originalKey: string,
    isUpgrade: boolean,
  ): void {
    const slot = this.encodeSlot(col, row);
    const pos = this.slotPos.get(slot);
    if (!pos) return;

    const store = this.getGameState();
    let key = originalKey;

    // Only use construction-site texture for new buildings (not upgrades)
    if (!isUpgrade) {
      const bldg = store.buildings.find((b: any) => b.slotIndex === slot);
      if (bldg?.underConstruction) {
        key = "construction-site";
      }
    }

    // Fall back to level 1 texture if higher level texture is missing
    if (!this.scene.textures.exists(key)) {
      const fallback = key.replace(/-l\d+$/, "-l1");
      if (this.scene.textures.exists(fallback)) {
        key = fallback;
      } else {
        console.warn(`[BuildingRenderer] texture missing: ${key}`);
        return;
      }
    }

    const { cx, dWaist, halfW, depth } = pos;
    // DEBUG: print exact position data to diagnose coordinate mismatch
    console.log(`[BuildingRenderer] col=${col} row=${row} key=${originalKey}`, {
      cx,
      dWaist,
      halfW,
      imgX: pos.imgX,
      imgY: pos.imgY,
      tileW: pos.tileW,
    });

    // Fade out old sprite
    const old = this.slotSprite.get(slot);
    if (old) {
      this.scene.tweens.add({
        targets: old,
        alpha: 0,
        duration: 140,
        onComplete: () => old.destroy(),
      });
    }

    const delay = isUpgrade ? 120 : 0;
    const { tileW } = pos;

    // Extract building type from originalKey
    const buildingType = originalKey.replace(/-l\d+$/, "");

    const cfg = BUILDINGS[buildingType];
    const footprint = cfg?.footprint ?? { w: 1, h: 1 };
    let spr: Phaser.GameObjects.Image;

    const stepY = halfW / 2; // step = 60px

    const isTileStyle = TILE_STYLE_BUILDINGS.has(buildingType);

    const isSpritesheet = [
      "farm",
      "lumber-mill",
      "quarry",
      "iron-mine",
      "tower",
      "wall",
    ].some((bt) => buildingType.startsWith(bt));

    const isConstructionSite = key === "construction-site";
    console.log(
      `[animateBuilding] key=${key} slot=${slot} (${col},${row}) isUpgrade=${isUpgrade}`,
    );

    // Common offsets provided by manual asset tweaking
    const off = getBuildingOffset(key);

    if (isConstructionSite) {
      if (footprint.w === 1 && footprint.h === 1) {
        // 1x1 buildings - original behavior
        const targetX = cx + (footprint.w - footprint.h) * halfW;
        const targetY = pos.dTop + (footprint.w + footprint.h) * stepY;
        spr = this.scene.add.image(targetX, targetY, key);
        spr
          .setOrigin(0.5, 1.0)
          .setDisplaySize(tileW * footprint.w, tileW * footprint.h)
          .setAlpha(isUpgrade ? 0 : 1)
          .setDepth(depth + 5);
      } else {
        // Multi-tile buildings (2x2, 3x3) - centered and scaled up
        const centerX = cx + (footprint.w - footprint.h) * (halfW / 2);
        const centerY =
          pos.dTop + (footprint.w + footprint.h) * (stepY / 2) - stepY * 0.5;
        spr = this.scene.add.image(centerX, centerY, key);
        spr
          .setOrigin(0.5, 0.5)
          .setDisplaySize(tileW * footprint.w * 1.5, tileW * footprint.h * 1.5)
          .setAlpha(isUpgrade ? 0 : 1)
          .setDepth(depth + 5);
      }
      this.slotSprite.set(slot, spr);
      this.scene.tweens.add({
        targets: spr,
        alpha: 1,
        duration: 300,
        delay,
        ease: "Power2",
      });
    } else if (isTileStyle) {
      // ── TILE-STYLE buildings ──────────────────────────────────────────────
      // These are square images containing a diamond footprint patch.
      // Anchoring the mathematical center of the image to the mathematical center
      // of the footprint allows perfect alignment.

      const centerX = cx + (footprint.w - footprint.h) * (halfW / 2);
      const centerY = pos.dTop + (footprint.w + footprint.h) * (stepY / 2);

      const targetX = centerX + off.x * tileW;
      const targetY = centerY + off.y * tileW;

      const startY = delay > 0 ? targetY - 100 : targetY;
      spr = isSpritesheet
        ? this.scene.add.image(targetX, startY, key, 0)
        : this.scene.add.image(targetX, startY, key);

      spr
        .setOrigin(0.5, 0.5)
        .setDisplaySize(tileW * footprint.w, tileW * footprint.h)
        .setAlpha(isUpgrade ? 0 : 1)
        .setDepth(depth + 5);

      this.slotSprite.set(slot, spr);

      this.scene.tweens.add({
        targets: spr,
        alpha: 1,
        y: targetY,
        duration: 380,
        delay,
        ease: "Bounce.easeOut",
      });
    } else {
      // ─── BUILDING-ON-TILE MATH (Town Hall, Barracks, Walls, Towers) ────
      // Tall structures originate at their bottom floor.
      // We anchor origin(0.5, 1.0) to the absolute bottom-most tip of the footprint.

      const targetX = cx + (footprint.w - footprint.h) * halfW + off.x * tileW;
      const floorY = pos.dTop + (footprint.w + footprint.h) * stepY;
      const targetY = floorY + off.y * tileW;

      const isLargeBuilding =
        buildingType === "town-hall" || buildingType === "barracks";

      const startY = delay > 0 ? targetY - 100 : targetY;

      spr = isSpritesheet
        ? this.scene.add.image(targetX, startY, key, 0)
        : this.scene.add.image(targetX, startY, key);

      const texList = this.scene.textures.get(key);
      const sFrame = texList.get();

      if (sFrame && sFrame.width > 0 && sFrame.height > 0) {
        // Apply sizing scaling logic
        if (isLargeBuilding) {
          const targetW =
            halfW *
            2 *
            getBuildingScale(key) *
            (buildingType === "town-hall" ? 2.1 : 1.8);
          const rawH = sFrame.height * (targetW / sFrame.width);
          spr.setDisplaySize(targetW, Math.min(rawH, halfW * 5.0)); // Adjusted max height for TH
        } else if (footprint.w === 1) {
          const targetW = halfW * 2 * getBuildingScale(key);
          const rawH = sFrame.height * (targetW / sFrame.width);
          spr.setDisplaySize(targetW, Math.min(rawH, halfW * 4.5));
        } else {
          const targetW =
            halfW * 2 * getBuildingScale(key) * (footprint.w * 0.7);
          const rawH = sFrame.height * (targetW / sFrame.width);
          spr.setDisplaySize(targetW, Math.min(rawH, halfW * 4.5));
        }
      } else {
        const displayW =
          halfW *
          2 *
          (col === 6 && row === 6 ? 0.65 : 0.5) *
          (isLargeBuilding ? 1.8 : footprint.w);
        spr.setDisplaySize(displayW, displayW);
      }

      spr
        .setOrigin(0.5, 1.0)
        .setAlpha(isUpgrade ? 0 : 1)
        .setDepth(depth + 5);
      this.slotSprite.set(slot, spr);
      this.scene.tweens.add({
        targets: spr,
        alpha: 1,
        y: targetY,
        duration: 380,
        delay,
        ease: "Bounce.easeOut",
      });
    }

    // Recalculate geometric center for VFX bursts
    const cxOffset = (footprint.w - footprint.h) * (halfW / 2);
    const cyOffset = (footprint.w + footprint.h - 2) * (tileW / 8);
    const centeredX = cx + cxOffset;
    const centeredY = dWaist + cyOffset;

    // Play ring burst at centered position
    this.playRingBurst(
      centeredX,
      centeredY,
      halfW * footprint.w,
      depth,
      isUpgrade ? 0xffd700 : 0x66ff88,
    );
  }

  /**
   * Add level badge to a building
   */
  addLevelBadge(col: number, row: number, level: number): void {
    const slot = this.encodeSlot(col, row);
    // Remove old badge if any
    const old = this.levelBadges.get(slot);
    if (old) old.destroy();

    const pos = this.slotPos.get(slot);
    if (!pos) return;
    const { cx, dBot, depth } = pos;

    const maxStars = 5;
    const safeLvl = Math.max(0, Math.min(level, maxStars));
    const stars = "★".repeat(safeLvl) + "☆".repeat(maxStars - safeLvl);
    const badge = this.scene.add
      .text(cx, dBot - 6, stars, {
        fontSize: "17px",
        fontFamily: "Arial",
        color: safeLvl >= 5 ? "#FFD700" : safeLvl >= 3 ? "#aaddff" : "#aaaaaa",
        stroke: "#000000",
        strokeThickness: 4,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#FFA100",
          blur: 8,
          stroke: true,
          fill: true,
        },
        backgroundColor: "#00000066",
        padding: { x: 4, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(depth + 10);

    this.levelBadges.set(slot, badge);
  }

  /**
   * Render damage overlays for all damaged buildings
   */
  renderDamagedOverlays(): void {
    const store = this.getGameState();
    this.damagedOverlays.forEach((g) => g.destroy());
    this.damagedOverlays.clear();

    store.buildings
      .filter((b: any) => b.damaged)
      .forEach((b: any) => {
        const pos = this.slotPos.get(b.slotIndex);
        if (!pos) return;
        const { cx, dWaist, halfW, depth } = pos;
        const g = this.scene.add.graphics().setDepth(depth + 8);
        g.fillStyle(0xff0000, 0.25);
        g.fillPoints(
          [
            { x: cx, y: pos.dBot - (dWaist - pos.dBot) * 2 },
            { x: cx + halfW, y: dWaist },
            { x: cx, y: pos.dBot },
            { x: cx - halfW, y: dWaist },
          ],
          true,
        );
        // Damaged label
        const lbl = this.scene.add
          .text(cx, dWaist - 8, "🔥 Damaged", {
            fontSize: "9px",
            fontFamily: "Arial",
            color: "#ff4444",
            backgroundColor: "#000000aa",
            padding: { x: 3, y: 2 },
          })
          .setOrigin(0.5)
          .setDepth(depth + 9);
        this.damagedOverlays.set(b.slotIndex, g);
        void lbl;
      });
  }

  /**
   * Add construction progress overlay
   */
  addConstructionOverlay(
    col: number,
    row: number,
    slot: number,
    buildingId: string,
    durationMs: number,
    isUpgrade: boolean,
    onInstantFinish?: () => void,
  ): void {
    // Remove any existing overlay for this slot
    this.removeConstructionOverlay(slot);

    const pos = this.slotPos.get(slot);
    if (!pos) return;

    // Extract building type to get its footprint
    const typeStr = buildingId.substring(0, buildingId.lastIndexOf("-"));
    const cfg = BUILDINGS[typeStr];
    const footprint = cfg?.footprint ?? { w: 1, h: 1 };

    const { cx, dWaist, halfW, depth } = pos;
    const stepY = halfW / 2;
    const dTop = dWaist - stepY;
    const containerDepth = depth + 50;
    const container = this.scene.add.container(0, 0).setDepth(containerDepth);

    // Calculate the geometric bounds of the multi-tile footprint
    const targetX = cx + (footprint.w - footprint.h) * halfW;
    const targetYTop = dTop;

    // Animated hammer/upgrade icon
    const emoji = isUpgrade ? "⬆️" : "🔨";
    const hammerText = this.scene.add
      .text(targetX, targetYTop - 10, emoji, { fontSize: "16px" })
      .setOrigin(0.5, 1)
      .setDepth(containerDepth);
    container.add(hammerText);
    this.scene.tweens.add({
      targets: hammerText,
      y: targetYTop - 18,
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Circular Progress Ring (replaces horizontal bar)
    const ringX = targetX;
    const ringY = dTop + stepY; // Roughly center on the building vertically
    const ringRadius = halfW * 1.5;

    const barBg = this.scene.add.graphics();
    barBg.lineStyle(6, 0x000000, 0.5);
    barBg.beginPath();
    barBg.arc(ringX, ringY, ringRadius, 0, Math.PI * 2);
    barBg.strokePath();
    barBg.setDepth(containerDepth);
    container.add(barBg);

    const barFill = this.scene.add.graphics();
    barFill.setDepth(containerDepth);
    container.add(barFill);

    // Timer label
    const timerLabel = this.scene.add
      .text(targetX, ringY, "", {
        fontSize: "64px",
        fontFamily: "Bangers, Arial",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 10,
        fontStyle: "bold",
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#000000",
          blur: 6,
          stroke: true,
          fill: true,
        },
      })
      // Add letter spacing for that wide Clash of Clans timer look
      .setLetterSpacing(4)
      .setOrigin(0.5, 0.5)
      .setDepth(containerDepth + 2);
    container.add(timerLabel);

    // Status label
    const statusLabel = this.scene.add
      .text(targetX, targetYTop - 28, isUpgrade ? "Upgrading…" : "Building…", {
        fontSize: "9px",
        fontFamily: "Arial",
        color: isUpgrade ? "#ffcc44" : "#88ccff",
        stroke: "#000",
        strokeThickness: 2,
        backgroundColor: "#00000088",
        padding: { x: 4, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setDepth(containerDepth);
    container.add(statusLabel);

    this.constructionOverlays.set(slot, container);

    // Gem Finish Button (slightly lower to not overlap ring)
    const gemBtn = this.scene.add
      .container(targetX, ringY + ringRadius + 45)
      .setDepth(containerDepth);
    const gemBg = this.scene.add.graphics();
    gemBg.fillStyle(0x44aa44, 1);
    gemBg.fillRoundedRect(-85, -30, 170, 60, 14);
    gemBg.lineStyle(4, 0xffffff, 0.8);
    gemBg.strokeRoundedRect(-85, -30, 170, 60, 14);
    gemBtn.add(gemBg);

    const gemText = this.scene.add
      .text(0, 0, "", {
        fontSize: "38px",
        fontFamily: "Arial",
        color: "#ffffff",
        fontStyle: "bold",
        shadow: {
          offsetX: 0,
          offsetY: 2,
          color: "#000000",
          blur: 4,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(containerDepth + 1);
    gemBtn.add(gemText);

    const gemHit = this.scene.add
      .zone(0, 0, 180, 72)
      .setInteractive({ useHandCursor: true });
    gemBtn.add(gemHit);
    gemHit.on("pointerdown", (pointer: any) => {
      pointer.event.stopPropagation();
      const store = useGameState.getState();
      const building = store.buildings.find((b) => b.id === buildingId);
      if (!building || !building.underConstruction) return;

      const now = Date.now();
      const finishesAt = building.constructionFinishesAt ?? now;
      const remainingMs = Math.max(0, finishesAt - now);
      const gemCost = Math.ceil(remainingMs / 10000);

      if (store.resources.gems < gemCost) {
        return; // Not enough gems
      }

      // Deduct gems
      useGameState.setState((state) => ({
        resources: { ...state.resources, gems: state.resources.gems - gemCost },
      }));

      // Cancel bar timer
      const barTimer = (container as any).__barTimer as
        | Phaser.Time.TimerEvent
        | undefined;
      barTimer?.remove();

      // Trigger scene completion callback (cancels delayedCall and runs full visual swap)
      if (onInstantFinish) {
        onInstantFinish();
      } else {
        // Fallback: just call completeConstruction
        store.completeConstruction(buildingId);
        this.removeConstructionOverlay(slot);
      }
    });

    container.add(gemBtn);

    // Animate fill bar
    const startTime = Date.now();
    const fillColor = isUpgrade ? 0xffcc44 : 0x44aaff;
    const updateBar = () => {
      if (!container.active) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const remaining = Math.max(0, (durationMs - elapsed) / 1000);

      barFill.clear();
      barFill.lineStyle(6, fillColor, 0.9);
      if (progress > 0.8) {
        barFill.lineStyle(6, 0x44ff88, 0.95);
      }
      barFill.beginPath();
      barFill.arc(
        ringX,
        ringY,
        ringRadius,
        -Math.PI / 2,
        -Math.PI / 2 + Math.PI * 2 * progress,
        false,
      );
      barFill.strokePath();

      const minutes = Math.floor(remaining / 60);
      const seconds = Math.floor(remaining % 60);
      const timeStr = `${minutes}:${seconds.toString().padStart(2, "0")}`;
      timerLabel.setText(remaining > 0 ? timeStr : "Done!");

      if (remaining > 0) {
        const gemCost = Math.ceil(remaining / 10);
        gemBtn.setVisible(true);
        gemText.setText(`${gemCost} 💎`);
      } else {
        gemBtn.setVisible(false);
      }
    };

    const barTimer = this.scene.time.addEvent({
      delay: 80,
      repeat: Math.floor(durationMs / 80) + 5,
      callback: updateBar,
    });
    (container as any).__barTimer = barTimer;

    void col;
    void row;
  }

  /**
   * Remove construction overlay
   */
  removeConstructionOverlay(slot: number): void {
    const overlay = this.constructionOverlays.get(slot);
    if (overlay) {
      const timer = (overlay as any).__barTimer as
        | Phaser.Time.TimerEvent
        | undefined;
      timer?.remove();
      overlay.destroy();
      this.constructionOverlays.delete(slot);
    }
  }

  /**
   * Play ring burst animation on building placement/upgrade
   */
  private playRingBurst(
    cx: number,
    dBot: number,
    halfW: number,
    depth: number,
    color: number,
  ): void {
    const ring = this.scene.add.graphics().setDepth(depth + 10);
    const bH = halfW * 0.55;
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 440,
      ease: "Power2",
      onUpdate: (tw) => {
        const t = tw.getValue() || 0,
          r = halfW * (0.5 + t),
          h = bH * (0.5 + t);
        ring.clear().lineStyle(2.5 * (1 - t), color, (1 - t) * 0.9);
        ring.strokePoints(
          [
            { x: cx, y: dBot - h * 2 },
            { x: cx + r, y: dBot - h },
            { x: cx, y: dBot },
            { x: cx - r, y: dBot - h },
          ],
          true,
        );
      },
      onComplete: () => ring.destroy(),
    });
  }

  /**
   * Encode slot index from col/row — MUST match GridRenderer.encodeSlot (row*50+col)
   */
  private encodeSlot(col: number, row: number): number {
    return row * 50 + col; // row*50 matches GridRenderer & gameStore slot encoding
  }

  /**
   * Get game state from store
   */
  private getGameState(): any {
    // Dynamic import to avoid circular dependency
    return (window as any).__KINGDOM_GET_STATE__();
  }
}
