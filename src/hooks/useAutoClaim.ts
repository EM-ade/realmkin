"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { rewardsService } from '@/services/rewardsService';

interface AutoClaimSettings {
  enabled: boolean;
  intervalHours: number;
  lastClaimAttempt: Date | null;
  nextScheduledClaim: Date | null;
}

const STORAGE_KEY = 'realmkin_auto_claim_settings';

export function useAutoClaim() {
  const { user } = useAuth();
  const { account } = useWeb3();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get default settings
  const getDefaultSettings = useCallback((): AutoClaimSettings => ({
    enabled: true,
    intervalHours: 6, // Check every 6 hours
    lastClaimAttempt: null,
    nextScheduledClaim: null,
  }), []);

  // Load settings from localStorage
  const loadSettings = useCallback((): AutoClaimSettings => {
    if (typeof window === 'undefined') return getDefaultSettings();

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          lastClaimAttempt: parsed.lastClaimAttempt ? new Date(parsed.lastClaimAttempt) : null,
          nextScheduledClaim: parsed.nextScheduledClaim ? new Date(parsed.nextScheduledClaim) : null,
        };
      }
    } catch (error) {
      console.error('Error loading auto-claim settings:', error);
    }

    return getDefaultSettings();
  }, [getDefaultSettings]);

  // Save settings to localStorage
  const saveSettings = useCallback((settings: AutoClaimSettings) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving auto-claim settings:', error);
    }
  }, []);

  // Check if it's time to attempt auto-claim
  const shouldAttemptClaim = useCallback((settings: AutoClaimSettings): boolean => {
    if (!settings.enabled || !settings.nextScheduledClaim) return false;

    const now = new Date();
    return now >= settings.nextScheduledClaim;
  }, []);

  // Attempt to claim rewards
  const attemptAutoClaim = useCallback(async () => {
    if (!user || !account) return;

    try {
      console.log('🤖 Attempting auto-claim for user:', user.uid);

      // Get user rewards to check eligibility
      const userRewards = await rewardsService.getUserRewards(user.uid);
      if (!userRewards) {
        console.log('No user rewards found');
        return;
      }

      // Calculate if claim is available
      const nfts = await rewardsService.initializeUserRewards(
        user.uid,
        account,
        userRewards.totalNFTs
      );

      const calculation = rewardsService.calculatePendingRewards(
        nfts,
        userRewards.totalNFTs
      );

      if (calculation.canClaim && calculation.pendingAmount > 0) {
        // Perform the claim
        const claimRecord = await rewardsService.claimRewards(user.uid, account);

        console.log(`✅ Auto-claimed ₥${claimRecord.amount} for user ${user.uid}`);

        // Update settings with successful claim
        const settings = loadSettings();
        settings.lastClaimAttempt = new Date();
        settings.nextScheduledClaim = new Date(Date.now() + (settings.intervalHours * 60 * 60 * 1000));
        saveSettings(settings);

        // Trigger a page refresh to update UI
        window.location.reload();

      } else {
        console.log('No rewards available for auto-claim');

        // Still update next scheduled time
        const settings = loadSettings();
        settings.lastClaimAttempt = new Date();
        settings.nextScheduledClaim = new Date(Date.now() + (settings.intervalHours * 60 * 60 * 1000));
        saveSettings(settings);
      }

    } catch (error) {
      console.error('Auto-claim failed:', error);

      // Update settings even on failure to prevent spam
      const settings = loadSettings();
      settings.lastClaimAttempt = new Date();
      settings.nextScheduledClaim = new Date(Date.now() + (settings.intervalHours * 60 * 60 * 1000));
      saveSettings(settings);
    }
  }, [user, account, loadSettings, saveSettings]);

  // Start the auto-claim monitoring
  const startAutoClaim = useCallback(() => {
    if (!user || !account) return;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Check immediately
    const settings = loadSettings();
    if (shouldAttemptClaim(settings)) {
      attemptAutoClaim();
    }

    // Set up periodic checking (every 5 minutes)
    intervalRef.current = setInterval(() => {
      const currentSettings = loadSettings();
      if (shouldAttemptClaim(currentSettings)) {
        attemptAutoClaim();
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

  }, [user, account, loadSettings, shouldAttemptClaim, attemptAutoClaim]);

  // Stop auto-claiming
  const stopAutoClaim = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AutoClaimSettings>) => {
    const currentSettings = loadSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };

    // Recalculate next scheduled claim if interval changed
    if (newSettings.intervalHours) {
      updatedSettings.nextScheduledClaim = new Date(Date.now() + (newSettings.intervalHours * 60 * 60 * 1000));
    }

    saveSettings(updatedSettings);
  }, [loadSettings, saveSettings]);

  // Initialize on mount and when user/account changes
  useEffect(() => {
    if (user && account) {
      // Initialize settings if not exists
      const settings = loadSettings();
      if (!settings.nextScheduledClaim) {
        settings.nextScheduledClaim = new Date(Date.now() + (settings.intervalHours * 60 * 60 * 1000));
        saveSettings(settings);
      }

      startAutoClaim();
    } else {
      stopAutoClaim();
    }

    return () => {
      stopAutoClaim();
    };
  }, [user, account, startAutoClaim, stopAutoClaim, loadSettings, saveSettings]);

  // Handle page visibility changes (important for mobile)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && account) {
        const settings = loadSettings();
        if (shouldAttemptClaim(settings)) {
          attemptAutoClaim();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, account, loadSettings, shouldAttemptClaim, attemptAutoClaim]);

  return {
    settings: loadSettings(),
    updateSettings,
    attemptAutoClaim,
    startAutoClaim,
    stopAutoClaim,
  };
}