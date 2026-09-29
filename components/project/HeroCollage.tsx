"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Media } from "@/components/Media";
import type { Img } from "@/lib/projects";
import { buildJustifiedRows } from "./spans";

const GAP = 6;

/** Layout effect before paint in the browser; plain effect under SSR. */
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface HeroCollageProps {
  photos: Img[];
  title: string;
  onTileClick: (photoIndex: number) => void;
}

/** Target row height scales down on smaller viewports. */
function targetRowHeight(width: number): number {
  if (width < 560) return 190;
  if (width < 900) return 230;
  return 300;
}

/**
 * Hero collage — every project photo shown EXACTLY ONCE in justified, gap-free
 * rows (Flickr-style). Each tile's box matches its photo's true aspect ratio, so
 * NOTHING is cropped. Tiles open the lightbox.
 */
export function HeroCollage({ photos, title, onTileClick }: HeroCollageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const cs = getComputedStyle(el);
    const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    setWidth(el.clientWidth - padX);
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = width > 0 ? buildJustifiedRows(photos, width, targetRowHeight(width), GAP) : [];

  return (
    <div className="proj-hero-collage" ref={ref} style={{ gap: `${GAP}px` }}>
      {rows.map((row, ri) => (
        <div className="hero-row" key={ri} style={{ height: `${row.height}px`, gap: `${GAP}px` }}>
          {row.items.map((item) => {
            const photo = photos[item.index];
            const alt = `${title} — R.A. Design Studio, image ${item.index + 1}`;
            return (
              <button
                key={item.index}
                type="button"
                className="tile"
                style={{ width: `${item.width}px`, animationDelay: `${item.index * 0.04}s` }}
                onClick={() => onTileClick(item.index)}
                aria-label={`View ${alt}`}
              >
                <Media fill src={photo.src} alt={alt} sizes={`${Math.ceil(item.width)}px`} />
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
