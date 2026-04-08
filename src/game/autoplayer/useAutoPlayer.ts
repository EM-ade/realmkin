// src/game/autoplayer/useAutoPlayer.ts
import { useEffect, useState } from "react";
import {
  autoPlayerManager,
  AutoPlayerCollectionResult,
} from "./AutoPlayerManager";
import { useGameState } from "@/stores/gameStore";
import { useAuth } from "@/components/game/providers/GameAuthProvider";

export function useAutoPlayer() {
  const { player } = useAuth();
  const playerState = useGameState((state) => state.player);

  const hasAutominer = player?.has_autominer || playerState?.has_autominer;
  const isPlaying = useGameState((state) => state.currentScene) === "Village";

  const [lastCollection, setLastCollection] =
    useState<AutoPlayerCollectionResult | null>(null);

  useEffect(() => {
    if (isPlaying && hasAutominer) {
      autoPlayerManager.start();

      autoPlayerManager.setCollectionCallback((result) => {
        setLastCollection(result);

        // Auto-clear the toast after 4 seconds
        setTimeout(() => {
          setLastCollection(null);
        }, 4000);
      });
    } else {
      autoPlayerManager.stop();
    }

    return () => autoPlayerManager.stop();
  }, [isPlaying, hasAutominer]);

  return { lastCollection };
}
