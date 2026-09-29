"use client";

import Image from "next/image";
import { useState, type CSSProperties } from "react";

interface MediaProps {
  src: string;
  alt: string;
  /** Intrinsic dimensions — required unless `fill` is set. */
  width?: number;
  height?: number;
  /** Cover-fill a sized parent box instead of using intrinsic dimensions. */
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  /** Extra classes on the wrapper (e.g. for hover behaviour). */
  className?: string;
  style?: CSSProperties;
}

/**
 * Image with a built-in shimmer skeleton loader and a smooth fade + scale-in
 * once it decodes. Wraps next/image so real photos get responsive, optimized
 * variants and zero layout shift (intrinsic width/height, or `fill` in a
 * sized box). Used everywhere real client photos appear.
 */
export function Media({
  src,
  alt,
  width,
  height,
  fill = false,
  sizes = "100vw",
  priority = false,
  className = "",
  style,
}: MediaProps) {
  const [loaded, setLoaded] = useState(false);

  // In `fill` mode the caller sizes the box (via `style` aspect-ratio/height or
  // a sized parent); in natural mode width/height drive the intrinsic ratio.
  return (
    <div className={`media${loaded ? " is-loaded" : ""}${className ? ` ${className}` : ""}`} style={style}>
      <span className="media-skel" aria-hidden="true" />
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          style={{ objectFit: "cover" }}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          onLoad={() => setLoaded(true)}
          style={{ width: "100%", height: "auto", display: "block" }}
        />
      )}
    </div>
  );
}
