export interface XPAction {
  id: string;
  displayName: string;
  baseXP: number;
  cooldownMs: number;
  maxPerDay: number;
  isOneTime: boolean;
  category: XPCategory;
  requiresCondition?: string;
}

export type XPCategory =
  | "building"
  | "resource"
  | "login"
  | "tutorial"
  | "economy"
  | "milestone";

export interface LevelReward {
  type: RewardType;
  amount?: number;
  resourceType?: "wood" | "stone" | "iron" | "food" | "gems";
  description: string;
  isExclusive: boolean;
}

export type RewardType = "gems" | "resources";

export interface LevelDefinition {
  level: number;
  xpRequired: number; // XP to reach THIS level from the previous level
  totalXPRequired: number; // Cumulative XP from 0
  reward: LevelReward;
}

export const XP_ACTIONS: Record<string, XPAction> = {
  place_building: {
    id: "place_building",
    displayName: "Building Placed",
    baseXP: 50,
    cooldownMs: 0,
    maxPerDay: 500,
    isOneTime: false,
    category: "building",
    requiresCondition: "building_exists_60s",
  },
  place_building_repeat: {
    id: "place_building_repeat",
    displayName: "Building Placed",
    baseXP: 15,
    cooldownMs: 0,
    maxPerDay: 300,
    isOneTime: false,
    category: "building",
    requiresCondition: "building_exists_60s",
  },
  upgrade_building_l2: {
    id: "upgrade_building_l2",
    displayName: "Upgraded to Level 2",
    baseXP: 30,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: false,
    category: "building",
  },
  upgrade_building_l3: {
    id: "upgrade_building_l3",
    displayName: "Upgraded to Level 3",
    baseXP: 50,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: false,
    category: "building",
  },
  upgrade_building_l4: {
    id: "upgrade_building_l4",
    displayName: "Upgraded to Level 4",
    baseXP: 80,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: false,
    category: "building",
  },
  upgrade_building_l5: {
    id: "upgrade_building_l5",
    displayName: "Upgraded to Level 5",
    baseXP: 120,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: false,
    category: "building",
  },
  upgrade_building_l6_plus: {
    id: "upgrade_building_l6_plus",
    displayName: "Upgraded High Level Building",
    baseXP: 200,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: false,
    category: "building",
  },
  building_max_level: {
    id: "building_max_level",
    displayName: "Max Level Building!",
    baseXP: 300,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: false,
    category: "building",
  },
  first_of_type: {
    id: "first_of_type",
    displayName: "First of its Kind!",
    baseXP: 100,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "building",
  },
  collect_resources: {
    id: "collect_resources",
    displayName: "Resources Collected",
    baseXP: 5,
    cooldownMs: 5 * 60 * 1000, // 5 mins
    maxPerDay: 500,
    isOneTime: false,
    category: "resource",
  },
  collect_all: {
    id: "collect_all",
    displayName: "Mass Collection",
    baseXP: 25,
    cooldownMs: 10 * 60 * 1000, // 10 mins
    maxPerDay: 500,
    isOneTime: false,
    category: "resource",
  },
  resource_milestone_1000: {
    id: "resource_milestone_1000",
    displayName: "Collected 1,000 Resources",
    baseXP: 100,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "milestone",
  },
  resource_milestone_10000: {
    id: "resource_milestone_10000",
    displayName: "Collected 10,000 Resources",
    baseXP: 300,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "milestone",
  },
  daily_login: {
    id: "daily_login",
    displayName: "Daily Login",
    baseXP: 0,
    cooldownMs: 12 * 60 * 60 * 1000,
    maxPerDay: 0,
    isOneTime: false,
    category: "login",
  },
  login_streak_3: {
    id: "login_streak_3",
    displayName: "3 Day Streak",
    baseXP: 0,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "login",
  },
  login_streak_7: {
    id: "login_streak_7",
    displayName: "7 Day Streak!",
    baseXP: 0,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "login",
  },
  login_streak_14: {
    id: "login_streak_14",
    displayName: "14 Day Streak!",
    baseXP: 0,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "login",
  },
  login_streak_30: {
    id: "login_streak_30",
    displayName: "30 Day Streak Target!",
    baseXP: 0,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "login",
  },
  tutorial_step: {
    id: "tutorial_step",
    displayName: "Tutorial Step Complete",
    baseXP: 25,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: false,
    category: "tutorial",
  },
  tutorial_complete: {
    id: "tutorial_complete",
    displayName: "Tutorial Complete!",
    baseXP: 50,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "tutorial",
  },
  first_gem_spend: {
    id: "first_gem_spend",
    displayName: "First Gem Purchase",
    baseXP: 200,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "economy",
  },
  speedup_used: {
    id: "speedup_used",
    displayName: "Used Speedup",
    baseXP: 15,
    cooldownMs: 0,
    maxPerDay: 150,
    isOneTime: false,
    category: "economy",
  },
  autominer_purchased: {
    id: "autominer_purchased",
    displayName: "Autominer Purchased",
    baseXP: 250,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "economy",
  },
  first_building_placed: {
    id: "first_building_placed",
    displayName: "Village Heart Founded",
    baseXP: 100,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "milestone",
  },
  first_upgrade_done: {
    id: "first_upgrade_done",
    displayName: "First Upgrade Done",
    baseXP: 100,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "milestone",
  },
  first_collection: {
    id: "first_collection",
    displayName: "First Harvest",
    baseXP: 50,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "milestone",
  },
  village_level_5_buildings: {
    id: "village_level_5_buildings",
    displayName: "5 Buildings Placed",
    baseXP: 150,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "milestone",
  },
  village_level_10_buildings: {
    id: "village_level_10_buildings",
    displayName: "10 Buildings Placed",
    baseXP: 300,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "milestone",
  },
  village_level_20_buildings: {
    id: "village_level_20_buildings",
    displayName: "Bustling Town",
    baseXP: 500,
    cooldownMs: 0,
    maxPerDay: 0,
    isOneTime: true,
    category: "milestone",
  },
};

