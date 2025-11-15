"use client";

import React from "react";
import { FaBolt, FaTag } from "react-icons/fa";
import Image from "next/image";

export default function InteractiveListingDemo() {
  return (
    <section className="bg-[var(--background)] py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Demo Card */}
          <div className="premium-card animated-border rounded-xl p-5 text-white">
            <div className="aspect-square w-full rounded-lg border border-[var(--border-color)] overflow-hidden relative interactive-element">
              <Image
                src="/marketplace.jpeg"
                alt="Realmkin preview"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={false}
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div>
                <div className="text-sm text-white/70">Collection</div>
                <div className="text-lg font-semibold">Realmkin #1234</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-white/60">Price</div>
                <div className="text-base font-semibold"><span className="gold-gradient-text">125.0</span> MKIN</div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button disabled className="btn-primary flex items-center gap-2 disabled:opacity-60">
                <FaBolt /> Buy Now
              </button>
              <button disabled className="btn-secondary flex items-center gap-2 disabled:opacity-60">
                <FaTag /> Make Offer
              </button>
            </div>

            <p className="mt-3 text-[11px] sm:text-xs text-white/60">
              Demo only — actions are disabled until launch.
            </p>
          </div>

          {/* Text Copy */}
          <div className="hidden sm:block rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6">
            <h3 className="text-heading text-base">A marketplace that feels familiar</h3>
            <ul className="mt-3 space-y-2 text-white/80 text-sm">
              <li>• Quick Buy Now with MKIN.</li>
              <li>• Offers flow for better price discovery.</li>
              <li>• Collection and trait filters for discovery.</li>
              <li>• Clear royalties and fee breakdown at checkout.</li>
            </ul>
            <p className="mt-4 text-white/70 text-sm">
              This card previews core interactions and hover states you can expect in the live marketplace UI.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
