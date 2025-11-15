"use client";

import { useOnboarding } from "@/contexts/OnboardingContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useDiscord } from "@/contexts/DiscordContext";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { getAuth } from "firebase/auth";

const STEPS = ["welcome", "wallet", "username", "discord", "complete"];

export default function OnboardingWizard() {
  const { isOnboarding, currentStep, completeStep, skipOnboarding, getProgress } = useOnboarding();
  const { user } = useAuth();
  const { isConnected, connectWallet } = useWeb3();
  const { discordLinked, connectDiscord } = useDiscord();
  const [isVisible, setIsVisible] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNextStep = () => {
    const currentIndex = STEPS.indexOf(currentStep);
    if (currentIndex < STEPS.length - 1) {
      completeStep(currentStep);
    }
  };

  useEffect(() => {
    setIsVisible(isOnboarding);
    // Set onboarding flag to prevent navigation during wallet connection
    if (isOnboarding) {
      localStorage.setItem('onboarding_active', 'true');
    } else {
      localStorage.removeItem('onboarding_active');
    }
  }, [isOnboarding]);

  // Auto-skip wallet step if already connected
  useEffect(() => {
    if (currentStep === "wallet" && isConnected) {
      completeStep("wallet");
    }
  }, [currentStep, isConnected, completeStep]);

  // Auto-skip discord step if already linked
  useEffect(() => {
    if (currentStep === "discord" && discordLinked) {
      completeStep("discord");
    }
  }, [currentStep, discordLinked, completeStep]);

  if (!isVisible) return null;

  const progress = getProgress();

  const handleWalletConnect = async () => {
    await connectWallet();
    if (isConnected) {
      completeStep("wallet");
    }
  };

  const handleDiscordConnect = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    try {
      // Cast user to the expected type for connectDiscord
      const firebaseUser = user as { uid: string; getIdToken: () => Promise<string> };
      await connectDiscord(firebaseUser);
      // Note: Discord connection redirects, so completeStep won't be called immediately
      // The redirect will handle the flow after Discord auth
    } catch (error) {
      console.error("Discord connect error:", error);
      toast.error("Failed to connect Discord");
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    setUsernameError("");
    
    if (value.length < 3) {
      setUsernameError("Username must be at least 3 characters");
    } else if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError("Only letters, numbers, and underscores allowed");
    }
  };

  const handleUsernameSubmit = async () => {
    if (username.length < 3 || usernameError) {
      setUsernameError("Please enter a valid username");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Get current Firebase user directly
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error("❌ No current user in Firebase auth");
        toast.error("User not authenticated");
        setIsSubmitting(false);
        return;
      }

      console.log("💾 Saving username for user:", currentUser.uid);

      // Save username to user profile in Firestore (use setDoc with merge to create if doesn't exist)
      const userDocRef = doc(db, "users", currentUser.uid);
      try {
        await setDoc(userDocRef, {
          username: username.toLowerCase(),
          updatedAt: new Date(),
        }, { merge: true });
        console.log("✅ User document updated with username");
      } catch (userError) {
        console.error("❌ Error updating user document:", userError);
        throw userError;
      }

      // Also create username mapping for quick lookup
      const usernameDocRef = doc(db, "usernames", username.toLowerCase());
      try {
        await setDoc(usernameDocRef, {
          uid: currentUser.uid,
          createdAt: new Date(),
        });
        console.log("✅ Username mapping created");
      } catch (usernameError) {
        console.error("❌ Error creating username mapping:", usernameError);
        // Don't throw - username was saved to user doc, this is just a mapping
      }
      console.log("✅ Username saved successfully:", username);
      toast.success("Username set!");
      setIsSubmitting(false);
      completeStep("username");
    } catch (error) {
      console.error("❌ Failed to save username:", error);
      const errorMsg = error instanceof Error ? error.message : "Failed to save username";
      toast.error(errorMsg);
      setIsSubmitting(false);
    }
  };

  const stepContent: Record<string, { title: string; description: string; action: () => void | Promise<void>; actionLabel: string }> = {
    welcome: {
      title: "Welcome to Realmkin",
      description: "Let's get you set up in 4 simple steps",
      action: () => completeStep("welcome"),
      actionLabel: "Get Started",
    },
    wallet: {
      title: "Connect Your Wallet",
      description: "Connect your Solana wallet to access your NFTs and earn rewards",
      action: handleWalletConnect,
      actionLabel: isConnected ? "✓ Wallet Connected" : "Connect Wallet",
    },
    username: {
      title: "Create Your Username",
      description: "Set up your unique username for the Realmkin community",
      action: handleUsernameSubmit,
      actionLabel: username ? "Set Username" : "Enter Username",
    },
    discord: {
      title: "Link Discord",
      description: "Connect your Discord account to join our community and get verified",
      action: handleDiscordConnect,
      actionLabel: discordLinked ? "✓ Discord Linked" : "Link Discord",
    },
    complete: {
      title: "All Set!",
      description: "You're ready to explore Realmkin. Have fun!",
      action: skipOnboarding,
      actionLabel: "Start Exploring",
    },
  };

  const content = stepContent[currentStep] || stepContent.welcome;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-3xl border border-[#DA9C2F]/30 bg-gradient-to-b from-[#1a1a1a] to-[#0f0f0f] p-8 shadow-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-[#DA9C2F]/60">
            <span>Step {STEPS.indexOf(currentStep) + 1} of {STEPS.length}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-[#DA9C2F]/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#DA9C2F] to-[#ffbf00] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="mb-8 text-center">
          <h2 className="mb-3 text-2xl font-bold text-[#DA9C2F]">{content.title}</h2>
          <p className="text-sm text-white/70">{content.description}</p>
          
          {/* Username Input for username step */}
          {currentStep === "username" && (
            <div className="mt-6 space-y-3">
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => handleUsernameChange(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg bg-[#0f0f0f] border-2 text-white placeholder-white/30 focus:outline-none transition-colors ${
                  usernameError
                    ? "border-red-500 focus:border-red-400"
                    : "border-[#DA9C2F]/30 focus:border-[#DA9C2F]"
                }`}
                autoFocus
              />
              {usernameError && (
                <p className="text-red-400 text-sm">⚠ {usernameError}</p>
              )}
              {!usernameError && username.length >= 3 && (
                <p className="text-green-400 text-sm">✓ Username available</p>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={content.action}
            disabled={isSubmitting || (currentStep === "username" && (username.length < 3 || !!usernameError))}
            className="w-full rounded-xl py-3 font-semibold transition-all bg-[#DA9C2F] text-black hover:bg-[#ffbf00] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#DA9C2F]"
          >
            {isSubmitting ? "Processing..." : content.actionLabel}
          </button>
          
          {currentStep !== "complete" && (
            <button
              onClick={skipOnboarding}
              className="w-full rounded-xl border border-[#DA9C2F]/30 py-3 font-semibold text-[#DA9C2F] transition-all hover:bg-[#DA9C2F]/10 disabled:opacity-50"
              disabled={isSubmitting}
            >
              Skip for now
            </button>
          )}
        </div>

        {/* Step Indicators */}
        <div className="mt-8 flex justify-center gap-2">
          {STEPS.map((step) => (
            <div
              key={step}
              className={`h-2 w-2 rounded-full transition-all ${
                STEPS.indexOf(step) <= STEPS.indexOf(currentStep)
                  ? "bg-[#DA9C2F]"
                  : "bg-[#DA9C2F]/20"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
