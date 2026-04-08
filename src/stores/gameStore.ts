import { create } from "zustand";
import {
  BUILDINGS,
  getMaxCount,
  getLevelBuildTimeMs,
  getResourceCollectorCapacity,
} from "@/game/config/buildings";
import { SCENARIOS } from "@/game/config/scenarios";
import { getUnitTrainingCost } from "@/game/config/units";
import { useXPSystem } from "@/hooks/game/useXPSystem";

// ──────────────────────────────────────────────────────────────────────────────
// DEV MODE FLAG - Set to false for production build
// When true: unlimited resources, all buildings unlocked, no cost deduction
// ──────────────────────────────────────────────────────────────────────────────
export const DEV_MODE = false;

export interface Building {
  id: string;
  type: BuildingType;
  level: number;
  slotIndex: number;
  damaged?: boolean;
  underConstruction?: boolean;
  constructionFinishesAt?: number;
  isUpgrade?: boolean;
  /** Amount of resource sitting in this building's collector, waiting to be harvested */
  collectedAmount?: number;
  /** Timestamp of the last resource production tick */
  lastTickAt?: number;
}

export type BuildingType =
  | "town-hall"
  | "farm"
  | "lumber-mill"
  | "quarry"
  | "iron-mine"
  | "barracks"
  | "warehouse"
  | "house"
  | "wall"
  | "tower"
  | "army-camp"
  | "laboratory";

export interface Unit {
  id: string;
  type: UnitType;
  tier: number;
  count: number;
}

export interface Obstacle {
  id: string;
  type: "tree" | "rock";
  slotIndex: number;
  clearing?: boolean;
  clearingFinishesAt?: number;
}

export type UnitType = "militia" | "swordsman" | "archer" | "cavalry";

export interface Resources {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
  gems: number;
}

export interface BattleResult {
  won: boolean;
  playerCasualties: Record<UnitType, number>;
  enemyCasualties: Record<string, number>;
  lootWon: Partial<Resources>;
  lootLost: Partial<Resources>;
  damagedBuildingId?: string;
  log: string[];
}

/** Tracks a builder slot. null = idle, string = building ID currently being built */
export interface BuilderSlot {
  id: number;
  buildingId: string | null;
}

export interface GameState {
  // Resources
  resources: Resources;
  resourceProduction: Resources;
  productionProgress: number; // 0 to 1

  // Buildings
  buildings: Building[];
  unlockedSlots: number[];
  obstacles: Obstacle[];

  // Builder queue
  builders: BuilderSlot[];
  unlockedBuilders: number;

  // Units & Research
  units: Unit[];
  unitLevels: Partial<Record<UnitType, number>>;
  activeResearch: { unitType: UnitType; finishesAt: number } | null;

  // Campaign
  currentScenario: number;
  currentDay: number;
  population: number;

  // Completed objectives (by id)
  completedObjectives: string[];

  // Last battle result (shown in BattleScene)
  lastBattleResult: BattleResult | null;

  // UI / Scene tracking
  currentScene: string;
  setCurrentScene: (scene: string) => void;

  // Actions
  addResources: (resources: Partial<Resources>) => void;
  consumeResources: (resources: Partial<Resources>) => boolean;
  addBuilding: (building: Building, options?: { skipXP?: boolean }) => void;
  upgradeBuilding: (buildingId: string) => void;
  finishConstructionInstantly: (buildingId: string) => void;
  sellBuilding: (buildingId: string) => {
    success: boolean;
    reason?: string;
    refund?: number;
  };
  completeConstruction: (buildingId: string) => void;
  /** Called on each per-building tick: adds production amount to the collector, up to capacity */
  tickBuildingCollector: (buildingId: string) => void;
  /** Harvest all collected resources from a building into player's global pool */
  collectFromBuilding: (
    buildingId: string,
  ) => { resource: string; amount: number } | null;
  trainUnit: (type: UnitType, count: number) => boolean;
  setScenario: (scenario: number) => void;
  checkObjectives: () => void;
  tickResources: () => Resources;
  endTurn: () => { resourcesGained: Resources; waveIndex: number };
  applyBattleResult: (result: BattleResult) => void;
  repairBuilding: (buildingId: string) => boolean;
  setProductionProgress: (progress: number) => void;
  moveBuilding: (buildingId: string, newSlot: number) => void;
  unlockNextBuilder: () => boolean;

  // Obstacles
  startClearingObstacle: (obstacleId: string) => void;
  completeClearingObstacle: (obstacleId: string) => void;
  finishObstacleInstantly: (obstacleId: string) => void;
  spawnInitialObstacles: () => void;

  // Laboratory / Research
  startResearch: (unitType: UnitType) => { allowed: boolean; reason?: string };
  completeResearch: () => void;
  fillProductionInstantly: (buildingId?: string | null) => void;

  // Helpers
  getTownHallLevel: () => number;
  getWarehouseCapacity: () => number;
  getTotalUnits: () => number;
  getMaxArmySize: () => number;
  getBuildingCount: (type: BuildingType) => number;
  canBuild: (type: BuildingType) => { allowed: boolean; reason?: string };
  getFreeBuilder: () => BuilderSlot | null;
  getBuilderCount: () => { total: number; busy: number };

