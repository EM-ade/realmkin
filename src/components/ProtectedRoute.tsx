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
  const { isConnected, isConnecting } = useWeb3();
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
    if (inGrace || isConnecting) return;

    // Require BOTH: authenticated user AND connected wallet
    if (!user || !isConnected) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#050302] text-[#DA9C2F] p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <h2 className="text-2xl font-bold uppercase tracking-wider">Access Restricted</h2>
            <p className="text-white/70">Please connect your wallet to access this page.</p>
            {/* The wallet button is usually in the header, but we can add a hint or a button here if needed. 
                For now, relying on the global header or a simple message is safer to avoid circular dependencies if we try to import ConnectButton.
            */}
          </div>
        </div>
      );
    }

    if (adminWallets && userData && !adminWallets.includes((userData.walletAddress ?? '').toLowerCase())) {
      router.push('/');
    }
  }, [user, userData, loading, isConnected, isConnecting, router, adminWallets, pathname, inGrace]);

  if (loading || inGrace || isConnecting) {
    return (
      <div className="fixed inset-0 z-[9998]">
        <RealmTransition active={true} />
      </div>
    );
  }

  // Block render if either is missing (should be handled by effect above, but double check)
  if (!user || !isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#050302] text-[#DA9C2F] p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h2 className="text-2xl font-bold uppercase tracking-wider">Access Restricted</h2>
          <p className="text-white/70">Please connect your wallet to access this page.</p>
        </div>
      </div>
    );
  }

  if (adminWallets && userData && !adminWallets.includes((userData.walletAddress ?? '').toLowerCase())) {
    return null;
  }

  return <>{children}</>;
}
