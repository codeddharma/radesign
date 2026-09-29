"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TestimonialContent } from "@/lib/admin/settings";

const ROTATE_MS = 8000;
const FADE_MS = 250;

/**
 * Auto-rotating client testimonial carousel — ported from the original
 * site.js: fades the quote out, swaps content after a short delay, fades back
 * in, and advances every 8s. Prev/next buttons step manually.
 */
export function Testimonial({ testimonials }: { testimonials: TestimonialContent[] }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeTimer = useRef<number | null>(null);

  const change = useCallback((delta: number) => {
    setVisible(false);
    if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    fadeTimer.current = window.setTimeout(() => {
      setIndex((current) => (current + delta + testimonials.length) % testimonials.length);
      setVisible(true);
    }, FADE_MS);
  }, [testimonials.length]);

  useEffect(() => {
    const id = window.setInterval(() => change(1), ROTATE_MS);
    return () => {
      window.clearInterval(id);
      if (fadeTimer.current) window.clearTimeout(fadeTimer.current);
    };
  }, [change]);

  const testimonial = testimonials[index] ?? { quote: "", name: "", role: "" };
  const fade = { transition: `opacity ${FADE_MS * 2}ms ease`, opacity: visible ? 1 : 0 };

  return (
    <div className="testimonial-block">
      <div className="mark reveal">&quot;</div>
      <div>
        <p className="body reveal" style={fade}>
          {testimonial.quote}
        </p>
        <div className="by reveal" style={fade}>
          <span className="nm">{testimonial.name}</span> {testimonial.role}
        </div>
        <div className="testi-nav">
          <button type="button" aria-label="Previous" onClick={() => change(-1)}>
            ←
          </button>
          <button type="button" aria-label="Next" onClick={() => change(1)}>
            →
          </button>
        </div>
      </div>
    </div>
  );
}
