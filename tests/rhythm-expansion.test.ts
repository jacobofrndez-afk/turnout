import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeRhythm } from "../src/server/qloo/rhythm";
import { fitsRhythm } from "../src/lib/offer-service";
import { proposeCampaign, proposeImmediateCampaign } from "../src/server/workspace/proposal";
import type { DnaRecord } from "../src/lib/place-dna";
const days=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
const hours=Object.fromEntries(days.map(d=>[d,[{opens:"T08:00:00",closes:"T23:00:00"}]]));
const place=(id:string,description="Breakfast and morning coffee. Lunch break, afternoon tea, dinner and date night. A weekend stroll stop.")=>({entity_id:id,name:`Place ${id}`,tags:[{id:"urn:tag:genre:place:restaurant",name:"Restaurant"}],properties:{description,hours}});

test("six additional local contexts need distinct matching places and usable opening hours",()=>{
 const result=analyzeRhythm([place("a"),place("b")]);
 for(const id of ["morning_coffee","lunch_break","afternoon_break","dinner","date_night","weekend_stroll"]){
  const m=result.moments.find(m=>m.id===id);assert.ok(m,id);assert.equal(m.places.length,2);assert.match(m.evidence.join(" "),/not a measured busy period/);
 }
 assert.deepEqual(result.moments.find(m=>m.id==="weekend_stroll")!.days,[6,0]);
});
test("a single place, duplicate rows, absent hours and 00:00 placeholders cannot invent a local pattern",()=>{
 assert.equal(analyzeRhythm([place("a"),place("a")]).moments.length,0);
 assert.equal(analyzeRhythm([place("a")]).moments.length,0);
 assert.equal(analyzeRhythm([place("a"),place("b")].map(p=>({...p,properties:{...p.properties,hours:{}}}))).moments.length,0);
 const empty=Object.fromEntries(days.map(d=>[d,[{opens:"T00:00:00",closes:"T00:00:00"}]]));
 assert.equal(analyzeRhythm([place("a"),place("b")].map(p=>({...p,properties:{...p.properties,hours:empty}}))).moments.length,0);
 assert.equal(analyzeRhythm([place("a","A welcoming place"),place("b","A welcoming place")]).moments.length,0);
});
test("supported days and minutes stay tied to real hours",()=>{
 const opening={monday:[{opens:"T12:15:00",closes:"T14:00:00"}],tuesday:[{opens:"T11:00:00",closes:"T15:00:00"}]};
 const result=analyzeRhythm([place("a","Lunch"),place("b","Lunch")].map(p=>({...p,properties:{...p.properties,hours:opening}})));
 assert.deepEqual(result.moments.find(m=>m.id==="lunch_break")!.days,[2]);
});
test("menu matching does not turn cocktails into breakfast or late food into lunch",()=>{
 assert.ok(fitsRhythm({title:"Coffee and croissant"},"morning_coffee"));
 assert.ok(fitsRhythm({title:"Lunch sandwich"},"lunch_break"));
 assert.ok(fitsRhythm({title:"Afternoon tea"},"afternoon_break"));
 assert.ok(fitsRhythm({title:"Wine & sharing board"},"date_night"));
 assert.ok(fitsRhythm({title:"Sharing board"},"dinner"));
 assert.equal(fitsRhythm({title:"Two cocktails"},"morning_coffee"),false);
 assert.equal(fitsRhythm({title:"Late-night burger"},"lunch_break"),false);
 assert.equal(fitsRhythm({title:"Game night"},"date_night"),false);
});
const dna:DnaRecord={version:1,status:"demo",source:"Fixture",updatedAt:null,profile:{positioning:"Local cafe",audience:"Neighbours",voice:"warm",exampleLine:"Come on in.",goal:"visits",signatureOfferId:"coffee",boundaries:"No invented deals",dailyBudgetUsd:0,leadMinutes:20,channels:["storefront"]}};
test("daytime offers get daytime fallback windows and cannot be promoted late at night",()=>{
 const coffee={id:"coffee",title:"Coffee and croissant",description:"Espresso and a croissant",price:"6 €"};
 const breakfast={...coffee,title:"Breakfast pancakes"};
 const at=Date.parse("2030-05-10T18:00Z");
 assert.equal(proposeCampaign(dna,[coffee],"Europe/Paris",[],at,"coffee")!.slots[0].startLocal,"2030-05-11T08:00");
 assert.equal(proposeImmediateCampaign(dna,[coffee],"Europe/Paris",at,"coffee"),undefined);
 const morning=proposeImmediateCampaign(dna,[breakfast],"Europe/Paris",Date.parse("2030-05-10T06:00Z"),"coffee")!;
 assert.equal(morning.slots[0].startLocal,"2030-05-10T08:30");
 assert.equal(proposeImmediateCampaign(dna,[{...coffee,title:"Lunch sandwich"}],"Europe/Paris",Date.parse("2030-05-10T13:00Z"),"coffee"),undefined);
});
