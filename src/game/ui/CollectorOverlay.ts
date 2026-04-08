import Phaser from "phaser";
import { BUILDINGS } from "@/game/config/buildings";
import { useGameState } from "@/stores/gameStore";

export interface CollectorOverlayConfig {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  onHarvest?: (buildingId: string) => void;
}

/**
 * CollectorOverlay — Handles per-building harvest UI (progress bars and harvest buttons).
 *
 * Responsibilities:
 * - Display resource collection progress per building
 * - Show harvest button when resources are ready
 * - Display resource type icons
 * - Update progress bars every frame
 *
 * Not responsible for:
 * - Resource collection logic (handled by gameStore)
 * - Building state management
 */
export class CollectorOverlay {
  private scene: Phaser.Scene;
  private overlays: Map<number, Phaser.GameObjects.Container> = new Map();
  private onHarvest?: (buildingId: string) => void;

  constructor(config: CollectorOverlayConfig) {
    this.scene = config.scene;
    this.onHarvest = config.onHarvest;
  }

  /**
   * Update all collector overlays based on current game state
   * Call this every frame or on a timer
   */
  updateAll(): void {
    const store = useGameState.getState();

    store.buildings.forEach((b) => {
      const cfg = BUILDINGS[b.type];
      if (!cfg?.tickIntervalMs || !cfg.collectorCapacity) return;

      const maxCap = cfg.collectorCapacity * (1 + 0.5 * (b.level - 1));
      const amount = b.collectedAmount ?? 0;
      const progress = Math.min(amount / maxCap, 1);

      // Hide overlay if empty
      if (amount === 0 && progress === 0) {
        this.removeOverlay(b.slotIndex);
        return;
      }

      // Create or update overlay
      let overlay = this.overlays.get(b.slotIndex);
      if (!overlay) {
        overlay = this.createOverlay(b.slotIndex, cfg);
      }

      this.updateOverlay(overlay, b.slotIndex, progress, amount, cfg);
    });
  }

