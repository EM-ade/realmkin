// ──────────────────────────────────────────────────────────────────────────────
// SoundManager — Singleton bridging Phaser + Howler audio
// ──────────────────────────────────────────────────────────────────────────────
import { Howl, Howler } from 'howler';
import { SOUND_CONFIG } from './soundConfig';

const isDev = process.env.NODE_ENV === "development";

const SETTINGS_KEY = 'kingdom-audio-settings';
const MOBILE_MAX_SIMULTANEOUS = 6;

export interface PlayOptions {
  volume?: number;
  loop?: boolean;
  pitch?: number;
  pitchVariance?: number;
  delay?: number;
  onEnd?: () => void;
}

interface AudioSettings {
  masterMuted: boolean;
  musicVolume: number;
  sfxVolume: number;
  uiVolume: number;
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterMuted: false,
  musicVolume: 0.7,
  sfxVolume: 0.8,
  uiVolume: 0.9,
};

export class SoundManager {
  private static instance: SoundManager | null = null;

  // Howler sound instances
  private howlerSounds = new Map<string, Howl>();

  // Active sound tracking (for mobile simultaneous limit)
  private activeSoundIds: string[] = [];

  // Settings
  private settings: AudioSettings;

  // Anti-spam: last played timestamp per sound
  private lastPlayed = new Map<string, number>();

  // State
  private isUnlocked = false;
  private isInitialized = false;
  private currentMusicId: string | null = null;
  private currentAmbientId: string | null = null;

  // iOS silent unlock sound
  private unlockSound: Howl | null = null;

