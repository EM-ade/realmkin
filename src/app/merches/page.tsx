"use client";

import { useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import ComingSoonTemplate from "@/components/ComingSoonTemplate";

export default function MerchesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const { isConnected } = useWeb3();

  const shouldRedirect = useMemo(() => {
    if (loading) return false;
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

  return <ComingSoonTemplate current="merches" />;
}
