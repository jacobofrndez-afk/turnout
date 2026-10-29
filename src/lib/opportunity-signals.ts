import { localTimeToInstant, localStampAt } from "./campaign-plan";
export type SignalSource = { id:string; name:string; url:string; checkedAt:string; mode:"live"|"cache"|"reference" };
export type OpportunitySignal = {
  id:string; title:string; scope:"global"|"local"; category:"calendar"|"culture"|"market"|"street"|"trend"|"weather"|"rhythm"|"taste"|"menu"|"evergreen"|"audience"|"comparison";
  startAt:number; endAt:number; location:string; distanceKm?:number; approximate?:boolean; timeConflict?:boolean;
  offerIds?:string[]; timeBasis:"published"|"permit"|"date"|"interest"|"forecast"|"inferred"|"menu"; source:SignalSource; caution:string;
};
export type SourceCoverage = { name:string; url:string; state:"available"|"unavailable"|"unsupported"|"disabled"; checkedAt:string|null; detail:string };
export type SignalArea = { lat:number; lon:number; radius_m:number; timezone:string };
export type ParisListing = { id:string; title:string; occurrences?:string|null; address_name?:string; qfap_tags?:string; lat_lon?:{lat:number;lon:number}; url?:string };
export type NycListing = { event_id:string; event_name:string; start_date_time:string; end_date_time:string; event_type:string; event_borough:string; event_location:string };
export const FAMILY_OR_SERVICE = /enfants|famille|jeunesse|bébé|bebe|crèche|creche|kids|children|family|halloween.*celebration|school|health|santé|sante|dépistage|depistage|outreach|vaccin/i;
export function distanceKm(a:{lat:number;lon:number},b:{lat:number;lon:number}) {
  const rad=(v:number)=>v*Math.PI/180,dlat=rad(b.lat-a.lat),dlon=rad(b.lon-a.lon);
  return 6371*2*Math.atan2(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2),Math.sqrt(1-(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2)));
}
function inWindow(start:number,end:number,now:number,until:number) {return Number.isFinite(start)&&Number.isFinite(end)&&end>start&&end>now&&start<until&&end-start<=14*3600000;}
export function parisSignals(rows:ParisListing[],area:SignalArea,source:SignalSource,now:number,until:number):OpportunitySignal[] {
  const results:OpportunitySignal[]=[];
  for(const row of rows) {
    if(!row.lat_lon||!row.title||!row.occurrences||FAMILY_OR_SERVICE.test(`${row.title} ${row.qfap_tags??""}`))continue;
    if(!/expo|écran|ecran|cinéma|cinema|photo|littérature|litterature|lecture|book|reading|musique|concert|jam|bal\b/i.test(`${row.title} ${row.qfap_tags??""}`))continue;
    const distance=distanceKm(area,row.lat_lon);if(!Number.isFinite(distance)||distance>area.radius_m/1000)continue;
    let url:URL;try{url=new URL(row.url??"");if(url.protocol!=="https:"||url.hostname!=="www.paris.fr")continue;}catch{continue;}
    for(const occurrence of row.occurrences.split(";")) {
      const [from,to]=occurrence.split("_");
      if(!from||!to||!/(Z|[+-]\d{2}:\d{2})$/.test(from)||!/(Z|[+-]\d{2}:\d{2})$/.test(to))continue;
      const startAt=Date.parse(from),endAt=Date.parse(to);if(!inWindow(startAt,endAt,now,until))continue;
      const timeConflict=localStampAt(startAt,area.timezone)!==from.slice(0,16)||localStampAt(endAt,area.timezone)!==to.slice(0,16);
      results.push({id:`paris-${row.id}-${startAt}`,title:row.title,scope:"local",category:"culture",startAt,endAt,location:row.address_name||"Paris",distanceKm:distance,timeBasis:"published",timeConflict,source:{...source,url:url.href},caution:timeConflict?"Schedule check needed: the city feed’s clock offsets differ from Paris local time on this date. The occasion and date are listed, but confirm the exact hours on the organiser’s page before sharing. No visitor data is supplied.":"Times use the offsets supplied by the city feed. Check the organiser’s listing before sharing. No visitor or audience data is supplied."});
    }
  }
  return [...new Map(results.map(s=>[s.id,s])).values()].sort((a,b)=>a.startAt-b.startAt||(a.distanceKm??0)-(b.distanceKm??0));
}
export function nycSignals(rows:NycListing[],area:SignalArea,source:SignalSource,now:number,until:number,locate:(location:string)=>{lat:number;lon:number}[]):OpportunitySignal[] {
  const results:OpportunitySignal[]=[];
  for(const row of rows) {
    if(row.event_borough!=="Manhattan"||!row.event_name||FAMILY_OR_SERVICE.test(row.event_name)||!/^(Farmers Market|Street Festival|Single Block Festival|Street Event|Plaza Event|Plaza Partner Event|Open Street Partner Event|Parade)$/.test(row.event_type))continue;
    const points=locate(row.event_location??"");if(!points.length)continue;
    const distance=Math.min(...points.map(p=>distanceKm(area,p)));if(distance>area.radius_m/1000)continue;
    try {
      const startAt=localTimeToInstant(row.start_date_time.slice(0,16),area.timezone),endAt=localTimeToInstant(row.end_date_time.slice(0,16),area.timezone);
      if(!inWindow(startAt,endAt,now,until))continue;
      const url=new URL("https://data.cityofnewyork.us/resource/tvpp-9vvx.json");url.searchParams.set("event_id",row.event_id);
      results.push({id:`nyc-${row.event_id}`,title:row.event_name,scope:"local",category:row.event_type==="Farmers Market"?"market":"street",startAt,endAt,location:row.event_location,distanceKm:distance,approximate:true,timeBasis:"permit",source:{...source,url:url.href},caution:"This is a city permit, not confirmed public opening hours. Distance is approximate, from a mapped street segment. Confirm the event with its organiser; no attendance is measured."});
    }catch{/* Invalid or ambiguous local times must not produce a campaign. */}
  }
  return [...new Map(results.map(s=>[s.id,s])).values()].sort((a,b)=>a.startAt-b.startAt||(a.distanceKm??0)-(b.distanceKm??0));
}
/** Human-verified, dated references. Never labelled as a live trend or silently rolled into another year. */
export function calendarSignals(timezone:string,now:number,until:number):OpportunitySignal[] {
  const startAt=localTimeToInstant("2026-10-31T00:00",timezone),endAt=localTimeToInstant("2026-11-01T00:00",timezone);
  if(endAt<=now||startAt>=until)return [];
  return [{id:"calendar-halloween-2026",title:"Halloween",scope:"global",category:"calendar",startAt,endAt,location:"International calendar",timeBasis:"date",source:{id:"halloween-calendar",name:"Time and Date",url:"https://www.timeanddate.com/holidays/common/halloween",checkedAt:"2026-10-25",mode:"reference"},caution:"A verified calendar date, not a live popularity trend or a prediction of local demand. The campaign time is Turnout’s suggestion; confirm service and stock."}];
}
