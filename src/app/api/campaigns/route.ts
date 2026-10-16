import { NextResponse } from "next/server";
import { getMerchant } from "@/server/events/radar";
import { getEvent } from "@/server/qloo/crowd";
import { createCampaign } from "@/server/agent/run";

export const dynamic = "force-dynamic";

// Form POST from the crowd page: creates the campaign, runs (or queues) the agent, redirects to the campaign page.
export async function POST(req: Request) {
  const form = await req.formData();
  const merchant = getMerchant(String(form.get("merchant") ?? ""));
  const event = getEvent(String(form.get("event") ?? ""));
  const pick = form.get("pick") ? String(form.get("pick")) : undefined;
  if (!merchant || !event) return NextResponse.json({ error: "unknown merchant or event" }, { status: 400 });
  const campaign = await createCampaign(merchant, event, pick);
  return NextResponse.redirect(new URL(`/campaigns/${campaign.id}`, req.url), 303);
}
