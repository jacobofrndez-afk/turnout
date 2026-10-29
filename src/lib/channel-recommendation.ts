import { CHANNEL_IDS, type MenuOffer, type PlaceDna } from "./place-dna";
import { localTimeToInstant, type PlanChannel } from "./campaign-plan";
import type { OpportunitySignal } from "./opportunity-signals";
import { platformAffinity, type ChannelAffinityProfile, type ChannelAffinity } from "./channel-affinity";
export type ChannelRecommendation = { channel: PlanChannel; reason: string; requirement: string; format: string; recommended: boolean; eligible: boolean; constraint?: string; qloo?: ChannelAffinity };
export type ChannelContext = { dna: PlaceDna; offer: MenuOffer; startLocal: string; timezone: string; now: number; category?: OpportunitySignal["category"]; hasVisual?: boolean; channelAffinity?: ChannelAffinityProfile };
// Brand affinity contributes a bounded ranking weight; operational eligibility still comes first.
// These are Turnout planning weights, never Qloo conversion probabilities.
export function recommendCampaignChannels({ dna, offer, startLocal, timezone, now, category, hasVisual = false, channelAffinity }: ChannelContext): ChannelRecommendation[] {
  let hours = Infinity;
  try { hours = (localTimeToInstant(startLocal, timezone) - now) / 3600000; } catch { /* Timing is validated by the campaign. */ }
  const urgent = hours <= 6, ahead = hours >= 24;
  const familiar = (c: PlanChannel) => dna.channels.includes(c);
  const alcohol = /\b(beers?|wines?|cocktails?|aperitifs?|apéritifs?|pints?|pours?|lagers?|IPAs?|spritz|alcohol|vins?|bières?)\b/i.test(`${offer.title} ${offer.description ?? ""}`);
  const visual = /brunch|breakfast|board|plate|tasting|flight|dessert/i.test(`${offer.title} ${offer.description ?? ""}`);
  const candidates: {channel:PlanChannel; score:number; reason:string; requirement:string; format:string}[] = [
    {channel:"facebook", score:ahead ? category === "culture" || category === "calendar" ? 88 : 74 : category === "culture" || category === "calendar" ? 77 : 61, format:"Page post", reason:ahead ? "Give people time to plan: a dated post with the offer, price and place." : category === "culture" ? "Connect the outing to your offer in a local Page post people can share." : "A clear local invitation with the price and time. A text post needs no new visual.", requirement:"Choose your business Page · publish manually"},
    {channel:"instagram", score:hasVisual ? 91 : category === "market" ? 87 : visual ? 76 : 56, format:"Photo post", reason:category === "market" ? "Show the product behind the offer: a photo connects local discoveries to your menu." : urgent ? "Show what is ready today, with the time clearly on the visual." : "Let the offer do the talking: show the food, drink or atmosphere before the visit.", requirement:hasVisual ? "Review your visual and account · publish manually" : "Add a photo or video · publish manually"},
    {channel:"whatsapp", score:familiar("whatsapp") ? dna.goal === "regulars" ? ahead ? 70 : 96 : urgent && dna.goal === "quiet" ? 90 : urgent ? 74 : 45 : 20, format:"Customer message", reason:dna.goal === "regulars" ? ahead ? "Keep the direct customer reminder for closer to service; there is time to introduce the offer publicly first." : "Invite customers who already know you back for a specific offer." : "A short-notice invitation for your existing, opted-in customers.", requirement:"Use your opted-in customer list · no contacts connected"},
    {channel:"google_post", score:alcohol ? -1 : category === "market" || category === "street" ? 88 : 65, format:"Business Profile update", reason:alcohol ? "This alcohol promotion is not suitable for a Google Business post. Prepare a separate, neutral venue update." : "Put the offer on the listing people check when deciding where to go nearby.", requirement:"Use a verified business listing · profile not connected"},
    {channel:"tiktok", score:familiar("tiktok") && ahead && (visual || hasVisual) ? 94 : 28, format:"Photo post or short video", reason:ahead ? "Time to make a short product or behind-the-scenes piece for discovery." : "Useful for a visual discovery piece; not a reliable last-minute footfall plan.", requirement:"Create a photo or short video · publish in TikTok"},
    {channel:"snapchat", score:familiar("snapchat") && urgent && (visual || hasVisual) ? 92 : 25, format:"Story", reason:urgent ? "Show what is happening now to the audience you already have on Snapchat." : "Best kept for a same-day Story when the offer is ready to show.", requirement:"Add a photo or vertical video · check your Story audience"},
    {channel:"storefront", score:urgent || category === "street" || category === "weather" ? 48 : 30, format:"Chalkboard", reason:category === "weather" ? "Make the invitation visible to people passing your door during this weather window." : "Catch people already passing your door. Keep the offer, price and hours easy to read.", requirement:"Write the board and brief your team"},
    {channel:"geofenced_ad", score:-1, format:"Paid local ad", reason:"Optional amplification after choosing a creative, audience and spend limit. No acquisition cost is measured yet.", requirement:"Set up an ad account and targeting · budget approval needed"},
  ];
  const ranked = candidates.filter(c => CHANNEL_IDS.includes(c.channel)).map(c=>{
    const constraint=c.channel==="google_post"&&alcohol?"Use a neutral venue update instead of this alcohol offer."
      :c.channel==="whatsapp"&&!familiar("whatsapp")?"Add an opted-in customer list and enable WhatsApp in your DNA."
      :c.channel==="tiktok"&&!familiar("tiktok")?"TikTok is not a usual channel in your DNA."
      :c.channel==="tiktok"&&!ahead?"Allow at least a day to prepare a discovery piece."
      :c.channel==="tiktok"&&!(visual||hasVisual)?"Prepare a photo or short video for this offer."
      :c.channel==="snapchat"&&!familiar("snapchat")?"Snapchat is not a usual channel in your DNA."
      :c.channel==="snapchat"&&!urgent?"Keep a Story for the day of service."
      :c.channel==="snapchat"&&!(visual||hasVisual)?"Prepare a photo or vertical video."
      :c.channel==="geofenced_ad"?"Paid placement is prepared separately from organic channels.":undefined;
    const qloo=platformAffinity(channelAffinity,c.channel,now);
    const bonus=qloo?48*(1-(qloo.rank-1)/Math.max(1,channelAffinity!.rankings.length-1)):0;
    return {...c,eligible:!constraint,constraint,qloo,score:constraint?-1:c.score+bonus};
  }).sort((a,b)=>b.score-a.score);
  const primary = ranked[0].channel;
  // One acquisition destination, with an in-place reminder if the merchant uses it.
  const support = familiar("storefront") && primary !== "storefront" ? "storefront" : undefined;
  return ranked.map(({score:_, ...c})=>({...c,recommended:c.channel === primary || c.channel === support}));
}
export function googlePromotionNote(text: string): string | undefined {
  return /\b(beers?|wines?|cocktails?|aperitifs?|apéritifs?|pints?|lagers?|IPAs?|spritz|alcohol|vins?|bières?)\b/i.test(text) ? "Google Business posts cannot promote alcohol offers. Adapt this to a neutral venue update before using it there." : undefined;
}

export function paidChannelReason(channel:PlanChannel,hasVisual=false):string {
  const format=channel==="instagram"?"A local Instagram photo ad puts the offer and atmosphere first.":"A local Facebook Feed ad pairs the offer, price and service window.";
  return `${format} ${hasVisual?"Review your visual before ad setup.":"Add a photo before ad setup."}`;
}
