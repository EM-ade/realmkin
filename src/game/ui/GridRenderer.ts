import Phaser from "phaser";

// ── Grid constants (Clash of Clans-style) ──────────────────────────────────────
// ALL inner grass = buildable. The background image handles the forest/water border.
export const GRID_PADDING = 0;
export const PLAYABLE_GRID_SIZE = 17; // 17×17 — fits fully within the grass island
export const GRID_SIZE = 17;

export const DEFENSE_MIN = 0; // outermost ring (wall/tower tiles)
export const DEFENSE_MAX = 16; // 0..16 inclusive = 17 tiles wide

export const BUILD_MIN = 2; // 2-tile buffer inside walls
export const BUILD_MAX = 14; // 0/1 = wall, 2-14 = buildable, 15/16 = wall
export const BUILD_CENTER = (BUILD_MIN + BUILD_MAX) / 2; // 8 - center of buildable grid

export const TOWN_HALL_COL = 6; // visual center of 17-wide grid per user preference
export const TOWN_HALL_ROW = 6; // visual center of 17-high grid per user preference

// slotIndex encoding: row*50+col  (supports up to 50-wide grids — our 33×33 grid is safe)
export const encodeSlot = (col: number, row: number) => row * 50 + col;
export const decodeSlot = (slot: number) => ({
  col: slot % 50,
  row: Math.floor(slot / 50),
});

// ── Grid Math Basics ─────────────────────────────────────────────────────────────
// Source tile geometry (isometric diamond from raw assets)
// Creates a 1.76 ratio which visually overlaps rows, hiding seams and bottom edges.
export const SRC_W = 1024;
export const SRC_TOP_Y = 157;
export const SRC_WAIST_Y = 430;
export const SRC_HALF_W = 481;
export const SRC_BOT_Y = 2 * SRC_WAIST_Y - SRC_TOP_Y; // 703
export const SRC_STEP_Y = SRC_WAIST_Y - SRC_TOP_Y; // 273

export type TerrainType = "water" | "grass" | "forest" | "cobblestone" | "dirt";

export interface TilePosition {
  cx: number; // center X of tile
  cy: number; // center Y of tile
  tileSize: number; // pixel size of one tile
  depth: number; // render depth
  imgX: number; // top-left X for tile-style rendering
  imgY: number; // top-left Y for tile-style rendering
  dTop: number; // top vertex Y
  dWaist: number; // left/right vertex Y (widest)
  dBot: number; // bottom vertex Y
  halfW: number; // half-width of tile
  tileW: number; // full width of tile
}

export interface GridConfig {
  scene: Phaser.Scene;
  centerX: number;
  centerY: number;
  gridSize?: number;
  zoom?: number;
  onTileClick?: (col: number, row: number) => void;
}

export interface HoveredTile {
  col: number;
  row: number;
  slot: number;
}

/**
 * GridRenderer — Handles all isometric grid rendering logic.
 *
 * Responsibilities:
 * - Grid scaling and positioning calculations
 * - Tile positioning math (isometric diamond layout)
 * - Terrain type determination based on grid zones
 * - Tile rendering (grass, water, forest, cobblestone)
 * - Depth sorting for correct visual ordering
 * - Diamond border rendering (Town Hall highlight, selectable tiles)
 * - Hover effect rendering
 * - Slot position tracking and lookup
 *
 * Not responsible for:
 * - Building rendering (handled by BuildingRenderer)
 * - Input handling (handled by VillageScene)
 * - Game state (handled by gameStore)
 */
export class GridRenderer {
  private scene: Phaser.Scene;
  private centerX: number;
  private centerY: number;
  private gridSize: number;
  private onTileClick?: (col: number, row: number) => void;

  // Calculated dimensions
  private tileW: number = 0;
  private halfW: number = 0;
  private stepX: number = 0;
  private stepY: number = 0;
  private dTopY: number = 0;
  private dWaistY: number = 0;
  private dBotY: number = 0;
  private tileOriginX: number = 0;
  private tileOriginY: number = 0;

  // Terrain Map Matrix
  private terrainMap: TerrainType[][] = [];

  // Tile data storage
  private tilePositions: Map<number, TilePosition> = new Map();
  private tileSprites: Map<number, Phaser.GameObjects.Image> = new Map();
  private hitZones: Map<number, Phaser.GameObjects.Zone> = new Map();
  private hoverSprite?: Phaser.GameObjects.Graphics;
  private baseGrid?: Phaser.GameObjects.Graphics;
  private occupiedGrid?: Phaser.GameObjects.Graphics;

