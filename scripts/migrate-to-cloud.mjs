/**
 * One-off migration: SQLite + public/media  ->  MongoDB + Cloudinary.
 *
 *   node --env-file=.env.local scripts/migrate-to-cloud.mjs --dry-run
 *   node --env-file=.env.local scripts/migrate-to-cloud.mjs
 *
 * Idempotent: Cloudinary public ids are derived from the file path and existing
 * assets are skipped, Mongo writes are upserts. Safe to re-run after a failure.
 *
 * --dry-run uploads nothing and writes nothing. It still walks every record and
 * reports any Img.src it could not map, which is the check worth trusting
 * before spending credits.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { MongoClient } from "mongodb";
import { v2 as cloudinary } from "cloudinary";

const DRY = process.argv.includes("--dry-run");
const SQLITE = path.resolve(process.env.ADMIN_DB_PATH ?? "data/radesign-admin.sqlite");
const PUBLIC = path.resolve("public");
const MEDIA = path.join(PUBLIC, "media");

// Must stay identical to INGEST in lib/admin/cloudinary.ts so migrated assets
// and future uploads are processed the same way.
const INGEST = [{ width: 2560, height: 2560, crop: "limit", quality: "auto:good" }];

const log = (...a) => console.log(...a);
const fail = (m) => { console.error(`\n  ERROR  ${m}\n`); process.exit(1); };

function requireEnv(...keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) fail(`Missing environment variables: ${missing.join(", ")}\nRun with: node --env-file=.env.local scripts/migrate-to-cloud.mjs`);
}

/** "/media/projects/1/01.jpg" -> "radesign/projects/1/01" */
const publicIdFor = (src) => `radesign/${src.replace(/^\/media\//, "").replace(/\.[^.]+$/, "")}`;

async function listLocalImages() {
  const entries = await readdir(MEDIA, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.(jpe?g|png|webp|gif)$/i.test(e.name))
    .map((e) => "/" + path.relative(PUBLIC, path.join(e.parentPath, e.name)).split(path.sep).join("/"));
}

async function uploadOne(src) {
  const publicId = publicIdFor(src);
  if (DRY) return { publicId, src: `https://res.cloudinary.com/DRY-RUN/${publicId}`, width: 0, height: 0, format: "dry", bytes: 0 };
  // Skip assets already uploaded, so re-running costs no extra transformations.
  try {
    const existing = await cloudinary.api.resource(publicId, { resource_type: "image" });
    return { publicId, src: existing.secure_url, width: existing.width, height: existing.height, format: existing.format, bytes: existing.bytes, skipped: true };
  } catch (error) {
    if (error?.error?.http_code !== 404 && error?.http_code !== 404) throw error;
  }
  const bytes = await readFile(path.join(PUBLIC, src));
  const r = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { public_id: publicId, overwrite: false, resource_type: "image", transformation: INGEST },
      (err, res) => (err || !res ? reject(err ?? new Error("no response")) : resolve(res)),
    );
    stream.end(bytes);
  });
  return { publicId, src: r.secure_url, width: r.width, height: r.height, format: r.format, bytes: r.bytes };
}

