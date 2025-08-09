"use client";

import { useState, useEffect } from "react";

interface RoadmapItem {
  id: number;
  title: string;
  description: string;
  icon: string;
  status: "completed" | "current" | "upcoming";
  delay: number;
}

const roadmapData: RoadmapItem[] = [
  {
    id: 1,
    title: "Genesis Mint",
    description: "50 Souls",
    icon: "✅",
    status: "completed",
    delay: 0,
  },
  {
    id: 2,
    title: "Full Collection Mint",
    description: "~6 weeks after genesis",
    icon: "🔜",
    status: "current",
    delay: 200,
  },
  {
    id: 3,
    title: "Game Testing",
    description: "Void Trials Beta",
    icon: "⚔️",
    status: "upcoming",
    delay: 400,
  },
  {
    id: 4,
    title: "Launch Marketplace",
    description: "Leaderboards & Boost Mechanics",
    icon: "💎",
    status: "upcoming",
    delay: 600,
  },
  {
    id: 5,
    title: "Expand Ecosystem",
    description: "Partnerships & Additional Realms",
    icon: "🌐",
    status: "upcoming",
    delay: 800,
  },
];

interface AnimatedRoadmapProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AnimatedRoadmap({
  isOpen,
  onClose,
}: AnimatedRoadmapProps) {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Animate items in sequence
      roadmapData.forEach((item) => {
        setTimeout(() => {
          setVisibleItems((prev) => [...prev, item.id]);
        }, item.delay);
      });
    } else {
      setVisibleItems([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-black border-4 border-[#d3b136] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden animate-golden-glow">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-[#d3b136]">
          <h2
            className="text-[#d3b136] text-2xl lg:text-3xl font-bold"
            style={{ fontFamily: "var(--font-amnestia)" }}
          >
            🗓️ THE REALM ROADMAP
          </h2>
          <button
            onClick={onClose}
            className="text-[#d3b136] hover:text-white text-3xl font-bold transition-colors"
          >
            ×
          </button>
        </div>

        {/* Roadmap Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh]">
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-[#d3b136] via-[#d3b136] to-gray-600"></div>

            {/* Roadmap Items */}
            <div className="space-y-8">
              {roadmapData.map((item) => (
                <div
                  key={item.id}
                  className={`relative flex items-start space-x-6 transition-all duration-700 transform ${
                    visibleItems.includes(item.id)
                      ? "translate-x-0 opacity-100"
                      : "translate-x-8 opacity-0"
                  }`}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  {/* Timeline Node */}
                  <div
                    className={`relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 transition-all duration-300 ${
                      item.status === "completed"
                        ? "bg-[#d3b136] border-[#d3b136] animate-milestone-complete"
                        : item.status === "current"
                        ? "bg-[#d3b136] border-[#d3b136] animate-timeline-pulse"
                        : "bg-black border-gray-600 hover:border-[#d3b136]"
                    } ${hoveredItem === item.id ? "scale-110" : "scale-100"}`}
                  >
                    <span
                      className={`text-2xl ${
                        item.status === "completed" || item.status === "current"
                          ? "text-black"
                          : "text-[#d3b136]"
                      }`}
                    >
                      {item.icon}
                    </span>
                  </div>

                  {/* Content Card */}
                  <div
                    className={`flex-1 bg-black border-2 rounded-lg p-4 transition-all duration-300 ${
                      item.status === "completed"
                        ? "border-[#d3b136] bg-[#d3b136] bg-opacity-10"
                        : item.status === "current"
                        ? "border-[#d3b136] animate-pulse-glow"
                        : "border-gray-600 hover:border-[#d3b136]"
                    } ${
                      hoveredItem === item.id
                        ? "scale-105 shadow-lg shadow-[#d3b136]/30"
                        : "scale-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3
                        className={`text-lg font-bold ${
                          item.status === "completed" ||
                          item.status === "current"
                            ? "text-[#d3b136]"
                            : "text-gray-300"
                        }`}
                        style={{ fontFamily: "var(--font-amnestia)" }}
                      >
                        {item.title}
                      </h3>
                      {item.status === "completed" && (
                        <span className="text-green-400 text-sm font-bold">
                          COMPLETE
                        </span>
                      )}
                      {item.status === "current" && (
                        <span className="text-[#d3b136] text-sm font-bold animate-pulse">
                          IN PROGRESS
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm ${
                        item.status === "completed" || item.status === "current"
                          ? "text-gray-200"
                          : "text-gray-400"
                      }`}
                    >
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-[#d3b136] bg-[#d3b136] bg-opacity-10">
          <div className="text-center">
            <p
              className="text-[#d3b136] text-lg font-bold mb-2"
              style={{ fontFamily: "var(--font-amnestia)" }}
            >
              THE JOURNEY CONTINUES...
            </p>
            <p className="text-gray-300 text-sm">
              Join The Realm and be part of the evolution. Each milestone brings
              new power to your WardenKin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
