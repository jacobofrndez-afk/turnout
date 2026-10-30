import { AgentReviewSchema, type AgentWorkspace, type AgentOpportunity, type SavedAgentReview } from '@/lib/agent-workspace';
import { CHANNEL_IDS } from '@/lib/place-dna';
import { campaignChannelOptions, localStampAt, validatePlanTiming } from '@/lib/campaign-plan';
import { assertOfferWindow } from '@/lib/offer-window';
import { recommendDistribution } from '@/lib/distribution-recommendation';
import { sourceCheck, sourceUrl, recentlyChecked } from '@/lib/event-evidence';
import { getDb } from '@/server/db/client';
import { getMerchant } from '@/server/events/radar';
import { clock } from '@/lib/clock';
import { localDateKey } from '@/lib/calendar';
import { haversineKm, VENUE_TIERS } from '@/server/events/concentration';
import { getEvent, getOffers, type CrowdProfile, type EventRow } from '@/server/qloo/crowd';
import { DnaError, readyDna } from '@/server/merchants/dna';
import { validateCampaignVisual } from '@/server/merchants/campaign-visual';
import { getSends } from '@/server/channels';
import type { ChannelAffinityProfile } from '@/lib/channel-affinity';
import { campaignWindows, draftFirstWindow } from './prompt';
import { getCampaign, getDraft } from './run';
import { eventCampaignPotential } from '@/lib/event-potential';
import { channelCreative, SOCIAL_CREATIVE_IDS, spendIssues } from '@/lib/channel-kit';

export function eventOpportunity(merchantId:string,event:EventRow,now=Date.now()):AgentOpportunity{
 const m=getMerchant(merchantId)!;
 const meta=JSON.parse(event.meta_json??'{}');
 const source=sourceCheck(meta), scheduled=(event.origin??'ticketmaster')==='ticketmaster';
 const end=event.ends_at_est?Date.parse(event.ends_at_est):campaignWindows(event)[1]?.start;
 // Only a named venue estimate is eligible for a capacity headline, never a segment default.
 const capacity=event.capacity_est??VENUE_TIERS.find(t=>t.match.test(event.venue_name))?.capacity;
 const date=end&&Number.isFinite(end)?new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:m.timezone}).format(end):undefined;
 const day=end&&localDateKey(end,m.timezone)===localDateKey(now,m.timezone)?'today':`on ${date}`;
 const kind=(event.segment??'').toLowerCase()==='sports'?'game':'show';
 const headline=scheduled&&end&&Number.isFinite(end)?`The ${kind}${capacity&&capacity>0?` at a ${capacity.toLocaleString('en-US')}-seat venue`:''} ${end<now?'was expected to end':'ends'} around ${clock(end,m.timezone)} ${day}.`:undefined;
 return {id:event.id,name:event.name,venue:event.venue_name,when:`${new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short',timeZone:m.timezone}).format(new Date(event.starts_at))} · ${clock(new Date(event.starts_at),m.timezone)}`,distanceKm:haversineKm(m.lat,m.lon,event.lat,event.lon),sourceUrl:sourceUrl(event.url),checkedAt:source?.checkedAt,headline,
  estimateNote:headline?`End estimated${capacity&&capacity>0?' · Approximate venue capacity, not attendance':''}. Schedule: Ticketmaster; estimates: Turnout.`:undefined,
  checkedLabel:source?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:m.timezone}).format(new Date(source.checkedAt)):undefined};
}

export function assertAgentEvent(merchantId:string,event:EventRow,now=Date.now()){
 const m=getMerchant(merchantId);if(!m)throw new DnaError('Place not found.',404);
 const status=(event as EventRow&{status?:string}).status?.toLowerCase();
 if(['cancelled','canceled','postponed','unconfirmed'].includes(status??''))throw new DnaError('This event is no longer confirmed. Choose another opportunity.',409);
 if((event.origin??'ticketmaster')==='ticketmaster'&&!recentlyChecked(JSON.parse(event.meta_json??'{}'),now))throw new DnaError('Refresh Today to verify this event with its source before preparing a campaign.',409);
 if(haversineKm(m.lat,m.lon,event.lat,event.lon)>m.radius_m/1000)throw new DnaError('This event is outside your saved local area.');
 if(campaignWindows(event).every(w=>w.end<now+readyDna(merchantId).profile.leadMinutes*60000))throw new DnaError('There is no time left to prepare for this event.',409);
}

