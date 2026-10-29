import { localTimeToInstant } from "@/lib/campaign-plan";
import { servicePeriod, fitsRhythm } from "@/lib/offer-service";
import type { CampaignPlanProposal } from "@/lib/campaign-plan";
import type { DnaRecord, MenuOffer } from "@/lib/place-dna";
import type { OfferEvidence, QlooSnapshot } from "@/lib/daily-potential";
import type { SourcedOpportunity } from "@/lib/sourced-opportunity";
import type { RhythmMoment } from "@/server/qloo/rhythm";
import type { WeatherSummary } from "@/server/weather/openmeteo";
import { proposeCampaign } from "./proposal";

type Context = { dna:DnaRecord; offers:MenuOffer[]; evidence:OfferEvidence[]; timezone:string; now:number; placeName:string };
export function rhythmProposals(context:Context,moments:RhythmMoment[],snapshot:QlooSnapshot):SourcedOpportunity[] {
  const {dna,offers,evidence,timezone,now,placeName}=context;
  const source=snapshot.sources.find(s=>s.kind==="places");
  if(source?.status!=="available"||!source.retrievedAt)return [];
  const retrievedAt=source.retrievedAt;
  return moments.filter(m=>m.evidence.length&&m.places.length).flatMap(moment=>{
    const eligible=offers.filter(o=>fitsRhythm(o,moment.id)).sort((a,b)=>{
      const points=(id:string)=>{const e=evidence.find(e=>e.offerId===id);return (e?.matchingTastes.length?30:0)+Math.min(e?.matchingPlaces.length??0,5)*4;};
      return points(b.id)-points(a.id);
    });
    for(const offer of eligible){
      const proposal=proposeCampaign(dna,offers,timezone,[moment],now,offer.id);
      const slot=proposal?.slots.find(s=>s.id.endsWith(moment.id));
      if(!proposal||!slot)continue;
      const concepts:Record<RhythmMoment["id"],{title:string;opening:string}>={
        afterwork:{title:"Make the way home a little better",opening:"Work done. A good stop on your way home."},
        late_night:{title:"A late bite, when the neighbourhood stays out",opening:dna.profile.voice==="refined"?"A little longer together. Something good before heading home.":"Still out? There’s time for one good bite."},
        brunch:{title:"Make the weekend a brunch occasion",opening:"Take your time this weekend. Bring someone you like."},
        morning_coffee:{title:"A better start to the morning",opening:"Before the day gets going, a little moment for yourself."},
        lunch_break:{title:"Make your lunch break count",opening:"Step out for lunch. Something good, close by."},
        afternoon_break:{title:"An afternoon worth pausing for",opening:"A little break in the afternoon. Take a moment with us."},
        dinner:{title:"Make an evening of the neighbourhood",opening:"Evening plans, close to home. Something good to share."},
        date_night:{title:"A little time for two",opening:dna.profile.voice==="refined"?"An evening for two. Take your time together.":"Bring your favourite person. Make an evening of it."},
        weekend_stroll:{title:"A good find on your weekend walk",opening:"Out exploring this weekend? Make us part of the walk."},
      };
      const {title,opening}=concepts[moment.id];
      const message=`${opening}\n${offer.title} · ${offer.price}.\n${offer.description??""}`;
      return [{id:`local-${moment.id}-${offer.id}`,title,fit:moment.evidence[0],signal:{id:`qloo-${moment.id}`,title:moment.label,scope:"local" as const,category:"rhythm" as const,startAt:localTimeToInstant(slot.startLocal,timezone),endAt:localTimeToInstant(slot.endLocal,timezone),location:`Around ${placeName}`,timeBasis:"inferred" as const,source:{id:"qloo-rhythm",name:"Qloo · nearby place descriptions & hours",url:"https://www.qloo.com/capabilities",checkedAt:retrievedAt,mode:"cache" as const},caution:"A recurring habit inferred from nearby places, not measured footfall. Confirm your own opening hours and stock."},proposal:{...proposal,slots:[slot],messages:{...proposal.messages,[offer.id]:message}},why:[{label:"What Qloo found",text:moment.evidence.join(". ")},{label:"Local references",text:moment.places.map(p=>p.name).join(" · ")},{label:"What changes",text:`This shifts ${offer.title} into the ${moment.label.toLowerCase()} window with an invitation specific to that moment. Your menu price and preparation time are preserved.`}]}];
    }
    return [];
  });
}
/** The supplied forecast must cover this exact offer window, not 'the next six hours'. */
export function weatherProposal(context:Context,proposal:CampaignPlanProposal,forecast:WeatherSummary|undefined,checkedAt:string):SourcedOpportunity|undefined {
  if(!forecast||["storm","snow","hot","windy"].includes(forecast.kind))return;
  const {offers,dna,timezone,now,placeName}=context,offer=offers.find(o=>o.id===proposal.offerId),slot=proposal.slots[0];
  if(!offer)return;
  const startAt=localTimeToInstant(slot.startLocal,timezone),endAt=localTimeToInstant(slot.endLocal,timezone);
  if(startAt>now+24*3600000||startAt<now+dna.profile.leadMinutes*60000)return;
  const indoors=["rain","cold","mild"].includes(forecast.kind);
  const title=forecast.kind==="rain"?"A good reason to come inside":indoors?"A cosy stop on a cool day":"A good stop on a neighbourhood walk";
  const opening=forecast.kind==="rain"?"Rain outside. A warm welcome inside.":indoors?dna.profile.voice==="refined"?"A cooler day. A little time together inside.":"Cool outside. Good company inside.":"Out for a walk? Make us your next stop.";
  return {id:`weather-${offer.id}-${slot.startLocal}`,title,fit:forecast.label,signal:{id:`weather-${slot.startLocal}`,title:forecast.label,scope:"local",category:"weather",startAt,endAt,location:placeName,timeBasis:"forecast",source:{id:"open-meteo",name:"Open-Meteo · hourly forecast",url:"https://open-meteo.com/",checkedAt,mode:"cache"},caution:"Forecast for this campaign’s service window, checked now and cached for up to one hour. It can change; no increase in demand is predicted."},proposal:{...proposal,slots:[{...slot,label:title,reason:`${forecast.label} during this offer’s window. ${slot.reason}`}],messages:{...proposal.messages,[offer.id]:`${opening}\n${offer.title} · ${offer.price}.\n${offer.id===dna.profile.signatureOfferId?dna.profile.exampleLine:dna.profile.voice==="refined"?"A little time together. Something good to share.":"Worth a stop. Better with good company."}`}},why:[{label:"The weather cue",text:`${forecast.label} at the place coordinates during this campaign window.`},{label:"What changes",text:"The forecast changes the invitation and the timing context. The offer still comes from your priced menu and Qloo matching; weather adds no bonus to the potential score."}]};
}

