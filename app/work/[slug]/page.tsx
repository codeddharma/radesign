import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Media } from "@/components/Media";
import type { Project } from "@/lib/projects";
import { listPublishedProjects } from "@/lib/admin/projects";
import { ProjectGalleryClient } from "@/components/project/ProjectGalleryClient";
import { TitleWithEmphasis } from "@/components/project/TitleWithEmphasis";
import { SITE_NAME, absoluteUrl } from "@/lib/site";

interface ProjectPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = "force-dynamic";

/** Pre-render every project at build time. */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return (await listPublishedProjects()).map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = (await listPublishedProjects()).find((item) => item.slug === slug);

  if (!project) {
    return {
      title: "Project not found",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `/work/${project.slug}`;
  const coverUrl = absoluteUrl(project.cover.src);

  return {
    title: project.seo.title || project.title,
    description: project.seo.description || project.lede,
    robots: project.seo.noIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: project.seo.title || project.title,
      description: project.seo.description || project.lede,
      url: absoluteUrl(canonical),
      images: [
        {
          url: coverUrl,
          width: project.cover.w,
          height: project.cover.h,
          alt: project.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: project.seo.title || project.title,
      description: project.seo.description || project.lede,
      images: [coverUrl],
    },
  };
}

/** Per-project CreativeWork structured data. */
function buildProjectJsonLd(project: Project): Record<string, unknown> {
  const url = absoluteUrl(`/work/${project.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    about: project.type,
    locationCreated: { "@type": "Place", name: "Ahmedabad" },
    contentLocation: { "@type": "Place", name: "Ahmedabad" },
    image: absoluteUrl(project.cover.src),
    creator: { "@type": "Organization", name: SITE_NAME, url: absoluteUrl("/") },
    dateCreated: String(project.year),
    description: project.lede,
    url,
  };
}

/** Up to three other projects of the same type. */
async function getRelated(project: Project): Promise<Project[]> {
  return (await listPublishedProjects()).filter(
    (p) => p.slug !== project.slug && p.type === project.type,
  ).slice(0, 3);
}

/** Key/value rows for the meta grid, omitting any empty fields. */
function buildMeta(project: Project): { k: string; v: string }[] {
  const { credits } = project;
  const rows: { k: string; v: string }[] = [
    { k: "Year", v: String(project.year) },
    { k: "Type", v: project.type },
  ];
  if (project.area && project.area !== "—") rows.push({ k: "Area", v: project.area });
  rows.push({ k: "Location", v: project.location });
  rows.push({ k: "Status", v: project.status });
  rows.push({ k: "Lead", v: credits.lead });
  if (credits.team) rows.push({ k: "Team", v: credits.team });
  if (credits.landscape) rows.push({ k: "Landscape", v: credits.landscape });
  if (credits.photo) rows.push({ k: "Photo", v: credits.photo });
  return rows;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = (await listPublishedProjects()).find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  const meta = buildMeta(project);
  const related = await getRelated(project);

  const projects = await listPublishedProjects();
  const currentIndex = projects.findIndex((p) => p.slug === project.slug);
  const next = projects[(currentIndex + 1) % projects.length] ?? project;
  const jsonLd = buildProjectJsonLd(project);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProjectGalleryClient photos={project.gallery} title={project.title}>
        {/* TITLE & META */}
        <section className="proj-caption">
          <div className="t">
            <div className="label mb-s">{project.type}</div>
            <h1>
              {project.title}
            </h1>
          </div>
          <div className="meta-grid">
            {meta.map((m) => (
              <div key={m.k}>
                <div className="k">{m.k}</div>
                <div className="v">{m.v}</div>
              </div>
            ))}
          </div>
        </section>

        {/* LEDE & BODY */}
        <section className="proj-body">
          <p className="lede-lg reveal">{project.lede}</p>
          <div className="proj-body-copy">
            {project.body.map((paragraph, i) => (
              <p key={i} className="reveal">
                {paragraph}
              </p>
            ))}
          </div>
          {project.materials.length > 0 && (
            <div className="proj-body-copy">
              <p className="reveal">
                Built with {project.materials.join(", ")}. Project lead:{" "}
                <strong style={{ color: "var(--ink)", fontWeight: 500 }}>
                  {project.credits.lead}
                </strong>
                .
              </p>
            </div>
          )}
        </section>
      </ProjectGalleryClient>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="related">
          <div className="related-kicker label">Continue exploring</div>
          <div className="related-head">
            <h3>
              Related <em className="em-serif">work</em>
            </h3>
            <Link
              href="/work"
              className="related-all"
            >
              View all projects →
            </Link>
          </div>
          <div className="related-grid">
            {related.map((r) => (
              <Link key={r.slug} href={`/work/${r.slug}`}>
                <div className="img-wrap">
                  <Media
                    fill
                    src={r.cover.src}
                    alt={r.title}
                    sizes="(max-width:720px) 100vw, 33vw"
                    style={{ height: "100%" }}
                  />
                </div>
                <div className="ttl">{r.title}</div>
                <div className="sub">
                  {r.location} · {r.year}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* NEXT PROJECT (luxe transition) */}
      <Link className="next-proj-luxe" href={`/work/${next.slug}`}>
        <div>
          <div className="label">Next project</div>
          <div className="title">
            <TitleWithEmphasis title={next.title} />
          </div>
          <div className="sub">
            {next.type} · {next.location} · {next.year}
          </div>
        </div>
        <div className="preview">
          <Media
            fill
            src={next.cover.src}
            alt={next.title}
            sizes="(max-width:720px) 100vw, 40vw"
            style={{ height: "100%" }}
          />
        </div>
        <div className="arr">→</div>
      </Link>
    </>
  );
}
