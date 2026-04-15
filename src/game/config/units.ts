export interface UnitConfig {
  id: string;
  name: string;
  description: string;
  maxTier: number;
  trainingCost: ResourceCost;
  trainingTime: number; // ms
  stats: UnitStats;
  requires?: string;
}

export interface ResourceCost {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

export interface UnitStats {
  attack: number;
  defense: number;
  health: number;
  speed: number;
  upkeep: number; // crop per hour
}

export const UNITS: Record<string, UnitConfig> = {
  'militia': {
    id: 'militia',
    name: 'Militia',
    description: 'Basic village defenders. Cheap to train but weak in combat.',
    maxTier: 3,
    trainingCost: { wood: 10, clay: 0, iron: 5, crop: 20 },
    trainingTime: 5000,
    stats: { attack: 5, defense: 8, health: 20, speed: 4, upkeep: 1 },
  },
  'swordsman': {
    id: 'swordsman',
    name: 'Swordsman',
    description: 'Trained melee fighters. Good balance of attack and defense.',
    maxTier: 3,
    trainingCost: { wood: 20, clay: 0, iron: 30, crop: 30 },
    trainingTime: 8000,
    stats: { attack: 15, defense: 12, health: 35, speed: 5, upkeep: 2 },
    requires: 'barracks',
  },
  'archer': {
    id: 'archer',
    name: 'Archer',
    description: 'Ranged attackers. Strong against cavalry but weak to swordsmen.',
    maxTier: 3,
    trainingCost: { wood: 40, clay: 0, iron: 15, crop: 25 },
    trainingTime: 7000,
    stats: { attack: 18, defense: 8, health: 25, speed: 6, upkeep: 2 },
    requires: 'barracks',
  },
  'cavalry': {
    id: 'cavalry',
    name: 'Cavalry',
    description: 'Mounted warriors. Fast and powerful but expensive.',
    maxTier: 3,
    trainingCost: { wood: 30, clay: 0, iron: 50, crop: 60 },
    trainingTime: 12000,
    stats: { attack: 25, defense: 15, health: 50, speed: 10, upkeep: 4 },
    requires: 'barracks',
  },
};

export function getUnitTrainingCost(unitId: string, tier: number): ResourceCost {
  const unit = UNITS[unitId];
  if (!unit) {
    return { wood: 0, clay: 0, iron: 0, crop: 0 };
  }
  
  const multiplier = Math.pow(1.5, tier - 1);
  
  return {
    wood: Math.floor(unit.trainingCost.wood * multiplier),
    clay: Math.floor(unit.trainingCost.clay * multiplier),
    iron: Math.floor(unit.trainingCost.iron * multiplier),
    crop: Math.floor(unit.trainingCost.crop * multiplier),
  };
}

export function getUnitStats(unitId: string, tier: number): UnitStats {
  const unit = UNITS[unitId];
  if (!unit) {
    return { attack: 0, defense: 0, health: 0, speed: 0, upkeep: 0 };
  }
  
  const multiplier = 1 + (tier - 1) * 0.3;
  
  return {
    attack: Math.floor(unit.stats.attack * multiplier),
    defense: Math.floor(unit.stats.defense * multiplier),
    health: Math.floor(unit.stats.health * multiplier),
    speed: unit.stats.speed,
    upkeep: Math.floor(unit.stats.upkeep * multiplier),
  };
}

// Rock-paper-scissors combat modifiers
export const COMBAT_MODIFIERS: Record<string, Record<string, number>> = {
  'militia': { 'militia': 1.0, 'swordsman': 0.7, 'archer': 0.8, 'cavalry': 0.6 },
  'swordsman': { 'militia': 1.2, 'swordsman': 1.0, 'archer': 0.7, 'cavalry': 0.8 },
  'archer': { 'militia': 1.1, 'swordsman': 1.3, 'archer': 1.0, 'cavalry': 0.6 },
  'cavalry': { 'militia': 1.4, 'swordsman': 1.2, 'archer': 1.5, 'cavalry': 1.0 },
};

export function getCombatModifier(attacker: string, defender: string): number {
  return COMBAT_MODIFIERS[attacker]?.[defender] || 1.0;
}
