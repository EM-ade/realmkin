import Phaser from "phaser";
import { BUILDINGS, getBuildingCost, getMaxCount } from "@/game/config/buildings";
import { useGameState } from "@/stores/gameStore";
import { canPlace } from "@/game/utils/OccupiedGrid";

const PLACEABLE = [
  "farm",
  "lumber-mill",
  "quarry",
  "iron-mine",
  "barracks",
  "warehouse",
  "house",
] as const;

type PlaceableType = (typeof PLACEABLE)[number];

const RESOURCE_ICONS: Record<string, string> = {
  wood: "🪵",
  clay: "🧱",
  iron: "⛏",
  crop: "🌾",
};

const BUILDING_EMOJIS: Record<string, string> = {
  farm: "🌾",
  "lumber-mill": "🪵",
  quarry: "⛏",
  "iron-mine": "⚙",
  barracks: "⚔",
  warehouse: "📦",
  house: "🏠",
};

export interface BuildPanelConfig {
  scene: Phaser.Scene;
  panel: Phaser.GameObjects.Container;
  onBuild?: (col: number, row: number, type: PlaceableType) => void;
  onClose?: () => void;
}

/**
 * BuildPanel — Handles the building selection panel for empty tiles.
 *
 * Responsibilities:
 * - Display available buildings for placement
 * - Show building costs and requirements
 * - Handle building selection clicks
 * - Display lock/unlock status based on Town Hall level
 * - Show current building counts
 *
 * Not responsible for:
 * - Actual building placement (handled by callback)
 * - Resource checking (handled by gameStore)
 */
export class BuildPanel {
  private scene: Phaser.Scene;
  private panel: Phaser.GameObjects.Container;
  private onBuild?: (col: number, row: number, type: PlaceableType) => void;
  private onClose?: () => void;
  private col: number = 0;
  private row: number = 0;

  // Panel dimensions
  private readonly PANEL_W = 320;
  private readonly PANEL_H = Math.min(750, 1080 - 100);
  private readonly CARD_H = 150;

  constructor(config: BuildPanelConfig) {
    this.scene = config.scene;
    this.panel = config.panel;
    this.onBuild = config.onBuild;
    this.onClose = config.onClose;
  }

  /**
   * Open the build panel for an empty tile
   */
  open(col: number, row: number): void {
    this.col = col;
    this.row = row;
    this.panel.removeAll(true);

    const sw = this.scene.scale.width;
    const sh = this.scene.scale.height;
    const isMobile = sw < 768;
    // Responsive panel width, correctly sized
    const pw = Math.max(
      300,
      isMobile
        ? Math.min(this.PANEL_W, sw * 0.95)
        : Math.min(this.PANEL_W, sw * 0.45),
    );
    const ph = Math.min(this.PANEL_H, sh - 80);
    const px = 10;
    const py = 80;

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0d1b2a, 0.96);
    bg.fillRoundedRect(0, 0, pw, ph, { tr: 14, br: 14, tl: 14, bl: 14 });
    bg.lineStyle(3, 0xd4af37, 0.7);
    bg.strokeRoundedRect(0, 0, pw, ph, { tr: 14, br: 14, tl: 14, bl: 14 });
    this.panel.add(bg);

    // Header
    this.panel.add(
      this.scene.add
        .text(pw / 2, 28, "⚒  Build", {
          fontSize: "28px",
          fontFamily: "Arial",
          color: "#D4AF37",
          stroke: "#000",
          strokeThickness: 5,
        })
        .setOrigin(0.5),
    );

    // Zone label
    this.panel.add(
      this.scene.add
        .text(pw / 2, 58, "🟩 Inner Village Tile", {
          fontSize: "16px",
          fontFamily: "Arial",
          color: "#88dd88",
        })
        .setOrigin(0.5),
    );

    // Close button
    const closeBtnSize = 54;
    const closeBtn = this.scene.add
      .text(pw - 16, 16, "✕", {
        fontSize: "32px",
        fontFamily: "Arial",
        color: "#b0b8c4",
      })
      .setOrigin(1, 0)
      .setInteractive({ useHandCursor: true });

