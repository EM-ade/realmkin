"use client";

import React from "react";

export default function RealmTransition() {
  return (
    <div className="realm-transition">
      <video
        className="realm-transition-video"
        src="/loading-screen.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
      />

      <style jsx>{`
        .realm-transition {
          position: fixed;
          inset: 0;
          z-index: 60;
          pointer-events: none;
          background: black;
          animation: rt-fade-out 900ms ease forwards;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .realm-transition-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.92);
        }

        @keyframes rt-fade-out {
          0% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
