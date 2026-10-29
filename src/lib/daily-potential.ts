import { servicePeriod, fitsServiceTime, fitsRhythm, nextLocalDay } from "./offer-service";
import { assertOfferWindow } from "./offer-window";
import { localTimeToInstant, validatePlanTiming, type CampaignPlanProposal } from "./campaign-plan";
import type { DnaRecord } from "./place-dna";
export type TasteEvidence = { id:string; name:string };
export type QlooSnapshot = {
  tastes:TasteEvidence[]; places:{id:string;name:string;tags:TasteEvidence[]}[];
  sources:{kind:"tastes"|"places";status:"available"|"unavailable";retrievedAt:string|null;count:number}[];
};
export type OfferEvidence = { offerId:string; title:string; price:string; description?:string|null; menuTags:TasteEvidence[]; matchingTastes:TasteEvidence[]; matchingPlaces:{id:string;name:string;tags:string[]}[] };
export type PotentialContext = {
  timezone:string; now:number; dna:DnaRecord;
  moments:{id:string;label:string;days:number[];from:string;to:string;evidence:string[]}[];
  events:{title:string;date:string;time:string}[];
};
export type Potential = {score:number|null;label:string;reason:string;factors:{label:string;points:number;max:number;reason:string}[];moment:string;timingValid:boolean};
// Explicit semantic bridges, not free-text guesses about an audience.
const relatedTags:Record<string,string[]> = {
  "urn:tag:genre:place:restaurant:cocktail_bar":["urn:tag:customer_identity:qloo:cocktail_enthusiasts"],
  "urn:tag:genre:place:restaurant:wine_bar":["urn:tag:customer_identity:qloo:wine_enthusiasts"],
  "urn:tag:offerings:place:craft_beer":["urn:tag:customer_identity:qloo:beer_enthusiasts","urn:tag:customer_identity:qloo:craft_beer_enthusiasts"],
};
export function matchOffer(offer:{id:string;title:string;price:string;description?:string|null;tag_urns_json:string;tag_names_json:string},snapshot:QlooSnapshot):OfferEvidence {
  const parse=(s:string):string[]=>{try{const x=JSON.parse(s);return Array.isArray(x)?x.filter(v=>typeof v==="string"):[];}catch{return [];}};
  const ids=[...new Set(parse(offer.tag_urns_json))],names=parse(offer.tag_names_json);
  const menuTags=ids.map((id,i)=>({id,name:names[i]??id.split(":").pop()!.replaceAll("_"," ")}));
  const tasteIds=new Set(ids.flatMap(id=>[id,...(relatedTags[id]??[])]));
  return {offerId:offer.id,title:offer.title,price:offer.price,description:offer.description,menuTags,
    matchingTastes:snapshot.tastes.filter(t=>tasteIds.has(t.id)),
    matchingPlaces:snapshot.places.flatMap(p=>{const tags=p.tags.filter(t=>ids.includes(t.id));return tags.length?[{id:p.id,name:p.name,tags:[...new Set(tags.map(t=>t.name))]}]:[]}),
  };
}
export function potentialFor(offer:OfferEvidence,snapshot:QlooSnapshot,context:PotentialContext,startLocal:string,endLocal:string,now=context.now):Potential {
  let start=0,end=0,timingValid=true,timingReason="A planning window, with time to prepare. Opening hours and stock still need confirmation.";
  try {({start,end}=validatePlanTiming(startLocal,endLocal,context.timezone,context.dna.profile.leadMinutes,now));assertOfferWindow(offer.description,startLocal,endLocal);}
  catch(e){timingValid=false;timingReason=e instanceof Error?e.message:"Choose a valid time.";}
  const taste=offer.matchingTastes.length?30:0;
  const references=Math.min(5,offer.matchingPlaces.length)*4;
  const dna=context.dna.status === "suggested" ? 0 : offer.offerId===context.dna.profile.signatureOfferId?25:15;
  let moment=timingValid?10:0,momentName="Planning suggestion";
  const date=startLocal.slice(0,10),hour=startLocal.slice(11),weekday=new Date(`${date}T12:00:00Z`).getUTCDay();
  const game=servicePeriod(offer)==="game";
  if(timingValid && !fitsServiceTime(offer,hour)) {
    timingValid=false;moment=0;timingReason=game?"Confirm a specific game and screening before promoting this offer.":"Choose a time that matches this offer’s service period.";
  }
  if(timingValid) {
    const rhythm=context.moments.find(m=>{
      if(!m.days.includes(weekday)||!fitsRhythm(offer,m.id))return false;
      try {return Math.min(end,localTimeToInstant(`${m.to<=m.from?nextLocalDay(date):date}T${m.to}`,context.timezone))-Math.max(start,localTimeToInstant(`${date}T${m.from}`,context.timezone))>=30*60000;}catch{return false;}
    });
    if(rhythm){moment=25;momentName=rhythm.label;timingReason=`At least 30 minutes overlap with ${rhythm.label.toLowerCase()}, inferred from Qloo place descriptions and hours. ${rhythm.evidence[0]??""}`;}
    else {
      const event=context.events.find(e=>{if(e.date!==date)return false;try{const at=localTimeToInstant(`${e.date}T${e.time}`,context.timezone);return at>=start+30*60000&&at<=end+90*60000;}catch{return false;}});
      if(event){moment=15;momentName="Nearby event window";timingReason=`${event.title} starts nearby at ${event.time}. This gives a timing cue; its audience’s taste has not been matched to this offer.`;}
    }
  }
  const factors=[
    {label:"Qloo taste match",points:taste,max:30,reason:offer.matchingTastes.length?`Matching neighbourhood taste categories: ${offer.matchingTastes.map(t=>t.name).join(", ")}. These match the offer’s saved menu tags.`:"No matching taste in the returned neighbourhood profile. That is not evidence of no demand."},
    {label:"Local references",points:references,max:20,reason:`${offer.matchingPlaces.length} distinct places in the Qloo sample carry matching menu tags. Four points per place, capped at five. This describes nearby supply, not customers.`},
    {label:"Your place DNA",points:dna,max:25,reason:dna===25?"Your signature offer, with a saved price and confirmed or demo DNA.":dna===15?"An active, priced offer on your menu; it is not your signature offer.":"Confirm your place DNA."},
    {label:"Timing",points:moment,max:25,reason:timingReason},
  ];
  const complete=snapshot.sources.length===2&&snapshot.sources.every(s=>s.status==="available"&&s.count>0);
  const evidence=offer.matchingTastes.length+offer.matchingPlaces.length>0;
  const score=complete&&evidence&&timingValid?factors.reduce((sum,f)=>sum+f.points,0):null;
  return {score,label:!timingValid?"Check the timing":!complete?"Partial Qloo data":!evidence?"Evidence still limited":(score??0)>=75?"Worth prioritising":(score??0)>=55?"Worth testing":"Explore carefully",reason:!timingValid?timingReason:!complete?"Some Qloo evidence is missing. Your menu campaign remains available, but a complete index cannot be calculated.":!evidence?"We have no matching Qloo evidence for this offer in the returned sample.":`A planning index for ${offer.title.toLowerCase()}, not a probability of success.`,factors,moment:momentName,timingValid};
}

/** Lead with evidence, not the order in which a source returned its occasions. */
export function rankCampaignChoices(choices:{id:string|null;proposal:CampaignPlanProposal}[], evidence:OfferEvidence[], snapshot:QlooSnapshot, context:PotentialContext) {
  return choices.map(choice=>{
    const offer=evidence.find(e=>e.offerId===choice.proposal.offerId),slot=choice.proposal.slots[0];
    return {...choice,potential:offer?potentialFor(offer,snapshot,context,slot.startLocal,slot.endLocal):undefined};
  }).sort((a,b)=>Number(b.potential?.timingValid??false)-Number(a.potential?.timingValid??false)
    || (b.potential?.score??-1)-(a.potential?.score??-1)
    || a.proposal.slots[0].startLocal.localeCompare(b.proposal.slots[0].startLocal));
}
