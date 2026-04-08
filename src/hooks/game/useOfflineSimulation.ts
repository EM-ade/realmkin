"use client";

import { useCallback } from "react";
import type { OfflineGains } from "@/types/game/supabase";
import { useGameStateContext } from "@/providers/game/GameStateProvider";

export interface UseOfflineSimulation {
  offlineGains: OfflineGains | null;
  dismissGains: () => void;
  hasOfflineGains: boolean;
}

/**
 * Provides access to the offline gains data calculated by load-game
 * edge function on login. The WelcomeBackScreen consumes this.
 *
 * Offline gains are set by AuthProvider when load-game responds,
 * dispatched via a custom "game:offlineGains" event, and stored
 * in GameStateProvider until dismissed.
 */
export function useOfflineSimulation(): UseOfflineSimulation {
  const { offlineGains, dismissGains } = useGameStateContext();

  return {
    offlineGains,
    dismissGains: useCallback(() => dismissGains(), [dismissGains]),
    hasOfflineGains: !!offlineGains?.wasOffline,
  };
}
