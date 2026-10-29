import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { parseTrends, topicMatch, trendObservations, trendSignals, openAgendaSignals, dedupeSignals, socialObservations, type OpenAgendaListing } from "../src/lib/discovery-signals";
import { publicHandle } from "../src/lib/source-settings";
import { sourceSettings } from "../src/server/sources/settings";
import { publicFeed } from "../src/server/sources/public-feed";
import { getDb } from "../src/server/db/client";
import { POST } from "../src/app/api/merchants/[id]/sources/route";
import { signalProposals } from "../src/server/workspace/signal-proposals";
import { getDna } from "../src/server/merchants/dna";
import type { SignalSource } from "../src/lib/opportunity-signals";
const now=Date.parse("2026-10-25T12:00:00Z"),until=Date.parse("2026-11-01T00:00:00Z");
const area={lat:48.8373,lon:2.3838,radius_m:1500,timezone:"Europe/Paris"};
const source:SignalSource={id:"openagenda",name:"OpenAgenda",url:"https://openagenda.com",checkedAt:new Date(now).toISOString(),mode:"live"};
const offers=[{id:"beer",title:"Craft beer flight",description:"Three local beers",price:"$18"},{id:"wine",title:"Aperitif board",description:"Cheese and two glasses of wine",price:"24 €"}];
const rss=(items:string)=>`<?xml version="1.0"?><rss><channel>${items}</channel></rss>`;
const item=(title:string,date=new Date(now-3600000).toUTCString())=>`<item><title>${title}</title><pubDate>${date}</pubDate><ht:approx_traffic>1000+</ht:approx_traffic></item>`;
test("RSS accepts CDATA and entities, deduplicates, rejects stale and future topics",()=>{
 const data=parseTrends(rss(item("<![CDATA[craft beer &amp; cheese]]>")+item("craft beer &amp; cheese")+item("old",new Date(now-25*3600000).toUTCString())+item("future",new Date(now+3600000).toUTCString())+item("bad","yesterday")),now);
 assert.equal(data.length,1);assert.equal(data[0].title,"craft beer & cheese");
 assert.throws(()=>parseTrends('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>',now));
 assert.throws(()=>parseTrends("<html>service unavailable</html>",now));
});
test("national topics must match an actual priced menu item; news and safety contexts do not become promotions",()=>{
 assert.deepEqual(topicMatch("craft beer festival",offers)?.offerIds,["beer"]);
 assert.deepEqual(topicMatch("vin naturel",offers)?.offerIds,["wine"]);
 for(const topic of ["football","war","craft beer recall","cocktail poisoning","wine tasting for children","mort vin naturel"])assert.equal(topicMatch(topic,offers),null);
 assert.equal(topicMatch("spritz",offers),null);assert.equal(topicMatch("craft beer",offers.map(o=>({...o,price:null}))),null);
});
test("trend evidence stays national and is tied to matching offers",()=>{
 const observations=trendObservations(parseTrends(rss(item("craft beer")),now),offers,source,"US");
 assert.equal(observations.length,1);assert.match(observations[0].explanation,/national search trend/);
 const signal=trendSignals(observations,now)[0];assert.equal(signal.category,"trend");assert.equal(signal.timeBasis,"interest");assert.deepEqual(signal.offerIds,["beer"]);assert.equal(signal.distanceKm,undefined);
});
const row:OpenAgendaListing={uid:"123",title_fr:"Photographies japonaises",description_fr:"Exposition",timings:JSON.stringify([{begin:"2026-10-25T13:00:00+01:00",end:"2026-10-25T19:00:00+01:00"},{begin:"2026-10-27T10:00:00+01:00",end:"2026-10-27T19:00:00+01:00"}]),location_name:"BnF",location_coordinates:{lat:48.837,lon:2.38},canonicalurl:"https://openagenda.com/bnf/events/photo",originagenda_title:"BnF"};
test("OpenAgenda uses dated sessions with offsets, coordinates, provenance and the licensed publisher",()=>{
 const signals=openAgendaSignals([row,row],area,source,now,until);assert.equal(signals.length,2);assert.equal(signals[0].startAt,Date.parse("2026-10-25T12:00:00Z"));assert.match(signals[0].caution,/BnF/);assert.match(signals[0].caution,/Licence Ouverte/);
 const first=signals[0];assert.equal(dedupeSignals([{...first,timeConflict:true,source:{...source,id:"paris-agenda"}},first],area.timezone).length,1);assert.equal(dedupeSignals([{...first,timeConflict:true},first],area.timezone)[0].timeConflict,undefined);
});
test("two feeds naming the same exhibition differently do not produce duplicate sessions",()=>{
 const first=openAgendaSignals([row],area,source,now,until)[0];
 const city={...first,title:"Photographies japonaises (1945–2025)",location:"BnF - Gallery 1",distanceKm:first.distanceKm!+0.01,timeConflict:true};
 assert.equal(dedupeSignals([city,first],area.timezone).length,1);
 assert.equal(dedupeSignals([city,first],area.timezone)[0].source.id,"openagenda");
});
test("OpenAgenda omits invalid dates, distant, unsafe, undated and family listings",()=>{
 const bad=[{...row,timings:"bad"},{...row,timings:"null"},{...row,timings:JSON.stringify([{begin:"2026-10-25T13:00",end:"2026-10-25T19:00"}])},{...row,title_fr:"Expo enfants"},{...row,canonicalurl:"http://127.0.0.1"},{...row,location_coordinates:{lat:49,lon:2}},{...row,timings:JSON.stringify([{begin:"2026-10-24T13:00Z",end:"2026-10-24T19:00Z"}])}];
 assert.equal(openAgendaSignals(bad,area,source,now,until).length,0);
});
const account={did:"did:plc:ga6ylanmyto2mnx6bfvo5fql",handle:"paris.fr",name:"City of Paris"};
const post=(text:string,date=now-3600000)=>({post:{uri:`at://${account.did}/app.bsky.feed.post/3testabc`,author:{did:account.did},record:{text,createdAt:new Date(date).toISOString()}}});
test("social evidence uses only recent original posts from the followed DID, never reposts or old engagement",()=>{
 const fresh=post("A wine tasting this weekend");const data={feed:[fresh,{...fresh,reason:{type:"repost"}},{post:{...fresh.post,author:{did:"did:plc:other"}}},post("craft beer",now-8*86400000),post("unrelated exhibition")]};
 const result=socialObservations(data,account,offers,source,now);assert.equal(result.recent,2);assert.equal(result.observations.length,1);assert.deepEqual(result.observations[0].offerIds,["wine"]);assert.match(result.observations[0].explanation,/location, event time and audience are not established/);
});
test("handles and fetch endpoints cannot be used to request arbitrary hosts or forward secrets",async()=>{
 assert.equal(publicHandle("@Paris.FR"),"paris.fr");
 for(const value of ["https://paris.fr","127.0.0.1","localhost","a@b.com","x.com/path","x.com?url=localhost"])assert.equal(publicHandle(value),null);
 for(const url of ["http://public.api.bsky.app","https://localhost","https://secret@public.api.bsky.app","https://public.api.bsky.app:4430"])await assert.rejects(()=>publicFeed(new URL(url),900),/Unsupported source/);
});
mkdirSync(".tmp",{recursive:true});const dir=mkdtempSync(resolve(".tmp/discovery-test-"));process.env.DATABASE_PATH=resolve(dir,"test.db");const db=getDb();
for(const id of ["m_penn_pour","m_quai_bercy"]) db.prepare("INSERT INTO merchants (id,name,kind,lat,lon,city,timezone) VALUES (?,?,'bar',48.8373,2.3838,'Paris','Europe/Paris')").run(id,id);
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
const request=(body:object,origin="http://localhost:3103")=>new Request("http://localhost:3103/api/merchants/m_penn_pour/sources",{method:"POST",headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify(body)});
test("source preferences persist per merchant, reject stale changes and block cross-origin writes",async()=>{
 const context={params:Promise.resolve({id:"m_penn_pour"})};
 assert.equal((await POST(request({action:"toggle",key:"trends",enabled:false,version:0}),context)).status,200);
 assert.equal(sourceSettings("m_penn_pour").trends,false);assert.equal(sourceSettings("m_quai_bercy").trends,true);
 assert.equal((await POST(request({action:"toggle",key:"trends",enabled:true,version:0}),context)).status,409);
 assert.equal((await POST(request({action:"toggle",key:"trends",enabled:true,version:1},"https://external.invalid"),context)).status,403);
 assert.equal((await POST(request({action:"follow",handle:"https://localhost",version:1}),context)).status,400);
});
test("a followed public publisher is resolved to its DID and duplicates cannot be added",async()=>{
 const real=global.fetch;global.fetch=async()=>new Response(JSON.stringify(account),{headers:{"Content-Type":"application/json"}});
 try{
  const context={params:Promise.resolve({id:"m_penn_pour"})};
  assert.equal((await POST(request({action:"follow",handle:"paris.fr",version:1}),context)).status,200);
  assert.deepEqual(sourceSettings("m_penn_pour").accounts.map(a=>a.did),[account.did]);
  assert.equal((await POST(request({action:"follow",handle:"paris.fr",version:2}),context)).status,409);
  assert.equal((await POST(request({action:"remove",did:account.did,version:2}),context)).status,200);
  assert.equal(sourceSettings("m_penn_pour").accounts.length,0);
 }finally{global.fetch=real;}
});
test("source errors are not cached as successful data and successful responses keep their retrieval time",async()=>{
 const real=global.fetch;let calls=0;const url=new URL("https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=test.example");
 global.fetch=async()=>{calls++;return new Response("failure",{status:503});};
 try{
  await assert.rejects(()=>publicFeed(url,900));
  global.fetch=async()=>{calls++;return new Response('{"ok":true}');};
  const first=await publicFeed(url,900),second=await publicFeed(url,900);assert.equal(first.mode,"live");assert.equal(second.mode,"cache");assert.equal(second.checkedAt,first.checkedAt);assert.equal(calls,2);
 }finally{global.fetch=real;}
});
test("a trend proposal keeps menu pricing, brand voice and a valid current window without inventing a date or audience",()=>{
 const dna=getDna("m_penn_pour");dna.status="demo";dna.profile.signatureOfferId="beer";
 const observations=trendObservations(parseTrends(rss(item("craft beer")),now),offers,source,"US");
 const signals=trendSignals(observations,now),evidence=offers.map(o=>({offerId:o.id,title:o.title,price:o.price,menuTags:[],matchingTastes:[],matchingPlaces:[]}));
 const [campaign]=signalProposals(signals,dna,offers,evidence,"Europe/Paris",now);
 assert.ok(campaign);assert.equal(campaign.proposal.offerId,"beer");assert.match(campaign.proposal.messages.beer,/\$18/);assert.doesNotMatch(campaign.proposal.messages.beer,/Halloween|trending|popular|crowd/);assert.match(campaign.why[0].text,/national interest/);
 assert.equal(signalProposals(signals,dna,offers,evidence,"Europe/Paris",now+24*3600000).length,0);
});

test("at the same proposed time, a clear published session is preferred to a conflicting city schedule",()=>{
 const dna=getDna("m_quai_bercy");dna.status="demo";dna.profile.signatureOfferId="wine";
 const reliable=openAgendaSignals([row],area,source,now,until)[0];
 const conflict={...reliable,id:"city-conflict",title:"Another exhibition",distanceKm:0.1,timeConflict:true};
 const evidence=offers.map(o=>({offerId:o.id,title:o.title,price:o.price,menuTags:[],matchingTastes:[],matchingPlaces:[]}));
 const campaigns=signalProposals([conflict,reliable],dna,offers,evidence,area.timezone,now);
 assert.equal(campaigns[0].signal.id,reliable.id);
});