export function agentWorkspace(id:string,now=Date.now()):AgentWorkspace|undefined{
 const c=getCampaign(id);if(!c)return;
 const draft=getDraft(c),m=getMerchant(c.merchant_id),event=getEvent(c.event_id);
 if(!draft||!m||!event)return;
 const offer=getOffers(m.id).find(o=>o.id===draft.chosen_offer_id);if(!offer)return;
 const dna=c.dna_snapshot_json?JSON.parse(c.dna_snapshot_json):readyDna(m.id);
 const evidence=c.evidence_json?JSON.parse(c.evidence_json) as {profile:CrowdProfile;channelAffinity:ChannelAffinityProfile;checkedAt:string}:undefined;
 const window=draftFirstWindow(event,draft.windows,m.timezone);
 const start=Math.ceil(Math.max(window.start,now+dna.profile.leadMinutes*60000+60000)/60000)*60000;
 const distribution=recommendDistribution({dna:dna.profile,offer,startLocal:localStampAt(start,m.timezone),timezone:m.timezone,now,category:'culture',channelAffinity:evidence?.channelAffinity,distanceKm:haversineKm(m.lat,m.lon,event.lat,event.lon)});
 const saved=c.review_json?JSON.parse(c.review_json) as SavedAgentReview:undefined;
 const review={revision:c.review_revision??0,title:draft.google_post.title,message:draft.google_post.body,terms:draft.google_post.offer_terms,whatsapp:draft.whatsapp.message,chalkboard:draft.storefront.chalkboard,staffLine:draft.storefront.staff_line,adHeadline:draft.geofenced_ad.headline,adBody:draft.geofenced_ad.body,startLocal:localStampAt(start,m.timezone),endLocal:localStampAt(window.end,m.timezone),channels:distribution.channels,mediaBudgetUsd:distribution.channels.includes('geofenced_ad')?distribution.budgetUsd:0,channelCreatives:draft.social,...saved};
 review.revision=c.review_revision??0;
 // Historical receipts must keep the copy actually prepared at the time, not new format starters.
 if(saved&&c.status!=='drafted'&&!saved.channelCreatives){
  const receipts=getSends(id);
  review.channelCreatives=Object.fromEntries(SOCIAL_CREATIVE_IDS.map(channel=>{
   const receipt=receipts.find(r=>r.channel===channel),payload=receipt?.payload_json?JSON.parse(receipt.payload_json):{};
   return [channel,{caption:payload.message??payload.body??saved.message,overlay:payload.overlay??'',shots:payload.shots??[]}];
  })) as NonNullable<typeof draft.social>;
 }
 const profile=evidence?.profile,fit=profile?.offerFits.find(f=>f.offerId===offer.id);
 const potential=eventCampaignPotential({matches:fit?.matches??0,references:fit?.topPlaces.length??0,signature:dna.profile.signatureOfferId===offer.id,start,end:window.end,now,insideArea:haversineKm(m.lat,m.lon,event.lat,event.lon)<=m.radius_m/1000});
 let usage:{source?:string}={};try{usage=JSON.parse(c.llm_usage_json??'{}');}catch{}
 return {id:c.id,merchantId:m.id,merchantName:m.name,timezone:m.timezone,status:c.status,copiedFromId:c.copy_parent_id??undefined,source:usage.source==='anthropic'?'anthropic':'operator',event:eventOpportunity(m.id,event,now),offer:saved?{...(saved.offerSnapshot??offer),price:saved.offerPrice}:offer,signatureOffer:getOffers(m.id).find(o=>o.id===dna.profile.signatureOfferId),dna,review,distribution,reasoning:draft.rationale,audience:draft.audience_summary,limitations:draft.limitations,proof:{locality:profile?.locality,tags:profile?.tags.slice(0,6).map(t=>t.name)??[],places:fit?.topPlaces??[],comparedOffers:profile?.offerFits.map(f=>({title:f.title,places:f.topPlaces}))??[],qlooCalls:(profile?.qlooCalls.live??0)+(profile?.qlooCalls.cached??0)},potential,originalChannels:distribution.channels,receipts:getSends(id).filter(s=>s.channel!=="dooh").map(s=>({channel:s.channel as typeof CHANNEL_IDS[number],status:s.status,simulated:s.simulated,providerId:s.provider_sid??undefined})),generatedAt:c.created_at};
}

