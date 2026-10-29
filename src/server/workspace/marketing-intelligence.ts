import { cacheGet,cacheSet,cacheKey,getDb } from '@/server/db/client';
import { qlooGet } from '@/server/qloo/api';
import { selectLocalAudiences,parseComparisonTags,readTrend,audienceOffer,type MarketingIntelligence,type IntelligenceSource,type TrendReading,type OfferComparison } from '@/lib/qloo-intelligence';
import type { QlooSnapshot,OfferEvidence } from '@/lib/daily-potential';
import type { DnaRecord,MenuOffer } from '@/lib/place-dna';

type Body={results?:{audiences?:unknown[];entities?:unknown[];a?:unknown[];b?:unknown[];tags?:unknown[];trending?:unknown[]}};
type Result={body:Body;source:IntelligenceSource};
export type IntelligenceRead=(path:string,params:Record<string,string>,ttl:number)=>Promise<Result>;
const unavailable=(endpoint:string,detail:string):IntelligenceSource=>({endpoint,status:'unavailable',retrievedAt:null,detail});
async function read(path:string,params:Record<string,string>,ttl:number):Promise<Result>{
 const key={path,params};
 const recentFailure=cacheGet<true>('qloo-intelligence-failure',key);
 if(recentFailure)return {body:{},source:unavailable(path,'Temporarily unavailable. Retrying after a short pause.')};
 try{
  const body=await qlooGet<Body>(path,params,{ttl});
  const meta=getDb().prepare('SELECT created_at FROM api_cache WHERE key=?').get(cacheKey('qloo',key)) as {created_at:string}|undefined;
  return {body,source:{endpoint:path,status:'available',retrievedAt:meta?`${meta.created_at.replace(' ','T')}Z`:null,detail:''}};
 }catch{cacheSet('qloo-intelligence-failure',key,true,300);return {body:{},source:unavailable(path,'Qloo did not return usable data. No replacement evidence was invented.')};}
}
type Context={merchant:{id:string;lat:number;lon:number};snapshot:QlooSnapshot;evidence:OfferEvidence[];offers:MenuOffer[];dna:DnaRecord;now:number};
const safeArray=(x:unknown):Record<string,any>[]=>Array.isArray(x)?x.filter(a=>a&&typeof a==='object'):[];
export async function marketingIntelligence(context:Context,fetcher:IntelligenceRead=read):Promise<MarketingIntelligence>{
 const {merchant,evidence,offers,dna,now}=context,point=`POINT(${merchant.lon} ${merchant.lat})`;
 const safeRead: IntelligenceRead=async(path,params,ttl)=>{try{return await fetcher(path,params,ttl);}catch{return {body:{},source:unavailable(path,'Qloo is currently unavailable.')};}};
 const [hobbies,leisure,local,brands]=await Promise.all([
  safeRead('/v2/audiences',{'filter.parents.types':'urn:audience:hobbies_and_interests',take:'50'},604800),
  safeRead('/v2/audiences',{'filter.parents.types':'urn:audience:leisure',take:'50'},604800),
  safeRead('/v2/insights',{'filter.type':'urn:audience','signal.location':point,'filter.parents.types':'urn:audience:hobbies_and_interests,urn:audience:leisure',take:'20'},86400),
  safeRead('/v2/insights',{'filter.type':'urn:entity:brand','signal.location':point,take:'3'},604800),
 ]);
 const audiences=selectLocalAudiences([...safeArray(hobbies.body.results?.audiences),...safeArray(leisure.body.results?.audiences)],local.body.results?.entities);
 const audienceSource={...local.source,status:local.source.status==='unavailable'?'unavailable' as const:audiences.length?'available' as const:'empty' as const,detail:`${audiences.length} relevant leisure audiences in the returned local ranking. Qloo affinity is not a headcount or an addressable ad audience.`};
 if(hobbies.source.status==='unavailable'||leisure.source.status==='unavailable')audienceSource.detail+=' Audience catalog coverage is partial.';
 const usable=evidence.filter(e=>offers.some(o=>o.id===e.offerId&&o.price?.trim())&&e.matchingPlaces.length&&!/game|screen|match night/i.test(e.title));
 const signature=usable.find(e=>e.offerId===dna.profile.signatureOfferId);
 // Compare menu categories through disjoint, real nearby reference places. Never pretend our demo venue is a Qloo entity.
 const audienceChoice=audiences.map(a=>audienceOffer(a,offers,evidence,dna)).find(o=>o&&o.id!==signature?.offerId)?.id;
 const alternative=usable.filter(e=>e.offerId!==signature?.offerId&&e.matchingPlaces.some(p=>!signature?.matchingPlaces.some(a=>a.id===p.id))).sort((a,b)=>Number(b.offerId===audienceChoice)-Number(a.offerId===audienceChoice)||b.matchingTastes.length-a.matchingTastes.length||b.matchingPlaces.length-a.matchingPlaces.length)[0];
 let comparison:OfferComparison|undefined;
 let comparisonSource=unavailable('/v2/analysis/compare','Two distinct local reference groups are needed for a menu comparison.');
 const comparePromise=(async()=>{
  if(!signature||!alternative)return;
  const a=signature.matchingPlaces.slice(0,3),b=alternative.matchingPlaces.filter(p=>!a.some(x=>x.id===p.id)).slice(0,3);if(!a.length||!b.length)return;
  const result=await safeRead('/v2/analysis/compare',{'a.signal.interests.entities':a.map(p=>p.id).join(','),'b.signal.interests.entities':b.map(p=>p.id).join(','),take:'30'},604800);
  comparisonSource=result.source;
  const tagsA=parseComparisonTags(result.body.results?.a),tagsB=parseComparisonTags(result.body.results?.b);
  // Only retain explicit saved menu tags: neighbour amenities are not promises about this business.
  const forOffer=(tags:typeof tagsA,e:OfferEvidence)=>tags.filter(t=>e.menuTags.some(x=>x.id===t.id));
  if(tagsA.length&&tagsB.length){comparison={a:{offerId:signature.offerId,title:signature.title,places:a.map(p=>({id:p.id,name:p.name})),tags:forOffer(tagsA,signature)},b:{offerId:alternative.offerId,title:alternative.title,places:b.map(p=>({id:p.id,name:p.name})),tags:forOffer(tagsB,alternative)},shared:tagsA.filter(t=>tagsB.some(b=>b.id===t.id)&&[...signature.menuTags,...alternative.menuTags].some(m=>m.id===t.id))};comparisonSource.detail='Qloo compares the tags of nearby reference places for two menu offers. This is not a comparison of customers, sales or conversion.';}
  else if(result.source.status!=='unavailable')comparisonSource={...result.source,status:'empty',detail:'Qloo returned no usable two-sided comparison.'};
 })();
 const end=new Date(now).toISOString().slice(0,10),start=new Date(now-180*86400000).toISOString().slice(0,10);
 const brandList=safeArray(brands.body.results?.entities).filter(b=>typeof b.entity_id==='string'&&typeof b.name==='string').slice(0,3);
 const trendResults=await Promise.all(brandList.map(async brand=>{
  const r=await safeRead('/v2/trending',{'filter.type':'urn:entity:brand','signal.interests.entities':brand.entity_id,'filter.start_date':start,'filter.end_date':end,take:'30'},21600);
  const reading:TrendReading=r.source.status==='unavailable'?{id:brand.entity_id,name:brand.name,status:'unavailable',points:[]}:readTrend(brand.entity_id,brand.name,r.body.results?.trending,now);
  if(reading.status==='rising'){
   const taste=await safeRead('/v2/insights',{'filter.type':'urn:tag','signal.interests.entities':brand.entity_id,'filter.parents.types':'urn:entity:place',take:'40'},86400);
   const grounded=safeArray(taste.body.results?.tags).filter(t=>typeof t.query?.affinity==='number'&&Number.isFinite(t.query.affinity));
   const tags=parseComparisonTags(grounded);
   reading.matchingOffers=evidence.flatMap(e=>{const matching=tags.filter(t=>e.menuTags.some(m=>m.id===t.id));return matching.length?[{offerId:e.offerId,tags:matching}]:[];});
  }
  return {reading,source:r.source};
 }));
 await comparePromise;
 const trends=trendResults.map(r=>r.reading),valid=trendResults.filter(r=>['rising','stable','falling'].includes(r.reading.status));
 const trendsSource:IntelligenceSource={endpoint:'/v2/trending',status:valid.length?'available':trendResults.some(r=>r.source.status!=='unavailable')?'empty':'unavailable',retrievedAt:trendResults.map(r=>r.source.retrievedAt).filter((v):v is string=>!!v).sort()[0]??null,detail:`${valid.length} recent comparable series out of ${brandList.length} nearby cultural brand references. Observed ${start} to ${end}; the time series is global, not local footfall. Missing, stale or flat series never create urgency.`};
 return {audiences,comparison,trends,sources:{audiences:audienceSource,comparison:comparisonSource,trends:trendsSource}};
}