  private constructor() {
    this.settings = this.loadSettings();
  }

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  // ── Settings persistence ───────────────────────────────────────────────────
  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      /* corrupted — use defaults */
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* localStorage full or unavailable */
    }
  }

  getSettings(): Readonly<AudioSettings> {
    return { ...this.settings };
  }

  // ── iOS Safari audio unlock ────────────────────────────────────────────────
  unlockAudio(): void {
    if (this.isUnlocked) return;

    // Create a silent Howl and play it to unlock the Web Audio context
    if (!this.unlockSound) {
      this.unlockSound = new Howl({
        src: [
          'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
        ],
        volume: 0,
        html5: true,
      });
    }

    this.unlockSound.play();
    this.isUnlocked = true;

    // Apply muted state from settings
    Howler.mute(this.settings.masterMuted);
  }

  get isAudioUnlocked(): boolean {
    return this.isUnlocked;
  }

  // ── Preload ────────────────────────────────────────────────────────────────
  preloadSound(soundId: string): void {
    if (this.howlerSounds.has(soundId)) return;

    const config = SOUND_CONFIG[soundId];
    if (!config) {
      if (isDev) {
        console.warn(`[Sound] Unknown sound: ${soundId}`);
      }
      return;
    }

    const extensions = ['.ogg', '.mp3'];
    const sources = extensions.map((ext) => `${config.src}${ext}`);

    try {
      const howl = new Howl({
        src: sources,
        volume: config.defaultVolume,
        loop: config.loop,
        html5: true, // Force HTML5 Audio for mobile compatibility
        onloaderror: (_, err) => {
          if (isDev) {
            console.warn(`[Sound] Failed to load: ${soundId}`, err);
          }
        },
        onend: () => {
          // Remove from active tracking
          const idx = this.activeSoundIds.indexOf(soundId);
          if (idx !== -1) this.activeSoundIds.splice(idx, 1);
        },
      });

      this.howlerSounds.set(soundId, howl);
    } catch (err) {
      if (isDev) {
        console.warn(`[Sound] Failed to create Howl: ${soundId}`, err);
      }
    }
  }

  preloadBatch(soundIds: string[]): void {
    soundIds.forEach((id) => this.preloadSound(id));
  }

  preloadAll(): void {
    this.preloadBatch(Object.keys(SOUND_CONFIG));
  }

  // ── Core play method ───────────────────────────────────────────────────────
  play(soundId: string, options?: PlayOptions): void {
    if (!this.isInitialized) return;
    if (this.settings.masterMuted) return;

    const config = SOUND_CONFIG[soundId];
    if (!config) {
      if (isDev) {
        console.warn(`[Sound] Unknown sound: ${soundId}`);
      }
      return;
    }

    // Anti-spam check
    const spamThreshold =
      options?.pitchVariance !== undefined
        ? config.spamThresholdMs
        : config.spamThresholdMs;
    const now = Date.now();
    const last = this.lastPlayed.get(soundId) ?? 0;
    if (now - last < spamThreshold) return;
    this.lastPlayed.set(soundId, now);

    // Mobile: limit simultaneous sounds
    if (this.isMobile() && this.activeSoundIds.length >= MOBILE_MAX_SIMULTANEOUS) {
      // Don't block CRITICAL sounds
      if (config.priority !== 'CRITICAL') return;
      // Stop oldest non-critical sound
      const oldest = this.activeSoundIds.find(
        (id) => SOUND_CONFIG[id]?.priority !== 'CRITICAL',
      );
      if (oldest) {
        this.stop(oldest);
      }
    }

    // Get the Howl instance (preload if missing)
    let howl = this.howlerSounds.get(soundId);
    if (!howl) {
      this.preloadSound(soundId);
      howl = this.howlerSounds.get(soundId);
    }
    if (!howl) return;

    // Calculate final volume
    const categoryVolume = this.getCategoryVolume(config.category);
    const baseVolume = options?.volume ?? config.defaultVolume;
    const finalVolume = baseVolume * categoryVolume;

    // Pitch variance
    let playbackRate = options?.pitch ?? 1.0;
    if (config.pitchVariance > 0 || (options?.pitchVariance ?? 0) > 0) {
      const variance = options?.pitchVariance ?? config.pitchVariance;
      playbackRate = 1.0 + (Math.random() * 2 - 1) * variance;
      playbackRate = Math.max(0.5, Math.min(2.0, playbackRate));
    }

    // Delay
    if (options?.delay) {
      setTimeout(() => {
        this.playHowl(howl, soundId, finalVolume, playbackRate, options);
      }, options.delay);
      return;
    }

    this.playHowl(howl, soundId, finalVolume, playbackRate, options);
  }

  private playHowl(
    howl: Howl,
    soundId: string,
    volume: number,
    rate: number,
    options?: PlayOptions,
  ): void {
    try {
      howl.volume(Math.max(0, Math.min(1, volume)));
      howl.rate(rate);

      if (options?.loop !== undefined) {
        howl.loop(options.loop);
      }

      if (options?.onEnd) {
        howl.once('end', options.onEnd);
      }

      // Track active sound
      this.activeSoundIds.push(soundId);

      howl.play();
    } catch (err) {
      if (isDev) {
        console.warn(`[Sound] Failed to play: ${soundId}`, err);
      }
    }
  }

  // ── Stop ───────────────────────────────────────────────────────────────────
  stop(soundId: string): void {
    const howl = this.howlerSounds.get(soundId);
    if (howl) {
      try {
        howl.stop();
        const idx = this.activeSoundIds.indexOf(soundId);
        if (idx !== -1) this.activeSoundIds.splice(idx, 1);
      } catch {
        /* ignore */
      }
    }
  }

  stopAll(): void {
    this.howlerSounds.forEach((howl) => {
      try {
        howl.stop();
      } catch {
        /* ignore */
      }
    });
    this.activeSoundIds = [];
  }

  // ── Music controls ─────────────────────────────────────────────────────────
  playMusic(trackId: string, fadeInMs: number = 1000): void {
    if (this.settings.masterMuted) return;

    // Stop current music first
    if (this.currentMusicId && this.currentMusicId !== trackId) {
      this.stopMusic(500);
    }

    const config = SOUND_CONFIG[trackId];
    if (!config || config.category !== 'music') return;

    let howl = this.howlerSounds.get(trackId);
    if (!howl) {
      this.preloadSound(trackId);
      howl = this.howlerSounds.get(trackId);
    }
    if (!howl) return;

    try {
      const volume = config.defaultVolume * this.settings.musicVolume;
      howl.volume(0);
      howl.loop(true);
      howl.play();

      // Fade in
      const startTime = Date.now();
      const fadeIn = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / fadeInMs);
        howl!.volume(volume * progress);
        if (progress < 1) requestAnimationFrame(fadeIn);
      };
      requestAnimationFrame(fadeIn);

      this.currentMusicId = trackId;
    } catch (err) {
      if (isDev) {
        console.warn(`[Sound] Failed to play music: ${trackId}`, err);
      }
    }
  }

  stopMusic(fadeOutMs: number = 500): void {
    if (!this.currentMusicId) return;

    const howl = this.howlerSounds.get(this.currentMusicId);
    if (!howl) {
      this.currentMusicId = null;
      return;
    }

    try {
      const currentVol = howl.volume();
      const startTime = Date.now();

      const fadeOut = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / fadeOutMs);
        howl.volume(currentVol * (1 - progress));
        if (progress < 1) {
          requestAnimationFrame(fadeOut);
        } else {
          howl.stop();
          this.currentMusicId = null;
        }
      };
      requestAnimationFrame(fadeOut);
    } catch {
      this.currentMusicId = null;
    }
  }

  crossfadeMusic(newTrackId: string, durationMs: number = 1000): void {
    this.playMusic(newTrackId, durationMs);
  }

  // ── Ambient controls ───────────────────────────────────────────────────────
  playAmbient(ambientId: string, fadeInMs: number = 2000): void {
    if (this.settings.masterMuted) return;

    if (this.currentAmbientId && this.currentAmbientId !== ambientId) {
      this.stopAmbient(500);
    }

    const config = SOUND_CONFIG[ambientId];
    if (!config || config.category !== 'ambient') return;

    let howl = this.howlerSounds.get(ambientId);
    if (!howl) {
      this.preloadSound(ambientId);
      howl = this.howlerSounds.get(ambientId);
    }
    if (!howl) return;

    try {
      const volume = config.defaultVolume * this.settings.sfxVolume;
      howl.volume(0);
      howl.loop(true);
      howl.play();

      const startTime = Date.now();
      const fadeIn = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / fadeInMs);
        howl!.volume(volume * progress);
        if (progress < 1) requestAnimationFrame(fadeIn);
      };
      requestAnimationFrame(fadeIn);

      this.currentAmbientId = ambientId;
    } catch (err) {
      if (isDev) {
        console.warn(`[Sound] Failed to play ambient: ${ambientId}`, err);
      }
    }
  }

  stopAmbient(fadeOutMs: number = 500): void {
    if (!this.currentAmbientId) return;

    const howl = this.howlerSounds.get(this.currentAmbientId);
    if (!howl) {
      this.currentAmbientId = null;
      return;
    }

    try {
      const currentVol = howl.volume();
      const startTime = Date.now();

      const fadeOut = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(1, elapsed / fadeOutMs);
        howl.volume(currentVol * (1 - progress));
        if (progress < 1) {
          requestAnimationFrame(fadeOut);
        } else {
          howl.stop();
          this.currentAmbientId = null;
        }
      };
      requestAnimationFrame(fadeOut);
    } catch {
      this.currentAmbientId = null;
    }
  }

  // ── Volume controls ────────────────────────────────────────────────────────
  setMusicVolume(vol: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
  }

  setSfxVolume(vol: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
  }

  setUiVolume(vol: number): void {
    this.settings.uiVolume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
  }

  muteAll(): void {
    this.settings.masterMuted = true;
    Howler.mute(true);
    this.saveSettings();
  }

  unmuteAll(): void {
    this.settings.masterMuted = false;
    Howler.mute(false);
    this.saveSettings();
  }

  toggleMute(): boolean {
    if (this.settings.masterMuted) {
      this.unmuteAll();
    } else {
      this.muteAll();
    }
    return this.settings.masterMuted;
  }

  get isMuted(): boolean {
    return this.settings.masterMuted;
  }

  // ── Internal helpers ───────────────────────────────────────────────────────
  private getCategoryVolume(category: string): number {
    switch (category) {
      case 'music':
        return this.settings.musicVolume;
      case 'ui':
        return this.settings.uiVolume;
      case 'ambient':
      case 'building':
      case 'resource':
      case 'progression':
        return this.settings.sfxVolume;
      default:
        return 1.0;
    }
  }

  private isMobile(): boolean {
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  }

  // ── Initialization ─────────────────────────────────────────────────────────
  initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
    // Apply saved mute state
    Howler.mute(this.settings.masterMuted);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  destroy(): void {
    this.stopAll();
    this.howlerSounds.forEach((howl) => {
      try {
        howl.unload();
      } catch {
        /* ignore */
      }
    });
    this.howlerSounds.clear();
    this.isInitialized = false;
    if (this.unlockSound) {
      try {
        this.unlockSound.unload();
      } catch {
        /* ignore */
      }
      this.unlockSound = null;
    }
  }
}

// Singleton export
export const soundManager = SoundManager.getInstance();
