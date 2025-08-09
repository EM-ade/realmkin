"use client";

import { useState, useEffect } from "react";

interface WhitepaperSection {
  id: number;
  title: string;
  content: string[];
  icon: string;
  delay: number;
}

const whitepaperData: WhitepaperSection[] = [
  {
    id: 1,
    title: "Introduction",
    content: [
      "Welcome to the Realm",
      "Own your power. Summon your WardenKin. Shape the forgotten into your legacy.",
      "Enter a world where forgotten warriors rise again to reclaim the Realm — through battle, strategy, and unstoppable grind. Level up. Earn ₥KIN. Dominate the Void.",
    ],
    icon: "🌀",
    delay: 0,
  },
  {
    id: 2,
    title: "The Realm, The Kin & The Void",
    content: [
      "The Realm is a vast world where ancient WardenKin once thrived in harmony.",
      "WardenKin are powerful souls — NFT warriors summoned by you to fight, grow, and shape the new order.",
      "The Void is the battlefield — a chaotic PvE arena where WardenKin battle endlessly to gain XP, earn kill coins, and climb the leaderboard.",
    ],
    icon: "🌌",
    delay: 200,
  },
  {
    id: 3,
    title: "Gameplay Overview",
    content: [
      "Card-Based PvE Combat: Players summon WardenKin NFTs into The Void to battle continuously. Each fight earns XP and Kill Coins.",
      "Fusion System: Players can temporarily fuse any number of NFTs into a single custom-named character before each battle.",
      "Revival Mechanic: Characters &apos;die&apos; randomly in battle and re-enter after a cooldown. The war never ends.",
    ],
    icon: "🎴",
    delay: 400,
  },
  {
    id: 4,
    title: "$MKIN Token",
    content: [
      "Utility: In-game rewards, upgrades, and swaps",
      "Claim System: Holders earn ₥KIN weekly. Rewards can be claimed anytime. Letting them accumulate yields higher value.",
      "Conversion: ₥KIN can be swapped into SOL",
      "Total Supply: To Be Announced",
    ],
    icon: "💰",
    delay: 600,
  },
  {
    id: 5,
    title: "NFT Collection",
    content: [
      "Blockchain: Solana",
      "Genesis Collection: 50 Souls",
      "Total Supply: 5,000 WardenKin",
      "Mint Prices: OG: $25 | Whitelist: $30 | Public: $40",
      "Airdrops: Genesis holders will receive airdrops for all future Realmkin drops",
    ],
    icon: "🖼️",
    delay: 800,
  },
];

interface AnimatedWhitepaperProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnimatedWhitepaper({
  isOpen,
  onClose,
}: AnimatedWhitepaperProps) {
  const [visibleSections, setVisibleSections] = useState<number[]>([]);
  const [hoveredSection, setHoveredSection] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Animate sections in sequence
      whitepaperData.forEach((section) => {
        setTimeout(() => {
          setVisibleSections((prev) => [...prev, section.id]);
        }, section.delay);
      });
    } else {
      setVisibleSections([]);
    }
  }, [isOpen]);

  const downloadPDF = () => {
    const link = document.createElement("a");
    link.href = "/TheRealmkinWhitePaper.pdf";
    link.download = "TheRealmkinWhitePaper.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-4 border-[#d3b136] rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden animate-golden-glow">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-[#d3b136]">
          <div>
            <h2
              className="text-[#d3b136] text-2xl lg:text-3xl font-bold"
              style={{ fontFamily: "var(--font-amnestia)" }}
            >
              🧾 REALMKIN WHITEPAPER
            </h2>
            <p className="text-gray-300 text-sm mt-1">
              Solana-Based NFT Card Game | PvE Battle System | Earn ₥KIN
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={downloadPDF}
              className="bg-[#d3b136] hover:bg-[#b8941f] text-black font-bold py-2 px-4 rounded-lg transition-all duration-300 btn-enhanced transform hover:scale-105"
              style={{ fontFamily: "var(--font-amnestia)" }}
            >
              📄 DOWNLOAD PDF
            </button>
            <button
              onClick={onClose}
              className="text-[#d3b136] hover:text-white text-3xl font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>

        {/* Whitepaper Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-8">
            {whitepaperData.map((section) => (
              <div
                key={section.id}
                className={`transition-all duration-700 transform ${
                  visibleSections.includes(section.id)
                    ? "translate-y-0 opacity-100"
                    : "translate-y-8 opacity-0"
                }`}
                onMouseEnter={() => setHoveredSection(section.id)}
                onMouseLeave={() => setHoveredSection(null)}
              >
                <div
                  className={`bg-black border-2 rounded-lg p-6 transition-all duration-300 ${
                    hoveredSection === section.id
                      ? "border-[#d3b136] scale-102 shadow-lg shadow-[#d3b136]/20"
                      : "border-gray-600 hover:border-[#d3b136]"
                  }`}
                >
                  {/* Section Header */}
                  <div className="flex items-center space-x-4 mb-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#d3b136] bg-opacity-20 border-2 border-[#d3b136]">
                      <span className="text-2xl">{section.icon}</span>
                    </div>
                    <h3
                      className="text-[#d3b136] text-xl lg:text-2xl font-bold"
                      style={{ fontFamily: "var(--font-amnestia)" }}
                    >
                      {section.title}
                    </h3>
                  </div>

                  {/* Section Content */}
                  <div className="space-y-3">
                    {section.content.map((paragraph, index) => (
                      <p key={index} className="text-gray-300 leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-[#d3b136] bg-[#d3b136] bg-opacity-10">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div>
              <p
                className="text-[#d3b136] text-lg font-bold"
                style={{ fontFamily: "var(--font-amnestia)" }}
              >
                JOIN THE REALM
              </p>
              <p className="text-gray-300 text-sm">
                Connect with our community and stay updated on The Realm&apos;s
                evolution
              </p>
            </div>
            <div className="flex space-x-4">
              <a
                href="https://x.com/therealmkin?t=PlUXYQ8GRbhlerKJhNicww&s=09"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-transparent border-2 border-[#d3b136] text-[#d3b136] hover:bg-[#d3b136] hover:text-black font-bold py-2 px-4 rounded-lg transition-all duration-300"
                style={{ fontFamily: "var(--font-amnestia)" }}
              >
                🐦 TWITTER
              </a>
              <a
                href="http://discord.gg/p9vA3gmEN4"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-transparent border-2 border-[#d3b136] text-[#d3b136] hover:bg-[#d3b136] hover:text-black font-bold py-2 px-4 rounded-lg transition-all duration-300"
                style={{ fontFamily: "var(--font-amnestia)" }}
              >
                💬 DISCORD
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
