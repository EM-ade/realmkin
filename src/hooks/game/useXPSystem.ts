import { create } from "zustand";
import { XP_ACTIONS, LEVEL_TABLE, LevelReward } from "@/game/config/xpConfig";
import { supabase } from "@/lib/supabase";

export interface XPContext {
  buildingId?: string;
  buildingType?: string;
  buildingLevel?: number;
  resourceAmount?: number;
}

export interface XPResult {
  awarded: boolean;
  xpGained: number;
  reason?: string;
  leveledUp: boolean;
  newLevel?: number;
  reward?: LevelReward;
}

export interface LevelUpData {
  previousLevel: number;
  newLevel: number;
  reward: LevelReward;
  totalXP: number;
}

export interface XPGain {
  uid: string; // unique reference to allow smooth unmounts
  actionId: string;
  displayName: string;
  xpAmount: number;
  timestamp: number;
  x?: number; // Screen coords for floating overlay
  y?: number;
}

interface XPSystemState {
  currentXP: number;
  currentLevel: number;
  xpToNextLevel: number;
  xpProgress: number; // 0.0 - 1.0
  totalXPEarned: number;
  lastAcknowledgedLevel: number; // Track last acknowledged level

  isFirstLoad: boolean; // FIXED: Prevent level-up overlay on first load
  pendingLevelUp: LevelUpData | null;
  recentGains: XPGain[];

  // Database tracking simplified for client
  actionTimestamps: Record<string, number>;
  actionDailyCounts: Record<string, number>;
  completedMilestones: string[];

  // Mutators
  awardXP: (actionId: string, context?: XPContext) => Promise<XPResult>;
  acknowledgeLevelUp: () => void;
  removeRecentGain: (uid: string) => void;

  // Hydrator - now includes lastAcknowledgedLevel
  setInitialState: (
    xp: number,
    level: number,
    milestones: string[],
    lastAcknowledgedLevel?: number,
  ) => void;

  // Check for pending level ups (only after data is loaded)
  checkForPendingLevelUp: () => void;
}

