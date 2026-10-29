import assert from "node:assert/strict";
import { test } from "node:test";
import { campaignKpis, demoCampaignHistory, type CampaignKpiInput } from "../src/lib/demo-campaign-history";

const example = (patch: Partial<CampaignKpiInput> = {}): CampaignKpiInput => ({ spendUsd: 10, redemptions: 2, offerPriceUsd: 16, digital: { reach: 80, impressions: 100, clicks: 10 }, ...patch });

test("campaign CTR uses combined impressions rather than averaging rates", () => {
  const k = campaignKpis([example(), example({ digital: { reach: 600, impressions: 900, clicks: 9 } })]);
  assert.equal(k.ctr, 19 / 1000);
  assert.notEqual(k.ctr, (0.10 + 0.01) / 2);
});
test("revenue counts offer bundles once and cost per redemption includes unpaid channels", () => {
  const k = campaignKpis([example(), example({ spendUsd: 0, redemptions: 3, offerPriceUsd: 18 })]);
  assert.equal(k.offerRevenueUsd, 86);
  assert.equal(k.redemptions, 5);
  assert.equal(k.mediaCostPerRedemptionUsd, 2);
});
test("empty and zero-result samples do not show invented rates or infinity", () => {
  const empty = campaignKpis([]);
  assert.equal(empty.ctr, null);
  assert.equal(empty.mediaCostPerRedemptionUsd, null);
  const noResults = campaignKpis([example({ redemptions: 0, digital: { reach: 80, impressions: 100, clicks: 0 } })]);
  assert.equal(noResults.mediaCostPerRedemptionUsd, null);
  assert.equal(noResults.ctr, 0);
  assert.equal(noResults.offerRevenueUsd, 0);
  assert.equal(campaignKpis([example({ spendUsd: 0 })]).mediaCostPerRedemptionUsd, 0);
});
test("the KPI demo stays restricted to Penn & Pour with consistent sample counts", () => {
  const campaigns = demoCampaignHistory("m_penn_pour");
  assert.equal(campaigns.length, 6);
  for (const c of campaigns) {
    assert.ok(c.digital.clicks <= c.digital.impressions);
    assert.ok(c.digital.reach <= c.digital.impressions);
    assert.ok(c.spendUsd === 0 || c.channels.includes("geofenced_ad"));
  }
  assert.deepEqual(demoCampaignHistory("m_quai_bercy"), []);
  assert.deepEqual(demoCampaignHistory("another_place"), []);
});
