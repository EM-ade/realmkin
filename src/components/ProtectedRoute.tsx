'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminWallets?: string[];
}

export default function ProtectedRoute({ children, adminWallets }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const { isConnected } = useWeb3();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Require BOTH: authenticated user AND connected wallet
    if (!user || !isConnected) {
      const target = encodeURIComponent(pathname || '/');
      router.push(`/login?redirect=${target}`);
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
    return null;
  }

  if (adminWallets && userData && !adminWallets.includes((userData.walletAddress ?? '').toLowerCase())) {
    return null;
  }

  return <>{children}</>;
}
