// src/components/game/LoadingScreen/useLoadingOrchestrator.ts
import { useState, useEffect, useRef } from "react";
import * as stages from "./loadingStages";

export interface LoadingState {
  visualProgress: number;
  isComplete: boolean;
  error?: string;
}

/**
 * Orchestrates the balance between Visual (Fake) and Real (Actual) loading.
 * Process A: Fake steady progress to create anticipation.
 * Process B: Real background data and asset loading.
 */
export function useLoadingOrchestrator(): LoadingState {
  const [visualProgress, setVisualProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const processBComplete = useRef(false);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // ── PROCESS A: Visual (Fake Progress) ─────────────────────────────────────
    const visualInterval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;

      let nextProgress = 0;
      if (elapsed < 800) {
        nextProgress = (elapsed / 800) * 15;
      } else if (elapsed < 2000) {
        nextProgress = 15 + ((elapsed - 800) / 1200) * 20;
      } else if (elapsed < 3500) {
        nextProgress = 35 + ((elapsed - 2000) / 1500) * 20;
      } else if (elapsed < 5000) {
        nextProgress = 55 + ((elapsed - 3500) / 1500) * 20;
      } else if (elapsed < 6500) {
        nextProgress = 75 + ((elapsed - 5000) / 1500) * 15;
      } else {
        nextProgress = 92 + Math.sin(elapsed / 500) * 2;
      }

      if (processBComplete.current && nextProgress > 90) {
        setVisualProgress(100);
        clearInterval(visualInterval);
        setTimeout(() => setIsComplete(true), 500);
        return;
      }

      setVisualProgress((prev) => Math.max(prev, nextProgress));
    }, 50);

    // ── PROCESS B: Real (Actual Loading) ──────────────────────────────────────
    const runProcessB = async () => {
      try {
        const auth = await stages.loadStageAuth();
        if (!auth.success) throw new Error(auth.error);

        if (auth.data) {
          const player = await stages.loadStagePlayerData();
          if (!player.success) {
            if (
              player.error?.toLowerCase().includes("edge function returned") ||
              player.error?.toLowerCase().includes("unauthorized")
            ) {
              console.warn("Player data auth failed. Proceeding as guest.");
            } else {
              throw new Error(player.error);
            }
          }
        }

        const assets = await stages.loadStageAssets(() => {});
        if (!assets.success) throw new Error(assets.error);

        await stages.loadStageInit();

        processBComplete.current = true;
      } catch (e: any) {
        console.error("Loading Stage Failed:", e.message);
        setError(`Error loading game: ${e.message}. Retrying...`);
      }
    };

    runProcessB();

    return () => clearInterval(visualInterval);
  }, []);

  return { visualProgress, isComplete, error };
}
