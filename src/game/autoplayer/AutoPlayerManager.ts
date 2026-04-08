import type { BuildingType, Building, Resources } from "@/stores/gameStore";
import { useGameState } from "@/stores/gameStore";

export interface AutoPlayerCollectionResult {
  wood: number;
  stone: number;
  iron: number;
  food: number;
  collections: number;
}

export class AutoPlayerManager {
  private static instance: AutoPlayerManager;
  private intervalId: NodeJS.Timer | null = null;
  private onCollectionCallback: ((result: AutoPlayerCollectionResult) => void) | null = null;

  public static getInstance(): AutoPlayerManager {
    if (!AutoPlayerManager.instance) {
      AutoPlayerManager.instance = new AutoPlayerManager();
    }
    return AutoPlayerManager.instance;
  }

  public setCollectionCallback(cb: (result: AutoPlayerCollectionResult) => void) {
    this.onCollectionCallback = cb;
  }

  public start() {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.tick(), 60_000); // every 60s
    console.log("Autominer online.");
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId as unknown as ReturnType<typeof setInterval>);
      this.intervalId = null;
      console.log("Autominer offline.");
    }
  }

  private tick() {
    if (document.visibilityState !== "visible") return;

    const state = useGameState.getState();
    const { buildings, getBuildingCount } = state;

    // Check if farm exists (has autominer means farm exists)
    const farmCount = getBuildingCount("farm");
    if (farmCount === 0) return;

    const now = Date.now();
    let result: AutoPlayerCollectionResult = {
      wood: 0, stone: 0, iron: 0, food: 0, collections: 0,
    };

    for (const b of buildings) {
      if (b.underConstruction) continue;

      const lastTick = b.lastTickAt ?? now;
      const elapsedMs = now - lastTick;
      const resourceType = this.getResourceType(b.type);

      if (resourceType && elapsedMs > 60_000) {
        const capacity = b.collectedAmount ?? 0;
        if (capacity > 0) {
          state.collectFromBuilding(b.id);
          result[resourceType as keyof typeof result] += Math.floor(capacity);
          result.collections++;
        }
      }
    }

    if (result.collections > 0 && this.onCollectionCallback) {
      this.onCollectionCallback(result);
    }
  }

  private getResourceType(bType: BuildingType): keyof Resources | null {
    const map: Partial<Record<BuildingType, keyof Resources>> = {
      farm: "crop",
      "lumber-mill": "wood",
      quarry: "clay",
      "iron-mine": "iron",
    };
    return map[bType] || null;
  }
}

export const autoPlayerManager = AutoPlayerManager.getInstance();
