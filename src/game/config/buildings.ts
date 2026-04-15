import {
  FARM_CONFIG,
  LUMBER_MILL_CONFIG,
  QUARRY_CONFIG,
  IRON_MINE_CONFIG,
  TOWN_HALL_CONFIG,
  WAREHOUSE_CONFIG,
  getUpgradeCost,
  getBuildTimeMs,
  getCollectorCapacity,
} from "./gameConfig";

export type BuildingZone = "center" | "mid" | "resource" | "defense";

export interface BuildingConfig {
  id: string;
  name: string;
  description: string;
  baseCost: ResourceCost;
  upgradeCostMultiplier: number;
  production?: ResourceProduction;
  maxLevel: number;
  buildTime: number; // ms (real time for construction timer)
  unlocks?: string[];
  zone: BuildingZone;
  maxCountByTH: Record<number, number>;
  thLevelRequired: number;
  /** How many ms between each production tick for this building. Only for resource producers. */
  tickIntervalMs?: number;
  /** Max resource units this collector can hold before it stops producing.
   *  Scales with level: capacity = collectorCapacity * (1 + 0.5 * (level - 1)) */
  collectorCapacity?: number;
  /** Number of troops this building can hold. Scales with level.
   *  Only used by Army Camps. */
  housingCapacity?: number;
  /** Building footprint in tiles (width × height). Determines how many grid cells the building occupies. */
  footprint: { w: number; h: number };
}

