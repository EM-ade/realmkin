// ─────────────────────────────────────────────────────────────────────────────
// Database Row Types (mirror SQL schema exactly)
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerRow {
  id: string;
  wallet_address: string | null;
  email: string | null;
  username: string | null;
  auth_method: "wallet" | "email";
  linked_wallet: string | null;
  level: number;
  xp: number;
  gem_balance: number;
  tutorial_flags: number;
  tutorial_complete: boolean;
  has_autominer: boolean;
  autominer_purchased_at: string | null;
  last_login: string;
  last_save: string;
  last_active: string;
  created_at: string;
  wood: number;
  stone: number;
  iron: number;
  food: number;
  max_storage: number;
  builders_total: number;
  builders_busy: number;
  login_streak: number;
  last_streak_date: string | null;
  season: number;
  season_data: Record<string, unknown>;
  active_session_id: string | null;
  save_version: number;
  // Profile system fields (migration 006)
  power_level: number;
  unlocked_titles: string[];
  active_title: string;
  avatar_url: string | null;
  total_buildings_built: number;
  days_active: number;
}

export interface BuildingRow {
  id: string;
  player_id: string;
  building_type: string;
  level: number;
  grid_x: number;
  grid_y: number;
  status: "idle" | "building" | "upgrading";
  construction_start: string | null;
  construction_end: string | null;
  last_collected_at: string;
  production_rate: number;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  player_id: string;
  type: "gem_purchase" | "gem_earned" | "gem_spent" | "autominer";
  gem_amount: number;
  source: string;
  description: string | null;
  sol_amount: number | null;
  sol_tx_signature: string | null;
  usd_equivalent: number | null;
  verified: boolean;
  created_at: string;
}

export interface SaveSnapshotRow {
  id: string;
  player_id: string;
  snapshot: Record<string, unknown>;
  trigger: "periodic" | "logout" | "purchase" | "recovery";
  created_at: string;
}

export interface AuthNonceRow {
  nonce: string;
  wallet_address: string;
  created_at: string;
}

