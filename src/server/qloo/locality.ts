import { compareLocalityOffers, type LocalityComparison, type LocalityOffer } from '@/lib/locality-comparison';
import { rankShortlist, type Signal, type QlooCall } from './api';

type Area = {lat:number;lon:number;radiusM:number};
export async function compareOfferLocality(offers: LocalityOffer[], signal: Signal, area: Area, onCall?: (c:QlooCall)=>void, rank=rankShortlist): Promise<LocalityComparison> {
  const ids=[...new Set(offers.flatMap(o=>o.references.map(r=>r.id)))];
  const fallback:LocalityComparison={status:'insufficient',radiusM:area.radiusM,candidateCount:ids.length,comparableCount:0,offers:[],excludedOffers:offers.map(o=>o.title),eventLeaders:[],localLeaders:[],reason:'Not enough comparable local references. The campaign uses the original event analysis.'};
  if(offers.filter(o=>o.references.length>=2).length<2||ids.length<2||ids.length>50)return fallback;
  try {
    // Same candidates, geographic filter and ranking method; only the location signal changes.
    const event=await rank('place',ids,signal,{area,onCall});
    const local=await rank('place',ids,signal,{area,localize:true,onCall});
    return compareLocalityOffers(offers,event,local,area.radiusM);
  } catch {
    return {...fallback,status:'unavailable',reason:'Qloo could not complete the local comparison. The campaign uses the original event analysis.'};
  }
}
