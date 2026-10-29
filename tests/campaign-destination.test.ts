import test from "node:test";
import assert from "node:assert/strict";
import { campaignDestination } from "../src/lib/campaign-destination";
import { campaignChannelOptions, planCost } from "../src/lib/campaign-plan";
import type { ChannelAccount } from "../src/lib/social-channels";
const account:ChannelAccount={provider:"instagram",externalId:"123",username:"a_place",name:"A place",status:"connected",expiresAt:null,checkedAt:0};
test("an unconnected demo never invents a social account or claims it can publish",()=>{
 for(const channel of ["instagram","facebook"] as const){const d=campaignDestination(channel,"place","Demo place",[]);assert.equal(d.status,"Account not connected");assert.ok(d.accountHref?.includes("merchant=place"));assert.ok(d.accountAction?.startsWith("Connect"));assert.ok(!d.title.includes("Demo place"));}
 assert.equal(campaignDestination("instagram","place","Demo",[]).needsImage,true);
});
test("destination uses the current authorized account and safe provider links",()=>{
 const ig=campaignDestination("instagram","one","Demo",[account]);assert.equal(ig.title,"@a_place");assert.equal(ig.links[0].href,"https://www.instagram.com/a_place/");assert.equal(ig.status,"Connected · manual posting");
 const fb=campaignDestination("facebook","one","Demo",[{...account,provider:"facebook",username:undefined}]);assert.equal(fb.title,"A place");assert.equal(fb.links[0].href,"https://www.facebook.com/123");
 const invalid=campaignDestination("instagram","one","Demo",[{...account,username:"evil.example/?x=1"}]);assert.equal(invalid.links[0].href,"https://www.instagram.com/");
});
test("outage, loading and revoked access cannot be shown as ready",()=>{
 assert.equal(campaignDestination("instagram","one","Demo",[account],"unavailable").status,"Account status unavailable");
 assert.equal(campaignDestination("instagram","one","Demo",[account],"loading").status,"Checking account…");
 const d=campaignDestination("instagram","one","Demo",[{...account,status:"reconnect"}]);assert.equal(d.status,"Reconnect account");assert.equal(d.accountAction,"Reconnect Instagram");
});
test("campaign destinations are explicit while paid channels remain opt-in",()=>{
 const options=campaignChannelOptions(["storefront"]);assert.ok(options.includes("instagram"));assert.ok(options.includes("facebook"));assert.ok(!options.includes("geofenced_ad"));
 assert.ok(campaignChannelOptions(["storefront","geofenced_ad"]).includes("geofenced_ad"));assert.equal(planCost(["instagram","facebook"],25).mediaBudgetUsd,0);
 assert.equal(campaignDestination("storefront","one","Test",[]).title,"Test · at the entrance");assert.equal(campaignDestination("storefront","one","Test",[]).links.length,0);
 assert.match(campaignDestination("whatsapp","one","Test",[]).title,/opted-in/);assert.equal(campaignDestination("geofenced_ad","one","Test",[account]).status,"Ad account not connected");
});

test("a configured local ad leads to its chosen platform and requires targeting setup",()=>{
 const d=campaignDestination("geofenced_ad","m_penn_pour","Penn & Pour",[],"ready",{platform:"facebook",radiusKm:2});
 assert.match(d.title,/Facebook/);assert.match(d.help,/2 km/);assert.match(d.help,/platform review/);assert.match(d.status,/not connected/);assert.equal(d.links.length,1);assert.equal(d.links[0].href,"https://adsmanager.facebook.com/");
});
