// ──────────────────────────────────────────────────────────────────────────────
// POWER LEVEL FORMULA
// Pure utility — NO React, NO Supabase imports.
// Works on both client AND server (Edge Functions).
// ──────────────────────────────────────────────────────────────────────────────

import type { BuildingType } from "@/stores/gameStore";

// ── Building Base Power Values ────────────────────────────────────────────────
// Different buildings give different base power.
// Town Hall = most important, military = high, resources = moderate.

export const BUILDING_BASE_POWER: Record<BuildingType, number> = {
  "town-hall": 500,
  barracks: 300,
  "army-camp": 200,
  tower: 150,
  "iron-mine": 110,
  quarry: 90,
  farm: 80,
  "lumber-mill": 80,
  laboratory: 250,
  warehouse: 100,
  house: 50,
  wall: 60,
};

// ── Level Multiplier (exponential growth) ─────────────────────────────────────
// Level 1 = 1.0x, Level 2 = 1.3x, Level 3 = 1.7x, Level 5 = 2.8x, Level 10 = ~14x

export const LEVEL_MULTIPLIER = (level: number): number => {
  return Math.pow(1.3, level - 1);
};

// ── Building Power Calculation ────────────────────────────────────────────────

export const buildingPower = (type: BuildingType, level: number): number => {
  const base = BUILDING_BASE_POWER[type] ?? 50;
  return Math.floor(base * LEVEL_MULTIPLIER(level));
};

// ── Total Building Power ──────────────────────────────────────────────────────

interface Building {
  type: BuildingType;
  level: number;
  underConstruction?: boolean;
}

export const totalBuildingPower = (buildings: Building[]): number => {
  return buildings.reduce((sum, b) => {
    // Only count completed buildings (not under construction)
    if (b.underConstruction) return sum;
    return sum + buildingPower(b.type, b.level);
  }, 0);
};

// ── Player Level Power ────────────────────────────────────────────────────────
// Formula: level^1.8 * 50
// Level 1 = 0, Level 5 = ~500, Level 10 = ~1900, Level 20 = ~5000

export const playerLevelPower = (level: number): number => {
  if (level <= 1) return 0;
  return Math.floor(Math.pow(level, 1.8) * 50);
};

// ── Production Power ──────────────────────────────────────────────────────────
// Measures economic strength based on hourly production rate.
// Every 10 resources/hour = 1 power point.

interface ProductionBuilding extends Building {
  collectedAmount?: number;
  lastTickAt?: number;
}

export const productionPower = (buildings: ProductionBuilding[]): number => {
  const RESOURCE_BUILDINGS = new Set<BuildingType>([
    "farm",
    "lumber-mill",
    "quarry",
    "iron-mine",
  ]);

  let totalPerHour = 0;

  buildings.forEach((b) => {
    if (!RESOURCE_BUILDINGS.has(b.type) || b.underConstruction) return;

    // Base production per tick varies by building type
    const basePerTick: Record<BuildingType, number> = {
      farm: 10,
      "lumber-mill": 10,
      quarry: 10,
      "iron-mine": 10,
      "town-hall": 0,
      barracks: 0,
      warehouse: 0,
      house: 0,
      wall: 0,
      tower: 0,
      "army-camp": 0,
      laboratory: 0,
    };

    const tickIntervalMs: Record<BuildingType, number> = {
      farm: 4000,
      "lumber-mill": 6000,
      quarry: 7000,
      "iron-mine": 8000,
      "town-hall": 0,
      barracks: 0,
      warehouse: 0,
      house: 0,
      wall: 0,
      tower: 0,
      "army-camp": 0,
      laboratory: 0,
    };

    const interval = tickIntervalMs[b.type];
    if (!interval) return;

    const base = basePerTick[b.type] ?? 10;
    const levelMult = 1 + (b.level - 1) * 0.5;
    const perTick = base * levelMult;

    // Ticks per hour
    const ticksPerHour = 3600000 / interval;
    totalPerHour += perTick * ticksPerHour;
  });

  return Math.floor(totalPerHour / 10);
};

