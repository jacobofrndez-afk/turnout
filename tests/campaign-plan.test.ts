import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdirSync, mkdtempSync, rmSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { getDb } from "../src/server/db/client";
import { getDna, saveDna } from "../src/server/merchants/dna";
import { saveCampaignPlan } from "../src/server/merchants/campaign-plan";
import { localTimeToInstant, localStampAt, planCost, validatePlanTiming, type CampaignPlanInput } from "../src/lib/campaign-plan";
import { proposeCampaign } from "../src/server/workspace/proposal";
import { getOffers } from "../src/server/qloo/crowd";
import { workspaceCampaigns } from "../src/server/workspace/campaigns";
import { POST } from "../src/app/api/merchants/[id]/campaign-plan/route";
mkdirSync(".tmp",{recursive:true});
const dir=mkdtempSync(resolve(".tmp/campaign-plan-test-"));process.env.DATABASE_PATH=resolve(dir,"test.db");
const db=getDb();
for(const [id,name,city,zone,offerId,title,price] of [
 ["m_penn_pour","Penn & Pour","New York","America/New_York","o_pp_beer","Craft beer flight","$18"],
 ["m_quai_bercy","Le Quai 12","Paris","Europe/Paris","o_q12_apero","Pre-show aperitif","24 €"],
]){
 db.prepare("INSERT INTO merchants(id,name,kind,lat,lon,city,timezone) VALUES(?,?,'bar',40,-74,?,?)").run(id,name,city,zone);
 db.prepare("INSERT INTO offers(id,merchant_id,title,description,price) VALUES(?,?,?,'The saved menu description',?)").run(offerId,id,title,price);
}
after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
const now=Date.parse("2030-05-10T14:00:00Z");
const input=(overrides:Partial<CampaignPlanInput>={}):CampaignPlanInput=>({requestId:randomUUID(),version:getDna("m_penn_pour").version,offerId:"o_pp_beer",offerPrice:"$18",message:"My own message. Craft beer flight, $18.",startLocal:"2030-05-10T17:00",endLocal:"2030-05-10T19:00",channels:["storefront","geofenced_ad"],mediaBudgetUsd:25,decision:"approved",...overrides});
const read=(id:string)=>{const r=db.prepare("SELECT input_json,copy,dna_snapshot_json FROM quick_campaigns WHERE id=?").get(id) as {input_json:string;copy:string;dna_snapshot_json:string};return {input:JSON.parse(r.input_json),copy:r.copy,dna:JSON.parse(r.dna_snapshot_json)};};
test("both demos get distinct complete proposals with owned menu data and preparation time",()=>{
 const ny=getDna("m_penn_pour"),paris=getDna("m_quai_bercy");
 const a=proposeCampaign(ny,getOffers("m_penn_pour"),"America/New_York",[],now)!,b=proposeCampaign(paris,getOffers("m_quai_bercy"),"Europe/Paris",[],now)!;
 assert.equal(a.budgetUsd,25);assert.equal(b.budgetUsd,0);assert.match(a.messages[a.offerId],/Good beer/);assert.match(b.messages[b.offerId],/A glass/);assert.match(a.messages[a.offerId],/\$18/);assert.match(b.messages[b.offerId],/24 €/);
 for(const [p,dna,tz] of [[a,ny,"America/New_York"],[b,paris,"Europe/Paris"]] as const){for(const s of p.slots)assert.doesNotThrow(()=>validatePlanTiming(s.startLocal,s.endLocal,tz,dna.profile.leadMinutes,now));assert.match(p.slots[0].source,/No live demand forecast/);}
});
test("a neighbourhood brunch habit does not turn a beer offer into a brunch recommendation",()=>{
 const p=proposeCampaign(getDna("m_penn_pour"),getOffers("m_penn_pour"),"America/New_York",[{id:"brunch",label:"Brunch",days:[0,5,6],from:"11:00",to:"15:00",strength:"strong",evidence:["Nearby brunch menus"],places:[]}],now)!;assert.ok(p.slots.every(s=>!s.id.includes("brunch")));
});
test("approval retains personal wording, exact window and budget without any delivery or charge",()=>{
 const result=saveCampaignPlan("m_penn_pour",input(),now),r=read(result.id);assert.match(r.copy,/My own message/);assert.match(r.copy,/Fri,? 10 May/);
 assert.equal(r.input.plan.startAt,"2030-05-10T21:00:00.000Z");assert.equal(r.input.plan.endAt,"2030-05-10T23:00:00.000Z");assert.deepEqual(r.input.plan.channels,["storefront","geofenced_ad"]);assert.equal(r.input.plan.mediaBudgetUsd,25);assert.equal(r.input.plan.chargedUsd,0);assert.equal(r.input.plan.delivery,"manual");
 assert.equal((db.prepare("SELECT count(*) n FROM sends").get() as {n:number}).n,0);const row=workspaceCampaigns("m_penn_pour").find(c=>c.id===result.id)!;assert.equal(row.status,"Approved · share manually");assert.equal(row.date,r.input.plan.startAt);
});
test("removing ads makes media cost zero and rejects a leftover budget",()=>{
 assert.equal(planCost(["storefront"],25).mediaBudgetUsd,0);const r=saveCampaignPlan("m_penn_pour",input({channels:["storefront"],mediaBudgetUsd:0}),now);assert.equal(read(r.id).input.plan.mediaBudgetUsd,0);assert.throws(()=>saveCampaignPlan("m_penn_pour",input({channels:["storefront"]}),now),/Remove the ad budget/);
});
test("retries are idempotent while changed requests cannot overwrite an approved decision",()=>{
 const body=input(),a=saveCampaignPlan("m_penn_pour",body,now),b=saveCampaignPlan("m_penn_pour",body,now);assert.deepEqual(a,b);assert.equal((db.prepare("SELECT count(*) n FROM quick_campaigns WHERE id=?").get(a.id) as {n:number}).n,1);assert.throws(()=>saveCampaignPlan("m_penn_pour",{...body,message:"Changed"},now),/already changed/);
});
test("a saved plan can be edited and approved in place, without duplicates or cross-place changes",()=>{
 const saved=saveCampaignPlan("m_penn_pour",input({decision:"saved"}),now),body=input({planId:saved.id,revision:1,message:"Our local favourites. Your next stop."});
 assert.equal(saveCampaignPlan("m_penn_pour",body,now).id,saved.id);assert.deepEqual(saveCampaignPlan("m_penn_pour",body,now),{id:saved.id,decision:"approved"});const r=read(saved.id);assert.equal(r.input.plan.revision,2);assert.equal(r.input.messageBody,body.message);assert.throws(()=>saveCampaignPlan("m_penn_pour",{...body,requestId:randomUUID()},now),/already changed/);assert.throws(()=>saveCampaignPlan("m_quai_bercy",body,now),/not found/);
});
test("invalid menu ownership, stale prices, channels and budgets cannot be approved",()=>{
 for(const [change,reason] of [[{offerId:"o_q12_apero"},/belonging/],[{offerPrice:"$17"},/price changed/],[{mediaBudgetUsd:26},/budget/],[{mediaBudgetUsd:9},/budget/],[{channels:[]},/Check your/]] as [Partial<CampaignPlanInput>,RegExp][])assert.throws(()=>saveCampaignPlan("m_penn_pour",input(change),now),reason);
});
test("timing must leave preparation time and a reasonable campaign window",()=>{
 assert.throws(()=>saveCampaignPlan("m_penn_pour",input({startLocal:"2030-05-10T10:00"}),now),/prepare/);assert.throws(()=>saveCampaignPlan("m_penn_pour",input({endLocal:"2030-05-10T17:15"}),now),/30 minutes/);assert.throws(()=>saveCampaignPlan("m_penn_pour",input({endLocal:"2030-05-11T08:00"}),now),/12 hours/);
});
test("local time conversion rejects invalid dates and daylight-saving gaps or ambiguity",()=>{
 assert.throws(()=>localTimeToInstant("2026-03-29T02:30","Europe/Paris"),/does not exist/);assert.throws(()=>localTimeToInstant("2026-10-25T02:30","Europe/Paris"),/occurs twice/);assert.throws(()=>localTimeToInstant("2026-02-30T17:00","Europe/Paris"),/calendar date/);assert.equal(new Date(localTimeToInstant("2026-10-25T17:00","Europe/Paris")).toISOString(),"2026-10-25T16:00:00.000Z");
});
test("DNA is captured with the decision and stale proposals cannot silently use new preferences",()=>{
 const body=input(),a=saveCampaignPlan("m_penn_pour",body,now),dna=getDna("m_penn_pour");saveDna("m_penn_pour",{...dna.profile,exampleLine:"A new voice."},dna.version);assert.equal(read(a.id).dna.version,dna.version);assert.throws(()=>saveCampaignPlan("m_penn_pour",{...body,requestId:randomUUID()},now),/DNA changed/);
});
test("the decision API rejects foreign origins",async()=>{
 const response=await POST(new Request("http://localhost/api",{method:"POST",headers:{origin:"https://other.example"},body:JSON.stringify(input())}),{params:Promise.resolve({id:"m_penn_pour"})});assert.equal(response.status,403);
});
test("approval cannot override the explicit serving hours saved on an offer",()=>{
 db.prepare("INSERT INTO offers(id,merchant_id,title,description,price) VALUES('o_window','m_penn_pour','Happy hour','Two cocktails, 5 to 7 pm','$16')").run();assert.throws(()=>saveCampaignPlan("m_penn_pour",input({offerId:"o_window",offerPrice:"$16",endLocal:"2030-05-10T20:00"}),now),/serving window/);assert.doesNotThrow(()=>saveCampaignPlan("m_penn_pour",input({offerId:"o_window",offerPrice:"$16"}),now));
});

