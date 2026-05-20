"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Scroll to top"
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-secondary text-white shadow-lg border-2 border-white hover:bg-secondary/80 transition-all duration-200 animate-enter"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
