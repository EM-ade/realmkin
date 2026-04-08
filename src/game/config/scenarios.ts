export interface ScenarioConfig {
  id: number;
  name: string;
  description: string;
  startingResources: ResourceAmount;
  timeLimit?: number; // seconds, undefined = no limit
  objectives: Objective[];
  enemyWaves?: EnemyWave[];
  rewards: string[];
}

export interface ResourceAmount {
  wood: number;
  clay: number;
  iron: number;
  crop: number;
}

export interface Objective {
  id: string;
  description: string;
  type: 'build' | 'reach' | 'defeat' | 'survive' | 'train';
  target: string | number;
  completed: boolean;
}

export interface EnemyWave {
  delay: number; // seconds after scenario start
  units: { type: string; count: number }[];
}

export const SCENARIOS: ScenarioConfig[] = [
  {
    id: 1,
    name: 'First Steps',
    description: 'Learn the basics of village management.',
    startingResources: { wood: 500, clay: 500, iron: 500, crop: 500 },
    objectives: [
      {
        id: 'obj-1',
        description: 'Upgrade Town Hall to Level 2',
        type: 'build',
        target: 'town-hall:2',
        completed: false,
      },
      {
        id: 'obj-2',
        description: 'Build a Farm',
        type: 'build',
        target: 'farm:1',
        completed: false,
      },
      {
        id: 'obj-3',
        description: 'Build a Lumber Mill',
        type: 'build',
        target: 'lumber-mill:1',
        completed: false,
      },
    ],
    enemyWaves: [
      { delay: 0, units: [{ type: 'militia', count: 5 }] },
    ],
    rewards: ['Unlock Barracks'],
  },
  {
    id: 2,
    name: 'Expanding Village',
    description: 'Grow your population by building houses.',
    startingResources: { wood: 1000, clay: 1000, iron: 1000, crop: 1000 },
    timeLimit: 600, // 10 minutes
    objectives: [
      {
        id: 'obj-1',
        description: 'Reach 50 Population',
        type: 'reach',
        target: 50,
        completed: false,
      },
      {
        id: 'obj-2',
        description: 'Build 3 Houses',
        type: 'build',
        target: 'house:3',
        completed: false,
      },
    ],
    rewards: ['Unlock Quarry', 'Unlock Iron Mine'],
  },
  {
    id: 3,
    name: 'First Blood',
    description: 'Defend your village from enemy raids.',
    startingResources: { wood: 2000, clay: 2000, iron: 2000, crop: 2000 },
    timeLimit: 900, // 15 minutes
    enemyWaves: [
      { delay: 60, units: [{ type: 'militia', count: 10 }] },
      { delay: 180, units: [{ type: 'militia', count: 20 }, { type: 'swordsman', count: 5 }] },
      { delay: 360, units: [{ type: 'swordsman', count: 15 }, { type: 'archer', count: 10 }] },
    ],
    objectives: [
      {
        id: 'obj-1',
        description: 'Survive All Waves',
        type: 'survive',
        target: 3,
        completed: false,
      },
      {
        id: 'obj-2',
        description: 'Build a Barracks',
        type: 'build',
        target: 'barracks:1',
        completed: false,
      },
    ],
    rewards: ['Unlock Unit Tiers 2 & 3'],
  },
  {
    id: 4,
    name: 'Full Potential',
    description: 'Unlock and use all building slots.',
    startingResources: { wood: 5000, clay: 5000, iron: 5000, crop: 5000 },
    timeLimit: 1200, // 20 minutes
    objectives: [
      {
        id: 'obj-1',
        description: 'Unlock All 12 Building Slots',
        type: 'reach',
        target: 12,
        completed: false,
      },
      {
        id: 'obj-2',
        description: 'Have 12 Buildings Built',
        type: 'build',
        target: 'total:12',
        completed: false,
      },
    ],
    rewards: ['Unlock Warehouse Upgrades'],
  },
  {
    id: 5,
    name: 'The Final Battle',
    description: 'Train a mighty army and defeat the enemy boss.',
    startingResources: { wood: 10000, clay: 10000, iron: 10000, crop: 10000 },
    timeLimit: 1500, // 25 minutes
    enemyWaves: [
      { delay: 120, units: [{ type: 'militia', count: 50 }] },
      { delay: 300, units: [{ type: 'swordsman', count: 30 }, { type: 'archer', count: 20 }] },
      { delay: 600, units: [{ type: 'cavalry', count: 25 }, { type: 'swordsman', count: 25 }] },
      { delay: 900, units: [{ type: 'boss', count: 1 }, { type: 'cavalry', count: 20 }] },
    ],
    objectives: [
      {
        id: 'obj-1',
        description: 'Train 50 Units',
        type: 'train',
        target: 50,
        completed: false,
      },
      {
        id: 'obj-2',
        description: 'Defeat the Boss Army',
        type: 'defeat',
        target: 'boss',
        completed: false,
      },
    ],
    rewards: ['Complete Campaign', 'Unlock Sandbox Mode'],
  },
];

export function getScenario(id: number): ScenarioConfig | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
