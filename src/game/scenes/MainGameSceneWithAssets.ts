import Phaser from 'phaser';
import { TILE_CONFIG, CAMERA_CONFIG } from '../config/gameConfig';
import { Position, Building, BuildingType } from '../../types/kingdom';

export class MainGameScene extends Phaser.Scene {
  private tileMap: Phaser.GameObjects.Group;
  private buildings: Map<string, Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics>;
  private decorations: Phaser.GameObjects.Group;
  private selectedTile: Position | null = null;
  private highlightTile: Phaser.GameObjects.Graphics | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  private tileGrid: Phaser.GameObjects.Sprite[][] = [];

  constructor() {
    super({ key: 'MainGameScene' });
    this.tileMap = null as any;
    this.buildings = new Map();
    this.decorations = null as any;
  }

  create() {
    console.log('MainGameScene starting with real assets...');
    
    // Set background color to a nice sky blue
    this.cameras.main.setBackgroundColor('#87CEEB');
    
    // Set world bounds centered around (0, 0)
    const worldSize = 2000; // Large enough for 30x30 map
    this.cameras.main.setBounds(
      -worldSize / 2,
      -worldSize / 2,
      worldSize,
      worldSize
    );

    // Create groups
    this.tileMap = this.add.group();
    this.decorations = this.add.group();
    
    // Create highlight graphics
    this.highlightTile = this.add.graphics();
    
    // Generate the isometric map with real tiles
    this.generateTileMap();
    
    // Add some decorations
    this.addDecorations();
    
    // Set up camera
    this.setupCamera();
    
    // Set up input handlers
    this.setupInputHandlers();
    
    // Listen for game events
    this.setupGameEvents();
  }

