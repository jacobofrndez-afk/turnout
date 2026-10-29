import { NextResponse } from 'next/server';
import { agentWorkspace,saveAgentReview } from '@/server/agent/review';
import { rateLimit,tooMany,sameOrigin,readJsonBody } from '@/server/guard';
import { MAX_CAMPAIGN_BODY_BYTES } from '@/lib/campaign-creative';
import { DnaError } from '@/server/merchants/dna';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 const limit=rateLimit(req,'agent-receipt',15,60000);if(!limit.ok)return tooMany(limit.retryAfterS);
 const {id}=await params;
 const workspace=agentWorkspace(id);
 return workspace?NextResponse.json({workspace}):NextResponse.json({error:'Campaign not found.'},{status:404});
}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!sameOrigin(req))return NextResponse.json({error:'Invalid origin.'},{status:403});
 const limit=rateLimit(req,'agent-edit',15,60000);if(!limit.ok)return tooMany(limit.retryAfterS);
 try{const {id}=await params;saveAgentReview(id,await readJsonBody(req,MAX_CAMPAIGN_BODY_BYTES));return NextResponse.json({workspace:agentWorkspace(id)});}
 catch(e){return NextResponse.json({error:e instanceof DnaError?e.message:'Could not save. Your edits are still here.'},{status:e instanceof DnaError?e.status:400});}
}