export interface ResourceCost {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

export interface ResourceProduction {
  wood?: number;
  clay?: number;
  iron?: number;
  crop?: number;
}

/** Returns max count of a building type allowed at the given TH level. Returns 0 if locked. */
export function getMaxCount(buildingId: string, thLevel: number): number {
  const cfg = BUILDINGS[buildingId];
  if (!cfg) return 0;
  // Find the highest TH key <= current TH level
  const keys = Object.keys(cfg.maxCountByTH)
    .map(Number)
    .sort((a, b) => a - b);
  let result = 0;
  for (const k of keys) {
    if (k <= thLevel) result = cfg.maxCountByTH[k];
  }
  return result;
}

export const BUILDINGS: Record<string, BuildingConfig> = {
  "town-hall": {
    id: "town-hall",
    name: "Town Hall",
    description:
      "The heart of your village. Unlocks new buildings and increases population limit.",
    baseCost: { wood: 100, clay: 100, iron: 50, crop: 100 },
    upgradeCostMultiplier: 2.0,
    maxLevel: 5,
    buildTime: 8000,
    unlocks: ["farm", "lumber-mill", "house"],
    zone: "center",
    maxCountByTH: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
    thLevelRequired: 1,
    footprint: { w: 3, h: 3 }, // 3×3 — central, visually dominant
  },
  farm: {
    id: "farm",
    name: "Farm",
    description: "Produces crop to feed your population and army.",
    // Cost & build time are now per-level — see gameConfig.ts FARM_CONFIG
    baseCost: FARM_CONFIG.levels[1].upgradeCost,
    upgradeCostMultiplier: 1, // unused for resource buildings; gameConfig drives costs
    maxLevel: 5,
    buildTime: FARM_CONFIG.levels[1].buildTimeMs,
    production: { crop: FARM_CONFIG.levels[1].productionPerTick },
    zone: "resource",
    maxCountByTH: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
    thLevelRequired: 1,
    tickIntervalMs: FARM_CONFIG.tickIntervalMs,
    collectorCapacity: FARM_CONFIG.levels[1].collectorCapacity,
    footprint: { w: 2, h: 2 },
  },
  "lumber-mill": {
    id: "lumber-mill",
    name: "Lumber Mill",
    description: "Produces wood for construction.",
    baseCost: LUMBER_MILL_CONFIG.levels[1].upgradeCost,
    upgradeCostMultiplier: 1,
    maxLevel: 5,
    buildTime: LUMBER_MILL_CONFIG.levels[1].buildTimeMs,
    production: { wood: LUMBER_MILL_CONFIG.levels[1].productionPerTick },
    zone: "resource",
    maxCountByTH: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
    thLevelRequired: 1,
    tickIntervalMs: LUMBER_MILL_CONFIG.tickIntervalMs,
    collectorCapacity: LUMBER_MILL_CONFIG.levels[1].collectorCapacity,
    footprint: { w: 2, h: 2 },
  },
  quarry: {
    id: "quarry",
    name: "Quarry",
    description: "Produces clay for construction.",
    baseCost: QUARRY_CONFIG.levels[1].upgradeCost,
    upgradeCostMultiplier: 1,
    maxLevel: 5,
    buildTime: QUARRY_CONFIG.levels[1].buildTimeMs,
    production: { clay: QUARRY_CONFIG.levels[1].productionPerTick },
    zone: "resource",
    maxCountByTH: { 2: 1, 3: 2, 4: 3, 5: 4 },
    thLevelRequired: 2,
    tickIntervalMs: QUARRY_CONFIG.tickIntervalMs,
    collectorCapacity: QUARRY_CONFIG.levels[1].collectorCapacity,
    footprint: { w: 2, h: 2 },
  },
  "iron-mine": {
    id: "iron-mine",
    name: "Iron Mine",
    description: "Produces iron for weapons and armor.",
    baseCost: IRON_MINE_CONFIG.levels[1].upgradeCost,
    upgradeCostMultiplier: 1,
    maxLevel: 5,
    buildTime: IRON_MINE_CONFIG.levels[1].buildTimeMs,
    production: { iron: IRON_MINE_CONFIG.levels[1].productionPerTick },
    zone: "resource",
    maxCountByTH: { 2: 1, 3: 2, 4: 3, 5: 4 },
    thLevelRequired: 2,
    tickIntervalMs: IRON_MINE_CONFIG.tickIntervalMs,
    collectorCapacity: IRON_MINE_CONFIG.levels[1].collectorCapacity,
    footprint: { w: 2, h: 2 },
  },
  barracks: {
    id: "barracks",
    name: "Barracks",
    description: "Train military units to defend your village.",
    baseCost: { wood: 150, clay: 100, iron: 100, crop: 150 },
    upgradeCostMultiplier: 2.0,
    maxLevel: 5,
    buildTime: 10000,
    unlocks: ["militia", "swordsman", "archer", "cavalry"],
    zone: "mid",
    maxCountByTH: { 2: 1, 3: 2, 4: 3, 5: 4 },
    thLevelRequired: 2,
    footprint: { w: 3, h: 3 }, // 3×3 — military building, needs space
  },
  "army-camp": {
    id: "army-camp",
    name: "Army Camp",
    description: "Increases your maximum troop housing capacity.",
    baseCost: { wood: 150, clay: 150, iron: 50, crop: 50 },
    upgradeCostMultiplier: 1.5,
    maxLevel: 5,
    buildTime: 8000,
    zone: "mid",
    maxCountByTH: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 },
    thLevelRequired: 1,
    housingCapacity: 20, // 20 units per camp at Level 1, scales up
    footprint: { w: 2, h: 2 }, // 2×2 — medium footprint
  },
  laboratory: {
    id: "laboratory",
    name: "Laboratory",
    description: "Research upgrades to make your troops stronger.",
    baseCost: { wood: 200, clay: 200, iron: 100, crop: 200 },
    upgradeCostMultiplier: 2.5,
    maxLevel: 5,
    buildTime: 15000,
    zone: "mid",
    maxCountByTH: { 2: 1, 3: 1, 4: 1, 5: 1 },
    thLevelRequired: 2,
    footprint: { w: 2, h: 2 }, // 2×2 — medium footprint
  },
  warehouse: {
    id: "warehouse",
    name: "Warehouse",
    description: "Increases resource storage capacity.",
    baseCost: { wood: 100, clay: 100, iron: 50, crop: 50 },
    upgradeCostMultiplier: 1.8,
    maxLevel: 5,
    buildTime: 6000,
    zone: "mid",
    maxCountByTH: { 2: 1, 3: 2, 4: 3, 5: 4 },
    thLevelRequired: 2,
    footprint: { w: 2, h: 2 }, // 2×2 — storage building
  },
  house: {
    id: "house",
    name: "House",
    description: "Provides housing for population.",
    baseCost: { wood: 50, clay: 50, iron: 20, crop: 50 },
    upgradeCostMultiplier: 1.5,
    maxLevel: 5,
    buildTime: 3000,
    zone: "mid",
    maxCountByTH: { 1: 2, 2: 4, 3: 6, 4: 8, 5: 10 },
    thLevelRequired: 1,
    footprint: { w: 1, h: 1 }, // 1×1 — small residential
  },
  wall: {
    id: "wall",
    name: "Wall",
    description: "Defensive structure to protect your village.",
    baseCost: { wood: 20, clay: 50, iron: 10, crop: 10 },
    upgradeCostMultiplier: 2.0,
    maxLevel: 5,
    buildTime: 1000,
    zone: "defense",
    maxCountByTH: { 1: -1, 2: -1, 3: -1, 4: -1, 5: -1 },
    thLevelRequired: 1,
    footprint: { w: 1, h: 1 }, // 1×1 — perimeter only
  },
  tower: {
    id: "tower",
    name: "Tower",
    description: "Defensive tower that can attack enemies and provide vision.",
    baseCost: { wood: 100, clay: 150, iron: 50, crop: 50 },
    upgradeCostMultiplier: 2.0,
    maxLevel: 5,
    buildTime: 8000,
    zone: "defense",
    maxCountByTH: { 3: 4, 4: 6, 5: 8 },
    thLevelRequired: 3,
    footprint: { w: 1, h: 1 }, // 1×1 — tight defensive placement
  },
};

