import assert from "node:assert/strict";
import { test } from "node:test";
import { evergreenProposals } from "../src/server/workspace/evergreen-proposals";
import { campaignTimingChoices } from "../src/lib/campaign-timing";
import { assertOfferWindow } from "../src/lib/offer-window";
import { validatePlanTiming } from "../src/lib/campaign-plan";
import type { DnaRecord } from "../src/lib/place-dna";
const now=Date.parse("2030-05-10T12:00Z"),timezone="Europe/Paris";
const dna:DnaRecord={version:1,status:"demo",source:"Fixture",updatedAt:null,profile:{positioning:"Local kitchen",audience:"Neighbours",voice:"warm",exampleLine:"Come on in.",goal:"visits",signatureOfferId:"board",boundaries:"No invented deals",dailyBudgetUsd:25,leadMinutes:20,channels:["storefront","geofenced_ad"]}};
const offers=[{id:"board",title:"Wine & sharing board",description:"Wine and cheese, 5 to 7 pm",price:"24 €"},{id:"beer",title:"Craft beer flight",description:"Four local beers",price:"18 €"},{id:"game",title:"Game night big screen",description:"Every big game",price:"20 €"}];
const evidence=offers.map(o=>({...o,offerId:o.id,menuTags:[],matchingTastes:[],matchingPlaces:[]}));
const context={merchantId:"demo",placeName:"Demo",dna,offers,evidence,timezone,now,moments:[]};
test("five reusable purposes keep real menu prices, valid service windows and distinct messages",()=>{
 const ideas=evergreenProposals(context);assert.equal(ideas.length,5);
 assert.equal(new Set(ideas.map(i=>i.proposal.messages[i.proposal.offerId])).size,5);
 for(const idea of ideas){
  assert.equal(idea.signal.category,"evergreen");assert.equal(idea.signal.source.name,"Your menu & place DNA");
  const offer=offers.find(o=>o.id===idea.proposal.offerId)!;assert.notEqual(offer.id,"game");
  assert.ok(idea.proposal.messages[offer.id].includes(offer.price));
  const slot=idea.proposal.slots[0];validatePlanTiming(slot.startLocal,slot.endLocal,timezone,dna.profile.leadMinutes,now);assertOfferWindow(offer.description,slot.startLocal,slot.endLocal);
  assert.match(idea.why.find(w=>w.label==="What Qloo adds")!.text,/No matching Qloo evidence/);
  assert.match(idea.signal.caution,/Nothing is recurring/);
 }
});
test("missing offers, unsupported recipes and unconfirmed DNA do not invent a campaign",()=>{
 assert.deepEqual(evergreenProposals({...context,dna:{...dna,status:"suggested"}}),[]);
 assert.deepEqual(evergreenProposals({...context,offers:offers.map(o=>({...o,price:null}))}),[]);
 const plain=[{id:"coffee",title:"Espresso",description:"Single espresso",price:"3 €"}];
 const ideas=evergreenProposals({...context,offers:plain,evidence:[],dna:{...dna,profile:{...dna.profile,signatureOfferId:"coffee"}}});
 assert.equal(ideas.length,2);assert.ok(ideas.every(i=>!i.id.includes("makers")&&!i.id.includes("together")));
});
test("voice changes the invitation and reusing it later rebuilds a future window",()=>{
 const warm=evergreenProposals(context)[0];
 const refined=evergreenProposals({...context,dna:{...dna,profile:{...dna.profile,voice:"refined"}}})[0];
 assert.notEqual(warm.proposal.messages.board,refined.proposal.messages.board);
 const next=evergreenProposals({...context,now:now+7*86400000})[0];
 assert.ok(next.signal.startAt>now+7*86400000);assert.equal(next.proposal.messages.board,warm.proposal.messages.board);
});
test("evergreen lives in its own selection mode even when Qloo is unavailable",()=>{
 const opportunities=evergreenProposals(context);
 const input={context:{timezone,now,dna,moments:[],events:[]},snapshot:{tastes:[],places:[],sources:[]},evidence,opportunities,proposals:{},immediateProposals:{}};
 assert.equal(campaignTimingChoices("evergreen",input).length,5);
 assert.ok(campaignTimingChoices("evergreen",input).every(c=>c.potential?.score===null));
 assert.deepEqual(campaignTimingChoices("now",input),[]);assert.deepEqual(campaignTimingChoices("ahead",input),[]);
});
