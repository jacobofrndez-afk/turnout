import { NextResponse } from 'next/server';
import { rateLimit,sameOrigin,tooMany } from '@/server/guard';
import { DnaError } from '@/server/merchants/dna';
import { copyCampaign } from '@/server/agent/versions';
import { agentWorkspace } from '@/server/agent/review';
import { getCampaign } from '@/server/agent/run';
export const dynamic='force-dynamic';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin.'},{status:403});
 const limit=rateLimit(req,'copy-campaign',6,60000);if(!limit.ok)return tooMany(limit.retryAfterS);
 const {id}=await params;
 try{
  const workspace=agentWorkspace(copyCampaign(id));
  if(!workspace)throw new Error('No editable version returned.');
  return NextResponse.json({workspace,href:`/campaigns/${workspace.id}?merchant=${workspace.merchantId}`});
 }catch(e){
  const original=getCampaign(id);
  return NextResponse.json({error:e instanceof DnaError?e.message:'Could not create your version. The original campaign is unchanged.',...(original?{href:`/today?merchant=${original.merchant_id}`}:{})},{status:e instanceof DnaError?e.status:400});
 }
}
