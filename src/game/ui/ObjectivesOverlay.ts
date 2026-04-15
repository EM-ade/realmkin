import Phaser from "phaser";
import { SCENARIOS } from "@/game/config/scenarios";
import { useGameState } from "@/stores/gameStore";

export interface ObjectivesOverlayConfig {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
}

/**
 * ObjectivesOverlay — Displays scenario objectives with completion status.
 *
 * Responsibilities:
 * - Show current scenario objectives
 * - Display completion checkmarks
 * - Update objective status in real-time
 * - Refresh on scenario change
 *
 * Not responsible for:
 * - Objective tracking logic (handled by gameStore)
 * - Scenario progression
 */
export class ObjectivesOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Panel dimensions
  private readonly PANEL_W = 200;
  private readonly LINE_H = 22;
  private readonly PADDING = 10;

  constructor(config: ObjectivesOverlayConfig) {
    this.scene = config.scene;
    this.container = config.container;
  }

  /**
   * Create or refresh the objectives overlay
   */
  refresh(): void {
    this.container.removeAll(true);

    const store = useGameState.getState();
    const scenario = SCENARIOS.find((s) => s.id === store.currentScenario);
    if (!scenario) return;

    const pw = this.PANEL_W;
    const lineH = this.LINE_H;
    const pad = this.PADDING;
    const ph = lineH * (scenario.objectives.length + 1) + pad * 2;
    const px = this.scene.scale.width - pw - 10;
    const py = 100;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.65);
    bg.fillRoundedRect(px, py, pw, ph, 6);
    bg.lineStyle(1, 0xd4af37, 0.4);
    bg.strokeRoundedRect(px, py, pw, ph, 6);
    this.container.add(bg);

    // Header
    this.container.add(
      this.scene.add
        .text(px + pw / 2, py + pad, "Objectives", {
          fontSize: "12px",
          fontFamily: "Arial",
          color: "#D4AF37",
        })
        .setOrigin(0.5, 0),
    );

    // Objectives list
    scenario.objectives.forEach((obj, i) => {
      const done = store.completedObjectives.includes(obj.id);
      const icon = done ? "✓" : "○";
      const col = done ? "#88ff88" : "#cccccc";

      this.container.add(
        this.scene.add.text(
          px + 8,
          py + pad + lineH * (i + 1),
          `${icon} ${obj.description}`,
          {
            fontSize: "10px",
            fontFamily: "Arial",
            color: col,
            wordWrap: { width: pw - 16 },
          },
        ),
      );
    });

    this.container.setPosition(px, py);
  }

  /**
   * Destroy the overlay
   */
  destroy(): void {
    this.container.removeAll(true);
    this.container.destroy();
  }
}
