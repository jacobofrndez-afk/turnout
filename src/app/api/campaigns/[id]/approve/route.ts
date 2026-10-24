import { NextResponse } from "next/server";
import { approveCampaign, getCampaign, getDraft } from "@/server/agent/run";
import { getMerchant } from "@/server/events/radar";
import { getEvent } from "@/server/qloo/crowd";
import { draftFirstWindow } from "@/server/agent/prompt";
import { publishCampaign } from "@/server/channels";

export const dynamic = "force-dynamic";

// Approve = publish: one send per channel the merchant has. Real adapters when credentials exist, simulated otherwise.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "unknown campaign" }, { status: 404 });
  const draft = getDraft(campaign);
  const merchant = getMerchant(campaign.merchant_id);
  const event = getEvent(campaign.event_id);
  // Words written for the first window are not sent once it has closed.
  const open = !!event && !!draft && !!merchant && draftFirstWindow(event, draft.windows, merchant.timezone).end > Date.now();
  if (campaign.status === "drafted" && draft && merchant && open) {
    approveCampaign(id);
    await publishCampaign(id, merchant, draft);
  }
  return NextResponse.redirect(new URL(`/campaigns/${id}`, req.url), 303);
}
