'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

const ECOSYSTEM_STEPS = [
    {
        title: "Stake Your Realmkin",
        text: "Your Realmkin is not meant to be idle. Deploy it into the ecosystem to begin its journey. It becomes an active worker in the Realm.",
        color: "#DA9C2F"
    },
    {
        title: "Earn $MKIN",
        text: "Active Realmkin generate $MKIN weekly. This is not passive income; it is a reward for contributing to the ecosystem's stability.",
        color: "#10B981"
    },
    {
        title: "Build & Upgrade",
        text: "Use your $MKIN to upgrade your Realmkin's abilities, unlock new features, and shape the future of the Realm.",
        color: "#3B82F6"
    }
];

export default function EcosystemStories({ onOpenWhitepaper }: { onOpenWhitepaper: () => void }) {
    const [activeStep, setActiveStep] = useState(0);

    const handleTap = () => {
        setActiveStep((prev) => (prev + 1) % ECOSYSTEM_STEPS.length);
    };

    return (
        <section className="relative z-20 w-full min-h-screen bg-[#080806] py-20 pb-40">
            <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-center text-3xl md:text-5xl font-black uppercase tracking-tighter mb-16 text-white">
                    How It Works
                </h2>

                <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
                    {/* Left Column: Sticky Visual (Desktop) / Top (Mobile) */}
                    <div className="lg:w-1/2 lg:h-[80vh] lg:sticky lg:top-32 flex items-center justify-center">
                        <div
                            onClick={handleTap}
                            className="relative w-full max-w-md aspect-[9/16] bg-[#0B0B09] border border-[#DA9C2F]/20 rounded-3xl overflow-hidden cursor-pointer group shadow-2xl"
                        >
                            {/* Progress Bars */}
                            <div className="absolute top-4 left-4 right-4 flex gap-2 z-20">
                                {ECOSYSTEM_STEPS.map((_, i) => (
                                    <div key={i} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: i === activeStep ? "100%" : i < activeStep ? "100%" : "0%" }}
                                            transition={{ duration: i === activeStep ? 5 : 0.3, ease: "linear" }}
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
                                    <h3 className="text-3xl font-bold uppercase text-white mb-4" style={{ color: ECOSYSTEM_STEPS[activeStep].color }}>
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

                            {/* Visual Placeholder (Animated Circle) */}
                            <div className="absolute inset-0 flex items-center justify-center z-0">
                                <motion.div
                                    key={activeStep}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 0.5 }}
                                    transition={{ duration: 1 }}
                                    className="w-64 h-64 rounded-full blur-[80px]"
                                    style={{ backgroundColor: ECOSYSTEM_STEPS[activeStep].color }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Scrolling Steps (Desktop Only) */}
                    <div className="hidden lg:flex lg:w-1/2 flex-col justify-center gap-24 py-12">
                        {ECOSYSTEM_STEPS.map((step, index) => (
                            <div
                                key={index}
                                className={`transition-opacity duration-500 cursor-pointer ${activeStep === index ? 'opacity-100' : 'opacity-30 hover:opacity-60'}`}
                                onClick={() => setActiveStep(index)}
                            >
                                <div className="text-sm font-bold tracking-widest uppercase mb-4" style={{ color: step.color }}>
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

                <div className="flex justify-center mt-12 lg:mt-24">
                    <button
                        onClick={onOpenWhitepaper}
                        className="px-8 py-4 rounded-full border border-[#DA9C2F] text-[#DA9C2F] uppercase tracking-widest hover:bg-[#DA9C2F] hover:text-black transition-all duration-300"
                    >
                        Read Full Whitepaper
                    </button>
                </div>
            </div>
        </section>
    );
}
