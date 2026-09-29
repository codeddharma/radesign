"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Media } from "@/components/Media";
import type { Project, ProjectCategory } from "@/lib/projects";

/**
 * Varied aspect ratios cycled across the masonry cards so the grid stays
 * lively rather than a uniform rectangle wall. Indexed by position in the
 * filtered list.
 */
const RATIOS = [
  "4/5",
  "3/4",
  "4/3",
  "3/4",
  "4/5",
  "1/1",
  "3/4",
  "4/5",
  "4/3",
  "3/4",
];

/**
 * The client-facing taxonomy is intentionally fixed. Project typologies such
 * as apartments and farmhouses are represented within one of these four
 * disciplines rather than becoming filters of their own.
 */
const FILTERS: Array<"All" | ProjectCategory> = [
  "All",
  "Architecture",
  "Interior",
  "Landscape",
  "Planning",
];

/**
 * Some projects span more than one discipline. Keeping the memberships keyed
 * by the stable project slug lets each card appear once in All while remaining
 * discoverable in every relevant discipline.
 */
const PROJECT_CATEGORIES: Record<string, ProjectCategory[]> = {
  "habitat-0": ["Architecture"],
  "karnav-farmhouse": ["Architecture"],
  "roseate-roots": ["Architecture", "Landscape", "Planning"],
  "shades-of-nature": ["Architecture", "Landscape", "Planning"],
  "saanvi-nirman": ["Architecture", "Landscape"],
  "farmhouse-at-shilpgram": ["Interior", "Landscape"],
  "swati-parkside-apartment": ["Interior"],
  "seasons-apartment": ["Interior"],
  "hillview-resort": ["Landscape"],
  "corporate-office-landscape": ["Landscape"],
};

function matches(project: Project, filter: string): boolean {
  if (filter === "All") return true;
  const categories = PROJECT_CATEGORIES[project.slug] ?? [project.type];
  return categories.includes(filter as ProjectCategory);
}

const COVER_SIZES = "(max-width:640px) 100vw, (max-width:1100px) 50vw, 33vw";

/**
 * Client island for the /work page: the filter bar plus the masonry grid of
 * real project cover photos. Rendered by app/work/page.tsx.
 */
export function WorkGrid({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState("All");
  const gridRef = useRef<HTMLDivElement>(null);
  const list = projects.filter((project) => matches(project, filter));

  // Cards carry the global `reveal` animation, but the shared
  // IntersectionObserver only tracks elements present at first mount. After
  // filtering — especially returning to "All" — newly mounted cards would stay
  // hidden (opacity:0), which looked like an empty category. Reveal the current
  // cards whenever the filtered list changes.
  useEffect(() => {
    gridRef.current?.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  }, [filter]);

  return (
    <>
      <section className="work-filter-section" aria-label="Filter projects by discipline">
        <div className="container">
          <div className="filter-bar" id="filters" role="tablist" aria-label="Project disciplines">
            {FILTERS.map((f) => (
              <button
                key={f}
                data-f={f}
                role="tab"
                aria-selected={f === filter}
                className={f === filter ? "active" : undefined}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="section tight" style={{ paddingTop: "20px" }}>
        <div className="container">
          <div className="masonry" id="gallery" ref={gridRef}>
            {list.map((p, i) => (
              <Link key={p.slug} href={`/work/${p.slug}`} className="reveal">
                <div
                  className="img-wrap"
                  style={{ aspectRatio: RATIOS[i % RATIOS.length] }}
                >
                  <Media
                    fill
                    src={p.cover.src}
                    alt={`${p.title} — ${p.type} in ${p.location} · R.A. Design Studio`}
                    sizes={COVER_SIZES}
                    style={{ height: "100%" }}
                  />
                </div>
                <div className="meta">
                  <div className="ttl">{p.title}</div>
                  <span className="project-card-arrow" aria-hidden="true">→</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
