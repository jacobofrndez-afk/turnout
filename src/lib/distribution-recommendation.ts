import { paidChannelReason, recommendCampaignChannels, type ChannelRecommendation, type ChannelContext } from "./channel-recommendation";
import { localTimeToInstant, type PlanChannel } from "./campaign-plan";
import type { LocalPromotion } from "./local-promotion";

export type DistributionRecommendation = {
  channels:PlanChannel[]; promotion:LocalPromotion; budgetUsd:number; reason:string;
  rationale:{placement:string;area:string;budget:string}; strategy:ChannelRecommendation[]; hasVisual:boolean; budgetBasis:string; budgetNote:string; channelAffinity?:ChannelContext["channelAffinity"];
};
/** A bounded planning preset, not a media price, reach estimate or Qloo conversion prediction. */
export function recommendDistribution(context:ChannelContext & {distanceKm?:number}):DistributionRecommendation {
  const strategy=recommendCampaignChannels(context);
  const channels=strategy.filter(c=>c.recommended).map(c=>c.channel);
  let hours=0;
  try {hours=(localTimeToInstant(context.startLocal,context.timezone)-context.now)/3600000;}catch{/* Invalid timing never enables a paid recommendation. */}
  const advance=hours>6,canPay=context.dna.channels.includes("geofenced_ad")&&context.dna.dailyBudgetUsd>=10;
  // A geo-targeted ad is how the crowd outside gets reached: proposed whenever the place allows paid media and there are more
  // than four hours to brief a creative and pass platform review. Closer than that, the existing audience is the realistic reach.
  const paid=hours>4&&canPay&&context.dna.goal!=="regulars";
  const placement=strategy.find(c=>c.channel==="facebook"||c.channel==="instagram")!;
  const distance=Number.isFinite(context.distanceKm)&&context.distanceKm!>=0?context.distanceKm!:0;
  const requested=Math.max(advance?2:1,distance);
  const radiusKm=[1,2,3,5,10].find(r=>r>=requested)??10;
  const targetBudget=hours>=24?25:15;
  const budgetUsd=canPay?Math.min(targetBudget,Math.floor(context.dna.dailyBudgetUsd)):0;
  return {
    strategy,hasVisual:!!context.hasVisual,budgetBasis:hours>=24?"Advance test cap":"Short-lead test cap",budgetNote:paid?"A small local test, within your saved limit.":!advance?"Starts soon: use your existing audience.":context.dna.goal==="regulars"?"Return visits: start with your own audience.":"Paid ads are off in your place DNA.",channelAffinity:context.channelAffinity,
    channels:paid?[...channels,"geofenced_ad"]:channels,
    promotion:{platform:placement.channel as LocalPromotion["platform"],radiusKm},budgetUsd,
    reason:paid?"Build local awareness ahead of the occasion, with a small test inside your saved budget.":!advance?"This starts soon: prepare your existing-audience channels. A new ad still needs setup and review.":context.dna.goal==="regulars"?"Start with your own audience to bring regulars back; keep paid acquisition optional.":"Use your organic channels. Paid advertising is not enabled in your place’s preferences.",
    rationale:{
      placement:paid?paidChannelReason(placement.channel,context.hasVisual):placement.reason,
      area:distance>0&&distance<=10?`${radiusKm} km is a proposed local area that includes the occasion, about ${distance.toFixed(1)} km away. Confirm supported targeting in the ad platform.`:`${radiusKm} km keeps this ${advance?"advance invitation":"short-notice offer"} close to your place. This is a planning radius, not a measured audience.`,
      budget:canPay?`US$${budgetUsd} is a proposed total ${hours>=24?"advance":"short-lead"} test cap, within your US$${context.dna.dailyBudgetUsd} daily preference. It is not a platform quote or an ROI estimate.`:"Paid media stays off until you enable it in your place DNA.",
    },
  };
}
export function matchesDistribution(recommendation:DistributionRecommendation,channels:PlanChannel[],promotion:LocalPromotion,budget:number) {
  const sameChannels=channels.length===recommendation.channels.length&&channels.every(c=>recommendation.channels.includes(c));
  return sameChannels&&(!channels.includes("geofenced_ad")||(promotion.platform===recommendation.promotion.platform&&promotion.radiusKm===recommendation.promotion.radiusKm&&budget===recommendation.budgetUsd));
}