test("a campaign can add unpaid social destinations without rewriting DNA or publishing",()=>{
 const before=getDna("m_penn_pour"),body=input({channels:["instagram","facebook","whatsapp","tiktok","snapchat","google_post"],mediaBudgetUsd:0});
 const result=saveCampaignPlan("m_penn_pour",body,now),saved=read(result.id);
 assert.deepEqual(saved.input.plan.channels,body.channels);assert.equal(saved.input.plan.delivery,"manual");assert.equal(saved.input.plan.chargedUsd,0);
 assert.deepEqual(getDna("m_penn_pour"),before);assert.equal((db.prepare("SELECT count(*) n FROM sends").get() as {n:number}).n,0);
 assert.ok(!saved.input.plan.accounts);assert.ok(!saved.input.plan.access_token);
 assert.throws(()=>saveCampaignPlan("m_quai_bercy",input({version:getDna("m_quai_bercy").version,offerId:"o_q12_apero",offerPrice:"24 €",channels:["geofenced_ad"],mediaBudgetUsd:10}),now),/Enable paid channels/);
});


test("a visual and owner revenue assumptions survive saving, reopening and removal without publication",()=>{
 const visual={name:"menu.png",dataUrl:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII="};
 const revenueScenario={lowSales:3,highSales:11,basis:"owner" as const};
 const body=input({decision:"saved",visual,revenueScenario});const result=saveCampaignPlan("m_penn_pour",body,now);
 assert.deepEqual(read(result.id).input.plan.visual,visual);assert.deepEqual(read(result.id).input.plan.revenueScenario,revenueScenario);
 assert.deepEqual(saveCampaignPlan("m_penn_pour",body,now),result);
 saveCampaignPlan("m_penn_pour",input({decision:"saved",planId:result.id,revision:1,revenueScenario}),now);
 assert.equal(read(result.id).input.plan.visual,undefined);assert.equal(read(result.id).input.plan.revision,2);
 assert.throws(()=>saveCampaignPlan("m_quai_bercy",input({decision:"saved",planId:result.id,revision:2,visual}),now),/not found/);
 assert.equal((db.prepare("SELECT count(*) n FROM sends").get() as {n:number}).n,0);
});
test("invalid campaign assets and invented forecast types never reach persistence",()=>{
 const before=(db.prepare("SELECT count(*) n FROM quick_campaigns").get() as {n:number}).n;
 assert.throws(()=>saveCampaignPlan("m_penn_pour",input({visual:{name:"script.png",dataUrl:"data:image/png;base64,PGh0bWw+"}}),now),/visual/);
 assert.throws(()=>saveCampaignPlan("m_penn_pour",{...input(),revenueScenario:{lowSales:10,highSales:20,basis:"qloo"}},now),/Check your/);
 assert.equal((db.prepare("SELECT count(*) n FROM quick_campaigns").get() as {n:number}).n,before);
});
test("campaign API bounds streamed image payloads before parsing, even without a content-length",async()=>{
 const response=await POST(new Request("http://localhost/api",{method:"POST",headers:{origin:"http://localhost"},body:"x".repeat(3*1024*1024+1)}),{params:Promise.resolve({id:"m_penn_pour"})});
 assert.equal(response.status,413);assert.match((await response.json()).error,/too large/);
});

test("the campaign API saves a real image beyond the former text-only limit with its scenario",async()=>{
 const data=readFileSync("src/app/opengraph-image.png");assert.ok(data.length>12000);
 const start=Date.now()+86400000;
 const visual={name:"turnout.png",dataUrl:`data:image/png;base64,${data.toString("base64")}`};
 const revenueScenario={lowSales:5,highSales:15,basis:"illustrative" as const};
 const body=input({decision:"saved",visual,revenueScenario,startLocal:localStampAt(start,"America/New_York"),endLocal:localStampAt(start+7200000,"America/New_York")});
 const response=await POST(new Request("http://localhost/api",{method:"POST",headers:{origin:"http://localhost","content-type":"application/json"},body:JSON.stringify(body)}),{params:Promise.resolve({id:"m_penn_pour"})});
 assert.equal(response.status,200);const result=await response.json();assert.deepEqual(read(result.id).input.plan.visual,visual);assert.deepEqual(read(result.id).input.plan.revenueScenario,revenueScenario);
});


test("paid local targeting persists as a draft around the owned place and never starts an ad",()=>{
 const localPromotion={platform:"facebook" as const,radiusKm:2};
 const result=saveCampaignPlan("m_penn_pour",input({decision:"saved",localPromotion}),now),plan=read(result.id).input.plan;
 assert.equal(plan.mediaBudgetUsd,25);assert.deepEqual(plan.localPromotion,{...localPromotion,center:{name:"Penn & Pour",lat:40,lon:-74},status:"draft"});
 assert.equal(plan.chargedUsd,0);assert.equal(plan.delivery,"manual");assert.equal((db.prepare("SELECT count(*) n FROM sends").get() as {n:number}).n,0);
 assert.throws(()=>saveCampaignPlan("m_penn_pour",input({channels:["facebook"],mediaBudgetUsd:0,localPromotion}),now),/Remove paid targeting/);
 assert.throws(()=>saveCampaignPlan("m_penn_pour",{...input(),localPromotion:{platform:"facebook",radiusKm:100}},now),/Check your/);
 assert.throws(()=>saveCampaignPlan("m_quai_bercy",input({version:getDna("m_quai_bercy").version,offerId:"o_q12_apero",offerPrice:"24 €",localPromotion}),now),/Enable paid channels/);
});
