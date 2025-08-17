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
      router.push('/login');
      return;
    }

    if (adminWallets && userData && !adminWallets.includes(userData.walletAddress ?? '')) {
      router.push('/');
    }
  }, [user, userData, loading, router, adminWallets]);

  if (loading || !user || (adminWallets && userData && !adminWallets.includes(userData.walletAddress ?? ''))) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
