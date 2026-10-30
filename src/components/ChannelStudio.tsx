"use client";
import {useEffect,useId,useState} from 'react';
import type {AgentReview,AgentWorkspace} from '@/lib/agent-workspace';
import type {CampaignBoardData} from '@/lib/campaign-board';
import type {PlanChannel} from '@/lib/campaign-plan';
import {CHANNELS} from '@/lib/place-dna';
import {CHANNEL_FORMATS,channelCreative,channelStarter,channelCostLabel,channelCap,isCreativeChannel,type ChannelCreative} from '@/lib/channel-kit';
import {googlePromotionNote} from '@/lib/channel-recommendation';
import {CampaignBoard} from './CampaignBoard';
import {CampaignVisual} from './CampaignVisual';
import {ChannelIcon} from './ChannelIcon';
import {CopyText} from './CopyText';
import {Icon} from './Icon';
import './channel-studio.css';

export function ChannelStudio({workspace,review,board,when,readOnly=false,update}:{workspace:AgentWorkspace;review:AgentReview;board:CampaignBoardData;when:string;readOnly?:boolean;update?:(next:Partial<AgentReview>)=>void}){
 const id=useId(),[selected,setSelected]=useState<PlanChannel>(review.channels[0]),[shot,setShot]=useState(0),[playing,setPlaying]=useState(false);
 const channel=review.channels.includes(selected)?selected:review.channels[0];
 const creative=isCreativeChannel(channel)?channelCreative(channel,review,workspace.merchantName):undefined;
 const vertical=channel==='tiktok'||channel==='snapchat';
 const neutralGoogle=channel==='google_post'&&!!googlePromotionNote(`${review.title} ${review.message} ${review.terms}`);
 const shots=creative?.shots??[];
 useEffect(()=>{setShot(0);setPlaying(false);},[channel]);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setShot(current=>{if(current>=shots.length-1){setPlaying(false);return current;}return current+1;}),3500);return()=>clearInterval(timer);},[playing,shots.length]);
 function editCreative(next:Partial<ChannelCreative>){if(!isCreativeChannel(channel)||!creative)return;update?.({channelCreatives:{...review.channelCreatives,[channel]:{...creative,...next}}});}
 const caption=creative?.caption??(channel==='whatsapp'?review.whatsapp:channel==='geofenced_ad'?review.adBody:review.chalkboard);
 const image=review.visual?<img src={review.visual.dataUrl} alt={`${workspace.merchantName} campaign photo`}/>:<div className="kit-no-photo"><Icon name="camera" size={26}/><strong>{channel==='tiktok'?'Your video goes here':'Your photo goes here'}</strong><span>{channel==='tiktok'?'Storyboard preview · footage still to film':'Add a photo to complete this format'}</span></div>;
 const brand=<div className="kit-brand"><span>{workspace.merchantName.slice(0,1)}</span><div><strong>{workspace.merchantName}</strong><small>{channel==='whatsapp'?'Message preview':channel==='geofenced_ad'||channel!=='google_post'&&channelCap(review,channel)>0?'Sponsored · draft':'Draft preview'}</small></div><b aria-hidden="true">···</b></div>;
 return <section className="workflow-card channel-studio" aria-label="Channel content and previews">
  <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="campaign" size={19}/></span><div><h3>Made for each channel</h3><p>{readOnly?'The exact versions saved for your selected destinations.':'Choose a channel. Preview its format and make the words yours.'}</p></div></header>
  <div className="kit-tabs" role="group" aria-label="Preview channel">{review.channels.map(c=><button key={c} type="button" aria-pressed={channel===c} aria-controls={`${id}-panel`} onClick={()=>setSelected(c)}><ChannelIcon channel={c}/><span>{CHANNELS[c]}</span></button>)}</div>
  <div id={`${id}-panel`} className="kit-panel" role="region" aria-label={`${CHANNELS[channel]} content`}>
   <div className="kit-format"><div><strong>{CHANNEL_FORMATS[channel].format}</strong><p>{CHANNEL_FORMATS[channel].purpose}</p></div><span>{readOnly?'Saved version':isCreativeChannel(channel)&&!review.channelCreatives?.[channel]?'Format starter':'Editable version'}</span></div>
   <div className={`kit-compose ${readOnly?'is-readonly':''}`}>
    {!readOnly&&<div className="kit-fields">
     {channel==='geofenced_ad'&&<label>Ad headline<input maxLength={40} value={review.adHeadline} onChange={e=>update?.({adHeadline:e.target.value})}/></label>}
     <label><span className="workflow-label">{channel==='storefront'?'Chalkboard message':channel==='whatsapp'?'Message to your regulars':channel==='geofenced_ad'?'Ad message':'Caption'}<small>{caption.length}/{channel==='storefront'?90:channel==='whatsapp'?320:channel==='geofenced_ad'?125:600}</small></span><textarea rows={channel==='storefront'?3:5} maxLength={channel==='storefront'?90:channel==='whatsapp'?320:channel==='geofenced_ad'?125:600} value={caption} onChange={e=>creative?editCreative({caption:e.target.value}):update?.(channel==='storefront'?{chalkboard:e.target.value}:channel==='whatsapp'?{whatsapp:e.target.value}:{adBody:e.target.value})}/></label>
     {vertical&&creative&&<label>On-screen text<input maxLength={90} value={creative.overlay} onChange={e=>editCreative({overlay:e.target.value})}/></label>}
     {channel==='tiktok'&&creative&&<div className="kit-shots"><strong>Your filming plan · 3 shots</strong>{[0,1,2].map(i=><label key={i}><span>0{i+1} · {['The hook','The offer','The invitation'][i]}</span><textarea rows={2} maxLength={160} value={creative.shots[i]??''} onChange={e=>editCreative({shots:[0,1,2].map(index=>index===i?e.target.value:creative.shots[index]??'')})}/></label>)}</div>}
     {creative&&<button type="button" className="text-link kit-reset" onClick={()=>isCreativeChannel(channel)&&editCreative(channelStarter(channel,review,workspace.merchantName))}>Use a fresh format starter</button>}
     <p className="kit-edit-note">Changes here affect {CHANNELS[channel]} only.</p>
    </div>}
    <div className="kit-preview-column">
     <div className="kit-preview-label"><span>{channel==='tiktok'?'Storyboard preview':'Layout preview'}</span><small>{channel==='tiktok'?'9:16 · not a rendered video':channel==='snapchat'?'9:16':channel==='instagram'?'1:1 photo':'Illustrative layout'}</small></div>
     {channel==='storefront'?<CampaignBoard board={board}/>:vertical?<div className={`kit-phone kit-${channel}`}>
      <div className="kit-phone-photo">{image}</div><div className="kit-phone-top"><ChannelIcon channel={channel}/><strong>{workspace.merchantName}</strong></div>
      <div className="kit-story-overlay">{channel==='tiktok'&&shot===2?<>{workspace.offer.price}<small>{when}</small></>:creative?.overlay}</div>
      <div className="kit-phone-caption"><strong>{workspace.merchantName}</strong><p>{caption}</p>{channel==='snapchat'&&<small>{when} · {workspace.offer.price}</small>}</div>
     </div>:channel==='whatsapp'?<div className="kit-chat">{brand}<div className="kit-chat-body"><div className="kit-bubble">{review.visual&&image}<p>{caption}</p><small>{when}</small></div><span className="kit-chat-note">Preview only · not sent</span></div></div>:<div className={`kit-post kit-${channel}`}>{brand}
       {(channel==='instagram'||channel==='google_post')&&image}
       <div className="kit-post-copy">{channel==='google_post'&&<span className="kit-google-label">Business update</span>}{(channel==='google_post'||channel==='geofenced_ad')&&<h4>{channel==='geofenced_ad'?review.adHeadline:neutralGoogle?workspace.merchantName:review.title}</h4>}<p>{caption}</p><small>{when}</small>{review.terms&&!neutralGoogle&&<small>{review.terms}</small>}</div>
       {(channel==='facebook'||channel==='geofenced_ad')&&review.visual&&image}
       <div className="kit-post-footer" aria-hidden="true">{channel==='instagram'?'♡    ◯    ↗':channel==='google_post'?'Offer details':channel==='geofenced_ad'?'Visit our place':'Like     ·     Comment     ·     Share'}</div>
      </div>}
     {channel==='google_post'&&channelCap(review,channel)>0&&<div className="kit-google-ad"><small>Separate Google Ads draft · US${channelCap(review,channel)} cap</small><strong>{review.adHeadline}</strong><p>{review.adBody}</p><small>Destination, keywords and platform approval still required.</small></div>}
     {channel==='tiktok'&&<div className="kit-player"><div role="group" aria-label="Storyboard shots">{[0,1,2].map(i=><button type="button" key={i} aria-pressed={shot===i} onClick={()=>{setShot(i);setPlaying(false);}}>Shot {i+1}</button>)}</div><button type="button" className="text-link" onClick={()=>{setShot(0);setPlaying(!playing);}}>{playing?'Stop preview':'Play storyboard'}</button><p>{shots[shot]??'Add a filming direction for this shot.'}</p><small>Still frames and filming directions. Record and upload the video in TikTok.</small></div>}
     {readOnly&&<CopyText text={caption} label={`Copy ${CHANNELS[channel]} ${channel==='storefront'?'text':'caption'}`}/>}
    </div>
   </div>
   {neutralGoogle&&<p className="kit-requirement">For Google, use a neutral venue update. The promotional title and offer terms are hidden here.</p>}
   {channel==='google_post'&&googlePromotionNote(caption)&&<p className="kit-requirement">{googlePromotionNote(caption)} <a href="https://support.google.com/business/answer/7400114" target="_blank" rel="noreferrer">Google post policy ↗</a></p>}
   <div className="kit-status"><Icon name="wallet" size={16}/><span>{channelCostLabel(channel,review)}</span></div>
   <p className="kit-requirement">{channel==='storefront'?'Print-ready after approval.':channel==='tiktok'?'Video publishing is not connected. This saves your caption and filming plan.':channel==='whatsapp'?'Prepared only. No WhatsApp sending is enabled; provider pricing must be confirmed before a future send.':channel==='geofenced_ad'?'Ad draft only. Confirm the format, audience and spending limit in your ad platform.':channel==='google_post'?'Copy to your Google Business Profile. A Google Ads campaign is a separate paid placement.':'Save the content, then finish publication in your channel. Connecting an account does not launch a paid campaign.'}</p>
  </div>
  {channel!=='storefront'&&<div className="kit-visual"><strong>Campaign photo</strong><p>{review.visual?'Used in the previews above. Each format crops it differently.':'No photo added. The previews use your words only.'}</p><CampaignVisual visual={review.visual} onChange={readOnly?undefined:visual=>update?.({visual})} preview={false}/></div>}
 </section>;
}
