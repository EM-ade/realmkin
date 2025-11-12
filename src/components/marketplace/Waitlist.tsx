"use client";

import React, { useState } from "react";

export default function Waitlist() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        throw new Error("Bad response");
      }
      setStatus("success");
      setMessage("You're on the list. We'll let you know when we launch.");
      setEmail("");
    } catch (e) {
      setStatus("error");
      setMessage("Something went wrong. Please try again later.");
    }
  };

  return (
    <section id="waitlist" className="bg-[#0b0d10] py-14">
      <div className="mx-auto max-w-2xl px-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-white backdrop-blur">
          <h2 className="text-xl font-semibold">Get notified</h2>
          <p className="mt-1 text-sm text-white/70">
            Be the first to list and earn when the Realmkin Marketplace opens.
          </p>
          <form onSubmit={submit} className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-[#0a0b0d] px-3 py-2 text-sm text-white placeholder-white/40 outline-none ring-0 focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/20"
            />
            <button
              disabled={status === "loading"}
              className="inline-flex items-center justify-center rounded-md bg-cyan-400/90 px-4 py-2 text-sm font-medium text-[#0a0b0d] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
            >
              {status === "loading" ? "Adding…" : "Notify me"}
            </button>
          </form>
          {message && (
            <p
              className={`mt-3 text-sm ${
                status === "error" ? "text-red-300" : "text-white/80"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
