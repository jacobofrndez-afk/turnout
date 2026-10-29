"use client";
import { useState } from "react";
import { recommendDistribution } from "@/lib/distribution-recommendation";
import { selectChannelAffinity, type CampaignChannelAffinities } from "@/lib/channel-affinity";
import { CHANNELS } from "@/lib/place-dna";
import { ChannelIcon } from "./ChannelIcon";
import { Icon } from "./Icon";
import type { DnaRecord, MenuOffer } from "@/lib/place-dna";
import { localTimeToInstant, planCost, planWindowLabel, validatePlanTiming } from "@/lib/campaign-plan";
import type { OpportunitySignal } from "@/lib/opportunity-signals";
import type { SourcedOpportunity } from "@/lib/sourced-opportunity";

export function SourcedOpportunities({offers,opportunities,potentials,selectedId,onChoose,timezone,dna,now,timeframe,channelAffinities}:{channelAffinities?:CampaignChannelAffinities;timeframe?:"now"|"ahead"|"evergreen";offers:MenuOffer[];opportunities:SourcedOpportunity[];potentials?:Record<string,{score:number|null;label:string}|undefined>;selectedId:string|null;onChoose:(opportunity:SourcedOpportunity)=>void;timezone:string;dna:DnaRecord;now:number}) {
  const [expanded,setExpanded]=useState(false);
  const [filter,setFilter]=useState<"all"|"rhythm"|"qloo">("all");
  const allCandidates=opportunities.filter(o=>o.id!==selectedId);
  const rhythmCount=allCandidates.filter(o=>o.signal.category==="rhythm").length;
  const qlooCount=allCandidates.filter(o=>o.intelligence).length;
  const candidates=filter==="qloo"?allCandidates.filter(o=>o.intelligence):filter==="rhythm"?allCandidates.filter(o=>o.signal.category==="rhythm"):allCandidates;
  const categoryOrder:Record<OpportunitySignal["category"],number>={audience:0,comparison:0,evergreen:0,taste:0,weather:1,culture:1,market:1,menu:2,rhythm:2,calendar:3,trend:3,street:4};
  const firstByCategory=candidates.filter((o,i)=>candidates.findIndex(c=>c.signal.category===o.signal.category)===i).sort((a,b)=>categoryOrder[a.signal.category]-categoryOrder[b.signal.category]);
  const alternatives=[...firstByCategory,...candidates.filter(o=>!firstByCategory.includes(o))];
  if(!allCandidates.length)return null;
  return <section className="other-ideas" aria-labelledby="other-ideas-title">
    <div className="section-title"><h2 id="other-ideas-title">{timeframe==="evergreen"?"More evergreen campaigns":"Other ideas"}</h2><span>{timeframe==="now"?"The next 2 hours":timeframe==="evergreen"?"Ready to reuse":"Today & the week ahead"}</span></div>
    {(qlooCount>0||rhythmCount>0||filter!=="all")&&<div className="idea-filters" role="group" aria-label="Filter campaign ideas"><button type="button" aria-pressed={filter==="all"} onClick={()=>{setFilter("all");setExpanded(false);}}>All ideas</button>{qlooCount>0&&<button type="button" aria-pressed={filter==="qloo"} onClick={()=>{setFilter("qloo");setExpanded(true);}}><Icon name="spark" size={13}/>Qloo picks <span>{qlooCount}</span></button>}{timeframe!=="evergreen"&&<button type="button" aria-pressed={filter==="rhythm"} onClick={()=>{setFilter("rhythm");setExpanded(true);}}><Icon name="clock" size={13}/>Local rhythms <span>{rhythmCount}</span></button>}</div>}
    {filter==="rhythm"&&!alternatives.length&&<p className="plan-footnote">No other matching rhythm in this window. Your selected campaign stays above.</p>}
    <div>{(expanded?alternatives:alternatives.slice(0,4)).map(o=>{
      const s=o.signal,slot=o.proposal.slots[0];
      let expired=false;try{validatePlanTiming(slot.startLocal,slot.endLocal,timezone,dna.profile.leadMinutes,now);}catch{expired=true;}
      const channelContext={dna:dna.profile,offer:offers.find(f=>f.id===o.proposal.offerId)!,startLocal:slot.startLocal,timezone,now,category:s.category,distanceKm:s.distanceKm,channelAffinity:selectChannelAffinity(channelAffinities,o.proposal.offerId,o.intelligence?.audience?.id)};
      const distribution=recommendDistribution(channelContext),paid=distribution.channels.includes("geofenced_ad");
      const primary=paid?distribution.promotion.platform:distribution.channels[0];
      const format=paid?"Local ad":distribution.strategy.find(c=>c.channel===primary)!.format;
      const when=planWindowLabel(localTimeToInstant(slot.startLocal,timezone),localTimeToInstant(slot.endLocal,timezone),timezone);
      return <button key={o.id} className="idea-row" type="button" disabled={expired} onClick={()=>onChoose(o)} aria-label={`Preview campaign: ${o.title}`}>
        <span className={`idea-icon scope-${s.scope}`}><Icon name={s.scope==="global"?"calendar":s.category==="evergreen"?"spark":s.category==="weather"?"rain":s.category==="rhythm"?"clock":s.category==="taste"?"spark":s.category==="menu"?"menu":s.category==="market"?"coffee":s.category==="culture"?"spark":"pin"}/></span>
        <span className="idea-copy"><strong>{o.title}</strong><small>{s.category==="evergreen"?"Reusable":s.category==="audience"?"Qloo audience":s.category==="comparison"?"Qloo comparison":s.category==="taste"?"Local taste":s.category==="menu"?"Menu idea":s.category==="rhythm"?"Local habit":s.category==="weather"?"Weather":s.category==="culture"?"Culture":s.category==="market"?"Local market":s.scope==="global"?"Global occasion":"On your streets"} · {s.title}</small><span>{expired?"Window passed · refresh Today":when}{s.timeConflict?" · Check event hours":""}</span><span className="idea-channel"><ChannelIcon channel={primary}/>{CHANNELS[primary]} · {format}</span></span>
        <span className="idea-price idea-potential" aria-label={`Potential ${potentials?.[o.id]?.score??"unavailable"}. ${potentials?.[o.id]?.label??""}`}><b>{potentials?.[o.id]?.score??"—"}{potentials?.[o.id]?.score!=null&&<i>/100</i>}</b><small>{paid?`${planCost(distribution.channels,distribution.budgetUsd).label} media`:"Organic draft"}</small></span><Icon name="arrow" size={17}/>
      </button>;
    })}</div>
    {alternatives.length>4&&<button className="other-ideas-toggle text-link" type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?"Show fewer ideas":`See ${alternatives.length-4} more ${alternatives.length===5?"idea":"ideas"}`}<Icon name="chevron" size={14}/></button>}
  </section>;
}
