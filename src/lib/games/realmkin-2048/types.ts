export type Direction = 0 | 1 | 2 | 3;

export interface Position {
  x: number;
  y: number;
}

export interface SerializedTile {
  position: Position;
  value: number;
  id: number;
}

export interface SerializedGrid {
  size: number;
  cells: (SerializedTile | null)[][];
}

export interface TileSnapshot {
  id: number;
  x: number;
  y: number;
  value: number;
  previousPosition: Position | null;
  mergedFromIds: number[];
}

export interface SerializedGameState {
  grid: SerializedGrid;
  score: number;
  over: boolean;
  won: boolean;
  keepPlaying: boolean;
  bestScore?: number;
}