    // Close button hit zone
    const closeZone = this.scene.add
      .zone(
        pw - closeBtnSize / 2 - 8,
        closeBtnSize / 2 + 8,
        closeBtnSize,
        closeBtnSize,
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    // Hover/press feedback for close button
    closeBtn.on("pointerover", () => {
      closeBtn.setColor("#ff6666");
      this.scene.tweens.add({
        targets: closeBtn,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 100,
        ease: "Power2",
      });
    });

    closeBtn.on("pointerout", () => {
      closeBtn.setColor("#b0b8c4");
      this.scene.tweens.add({
        targets: closeBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 100,
        ease: "Power2",
      });
    });

    closeBtn.on("pointerdown", () => {
      this.scene.tweens.add({
        targets: closeBtn,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 80,
        ease: "Power2",
      });
    });

    closeBtn.on("pointerup", () => {
      this.scene.tweens.add({
        targets: closeBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: "Back.easeOut",
      });
      this.close();
    });

    closeZone.on("pointerdown", () => {
      this.close();
    });

    this.panel.add(closeBtn);
    this.panel.add(closeZone);

    const store = useGameState.getState();
    const { resources } = store;

    // Card list — 2 columns with improved spacing
    const cols = 2;
    const cardW = Math.floor((pw - 24) / cols);
    const startY = 85;

    PLACEABLE.forEach((type, idx) => {
      const ci = idx % cols;
      const ri = Math.floor(idx / cols);
      const bx = 8 + ci * (cardW + 8);
      const by = startY + ri * (this.CARD_H + 12);

      this.createBuildingCard(bx, by, cardW, type, resources, pw);
    });

    // First-time hint with improved readability
    this.panel.add(
      this.scene.add
        .text(pw / 2, ph - 24, "👆 Tap a building to place it", {
          fontSize: "18px",
          fontFamily: "Arial",
          color: "#b0b8c4",
        })
        .setOrigin(0.5),
    );

    this.panel.setPosition(px, py).setVisible(true);
  }

