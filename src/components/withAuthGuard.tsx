"use client";

import React, { ComponentType, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";

export default function withAuthGuard<P extends object>(Wrapped: ComponentType<P>) {
  const Guarded: React.FC<P> = (props: P) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const { isConnected } = useWeb3();

    const shouldRedirect = useMemo(() => {
      if (loading) return false;
      // Redirect if not logged in or wallet not connected
      return !user || !isConnected;
    }, [user, isConnected, loading]);

    useEffect(() => {
      if (shouldRedirect) {
        const target = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirect=${target}`);
      }
    }, [shouldRedirect, pathname, router]);

    if (loading || shouldRedirect) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-[#DA9C2F]">
          <div className="flex items-center gap-3 text-sm uppercase tracking-widest">
            <span className="h-4 w-4 rounded-full border-2 border-transparent border-t-[#DA9C2F] animate-spin" />
            Checking access…
          </div>
        </div>
      );
    }

    return <Wrapped {...props} />;
  };

  Guarded.displayName = `withAuthGuard(${Wrapped.displayName || Wrapped.name || "Component"})`;
  return Guarded;
}
