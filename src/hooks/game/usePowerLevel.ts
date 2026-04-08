// ──────────────────────────────────────────────────────────────────────────────
// usePowerLevel Hook
// Calculates power level from current game state with debouncing.
// ──────────────────────────────────────────────────────────────────────────────

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  calculatePowerLevel,
  getPowerBreakdown,
  getPowerTier,
  type PowerBreakdown,
  type PowerTier,
  type PowerCalcInput,
} from "@/game/config/powerFormula";
import { useGameState } from "@/stores/gameStore";
import { useXPSystem } from "@/hooks/game/useXPSystem";
import { supabase } from "@/lib/supabase";

const RECALCULATE_COOLDOWN = 30000; // 30 seconds

interface UsePowerLevelReturn {
  powerLevel: number;
  powerTier: PowerTier;
  breakdown: PowerBreakdown;
  isCalculating: boolean;
  recalculate: () => Promise<void>;
}

export function usePowerLevel(): UsePowerLevelReturn {
  const { buildings, completedObjectives } = useGameState();
  const { currentLevel, completedMilestones } = useXPSystem();
  const [powerLevel, setPowerLevel] = useState(0);
  const [breakdown, setBreakdown] = useState<PowerBreakdown>({
    buildingPower: 0,
    levelPower: 0,
    productionPower: 0,
    armyPower: 0,
    achievementPower: 0,
    total: 0,
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const lastRecalcRef = useRef<number>(0);

  const calculate = useCallback(
    (input: PowerCalcInput) => {
      const total = calculatePowerLevel(input);
      const bd = getPowerBreakdown(input);
      const tier = getPowerTier(total);

      setPowerLevel(total);
      setBreakdown(bd);
      return { total, bd, tier };
    },
    []
  );

  // Initial calculation
  useEffect(() => {
    const input: PowerCalcInput = {
      buildings: buildings.map((b) => ({
        type: b.type,
        level: b.level,
        underConstruction: b.underConstruction,
      })),
      playerLevel: currentLevel,
      completedMilestones: completedMilestones || [],
      armyData: null,
    };

    calculate(input);
  }, [buildings, currentLevel, completedMilestones, calculate]);

  // Debounced recalculation with server sync
  const recalculate = useCallback(async () => {
    const now = Date.now();
    if (now - lastRecalcRef.current < RECALCULATE_COOLDOWN) return;
    lastRecalcRef.current = now;

    setIsCalculating(true);

    try {
      const input: PowerCalcInput = {
        buildings: buildings.map((b) => ({
          type: b.type,
          level: b.level,
          underConstruction: b.underConstruction,
        })),
        playerLevel: currentLevel,
        completedMilestones: completedMilestones || [],
        armyData: null,
      };

      calculate(input);

      // Save to Supabase
      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user) {
        await supabase
          .from("players")
          .update({ power_level: powerLevel })
          .eq("id", session.session.user.id);
      }
    } catch (err) {
      console.error("[usePowerLevel] Failed to recalculate:", err);
    } finally {
      setIsCalculating(false);
    }
  }, [buildings, currentLevel, completedMilestones, calculate, powerLevel]);

  return {
    powerLevel,
    powerTier: getPowerTier(powerLevel),
    breakdown,
    isCalculating,
    recalculate,
  };
}
