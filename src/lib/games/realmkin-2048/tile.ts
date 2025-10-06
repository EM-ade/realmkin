import type { Position, SerializedTile } from "./types";

let tileIdCounter = 0;

export class Tile {
  public readonly id: number;
  public x: number;
  public y: number;
  public value: number;
  public previousPosition: Position | null = null;
  public mergedFrom: [Tile, Tile] | null = null;

  constructor(position: Position, value: number = 2) {
    this.id = tileIdCounter += 1;
    this.x = position.x;
    this.y = position.y;
    this.value = value;
  }

  savePosition(): void {
    this.previousPosition = { x: this.x, y: this.y };
  }

  updatePosition(position: Position): void {
    this.x = position.x;
    this.y = position.y;
  }

  serialize(): SerializedTile {
    return {
      id: this.id,
      position: {
        x: this.x,
        y: this.y,
      },
      value: this.value,
    };
  }
}