  // Save/Load
  save: () => void;
  load: () => void;
  reset: () => void;
  importSupabaseData: (
    buildings: any[],
    resources: {
      wood: number;
      iron: number;
      food: number;
      stone: number;
      gem_balance: number;
    },
  ) => void;
}

const STORAGE_KEY = "kingdom-v10"; // bumped: fix coordinate swap bug in UpgradePanel
const TH_SLOT = 6 * 50 + 6; // Town Hall at (col=6, row=6)
const MAX_BUILDERS = 2;

const INITIAL_RESOURCES: Resources = {
  wood: 100,
  clay: 100,
  iron: 100,
  crop: 100,
  gems: 50,
};

const ARMY_SIZE_BY_TH: Record<number, number> = {
  1: 10,
  2: 25,
  3: 50,
  4: 75,
  5: 100,
};
const REPAIR_COST = { wood: 50, clay: 50, iron: 20, crop: 0 };

function makeBuilders(): BuilderSlot[] {
  return Array.from({ length: MAX_BUILDERS }, (_, i) => ({
    id: i,
    buildingId: null,
  }));
}

export const useGameState = create<GameState>((set, get) => ({
  resources: { ...INITIAL_RESOURCES },
  resourceProduction: { wood: 0, clay: 0, iron: 0, crop: 0, gems: 0 },
  productionProgress: 0,
  buildings: [
    {
      id: "town-hall-th",
      type: "town-hall" as BuildingType,
      level: 1,
      slotIndex: TH_SLOT,
    },
  ],
  unlockedSlots: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  obstacles: [],
  builders: makeBuilders(),
  unlockedBuilders: 1,
  units: [],
  unitLevels: { militia: 1, swordsman: 1, archer: 1, cavalry: 1 },
  activeResearch: null,
  currentScenario: 1,
  currentDay: 1,
  population: 0,
  completedObjectives: [],
  lastBattleResult: null,
  currentScene: "MainMenu",
  setCurrentScene: (scene) => set({ currentScene: scene }),

  // ── Resource helpers ──────────────────────────────────────────────────────
  addResources: (resources) => {
    const cap = get().getWarehouseCapacity();
    set((state) => ({
      resources: {
        wood: Math.min(state.resources.wood + (resources.wood || 0), cap),
        clay: Math.min(state.resources.clay + (resources.clay || 0), cap),
        iron: Math.min(state.resources.iron + (resources.iron || 0), cap),
        crop: Math.min(state.resources.crop + (resources.crop || 0), cap),
        gems: state.resources.gems + (resources.gems || 0),
      },
    }));
  },

  consumeResources: (res) => {
    const state = get();
    const { resources } = state;
    const need = {
      wood: res.wood ?? 0,
      clay: res.clay ?? 0,
      iron: res.iron ?? 0,
      crop: res.crop ?? 0,
      gems: res.gems ?? 0,
    };

    // ── DEV MODE: Bypass resource consumption ────────────────────────────────
    if (DEV_MODE) {
      return true; // Always allow - resources are unlimited
    }

    if (
      resources.wood < need.wood ||
      resources.clay < need.clay ||
      resources.iron < need.iron ||
      resources.crop < need.crop
    ) {
      return false;
    }
    set((s) => ({
      resources: {
        wood: s.resources.wood - need.wood,
        clay: s.resources.clay - need.clay,
        iron: s.resources.iron - need.iron,
        crop: s.resources.crop - need.crop,
        gems: s.resources.gems - need.gems,
      },
    }));
    return true;
  },

  setProductionProgress: (progress) => set({ productionProgress: progress }),

  // ── Builder helpers ───────────────────────────────────────────────────────
  getFreeBuilder: () => {
    // Sync builder occupancy: free up builders whose construction is done
    const now = Date.now();
    const { buildings, builders } = get();
    const updatedBuilders = builders.map((b) => {
      if (!b.buildingId) return b;
      const bldg = buildings.find((bl) => bl.id === b.buildingId);
      if (!bldg?.underConstruction) return { ...b, buildingId: null };
      if (bldg.constructionFinishesAt && now >= bldg.constructionFinishesAt) {
        return { ...b, buildingId: null };
      }
      return b;
    });
    set({ builders: updatedBuilders });
    // Only return a free builder if it falls within the unlocked limit
    const availablePool = updatedBuilders.slice(0, get().unlockedBuilders);
    return availablePool.find((b) => !b.buildingId) ?? null;
  },

  getBuilderCount: () => {
    const now = Date.now();
    const { buildings, builders } = get();
    const busy = builders.filter((b) => {
      if (!b.buildingId) return false;
      const bldg = buildings.find((bl) => bl.id === b.buildingId);
      if (!bldg?.underConstruction) return false;
      return !bldg.constructionFinishesAt || now < bldg.constructionFinishesAt;
    }).length;
    return { total: get().unlockedBuilders, busy };
  },

  unlockNextBuilder: () => {
    const state = get();
    if (state.unlockedBuilders >= MAX_BUILDERS) return false;

    // Check if player has enough gems (e.g., 500 gems)
    if (state.resources.gems < 500) return false;

    set({
      unlockedBuilders: state.unlockedBuilders + 1,
      resources: { ...state.resources, gems: state.resources.gems - 500 },
    });
    return true;
  },

  // ── Building helpers ──────────────────────────────────────────────────────
  addBuilding: (building, options?: { skipXP?: boolean }) => {
    const buildTime = getLevelBuildTimeMs(building.type, 1);
    const finishesAt = Date.now() + buildTime;
    const firstOfType = get().getBuildingCount(building.type) === 0;

    // Find a free builder and assign
    const freeBuilder = get().getFreeBuilder();
    const updatedBuilders = get().builders.map((b) =>
      b.id === (freeBuilder?.id ?? -1) ? { ...b, buildingId: building.id } : b,
    );

    set((state) => ({
      buildings: [
        ...state.buildings,
        {
          ...building,
          underConstruction: true,
          constructionFinishesAt: finishesAt,
          isUpgrade: false,
          lastTickAt: finishesAt, // Production starts AFTER construction finishes
        },
      ],
      builders: updatedBuilders,
    }));

    // FIXED: Skip XP awards for auto-placed buildings
    if (!options?.skipXP) {
      console.log("[XP] ✅ addBuilding awarding XP for:", building.type);
      if (firstOfType) {
        useXPSystem
          .getState()
          .awardXP("first_of_type", { buildingType: building.type });
      }
      useXPSystem
        .getState()
        .awardXP(firstOfType ? "place_building" : "place_building_repeat", {
          buildingType: building.type,
        });
    } else {
      console.log("[XP] ⏭️ addBuilding skipping XP (auto-placed):", building.type);
    }
  },

  finishConstructionInstantly: (buildingId: string) => {
    const building = get().buildings.find((b) => b.id === buildingId);
    if (!building || !building.underConstruction) return;

    const now = Date.now();
    const finishesAt = building.constructionFinishesAt ?? now;
    const remainingMs = Math.max(0, finishesAt - now);
    const gemCost = Math.ceil(remainingMs / 10000); // 1 gem per 10 seconds

    if (get().resources.gems < gemCost) return;

    set((state) => ({
      resources: {
        ...state.resources,
        gems: state.resources.gems - gemCost,
      },
    }));

    // Complete building immediately
    get().completeConstruction(buildingId);

    useXPSystem.getState().awardXP("speedup_used", { buildingId });
  },

  upgradeBuilding: (buildingId) => {
    const building = get().buildings.find((b) => b.id === buildingId);
    if (!building) return;

    const cfg = BUILDINGS[building.type];
    if (!cfg) return;

    // Check TH Level gate for upgrade
    const nextLevel = building.level + 1;
    const thLvl = get().getTownHallLevel();

    if (nextLevel > thLvl && building.type !== "town-hall") {
      // In many city builders, you can't upgrade a building past your TH level
      return;
    }

    // Simple logic: Max building level is often tied to TH level (e.g. max lvl = TH + some offset)
    // Or we rely on the config thLevelRequired for the NEXT stage if we have it.
    // For now, let's just make sure we check if an upgrade is allowed via canBuild style logic
    // but specific to level progression.

    const buildTime = getLevelBuildTimeMs(building.type, nextLevel);
    const finishesAt = Date.now() + buildTime;

    const freeBuilder = get().getFreeBuilder();
    const updatedBuilders = get().builders.map((b) =>
      b.id === (freeBuilder?.id ?? -1) ? { ...b, buildingId } : b,
    );

    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === buildingId
          ? {
              ...b,
              underConstruction: true,
              constructionFinishesAt: finishesAt,
              isUpgrade: true,
            }
          : b,
      ),
      builders: updatedBuilders,
    }));
  },

  sellBuilding: (buildingId) => {
    const building = get().buildings.find((b) => b.id === buildingId);
    if (!building) return { success: false, reason: "Building not found" };

    if (building.type === "town-hall") {
      return { success: false, reason: "Cannot sell Town Hall" };
    }

    const cfg = BUILDINGS[building.type];
    const sellValue = Math.floor((cfg?.baseCost?.wood ?? 100) * 0.5);
    const cap = get().getWarehouseCapacity();

    set((state) => ({
      buildings: state.buildings.filter((b) => b.id !== buildingId),
      resources: {
        ...state.resources,
        wood: Math.min(state.resources.wood + sellValue, cap),
      },
    }));

    return { success: true, refund: sellValue };
  },

  completeConstruction: (buildingId) => {
    const stateBefore = get();
    const bldgInfo = stateBefore.buildings.find((b) => b.id === buildingId);

    set((state) => {
      const buildings = state.buildings.map((b) => {
        if (b.id !== buildingId) return b;
        if (b.isUpgrade) {
          return {
            ...b,
            level: Math.min(b.level + 1, BUILDINGS[b.type]?.maxLevel ?? 3),
            underConstruction: false,
            constructionFinishesAt: undefined,
            isUpgrade: false,
            lastTickAt: Date.now(),
          };
        }
        return {
          ...b,
          underConstruction: false,
          constructionFinishesAt: undefined,
          lastTickAt: Date.now(),
        };
      });
      // Free up builder
      const builders = state.builders.map((b) =>
        b.buildingId === buildingId ? { ...b, buildingId: null } : b,
      );
      return { buildings, builders };
    });

    // Check for XP awards based on the snapshot we took before updating
    if (bldgInfo && bldgInfo.isUpgrade) {
      const newLvl = Math.min(
        bldgInfo.level + 1,
        BUILDINGS[bldgInfo.type]?.maxLevel ?? 3,
      );
      if (newLvl === 2)
        useXPSystem
          .getState()
          .awardXP("upgrade_building_l2", {
            buildingType: bldgInfo.type,
            buildingLevel: newLvl,
          });
      else if (newLvl === 3)
        useXPSystem
          .getState()
          .awardXP("upgrade_building_l3", {
            buildingType: bldgInfo.type,
            buildingLevel: newLvl,
          });
      else if (newLvl === 4)
        useXPSystem
          .getState()
          .awardXP("upgrade_building_l4", {
            buildingType: bldgInfo.type,
            buildingLevel: newLvl,
          });
      else if (newLvl === 5)
        useXPSystem
          .getState()
          .awardXP("upgrade_building_l5", {
            buildingType: bldgInfo.type,
            buildingLevel: newLvl,
          });
      else if (newLvl >= 6)
        useXPSystem
          .getState()
          .awardXP("upgrade_building_l6_plus", {
            buildingType: bldgInfo.type,
            buildingLevel: newLvl,
          });

      const maxLvl = BUILDINGS[bldgInfo.type]?.maxLevel ?? 3;
      if (newLvl >= maxLvl) {
        useXPSystem
          .getState()
          .awardXP("building_max_level", {
            buildingType: bldgInfo.type,
            buildingLevel: newLvl,
          });
      }
    }
  },

  fillProductionInstantly: (buildingId) => {
    set((state) => {
      const buildings = state.buildings.map((b) => {
        if (buildingId && b.id !== buildingId) return b;
        const maxCapacity = getResourceCollectorCapacity(b.type, b.level);
        if (maxCapacity <= 0) return b; // Not a collector or at level 0
        return {
          ...b,
          collectedAmount: maxCapacity,
          lastTickAt: Date.now(),
        };
      });
      return { buildings };
    });
  },

  repairBuilding: (buildingId) => {
    const state = get();
    if (!state.consumeResources(REPAIR_COST)) return false;
    set((s) => ({
      buildings: s.buildings.map((b) =>
        b.id === buildingId ? { ...b, damaged: false } : b,
      ),
    }));
    return true;
  },

  moveBuilding: (buildingId, newSlot) => {
    set((state) => ({
      buildings: state.buildings.map((b) =>
        b.id === buildingId ? { ...b, slotIndex: newSlot } : b,
      ),
    }));
  },

  // ── Per-building collector ─────────────────────────────────────────────────
  tickBuildingCollector: (buildingId) => {
    set((state) => {
      const buildings = state.buildings.map((b) => {
        if (b.id !== buildingId) return b;
        if (b.damaged || b.underConstruction) return b;

        const cfg = BUILDINGS[b.type];
        if (!cfg?.production || !cfg.collectorCapacity || !cfg.tickIntervalMs)
          return b;

        const now = Date.now();
        const lastTick = b.lastTickAt ?? now;
        const interval = cfg.tickIntervalMs;

        // If not enough time has passed for even one tick, skip
        if (now - lastTick < interval) return b;

        // Calculate how many intervals have passed
        const ticksPassed = Math.floor((now - lastTick) / interval);
        if (ticksPassed <= 0) return b;

        // Capacity is now looked up from gameConfig per level (no more formula)
        const maxCapacity = getResourceCollectorCapacity(b.type, b.level);
        const currentAmount = b.collectedAmount ?? 0;
        if (currentAmount >= maxCapacity) {
          return { ...b, lastTickAt: now }; // Full, just slide the window
        }

        // How much this building produces per tick (scales with level)
        const levelMult = 1 + (b.level - 1) * 0.5;
        const prodPerTick = Object.values(cfg.production)[0] ?? 10;
        const addedAmount = prodPerTick * levelMult * ticksPassed;

        return {
          ...b,
          collectedAmount: Math.min(currentAmount + addedAmount, maxCapacity),
          lastTickAt: lastTick + ticksPassed * interval,
        };
      });
      return { buildings };
    });
  },

  collectFromBuilding: (buildingId) => {
    const state = get();
    const building = state.buildings.find((b) => b.id === buildingId);
    if (!building) return null;

    const amount = building.collectedAmount ?? 0;
    if (amount <= 0) return null;

    const cfg = BUILDINGS[building.type];
    if (!cfg?.production) return null;

    // Determine which resource this building produces
    const resourceKey = Object.keys(
      cfg.production,
    )[0] as keyof typeof cfg.production;
    if (!resourceKey) return null;

    // Transfer to player resources
    get().addResources({ [resourceKey]: Math.floor(amount) });

    // Reset collector
    set((s) => ({
      buildings: s.buildings.map((b) =>
        b.id === buildingId ? { ...b, collectedAmount: 0 } : b,
      ),
    }));

    useXPSystem
      .getState()
      .awardXP("collect_resources", {
        buildingId,
        resourceAmount: Math.floor(amount),
      });

    return { resource: resourceKey, amount: Math.floor(amount) };
  },

  getBuildingCount: (type) => {
    return get().buildings.filter((b) => b.type === type).length;
  },

  getTownHallLevel: () => {
    const th = get().buildings.find((b) => b.type === "town-hall");
    // If TH is under construction (upgrade), use level before upgrade for gating
    return th?.level ?? 1;
  },

  getWarehouseCapacity: () => {
    // Each warehouse adds capacity based on its level
    // LV1: 500, LV2: 1000, LV3: 1500, etc.
    const warehouses = get().buildings.filter(
      (b) => b.type === "warehouse" && !b.underConstruction,
    );

    const warehouseCap = warehouses.reduce((sum, w) => sum + w.level * 500, 0);
    return 500 + warehouseCap; // 500 is the base TH capacity
  },

  getTotalUnits: () => {
    return get().units.reduce((sum, u) => sum + u.count, 0);
  },

  getMaxArmySize: () => {
    // Base capacity comes from TH level (fallback if no camps)
    const thLvl = get().getTownHallLevel();
    let totalCapacity = ARMY_SIZE_BY_TH[thLvl] ?? 10;

    // Add capacity from all active army camps
    const state = get();
    state.buildings.forEach((b) => {
      if (b.type === "army-camp" && !b.underConstruction) {
        const cfg = BUILDINGS[b.type];
        if (cfg && cfg.housingCapacity) {
          // A simplistic scaling: capacity grows by 50% per level (e.g. 20 -> 30 -> 40)
          totalCapacity += cfg.housingCapacity * (1 + 0.5 * (b.level - 1));
        }
      }
    });

    return Math.floor(totalCapacity);
  },

  canBuild: (type) => {
    const state = get();
    const cfg = BUILDINGS[type];
    if (!cfg) return { allowed: false, reason: "Unknown building" };

    // FIXED: Check if tutorial is active by checking the flag we set when tutorial starts
    // We set this flag when tutorial activates to ensure buildings are always unlocked during tutorial
    const isTutorialActive = localStorage.getItem("kingdom-tutorial-active") === "true";
    
    console.log("[canBuild] Checking:", type, { 
      thLvl: state.getTownHallLevel(), 
      required: cfg.thLevelRequired,
      isTutorialActive,
      buildingsCount: state.buildings.length,
      resources: state.resources
    });

    // ── DEV MODE: Bypass all requirements except builder availability ───────
    if (DEV_MODE) {
      const { busy, total } = state.getBuilderCount();
      if (busy >= total)
        return { allowed: false, reason: "All builders are busy!" };
      return { allowed: true }; // All buildings unlocked, no TH level requirements
    }

    // FIXED: Bypass TH level requirements during tutorial
    if (isTutorialActive) {
      const { busy, total } = state.getBuilderCount();
      if (busy >= total)
        return { allowed: false, reason: "All builders are busy!" };
      return { allowed: true };
    }

    // TH level gate
    const thLvl = state.getTownHallLevel();
    if (thLvl < cfg.thLevelRequired)
      return {
        allowed: false,
        reason: `Requires Town Hall Lv${cfg.thLevelRequired}`,
      };

    // Per-TH max count gate
    const maxCount = getMaxCount(type, thLvl);
    if (maxCount === 0)
      return {
        allowed: false,
        reason: `Requires Town Hall Lv${cfg.thLevelRequired}`,
      };
    if (maxCount !== -1 && state.getBuildingCount(type) >= maxCount)
      return {
        allowed: false,
        reason: `Max ${maxCount} at TH${thLvl} (upgrade TH for more)`,
      };

    // Builder availability
    const { busy, total } = state.getBuilderCount();
    if (busy >= total)
      return { allowed: false, reason: "All builders are busy!" };

    return { allowed: true };
  },

  // ── Laboratory / Research ─────────────────────────────────────────────────
  startResearch: (unitType) => {
    const state = get();
    // Check if lab exists and isn't upgrading
    const hasLab = state.buildings.some(
      (b) => b.type === "laboratory" && !b.underConstruction,
    );
    if (!hasLab) return { allowed: false, reason: "Requires Laboratory" };

    if (state.activeResearch)
      return { allowed: false, reason: "Already researching something" };

    const currentLevel = state.unitLevels[unitType] ?? 1;
    // Assuming max tier is 3 for all units right now based on units.ts
    // In a real app we'd map this from UNITS[unitType].maxTier
    if (currentLevel >= 3)
      return { allowed: false, reason: "Unit is at max level" };

    // We'll base research cost on the training cost * 5 for the NEXT tier
    // In a cleaner system, unit upgrades would have their own dedicated cost table!
    const nextTierCost = getUnitTrainingCost(unitType, currentLevel + 1);

    const researchCost = {
      wood: nextTierCost.wood * 5,
      clay: nextTierCost.clay * 4,
      iron: nextTierCost.iron * 5,
      crop: nextTierCost.crop * 2,
    };

    if (!state.consumeResources(researchCost))
      return { allowed: false, reason: "Not enough resources" };

    // Research takes 10 seconds per next level
    const researchTime = (currentLevel + 1) * 10000;

    set({
      activeResearch: {
        unitType,
        finishesAt: Date.now() + researchTime,
      },
    });

    return { allowed: true };
  },

  completeResearch: () => {
    const { activeResearch, unitLevels } = get();
    if (!activeResearch) return;

    const newLevel = (unitLevels[activeResearch.unitType] ?? 1) + 1;

    set({
      unitLevels: {
        ...unitLevels,
        [activeResearch.unitType]: newLevel,
      },
      activeResearch: null,
    });
  },

  // ── Unit training ─────────────────────────────────────────────────────────
  trainUnit: (type, count) => {
    const state = get();
    const total = state.getTotalUnits();
    const max = state.getMaxArmySize();
    const room = max - total;
    const actual = Math.min(count, room);
    if (actual <= 0) return false;

    set((s) => {
      const currentLevel = s.unitLevels[type] ?? 1;
      const existing = s.units.find(
        (u) => u.type === type && u.tier === currentLevel,
      );
      if (existing) {
        return {
          units: s.units.map((u) =>
            u.type === type && u.tier === currentLevel
              ? { ...u, count: u.count + actual }
              : u,
          ),
        };
      }
      return {
        units: [
          ...s.units,
          {
            id: `${type}-t${currentLevel}`,
            type,
            tier: currentLevel,
            count: actual,
          },
        ],
      };
    });
    return true;
  },

  // ── Real-time resource tick ───────────────────────────────────────────────
  tickResources: () => {
    const state = get();
    const prod: Resources = { wood: 0, clay: 0, iron: 0, crop: 0, gems: 0 };
    state.buildings.forEach((b) => {
      if (b.damaged || b.underConstruction) return; // Under construction doesn't produce
      const cfg = BUILDINGS[b.type];
      // Skip if it doesn't produce or if it has its own per-building collector timer
      if (!cfg?.production || cfg.tickIntervalMs) return;
      const mult = 1 + (b.level - 1) * 0.5;
      prod.wood += (cfg.production.wood ?? 0) * mult;
      prod.clay += (cfg.production.clay ?? 0) * mult;
      prod.iron += (cfg.production.iron ?? 0) * mult;
      prod.crop += (cfg.production.crop ?? 0) * mult;
    });
    get().addResources(prod);
    set({ resourceProduction: prod });
    return prod;
  },

  // ── Campaign: end turn ────────────────────────────────────────────────────
  endTurn: () => {
    const state = get();
    const prod: Resources = { wood: 0, clay: 0, iron: 0, crop: 0, gems: 0 };
    state.buildings.forEach((b) => {
      if (b.damaged || b.underConstruction) return;
      const cfg = BUILDINGS[b.type];
      // Skip if it doesn't produce or if it has its own per-building collector timer
      if (!cfg?.production || cfg.tickIntervalMs) return;
      const mult = 1 + (b.level - 1) * 0.5;
      prod.wood += (cfg.production.wood ?? 0) * mult;
      prod.clay += (cfg.production.clay ?? 0) * mult;
      prod.iron += (cfg.production.iron ?? 0) * mult;
      prod.crop += (cfg.production.crop ?? 0) * mult;
    });

    get().addResources(prod);
    const waveIndex = state.currentDay - 1;
    set((s) => ({ currentDay: s.currentDay + 1 }));
    set({ resourceProduction: prod });
    get().checkObjectives();
    return { resourcesGained: prod, waveIndex };
  },

  // ── Objectives ────────────────────────────────────────────────────────────
  checkObjectives: () => {
    const state = get();
    const scenario = SCENARIOS.find((s) => s.id === state.currentScenario);
    if (!scenario) return;

    const newCompleted = [...state.completedObjectives];

    scenario.objectives.forEach((obj) => {
      if (newCompleted.includes(obj.id)) return;

      let met = false;
      if (obj.type === "build" && typeof obj.target === "string") {
        const [bType, lvlStr] = obj.target.split(":");
        const lvl = parseInt(lvlStr ?? "1");
        if (obj.target.startsWith("total:")) {
          const total = parseInt(obj.target.split(":")[1]);
          met = state.buildings.length >= total;
        } else {
          met = state.buildings.some(
            (b) => b.type === bType && b.level >= lvl && !b.underConstruction,
          );
        }
      } else if (obj.type === "train" && typeof obj.target === "number") {
        met = state.getTotalUnits() >= obj.target;
      } else if (obj.type === "reach" && typeof obj.target === "number") {
        met = state.population >= obj.target;
      }

      if (met) newCompleted.push(obj.id);
    });

    if (newCompleted.length !== state.completedObjectives.length) {
      set({ completedObjectives: newCompleted });
    }
  },

  // ── Battle result ─────────────────────────────────────────────────────────
  applyBattleResult: (result) => {
    const cap = get().getWarehouseCapacity();
    set((state) => {
      let buildings = [...state.buildings];
      let resources = { ...state.resources };

      if (result.won) {
        resources = {
          wood: Math.min(resources.wood + (result.lootWon.wood ?? 0), cap),
          clay: Math.min(resources.clay + (result.lootWon.clay ?? 0), cap),
          iron: Math.min(resources.iron + (result.lootWon.iron ?? 0), cap),
          crop: Math.min(resources.crop + (result.lootWon.crop ?? 0), cap),
          gems: resources.gems + (result.lootWon.gems ?? 0),
        };
      } else {
        resources = {
          wood: Math.max(0, resources.wood - (result.lootLost.wood ?? 0)),
          clay: Math.max(0, resources.clay - (result.lootLost.clay ?? 0)),
          iron: Math.max(0, resources.iron - (result.lootLost.iron ?? 0)),
          crop: Math.max(0, resources.crop - (result.lootLost.crop ?? 0)),
          gems: Math.max(0, resources.gems - (result.lootLost.gems ?? 0)),
        };

        if (result.damagedBuildingId) {
          buildings = buildings.map((b) =>
            b.id === result.damagedBuildingId ? { ...b, damaged: true } : b,
          );
        }
      }

      const units = state.units
        .map((u) => {
          const lost = result.playerCasualties[u.type as UnitType] ?? 0;
          return { ...u, count: Math.max(0, u.count - lost) };
        })
        .filter((u) => u.count > 0);

      return { buildings, resources, units, lastBattleResult: result };
    });

    if (result.won) {
      const state = get();
      const scenario = SCENARIOS.find((s) => s.id === state.currentScenario);
      if (scenario) {
        const newCompleted = [...state.completedObjectives];
        scenario.objectives.forEach((obj) => {
          if (newCompleted.includes(obj.id)) return;
          if (obj.type === "survive") newCompleted.push(obj.id);
        });
        set({ completedObjectives: newCompleted });
      }
    }
  },

  setScenario: (scenario) => set({ currentScenario: scenario }),

  // ── Obstacles ─────────────────────────────────────────────────────────────

  spawnInitialObstacles: () => {
    if (get().obstacles.length > 0) return;

    const obstacles: Obstacle[] = [];
    const forbiddenSlots = new Set([TH_SLOT]); // Don't spawn on TH

    // Add surrounding 3x3 slots of TH to forbidden
    const thCol = TH_SLOT % 50;
    const thRow = Math.floor(TH_SLOT / 50);
    for (let r = thRow - 2; r <= thRow + 2; r++) {
      for (let c = thCol - 2; c <= thCol + 2; c++) {
        forbiddenSlots.add(r * 50 + c);
      }
    }

    // Spawn ~30 obstacles
    for (let i = 0; i < 30; i++) {
      let slot: number;
      let attempts = 0;
      do {
        const col = Math.floor(Math.random() * 40) + 5; // Stay in center-ish 40x40
        const row = Math.floor(Math.random() * 40) + 5;
        slot = row * 50 + col;
        attempts++;
      } while (
        (forbiddenSlots.has(slot) ||
          get().buildings.some((b) => b.slotIndex === slot) ||
          obstacles.some((o) => o.slotIndex === slot)) &&
        attempts < 100
      );

      if (attempts < 100) {
        obstacles.push({
          id: `obstacle-${i}-${Date.now()}`,
          type: Math.random() > 0.4 ? "tree" : "rock",
          slotIndex: slot,
        });
      }
    }
    set({ obstacles });
  },

  startClearingObstacle: (obstacleId) => {
    const obstacle = get().obstacles.find((o) => o.id === obstacleId);
    const builder = get().getFreeBuilder();

    if (!obstacle || !builder || obstacle.clearing) return;

    const clearingTime = obstacle.type === "tree" ? 10000 : 20000;
    const finishesAt = Date.now() + clearingTime;

    set((state) => ({
      builders: state.builders.map((b) =>
        b.id === builder.id ? { ...b, buildingId: obstacleId } : b,
      ),
      obstacles: state.obstacles.map((o) =>
        o.id === obstacleId
          ? { ...o, clearing: true, clearingFinishesAt: finishesAt }
          : o,
      ),
    }));
  },

  completeClearingObstacle: (obstacleId) => {
    const obstacle = get().obstacles.find((o) => o.id === obstacleId);
    if (!obstacle) return;

    // Gem reward
    const minGem = obstacle.type === "tree" ? 1 : 2;
    const maxGem = obstacle.type === "tree" ? 3 : 5;
    const reward = Math.floor(Math.random() * (maxGem - minGem + 1)) + minGem;

    set((state) => ({
      resources: {
        ...state.resources,
        gems: state.resources.gems + reward,
      },
      builders: state.builders.map((b) =>
        b.buildingId === obstacleId ? { ...b, buildingId: null } : b,
      ),
      obstacles: state.obstacles.filter((o) => o.id !== obstacleId),
    }));
  },

  finishObstacleInstantly: (obstacleId) => {
    const obstacle = get().obstacles.find((o) => o.id === obstacleId);
    if (!obstacle || !obstacle.clearing) return;

    const now = Date.now();
    const finishesAt = obstacle.clearingFinishesAt ?? now;
    const remainingMs = Math.max(0, finishesAt - now);
    const gemCost = Math.ceil(remainingMs / 5000); // 1 gem per 5 seconds for obstacles (cheaper)

    if (get().resources.gems < gemCost) return;

    set((state) => ({
      resources: {
        ...state.resources,
        gems: state.resources.gems - gemCost,
      },
    }));

    get().completeClearingObstacle(obstacleId);
  },

  save: () => {
    const state = get();
    const snapshotData = {
      resources: state.resources,
      buildings: state.buildings,
      units: state.units,
      currentScenario: state.currentScenario,
      currentDay: state.currentDay,
      population: state.population,
      completedObjectives: state.completedObjectives,
      obstacles: state.obstacles,
      savedAt: Date.now(),
    };
    const snapshot = JSON.stringify(snapshotData);
    localStorage.setItem(STORAGE_KEY, snapshot);

    // Dispatch event for GameStateProvider to handle cloud sync
    window.dispatchEvent(
      new CustomEvent("game:saveTriggered", {
        detail: {
          buildings: state.buildings,
          resources: state.resources,
        },
      }),
    );
  },

  load: () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const data = JSON.parse(saved);
      let buildings: Building[] = data.buildings || [];
      const hasTownHall = buildings.some((b) => b.type === "town-hall");
      if (!hasTownHall) {
        buildings = [
          {
            id: crypto.randomUUID(),
            type: "town-hall" as BuildingType,
            level: 1,
            slotIndex: TH_SLOT,
          },
          ...buildings,
        ];
      }
      // Fix: clear stale underConstruction state from old saves
      buildings = buildings.map((b) => {
        if (
          b.underConstruction &&
          b.constructionFinishesAt &&
          Date.now() >= b.constructionFinishesAt
        ) {
          const isUpgrade = b.isUpgrade ?? false;
          return {
            ...b,
            level: isUpgrade
              ? Math.min(b.level + 1, BUILDINGS[b.type]?.maxLevel ?? 3)
              : b.level,
            underConstruction: false,
            constructionFinishesAt: undefined,
            isUpgrade: false,
          };
        }
        return b;
      });
      set({
        resources: data.resources || INITIAL_RESOURCES,
        buildings,
        units: data.units || [],
        currentScenario: data.currentScenario || 1,
        currentDay: data.currentDay || 1,
        population: data.population || 0,
        completedObjectives: data.completedObjectives || [],
        obstacles: data.obstacles || [],
        builders: makeBuilders(), // Always reset builders on load
      });
    } catch (e) {
      console.error("Failed to load save:", e);
    }
  },

  reset: () => {
    set({
      resources: { ...INITIAL_RESOURCES },
      resourceProduction: { wood: 0, clay: 0, iron: 0, crop: 0, gems: 0 },
      buildings: [
        {
          id: "town-hall-th",
          type: "town-hall" as BuildingType,
          level: 1,
          slotIndex: TH_SLOT,
          lastTickAt: Date.now(),
        },
      ],
      builders: makeBuilders(),
      units: [],
      currentScenario: 1,
      currentDay: 1,
      population: 0,
      completedObjectives: [],
      obstacles: [],
      lastBattleResult: null,
    });
    localStorage.removeItem(STORAGE_KEY);
  },

  importSupabaseData: (supabaseBuildings, supabaseResources) => {
    // Map Supabase building types to GameStore types
    const typeMap: Record<string, BuildingType> = {
      town_hall: "town-hall",
      farm: "farm",
      lumber_mill: "lumber-mill",
      quarry: "quarry",
      iron_mine: "iron-mine",
      barracks: "barracks",
      warehouse: "warehouse",
      house: "house",
      wall: "wall",
      tower: "tower",
      army_camp: "army-camp",
      laboratory: "laboratory",
    };

    const buildings: Building[] = supabaseBuildings.map((b) => {
      const type =
        typeMap[b.building_type] || (b.building_type as BuildingType);
      const isConstructing =
        b.status === "building" || b.status === "upgrading";
      const finishesAt = b.construction_end
        ? new Date(b.construction_end).getTime()
        : undefined;

      return {
        id: b.id,
        type,
        level: b.level,
        slotIndex: b.grid_y * 50 + b.grid_x, // Reconstruct slotIndex from grid coords
        underConstruction: isConstructing,
        constructionFinishesAt: finishesAt,
        isUpgrade: b.status === "upgrading",
        lastTickAt: b.last_collected_at
          ? new Date(b.last_collected_at).getTime()
          : Date.now(),
      };
    });

    // Ensure we have a Town Hall if none imported (fallback)
    if (!buildings.some((b) => b.type === "town-hall")) {
      buildings.push({
        id: "town-hall-th",
        type: "town-hall",
        level: 1,
        slotIndex: TH_SLOT,
        lastTickAt: Date.now(),
      });
    }

    set({
      resources: {
        wood: supabaseResources.wood || 0,
        clay: supabaseResources.stone || 0, // 'stone' in DB is 'clay' in gameStore
        iron: supabaseResources.iron || 0,
        crop: supabaseResources.food || 0, // 'food' in DB is 'crop' in gameStore
        gems: supabaseResources.gem_balance || 0,
      },
      buildings,
      builders: makeBuilders(), // Reset builders: UI will re-occupy based on underConstruction flags
    });

    // Also update localStorage so they are in sync
    const state = get();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        resources: state.resources,
        buildings: state.buildings,
        units: state.units,
        currentScenario: state.currentScenario,
        currentDay: state.currentDay,
        population: state.population,
        completedObjectives: state.completedObjectives,
        obstacles: state.obstacles,
        savedAt: Date.now(),
      }),
    );
  },
}));