// Resource buildings that use per-level costs from gameConfig
const RESOURCE_BUILDING_IDS = new Set([
  "farm",
  "lumber-mill",
  "quarry",
  "iron-mine",
]);
type ResourceBuildingKey = "farm" | "lumber-mill" | "quarry" | "iron-mine";

export function getBuildingCost(
  buildingId: string,
  level: number,
): ResourceCost {
  const building = BUILDINGS[buildingId];
  if (!building) {
    return { wood: 0, clay: 0, iron: 0, crop: 0 };
  }

  // Resource buildings: use explicit per-level costs from gameConfig.ts
  if (RESOURCE_BUILDING_IDS.has(buildingId)) {
    const clampedLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
    const cost = getUpgradeCost(
      buildingId as ResourceBuildingKey,
      clampedLevel,
    );
    return {
      wood: cost.wood,
      clay: cost.clay,
      iron: cost.iron,
      crop: cost.crop,
    };
  }

  // Town Hall explicit per-level costs
  if (buildingId === "town-hall") {
    const clampedLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
    const cost = TOWN_HALL_CONFIG[clampedLevel].upgradeCost;
    return {
      wood: cost.wood,
      clay: cost.clay,
      iron: cost.iron,
      crop: cost.crop,
    };
  }

  // Warehouse explicit per-level costs
  if (buildingId === "warehouse") {
    const clampedLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
    const cost = WAREHOUSE_CONFIG[clampedLevel].upgradeCost;
    return {
      wood: cost.wood,
      clay: cost.clay,
      iron: cost.iron,
      crop: cost.crop,
    };
  }

  // All other buildings: exponential multiplier formula
  const multiplier = Math.pow(building.upgradeCostMultiplier, level - 1);
  return {
    wood: Math.floor(building.baseCost.wood * multiplier),
    clay: Math.floor(building.baseCost.clay * multiplier),
    iron: Math.floor(building.baseCost.iron * multiplier),
    crop: Math.floor(building.baseCost.crop * multiplier),
  };
}

/**
 * Returns the real-time build duration in ms for a given building + level.
 * For the 4 resource buildings, uses explicit per-level values from gameConfig.ts.
 * For all other buildings, returns the flat `buildTime` from buildings.ts.
 *
 * @param buildingId - The building type key (e.g. "farm", "town-hall")
 * @param level - The level being BUILT/UPGRADED TO (1 = initial placement)
 */
