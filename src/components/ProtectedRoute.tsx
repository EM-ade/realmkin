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
      const target = encodeURIComponent(pathname || '/');
      setRedirecting(true);
      router.replace(`/login?redirect=${target}`);
      return;
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

  // Block render if either is missing (router will redirect)
  if (!user || !isConnected) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-[#DA9C2F]">
        <div className="flex items-center gap-3 text-sm uppercase tracking-widest">
          <span className="h-4 w-4 rounded-full border-2 border-transparent border-t-[#DA9C2F] animate-spin" />
          {redirecting ? 'Redirecting…' : 'Checking access…'}
        </div>
      </div>
    );
  }

  if (adminWallets && userData && !adminWallets.includes((userData.walletAddress ?? '').toLowerCase())) {
    return null;
  }

  return <>{children}</>;
}
