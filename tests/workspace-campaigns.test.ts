import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { getDb } from "../src/server/db/client";
import { workspaceCampaigns } from "../src/server/workspace/campaigns";
mkdirSync(".tmp", { recursive: true });
const dir = mkdtempSync(resolve(".tmp/workspace-test-")); process.env.DATABASE_PATH = resolve(dir, "test.db");
const db = getDb();
db.prepare("INSERT INTO merchants (id,name,kind,lat,lon,city) VALUES ('place','Place','bar',0,0,'Test')").run();
db.prepare("INSERT INTO events(id,name,starts_at) VALUES('event','Published event','2030-01-01T20:00:00Z')").run();
db.prepare("INSERT INTO campaigns(id,merchant_id,event_id,status,copy_json,dna_snapshot_json) VALUES('old','place','event','sent','{}',NULL),('new','place','event','drafted','{}','{}')").run();
db.prepare("INSERT INTO sends(id,campaign_id,channel,status,simulated) VALUES('receipt','old','whatsapp','sent',1)").run();
db.prepare("INSERT INTO quick_campaigns(id,merchant_id,input_json,copy,dna_snapshot_json) VALUES('photo','place',?, 'Message', '{}')").run(JSON.stringify({ offer:{title:'Menu offer'},availability:'Friday evening' }));
after(() => { db.close(); rmSync(dir,{recursive:true,force:true}); });
test("historical campaigns stay available without being presented as new DNA recommendations", () => {
  const rows=workspaceCampaigns('place');
  assert.equal(rows.find(r=>r.id==='old')?.legacy,true);
  assert.equal(rows.find(r=>r.id==='old')?.status,'Campaign saved');
  assert.equal(rows.find(r=>r.id==='new')?.legacy,false);
  assert.equal(rows.find(r=>r.id==='photo')?.status,'Draft · not scheduled');
  assert.equal(rows.find(r=>r.id==='photo')?.date,null);
  assert.deepEqual(workspaceCampaigns('another-place'),[]);
});

test("a reviewed campaign uses its chosen time and keeps superseded drafts out of the active agenda",()=>{
  db.prepare("UPDATE merchants SET timezone='UTC' WHERE id='place'").run();
  db.prepare("INSERT INTO campaigns(id,merchant_id,event_id,status,copy_json,dna_snapshot_json) VALUES('retry','place','event','drafted','{}','{}')").run();
  db.prepare("UPDATE campaigns SET review_json=? WHERE id='retry'").run(JSON.stringify({startLocal:'2030-01-01T17:30'}));
  let rows=workspaceCampaigns('place');
  assert.equal(rows.find(r=>r.id==='retry')?.date,'2030-01-01T17:30:00.000Z');
  assert.equal(rows.find(r=>r.id==='retry')?.planned,true);
  assert.equal(rows.find(r=>r.id==='new')?.superseded,true);
  assert.equal(rows.find(r=>r.id==='old')?.superseded,false);
  db.prepare("UPDATE campaigns SET status='prepared' WHERE id='retry'").run();
  assert.equal(workspaceCampaigns('place').find(r=>r.id==='retry')?.planned,true);
});
