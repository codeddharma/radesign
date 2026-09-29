import { MongoClient, type Db } from "mongodb";

const URI = process.env.MONGODB_URI ?? "";
const DB_NAME = process.env.MONGODB_DB ?? "radesign";

// One client — and therefore one connection pool — shared across every request
// and across dev hot reloads. Atlas M0 caps total connections, so a fresh pool
// per module instance would exhaust the tier quickly.
const globalForMongo = globalThis as typeof globalThis & { __radesignDb?: Promise<Db> };

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("projects").createIndex({ slug: 1 }, { unique: true }),
    db.collection("projects").createIndex({ workflow: 1 }),
    db.collection("media").createIndex({ publicId: 1 }, { unique: true, sparse: true }),
    db.collection("media").createIndex({ createdAt: -1 }),
    db.collection("enquiries").createIndex({ createdAt: -1 }),
    // Admin sessions expire themselves; see lib/admin/auth.ts.
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

async function connect(): Promise<Db> {
  if (!URI) throw new Error("MONGODB_URI is not set. Copy .env.example to .env.local and fill it in.");
  const client = new MongoClient(URI, { maxPoolSize: 10 });
  await client.connect();
  const db = client.db(DB_NAME);
  await ensureIndexes(db);
  return db;
}

export function getDb(): Promise<Db> {
  if (!globalForMongo.__radesignDb) {
    globalForMongo.__radesignDb = connect().catch((error: unknown) => {
      // Never cache a failed connection, or one Atlas blip would leave the
      // process permanently broken until it is restarted.
      globalForMongo.__radesignDb = undefined;
      throw error;
    });
  }
  return globalForMongo.__radesignDb;
}

export async function recordAudit(action: string, entity: string, entityId: string) {
  const db = await getDb();
  await db.collection("audit_log").insertOne({ action, entity, entityId, createdAt: new Date().toISOString() });
}
