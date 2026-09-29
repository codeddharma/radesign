"use client";

import { useState, type ReactNode } from "react";
import type { Img } from "@/lib/projects";
import { HeroCollage } from "./HeroCollage";
import { Lightbox } from "./Lightbox";

interface ProjectGalleryClientProps {
  /** The project's real photo gallery, in source order. */
  photos: Img[];
  /** Project title — used for the lightbox caption fallback. */
  title: string;
  /** Server-rendered project details shown before the visual gallery. */
  children: ReactNode;
}

/**
 * Client shell for the project detail page. The project details lead, followed
 * by one curated hero collage. The shared lightbox keeps the full gallery
 * available without repeating the same images in a second grid.
 */
export function ProjectGalleryClient({
  photos,
  title,
  children,
}: ProjectGalleryClientProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  return (
    <>
      {children}

      <HeroCollage photos={photos} title={title} onTileClick={setLightboxIndex} />

      <Lightbox
        photos={photos}
        index={lightboxIndex}
        titleForFallback={title}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}