  private generateTileMap() {
    // Map size (reduced for performance)
    const mapWidth = 30;
    const mapHeight = 30;
    
    // Center the map around world origin (0, 0)
    const centerX = 0;
    const centerY = 0;

    // Initialize tile grid
    for (let y = 0; y < mapHeight; y++) {
      this.tileGrid[y] = [];
    }

    // Generate terrain with biomes
    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const isoPos = this.cartesianToIsometric(x, y);
        
        // Determine biome based on position
        let tileTexture = 'tilemap-flat';
        let tileFrame = 0;
        
        // Create biome zones
        const distFromCenter = Math.sqrt(Math.pow(x - mapWidth/2, 2) + Math.pow(y - mapHeight/2, 2));
        
        if (distFromCenter < 5) {
          // Center area - grass
          tileTexture = 'grass-tiles';
          tileFrame = Math.floor(Math.random() * 4); // Random grass variation
        } else if (x < 10 && y < 10) {
          // Top-left corner - ice biome
          tileTexture = 'ice-tiles';
          tileFrame = Math.floor(Math.random() * 4);
        } else if (x > 20 && y > 20) {
          // Bottom-right corner - sand/desert biome
          tileTexture = 'sand-tiles';
          tileFrame = Math.floor(Math.random() * 4);
        } else {
          // Default grass areas
          tileTexture = 'grass-tiles';
          tileFrame = Math.floor(Math.random() * 4);
        }
        
        // Add some water tiles randomly
        if (Math.random() < 0.05) {
          tileTexture = 'water';
          tileFrame = 0;
        }
        
        // Create tile sprite
        const tile = this.add.sprite(
          centerX + isoPos.x,
          centerY + isoPos.y,
          tileTexture,
          tileFrame
        );
        
        // Set tile properties
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(y * 10); // Base depth for tiles
        tile.setData('gridX', x);
        tile.setData('gridY', y);
        tile.setData('tileType', tileTexture);
        
        // Scale tiles to fit isometric view
        tile.setScale(1.2, 0.7); // Adjust for isometric perspective
        
        // Make tile interactive
        tile.setInteractive();
        
        // Add hover effect
        tile.on('pointerover', () => {
          tile.setTint(0xcccccc);
          this.highlightTileAt(x, y);
        });
        
        tile.on('pointerout', () => {
          tile.clearTint();
          if (this.highlightTile) {
            this.highlightTile.clear();
          }
        });
        
        tile.on('pointerdown', () => {
          this.selectTile(x, y);
        });
        
        this.tileMap.add(tile);
        this.tileGrid[y][x] = tile;
        
        // Animate water tiles
        if (tileTexture === 'water') {
          this.tweens.add({
            targets: tile,
            alpha: { from: 0.8, to: 1 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
          });
        }
      }
    }
  }

  private addDecorations() {
    // Use world origin (0, 0) to match tile positioning
    const centerX = 0;
    const centerY = 0;
    
    // Add random trees and rocks
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * 30);
      const y = Math.floor(Math.random() * 30);
      
      // Check if tile is not water
      if (this.tileGrid[y] && this.tileGrid[y][x]) {
        const tile = this.tileGrid[y][x];
        if (tile.getData('tileType') !== 'water') {
          const isoPos = this.cartesianToIsometric(x, y);
          
          // Choose random decoration
          const decoTypes = ['tree1', 'tree2', 'tree3', 'rock1', 'rock2'];
          const decoType = decoTypes[Math.floor(Math.random() * decoTypes.length)];
          
          const deco = this.add.sprite(
            centerX + isoPos.x,
            centerY + isoPos.y - 20, // Offset to sit on tile
            decoType
          );
          
          deco.setOrigin(0.5, 0.8);
          deco.setDepth(y * 10 + 5); // Above tile but below buildings
          deco.setScale(0.8);
          
          // Add shadow
          const shadow = this.add.ellipse(
            centerX + isoPos.x,
            centerY + isoPos.y,
            30, 15,
            0x000000, 0.3
          );
          shadow.setDepth(y * 10 + 1);
          
          this.decorations.add(deco);
          this.decorations.add(shadow);
        }
      }
    }
  }

  private highlightTileAt(x: number, y: number) {
    if (!this.highlightTile) return;
    
    const isoPos = this.cartesianToIsometric(x, y);
    const centerX = 0;
    const centerY = 0;
    
    // Clear previous highlight
    this.highlightTile.clear();
    
    // Draw highlight
    this.highlightTile.lineStyle(2, 0x00ff00, 0.8);
    this.highlightTile.strokePoints([
      { x: centerX + isoPos.x, y: centerY + isoPos.y - TILE_CONFIG.tileHeight / 2 },
      { x: centerX + isoPos.x + TILE_CONFIG.tileWidth / 2, y: centerY + isoPos.y },
      { x: centerX + isoPos.x, y: centerY + isoPos.y + TILE_CONFIG.tileHeight / 2 },
      { x: centerX + isoPos.x - TILE_CONFIG.tileWidth / 2, y: centerY + isoPos.y }
    ], true);
    
    this.highlightTile.setDepth(100000);
  }

  private cartesianToIsometric(x: number, y: number): Position {
    const isoX = (x - y) * (TILE_CONFIG.tileWidth / 2);
    const isoY = (x + y) * (TILE_CONFIG.tileHeight / 2);
    return { x: isoX, y: isoY };
  }

  private isometricToCartesian(isoX: number, isoY: number): Position {
    const x = (isoX / (TILE_CONFIG.tileWidth / 2) + isoY / (TILE_CONFIG.tileHeight / 2)) / 2;
    const y = (isoY / (TILE_CONFIG.tileHeight / 2) - isoX / (TILE_CONFIG.tileWidth / 2)) / 2;
    return { x: Math.floor(x), y: Math.floor(y) };
  }

  private setupCamera() {
    const camera = this.cameras.main;
    
    // Set initial zoom
    camera.setZoom(1);
    
    // Center camera on the origin (0, 0) where the map is centered
    camera.centerOn(0, 0);
    
    // Disable lerp initially to snap to position
    camera.setLerp(1, 1);
    
    // Re-enable smooth movement after a short delay
    this.time.delayedCall(100, () => {
      camera.setLerp(0.1, 0.1);
    });
  }

  private setupInputHandlers() {
    // Mouse wheel zoom
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, gameObjects: any[], deltaX: number, deltaY: number) => {
      const camera = this.cameras.main;
      const newZoom = Phaser.Math.Clamp(
        camera.zoom - (deltaY * CAMERA_CONFIG.zoomStep / 1000),
        CAMERA_CONFIG.minZoom,
        CAMERA_CONFIG.maxZoom
      );
      camera.setZoom(newZoom);
    });

    // Drag to pan
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isDragging = true;
        this.dragStartX = pointer.x;
        this.dragStartY = pointer.y;
        this.cameraStartX = this.cameras.main.scrollX;
        this.cameraStartY = this.cameras.main.scrollY;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const deltaX = this.dragStartX - pointer.x;
        const deltaY = this.dragStartY - pointer.y;
        this.cameras.main.setScroll(
          this.cameraStartX + deltaX,
          this.cameraStartY + deltaY
        );
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // Keyboard controls
    const cursors = this.input.keyboard?.createCursorKeys();
    if (cursors) {
      this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
        const camera = this.cameras.main;
        const panAmount = CAMERA_CONFIG.panSpeed / camera.zoom;
        
        switch(event.key) {
          case 'ArrowUp':
          case 'w':
            camera.scrollY -= panAmount;
            break;
          case 'ArrowDown':
          case 's':
            camera.scrollY += panAmount;
            break;
          case 'ArrowLeft':
          case 'a':
            camera.scrollX -= panAmount;
            break;
          case 'ArrowRight':
          case 'd':
            camera.scrollX += panAmount;
            break;
        }
      });
    }
  }

  private selectTile(x: number, y: number) {
    this.selectedTile = { x, y };
    
    // Emit event for UI to handle
    this.events.emit('tileSelected', { x, y });
    
    // Visual feedback
    const isoPos = this.cartesianToIsometric(x, y);
    const centerX = 0;
    const centerY = 0;
    
    // Create selection indicator
    const selection = this.add.graphics();
    selection.lineStyle(3, 0xffff00, 1);
    selection.strokePoints([
      { x: centerX + isoPos.x, y: centerY + isoPos.y - TILE_CONFIG.tileHeight / 2 },
      { x: centerX + isoPos.x + TILE_CONFIG.tileWidth / 2, y: centerY + isoPos.y },
      { x: centerX + isoPos.x, y: centerY + isoPos.y + TILE_CONFIG.tileHeight / 2 },
      { x: centerX + isoPos.x - TILE_CONFIG.tileWidth / 2, y: centerY + isoPos.y }
    ], true);
    selection.setDepth(99999);
    
    // Fade out selection
    this.tweens.add({
      targets: selection,
      alpha: 0,
      duration: 1000,
      onComplete: () => selection.destroy()
    });
  }

  private setupGameEvents() {
    // Listen for building placement events
    this.events.on('placeBuilding', (data: { type: BuildingType, position: Position }) => {
      this.placeBuilding(data.type, data.position);
    });
    
    // Listen for building removal events
    this.events.on('removeBuilding', (position: Position) => {
      this.removeBuilding(position);
    });
  }

  public placeBuilding(type: BuildingType, position: Position) {
    const key = `${position.x},${position.y}`;
    
    // Remove existing building if any
    if (this.buildings.has(key)) {
      this.removeBuilding(position);
    }
    
    // Get isometric position
    const isoPos = this.cartesianToIsometric(position.x, position.y);
    const centerX = 0;
    const centerY = 0;
    
    let building: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics;
    
    // Try to use actual building sprites if available
    if (this.textures.exists('house') && type === BuildingType.TOWN_HALL) {
      building = this.add.sprite(
        centerX + isoPos.x,
        centerY + isoPos.y - 16,
        'house'
      );
      building.setOrigin(0.5, 0.8);
      building.setScale(0.5);
    } else {
      // Fallback to simple graphics
      building = this.add.graphics();
      
      // Choose color based on building type
      let color = 0x8B4513; // Brown default
      switch(type) {
        case BuildingType.TOWN_HALL:
          color = 0xFFD700; // Gold
          break;
        case BuildingType.FARM:
          color = 0x90EE90; // Light green
          break;
        case BuildingType.MINE:
          color = 0x696969; // Dark gray
          break;
        case BuildingType.BARRACKS:
          color = 0xFF6347; // Red
          break;
        case BuildingType.MARKET:
          color = 0x4169E1; // Blue
          break;
      }
      
      // Draw simple building shape
      (building as Phaser.GameObjects.Graphics).fillStyle(color, 1);
      (building as Phaser.GameObjects.Graphics).lineStyle(2, 0x000000, 0.5);
      
      const bx = centerX + isoPos.x;
      const by = centerY + isoPos.y - 20;
      
      (building as Phaser.GameObjects.Graphics).fillRect(bx - 20, by - 20, 40, 30);
      (building as Phaser.GameObjects.Graphics).fillTriangle(bx - 25, by - 20, bx + 25, by - 20, bx, by - 40);
    }
    
    building.setDepth(position.y * 10 + 8); // Above decorations
    
    // Store building
    this.buildings.set(key, building);
    
    // Add construction animation
    building.setAlpha(0);
    building.setScale(0.5);
    this.tweens.add({
      targets: building,
      alpha: 1,
      scale: building instanceof Phaser.GameObjects.Sprite ? 0.5 : 1,
      duration: 500,
      ease: 'Back.easeOut'
    });
    
    // Add a simple construction effect
    const constructionEffect = this.add.graphics();
    constructionEffect.lineStyle(2, 0xFFD700, 1);
    constructionEffect.strokeCircle(centerX + isoPos.x, centerY + isoPos.y - 20, 30);
    constructionEffect.setDepth(100000);
    
    this.tweens.add({
      targets: constructionEffect,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 600,
      onComplete: () => {
        constructionEffect.destroy();
      }
    });
  }

  public removeBuilding(position: Position) {
    const key = `${position.x},${position.y}`;
    const building = this.buildings.get(key);
    
    if (building) {
      // Destruction animation
      this.tweens.add({
        targets: building,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        onComplete: () => {
          building.destroy();
          this.buildings.delete(key);
        }
      });
    }
  }

  update(time: number, delta: number) {
    // Edge pan
    const pointer = this.input.activePointer;
    const camera = this.cameras.main;
    const panSpeed = CAMERA_CONFIG.panSpeed * (delta / 16);
    
    if (!this.isDragging) {
      if (pointer.x < CAMERA_CONFIG.edgePanThreshold) {
        camera.scrollX -= panSpeed / camera.zoom;
      } else if (pointer.x > this.scale.width - CAMERA_CONFIG.edgePanThreshold) {
        camera.scrollX += panSpeed / camera.zoom;
      }
      
      if (pointer.y < CAMERA_CONFIG.edgePanThreshold) {
        camera.scrollY -= panSpeed / camera.zoom;
      } else if (pointer.y > this.scale.height - CAMERA_CONFIG.edgePanThreshold) {
        camera.scrollY += panSpeed / camera.zoom;
      }
    }
  }
}
