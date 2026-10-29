import type { DnaRecord, MenuOffer } from './place-dna';
import type { OfferEvidence, TasteEvidence } from './daily-potential';

export type IntelligenceSource = { status:'available'|'empty'|'unavailable'; retrievedAt:string|null; endpoint:string; detail:string };
export type LocalAudience = { id:string; urn:string; name:string; rank:number };
export type OfferComparison = {
  a:{offerId:string;title:string;places:{id:string;name:string}[];tags:TasteEvidence[]};
  b:{offerId:string;title:string;places:{id:string;name:string}[];tags:TasteEvidence[]};
  shared:TasteEvidence[];
};
export type TrendReading = {id:string;name:string;status:'rising'|'stable'|'falling'|'stale'|'empty'|'unavailable';points:{date:string;rank:number}[];latestDate?:string;rankChange?:number;matchingOffers?:{offerId:string;tags:TasteEvidence[]}[]};
export type MarketingIntelligence = { audiences:LocalAudience[]; comparison?:OfferComparison; trends:TrendReading[]; sources:{audiences:IntelligenceSource;comparison:IntelligenceSource;trends:IntelligenceSource} };
export type CampaignIntelligence = {audience?:LocalAudience;change:string;comparison?:OfferComparison;comparisonEffect:string;trendEffect:string;trends:TrendReading[];sources:MarketingIntelligence['sources'];comparedOfferId?:string};
// Editorial bridges are explicit. Only these leisure interests can influence campaign copy.
// No demographic, political, religious or health segment is used for marketing decisions.
export const AUDIENCE_ANGLES:Record<string,{kind:'wine'|'culture'|'music'|'food'|'discovery';label:string}>={
  'urn:audience:hobbies_and_interests:wine_enthusiast':{kind:'wine',label:'For curious wine lovers'},
  'urn:audience:leisure:museums':{kind:'culture',label:'Make room for a little culture'},
  'urn:audience:leisure:arts_culture':{kind:'culture',label:'Good conversation starts here'},
  'urn:audience:hobbies_and_interests:photography':{kind:'culture',label:'A new perspective, a familiar welcome'},
  'urn:audience:leisure:music_festivals':{kind:'music',label:'Good taste. Good company.'},
  'urn:audience:leisure:cinephile':{kind:'culture',label:'Something worth talking about'},
  'urn:audience:leisure:foodie':{kind:'food',label:'Let your next discovery be delicious'},
  'urn:audience:leisure:cooking':{kind:'food',label:'A little more flavour in your day'},
  'urn:audience:hobbies_and_interests:travel':{kind:'discovery',label:'Discover a little local character'},
};
type Row=Record<string,unknown>;
const rows=(v:unknown):Row[]=>Array.isArray(v)?v.filter(x=>!!x&&typeof x==='object') as Row[]:[];
export function selectLocalAudiences(catalog:unknown,ranked:unknown):LocalAudience[]{
  const byId=new Map(rows(catalog).filter(a=>typeof a.id==='string'&&AUDIENCE_ANGLES[a.id]).map(a=>[String(a.entity_id).toUpperCase(),a]));
  return rows(ranked).flatMap((a,index)=>{const match=byId.get(String(a.entity_id).toUpperCase());const affinity=(a.query as Row|undefined)?.affinity;
    return match&&typeof affinity==='number'&&Number.isFinite(affinity)?[{id:String(match.entity_id),urn:String(match.id),name:String(match.name),rank:index+1}]:[];
  }).filter((a,i,all)=>all.findIndex(b=>b.id===a.id)===i).slice(0,3);
}
export function parseComparisonTags(value:unknown):TasteEvidence[]{
  return [...new Map(rows(value).flatMap(t=>{const id=t.tag_id??t.id;return typeof id==='string'&&typeof t.name==='string'&&/^urn:tag:(ambience|experience|offerings|genre|cuisine|dining_options):/.test(id)?[[id,{id,name:t.name}] as const]:[];})).values()];
}
/** Rank is an ordered measure within a single entity's series, never a success probability. */
export function readTrend(id:string,name:string,value:unknown,now:number):TrendReading {
  const points=[...new Map(rows(value).flatMap(p=>{
    const date=typeof p.date==='string'?p.date.slice(0,10):'',rank=Number(p.population_rank),at=Date.parse(`${date}T00:00:00Z`);
    return /^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(at)&&new Date(at).toISOString().slice(0,10)===date&&at<=now&&typeof p.population_rank!=='boolean'&&p.population_rank!==null&&Number.isFinite(rank)&&rank>0?[[date,{date,rank}] as const]:[];
  })).values()].sort((a,b)=>a.date.localeCompare(b.date));
  const last=points.at(-1);if(!last)return {id,name,status:'empty',points:[]};
  const recent=points.filter(p=>Date.parse(p.date)>=now-35*86400000);
  if(Date.parse(last.date)<now-14*86400000||recent.length<2)return {id,name,status:'stale',points:recent,latestDate:last.date};
  const prior=recent.at(-2)!,change=prior.rank-last.rank;
  return {id,name,status:change>0?'rising':change<0?'falling':'stable',points:recent,latestDate:last.date,rankChange:change};
}
export function audienceOffer(a:LocalAudience,offers:MenuOffer[],evidence:OfferEvidence[],dna:DnaRecord):MenuOffer|undefined {
  const kind=AUDIENCE_ANGLES[a.urn]?.kind;if(!kind)return;
  const supported=offers.filter(o=>o.price?.trim()&&evidence.some(e=>e.offerId===o.id&&(e.matchingTastes.length||e.matchingPlaces.length))&&!/game|screen|match night/i.test(o.title));
  const candidates=kind==='wine'?supported.filter(o=>/\bwine\b|\bvin\b/i.test(`${o.title} ${o.description??''}`)):supported.filter(o=>!/late.night|midnight/i.test(o.title));
  return [...candidates].sort((a,b)=>{
    const weight=(o:MenuOffer)=>{const e=evidence.find(e=>e.offerId===o.id)!;return e.matchingTastes.length*10+Math.min(e.matchingPlaces.length,5)*2+Number(o.id===dna.profile.signatureOfferId)*3;};return weight(b)-weight(a);
  })[0];
}
export function comparisonEffect(comparison:OfferComparison|undefined,offerId:string):string {
  if(!comparison)return 'A comparison is not available for this offer. The menu and local taste evidence still apply.';
  const chosen=comparison.a.offerId===offerId?comparison.a:comparison.b.offerId===offerId?comparison.b:undefined;
  if(!chosen)return 'This offer was not part of the two-offer comparison.';
  const other=chosen===comparison.a?comparison.b:comparison.a;
  const distinct=chosen.tags.filter(t=>!comparison.shared.some(x=>x.id===t.id));
  return distinct.length?`Compared with ${other.title}, the reference places for ${chosen.title} add ${distinct.slice(0,2).map(t=>t.name).join(' and ')}. These tags distinguish the two reference groups.`:`The reference groups for ${chosen.title} and ${other.title} share their relevant menu tags. Keep the choice grounded in your menu and audience; no clear comparative edge was found.`;
}
export function trendEffect(trends:TrendReading[]):string {
  const recent=trends.filter(t=>['rising','stable','falling'].includes(t.status));
  if(!recent.length)return 'No recent, comparable trend series. No trend-based urgency or extra budget.';
  if(recent.some(t=>t.status==='rising'))return 'Some cultural references are rising. Only a verified menu connection can turn that signal into a timely campaign; no automatic budget increase.';
  return 'The available cultural references show no rise. Keep this invitation evergreen; no “trending now” claim or extra spend.';
}
