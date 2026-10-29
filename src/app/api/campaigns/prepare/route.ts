import { NextResponse } from 'next/server';
import { z } from 'zod';
import { rateLimit,readJsonBody,sameOrigin,tooMany } from '@/server/guard';
import { getMerchant } from '@/server/events/radar';
import { getEvent } from '@/server/qloo/crowd';
import { createCampaign,provider } from '@/server/agent/run';
import { agentWorkspace,assertAgentEvent } from '@/server/agent/review';
import { DnaError } from '@/server/merchants/dna';
export const dynamic='force-dynamic';
export async function POST(req:Request){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin.'},{status:403});
 const limit=rateLimit(req,'prepare-agent',4,60000);if(!limit.ok)return tooMany(limit.retryAfterS);
 try {
  const input=z.object({merchant:z.string().max(100),event:z.string().max(200)}).parse(await readJsonBody(req,2048));
  const merchant=getMerchant(input.merchant),event=getEvent(input.event);
  if(!merchant||!event)throw new DnaError('Place or event not found.',404);
  assertAgentEvent(merchant.id,event);
  if(provider()!=='anthropic')throw new DnaError('The campaign writer is not connected yet. Your local opportunities remain available.',503);
  const c=await createCampaign(merchant,event);
  const workspace=agentWorkspace(c.id);
  if(workspace)return NextResponse.json({workspace});
  if(c.status==='needs_input')return NextResponse.json({error:'Qloo needs a confirmed match for this event. Review the audience before generating.',href:`/campaigns/new?merchant=${merchant.id}&event=${encodeURIComponent(event.id)}`},{status:409});
  return NextResponse.json({error:c.status==='failed'?'The writer could not finish this campaign. Nothing was sent. Please retry or choose another opportunity.':'This campaign is being prepared. Try again shortly.'},{status:c.status==='failed'?503:409});
 }catch(e){return NextResponse.json({error:e instanceof DnaError?e.message:'Could not prepare this campaign. Nothing was sent.'},{status:e instanceof DnaError?e.status:400});}
}
