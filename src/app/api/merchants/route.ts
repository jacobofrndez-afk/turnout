import { NextResponse } from "next/server";
import { rateLimit, tooMany } from "@/server/guard";
import { createMerchantFromForm } from "@/server/merchants/onboarding";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const rl = rateLimit(req, "merchants", 4, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfterS);
  const form = await req.formData();
  const result = await createMerchantFromForm({
    name: String(form.get("name") ?? ""),
    kind: String(form.get("kind") ?? "bar"),
    address: String(form.get("address") ?? ""),
    voice: String(form.get("voice") ?? ""),
    channels: form.getAll("channels").map(String),
    offersText: String(form.get("offers") ?? ""),
    seats: Number(form.get("seats") ?? 60) || 60,
  });
  if ("error" in result) return NextResponse.redirect(new URL(`/start?error=${encodeURIComponent(result.error)}`, req.url), 303);
  return NextResponse.redirect(new URL(`/dna?merchant=${result.merchantId}`, req.url), 303);
}
