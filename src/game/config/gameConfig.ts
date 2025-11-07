import Phaser from 'phaser';
import { PreloadScene } from '../scenes/PreloadSceneWithAssets';
import { MainGameScene } from '../scenes/MainGameSceneWithAssets';
import { UIScene } from '../scenes/UIScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#2d2d2d',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false, // Set to false for smoother graphics
    transparent: false, // Prevent transparency issues
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [PreloadScene, MainGameScene, UIScene]
};

// Tile configuration for isometric view
export const TILE_CONFIG = {
  tileWidth: 64,
  tileHeight: 32,
  mapWidth: 100,
  mapHeight: 100,
  // Offset to center tiles properly
  offsetX: 0,
  offsetY: 16
};

// Camera configuration
export const CAMERA_CONFIG = {
  minZoom: 0.5,
  maxZoom: 2,
  zoomStep: 0.1,
  panSpeed: 10,
  edgePanThreshold: 50
};
