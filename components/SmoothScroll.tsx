"use client";

import { ReactLenis } from "lenis/react";
import { useEffect, useState, type ReactNode } from "react";

interface SmoothScrollProps {
  children: ReactNode;
}

/**
 * Lenis smooth scroll, matching the original site.js configuration
 * (lerp 0.09, smoothWheel, wheelMultiplier 1.0, touchMultiplier 1.5).
 *
 * `root` attaches Lenis to the document/window so the whole page scrolls
 * smoothly; ReactLenis runs its own requestAnimationFrame loop. Disabled when
 * the user prefers reduced motion — they get native scrolling instead.
 */
export function SmoothScroll({ children }: SmoothScrollProps) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  if (reduced) return <>{children}</>;

  return (
    <ReactLenis
      root
      options={{
        lerp: 0.09,
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.5,
      }}
    >
      {children}
    </ReactLenis>
  );
}
