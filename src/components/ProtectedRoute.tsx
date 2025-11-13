'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminWallets?: string[];
}

export default function ProtectedRoute({ children, adminWallets }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const { isConnected } = useWeb3();
  const router = useRouter();
  const pathname = usePathname();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;

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
  }, [user, userData, loading, isConnected, router, adminWallets]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
        <video
          className="max-w-full max-h-full object-contain"
          src="/loading-screen.mp4"
          autoPlay
          muted
          playsInline
          preload="auto"
        />
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
