"use client";
import Link from 'next/link';
import { useEffect,useState,useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { campaignEntryView,campaignWorkflowHref } from '@/lib/campaign-workflow';
import { CampaignEditor } from './CampaignEditor';
import { ChannelStudio } from './ChannelStudio';
import { campaignSpend, campaignMaterials, channelMaterial, channelCostLabel } from '@/lib/channel-kit';
import { type AgentOpportunity,type AgentReview,type AgentWorkspace,receiptLabel } from '@/lib/agent-workspace';
import { CHANNELS } from '@/lib/place-dna';
import { planWindowLabel,localTimeToInstant } from '@/lib/campaign-plan';
import { recommendDistribution } from '@/lib/distribution-recommendation';
import { CampaignVisual } from './CampaignVisual';
import { ChannelIcon } from './ChannelIcon';
import { ChannelRecommendationReason } from './ChannelRecommendationReason';
import { CopyText } from './CopyText';
import { Icon } from './Icon';
import { LocalityEvidence } from "./LocalityEvidence";
import { CampaignBoard } from './CampaignBoard';
import { fromDoor } from '@/lib/distance';
import { firstSentences } from '@/lib/text';

import { useCampaignMotion, type CampaignView } from './useCampaignMotion';
const campaignSteps: {view:CampaignView;label:string}[] = [
 {view:'proposal',label:'Proposal'}, {view:'personalize',label:'Personalize'},
 {view:'review',label:'Review'}, {view:'materials',label:'Materials'},
];
export function AgentCampaign({merchantId,event,initial,writerConnected,entry='saved',context='workflow'}:{merchantId:string;event:AgentOpportunity;initial?:AgentWorkspace;writerConnected:boolean;entry?:CampaignView|'saved';context?:'today'|'workflow'}){
 const [workspace,setWorkspace]=useState(initial),[review,setReview]=useState<AgentReview|undefined>(initial?.review);
 const [working,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[helpLink,setHelpLink]=useState('');
 const router=useRouter();
 const [navigating,startNavigation]=useTransition();
 const busy=working||navigating;
 const workflow=context==='workflow';
 const {view,revision,moving,goTo,section,shell,content,heading:stepHeading,steps}=useCampaignMotion(entry==='saved'?campaignEntryView(initial?.status??'drafted'):entry);
 const [dirty,setDirty]=useState(false);
 const checking=view==='review';
 useEffect(()=>{
  if(workflow&&workspace)window.history.replaceState(null,'',campaignWorkflowHref(workspace.id,merchantId,view));
 },[workflow,workspace?.id,merchantId,view]);
 function openWorkflow(next:AgentWorkspace,target:CampaignView){
  startNavigation(()=>router.push(campaignWorkflowHref(next.id,merchantId,target)));
 }
 const locked=!!workspace&&workspace.status!=='drafted';
 useEffect(()=>{if(!dirty)return;const guard=(e:BeforeUnloadEvent)=>{e.preventDefault();};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 const update=(next:Partial<AgentReview>)=>{setReview(r=>r?{...r,...next}:r);setDirty(true);setNotice('');};
 async function request(url:string,method:string,body?:unknown,nextView?:CampaignView){
  setBusy(true);setError('');setNotice('');setHelpLink('');
  try{
   const response=await fetch(url,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
   const data=await response.json().catch(()=>({error:response.status===429?'Please wait a minute before trying again.':'The request could not finish. Your edits are still here.'}));
   if(!response.ok){if(data.href)setHelpLink(data.href);throw new Error(data.error??'Please try again.');}
   if(!data.workspace)throw new Error('No completed campaign was returned. Nothing was sent.');
   const next=data.workspace as AgentWorkspace;
   const target=nextView?campaignEntryView(next.status,nextView):next.status==='drafted'&&!next.copiedFromId?'proposal':campaignEntryView(next.status);
   if(!workflow&&(data.href||nextView&&nextView!=='proposal')){
    // A reused receipt needs a separate editable copy before entering Personalize.
    if(!(nextView==='personalize'&&next.status!=='drafted'))openWorkflow(next,target);
    return next;
   }
   const apply=()=>{setWorkspace(next);setReview(next.review);setDirty(false);};
   if(method==='PATCH')apply();
   else await goTo(target,apply);
   if(method==='PATCH')setNotice('Your changes are saved. Nothing has been sent.');
   return data.workspace as AgentWorkspace;
  }catch(e){setError(e instanceof Error?e.message:'Please try again.');}
  finally{setBusy(false);}
 }
 async function openStep(target:CampaignView){
  if(busy||moving)return;
  setError('');
  if(target==='proposal'){goTo(target);return;}
  if(target==='materials'&&workspace){if(workflow)goTo(target);else openWorkflow(workspace,target);return;}
  if(!workspace){
   if(!writerConnected){setError('The campaign writer is not connected yet.');return;}
   const prepared=await request('/api/campaigns/prepare','POST',{merchant:merchantId,event:event.id},target);
   if(prepared&&prepared.status!=='drafted'&&target==='personalize')await request(`/api/campaigns/${prepared.id}/versions`,'POST',undefined,'personalize');
   return;
  }
  if(target==='personalize'&&locked){
   if(workspace.status==='approved'){setError('Your materials are still being prepared. Open Materials and refresh the status before editing a copy.');return;}
   await request(`/api/campaigns/${workspace.id}/versions`,'POST',undefined,'personalize');return;
  }
  if(workflow)goTo(target);else openWorkflow(workspace,target);
 }
 const distribution=workspace&&review?recommendDistribution({dna:workspace.dna.profile,offer:workspace.offer,startLocal:review.startLocal,timezone:workspace.timezone,now:Date.now(),category:'culture',hasVisual:!!review.visual,channelAffinity:workspace.distribution.channelAffinity,distanceKm:event.distanceKm}):undefined;
 const lead=review?.channels.find(c=>c!=='storefront'&&c!=='geofenced_ad');
 const spend=review?campaignSpend(review):undefined;
 const paid=!!spend?.media;
 let when='Review the campaign time';
 try{if(review&&workspace)when=planWindowLabel(localTimeToInstant(review.startLocal,workspace.timezone),localTimeToInstant(review.endLocal,workspace.timezone),workspace.timezone);}catch{}
 const step=campaignSteps.findIndex(s=>s.view===view)+1;
 const board=workspace&&review?{campaignId:workspace.id,merchantId,merchantName:workspace.merchantName,message:review.chalkboard,offerTitle:workspace.offer.title,price:workspace.offer.price??'',startLocal:review.startLocal,endLocal:review.endLocal,timezone:workspace.timezone}:undefined;
 const boardReady=workspace?.receipts.some(r=>r.channel==='storefront'&&r.status==='ready');
 const allReady=workspace?.status==='prepared';
 const materials=review&&workspace?campaignMaterials(review,workspace.merchantName,when):'';
 const channelReason=distribution&&review&&workspace?<ChannelRecommendationReason recommendation={distribution} primary={lead} prepared={review.channels.length===distribution.channels.length&&review.channels.every(c=>distribution.channels.includes(c))} paid={paid} now={Date.now()} timezone={workspace.timezone}/>:null;
 const planFacts=review&&<div className="agent-plan-summary"><div><Icon name="clock" size={18}/><span><small>Campaign window</small><strong>{when}</strong></span></div><div><Icon name="wallet" size={18}/><span><small>{spend?.ceiling?'Total planned ceiling':'Media budget'}</small><strong>{spend?.ceiling?`US$${spend.ceiling} max`:'No paid media planned'}</strong></span></div></div>;
 const selectedChannels=review&&<div className="agent-selected-channels" aria-label="Selected channels">{review.channels.map(channel=><span key={channel}><ChannelIcon channel={channel}/>{CHANNELS[channel]}</span>)}</div>;
 return <section ref={section} className={`agent-campaign ${workflow?'agent-workflow':''}`} aria-label="Your prepared campaign" aria-busy={busy||moving}>
  <ol ref={steps} className="agent-steps" aria-label="Campaign progress"><li aria-hidden="true" className="agent-steps-progress"/><li aria-hidden="true" className="agent-steps-thumb"/>{campaignSteps.map(({view:target,label},i)=><li key={target} aria-current={view===target?'step':undefined} className={step>i+1?'is-complete':''}><button type="button" disabled={busy||moving||(target==='materials'&&!locked)} onClick={()=>void openStep(target)} aria-current={view===target?'step':undefined}><span>{step>i+1?<Icon name="check" size={12}/>:i+1}</span>{label}</button></li>)}</ol>
  {busy&&<p className="agent-busy-status" role="status">{!workspace?'Reading Qloo and preparing your campaign…':locked?'Opening your editable copy…':'Saving your campaign…'}</p>}
  {error&&(!workflow||view==='proposal'||view==='materials')&&<p className="plan-inline-error" role="alert">{error}{helpLink&&<> <Link href={helpLink}>Review opportunity →</Link></>}</p>}
  {!workspace&&!busy&&<p className="agent-note">Personalize or Review will prepare your campaign first.</p>}
  <div ref={shell} className="agent-step-shell"><div ref={content} className="agent-step-content" key={revision} inert={moving}>
  <header className="agent-stage-heading"><span className="overline">Step {step} of 4{view==='proposal'&&workspace?' · Prepared for your place':''}</span><h2 ref={stepHeading} tabIndex={-1}>{view==='proposal'?workspace?'Your campaign, prepared.':'Start with a local opportunity.':view==='personalize'?'Add your own touch.':view==='review'?locked?'Review your saved campaign.':'Everything ready for your approval.':allReady?'Your materials are ready.':'Check your campaign materials.'}</h2><p>{view==='proposal'?workspace?'See the offer, message, channels and budget. Then make it yours.':'Turnout uses Qloo and your place DNA to prepare a campaign you can adjust.':view==='personalize'?'Edit the message, add a visual or adjust the plan. Review it before approving.':view==='review'?locked?'These are your saved words and settings. Personalize opens an editable copy.':'Check the content and timing. Approval saves your materials; publishing stays in your hands.':'Print your board or copy your messages to the selected channels. Nothing was charged.'}</p></header>
  {!workflow&&view!=='proposal'&&workspace&&<div className="agent-campaign-context"><strong>{workspace.offer.title} · {workspace.offer.price}</strong><span>{event.name} · {workspace.merchantName}</span></div>}
  {view==='proposal'&&<div className="agent-opportunity"><span className="icon-tile"><Icon name="ticket" size={22}/></span><div><span className="overline">A verified occasion nearby</span><h2>{event.headline??event.name}</h2><p><strong>{event.name}</strong> · {event.venue} · {fromDoor(event.distanceKm)} from your place</p><small>Starts {event.when}{event.sourceUrl&&<> · <a href={event.sourceUrl} target="_blank" rel="noreferrer">Source listing ↗</a></>}{event.checkedLabel&&` · Checked ${event.checkedLabel}`}</small>{event.estimateNote&&<p className="agent-note">{event.estimateNote}</p>}</div></div>}
  {!workspace?<div className="agent-start"><h3>A campaign for this crowd, made for your place.</h3><p>Turnout compares the audience’s tastes with your menu and place DNA, then prepares the message, channels and budget.</p><button type="button" className="action-button" disabled={busy||!writerConnected} onClick={()=>void request('/api/campaigns/prepare','POST',{merchant:merchantId,event:event.id})}><Icon name="spark" size={17}/>{busy?'Reading Qloo & preparing your campaign…':'Prepare my campaign'}</button><p className="agent-note" role="status">{busy?'This can take up to a couple of minutes. Nothing is sent or charged.':!writerConnected?'The campaign writer is not connected yet. You can still explore the other local ideas below.':'Your approval comes after you review the content.'}</p></div>:review&&<>
   {view==='proposal'&&<>
   <div className="agent-decision-heading"><div><span className="overline">{workspace.copiedFromId?'Your version · original Qloo analysis':workspace.source==='anthropic'?'Prepared by Claude · informed by Qloo':'Manually supplied draft · Qloo context'}</span><h3>Why this offer?</h3></div><details className="agent-potential"><summary><span>Potential</span><strong>{workspace.potential.score??'—'}<small>{workspace.potential.score!==null?'/100':''}</small></strong><span>Why this index?</span></summary><div>{workspace.potential.factors.map(f=><p key={f.label}>{f.label}<b>{f.points}/{f.max}</b></p>)}<p>Turnout relevance index, not a Qloo probability or sales forecast. Editorial weights have not been calibrated against results.</p></div></details></div>
   <div className="agent-offer-comparison"><article className="agent-offer-card"><span className="overline">Your signature</span><h3>{workspace.signatureOffer?.title??'No signature offer saved'}</h3><strong>{workspace.signatureOffer?.price}</strong><p>From your place DNA</p></article><article className="agent-offer-card is-recommended"><span className="overline">Recommended for this occasion</span><h3>{workspace.offer.title}</h3><strong>{workspace.offer.price}</strong>{workspace.signatureOffer?.id===workspace.offer.id&&<p className="agent-confirmation">This occasion confirms your signature.</p>}<p>{workspace.offer.description}</p></article></div>
   <p className="agent-decision-reason">{firstSentences(workspace.reasoning,210)}</p>
   <LocalityEvidence comparison={workspace.proof.locality} offerId={workspace.offer.id}><p>{workspace.reasoning}</p><p>{workspace.audience}</p>{workspace.proof.tags.length>0&&<p><strong>Tastes returned:</strong> {workspace.proof.tags.join(' · ')}</p>}{workspace.proof.comparedOffers.map(o=><p key={o.title}><strong>{o.title}</strong> · {o.places.length?`Nearby references: ${o.places.slice(0,3).join(', ')}`:'No matching nearby place returned'}</p>)}<p>{workspace.limitations}</p><small>{workspace.proof.qlooCalls} Qloo calls, including cached results. Group tastes are not a measurement of the people attending or passing your door.</small></LocalityEvidence>
   {!workspace.proof.locality&&<div className="agent-refresh"><button type="button" className="quiet-button" disabled={busy||dirty||!writerConnected} onClick={()=>void request('/api/campaigns/prepare','POST',{merchant:merchantId,event:event.id,fresh:true})}>{busy?'Reading local insights…':'Prepare a draft with local insights'} <Icon name="spark" size={14}/></button><small>Creates a new draft. Your saved campaign is kept.</small></div>}
   <div className="agent-proposal-message"><span className="overline">Your prepared message</span><h3>{review.title}</h3><p>{review.message}</p></div>
   {planFacts}
   <h3 className="agent-channel-heading">Where to use it</h3>{selectedChannels}
   {channelReason&&<details className="agent-adjust"><summary>Why these channels? <Icon name="chevron" size={16}/></summary>{channelReason}</details>}
   <div className="agent-actions"><span className="agent-note">Next: your message, visual and settings.</span><button type="button" className="action-button" disabled={busy||moving} onClick={()=>void openStep('personalize')}>Personalize campaign {busy?<span className="agent-button-spinner" aria-hidden="true"/>:<Icon name="arrow" size={16}/>}</button></div>
   <p className="agent-note">{locked?'Your saved materials stay unchanged. Personalize opens an editable copy.':'Draft only. Nothing has been published or charged.'}</p>
   </>}
   {workspace.copiedFromId&&(view==='proposal'||view==='materials')&&<p className="agent-note">Based on an existing campaign. <Link className="text-link" href={`/campaigns/${workspace.copiedFromId}?merchant=${merchantId}`}>View the original receipt</Link></p>}
   {view==='materials'&&locked?<div className="agent-receipt"><div className="agent-receipt-success"><h3><Icon name="check"/>{allReady?'Approved and saved':workspace.status==='approved'?'Preparing your materials':'Some materials need attention'}</h3></div>{workspace.status==='approved'&&<p>Preparation is still in progress. Refresh the receipt to check each channel.</p>}{boardReady&&board&&<div className="agent-ready-board"><div><h3>Put it in front of your customers.</h3><p>Open the print-ready board, then place it in your venue.</p><Link className="action-button" href={`/campaigns/${workspace.id}/board`}>Open & print the board <Icon name="arrow" size={16}/></Link></div><CampaignBoard board={board}/></div>}{planFacts}<h3 className="agent-channel-heading">Your channels · what to do next</h3>{workspace.receipts.map((r,i)=><div className="agent-receipt-row" key={`${r.channel}-${i}`}><ChannelIcon channel={r.channel}/><div><strong>{CHANNELS[r.channel]}</strong><p>{receiptLabel(r)}</p><small>{channelCostLabel(r.channel,review)}</small>{r.providerId&&<small>Provider reference: {r.providerId}</small>}{r.channel!=='storefront'&&<CopyText text={channelMaterial(r.channel,review,workspace.merchantName)} label={r.channel==='geofenced_ad'?'Copy ad text':`Copy ${CHANNELS[r.channel]} message`}/>}</div></div>)}
    {board&&<ChannelStudio workspace={workspace} review={review} board={board} when={when} readOnly/>}
    <details className="agent-adjust"><summary>Other materials & receipt details <Icon name="chevron" size={16}/></summary><div className="agent-material"><strong>Your message</strong><p>{review.message}</p><CopyText text={review.message}/></div>{review.channels.includes('whatsapp')&&<div className="agent-material"><strong>WhatsApp · prepared, not sent</strong><p>{review.whatsapp}</p><CopyText text={review.whatsapp}/></div>}<a className="action-button secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(materials)}`} download="turnout-campaign.txt">Download campaign materials <Icon name="arrow" size={16}/></a><CampaignVisual visual={review.visual}/><button type="button" className="quiet-button" disabled={busy} onClick={()=>void request(`/api/campaigns/${workspace.id}/workspace`,'GET')}>Refresh receipt</button></details><p className="agent-note">Your materials are saved. Social posts require manual publication. No ad was launched.</p>{workspace.status!=='approved'&&<div className="agent-version"><div><strong>Want to change something?</strong><p>Create an editable copy and keep these saved materials.</p></div><button type="button" className="action-button secondary" disabled={busy} onClick={()=>void request(`/api/campaigns/${workspace.id}/versions`,'POST')}>Personalize campaign {busy?<span className="agent-button-spinner" aria-hidden="true"/>:<Icon name="arrow" size={16}/>}</button></div>}</div>:null}
   {((view==='personalize'&&!locked)||view==='review')&&board&&<CampaignEditor workspace={workspace} review={review} checking={checking} busy={busy||moving} when={when} board={board} channelReason={channelReason} update={update}/>}

  </>}

  {notice&&(!workflow||view==='proposal'||view==='materials')&&<p className="agent-notice" role="status">{notice}</p>}
  </div></div>
  {workspace&&review&&(view==='personalize'||view==='review')&&<footer className="workflow-actions" aria-label="Campaign actions">
   {error&&<p className="plan-inline-error" role="alert">{error}{helpLink&&<> <Link href={helpLink}>Review opportunity →</Link></>}</p>}
   <div className="workflow-actions-inner">
    <button type="button" className="workflow-back" disabled={busy||moving} onClick={()=>void goTo(checking&&!locked?'personalize':'proposal')}><Icon name="arrow" size={16}/>{checking&&!locked?'Back to personalize':'Back to proposal'}</button>
    <span className="workflow-save-state" role="status">{working?'Saving…':notice?'Draft saved':locked?'Saved campaign':dirty?'Unsaved changes':'Draft saved'}</span>
    <div className="workflow-actions-forward">{checking?locked?<><button type="button" className="quiet-button" disabled={busy||moving} onClick={()=>void goTo('materials')}>View materials</button><button type="button" className="action-button" disabled={busy||moving} onClick={()=>void openStep('personalize')}>Personalize campaign <Icon name="arrow" size={16}/></button></>:<button type="button" className="action-button" disabled={busy||moving} onClick={()=>void request(`/api/campaigns/${workspace.id}/approve`,'POST',{review})}>{busy?'Preparing materials…':'Approve & prepare materials'}<Icon name="check" size={16}/></button>:<><button type="button" className="quiet-button workflow-save" disabled={busy||moving||!dirty} onClick={()=>void request(`/api/campaigns/${workspace.id}/workspace`,'PATCH',review)}>Save draft</button><button type="button" className="action-button" disabled={busy||moving} onClick={()=>void goTo('review')}>Review campaign <Icon name="arrow" size={16}/></button></>}</div>
   </div>
  </footer>}
 </section>;
}
