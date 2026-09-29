import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import "../admin.css";
import { adminCookieName, adminEmail, createAdminSession, credentialsMatch, isAdminAuthenticated } from "@/lib/admin/auth";

// Throttle repeated failures per IP. In-memory is enough for a single-node
// deployment and mirrors the limiter already used by the contact endpoint.
const failures = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60_000;

async function login(formData: FormData) {
  "use server";
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();
  const seen = failures.get(ip);
  const active = seen && seen.until > now ? seen : undefined;
  if (active && active.count >= MAX_ATTEMPTS) redirect("/admin/login?error=rate");

  if (!(await credentialsMatch(String(formData.get("email") ?? ""), String(formData.get("password") ?? "")))) {
    failures.set(ip, { count: (active?.count ?? 0) + 1, until: now + LOCKOUT_MS });
    redirect("/admin/login?error=1");
  }
  failures.delete(ip);

  const session = await createAdminSession();
  (await cookies()).set(adminCookieName, session.value, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production",
    maxAge: session.maxAge, path: "/",
  });
  redirect("/admin");
}

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdminAuthenticated()) redirect("/admin");
  const { error } = await searchParams;
  return <main className="admin-shell admin-login">
    <p className="admin-kicker">R.A. Design Studio / Admin</p>
    <h1>Sign in</h1>
    {error === "rate" && <p role="alert">Too many failed attempts. Try again in 15 minutes.</p>}
    {error === "1" && <p role="alert">Email or password not recognised.</p>}
    <form action={login}>
      <label htmlFor="email">Administrator email</label>
      <input id="email" name="email" type="email" required autoComplete="username" defaultValue={adminEmail()} />
      <label htmlFor="password">Administrator password</label>
      <input id="password" name="password" type="password" required autoComplete="current-password" />
      <button type="submit">Enter admin</button>
    </form>
  </main>;
}
