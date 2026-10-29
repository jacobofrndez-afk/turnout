"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { QlooCampaignEvidence } from "./QlooCampaignEvidence";
import { QlooDecision, type QlooDecisionData } from "./QlooDecision";
import { CampaignJourney } from "./CampaignJourney";
import { CampaignChannelPreview } from "./CampaignChannelPreview";
import { CampaignDestinations } from "./CampaignDestination";
import { ChannelIcon } from "./ChannelIcon";
import { CampaignDistribution } from "./CampaignDistribution";
import type { LocalPromotion } from "@/lib/local-promotion";
import { CampaignVisual } from "./CampaignVisual";
import { CampaignEconomics } from "./CampaignEconomics";
import { exampleRevenueScenario, type CampaignVisual as Visual, type RevenueScenario } from "@/lib/campaign-creative";
import { recommendDistribution } from "@/lib/distribution-recommendation";
import { selectChannelAffinity, type CampaignChannelAffinities } from "@/lib/channel-affinity";
import { assertOfferWindow } from "@/lib/offer-window";
import { CHANNELS, VOICES, type DnaRecord, type MenuOffer } from "@/lib/place-dna";
import { planCost, planWindowLabel, campaignChannelOptions, localTimeToInstant, validatePlanTiming, type CampaignPlanProposal, type PlanChannel, type SavedCampaignPlan } from "@/lib/campaign-plan";
import type { SourcedOpportunity } from "@/lib/sourced-opportunity";
const channelNotes: Record<PlanChannel,string> = { tiktok:"Photo or short video · manual",snapchat:"Story · photo or video", instagram:"Feed caption · add your photo",facebook:"Post on your business Page",storefront:"Write outside",google_post:"Copy to your listing",whatsapp:"Share with opted-in regulars",geofenced_ad:"Ad account setup required" };
export function CampaignPlanCard({ merchantId, merchantName, timezone, dna, offers, proposal, now, existing, onSelectionChange, onDirty, recommendationNote, campaignTitle, occasion, potential, qlooEvidence, evidence, onSaved, channelAffinities }: { channelAffinities?:CampaignChannelAffinities; merchantId:string; merchantName:string; timezone:string; dna:DnaRecord; offers:MenuOffer[]; proposal:CampaignPlanProposal; now:number; existing?: {id:string; plan:SavedCampaignPlan; offerId:string; message:string; dnaVersion:number}; onSelectionChange?:(selection:{offerId:string;startLocal:string;endLocal:string})=>void; onDirty?:()=>void; recommendationNote?:string; campaignTitle?:string; occasion?:SourcedOpportunity; potential?:{score:number|null;label:string}; qlooEvidence?:QlooDecisionData; evidence?:ReactNode; onSaved?:()=>void }) {
  const router=useRouter(); const requestId=useRef<string | null>(null);
  const [offerId,setOfferId]=useState(existing?.offerId ?? proposal.offerId);
  const [pendingOfferId,setPendingOfferId]=useState<string|null>(null);
  const [message,setMessage]=useState(existing?.message ?? proposal.messages[proposal.offerId]);
  const [visual,setVisual]=useState<Visual|undefined>(existing?.plan.visual);
  const [revenue,setRevenue]=useState<RevenueScenario>(existing?.plan.revenueScenario ?? exampleRevenueScenario);
  const [edited,setEdited]=useState(!!existing); const [slotId,setSlotId]=useState(proposal.slots[0].id);
  const [startLocal,setStart]=useState(proposal.slots[0].startLocal), [endLocal,setEnd]=useState(proposal.slots[0].endLocal);
  const [customDistribution,setCustomDistribution]=useState<{channels:PlanChannel[];promotion:LocalPromotion;budgetUsd:number}|null>(existing?{channels:existing.plan.channels.filter(c=>campaignChannelOptions(dna.profile.channels).includes(c)),promotion:existing.plan.localPromotion??{platform:"facebook",radiusKm:2},budgetUsd:existing.plan.mediaBudgetUsd}:null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState<"approved"|"saved"|null>(null); const [saved,setSaved]=useState<{id:string;decision:"approved"|"saved"} | null>(null);
  const [clockNow,setClockNow]=useState(now);
  const reasonRef=useRef<HTMLDetailsElement>(null);
  const cardRef=useRef<HTMLElement>(null);
  const [step,setStep]=useState<1|2>(existing ? 2 : 1);
  function goToStep(next:1|2){setStep(next);requestAnimationFrame(()=>{cardRef.current?.scrollIntoView({behavior:"smooth",block:"start"});cardRef.current?.focus({preventScroll:true});});}
  function showEvidence(){if(reasonRef.current){reasonRef.current.open=true;const calculation=reasonRef.current.querySelector<HTMLDetailsElement>(".potential-proof");if(calculation)calculation.open=true;reasonRef.current.querySelector("summary")?.focus();reasonRef.current.scrollIntoView({behavior:"smooth",block:"nearest"});}}

  useEffect(()=>{onSelectionChange?.({offerId,startLocal,endLocal});},[offerId,startLocal,endLocal,onSelectionChange]);
  useEffect(()=>{setClockNow(Date.now());const timer=setInterval(()=>setClockNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
  const offer=offers.find(o=>o.id===offerId)!; const slot=proposal.slots.find(s=>s.id===slotId);
  const channelAffinity=selectChannelAffinity(channelAffinities,offerId,occasion?.proposal.offerId===offerId?occasion.intelligence?.audience?.id:undefined);
  const distributionRecommendation=recommendDistribution({dna:dna.profile,offer,startLocal,timezone,now:clockNow,category:occasion?.signal.category,distanceKm:occasion?.signal.distanceKm,hasVisual:!!visual,channelAffinity});
  const channelStrategy=distributionRecommendation.strategy;
  const channels=customDistribution?.channels??distributionRecommendation.channels;
  const localPromotion=customDistribution?.promotion??distributionRecommendation.promotion;
  const budget=customDistribution?.budgetUsd??distributionRecommendation.budgetUsd;
  function updateDistribution(patch:Partial<NonNullable<typeof customDistribution>>){setCustomDistribution(current=>({...distributionRecommendation,...current,...patch}));}
  function setChannels(value:PlanChannel[]|((current:PlanChannel[])=>PlanChannel[])){updateDistribution({channels:typeof value==="function"?value(channels):value});}
  function setLocalPromotion(value:LocalPromotion){updateDistribution({promotion:value});}
  function setBudget(value:number){updateDistribution({budgetUsd:value});}
  const suggestedChannels=channelStrategy.filter(c=>distributionRecommendation.channels.includes(c.channel));
  const customChannels=channels.length!==suggestedChannels.length||channels.some(c=>!suggestedChannels.some(r=>r.channel===c));
  const cost=planCost(channels,budget); const paid=channels.includes("geofenced_ad");
  let timingError="", windowLabel="Choose a time";
  try { const timing=validatePlanTiming(startLocal,endLocal,timezone,dna.profile.leadMinutes,clockNow); windowLabel=planWindowLabel(timing.start,timing.end,timezone); assertOfferWindow(offer.description,startLocal,endLocal); }
  catch(e){ timingError=e instanceof Error?e.message:"Choose a valid time."; }
  let publicationOpen=false;
  try { publicationOpen=localTimeToInstant(endLocal,timezone)>clockNow; } catch { /* Invalid dates cannot be shared. */ }
  const finalMessage=message.includes(windowLabel)?message.trim():`${message.trim()}\n${windowLabel}`;
  function changed(){setError("");requestId.current=null;onDirty?.();}
  function replaceOffer(id:string){changed();setOfferId(id);setMessage(proposal.messages[id]);setEdited(false);setPendingOfferId(null);}
  function chooseSlot(value:string){changed();setSlotId(value);const s=proposal.slots.find(s=>s.id===value);if(s){setStart(s.startLocal);setEnd(s.endLocal);}}
  async function decide(decision:"approved"|"saved") {
    setError("");
    try { validatePlanTiming(startLocal,endLocal,timezone,dna.profile.leadMinutes,Date.now()); assertOfferWindow(offer.description,startLocal,endLocal); }
    catch(e){setError(e instanceof Error?e.message:"Choose a later time.");return;}
    if(!channels.length){setError("Choose at least one channel.");return;}
    if(message.trim().length<3){setError("Add a message before deciding.");return;}
    if(paid && (!Number.isInteger(budget)||budget<10||budget>dna.profile.dailyBudgetUsd)){setError(`Choose an ad budget from US$10 to US$${dna.profile.dailyBudgetUsd}.`);return;}
    setBusy(decision);
    try {
      requestId.current ??= crypto.randomUUID();
      const res=await fetch(`/api/merchants/${merchantId}/campaign-plan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:requestId.current,version:dna.version,planId:existing?.id,revision:existing?.plan.revision,offerId,offerPrice:offer.price,message,startLocal,endLocal,channels,mediaBudgetUsd:cost.mediaBudgetUsd,visual,revenueScenario:revenue,localPromotion:paid?localPromotion:undefined,decision})});
      const result=await res.json().catch(()=>({error:"The response could not be read. Try again; your edits are still here."}));
      if(!res.ok)throw new Error(result.error ?? "Could not save. Please try again.");
      setSaved(result);onSaved?.();router.refresh();
    } catch(e){setError(e instanceof Error?e.message:"Could not save. Your edits are still here.");}finally{setBusy(null);}
  }
  if(saved) return <section ref={cardRef} tabIndex={-1} className="ready-plan plan-confirmed campaign-flow" aria-label="Campaign decision">
    <CampaignJourney step={saved.decision==="approved"?3:2}/>
    <div className="decision-outcome" role="status"><span className="icon-tile"><Icon name="check"/></span><p className="overline">{saved.decision==="approved"?"Your decision is recorded":"Pick up here later"}</p><h2>{saved.decision==="approved"?"Approved. Now publish.":"Your draft is saved."}</h2><p>{saved.decision==="approved"?"One last step: publish in your chosen channels.":"Your message, settings and budget are kept together. Review them when you’re ready."}</p></div>
    <div className="plan-confirmation-facts"><p>{offer.title} · {windowLabel}</p><p>{channels.map(c=>CHANNELS[c]).join(" · ")}</p><strong>{cost.label} planned media budget</strong><span>Nothing has been published, scheduled for delivery or charged.</span></div>
    {paid&&<p className="plan-footnote">Paid plan: {CHANNELS[localPromotion.platform]} · within {localPromotion.radiusKm} km of {merchantName}. Ad setup and platform review still required.</p>}
    {visual&&<CampaignVisual visual={visual}/>}
    <CampaignEconomics price={offer.price} scenario={revenue} spend={cost.label}/>
    {saved.decision==="approved"&&<CampaignDestinations localPromotion={paid?localPromotion:undefined} channels={channels} merchantId={merchantId} merchantName={merchantName} text={finalMessage} validTiming={publicationOpen}/>}
    <div className="plan-confirmation-actions"><Link className="action-button" href={`/campaigns/quick/${saved.id}?merchant=${merchantId}`}>{saved.decision==="approved"?"Open publication checklist":"Return to this draft"}<Icon name="arrow" size={17}/></Link><Link className="text-link" href={`/campaigns?merchant=${merchantId}`}>All campaigns</Link></div>
    <p className="plan-footnote">{saved.decision==="approved"?"Publication is manual. Check the live post in each channel; opening a channel does not publish it. Actual results are not connected yet.":"Find this draft in Campaigns or Calendar. It still needs your approval before the publication step."}</p>
  </section>;
  return <section ref={cardRef} tabIndex={-1} id="campaign-proposal" className={`ready-plan campaign-focus campaign-flow flow-step-${step}`} aria-labelledby="ready-plan-title">
    <CampaignJourney step={step} onStepChange={existing?undefined:goToStep}/>
    <div className="focus-kicker"><span><Icon name="spark" size={16}/>{step===2?"Review & personalise":qlooEvidence?.complete&&((qlooEvidence.tastes?.length??0)>0||qlooEvidence.places>0)?"Prepared with Qloo insights":"Prepared from your menu"}</span></div>
    {existing && existing.dnaVersion !== dna.version && <p className="notice">Your DNA changed since this plan was saved. Review the message and channel choices before deciding.</p>}
    {potential&&<button type="button" className="campaign-potential" onClick={showEvidence} aria-label={`Campaign potential ${potential.score??"unavailable"}. See evidence and calculation`}>
      <span className="campaign-potential-number">{potential.score??"—"}{potential.score!==null&&<small>/100</small>}</span>
      <span className="campaign-potential-copy"><strong>Campaign potential</strong><span>{potential.label}</span><small>Qloo fit · DNA · timing. Not a sales forecast.</small></span>
      <span className="campaign-potential-action">See why<Icon name="arrow" size={16}/></span>
    </button>}
    <div className="focus-heading"><h2 id="ready-plan-title">{offerId===proposal.offerId&&campaignTitle?campaignTitle:offer.title}</h2><span>{offer.price}</span></div>
    {occasion ? <p className="focus-occasion"><Icon name={occasion.signal.scope==="global"?"calendar":"pin"} size={14}/>{occasion.signal.title}{occasion.signal.distanceKm!==undefined&&<span> · {occasion.signal.approximate?"≈ ":""}{occasion.signal.distanceKm.toFixed(1)} km away</span>}</p> : campaignTitle ? <p className="focus-occasion">{offer.title}</p> : null}
    {occasion?.signal.timeConflict&&<p className="notice">Event hours need confirmation. Check the source before sharing.</p>}
    <p className="campaign-service-time"><Icon name="clock" size={15}/>{windowLabel}</p>
    {occasion?.intelligence&&<QlooCampaignEvidence data={occasion.intelligence}/>}
    <fieldset disabled={!!busy} className="plan-controls">

      {step===1 ? <>
        <div className="campaign-creative-grid"><CampaignVisual visual={visual} onChange={value=>{changed();setVisual(value);}}/>
        <div className="campaign-first-message"><div><label htmlFor={`prepared-message-${merchantId}`}>{edited?"Your message":"Your prepared message"}</label><span>Edit to make it yours</span></div><textarea id={`prepared-message-${merchantId}`} aria-label="Campaign message" rows={3} maxLength={1200} value={message} onChange={e=>{changed();setMessage(e.target.value);setEdited(true);}}/></div></div>
      </> : <>
        <CampaignChannelPreview localPromotion={paid?localPromotion:undefined} visual={visual} showPublishingActions={false} channels={channels} merchantId={merchantId} onChannelsChange={value=>{changed();setChannels(value);}} merchantName={merchantName} message={message} windowLabel={windowLabel} budget={cost.mediaBudgetUsd} edited={edited} validTiming={!timingError} onMessageChange={value=>{changed();setMessage(value);setEdited(true);}}/>
        <CampaignVisual preview={false} visual={visual} onChange={value=>{changed();setVisual(value);}}/>
      </>}
      <CampaignDistribution now={clockNow} timezone={timezone} onReset={()=>{changed();setCustomDistribution(null);}} merchantId={merchantId} merchantName={merchantName} dna={dna.profile} recommendation={distributionRecommendation} channels={channels} onChannelsChange={value=>{changed();setChannels(value);}} promotion={localPromotion} onPromotionChange={value=>{changed();setLocalPromotion(value);}} budget={budget} onBudgetChange={value=>{changed();setBudget(value);}}/>
      <CampaignEconomics price={offer.price} scenario={revenue} spend={cost.label} onChange={value=>{changed();setRevenue(value);}}/>
      <details className="plan-adjust"><summary><Icon name="settings" size={15}/>Edit plan <span>Offer, timing, channels & budget</span></summary>
        <label className="plan-offer-label">The offer<select value={offerId} onChange={e=>{const id=e.target.value;if(edited){setPendingOfferId(id);return;}replaceOffer(id);}}>{offers.filter(o=>proposal.messages[o.id]).map(o=><option key={o.id} value={o.id}>{o.title} · {o.price}</option>)}</select></label>
        {pendingOfferId&&<div className="offer-switch-notice" role="alert"><p>Replace your edited message with the draft for {offers.find(o=>o.id===pendingOfferId)?.title}?</p><div><button type="button" className="quiet-button" onClick={()=>setPendingOfferId(null)}>Keep my message</button><button type="button" className="text-link" onClick={()=>replaceOffer(pendingOfferId)}>Replace message <Icon name="arrow" size={14}/></button></div></div>}
        <div className="plan-timing"><div className="plan-label-row"><label htmlFor={`plan-time-${merchantId}`}><Icon name="clock" size={16}/>When to run it</label><span>{dna.profile.leadMinutes} min to prepare</span></div><select id={`plan-time-${merchantId}`} value={slotId} onChange={e=>chooseSlot(e.target.value)}>{proposal.slots.map((s,i)=><option key={s.id} value={s.id}>{i===0?"Suggested · ":""}{s.label}</option>)}<option value="custom">Choose my own time</option></select><details className="plan-time-edit" open={slotId==="custom"}><summary>Adjust date & time</summary><div className="plan-date-fields"><label>Starts<input type="datetime-local" value={startLocal} onInput={e=>{changed();setSlotId("custom");setStart(e.currentTarget.value);}}/></label><label>Ends<input type="datetime-local" value={endLocal} onInput={e=>{changed();setSlotId("custom");setEnd(e.currentTarget.value);}}/></label></div></details><p className="plan-footnote">Local time in {timezone.replaceAll("_"," ")}. Confirm that you can serve this offer then.</p></div>
        {step===2&&<fieldset className="plan-channels"><legend><Icon name="campaign" size={16}/>Channels for this campaign</legend><div>{campaignChannelOptions(dna.profile.channels).map(channel=><label key={channel} className={channels.includes(channel)?"is-selected":""}><input type="checkbox" checked={channels.includes(channel)} onChange={e=>{changed();setChannels(cs=>e.target.checked?[...cs,channel]:cs.filter(c=>c!==channel));}}/><ChannelIcon channel={channel}/><span><strong>{CHANNELS[channel]}</strong><small>{channelNotes[channel]}</small></span></label>)}</div><p className="plan-footnote"><Link href={`/dna?merchant=${merchantId}&step=3`} target="_blank">Set your usual channels</Link> · These choices apply to this campaign.</p></fieldset>}
        <section className="plan-cost" aria-label="Campaign cost"><div><p>Media budget · this campaign</p><strong>{cost.label}</strong></div><div>{paid&&<label>Ad budget · US$<input type="number" min={10} max={dna.profile.dailyBudgetUsd} step={1} value={budget} onChange={e=>{changed();setBudget(Number(e.target.value));}}/></label>}<p>{cost.description}</p></div><small>{paid?`Within your US$${dna.profile.dailyBudgetUsd}/day DNA ceiling. `:""}Stock, staff time and provider fees are not estimated. Nothing is charged here.</small></section>
      </details>
    </fieldset>
    {timingError&&<p className="plan-inline-error" role="status">{timingError} {step===1?"Open “Edit plan” to choose another window.":"Open “Edit plan” to choose another window."}</p>}
    {error&&<p className="plan-inline-error" role="alert">{error}</p>}
    {step===2&&<div className="decision-recap"><div><Icon name="check" size={16}/><span>What you’re approving</span></div><p>{offer.title} · {channels.length} {channels.length===1?"channel":"channels"} · <strong>{cost.label} media budget</strong></p><small>{windowLabel}. Product costs and provider fees are not estimated.</small></div>}
    <div className="plan-decision"><div>
      {step===1?<button type="button" className="action-button" disabled={!!busy} onClick={()=>goToStep(2)}>Review this campaign <Icon name="arrow" size={17}/></button>:<button className="action-button" disabled={!!busy||!!timingError||!channels.length||!!pendingOfferId} onClick={()=>decide("approved")}>{busy==="approved"?"Saving decision…":"Approve & continue"}<Icon name="arrow" size={17}/></button>}
      <button className="plan-save-later" disabled={!!busy||!!timingError||!channels.length||!!pendingOfferId} onClick={()=>decide("saved")}>{busy==="saved"?"Saving…":"Save for later"}</button>
    </div><p>{step===1?"Next: check your channel previews, then decide.":"Next: publication instructions for each channel. Nothing is sent or charged here."}</p></div>
    <details ref={reasonRef} className="plan-reason focus-proof"><summary>Why this campaign? <span>{potential?"Sources · Qloo · your DNA":"Your DNA · timing"}</span></summary>
      {qlooEvidence&&<QlooDecision data={qlooEvidence} title={offer.title} isSignature={offerId===dna.profile.signatureOfferId}/>}
    <section className="channel-strategy" aria-label="Channel recommendation"><div className="channel-strategy-heading"><strong>{customChannels?"Your channel plan":"Recommended for this opportunity"}</strong>{customChannels&&<button type="button" className="text-link" disabled={!!busy} onClick={()=>{changed();setCustomDistribution(null);}}>Use recommendation</button>}</div>{(customChannels?channels.map(channel=>channelStrategy.find(c=>c.channel===channel)!):suggestedChannels).map((c,i)=><div className="channel-strategy-row" key={c.channel}><ChannelIcon channel={c.channel}/><div><p><strong>{CHANNELS[c.channel]}</strong><span>{c.format}{i===0&&!customChannels?" · Lead channel":""}</span></p><p>{c.reason}</p><small>{c.requirement}</small></div></div>)}<details><summary>Why not the other channels?</summary>{channelStrategy.filter(c=>!channels.includes(c.channel)).map(c=><p key={c.channel}><strong>{CHANNELS[c.channel]}</strong> · {c.reason} <span>{c.requirement}.</span></p>)}<small>Qloo platform-brand affinity is combined with timing, your goal and the content to prepare. These are planning choices, not measured ROI rankings.</small></details></section>
      {occasion&&<><p><strong>{occasion.signal.category==="evergreen"?"The campaign purpose:":"The occasion:"}</strong> {occasion.signal.title}. <a href={occasion.signal.source.url} target="_blank" rel="noreferrer">{occasion.signal.source.name} ↗</a></p><p>{occasion.signal.caution}</p><dl className="focus-reasons">{occasion.why.map(w=><div key={w.label}><dt>{w.label}</dt><dd>{w.text}</dd></div>)}</dl><p className="plan-footnote">{occasion.signal.category==="evergreen"?"Prepared from your saved menu":"Source "+(occasion.signal.source.mode==="reference"?"verified":"retrieved")}: {occasion.signal.source.checkedAt} · {occasion.signal.location}</p></>}
      {recommendationNote && <p><strong>What Qloo adds:</strong> {recommendationNote}</p>}
      <p><strong>Your DNA:</strong> {VOICES[dna.profile.voice]}. {offerId===dna.profile.signatureOfferId?"Your signature offer.":"Your selected menu offer."} {dna.profile.leadMinutes} min to prepare. {dna.profile.boundaries}</p>
      <p><strong>The timing:</strong> {slot?.reason ?? "Your chosen window. Confirm your opening hours and offer availability."} {slot?.source}</p>
      {evidence}
      <p className="plan-footnote">The potential index helps prioritise ideas. It does not predict visits, sales or return on spend.</p>
    </details>
  </section>;
}
