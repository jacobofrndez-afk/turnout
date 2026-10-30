"use client";
import type { ReactNode } from 'react';
import type { AgentReview, AgentWorkspace } from '@/lib/agent-workspace';
import type { CampaignBoardData } from '@/lib/campaign-board';
import { campaignChannelOptions } from '@/lib/campaign-plan';
import { CHANNELS } from '@/lib/place-dna';
import { CampaignVisual } from './CampaignVisual';
import { CampaignBoard } from './CampaignBoard';
import { ChannelIcon } from './ChannelIcon';
import { Icon } from './Icon';

export function CampaignEditor({workspace,review,checking,busy,when,board,channelReason,update}:{
 workspace:AgentWorkspace;review:AgentReview;checking:boolean;busy:boolean;when:string;
 board:CampaignBoardData;channelReason:ReactNode;update:(next:Partial<AgentReview>)=>void;
}){
 const paid=review.channels.includes('geofenced_ad');
 const boardSelected=review.channels.includes('storefront');
 const selectedChannels=<div className="agent-selected-channels">{review.channels.map(channel=><span key={channel}><ChannelIcon channel={channel}/>{CHANNELS[channel]}</span>)}</div>;
 return <fieldset disabled={busy} className="agent-editor workflow-editor" aria-label={checking?'Review your campaign':'Personalize your campaign'}>
  <div className="workflow-content">
   <section className="workflow-card workflow-message">
    <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="voice" size={19}/></span><div><h3>{checking?'Your customer message':'Make it sound like you'}</h3><p>{checking?'The exact words you are approving.':'Your message is ready. Give it your own voice.'}</p></div></header>
    {checking?<><div className="workflow-final-copy"><h4>{review.title}</h4><p>{review.message}</p>{review.terms&&<small>{review.terms}</small>}</div><CampaignVisual visual={review.visual}/></>:<>
     <label><span className="workflow-label">Campaign title <small>{review.title.length}/58</small></span><input value={review.title} maxLength={58} onChange={e=>update({title:e.target.value})}/></label>
     <label><span className="workflow-label">Your message <small>{review.message.length}/300</small></span><textarea rows={4} value={review.message} maxLength={300} onChange={e=>update({message:e.target.value})}/></label>
     <CampaignVisual visual={review.visual} onChange={visual=>update({visual})}/>
    </>}
   </section>
   {boardSelected&&<section className="workflow-card workflow-board">
    <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="menu" size={19}/></span><div><h3>Your chalkboard</h3><p>{checking?'Ready to print after approval.':'A short invitation, ready for your door.'}</p></div><span className="workflow-label-tag">{checking?'Print preview':'Live preview'}</span></header>
    <div className="workflow-board-layout">{!checking&&<label><span className="workflow-label">Chalkboard message <small>{review.chalkboard.length}/90</small></span><textarea rows={4} maxLength={90} value={review.chalkboard} onChange={e=>update({chalkboard:e.target.value})}/><small>The price and time appear automatically on the board.</small></label>}<CampaignBoard board={board}/></div>
   </section>}
   {(review.channels.includes('whatsapp')||paid)&&<section className="workflow-card workflow-channel-copy">
    <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="campaign" size={19}/></span><div><h3>Channel messages</h3><p>{checking?'Check the versions prepared for each destination.':'Already adapted. Adjust them if you like.'}</p></div></header>
    {review.channels.includes('whatsapp')&&<details className="workflow-copy-detail"><summary><ChannelIcon channel="whatsapp"/>WhatsApp message <Icon name="chevron" size={14}/></summary>{checking?<p className="workflow-final-copy">{review.whatsapp}</p>:<label>WhatsApp message<textarea rows={3} maxLength={320} value={review.whatsapp} onChange={e=>update({whatsapp:e.target.value})}/></label>}<small>Prepared only · no message sent in this demo.</small></details>}
    {paid&&<details className="workflow-copy-detail"><summary><Icon name="pin" size={18}/>Local ad copy <Icon name="chevron" size={14}/></summary>{checking?<div className="workflow-final-copy"><h4>{review.adHeadline}</h4><p>{review.adBody}</p></div>:<><label>Ad headline<input maxLength={40} value={review.adHeadline} onChange={e=>update({adHeadline:e.target.value})}/></label><label>Ad message<textarea rows={3} maxLength={125} value={review.adBody} onChange={e=>update({adBody:e.target.value})}/></label></>}<small>Prepared only · no ad launched.</small></details>}
   </section>}
  </div>
  <aside className="workflow-settings" aria-label="Campaign channels and budget">
   <section className="workflow-card workflow-plan">
    <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="clock" size={19}/></span><div><h3>Timing & budget</h3><p>{checking?'Your agreed window and planned spend.':'Prepared for this opportunity.'}</p></div></header>
    <div className="workflow-window"><span>Campaign window</span><strong>{when}</strong></div>
    {!checking&&<details className="workflow-timing"><summary>Adjust timing <Icon name="chevron" size={14}/></summary><div className="agent-fields"><label>Start<input type="datetime-local" value={review.startLocal} onChange={e=>update({startLocal:e.target.value})}/></label><label>End<input type="datetime-local" value={review.endLocal} onChange={e=>update({endLocal:e.target.value})}/></label></div><small>{workspace.timezone.replace(/_/g,' ')} · Update any times written in your messages too.</small></details>}
    <div className={`workflow-budget ${paid?'is-paid':''}`}><div><span>{paid?'Total planned media cap':'Paid media'}</span><strong>{paid?`US$${review.mediaBudgetUsd}`:'None selected'}{paid&&<small> maximum</small>}</strong></div><Icon name="wallet" size={21}/></div>
    {paid&&!checking&&<label className="workflow-budget-input">Maximum for this campaign · US$<input type="number" min={10} max={workspace.dna.profile.dailyBudgetUsd} value={review.mediaBudgetUsd} onChange={e=>update({mediaBudgetUsd:Number(e.target.value)})}/><small>Within your saved US${workspace.dna.profile.dailyBudgetUsd} limit.</small></label>}
    <p className="workflow-disclosure">{paid?'Planned budget only. Set this limit in your ad platform before launching. Nothing is charged here.':'Organic content only. No paid reach is included or guaranteed.'}</p>
   </section>
   <section className="workflow-card workflow-channels">
    <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="campaign" size={19}/></span><div><h3>{checking?'Selected channels':'Where to use it'}</h3><p>{checking?'Your materials will be prepared for these channels.':'Choose the destinations for your content.'}</p></div><span className="workflow-label-tag">{review.channels.length}</span></header>
    {checking?selectedChannels:<div className="workflow-channel-options">{campaignChannelOptions(workspace.dna.profile.channels).map(channel=><button type="button" key={channel} aria-pressed={review.channels.includes(channel)} onClick={()=>{
     const channels=review.channels.includes(channel)?review.channels.filter(c=>c!==channel):[...review.channels,channel];
     if(channels.length)update({channels,mediaBudgetUsd:channels.includes('geofenced_ad')?(review.mediaBudgetUsd||Math.min(15,workspace.dna.profile.dailyBudgetUsd)):0});
    }}><ChannelIcon channel={channel}/><span><strong>{CHANNELS[channel]}</strong><small>{channel==='geofenced_ad'?'Paid advertising':channel==='storefront'?'In your venue':channel==='whatsapp'?'Prepared message':'Organic post'}</small></span><span className="workflow-channel-check">{review.channels.includes(channel)&&<Icon name="check" size={11}/>}</span></button>)}</div>}
    {!checking&&channelReason&&<details className="workflow-channel-reason"><summary>Why these channels? <Icon name="chevron" size={14}/></summary>{channelReason}</details>}
   </section>
   {checking?<section className="workflow-approval"><span><Icon name="check" size={18}/></span><div><h3>What approval does</h3><p>Saves your board and channel messages, ready to print or copy. No automatic publishing, ad launch or charge.</p></div></section>:<details className="workflow-card workflow-details"><summary>Offer terms & staff note <Icon name="settings" size={16}/></summary><label>Offer terms<input value={review.terms} maxLength={120} onChange={e=>update({terms:e.target.value})}/></label><label>Staff invitation<input maxLength={140} value={review.staffLine} onChange={e=>update({staffLine:e.target.value})}/></label></details>}
  </aside>
 </fieldset>;
}
