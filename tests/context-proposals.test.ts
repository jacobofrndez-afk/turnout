import assert from "node:assert/strict";
import { test } from "node:test";
import { rhythmProposals, weatherProposal } from "../src/server/workspace/context-proposals";
import { proposeCampaign, proposeImmediateCampaign, proposeAheadCampaign } from "../src/server/workspace/proposal";
import { potentialFor, type QlooSnapshot } from "../src/lib/daily-potential";
import type { DnaRecord } from "../src/lib/place-dna";
import type { RhythmMoment } from "../src/server/qloo/rhythm";
const now=Date.parse("2030-05-10T12:00Z"),timezone="Europe/Paris";
const dna:DnaRecord={version:1,status:"demo",source:"Fixture",updatedAt:null,profile:{positioning:"A neighbourhood kitchen",audience:"Neighbours",voice:"warm",exampleLine:"A table for you.",goal:"visits",signatureOfferId:"late",boundaries:"No invented discounts",dailyBudgetUsd:0,leadMinutes:20,channels:["storefront"]}};
const offer={id:"late",title:"Midnight croque-monsieur",description:"Croque-monsieur and fries served until 1 am",price:"12 €"};
const evidence={offerId:offer.id,...offer,menuTags:[],matchingTastes:[],matchingPlaces:[{id:"p1",name:"Local reference",tags:["Sandwich"]}]};
const context={dna,offers:[offer],evidence:[evidence],timezone,now,placeName:"Demo place"};
const late:RhythmMoment={id:"late_night",label:"Late night",days:[5,6],from:"22:00",to:"02:00",strength:"medium",evidence:["Four nearby places stay open past 2 am"],places:[{id:"p1",name:"Local reference"}]};
const snapshot:QlooSnapshot={tastes:[],places:[],sources:[{kind:"places",status:"available",retrievedAt:"2030-05-09T12:00Z",count:4},{kind:"tastes",status:"available",retrievedAt:"2030-05-09T12:00Z",count:2}]};
test("late-night campaigns use the real Qloo window across midnight instead of afterwork",()=>{
 const [idea]=rhythmProposals(context,[late],snapshot);assert.ok(idea);assert.equal(idea.signal.category,"rhythm");assert.equal(idea.signal.source.checkedAt,"2030-05-09T12:00Z");assert.match(idea.why[1].text,/Local reference/);
 const slot=idea.proposal.slots[0];assert.equal(slot.startLocal,"2030-05-10T22:00");assert.equal(slot.endLocal,"2030-05-11T00:00");assert.match(idea.proposal.messages.late,/12 €/);
 const p=potentialFor(evidence,snapshot,{timezone,now,dna,moments:[late],events:[]},slot.startLocal,slot.endLocal);assert.equal(p.factors[3].points,25);assert.ok(p.timingValid);
});
test("no rhythm evidence, wrong menu or unavailable Qloo cannot create a local habit",()=>{
 assert.deepEqual(rhythmProposals(context,[{...late,places:[]}],snapshot),[]);
 assert.deepEqual(rhythmProposals(context,[late],{...snapshot,sources:[]}),[]);
 assert.deepEqual(rhythmProposals({...context,offers:[{...offer,title:"Cheese board",description:"Three cheeses"}]},[late],snapshot),[]);
});
test("a real brunch offer can use a supported weekend several days ahead",()=>{
 const monday=Date.parse("2030-05-06T08:00Z"),brunch={...offer,id:"brunch",title:"Weekend brunch",description:"Eggs and coffee"};
 const m:RhythmMoment={...late,id:"brunch",label:"Weekend brunch",days:[6,0],from:"11:00",to:"15:00"};
 const p=proposeCampaign(dna,[brunch],timezone,[m],monday,"brunch")!;
 assert.equal(p.slots[0].startLocal,"2030-05-11T11:00");assert.ok(p.slots.every(s=>s.startLocal.slice(11)>="11:00"&&s.startLocal.slice(11)<"14:00"));
});
test("weather changes the invitation without inventing an offer, extra score or demand",()=>{
 const proposal=proposeCampaign(dna,[offer],timezone,[late],now,"late")!;
 const forecast={kind:"rain" as const,label:"Rain · 8°C",tempC:8,feelsC:8,precipProb:80,precipMm:2,windKmh:10,code:61};
 const idea=weatherProposal(context,proposal,forecast,"2030-05-10T12:01Z")!;assert.ok(idea);assert.equal(idea.signal.startAt,Date.parse("2030-05-10T20:00Z"));assert.equal(idea.proposal.offerId,"late");assert.match(idea.proposal.messages.late,/Rain outside/);assert.match(idea.proposal.messages.late,/12 €/);assert.match(idea.why[1].text,/no bonus/);
 assert.equal(weatherProposal(context,proposal,undefined,"now"),undefined);assert.equal(weatherProposal(context,proposal,{...forecast,kind:"storm"},"now"),undefined);
 assert.equal(weatherProposal({...context,now:now-48*3600000},proposal,forecast,"now"),undefined);
});

