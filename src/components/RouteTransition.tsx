"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import RealmTransition from "@/components/RealmTransition";

export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger on route change
    setShow(true);
    const t = setTimeout(() => setShow(false), 900);
    return () => clearTimeout(t);
  }, [pathname]);

  return (
    <>
      {show && <RealmTransition />}
      {children}
    </>
  );
}