export interface ErrorRow {
  id: string;
  player_id: string | null;
  error_type: string;
  error_message: string;
  severity: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Game Domain Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PlayerResources {
  wood: number;
  stone: number;
  iron: number;
  food: number;
}

export interface Player {
  id: string;
  walletAddress: string | null;
  email: string | null;
  username: string | null;
  authMethod: "wallet" | "email";
  level: number;
  xp: number;
  gemBalance: number;
  tutorialFlags: number;
  tutorialComplete: boolean;
  hasAutominer: boolean;
  autominerPurchasedAt: Date | null;
  lastLogin: Date;
  lastSave: Date;
  lastActive: Date;
  createdAt: Date;
  resources: PlayerResources;
  maxStorage: number;
  buildersTotal: number;
  buildersBusy: number;
  loginStreak: number;
  lastStreakDate: Date | null;
  season: number;
  seasonData: Record<string, unknown>;
  // Profile system fields
  powerLevel: number;
  unlockedTitles: string[];
  activeTitle: string;
  avatarUrl: string | null;
  totalBuildingsBuilt: number;
  daysActive: number;
}

export interface BuildingRecord {
  id: string;
  playerId: string;
  buildingType: string;
  level: number;
  gridX: number;
  gridY: number;
  status: "idle" | "building" | "upgrading";
  constructionStart: Date | null;
  constructionEnd: Date | null;
  lastCollectedAt: Date;
  productionRate: number;
  createdAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuthMode = "standalone" | "embedded";

export interface AuthError {
  code: string;
  message: string;
  retryable: boolean;
}

export interface WalletAuthPayload {
  walletAddress: string;
  signature: Uint8Array;
  message: string;
  nonce: string;
  timestamp: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Game State Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GameError {
  code: string;
  message: string;
  severity: 1 | 2 | 3 | 4 | 5;
  retryable: boolean;
}

export interface Result<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
  retryable?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Offline Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ResourceDecayInfo {
  applied: boolean;
  periods: number; // Number of 24-hour periods decayed
  multiplier: number; // e.g., 0.85 for 1 period, 0.7225 for 2
  decayAmount: PlayerResources; // Amount lost per resource
}

export interface OfflineGains {
  wasOffline: boolean;
  duration: number; // ms
  durationFormatted: string; // "2 hours, 15 minutes"
  resources: PlayerResources;
  hasAutominer: boolean;
  autominerMessage: string;
  completedBuildings: {
    buildingType: string;
    newLevel: number;
    buildingId: string;
  }[];
  streakUpdated: boolean;
  newStreak: number;
  streakGemsEarned: number;
  resourceDecay?: ResourceDecayInfo; // Present if decay was applied
}

export interface QueuedAction {
  id: string;
  action: "collect" | "place" | "upgrade" | "remove" | "speedup" | "gem_spend";
  buildingId?: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface SaveQueue {
  actions: QueuedAction[];
  lastStateSnapshot: Record<string, unknown> | null;
  lastSync: string | null;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

export type ConnectionQuality = "good" | "slow" | "offline";

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Database Type (for createClient generic)
// ─────────────────────────────────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      players: {
        Row: PlayerRow;
        Insert: {
          id?: string;
          wallet_address?: string | null;
          email?: string | null;
          username?: string | null;
          auth_method: "wallet" | "email";
          linked_wallet?: string | null;
          level?: number;
          xp?: number;
          gem_balance?: number;
          tutorial_flags?: number;
          tutorial_complete?: boolean;
          has_autominer?: boolean;
          autominer_purchased_at?: string | null;
          last_login?: string;
          last_save?: string;
          last_active?: string;
          created_at?: string;
          wood?: number;
          stone?: number;
          iron?: number;
          food?: number;
          max_storage?: number;
          builders_total?: number;
          builders_busy?: number;
          login_streak?: number;
          last_streak_date?: string | null;
          season?: number;
          season_data?: Record<string, unknown>;
          active_session_id?: string | null;
          save_version?: number;
          power_level?: number;
          unlocked_titles?: string[];
          active_title?: string;
          avatar_url?: string | null;
          total_buildings_built?: number;
          days_active?: number;
        };
        Update: {
          wallet_address?: string | null;
          email?: string | null;
          username?: string | null;
          auth_method?: "wallet" | "email";
          linked_wallet?: string | null;
          level?: number;
          xp?: number;
          gem_balance?: number;
          tutorial_flags?: number;
          tutorial_complete?: boolean;
          has_autominer?: boolean;
          autominer_purchased_at?: string | null;
          last_login?: string;
          last_save?: string;
          last_active?: string;
          wood?: number;
          stone?: number;
          iron?: number;
          food?: number;
          max_storage?: number;
          builders_total?: number;
          builders_busy?: number;
          login_streak?: number;
          last_streak_date?: string | null;
          season?: number;
          season_data?: Record<string, unknown>;
          active_session_id?: string | null;
          save_version?: number;
          power_level?: number;
          unlocked_titles?: string[];
          active_title?: string;
          avatar_url?: string | null;
          total_buildings_built?: number;
          days_active?: number;
        };
      };
      buildings: {
        Row: BuildingRow;
        Insert: {
          player_id: string;
          building_type: string;
          level: number;
          grid_x: number;
          grid_y: number;
          status: "idle" | "building" | "upgrading";
          construction_start?: string | null;
          construction_end?: string | null;
          last_collected_at?: string;
          production_rate: number;
        };
        Update: Partial<BuildingRow>;
      };
      transactions: {
        Row: TransactionRow;
        Insert: {
          player_id: string;
          type: "gem_purchase" | "gem_earned" | "gem_spent" | "autominer";
          gem_amount: number;
          source: string;
          description?: string | null;
          sol_amount?: number | null;
          sol_tx_signature?: string | null;
          usd_equivalent?: number | null;
          verified: boolean;
        };
        Update: never; // immutable
      };
      save_snapshots: {
        Row: SaveSnapshotRow;
        Insert: {
          player_id: string;
          snapshot: Record<string, unknown>;
          trigger: "periodic" | "logout" | "purchase" | "recovery";
        };
        Update: never; // immutable
      };
      auth_nonces: {
        Row: AuthNonceRow;
        Insert: {
          nonce: string;
          wallet_address: string;
          created_at?: string;
        };
        Update: never;
      };
      errors: {
        Row: ErrorRow;
        Insert: {
          player_id?: string | null;
          error_type: string;
          error_message: string;
          severity: number;
          metadata?: Record<string, unknown> | null;
        };
        Update: never;
      };
    };
    Functions: {
      cleanup_old_data: { Args: Record<never, never>; Returns: void };
    };
  };
}
