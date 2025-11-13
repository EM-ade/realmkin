"use client";

import React from "react";
import { FaShieldAlt, FaCoins, FaHandshake, FaFireAlt } from "react-icons/fa";

const items = [
  {
    icon: <FaShieldAlt className="text-[#DA9C2F]" size={20} />,
    title: "Non‑custodial",
    desc: "Your assets stay in program escrow, never in a project wallet.",
  },
  {
    icon: <FaCoins className="text-[#DA9C2F]" size={20} />,
    title: "MKIN‑only",
    desc: "All prices and fees are denominated in MKIN.",
  },
  {
    icon: <FaHandshake className="text-[#DA9C2F]" size={20} />,
    title: "Royalties",
    desc: "Creator royalties are respected automatically at sale time.",
  },
  {
    icon: <FaFireAlt className="text-[#DA9C2F]" size={20} />,
    title: "Fees → Burn",
    desc: "Marketplace fees are collected in MKIN and burned periodically.",
  },
];

export default function FeatureHighlights() {
  return (
    <section className="bg-[var(--background)] py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory sm:grid sm:overflow-visible sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div key={it.title} className="premium-card animated-border rounded-xl p-5 text-white min-w-[72%] snap-start sm:min-w-0">
              <div className="flex items-center gap-3">
                {it.icon}
                <h3 className="text-heading text-base">{it.title}</h3>
              </div>
              <p className="mt-2 hidden text-white/80 text-sm sm:block">{it.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