  /**
   * Create a single building card
   */
  private createBuildingCard(
    bx: number,
    by: number,
    cardW: number,
    type: PlaceableType,
    resources: any,
    _pw: number,
  ): void {
    const store = useGameState.getState();
    const cfg = BUILDINGS[type];
    const cost = getBuildingCost(type, 1);
    const { allowed, reason } = store.canBuild(type as any);
    const canAfford =
      resources.wood >= cost.wood &&
      resources.clay >= cost.clay &&
      resources.iron >= cost.iron &&
      resources.crop >= cost.crop;
    const count = store.getBuildingCount(type as any);
    const thLvl = store.getTownHallLevel();
    const maxCount = getMaxCount(type, thLvl);
    const isClickable =
      allowed && canAfford && !(maxCount !== -1 && count >= maxCount);

    // Card background
    const card = this.scene.add.graphics();
    const drawCard = (lit: boolean) => {
      card.clear();
      const fill = !allowed
        ? 0x1a0a0a
        : isClickable
          ? lit
            ? 0x1e4a1e
            : 0x0f2a18
          : 0x111828;
      const border = !allowed
        ? 0x441111
        : isClickable
          ? lit
            ? 0x55ff88
            : 0x2a6640
          : 0x334455;
      card.fillStyle(fill, 0.95);
      card.fillRoundedRect(bx, by, cardW - 4, this.CARD_H, 8);
      card.lineStyle(isClickable && lit ? 2 : 1, border, 1);
      card.strokeRoundedRect(bx, by, cardW - 4, this.CARD_H, 8);
    };
    drawCard(false);
    this.panel.add(card);

    // Building icon
    const imgKey = `${type}-l1`;
    const iconSize = 72;
    if (this.scene.textures.exists(imgKey)) {
      const img = this.scene.add
        .image(bx + (cardW - 4) / 2, by + 40, imgKey, 0)
        .setDisplaySize(iconSize, iconSize)
        .setOrigin(0.5);
      img.setAlpha(!allowed ? 0.35 : isClickable ? 1 : 0.5);
      this.panel.add(img);
    } else {
      // Emoji fallback
      this.panel.add(
        this.scene.add
          .text(bx + (cardW - 4) / 2, by + 40, BUILDING_EMOJIS[type] ?? "?", {
            fontSize: "48px",
          })
          .setOrigin(0.5),
      );
    }

    // Lock icon
    if (!allowed) {
      this.panel.add(
        this.scene.add
          .text(bx + (cardW - 4) / 2, by + 14, "🔒", {
            fontSize: "20px",
          })
          .setOrigin(0.5),
      );
    }

    // Name - improved readability
    this.panel.add(
      this.scene.add
        .text(bx + (cardW - 4) / 2, by + 80, cfg.name, {
          fontSize: "20px",
          fontFamily: "Arial",
          color: isClickable ? "#ffffff" : "#666",
          wordWrap: { width: cardW - 8 },
          align: "center",
          stroke: "#000",
          strokeThickness: 2,
        })
        .setOrigin(0.5),
    );

    // Cost display - improved readability
    if (allowed && !(maxCount !== -1 && count >= maxCount)) {
      const costStr = `${RESOURCE_ICONS.wood}${cost.wood} ${RESOURCE_ICONS.clay}${cost.clay}`;
      const costStr2 = `${RESOURCE_ICONS.iron}${cost.iron} ${RESOURCE_ICONS.crop}${cost.crop}`;
      this.panel.add(
        this.scene.add
          .text(bx + (cardW - 4) / 2, by + 104, costStr, {
            fontSize: "16px",
            fontFamily: "Arial",
            color: canAfford ? "#aaffaa" : "#ff6666",
            align: "center",
          })
          .setOrigin(0.5),
      );
      this.panel.add(
        this.scene.add
          .text(bx + (cardW - 4) / 2, by + 124, costStr2, {
            fontSize: "16px",
            fontFamily: "Arial",
            color: canAfford ? "#aaffaa" : "#ff6666",
            align: "center",
          })
          .setOrigin(0.5),
      );
    } else if (!allowed) {
      this.panel.add(
        this.scene.add
          .text(bx + (cardW - 4) / 2, by + 114, reason ?? "Locked", {
            fontSize: "16px",
            fontFamily: "Arial",
            color: "#ff6666",
            wordWrap: { width: cardW - 8 },
            align: "center",
          })
          .setOrigin(0.5),
      );
    } else {
      // Show count/max with unlock hint
      const nextUnlock = Object.keys(cfg.maxCountByTH)
        .map(Number)
        .sort((a, b) => a - b)
        .find((k) => k > thLvl);
      const upgradeHint = nextUnlock
        ? ` (TH${nextUnlock}: ${cfg.maxCountByTH[nextUnlock]})`
        : "";
      this.panel.add(
        this.scene.add
          .text(
            bx + (cardW - 4) / 2,
            by + 114,
            `${count}/${maxCount}${upgradeHint}`,
            {
              fontSize: "16px",
              fontFamily: "Arial",
              color: "#ff6666",
              align: "center",
            },
          )
          .setOrigin(0.5),
      );
    }

    // Count badge - improved readability
    if (count > 0) {
      const badge = this.scene.add.graphics();
      badge.fillStyle(0x333366, 0.9);
      badge.fillRoundedRect(bx + cardW - 36, by + 6, 30, 22, 6);
      this.panel.add(badge);
      this.panel.add(
        this.scene.add
          .text(bx + cardW - 21, by + 17, `${count}`, {
            fontSize: "16px",
            fontFamily: "Arial",
            color: "#aaddff",
          })
          .setOrigin(0.5),
      );
    }

    // Hit zone with hover/press feedback
    if (isClickable) {
      const zone = this.scene.add
        .zone(bx, by, cardW - 4, this.CARD_H)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => {
        drawCard(true);
        // Scale up the card slightly on hover
        this.scene.tweens.add({
          targets: card,
          scaleX: 1.02,
          scaleY: 1.02,
          duration: 100,
          ease: "Power2",
        });

        // Update grid highlight color if placement is valid
        const villageScene = this.scene as any;
        if (
          villageScene.gridRenderer &&
          villageScene.gridRenderer.showHoverEffect
        ) {
          // Use canPlace logic to check space availability for this building
          // The grid renderer hitzone creates the baseline white hover, this temporarily overrides it
          const footprint = cfg.footprint ?? { w: 1, h: 1 };
          const { canPlace: isValid } = canPlace(
            this.row,
            this.col,
            footprint,
            store.buildings,
          );
          const color = isValid ? 0x44ff44 : 0xff4444;
          villageScene.gridRenderer.showHoverEffect(
            this.col,
            this.row,
            color,
            0.4,
            footprint.w,
            footprint.h,
          );
        }
      });
      zone.on("pointerout", () => {
        drawCard(false);
        // Reset scale
        this.scene.tweens.add({
          targets: card,
          scaleX: 1,
          scaleY: 1,
          duration: 100,
          ease: "Power2",
        });

        // Revert hover effect to standard white on mouse off
        const villageScene = this.scene as any;
        if (
          villageScene.gridRenderer &&
          villageScene.gridRenderer.showHoverEffect
        ) {
          villageScene.gridRenderer.showHoverEffect(
            this.col,
            this.row,
            0xffffff,
            0.15,
            1,
            1,
          );
        }
      });
      zone.on("pointerdown", () => {
        // Scale down on press
        this.scene.tweens.add({
          targets: card,
          scaleX: 0.98,
          scaleY: 0.98,
          duration: 80,
          ease: "Power2",
        });
        if (this.onBuild) {
          this.onBuild(this.col, this.row, type);
        }
      });
      zone.on("pointerup", () => {
        // Bounce back on release
        this.scene.tweens.add({
          targets: card,
          scaleX: 1,
          scaleY: 1,
          duration: 150,
          ease: "Back.easeOut",
        });
      });
      this.panel.add(zone);
    }
  }

  /**
   * Close the panel
   */
  close(): void {
    this.panel.setVisible(false);
    this.panel.removeAll(true);
    if (this.onClose) {
      this.onClose();
    }
  }
}
