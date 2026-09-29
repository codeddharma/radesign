"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const REVEAL_SELECTOR = ".reveal, .img-mask";
const NAV_HIDE_THRESHOLD = 120;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Client-side scroll behaviours ported from the original site.js:
 *   - reveal-on-scroll: an IntersectionObserver adds `.in` to `.reveal` / `.img-mask`
 *   - nav auto-hide: hide on scroll down past a threshold, show on scroll up
 *   - gentle parallax for any `[data-parallax]` element
 *
 * Reveal is FAIL-OPEN: content is never left hidden when JS / the observer
 * can't run (reduced-motion and unsupported-IntersectionObserver reveal
 * everything immediately; a <noscript> fallback in the layout covers no-JS).
 * Renders nothing.
 */
export function RevealController() {
  const pathname = usePathname();

  // Reveal-on-scroll
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(REVEAL_SELECTOR));

    // Reduced-motion or no IntersectionObserver → just show everything.
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
    );
    els.forEach((el) => io.observe(el));

    // Reveal anything already at/above the viewport. Runs at mount and again on
    // window `load`, so back-nav, in-page anchors, and elements pushed into view
    // by late-loading images/fonts are never stuck invisible.
    const sweep = () =>
      els.forEach((el) => {
        if (el.getBoundingClientRect().top < window.innerHeight * 0.95) {
          el.classList.add("in");
        }
      });
    sweep();
    window.addEventListener("load", sweep, { once: true });

    return () => {
      io.disconnect();
      window.removeEventListener("load", sweep);
    };
  }, [pathname]);

  // Nav auto-hide on scroll
  useEffect(() => {
    let last = 0;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const nav = document.querySelector(".nav");
        if (nav) {
          if (y > NAV_HIDE_THRESHOLD && y > last) nav.classList.add("nav-hidden");
          else nav.classList.remove("nav-hidden");
        }
        last = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Gentle parallax for [data-parallax] — skipped under reduced-motion.
  useEffect(() => {
    if (prefersReducedMotion()) return;

    let raf = 0;
    const tick = () => {
      const els = document.querySelectorAll<HTMLElement>("[data-parallax]");
      const vh = window.innerHeight;
      els.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2 - vh / 2;
        const strength = parseFloat(el.dataset.parallax || "") || 0.15;
        el.style.setProperty("--py", `${(mid * strength * -0.1).toFixed(2)}px`);
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [pathname]);

  return null;
}
