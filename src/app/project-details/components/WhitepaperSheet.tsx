'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WhitepaperSheet({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
                    />

                    {/* Sheet */}
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        className="fixed bottom-0 left-0 right-0 z-50 h-[85vh] bg-[#0B0B09] border-t border-[#DA9C2F]/20 rounded-t-3xl overflow-hidden flex flex-col"
                    >
                        {/* Handle */}
                        <div className="w-full flex justify-center pt-4 pb-2" onClick={onClose}>
                            <div className="w-16 h-1.5 bg-gray-700 rounded-full" />
                        </div>

                        {/* Content Scroll */}
                        <div className="flex-1 overflow-y-auto p-8 md:p-12 text-gray-300 leading-relaxed">
                            <div className="max-w-3xl mx-auto space-y-12 pb-20">
                                <div className="text-center mb-12">
                                    <h2 className="text-4xl font-black uppercase text-white mb-4">The Realmkin Whitepaper</h2>
                                    <p className="text-[#DA9C2F] uppercase tracking-widest">Version 1.0</p>
                                </div>

                                <section>
                                    <h3 className="text-2xl font-bold text-white mb-4">1. Introduction</h3>
                                    <p>TheRealmkin is a next-generation NFT project focused on sustainable ecosystem development. Unlike typical NFT collections, TheRealmkin is not just about ownership — it is about participation, purpose, and long-term growth.</p>
                                    <p className="mt-4">Each Realmkin NFT represents a member of the realm, an active entity within a living digital ecosystem designed to evolve over time.</p>
                                </section>

                                <section>
                                    <h3 className="text-2xl font-bold text-white mb-4">2. Project Vision</h3>
                                    <p>The vision of TheRealmkin is to build a living, sustainable digital realm where assets serve a purpose beyond speculative value.</p>
                                    <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-400">
                                        <li>Foster long-term growth through continuous development.</li>
                                        <li>Create a functional ecosystem where Realmkin contribute actively.</li>
                                        <li>Provide holders with digital members of a realm, not static collectibles.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="text-2xl font-bold text-white mb-4">3. The Lore</h3>
                                    <p>The Realm existed long before the Realmkin were born. A world forged through structure, refinement, and purpose, where every layer was intentionally designed.</p>
                                    <p className="mt-4">From this realm emerged the Realmkin — digital entities created to maintain, protect, and expand the ecosystem. Unlike passive digital assets, Realmkin are active participants in the realm, with unique abilities and purposes.</p>
                                </section>

                                <section>
                                    <h3 className="text-2xl font-bold text-white mb-4">4. What Is a Realmkin?</h3>
                                    <p>A Realmkin NFT represents a digital entity living within TheRealmkin ecosystem. A functional member contributing to the realm’s growth and sustainability.</p>
                                </section>

                                <section>
                                    <h3 className="text-2xl font-bold text-white mb-4">5. The Realm Philosophy</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-[#DA9C2F] font-bold uppercase text-sm mb-2">Development Over Hype</h4>
                                            <p>Every decision prioritizes the ecosystem’s long-term growth, not short-term gains.</p>
                                        </div>
                                        <div>
                                            <h4 className="text-[#DA9C2F] font-bold uppercase text-sm mb-2">Sustainability</h4>
                                            <p>The realm is designed to endure. Growth is balanced, and every asset contributes meaningfully.</p>
                                        </div>
                                    </div>
                                </section>

                                <div className="pt-12 border-t border-white/10 text-center">
                                    <p className="text-sm text-gray-500">© 2025 TheRealmkin. All Rights Reserved.</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