/** Edits and the approval claim are one transaction. Only its winner may call a provider. */
export function saveAgentReview(id:string,raw:unknown,approve=false,now=Date.now()):{claimed:boolean}{
 const parsed=AgentReviewSchema.safeParse(raw);if(!parsed.success)throw new DnaError('Check the message lengths, channels, time and budget before saving.');
 const input=parsed.data;if(input.visual)validateCampaignVisual(input.visual);
 return getDb().transaction(()=>{
  const c=getCampaign(id);if(!c)throw new DnaError('Campaign not found.',404);
  if(c.status!=='drafted'){
   if(approve&&['approved','sent','prepared','partial','failed'].includes(c.status)&&c.review_json)return {claimed:false};
   throw new DnaError('This campaign is no longer editable. Open its receipt.',409);
  }
  if((c.review_revision??0)!==input.revision)throw new DnaError('This campaign changed in another tab. Your edits were not overwritten. Reload before deciding.',409);
  const dna=readyDna(c.merchant_id),m=getMerchant(c.merchant_id)!,event=getEvent(c.event_id)!,draft=getDraft(c)!;
  if(dna.version!==(c.dna_version??0))throw new DnaError('Your place DNA changed. Prepare a fresh campaign before deciding.',409);
  assertAgentEvent(m.id,event,now);
  const offer=getOffers(m.id).find(o=>o.id===draft.chosen_offer_id);if(!offer?.price?.trim())throw new DnaError('The selected menu offer is no longer available.',409);
  const previous=c.review_json?JSON.parse(c.review_json) as SavedAgentReview:undefined;
  const originalPrice=c.evidence_json?(JSON.parse(c.evidence_json).offers as {id:string;price:string}[]|undefined)?.find(o=>o.id===offer.id)?.price:undefined;
  if((previous?.offerPrice??originalPrice)!==undefined&&(previous?.offerPrice??originalPrice)!==offer.price)throw new DnaError('The menu price changed. Prepare the campaign again.',409);
  if(input.channels.some(ch=>!campaignChannelOptions(dna.profile.channels).includes(ch)))throw new DnaError('Enable paid ads in your DNA before selecting them.');
  const budgetIssues=spendIssues(input,dna.profile.dailyBudgetUsd,dna.profile.channels.includes('geofenced_ad'));
  if(budgetIssues.length)throw new DnaError(budgetIssues[0]);
  // Freeze channel versions; changing the brief must not rewrite approved materials.
  const social=Object.fromEntries(SOCIAL_CREATIVE_IDS.map(channel=>[channel,channelCreative(channel,input,m.name)])) as NonNullable<typeof draft.social>;
  const timing=validatePlanTiming(input.startLocal,input.endLocal,m.timezone,dna.profile.leadMinutes,now);
  assertOfferWindow(offer.description,input.startLocal,input.endLocal);
  const fits=campaignWindows(event).some(w=>timing.start>=w.start&&timing.end<=w.end);
  if(!fits)throw new DnaError('Keep the campaign inside a suggested event window. Choose another opportunity for other times.');
  const next={...draft,social,google_post:{title:input.title,body:input.message,offer_terms:input.terms},whatsapp:{message:input.whatsapp},storefront:{chalkboard:input.chalkboard,staff_line:input.staffLine},geofenced_ad:{...draft.geofenced_ad,headline:input.adHeadline,body:input.adBody,daily_budget_usd:input.mediaBudgetUsd},windows:[{label:campaignWindows(event).find(w=>timing.start>=w.start&&timing.end<=w.end)!.label,start_local:input.startLocal.slice(11),end_local:input.endLocal.slice(11),why:draft.windows[0].why}]};
  const review:SavedAgentReview={...input,channelCreatives:social,revision:input.revision+1,offerPrice:offer.price,offerSnapshot:{id:offer.id,title:offer.title,description:offer.description,price:offer.price}};
  getDb().prepare("UPDATE campaigns SET copy_json=?,channels_json=?,window_json=?,review_json=?,review_revision=?,status=?,updated_at=datetime('now') WHERE id=?").run(JSON.stringify(next),JSON.stringify(input.channels),JSON.stringify(next.windows),JSON.stringify(review),review.revision,approve?'approved':'drafted',id);
  return {claimed:approve};
 })();
}

/** Visitor copies have their own URLs; they never replace Today's reference campaign. */
export function latestAgentWorkspace(merchantId:string,eventId:string,dnaVersion:number):AgentWorkspace|undefined{
 const campaign=getDb().prepare("SELECT id FROM campaigns WHERE merchant_id=? AND event_id=? AND dna_version=? AND copy_json IS NOT NULL AND copy_parent_id IS NULL ORDER BY created_at DESC,rowid DESC LIMIT 1").get(merchantId,eventId,dnaVersion) as {id:string}|undefined;
 return campaign?agentWorkspace(campaign.id):undefined;
}

/** Resume only the campaign explicitly named for this place, occasion and current DNA. */
export function resumeAgentWorkspace(id:string,merchantId:string,eventId:string,dnaVersion:number):AgentWorkspace|undefined{
 const campaign=getCampaign(id);
 if(!campaign?.evidence_json||campaign.merchant_id!==merchantId||campaign.event_id!==eventId||campaign.dna_version!==dnaVersion)return;
 return agentWorkspace(id);
}
