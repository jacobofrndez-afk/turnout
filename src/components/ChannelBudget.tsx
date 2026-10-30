"use client";
import type {AgentReview,AgentWorkspace} from '@/lib/agent-workspace';
import {CHANNELS} from '@/lib/place-dna';
import {campaignSpend,channelCap,spendIssues,withChannelCaps} from '@/lib/channel-kit';
import type {PlanChannel} from '@/lib/campaign-plan';
import {ChannelIcon} from './ChannelIcon';
import {Icon} from './Icon';
export function ChannelBudget({workspace,review,readOnly,update}:{workspace:AgentWorkspace;review:AgentReview;readOnly:boolean;update:(next:Partial<AgentReview>)=>void}){
 const spend=campaignSpend(review),limit=workspace.dna.profile.dailyBudgetUsd;
 const adsAllowed=workspace.dna.profile.channels.includes('geofenced_ad');
 const issues=spendIssues(review,limit,adsAllowed);
 function setCap(channel:PlanChannel,value:number){update({...withChannelCaps(review,review.channels,{...review.channelCaps,[channel]:value}),...(!spend.ceiling&&value>0?{totalSpendCapUsd:limit}:{})});}
 function suggestedCap(){return Math.max(0,Math.min(15,(spend.ceiling||limit)-spend.allocated));}
 return <section className="workflow-card kit-budget" aria-label="Channel costs and spending cap">
  <header className="workflow-card-heading"><span className="workflow-card-icon"><Icon name="wallet" size={19}/></span><div><h3>Costs & spending cap</h3><p>Your limit, before anything can be launched.</p></div></header>
  <div className="kit-total"><div><span>Total planned ceiling</span><strong>US${spend.ceiling}<small> max</small></strong></div><span>Nothing charged</span></div>
  {!readOnly&&<label>Maximum for this campaign · US$<input type="number" min={0} max={limit} step={1} value={spend.ceiling} onChange={e=>update({totalSpendCapUsd:Number(e.target.value)})}/><small>Within your saved US${limit} limit. This does not change when you increase an existing channel budget.</small></label>}
  <div className="kit-cost-lines">{review.channels.map(channel=>{
   const cap=channelCap(review,channel),messaging=channel==='whatsapp',board=channel==='storefront';
   return <div key={channel} className="kit-cost-line"><div className="kit-cost-name"><ChannelIcon channel={channel}/><strong>{CHANNELS[channel]}</strong><span>{board?'No media spend':cap?`US$${cap} max`:messaging?'Quote needed':'Organic'}</span></div>
    <p>{board?'Printing costs not included.':messaging?'API fees depend on the provider and recipients. No quote is available; sending stays off.':cap?channel==='google_post'?'Separate Google Ads placement · not a paid Business post.':'Proposed ad allocation · confirm platform minimums and fees before launching.':'No ad spend. Organic reach is not guaranteed.'}</p>
    {!readOnly&&!board&&(cap>0?<div className="kit-cap-controls"><label>{messaging?'Messaging ceiling · US$':'Ad cap · US$'}<input type="number" min={channel==='geofenced_ad'?10:1} max={limit} step={1} value={cap} onChange={e=>setCap(channel,Number(e.target.value))}/></label>{channel!=='geofenced_ad'&&<button type="button" className="text-link" onClick={()=>setCap(channel,0)}>{messaging?'Remove reserve':'Keep organic'}</button>}</div>:<button type="button" className="text-link" disabled={(!messaging&&!adsAllowed)||suggestedCap()<1} onClick={()=>setCap(channel,suggestedCap())}>{messaging?'Set a messaging ceiling':'Plan paid reach'} <Icon name="plus" size={12}/></button>)}
    {readOnly&&cap>0&&<small>{messaging?'A ceiling, not a price quote.':'Planned only · not applied to an ad account.'}</small>}
   </div>;
  })}</div>
  <div className="kit-budget-totals"><span>Planned ads <strong>US${spend.media}</strong></span><span>Messaging reserve <strong>US${spend.messaging}</strong></span><span>Unallocated <strong>US${Math.max(0,spend.ceiling-spend.allocated)}</strong></span></div>
  {review.channels.includes('whatsapp')&&<p className="kit-requirement">WhatsApp’s actual cost is unknown. A reserve is not a quote or permission to send.</p>}
  {issues.map(issue=><p className="plan-inline-error" role="alert" key={issue}>{issue}</p>)}
  <p className="kit-requirement">This is a saved spending plan. No connector enforces it yet. Confirm provider charges and apply the limits in each ad account before launching.</p>
 </section>;
}
