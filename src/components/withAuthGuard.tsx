"use client";

import React, { ComponentType, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";

export default function withAuthGuard<P extends object>(Wrapped: ComponentType<P>) {
  const Guarded: React.FC<P> = (props: P) => {
    const router = useRouter();
    const pathname = usePathname();
    const { user, loading } = useAuth();
    const { isConnected, isConnecting } = useWeb3();
    const [authCheckDelayed, setAuthCheckDelayed] = useState(true);

    // Add a small delay to allow Firebase auth to complete after wallet connection
    useEffect(() => {
      if (isConnected && !user) {
        // Wallet just connected, give Firebase auth time to complete
        console.log("⏳ Wallet connected, waiting for Firebase auth to complete...");
        const timer = setTimeout(() => {
          setAuthCheckDelayed(false);
        }, 2000); // 2 second grace period for Firebase auth
        return () => clearTimeout(timer);
      } else {
        setAuthCheckDelayed(false);
      }
    }, [isConnected, user]);

    const shouldRedirect = useMemo(() => {
      // Don't redirect while loading or during auth delay
      if (loading || authCheckDelayed || isConnecting) return false;
      
      // Redirect if not logged in or wallet not connected
      return !user || !isConnected;
    }, [user, isConnected, loading, authCheckDelayed, isConnecting]);

    useEffect(() => {
      if (shouldRedirect) {
        console.log("🚫 Auth guard: redirecting to login", { user: !!user, isConnected });
        const target = encodeURIComponent(pathname || "/");
        router.replace(`/login?redirect=${target}`);
      }
    }, [shouldRedirect, pathname, router, user, isConnected]);

    if (loading || shouldRedirect || authCheckDelayed || isConnecting) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-[#DA9C2F]">
          <div className="flex items-center gap-3 text-sm uppercase tracking-widest">
            <span className="h-4 w-4 rounded-full border-2 border-transparent border-t-[#DA9C2F] animate-spin" />
            {isConnecting ? "Connecting wallet…" : authCheckDelayed ? "Authenticating…" : "Checking access…"}
          </div>
        </div>
      );
    }

    return <Wrapped {...props} />;
  };

  Guarded.displayName = `withAuthGuard(${Wrapped.displayName || Wrapped.name || "Component"})`;
  return Guarded;
}
