import Phaser from 'phaser';
import { TILE_CONFIG, CAMERA_CONFIG } from '../config/gameConfig';
import { Position, Building, BuildingType } from '../../types/kingdom';

export class MainGameScene extends Phaser.Scene {
  private tileMap: Phaser.GameObjects.Group;
  private buildings: Map<string, Phaser.GameObjects.Sprite>;
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
    
    // Generate the isometric map
    this.generateMap();
    
    // Set up camera
    this.setupCamera();
    
    // Set up input handlers
    this.setupInputHandlers();
    
    // Listen for game events
    this.setupGameEvents();
  }

  private generateMap() {
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;

    for (let y = 0; y < TILE_CONFIG.mapHeight; y++) {
      for (let x = 0; x < TILE_CONFIG.mapWidth; x++) {
        const isoPos = this.cartesianToIsometric(x, y);
        
        // Determine tile type based on position (you can make this more complex)
        let tileFrame = 0; // Default grass
        
        // Add some variety
        if (Math.random() > 0.9) {
          tileFrame = 1; // Different grass type
        } else if (Math.random() > 0.95) {
          tileFrame = 2; // Stone
        }
        
        // Create tile sprite with proper rendering to avoid black edges
        const tile = this.add.sprite(
          centerX + isoPos.x,
          centerY + isoPos.y,
          'terrain-tiles',
          tileFrame
        );
        
        // Set tile properties
        tile.setOrigin(0.5, 0.5);
        tile.setDepth(y); // Depth sorting for isometric view
        tile.setData('gridX', x);
        tile.setData('gridY', y);
        
        // Enable transparency properly
        tile.setBlendMode(Phaser.BlendModes.NORMAL);
        
        // Make tile interactive
        tile.setInteractive();
        
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
      } else {
        // Highlight tile under cursor
        this.highlightTileAtPointer(pointer);
      }
    });

    this.input.on('pointerup', () => {
      this.isDragging = false;
    });

    // Tile click
    this.input.on('gameobjectdown', (pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.Sprite) => {
      if (!pointer.rightButtonDown() && !this.isDragging) {
        const gridX = gameObject.getData('gridX');
        const gridY = gameObject.getData('gridY');
        
        if (gridX !== undefined && gridY !== undefined) {
          this.selectTile(gridX, gridY);
        }
      }
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

  private highlightTileAtPointer(pointer: Phaser.Input.Pointer) {
    if (!this.highlightTile) return;
    
    // Convert pointer position to world coordinates
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
    // Convert to grid coordinates
    const centerX = this.cameras.main.centerX;
    const centerY = this.cameras.main.centerY;
    const gridPos = this.isometricToCartesian(
      worldPoint.x - centerX,
      worldPoint.y - centerY
    );
    
    // Check if within bounds
    if (gridPos.x >= 0 && gridPos.x < TILE_CONFIG.mapWidth &&
        gridPos.y >= 0 && gridPos.y < TILE_CONFIG.mapHeight) {
      
      // Convert back to isometric for drawing
      const isoPos = this.cartesianToIsometric(gridPos.x, gridPos.y);
      
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
      
      this.highlightTile.setDepth(10000);
    } else {
      this.highlightTile.clear();
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
    
    // Create building sprite (using house as placeholder for all buildings for now)
    const building = this.add.sprite(
      centerX + isoPos.x,
      centerY + isoPos.y - 16, // Offset to sit on tile
      'house'
    );
    
    building.setOrigin(0.5, 0.8);
    building.setDepth(position.y + 1); // Above tile
    building.setScale(0.5); // Adjust scale as needed
    
    // Store building
    this.buildings.set(key, building);
    
    // Add construction animation
    building.setAlpha(0);
    this.tweens.add({
      targets: building,
      alpha: 1,
      scale: { from: 0.3, to: 0.5 },
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
