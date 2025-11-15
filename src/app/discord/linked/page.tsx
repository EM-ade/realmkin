"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuth } from "firebase/auth";
import "../../../config/firebaseClient"; // ensure Firebase app is initialized

type Phase =
  | "idle"
  | "linking"
  | "checkingMember"
  | "join"
  | "verifying"
  | "linked"
  | "error";

function DiscordLinkedContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const status = sp?.get("status") ?? null;
  const discordId = sp?.get("discordId") ?? null;
  const gatekeeperBase =
    process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "http://localhost:3001";
  const inviteUrl = process.env.NEXT_PUBLIC_DISCORD_URL || "";

  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>("");
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Observe auth so we can prompt login or proceed
  useEffect(() => {
    const auth = getAuth();
    const unsub = auth.onAuthStateChanged((u) => {
      setSignedIn(Boolean(u));
    });
    return () => unsub();
  }, []);

  // If not signed in, auto-redirect to login with a return URL
  useEffect(() => {
    if (status !== "ok" || !discordId) return;
    if (signedIn) return;
    const ret = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/discord/linked';
    const t = setTimeout(() => {
      router.push(`/login?return=${encodeURIComponent(ret)}`);
    }, 800);
    return () => clearTimeout(t);
  }, [status, discordId, signedIn, router]);

  useEffect(() => {
    if (status !== "ok" || !discordId) return;
    if (!signedIn) return; // wait until user is signed in
    async function run() {
      try {
        setPhase("linking");
        console.log("[discord:linked] Start for discordId=", discordId);

        const auth = getAuth();
        if (!auth.currentUser) return; // guarded by signedIn check
        const token = await auth.currentUser.getIdToken();
        console.log("[discord:linked] Got Firebase ID token");

        // Link Discord
        console.log("[discord:linked] POST /api/link/discord", gatekeeperBase);
        const linkRes = await fetch(`${gatekeeperBase}/api/link/discord`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ discordId }),
        });
        const linkJson = await linkRes.json().catch(() => ({} as Record<string, unknown>));
        console.log("[discord:linked] link response:", linkRes.status, linkJson);
        if (!linkRes.ok) {
          throw new Error(linkJson?.error || `Failed to link (${linkRes.status})`);
        }

        // Step 2: Ensure user is in guild before verification
        setPhase("checkingMember");
        const checkMember = async (): Promise<boolean> => {
          const mRes = await fetch(`${gatekeeperBase}/api/discord/is-member`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          const mJson = await mRes.json().catch(() => ({} as Record<string, unknown>));
          console.log("[discord:linked] is-member:", mRes.status, mJson);
          return Boolean((mJson as Record<string, unknown>)?.member);
        };
        const inGuild = await checkMember();
        if (!inGuild) {
          // Show invite and poll until they join
          setPhase("join");
          // Start polling every 5s, up to 3 minutes
          let elapsed = 0;
          const poll = async () => {
            try {
              const ok = await checkMember();
              if (ok) {
                if (pollRef.current) clearInterval(pollRef.current);
                // Proceed to verification
                setPhase("verifying");
                const vRes = await fetch(`${gatekeeperBase}/api/verification/auto`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ discordId }),
                });
                const vJson = await vRes.json().catch(() => ({} as Record<string, unknown>));
                console.log("[discord:linked] verification response:", vRes.status, vJson);
                setPhase("linked");
                setMessage("Discord linked and verified.");
              } else {
                elapsed += 5;
                if (elapsed >= 180) {
                  if (pollRef.current) clearInterval(pollRef.current);
                  setPhase("error");
                  setMessage("Join the Discord server to continue. Timed out waiting for membership.");
                }
              }
            } catch (e) {
              console.warn("[discord:linked] member poll error:", e);
            }
          };
          pollRef.current = setInterval(poll, 5000);
          return;
        }

        // Step 3: Already in guild → run verification
        try {
          setPhase("verifying");
          console.log("[discord:linked] POST /api/verification/auto", gatekeeperBase);
          const vRes = await fetch(`${gatekeeperBase}/api/verification/auto`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ discordId }),
          });
          const vJson = await vRes.json().catch(() => ({} as Record<string, unknown>));
          console.log("[discord:linked] verification response:", vRes.status, vJson);
          setPhase("linked");
          setMessage("Discord linked and verified.");
        } catch (verErr) {
          console.warn("[discord:linked] auto-verify warning:", verErr);
          setPhase("linked");
          setMessage("Discord linked.");
        }
      } catch (e: unknown) {
        console.error("[discord:linked] error:", e);
        setPhase("error");
        setMessage((e instanceof Error ? e.message : String(e)) || "Unknown error");
      }
    }
    run();
    }, [status, discordId, gatekeeperBase, signedIn]);

  const title = useMemo(() => {
    if (status === "error") return "Discord Linking Error";
    return "Discord Linking";
  }, [status]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0B0F14] px-6 py-12 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-[#DA9C2F]/25 bg-[#0B0B09]/70 p-6 shadow-xl">
        <div className="mb-3 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-white/60">
            Connect and verify to receive roles automatically.
          </p>
        </div>

        {/* Status banner */}
        <div className="rounded-lg border border-[#DA9C2F]/30 bg-[#141414] px-4 py-3 text-sm">
          {status === "error" && (
            <span className="text-red-400">An error occurred during Discord authorization.</span>
          )}
          {status === "ok" && (
            <span className="text-[#DA9C2F]">Authorization complete. Finalizing link…</span>
          )}
        </div>

        {/* Auth gate */}
        {!signedIn && (
          <div className="mt-4 rounded-lg border border-[#404040] bg-[#121212] p-4 text-center">
            <p className="mb-3 text-red-400">Please sign in first.</p>
            <button
              onClick={() => {
                const ret = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/discord/linked';
                router.push(`/login?return=${encodeURIComponent(ret)}`);
              }}
              className="inline-flex items-center justify-center rounded-lg bg-[#DA9C2F] px-4 py-2 text-black font-semibold hover:bg-[#ffbf00]"
            >
              Go to Login
            </button>
          </div>
        )}

        {/* Progress states */}
        {signedIn && (
          <div className="mt-4 grid gap-3">
            {phase === "linking" && (
              <div className="rounded-lg border border-[#404040] bg-[#121212] p-4">Linking your Discord…</div>
            )}
            {phase === "checkingMember" && (
              <div className="rounded-lg border border-[#404040] bg-[#121212] p-4">Checking if you have joined the Discord server…</div>
            )}
            {phase === "join" && (
              <div className="rounded-lg border border-[#404040] bg-[#121212] p-4 text-center">
                <p className="mb-3">You&apos;re not in the Discord server yet.</p>
                {inviteUrl ? (
                  <a
                    href={inviteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-lg bg-[#DA9C2F] px-4 py-2 text-black font-semibold hover:bg-[#ffbf00]"
                  >
                    Join Discord
                  </a>
                ) : (
                  <p className="text-sm text-white/60">Invite URL not configured (set NEXT_PUBLIC_DISCORD_URL).</p>
                )}
                <p className="mt-2 text-xs text-white/50">Once you join, this page will continue automatically.</p>
              </div>
            )}
            {phase === "verifying" && (
              <div className="rounded-lg border border-[#404040] bg-[#121212] p-4">Verifying your NFTs…</div>
            )}
            {phase === "linked" && (
              <div className="rounded-lg border border-[#2E7D32] bg-[#0f1a12] p-4 text-emerald-400">
                ✅ Discord linked. You can close this tab and return to the app.
              </div>
            )}
            {phase === "error" && (
              <div className="rounded-lg border border-red-900 bg-[#1a0f0f] p-4 text-red-400">{message || "Internal error"}</div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function DiscordLinkedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0B0F14] text-white">Loading...</div>}>
      <DiscordLinkedContent />
    </Suspense>
  );
}
