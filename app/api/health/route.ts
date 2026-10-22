import { NextResponse } from "next/server";
import { getDb } from "@/lib/admin/mongo";

/**
 * Liveness probe for the deploy script, the panel's monitor and any uptime
 * check. Deliberately unauthenticated so a monitor can reach it, and
 * deliberately silent about detail for the same reason.
 *
 * It pings MongoDB rather than just returning ok, because the failure worth
 * catching is the one where Node is healthy but Atlas is unreachable — a
 * static {"ok":true} would report success while every page 500s. The usual
 * cause is the server's public IP dropping out of the Atlas allowlist.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE = { "cache-control": "no-store, max-age=0" };

export async function GET() {
  const started = Date.now();
  try {
    // ping is the cheapest round-trip that proves the pool is actually usable;
    // it touches no collection and reads no data.
    await (await getDb()).command({ ping: 1 });
    return NextResponse.json(
      { status: "ok", database: "up", ms: Date.now() - started },
      { status: 200, headers: NO_STORE },
    );
  } catch (error) {
    // The driver's message embeds the cluster host and user, so it is logged
    // for the operator and never returned to an anonymous caller.
    console.error("Health check failed", error);
    return NextResponse.json(
      { status: "error", database: "down", ms: Date.now() - started },
      { status: 503, headers: NO_STORE },
    );
  }
}
