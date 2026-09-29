"use client";

import { useEffect, useState } from "react";
import { Media } from "@/components/Media";
import type { Img } from "@/lib/media";
import styles from "./hero-carousel.module.css";

const ADVANCE_MS = 5000;

/**
 * Auto-advancing cross-fade carousel of the client's wide hero photos. Slides
 * are stacked absolutely; the active slide fades in over ~1.2s. Honors
 * prefers-reduced-motion (no auto-advance, instant transitions via the CSS
 * module). First slide is priority-loaded for a fast LCP.
 */
export function HeroCarousel({ images }: { images: Img[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (images.length <= 1) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, ADVANCE_MS);

    return () => clearInterval(id);
  }, [images.length]);

  return (
    <div className={styles.root} aria-hidden="true">
      {images.map((img, i) => (
        <div
          key={img.src}
          className={`${styles.slide}${i === active ? ` ${styles.slideActive}` : ""}`}
        >
          <Media
            src={img.src}
            alt=""
            fill
            sizes="100vw"
            style={{ height: "100%" }}
            priority={i === 0}
          />
        </div>
      ))}
    </div>
  );
}
