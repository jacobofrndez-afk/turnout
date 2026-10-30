"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect,useState } from 'react';
import { type AgentOpportunity,type AgentReview,type AgentWorkspace,receiptLabel } from '@/lib/agent-workspace';
import { CHANNELS } from '@/lib/place-dna';
import { campaignChannelOptions,planWindowLabel,localTimeToInstant } from '@/lib/campaign-plan';
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
export function AgentCampaign({merchantId,event,initial,writerConnected,entry='saved'}:{merchantId:string;event:AgentOpportunity;initial?:AgentWorkspace;writerConnected:boolean;entry?:'proposal'|'saved'}){
 const router=useRouter();
 const [workspace,setWorkspace]=useState(initial),[review,setReview]=useState<AgentReview|undefined>(initial?.review);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[helpLink,setHelpLink]=useState('');
 const {view,revision,moving,goTo,section,shell,content,heading:stepHeading}=useCampaignMotion(entry==='proposal'?'proposal':initial&&initial.status!=='drafted'?'materials':initial?.copiedFromId?'personalize':'proposal');
 const [dirty,setDirty]=useState(false);
 const checking=view==='review';
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
   const apply=()=>{setWorkspace(data.workspace);setReview(data.workspace.review);setDirty(false);};
   if(method==='PATCH')apply();
   else await goTo(data.workspace.status!=='drafted'?(nextView==='review'?'review':'materials'):nextView??(data.workspace.copiedFromId?'personalize':'proposal'),apply);
   if(data.href)router.push(data.href,{scroll:false});
   if(method==='PATCH')setNotice('Your changes are saved. Nothing has been sent.');
   return data.workspace as AgentWorkspace;
  }catch(e){setError(e instanceof Error?e.message:'Please try again.');}
  finally{setBusy(false);}
 }
 async function openStep(target:CampaignView){
  if(busy||moving)return;
  setError('');
  if(target==='proposal'||target==='materials'){goTo(target);return;}
  if(!workspace){
   if(!writerConnected){setError('The campaign writer is not connected yet.');return;}
   const prepared=await request('/api/campaigns/prepare','POST',{merchant:merchantId,event:event.id},target);
   if(prepared&&prepared.status!=='drafted'&&target==='personalize')await request(`/api/campaigns/${prepared.id}/versions`,'POST');
   return;
  }
  if(target==='personalize'&&locked){
   if(workspace.status==='approved'){setError('Your materials are still being prepared. Open Materials and refresh the status before editing a copy.');return;}
   await request(`/api/campaigns/${workspace.id}/versions`,'POST');return;
  }
  goTo(target);
 }
 const distribution=workspace&&review?recommendDistribution({dna:workspace.dna.profile,offer:workspace.offer,startLocal:review.startLocal,timezone:workspace.timezone,now:Date.now(),category:'culture',hasVisual:!!review.visual,channelAffinity:workspace.distribution.channelAffinity,distanceKm:event.distanceKm}):undefined;
 const lead=review?.channels.find(c=>c!=='storefront'&&c!=='geofenced_ad');
 const paid=!!review?.channels.includes('geofenced_ad');
 let when='Review the campaign time';
 try{if(review&&workspace)when=planWindowLabel(localTimeToInstant(review.startLocal,workspace.timezone),localTimeToInstant(review.endLocal,workspace.timezone),workspace.timezone);}catch{}
 const step=campaignSteps.findIndex(s=>s.view===view)+1;
 const board=workspace&&review?{campaignId:workspace.id,merchantId,merchantName:workspace.merchantName,message:review.chalkboard,offerTitle:workspace.offer.title,price:workspace.offer.price??'',startLocal:review.startLocal,endLocal:review.endLocal,timezone:workspace.timezone}:undefined;
 const boardReady=workspace?.receipts.some(r=>r.channel==='storefront'&&r.status==='ready');
 const allReady=workspace?.status==='prepared';
 const materials=review?[review.title,review.message,review.terms,when,'',...(review.channels.includes('storefront')?[`Chalkboard: ${review.chalkboard}`,`Staff: ${review.staffLine}`]:[]),...(review.channels.includes('whatsapp')?[`WhatsApp — prepared, not sent (demo list, fictional contacts): ${review.whatsapp}`]:[]),...(paid?[`Ad: ${review.adHeadline}`,review.adBody,`Planned media cap: US$${review.mediaBudgetUsd}. No ad has been launched.`]:[]),'Nothing was charged.'].join('\n'):'';
 const channelReason=distribution&&review&&workspace?<ChannelRecommendationReason recommendation={distribution} primary={lead} prepared={review.channels.length===distribution.channels.length&&review.channels.every(c=>distribution.channels.includes(c))} paid={paid} now={Date.now()} timezone={workspace.timezone}/>:null;
 const planFacts=review&&<div className="agent-plan-summary"><div><Icon name="clock" size={18}/><span><small>Campaign window</small><strong>{when}</strong></span></div><div><Icon name="wallet" size={18}/><span><small>{paid?'Planned media cap':'Media budget'}</small><strong>{paid?`US$${review.mediaBudgetUsd} max`:'No paid media planned'}</strong></span></div></div>;
 const selectedChannels=review&&<div className="agent-selected-channels" aria-label="Selected channels">{review.channels.map(channel=><span key={channel}><ChannelIcon channel={channel}/>{CHANNELS[channel]}</span>)}</div>;
 return <section ref={section} className="agent-campaign" aria-label="Your prepared campaign" aria-busy={busy||moving}>
  <ol className="agent-steps" aria-label="Campaign progress">{campaignSteps.map(({view:target,label},i)=><li key={target} aria-current={view===target?'step':undefined} className={step>i+1?'is-complete':''}><button type="button" disabled={busy||moving||(target==='materials'&&!locked)} onClick={()=>void openStep(target)} aria-current={view===target?'step':undefined}><span>{step>i+1?<Icon name="check" size={12}/>:i+1}</span>{label}</button></li>)}</ol>
  {busy&&<p className="agent-notice" role="status">{!workspace?'Reading Qloo and preparing your campaign…':locked?'Opening your editable copy…':'Saving your campaign…'}</p>}
  {error&&<p className="plan-inline-error" role="alert">{error}{helpLink&&<> <Link href={helpLink}>Review opportunity →</Link></>}</p>}
  {!workspace&&!busy&&<p className="agent-note">Personalize or Review will prepare your campaign first.</p>}
  <div ref={shell} className="agent-step-shell"><div ref={content} className="agent-step-content" key={revision} inert={moving}>
  <header className="agent-stage-heading"><span className="overline">Step {step} of 4{view==='proposal'&&workspace?' · Prepared for your place':''}</span><h2 ref={stepHeading} tabIndex={-1}>{view==='proposal'?workspace?'Your campaign, prepared.':'Start with a local opportunity.':view==='personalize'?'Add your own touch.':view==='review'?locked?'Review your saved campaign.':'Everything ready for your approval.':allReady?'Your materials are ready.':'Check your campaign materials.'}</h2><p>{view==='proposal'?workspace?'See the offer, message, channels and budget. Then make it yours.':'Turnout uses Qloo and your place DNA to prepare a campaign you can adjust.':view==='personalize'?'Edit the message, add a visual or adjust the plan. Review it before approving.':view==='review'?locked?'These are your saved words and settings. Personalize opens an editable copy.':'Check the content and timing. Approval saves your materials; publishing stays in your hands.':'Print your board or copy your messages to the selected channels. Nothing was charged.'}</p></header>
  {view!=='proposal'&&workspace&&<div className="agent-campaign-context"><strong>{workspace.offer.title} · {workspace.offer.price}</strong><span>{event.name} · {workspace.merchantName}</span></div>}
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
   <div className="agent-actions">{locked?<><button type="button" className="quiet-button" disabled={busy} onClick={()=>goTo('materials')}>View saved materials</button><button type="button" className="action-button" disabled={busy} onClick={()=>void request(`/api/campaigns/${workspace.id}/versions`,'POST')}>{busy?'Creating your version…':'Make your own version'} <Icon name="arrow" size={16}/></button></>:<><span className="agent-note">Next: your message, visual and settings.</span><button type="button" className="action-button" disabled={busy} onClick={()=>goTo('personalize')}>Personalize campaign <Icon name="arrow" size={16}/></button></>}</div>
   <p className="agent-note">{locked?'This campaign already has saved materials. Create a copy to adjust it.':'Draft only. Nothing has been published or charged.'}</p>
   </>}
   {workspace.copiedFromId&&<p className="agent-note">Based on an existing campaign. <Link className="text-link" href={`/campaigns/${workspace.copiedFromId}?merchant=${merchantId}`}>View the original receipt</Link></p>}
   {view==='materials'&&locked?<div className="agent-receipt"><div className="agent-receipt-success"><h3><Icon name="check"/>{allReady?'Approved and saved':workspace.status==='approved'?'Preparing your materials':'Some materials need attention'}</h3></div>{workspace.status==='approved'&&<p>Preparation is still in progress. Refresh the receipt to check each channel.</p>}{boardReady&&board&&<div className="agent-ready-board"><div><h3>Put it in front of your customers.</h3><p>Open the print-ready board, then place it in your venue.</p><Link className="action-button" href={`/campaigns/${workspace.id}/board`}>Open & print the board <Icon name="arrow" size={16}/></Link></div><CampaignBoard board={board}/></div>}{planFacts}<h3 className="agent-channel-heading">Your channels · what to do next</h3>{workspace.receipts.map((r,i)=><div className="agent-receipt-row" key={`${r.channel}-${i}`}><ChannelIcon channel={r.channel}/><div><strong>{CHANNELS[r.channel]}</strong><p>{receiptLabel(r)}</p>{r.providerId&&<small>Provider reference: {r.providerId}</small>}{r.channel!=='storefront'&&<CopyText text={r.channel==='whatsapp'?review.whatsapp:r.channel==='geofenced_ad'?`${review.adHeadline}\n${review.adBody}`:review.message} label={r.channel==='geofenced_ad'?'Copy ad text':`Copy ${CHANNELS[r.channel]} message`}/>}</div></div>)}
    <details className="agent-adjust"><summary>Other materials & receipt details <Icon name="chevron" size={16}/></summary><div className="agent-material"><strong>Your message</strong><p>{review.message}</p><CopyText text={review.message}/></div>{review.channels.includes('whatsapp')&&<div className="agent-material"><strong>WhatsApp · prepared, not sent</strong><p>{review.whatsapp}</p><CopyText text={review.whatsapp}/></div>}<a className="action-button secondary" href={`data:text/plain;charset=utf-8,${encodeURIComponent(materials)}`} download="turnout-campaign.txt">Download campaign materials <Icon name="arrow" size={16}/></a><CampaignVisual visual={review.visual}/><button type="button" className="quiet-button" disabled={busy} onClick={()=>void request(`/api/campaigns/${workspace.id}/workspace`,'GET')}>Refresh receipt</button></details><p className="agent-note">Your materials are saved. Social posts require manual publication. No ad was launched.</p>{workspace.status!=='approved'&&<div className="agent-version"><div><strong>Want to change something?</strong><p>Create an editable copy and keep these saved materials.</p></div><button type="button" className="action-button secondary" disabled={busy} onClick={()=>void request(`/api/campaigns/${workspace.id}/versions`,'POST')}>{busy?'Creating your version…':'Make your own version'} <Icon name="plus" size={16}/></button></div>}</div>:null}
   {((view==='personalize'&&!locked)||view==='review')&&<>
    <fieldset disabled={busy} className="agent-editor">
     <div className="agent-section-title"><h3>{checking?'Your final message':'Your message'}</h3><span>{checking?'Your edits are included':'Prepared for you · fully editable'}</span></div>
     {checking?<><div className="agent-review-message"><strong>{review.title}</strong><p>{review.message}</p><small>{review.terms}</small></div><CampaignVisual visual={review.visual}/>{review.channels.includes("storefront")&&board&&<CampaignBoard board={board}/>}{paid&&<div className="agent-review-message"><strong>Paid ad · {review.adHeadline}</strong><p>{review.adBody}</p></div>}</>:<><label>Campaign title<input value={review.title} maxLength={58} onChange={e=>update({title:e.target.value})}/></label><label>Your message<textarea rows={4} value={review.message} maxLength={300} onChange={e=>update({message:e.target.value})}/></label><CampaignVisual visual={review.visual} onChange={visual=>update({visual})}/>{review.channels.includes('storefront')&&board&&<div className="agent-board-editor"><label>Chalkboard message<textarea rows={3} maxLength={90} value={review.chalkboard} onChange={e=>update({chalkboard:e.target.value})}/><small>Your short invitation. The preview updates as you type. The menu price and campaign time appear below it.</small></label><CampaignBoard board={board}/></div>}</>}
     {planFacts}<h3 className="agent-channel-heading">{checking?'Selected channels':'Where to use it'}</h3>
     <p className="agent-note">{paid?"Planned paid reach requires ad-account setup and platform review. No ad is launched here.":"Organic posts have no media spend. Reach is not guaranteed."}</p>{checking?selectedChannels:<div className="agent-channel-picks">{campaignChannelOptions(workspace.dna.profile.channels).map(channel=><button type="button" key={channel} aria-pressed={review.channels.includes(channel)} disabled={checking} onClick={()=>{const channels=review.channels.includes(channel)?review.channels.filter(c=>c!==channel):[...review.channels,channel];if(channels.length)update({channels,mediaBudgetUsd:channels.includes('geofenced_ad')?(review.mediaBudgetUsd||Math.min(15,workspace.dna.profile.dailyBudgetUsd)):0});}}><ChannelIcon channel={channel}/>{CHANNELS[channel]}{review.channels.includes(channel)&&<Icon name="check" size={12}/>}</button>)}</div>}
     {!checking&&channelReason&&<details className="agent-adjust"><summary>Why these channels? <Icon name="chevron" size={16}/></summary>{channelReason}</details>}
     {!checking&&<details className="agent-adjust"><summary>Adjust timing, budget & channel messages <Icon name="settings" size={16}/></summary><div className="agent-fields"><label>Start · {workspace.timezone}<input type="datetime-local" value={review.startLocal} onChange={e=>update({startLocal:e.target.value})}/></label><label>End<input type="datetime-local" value={review.endLocal} onChange={e=>update({endLocal:e.target.value})}/></label>{paid&&<label>Media cap · US$<input type="number" min={10} max={workspace.dna.profile.dailyBudgetUsd} value={review.mediaBudgetUsd} onChange={e=>update({mediaBudgetUsd:Number(e.target.value)})}/></label>}</div><p className="agent-note">If you change the timing, update any dates and times in your messages too.</p><label>Offer terms<input value={review.terms} maxLength={120} onChange={e=>update({terms:e.target.value})}/></label><label>Staff invitation<input maxLength={140} value={review.staffLine} onChange={e=>update({staffLine:e.target.value})}/></label><label>WhatsApp message<textarea rows={3} maxLength={320} value={review.whatsapp} onChange={e=>update({whatsapp:e.target.value})}/></label>{paid&&<><label>Ad headline<input maxLength={40} value={review.adHeadline} onChange={e=>update({adHeadline:e.target.value})}/></label><label>Ad message<textarea maxLength={125} value={review.adBody} onChange={e=>update({adBody:e.target.value})}/></label></>}</details>}
     {checking&&!locked&&<div className="agent-approval-note"><strong>What happens when you approve</strong><p>Your board and channel messages will be saved. You can then print the board and copy your messages. No post is published, no ad is launched and nothing is charged.</p>{review.channels.includes('whatsapp')&&<><p className="agent-review-message">{review.whatsapp}</p><p className="agent-note">WhatsApp · prepared, not sent (demo list, fictional contacts).</p></>}</div>}
     <div className="agent-actions">{checking&&locked?<><button type="button" className="quiet-button" onClick={()=>goTo('materials')}>View saved materials</button><button type="button" className="action-button" onClick={()=>void openStep('personalize')}>{busy?'Creating your copy…':'Personalize a copy'}<Icon name="arrow" size={16}/></button></>:checking?<><button type="button" className="quiet-button" onClick={()=>goTo('personalize')}>Keep editing</button><button type="button" className="action-button" onClick={()=>void request(`/api/campaigns/${workspace.id}/approve`,'POST',{review})}>{busy?'Recording your decision…':'Approve & save materials'}<Icon name="check" size={16}/></button></>:<><button type="button" className="quiet-button" onClick={()=>void request(`/api/campaigns/${workspace.id}/workspace`,'PATCH',review)}>Save draft</button><button type="button" className="action-button" onClick={()=>goTo('review')}>Review campaign <Icon name="arrow" size={16}/></button></>}</div>
    </fieldset><p className="agent-note">Place DNA v{workspace.dna.version} · {workspace.merchantName}. The audience analysis is a hypothesis about group tastes. Confirm stock and opening hours.</p>
   </>}
  </>}

  {notice&&<p className="agent-notice" role="status">{notice}</p>}
  </div></div>
 </section>;
}
