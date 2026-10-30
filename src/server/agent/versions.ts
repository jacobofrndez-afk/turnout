import { AgentReviewSchema, type SavedAgentReview } from '@/lib/agent-workspace';
import { localStampAt, localTimeToInstant, windowStillOpen } from '@/lib/campaign-plan';
import { getDb, newId } from '@/server/db/client';
import { getMerchant } from '@/server/events/radar';
import { DnaError, readyDna } from '@/server/merchants/dna';
import { getCampaign } from './run';
import { saveAgentReview } from './review';

/** Reuse the approved material, not its receipts or billed model usage. No provider is called. */
export function copyCampaign(id:string,now=Date.now()):string{
 return getDb().transaction(()=>{
  const original=getCampaign(id);
  if(!original)throw new DnaError('Campaign not found.',404);
  if(!['prepared','sent','partial','failed'].includes(original.status)||!original.review_json||!original.copy_json||!original.evidence_json)throw new DnaError('Wait for the campaign receipt before creating a version.',409);
  const saved=JSON.parse(original.review_json) as SavedAgentReview;
  const review=AgentReviewSchema.parse({...saved,revision:0});
  const merchant=getMerchant(original.merchant_id)!,dna=readyDna(original.merchant_id);
  const lead=dna.profile.leadMinutes*60000;
  if(localTimeToInstant(review.startLocal,merchant.timezone)<now+lead){
   // The window has started: the copy begins as soon as it can be prepared, and keeps the original end.
   if(!windowStillOpen(review,merchant.timezone,dna.profile.leadMinutes,now))throw new DnaError('This campaign window has passed. Choose a current opportunity on Today to prepare new content.',409);
   review.startLocal=localStampAt(Math.ceil((now+lead+60000)/60000)*60000,merchant.timezone);
  }
  const newCampaignId=newId('camp');
  const oldUsage=JSON.parse(original.llm_usage_json??'{}');
  const usage=JSON.stringify({source:oldUsage.source,inherited_from:id});
  getDb().prepare(`INSERT INTO campaigns
   (id,merchant_id,event_id,crowd_profile_id,status,offer_id,copy_json,window_json,channels_json,rationale,limitations,llm_usage_json,dna_version,dna_snapshot_json,evidence_json,review_json,review_revision,copy_parent_id)
   SELECT ?,merchant_id,event_id,crowd_profile_id,'drafted',offer_id,copy_json,window_json,channels_json,rationale,limitations,?,dna_version,dna_snapshot_json,evidence_json,?,0,id FROM campaigns WHERE id=?`)
   .run(newCampaignId,usage,JSON.stringify({...saved,revision:0}),id);
  // The same DNA, price, source freshness, menu availability and timing checks apply to every version.
  // A failed check rolls back the insertion, leaving the original and its receipts untouched.
  saveAgentReview(newCampaignId,review,false,now);
  return newCampaignId;
 })();
}