  // Town Hall glow animation
  private townHallGlow?: Phaser.GameObjects.Graphics;

  constructor(config: GridConfig) {
    this.scene = config.scene;
    this.centerX = config.centerX;
    this.centerY = config.centerY;
    this.gridSize = config.gridSize ?? GRID_SIZE;
    this.onTileClick = config.onTileClick;
  }

  /**
   * Create the entire isometric grid
   * Called once during VillageScene.create()
   */
  createGrid(): void {
    this.generateTerrainMap();
    this.calculateDimensions();
    this.setupCameraBounds();
    this.renderAllTiles();
    this.createHoverEffect();
    this.createBaseGrid();
    this.createOccupiedGrid();
    // Decorations disabled — static background provides terrain art
    // this.renderDecorations();
  }

  /**
   * Generates a 2D matrix where the inner bounds are Buildable (Grass)
   * and the outer perimeter is Non-Buildable (Forest/Water borders).
   */
  private generateTerrainMap(): void {
    const size = this.gridSize;

    for (let row = 0; row < size; row++) {
      this.terrainMap[row] = [];
      for (let col = 0; col < size; col++) {
        // Inner village and defense ring + 1 outer collar is grass.
        if (
          row >= DEFENSE_MIN - 1 &&
          row <= DEFENSE_MAX + 1 &&
          col >= DEFENSE_MIN - 1 &&
          col <= DEFENSE_MAX + 1
        ) {
          this.terrainMap[row][col] = "grass";
        }
        // Then an outer ring of forest
        else if (
          row >= DEFENSE_MIN - 4 &&
          row <= DEFENSE_MAX + 4 &&
          col >= DEFENSE_MIN - 4 &&
          col <= DEFENSE_MAX + 4
        ) {
          this.terrainMap[row][col] = "forest";
        }
        // Everything else beyond that is water
        else {
          this.terrainMap[row][col] = "water";
        }
      }
    }
  }

  /**
   * Calculate all grid dimensions and scaling
   */
  private calculateDimensions(): void {
    // ── 240px tiles ──────────────────────────────────────────────────────────
    this.tileW = 240;
    this.halfW = 120;
    this.stepX = 120;
    this.stepY = 60;
    this.dTopY = 0; // top tip of isometric diamond
    this.dWaistY = 60; // vertical center / anchor point
    this.dBotY = 120; // bottom tip

    // ── Grid origin: center of buildable tiles ─────────────────────────────────
    const BUILD_CENTER_COL = (BUILD_MIN + BUILD_MAX) / 2;
    const BUILD_CENTER_ROW = (BUILD_MIN + BUILD_MAX) / 2;
    const GRID_OFFSET_X = 0;
    const GRID_OFFSET_Y = 0;

    this.tileOriginX = this.centerX - this.stepX + GRID_OFFSET_X;
    this.tileOriginY =
      this.centerY -
      (BUILD_CENTER_COL + BUILD_CENTER_ROW) * this.stepY -
      this.dWaistY -
      this.stepY +
      GRID_OFFSET_Y;
  }

  /**
   * Setup camera bounds for pan/zoom
   */
  private setupCameraBounds(): void {
    const { stepY, dTopY, dBotY } = this;

    // Bounds strict to the playable grid, entirely rejecting the overscan voids
    const innerGridH = (PLAYABLE_GRID_SIZE - 1) * 2 * stepY + dTopY + dBotY;

    const boundsPadX = innerGridH * 0.4;
    const boundsPadY = innerGridH * 0.4;

    this.scene.cameras.main.setBounds(
      this.centerX - innerGridH - boundsPadX,
      this.centerY - innerGridH / 2 - boundsPadY,
      innerGridH * 2 + boundsPadX * 2,
      innerGridH + boundsPadY * 2,
    );
  }

