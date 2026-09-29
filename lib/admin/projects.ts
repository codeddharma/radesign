import { cache } from "react";
import type { AdminProject, ProjectInput } from "@/lib/admin/types";
import { getDb, recordAudit } from "@/lib/admin/mongo";

/** Stored shape: the admin model with its string id under Mongo's `_id`. */
type ProjectDoc = Omit<AdminProject, "id"> & { _id: string };

const map = ({ _id, ...rest }: ProjectDoc): AdminProject => ({ id: _id, ...rest });

// Featured first, then alphabetical — the ordering the public pages expect.
const ORDER = { featured: -1, title: 1 } as const;

async function collection() {
  return (await getDb()).collection<ProjectDoc>("projects");
}

/** Editable fields only; workflow and timestamps are managed separately. */
function fields(input: ProjectInput) {
  return {
    slug: input.slug, title: input.title, type: input.type, year: input.year,
    location: input.location, area: input.area, status: input.status, lede: input.lede,
    body: input.body, materials: input.materials, credits: input.credits,
    cover: input.cover, gallery: input.gallery, featured: input.featured, seo: input.seo,
  };
}

export async function listAdminProjects(): Promise<AdminProject[]> {
  return (await (await collection()).find().sort(ORDER).toArray()).map(map);
}

/**
 * Public pages may only render projects which an administrator has published.
 * Wrapped in `cache()` so the several calls made while rendering one page
 * become a single round-trip to Atlas.
 */
export const listPublishedProjects = cache(async (): Promise<AdminProject[]> =>
  (await (await collection()).find({ workflow: "published" }).sort(ORDER).toArray()).map(map));

export async function getAdminProject(id: string): Promise<AdminProject | undefined> {
  const doc = await (await collection()).findOne({ _id: id });
  return doc ? map(doc) : undefined;
}

export async function createAdminProject(input: ProjectInput) {
  const id = `local-${crypto.randomUUID()}`;
  await (await collection()).insertOne({
    _id: id, ...fields(input), workflow: "draft", updatedAt: new Date().toISOString(),
  });
  await recordAudit("create", "project", id);
  return getAdminProject(id);
}

export async function updateAdminProject(id: string, input: ProjectInput, workflow?: AdminProject["workflow"]) {
  const current = await getAdminProject(id);
  if (!current) return undefined;
  const now = new Date().toISOString();
  const nextWorkflow = workflow ?? current.workflow;
  const publishedAt = nextWorkflow === "published" ? now : current.publishedAt;
  // publishedAt is left absent rather than null while a project has never been
  // published, so the optional field in AdminProject stays honest.
  await (await collection()).updateOne({ _id: id }, {
    $set: { ...fields(input), workflow: nextWorkflow, updatedAt: now, ...(publishedAt ? { publishedAt } : {}) },
  });
  await recordAudit(nextWorkflow === "published" ? "publish" : "update", "project", id);
  return getAdminProject(id);
}

export async function archiveAdminProject(id: string) {
  await (await collection()).updateOne({ _id: id }, {
    $set: { workflow: "archived", updatedAt: new Date().toISOString() },
  });
  await recordAudit("archive", "project", id);
  return getAdminProject(id);
}