// Mathematically derived curve for XP: Cumulative XP = 100 * (Level - 1) ^ 1.8
export const XP_FORMULA = (level: number): number => {
  if (level <= 1) return 0;
  return Math.floor(100 * Math.pow(level - 1, 1.8));
};

// Simplified rewards schedule - only working reward types (gems + resources)
const BASE_REWARD_TABLE: Record<number, LevelReward> = {
  1: {
    type: "gems",
    amount: 10,
    description: "Welcome to your Kingdom! Here are some starter gems.",
    isExclusive: false,
  },
  2: {
    type: "gems",
    amount: 50,
    description: "Your village is growing! Found some gems.",
    isExclusive: false,
  },
  3: {
    type: "resources",
    amount: 300,
    resourceType: "wood",
    description: "Lumber shipment arrived for construction.",
    isExclusive: false,
  },
  4: {
    type: "resources",
    amount: 500,
    resourceType: "wood",
    description: "Major shipment of wood arrived.",
    isExclusive: false,
  },
  5: {
    type: "gems",
    amount: 75,
    description: "Milestone reached! Gem bundle unlocked.",
    isExclusive: false,
  },
  6: {
    type: "resources",
    amount: 400,
    resourceType: "stone",
    description: "Stone quarry bonus delivery.",
    isExclusive: false,
  },
  7: {
    type: "gems",
    amount: 100,
    description: "Valuable vein discovered!",
    isExclusive: false,
  },
  8: {
    type: "resources",
    amount: 600,
    resourceType: "wood",
    description: "Large timber supply drop.",
    isExclusive: false,
  },
  9: {
    type: "resources",
    amount: 1000,
    resourceType: "stone",
    description: "Quarry production overflow.",
    isExclusive: false,
  },
  10: {
    type: "gems",
    amount: 150,
    description: "Grand Milestone! Gem chest unlocked.",
    isExclusive: false,
  },
};

// Generates the 30-level array using formula and base table
export const LEVEL_TABLE: LevelDefinition[] = Array.from({ length: 30 }).map(
  (_, i) => {
    const level = i + 1;
    const totalXPRequired = XP_FORMULA(level);
    const prevXP = XP_FORMULA(level - 1);
    const xpRequired = level === 1 ? 0 : totalXPRequired - prevXP;

    let reward = BASE_REWARD_TABLE[level];
    if (!reward) {
      // Procedural rewards for levels 11-30
      if (level % 10 === 0) {
        // Levels 20, 30: Big gem reward
        reward = {
          type: "gems",
          amount: 150 + (level / 10) * 100,
          description: `Level ${level} milestone! Large gem chest.`,
          isExclusive: false,
        };
      } else if (level % 5 === 0) {
        // Levels 15, 25: Medium gem reward
        reward = {
          type: "gems",
          amount: 200 + (level / 5) * 50,
          description: `Milestone reached! Gem bundle.`,
          isExclusive: false,
        };
      } else {
        // All other levels: Resource rewards (rotate between types)
        const resourceTypes: Array<"wood" | "stone" | "iron" | "food"> = ["wood", "stone", "iron", "food"];
        const resourceType = resourceTypes[level % 4];
        reward = {
          type: "resources",
          amount: 400 + level * 100,
          resourceType,
          description: `Level ${level} supply drop`,
          isExclusive: false,
        };
      }
    }

    return {
      level,
      xpRequired,
      totalXPRequired,
      reward,
    };
  },
);
