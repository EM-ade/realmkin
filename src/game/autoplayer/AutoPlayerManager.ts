// src/game/autoplayer/AutoPlayerManager.ts
import { useGameState } from "@/stores/gameStore";
import { useAuth } from "@/components/game/providers/GameAuthProvider";

export interface AutoPlayerCollectionResult {
  wood: number;
  stone: number;
  iron: number;
  food: number;
  collections: number;
}

class AutoPlayerManager {
  private static instance: AutoPlayerManager;
  private intervalId: NodeJS.Timer | null = null;
  private tickRate = 60000; // 60 seconds

  private onCollectionCallback:
    | ((result: AutoPlayerCollectionResult) => void)
    | null = null;

  public static getInstance(): AutoPlayerManager {
    if (!AutoPlayerManager.instance) {
      AutoPlayerManager.instance = new AutoPlayerManager();
    }
    return AutoPlayerManager.instance;
  }

  public setCollectionCallback(
    cb: (result: AutoPlayerCollectionResult) => void,
  ) {
    this.onCollectionCallback = cb;
  }

  public start() {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => this.tick(), this.tickRate);
    console.log("Autominer online. Background collection active.");
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("Autominer offline.");
    }
  }

  private tick() {
    // Only run if the document is visible
    if (document.visibilityState !== "visible") return;

    const state = useGameState.getState();
    const player = state.player;
    // We check locally if the player has it unlocked; alternatively useAuth() state
    // But since it's a global singleton, we fetch from the Zustand store.
    if (!player || !player.has_autominer) return;

    const buildings = state.buildings;
    const now = new Date().getTime();

    // The autominer simulates player clicking .collectFromBuilding
    // We will do a batch collection and track totals to notify the UI
    let result: AutoPlayerCollectionResult = {
      wood: 0,
      stone: 0,
      iron: 0,
      food: 0,
      collections: 0,
    };

    // Since collectFromBuilding updates state heavily, doing it iteratively might be slow
    // But since we have few buildings (max ~20-30), it's fine for now to call the store directly:
    for (const b of buildings) {
      // Is it idle and has it passed 60s?
      // Just call state.collectFromBuilding. To cleanly report totals, we calculate before calling,
      // or we bypass the UI interaction limitation and do it directly here.
      if (b.status === "idle" && b.last_collected_at) {
        const lastCollected = new Date(b.last_collected_at).getTime();
        const elapsedHours = (now - lastCollected) / (60 * 60 * 1000);

        if (elapsedHours > 0.016) {
          // ~1 minute worth
          const resourceType = this.getResourceType(b.building_type);
          const amount = Math.floor(b.production_rate * elapsedHours);

          if (amount > 0 && resourceType) {
            // Call actual collection trigger
            state.collectFromBuilding(b.id, false); // pass false/true for explicit user action

            result[resourceType as keyof AutoPlayerCollectionResult] += amount;
            result.collections++;
          }
        }
      }
    }

    if (result.collections > 0 && this.onCollectionCallback) {
      this.onCollectionCallback(result);
    }
  }

  private getResourceType(bType: string): string | null {
    const map: Record<string, string> = {
      farm: "food",
      lumber_mill: "wood",
      quarry: "stone",
      iron_mine: "iron",
    };
    return map[bType] || null;
  }
}

export const autoPlayerManager = AutoPlayerManager.getInstance();
