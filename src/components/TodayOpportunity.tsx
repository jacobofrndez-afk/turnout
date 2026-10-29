"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { CampaignChannelAffinities } from "@/lib/channel-affinity";
import { SourcedOpportunities } from "./SourcedOpportunities";
import type { SourcedOpportunity } from "@/lib/sourced-opportunity";
import type { SourceCoverage } from "@/lib/opportunity-signals";
import { CampaignPlanCard } from "./CampaignPlanCard";
import { Icon } from "./Icon";
import { potentialFor, type OfferEvidence, type PotentialContext, type QlooSnapshot } from "@/lib/daily-potential";
import { type CampaignPlanProposal } from "@/lib/campaign-plan";
import { campaignTimingChoices, type CampaignTimeframe } from "@/lib/campaign-timing";
import type { MenuOffer } from "@/lib/place-dna";
export function TodayOpportunity({merchantId,merchantName,offers,proposals,immediateProposals,initialOfferId,snapshot,evidence,context,signals,aside,opportunities,coverage,channelAffinities}:{channelAffinities?:CampaignChannelAffinities;merchantId:string;merchantName:string;offers:MenuOffer[];proposals:Record<string,CampaignPlanProposal>;immediateProposals:Record<string,CampaignPlanProposal>;initialOfferId:string;snapshot:QlooSnapshot;evidence:OfferEvidence[];context:PotentialContext;signals:ReactNode;aside:ReactNode;opportunities:SourcedOpportunity[];coverage:SourceCoverage[]}) {
  const choicesFor=(mode:CampaignTimeframe,at=context.now)=>campaignTimingChoices(mode,{proposals,immediateProposals,opportunities,evidence,snapshot,context},at);
  const [timeframe,setTimeframe]=useState<CampaignTimeframe>(()=>choicesFor("now").length?"now":choicesFor("ahead").length?"ahead":"evergreen");
  const [initialChoice]=useState(()=>choicesFor(timeframe)[0]??{id:null,proposal:proposals[initialOfferId]});
  const [activeId,setActiveId]=useState<string|null>(initialChoice.id);
  const [proposal,setProposal]=useState(initialChoice.proposal);
  const [selection,setSelection]=useState({offerId:proposal.offerId,startLocal:proposal.slots[0].startLocal,endLocal:proposal.slots[0].endLocal});
  const [pending,setPending]=useState<{offerId?:string;opportunity?:SourcedOpportunity;timeframe?:CampaignTimeframe}|null>(null);
  useEffect(()=>{if(pending)document.getElementById("keep-campaign-edits")?.focus();},[pending]);
  const [revision,setRevision]=useState(0),[dirty,setDirty]=useState(false),[now,setNow]=useState(context.now),[empty,setEmpty]=useState(false);
  useEffect(()=>{setNow(Date.now());const t=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(t);},[]);
  const onSelectionChange=useCallback((next:typeof selection)=>setSelection(current=>current.offerId===next.offerId&&current.startLocal===next.startLocal&&current.endLocal===next.endLocal?current:next),[]);
  const onDirty=useCallback(()=>setDirty(true),[]);
  const active=opportunities.find(o=>o.id===activeId&&o.proposal.offerId===selection.offerId&&o.proposal.slots[0].startLocal===selection.startLocal&&o.proposal.slots[0].endLocal===selection.endLocal);
  const selected=evidence.find(o=>o.offerId===selection.offerId)!;
  const potential=potentialFor(selected,snapshot,context,selection.startLocal,selection.endLocal,now);
  const usual=evidence.find(o=>o.offerId===context.dna.profile.signatureOfferId);
  const matchingTastes=selected.matchingTastes.map(t=>t.name).join(" · ");
  const opportunityPotentials=Object.fromEntries(opportunities.map(o=>{const e=evidence.find(e=>e.offerId===o.proposal.offerId);return [o.id,e?potentialFor(e,snapshot,context,o.proposal.slots[0].startLocal,o.proposal.slots[0].endLocal,now):undefined];}));
  const onSaved=useCallback(()=>setDirty(false),[]);
  const explanation=selected.matchingTastes.length?`Qloo’s neighbourhood profile highlights ${matchingTastes}. These tastes connect with this offer on your menu.`:selected.matchingPlaces.length?`${selected.matchingPlaces.length} nearby places in the Qloo sample carry tags shared by this offer. A local reference, not measured demand.`:"No matching Qloo evidence was returned for this offer. It remains a menu-led idea.";
  const choices=choicesFor(timeframe,context.now);
  const menuProposals=Object.fromEntries(choices.filter(c=>c.id===null).map(c=>[c.proposal.offerId,c.proposal]));
  const ranked=evidence.filter(o=>menuProposals[o.offerId]).map(o=>{const p=menuProposals[o.offerId];return {offer:o,potential:potentialFor(o,snapshot,context,p.slots[0].startLocal,p.slots[0].endLocal,now)};}).sort((a,b)=>(b.potential.score??-1)-(a.potential.score??-1));
  const sourcedChoices=choices.flatMap(c=>{const opportunity=opportunities.find(o=>o.id===c.id);return opportunity?[opportunity]:[];});
  function applySelection(next:CampaignPlanProposal,sourceId:string|null) {
    setEmpty(false);setActiveId(sourceId);setProposal(next);setSelection({offerId:next.offerId,startLocal:next.slots[0].startLocal,endLocal:next.slots[0].endLocal});setRevision(v=>v+1);setDirty(false);setPending(null);
    requestAnimationFrame(()=>document.getElementById("campaign-proposal")?.scrollIntoView({behavior:"smooth",block:"start"}));
  }
  function chooseTimeframe(mode:CampaignTimeframe) {
    if(mode===timeframe)return;
    if(dirty){setPending({timeframe:mode});return;}
    const next=choicesFor(mode,Date.now())[0];
    setTimeframe(mode);setEmpty(!next);
    if(next)applySelection(next.proposal,next.id);
  }
  function choose(id:string) {
    if(dirty){setPending({offerId:id});return;}
    if(menuProposals[id])applySelection(menuProposals[id],null);
  }
  function chooseOpportunity(o:SourcedOpportunity) {
    if(active?.id===o.id)return;
    if(dirty){setPending({opportunity:o});return;}
    applySelection(o.proposal,o.id);
  }
  const proof = <details className="potential-proof"><summary>Potential index · {potential.score??"Unavailable"}{potential.score!==null?"/100":""} · {potential.label}</summary>
    <div className="potential-breakdown">{potential.factors.map(f=><div key={f.label}><div><strong>{f.label}</strong><span>{f.points}/{f.max}</span></div><progress max={f.max} value={f.points}/><p>{f.reason}</p></div>)}</div>
    {selected.matchingPlaces.length>0&&<p>{selected.matchingPlaces.length} of {snapshot.places.length} sampled places share menu tags: {selected.matchingPlaces.slice(0,3).map(p=>`${p.name} (${p.tags.join(", ")})`).join("; ")}.</p>}
    <p className="potential-method">Method v1 · Qloo neighbourhood taste match: 30 points. Matching nearby places: 4 each, up to 20. Your signature offer: 25; another priced offer: 15. Timing: 25 for a compatible local habit, 15 for a nearby event window, or 10 for a planning suggestion. These editorial weights have not been calibrated against campaign results. Qloo affinity values are not success percentages. Missing data or an unsuitable window leaves the index unavailable.</p>
    <div className="potential-freshness"><strong>Source snapshots</strong>{snapshot.sources.map(source=><p key={source.kind}>Qloo · {source.kind==="tastes"?"neighbourhood tastes":"nearby places"} · {source.status==="unavailable"?"unavailable":`${source.count} results`}{source.retrievedAt?` · ${new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:context.timezone}).format(new Date(source.retrievedAt))}`:""}</p>)}<p>Reused for up to seven days. This is not a live crowd count. <a href="https://www.qloo.com/capabilities" target="_blank" rel="noreferrer">About Qloo ↗</a></p></div>
  </details>;
  return <>{pending&&<div className="campaign-switch-notice" role="alert"><div><strong>Keep your edits or try another idea?</strong><p>Previewing {pending.timeframe?(pending.timeframe==="now"?"an action for the next two hours":pending.timeframe==="evergreen"?"a reusable campaign":"a plan ahead"):pending.opportunity?.title??offers.find(o=>o.id===pending.offerId)?.title} will replace this unsaved draft.</p></div><div><button id="keep-campaign-edits" className="quiet-button" onClick={()=>setPending(null)}>Keep editing</button><button className="action-button secondary" onClick={()=>{if(pending.timeframe){const mode=pending.timeframe,next=choicesFor(mode,Date.now())[0];setTimeframe(mode);setEmpty(!next);setPending(null);setDirty(false);if(next)applySelection(next.proposal,next.id);}else if(pending.opportunity)applySelection(pending.opportunity.proposal,pending.opportunity.id);else if(menuProposals[pending.offerId!])applySelection(menuProposals[pending.offerId!],null);}}>Discard edits & preview</button></div></div>}<div className="home-grid today-layout"><div className="home-main">
    <div className="campaign-timeframe" aria-label="Campaign timing"><div role="group" aria-label="Choose when to act"><button type="button" aria-pressed={timeframe==="now"} onClick={()=>chooseTimeframe("now")}><Icon name="clock" size={16}/>Act now</button><button type="button" aria-pressed={timeframe==="ahead"} onClick={()=>chooseTimeframe("ahead")}><Icon name="calendar" size={16}/>Plan ahead</button><button type="button" aria-pressed={timeframe==="evergreen"} onClick={()=>chooseTimeframe("evergreen")}><Icon name="spark" size={16}/>Evergreen</button></div><p>{timeframe==="now"?"Starts within 2 hours · confirm opening hours & stock":timeframe==="evergreen"?"Reusable ideas · review the time for each launch":"A future occasion · a message worth preparing today"}</p></div>
    {empty||!choicesFor(timeframe,context.now).length?<section className="next-move"><h2>{timeframe==="now"?"No eligible offer for the next two hours.":timeframe==="evergreen"?"Add a priced offer to prepare your evergreen campaigns.":"No future proposal is ready yet."}</h2><p>Your menu’s serving times and preparation needs come first. Add an available offer or choose another period.</p><Link className="action-button" href={`/campaigns/from-photo?merchant=${merchantId}`}><Icon name="camera" size={16}/>Create from your menu</Link></section>:<>
    <CampaignPlanCard channelAffinities={channelAffinities} key={`${merchantId}-${revision}`} merchantId={merchantId} merchantName={merchantName} timezone={context.timezone} dna={context.dna} offers={offers} proposal={proposal} now={context.now} onSelectionChange={onSelectionChange} onDirty={onDirty} onSaved={onSaved} recommendationNote={explanation} campaignTitle={active?.intelligence?active.title:timeframe!=="now"?(active?.title??proposal.slots[0].label):undefined} occasion={active} potential={potential} qlooEvidence={{tastes:selected.matchingTastes.map(t=>t.name),places:selected.matchingPlaces.length,placeNames:selected.matchingPlaces.slice(0,3).map(p=>p.name),usual:usual?{title:usual.title,tastes:usual.matchingTastes.length,places:usual.matchingPlaces.length}:undefined,complete:snapshot.sources.length===2&&snapshot.sources.every(s=>s.status==="available"&&s.count>0)}} evidence={proof}/>
    </>}
    <div className="today-alternatives"><SourcedOpportunities channelAffinities={channelAffinities} key={timeframe} offers={offers} potentials={opportunityPotentials} timeframe={timeframe} opportunities={sourcedChoices} selectedId={active?.id??null} onChoose={chooseOpportunity} timezone={context.timezone} dna={context.dna} now={now}/>
      {ranked.length>0&&<details className="potential-compare"><summary>Explore your other offers <span>{ranked.length} on your menu</span></summary><div>{ranked.map(({offer,potential:p})=><button key={offer.offerId} type="button" aria-pressed={selected.offerId===offer.offerId} onClick={()=>choose(offer.offerId)}><span><strong>{offer.title}</strong><small>{offer.price} · {p.label}</small></span><b>{p.score!==null?`${p.score}/100`:"—"}</b>{selected.offerId===offer.offerId?<Icon name="check" size={17}/>:<Icon name="arrow" size={17}/>}</button>)}</div><p className="potential-caption">Each offer is compared at its suggested time. Selecting one prepares a fresh draft.</p></details>}
    </div>
  </div><aside className="home-aside">{aside}</aside></div>
  <details className="today-more"><summary><Icon name="voice" size={18}/><span>More around your place<small>Weather, local habits & source activity</small></span><Icon name="chevron" size={16}/></summary><div>{signals}
    <details className="source-coverage"><summary>Sources & coverage <span>{coverage.filter(s=>s.state==="available").length} available</span></summary><div>{coverage.map(s=><article key={s.name}><strong>{s.url?<a href={s.url} target="_blank" rel="noreferrer">{s.name} ↗</a>:s.name}</strong><small>{s.state==="available"?`Checked ${s.checkedAt??"date unavailable"}`:s.state==="unavailable"?"Currently unavailable":s.state==="disabled"?"Paused":"Not in use"}</small><p>{s.detail}</p></article>)}</div></details>
  </div></details></>;
}
