import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { MainMenuScene } from "./scenes/MainMenuScene";
import { VillageScene } from "./scenes/VillageScene";
import { BattleScene } from "./scenes/BattleScene";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#1a1a2e",
  pixelArt: true, // disables bilinear smoothing globally for all textures
  antialias: false, // prevents WebGL from blending sub-pixel tile boundary rows
  roundPixels: true, // snaps every sprite to a whole pixel — the core seam fix
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Render at native device pixel ratio for crisp HiDPI/retina display
    zoom:
      1 / (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1),
  },
  input: {
    activePointers: 3,
  },
  scene: [BootScene, MainMenuScene, VillageScene, BattleScene],
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
};

export class Game {
  private game: Phaser.Game;

  constructor() {
    this.game = new Phaser.Game(config);
  }

  public destroy(removeFromDOM?: boolean): void {
    this.game.destroy(removeFromDOM ?? false);
  }
}
