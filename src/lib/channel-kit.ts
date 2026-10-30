import { z } from 'zod';
import type { AgentReview } from './agent-workspace';
import type { PlanChannel } from './campaign-plan';
import { CHANNEL_IDS, CHANNELS } from './place-dna';
import { googlePromotionNote } from './channel-recommendation';

export const SOCIAL_CREATIVE_IDS = ['facebook','instagram','tiktok','snapchat','google_post'] as const;
export type CreativeChannel = typeof SOCIAL_CREATIVE_IDS[number];
export const ChannelCreativeSchema = z.object({
 caption:z.string().trim().min(1).max(600),
 overlay:z.string().max(90),
 shots:z.array(z.string().max(160)).max(3),
});
export const ChannelCreativesSchema = z.object({
 facebook:ChannelCreativeSchema,instagram:ChannelCreativeSchema,tiktok:ChannelCreativeSchema,
 snapchat:ChannelCreativeSchema,google_post:ChannelCreativeSchema,
});
export type ChannelCreative = z.infer<typeof ChannelCreativeSchema>;
export const ChannelCapsSchema = z.partialRecord(z.enum(CHANNEL_IDS),z.number().int().min(0).max(200));
export type ChannelCaps = z.infer<typeof ChannelCapsSchema>;

export const CHANNEL_FORMATS:Record<PlanChannel,{format:string;purpose:string}>={
 facebook:{format:'Page post',purpose:'A conversational invitation with the offer and a clear reason to visit.'},
 instagram:{format:'Photo + caption',purpose:'Lead with the visual; keep the caption short and easy to scan.'},
 tiktok:{format:'Vertical video storyboard',purpose:'A hook, a close-up of the offer, then a reason to stop by. Film the three shots before posting.'},
 snapchat:{format:'Vertical Story',purpose:'One visual, one short overlay and an immediate invitation.'},
 google_post:{format:'Business update',purpose:'Practical details for people looking for a place: offer, price and timing.'},
 whatsapp:{format:'Customer message',purpose:'A personal invitation for customers who opted in.'},
 storefront:{format:'Printable chalkboard',purpose:'A few words, a price and a time. Legible from your door.'},
 geofenced_ad:{format:'Local ad draft',purpose:'A short headline and offer for a separate paid placement.'},
};
export function isCreativeChannel(channel:PlanChannel):channel is CreativeChannel{
 return (SOCIAL_CREATIVE_IDS as readonly string[]).includes(channel);
}

/** Backfill historical campaigns with explicit format starters. No invented audience or performance. */
export function channelStarter(channel:CreativeChannel,review:AgentReview,merchantName:string):ChannelCreative{
 const caption=review.message;
 switch(channel){
  case 'facebook':return {caption:`${caption}\n\nFind us at ${merchantName}.`,overlay:'',shots:[]};
  case 'instagram':return {caption:`${review.title}\n\n${caption}`,overlay:'',shots:[]};
  case 'tiktok':return {caption:`${review.title} · ${merchantName}`,overlay:review.title,shots:[`Open on the entrance to ${merchantName}.`,`Show the offer up close. On-screen text: ${review.title}.`,'Finish with the price and the confirmed campaign time.']};
  case 'snapchat':return {caption:review.title,overlay:review.chalkboard,shots:[]};
  case 'google_post':return {caption:googlePromotionNote(`${review.title} ${caption} ${review.terms}`)?`Meet at ${merchantName}. Plan your visit around the time below.`:caption,overlay:'',shots:[]};
 }
}
export function channelCreative(channel:CreativeChannel,review:AgentReview,merchantName:string):ChannelCreative{
 return review.channelCreatives?.[channel]??channelStarter(channel,review,merchantName);
}
export function channelMaterial(channel:PlanChannel,review:AgentReview,merchantName:string):string{
 if(channel==='storefront')return review.chalkboard;
 if(channel==='whatsapp')return review.whatsapp;
 if(channel==='geofenced_ad')return `${review.adHeadline}\n${review.adBody}`;
 const creative=channelCreative(channel,review,merchantName);
 return [creative.caption,...(creative.overlay?[`On-screen text: ${creative.overlay}`]:[]),...creative.shots.map((shot,i)=>`Shot ${i+1}: ${shot}`)].join('\n\n');
}
export function channelCap(review:AgentReview,channel:PlanChannel){
 if(!review.channels.includes(channel))return 0;
 return review.channelCaps?.[channel]??(channel==='geofenced_ad'?review.mediaBudgetUsd:0);
}
export function campaignSpend(review:AgentReview){
 const media=review.channels.filter(c=>c!=='whatsapp').reduce((sum,c)=>sum+channelCap(review,c),0);
 const messaging=channelCap(review,'whatsapp');
 const allocated=media+messaging;
 return {media,messaging,allocated,ceiling:review.totalSpendCapUsd??allocated};
}
/** Preserve caps when changing channels; inactive destinations are excluded from the total. */
export function withChannelCaps(review:AgentReview,channels:PlanChannel[],caps:ChannelCaps):Partial<AgentReview>{
 const active=Object.fromEntries(channels.map(c=>[c,caps[c]??channelCap(review,c)])) as ChannelCaps;
 const media=channels.filter(c=>c!=='whatsapp').reduce((sum,c)=>sum+(active[c]??0),0);
 const allocated=media+(active.whatsapp??0);
 return {channels,channelCaps:active,mediaBudgetUsd:media,totalSpendCapUsd:(review.totalSpendCapUsd??campaignSpend(review).ceiling)||allocated};
}
export function spendIssues(review:AgentReview,maximum:number,adsAllowed:boolean):string[]{
 const spend=campaignSpend(review),issues:string[]=[];
 if(review.channelCaps&&Object.entries(review.channelCaps).some(([channel,amount])=>amount>0&&!review.channels.includes(channel as PlanChannel)))issues.push('Remove budgets for unselected channels.');
 if(channelCap(review,'storefront')>0)issues.push('Printing is not a media placement. Keep its media budget at zero.');
 if(spend.media>0&&!adsAllowed)issues.push('Enable paid ads in your DNA before adding a media budget.');
 if(spend.media!==review.mediaBudgetUsd)issues.push('The media budget must match your selected channel budgets.');
 if(spend.allocated>spend.ceiling)issues.push('Your channel budgets exceed the total campaign cap.');
 if(spend.ceiling>maximum)issues.push(`Keep the total budget within your saved US$${maximum} limit.`);
 if(review.channels.includes('geofenced_ad')&&channelCap(review,'geofenced_ad')<10)issues.push('Set at least US$10 for the local ad draft.');
 return issues;
}
export function channelCostLabel(channel:PlanChannel,review:AgentReview){
 const cap=channelCap(review,channel);
 if(channel==='storefront')return 'No media spend · printing not included';
 if(channel==='whatsapp')return cap?`US$${cap} messaging ceiling · quote required`:'Provider fees to confirm · no sending enabled';
 return cap?`US$${cap} planned ad cap`:'Organic · no ad spend';
}
export function campaignMaterials(review:AgentReview,merchantName:string,when:string){
 const spend=campaignSpend(review);
 return [review.title,when,review.terms,'',...review.channels.map(channel=>`${CHANNELS[channel]} — ${CHANNEL_FORMATS[channel].format}\n${channelMaterial(channel,review,merchantName)}${channel==='storefront'&&review.staffLine?`\nStaff invitation: ${review.staffLine}`:''}\n${channelCostLabel(channel,review)}`),`Total planned ceiling: US$${spend.ceiling}. Platform fees and minimums must be confirmed before launch.`, 'Materials only. Nothing published, sent or charged.'].join('\n\n');
}
