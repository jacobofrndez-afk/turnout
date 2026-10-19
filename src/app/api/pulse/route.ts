import { NextResponse } from "next/server";
import { getMerchant } from "@/server/events/radar";
import { createPulseBrief } from "@/server/agent/pulse";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const merchant = getMerchant(String(form.get("merchant") ?? ""));
  if (!merchant) return NextResponse.json({ error: "unknown merchant" }, { status: 400 });
  await createPulseBrief(merchant);
  return NextResponse.redirect(new URL(`/pulse?merchant=${merchant.id}`, req.url), 303);
}
