'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const PROJECT_DETAILS = [
    {
        title: "Project Vision",
        content: "TheRealmkin is a next-generation NFT project focused on sustainable ecosystem development. Unlike typical collections, we prioritize participation, purpose, and long-term growth. We aim to build a living digital realm where assets serve a purpose beyond speculative value.",
        highlight: "Development Over Hype"
    },
    {
        title: "The Lore",
        content: "The Realm existed long before the Realmkin were born. A world forged through structure, refinement, and purpose. Realmkin are builders, not conquerors. They operate within the realm to maintain balance, growth, and efficiency.",
        highlight: "Builders of the Realm"
    },
    {
        title: "What Is a Realmkin?",
        content: "A Realmkin is more than a JPEG. It is a functional member of the ecosystem. Holding a Realmkin is active membership, not passive collection. Each Realmkin is designed to work for its holder, growing and contributing while part of the ecosystem.",
        highlight: "Active Membership"
    },
    {
        title: "The Philosophy",
        content: "Sustainability. Ownership. Purpose. Every decision prioritizes the ecosystem's long-term health. Systems evolve gradually to ensure stability. You are not just holding an asset; you are a stakeholder in a living digital world.",
        highlight: "Long-Term Vision"
    }
];

function Card({ card, index, total }: { card: typeof PROJECT_DETAILS[0], index: number, total: number }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: cardRef,
        offset: ["start end", "start start"]
    });

    // Animation: Scale down as it reaches the top
    const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);
    const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

    return (
        <motion.div
            ref={cardRef}
            style={{ scale, y }}
            className="sticky top-32 mb-10 min-h-[60vh] flex flex-col justify-center p-8 md:p-12 rounded-3xl border border-[#DA9C2F]/20 bg-[#0B0B09] shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden group"
        >
            {/* Decorative Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#DA9C2F]/10 rounded-full blur-[100px] group-hover:bg-[#DA9C2F]/20 transition-all duration-700" />

            <span className="relative z-10 text-[#DA9C2F] text-sm font-bold tracking-[0.2em] uppercase mb-4">
                0{index + 1} / 0{total}
            </span>

            <h2 className="relative z-10 text-4xl md:text-6xl font-black uppercase tracking-tighter mb-8 text-white">
                {card.title}
            </h2>

            <p className="relative z-10 text-lg md:text-xl text-gray-300 leading-relaxed max-w-2xl">
                {card.content}
            </p>

            <div className="relative z-10 mt-12 pt-8 border-t border-white/10">
                <span className="text-sm text-gray-500 uppercase tracking-widest">Key Principle</span>
                <p className="text-[#DA9C2F] text-xl font-bold mt-2">{card.highlight}</p>
            </div>
        </motion.div>
    );
}

export default function ProjectDeck() {
    return (
        <div className="relative z-20 w-full min-h-[200vh] pb-20">
            <div className="max-w-4xl mx-auto px-6 pt-32">
                {PROJECT_DETAILS.map((card, index) => (
                    <Card key={index} card={card} index={index} total={PROJECT_DETAILS.length} />
                ))}
            </div>
        </div>
    );
}
