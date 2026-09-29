import type { Metadata } from "next";
import { WorkGrid } from "@/components/work/WorkGrid";
import { absoluteUrl } from "@/lib/site";
import { listPublishedProjects } from "@/lib/admin/projects";

export const dynamic = "force-dynamic";

const DESCRIPTION =
  "Curated architecture, interior, landscape and planning works by R.A. Design Studio in Ahmedabad.";

export const metadata: Metadata = {
  title: "Work",
  description: DESCRIPTION,
  alternates: { canonical: "/work" },
  openGraph: {
    title: "Work",
    description: DESCRIPTION,
    url: absoluteUrl("/work"),
    type: "website",
  },
};

/** /work — project index with interactive filters and masonry grid. */
export default async function WorkPage() {
  const projects = await listPublishedProjects();
  return <WorkGrid projects={projects} />;
}
