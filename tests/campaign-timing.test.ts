import assert from "node:assert/strict";
import { test } from "node:test";
import { campaignTimingChoices } from "../src/lib/campaign-timing";
import { localTimeToInstant, type CampaignPlanProposal } from "../src/lib/campaign-plan";
import type { DnaRecord } from "../src/lib/place-dna";
import type { PotentialContext, QlooSnapshot } from "../src/lib/daily-potential";
import type { SourcedOpportunity } from "../src/lib/sourced-opportunity";
const now=Date.parse("2030-05-10T12:00Z"),timezone="Europe/Paris";
const dna:DnaRecord={version:1,status:"demo",source:"Fixture",updatedAt:null,profile:{positioning:"A neighbourhood kitchen",audience:"Neighbours",voice:"warm",exampleLine:"A table for you.",goal:"visits",signatureOfferId:"board",boundaries:"No invented discounts",dailyBudgetUsd:0,leadMinutes:20,channels:["storefront"]}};
const evidence=[{offerId:"board",title:"Sharing board",price:"18 €",menuTags:[],matchingTastes:[],matchingPlaces:[{id:"p1",name:"Local reference",tags:["Cheese"]}]}];
const snapshot:QlooSnapshot={tastes:[],places:[],sources:[{kind:"places",status:"available",retrievedAt:"2030-05-09T12:00Z",count:4},{kind:"tastes",status:"available",retrievedAt:"2030-05-09T12:00Z",count:2}]};
const context:PotentialContext={timezone,now,dna,moments:[],events:[]};
const plan=(startLocal:string,message:string):CampaignPlanProposal=>({offerId:"board",messages:{board:message},budgetUsd:0,slots:[{id:startLocal,label:"Service",startLocal,endLocal:startLocal.slice(0,11)+String(Number(startLocal.slice(11,13))+2).padStart(2,"0")+":00",reason:"Fixture",source:"Fixture"}]});
const immediate=plan("2030-05-10T14:30","Cool outside. Good company inside."),future=plan("2030-05-11T17:00","Make time for a board together this Saturday.");
const idea=(id:string,category:SourcedOpportunity["signal"]["category"],proposal:CampaignPlanProposal,timeConflict=false):SourcedOpportunity=>({id,title:id,fit:"Fixture",proposal,why:[],signal:{id,title:id,category,scope:"local",startAt:localTimeToInstant(proposal.slots[0].startLocal,timezone),endAt:localTimeToInstant(proposal.slots[0].endLocal,timezone),timeConflict,timeBasis:"published",location:"Fixture",caution:"Fixture",source:{id:"fixture",name:"Fixture",url:"https://example.com",checkedAt:"2030-05-10",mode:"reference"}}});
const inputs={context,snapshot,evidence,proposals:{board:future},immediateProposals:{board:immediate},opportunities:[] as SourcedOpportunity[]};

test("planning selects an upcoming occasion over a repeated weather invitation, without score bonuses",()=>{
 const weather=idea("later-weather","weather",plan("2030-05-10T17:00",immediate.messages.board));
 const occasion=idea("future-occasion","market",plan("2030-05-11T17:00","Saturday market plans? Make us your next stop."));
 const options={...inputs,opportunities:[weather,occasion]};
 assert.equal(campaignTimingChoices("now",options)[0].proposal.messages.board,immediate.messages.board);
 const ahead=campaignTimingChoices("ahead",options);
 assert.equal(ahead[0].id,occasion.id);assert.equal(ahead[0].potential?.score,39);
 assert.ok(ahead.every(c=>c.proposal.messages.board!==immediate.messages.board));
 // Reusing the actual menu offer is fine: the occasion and customer invitation have changed.
 assert.equal(ahead[0].proposal.offerId,immediate.offerId);
});
test("an exact copied campaign and conflicting event hours cannot become an advance recommendation",()=>{
 const duplicate=idea("copied","taste",plan("2030-05-11T17:00",immediate.messages.board));
 const conflict=idea("uncertain","culture",future,true);
 const ahead=campaignTimingChoices("ahead",{...inputs,opportunities:[duplicate,conflict]});
 assert.deepEqual(ahead.map(c=>c.id),[null]);assert.equal(ahead[0].proposal,future);
});
test("there is no fake advance choice when only immediate or duplicated content is available",()=>{
 const options={...inputs,proposals:{board:immediate},opportunities:[idea("weather","weather",plan("2030-05-11T17:00",immediate.messages.board))]};
 assert.deepEqual(campaignTimingChoices("ahead",options),[]);
 assert.equal(campaignTimingChoices("now",options).length,1);
});
test("the two-hour boundary, expired windows and preparation time are respected",()=>{
 const atBoundary=plan("2030-05-10T16:00","Boundary"),expired=plan("2030-05-10T13:00","Expired");
 const options={...inputs,proposals:{board:atBoundary},immediateProposals:{board:expired},opportunities:[idea("boundary","market",atBoundary)]};
 assert.equal(campaignTimingChoices("now",options)[0].id,"boundary");assert.deepEqual(campaignTimingChoices("ahead",options),[]);
});
