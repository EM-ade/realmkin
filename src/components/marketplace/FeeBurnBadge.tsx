"use client";

import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * Renders a micro-visual for Fees → Burn using DotLottieReact.
 */
export default function FeeBurnBadge() {

  return (
    <section className="bg-[var(--background)] py-6">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-5 flex items-center gap-4">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <DotLottieReact
              src="https://lottie.host/20fcc446-8e52-489a-93fc-91c61c89c0cd/LbIic4E7MS.lottie"
              loop
              autoplay
              style={{ width: 80, height: 80 }}
            />
          </div>
          <div className="text-white">
            <div className="text-heading text-base">Fees → Burn</div>
            <p className="hidden sm:block text-white/80 text-sm max-w-xl">
              A portion of each sale&apos;s platform fee accrues in MKIN and is periodically burned on-chain to reduce total supply.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
