import { NextResponse } from "next/server";
import { getDb } from "@/server/db/client";
import { getMerchant } from "@/server/events/radar";
import { rateLimit, tooMany } from "@/server/guard";

export const dynamic = "force-dynamic";

// The merchant widens or narrows the radius watched by the radar (300 m to 5 km).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(req, "radius", 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfterS);
  const { id } = await params;
  if (!getMerchant(id)) return NextResponse.json({ error: "unknown merchant" }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as { radius_m?: number };
  const r = Math.round(Number(body.radius_m) / 100) * 100;
  if (!Number.isFinite(r)) return NextResponse.json({ error: "radius_m must be a number" }, { status: 400 });
  const radius = Math.min(5000, Math.max(300, r));
  getDb().prepare("UPDATE merchants SET radius_m = ? WHERE id = ?").run(radius, id);
  return NextResponse.json({ ok: true, radius_m: radius });
}
