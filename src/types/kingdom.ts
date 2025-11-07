import { Timestamp } from 'firebase/firestore';

export interface Position {
  x: number;
  y: number;
}

export interface Resources {
  gold: number;
  wood: number;
  stone: number;
  food: number;
}

export interface Building {
  id: string;
  type: BuildingType;
  level: number;
  position: Position;
  isConstructing: boolean;
  constructionEndTime?: number;
}

export enum BuildingType {
  TOWN_HALL = 'town_hall',
  FARM = 'farm',
  MINE = 'mine',
  LUMBER_MILL = 'lumber_mill',
  BARRACKS = 'barracks',
  WALL = 'wall',
  TOWER = 'tower',
  MARKET = 'market'
}

export interface Kingdom {
  id: string; // wallet address
  name: string;
  position: Position;
  resources: Resources;
  buildings: Building[];
  empireId?: string;
  lastUpdated: Timestamp;
  level: number;
  power: number;
}

export interface Empire {
  id: string;
  name: string;
  logo: string;
  color: string;
  boosts: {
    gold: number;
    wood: number;
    stone: number;
    food: number;
    buildSpeed: number;
    raidDefense: number;
  };
  partner: string;
  active: boolean;
  fee: number;
  playerCount: number;
  createdAt: Timestamp;
}

export interface Player {
  wallet: string;
  username?: string;
  kingdomId: string;
  joinedAt: Timestamp;
  stats: {
    totalRaids: number;
    successfulRaids: number;
    defenseWins: number;
    resourcesGathered: number;
  };
  stakedAmount?: number;
  lastRewardClaim?: Timestamp;
}

export interface Raid {
  id: string;
  attackerId: string;
  defenderId: string;
  timestamp: Timestamp;
  result: 'victory' | 'defeat';
  resourcesStolen: Resources;
  attackerLosses: number;
  defenderLosses: number;
}

export const BUILDING_COSTS: Record<BuildingType, { [level: number]: Resources }> = {
  [BuildingType.TOWN_HALL]: {
    1: { gold: 0, wood: 0, stone: 0, food: 0 },
    2: { gold: 500, wood: 300, stone: 200, food: 100 },
    3: { gold: 1500, wood: 900, stone: 600, food: 300 },
    4: { gold: 4000, wood: 2400, stone: 1600, food: 800 },
    5: { gold: 10000, wood: 6000, stone: 4000, food: 2000 }
  },
  [BuildingType.FARM]: {
    1: { gold: 100, wood: 50, stone: 0, food: 0 },
    2: { gold: 200, wood: 100, stone: 50, food: 0 },
    3: { gold: 400, wood: 200, stone: 100, food: 0 },
    4: { gold: 800, wood: 400, stone: 200, food: 0 },
    5: { gold: 1600, wood: 800, stone: 400, food: 0 }
  },
  [BuildingType.MINE]: {
    1: { gold: 150, wood: 100, stone: 0, food: 50 },
    2: { gold: 300, wood: 200, stone: 0, food: 100 },
    3: { gold: 600, wood: 400, stone: 0, food: 200 },
    4: { gold: 1200, wood: 800, stone: 0, food: 400 },
    5: { gold: 2400, wood: 1600, stone: 0, food: 800 }
  },
  [BuildingType.LUMBER_MILL]: {
    1: { gold: 120, wood: 0, stone: 80, food: 40 },
    2: { gold: 240, wood: 0, stone: 160, food: 80 },
    3: { gold: 480, wood: 0, stone: 320, food: 160 },
    4: { gold: 960, wood: 0, stone: 640, food: 320 },
    5: { gold: 1920, wood: 0, stone: 1280, food: 640 }
  },
  [BuildingType.BARRACKS]: {
    1: { gold: 300, wood: 200, stone: 150, food: 100 },
    2: { gold: 600, wood: 400, stone: 300, food: 200 },
    3: { gold: 1200, wood: 800, stone: 600, food: 400 },
    4: { gold: 2400, wood: 1600, stone: 1200, food: 800 },
    5: { gold: 4800, wood: 3200, stone: 2400, food: 1600 }
  },
  [BuildingType.WALL]: {
    1: { gold: 50, wood: 100, stone: 200, food: 0 },
    2: { gold: 100, wood: 200, stone: 400, food: 0 },
    3: { gold: 200, wood: 400, stone: 800, food: 0 },
    4: { gold: 400, wood: 800, stone: 1600, food: 0 },
    5: { gold: 800, wood: 1600, stone: 3200, food: 0 }
  },
  [BuildingType.TOWER]: {
    1: { gold: 200, wood: 150, stone: 250, food: 50 },
    2: { gold: 400, wood: 300, stone: 500, food: 100 },
    3: { gold: 800, wood: 600, stone: 1000, food: 200 },
    4: { gold: 1600, wood: 1200, stone: 2000, food: 400 },
    5: { gold: 3200, wood: 2400, stone: 4000, food: 800 }
  },
  [BuildingType.MARKET]: {
    1: { gold: 250, wood: 150, stone: 100, food: 100 },
    2: { gold: 500, wood: 300, stone: 200, food: 200 },
    3: { gold: 1000, wood: 600, stone: 400, food: 400 },
    4: { gold: 2000, wood: 1200, stone: 800, food: 800 },
    5: { gold: 4000, wood: 2400, stone: 1600, food: 1600 }
  }
};

export const BUILDING_PRODUCTION: Record<BuildingType, { resource: keyof Resources; amount: number }> = {
  [BuildingType.TOWN_HALL]: { resource: 'gold', amount: 10 },
  [BuildingType.FARM]: { resource: 'food', amount: 20 },
  [BuildingType.MINE]: { resource: 'stone', amount: 15 },
  [BuildingType.LUMBER_MILL]: { resource: 'wood', amount: 18 },
  [BuildingType.BARRACKS]: { resource: 'gold', amount: 0 },
  [BuildingType.WALL]: { resource: 'gold', amount: 0 },
  [BuildingType.TOWER]: { resource: 'gold', amount: 0 },
  [BuildingType.MARKET]: { resource: 'gold', amount: 25 }
};
