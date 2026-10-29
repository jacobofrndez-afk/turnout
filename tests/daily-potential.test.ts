import assert from "node:assert/strict";
import { test } from "node:test";
import { rankCampaignChoices, matchOffer, potentialFor, type PotentialContext, type QlooSnapshot } from "../src/lib/daily-potential";
import { assertOfferWindow, offerWindow } from "../src/lib/offer-window";
import { proposeCampaign } from "../src/server/workspace/proposal";
const cocktail="urn:tag:genre:place:restaurant:cocktail_bar",beer="urn:tag:offerings:place:craft_beer";
const snapshot:QlooSnapshot={tastes:[{id:"urn:tag:customer_identity:qloo:cocktail_enthusiasts",name:"Cocktail Enthusiasts"}],places:Array.from({length:5},(_,i)=>({id:`p${i}`,name:`Reference ${i}`,tags:[{id:cocktail,name:"Cocktail Bar"},...(i===0?[{id:beer,name:"Craft Beer"}]:[])]})),sources:[{kind:"tastes",status:"available",retrievedAt:"2030-05-09T12:00:00Z",count:1},{kind:"places",status:"available",retrievedAt:"2030-05-09T12:00:00Z",count:5}]};
const context:PotentialContext={timezone:"America/New_York",now:Date.parse("2030-05-10T14:00:00Z"),dna:{version:1,status:"demo",source:"Test fixture",updatedAt:null,profile:{positioning:"Neighbourhood bar",audience:"Neighbours",voice:"direct",exampleLine:"Good beer. Good company.",goal:"visits",signatureOfferId:"beer",boundaries:"No invented discounts",dailyBudgetUsd:25,leadMinutes:20,channels:["storefront"]}},moments:[],events:[{title:"Published show",date:"2030-05-10",time:"19:00"}]};
const row=(id:string,tag:string,title=id)=>({id,title,price:"$18",tag_urns_json:JSON.stringify([tag]),tag_names_json:JSON.stringify([tag===cocktail?"Cocktail Bar":"Craft Beer"])});
const cocktailEvidence=matchOffer(row("cocktail",cocktail,"House cocktails"),snapshot);
const beerEvidence=matchOffer(row("beer",beer,"Craft beer flight"),snapshot);
const score=(offer= cocktailEvidence,s=snapshot,c=context,start="2030-05-10T17:00",end="2030-05-10T19:00")=>potentialFor(offer,s,c,start,end);
test("Qloo evidence can change the menu recommendation without changing the place DNA",()=>{
 assert.equal(score().score,80);assert.equal(score(beerEvidence).score,44);
 assert.equal(context.dna.profile.signatureOfferId,"beer");assert.deepEqual(cocktailEvidence.matchingTastes.map(t=>t.name),["Cocktail Enthusiasts"]);
 assert.match(score().factors[0].reason,/menu tags/);assert.match(score().factors[1].reason,/not customers/);
});
test("the index is an explainable sum of capped rules, not a Qloo affinity percentage",()=>{
 const p=score();assert.equal(p.score,p.factors.reduce((sum,f)=>sum+f.points,0));assert.ok(p.factors.every(f=>f.points>=0&&f.points<=f.max));
 const extra={...cocktailEvidence,matchingPlaces:Array.from({length:40},(_,i)=>({id:`p${i}`,name:`Reference ${i}`,tags:["Cocktail Bar"]}))};
 assert.equal(score(extra).factors[1].points,20);assert.equal(score(extra).score,80);
});
test("no matching evidence and partial or failed sources never produce a misleading number",()=>{
 const noMatch=matchOffer(row("soup","urn:tag:cuisine:qloo:soup","Soup"),snapshot);assert.equal(score(noMatch).score,null);assert.match(score(noMatch).label,/limited/);
 for(const kind of ["tastes","places"] as const){const partial={...snapshot,sources:snapshot.sources.map(s=>s.kind===kind?{...s,status:"unavailable" as const,count:0}:s)};assert.equal(score(cocktailEvidence,partial).score,null);assert.match(score(cocktailEvidence,partial).label,/Partial/);}
});
test("changing the time changes the contextual part without inventing event audience affinities",()=>{
 assert.equal(score().factors[3].points,15);assert.match(score().factors[3].reason,/audience’s taste has not been matched/);
 assert.equal(score(cocktailEvidence,snapshot,context,"2030-05-11T17:00","2030-05-11T19:00").factors[3].points,10);
 const afterwork={...context,moments:[{id:"afterwork",label:"After work",days:[5],from:"17:00",to:"19:00",evidence:["Nearby places mention after work"]}]};
 assert.equal(score(cocktailEvidence,snapshot,afterwork).factors[3].points,25);
 assert.equal(score(cocktailEvidence,snapshot,afterwork).score,90);
});
test("brunch, game nights and late offers are not promoted in an unrelated window",()=>{
 const brunch={...context,moments:[{id:"brunch",label:"Brunch",days:[5],from:"11:00",to:"15:00",evidence:["Brunch menus"]}],events:[]};
 assert.equal(score(beerEvidence,snapshot,brunch,"2030-05-10T11:00","2030-05-10T13:00").factors[3].points,10);
 assert.equal(score({...beerEvidence,title:"Game night"}).score,null);
 assert.equal(score({...beerEvidence,title:"After-show late plate"}).score,null);
});
test("preparation time, DST ambiguity and expired slots block a potential score",()=>{
 assert.equal(score(cocktailEvidence,snapshot,context,"2030-05-10T10:00","2030-05-10T12:00").score,null);
 assert.equal(potentialFor(cocktailEvidence,snapshot,context,"2030-05-10T17:00","2030-05-10T19:00",Date.parse("2030-05-10T22:00:00Z")).score,null);
 const paris={...context,timezone:"Europe/Paris",now:Date.parse("2026-10-24T14:00:00Z")};assert.equal(score(cocktailEvidence,snapshot,paris,"2026-10-25T02:30","2026-10-25T04:00").score,null);
});
test("missing or malformed menu tags stay evidence-free",()=>{
 assert.equal(matchOffer({...row("bad",beer),tag_urns_json:"not-json"},snapshot).matchingPlaces.length,0);
 assert.equal(matchOffer({...row("bad",beer),tag_urns_json:'[42,null]'},snapshot).matchingPlaces.length,0);
});
test("a preferred offer changes the draft while keeping the saved voice and prices",()=>{
 const offers=[{id:"beer",title:"Craft beer flight",description:"Four beers",price:"$18"},{id:"cocktail",title:"House cocktails",description:"Two house cocktails",price:"$16 for two"}];
 const p=proposeCampaign(context.dna,offers,context.timezone,[],context.now,"cocktail")!;
 assert.equal(p.offerId,"cocktail");assert.match(p.messages.cocktail,/Two house cocktails/);assert.match(p.messages.cocktail,/\$16 for two/);assert.doesNotMatch(p.messages.cocktail,/Good beer/);assert.match(p.messages.beer,/Good beer/);
});

