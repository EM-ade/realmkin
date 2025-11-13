"use client";

import React from "react";
import Link from "next/link";

export default function InfoCard() {
  return (
    <section className="bg-[var(--background)] py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="premium-card animated-border rounded-xl border p-6 sm:p-8 text-white">
          <h2 className="text-2xl sm:text-3xl font-semibold gold-gradient-text">How the Marketplace works</h2>
          <p className="mt-2 text-white/80 max-w-3xl">
            A fast, non‑custodial NFT marketplace powered by Metaplex Auction House and priced in MKIN.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <h3 className="text-heading text-base">Listing types</h3>
              <ul className="mt-2 space-y-2 text-white/80 text-sm">
                <li>• <span className="text-[#DA9C2F] font-medium">Fixed price</span>: set an amount in MKIN, buyers can purchase instantly.</li>
                <li>• <span className="text-[#DA9C2F] font-medium">Offers</span>: invite MKIN bids and accept the best one later.</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="text-heading text-base">Security & custody</h3>
              <ul className="mt-2 space-y-2 text-white/80 text-sm">
                <li>• Your NFTs are escrowed by the program (no project hot‑wallet custody).</li>
                <li>• Royalties are respected automatically on sales.</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="text-heading text-base">Fees → Burn</h3>
              <ul className="mt-2 space-y-2 text-white/80 text-sm">
                <li>• Marketplace fees are collected in MKIN.</li>
                <li>• Fees are periodically <span className="text-[#DA9C2F] font-medium">burned on‑chain</span> to reduce supply.</li>
              </ul>
            </div>
            <div className="card">
              <h3 className="text-heading text-base">Getting MKIN</h3>
              <ul className="mt-2 space-y-2 text-white/80 text-sm">
                <li>• If you need MKIN at checkout, we’ll guide you through a quick swap flow.</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <h3 className="text-heading text-base">Quick start</h3>
              <ol className="mt-2 space-y-2 text-white/80 text-sm list-decimal list-inside">
                <li>Connect your wallet.</li>
                <li>Choose an NFT you own and pick Fixed or Offers.</li>
                <li>Confirm the listing on-chain.</li>
                <li>Buyers pay in MKIN. You receive MKIN minus royalties and fee.</li>
              </ol>
            </div>
            <div className="card">
              <h3 className="text-heading text-base">Learn more</h3>
              <p className="mt-2 text-white/80 text-sm">
                Read the full spec for contract details, data model, and operations.
              </p>
              <div className="mt-3">
                <Link
                  href="/docs/marketplace" // replace with a public docs URL if available
                  className="btn-secondary inline-flex items-center gap-2"
                >
                  <span>Read the Spec</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