// ── Army Power (FUTURE-READY) ─────────────────────────────────────────────────
// Returns 0 until battle system ships.

interface ArmyData {
  total_units?: number;
}

export const armyPower = (armyData: ArmyData | null): number => {
  if (!armyData) return 0;
  const armyCount = armyData?.total_units || 0;
  return armyCount * 25; // Each unit = 25 power (placeholder)
};

// ── Achievement Power ─────────────────────────────────────────────────────────

export const ACHIEVEMENT_POWER: Record<string, number> = {
  first_building_placed: 50,
  building_max_level: 200,
  village_level_5_buildings: 150,
  village_level_10_buildings: 300,
  village_level_20_buildings: 600,
  login_streak_30: 250,
  tutorial_complete: 100,
  resource_milestone_1000: 100,
  resource_milestone_10000: 300,
};

export const achievementPower = (completedMilestones: string[]): number => {
  return completedMilestones.reduce((sum, milestone) => {
    return sum + (ACHIEVEMENT_POWER[milestone] || 0);
  }, 0);
};

// ── Power Breakdown Interface ─────────────────────────────────────────────────

export interface PowerBreakdown {
  buildingPower: number;
  levelPower: number;
  productionPower: number;
  armyPower: number;
  achievementPower: number;
  total: number;
}

// ── Main Power Level Calculation ──────────────────────────────────────────────

export interface PowerCalcInput {
  buildings: Building[];
  playerLevel: number;
  completedMilestones: string[];
  armyData?: ArmyData | null;
}

export const calculatePowerLevel = (input: PowerCalcInput): number => {
  const building = totalBuildingPower(input.buildings);
  const level = playerLevelPower(input.playerLevel);
  const production = productionPower(input.buildings);
  const army = armyPower(input.armyData || null);
  const achieve = achievementPower(input.completedMilestones || []);

  const raw = building + level + production + army + achieve;

  // Round to nearest 10 for cleaner display
  return Math.round(raw / 10) * 10;
};

// ── Get Full Breakdown ────────────────────────────────────────────────────────

export const getPowerBreakdown = (input: PowerCalcInput): PowerBreakdown => {
  const building = totalBuildingPower(input.buildings);
  const level = playerLevelPower(input.playerLevel);
  const production = productionPower(input.buildings);
  const army = armyPower(input.armyData || null);
  const achieve = achievementPower(input.completedMilestones || []);

  const total = Math.round(((building + level + production + army + achieve) / 10)) * 10;

  return {
    buildingPower: building,
    levelPower: level,
    productionPower: production,
    armyPower: army,
    achievementPower: achieve,
    total,
  };
};

// ── Power Tiers ───────────────────────────────────────────────────────────────

export interface PowerTier {
  name: string;
  color: string;
  icon: string;
  minPower: number;
  maxPower: number;
}

export const POWER_TIERS: PowerTier[] = [
  { name: "Peasant", color: "#8B7355", icon: "🌾", minPower: 0, maxPower: 499 },
  { name: "Soldier", color: "#A0A0A0", icon: "⚔️", minPower: 500, maxPower: 1499 },
  { name: "Knight", color: "#C0C0C0", icon: "🛡️", minPower: 1500, maxPower: 2999 },
  { name: "Baron", color: "#CD7F32", icon: "🏰", minPower: 3000, maxPower: 5999 },
  { name: "Lord", color: "#C9960C", icon: "👑", minPower: 6000, maxPower: 9999 },
  { name: "Earl", color: "#E8B020", icon: "⚜️", minPower: 10000, maxPower: 19999 },
  { name: "Duke", color: "#FFD700", icon: "🔱", minPower: 20000, maxPower: 34999 },
  { name: "King", color: "#FF6B35", icon: "👑", minPower: 35000, maxPower: 49999 },
  { name: "Overlord", color: "#FF2D55", icon: "🔥", minPower: 50000, maxPower: Infinity },
];

export const getPowerTier = (power: number): PowerTier => {
  for (const tier of POWER_TIERS) {
    if (power >= tier.minPower && power <= tier.maxPower) {
      return tier;
    }
  }
  return POWER_TIERS[POWER_TIERS.length - 1];
};
