"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import Image from "next/image";

const ECOSYSTEM_STEPS = [
  {
    title: "Stake Your Realmkin",
    text: "Your Realmkin is not meant to be idle. Deploy it into the ecosystem to begin its journey. It becomes an active worker in the Realm.",
    color: "#DA9C2F",
    image: "/assets/project-details/details-carousel.jpeg",
  },
  {
    title: "Earn $MKIN",
    text: "Active Realmkin generate $MKIN weekly. This is not passive income; it is a reward for contributing to the ecosystem's stability.",
    color: "#10B981",
    image: "/assets/project-details/details-carousel(1).jpeg",
  },
  {
    title: "Build & Upgrade",
    text: "Use your $MKIN to upgrade your Realmkin's abilities, unlock new features, and shape the future of the Realm.",
    color: "#3B82F6",
    image: "/assets/project-details/details-carousel(2).jpeg",
  },
];

export default function EcosystemStories({
  onOpenWhitepaper,
}: {
  onOpenWhitepaper: () => void;
}) {
  const [activeStep, setActiveStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % ECOSYSTEM_STEPS.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [activeStep, isPaused]);

  const handleTap = () => {
    setActiveStep((prev) => (prev + 1) % ECOSYSTEM_STEPS.length);
  };

  return (
    <section
      className="relative z-20 w-full min-h-screen lg:min-h-0 bg-[#080806] py-20 pb-32 sm:pb-64 lg:pb-24"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-center text-3xl md:text-5xl font-black uppercase tracking-tighter mb-24 text-white">
          How It Works
        </h2>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          {/* Left Column: Sticky Visual (Desktop) / Top (Mobile) */}
          <div className="lg:w-1/2 lg:h-[80vh] lg:sticky lg:top-36 flex items-center justify-center">
            <div
              onClick={handleTap}
              className="relative w-full max-w-md aspect-[9/16] bg-[#0B0B09] border border-[#DA9C2F]/20 rounded-3xl overflow-hidden cursor-pointer group shadow-2xl"
            >
              {/* Progress Bars */}
              <div className="absolute top-4 left-4 right-4 flex gap-2 z-20">
                {ECOSYSTEM_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"
                  >
                    <motion.div
                      initial={{ width: "0%" }}
                      animate={{
                        width:
                          i === activeStep
                            ? "100%"
                            : i < activeStep
                            ? "100%"
                            : "0%",
                      }}
                      transition={{
                        duration: i === activeStep ? 5 : 0.3,
                        ease: "linear",
                      }}
                      className="h-full bg-white"
                    />
                  </div>
                ))}
              </div>

              {/* Content (Mobile Only - Hidden on Desktop) */}
              <div className="lg:hidden absolute inset-0 flex flex-col justify-end p-8 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <h3
                    className="text-3xl font-bold uppercase text-white mb-4"
                    style={{ color: ECOSYSTEM_STEPS[activeStep].color }}
                  >
                    {ECOSYSTEM_STEPS[activeStep].title}
                  </h3>
                  <p className="text-lg text-gray-300 leading-relaxed">
                    {ECOSYSTEM_STEPS[activeStep].text}
                  </p>
                  <p className="text-sm text-gray-500 mt-6 uppercase tracking-widest animate-pulse">
                    Tap to Continue
                  </p>
                </motion.div>
              </div>

              {/* Background Image with Transition */}
              <div className="absolute inset-0 z-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeStep}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={ECOSYSTEM_STEPS[activeStep].image}
                      alt={ECOSYSTEM_STEPS[activeStep].title}
                      fill
                      className="object-cover"
                      priority
                    />
                    {/* Overlay for readability */}
                    <div className="absolute inset-0 bg-black/20" />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column: Scrolling Steps (Desktop Only) */}
          <div className="hidden lg:flex lg:w-1/2 flex-col justify-center gap-24 py-12">
            {ECOSYSTEM_STEPS.map((step, index) => (
              <div
                key={index}
                className={`transition-opacity duration-500 cursor-pointer ${
                  activeStep === index
                    ? "opacity-100"
                    : "opacity-30 hover:opacity-60"
                }`}
                onClick={() => setActiveStep(index)}
              >
                <div
                  className="text-sm font-bold tracking-widest uppercase mb-4"
                  style={{ color: step.color }}
                >
                  Step 0{index + 1}
                </div>
                <h3 className="text-6xl font-black uppercase text-white mb-6">
                  {step.title}
                </h3>
                <p className="text-gray-400 text-xl leading-relaxed max-w-lg">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center flex-wrap gap-4 mt-12 lg:mt-24">
          <button
            onClick={onOpenWhitepaper}
            className="px-8 py-4 rounded-full border border-[#DA9C2F] text-[#DA9C2F] uppercase tracking-widest hover:bg-[#DA9C2F] hover:text-black transition-all duration-300"
          >
            Read Full Whitepaper
          </button>
          <a
            href="https://www.nftlaunch.app/mint/realmkin"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 rounded-full bg-[#DA9C2F] text-black font-black uppercase tracking-widest shadow-[0_0_20px_rgba(218,156,47,0.4)] hover:bg-[#F0B342] transition-all duration-300 flex items-center"
          >
            Mint Now
          </a>
        </div>
      </div>
    </section>
  );
}
