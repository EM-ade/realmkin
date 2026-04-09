// src/components/game/LoadingScreen/loadingStages.ts
/**
 * Loading stages for the gate-based loading system.
 * Each stage sets its corresponding gates when complete.
 */

import { supabase } from "@/lib/supabase";
import { useXPSystem } from "@/hooks/game/useXPSystem";
import { SoundManager } from "@/audio/SoundManager";
import { Howl } from "howler";
import { SOUND_CONFIG } from "@/audio/soundConfig";
import type { LoadingGate, GateStatus } from "@/types/loading.types";

export interface LoadingStageResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Helper to set gates via global reference
const setGate = (gate: LoadingGate, status: GateStatus) => {
  window.__loadingGates?.setGate(gate, status)
}

/**
 * Stage 1: Critical Auth
 * Check for existing session and verify validity.
 */
export async function loadStageAuth(): Promise<LoadingStageResult> {
  setGate('auth', 'loading')
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      setGate('auth', 'failed')
      return { success: false, error: error.message };
    }
    setGate('auth', 'complete')
    return { success: true, data: session };
  } catch (e: any) {
    setGate('auth', 'failed')
    return { success: false, error: e.message };
  }
}

/**
 * Stage 2: Player Data (if authenticated)
 * Loads player data from Supabase — buildings, resources, tutorial state.
 * Sets ALL data gates simultaneously after successful load.
 */
export async function loadStagePlayerData(): Promise<LoadingStageResult> {
  setGate('playerData', 'loading')
  setGate('buildings', 'loading')
  setGate('resources', 'loading')
  setGate('tutorialState', 'loading')

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke(
      "load-game",
      session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {}
    );
    if (error) {
      setGate('playerData', 'failed')
      setGate('buildings', 'failed')
      setGate('resources', 'failed')
      setGate('tutorialState', 'failed')
      return { success: false, error: error.message };
    }

    if (data) {
      const player = data.player;
      if (player) {
        const dbLevel = Math.max(1, parseInt(player.level) || 1);
        const dbLastAcknowledged = Math.max(1, parseInt(player.last_acknowledged_level) || 1);
        const effectiveLastAcknowledged =
          dbLastAcknowledged < dbLevel ? dbLevel : dbLastAcknowledged;

        useXPSystem.getState().setInitialState(
          player.xp || 0,
          dbLevel,
          [],
          effectiveLastAcknowledged
        );

        // Import buildings into game store immediately so VillageScene can render them
        if (data.buildings && data.buildings.length > 0) {
          const { useGameState } = await import("@/stores/gameStore");
          useGameState.getState().importSupabaseData(data.buildings, {
            wood: player.wood ?? 100,
            stone: player.stone ?? 100,
            iron: player.iron ?? 100,
            food: player.food ?? 100,
            gem_balance: player.gem_balance ?? 50,
          });
        } else if (player) {
          // Even without buildings, import resources for new/empty players
          const { useGameState } = await import("@/stores/gameStore");
          useGameState.getState().addResources({
            wood: player.wood ?? 100,
            clay: player.stone ?? 100,
            iron: player.iron ?? 100,
            crop: player.food ?? 100,
            gems: player.gem_balance ?? 50,
          });
        }
      }
    }

    // Set ALL data gates complete simultaneously
    setGate('playerData', 'complete')
    setGate('buildings', 'complete')
    setGate('resources', 'complete')
    setGate('tutorialState', 'complete')

    return { success: true, data };
  } catch (e: any) {
    setGate('playerData', 'failed')
    setGate('buildings', 'failed')
    setGate('resources', 'failed')
    setGate('tutorialState', 'failed')
    return { success: false, error: e.message };
  }
}

/**
 * Stage 3: Sound Loading — integrated with gate system.
 * Loads critical Howler sounds and reports completion via gate.
 */
export async function loadStageSounds(): Promise<LoadingStageResult> {
  setGate('soundsLoaded', 'loading')

  return new Promise((resolve) => {
    const soundManager = SoundManager.getInstance();
    const failedSounds: string[] = [];

    const allGroups = [
      {
        sounds: ["button_click", "building_place", "resource_collect", "placement_valid", "placement_invalid"],
        weight: 0.4,
      },
      {
        sounds: ["building_complete", "upgrade_complete", "level_up", "gem_earn", "gem_spend", "daily_login", "drag_start", "not_enough_resources"],
        weight: 0.3,
      },
      {
        sounds: ["tab_switch", "modal_open", "modal_close", "upgrade_start", "xp_gain", "tutorial_step", "tutorial_complete", "welcome_back"],
        weight: 0.2,
      },
      {
        sounds: ["ambient_village", "music_main_theme"],
        weight: 0.1,
      },
    ];

    let totalSounds = 0
    allGroups.forEach(g => totalSounds += g.sounds.length)
    let loadedCount = 0

    const checkComplete = () => {
      if (loadedCount >= totalSounds) {
        // Don't fail the gate for missing sounds — just warn
        if (failedSounds.length > 0) {
          console.warn('[Sound] Failed to load:', failedSounds)
        }
        setGate('soundsLoaded', 'complete')
        resolve({ success: true })
      }
    }

    // If no sounds to load, resolve immediately
    if (totalSounds === 0) {
      setGate('soundsLoaded', 'complete')
      resolve({ success: true })
      return
    }

    for (const group of allGroups) {
      for (const soundId of group.sounds) {
        const config = (SOUND_CONFIG as Record<string, any>)[soundId];
        if (!config) {
          loadedCount++
          checkComplete()
          continue
        }

        const extensions = [".ogg", ".mp3"];
        const sources = extensions.map((ext) => `${config.src}${ext}`);

        try {
          new Howl({
            src: sources,
            volume: config.defaultVolume,
            loop: config.loop,
            preload: true,
            html5: true,
            onload: () => {
              loadedCount++
              checkComplete()
            },
            onloaderror: () => {
              console.warn(`[Sound] Failed to load ${soundId}`);
              failedSounds.push(soundId);
              loadedCount++
              checkComplete()
            },
          });
          soundManager.preloadSound(soundId);
        } catch {
          failedSounds.push(soundId);
          loadedCount++
          checkComplete()
        }
      }
    }
  })
}

/**
 * Stage 4: Phaser Asset Loading (BootScene)
 * This stage waits for the Phaser BootScene to dispatch the spritesLoaded gate.
 * We poll for the gate to be complete.
 */
export async function loadStageSprites(): Promise<LoadingStageResult> {
  // The BootScene sets the 'spritesLoaded' gate when Phaser's loader completes.
  // We just wait for it.
  return new Promise((resolve) => {
    const check = () => {
      if (window.__loadingGates?.state.gates.spritesLoaded === 'complete') {
        resolve({ success: true })
      } else {
        setTimeout(check, 100)
      }
    }
    // Also set loading status
    setGate('spritesLoaded', 'loading')
    check()
  })
}

/**
 * Stage 5: Grid Building (VillageScene)
 * Waits for the VillageScene to dispatch the gridBuilt gate after placing all buildings.
 */
export async function loadStageGridBuilt(): Promise<LoadingStageResult> {
  return new Promise((resolve) => {
    const check = () => {
      if (window.__loadingGates?.state.gates.gridBuilt === 'complete') {
        resolve({ success: true })
      } else {
        setTimeout(check, 100)
      }
    }
    // Also set loading status
    setGate('gridBuilt', 'loading')
    check()
  })
}
