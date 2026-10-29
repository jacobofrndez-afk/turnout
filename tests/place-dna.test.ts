import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../src/server/db/client";
import { getDna, saveDna, dnaPrompt, assertDnaBudget } from "../src/server/merchants/dna";
import { saveQuickCampaign } from "../src/server/merchants/quick-campaign";
import { campaignExample } from "../src/lib/place-dna";
import { menuFromLines } from "../src/server/merchants/photo-reader";
import { imageType } from "../src/server/merchants/photo";
import { POST as saveProfile } from "../src/app/api/merchants/[id]/dna/route";
import { POST as readPhoto } from "../src/app/api/merchants/[id]/photo/route";
import { sameOrigin } from "../src/server/guard";
import { publishCampaign } from "../src/server/channels";
import { getMerchant } from "../src/server/events/radar";
import { CampaignDraftSchema } from "../src/server/agent/schema";

mkdirSync(".tmp", { recursive: true });
const temp = mkdtempSync(resolve(".tmp/dna-test-"));
process.env.DATABASE_PATH = resolve(temp, "test.db"); process.env.AGENT_PROVIDER = "operator"; process.env.PHOTO_READER = "manual";
for (const key of ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM", "DEMO_WHATSAPP_TO", "SNAP_ACCESS_TOKEN", "SNAP_AD_ACCOUNT_ID"]) process.env[key] = "";
const db = getDb();
for (const [id, name, city, zone, offerId, title, price] of [
  ["m_penn_pour", "Penn & Pour", "New York", "America/New_York", "o_pp_beer", "Craft beer flight", "$18"],
  ["m_quai_bercy", "Le Quai 12", "Paris", "Europe/Paris", "o_q12_apero", "Pre-show aperitif", "24€"],
]) {
  db.prepare("INSERT INTO merchants (id,name,kind,lat,lon,city,timezone) VALUES (?,?, 'bar', 40, -74, ?, ?)").run(id,name,city,zone);
  db.prepare("INSERT INTO offers (id,merchant_id,title,description,price) VALUES (?,?,?,'Menu offer',?)").run(offerId,id,title,price);
}
after(() => { db.close(); rmSync(temp, { recursive: true, force: true }); });

test("demo DNA is distinct, uses owned offers and survives reload without resetting edits", () => {
  const ny = getDna("m_penn_pour"), paris = getDna("m_quai_bercy");
  assert.equal(ny.status,"demo"); assert.equal(paris.status,"demo");
  const a = campaignExample(ny.profile, {id:"o_pp_beer",title:"Craft beer flight",description:"",price:"$18"});
  const b = campaignExample(paris.profile, {id:"o_q12_apero",title:"Pre-show aperitif",description:"",price:"24€"});
  assert.notEqual(a.message,b.message); assert.equal(a.budget,25); assert.equal(b.budget,0);
  const saved = saveDna("m_penn_pour", {...ny.profile, exampleLine:"Local beer. A proper welcome."}, ny.version);
  assert.equal(getDna("m_penn_pour").profile.exampleLine,"Local beer. A proper welcome.");
  assert.equal(saved.version,ny.version+1); assert.equal(getDna("m_quai_bercy").version,paris.version);
});
test("stale saves, cross-place offers and invalid commercial limits cannot alter DNA", () => {
  const current = getDna("m_penn_pour");
  assert.throws(() => saveDna("m_penn_pour",current.profile,current.version-1),/another tab/);
  assert.throws(() => saveDna("m_penn_pour",{...current.profile,signatureOfferId:"o_q12_apero"},current.version),/belonging/);
  assert.throws(() => saveDna("m_penn_pour",{...current.profile,dailyBudgetUsd:-1},current.version));
  assert.throws(() => saveDna("m_penn_pour",{...current.profile,channels:[]},current.version));
  assert.deepEqual(getDna("m_penn_pour"),current);
});
test("campaign snapshots stay fixed; learning requires an explicit phrase and stays local", () => {
  const dna = getDna("m_penn_pour"); const other = getDna("m_quai_bercy");
  const input = { version:dna.version, offer:{title:"Soup of the day",description:"Today's chalkboard",price:"$9"}, availability:"Friday lunch",copy:"Soup of the day. $9. Friday lunch.",verified:true };
  const one = saveQuickCampaign("m_penn_pour",input);
  assert.equal(getDna("m_penn_pour").version,dna.version);
  const count = (db.prepare("SELECT COUNT(*) AS n FROM offers").get() as {n:number}).n;
  saveQuickCampaign("m_penn_pour",{...input,rememberLine:"Simple things, done well."});
  assert.equal(getDna("m_penn_pour").profile.exampleLine,"Simple things, done well.");
  assert.deepEqual(getDna("m_quai_bercy"),other);
  const row = db.prepare("SELECT dna_snapshot_json,copy FROM quick_campaigns WHERE id=?").get(one.id) as {dna_snapshot_json:string;copy:string};
  assert.equal(JSON.parse(row.dna_snapshot_json).version,dna.version); assert.equal(row.copy,input.copy);
  assert.equal((db.prepare("SELECT COUNT(*) AS n FROM offers").get() as {n:number}).n,count);
  assert.throws(() => saveQuickCampaign("m_penn_pour",input),/DNA changed/);
});
test("unverified information and foreign photo references cannot become saved campaigns", () => {
  const dna = getDna("m_penn_pour");
  const input = { version:dna.version, offer:{title:"Board",description:"",price:"$12"}, availability:"Saturday",copy:"A board for $12",verified:true };
  assert.throws(() => saveQuickCampaign("m_penn_pour",{...input,verified:false}),/confirm/);
  db.prepare("INSERT INTO menu_captures (id,merchant_id,extraction_json) VALUES ('other-photo','m_quai_bercy','{}')").run();
  assert.throws(() => saveQuickCampaign("m_penn_pour",{...input,captureId:"other-photo"}),/does not belong/);
  assert.throws(() => saveQuickCampaign("m_penn_pour",{...input,offer:{...input.offer,price:""}}),/Check the offer/);
});
test("DNA passed to writers distinguishes preferences from evidence and enforces the saved ceiling", () => {
  const dna=getDna("m_quai_bercy"); const prompt=dnaPrompt(dna);
  assert.match(prompt,/not observed audience facts/); assert.match(prompt,/Paid media ceiling: US\$0/);
  assert.match(prompt,/45 minutes/); assert.match(prompt,/o_q12_apero/);
  assert.doesNotThrow(() => assertDnaBudget(dna,0)); assert.throws(() => assertDnaBudget(dna,1),/exceeds/);
});
test("DNA API rejects cross-origin changes and stale versions", async () => {
  const dna = getDna("m_penn_pour"); const params = Promise.resolve({id:"m_penn_pour"});
  const foreign = await saveProfile(new Request("http://localhost/api", {method:"POST",headers:{origin:"https://other.example"},body:JSON.stringify({profile:dna.profile,version:dna.version})}),{params});
  assert.equal(foreign.status,403);
  const stale = await saveProfile(new Request("http://localhost/api", {method:"POST",body:JSON.stringify({profile:dna.profile,version:0})}),{params}); assert.equal(stale.status,409);
});
test("unavailable image reading is explicit and does not create an invented extraction", async () => {
  const response = await readPhoto(new Request("http://localhost/api",{method:"POST"}),{params:Promise.resolve({id:"m_penn_pour"})});
  assert.equal(response.status,503); assert.match((await response.json()).error,/not connected/);
  assert.equal(imageType(Buffer.from("<script>not an image</script>")),undefined);
  assert.equal(imageType(Buffer.from([137,80,78,71,13,10,26,10])),"image/png");
});
test("delivery uses the campaign's captured channels after DNA preferences change", async () => {
  const dna=getDna("m_penn_pour");
  db.prepare("INSERT INTO events (id,name,starts_at) VALUES ('dna-event','Future event','2030-01-01T20:00:00Z')").run();
  db.prepare("INSERT INTO campaigns (id,merchant_id,event_id,status,dna_snapshot_json,channels_json) VALUES ('dna-campaign','m_penn_pour','dna-event','approved',?,?)").run(JSON.stringify(dna),JSON.stringify(["storefront"]));
  const draft=CampaignDraftSchema.parse({language:"en",chosen_offer_id:"o_pp_beer",audience_summary:"Test",rationale:"Test",windows:[{label:"Before",start_local:"17:00",end_local:"19:00",why:"Test"}],geofenced_ad:{platform:"meta",radius_m:500,interests:["Beer","Music"],headline:"Beer",body:"Local beer",cta:"Visit",daily_budget_usd:20},google_post:{title:"Beer",body:"Local beer",offer_terms:"Menu price"},whatsapp:{message:"Local beer"},storefront:{chalkboard:"Local beer",staff_line:"Welcome"},dooh:{headline:"Beer",body:"Local beer"},confidence:0.5,limitations:"Test"});
  const sends=await publishCampaign("dna-campaign",getMerchant("m_penn_pour")!,draft);
  assert.deepEqual(sends.map(s=>s.channel),["storefront"]);
  db.prepare("INSERT INTO campaigns (id,merchant_id,event_id,status,dna_snapshot_json,channels_json) VALUES ('social-manual','m_penn_pour','dna-event','approved',?,?)").run(JSON.stringify(dna),JSON.stringify(["instagram","facebook"]));
  const social=await publishCampaign("social-manual",getMerchant("m_penn_pour")!,draft);
  assert.deepEqual(social.map(s=>s.channel),["instagram","facebook"]);assert.ok(social.every(s=>s.status==="ready"&&s.simulated===1&&s.provider_sid===null));
  assert.equal(JSON.parse(social[0].payload_json!).message,"Beer\nLocal beer\nMenu price");
});

test("same-origin protection accepts the original Host after Next normalizes its URL", () => {
 assert.equal(sameOrigin(new Request("http://localhost:3103/api",{headers:{origin:"http://127.0.0.1:3103",host:"127.0.0.1:3103"}})),true);
 assert.equal(sameOrigin(new Request("http://localhost:3103/api",{headers:{origin:"https://evil.example",host:"127.0.0.1:3103"}})),false);
});

test("photo extraction keeps explicit currencies and does not invent unreadable prices", () => {
 const result=menuFromLines([{text:"Craft beer flight $18",confidence:0.9},{text:"Soup of the day",confidence:0.9},{text:"Board 24€",confidence:0.9},{text:"Coffee 3",confidence:0.6}]);
 assert.deepEqual(result.offers.map(o=>[o.title,o.price]),[["Craft beer flight","$18"],["Board","24€"]]);
 assert.match(result.transcription,/Soup of the day/); assert.match(result.uncertainty,/Check every item/);
});