/** Bring specific menu matches into the feed even when no public event is needed. */
export function menuEvidenceProposals(context:Context,proposals:Record<string,CampaignPlanProposal>,snapshot:QlooSnapshot,leadingOfferId:string,existing:SourcedOpportunity[]):SourcedOpportunity[] {
  const {dna,offers,evidence,timezone,placeName}=context;
  const source=snapshot.sources.find(s=>s.kind==="places");
  if(snapshot.sources.length!==2||snapshot.sources.some(s=>s.status!=="available")||!source?.retrievedAt)return [];
  const checkedAt=source.retrievedAt;
  const eligible=evidence.filter(e=>e.offerId!==leadingOfferId&&proposals[e.offerId]&&servicePeriod(e)!=="game"&&(e.matchingTastes.length||e.matchingPlaces.length));
  const taste=eligible.filter(e=>e.matchingTastes.length&&servicePeriod(e)==="any").sort((a,b)=>b.matchingTastes.length-a.matchingTastes.length||b.matchingPlaces.length-a.matchingPlaces.length)[0];
  const late=eligible.find(e=>servicePeriod(e)==="late"&&!existing.some(o=>o.signal.category==="rhythm"&&o.proposal.offerId===e.offerId));
  return [taste,late].flatMap(e=>{
    if(!e)return [];
    const offer=offers.find(o=>o.id===e.offerId)!,proposal=proposals[e.offerId],slot=proposal.slots[0],isLate=servicePeriod(offer)==="late";
    const title=isLate?"A late bite from your menu":`Discover ${offer.title.toLowerCase()}`;
    const opening=isLate?dna.profile.voice==="refined"?"A little longer together, before heading home.":"Still out? Make time for a good bite.":dna.profile.voice==="refined"?"Something to discover. A moment to share.":"Try something different on your next visit.";
    return [{id:`menu-match-${offer.id}`,title,fit:e.matchingTastes.map(t=>t.name).join(" · ")||`${e.matchingPlaces.length} matching local references`,signal:{id:`qloo-menu-${offer.id}`,title:isLate?offer.title:e.matchingTastes.map(t=>t.name).join(" · "),scope:"local" as const,category:isLate?"menu" as const:"taste" as const,startAt:localTimeToInstant(slot.startLocal,timezone),endAt:localTimeToInstant(slot.endLocal,timezone),location:`Around ${placeName}`,timeBasis:"menu" as const,source:{id:"qloo-menu-match",name:"Qloo · neighbourhood menu match",url:"https://www.qloo.com/capabilities",checkedAt,mode:"cache" as const},caution:isLate?"The late window is suggested from your menu, not a measured nightlife pattern. Confirm opening hours and stock.":"Neighbourhood tastes matched to a saved menu offer. The service time is a planning suggestion, not a live demand forecast."},proposal:{...proposal,slots:[slot],messages:{...proposal.messages,[offer.id]:`${opening}\n${offer.title} · ${offer.price}.\n${offer.description??""}`}},why:[{label:"The Qloo connection",text:`${e.matchingTastes.length?e.matchingTastes.map(t=>t.name).join(", ")+" in the local taste profile. ":""}${e.matchingPlaces.length} nearby menu references${e.matchingPlaces.length?": "+e.matchingPlaces.slice(0,3).map(p=>p.name).join(", "):""}. These are not identified customers.`},{label:"Your opportunity",text:isLate?"Make your existing late food offer visible outside the afterwork slot, at its saved price. No new event or audience is assumed.":"Give another Qloo-matched offer on your menu a turn in the spotlight, using your own tone and price."}]}];
  });
}
