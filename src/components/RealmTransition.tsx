"use client";

import React from "react";

export default function RealmTransition() {
  return (
    <div className="realm-transition">
      {/* Golden shimmer */}
      <div className="realm-shimmer" />
      {/* Constellation sweep */}
      <div className="realm-sweep" />

      <style jsx>{`
        .realm-transition {
          position: fixed;
          inset: 0;
          z-index: 60;
          pointer-events: none;
          background: radial-gradient(120% 120% at 50% 50%, rgba(8,8,6,0.9) 0%, rgba(8,8,6,0.98) 60%, rgba(8,8,6,1) 100%);
          animation: rt-fade-out 900ms ease forwards;
        }
        .realm-shimmer {
          position: absolute;
          inset: 0;
          background: linear-gradient(120deg, rgba(218,156,47,0) 0%, rgba(218,156,47,0.18) 40%, rgba(218,156,47,0.08) 60%, rgba(218,156,47,0) 100%);
          filter: blur(2px);
          animation: rt-shimmer 820ms ease forwards;
        }
        .realm-sweep {
          position: absolute;
          top: 0;
          left: -30%;
          height: 100%;
          width: 60%;
          opacity: 0.25;
          background: radial-gradient(40% 100% at 50% 50%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 60%, rgba(255,255,255,0) 100%);
          transform: skewX(-12deg);
          animation: rt-sweep 840ms 120ms ease-out forwards;
        }

        @keyframes rt-fade-out {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes rt-shimmer {
          0% { opacity: 0; }
          25% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes rt-sweep {
          0% { transform: translateX(0) skewX(-12deg); opacity: 0.0; }
          10% { opacity: 0.25; }
          100% { transform: translateX(180%) skewX(-12deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
