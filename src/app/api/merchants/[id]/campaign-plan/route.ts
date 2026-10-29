import { NextResponse } from "next/server";
import { MAX_CAMPAIGN_BODY_BYTES } from "@/lib/campaign-creative";
import { sameOrigin, rateLimit, tooMany } from "@/server/guard";
import { DnaError } from "@/server/merchants/dna";
import { saveCampaignPlan } from "@/server/merchants/campaign-plan";
export async function POST(req: Request, {params}: {params: Promise<{id:string}>}) {
  if (!sameOrigin(req)) return NextResponse.json({error:"Invalid origin."},{status:403});
  const rl=rateLimit(req,"campaign-plan",15,60000); if (!rl.ok) return tooMany(rl.retryAfterS);
  try {
    if (Number(req.headers.get("content-length")) > MAX_CAMPAIGN_BODY_BYTES) throw new DnaError("This campaign is too large.",413);
    const reader=req.body?.getReader(); const chunks:Uint8Array[]=[]; let size=0;
    if(reader) try { while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_CAMPAIGN_BODY_BYTES){await reader.cancel();throw new DnaError("This campaign is too large.",413);}chunks.push(value);} } finally {reader.releaseLock();}
    const raw=Buffer.concat(chunks).toString("utf8");
    return NextResponse.json(saveCampaignPlan((await params).id,JSON.parse(raw)));
  } catch(e) { return NextResponse.json({error:e instanceof DnaError ? e.message : "Could not save this decision. Your edits are still here."},{status:e instanceof DnaError ? e.status : 400}); }
}
