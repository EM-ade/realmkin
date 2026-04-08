// ──────────────────────────────────────────────────────────────────────────────
// PhaserSoundBridge — Connects Phaser scenes to the SoundManager singleton
// ──────────────────────────────────────────────────────────────────────────────

import Phaser from "phaser";
import { soundManager } from "./SoundManager";
import type { PlayOptions } from "./SoundManager";

const isDev = process.env.NODE_ENV === "development";

/**
 * Attach this to your Phaser Scene to connect it to the SoundManager.
 * Usage in your scene:
 *
 *   create() {
 *     PhaserSoundBridge.init(this);
 *     // ... rest of create
 *   }
 */
export class PhaserSoundBridge {
  static init(scene: Phaser.Scene): void {
    soundManager.initialize();

    const soundManager_ = scene.sound;

    if (soundManager_) {
      soundManager_.on("play", (sound: Phaser.Sound.WebAudioSound) => {
        if (isDev) {
          console.log(`[PhaserSound] Playing: ${sound.key}`);
        }
      });

      soundManager_.on("error", (sound: Phaser.Sound.WebAudioSound) => {
        if (isDev) {
          console.warn(`[PhaserSound] Error: ${sound.key}`);
        }
      });
    }
  }

  /**
   * Play a sound via SoundManager from within a Phaser scene.
   */
  static play(
    _scene: Phaser.Scene,
    soundId: string,
    options?: PlayOptions
  ): void {
    soundManager.play(soundId, options);
  }

  /**
   * Stop a sound via SoundManager from within a Phaser scene.
   */
  static stop(_scene: Phaser.Scene, soundId: string): void {
    soundManager.stop(soundId);
  }
}
