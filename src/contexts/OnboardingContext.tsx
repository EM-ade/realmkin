"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

export type OnboardingStep = "welcome" | "wallet" | "username" | "discord" | "verification" | "complete";

interface OnboardingContextType {
  currentStep: OnboardingStep;
  isOnboarding: boolean;
  isNewUser: boolean;
  startOnboarding: () => void;
  completeStep: (step: OnboardingStep) => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  getProgress: () => number;
  setIsNewUser: (isNew: boolean) => void;
  setStartingStep: (step: OnboardingStep) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
};

const STEPS: OnboardingStep[] = ["welcome", "wallet", "username", "discord", "complete"];

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider = ({ children }: OnboardingProviderProps) => {
  const { user, userData } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [isNewUser, setIsNewUserState] = useState(false);
  const [startingStep, setStartingStepState] = useState<OnboardingStep>("welcome");
  const [discordLinked, setDiscordLinked] = useState(false);

  // Check Discord link status
  useEffect(() => {
    async function checkDiscordLink() {
      if (user?.uid) {
        try {
          const gatekeeperBase = process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev";
          const response = await fetch(`${gatekeeperBase}/api/discord/status/${user.uid}`);
          if (response.ok) {
            const data = await response.json();
            setDiscordLinked(data.linked || false);
          }
        } catch (error) {
          console.error("Error checking Discord status:", error);
        }
      }
    }
    checkDiscordLink();
  }, [user?.uid]);

  // Determine if user should see onboarding and which step to start at
  useEffect(() => {
    try {
      if (user?.uid) {
        const progressKey = `onboarding_progress_${user.uid}`;
        const savedStep = localStorage.getItem(progressKey);
        
        // If already completed, don't show onboarding
        if (savedStep === "complete") {
          setIsOnboarding(false);
          setCurrentStep("complete");
          return;
        }

        // New user: show full onboarding from welcome
        if (isNewUser) {
          setIsOnboarding(true);
          setCurrentStep("welcome");
          setStartingStepState("welcome");
          return;
        }

        // Old user logic
        const hasWallet = !!userData?.walletAddress;
        const hasUsername = !!userData?.username;

        // Old user with everything done: don't show onboarding
        if (hasWallet && hasUsername && discordLinked) {
          setIsOnboarding(false);
          setCurrentStep("complete");
          return;
        }

        // Old user missing Discord: show only Discord step
        if (hasWallet && hasUsername && !discordLinked) {
          setIsOnboarding(true);
          setCurrentStep("discord");
          setStartingStepState("discord");
          return;
        }

        // Old user missing wallet or username: show from wallet step
        if (!hasWallet || !hasUsername) {
          setIsOnboarding(true);
          setCurrentStep("wallet");
          setStartingStepState("wallet");
          return;
        }

        // Default: don't show onboarding
        setIsOnboarding(false);
        setCurrentStep("complete");
      }
    } catch (e) {
      // localStorage not available
    }
  }, [user?.uid, isNewUser, userData?.walletAddress, userData?.username, discordLinked]);

  // Save progress whenever step changes
  useEffect(() => {
    try {
      if (user?.uid) {
        const progressKey = `onboarding_progress_${user.uid}`;
        localStorage.setItem(progressKey, currentStep);
      }
    } catch (e) {
      // localStorage not available
    }
  }, [currentStep, user?.uid]);

  const startOnboarding = useCallback(() => {
    setIsOnboarding(true);
    setCurrentStep("welcome");
    // Set flag to prevent auto-login during onboarding
    localStorage.setItem('onboarding_active', 'true');
  }, []);

  const completeStep = useCallback((step: OnboardingStep) => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentIndex + 1]);
    } else {
      setCurrentStep("complete");
      // Clear onboarding flag to allow auto-login
      localStorage.removeItem('onboarding_active');
      setTimeout(() => setIsOnboarding(false), 1000);
    }
  }, []);

  const skipOnboarding = useCallback(() => {
    setIsOnboarding(false);
    setCurrentStep("complete");
    // Clear onboarding flag to allow auto-login
    localStorage.removeItem('onboarding_active');
  }, []);

  const resetOnboarding = useCallback(() => {
    setCurrentStep("welcome");
    setIsOnboarding(true);
  }, []);

  const getProgress = useCallback(() => {
    const index = STEPS.indexOf(currentStep);
    return Math.round(((index + 1) / STEPS.length) * 100);
  }, [currentStep]);

  const setIsNewUser = useCallback((isNew: boolean) => {
    setIsNewUserState(isNew);
  }, []);

  const setStartingStep = useCallback((step: OnboardingStep) => {
    setStartingStepState(step);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        isOnboarding,
        isNewUser,
        startOnboarding,
        completeStep,
        skipOnboarding,
        resetOnboarding,
        getProgress,
        setIsNewUser,
        setStartingStep,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};
