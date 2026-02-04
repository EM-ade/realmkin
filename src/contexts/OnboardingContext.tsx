"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

export type OnboardingStep =
  | "welcome"
  | "wallet"
  | "username"
  | "discord"
  | "verification"
  | "complete";

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

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within OnboardingProvider");
  }
  return context;
};

const STEPS: OnboardingStep[] = [
  "welcome",
  "wallet",
  "username",
  "discord",
  "complete",
];

interface OnboardingProviderProps {
  children: ReactNode;
}

export const OnboardingProvider = ({ children }: OnboardingProviderProps) => {
  const { user, userData } = useAuth();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>("welcome");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isNewUser, setIsNewUserState] = useState(false);
  const [startingStep, setStartingStepState] =
    useState<OnboardingStep>("welcome");
  const [discordLinked, setDiscordLinked] = useState(false);
  const [usernameMappingValid, setUsernameMappingValid] = useState<
    boolean | null
  >(null);
  const [walletMappingValid, setWalletMappingValid] = useState<boolean | null>(
    null,
  );

  // Check Discord link status
  useEffect(() => {
    async function checkDiscordLink() {
      if (user?.uid) {
        try {
          const gatekeeperBase =
            process.env.NEXT_PUBLIC_GATEKEEPER_BASE ||
            "https://gatekeeper-bmvu.onrender.com";
          const response = await fetch(
            `${gatekeeperBase}/api/discord/status/${user.uid}`,
          );
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
    const run = async () => {
      try {
        if (user?.uid) {
          const progressKey = `onboarding_progress_${user.uid}`;
          const completedKey = `onboarding_completed_${user.uid}`;
          const savedStep = localStorage.getItem(progressKey);
          const hasCompleted = localStorage.getItem(completedKey) === "true";

          // If user has already completed onboarding, never show it again
          if (hasCompleted || savedStep === "complete") {
            setIsOnboarding(false);
            setCurrentStep("complete");
            // Clear incomplete setup flag when onboarding is complete
            localStorage.removeItem("realmkin_incomplete_setup");
            return;
          }

          if (isNewUser) {
            setIsOnboarding(true);
            setCurrentStep("welcome");
            setStartingStepState("welcome");
            return;
          }

          const hasWallet = !!userData?.walletAddress;
          const hasUsername = !!userData?.username;
          let unameOk: boolean | null = null;
          let walletOk: boolean | null = null;
          if (hasUsername) {
            const unameRef = doc(
              db,
              "usernames",
              String(userData?.username).toLowerCase(),
            );
            const unameSnap = await getDoc(unameRef);
            unameOk = unameSnap.exists() && unameSnap.data()?.uid === user?.uid;
          }
          if (hasWallet) {
            const walletRef = doc(
              db,
              "wallets",
              String(userData?.walletAddress).toLowerCase(),
            );
            const walletSnap = await getDoc(walletRef);
            walletOk =
              walletSnap.exists() && walletSnap.data()?.uid === user?.uid;
          }
          setUsernameMappingValid(unameOk);
          setWalletMappingValid(walletOk);

          // If user has basic setup (wallet and username), mark onboarding as complete
          // Discord is optional and shouldn't block completion
          if (
            hasWallet &&
            hasUsername &&
            unameOk !== false &&
            walletOk !== false
          ) {
            setIsOnboarding(false);
            setCurrentStep("complete");
            // Mark onboarding as permanently completed
            localStorage.setItem(completedKey, "true");
            localStorage.setItem(progressKey, "complete");
            // Clear incomplete setup flag when onboarding is complete
            localStorage.removeItem("realmkin_incomplete_setup");
            return;
          }

          // Only show onboarding if user is missing critical setup
          // DISABLE AUTO-ONBOARDING for existing users
          // We only want onboarding to trigger if explicitly requested (e.g. via "Create Profile")
          // or if it's a fresh sign-up.
          /*
          if (walletOk === false || !hasWallet) {
            setIsOnboarding(true);
            setCurrentStep("wallet");
            setStartingStepState("wallet");
            return;
          }
          if (unameOk === false || !hasUsername) {
            setIsOnboarding(true);
            setCurrentStep("username");
            setStartingStepState("username");
            return;
          }
          */

          // Fallback: user has everything, mark complete
          setIsOnboarding(false);
          setCurrentStep("complete");
          localStorage.setItem(completedKey, "true");
          localStorage.setItem(progressKey, "complete");
          // Clear incomplete setup flag when onboarding is complete
          localStorage.removeItem("realmkin_incomplete_setup");
        }
      } catch {}
    };
    run();
  }, [
    user?.uid,
    isNewUser,
    userData?.walletAddress,
    userData?.username,
    discordLinked,
  ]);

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
    localStorage.setItem("onboarding_active", "true");
  }, []);

  const completeStep = useCallback(
    (step: OnboardingStep) => {
      const currentIndex = STEPS.indexOf(step);
      if (currentIndex < STEPS.length - 1) {
        setCurrentStep(STEPS[currentIndex + 1]);
      } else {
        setCurrentStep("complete");
        // Mark onboarding as permanently completed
        if (user?.uid) {
          const completedKey = `onboarding_completed_${user.uid}`;
          localStorage.setItem(completedKey, "true");
        }
        // Clear onboarding flag to allow auto-login
        localStorage.removeItem("onboarding_active");
        setTimeout(() => setIsOnboarding(false), 1000);
      }
    },
    [user?.uid],
  );

  const skipOnboarding = useCallback(() => {
    // Check if user has incomplete setup before allowing skip
    const hasIncompleteSetup =
      localStorage.getItem("realmkin_incomplete_setup") === "true";

    if (hasIncompleteSetup) {
      console.log("Cannot skip onboarding for users with incomplete setup");
      // Don't skip onboarding for users with incomplete setup
      return;
    }

    setIsOnboarding(false);
    setCurrentStep("complete");
    // Mark onboarding as permanently completed
    if (user?.uid) {
      const completedKey = `onboarding_completed_${user.uid}`;
      localStorage.setItem(completedKey, "true");
    }
    // Clear onboarding flag to allow auto-login
    localStorage.removeItem("onboarding_active");
  }, [user?.uid]);

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

  const resumeOnboardingAtStep = useCallback((step: OnboardingStep) => {
    console.log(`📍 Resuming onboarding at step: ${step}`);
    setCurrentStep(step);
    setIsOnboarding(true);
  }, []);

  // Expose resume function globally for Web3Context to use
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__realmkin_onboarding_trigger = (step: string) => {
        console.log(`🎯 Onboarding trigger called with step: ${step}`);
        resumeOnboardingAtStep(step as OnboardingStep);
      };
    }

    return () => {
      if (typeof window !== "undefined") {
        delete window.__realmkin_onboarding_trigger;
      }
    };
  }, [resumeOnboardingAtStep]);

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
