import { NextResponse } from "next/server";
import { getMerchant } from "@/server/events/radar";
import { saveOfferTags } from "@/server/merchants/onboarding";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getMerchant(id)) return NextResponse.json({ error: "unknown merchant" }, { status: 404 });
  const form = await req.formData();
  const choices: Record<string, { ids: string[]; names: string[] }> = {};
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("tag:")) continue;
    const offerId = key.slice(4);
    const [tagId, name] = String(value).split("::");
    choices[offerId] ??= { ids: [], names: [] };
    if (tagId && !choices[offerId].ids.includes(tagId)) {
      choices[offerId].ids.push(tagId);
      choices[offerId].names.push(name ?? tagId);
    }
  }
  saveOfferTags(id, choices);
  return NextResponse.redirect(new URL(`/radar?merchant=${id}`, req.url), 303);
}
