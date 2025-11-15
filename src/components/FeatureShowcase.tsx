"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const FEATURES = [
  {
    id: "nfts",
    title: "NFT Collection",
    description: "View and manage your Realmkin NFTs",
    icon: "🎭",
    href: "/my-nft",
    color: "from-purple-500/20 to-purple-600/20",
  },
  {
    id: "staking",
    title: "Staking",
    description: "Earn rewards by staking your tokens",
    icon: "💰",
    href: "/staking",
    color: "from-green-500/20 to-green-600/20",
  },
  {
    id: "games",
    title: "Games",
    description: "Play and earn MKIN tokens",
    icon: "⚔️",
    href: "/game",
    color: "from-red-500/20 to-red-600/20",
  },
  {
    id: "marketplace",
    title: "Marketplace",
    description: "Trade NFTs with other players (Coming Soon)",
    icon: "🛍️",
    href: "/marketplace",
    color: "from-blue-500/20 to-blue-600/20",
    disabled: true,
  },
];

export default function FeatureShowcase() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-[#DA9C2F] mb-3">
            Explore Features
          </h2>
          <p className="text-white/60 text-lg">
            Discover everything Realmkin has to offer
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((feature) => (
            <Link
              key={feature.id}
              href={feature.href}
              className={`group relative rounded-2xl border border-[#DA9C2F]/20 p-6 transition-all duration-300 ${
                feature.disabled
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-[#DA9C2F]/50 hover:shadow-lg hover:shadow-[#DA9C2F]/10"
              } ${
                hoveredId === feature.id && !feature.disabled
                  ? `bg-gradient-to-br ${feature.color}`
                  : "bg-[#0f0f0f]/50"
              }`}
              onMouseEnter={() => !feature.disabled && setHoveredId(feature.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Gradient background */}
              <div
                className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10`}
              />

              {/* Icon */}
              <div className="text-4xl mb-4">{feature.icon}</div>

              {/* Content */}
              <h3 className="text-lg font-bold text-[#DA9C2F] mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                {feature.description}
              </p>

              {/* Badge */}
              {feature.disabled && (
                <div className="absolute top-3 right-3 bg-[#DA9C2F]/20 text-[#DA9C2F] text-xs font-semibold px-2 py-1 rounded-lg">
                  Soon
                </div>
              )}

              {/* Arrow */}
              {!feature.disabled && (
                <div className="absolute bottom-4 right-4 text-[#DA9C2F] opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-1 duration-300">
                  →
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
