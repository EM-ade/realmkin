// ─────────────────────────────────────────────────────────────────────────────
// PRICING CONFIGURATION
// Single source of truth for all gem-related prices, speed-up tiers,
// and monetization values. Import this wherever gem prices are needed
// instead of scattering magic numbers throughout the codebase.
// ─────────────────────────────────────────────────────────────────────────────

import type { GemPack } from "@/hooks/game/useSolanaPayment";

// ── Gem Packs (Season 1 Revised) ─────────────────────────────────────────────
/**
 * Season 1 gem pack offerings.
 * Psychological pricing:
 * - $1.99 floor: Adults feel they made a decision
 * - $9.99 sweet spot: Below "pause and calculate" threshold
 * - $24.99 anchor: Makes $9.99 look like the smart choice
 */
export const SEASON1_GEM_PACKS: GemPack[] = [
  {
    id: "handful",
    name: "Handful",
    gems: 100,
    usdPrice: 1.99,
    displayName: "Handful",
  },
  {
    id: "pouch",
    name: "Pouch",
    gems: 280,
    usdPrice: 4.99,
    displayName: "Pouch",
  },
  {
    id: "chest",
    name: "Chest",
    gems: 750,
    usdPrice: 9.99,
    displayName: "Chest",
  },
  {
    id: "vault",
    name: "Vault",
    gems: 2000,
    usdPrice: 24.99,
    displayName: "Vault",
  },
];

// Legacy gem packs for backward compatibility during migration
export const LEGACY_GEM_PACKS: GemPack[] = [
  {
    id: "handful",
    name: "Handful",
    gems: 80,
    usdPrice: 0.15,
    displayName: "Handful",
  },
  {
    id: "pouch",
    name: "Pouch",
    gems: 200,
    usdPrice: 0.3,
    displayName: "Pouch",
  },
  {
    id: "chest",
    name: "Chest",
    gems: 475,
    usdPrice: 0.65,
    displayName: "Chest",
  },
];

// ── Speed-Up Tiers (Season 1 Revised) ────────────────────────────────────────
/**
 * Tiered speed-up pricing encourages habitual use.
 * Players won't pay for 7-day skips often, but 1-day skips become habitual.
 */
export interface SpeedUpTier {
  maxRemainingMs: number;
  gemCost: number;
  label: string;
}

export const SPEED_UP_TIERS: SpeedUpTier[] = [
  { maxRemainingMs: 30 * 60 * 1000, gemCost: 10, label: "< 30 min" },
  { maxRemainingMs: 24 * 60 * 60 * 1000, gemCost: 110, label: "< 1 day" },
  { maxRemainingMs: 3 * 24 * 60 * 60 * 1000, gemCost: 350, label: "< 3 days" },
  { maxRemainingMs: 7 * 24 * 60 * 60 * 1000, gemCost: 700, label: "< 7 days" },
];

/**
 * Calculate gem cost for speed-up based on remaining time.
 * Uses tiered pricing instead of linear formula.
 */
export function calcSpeedUpCost(remainingMs: number): number {
  for (const tier of SPEED_UP_TIERS) {
    if (remainingMs <= tier.maxRemainingMs) {
      return tier.gemCost;
    }
  }
  return SPEED_UP_TIERS[SPEED_UP_TIERS.length - 1].gemCost;
}

// ── Builder Slot Pricing ──────────────────────────────────────────────────────
export const BUILDER_SLOT_COSTS = {
  second: 200,
  third: 400,
  fourth: 800,
} as const;

export const MAX_BUILDERS = 4;
export const DEFAULT_BUILDERS = 2;

// ── Autominer ─────────────────────────────────────────────────────────────────
export const AUTOMINER_COST = 500;
export const AUTOMINER_USD_EQUIVALENT = 9.99;

// ── Username Change ───────────────────────────────────────────────────────────
export const USERNAME_CHANGE_COST = 150;

// ── Building Specialization Reset (Level 3 choice) ───────────────────────────
export const SPECIALIZATION_RESET_COST = 300;

