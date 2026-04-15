// ──────────────────────────────────────────────────────────────────────────────
// SOUND CONFIGURATION — Single source of truth for all game audio
// ──────────────────────────────────────────────────────────────────────────────

export type SoundEngine = 'phaser' | 'howler';
export type SoundCategory = 'ui' | 'building' | 'resource' | 'progression' | 'ambient' | 'music';
export type SoundPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'OPTIONAL';

export interface SoundConfigEntry {
  id: string;
  engine: SoundEngine;
  category: SoundCategory;
  /** Path relative to /public/ — omit extension (Howler picks .ogg/.mp3) */
  src: string;
  defaultVolume: number;
  loop: boolean;
  /** Random pitch variance (0 = none, 0.1 = ±10%) — makes repetitive sounds natural */
  pitchVariance: number;
  /** Minimum ms between plays of this sound (anti-spam) */
  spamThresholdMs: number;
  priority: SoundPriority;
}

export const SOUND_CONFIG: Record<string, SoundConfigEntry> = {
  // ── UI Sounds (Howler — survive React re-renders) ──────────────────────────
  button_click: {
    id: 'button_click',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/button_click',
    defaultVolume: 0.4,
    loop: false,
    pitchVariance: 0.12,
    spamThresholdMs: 80,
    priority: 'CRITICAL',
  },
  tab_switch: {
    id: 'tab_switch',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/tab_switch',
    defaultVolume: 0.35,
    loop: false,
    pitchVariance: 0.1,
    spamThresholdMs: 100,
    priority: 'MEDIUM',
  },
  modal_open: {
    id: 'modal_open',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/modal_open',
    defaultVolume: 0.3,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 150,
    priority: 'MEDIUM',
  },
  modal_close: {
    id: 'modal_close',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/modal_close',
    defaultVolume: 0.3,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 150,
    priority: 'MEDIUM',
  },
  placement_valid: {
    id: 'placement_valid',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/placement_valid',
    defaultVolume: 0.3,
    loop: false,
    pitchVariance: 0.05,
    spamThresholdMs: 50,
    priority: 'HIGH',
  },
  placement_invalid: {
    id: 'placement_invalid',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/placement_invalid',
    defaultVolume: 0.4,
    loop: false,
    pitchVariance: 0.05,
    spamThresholdMs: 100,
    priority: 'HIGH',
  },
  drag_start: {
    id: 'drag_start',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/drag_start',
    defaultVolume: 0.35,
    loop: false,
    pitchVariance: 0.1,
    spamThresholdMs: 100,
    priority: 'HIGH',
  },
  not_enough_resources: {
    id: 'not_enough_resources',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/not_enough_resources',
    defaultVolume: 0.5,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 200,
    priority: 'HIGH',
  },
  gem_spend: {
    id: 'gem_spend',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/gem_spend',
    defaultVolume: 0.4,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 150,
    priority: 'HIGH',
  },
  xp_gain: {
    id: 'xp_gain',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/xp_gain',
    defaultVolume: 0.1,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'LOW',
  },
  storage_full: {
    id: 'storage_full',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/storage_full',
    defaultVolume: 0.5,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 300,
    priority: 'MEDIUM',
  },
  builder_free: {
    id: 'builder_free',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/builder_free',
    defaultVolume: 0.35,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 200,
    priority: 'MEDIUM',
  },
  connection_lost: {
    id: 'connection_lost',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/connection_lost',
    defaultVolume: 0.4,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'LOW',
  },
  connection_restored: {
    id: 'connection_restored',
    engine: 'howler',
    category: 'ui',
    src: '/sounds/sfx/ui/connection_restored',
    defaultVolume: 0.4,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'LOW',
  },

  // ── Building Sounds (Howler — React triggers these) ────────────────────────
  building_place: {
    id: 'building_place',
    engine: 'howler',
    category: 'building',
    src: '/sounds/sfx/building/building_place',
    defaultVolume: 0.6,
    loop: false,
    pitchVariance: 0.08,
    spamThresholdMs: 100,
    priority: 'CRITICAL',
  },
  building_complete: {
    id: 'building_complete',
    engine: 'howler',
    category: 'building',
    // Reuses the building_place thud — same satisfying "done" feeling
    src: '/sounds/sfx/building/building_place',
    defaultVolume: 0.7,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 300,
    priority: 'CRITICAL',
  },
  upgrade_start: {
    id: 'upgrade_start',
    engine: 'howler',
    category: 'building',
    src: '/sounds/sfx/building/upgrade_start',
    defaultVolume: 0.4,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 200,
    priority: 'HIGH',
  },
  upgrade_complete: {
    id: 'upgrade_complete',
    engine: 'howler',
    category: 'building',
    src: '/sounds/sfx/building/upgrade_complete',
    defaultVolume: 0.6,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 300,
    priority: 'HIGH',
  },

  // ── Resource Sounds ────────────────────────────────────────────────────────
  resource_collect: {
    id: 'resource_collect',
    engine: 'howler',
    category: 'resource',
    src: '/sounds/sfx/resource/resource_collect',
    defaultVolume: 0.6,
    loop: false,
    pitchVariance: 0.08,
    spamThresholdMs: 100,
    priority: 'CRITICAL',
  },
  collect_all: {
    id: 'collect_all',
    engine: 'howler',
    category: 'resource',
    src: '/sounds/sfx/resource/collect_all',
    defaultVolume: 0.5,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 300,
    priority: 'LOW',
  },

  // ── Progression Sounds ─────────────────────────────────────────────────────
  level_up: {
    id: 'level_up',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/gem_earn',
    defaultVolume: 0.7,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'CRITICAL',
  },
  gem_earn: {
    id: 'gem_earn',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/gem_earn',
    defaultVolume: 0.5,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 300,
    priority: 'CRITICAL',
  },
  gem_purchase: {
    id: 'gem_purchase',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/gem_earn',
    defaultVolume: 0.6,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'MEDIUM',
  },
  daily_login: {
    id: 'daily_login',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/daily_login',
    defaultVolume: 0.5,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 300,
    priority: 'HIGH',
  },
  welcome_back: {
    id: 'welcome_back',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/welcome_back',
    defaultVolume: 0.5,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'MEDIUM',
  },
  autominer_purchase: {
    id: 'autominer_purchase',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/autominer_purchase',
    defaultVolume: 0.5,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'MEDIUM',
  },
  tutorial_step: {
    id: 'tutorial_step',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/tutorial_step',
    defaultVolume: 0.35,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 200,
    priority: 'MEDIUM',
  },
  tutorial_complete: {
    id: 'tutorial_complete',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/tutorial_complete',
    defaultVolume: 0.6,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'HIGH',
  },
  login_streak_3: {
    id: 'login_streak_3',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/login_streak_3',
    defaultVolume: 0.5,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'LOW',
  },
  login_streak_7: {
    id: 'login_streak_7',
    engine: 'howler',
    category: 'progression',
    src: '/sounds/sfx/progression/login_streak_7',
    defaultVolume: 0.6,
    loop: false,
    pitchVariance: 0,
    spamThresholdMs: 500,
    priority: 'LOW',
  },

  // ── Ambient (Howler — Phaser could also handle these) ──────────────────────
  ambient_village: {
    id: 'ambient_village',
    engine: 'howler',
    category: 'ambient',
    src: '/sounds/ambient/ambient_village',
    defaultVolume: 0.25,
    loop: true,
    pitchVariance: 0,
    spamThresholdMs: 0,
    priority: 'HIGH',
  },

  // ── Music ──────────────────────────────────────────────────────────────────
  music_main_theme: {
    id: 'music_main_theme',
    engine: 'howler',
    category: 'music',
    src: '/sounds/music/music_main_theme',
    defaultVolume: 0.3,
    loop: true,
    pitchVariance: 0,
    spamThresholdMs: 0,
    priority: 'HIGH',
  },
};

// ── Preload phases ───────────────────────────────────────────────────────────
// Phase 1: Load immediately (might fire before game fully loads)
export const PHASE1_CRITICAL = ['button_click', 'placement_valid', 'placement_invalid'];

// Phase 2: Load after game canvas ready
export const PHASE2_HIGH = [
  'building_place', 'building_complete', 'resource_collect',
  'level_up', 'gem_earn', 'gem_spend', 'upgrade_start', 'upgrade_complete',
  'drag_start', 'not_enough_resources', 'daily_login',
];

// Phase 3: Load after first user interaction
export const PHASE3_MEDIUM_LOW = Object.keys(SOUND_CONFIG).filter(
  (id) => !PHASE1_CRITICAL.includes(id) && !PHASE2_HIGH.includes(id),
);
