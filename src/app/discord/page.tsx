"use client";

import React, { useEffect, useState } from "react";

export default function DiscordRedirectPage() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const discordUrl = process.env.NEXT_PUBLIC_DISCORD_URL || null;
    setUrl(discordUrl);
    if (discordUrl) {
      // small delay so user sees a message
      const t = setTimeout(() => {
        window.location.href = discordUrl;
      }, 600);
      return () => clearTimeout(t);
    }
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-[#0a0b0d] px-6 py-24 text-white">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Join our Discord</h1>
        {url ? (
          <p className="mt-3 text-white/70">
            Redirecting you now… If it doesn't work, <a className="text-cyan-300 underline" href={url}>click here</a>.
          </p>
        ) : (
          <p className="mt-3 text-white/70">
            Discord invite URL is not configured. Please set <code className="rounded bg-white/10 px-1 py-0.5">NEXT_PUBLIC_DISCORD_URL</code> in your environment.
          </p>
        )}
      </div>
    </main>
  );
}
