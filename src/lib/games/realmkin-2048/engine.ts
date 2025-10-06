import { Grid } from "./grid";
import { Tile } from "./tile";
import { StorageManager } from "./storageManager";
import type { Direction, Position, SerializedGameState, TileSnapshot } from "./types";

export interface GameSnapshot {
  grid: number[][];
  score: number;
  bestScore: number;
  over: boolean;
  won: boolean;
  keepPlaying: boolean;
  movesAvailable: boolean;
  tiles: TileSnapshot[];
}

interface GameEngineOptions {
  size?: number;
  startTiles?: number;
  onChange?: (snapshot: GameSnapshot) => void;
  storageManager?: StorageManager;
}

const DEFAULT_SIZE = 4;
const DEFAULT_START_TILES = 2;

type Vector = { x: number; y: number };

const VECTORS: Vector[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export class GameEngine {
  private readonly size: number;
  private readonly startTiles: number;
  private readonly storageManager: StorageManager;
  private grid: Grid;
  private score = 0;
  private bestScore = 0;
  private over = false;
  private won = false;
  private keepPlaying = false;
  private onChange?: (snapshot: GameSnapshot) => void;

  constructor(options: GameEngineOptions = {}) {
    this.size = options.size ?? DEFAULT_SIZE;
    this.startTiles = options.startTiles ?? DEFAULT_START_TILES;
    this.onChange = options.onChange;
    this.storageManager = options.storageManager ?? new StorageManager(this.size);

    const previousState = this.storageManager.getGameState((json) => JSON.parse(json) as SerializedGameState);

    this.bestScore = this.storageManager.getBestScore();

    if (previousState && previousState.grid?.cells?.length === previousState.grid.size) {
      this.grid = new Grid(previousState.grid.size, previousState.grid.cells);
      this.score = previousState.score ?? 0;
      this.over = Boolean(previousState.over);
      this.won = Boolean(previousState.won);
      this.keepPlaying = Boolean(previousState.keepPlaying);
      if (typeof previousState.bestScore === "number") {
        this.bestScore = Math.max(this.bestScore, previousState.bestScore);
      }
    } else {
      this.grid = new Grid(this.size);
      this.restartInternal();
      return;
    }

    this.emit();
  }

  setOnChange(handler: (snapshot: GameSnapshot) => void): void {
    this.onChange = handler;
    this.emit();
  }

  move(direction: Direction): void {
    if (this.isGameTerminated()) {
      return;
    }

    const vector = VECTORS[direction];
    if (!vector) {
      return;
    }

    const traversals = this.buildTraversals(vector);
    let moved = false;

    this.prepareTiles();

    traversals.x.forEach((x) => {
      traversals.y.forEach((y) => {
        const cell: Position = { x, y };
        const tile = this.grid.cellContent(cell);

        if (!tile) {
          return;
        }

        const positions = this.findFarthestPosition(cell, vector);
        const next = this.grid.cellContent(positions.next);

        if (next && next.value === tile.value && !next.mergedFrom) {
          const merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          this.grid.insertTile(merged);
          this.grid.removeTile(tile);

          tile.updatePosition(positions.next);

          this.score += merged.value;
          if (this.score > this.bestScore) {
            this.bestScore = this.score;
            this.storageManager.setBestScore(this.bestScore);
          }

          if (merged.value === 2048) {
            this.won = true;
          }
        } else {
          this.moveTile(tile, positions.farthest);
        }

        if (!this.positionsEqual(cell, tile)) {
          moved = true;
        }
      });
    });

    if (!moved) {
      return;
    }

    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true;
    }

    this.actuate();
  }

  restart(): void {
    this.storageManager.clearGameState();
    this.restartInternal();
  }

  continueGame(): void {
    this.keepPlaying = true;
    this.over = false;
    this.actuate();
  }

  getSnapshot(): GameSnapshot {
    return this.buildSnapshot();
  }

  private restartInternal(): void {
    this.grid = new Grid(this.size);
    this.score = 0;
    this.over = false;
    this.won = false;
    this.keepPlaying = false;

    this.addStartTiles();
    this.actuate();
  }

  private addStartTiles(): void {
    for (let i = 0; i < this.startTiles; i += 1) {
      this.addRandomTile();
    }
  }

  private addRandomTile(): void {
    if (!this.grid.cellsAvailable()) {
      return;
    }

    const value = Math.random() < 0.9 ? 2 : 4;
    const position = this.grid.randomAvailableCell();

    if (!position) {
      return;
    }

    const tile = new Tile(position, value);
    this.grid.insertTile(tile);
  }

  private prepareTiles(): void {
    this.grid.eachCell((_x, _y, tile) => {
      if (!tile) return;
      tile.mergedFrom = null;
      tile.savePosition();
    });
  }

  private moveTile(tile: Tile, cell: Position): void {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
  }

  private findFarthestPosition(cell: Position, vector: Vector): { farthest: Position; next: Position } {
    let previous: Position;
    let current: Position = cell;

    do {
      previous = current;
      current = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(current) && this.grid.cellAvailable(current));

    return {
      farthest: previous,
      next: current,
    };
  }

  private movesAvailable(): boolean {
    return this.grid.cellsAvailable() || this.tileMatchesAvailable();
  }

  private tileMatchesAvailable(): boolean {
    for (let x = 0; x < this.size; x += 1) {
      for (let y = 0; y < this.size; y += 1) {
        const tile = this.grid.cellContent({ x, y });
        if (!tile) {
          continue;
        }

        for (const vector of VECTORS) {
          const cell = { x: x + vector.x, y: y + vector.y };
          const other = this.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private positionsEqual(first: Position, second: Tile): boolean {
    return first.x === second.x && first.y === second.y;
  }

  private buildTraversals(vector: Vector): { x: number[]; y: number[] } {
    const traversals = { x: [] as number[], y: [] as number[] };

    for (let pos = 0; pos < this.size; pos += 1) {
      traversals.x.push(pos);
      traversals.y.push(pos);
    }

    if (vector.x === 1) {
      traversals.x.reverse();
    }
    if (vector.y === 1) {
      traversals.y.reverse();
    }

    return traversals;
  }

  private isGameTerminated(): boolean {
    return this.over || (this.won && !this.keepPlaying);
  }

  private serialize(): SerializedGameState {
    return {
      grid: this.grid.serialize(),
      score: this.score,
      over: this.over,
      won: this.won,
      keepPlaying: this.keepPlaying,
      bestScore: this.bestScore,
    } satisfies SerializedGameState;
  }

  private buildSnapshot(): GameSnapshot {
    const grid: number[][] = [];
    const tiles: TileSnapshot[] = [];

    for (let y = 0; y < this.size; y += 1) {
      const row: number[] = [];
      for (let x = 0; x < this.size; x += 1) {
        const tile = this.grid.cells[x]?.[y] ?? null;
        row.push(tile?.value ?? 0);
        if (tile) {
          tiles.push({
            id: tile.id,
            x: tile.x,
            y: tile.y,
            value: tile.value,
            previousPosition: tile.previousPosition,
            mergedFromIds: tile.mergedFrom?.map((merged) => merged.id) ?? [],
          });
        }
      }
      grid[y] = row;
    }

    return {
      grid,
      score: this.score,
      bestScore: this.bestScore,
      over: this.over,
      won: this.won,
      keepPlaying: this.keepPlaying,
      movesAvailable: this.movesAvailable(),
      tiles,
    };
  }

  private actuate(): void {
    if (this.over) {
      this.storageManager.clearGameState();
    } else {
      this.storageManager.setGameState(this.serialize());
    }

    this.emit();
  }

  private emit(): void {
    this.onChange?.(this.buildSnapshot());
  }
}
