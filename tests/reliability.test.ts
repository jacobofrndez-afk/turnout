import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { deliverySummary } from "../src/lib/delivery";
import {
  CampaignDraftSchema,
  WindowSchema,
  type CampaignDraft,
} from "../src/server/agent/schema";
import { campaignWindows, draftFirstWindow } from "../src/server/agent/prompt";
import { getDb } from "../src/server/db/client";
import {
  approveCampaign,
  createCampaign,
  getCampaign,
  getDraft,
  pollOperatorDraft,
} from "../src/server/agent/run";
import { getMerchant } from "../src/server/events/radar";
import { getEvent } from "../src/server/qloo/crowd";
import { POST } from "../src/app/api/campaigns/[id]/approve/route";

mkdirSync(".tmp", { recursive: true });
const temp = mkdtempSync(resolve(".tmp/reliability-"));
process.env.DATABASE_PATH = resolve(temp, "test.db");
process.env.AGENT_INBOX = temp;
process.env.AGENT_PROVIDER = "operator";
for (const key of [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_WHATSAPP_FROM",
  "DEMO_WHATSAPP_TO",
  "SNAP_ACCESS_TOKEN",
  "SNAP_AD_ACCOUNT_ID",
])
  process.env[key] = "";
const db = getDb();
db.prepare(
  "INSERT INTO merchants (id,name,kind,lat,lon,city,timezone,channels_json) VALUES (?,?,?,?,?,?,?,?)",
).run(
  "test_place",
  "Test bar",
  "bar",
  40.7,
  -74,
  "New York",
  "America/New_York",
  JSON.stringify([
    "storefront",
    "whatsapp",
    "geofenced_ad",
    "google_post",
    "dooh",
  ]),
);
db.prepare(
  "INSERT INTO offers (id,merchant_id,title) VALUES ('test_offer','test_place','Happy hour')",
).run();
db.prepare(
  "INSERT INTO events (id,name,starts_at,segment,timezone) VALUES ('test_event','Test show','2030-10-25T00:00:00Z','Music','America/New_York')",
).run();
const draft: CampaignDraft = CampaignDraftSchema.parse({
  language: "en",
  chosen_offer_id: "test_offer",
  audience_summary: "A test crowd.",
  rationale: "Test evidence.",
  windows: [
    {
      label: "Before doors",
      start_local: "17:30",
      end_local: "19:00",
      why: "Before the show.",
    },
  ],
  geofenced_ad: {
    platform: "snapchat",
    radius_m: 600,
    interests: ["Cocktails", "Music"],
    headline: "Two cocktails",
    body: "Come before the show.",
    cta: "Get directions",
    daily_budget_usd: 20,
  },
  google_post: {
    title: "Happy hour",
    body: "Come before the show.",
    offer_terms: "Until 7 pm.",
  },
  whatsapp: { message: "Two cocktails before the show." },
  storefront: { chalkboard: "Two cocktails", staff_line: "Welcome." },
  dooh: { headline: "Two cocktails", body: "Near the venue." },
  confidence: 0.8,
  limitations: "Group tastes only.",
});
function insert(
  id: string,
  status = "drafted",
  copy: string | null = JSON.stringify(draft),
  event = "test_event",
) {
  db.prepare(
    "INSERT INTO campaigns (id,merchant_id,event_id,status,copy_json) VALUES (?,?,?,?,?)",
  ).run(id, "test_place", event, status, copy);
  return getCampaign(id)!;
}
after(() => {
  db.close();
  rmSync(temp, { recursive: true, force: true });
});