  /**
   * Render all tiles in the grid
   */
  private renderAllTiles(): void {
    const { gridSize } = this;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        this.renderTile(col, row);
      }
    }
  }

  /**
   * Determine terrain type based on grid zone matrix
   */
  getTerrainType(col: number, row: number): TerrainType {
    if (row < 0 || row >= this.gridSize || col < 0 || col >= this.gridSize) {
      return "water"; // Fallback for out of bounds
    }
    return this.terrainMap[row][col];
  }

  /**
   * Check if a tile is on the defense ring perimeter
   */
  isDefenseRing(col: number, row: number): boolean {
    return (
      col >= DEFENSE_MIN &&
      col <= DEFENSE_MAX &&
      row >= DEFENSE_MIN &&
      row <= DEFENSE_MAX &&
      (col === DEFENSE_MIN ||
        col === DEFENSE_MAX ||
        row === DEFENSE_MIN ||
        row === DEFENSE_MAX)
    );
  }

  /**
   * Check if a tile is in the inner buildable village area
   */
  isVillageTile(col: number, row: number): boolean {
    return (
      col >= BUILD_MIN &&
      col <= BUILD_MAX &&
      row >= BUILD_MIN &&
      row <= BUILD_MAX
    );
  }

  /**
   * Check if this is the Town Hall center tile
   */
  isTownHallTile(col: number, row: number): boolean {
    return col === TOWN_HALL_COL && row === TOWN_HALL_ROW;
  }

  /**
   * Calculate tile position from grid coordinates
   */
  getTilePosition(col: number, row: number): TilePosition {
    const {
      tileOriginX,
      tileOriginY,
      stepX,
      stepY,
      halfW,
      tileW,
      dTopY,
      dWaistY,
      dBotY,
    } = this;

    // Math.round every coordinate so adjacent tiles always land on the same pixel row.
    // This is the primary fix for the 1-pixel staircase seam between same-type tiles.
    const imgX = Math.round(tileOriginX + (col - row) * stepX - halfW);
    const imgY = Math.round(tileOriginY + (col + row) * stepY);

    const cx = Math.round(imgX + tileW / 2);
    const dTop = Math.round(imgY + dTopY);
    const dWaist = Math.round(imgY + dWaistY);
    const dBot = Math.round(imgY + dBotY);

    return {
      cx,
      cy: dWaist,
      tileSize: tileW,
      // col * 0.01 breaks ties within the same (col+row) diagonal band,
      // preventing WebGL z-fighting between co-planar sprites.
      depth: (row + col) * 10 + col * 0.01,
      imgX,
      imgY,
      dTop,
      dWaist,
      dBot,
      halfW,
      tileW,
    };
  }

  /**
   * Render a single tile at the given grid position
   */
  renderTile(col: number, row: number): Phaser.GameObjects.Image | null {
    const pos = this.getTilePosition(col, row);
    const slot = encodeSlot(col, row);
    this.tilePositions.set(slot, pos);

    // ── STATIC BG MODE: tile sprites disabled — background image handles visuals ──
    this.createHitZone(col, row, pos); // keep click detection alive
    return null;
  }

  /**
   * Create interactive hit zone for a tile
   */
  private createHitZone(col: number, row: number, pos: TilePosition): void {
    const slot = encodeSlot(col, row);
    const { cx, dTop, dWaist, dBot, halfW, depth } = pos;

    // Create hit zone with diamond polygon
    const zx = cx - halfW;
    const zy = dTop;
    const hitZone = this.scene.add
      .zone(zx, zy, halfW * 2, dBot - dTop)
      .setOrigin(0, 0);
    hitZone.setDepth(depth + 7);
    hitZone.setInteractive(
      new Phaser.Geom.Polygon([
        { x: cx - zx, y: dTop - zy },
        { x: cx + halfW - zx, y: dWaist - zy },
        { x: cx - zx, y: dBot - zy },
        { x: cx - halfW - zx, y: dWaist - zy },
      ]),
      Phaser.Geom.Polygon.Contains,
    );

    // Hover events
    hitZone.on("pointerover", () => {
      // By default show white trace, but VillageScene can override if placing
      this.showHoverEffect(col, row, 0xffffff, 0.15);
    });

    hitZone.on("pointerout", () => {
      this.hideHoverEffect();
    });

    // Click event - call callback if provided
    hitZone.on("pointerdown", () => {
      if (this.onTileClick) {
        this.onTileClick(col, row);
      }
    });

    this.hitZones.set(slot, hitZone);
  }

  /**
   * Render diamond border highlight (for Town Hall or selectable tiles)
   */
  renderDiamondBorder(
    col: number,
    row: number,
    color: number = 0xffd700,
    alpha: number = 1,
  ): void {
    const pos = this.getTilePosition(col, row);
    const depth = pos.depth + 2;

    const diamond = [
      { x: pos.cx, y: pos.dTop },
      { x: pos.cx + pos.halfW, y: pos.dWaist },
      { x: pos.cx, y: pos.dBot },
      { x: pos.cx - pos.halfW, y: pos.dWaist },
    ];

    const border = this.scene.add.graphics().setDepth(depth);
    border.lineStyle(2.5, color, alpha);
    border.strokePoints(diamond, true);

    // Town Hall gets a pulsing glow
    if (this.isTownHallTile(col, row)) {
      const glow = this.scene.add.graphics().setDepth(depth - 1);
      glow.fillStyle(color, 0.06);
      glow.fillPoints(diamond, true);

      this.townHallGlow = glow;
      this.animateTownHallGlow(glow);
    }
  }

  /**
   * Animate Town Hall glow effect
   */
  private animateTownHallGlow(glow: Phaser.GameObjects.Graphics): void {
    this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.3, to: 1 },
      duration: 1300,
      yoyo: true,
      repeat: -1,
    });
  }

  /**
   * Create hover effect sprite (reused for all hover events)
   */
  private createHoverEffect(): void {
    this.hoverSprite = this.scene.add.graphics().setDepth(1000);
    this.hoverSprite.setVisible(false);
  }

  private createBaseGrid(): void {
    this.baseGrid = this.scene.add.graphics().setDepth(5);
    this.baseGrid.setVisible(false);
  }

  private createOccupiedGrid(): void {
    this.occupiedGrid = this.scene.add.graphics().setDepth(6);
    this.occupiedGrid.setVisible(false);
  }

  public showBaseGrid(show: boolean): void {
    if (!this.baseGrid) return;
    this.baseGrid.setVisible(show);

    if (show) {
      this.baseGrid.clear();
      this.baseGrid.lineStyle(1.5, 0xffffff, 0.12);

      const size = BUILD_MAX - BUILD_MIN + 1;
      const startPos = this.getTilePosition(BUILD_MIN, BUILD_MIN);

      // Calculate vertices for the whole buildable area
      const topV = { x: startPos.cx, y: startPos.dTop };
      const rightV = {
        x: startPos.cx + size * this.halfW,
        y: startPos.dTop + size * this.stepY,
      };
      const botV = {
        x: startPos.cx,
        y: startPos.dTop + size * 2 * this.stepY,
      };
      const leftV = {
        x: startPos.cx - size * this.halfW,
        y: startPos.dTop + size * this.stepY,
      };

      const perimeter = [topV, rightV, botV, leftV];
      this.baseGrid.strokePoints(perimeter, true);

      // Draw grid lines
      this.baseGrid.lineStyle(1, 0xffffff, 0.06);
      for (let i = 1; i < size; i++) {
        // Col lines (top-right to bottom-left)
        const c1X = topV.x + i * this.halfW;
        const c1Y = topV.y + i * this.stepY;
        const c2X = leftV.x + i * this.halfW;
        const c2Y = leftV.y + i * this.stepY;
        this.baseGrid.lineBetween(c1X, c1Y, c2X, c2Y);

        // Row lines (top-left to bottom-right)
        const r1X = topV.x - i * this.halfW;
        const r1Y = topV.y + i * this.stepY;
        const r2X = rightV.x - i * this.halfW;
        const r2Y = rightV.y + i * this.stepY;
        this.baseGrid.lineBetween(r1X, r1Y, r2X, r2Y);
      }
    }
  }

  public updateOccupiedGrid(buildings: any[]): void {
    if (!this.occupiedGrid) return;
    this.occupiedGrid.clear();
    this.occupiedGrid.fillStyle(0xff0000, 0.1);

    for (const b of buildings) {
      const slotCoord = decodeSlot(b.slotIndex);
      // Determine footprint - match VillageScene logic
      const cfg = (this.scene as any).getBuildingConfig?.(b.type) || {
        footprint: { w: 1, h: 1 },
      };
      const footprint = b.footprint || cfg.footprint || { w: 1, h: 1 };

      const pos = this.getTilePosition(slotCoord.col, slotCoord.row);
      const diamond = [
        { x: pos.cx, y: pos.dTop },
        {
          x: pos.cx + footprint.w * this.halfW,
          y: pos.dTop + footprint.w * this.stepY,
        },
        {
          x: pos.cx + (footprint.w - footprint.h) * this.halfW,
          y: pos.dTop + (footprint.w + footprint.h) * this.stepY,
        },
        {
          x: pos.cx - footprint.h * this.halfW,
          y: pos.dTop + footprint.h * this.stepY,
        },
      ];
      this.occupiedGrid.fillPoints(diamond, true);
    }
  }

  public showOccupiedGrid(show: boolean): void {
    this.occupiedGrid?.setVisible(show);
  }

  /**
   * Show hover highlight on a tile or a multi-tile footprint
   * @param color default white (0xffffff)
   * @param alpha default 0.15
   */
  showHoverEffect(
    col: number,
    row: number,
    color: number = 0xffffff,
    alpha: number = 0.15,
    footprintW: number = 1,
    footprintH: number = 1,
  ): void {
    if (!this.hoverSprite) return;

    const pos = this.getTilePosition(col, row);

    const diamond = [
      { x: pos.cx, y: pos.dTop }, // Top vertex
      {
        x: pos.cx + footprintW * this.halfW,
        y: pos.dTop + footprintW * this.stepY,
      }, // Right vertex
      {
        x: pos.cx + (footprintW - footprintH) * pos.halfW,
        y: pos.dTop + (footprintW + footprintH) * this.stepY,
      }, // Bottom vertex
      {
        x: pos.cx - footprintH * pos.halfW,
        y: pos.dTop + footprintH * this.stepY,
      }, // Left vertex
    ];

    this.hoverSprite.clear();

    // ── FILL ──
    // Tighten the hover: 1x1 hover is now much more subtle (0.05 alpha)
    const finalAlpha = footprintW > 1 ? alpha : 0.05;
    this.hoverSprite.fillStyle(color, finalAlpha);
    this.hoverSprite.fillPoints(diamond, true);

    // ── BORDER ──
    this.hoverSprite.lineStyle(1.5, color, 0.3);
    this.hoverSprite.strokePoints(diamond, true);

    // ── INTERNAL SUB-TILES (2x2, 3x3, etc) ──
    if (footprintW > 1 || footprintH > 1) {
      this.hoverSprite.lineStyle(1, color, 0.35); // More visible sub-tiles

      // Lines parallel to the right side (row lines)
      for (let r = 1; r < footprintH; r++) {
        const x1 = pos.cx - r * this.halfW;
        const y1 = pos.dTop + r * this.stepY;
        const x2 = x1 + footprintW * this.halfW;
        const y2 = y1 + footprintW * this.stepY;
        this.hoverSprite.lineBetween(x1, y1, x2, y2);
      }

      // Lines parallel to the left side (col lines)
      for (let c = 1; c < footprintW; c++) {
        const x1 = pos.cx + c * this.halfW;
        const y1 = pos.dTop + c * this.stepY;
        const x2 = x1 - footprintH * this.halfW;
        const y2 = y1 + footprintH * this.stepY;
        this.hoverSprite.lineBetween(x1, y1, x2, y2);
      }
    }

    // Explicitly place hover depth exactly one unit above the tile
    this.hoverSprite.setDepth(pos.depth + 1);
    this.hoverSprite.setVisible(true);
  }

  /**
   * Hide hover highlight
   */
  hideHoverEffect(): void {
    this.hoverSprite?.setVisible(false);
  }

  /**
   * Get slot index from screen position (for click/tap detection)
   * Returns null if position is outside the grid
   */
  getSlotFromPosition(x: number, y: number): HoveredTile | null {
    const { tileOriginX, tileOriginY, stepX, stepY, halfW, dBotY, gridSize } =
      this;

    // Convert screen coordinates to grid coordinates
    // This is an approximate hit test — for precise detection, use Phaser zones

    // First, check if within rough bounds
    const minX = tileOriginX - (gridSize - 1) * stepX - halfW;
    const maxX = tileOriginX + (gridSize - 1) * stepX + halfW;
    const minY = tileOriginY;
    const maxY = tileOriginY + (gridSize - 1) * 2 * stepY + dBotY;

    if (x < minX || x > maxX || y < minY || y > maxY) {
      return null;
    }

    // Iterate through tiles to find the one containing this point
    // (Diamond hit detection is complex; this is a simplified approach)
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const pos = this.getTilePosition(col, row);
        const diamond = [
          { x: pos.cx, y: pos.dTop },
          { x: pos.cx + pos.halfW, y: pos.dWaist },
          { x: pos.cx, y: pos.dBot },
          { x: pos.cx - pos.halfW, y: pos.dWaist },
        ];

        if (this.pointInDiamond(x, y, diamond)) {
          return {
            col,
            row,
            slot: encodeSlot(col, row),
          };
        }
      }
    }

    return null;
  }

  /**
   * Check if a point is inside a diamond shape
   */
  private pointInDiamond(
    x: number,
    y: number,
    diamond: Array<{ x: number; y: number }>,
  ): boolean {
    // Calculate diamond center and dimensions from the four points
    const cx = (diamond[0].x + diamond[1].x + diamond[2].x + diamond[3].x) / 4;
    const dTop = diamond[0].y;
    const dBot = diamond[2].y;
    const halfW = (diamond[1].x - diamond[3].x) / 2;

    // Simplified diamond check using the diamond's bounding properties
    const dx = Math.abs(x - cx);
    const dy = y - dTop;
    const totalHeight = dBot - dTop;

    if (dy < 0 || dy > totalHeight) return false;

    // Calculate max width at this height within the diamond
    const normalizedHeight = dy / totalHeight;
    const maxWidth = halfW * (1 - Math.abs(2 * normalizedHeight - 1));

    return dx <= maxWidth;
  }

  /**
   * Get all tile positions
   */
  getAllTilePositions(): Map<number, TilePosition> {
    return new Map(this.tilePositions);
  }

  /**
   * Render scatter decorations (bushes, rocks on forest/grass tiles)
   */
  renderDecorations(): void {
    const decoKeys = ["deco-bush1", "deco-bush2", "deco-bush3", "deco-bush4"];
    const rockKeys = ["deco-rock1", "deco-rock2", "deco-rock3", "deco-rock4"];
    const rng = (min: number, max: number) => min + Math.random() * (max - min);

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        const terrain = this.getTerrainType(col, row);
        const pos = this.getTilePosition(col, row);

        // Water -> Lilypads
        if (terrain === "water" && Math.random() > 0.8) {
          const depth = pos.depth + 1;
          this.scene.add
            .image(
              pos.cx + rng(-20, 20),
              pos.dWaist + rng(-10, 10),
              "deco-lilypads",
            )
            .setDisplaySize(
              pos.halfW * rng(0.4, 0.7),
              pos.halfW * rng(0.4, 0.7),
            )
            .setDepth(depth)
            .setAlpha(0.9);
          continue;
        }

        // Forest -> Stumps, rocks, or trees (upright billboards)
        if (terrain === "forest" && Math.random() > 0.4) {
          // Bottom-center pivot implementation
          // depth gets +10 offset to ensure proper Isometric Y-Sorting above flat tiles
          const depth = (row + col) * 10 + 10;
          const dKey =
            Math.random() > 0.4
              ? "tree_new"
              : Math.random() > 0.4
                ? "rock_new"
                : "deco-stumps";
          this.scene.add
            .image(
              pos.cx + rng(-pos.halfW * 0.2, pos.halfW * 0.2),
              pos.dWaist + rng(-10, 10),
              dKey,
            )
            .setOrigin(0.5, 1.0) // Anchor trunk to ground
            .setDisplaySize(
              dKey === "tree_new" ? 140 : 80,
              dKey === "tree_new" ? 140 : 80,
            )
            .setDepth(depth);
          continue;
        }

        // Grass Inner Village -> sparse flowers, rocks, bushes
        if (
          terrain === "grass" &&
          this.isVillageTile(col, row) &&
          !this.isTownHallTile(col, row)
        ) {
          if (Math.random() > 0.85) {
            const depth = (row + col) * 10 + 10;
            const set = Math.random();
            let key = "deco-flowers";
            if (set > 0.6)
              key = rockKeys[Math.floor(Math.random() * rockKeys.length)];
            else if (set > 0.4)
              key = decoKeys[Math.floor(Math.random() * decoKeys.length)];

            this.scene.add
              .image(
                pos.cx + rng(-pos.halfW * 0.4, pos.halfW * 0.4),
                pos.dWaist + rng(-20, 20),
                key,
              )
              .setOrigin(0.5, 1.0) // Upright
              .setDisplaySize(
                pos.halfW * rng(0.4, 0.6),
                pos.halfW * rng(0.4, 0.6),
              )
              .setDepth(depth)
              .setAlpha(rng(0.8, 1));
          }
        }
      }
    }
  }

  /**
   * Clear all rendered tiles (for grid rebuild)
   */
  clearGrid(): void {
    this.tileSprites.forEach((sprite) => sprite.destroy());
    this.tileSprites.clear();
    this.tilePositions.clear();
    this.hitZones.forEach((zone) => zone.destroy());
    this.hitZones.clear();
    this.hoverSprite?.destroy();
    this.townHallGlow?.destroy();
  }

  /**
   * Destroy the renderer and clean up all resources
   */
  destroy(): void {
    this.clearGrid();
  }
}
