// ──────────────────────────────────────────────────────────────────────────────
// TITLES SYSTEM
// Titles are EARNED, not purchased. They display under the player's username.
// ──────────────────────────────────────────────────────────────────────────────

export type TitleRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export const TITLE_RARITY_COLORS: Record<TitleRarity, string> = {
  common: "#8B7355",
  uncommon: "#A0A0A0",
  rare: "#4A90D9",
  epic: "#C9960C",
  legendary: "#FF6B35",
};

export interface Title {
  id: string;
  name: string;
  description: string;
  rarity: TitleRarity;
  color: string;
  requirement: string;
  isDefault?: boolean;
  isSeasonExclusive?: boolean;
  season?: number;
  powerLevelRequired?: number;
  levelRequired?: number;
  buildingRequired?: { type: string; level: number };
  streakRequired?: number;
}

export const TITLES: Record<string, Title> = {
  // ── STARTER TITLES (everyone gets these) ──
  realm_born: {
    id: "realm_born",
    name: "Realm Born",
    description: "You entered the Realm.",
    rarity: "common",
    color: TITLE_RARITY_COLORS.common,
    requirement: "Complete account creation",
    isDefault: true,
  },
  builder: {
    id: "builder",
    name: "Builder",
    description: "Your first building stands.",
    rarity: "common",
    color: TITLE_RARITY_COLORS.common,
    requirement: "Place your first building",
    buildingRequired: { type: "any", level: 1 },
  },

  // ── PROGRESSION TITLES ──
  village_elder: {
    id: "village_elder",
    name: "Village Elder",
    description: "Your village has grown.",
    rarity: "uncommon",
    color: TITLE_RARITY_COLORS.uncommon,
    requirement: "Reach level 5",
    levelRequired: 5,
  },
  master_builder: {
    id: "master_builder",
    name: "Master Builder",
    description: "No structure is beyond your skill.",
    rarity: "uncommon",
    color: TITLE_RARITY_COLORS.uncommon,
    requirement: "Place every building type",
  },
  iron_willed: {
    id: "iron_willed",
    name: "Iron Willed",
    description: "Your mines run deep.",
    rarity: "rare",
    color: TITLE_RARITY_COLORS.rare,
    requirement: "Upgrade Iron Mine to level 5",
    buildingRequired: { type: "iron-mine", level: 5 },
  },
  the_devoted: {
    id: "the_devoted",
    name: "The Devoted",
    description: "The Realm is your home.",
    rarity: "rare",
    color: TITLE_RARITY_COLORS.rare,
    requirement: "30 day login streak",
    streakRequired: 30,
  },
  resource_barons: {
    id: "resource_barons",
    name: "Resource Baron",
    description: "Your production is unmatched.",
    rarity: "rare",
    color: TITLE_RARITY_COLORS.rare,
    requirement: "Reach power level 5,000",
    powerLevelRequired: 5000,
  },

  // ── HIGH TIER TITLES ──
  overlord: {
    id: "overlord",
    name: "Overlord",
    description: "Your power is undeniable.",
    rarity: "epic",
    color: TITLE_RARITY_COLORS.epic,
    requirement: "Reach power level 20,000",
    powerLevelRequired: 20000,
  },
  kingdom_founder: {
    id: "kingdom_founder",
    name: "Kingdom Founder",
    description: "You built an empire from nothing.",
    rarity: "epic",
    color: TITLE_RARITY_COLORS.epic,
    requirement: "Reach power level 35,000",
    powerLevelRequired: 35000,
  },

  // ── SEASON EXCLUSIVE ──
  season_champion: {
    id: "season_champion",
    name: "Season Champion",
    description: "Season 1: Rise of the Realm — Top 10.",
    rarity: "legendary",
    color: TITLE_RARITY_COLORS.legendary,
    requirement: "Top 10 power level at season end",
    isSeasonExclusive: true,
    season: 1,
  },
  initium: {
    id: "initium",
    name: "Initium",
    description: "You were here at the beginning.",
    rarity: "legendary",
    color: TITLE_RARITY_COLORS.legendary,
    requirement: "Joined during Season 1 launch week",
    isSeasonExclusive: true,
    season: 1,
  },
};

// ── Helper Functions ──────────────────────────────────────────────────────────

export const getTitleById = (id: string): Title | undefined => {
  return TITLES[id];
};

export const getAllTitles = (): Title[] => {
  return Object.values(TITLES);
};

export const getTitlesByRarity = (rarity: TitleRarity): Title[] => {
  return Object.values(TITLES).filter((t) => t.rarity === rarity);
};

export const checkTitleUnlock = (
  title: Title,
  context: {
    powerLevel: number;
    playerLevel: number;
    loginStreak: number;
    buildings: Array<{ type: string; level: number }>;
    buildingTypesPlaced: Set<string>;
  },
): boolean => {
  // Check power level requirement
  if (title.powerLevelRequired && context.powerLevel < title.powerLevelRequired) {
    return false;
  }

  // Check player level requirement
  if (title.levelRequired && context.playerLevel < title.levelRequired) {
    return false;
  }

  // Check login streak requirement
  if (title.streakRequired && context.loginStreak < title.streakRequired) {
    return false;
  }

  // Check building requirement
  if (title.buildingRequired) {
    if (title.buildingRequired.type === "any") {
      if (context.buildings.length === 0) return false;
    } else {
      const hasBuilding = context.buildings.some(
        (b) => b.type === title.buildingRequired!.type && b.level >= title.buildingRequired!.level,
      );
      if (!hasBuilding) return false;
    }
  }

  return true;
};