test("explicit offer hours are preserved in suggested slots and potential scores",()=>{
 const offers=[{id:"beer",title:"Craft beer flight",description:"Four beers",price:"$18"},{id:"cocktail",title:"Happy hour",description:"Two cocktails, 5 to 7 pm",price:"$16"}];
 const p=proposeCampaign(context.dna,offers,context.timezone,[],Date.parse("2030-05-10T23:30:00Z"),"cocktail")!;
 assert.equal(p.slots[0].startLocal,"2030-05-11T17:00");assert.equal(p.slots[0].endLocal,"2030-05-11T19:00");assert.ok(p.slots.every(s=>s.startLocal.slice(11)>="17:00"&&s.endLocal.slice(11)<="19:00"));
 assert.equal(score({...cocktailEvidence,description:"5 to 7 pm"},snapshot,context,"2030-05-10T16:00","2030-05-10T18:00").score,null);
});
test("unknown or ambiguous menu hours stay unknown and explicit ranges are checked",()=>{
 assert.deepEqual(offerWindow("Served 5 to 7 pm"),{from:"17:00",to:"19:00"});
 assert.deepEqual(offerWindow("Served 17:00–19:00"),{from:"17:00",to:"19:00"});
 assert.equal(offerWindow("After the show"),undefined);assert.equal(offerWindow("11 to 1 am"),undefined);
 assert.throws(()=>assertOfferWindow("5 to 7 pm","2030-05-10T17:00","2030-05-10T20:00"),/serving window/);
 assert.doesNotThrow(()=>assertOfferWindow("5 to 7 pm","2030-05-10T17:30","2030-05-10T18:30"));
});


test("the leading campaign follows potential, not source order or signature preference",()=>{
 const proposal=(offerId:string,startLocal="2030-05-10T17:00",endLocal="2030-05-10T19:00")=>({offerId,budgetUsd:0,messages:{[offerId]:"Test menu campaign"},slots:[{id:offerId,label:"Test",startLocal,endLocal,reason:"Test",source:"Test"}]});
 const weaker={id:"first-source",proposal:proposal("beer")},stronger={id:null,proposal:proposal("cocktail")};
 const sorted=rankCampaignChoices([weaker,stronger],[beerEvidence,cocktailEvidence],snapshot,context);
 assert.equal(sorted[0].proposal.offerId,"cocktail");assert.equal(sorted[0].potential?.score,80);assert.equal(sorted[1].potential?.score,44);
 assert.equal(weaker.id,"first-source");assert.equal(context.dna.profile.signatureOfferId,"beer");
 const expired={id:"expired",proposal:proposal("cocktail","2030-05-10T09:00","2030-05-10T11:00")};
 assert.equal(rankCampaignChoices([expired,weaker],[beerEvidence,cocktailEvidence],snapshot,context)[0].id,"first-source");
});
test("equally supported campaigns prefer the earlier window without inventing missing scores",()=>{
 const proposal=(day:string)=>({offerId:"cocktail",budgetUsd:0,messages:{cocktail:"Test"},slots:[{id:day,label:"Test",startLocal:`${day}T17:00`,endLocal:`${day}T19:00`,reason:"Test",source:"Test"}]});
 const choices=[{id:"later",proposal:proposal("2030-05-12")},{id:"earlier",proposal:proposal("2030-05-11")}];
 assert.equal(rankCampaignChoices(choices,[cocktailEvidence],snapshot,context)[0].id,"earlier");
 const unavailable={...snapshot,sources:snapshot.sources.map(s=>({...s,status:"unavailable" as const,count:0}))};
 const ranked=rankCampaignChoices(choices,[cocktailEvidence],unavailable,context);
 assert.equal(ranked[0].id,"earlier");assert.equal(ranked[0].potential?.score,null);
});
