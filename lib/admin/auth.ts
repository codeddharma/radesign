import { cookies } from "next/headers";
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getDb } from "@/lib/admin/mongo";

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

const COOKIE = "ra_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 8;

type SessionDoc = { _id: string; createdAt: Date; expiresAt: Date };

export const adminCookieName = COOKIE;
export function adminEmail() { return process.env.ADMIN_EMAIL ?? ""; }

const sessionSecret = () => process.env.ADMIN_SESSION_SECRET ?? "";
const passwordHash = () => process.env.ADMIN_PASSWORD_HASH ?? "";

export function isAdminPasswordConfigured() {
  return passwordHash().startsWith("scrypt:") && sessionSecret().length >= 32;
}

/**
 * The password is stored only as `scrypt:<saltHex>:<keyHex>` — generate it with
 * `npm run admin:hash`. It is never held in plaintext in the environment.
 */
export async function verifyPassword(plain: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = passwordHash().split(":");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(plain, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function credentialsMatch(email: string, password: string) {
  // Both checks always run, so a wrong email and a wrong password take the same
  // time and neither can be distinguished from the outside.
  const emailMatches = email.trim().toLowerCase() === adminEmail().trim().toLowerCase();
  const passwordMatches = await verifyPassword(password);
  return emailMatches && passwordMatches;
}

const sign = (payload: string) => createHmac("sha256", sessionSecret()).update(payload).digest("hex");

async function sessions() {
  return (await getDb()).collection<SessionDoc>("sessions");
}

/**
 * Mints a session the server can revoke. The cookie carries `id.expiry.hmac`;
 * the id is a row in Mongo with a TTL index, so expiry is enforced server-side
 * and logout genuinely invalidates rather than just clearing the browser.
 */
export async function createAdminSession() {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE_SECONDS * 1000);
  await (await sessions()).insertOne({ _id: id, createdAt: new Date(), expiresAt });
  const payload = `${id}.${expiresAt.getTime()}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: MAX_AGE_SECONDS };
}

export async function destroyAdminSession(token: string | undefined) {
  const id = token?.split(".")[0];
  if (!id) return;
  await (await sessions()).deleteOne({ _id: id });
}

export async function verifyAdminToken(token: string | undefined): Promise<boolean> {
  if (!token || sessionSecret().length < 32) return false;
  const [id, expiry, mac] = token.split(".");
  if (!id || !expiry || !mac) return false;
  if (!Number(expiry) || Number(expiry) < Date.now()) return false;
  const expected = Buffer.from(sign(`${id}.${expiry}`), "hex");
  const given = Buffer.from(mac, "hex");
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  // The signature proves we issued the cookie; the row proves it has not since
  // been revoked by a logout.
  return Boolean(await (await sessions()).findOne({ _id: id }));
}

export async function isAdminAuthenticated() {
  return verifyAdminToken((await cookies()).get(COOKIE)?.value);
}
