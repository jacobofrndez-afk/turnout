import { cacheKey, getDb } from "@/server/db/client";
import { qlooGet, tagId, type QlooEntity, type QlooTag } from "@/server/qloo/api";
import type { QlooSnapshot, TasteEvidence } from "@/lib/daily-potential";
export async function dailyQloo(merchant:{lat:number;lon:number}):Promise<QlooSnapshot> {
  const point=`POINT(${merchant.lon} ${merchant.lat})`;
  const requests:{kind:"tastes"|"places";params:Record<string,string>}[]=[
    {kind:"tastes" as const,params:{"filter.type":"urn:tag","signal.location":point,"filter.parents.types":"urn:entity:place",take:"40"}},
    {kind:"places" as const,params:{"filter.type":"urn:entity:place","signal.location":point,"filter.location":point,"filter.location.radius":"1500",take:"50"}},
  ];
  const results=await Promise.allSettled(requests.map(async request=>{
    const params=request.params;
    const body=await qlooGet<{results?:{tags?:QlooTag[];entities?:QlooEntity[]}}>("/v2/insights",params);
    const metadata=getDb().prepare("SELECT created_at FROM api_cache WHERE key=?").get(cacheKey("qloo",{path:"/v2/insights",params})) as {created_at:string}|undefined;
    return {body,retrievedAt:metadata?`${metadata.created_at.replace(" ","T")}Z`:null};
  }));
  const cleanTags=(tags:QlooTag[]):TasteEvidence[]=>[...new Map(tags.filter(t=>tagId(t)&&t.name).map(t=>[tagId(t),{id:tagId(t),name:t.name}])).values()];
  const tastes=results[0].status==="fulfilled"?cleanTags(results[0].value.body.results?.tags??[]):[];
  const entities=results[1].status==="fulfilled"?results[1].value.body.results?.entities??[]:[];
  const places=[...new Map(entities.filter(e=>e.entity_id&&e.name).map(e=>[e.entity_id,{id:e.entity_id,name:e.name,tags:cleanTags(e.tags??[])}])).values()];
  return {tastes,places,sources:requests.map((r,i)=>({kind:r.kind,status:results[i].status==="fulfilled"?"available":"unavailable",retrievedAt:results[i].status==="fulfilled"?results[i].value.retrievedAt:null,count:i===0?tastes.length:places.length}))};
}
