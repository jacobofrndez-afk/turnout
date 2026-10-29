import { NextResponse } from "next/server";
import { approveCampaign, getCampaign, getDraft } from "@/server/agent/run";
import { getMerchant } from "@/server/events/radar";
import { getEvent } from "@/server/qloo/crowd";
import { draftFirstWindow } from "@/server/agent/prompt";
import { publishCampaign } from "@/server/channels";
import { sameOrigin,rateLimit,tooMany,readJsonBody } from '@/server/guard';
import { agentWorkspace,saveAgentReview } from '@/server/agent/review';
import { MAX_CAMPAIGN_BODY_BYTES } from '@/lib/campaign-creative';
import { DnaError } from '@/server/merchants/dna';

export const dynamic = "force-dynamic";

// The demo approval produces campaign materials and receipts; it never sends a message.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin.'},{status:403});
  const limit=rateLimit(req,'approve-campaign',10,60000);if(!limit.ok)return tooMany(limit.retryAfterS);
  const { id } = await params;
  if(req.headers.get('content-type')?.includes('application/json')){
    try{
      const body=await readJsonBody(req,MAX_CAMPAIGN_BODY_BYTES) as {review?:unknown;sendDemo?:unknown};
      if(body.sendDemo!==undefined&&typeof body.sendDemo!=='boolean')throw new DnaError('Choose whether to send the demo message.');
      if(body.sendDemo)throw new DnaError('WhatsApp is prepared, not sent in this demo. Approve the campaign materials instead.',409);
      const {claimed}=saveAgentReview(id,body.review,true);
      if(claimed){
        const approved=getCampaign(id)!;
        await publishCampaign(id,getMerchant(approved.merchant_id)!,getDraft(approved)!,{sendDemo:false,createPausedAd:false});
      }
      return NextResponse.json({workspace:agentWorkspace(id)});
    }catch(e){return NextResponse.json({error:e instanceof DnaError?e.message:'Could not finish this decision. Check the campaign receipt before retrying.'},{status:e instanceof DnaError?e.status:400});}
  }
  const campaign = getCampaign(id);
  if (!campaign) return NextResponse.json({ error: "unknown campaign" }, { status: 404 });
  // Reviewed campaigns cannot bypass revision, DNA and timing checks through the legacy form.
  if(campaign.evidence_json)return NextResponse.redirect(new URL(`/campaigns/${id}`,req.url),303);
  const draft = getDraft(campaign);
  const merchant = getMerchant(campaign.merchant_id);
  const event = getEvent(campaign.event_id);
  // Words written for the first window are not sent once it has closed.
  const open = !!event && !!draft && !!merchant && draftFirstWindow(event, draft.windows, merchant.timezone).end > Date.now();
  if (campaign.status === "drafted" && draft && merchant && open) {
    // The conditional update is the claim. Only one concurrent request may publish.
    if (approveCampaign(id)) {
      try { await publishCampaign(id, merchant, draft, {sendDemo:false,createPausedAd:false}); }
      catch { return NextResponse.redirect(new URL(`/campaigns/${id}?delivery=interrupted`, req.url), 303); }
    }
  }
  return NextResponse.redirect(new URL(`/campaigns/${id}`, req.url), 303);
}
