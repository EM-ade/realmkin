'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminWallets?: string[];
}

export default function ProtectedRoute({ children, adminWallets }: ProtectedRouteProps) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/');
      return;
    }

    if (adminWallets && userData && !adminWallets.includes(userData.walletAddress ?? '')) {
      router.push('/');
    }
  }, [user, userData, loading, router, adminWallets]);

  if (loading || !user || (adminWallets && userData && !adminWallets.includes(userData.walletAddress ?? ''))) {
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

  return <>{children}</>;
}