// ── Season Pass ───────────────────────────────────────────────────────────────
export const SEASON_PASS_BASIC = 9.99;
export const SEASON_PASS_PREMIUM = 19.99;
export const SEASON_PASS_BASIC_GEMS_PER_WEEK = 50;
export const SEASON_PASS_PREMIUM_GEMS_PER_WEEK = 100;
export const SEASON_PASS_SPEED_UP_DISCOUNT = 0.15; // 15% off speed-ups

// ── Trade Route Contracts ─────────────────────────────────────────────────────
export const TRADE_ROUTE_CONTRACT_COST = 50; // gems per contract

// ── Research Archive ─────────────────────────────────────────────────────────
export const RESEARCH_ARCHIVE_BYPASS_COST = 75; // gems per node

// ── Resource Economy ─────────────────────────────────────────────────────────
/**
 * Production rate multiplier (0.5 = 50% of current).
 * Applied globally to make resources feel scarcer.
 */
export const PRODUCTION_RATE_MULTIPLIER = 0.5;

/**
 * Resource decay: uncollected resources lose this percentage every 24 hours.
 * Makes the Autominer essential for working adults.
 */
export const RESOURCE_DECAY_RATE = 0.15; // 15% per 24 hours

/**
 * Soft cap thresholds - production slows as storage fills.
 */
export const SOFT_CAP_THRESHOLDS = {
  fiftyPercentSpeed: 0.5, // 80% speed at 50% full
  zeroPercentSpeed: 1.0, // 0% speed at 100% full
} as const;

export function getProductionSpeedMultiplier(storageUsedRatio: number): number {
  if (storageUsedRatio >= SOFT_CAP_THRESHOLDS.zeroPercentSpeed) return 0;
  if (storageUsedRatio >= SOFT_CAP_THRESHOLDS.fiftyPercentSpeed) {
    return 0.8;
  }
  return 1;
}

// ── NFT Holder Discounts ──────────────────────────────────────────────────────
export const NFT_HOLDER_DISCOUNTS = {
  secondaryHolder: {
    gemDiscount: 0.1, // 10% gem discount
    collectorCapacityBonus: 0.15, // 15% collector capacity
    freePlot: "common",
  },
  mainMintHolder: {
    gemDiscount: 0.2, // 20% gem discount
    collectorCapacityBonus: 0.25, // 25% collector capacity
    freePlot: "fertile",
    weeklyGems: 25,
  },
  dualHolder: {
    gemDiscount: 0.25, // 25% gem discount
    collectorCapacityBonus: 0.3, // 30% collector capacity
    freePlot: "ancient",
    weeklyGems: 35,
  },
} as const;

// ── Always Paid Items (no discount) ──────────────────────────────────────────
/**
 * These items cannot be discounted even for NFT holders.
 * Per Section 9 of the monetization brief.
 */
export const NON_DISCOUNTABLE_ITEMS = [
  "autominer",
  "builder_slot_2",
  "builder_slot_3",
  "builder_slot_4",
  "founders_parcel",
  "speed_ups",
] as const;

// ── NFT Land Plot Pricing ─────────────────────────────────────────────────────
export const NFT_LAND_PLOTS = {
  common: {
    name: "Common Plot",
    spacesBonus: 5,
    usdPrice: 9.99,
    productionBonus: 0,
  },
  fertile: {
    name: "Fertile Plot",
    spacesBonus: 8,
    usdPrice: 29.99,
    productionBonus: 0.1,
  },
  ancient: {
    name: "Ancient Grounds",
    spacesBonus: 8,
    usdPrice: 49.99,
    productionBonus: 0.15,
  },
  foundersParcel: {
    name: "Founder's Parcel",
    spacesBonus: 10,
    usdPrice: 99.99,
    productionBonus: 0.2,
    isFounderExclusive: true,
  },
} as const;

// ── Founder's Town Hall Skin ──────────────────────────────────────────────────
export const FOUNDERS_TOWN_HALL_SKIN = {
  name: "Founder's Town Hall",
  usdPrice: 49.99,
  supply: 25,
  seasonExclusive: "season_1",
} as const;