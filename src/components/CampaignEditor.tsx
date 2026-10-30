"use client";
import type { ReactNode } from 'react';
import type { AgentReview, AgentWorkspace } from '@/lib/agent-workspace';
import type { CampaignBoardData } from '@/lib/campaign-board';
import { campaignChannelOptions } from '@/lib/campaign-plan';
import { CHANNELS } from '@/lib/place-dna';
import { ChannelStudio } from './ChannelStudio';
import { ChannelBudget } from './ChannelBudget';
import { QlooChannelNote } from './QlooChannelNote';
import { channelCap, withChannelCaps } from '@/lib/channel-kit';
import { ChannelIcon } from './ChannelIcon';
import { CampaignVisual } from './CampaignVisual';
import { Icon } from './Icon';

export function CampaignEditor({workspace,review,checking,busy,when,board,channelReason,update}:{
 workspace:AgentWorkspace;review:AgentReview;checking:boolean;busy:boolean;when:string;
 board:CampaignBoardData;channelReason:ReactNode;update:(next:Partial<AgentReview>)=>void;
}){
 const selectedChannels=<div className="agent-selected-channels">{review.channels.map(channel=><span key={channel}><ChannelIcon channel={channel}/><span className="chip-text"><b>{CHANNELS[channel]}</b><QlooChannelNote workspace={workspace} channel={channel} now={Date.now()}/></span></span>)}</div>;
 return <fieldset disabled={busy} className="agent-editor workflow-editor" aria-label={checking?'Review your campaign':'Personalize your campaign'}>
  <div className="workflow-content">
   <section className={`workflow-card workflow-visual ${review.visual?'has-photo':''}`} aria-label="Campaign photo">
    <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="camera" size={19}/></span><div><h3>Your photo</h3><p>{checking?'It travels with every channel, cropped to each format.':'Your offer, your menu, your place. One photo, every channel.'}</p></div>{!checking&&!review.visual&&<span className="workflow-label-tag">Recommended</span>}</header>
    {checking&&!review.visual?<p className="workflow-empty-note">No photo added. Your words carry the board and the posts.</p>:<CampaignVisual visual={review.visual} onChange={checking?undefined:visual=>update({visual})}/>}
   </section>
   <ChannelStudio workspace={workspace} review={review} board={board} when={when} readOnly={checking} update={update}/>
   <details className="workflow-card workflow-details"><summary>Campaign brief <Icon name="settings" size={16}/></summary><p>The starting idea. Channel versions are edited independently above.</p>
    {checking?<div className="workflow-final-copy"><h4>{review.title}</h4><p>{review.message}</p></div>:<><label>Campaign title<input maxLength={58} value={review.title} onChange={e=>update({title:e.target.value})}/></label><label>Core message<textarea rows={3} maxLength={300} value={review.message} onChange={e=>update({message:e.target.value})}/></label></>}
   </details>
  </div>
  <aside className="workflow-settings" aria-label="Campaign channels and budget">
   <section className="workflow-card workflow-plan">
    <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="clock" size={19}/></span><div><h3>Timing</h3><p>{checking?'Your agreed campaign window.':'Prepared for this opportunity.'}</p></div></header>
    <div className="workflow-window"><span>Campaign window</span><strong>{when}</strong></div>
    {!checking&&<details className="workflow-timing"><summary>Adjust timing <Icon name="chevron" size={14}/></summary><div className="agent-fields"><label>Start<input type="datetime-local" value={review.startLocal} onChange={e=>update({startLocal:e.target.value})}/></label><label>End<input type="datetime-local" value={review.endLocal} onChange={e=>update({endLocal:e.target.value})}/></label></div><small>{workspace.timezone.replace(/_/g,' ')} · Update any times written in your messages too.</small></details>}

   </section>
   <section className="workflow-card workflow-channels">
    <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="campaign" size={19}/></span><div><h3>{checking?'Selected channels':'Where to use it'}</h3><p>{checking?'Your materials will be prepared for these channels.':'Choose the destinations for your content.'}</p></div><span className="workflow-label-tag">{review.channels.length}</span></header>
    {checking?selectedChannels:<div className="workflow-channel-options">{campaignChannelOptions(workspace.dna.profile.channels).map(channel=><button type="button" key={channel} aria-pressed={review.channels.includes(channel)} onClick={()=>{
     const channels=review.channels.includes(channel)?review.channels.filter(c=>c!==channel):[...review.channels,channel];
     if(channels.length)update(withChannelCaps(review,channels,{...review.channelCaps,...(channel==='geofenced_ad'&&channels.includes(channel)?{geofenced_ad:Math.min(15,workspace.dna.profile.dailyBudgetUsd)}:{})}));
    }}><ChannelIcon channel={channel}/><span><strong>{CHANNELS[channel]}</strong><small>{channel==='geofenced_ad'?'Paid advertising':channel==='storefront'?'In your venue':channel==='whatsapp'?'Prepared message':channelCap(review,channel)>0?'Post + planned ad':'Organic post'}</small><QlooChannelNote workspace={workspace} channel={channel} now={Date.now()}/></span><span className="workflow-channel-check">{review.channels.includes(channel)&&<Icon name="check" size={11}/>}</span></button>)}</div>}
    {!checking&&channelReason&&<details className="workflow-channel-reason"><summary>Why these channels? <Icon name="chevron" size={14}/></summary>{channelReason}</details>}
   </section>
   <ChannelBudget workspace={workspace} review={review} readOnly={checking} update={update}/>
   {checking?<section className="workflow-approval"><span><Icon name="check" size={18}/></span><div><h3>What approval does</h3><p>Saves your board and channel messages, ready to print or copy. No automatic publishing, ad launch or charge.</p></div></section>:<details className="workflow-card workflow-details"><summary>Offer terms & staff note <Icon name="settings" size={16}/></summary><label>Offer terms<input value={review.terms} maxLength={120} onChange={e=>update({terms:e.target.value})}/></label><label>Staff invitation<input maxLength={140} value={review.staffLine} onChange={e=>update({staffLine:e.target.value})}/></label></details>}
  </aside>
 </fieldset>;
}
