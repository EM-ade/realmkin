import Phaser from 'phaser';
import { TILE_CONFIG, CAMERA_CONFIG } from '../config/gameConfig';
import { Position, Building, BuildingType } from '../../types/kingdom';

export class MainGameScene extends Phaser.Scene {
  private tileMap: Phaser.GameObjects.Group;
  private buildings: Map<string, Phaser.GameObjects.Graphics>;
  private selectedTile: Position | null = null;
  private highlightTile: Phaser.GameObjects.Graphics | null = null;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;

  constructor() {
    super({ key: 'MainGameScene' });
    this.tileMap = null as any;
    this.buildings = new Map();
  }

  create() {
    console.log('MainGameScene starting...');
    
    // Set world bounds
    this.cameras.main.setBounds(
      -TILE_CONFIG.mapWidth * TILE_CONFIG.tileWidth / 2,
      -TILE_CONFIG.mapHeight * TILE_CONFIG.tileHeight / 2,
      TILE_CONFIG.mapWidth * TILE_CONFIG.tileWidth,
      TILE_CONFIG.mapHeight * TILE_CONFIG.tileHeight
    );

    // Create tile map group
    this.tileMap = this.add.group();
    
    // Create highlight graphics
    this.highlightTile = this.add.graphics();
    
    // Generate the isometric map with simple graphics
    this.generateSimpleMap();
    
    // Set up camera
    this.setupCamera();
    
    // Set up input handlers
    this.setupInputHandlers();
    
    // Listen for game events
    this.setupGameEvents();
  }

  private generateSimpleMap() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    // Create a simple grid of diamond tiles
    for (let y = 0; y < 20; y++) { // Reduced size for performance
      for (let x = 0; x < 20; x++) {
        const isoPos = this.cartesianToIsometric(x, y);
        
        // Create a simple diamond shape for each tile
        const tile = this.add.graphics();
        
        // Determine tile color based on position
        let color = 0x4a9d4a; // Default green grass
        if (Math.random() > 0.9) {
          color = 0x5aad5a; // Lighter grass
        } else if (Math.random() > 0.95) {
          color = 0x808080; // Stone
        }
        
        // Draw isometric diamond
        tile.fillStyle(color, 1);
        tile.lineStyle(1, 0x2a5d2a, 0.5);
        
        const tileX = centerX + isoPos.x;
        const tileY = centerY + isoPos.y;
        
        tile.fillPoints([
          { x: tileX, y: tileY - TILE_CONFIG.tileHeight / 2 },
          { x: tileX + TILE_CONFIG.tileWidth / 2, y: tileY },
          { x: tileX, y: tileY + TILE_CONFIG.tileHeight / 2 },
          { x: tileX - TILE_CONFIG.tileWidth / 2, y: tileY }
        ], true);
        
        tile.strokePoints([
          { x: tileX, y: tileY - TILE_CONFIG.tileHeight / 2 },
          { x: tileX + TILE_CONFIG.tileWidth / 2, y: tileY },
          { x: tileX, y: tileY + TILE_CONFIG.tileHeight / 2 },
          { x: tileX - TILE_CONFIG.tileWidth / 2, y: tileY }
        ], true);
        
        tile.setDepth(y);
        tile.setData('gridX', x);
        tile.setData('gridY', y);
        
        // Make tile interactive
        const hitArea = new Phaser.Geom.Polygon([
          { x: 0, y: -TILE_CONFIG.tileHeight / 2 },
          { x: TILE_CONFIG.tileWidth / 2, y: 0 },
          { x: 0, y: TILE_CONFIG.tileHeight / 2 },
          { x: -TILE_CONFIG.tileWidth / 2, y: 0 }
        ]);
        
        tile.setInteractive(hitArea, Phaser.Geom.Polygon.Contains);
        
        // Add click handler
        tile.on('pointerdown', () => {
          this.selectTile(x, y);
        });
        
        this.tileMap.add(tile);
      }
    }
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
    
    // Center camera on map
    camera.centerOn(this.cameras.main.centerX, this.cameras.main.centerY);
    
    // Enable smooth camera movement
    camera.setLerp(0.1, 0.1);
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
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    // Create selection indicator
    const selection = this.add.graphics();
    selection.lineStyle(3, 0xffff00, 1);
    selection.strokePoints([
      { x: centerX + isoPos.x, y: centerY + isoPos.y - TILE_CONFIG.tileHeight / 2 },
      { x: centerX + isoPos.x + TILE_CONFIG.tileWidth / 2, y: centerY + isoPos.y },
      { x: centerX + isoPos.x, y: centerY + isoPos.y + TILE_CONFIG.tileHeight / 2 },
      { x: centerX + isoPos.x - TILE_CONFIG.tileWidth / 2, y: centerY + isoPos.y }
    ], true);
    selection.setDepth(9999);
    
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
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    
    // Create building with simple graphics
    const building = this.add.graphics();
    
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
    building.fillStyle(color, 1);
    building.lineStyle(2, 0x000000, 0.5);
    
    const bx = centerX + isoPos.x;
    const by = centerY + isoPos.y - 20; // Offset to sit on tile
    
    // Draw a simple house shape
    building.fillRect(bx - 20, by - 20, 40, 30);
    building.fillTriangle(bx - 25, by - 20, bx + 25, by - 20, bx, by - 40);
    
    building.setDepth(position.y + 1); // Above tile
    
    // Store building
    this.buildings.set(key, building);
    
    // Add construction animation
    building.setAlpha(0);
    building.setScale(0.5);
    this.tweens.add({
      targets: building,
      alpha: 1,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
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
        scale: 0.5,
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
