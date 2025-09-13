"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";

export const dynamic = "force-dynamic";

function LinkedInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const status = sp.get("status");
  const discordId = sp.get("discordId");
  const username = sp.get("username");
  const disc = sp.get("disc");
  const reason = sp.get("reason");
  const detail = sp.get("detail");

  const gatekeeperBase = useMemo(
    () => process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "https://gatekeeper-bot.fly.dev",
    []
  );

  const [linkState, setLinkState] = useState<
    | { phase: "idle" }
    | { phase: "linking" }
    | { phase: "linked"; discordId: string }
    | { phase: "error"; message: string }
  >({ phase: "idle" });

  // Track Firebase auth state
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setFbUser(u);
      setAuthChecked(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (status !== "ok" || !discordId) return;
    // Wait until we know whether the user is signed in
    if (!authChecked) return;
    if (!fbUser) {
      setLinkState({ phase: "error", message: "Please sign in first." });
      return;
    }

    async function run() {
      try {
        setLinkState({ phase: "linking" });
        // Snapshot user to satisfy TS (avoid nullable across await)
        const user = fbUser;
        if (!user) {
          setLinkState({ phase: "error", message: "Please sign in first." });
          return;
        }
        // Get Firebase ID token from current user
        const token: string = await user.getIdToken();

        const res = await fetch(`${gatekeeperBase}/api/link/discord`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ discordId }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || "Failed to link Discord");
        }
        setLinkState({ phase: "linked", discordId: discordId as string });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Unknown error";
        setLinkState({ phase: "error", message });
      }
    }

    run();
  }, [status, discordId, gatekeeperBase, authChecked, fbUser]);

  const title = useMemo(() => {
    if (status === "error") return "Discord Linking Error";
    if (linkState.phase === "linked") return "Discord Linked";
    if (linkState.phase === "linking") return "Linking Discord...";
    return "Discord Linking";
  }, [status, linkState]);

  return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#0B0F14] text-white">
        <div className="w-full max-w-md rounded-xl border border-[#1E2633] bg-[#121826] p-6 shadow-xl">
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        {status === "error" && (
          <>
            <p className="text-red-400 mb-2">{reason || "OAuth error"}</p>
            {detail && (
              <pre className="text-xs text-red-300 whitespace-pre-wrap bg-[#0B0F14] p-3 rounded">{detail}</pre>
            )}
          </>
        )}

        {status === "ok" && !discordId && (
          <p className="text-amber-400">Missing Discord ID from callback.</p>
        )}

        {status === "ok" && discordId && (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">
              <div>Discord: {username ? `${username}${disc ? `#${disc}` : ""}` : discordId}</div>
              <div>ID: {discordId}</div>
            </div>

            {!authChecked && (
              <div className="animate-pulse text-blue-300">Checking sign-in…</div>
            )}
            {authChecked && !fbUser && linkState.phase === "error" && (
              <div className="space-y-3">
                <div className="text-amber-400">Please sign in to complete linking.</div>
                <button
                  className="w-full rounded bg-[#1F6FEB] hover:bg-[#1A5ECC] py-2 text-sm font-medium"
                  onClick={() => router.push("/login")}
                >
                  SIGN IN
                </button>
              </div>
            )}
            {fbUser && linkState.phase === "linking" && (
              <div className="animate-pulse text-blue-300">Linking your Discord…</div>
            )}
            {fbUser && linkState.phase === "linked" && (
              <div className="text-emerald-400">Your Discord is linked! You can close this page.</div>
            )}
            {fbUser && linkState.phase === "error" && (
              <div className="text-red-400">{linkState.message}</div>
            )}

            <button
              className="mt-2 w-full rounded bg-[#1F6FEB] hover:bg-[#1A5ECC] py-2 text-sm font-medium"
              onClick={() => router.push("/")}
            >
              Back to Home
            </button>
          </div>
        )}
        </div>
      </main>
  );
}

export default function DiscordLinkedPage() {
  return (
    <Suspense fallback={<main className="min-h-screen flex items-center justify-center p-6 bg-[#0B0F14] text-white">Loading…</main>}>
      <LinkedInner />
    </Suspense>
  );
}
