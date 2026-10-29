import { NextResponse } from "next/server";
import { rateLimit, tooMany, sameOrigin } from "@/server/guard";
import { getMerchant } from "@/server/events/radar";
import { scanMerchant } from "@/server/agent/scan";

export const dynamic = "force-dynamic";

// "Run the scan now": the same scan the server runs every hour, on demand for the demo.
export async function POST(req: Request) {
  if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin.'},{status:403});
  const rl = rateLimit(req, "scan", 3, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfterS);
  const form = await req.formData();
  const merchant = getMerchant(String(form.get("merchant") ?? ""));
  if (!merchant) return NextResponse.json({ error: "unknown merchant" }, { status: 400 });
  await scanMerchant(merchant, { maxNew: 1 });
  return NextResponse.redirect(new URL(`/alerts?merchant=${merchant.id}`, req.url), 303);
}
