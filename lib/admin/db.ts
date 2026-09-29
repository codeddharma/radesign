import { mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { PROJECTS } from "@/lib/projects";
import { STUDIO } from "@/lib/site";
import { imageDimensions } from "@/lib/admin/validation";

const DB_FILE = path.resolve(process.env.ADMIN_DB_PATH ?? path.join(process.cwd(), "data", "radesign-admin.sqlite"));
let database: DatabaseSync | null = null;

function seedProject(index: number) {
  const project = PROJECTS[index];
  return { ...project, id: `imported-${index + 1}`, workflow: "published", featured: index < 6, seo: { title: project.title, description: project.lede, noIndex: false }, updatedAt: new Date().toISOString() };
}

async function seedMedia() {
  const root = path.join(process.cwd(), "public", "media");
  const files = await readdir(root, { recursive: true, withFileTypes: true });
  const assets = [] as Array<{src:string; filename:string; mime:string; width:number; height:number}>;
  for (const file of files) {
    if (!file.isFile() || !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) continue;
    const relative = path.relative(path.join(process.cwd(), "public"), path.join(file.parentPath, file.name)).split(path.sep).join("/");
    const src = `/${relative}`;
    const mime = file.name.toLowerCase().endsWith(".png") ? "image/png" : file.name.toLowerCase().endsWith(".webp") ? "image/webp" : file.name.toLowerCase().endsWith(".gif") ? "image/gif" : "image/jpeg";
    const bytes = new Uint8Array(await readFile(path.join(file.parentPath, file.name)));
    const dimensions = imageDimensions(bytes, mime) ?? { width: 0, height: 0 };
    assets.push({src,filename:file.name,mime,width:dimensions.width,height:dimensions.height});
  }
  return assets;
}

export async function getDb(): Promise<DatabaseSync> {
  if (database) return database;
  await mkdir(path.dirname(DB_FILE), { recursive: true });
  database = new DatabaseSync(DB_FILE);
  database.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, type TEXT NOT NULL,
      year INTEGER NOT NULL, location TEXT NOT NULL, area TEXT NOT NULL, status TEXT NOT NULL,
      lede TEXT NOT NULL, body_json TEXT NOT NULL, materials_json TEXT NOT NULL, credits_json TEXT NOT NULL,
      cover_json TEXT NOT NULL, gallery_json TEXT NOT NULL, workflow TEXT NOT NULL, featured INTEGER NOT NULL DEFAULT 0,
      seo_json TEXT NOT NULL, updated_at TEXT NOT NULL, published_at TEXT
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY, src TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, mime TEXT NOT NULL,
      width INTEGER NOT NULL, height INTEGER NOT NULL, size INTEGER NOT NULL DEFAULT 0,
      alt TEXT NOT NULL DEFAULT '', credit TEXT NOT NULL DEFAULT '', state TEXT NOT NULL DEFAULT 'ready',
      archived INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS enquiries (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, project_type TEXT NOT NULL,
      location TEXT NOT NULL, message TEXT NOT NULL, source TEXT NOT NULL, consent_at TEXT NOT NULL,
      status TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  const count = database.prepare("SELECT COUNT(*) AS count FROM projects").get() as { count: number };
  if (count.count === 0) {
    const insert = database.prepare(`INSERT INTO projects (id,slug,title,type,year,location,area,status,lede,body_json,materials_json,credits_json,cover_json,gallery_json,workflow,featured,seo_json,updated_at,published_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (let i = 0; i < PROJECTS.length; i++) { const p = seedProject(i); insert.run(p.id,p.slug,p.title,p.type,p.year,p.location,p.area,p.status,p.lede,JSON.stringify(p.body),JSON.stringify(p.materials),JSON.stringify(p.credits),JSON.stringify(p.cover),JSON.stringify(p.gallery),p.workflow,p.featured?1:0,JSON.stringify(p.seo),p.updatedAt,null); }
    const mediaInsert = database.prepare("INSERT OR IGNORE INTO media (id,src,filename,mime,width,height,size,alt,credit,state,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
    for (const asset of await seedMedia()) mediaInsert.run(`asset-${asset.src.replace(/[^a-z0-9]/gi, "-")}`,asset.src,asset.filename,asset.mime,asset.width,asset.height,0,"","","ready",new Date().toISOString());
    const settings = { siteName: STUDIO.name, legalName: STUDIO.legalName, description: "R.A. Design Studio is an architecture, interiors, landscape & planning practice in Ahmedabad.", foundingYear: STUDIO.foundingDate, email: STUDIO.email, phones: STUDIO.phones, addressLines: [STUDIO.street, `${STUDIO.locality}, ${STUDIO.region} ${STUDIO.postalCode}.`], city: STUDIO.locality, instagram: STUDIO.instagram, heroTitle: "Quiet architecture.", heroEmphasis: "Measured in light.", heroBasedIn: STUDIO.locality, footerHeadline: "Let’s build something lasting." };
    database.prepare("INSERT OR REPLACE INTO settings (key,value_json,updated_at) VALUES (?,?,?)").run("site",JSON.stringify(settings),new Date().toISOString());
  }
  // The imported portfolio was the already-live legacy site. Publish that one-time
  // import so enforcing draft privacy does not make the public Work page empty.
  database.prepare("UPDATE projects SET workflow='published', published_at=COALESCE(published_at, ?), updated_at=? WHERE id LIKE 'imported-%' AND workflow='needs-review'").run(new Date().toISOString(), new Date().toISOString());
  return database;
}

export function json<T>(value: string): T { return JSON.parse(value) as T; }