  /**
   * Create a new collector overlay for a building
   */
  private createOverlay(
    slotIndex: number,
    _cfg: any,
  ): Phaser.GameObjects.Container {
    const store = useGameState.getState();
    const building = store.buildings.find((b) => b.slotIndex === slotIndex);
    if (!building) return this.scene.add.container(0, 0);

    const pos = this.getTilePosition(slotIndex);
    if (!pos) return this.scene.add.container(0, 0);

    const dTop = pos.dWaist - (pos.dBot - pos.dWaist);
    const overlay = this.scene.add.container(0, 0).setDepth(pos.depth + 40);

    // Progress bar background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x231912, 1);
    bg.fillRoundedRect(pos.cx - 40, dTop - 20, 80, 16, 8);
    bg.lineStyle(2, 0x000000, 1);
    bg.strokeRoundedRect(pos.cx - 40, dTop - 20, 80, 16, 8);
    overlay.add(bg);

    // Progress bar fill
    const fill = this.scene.add.graphics();
    overlay.add(fill);
    (overlay as any).__fill = fill;

    // Harvest icon (hidden initially)
    const icon = this.scene.add
      .text(pos.cx, dTop - 50, "✨", {
        fontSize: "64px",
        fontFamily: "Arial",
        stroke: "#000",
        strokeThickness: 6,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#FFA100",
          blur: 8,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5, 1)
      .setVisible(false);
    overlay.add(icon);
    (overlay as any).__icon = icon;

    // Hit zone for clicking (covers the resource icon and progress bar)
    const hitZone = this.scene.add
      .zone(pos.cx, dTop - 25, 80, 60)
      .setOrigin(0.5, 0.5);
    overlay.add(hitZone);
    (overlay as any).__hitZone = hitZone;

    // Bounce & Pulse animation
    this.scene.tweens.add({
      targets: icon,
      y: dTop - 65,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.overlays.set(slotIndex, overlay);
    return overlay;
  }

  /**
   * Update an existing overlay
   */
  private updateOverlay(
    overlay: Phaser.GameObjects.Container,
    slotIndex: number,
    progress: number,
    amount: number,
    cfg: any,
  ): void {
    const store = useGameState.getState();
    const building = store.buildings.find((b) => b.slotIndex === slotIndex);
    if (!building) return;

    const pos = this.getTilePosition(slotIndex);
    if (!pos) return;

    const dTop = pos.dWaist - (pos.dBot - pos.dWaist);
    const fill = (overlay as any).__fill as Phaser.GameObjects.Graphics;
    const icon = (overlay as any).__icon as Phaser.GameObjects.Text;
    const hitZone = (overlay as any).__hitZone as Phaser.GameObjects.Zone;

    // Update fill bar
    fill.clear();

    // Determine color based on resource type
    let color = 0x4488ff; // Default
    if (cfg.production?.wood) color = 0xcc8844;
    if (cfg.production?.clay) color = 0xffaa66;
    if (cfg.production?.iron) color = 0x88ccff;
    if (cfg.production?.crop) color = 0x4ade80; // CoC green for crop/food

    if (progress >= 1) {
      fill.fillStyle(0x4ade80, 1); // CoC Green when full
    } else {
      fill.fillStyle(color, 1);
    }
    fill.fillRoundedRect(pos.cx - 38, dTop - 18, 76 * progress, 12, 6);

    // Handle icon visibility and emoji
    if (progress >= 0.1) {
      if (!icon.visible) icon.setVisible(true);

      // Change emoji based on resource
      let emoji = "📦";
      if (cfg.production?.wood) emoji = "🪵";
      if (cfg.production?.clay) emoji = "🧱";
      if (cfg.production?.iron) emoji = "⛏️";
      if (cfg.production?.crop) emoji = "🌾";

      if (progress >= 1) {
        icon.setText(`⭐${emoji}`); // Star when full
      } else {
        icon.setText(emoji);
      }

      // Make clickable if emoji is visible
      if (!hitZone.input) {
        hitZone.setInteractive({ useHandCursor: true });
        hitZone.on("pointerdown", (pointer: any) => {
          pointer.event.stopPropagation();
          if (this.onHarvest) {
            // "Juice": Scale pop on the bubble itself
            this.scene.tweens.add({
              targets: icon,
              scaleX: 1.3,
              scaleY: 1.3,
              duration: 100,
              yoyo: true,
              ease: "Back.easeOut",
              onComplete: () => {
                // Spawn floating "juice" text before harvest resets amount
                this.spawnJuice(building.id, amount, cfg);
                if (this.onHarvest) {
                  this.onHarvest(building.id);
                }
              },
            });
          }
        });
      }
    } else {
      if (icon.visible) icon.setVisible(false);
      if (hitZone.input) hitZone.disableInteractive();
    }
  }

  /**
   * Remove an overlay
   */
  private removeOverlay(slotIndex: number): void {
    const overlay = this.overlays.get(slotIndex);
    if (overlay) {
      overlay.destroy();
      this.overlays.delete(slotIndex);
    }
  }

  /**
   * Get tile position from slot index
   */
  private getTilePosition(_slotIndex: number): any {
    // This needs to be passed from VillageScene
    // For now, return null - will be fixed during integration
    return null;
  }

  /**
   * Set the slotPos map for position lookup
   */
  setSlotPos(slotPos: Map<number, any>): void {
    this.getTilePosition = (slotIndex: number) => slotPos.get(slotIndex);
  }

  /**
   * Clear all overlays
   */
  clear(): void {
    this.overlays.forEach((overlay) => overlay.destroy());
    this.overlays.clear();
  }

  /**
   * Spawn floating resource text and emoji for visual feedback
   */
  private spawnJuice(buildingId: string, amount: number, cfg: any): void {
    const store = useGameState.getState();
    const building = store.buildings.find((b) => b.id === buildingId);
    if (!building) return;

    const pos = this.getTilePosition(building.slotIndex);
    if (!pos) return;

    // Resource bubble position
    const dTop = pos.dWaist - (pos.dBot - pos.dWaist);

    // Determine which resource this building produces
    const resourceKey = Object.keys(cfg.production)[0];
    let emoji = "📦";
    if (resourceKey === "wood") emoji = "🪵";
    if (resourceKey === "clay") emoji = "🧱";
    if (resourceKey === "iron") emoji = "⛏️";
    if (resourceKey === "crop") emoji = "🌾";

    const textStr = `+${Math.floor(amount)} ${emoji}`;

    // Create text object
    const juice = this.scene.add
      .text(pos.cx, dTop - 40, textStr, {
        fontSize: "120px",
        fontFamily: "Lilita One, Arial",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 12,
        shadow: {
          offsetX: 0,
          offsetY: 4,
          color: "#000000",
          blur: 4,
          stroke: true,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(2000);

    // Float UP and fade OUT animation
    this.scene.tweens.add({
      targets: juice,
      y: dTop - 120,
      alpha: 0,
      duration: 1200,
      ease: "Cubic.easeOut",
      onComplete: () => juice.destroy(),
    });

    // Small "pop" effect on the building itself? Or the bubble?
    // Let's do a quick camera shake or building scale pulse
    this.scene.tweens.add({
      targets: juice,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 100,
      yoyo: true,
      ease: "Quad.easeOut",
    });
  }

  /**
   * Destroy the collector overlay system
   */
  destroy(): void {
    this.clear();
  }
}
