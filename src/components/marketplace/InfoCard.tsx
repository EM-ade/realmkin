"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { FiChevronDown } from "react-icons/fi";

export default function InfoCard() {
  type Key = "listing" | "security" | "fees" | "getting" | "quick" | "learn";
  const [open, setOpen] = useState<Record<Key, boolean>>({
    listing: false,
    security: false,
    fees: false,
    getting: false,
    quick: false,
    learn: false,
  });
  const toggle = useCallback((k: Key) => setOpen((o) => ({ ...o, [k]: !o[k] })), []);
  return (
    <section className="bg-[var(--background)] py-8 sm:py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="premium-card animated-border rounded-xl border p-6 sm:p-8 text-white">
          <h2 className="text-2xl sm:text-3xl font-semibold gold-gradient-text">How the Marketplace works</h2>
          <p className="mt-2 text-white/80 max-w-3xl hidden sm:block">
            A fast, non‑custodial NFT marketplace powered by Metaplex Auction House and priced in MKIN.
          </p>
          <p className="mt-2 text-white/70 text-sm sm:hidden">Concise overview. Full details available on desktop.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <div
                className="flex items-center justify-between cursor-pointer sm:cursor-default"
                onClick={() => toggle("listing")}
                role="button"
                aria-expanded={open.listing}
              >
                <h3 className="text-heading text-base">Listing types</h3>
                <FiChevronDown className="sm:hidden transition-transform" style={{ transform: open.listing ? "rotate(180deg)" : undefined }} />
              </div>
              <ul className={`mt-2 space-y-2 text-white/80 text-sm ${open.listing ? "block" : "hidden"} sm:block`}>
                <li>• <span className="text-[#DA9C2F] font-medium">Fixed price</span>: set an amount in MKIN, buyers can purchase instantly.</li>
                <li>• <span className="text-[#DA9C2F] font-medium">Offers</span>: invite MKIN bids and accept the best one later.</li>
              </ul>
            </div>
            <div className="card">
              <div
                className="flex items-center justify-between cursor-pointer sm:cursor-default"
                onClick={() => toggle("security")}
                role="button"
                aria-expanded={open.security}
              >
                <h3 className="text-heading text-base">Security & custody</h3>
                <FiChevronDown className="sm:hidden transition-transform" style={{ transform: open.security ? "rotate(180deg)" : undefined }} />
              </div>
              <ul className={`mt-2 space-y-2 text-white/80 text-sm ${open.security ? "block" : "hidden"} sm:block`}>
                <li>• Your NFTs are escrowed by the program (no project hot‑wallet custody).</li>
                <li>• Royalties are respected automatically on sales.</li>
              </ul>
            </div>
            <div className="card">
              <div
                className="flex items-center justify-between cursor-pointer sm:cursor-default"
                onClick={() => toggle("fees")}
                role="button"
                aria-expanded={open.fees}
              >
                <h3 className="text-heading text-base">Fees → Burn</h3>
                <FiChevronDown className="sm:hidden transition-transform" style={{ transform: open.fees ? "rotate(180deg)" : undefined }} />
              </div>
              <ul className={`mt-2 space-y-2 text-white/80 text-sm ${open.fees ? "block" : "hidden"} sm:block`}>
                <li>• Marketplace fees are collected in MKIN.</li>
                <li>• Fees are periodically <span className="text-[#DA9C2F] font-medium">burned on‑chain</span> to reduce supply.</li>
              </ul>
            </div>
            <div className="card">
              <div
                className="flex items-center justify-between cursor-pointer sm:cursor-default"
                onClick={() => toggle("getting")}
                role="button"
                aria-expanded={open.getting}
              >
                <h3 className="text-heading text-base">Getting MKIN</h3>
                <FiChevronDown className="sm:hidden transition-transform" style={{ transform: open.getting ? "rotate(180deg)" : undefined }} />
              </div>
              <ul className={`mt-2 space-y-2 text-white/80 text-sm ${open.getting ? "block" : "hidden"} sm:block`}>
                <li>• If you need MKIN at checkout, we’ll guide you through a quick swap flow.</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <div
                className="flex items-center justify-between cursor-pointer sm:cursor-default"
                onClick={() => toggle("quick")}
                role="button"
                aria-expanded={open.quick}
              >
                <h3 className="text-heading text-base">Quick start</h3>
                <FiChevronDown className="sm:hidden transition-transform" style={{ transform: open.quick ? "rotate(180deg)" : undefined }} />
              </div>
              <ol className={`mt-2 space-y-2 text-white/80 text-sm list-decimal list-inside ${open.quick ? "block" : "hidden"} sm:block`}>
                <li>Connect your wallet.</li>
                <li>Choose an NFT you own and pick Fixed or Offers.</li>
                <li>Confirm the listing on-chain.</li>
                <li>Buyers pay in MKIN. You receive MKIN minus royalties and fee.</li>
              </ol>
            </div>
            <div className="card">
              <div
                className="flex items-center justify-between cursor-pointer sm:cursor-default"
                onClick={() => toggle("learn")}
                role="button"
                aria-expanded={open.learn}
              >
                <h3 className="text-heading text-base">Learn more</h3>
                <FiChevronDown className="sm:hidden transition-transform" style={{ transform: open.learn ? "rotate(180deg)" : undefined }} />
              </div>
              <p className={`mt-2 text-white/80 text-sm ${open.learn ? "block" : "hidden"} sm:block`}>
                Read the full spec for contract details, data model, and operations.
              </p>
              <p className="mt-2 text-white/70 text-sm sm:hidden">Full spec available on desktop.</p>
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