export function getLevelBuildTimeMs(buildingId: string, level: number): number {
  const clampedLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;

  if (RESOURCE_BUILDING_IDS.has(buildingId)) {
    return getBuildTimeMs(buildingId as ResourceBuildingKey, clampedLevel);
  }

  if (buildingId === "town-hall") {
    return TOWN_HALL_CONFIG[clampedLevel].buildTimeMs;
  }

  if (buildingId === "warehouse") {
    return WAREHOUSE_CONFIG[clampedLevel].buildTimeMs;
  }

  return BUILDINGS[buildingId]?.buildTime ?? 5_000;
}

/**
 * Returns the collector capacity for a resource building at a given level.
 * Uses explicit per-level values from gameConfig.ts instead of the formula
 * `collectorCapacity * (1 + 0.5*(level-1))` in gameStore.
 *
 * For non-resource buildings, falls back to the flat collectorCapacity value.
 */
export function getResourceCollectorCapacity(
  buildingId: string,
  level: number,
): number {
  if (RESOURCE_BUILDING_IDS.has(buildingId)) {
    const clampedLevel = Math.max(1, Math.min(5, level)) as 1 | 2 | 3 | 4 | 5;
    return getCollectorCapacity(
      buildingId as ResourceBuildingKey,
      clampedLevel,
    );
  }
  const cfg = BUILDINGS[buildingId];
  if (!cfg?.collectorCapacity) return 0;
  return cfg.collectorCapacity * (1 + 0.5 * (level - 1));
}

/**
 * Per-asset display scale overrides.
 * Key = "<buildingType>-l<level>" (e.g. "farm-l1").
 * A value of 1.0 = default (fills tile width at bScaleBase).
 * Increase above 1.0 to make an individual asset larger.
 */
export const BUILDING_DISPLAY_SCALE: Record<string, number> = {
  // Construction site - fits exactly on tile
  "construction-site": 1.0,

  // Town Hall — large, keep prominent
  "town-hall-l1": 1.0,
  "town-hall-l2": 1.0,
  "town-hall-l3": 1.0,
  "town-hall-l4": 1.0,
  "town-hall-l5": 1.0,

  // Resource buildings — new assets, slightly boosted
  "farm-l1": 1.4,
  "farm-l2": 1.4,
  "farm-l3": 1.4,
  "farm-l4": 1.4,
  "farm-l5": 1.4,
  "lumber-mill-l1": 1.4,
  "lumber-mill-l2": 1.4,
  "lumber-mill-l3": 1.4,
  "lumber-mill-l4": 1.4,
  "lumber-mill-l5": 1.4,
  "quarry-l1": 1.3,
  "quarry-l2": 1.3,
  "quarry-l3": 1.3,
  "quarry-l4": 1.3,
  "quarry-l5": 1.3,
  "iron-mine-l1": 1.3,
  "iron-mine-l2": 1.3,
  "iron-mine-l3": 1.3,
  "iron-mine-l4": 1.3,
  "iron-mine-l5": 1.3,

  // Military
  "barracks-l1": 1.0,
  "barracks-l2": 1.0,
  "barracks-l3": 1.0,
  "barracks-l4": 1.0,
  "barracks-l5": 1.0,
  "warehouse-l1": 1.0,
  "warehouse-l2": 1.0,
  "warehouse-l3": 1.0,
  "warehouse-l4": 1.0,
  "warehouse-l5": 1.0,
  "house-l1": 1.0,
  "house-l2": 1.1,
  "house-l3": 1.1,
  "house-l4": 1.2,
  "house-l5": 1.2,

  // Defenses — new assets
  "wall-l1": 1.5,
  "wall-l2": 1.5,
  "wall-l3": 1.5,
  "wall-l4": 1.5,
  "wall-l5": 1.5,
  "tower-l1": 1.4,
  "tower-l2": 1.4,
  "tower-l3": 1.4,
  "tower-l4": 1.4,
  "tower-l5": 1.4,
};

