import assert from "node:assert/strict";
import { test } from "node:test";
import { CampaignVisualSchema, MAX_VISUAL_BYTES, exampleRevenueScenario, offerUnitPrice, revenueScenario, RevenueScenarioSchema } from "../src/lib/campaign-creative";
import { validateCampaignVisual } from "../src/server/merchants/campaign-visual";
const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
test("revenue scenarios count bundles as one sale and preserve offer currency",()=>{
  assert.deepEqual(offerUnitPrice("$16 for two"),{amount:16,currency:"USD"});
  const bundle=revenueScenario("$16 for two",exampleRevenueScenario)!;
  assert.equal(bundle.low,80);assert.equal(bundle.high,240);
  const euros=revenueScenario("24 €",{lowSales:2,highSales:8,basis:"owner"})!;
  assert.equal(euros.low,48);assert.equal(euros.high,192);assert.equal(euros.currency,"EUR");
  assert.equal(offerUnitPrice("€12,50")?.amount,12.5);
});
test("missing or ambiguous prices do not produce financial projections",()=>{
  for(const price of [null,"","from $15","$12–$18","$15 or $20","15","free","$0","CA$15"])assert.equal(revenueScenario(price,exampleRevenueScenario),null);
  assert.equal(RevenueScenarioSchema.safeParse({lowSales:20,highSales:10,basis:"owner"}).success,false);
  assert.equal(RevenueScenarioSchema.safeParse({lowSales:1.5,highSales:10,basis:"owner"}).success,false);
  assert.equal(RevenueScenarioSchema.safeParse({lowSales:1,highSales:10,basis:"qloo"}).success,false);
});
test("campaign images accept bounded image bytes and reject script, remote and disguised payloads",()=>{
  const visual={name:"offer.png",dataUrl:`data:image/png;base64,${png}`};assert.doesNotThrow(()=>validateCampaignVisual(visual));
  for(const bad of [{...visual,name:"../offer.png"},{...visual,dataUrl:"https://example.com/photo.png"},{...visual,dataUrl:`data:image/svg+xml;base64,${png}`},{...visual,dataUrl:`data:image/jpeg;base64,${png}`},{...visual,dataUrl:`data:image/png;base64,${Buffer.from("<script>alert(1)</script>").toString("base64")}`}])assert.throws(()=>validateCampaignVisual(bad));
  assert.equal(CampaignVisualSchema.safeParse({...visual,dataUrl:`data:image/png;base64,${Buffer.alloc(MAX_VISUAL_BYTES+20).toString("base64")}`}).success,false);
});
