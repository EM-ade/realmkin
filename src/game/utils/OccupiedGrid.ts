/**
 * OccupiedGrid — Manages tile occupancy for multi-tile buildings.
 *
 * This module provides utilities for tracking which grid cells are occupied
 * by buildings. Each building can occupy multiple tiles based on its footprint.
 *
 * Grid coordinates use the same system as GridRenderer:
 * - row: 0-16 (17×17 grid)
 * - col: 0-16
 * - slotIndex = row * 50 + col
 */

import { BUILDINGS } from "@/game/config/buildings";
import { encodeSlot, decodeSlot, GRID_SIZE } from "@/game/ui/GridRenderer";
import type { Building } from "@/stores/gameStore";

/**
 * Get all cells occupied by a building given its anchor position and footprint
 * @param anchorRow - Top-left anchor row (clicked tile)
 * @param anchorCol - Top-left anchor column
 * @param footprint - Building footprint { w, h }
 * @returns Array of { row, col } coordinates occupied by the building
 */
export function getFootprintCells(
  anchorRow: number,
  anchorCol: number,
  footprint: { w: number; h: number },
): { row: number; col: number }[] {
  const cells: { row: number; col: number }[] = [];

  for (let r = anchorRow; r < anchorRow + footprint.h; r++) {
    for (let c = anchorCol; c < anchorCol + footprint.w; c++) {
      cells.push({ row: r, col: c });
    }
  }

  return cells;
}

/**
 * Check if a building can be placed at the given anchor position
 * @param anchorRow - Top-left anchor row
 * @param anchorCol - Top-left anchor column
 * @param footprint - Building footprint { w, h }
 * @param buildings - Current buildings array from gameStore
 * @param options - Optional constraints
 * @param options.buildableMin - Minimum buildable row/col (default: 2)
 * @param options.buildableMax - Maximum buildable row/col (default: 14)
 * @param options.excludeBuildingId - Building ID to ignore (useful for upgrades)
 * @returns Object with `canPlace` boolean and optional `reason` string
 */
export function canPlace(
  anchorRow: number,
  anchorCol: number,
  footprint: { w: number; h: number },
  buildings: Building[],
  options?: {
    buildableMin?: number;
    buildableMax?: number;
    excludeBuildingId?: string;
  },
): { canPlace: boolean; reason?: string } {
  const buildableMin = options?.buildableMin ?? 2;
  const buildableMax = options?.buildableMax ?? 14;
  const excludeId = options?.excludeBuildingId;

  // Check if all footprint cells are within buildable zone
  for (let r = anchorRow; r < anchorRow + footprint.h; r++) {
    for (let c = anchorCol; c < anchorCol + footprint.w; c++) {
      // Check bounds
      if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
        return { canPlace: false, reason: "Out of bounds" };
      }

      // Check if within buildable zone (inner area)
      if (
        r < buildableMin ||
        r > buildableMax ||
        c < buildableMin ||
        c > buildableMax
      ) {
        return { canPlace: false, reason: "Must be in buildable zone" };
      }
    }
  }

  // Check for overlap with existing buildings
  for (const building of buildings) {
    // Skip the building being upgraded (if applicable)
    if (excludeId && building.id === excludeId) {
      continue;
    }

    const cfg = BUILDINGS[building.type];
    if (!cfg?.footprint) continue;

    const { col: bCol, row: bRow } = decodeSlot(building.slotIndex);

    // Get cells occupied by this building
    const occupiedCells = getFootprintCells(bRow, bCol, cfg.footprint);

    // Get cells where we want to place new building
    const newCells = getFootprintCells(anchorRow, anchorCol, footprint);

    // Check for any overlap
    for (const newCell of newCells) {
      for (const occCell of occupiedCells) {
        if (newCell.row === occCell.row && newCell.col === occCell.col) {
          const buildingName = cfg.name || building.type;
          return {
            canPlace: false,
            reason: `${buildingName} already occupies this space`,
          };
        }
      }
    }
  }

  return { canPlace: true };
}

/**
 * Mark all cells in a footprint as occupied
 * Note: This is a helper for future occupiedGrid 2D array implementation.
 * Currently, collision detection is done by iterating buildings array.
 *
 * @param anchorRow - Top-left anchor row
 * @param anchorCol - Top-left anchor column
 * @param footprint - Building footprint { w, h }
 * @param buildingId - Unique building identifier
 * @returns Array of slot indices that are now occupied
 */
export function markOccupied(
  anchorRow: number,
  anchorCol: number,
  footprint: { w: number; h: number },
): number[] {
  const cells = getFootprintCells(anchorRow, anchorCol, footprint);
  return cells.map((cell) => encodeSlot(cell.col, cell.row));
}

/**
 * Clear all cells in a footprint
 * Note: This is a helper for future occupiedGrid 2D array implementation.
 * Currently handled by removing building from buildings array.
 *
 * @param anchorRow - Top-left anchor row
 * @param anchorCol - Top-left anchor column
 * @param footprint - Building footprint { w, h }
 * @returns Array of slot indices that are now cleared
 */
export function clearOccupied(
  anchorRow: number,
  anchorCol: number,
  footprint: { w: number; h: number },
): number[] {
  const cells = getFootprintCells(anchorRow, anchorCol, footprint);
  return cells.map((cell) => encodeSlot(cell.col, cell.row));
}

/**
 * Calculate the screen position for centering a multi-tile building sprite
 * @param anchorScreenX - Anchor tile screen X (from tileToScreen)
 * @param anchorScreenY - Anchor tile screen Y
 * @param footprint - Building footprint { w, h }
 * @param tileW - Tile width in pixels
 * @param tileH - Tile height in pixels
 * @returns Centered screen position { x, y }
 */
export function getFootprintCenter(
  anchorScreenX: number,
  anchorScreenY: number,
  footprint: { w: number; h: number },
  tileW: number,
  tileH: number,
): { x: number; y: number } {
  // Offset from anchor to center of footprint
  // In isometric: X offset = (w-1) * halfTileWidth, Y offset = (h-1) * halfTileHeight
  const halfTileW = tileW / 2;
  const halfTileH = tileH / 2;

  return {
    x: anchorScreenX + (footprint.w - 1) * halfTileW,
    y: anchorScreenY + (footprint.h - 1) * halfTileH,
  };
}
