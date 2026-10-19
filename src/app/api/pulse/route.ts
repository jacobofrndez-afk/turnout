import { NextResponse } from "next/server";
import { rateLimit, tooMany } from "@/server/guard";
import { getMerchant } from "@/server/events/radar";
import { createPulseBrief } from "@/server/agent/pulse";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(req, "pulse", 4, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfterS);
  const form = await req.formData();
  const merchant = getMerchant(String(form.get("merchant") ?? ""));
  if (!merchant) return NextResponse.json({ error: "unknown merchant" }, { status: 400 });
  await createPulseBrief(merchant);
  return NextResponse.redirect(new URL(`/pulse?merchant=${merchant.id}`, req.url), 303);
}
