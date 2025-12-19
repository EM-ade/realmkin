'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import RealmTransition from '@/components/RealmTransition';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminWallets?: string[];
}

export default function ProtectedRoute({ children, adminWallets }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const { isConnected, isConnecting, isAuthenticating } = useWeb3();
  const router = useRouter();
  const pathname = usePathname();
  const [redirecting, setRedirecting] = useState(false);
  const [graceOver, setGraceOver] = useState(false);

  // Check if this is an OAuth flow (needs longer grace period)
  const isOAuthFlow = pathname?.includes('/discord/linked') ||
    pathname?.includes('/oauth/callback');

  // Start a grace window to allow auth and wallet to hydrate after refresh
  // Extended for OAuth flows (10s) vs normal pages (3s)
  useEffect(() => {
    const graceTime = isOAuthFlow ? 10000 : 3000;
    const timeout = setTimeout(() => setGraceOver(true), graceTime);
    return () => clearTimeout(timeout);
  }, [isOAuthFlow]);

  // During grace, block interactions with a loading overlay
  const inGrace = useMemo(() => !graceOver, [graceOver]);

  useEffect(() => {
    if (loading) return; // still hydrating auth

    // While within grace window or wallet is mid-connecting, do not redirect yet
    if (inGrace || isConnecting || isAuthenticating) return;

    // Require BOTH: authenticated user AND connected wallet
    if (!user || !isConnected) {
      return;
    }

    if (adminWallets && userData && !adminWallets.includes((userData.walletAddress ?? '').toLowerCase())) {
      router.push('/');
    }
  }, [user, userData, loading, isConnected, isConnecting, isAuthenticating, router, adminWallets, pathname, inGrace]);

  // Render children with overlay if restricted
  return (
    <div className="relative min-h-screen">
      {/* Content Layer - No blur on container to allow children z-index to pop through */}
      <div className="transition-all duration-500">
        {children}
      </div>

      {/* Restricted Access Overlay - z-15 to sit ABOVE content (z-0/z-10) but BELOW navbar (z-20/z-50) */}
      {(!user || !isConnected) && !loading && !inGrace && !isConnecting && !isAuthenticating && (
        <div className="fixed inset-0 z-[15] flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 animate-fade-in">
          <div className="max-w-md w-full text-center space-y-8 p-8 rounded-2xl bg-[#050302]/90 border border-[#DA9C2F]/20 shadow-[0_0_30px_rgba(218,156,47,0.1)]">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-[#DA9C2F]">Access Restricted</h2>
              <p className="text-white/70 leading-relaxed">
                Please connect your wallet to access this realm.
              </p>
            </div>

            <div className="flex justify-center">
              {/* We can't easily import ConnectButton here due to circular deps, 
                  so we'll use a simple button that triggers the wallet modal via a custom event or just a visual cue 
                  since the navbar button is visible. 
                  Actually, we can try to use the wallet adapter modal directly if we import it, 
                  but let's stick to a clean UI that points to the navbar or uses a simple button if possible.
              */}
              <button
                onClick={() => {
                  // Dispatch event to open wallet modal (handled by WalletButton or similar if set up)
                  // Or just fallback to a visual instruction if no direct trigger
                  const walletButton = document.querySelector('.wallet-adapter-button') as HTMLButtonElement;
                  if (walletButton) {
                    walletButton.click();
                  } else {
                    // Fallback: Dispatch a custom event that GlobalNavigation listens to? 
                    // Or just rely on the user clicking the navbar button which is now visible.
                    // Let's try to find the standard wallet adapter button class or id.
                    // For now, let's just make it clear.
                    const connectBtn = document.getElementById('connect-wallet-btn');
                    if (connectBtn) connectBtn.click();
                  }
                }}
                className="px-8 py-3 rounded-xl bg-[#DA9C2F] text-black font-bold uppercase tracking-wide hover:bg-[#ffbf00] transition-all transform hover:scale-105 shadow-lg shadow-[#DA9C2F]/20"
              >
                Connect Wallet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {(loading || inGrace || isConnecting || isAuthenticating) && (
        <div className="fixed inset-0 z-[9998]">
          <RealmTransition active={true} />
        </div>
      )}
    </div>
  );
}
