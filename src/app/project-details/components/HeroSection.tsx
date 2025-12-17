'use client';

import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';

interface HeroSectionProps {
    blur: any; // MotionValue<string>
    overlayOpacity: any; // MotionValue<number>
}

export default function HeroSection({ blur, overlayOpacity }: HeroSectionProps) {
    const { scrollYProgress } = useScroll();

    return (
        <div className="fixed top-0 left-0 w-full h-screen z-0 overflow-hidden">
            {/* Parallax Container with Blur Filter */}
            <motion.div
                style={{ filter: blur }}
                className="relative w-full h-full will-change-[filter,transform]"
            >
                {/* Parallax Layer 1: Sky/Nebula (Slowest) - Z-0 */}
                <motion.div
                    style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "15%"]) }}
                    className="absolute inset-0 z-0 pointer-events-none will-change-transform"
                >
                    <Image
                        src="/assets/project-details/parallax-sky.png"
                        alt="Nebula Sky"
                        fill
                        className="object-cover"
                        priority
                    />
                </motion.div>

                {/* Parallax Layer 2: Midground Ruins (Medium Speed) - Z-10 */}
                <motion.div
                    style={{ y: useTransform(scrollYProgress, [0, 1], ["0%", "30%"]) }}
                    className="absolute inset-0 z-10 flex items-end justify-center pointer-events-none will-change-transform"
                >
                    <div className="relative w-full h-full">
                        <Image
                            src="/assets/project-details/parallax-mid.png"
                            alt="Ancient Ruins"
                            fill
                            className="object-cover object-bottom scale-110 md:scale-125 lg:scale-150"
                            priority
                        />
                    </div>
                </motion.div>



                {/* Kinetic Typography (Fixed on top of layers) - Z-30 */}
                <div className="relative z-30 text-center px-4 h-full flex flex-col items-center justify-center mt-[-10vh]">
                    <motion.h1
                        initial={{ opacity: 0, scale: 0.8, y: 100 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                        className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-none drop-shadow-2xl"
                    >
                        Enter The<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#DA9C2F] to-[#8B5E10] animate-pulse">Realm</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8, duration: 1 }}
                        className="mt-6 text-lg md:text-xl text-[#DA9C2F]/80 max-w-lg mx-auto uppercase tracking-[0.3em] font-bold"
                    >
                        The Future of Digital Ownership
                    </motion.p>
                </div>

                {/* Scroll Indicator - Z-30 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2, duration: 1 }}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-30"
                >
                    <span className="text-[10px] uppercase tracking-[0.3em] text-[#DA9C2F] animate-bounce">Scroll to Explore</span>
                    <div className="w-[1px] h-16 bg-gradient-to-b from-[#DA9C2F] to-transparent opacity-50" />
                </motion.div>
            </motion.div>

            {/* Overlay for Readability - Z-40 */}
            <motion.div
                style={{ opacity: overlayOpacity }}
                className="absolute inset-0 z-40 bg-black pointer-events-none will-change-[opacity]"
            />
        </div>
    );
}