// Client-side Zustand store for optimistic UI integration
export const useXPSystem = create<XPSystemState>((set, get) => ({
  currentXP: 0,
  currentLevel: 1,
  xpToNextLevel: 100,
  xpProgress: 0,
  totalXPEarned: 0,
  lastAcknowledgedLevel: 1,
  isFirstLoad: true, // FIXED: Prevent level-up overlay on first load
  pendingLevelUp: null,
  recentGains: [],
  actionTimestamps: {},
  actionDailyCounts: {},
  completedMilestones: [],

  setInitialState: (xp, level, milestones, lastAcknowledgedLevel = 1) => {
    // Determine bounds
    const nextLvlDef = LEVEL_TABLE.find((l) => l.level === level + 1);
    const currLvlDef = LEVEL_TABLE.find((l) => l.level === level);

    // Safety fallback
    const requiredTotal = nextLvlDef ? nextLvlDef.totalXPRequired : 0;
    const baseTotal = currLvlDef ? currLvlDef.totalXPRequired : 0;
    const spread = requiredTotal - baseTotal;

    const xpInLevel = Math.max(0, xp - baseTotal);
    const progress = spread > 0 ? xpInLevel / spread : 1;

    set({
      currentXP: xpInLevel,
      currentLevel: level,
      totalXPEarned: xp,
      completedMilestones: milestones,
      xpToNextLevel: spread > 0 ? spread - xpInLevel : 0,
      xpProgress: Math.min(progress, 1),
      lastAcknowledgedLevel: lastAcknowledgedLevel,
      // FIXED: Keep isFirstLoad true - will be cleared after user earns first XP
    });

    // VERIFICATION: Log initial state
    console.log("[XP] ✅ setInitialState complete", {
      level,
      xp,
      lastAcknowledgedLevel,
      isFirstLoad: true,
    });
  },

  checkForPendingLevelUp: () => {
    const state = get();
    // FIXED: Don't show level-up overlay on first load - only after user plays
    if (state.isFirstLoad) {
      console.log("[XP] ⏭️ checkForPendingLevelUp skipped - isFirstLoad=true");
      return;
    }

    const { currentLevel, lastAcknowledgedLevel } = state;

    // Only show level up if current level is greater than acknowledged level
    if (currentLevel > lastAcknowledgedLevel) {
      // Find the reward for the level they just reached
      const levelDef = LEVEL_TABLE.find((l) => l.level === currentLevel);
      if (levelDef?.reward) {
        set({
          pendingLevelUp: {
            previousLevel: lastAcknowledgedLevel,
            newLevel: currentLevel,
            reward: levelDef.reward,
            totalXP: state.totalXPEarned,
          },
        });
        // VERIFICATION: Log level-up trigger
        console.log("[XP] 🔼 checkForPendingLevelUp triggered - showing overlay", {
          currentLevel,
          lastAcknowledgedLevel,
        });
      }
    } else {
      console.log("[XP] ⏭️ checkForPendingLevelUp skipped - no level-up needed", {
        currentLevel,
        lastAcknowledgedLevel,
      });
    }
  },

  awardXP: async (actionId: string, context?: XPContext): Promise<XPResult> => {
    const action = XP_ACTIONS[actionId];
    const state = get();

    if (!action) {
      return {
        awarded: false,
        xpGained: 0,
        reason: "unknown_action",
        leveledUp: false,
      };
    }

    // --- Client Side Optimistic Validation ---
    if (action.isOneTime && state.completedMilestones.includes(actionId)) {
      return {
        awarded: false,
        xpGained: 0,
        reason: "one_time",
        leveledUp: false,
      };
    }

    const lastRun = state.actionTimestamps[actionId] || 0;
    const now = Date.now();
    if (action.cooldownMs && now - lastRun < action.cooldownMs) {
      return {
        awarded: false,
        xpGained: 0,
        reason: "cooldown",
        leveledUp: false,
      };
    }

    // Calculate XP
    const xpGained = action.baseXP;
    if (xpGained <= 0) {
      return {
        awarded: false,
        xpGained: 0,
        reason: "zero_xp_defined",
        leveledUp: false,
      };
    }

    // --- Optimistic State Application ---
    const newTotalXP = state.totalXPEarned + xpGained;
    let newLevel = state.currentLevel;
    let leveledUp = false;
    let levelReward: LevelReward | undefined = undefined;

    // Fast loop to handle multiple level-ups at once (rare but possible)
    while (true) {
      const checkLvlDef = LEVEL_TABLE.find((l) => l.level === newLevel + 1);
      if (!checkLvlDef || newTotalXP < checkLvlDef.totalXPRequired) {
        break; // Stop climbing
      }
      leveledUp = true;
      newLevel++;
      levelReward = checkLvlDef.reward;
    }

    // Extract bound params for updated progress bar
    const currLvlDef =
      LEVEL_TABLE.find((l) => l.level === newLevel) || LEVEL_TABLE[0];
    const nextLvlDef = LEVEL_TABLE.find((l) => l.level === newLevel + 1);

    const spread = nextLvlDef
      ? nextLvlDef.totalXPRequired - currLvlDef.totalXPRequired
      : 0;
    const xpInLevel = Math.max(0, newTotalXP - currLvlDef.totalXPRequired);
    const progress = spread > 0 ? xpInLevel / spread : 1;

    // Track state (Milestone & Timestamp)
    const newMilestones = [...state.completedMilestones];
    if (action.isOneTime && !newMilestones.includes(actionId)) {
      newMilestones.push(actionId);
    }

    const uid = Math.random().toString(36).substring(7);

    set((prev) => ({
      ...prev,
      isFirstLoad: false, // FIXED: Allow level-up overlay after first XP earned
      recentGains: [
        ...prev.recentGains,
        {
          uid,
          actionId,
          displayName: action.displayName,
          xpAmount: xpGained,
          timestamp: now,
        },
      ].slice(-10), // Keep last 10
      totalXPEarned: newTotalXP,
      currentLevel: newLevel,
      currentXP: xpInLevel,
      xpToNextLevel: spread > 0 ? spread - xpInLevel : 0,
      xpProgress: Math.min(progress, 1),
      completedMilestones: newMilestones,
      actionTimestamps: { ...prev.actionTimestamps, [actionId]: now },
      pendingLevelUp: leveledUp
        ? {
            previousLevel: state.currentLevel,
            newLevel: newLevel,
            reward: levelReward!,
            totalXP: newTotalXP,
          }
        : prev.pendingLevelUp,
    }));

    // In production we send fetch to our edge function here.
    try {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return; // Do not spam 401s if the user hasn't logged in yet

        supabase.functions
          .invoke("process-xp", {
            body: {
              actionId,
              context,
              xpAmount: xpGained,
              leveledUp,
              newLevel,
            },
          })
          .catch(() => console.log("XP sync request failed"));
      });
    } catch (err) {
      // ignore
    }

    return {
      awarded: true,
      xpGained,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
      reward: levelReward,
    };
  },

  acknowledgeLevelUp: () => {
    const state = get();
    const { pendingLevelUp } = state;

    if (pendingLevelUp) {
      const newAcknowledgedLevel = pendingLevelUp.newLevel;

      // Update local state immediately
      set({
        lastAcknowledgedLevel: newAcknowledgedLevel,
        pendingLevelUp: null,
      });

      // Persist to database — fire and forget but log errors
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any)
          .from("players")
          .update({ last_acknowledged_level: newAcknowledgedLevel })
          .eq("id", session.user.id)
          .then(({ error }: { error: { message: string } | null }) => {
            if (error)
              console.warn(
                "[XP] Failed to persist acknowledged level:",
                error.message,
              );
          });
      });
    }
  },

  removeRecentGain: (uid: string) =>
    set((prev) => ({
      recentGains: prev.recentGains.filter((g) => g.uid !== uid),
    })),
}));