test("simulated receipts never claim delivery, including legacy sent campaigns", () => {
  const result = deliverySummary(
    ["storefront", "whatsapp", "geofenced_ad"].map((channel) => ({
      channel,
      status: "simulated",
      simulated: 1,
    })),
  );
  assert.equal(result.status, "prepared");
  assert.equal(result.sent, 0);
  assert.match(result.description, /No message has been sent/);
  assert.doesNotMatch(result.description, /goes out as soon/);
});
test("failed and mixed receipts preserve failure rather than success", () => {
  assert.equal(
    deliverySummary([
      { channel: "whatsapp", status: "failed: timeout", simulated: 0 },
    ]).status,
    "failed",
  );
  const mixed = deliverySummary([
    { channel: "whatsapp", status: "sent", simulated: 0 },
    { channel: "geofenced_ad", status: "failed: timeout", simulated: 0 },
  ]);
  assert.equal(mixed.status, "partial");
  assert.equal(mixed.failed, 1);
  assert.equal(
    deliverySummary([
      { channel: "geofenced_ad", status: "created (paused)", simulated: 0 },
    ]).sent,
    0,
  );
});
test("publishing a campaign twice creates only one set of receipts", async () => {
  insert("publish_once");
  const request = () =>
    new Request("http://localhost/api/campaigns/publish_once/approve", {
      method: "POST",
    });
  const responses = await Promise.all([
    POST(request(), { params: Promise.resolve({ id: "publish_once" }) }),
    POST(request(), { params: Promise.resolve({ id: "publish_once" }) }),
  ]);
  assert.deepEqual(
    responses.map((r) => r.status),
    [303, 303],
  );
  assert.equal(
    (
      db
        .prepare(
          "SELECT count(*) n FROM sends WHERE campaign_id='publish_once'",
        )
        .get() as { n: number }
    ).n,
    5,
  );
  assert.equal(getCampaign("publish_once")?.status, "prepared");
});
test("the approval claim succeeds only once", () => {
  insert("claim_once");
  assert.equal(approveCampaign("claim_once"), true);
  assert.equal(approveCampaign("claim_once"), false);
});
test("an expired campaign cannot be approved or sent", async () => {
  db.prepare(
    "INSERT INTO events (id,name,starts_at,segment) VALUES ('past','Past show','2020-10-25T00:00:00Z','Music')",
  ).run();
  insert("expired", "drafted", JSON.stringify(draft), "past");
  await POST(
    new Request("http://localhost/api/campaigns/expired/approve", {
      method: "POST",
    }),
    { params: Promise.resolve({ id: "expired" }) },
  );
  assert.equal(getCampaign("expired")?.status, "drafted");
  assert.equal(
    (
      db
        .prepare("SELECT count(*) n FROM sends WHERE campaign_id='expired'")
        .get() as { n: number }
    ).n,
    0,
  );
  await assert.rejects(
    createCampaign(getMerchant("test_place")!, getEvent("past")!),
    /already left/,
  );
});
test("draft expiry respects its earlier end time and crosses midnight", () => {
  const event = getEvent("test_event")!;
  assert.equal(
    new Date(
      draftFirstWindow(event, draft.windows, "America/New_York").end,
    ).toISOString(),
    "2030-10-24T23:00:00.000Z",
  );
  const afterShow = [
    { label: "After the show", start_local: "22:45", end_local: "00:00" },
  ];
  assert.equal(
    new Date(
      draftFirstWindow(event, afterShow, "America/New_York").end,
    ).toISOString(),
    "2030-10-25T04:00:00.000Z",
  );
  const tooLate = [
    { label: "Before doors", start_local: "17:30", end_local: "23:00" },
  ];
  assert.equal(
    draftFirstWindow(event, tooLate, "America/New_York").end,
    campaignWindows(event)[0].end,
  );
});
test("invalid clock values cannot enter a new draft", () => {
  for (const clock of ["24:00", "19:99", "7 pm", ""])
    assert.equal(
      WindowSchema.safeParse({
        label: "Test",
        start_local: clock,
        end_local: "19:00",
        why: "Test",
      }).success,
      false,
    );
});
test("malformed JSON does not crash a campaign page", () => {
  const malformed = insert("broken_file", "awaiting_operator", null);
  writeFileSync(resolve(temp, "broken_file.draft.json"), "{invalid");
  assert.equal(pollOperatorDraft(malformed).status, "failed");
  assert.equal(
    getDraft(insert("broken_stored", "drafted", "{invalid")),
    undefined,
  );
});
test("a draft cannot choose another merchant's offer", () => {
  const row = insert("wrong_offer", "awaiting_operator", null);
  writeFileSync(
    resolve(temp, "wrong_offer.draft.json"),
    JSON.stringify({ ...draft, chosen_offer_id: "not_owned" }),
  );
  assert.equal(pollOperatorDraft(row).status, "failed");
});
test("concurrent generation requests reuse the ready campaign", async () => {
  insert("reuse_ready");
  const args = [getMerchant("test_place")!, getEvent("test_event")!] as const;
  const results = await Promise.all([
    createCampaign(...args),
    createCampaign(...args),
  ]);
  assert.deepEqual(
    results.map((r) => r.id),
    ["reuse_ready", "reuse_ready"],
  );
});
