import { cacheGet,cacheSet,cacheKey,getDb } from '@/server/db/client';
import { qlooGet } from '@/server/qloo/api';
import { QLOO_CHANNELS,parseChannelAffinities,type AffinityChannel,type CampaignChannelAffinities,type ChannelAffinityProfile } from '@/lib/channel-affinity';
import type { IntelligenceSource,LocalAudience } from '@/lib/qloo-intelligence';
import type { OfferEvidence } from '@/lib/daily-potential';

type ReadResult={body:any;source:IntelligenceSource};
export type ChannelAffinityRead=(path:string,params:Record<string,string>)=>Promise<ReadResult>;
const missing=(detail:string):IntelligenceSource=>({status:'unavailable',endpoint:'/v2/insights',retrievedAt:null,detail});
async function read(path:string,params:Record<string,string>):Promise<ReadResult>{
 const key={path,params};
 if(cacheGet<boolean>('qloo-channel-failure',key))return {body:{},source:missing('Channel affinities are temporarily unavailable.')};
 try {
  const body=await qlooGet(path,params,{ttl:path==='/search'?604800:86400});
  const meta=getDb().prepare('SELECT created_at FROM api_cache WHERE key=?').get(cacheKey('qloo',key)) as {created_at:string}|undefined;
  return {body,source:{status:'available',endpoint:path,retrievedAt:meta?`${meta.created_at.replace(' ','T')}Z`:null,detail:''}};
 } catch {cacheSet('qloo-channel-failure',key,true,300);return {body:{},source:missing('Qloo channel affinities are unavailable; timing and format rules still apply.')};}
}
// Small batches avoid bursts against the shared API limit. Every successful request is cached.
async function batch<T,R>(items:T[],fn:(item:T)=>Promise<R>):Promise<R[]>{
 const out:R[]=[];for(let i=0;i<items.length;i+=3)out.push(...await Promise.all(items.slice(i,i+3).map(fn)));return out;
}
export async function campaignChannelAffinities(audiences:LocalAudience[],evidence:OfferEvidence[],fetcher:ChannelAffinityRead=read):Promise<CampaignChannelAffinities>{
 const safe:ChannelAffinityRead=async(path,params)=>{try{return await fetcher(path,params);}catch{return {body:{},source:missing('Qloo channel affinities are unavailable.')};}};
 const catalog=await batch([...QLOO_CHANNELS],async c=>{
  const r=await safe('/search',{query:c.name,types:'urn:entity:brand',take:'6'});
  const matches=Array.isArray(r.body?.results)?r.body.results.filter((e:any)=>e?.name?.toLowerCase()===c.name.toLowerCase()&&typeof e.entity_id==='string'&&(e.types?.includes('urn:entity:brand')||e.subtype==='urn:entity:brand')):[];
  return matches.length===1?{channel:c.channel as AffinityChannel,id:matches[0].entity_id as string,name:c.name}:undefined;
 });
 const resolved=catalog.filter((c):c is NonNullable<typeof c>=>!!c);
 const jobs=[
  ...audiences.slice(0,3).map(a=>({key:a.id,basis:'audience' as const,label:a.name,inputs:[{id:a.urn,name:a.name}],signal:{'signal.demographics.audiences':a.urn}})),
  ...evidence.map(e=>({key:e.offerId,basis:'references' as const,label:`Local references for ${e.title}`,inputs:e.matchingPlaces.slice(0,3).map(p=>({id:p.id,name:p.name})),signal:{'signal.interests.entities':e.matchingPlaces.slice(0,3).map(p=>p.id).join(',')}})),
 ];
 const profiles:CampaignChannelAffinities={audiences:{},offers:{}};
 await batch(jobs,async job=>{
  let profile:ChannelAffinityProfile={basis:job.basis,contextLabel:job.label,inputs:job.inputs,rankings:[],source:missing('At least two resolved platforms and a Qloo signal are needed.')};
  if(resolved.length>=2&&job.inputs.length){
   const result=await safe('/v2/insights',{'filter.type':'urn:entity:brand','filter.results.entities':resolved.map(c=>c.id).join(','),...job.signal,take:'6'} as Record<string,string>);
   const rankings=parseChannelAffinities(result.body?.results?.entities,resolved);
   profile={...profile,rankings,source:{...result.source,status:result.source.status==='unavailable'?'unavailable':rankings.length>=2?'available':'empty',detail:`${rankings.length} of 6 platforms returned with affinity. Qloo brand affinity, not platform usage, ad reach or conversion. Google Maps is a proxy for listing discovery.`}};
  }
  (job.basis==='audience'?profiles.audiences:profiles.offers)[job.key]=profile;
 });
 return profiles;
}
