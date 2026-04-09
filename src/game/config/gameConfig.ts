// ─────────────────────────────────────────────────────────────────────────────
// GAME ECONOMY CONFIG
// Single source of truth for all building progression values.
// Import this file wherever you need level-specific build times, costs, or
// production rates instead of scattering magic numbers throughout the codebase.
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ResourceCostConfig {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

export interface BuildingLevelConfig {
  level: number;
  /** Real-time construction duration in milliseconds */
  buildTimeMs: number;
  /** Upgrade cost to reach this level from the previous */
  upgradeCost: ResourceCostConfig;
  /**
   * How many units of the primary resource this building produces per tick.
   * The tick interval is defined in RESOURCE_TICK_INTERVALS.
   * Production scales via: prodPerTick * (1 + (level - 1) * 0.5) in gameStore.
   * These values represent the LEVEL-1 base. Store applies levelMult on top.
   * Provide the base value here so it matches buildings.ts `production`.
   */
  productionPerTick: number;
  /**
   * Max collector capacity at this level.
   * Overrides the simple "base * (1 + 0.5*(level-1))" formula in gameStore
   * with explicit per-level values for fine-grained control.
   */
  collectorCapacity: number;
}

export interface ResourceBuildingConfig {
  /** The resource key produced by this building */
  produces: "wood" | "clay" | "iron" | "crop";
  /** Tick interval in ms between each production unit being added */
  tickIntervalMs: number;
  /** Approximate hourly production at level 1 (for display / balancing reference only) */
  baseProdPerHour: number;
  levels: Record<1 | 2 | 3 | 4 | 5, BuildingLevelConfig>;
}

export interface TownHallLevelConfig {
  level: number;
  buildTimeMs: number;
  upgradeCost: ResourceCostConfig;
  /** Max number of each warehouse building allowed at this TH level */
  maxWarehouses: number;
  /**
   * Intrinsic storage granted by the Town Hall itself (before warehouses).
   * All other resource caps come from warehouses.
   */
  intrinsicStorageCap: number;
}

export interface WarehouseLevelConfig {
  level: number;
  buildTimeMs: number;
  upgradeCost: ResourceCostConfig;
  /** Additional storage this warehouse provides when at this level */
  additionalCapacity: number;
}

// ── Gem Skip Formula ──────────────────────────────────────────────────────────
/**
 * Cost in gems to instantly complete a remaining build time.
 * Formula matches gameStore.finishConstructionInstantly:
 *   gemCost = ceil(remainingMs / GEM_SKIP_MS_PER_GEM)
 */
export const GEM_SKIP_MS_PER_GEM = 10_000; // 1 gem per 10 seconds

// ── Resource Building Tick Intervals ─────────────────────────────────────────
/**
 * How often (in ms) each resource building adds `productionPerTick` units
 * to its collector. These match the values in buildings.ts and are duplicated
 * here for reference when configuring per-level production values.
 */
export const RESOURCE_TICK_INTERVALS = {
  farm: 4_000, // crop — fastest, food is consumed quickly
  "lumber-mill": 6_000, // wood — medium speed, always in demand
  quarry: 7_000, // clay — slow, mid-game demand spike
  "iron-mine": 8_000, // iron — slowest, premium military resource
} as const;

// ── Farm ─────────────────────────────────────────────────────────────────────
export const FARM_CONFIG: ResourceBuildingConfig = {
  produces: "crop",
  tickIntervalMs: RESOURCE_TICK_INTERVALS.farm,
  baseProdPerHour: 9_000,
  levels: {
    1: {
      level: 1,
      buildTimeMs: 30_000,
      upgradeCost: { wood: 50, clay: 30, iron: 10, crop: 0 },
      productionPerTick: 10,
      collectorCapacity: 200,
    },
    2: {
      level: 2,
      buildTimeMs: 2 * 60_000,
      upgradeCost: { wood: 90, clay: 54, iron: 18, crop: 0 },
      productionPerTick: 10,
      collectorCapacity: 300,
    },
    3: {
      level: 3,
      buildTimeMs: 8 * 60_000,
      upgradeCost: { wood: 162, clay: 97, iron: 32, crop: 0 },
      productionPerTick: 10,
      collectorCapacity: 450,
    },
    4: {
      level: 4,
      buildTimeMs: 20 * 60_000,
      upgradeCost: { wood: 292, clay: 175, iron: 58, crop: 0 },
      productionPerTick: 10,
      collectorCapacity: 600,
    },
    5: {
      level: 5,
      buildTimeMs: 45 * 60_000,
      upgradeCost: { wood: 525, clay: 315, iron: 105, crop: 0 },
      productionPerTick: 10,
      collectorCapacity: 800,
    },
  },
};

// ── Lumber Mill ───────────────────────────────────────────────────────────────
export const LUMBER_MILL_CONFIG: ResourceBuildingConfig = {
  produces: "wood",
  tickIntervalMs: RESOURCE_TICK_INTERVALS["lumber-mill"],
  baseProdPerHour: 6_000,
  levels: {
    1: {
      level: 1,
      buildTimeMs: 30_000,
      upgradeCost: { wood: 0, clay: 20, iron: 10, crop: 30 },
      productionPerTick: 10,
      collectorCapacity: 150,
    },
    2: {
      level: 2,
      buildTimeMs: 2 * 60_000,
      upgradeCost: { wood: 0, clay: 36, iron: 18, crop: 54 },
      productionPerTick: 10,
      collectorCapacity: 225,
    },
    3: {
      level: 3,
      buildTimeMs: 6 * 60_000,
      upgradeCost: { wood: 0, clay: 65, iron: 32, crop: 97 },
      productionPerTick: 10,
      collectorCapacity: 340,
    },
    4: {
      level: 4,
      buildTimeMs: 15 * 60_000,
      upgradeCost: { wood: 0, clay: 117, iron: 58, crop: 175 },
      productionPerTick: 10,
      collectorCapacity: 460,
    },
    5: {
      level: 5,
      buildTimeMs: 35 * 60_000,
      upgradeCost: { wood: 0, clay: 210, iron: 104, crop: 315 },
      productionPerTick: 10,
      collectorCapacity: 620,
    },
  },
};

// ── Quarry ────────────────────────────────────────────────────────────────────
export const QUARRY_CONFIG: ResourceBuildingConfig = {
  produces: "clay",
  tickIntervalMs: RESOURCE_TICK_INTERVALS.quarry,
  baseProdPerHour: 5_143,
  levels: {
    1: {
      level: 1,
      buildTimeMs: 45_000,
      upgradeCost: { wood: 50, clay: 0, iron: 20, crop: 50 },
      productionPerTick: 10,
      collectorCapacity: 120,
    },
    2: {
      level: 2,
      buildTimeMs: 3 * 60_000,
      upgradeCost: { wood: 90, clay: 0, iron: 36, crop: 90 },
      productionPerTick: 10,
      collectorCapacity: 180,
    },
    3: {
      level: 3,
      buildTimeMs: 10 * 60_000,
      upgradeCost: { wood: 162, clay: 0, iron: 65, crop: 162 },
      productionPerTick: 10,
      collectorCapacity: 270,
    },
    4: {
      level: 4,
      buildTimeMs: 28 * 60_000,
      upgradeCost: { wood: 292, clay: 0, iron: 117, crop: 292 },
      productionPerTick: 10,
      collectorCapacity: 370,
    },
    5: {
      level: 5,
      buildTimeMs: 60 * 60_000,
      upgradeCost: { wood: 525, clay: 0, iron: 210, crop: 525 },
      productionPerTick: 10,
      collectorCapacity: 500,
    },
  },
};

// ── Iron Mine ─────────────────────────────────────────────────────────────────
export const IRON_MINE_CONFIG: ResourceBuildingConfig = {
  produces: "iron",
  tickIntervalMs: RESOURCE_TICK_INTERVALS["iron-mine"],
  baseProdPerHour: 4_500,
  levels: {
    1: {
      level: 1,
      buildTimeMs: 60_000,
      upgradeCost: { wood: 80, clay: 50, iron: 0, crop: 80 },
      productionPerTick: 10,
      collectorCapacity: 100,
    },
    2: {
      level: 2,
      buildTimeMs: 4 * 60_000,
      upgradeCost: { wood: 144, clay: 90, iron: 0, crop: 144 },
      productionPerTick: 10,
      collectorCapacity: 150,
    },
    3: {
      level: 3,
      buildTimeMs: 12 * 60_000,
      upgradeCost: { wood: 259, clay: 162, iron: 0, crop: 259 },
      productionPerTick: 10,
      collectorCapacity: 225,
    },
    4: {
      level: 4,
      buildTimeMs: 35 * 60_000,
      upgradeCost: { wood: 466, clay: 292, iron: 0, crop: 466 },
      productionPerTick: 10,
      collectorCapacity: 310,
    },
    5: {
      level: 5,
      buildTimeMs: 90 * 60_000,
      upgradeCost: { wood: 840, clay: 525, iron: 0, crop: 840 },
      productionPerTick: 10,
      collectorCapacity: 420,
    },
  },
};

// ── Town Hall ─────────────────────────────────────────────────────────────────
export const TOWN_HALL_CONFIG: Record<1 | 2 | 3 | 4 | 5, TownHallLevelConfig> =
  {
    1: {
      level: 1,
      buildTimeMs: 0,
      upgradeCost: { wood: 0, clay: 0, iron: 0, crop: 0 },
      maxWarehouses: 0,
      intrinsicStorageCap: 500,
    },
    2: {
      level: 2,
      buildTimeMs: 5 * 60_000,
      upgradeCost: { wood: 100, clay: 100, iron: 100, crop: 100 },
      maxWarehouses: 1,
      intrinsicStorageCap: 500,
    },
    3: {
      level: 3,
      buildTimeMs: 15 * 60_000,
      upgradeCost: { wood: 400, clay: 400, iron: 200, crop: 400 },
      maxWarehouses: 2,
      intrinsicStorageCap: 500,
    },
    4: {
      level: 4,
      buildTimeMs: 40 * 60_000,
      upgradeCost: { wood: 800, clay: 800, iron: 400, crop: 800 },
      maxWarehouses: 3,
      intrinsicStorageCap: 500,
    },
    5: {
      level: 5,
      buildTimeMs: 120 * 60_000,
      upgradeCost: { wood: 1_600, clay: 1_600, iron: 800, crop: 1_600 },
      maxWarehouses: 4,
      intrinsicStorageCap: 500,
    },
  };

// ── Warehouse ─────────────────────────────────────────────────────────────────
export const WAREHOUSE_CONFIG: Record<1 | 2 | 3 | 4 | 5, WarehouseLevelConfig> =
  {
    1: {
      level: 1,
      buildTimeMs: 6_000,
      upgradeCost: { wood: 100, clay: 100, iron: 50, crop: 50 },
      additionalCapacity: 500,
    },
    2: {
      level: 2,
      buildTimeMs: 3 * 60_000,
      upgradeCost: { wood: 180, clay: 180, iron: 90, crop: 90 },
      additionalCapacity: 1_000,
    },
    3: {
      level: 3,
      buildTimeMs: 8 * 60_000,
      upgradeCost: { wood: 324, clay: 324, iron: 162, crop: 162 },
      additionalCapacity: 1_500,
    },
    4: {
      level: 4,
      buildTimeMs: 20 * 60_000,
      upgradeCost: { wood: 583, clay: 583, iron: 292, crop: 292 },
      additionalCapacity: 2_000,
    },
    5: {
      level: 5,
      buildTimeMs: 45 * 60_000,
      upgradeCost: { wood: 1_050, clay: 1_050, iron: 525, crop: 525 },
      additionalCapacity: 2_500,
    },
  };

// ── Storage Reference Table (read-only, for UI display) ────────────────────────
export const STORAGE_BY_TH_LEVEL: Record<number, number> = {
  1: 500,
  2: 1_000,
  3: 1_500,
  4: 2_000,
  5: 2_500,
};

// ── Helper: Get build time for a resource building level ──────────────────────
type ResourceBuildingKey = "farm" | "lumber-mill" | "quarry" | "iron-mine";

const RESOURCE_BUILDING_MAP: Record<
  ResourceBuildingKey,
  ResourceBuildingConfig
> = {
  farm: FARM_CONFIG,
  "lumber-mill": LUMBER_MILL_CONFIG,
  quarry: QUARRY_CONFIG,
  "iron-mine": IRON_MINE_CONFIG,
};

export function getBuildTimeMs(
  building: ResourceBuildingKey,
  level: 1 | 2 | 3 | 4 | 5,
): number {
  return RESOURCE_BUILDING_MAP[building].levels[level].buildTimeMs;
}

export function getUpgradeCost(
  building: ResourceBuildingKey,
  level: 1 | 2 | 3 | 4 | 5,
): ResourceCostConfig {
  return RESOURCE_BUILDING_MAP[building].levels[level].upgradeCost;
}

export function getCollectorCapacity(
  building: ResourceBuildingKey,
  level: 1 | 2 | 3 | 4 | 5,
): number {
  return RESOURCE_BUILDING_MAP[building].levels[level].collectorCapacity;
}

export function calcGemSkipCost(remainingMs: number): number {
  return Math.ceil(remainingMs / GEM_SKIP_MS_PER_GEM);
}