test("a future DST ambiguity cannot crash otherwise valid late-night proposals",()=>{
 const p=proposeCampaign(dna,[offer],"America/New_York",[late],Date.parse("2026-10-26T12:00Z"),"late");
 assert.ok(p);assert.equal(p.slots[0].startLocal.slice(11),"22:00");
});
test("late-night windows stop at the explicit menu closing time",()=>{
 const p=proposeCampaign(dna,[offer],timezone,[late],Date.parse("2030-05-10T21:00Z"),"late")!;
 assert.equal(p.slots[0].endLocal,"2030-05-11T01:00");
});

test("non-event local ideas need actual Qloo matches and distinguish menu timing from observed habits",async()=>{
 const {menuEvidenceProposals}=await import("../src/server/workspace/context-proposals");
 const proposal=proposeCampaign(dna,[offer],timezone,[],now,"late")!;
 const [idea]=menuEvidenceProposals(context,{late:proposal},snapshot,"another",[]);
 assert.equal(idea.signal.category,"menu");assert.match(idea.signal.caution,/not a measured nightlife pattern/);assert.equal(idea.proposal.offerId,"late");
 assert.equal(menuEvidenceProposals({...context,evidence:[{...evidence,matchingPlaces:[]}]},{late:proposal},snapshot,"another",[]).length,0);
 assert.equal(menuEvidenceProposals(context,{late:proposal},{...snapshot,sources:[]},"another",[]).length,0);
 const [observed]=rhythmProposals(context,[late],snapshot);
 assert.equal(menuEvidenceProposals(context,{late:proposal},snapshot,"another",[observed]).length,0);
});


test("act now starts after preparation and never moves a future happy hour into the present",()=>{
 const offers=[{id:"happy",title:"Happy hour for two",description:"Two cocktails, 5 to 7 pm",price:"$16"},{id:"board",title:"Sharing board",description:"Three cheeses",price:"18 €"}];
 const at=Date.parse("2030-05-10T12:00Z"); // 14:00 in Paris
 assert.equal(proposeImmediateCampaign(dna,offers,timezone,at,"happy"),undefined);
 const plan=proposeImmediateCampaign(dna,offers,timezone,at,"board")!;
 assert.equal(plan.slots[0].startLocal,"2030-05-10T14:30");assert.equal(plan.slots[0].endLocal,"2030-05-10T16:30");
 assert.match(plan.slots[0].reason,/Confirm you are open/);assert.doesNotMatch(plan.messages.board,/show|concert/i);
 assert.equal(proposeImmediateCampaign({...dna,profile:{...dna.profile,leadMinutes:180}},offers,timezone,at,"board"),undefined);
});
test("near-term offers respect explicit serving limits and do not pretend games or late service exist now",()=>{
 const at=Date.parse("2030-05-10T16:00Z"),happy={id:"happy",title:"Happy hour for two",description:"Two cocktails, 5 to 7 pm",price:"$16"};
 const p=proposeImmediateCampaign(dna,[happy],timezone,at,"happy")!;assert.equal(p.slots[0].endLocal,"2030-05-10T19:00");
 assert.equal(proposeImmediateCampaign(dna,[offer],timezone,at,"late"),undefined);
 assert.equal(proposeImmediateCampaign(dna,[{...offer,title:"Game night"}],timezone,at,"late"),undefined);
 assert.equal(proposeImmediateCampaign(dna,[happy],timezone,Date.parse("2030-05-10T16:30Z"),"happy"),undefined);
});


test("ahead prepares a dated invitation rather than recycling the immediate message",()=>{
 const at=Date.parse("2030-05-10T12:00Z"),board={id:"board",title:"Sharing board",description:"Three cheeses",price:"18 €"};
 const immediate=proposeImmediateCampaign(dna,[board],timezone,at,board.id)!;
 const ahead=proposeAheadCampaign(dna,[board],timezone,[],at,board.id)!;
 assert.ok(ahead);assert.notEqual(ahead.messages.board,immediate.messages.board);
 assert.match(ahead.messages.board,/Fri 10 May/);assert.match(ahead.messages.board,/18 €/);
 assert.ok(ahead.slots.every(s=>s.id!=="soon"&&s.startLocal>"2030-05-10T16:00"));
});
test("ahead finds the next real serving window when today's happy hour is already immediate",()=>{
 const at=Date.parse("2030-05-10T15:00Z"),happy={id:"happy",title:"Happy hour for two",description:"Two cocktails, 5 to 7 pm",price:"$16"};
 assert.ok(proposeImmediateCampaign(dna,[happy],timezone,at,happy.id));
 const ahead=proposeAheadCampaign(dna,[happy],timezone,[],at,happy.id)!;
 assert.equal(ahead.slots[0].startLocal,"2030-05-11T17:00");assert.equal(ahead.slots[0].endLocal,"2030-05-11T19:00");
 assert.match(ahead.messages.happy,/Sat 11 May/);
 assert.equal(proposeAheadCampaign(dna,[{...happy,title:"Game night"}],timezone,[],at,happy.id),undefined);
});
