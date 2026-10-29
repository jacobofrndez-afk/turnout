"use client";
import Link from "next/link";
import { CHANNELS, type PlaceDna } from "@/lib/place-dna";
import { campaignChannelOptions, type PlanChannel } from "@/lib/campaign-plan";
import { matchesDistribution, type DistributionRecommendation } from "@/lib/distribution-recommendation";
import type { LocalPromotion, SavedLocalPromotion } from "@/lib/local-promotion";
import { ChannelRecommendationReason } from "./ChannelRecommendationReason";
import { ChannelIcon } from "./ChannelIcon";
import { Icon } from "./Icon";
import { useChannelAccounts } from "./useChannelAccounts";
const formats:Record<PlanChannel,string>={facebook:"Organic Page post",instagram:"Organic photo post",tiktok:"Organic photo or video",snapchat:"Organic Story",whatsapp:"Opted-in customers",google_post:"Business listing update",storefront:"People passing your door",geofenced_ad:"Paid local targeting"};
export function LocalPromotionSummary({promotion,budget}:{promotion:SavedLocalPromotion;budget:number}){
 return <div className="local-promotion-summary"><strong>{CHANNELS[promotion.platform]} · paid local ad draft</strong><p>Requested area: within {promotion.radiusKm} km of {promotion.center.name}. US${budget} total media cap.</p><small>Configure this in Meta Ads Manager. Confirm supported targeting, dates, audience eligibility and platform review before launch. Delivery and reach are not confirmed.</small></div>;
}
export function CampaignDistribution({merchantId,merchantName,dna,recommendation,channels,onChannelsChange,promotion,onPromotionChange,budget,onBudgetChange,now,timezone,onReset}:{now:number;timezone:string;onReset:()=>void;merchantId:string;merchantName:string;dna:PlaceDna;recommendation:DistributionRecommendation;channels:PlanChannel[];onChannelsChange:(value:PlanChannel[])=>void;promotion:LocalPromotion;onPromotionChange:(value:LocalPromotion)=>void;budget:number;onBudgetChange:(value:number)=>void}){
 const paid=channels.includes("geofenced_ad"),canPay=dna.channels.includes("geofenced_ad")&&dna.dailyBudgetUsd>=10,{accounts,state}=useChannelAccounts(merchantId);
 const prepared=matchesDistribution(recommendation,channels,promotion,budget),primary=paid?promotion.platform:channels[0];
 const supportChannels=channels.filter(c=>c!=="geofenced_ad"&&(paid||c!==primary));
 const primaryAccount=accounts.find(a=>a.provider===primary);
 const accountLabel=(provider:PlanChannel)=>state==="loading"?"Checking…":accounts.find(a=>a.provider===provider)?.status==="connected"?"Connected":"Connect";
 function usePrepared(){onReset();}
 return <section className="campaign-distribution" aria-label="How this campaign reaches people">
  <div className="distribution-section-heading"><strong>Reach & budget</strong><span className={prepared?"is-prepared":"is-adjusted"}><Icon name={prepared?"spark":"settings"} size={12}/>{prepared?"Prepared for you":"Adjusted by you"}</span></div>
  <div className={`distribution-preset ${paid?"is-paid":"is-organic"}`}>
   <div className="distribution-lead">
    {primary&&<ChannelIcon channel={primary}/>}
    <div><small>{paid?"Local advertising":"Lead channel"}</small><strong>{primary?CHANNELS[primary]:"Choose a channel"}{paid?" ad":""}</strong>{!paid&&primary&&<span>{formats[primary]}</span>}</div>
    {!paid&&(primary==="facebook"||primary==="instagram")&&<Link className="distribution-account" href={`/account?merchant=${merchantId}#channel-${primary}`} target="_blank" aria-label={`${accountLabel(primary)} ${CHANNELS[primary]}`}>{primaryAccount?.status==="connected"?"Connected":accountLabel(primary)}<Icon name="arrow" size={13}/></Link>}
   </div>
   <ChannelRecommendationReason recommendation={recommendation} primary={primary} prepared={primary===(paid?recommendation.promotion.platform:recommendation.channels[0])} paid={paid} now={now} timezone={timezone}/>
   <div className="distribution-preset-facts">
    <div><small><Icon name={paid?"pin":"voice"} size={13}/>{paid?"Local area":"Audience"}</small><strong>{paid?<>{promotion.radiusKm}<span>km</span></>:primary==="whatsapp"?"Your regulars":primary==="storefront"?"Passers-by":"Your audience"}</strong><p>{paid?`Proposed around ${merchantName}`:primary==="whatsapp"?"Opted-in customers only":primary==="storefront"?"At your entrance":"Organic reach · not guaranteed"}</p></div>
    <div><small><Icon name="wallet" size={13}/>Media budget</small><strong>{paid?<><span>US$</span>{budget}</>:"No ad spend"}</strong><p>{paid?`${prepared?recommendation.budgetBasis:"Total cap"} · within US$${dna.dailyBudgetUsd}/day`:prepared?recommendation.budgetNote:"Organic channels only"}</p></div>
   </div>
   {supportChannels.length>0&&<div className="distribution-support"><small>Also included</small><div>{supportChannels.map(channel=><span key={channel} className="distribution-support-channel"><ChannelIcon channel={channel}/><span>{channel==="facebook"?"Facebook post":channel==="instagram"?"Instagram post":CHANNELS[channel]}</span>{(channel==="facebook"||channel==="instagram")&&<Link href={`/account?merchant=${merchantId}#channel-${channel}`} target="_blank" aria-label={`${accountLabel(channel)} ${CHANNELS[channel]}`}>{accountLabel(channel)}<Icon name="arrow" size={11}/></Link>}</span>)}</div></div>}
   <div className="distribution-status"><span aria-hidden="true"/><p>{paid?<><strong>Ad account setup needed</strong>Nothing running or charged.</>:<><strong>Ready to review</strong>Nothing published. Check your accounts before sharing.</>}</p></div>
  </div>
  <details className="distribution-adjust"><summary><Icon name="settings" size={14}/>Adjust <span>Channels, area & budget</span><Icon name="chevron" size={14}/></summary>
   {!prepared&&<button type="button" className="text-link distribution-reset" onClick={usePrepared}>Use prepared plan <Icon name="spark" size={14}/></button>}
   <div className="distribution-modes" role="group" aria-label="Choose organic or paid distribution">
    <button type="button" aria-pressed={!paid} onClick={()=>onChannelsChange(channels.filter(c=>c!=="geofenced_ad"))}><Icon name="voice" size={17}/><span><strong>Organic only</strong><small>Existing accounts & customers</small></span></button>
    <button type="button" aria-pressed={paid} disabled={!canPay} onClick={()=>{if(!paid){onChannelsChange([...channels,"geofenced_ad"]);onPromotionChange(recommendation.promotion);onBudgetChange(recommendation.budgetUsd);}}}><Icon name="pin" size={17}/><span><strong>Include local ad</strong><small>{canPay?"Placement, area & cap already prepared":"Enable ads in your DNA first"}</small></span></button>
   </div>
   {paid&&<div className="local-ad-settings"><div><label>Paid placement<select aria-label="Paid placement" value={promotion.platform} onChange={e=>onPromotionChange({...promotion,platform:e.target.value as LocalPromotion["platform"]})}><option value="facebook">Facebook ad</option><option value="instagram">Instagram ad</option></select></label><label>Requested radius<select aria-label="Requested radius" value={promotion.radiusKm} onChange={e=>onPromotionChange({...promotion,radiusKm:Number(e.target.value)})}>{[1,2,3,5,10].map(n=><option key={n} value={n}>{n} km around the place</option>)}</select></label><label>Total ad budget · US$<input aria-label="Total ad budget in US dollars" type="number" min={10} max={dna.dailyBudgetUsd} step={1} value={budget} onChange={e=>onBudgetChange(Number(e.target.value))}/></label></div><p>Requested targeting around {merchantName}. Set up and review in Meta Ads Manager; delivery and reach are not guaranteed.</p></div>}
   <fieldset className="plan-channels"><legend>Organic channels</legend><div>{campaignChannelOptions(dna.channels).filter(c=>c!=="geofenced_ad").map(channel=><label key={channel} className={channels.includes(channel)?"is-selected":""}><input type="checkbox" checked={channels.includes(channel)} onChange={e=>onChannelsChange(e.target.checked?[...channels,channel]:channels.filter(c=>c!==channel))}/><ChannelIcon channel={channel}/><span><strong>{CHANNELS[channel]}</strong><small>{formats[channel]}</small></span></label>)}</div></fieldset>
   <details className="distribution-rationale"><summary>Why these settings?</summary><p>{recommendation.reason}</p><p>{recommendation.rationale.placement}</p><p>{recommendation.rationale.area}</p><p>{recommendation.rationale.budget}</p><small>Qloo platform-brand affinity informs the channel choice. Timing, format and your preferences determine eligibility; channel ROI and reach are not measured.</small></details>
   <p className="plan-footnote"><Link href={`/account?merchant=${merchantId}#channels`} target="_blank">Manage accounts</Link>{!canPay&&<> · <Link href={`/dna?merchant=${merchantId}&step=3`} target="_blank">Enable paid ads</Link></>}</p>
  </details>
 </section>;
}
