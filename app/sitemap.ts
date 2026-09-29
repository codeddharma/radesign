import type { MetadataRoute } from "next";
import { listPublishedProjects } from "@/lib/admin/projects";
import { absoluteUrl } from "@/lib/site";

/**
 * XML sitemap covering every public route: the static pages plus one entry per
 * project under /work/[slug]. Priorities favour the home and work index.
 *
 * Generated per request, like the pages it lists. Prerendering it would freeze
 * the project list at build time — so a newly published project would be
 * missing until the next deploy — and would require the database to be
 * reachable during `next build`.
 */
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified, changeFrequency: "weekly", priority: 1.0 },
    { url: absoluteUrl("/work"), lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/studio"), lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: absoluteUrl("/contact"), lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];

  const projectPages: MetadataRoute.Sitemap = (await listPublishedProjects()).filter((project) => !project.seo.noIndex).map((project) => ({
    url: absoluteUrl(`/work/${project.slug}`),
    lastModified,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticPages, ...projectPages];
}
