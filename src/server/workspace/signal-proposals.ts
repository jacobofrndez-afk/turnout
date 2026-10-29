import { localDateKey } from "@/lib/calendar";
import { localStampAt, localTimeToInstant, validatePlanTiming, type CampaignPlanProposal } from "@/lib/campaign-plan";
import { assertOfferWindow, offerWindow } from "@/lib/offer-window";
import { VOICES, type DnaRecord, type MenuOffer } from "@/lib/place-dna";
import type { OfferEvidence } from "@/lib/daily-potential";
import type { OpportunitySignal } from "@/lib/opportunity-signals";
import type { SourcedOpportunity } from "@/lib/sourced-opportunity";
import { proposeCampaign } from "./proposal";
export function signalProposals(signals:OpportunitySignal[],dna:DnaRecord,offers:MenuOffer[],evidence:OfferEvidence[],timezone:string,now:number):SourcedOpportunity[] {
  if(dna.status==="suggested")return [];
  const candidates:SourcedOpportunity[]=[];
  for(const signal of signals) {
    const day=localDateKey(signal.startAt,timezone);
    const eligible=offers.filter(o=>o.price?.trim()&&(!signal.offerIds||signal.offerIds.includes(o.id))&&!/game night|midnight|after.show|late plate|late.night|brunch|breakfast/i.test(o.title));
    const sorted=eligible.map(offer=>{
      const e=evidence.find(e=>e.offerId===offer.id);
      const score=(e?.matchingTastes.length?30:0)+Math.min(e?.matchingPlaces.length??0,5)*4+(offer.id===dna.profile.signatureOfferId?25:15)+(signal.category==="market"&&/local|craft/i.test(`${offer.title} ${offer.description}`)?30:0);
      return {offer,e,score};
    }).sort((a,b)=>b.score-a.score);
    for(const {offer,e} of sorted) {
      try {
        const base=proposeCampaign(dna,offers,timezone,[],now,offer.id);if(!base)continue;
        const serving=offerWindow(offer.description);
        // A modest early-evening window. Local signals must overlap it, not be moved to tomorrow.
        const earliest=Math.ceil((now+(dna.profile.leadMinutes+5)*60000)/900000)*900000;
        const start=Math.max(earliest,localTimeToInstant(`${day}T${serving?.from??"17:00"}`,timezone));
        const end=Math.min(start+2*3600000,localTimeToInstant(`${day}T${serving?.to??"20:00"}`,timezone));
        if(signal.scope==="local"&&(start>=signal.endAt||end<=signal.startAt))continue;
        if(signal.category==="trend"&&(start>=signal.endAt||end>signal.endAt))continue;
        const startLocal=localStampAt(start,timezone),endLocal=localStampAt(end,timezone);
        validatePlanTiming(startLocal,endLocal,timezone,dna.profile.leadMinutes,now);assertOfferWindow(offer.description,startLocal,endLocal);
        const culturalTitle=/cinémathèque|cinematheque/i.test(signal.location)?"A little cinema, a shared board":/photo/i.test(signal.title)?"An exhibition, then an aperitif":"Keep the conversation going";
        const title=signal.category==="trend"?(dna.profile.voice==="refined"?"A timely reason to share":"A good moment for your signature") : signal.category==="calendar"?(dna.profile.voice==="refined"?"Halloween, at your own pace":"A first stop before Halloween") : signal.category==="culture"?culturalTitle:signal.category==="market"?"From the market to a local pour":"A neighbourhood evening, made yours";
        const opening=signal.category==="trend"?(dna.profile.voice==="refined"?"Something worth taking a moment for.":"Good taste. Good timing.") : signal.category==="calendar"?(dna.profile.voice==="refined"?"A quieter beginning to Halloween evening.":"Halloween plans? Start with something good.") : signal.category==="culture"?(dna.profile.voice==="refined"?(start<signal.startAt?`Before ${signal.location}, a moment to share.`:`Make an evening of ${signal.location}. A moment to share.`):"A little culture. A good next stop.") : signal.category==="market"?"Local finds. Local pours. Make us your next stop.":"Out in the neighbourhood? Make us your next stop.";
        const signature=offer.id===dna.profile.signatureOfferId?dna.profile.exampleLine:dna.profile.voice==="direct"?"Worth a stop. Better with good company.":dna.profile.voice==="refined"?"A little time together, before the evening unfolds.":"A familiar welcome. Something good to share.";
        const message=`${opening}\n${offer.title} · ${offer.price}.\n${signature}`;
        const timing=signal.category==="trend"?"A suggested service window today, while this search trend is recent. This time comes from your menu and preparation needs; Google does not provide a local attendance forecast.":signal.timeConflict?"An early-evening suggestion on the listed date. The city feed has conflicting clock offsets: confirm the session’s exact hours with the organiser and your own service availability.":signal.timeBasis==="permit"?"An early-evening campaign overlapping the city’s permit window. The organiser’s public hours and your service availability still need confirmation.":signal.scope==="global"?"An early-evening suggestion on 31 October. Leave time for preparation and check service availability.":"A suggested service window overlapping a published cultural session. An invitation to continue the outing; attendance and visits are unknown.";
        const proposal:CampaignPlanProposal={...base,messages:{...base.messages,[offer.id]:message},slots:[{id:signal.id,label:title,startLocal,endLocal,reason:timing,source:`${signal.source.name} · ${signal.source.url}`} ]};
        const qloo=e?.matchingTastes.length?`Qloo’s neighbourhood profile includes ${e.matchingTastes.map(t=>t.name).join(", ")}, matching this offer’s menu tags.`:e?.matchingPlaces.length?`${e.matchingPlaces.length} nearby places in the Qloo sample share this offer’s menu tags.`:"No matching Qloo evidence for this offer. This is a menu-led idea, not a Qloo-backed audience match.";
        const fit=e?.matchingTastes.length?`${e.matchingTastes[0].name} in Qloo’s neighbourhood profile. ${offer.id===dna.profile.signatureOfferId?"Your signature offer.":"A matching offer on your menu."}`:e?.matchingPlaces.length?`${e.matchingPlaces.length} local Qloo references share this offer’s menu tags. ${offer.id===dna.profile.signatureOfferId?"Your signature offer.":"An offer worth testing."}`:"Your saved menu and voice. Qloo support is currently limited.";
        candidates.push({id:signal.id,title,fit,signal,proposal,why:[{label:"The occasion",text:signal.category==="trend"?`“${signal.title}” appeared in ${signal.source.name}. Its topic matches this priced menu offer. This is national interest, not a measured local audience.`:signal.scope==="global"?"A verified international calendar date gives you a reason to plan ahead. Local demand is still unmeasured.":`${signal.title} is listed ${signal.approximate?"approximately ":""}${signal.distanceKm?.toFixed(1)} km from your place. A nearby reason to be out, not proof of a crowd.`},{label:"What Qloo adds",text:`${qloo} This describes the neighbourhood, not this event’s attendees.`},{label:"Your place DNA",text:`${VOICES[dna.profile.voice]}. ${offer.id===dna.profile.signatureOfferId?"Your signature offer":"A priced offer already on your menu"}; ${dna.profile.leadMinutes} minutes to prepare. ${signal.category==="market"?"The local-produce theme also echoes the local producers named in your menu. ":""}${dna.profile.boundaries}`},{label:"Why this time",text:timing}]});break;
      }catch{/* An unsafe, expired, or incompatible window is not a recommendation. */}
    }
  }
  // Show different local occasions first; repeated sessions never fill the feed.
  const locals=candidates.filter(c=>c.signal.scope==="local").sort((a,b)=>a.proposal.slots[0].startLocal.localeCompare(b.proposal.slots[0].startLocal)||Number(!!a.signal.timeConflict)-Number(!!b.signal.timeConflict)||(a.signal.distanceKm??0)-(b.signal.distanceKm??0));
  const unique=locals.filter((c,i)=>locals.findIndex(o=>o.signal.title===c.signal.title)===i);
  const diverse=unique.length?[unique[0],...(unique.find(c=>c.signal.category!==unique[0].signal.category)?[unique.find(c=>c.signal.category!==unique[0].signal.category)!]:unique.slice(1,2))]:[];
  const expanded=[...diverse,...unique.filter(c=>!diverse.some(d=>d.id===c.id))].slice(0,4);
  return [...expanded,...candidates.filter(c=>c.signal.scope==="global").sort((a,b)=>Number(b.signal.category==="trend")-Number(a.signal.category==="trend")).slice(0,1)];
}
