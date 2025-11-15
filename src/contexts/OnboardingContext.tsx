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
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isOnboarding, setIsOnboarding] = useState(true);
  const [isNewUser, setIsNewUserState] = useState(false);

  // Load saved onboarding progress on mount
  useEffect(() => {
    try {
      if (user?.uid) {
        const progressKey = `onboarding_progress_${user.uid}`;
        const savedStep = localStorage.getItem(progressKey);
        if (savedStep && STEPS.includes(savedStep as OnboardingStep)) {
          const step = savedStep as OnboardingStep;
          setCurrentStep(step);
          // If saved step is "complete", don't show onboarding
          if (step === "complete") {
            setIsOnboarding(false);
          }
        }
      }
    } catch (e) {
      // localStorage not available
    }
  }, [user?.uid]);

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
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};