/** Returns the display scale multiplier for a specific building+level sprite */
export function getBuildingScale(key: string): number {
  return BUILDING_DISPLAY_SCALE[key] ?? 1.0;
}

/**
 * Building types whose sprites are full isometric tile replacements
 * (they include their own dirt/ground base and should be rendered
 * exactly like terrain tiles, not as a building floating over a tile).
 */
export const TILE_STYLE_BUILDINGS = new Set([
  "farm",
  "lumber-mill",
  "quarry",
  "iron-mine",
  "wall",
]);

/**
 * Per-asset pixel offsets applied on top of the tile position.
 * Units are fractions of tileW (e.g. 0.1 = 10% of tile width).
 * Positive x = shift right, positive y = shift down.
 */
export const BUILDING_OFFSETS: Record<string, { x: number; y: number }> = {
  // ── Tile-style buildings (rendered at imgX/imgY) ──
  "farm-l1": { x: 0, y: -0.1 },
  "farm-l2": { x: 0, y: 0 },
  "farm-l3": { x: 0, y: 0 },
  "farm-l4": { x: 0, y: 0 },
  "farm-l5": { x: 0, y: 0 },
  "lumber-mill-l1": { x: 0, y: -0.14 },
  "lumber-mill-l2": { x: 0, y: 0 },
  "lumber-mill-l3": { x: 0, y: 0 },
  "lumber-mill-l4": { x: 0, y: 0 },
  "lumber-mill-l5": { x: 0, y: 0 },
  "quarry-l1": { x: 0, y: -0.05 },
  "quarry-l2": { x: 0, y: 0 },
  "quarry-l3": { x: 0, y: 0 },
  "quarry-l4": { x: 0, y: 0 },
  "quarry-l5": { x: 0, y: 0 },
  "iron-mine-l1": { x: 0, y: -0.16 },
  "iron-mine-l2": { x: 0, y: 0 },
  "iron-mine-l3": { x: 0, y: 0 },
  "iron-mine-l4": { x: 0, y: 0 },
  "iron-mine-l5": { x: 0, y: 0 },
  "wall-l1": { x: 0, y: -0.2 },
  "wall-l2": { x: 0, y: -0.2 },
  "wall-l3": { x: 0, y: -0.2 },
  "wall-l4": { x: 0, y: -0.2 },
  "wall-l5": { x: 0, y: -0.2 },

  // ── Building-on-tile style (rendered at cx/dBot) ──
  "town-hall-l1": { x: 0, y: 0 },
  "town-hall-l2": { x: 0, y: 0 },
  "town-hall-l3": { x: 0, y: 0 },
  "town-hall-l4": { x: 0, y: 0 },
  "town-hall-l5": { x: 0, y: 0 },
  "barracks-l1": { x: 0, y: 0 },
  "barracks-l2": { x: 0, y: 0 },
  "barracks-l3": { x: 0, y: 0 },
  "barracks-l4": { x: 0, y: 0 },
  "barracks-l5": { x: 0, y: 0 },
  "house-l1": { x: 0, y: 0 },
  "house-l2": { x: 0, y: 0 },
  "house-l3": { x: 0, y: 0 },
  "house-l4": { x: 0, y: 0 },
  "house-l5": { x: 0, y: 0 },
  "warehouse-l1": { x: 0, y: 0 },
  "warehouse-l2": { x: 0, y: 0 },
  "warehouse-l3": { x: 0, y: 0 },
  "warehouse-l4": { x: 0, y: 0 },
  "warehouse-l5": { x: 0, y: 0 },
  "tower-l1": { x: 0, y: 0 },
  "tower-l2": { x: 0, y: 0 },
  "tower-l3": { x: 0, y: 0 },
  "tower-l4": { x: 0, y: 0 },
  "tower-l5": { x: 0, y: 0 },
};

/** Returns {x, y} pixel offset (in tile-fraction units) for a building+level sprite */
export function getBuildingOffset(key: string): { x: number; y: number } {
  return BUILDING_OFFSETS[key] ?? { x: 0, y: 0 };
}
