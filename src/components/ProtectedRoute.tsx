'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useWeb3 } from '@/contexts/Web3Context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminWallets?: string[];
}

export default function ProtectedRoute({ children, adminWallets }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const { isConnected } = useWeb3();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Allow access if either user is authenticated OR wallet is connected
    if (!user && !isConnected) {
      router.push('/login');
      return;
    }

    if (adminWallets && userData && !adminWallets.includes(userData.walletAddress ?? '')) {
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

  // Allow access if either authenticated or wallet connected
  if (!user && !isConnected) {
    return null;
  }

  if (adminWallets && userData && !adminWallets.includes(userData.walletAddress ?? '')) {
    return null;
  }

  return <>{children}</>;
}
