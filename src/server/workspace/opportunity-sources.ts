import { discoverySources } from "@/server/sources/discovery";
import { dedupeSignals, type Observation } from "@/lib/discovery-signals";
import { cacheGet, cacheSet } from "@/server/db/client";
import { calendarDays } from "@/lib/calendar";
import { localTimeToInstant } from "@/lib/campaign-plan";
import { calendarSignals, distanceKm, parisSignals, nycSignals, type OpportunitySignal, type SourceCoverage, type SignalSource, type ParisListing, type NycListing } from "@/lib/opportunity-signals";
import { manhattanPoints } from "@/server/events/street";
import type { Merchant } from "@/server/events/radar";
async function publicJson<T>(url:URL):Promise<{data:T;checkedAt:string;mode:"live"|"cache"}> {
  const key={url:url.href};const stored=cacheGet<{data:T;checkedAt:string}>("today-public-sources-v1",key);
  if(stored)return {...stored,mode:"cache"};
  const response=await fetch(url,{signal:AbortSignal.timeout(8000),cache:"no-store",headers:{Accept:"application/json"}});
  if(!response.ok)throw new Error(`Public source returned ${response.status}`);
  const result={data:await response.json() as T,checkedAt:new Date().toISOString()};
  cacheSet("today-public-sources-v1",key,result,3600);return {...result,mode:"live"};
}
export async function opportunitySources(merchant:Merchant,now=Date.now()):Promise<{signals:OpportunitySignal[];coverage:SourceCoverage[];observations:Observation[]}> {
  const discovery = discoverySources(merchant,now);
  const days=calendarDays(now,merchant.timezone,8),from=days[0].key,to=days[7].key,until=localTimeToInstant(`${to}T00:00`,merchant.timezone);
  const signals=calendarSignals(merchant.timezone,now,until),coverage:SourceCoverage[]=signals.map(s=>({name:s.source.name,url:s.source.url,state:"available",checkedAt:s.source.checkedAt,detail:"International calendar · verified reference for 31 October 2026. Not a live trend feed."}));
  const paris=distanceKm(merchant,{lat:48.8566,lon:2.3522})<25,nyc=distanceKm(merchant,{lat:40.74845,lon:-73.98482})<15;
  if(paris) {
    const name="City of Paris · Que faire à Paris",url="https://opendata.paris.fr/explore/dataset/que-faire-a-paris-/";
    try {
      const endpoint=new URL("https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records");
      endpoint.searchParams.set("where",`within_distance(lat_lon, geom'POINT(${merchant.lon} ${merchant.lat})', ${Math.min(merchant.radius_m,5000)}m) AND date_end >= '${from}' AND date_start <= '${to}'`);
      endpoint.searchParams.set("limit","100");endpoint.searchParams.set("select","id,title,occurrences,address_name,qfap_tags,lat_lon,url");
      const result=await publicJson<{total_count:number;results:ParisListing[]}>(endpoint);
      if(!Array.isArray(result.data.results))throw new Error("Invalid city response");
      const source:SignalSource={id:"paris-agenda",name,url,checkedAt:result.checkedAt,mode:result.mode};
      const local=parisSignals(result.data.results,merchant,source,now,until);signals.push(...local);
      coverage.push({name,url,state:"available",checkedAt:source.checkedAt,detail:`${local.length} upcoming cultural sessions within ${(merchant.radius_m/1000).toFixed(1)} km. ${result.mode==="cache"?"Cached response":"Fetched from the city"}; refreshed at most hourly.${result.data.total_count>100?" First 100 listings sampled; coverage is partial.":""} Family activities and listings without usable session times are excluded from these bar campaigns.`});
    }catch{coverage.push({name,url,state:"unavailable",checkedAt:null,detail:"The city agenda could not be checked. No local cultural proposal is invented to replace it."});}
    // This reference adds context to adult cultural outings; it is never an alcohol audience segment.
    if(from<"2026-11-02"&&to>"2026-10-17")coverage.push({name:"French Ministry of Education",url:"https://www.education.gouv.fr/calendrier-scolaire-toutes-les-dates-des-cours-et-des-vacances-100148?annee=308",state:"available",checkedAt:"2026-10-25",detail:"National calendar reference · Toussaint school break, 17 October–2 November 2026. Context only: no demand uplift or child-targeted campaign is inferred."});
  }else if(nyc) {
    const name="NYC Open Data · permitted events",url="https://data.cityofnewyork.us/City-Government/Permitted-Event-Information/tvpp-9vvx";
    try {
      const endpoint=new URL("https://data.cityofnewyork.us/resource/tvpp-9vvx.json");
      endpoint.searchParams.set("$where",`start_date_time >= '${from}T00:00:00' AND start_date_time < '${to}T00:00:00' AND event_borough='Manhattan' AND event_type in ('Farmers Market','Street Festival','Single Block Festival','Street Event','Plaza Event','Plaza Partner Event','Open Street Partner Event','Parade')`);
      endpoint.searchParams.set("$limit","2000");endpoint.searchParams.set("$order","start_date_time");
      endpoint.searchParams.set("$select","event_id,event_name,start_date_time,end_date_time,event_type,event_borough,event_location");
      const result=await publicJson<NycListing[]>(endpoint);if(!Array.isArray(result.data))throw new Error("Invalid city response");
      const source:SignalSource={id:"nyc-permits",name,url,checkedAt:result.checkedAt,mode:result.mode};
      const local=nycSignals(result.data,merchant,source,now,until,manhattanPoints);signals.push(...local);
      coverage.push({name,url,state:"available",checkedAt:source.checkedAt,detail:`${local.length} upcoming permits within approximately ${(merchant.radius_m/1000).toFixed(1)} km. ${result.mode==="cache"?"Cached response":"Fetched from the city"}; refreshed at most hourly. Only street locations that can be mapped are included.${result.data.length===2000?" Response limit reached; coverage is partial.":""} Permit times can include setup and breakdown.`});
    }catch{coverage.push({name,url,state:"unavailable",checkedAt:null,detail:"The city permit feed could not be checked. No street event is invented to replace it."});}
  }else coverage.push({name:"Local public agenda",url:"",state:"unsupported",checkedAt:null,detail:"Local city sources currently cover Paris and Manhattan. Menu-led ideas remain available."});
  const extra = await discovery;
  return {signals:dedupeSignals([...signals,...extra.signals],merchant.timezone),coverage:[...coverage,...extra.coverage],observations:extra.observations};
}
