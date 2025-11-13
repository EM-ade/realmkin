"use client";

import Link from "next/link";
import React from "react";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-[#0b0b09]/80 backdrop-blur border-b border-[#404040]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full" style={{
              background: "radial-gradient(circle, #DA9C2F 0%, #8f6f25 60%, #2c2006 100%)"
            }} />
            <span className="text-sm font-semibold gold-gradient-text tracking-wide">Realmkin</span>
          </Link>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-[#f5f5f5]/80">
          <Link className="hover:text-[#DA9C2F] transition" href="/">Home</Link>
          <Link className="hover:text-[#DA9C2F] transition" href="/marketplace">Marketplace</Link>
          <Link className="hover:text-[#DA9C2F] transition" href="/discord">Discord</Link>
        </nav>
      </div>
    </header>
  );
}
