import assert from "node:assert/strict";
import { test } from "node:test";
import { parisSignals,nycSignals,calendarSignals,type ParisListing,type SignalSource,type OpportunitySignal } from "../src/lib/opportunity-signals";
import { signalProposals } from "../src/server/workspace/signal-proposals";
import { validatePlanTiming } from "../src/lib/campaign-plan";
import type { DnaRecord,MenuOffer } from "../src/lib/place-dna";
import type { OfferEvidence } from "../src/lib/daily-potential";
const now=Date.parse("2026-10-25T12:00:00Z"),until=Date.parse("2026-11-01T00:00:00Z");
const area={lat:48.8373,lon:2.3838,radius_m:1500,timezone:"Europe/Paris"};
const source:SignalSource={id:"city",name:"City feed",url:"https://www.paris.fr",checkedAt:"2026-10-25T11:00:00Z",mode:"live"};
const row:ParisListing={id:"1",title:"Photographic exhibition",qfap_tags:"Expo;Photo",lat_lon:{lat:48.839,lon:2.383},address_name:"Gallery",url:"https://www.paris.fr/evenements/exhibition-1",occurrences:"2026-10-25T13:00:00+02:00_2026-10-25T19:00:00+02:00"};
test("Paris uses individual dated sessions and honours explicit offsets across DST",()=>{
 const actual=parisSignals([row,row],area,source,now,until);assert.equal(actual.length,1);assert.equal(actual[0].endAt,Date.parse("2026-10-25T17:00:00Z"));assert.equal(actual[0].timeBasis,"published");assert.equal(actual[0].timeConflict,true);assert.match(actual[0].caution,/Schedule check needed/);
});
test("Paris excludes children’s activities, missing times, unsafe URLs, distant and invalid sessions",()=>{
 const bad=[{...row,title:"Atelier enfants",qfap_tags:"Expo;Enfants"},{...row,occurrences:null},{...row,url:"javascript:alert(1)"},{...row,lat_lon:{lat:49,lon:2}},{...row,occurrences:"2026-10-25T19:00:00+02:00_2026-10-25T13:00:00+02:00"},{...row,occurrences:"2026-10-24T13:00:00+02:00_2026-10-24T19:00:00+02:00"}];
 assert.equal(parisSignals(bad,area,source,now,until).length,0);
});
test("NYC permit windows stay explicitly distinct from public opening hours; unsupported locations are omitted",()=>{
 const r={event_id:"12",event_name:"Local farmers market",event_type:"Farmers Market",event_borough:"Manhattan",event_location:"Mapped block",start_date_time:"2026-10-25T06:00:00.000",end_date_time:"2026-10-25T18:00:00.000"};
 const nyc={...area,lat:40.75,lon:-73.99,timezone:"America/New_York"};
 const actual=nycSignals([r,r],nyc,source,now,until,()=>[nyc]);assert.equal(actual.length,1);assert.equal(actual[0].timeBasis,"permit");assert.equal(actual[0].approximate,true);assert.match(actual[0].caution,/not confirmed public opening/);
 assert.equal(nycSignals([r],nyc,source,now,until,()=>[]).length,0);
 assert.equal(nycSignals([{...r,event_name:"Kids market"}],nyc,source,now,until,()=>[nyc]).length,0);
 assert.equal(nycSignals([r],nyc,source,Date.parse("2026-10-26T00:00:00Z"),until,()=>[nyc]).length,0);
});
test("calendar references expire and never become an invented next-year event",()=>{
 const list=calendarSignals("Europe/Paris",now,until);assert.equal(list.length,1);assert.equal(list[0].source.mode,"reference");
 assert.equal(calendarSignals("Europe/Paris",Date.parse("2026-11-02T12:00Z"),Date.parse("2026-11-09T12:00Z")).length,0);
 assert.equal(calendarSignals("Europe/Paris",Date.parse("2027-10-25T12:00Z"),Date.parse("2027-11-01T12:00Z")).length,0);
});
const dna:DnaRecord={version:1,status:"demo",source:"Fixture",updatedAt:null,profile:{positioning:"A local bar for neighbours",audience:"Adult neighbours",voice:"refined",exampleLine:"Good moments, shared.",goal:"visits",signatureOfferId:"wine",boundaries:"No invented discount",dailyBudgetUsd:0,leadMinutes:45,channels:["storefront","google_post"]}};
const offers:MenuOffer[]=[{id:"wine",title:"Aperitif board",price:"24 €",description:"Cheese, charcuterie and two glasses of wine"}];
const evidence:OfferEvidence[]=[{offerId:"wine",title:"Aperitif board",price:"24 €",menuTags:[],matchingTastes:[],matchingPlaces:[]}];
test("a cultural source yields a valid window and honest menu-led reasoning without Qloo evidence",()=>{
 const [p]=signalProposals(parisSignals([row],area,source,now,until),dna,offers,evidence,area.timezone,now);
 assert.ok(p);assert.match(p.proposal.messages.wine,/Gallery/);assert.match(p.why[1].text,/No matching Qloo evidence/);
 const slot=p.proposal.slots[0];validatePlanTiming(slot.startLocal,slot.endLocal,area.timezone,45,now);
 assert.equal(slot.startLocal,"2026-10-25T17:00");assert.equal(p.proposal.budgetUsd,0);
});
test("an ended or morning-only local occasion is not shifted to tomorrow’s evening",()=>{
 const signal:OpportunitySignal={...parisSignals([row],area,source,now,until)[0],startAt:Date.parse("2026-10-25T08:00Z"),endAt:Date.parse("2026-10-25T10:00Z")};
 assert.equal(signalProposals([signal],dna,offers,evidence,area.timezone,now).length,0);
});
test("the same global occasion produces distinct copy, channels and budgets from each DNA",()=>{
 const global=calendarSignals(area.timezone,now,until);
 const [paris]=signalProposals(global,dna,offers,evidence,area.timezone,now);
 const nyDna:DnaRecord={...dna,profile:{...dna.profile,voice:"direct",dailyBudgetUsd:25,leadMinutes:20,channels:["storefront","geofenced_ad"],exampleLine:"Good beer. Good company."}};
 const [ny]=signalProposals(calendarSignals("America/New_York",now,until),nyDna,offers,evidence,"America/New_York",now);
 assert.notEqual(paris.proposal.messages.wine,ny.proposal.messages.wine);assert.equal(paris.proposal.budgetUsd,0);assert.equal(ny.proposal.budgetUsd,25);assert.match(ny.proposal.messages.wine,/Halloween plans/);
});
test("explicit menu serving hours constrain the sourced proposal",()=>{
 const happy=[{id:"wine",title:"Cocktails",price:"$16 for two",description:"Two cocktails, 5–7 pm"}];
 const [p]=signalProposals(calendarSignals(area.timezone,now,until),dna,happy,evidence,area.timezone,now);
 assert.ok(p);assert.equal(p.proposal.slots[0].startLocal,"2026-10-31T17:00");assert.equal(p.proposal.slots[0].endLocal,"2026-10-31T19:00");
});
