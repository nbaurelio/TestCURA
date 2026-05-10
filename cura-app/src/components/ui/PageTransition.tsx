"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"idle" | "exit" | "enter">("idle");
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) return;

    // Phase 1: fade out current page
    setPhase("exit");

    const exitTimer = setTimeout(() => {
      // Phase 2: swap content, then fade in
      setDisplayChildren(children);
      prevPathname.current = pathname;
      setPhase("enter");

      // Phase 3: settle
      const enterTimer = setTimeout(() => setPhase("idle"), 250);
      return () => clearTimeout(enterTimer);
    }, 200);

    return () => clearTimeout(exitTimer);
  }, [pathname, children]);

  // Keep children fresh for same-page updates
  useEffect(() => {
    if (pathname === prevPathname.current) {
      setDisplayChildren(children);
    }
  }, [children, pathname]);

  return (
    <div
      style={{
        opacity: phase === "exit" ? 0 : 1,
        transition: phase === "exit"
          ? "opacity 200ms ease-out"
          : "opacity 250ms ease-in",
      }}
    >
      {displayChildren}
    </div>
  );
}
