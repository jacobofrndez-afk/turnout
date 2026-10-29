import { AUDIENCE_ANGLES,audienceOffer,comparisonEffect,trendEffect,type MarketingIntelligence,type CampaignIntelligence } from '@/lib/qloo-intelligence';
import { localTimeToInstant,type CampaignPlanProposal } from '@/lib/campaign-plan';
import type { DnaRecord,MenuOffer } from '@/lib/place-dna';
import type { OfferEvidence } from '@/lib/daily-potential';
import type { SourcedOpportunity } from '@/lib/sourced-opportunity';
import type { RhythmMoment } from '@/server/qloo/rhythm';
import { proposeCampaign,proposeImmediateCampaign,proposeAheadCampaign } from './proposal';

type Context={merchantId:string;placeName:string;dna:DnaRecord;offers:MenuOffer[];evidence:OfferEvidence[];timezone:string;now:number;moments:RhythmMoment[]};
/** Qloo supplies the evidence; Turnout's explicit editorial bridges write the campaign. */
export function intelligenceProposals(context:Context,intelligence:MarketingIntelligence):SourcedOpportunity[]{
 const {dna,offers,evidence,timezone,now,moments,placeName}=context;
 if(dna.status==='suggested')return [];
 const result:SourcedOpportunity[]=[];
 const make=(id:string,title:string,offer:MenuOffer,base:CampaignPlanProposal,category:'audience'|'comparison'|'evergreen'|'trend',opening:string,proof:CampaignIntelligence)=>{
  const closing=offer.id===dna.profile.signatureOfferId?dna.profile.exampleLine:dna.profile.voice==='direct'?'Worth a stop. Better with good company.':dna.profile.voice==='refined'?'A little time together, a little closer to home.':'A familiar welcome, something good to share.';
  const slot=base.slots[0],source=category==='trend'?intelligence.sources.trends:proof.audience?intelligence.sources.audiences:intelligence.sources.comparison;
  result.push({id,title,fit:proof.change,intelligence:proof,signal:{id,title:category==='trend'?'Growing cultural interest':proof.audience?`Audience: ${proof.audience.name}`:'Two offers, compared',scope:category==='trend'?'global':'local',category,startAt:localTimeToInstant(slot.startLocal,timezone),endAt:localTimeToInstant(slot.endLocal,timezone),location:placeName,timeBasis:'interest',source:{id:'qloo-intelligence',name:category==='trend'?'Qloo · trends & taste match':'Qloo · audiences & comparison',url:'https://docs.qloo.com/reference/api-overview',checkedAt:source.retrievedAt??new Date(now).toISOString(),mode:'cache'},caution:'Qloo supplies aggregate taste signals. Turnout chooses the offer and writes the invitation. These are not identified customers or ad-platform targeting segments; nothing is automatically sent.'},proposal:{...base,slots:[slot],messages:{...base.messages,[offer.id]:`${opening}\n${offer.title} · ${offer.price}.\n${closing}`}},why:[{label:'What changes',text:proof.change},{label:'The comparison',text:proof.comparisonEffect},{label:'The trend check',text:proof.trendEffect}]});
 };
 for(const audience of intelligence.audiences.slice(0,2)){
  const offer=audienceOffer(audience,offers,evidence,dna);if(!offer)continue;
  const angle=AUDIENCE_ANGLES[audience.urn],refined=dna.profile.voice==='refined';
  const alternative=offers.find(o=>o.id===dna.profile.signatureOfferId);
  const change=offer.id!==dna.profile.signatureOfferId?`${audience.name} appears in Qloo’s local audience ranking. Turnout picks ${offer.title} instead of your usual ${alternative?.title??'signature'} for this audience, with a ${angle.kind==='wine'?'wine-discovery':'conversation-led'} invitation.`:`${audience.name} appears in Qloo’s local audience ranking. Keep ${offer.title}; change the invitation to ${angle.kind==='music'?'shared music tastes':angle.kind==='culture'?'culture and conversation':'discovery'}, in your saved voice.`;
  const proof:CampaignIntelligence={audience,change,comparison:intelligence.comparison,comparisonEffect:comparisonEffect(intelligence.comparison,offer.id),trendEffect:trendEffect(intelligence.trends),trends:intelligence.trends,sources:intelligence.sources,comparedOfferId:offer.id};
  const invite=(ahead:boolean)=>angle.kind==='wine'?(refined?`${ahead?'On your next visit, discover':'Discover'} a pour with a little character.`:`${ahead?'Next time you stop by, try':'Try'} a new pour. Find your next favourite.`):angle.kind==='music'?(refined?`${ahead?'Plan a little time':'A little time'} to talk favourite tracks, over something good.`:`Favourite tracks. Good company. ${ahead?'Make a plan to meet here.':'Meet us here.'}`):angle.kind==='culture'?(refined?`${ahead?'Make time for':'Take a moment for'} a good conversation. Bring what inspired you.`:`Something catch your eye? ${ahead?'Make a plan to':'Come'} share the story over something good.`):refined?'A little discovery, made for your next visit.':'Curious about something new? Make us your next stop.';
  const immediate=proposeImmediateCampaign(dna,offers,timezone,now,offer.id);
  const ahead=proposeAheadCampaign(dna,offers,timezone,moments,now,offer.id);
  const evergreen=proposeCampaign(dna,offers,timezone,moments,now,offer.id);
  if(immediate)make(`qloo-audience-${audience.id}-now`,angle.label,offer,immediate,'audience',invite(false),proof);
  if(ahead)make(`qloo-audience-${audience.id}-ahead`,angle.label,offer,ahead,'audience',invite(true),proof);
  if(evergreen)make(`qloo-audience-${audience.id}-evergreen`,angle.label,offer,evergreen,'evergreen',invite(true),proof);
 }
 // A true two-sided comparison prepares a different offer, not another badge on the usual campaign.
 const cmp=intelligence.comparison;
 if(cmp){
  const choice=[cmp.a,cmp.b].sort((a,b)=>b.tags.filter(t=>!cmp.shared.some(s=>s.id===t.id)).length-a.tags.filter(t=>!cmp.shared.some(s=>s.id===t.id)).length||b.tags.length-a.tags.length||Number(b===cmp.b)-Number(a===cmp.b))[0];
  const offer=offers.find(o=>o.id===choice.offerId&&o.price?.trim());
  if(offer&&choice.tags.length){
   const distinct=choice.tags.filter(t=>!cmp.shared.some(s=>s.id===t.id));
   const effect=comparisonEffect(cmp,offer.id),isBeer=choice.tags.some(t=>/craft_beer/.test(t.id)),isCocktail=choice.tags.some(t=>/cocktail_bar/.test(t.id)),isWine=choice.tags.some(t=>/wine_bar/.test(t.id));
   const opening=isWine?'A pour with its own character. Find your next favourite.':isBeer?'Local pours, different characters. Find the one you love.':isCocktail?(dna.profile.voice==='refined'?'A familiar face. A signature cocktail. A little time together.':'A favourite person. A cocktail worth catching up over.'):'Something worth sharing. Make a little time for it.';
   const proof:CampaignIntelligence={change:`Turnout compared ${cmp.a.title} and ${cmp.b.title} using their local Qloo references. ${distinct.length?'The distinct menu tags select':'The shared evidence supports'} ${offer.title} for this variation.`,comparison:cmp,comparisonEffect:effect,trendEffect:trendEffect(intelligence.trends),trends:intelligence.trends,sources:intelligence.sources,comparedOfferId:offer.id};
   const plans=[proposeImmediateCampaign(dna,offers,timezone,now,offer.id),proposeAheadCampaign(dna,offers,timezone,moments,now,offer.id)].filter((p):p is CampaignPlanProposal=>!!p);
   plans.forEach((p,i)=>make(`qloo-comparison-${offer.id}-${i}`,isWine?'Find your next favourite pour':isCocktail?'A cocktail worth catching up over':isBeer?'A little taste of craft':'Something good to share',offer,p,'comparison',i===0?opening:`For your next visit: ${opening.charAt(0).toLowerCase()+opening.slice(1)}`,proof));
  }
 }
 for(const trend of intelligence.trends.filter(t=>t.status==='rising')){
  const match=[...(trend.matchingOffers??[])].sort((a,b)=>b.tags.length-a.tags.length).find(m=>offers.some(o=>o.id===m.offerId&&o.price?.trim()&&!/game|screen|match night/i.test(o.title)));
  if(!match)continue;
  const offer=offers.find(o=>o.id===match.offerId)!;
  const plan=proposeImmediateCampaign(dna,offers,timezone,now,offer.id);if(!plan)continue;
  const proof:CampaignIntelligence={change:`${trend.name}, a cultural reference returned for this area, improved by ${trend.rankChange} positions in its latest global Qloo observations. Its taste insights include ${match.tags.map(t=>t.name).join(', ')}, matching ${offer.title}. Turnout proposes a discovery message; this is not a partnership or a local demand forecast.`,comparison:intelligence.comparison,comparisonEffect:comparisonEffect(intelligence.comparison,offer.id),trendEffect:trendEffect(intelligence.trends),trends:intelligence.trends,sources:intelligence.sources,comparedOfferId:offer.id};
  make(`qloo-trend-${trend.id}-${offer.id}`,'Your next discovery, right here',offer,plan,'trend',dna.profile.voice==='refined'?'A fresh discovery, close to home. Take a moment to enjoy it.':'Curious about a new favourite? Find it right here.',proof);
 }
 return result;
}
