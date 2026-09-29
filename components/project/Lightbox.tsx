"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { Img } from "@/lib/projects";

interface LenisLike {
  stop: () => void;
  start: () => void;
}

interface LightboxProps {
  photos: Img[];
  /** Index of the open photo, or null when the lightbox is closed. */
  index: number | null;
  /** Fallback caption (e.g. "Project 1 — image 3"). */
  titleForFallback: string;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

const pad2 = (n: number): string => String(n).padStart(2, "0");

/**
 * Full-screen lightbox modal. Shows the real photo *contained* (whole image,
 * never cropped) at its intrinsic ratio, capped to the viewport, with a gentle
 * fade-in. Prev/next wrap around the gallery, Esc / arrow keys work while open,
 * clicking the backdrop closes, and body scroll + Lenis are locked.
 */
export function Lightbox({
  photos,
  index,
  titleForFallback,
  onClose,
  onNavigate,
}: LightboxProps) {
  const isOpen = index !== null;
  const total = photos.length;
  const [loaded, setLoaded] = useState(false);

  const goPrev = useCallback(() => {
    if (index === null || total === 0) return;
    onNavigate((index - 1 + total) % total);
  }, [index, total, onNavigate]);

  const goNext = useCallback(() => {
    if (index === null || total === 0) return;
    onNavigate((index + 1) % total);
  }, [index, total, onNavigate]);

  // reset the fade each time the photo changes
  useEffect(() => {
    setLoaded(false);
  }, [index]);

  // Lock body scroll + pause Lenis while open; always restore on close/unmount.
  useEffect(() => {
    if (!isOpen) return;

    const lenis = (window as unknown as { __lenis?: LenisLike }).__lenis;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    lenis?.stop();

    return () => {
      document.body.style.overflow = previousOverflow;
      lenis?.start();
    };
  }, [isOpen]);

  // Keyboard controls while open.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, goPrev, goNext]);

  if (index === null) {
    // Keep the dialog in the DOM but inert when closed.
    return (
      <div className="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-hidden="true" />
    );
  }

  const photo = photos[index];
  const caption = `${titleForFallback}, image ${index + 1}`;

  return (
    <div
      className="lightbox open"
      id="lightbox"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button className="lb-prev" id="lb-prev" aria-label="Previous" onClick={goPrev}>
        ←
      </button>
      <div className="lb-img" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <Image
          key={index}
          src={photo.src}
          alt={caption}
          width={photo.w}
          height={photo.h}
          sizes="92vw"
          priority
          onLoad={() => setLoaded(true)}
          style={{
            width: "auto",
            height: "auto",
            maxWidth: "min(1400px, 92vw)",
            maxHeight: "86vh",
            objectFit: "contain",
            display: "block",
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.5s ease",
          }}
        />
      </div>
      <button className="lb-next" id="lb-next" aria-label="Next" onClick={goNext}>
        →
      </button>
      <button className="lb-close" id="lb-close" aria-label="Close" onClick={onClose}>
        Close
      </button>
      <div className="lb-counter" id="lb-counter">
        {pad2(index + 1)} / {pad2(total)}
      </div>
      <div className="lb-caption" id="lb-caption">
        {caption}
      </div>
    </div>
  );
}
