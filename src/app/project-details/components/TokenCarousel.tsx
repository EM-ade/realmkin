'use client';

import React from 'react';

const TOKEN_DETAILS = [
    {
        title: "$MKIN Token",
        description: "The native utility fuel of the Realm. It enables holders to participate actively, upgrade assets, and derive real value from their NFTs.",
        statLabel: "Ticker",
        statValue: "$MKIN",
        icon: "🪙"
    },
    {
        title: "Total Supply",
        description: "A fixed supply ensuring scarcity and long-term value retention. Designed to support a sustainable ecosystem economy.",
        statLabel: "Max Supply",
        statValue: "1,000,000,000",
        icon: "📊"
    },
    {
        title: "Contract",
        description: "Verified and audited on Solana. Built for security, efficiency, and seamless integration with ecosystem dApps.",
        statLabel: "Address",
        statValue: "BKDG...JLA", // Truncated for UI, full copy on click
        icon: "📜"
    },
    {
        title: "Utility",
        description: "Stake for rewards, spend on in-game upgrades, or swap for SOL. $MKIN is the lifeblood of the Realmkin economy.",
        statLabel: "Use Case",
        statValue: "Governance + Utility",
        icon: "⚙️"
    }
];

export default function TokenCarousel() {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    // Auto-scroll logic for mobile carousel
    React.useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        let scrollAmount = 0;
        const scrollStep = 1;
        const delay = 30; // Speed of scroll

        const scrollInterval = setInterval(() => {
            if (container) {
                scrollAmount += scrollStep;
                // If we've scrolled past the end (minus viewport), reset to 0 for infinite loop effect
                // or just bounce back. For now, let's just scroll to next snap point.
                // Actually, a simple auto-advance to next snap point is better for UX.
            }
        }, delay);

        // Better Auto-Scroll: Advance to next slide every 3 seconds
        const autoAdvance = setInterval(() => {
            if (container) {
                const cardWidth = container.offsetWidth * 0.85; // 85vw
                const gap = 24; // 6 (1.5rem)
                const itemWidth = cardWidth + gap;

                const currentScroll = container.scrollLeft;
                const nextScroll = currentScroll + itemWidth;

                // If we are near the end, scroll back to start
                if (currentScroll + container.offsetWidth >= container.scrollWidth - 10) {
                    container.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    container.scrollTo({ left: nextScroll, behavior: 'smooth' });
                }
            }
        }, 3000);

        return () => clearInterval(autoAdvance);
    }, []);

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here
    };

    return (
        <section className="relative z-20 w-full py-24 bg-[#080806]">
            <div className="px-6 mb-12">
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter text-white mb-2">
                    Tokenomics
                </h2>
                <p className="text-[#DA9C2F] uppercase tracking-[0.2em] text-sm font-bold md:hidden">Swipe to Explore $MKIN</p>
                <p className="text-[#DA9C2F] uppercase tracking-[0.2em] text-sm font-bold hidden md:block">The Economy of the Realm</p>
            </div>

            {/* Mobile Carousel (Hidden on Desktop) */}
            <div
                ref={scrollContainerRef}
                className="md:hidden w-full overflow-x-auto pb-12 pt-12 hide-scrollbar snap-x snap-mandatory pl-6"
            >
                <div className="flex gap-6 w-max pr-6">
                    {TOKEN_DETAILS.map((token, index) => (
                        <div
                            key={index}
                            className="snap-center shrink-0 w-[85vw] h-[520px] bg-[#0B0B09] border border-[#DA9C2F]/20 rounded-[2rem] p-8 flex flex-col justify-between relative overflow-hidden group hover:border-[#DA9C2F]/50 transition-colors duration-500"
                        >
                            {/* Background Gradient & Noise */}
                            <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                            <div className="absolute inset-0 bg-gradient-to-b from-[#DA9C2F]/5 via-transparent to-transparent opacity-50" />

                            {/* Glowing Orb */}
                            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#DA9C2F]/20 rounded-full blur-[80px] group-hover:bg-[#DA9C2F]/30 transition-all duration-700" />

                            <div className="relative z-10">
                                <div className="w-16 h-16 rounded-2xl bg-[#DA9C2F]/10 border border-[#DA9C2F]/20 flex items-center justify-center mb-8 text-3xl shadow-[0_0_20px_rgba(218,156,47,0.1)]">
                                    {token.icon}
                                </div>
                                <h3 className="text-4xl font-black uppercase text-white mb-4 tracking-tight">{token.title}</h3>
                                <p className="text-gray-400 leading-relaxed text-lg font-light">{token.description}</p>
                            </div>

                            <div className="relative z-10 pt-8 border-t border-white/5">
                                <div className="text-xs text-[#DA9C2F] uppercase tracking-[0.2em] font-bold mb-2">{token.statLabel}</div>
                                {token.title === "Contract" ? (
                                    <div
                                        onClick={() => copyToClipboard("BKDGoq5...JLA")}
                                        className="flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                                    >
                                        <div className="text-xl font-bold text-white tracking-tight break-all">
                                            BKDGoq5...JLA
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#DA9C2F]">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="text-3xl font-bold text-white tracking-tight">
                                        {token.statValue}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Desktop Bento Grid (Hidden on Mobile) */}
            <div className="hidden md:grid grid-cols-2 gap-6 max-w-7xl mx-auto px-6">
                {TOKEN_DETAILS.map((token, index) => (
                    <div
                        key={index}
                        className="w-full h-[400px] bg-[#0B0B09] border border-[#DA9C2F]/20 rounded-[2rem] p-10 flex flex-col justify-between relative overflow-hidden group hover:border-[#DA9C2F]/50 transition-all duration-500 hover:-translate-y-2"
                    >
                        {/* Background Gradient & Noise */}
                        <div className="absolute inset-0 bg-[url('/assets/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-b from-[#DA9C2F]/5 via-transparent to-transparent opacity-50" />

                        {/* Glowing Orb */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#DA9C2F]/20 rounded-full blur-[80px] group-hover:bg-[#DA9C2F]/30 transition-all duration-700" />

                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="w-16 h-16 rounded-2xl bg-[#DA9C2F]/10 border border-[#DA9C2F]/20 flex items-center justify-center mb-6 text-3xl shadow-[0_0_20px_rgba(218,156,47,0.1)]">
                                    {token.icon}
                                </div>
                                <h3 className="text-4xl font-black uppercase text-white mb-4 tracking-tight">{token.title}</h3>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-[#DA9C2F] uppercase tracking-[0.2em] font-bold mb-2">{token.statLabel}</div>
                                {token.title === "Contract" ? (
                                    <div
                                        onClick={() => copyToClipboard("BKDGoq5...JLA")}
                                        className="flex items-center justify-end gap-2 cursor-pointer active:scale-95 transition-transform"
                                    >
                                        <div className="text-xl font-bold text-white tracking-tight">
                                            BKDGoq5...JLA
                                        </div>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-[#DA9C2F]">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="text-3xl font-bold text-white tracking-tight">
                                        {token.statValue}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="relative z-10">
                            <p className="text-gray-400 leading-relaxed text-lg font-light max-w-md">{token.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
