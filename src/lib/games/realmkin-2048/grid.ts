import { Tile } from "./tile";
import type { Position, SerializedGrid, SerializedTile } from "./types";

export class Grid {
  public size: number;
  public cells: (Tile | null)[][];

  constructor(size: number, previousState?: SerializedGrid["cells"]) {
    this.size = size;
    this.cells = previousState ? this.fromState(previousState) : this.empty();
  }

  empty(): (Tile | null)[][] {
    const cells: (Tile | null)[][] = [];

    for (let x = 0; x < this.size; x += 1) {
      const row: (Tile | null)[] = [];

      for (let y = 0; y < this.size; y += 1) {
        row.push(null);
      }

      cells[x] = row;
    }

    return cells;
  }

  fromState(state: SerializedGrid["cells"]): (Tile | null)[][] {
    const cells: (Tile | null)[][] = [];

    for (let x = 0; x < this.size; x += 1) {
      const row: (Tile | null)[] = [];

      for (let y = 0; y < this.size; y += 1) {
        const tile = state[x]?.[y];
        row.push(tile ? new Tile(tile.position, tile.value) : null);
      }

      cells[x] = row;
    }

    return cells;
  }

  randomAvailableCell(): Position | undefined {
    const cells = this.availableCells();

    if (cells.length) {
      return cells[Math.floor(Math.random() * cells.length)];
    }

    return undefined;
  }

  availableCells(): Position[] {
    const cells: Position[] = [];

    this.eachCell((x, y, tile) => {
      if (!tile) {
        cells.push({ x, y });
      }
    });

    return cells;
  }

  eachCell(callback: (x: number, y: number, tile: Tile | null) => void): void {
    for (let x = 0; x < this.size; x += 1) {
      for (let y = 0; y < this.size; y += 1) {
        callback(x, y, this.cells[x][y]);
      }
    }
  }

  cellsAvailable(): boolean {
    return this.availableCells().length > 0;
  }

  cellAvailable(cell: Position): boolean {
    return !this.cellOccupied(cell);
  }

  cellOccupied(cell: Position): boolean {
    return !!this.cellContent(cell);
  }

  cellContent(cell: Position): Tile | null {
    if (this.withinBounds(cell)) {
      return this.cells[cell.x][cell.y];
    }

    return null;
  }

  insertTile(tile: Tile): void {
    this.cells[tile.x][tile.y] = tile;
  }

  removeTile(tile: Tile): void {
    this.cells[tile.x][tile.y] = null;
  }

  withinBounds(position: Position): boolean {
    return (
      position.x >= 0 &&
      position.x < this.size &&
      position.y >= 0 &&
      position.y < this.size
    );
  }

  serialize(): SerializedGrid {
    const cellState: (SerializedTile | null)[][] = [];

    for (let x = 0; x < this.size; x += 1) {
      const row: (SerializedTile | null)[] = [];

      for (let y = 0; y < this.size; y += 1) {
        const tile = this.cells[x]?.[y] ?? null;
        row.push(tile ? tile.serialize() : null);
      }

      cellState[x] = row;
    }

    return {
      size: this.size,
      cells: cellState,
    };
  }
}
