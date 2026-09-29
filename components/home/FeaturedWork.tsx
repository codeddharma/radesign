import Link from "next/link";
import { Media } from "@/components/Media";
import type { Project } from "@/lib/projects";

const RATIOS = ["4/5", "3/4", "4/3", "3/4", "4/5", "3/4"];

// Exclude in-progress projects from the home page for now.
export function FeaturedWork({ projects }: { projects: Array<Project & { featured?: boolean }> }) {
  const featured = projects.filter((p) => p.featured && p.status !== "In progress").slice(0, 6);
  return (
    <section className="section featured-work-section">
      <div className="container">
        <div className="masonry" id="featured">
          {featured.map((project, i) => (
            <Link key={project.slug} href={`/work/${project.slug}`} className="reveal">
              <div className="img-wrap" style={{ aspectRatio: RATIOS[i] }}>
                <Media
                  src={project.cover.src}
                  alt={`${project.title} — ${project.type} · R.A. Design Studio`}
                  fill
                  sizes="(max-width:1100px) 50vw, 33vw"
                  style={{ height: "100%" }}
                />
              </div>
              <div className="meta">
                <div className="ttl">{project.title}</div>
                <span className="project-card-arrow" aria-hidden="true">→</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="featured-work-footer">
          <Link href="/work" className="featured-work-link">
            <span>Explore all projects</span>
            <span className="featured-work-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
