import { Hero } from "@/components/home/Hero";
import { FeaturedWork } from "@/components/home/FeaturedWork";
import { listPublishedProjects } from "@/lib/admin/projects";
import { getPublicSettings as getAdminSettings } from "@/lib/admin/settings";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const projects = await listPublishedProjects();
  const settings = await getAdminSettings();
  return (
    <>
      <Hero settings={settings} />
      <FeaturedWork projects={projects} />
    </>
  );
}
