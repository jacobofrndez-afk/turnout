import assert from "node:assert/strict";
import { test } from "node:test";
import { recommendDistribution, matchesDistribution } from "../src/lib/distribution-recommendation";
import type { ChannelContext } from "../src/lib/channel-recommendation";
import { planCost } from "../src/lib/campaign-plan";
const base:ChannelContext={dna:{positioning:"A neighbourhood kitchen",audience:"Adult neighbours",voice:"warm",exampleLine:"A table for you.",goal:"visits",signatureOfferId:"board",boundaries:"No invented discounts",dailyBudgetUsd:25,leadMinutes:20,channels:["storefront","geofenced_ad"]},offer:{id:"board",title:"Cheese board",description:"Three local cheeses",price:"18 €"},startLocal:"2030-05-13T17:00",timezone:"Europe/Paris",now:Date.parse("2030-05-10T12:00Z"),category:"calendar"};
test("advance acquisition arrives with an eligible paid placement, local radius and bounded cap",()=>{
 const plan=recommendDistribution(base);
 assert.deepEqual(plan.channels,["facebook","storefront","geofenced_ad"]);
 assert.deepEqual(plan.promotion,{platform:"facebook",radiusKm:2});assert.equal(plan.budgetUsd,25);
 assert.equal(planCost(plan.channels,plan.budgetUsd).chargedUsd,0);
 assert.match(plan.rationale.budget,/not a platform quote/);
});
test("the occasion changes the placement and radius instead of using Facebook and 1 km for everything",()=>{
 const plan=recommendDistribution({...base,category:"market",distanceKm:2.6});
 assert.equal(plan.promotion.platform,"instagram");assert.equal(plan.promotion.radiusKm,3);
 assert.match(plan.rationale.area,/2.6 km/);
 assert.equal(recommendDistribution({...base,hasVisual:true}).promotion.platform,"instagram");
});
test("immediate marketing stays organic while an optional local ad is already configured",()=>{
 const plan=recommendDistribution({...base,startLocal:"2030-05-10T15:00",category:"weather"});
 assert.ok(!plan.channels.includes("geofenced_ad"));assert.equal(plan.promotion.radiusKm,1);assert.equal(plan.budgetUsd,15);
 assert.equal(planCost(plan.channels,plan.budgetUsd).mediaBudgetUsd,0);assert.match(plan.reason,/starts soon/);
});
test("paid presets respect DNA opt-in, small budgets, regulars goals and invalid times",()=>{
 for(const dna of [{...base.dna,channels:["storefront"] as const},{...base.dna,dailyBudgetUsd:5},{...base.dna,goal:"regulars" as const}]){
  const plan=recommendDistribution({...base,dna:{...dna,channels:[...dna.channels]}});assert.ok(!plan.channels.includes("geofenced_ad"));
 }
 assert.equal(recommendDistribution({...base,dna:{...base.dna,dailyBudgetUsd:12}}).budgetUsd,12);
 assert.ok(!recommendDistribution({...base,startLocal:"invalid"}).channels.includes("geofenced_ad"));
 assert.equal(recommendDistribution({...base,dna:{...base.dna,channels:["storefront"]}}).budgetUsd,0);
});
test("custom changes are recognisable and the prepared plan remains available without overwriting them",()=>{
 const plan=recommendDistribution(base);
 assert.ok(matchesDistribution(plan,plan.channels,plan.promotion,plan.budgetUsd));
 assert.equal(matchesDistribution(plan,plan.channels,{...plan.promotion,radiusKm:5},plan.budgetUsd),false);
 assert.equal(matchesDistribution(plan,plan.channels,plan.promotion,20),false);
 assert.equal(matchesDistribution(plan,["facebook"],plan.promotion,0),false);
});
