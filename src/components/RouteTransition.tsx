"use client";

import React, { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import RealmTransition from "@/components/RealmTransition";

export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [show, setShow] = useState(true);

  useLayoutEffect(() => {
    // Mark HTML as hydrated to allow body to show
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('hydrated');
    }

    const MIN_DURATION = 5000; // 5-second mystical transition

    setShow(true);
    const t = window.setTimeout(() => {
      setShow(false);
    }, MIN_DURATION);
    return () => window.clearTimeout(t);
  }, [pathname]);

  return (
    <>
      <RealmTransition active={show} />
      <div
        className={`route-transition-content${show ? " route-transition-content--hidden" : ""}`}
        aria-hidden={show}
      >
        {children}
      </div>

      <style jsx>{`
        .route-transition-content {
          transition: opacity 150ms ease;
        }

        .route-transition-content--hidden {
          opacity: 0;
          pointer-events: none;
        }
      `}</style>
    </>
  );
}