/** Rewrites one Img in place. Returns false if its src has no Cloudinary counterpart. */
function remap(img, map, unmapped, where) {
  if (!img || typeof img !== "object" || !img.src) return true;
  if (/^https?:\/\//.test(img.src)) return true;            // already migrated
  const hit = map.get(img.src);
  if (!hit) { unmapped.push(`${where} -> ${img.src}`); return false; }
  img.src = hit.src;
  img.publicId = hit.publicId;
  if (hit.width) { img.w = hit.width; img.h = hit.height; }
  return true;
}

async function main() {
  // A dry run touches neither service, so it can validate coverage before any
  // credentials exist.
  if (!DRY) requireEnv("MONGODB_URI", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  log(`\n${DRY ? "DRY RUN — nothing will be uploaded or written" : "LIVE RUN"}`);
  log(`SQLite : ${SQLITE}`);
  log(`Media  : ${MEDIA}\n`);

  const db = new DatabaseSync(SQLITE, { readOnly: true });
  const rows = (t) => db.prepare(`SELECT * FROM ${t}`).all();

  // 1. Upload every local image, keyed by its public path.
  const files = await listLocalImages();
  const byPublicId = new Map();
  for (const src of files) {
    const id = publicIdFor(src);
    if (byPublicId.has(id)) fail(`Two files collapse to the same Cloudinary public id "${id}":\n  ${byPublicId.get(id)}\n  ${src}\nRename one before migrating.`);
    byPublicId.set(id, src);
  }
  log(`Uploading ${files.length} images…`);
  const map = new Map();
  let done = 0, skipped = 0;
  for (const src of files) {
    const r = await uploadOne(src);
    if (r.skipped) skipped++;
    map.set(src, r);
    if (++done % 20 === 0 || done === files.length) log(`  ${done}/${files.length}`);
  }
  log(`Uploaded ${done - skipped}, already present ${skipped}.\n`);

  // 2. Rewrite every record, collecting anything that could not be mapped.
  const unmapped = [];
  const sqliteMedia = rows("media");
  const bySrc = new Map(sqliteMedia.map((m) => [m.src, m]));
  const now = new Date().toISOString();

  const mediaDocs = files.map((src) => {
    const up = map.get(src), meta = bySrc.get(src);
    return {
      _id: meta?.id ?? `asset-${src.replace(/[^a-z0-9]/gi, "-")}`,
      publicId: up.publicId, src: up.src, filename: meta?.filename ?? path.basename(src),
      mime: meta?.mime ?? `image/${up.format === "jpg" ? "jpeg" : up.format}`,
      width: up.width || meta?.width || 0, height: up.height || meta?.height || 0,
      size: up.bytes || meta?.size || 0, alt: meta?.alt ?? "", credit: meta?.credit ?? "",
      state: "ready", archived: Boolean(meta?.archived), createdAt: meta?.created_at ?? now,
    };
  });

  const projectDocs = rows("projects").map((p) => {
    const doc = {
      _id: p.id, slug: p.slug, title: p.title, type: p.type, year: p.year, location: p.location,
      area: p.area, status: p.status, lede: p.lede, body: JSON.parse(p.body_json),
      materials: JSON.parse(p.materials_json), credits: JSON.parse(p.credits_json),
      cover: JSON.parse(p.cover_json), gallery: JSON.parse(p.gallery_json),
      workflow: p.workflow, featured: Boolean(p.featured), seo: JSON.parse(p.seo_json),
      updatedAt: p.updated_at,
    };
    if (p.published_at) doc.publishedAt = p.published_at;
    remap(doc.cover, map, unmapped, `project ${p.slug}.cover`);
    doc.gallery.forEach((img, i) => remap(img, map, unmapped, `project ${p.slug}.gallery[${i}]`));
    return doc;
  });

  const settingsRow = db.prepare("SELECT value_json FROM settings WHERE key='site'").get();
  const settings = settingsRow ? JSON.parse(settingsRow.value_json) : null;
  if (settings) {
    // Every image-bearing field in AdminSettings. pressPage.logos is publication
    // names, not images, and is deliberately left alone.
    (settings.heroImages ?? []).forEach((img, i) => remap(img, map, unmapped, `settings.heroImages[${i}]`));
    (settings.studioPage?.founders ?? []).forEach((f, i) => remap(f.image, map, unmapped, `settings.studioPage.founders[${i}].image`));
    (settings.studioPage?.team ?? []).forEach((t, i) => remap(t.image, map, unmapped, `settings.studioPage.team[${i}].image`));
    remap(settings.careersPage?.heroImage, map, unmapped, "settings.careersPage.heroImage");
  }

  const enquiryDocs = rows("enquiries").map((e) => ({
    _id: e.id, name: e.name, email: e.email, projectType: e.project_type, location: e.location,
    message: e.message, source: e.source, consentAt: e.consent_at, status: e.status, createdAt: e.created_at,
  }));
  const auditDocs = rows("audit_log").map((a) => ({
    action: a.action, entity: a.entity, entityId: a.entity_id, createdAt: a.created_at,
  }));
  db.close();

  log(`projects ${projectDocs.length}   media ${mediaDocs.length}   settings ${settings ? 1 : 0}   enquiries ${enquiryDocs.length}   audit ${auditDocs.length}`);

  if (unmapped.length) {
    fail(`${unmapped.length} image reference(s) have no Cloudinary counterpart. Nothing was written.\n` +
         unmapped.map((u) => `  - ${u}`).join("\n"));
  }
  log("All image references mapped.\n");

  if (DRY) { log("Dry run complete — nothing written.\n"); return; }

  // 3. Write to Mongo. Upserts, so a re-run converges rather than duplicating.
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const mongo = client.db(process.env.MONGODB_DB ?? "radesign");
  const upsert = async (name, docs) => {
    if (!docs.length) return;
    await mongo.collection(name).bulkWrite(docs.map((d) => ({
      replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true },
    })));
    log(`  ${name}: ${docs.length}`);
  };
  log("Writing to MongoDB…");
  await upsert("projects", projectDocs);
  await upsert("media", mediaDocs);
  await upsert("enquiries", enquiryDocs);
  if (settings) {
    await mongo.collection("settings").updateOne({ _id: "site" }, { $set: { value: settings, updatedAt: now } }, { upsert: true });
    log("  settings: 1");
  }
  if (auditDocs.length) { await mongo.collection("audit_log").insertMany(auditDocs); log(`  audit_log: ${auditDocs.length}`); }
  await client.close();
  log("\nMigration complete.\n");
}

main().catch((e) => fail(e?.message ?? String(e)));
