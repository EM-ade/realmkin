// src/components/game/LoadingScreen/loadingStages.ts
import { supabase } from "@/lib/supabase";
import { useXPSystem } from "@/hooks/game/useXPSystem";
import { SoundManager } from "@/audio/SoundManager";
import { Howl } from "howler";
import { SOUND_CONFIG } from "@/audio/soundConfig";

export interface LoadingStageResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * Stage 1: Critical Auth
 * Check for existing session and verify validity.
 */
export async function loadStageAuth(): Promise<LoadingStageResult> {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) return { success: false, error: error.message };
    return { success: true, data: session };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Stage 2: Player Data (if authenticated)
 * Loads player data from Supabase.
 */
export async function loadStagePlayerData(): Promise<LoadingStageResult> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const { data, error } = await supabase.functions.invoke(
      "load-game",
      session?.access_token ? { headers: { Authorization: `Bearer ${session.access_token}` } } : {}
    );
    if (error) return { success: false, error: error.message };

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
      }
    }

    return { success: true, data };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Stage 3: Sound Loading
 */
export async function loadStageSounds(
  onProgress: (p: number) => void
): Promise<LoadingStageResult> {
  try {
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

    let stageProgress = 0;

    for (const group of allGroups) {
      await new Promise<void>((resolve) => {
        let loadedCount = 0;
        const total = group.sounds.length;

        if (total === 0) {
          stageProgress += group.weight * 100;
          onProgress(stageProgress);
          resolve();
          return;
        }

        group.sounds.forEach((soundId) => {
          const config = (SOUND_CONFIG as Record<string, any>)[soundId];
          if (!config) {
            loadedCount++;
            stageProgress += (group.weight * 100) / total;
            onProgress(Math.min(stageProgress, 100));
            if (loadedCount === total) resolve();
            return;
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
                loadedCount++;
                stageProgress += (group.weight * 100) / total;
                onProgress(Math.min(stageProgress, 100));
                if (loadedCount === total) resolve();
              },
              onloaderror: (_id, error) => {
                console.warn(`[Sound] Failed to load ${soundId}:`, error);
                failedSounds.push(soundId);
                loadedCount++;
                stageProgress += (group.weight * 100) / total;
                onProgress(Math.min(stageProgress, 100));
                if (loadedCount === total) resolve();
              },
            });
            soundManager.preloadSound(soundId);
          } catch {
            failedSounds.push(soundId);
            loadedCount++;
            stageProgress += (group.weight * 100) / total;
            onProgress(Math.min(stageProgress, 100));
            if (loadedCount === total) resolve();
          }
        });
      });
    }

    return { success: true };
  } catch (e: any) {
    console.warn("[Sound] Sound loading stage failed:", e.message);
    return { success: true };
  }
}

/**
 * Stage 4: Game Assets
 */
export async function loadStageAssets(
  onProgress: (p: number) => void
): Promise<LoadingStageResult> {
  return new Promise((resolve) => {
    let p = 0;
    const interval = setInterval(() => {
      p += 0.2;
      onProgress(p);
      if (p >= 1) {
        clearInterval(interval);
        resolve({ success: true });
      }
    }, 300);
  });
}

/**
 * Stage 5: Game Initialization
 */
export async function loadStageInit(): Promise<LoadingStageResult> {
  return { success: true };
}
