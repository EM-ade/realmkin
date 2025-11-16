"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signInWithCustomToken } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../config/firebaseClient"; // ensure Firebase app is initialized

type Phase =
  | "idle"
  | "restoringSession"
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
  const walletAddressFromParams = sp?.get("wallet") ?? null;
  const firebaseTokenFromParams = sp?.get("firebase_token") ?? null;
  const gatekeeperBase =
    process.env.NEXT_PUBLIC_GATEKEEPER_BASE || "http://localhost:3001";
  const inviteUrl = process.env.NEXT_PUBLIC_DISCORD_URL || "";

  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState<string>("");
  const [signedIn, setSignedIn] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Check auth state and try to restore session if needed
  useEffect(() => {
    const auth = getAuth();
    
    // Check if user is already authenticated
    if (auth.currentUser) {
      setSignedIn(true);
      setAuthChecked(true);
      return;
    }
    
    // Try to restore session from localStorage or params
    const tryRestoreSession = async () => {
      try {
        const walletAddress = walletAddressFromParams || sessionStorage.getItem('realmkin_wallet_address');
        const firebaseToken = firebaseTokenFromParams || sessionStorage.getItem('realmkin_firebase_token');
        
        if (walletAddress && firebaseToken) {
          setPhase("restoringSession");
          console.log("[discord:linked] Attempting to restore session for wallet:", walletAddress);
          
          // Store token for future use
          sessionStorage.setItem('realmkin_firebase_token', firebaseToken);
          
          // Try to refresh the token to verify it's still valid
          try {
            // Note: Firebase ID tokens are different from custom tokens
            // We'll verify the token and sign in with it
            const userCredential = await signInWithCustomToken(auth, firebaseToken);
            console.log("[discord:linked] Session restored with custom token successfully");
            setSignedIn(true);
            return;
          } catch (tokenError) {
            console.warn("[discord:linked] Custom token invalid, trying email/password:", tokenError);
          }
        }
        
        // Fallback to email/password if we have wallet address
        if (walletAddress) {
          setPhase("restoringSession");
          console.log("[discord:linked] Attempting to restore session with email/password for wallet:", walletAddress);
          
          // Create temporary credentials
          const tempEmail = `${walletAddress.toLowerCase()}@wallet.realmkin.com`;
          const tempPassword = walletAddress;
          
          // Try to sign in with temporary credentials
          await signInWithEmailAndPassword(auth, tempEmail, tempPassword);
          console.log("[discord:linked] Session restored successfully with email/password");
          setSignedIn(true);
        }
      } catch (error) {
        console.warn("[discord:linked] Failed to restore session:", error);
        // If restoration fails, continue with normal flow
      } finally {
        setAuthChecked(true);
      }
    };
    
    // Set up auth state listener
    const unsub = onAuthStateChanged(auth, (user) => {
      setSignedIn(!!user);
      setAuthChecked(true);
    });
    
    // Try to restore session
    tryRestoreSession();
    
    return () => unsub();
  }, [walletAddressFromParams, firebaseTokenFromParams]);

  // If not signed in, auto-redirect to login with a return URL
  useEffect(() => {
    if (!authChecked) return; // Wait for auth check to complete
    if (status !== "ok" || !discordId) return;
    if (signedIn) return;
    
    const ret = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/discord/linked';
    // Store the return URL in sessionStorage so it persists across redirects
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('discord_return_url', ret);
      // Store wallet address and token for session restoration
      if (walletAddressFromParams) {
        sessionStorage.setItem('realmkin_wallet_address', walletAddressFromParams);
      }
      if (firebaseTokenFromParams) {
        sessionStorage.setItem('realmkin_firebase_token', firebaseTokenFromParams);
      }
    }
    
    const t = setTimeout(() => {
      router.push(`/login?return=${encodeURIComponent(ret)}`);
    }, 800);
    return () => clearTimeout(t);
  }, [status, discordId, signedIn, authChecked, router, walletAddressFromParams, firebaseTokenFromParams]);

  useEffect(() => {
    if (!authChecked) return; // Wait for auth check to complete
    if (status !== "ok" || !discordId) return;
    if (!signedIn) return; // wait until user is signed in
    async function run() {
      try {
        setPhase("linking");
        console.log("[discord:linked] ===== START DISCORD LINK =====");
        console.log("[discord:linked] discordId=", discordId);

        const auth = getAuth();
        if (!auth.currentUser) {
          console.warn("[discord:linked] No current user, waiting for auth...");
          return;
        }
        const token = await auth.currentUser.getIdToken(true); // Force refresh token
        console.log("[discord:linked] Got Firebase ID token");
        console.log("[discord:linked] Current user UID:", auth.currentUser.uid);
        console.log("[discord:linked] ========================");

        // Get wallet address from Firebase user profile or params
        let walletAddress = walletAddressFromParams;
        
        // Validate wallet address if provided
        if (walletAddress) {
          // Basic validation - check if it looks like a Solana address
          if (walletAddress.length < 32 || walletAddress.length > 44) {
            console.warn("[discord:linked] Invalid wallet address length:", walletAddress.length);
            walletAddress = null;
          } else {
            // Check if it contains only valid base58 characters
            const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
            if (!base58Regex.test(walletAddress)) {
              console.warn("[discord:linked] Wallet address contains invalid characters");
              walletAddress = null;
            }
          }
        }
        
        if (!walletAddress) {
          try {
            const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              walletAddress = userData.walletAddress;
              console.log("[discord:linked] Wallet address from user profile:", walletAddress);
              
              // Validate wallet address from Firebase as well
              if (walletAddress) {
                if (walletAddress.length < 32 || walletAddress.length > 44) {
                  console.warn("[discord:linked] Invalid wallet address length from Firebase:", walletAddress.length);
                  walletAddress = null;
                } else {
                  const base58Regex = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;
                  if (!base58Regex.test(walletAddress)) {
                    console.warn("[discord:linked] Wallet address from Firebase contains invalid characters");
                    walletAddress = null;
                  }
                }
              }
            }
          } catch (walletError) {
            console.warn("[discord:linked] Failed to get wallet address:", walletError);
          }
        }

        // Link Discord with wallet address
        console.log("[discord:linked] POST /api/link/discord", gatekeeperBase);
        const linkRes = await fetch(`${gatekeeperBase}/api/link/discord`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            discordId,
            ...(walletAddress && { walletAddress }) // Include wallet address if available
          }),
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
                // Proceed to verification with wallet address
                setPhase("verifying");
                const vRes = await fetch(`${gatekeeperBase}/api/verification/auto`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ 
                    discordId,
                    ...(walletAddress && { walletAddress }) // Include wallet address if available
                  }),
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

        // Step 3: Already in guild → run verification with wallet address
        try {
          setPhase("verifying");
          console.log("[discord:linked] POST /api/verification/auto", gatekeeperBase);
          const vRes = await fetch(`${gatekeeperBase}/api/verification/auto`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ 
              discordId,
              ...(walletAddress && { walletAddress }) // Include wallet address if available
            }),
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
    }, [status, discordId, gatekeeperBase, signedIn, authChecked, walletAddressFromParams, firebaseTokenFromParams]);

  // Redirect to home after successful linking
  useEffect(() => {
    if (phase === "linked") {
      const timer = setTimeout(() => {
        router.push("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [phase, router]);

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
        {!authChecked && (
          <div className="mt-4 rounded-lg border border-[#404040] bg-[#121212] p-4 text-center">
            <p className="mb-3">Checking authentication status...</p>
          </div>
        )}

        {authChecked && !signedIn && (
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
        {authChecked && signedIn && (
          <div className="mt-4 grid gap-3">
            {phase === "restoringSession" && (
              <div className="rounded-lg border border-[#404040] bg-[#121212] p-4">Restoring your session...</div>
            )}
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
                <p className="mb-3">✅ Discord linked successfully!</p>
                <p className="text-sm">Redirecting to dashboard in 3 seconds...</p>
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