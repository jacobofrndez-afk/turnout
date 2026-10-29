import assert from "node:assert/strict";
import { test } from "node:test";
import { recommendCampaignChannels, googlePromotionNote, type ChannelContext } from "../src/lib/channel-recommendation";
import { campaignDestination } from "../src/lib/campaign-destination";
import { campaignChannelOptions, CampaignPlanSchema, planCost } from "../src/lib/campaign-plan";
const base:ChannelContext={dna:{positioning:"A neighbourhood kitchen",audience:"Adult neighbours",voice:"warm",exampleLine:"A table for you.",goal:"visits",signatureOfferId:"board",boundaries:"No invented discounts",dailyBudgetUsd:25,leadMinutes:20,channels:["storefront","geofenced_ad"]},offer:{id:"board",title:"Cheese board",description:"Three local cheeses",price:"18 €"},startLocal:"2030-05-10T17:00",timezone:"Europe/Paris",now:Date.parse("2030-05-10T12:00Z")};
const lead=(context:Partial<ChannelContext>)=>recommendCampaignChannels({...base,...context}).find(c=>c.recommended)!;
test("a recommendation changes with the opportunity and keeps paid media optional",()=>{
 assert.equal(lead({category:"street"}).channel,"google_post");
 assert.equal(lead({category:"market",offer:{...base.offer,title:"Craft beer flight"}}).channel,"instagram");
 assert.equal(lead({category:"calendar",startLocal:"2030-05-13T17:00"}).channel,"facebook");
 const selected=recommendCampaignChannels(base).filter(c=>c.recommended).map(c=>c.channel);
 assert.ok(selected.length<=2);assert.ok(!selected.includes("geofenced_ad"));assert.equal(planCost(selected,25).mediaBudgetUsd,0);
});
test("regulars and urgent quiet hours prefer WhatsApp only when it is a usual channel",()=>{
 const dna={...base.dna,goal:"regulars" as const,channels:["whatsapp" as const]};
 assert.equal(lead({dna}).channel,"whatsapp");assert.notEqual(lead({dna:{...dna,channels:["storefront"]}}).channel,"whatsapp");
 assert.match(lead({dna}).requirement,/opted-in/);assert.match(lead({dna}).requirement,/no contacts connected/);
});
test("visual platforms depend on timing, an existing channel preference and a creative to prepare",()=>{
 const tiktok=lead({dna:{...base.dna,channels:["tiktok"]},startLocal:"2030-05-13T17:00"});assert.equal(tiktok.channel,"tiktok");assert.match(tiktok.requirement,/photo or short video/);
 const snap=lead({dna:{...base.dna,channels:["snapchat"]}});assert.equal(snap.channel,"snapchat");assert.match(snap.requirement,/photo or vertical video/);
 assert.equal(lead({hasVisual:true}).channel,"instagram");
});
test("Google is not recommended for a priced alcohol promotion",()=>{
 const c={...base,category:"street" as const,offer:{...base.offer,title:"Two cocktails"}};
 assert.notEqual(lead(c).channel,"google_post");assert.equal(recommendCampaignChannels(c).find(c=>c.channel==="google_post")?.recommended,false);
 assert.match(googlePromotionNote("House wine · 8 €")!,/neutral venue update/);assert.equal(googlePromotionNote("Cheese board · 18 €"),undefined);
});
test("all six online platforms have their own destination and no new connection is fabricated",()=>{
 for(const c of ["instagram","facebook","tiktok","snapchat","whatsapp","google_post"] as const)assert.ok(campaignChannelOptions([]).includes(c));
 for(const c of ["tiktok","snapchat"] as const){const d=campaignDestination(c,"demo","Demo venue",[]);assert.match(d.status,/not connected/);assert.ok(d.needsImage);assert.ok(d.accountHref?.endsWith(`channel-${c}`));assert.ok(d.links[0].href.includes(c));assert.doesNotMatch(d.format,/paid/i);}
});
test("extended channel selection passes through the plan schema as manual, zero-media destinations",()=>{
 const p=CampaignPlanSchema.parse({requestId:"5d054d69-4c7c-4534-8e4d-16844dbf3adc",version:1,offerId:"board",offerPrice:"18 €",message:"Our cheese board is ready.",startLocal:base.startLocal,endLocal:"2030-05-10T19:00",channels:["tiktok","snapchat","google_post","whatsapp"],mediaBudgetUsd:0,decision:"saved"});
 assert.deepEqual(p.channels,["tiktok","snapchat","google_post","whatsapp"]);assert.equal(planCost(p.channels,25).chargedUsd,0);
});

test("a regulars goal does not force WhatsApp on every future opportunity",()=>{
 const dna={...base.dna,goal:"regulars" as const,channels:["whatsapp" as const,"storefront" as const]};
 assert.equal(lead({dna}).channel,"whatsapp");
 assert.equal(lead({dna,category:"culture",startLocal:"2030-05-13T17:00"}).channel,"facebook");
 assert.equal(lead({dna,category:"menu",startLocal:"2030-05-13T22:00",offer:{...base.offer,title:"Late plate"}}).channel,"instagram");
});
