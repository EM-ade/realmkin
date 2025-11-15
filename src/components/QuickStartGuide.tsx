"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useOnboarding } from "@/contexts/OnboardingContext";

const STEPS = [
  {
    number: 1,
    title: "Welcome to Realmkin",
    description: "Realmkin is a Web3 gaming platform where you earn MKIN tokens by holding NFTs and participating in activities.",
    icon: "👑",
    action: "Continue",
    details: "What is Realmkin?\n• Earn MKIN tokens by holding verified NFTs\n• Weekly auto-mining based on your collection\n• Stake NFTs for additional rewards\n• Trade and claim rewards to Solana\n• Join a thriving Web3 community",
  },
  {
    number: 2,
    title: "Connect Your Wallet",
    description: "Link your Solana wallet to access your NFTs and start earning MKIN rewards.",
    icon: "🔗",
    action: "Connect Wallet",
    details: "Why connect your wallet?\n• Verify your NFT collection\n• Enable weekly auto-mining rewards\n• Claim MKIN to your Solana wallet\n• Participate in staking\n• Your wallet is secure - we never access your funds",
  },
  {
    number: 3,
    title: "Create Your Username",
    description: "Set up your unique username to personalize your Realmkin profile.",
    icon: "👤",
    action: "Set Username",
    details: "Your username:\n• Identifies you in the community\n• Appears on leaderboards\n• Used for Discord verification\n• Can be changed anytime\n• Must be 3-20 characters",
  },
  {
    number: 4,
    title: "Link Discord",
    description: "Connect your Discord account to receive weekly auto-claim notifications and join our community.",
    icon: "💬",
    action: "Link Discord",
    details: "What Gatekeeper will do:\n• Verify your NFT collection automatically\n• Send weekly mining notifications via DM\n• Show earnings added to your balance\n• Confirm claim transactions\n• Assign roles based on your holdings\n• Keep you updated on events",
  },
  {
    number: 5,
    title: "Start Earning",
    description: "You're all set! Begin your journey in Realmkin.",
    icon: "🚀",
    action: "Explore Dashboard",
    details: "Next Steps:\n• View your mining rate in the Wallet\n• Check your NFT collection\n• Stake NFTs for bonus rewards\n• Claim MKIN to Solana\n• Join our Discord community\n• Participate in events",
  },
];

export default function QuickStartGuide() {
  const { user } = useAuth();
  const { isConnected } = useWeb3();
  const { isNewUser } = useOnboarding();
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [isSkipped, setIsSkipped] = useState(false);

  // Load expanded step and skip state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("quickstart_expanded_step");
      if (saved) {
        setExpandedStep(parseInt(saved, 10));
      }
      const skipped = localStorage.getItem("quickstart_skipped");
      if (skipped === "true") {
        setIsSkipped(true);
      }
    } catch (e) {
      // localStorage not available
    }
  }, []);

  // Save expanded step to localStorage when it changes
  useEffect(() => {
    try {
      if (expandedStep !== null) {
        localStorage.setItem("quickstart_expanded_step", expandedStep.toString());
      }
    } catch (e) {
      // localStorage not available
    }
  }, [expandedStep]);

  // Handle skip
  const handleSkip = () => {
    try {
      localStorage.setItem("quickstart_skipped", "true");
      setIsSkipped(true);
    } catch (e) {
      // localStorage not available
    }
  };

  // Only show if user is logged in and not skipped
  if (!user || isSkipped) {
    return null;
  }

  return (
    <section className="py-12 px-4 bg-gradient-to-b from-[#DA9C2F]/5 to-transparent rounded-3xl mb-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 flex justify-between items-start">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-[#DA9C2F] mb-2">
              Quick Start Guide
            </h2>
            <p className="text-white/60">
              Get started with Realmkin in 4 simple steps
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="px-3 py-1 text-sm text-white/60 hover:text-white border border-white/20 rounded-lg hover:border-white/40 transition-colors"
          >
            Skip
          </button>
        </div>

        <div className="space-y-3">
          {STEPS.map((step, index) => (
            <div
              key={step.number}
              className="group rounded-xl border border-[#DA9C2F]/20 bg-[#0f0f0f]/50 hover:border-[#DA9C2F]/50 transition-all cursor-pointer overflow-hidden"
              onClick={() =>
                setExpandedStep(expandedStep === step.number ? null : step.number)
              }
            >
              <div className="p-4 flex items-center gap-4">
                {/* Step number */}
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#DA9C2F]/20 flex items-center justify-center">
                  <span className="text-2xl">{step.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <h3 className="font-bold text-[#DA9C2F] mb-1">
                    Step {step.number}: {step.title}
                  </h3>
                  <p className="text-sm text-white/60">{step.description}</p>
                </div>

                {/* Chevron */}
                <div
                  className={`flex-shrink-0 text-[#DA9C2F] transition-transform ${
                    expandedStep === step.number ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </div>
              </div>

              {expandedStep === step.number && (
                <div className="px-4 pb-4 border-t border-[#DA9C2F]/10">
                  <p className="text-sm text-white/70 mb-3">
                    {step.description}
                  </p>
                  {typeof (step as Record<string, unknown>).details === 'string' && (
                    <div className="mb-4 p-3 bg-[#DA9C2F]/5 rounded-lg border border-[#DA9C2F]/10">
                      <p className="text-xs text-white/70 whitespace-pre-line">
                        {(step as Record<string, unknown>).details as string}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-[#DA9C2F] text-black font-semibold rounded-lg hover:bg-[#ffbf00] transition-colors text-sm">
                      {step.action}
                    </button>
                    {step.number < STEPS.length && (
                      <button
                        onClick={() => setExpandedStep(step.number + 1)}
                        className="px-4 py-2 bg-[#DA9C2F]/20 text-[#DA9C2F] font-semibold rounded-lg hover:bg-[#DA9C2F]/30 transition-colors text-sm"
                      >
                        Next →
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress indicator */}
        <div className="mt-8 flex justify-center gap-2">
          {STEPS.map((step) => (
            <div
              key={step.number}
              className={`h-2 rounded-full transition-all ${
                step.number <= 2 ? "w-6 bg-[#DA9C2F]" : "w-2 bg-[#DA9C2F]/30"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
