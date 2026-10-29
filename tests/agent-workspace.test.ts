import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import {mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {getDb} from '../src/server/db/client';
import {getDna} from '../src/server/merchants/dna';
import {getEvent} from '../src/server/qloo/crowd';
import {campaignWindows} from '../src/server/agent/prompt';
import {getCampaign,getDraft,draftWithClaude,draftReviewedWithClaude} from '../src/server/agent/run';
import {agentWorkspace,assertAgentEvent,saveAgentReview} from '../src/server/agent/review';
import {CampaignDraftSchema,generatedCopyIssues} from '../src/server/agent/schema';
import {POST as approve} from '../src/app/api/campaigns/[id]/approve/route';
import {POST as prepare} from '../src/app/api/campaigns/prepare/route';
import {localStampAt} from '../src/lib/campaign-plan';
import {deliverySummary} from '../src/lib/delivery';
import {receiptLabel} from '../src/lib/agent-workspace';
import {withGenerationBudget} from '../src/server/agent/budget';
import {crowdChannelAffinity} from '../src/server/workspace/channel-affinity';

mkdirSync('.tmp',{recursive:true});
const temp=mkdtempSync(resolve('.tmp/agent-workspace-'));
process.env.DATABASE_PATH=resolve(temp,'test.db');process.env.AGENT_INBOX=temp;
process.env.AGENT_PROVIDER='operator';
for(const key of ['ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_FROM','DEMO_WHATSAPP_TO','SNAP_ACCESS_TOKEN','SNAP_AD_ACCOUNT_ID'])process.env[key]='';
const db=getDb(),now=Date.now(),starts=now+24*3600000;
db.prepare('INSERT INTO merchants(id,name,kind,lat,lon,city,timezone,radius_m,channels_json) VALUES(?,?,?,?,?,?,?,?,?)').run('test_agent','Test place','bar',40.75,-73.99,'New York','UTC',1500,'["storefront","whatsapp"]');
db.prepare('INSERT INTO offers(id,merchant_id,title,description,price,tag_names_json,tag_urns_json) VALUES(?,?,?,?,?,?,?)').run('test_offer','test_agent','A shared board','A board for two','$20','["Food"]','["urn:tag:food"]');
const dna=getDna('test_agent');dna.profile.channels=['storefront','whatsapp','geofenced_ad'];dna.profile.dailyBudgetUsd=25;dna.profile.leadMinutes=15;
db.prepare("INSERT INTO merchant_dna(merchant_id,profile_json,version,status,source) VALUES(?,?,1,'confirmed','Test fixture')").run('test_agent',JSON.stringify(dna.profile));
const meta=JSON.stringify({sourceCheck:{source:'Ticketmaster',checkedAt:new Date(now).toISOString(),mode:'live'}});
db.prepare('INSERT INTO events(id,name,venue_name,lat,lon,starts_at,timezone,segment,meta_json,status) VALUES(?,?,?,?,?,?,?,?,?,?)').run('test_event','Fixture concert','Fixture venue',40.751,-73.99,new Date(starts).toISOString(),'UTC','Music',meta,'onsale');
const event=getEvent('test_event')!,window=campaignWindows(event)[0];
const draft=CampaignDraftSchema.parse({language:'en',chosen_offer_id:'test_offer',audience_summary:'Fixture group tastes.',rationale:'The fixture evidence favours the board over the other offer.',windows:[{label:window.label,start_local:localStampAt(window.start,'UTC').slice(11),end_local:localStampAt(window.end,'UTC').slice(11),why:'Before the event.'}],geofenced_ad:{platform:'meta',radius_m:1000,interests:['Food','Music'],headline:'A shared board',body:'Join us before the event.',cta:'Visit',daily_budget_usd:15},google_post:{title:'A shared board',body:'Meet here before the event.',offer_terms:'$20 for two.'},whatsapp:{message:'Meet here before the event.'},storefront:{chalkboard:'A shared board · $20',staff_line:'Welcome.'},dooh:{headline:'A shared board',body:'Nearby.'},confidence:.99,limitations:'Test fixture. No attendance or visits measured.'});
function insert(id:string){
 const evidence={offers:[{id:'test_offer',price:'$20'}],profile:{headlinerName:'Fixture artist',tags:[{name:'Food'}],offerFits:[{offerId:'test_offer',title:'A shared board',matches:2,topPlaces:['Fixture reference']}],qlooCalls:{live:4,cached:2}}};
 db.prepare("INSERT INTO campaigns(id,merchant_id,event_id,status,copy_json,dna_version,dna_snapshot_json,channels_json,evidence_json,llm_usage_json) VALUES(?,?,?,'drafted',?,1,?,?,?,?)").run(id,'test_agent','test_event',JSON.stringify(draft),JSON.stringify({...dna,version:1,status:'confirmed'}),'["storefront","whatsapp"]',JSON.stringify(evidence),'{"source":"anthropic"}');
 return {...agentWorkspace(id,now)!.review,channels:['storefront','whatsapp'] as ('storefront'|'whatsapp')[],mediaBudgetUsd:0};
}
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});

test('review saves owner edits and rejects a stale tab without overwriting',()=>{
 const review=insert('edit');saveAgentReview('edit',{...review,message:'My own invitation.',chalkboard:'My board.'},false,now);
 assert.equal(getDraft(getCampaign('edit')!)?.google_post.body,'My own invitation.');
 assert.equal(agentWorkspace('edit',now)?.review.revision,1);
 assert.throws(()=>saveAgentReview('edit',{...review,message:'Stale edit.'},false,now),/another tab/);
 assert.equal(getDraft(getCampaign('edit')!)?.google_post.body,'My own invitation.');
});
test('double approval creates one receipt set and uses the edited channel messages',async()=>{
 const review={...insert('approve'),whatsapp:'The approved personal invitation.',chalkboard:'The approved board.'};
 const req=()=>new Request('http://localhost/api/campaigns/approve/approve',{method:'POST',headers:{'Content-Type':'application/json','Origin':'http://localhost'},body:JSON.stringify({review,sendDemo:false})});
 const responses=await Promise.all([approve(req(),{params:Promise.resolve({id:'approve'})}),approve(req(),{params:Promise.resolve({id:'approve'})})]);
 assert.deepEqual(responses.map(r=>r.status),[200,200]);
 const rows=db.prepare('SELECT channel,payload_json,simulated FROM sends WHERE campaign_id=?').all('approve') as any[];
 assert.equal(rows.length,2);assert.ok(rows.every(r=>r.simulated===1));
 assert.equal(JSON.parse(rows.find(r=>r.channel==='whatsapp').payload_json).message,review.whatsapp);
 assert.equal(JSON.parse(rows.find(r=>r.channel==='storefront').payload_json).chalkboard,review.chalkboard);
 assert.equal(getCampaign('approve')?.status,'prepared');
});
test('changed DNA, menu prices, out-of-window timing and excessive budgets cannot be approved',()=>{
 const review=insert('constraints');
 assert.throws(()=>saveAgentReview('constraints',{...review,channels:['geofenced_ad'],mediaBudgetUsd:26},true,now),/budget/);
 assert.throws(()=>saveAgentReview('constraints',{...review,startLocal:localStampAt(starts+6*3600000,'UTC'),endLocal:localStampAt(starts+8*3600000,'UTC')},true,now),/suggested event window/);
 db.prepare("UPDATE offers SET price='$25' WHERE id='test_offer'").run();
 assert.throws(()=>saveAgentReview('constraints',review,true,now),/price changed/);
 db.prepare("UPDATE offers SET price='$20' WHERE id='test_offer'").run();
 db.prepare("UPDATE merchant_dna SET version=2 WHERE merchant_id='test_agent'").run();
 assert.throws(()=>saveAgentReview('constraints',review,true,now),/DNA changed/);
 db.prepare("UPDATE merchant_dna SET version=1 WHERE merchant_id='test_agent'").run();
 assert.equal(getCampaign('constraints')?.status,'drafted');
});
test('a stale or distant event cannot enter the live campaign path',()=>{
 assert.throws(()=>assertAgentEvent('test_agent',{...event,meta_json:'{}'},now),/verify this event/);
 assert.throws(()=>assertAgentEvent('test_agent',{...event,lat:48.85,lon:2.35},now),/outside/);
});
test('potential is an evidence index, not the model confidence',()=>{
 const review=insert('potential');const first=agentWorkspace('potential',now)!.potential.score;
 db.prepare('UPDATE campaigns SET copy_json=? WHERE id=?').run(JSON.stringify({...draft,confidence:.01}),'potential');
 assert.equal(agentWorkspace('potential',now)!.potential.score,first);
 assert.notEqual(first,99);
});
test('receipt labels distinguish accepted, sent, delivered and manual output',()=>{
 const receipt={channel:'whatsapp',simulated:0,status:'queued'};
 assert.match(receiptLabel(receipt),/awaiting delivery/);
 assert.equal(deliverySummary([receipt]).sent,0);
 assert.equal(deliverySummary([receipt]).pending,1);
 assert.match(receiptLabel({...receipt,status:'sent'}),/not confirmed/);
 assert.equal(deliverySummary([{...receipt,status:'delivered'}]).delivered,1);
 assert.equal(deliverySummary([{...receipt,status:'undelivered'}]).failed,1);
 assert.equal(receiptLabel({...receipt,simulated:1,status:'sent'}),'Prepared · not sent');
});
test('cross-origin approval and any request to send the demo are rejected before saving',async()=>{
 const review=insert('rejected');
 const foreign=await approve(new Request('http://localhost/api/campaigns/rejected/approve',{method:'POST',headers:{Origin:'https://unrelated.example'}}),{params:Promise.resolve({id:'rejected'})});
 assert.equal(foreign.status,403);
 process.env.TWILIO_ACCOUNT_SID='AC'+'0'.repeat(32);process.env.TWILIO_AUTH_TOKEN='test-token';process.env.DEMO_WHATSAPP_TO='whatsapp:+15005550006';
 const disconnected=await approve(new Request('http://localhost/api/campaigns/rejected/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({review,sendDemo:true})}),{params:Promise.resolve({id:'rejected'})});
 assert.equal(disconnected.status,409);assert.match((await disconnected.json()).error,/prepared, not sent/);assert.equal(getCampaign('rejected')?.status,'drafted');
 const saved=await approve(new Request('http://localhost/api/campaigns/rejected/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({review})}),{params:Promise.resolve({id:'rejected'})});
 assert.equal(saved.status,200);const receipts=(await saved.json()).workspace.receipts;assert.ok(receipts.every((r:any)=>r.simulated===1&&!r.providerId));
 for(const key of ['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','DEMO_WHATSAPP_TO'])process.env[key]='';
});
test('prepare endpoint clearly reports a missing writer instead of fabricating an agent response',async()=>{
 const response=await prepare(new Request('http://localhost/api/campaigns/prepare',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({merchant:'test_agent',event:'test_event'})}));
 assert.equal(response.status,503);assert.match((await response.json()).error,/not connected/);
});
test('event channel comparison uses resolved performer IDs and exact platform results',async()=>{
 const calls:{path:string;params:Record<string,string>}[]=[];
 const profile=await crowdChannelAffinity({entities:[{id:'performer-id',name:'Fixture artist'}],tags:[]},'Fixture artist',async(path,params)=>{
  calls.push({path,params});
  return {body:path==='/search'?{results:[{entity_id:params.query,name:params.query,subtype:'urn:entity:brand'}]}:{results:{entities:[{entity_id:'Instagram',query:{affinity:.8}},{entity_id:'Facebook',query:{affinity:.6}}]}},source:{status:'available',endpoint:path,retrievedAt:new Date(now).toISOString(),detail:'Test fixture'}};
 });
 const insight=calls.find(c=>c.path==='/v2/insights')!;
 assert.equal(insight.params['signal.interests.entities'],'performer-id');
 assert.equal(insight.params['signal.location'],undefined);
 assert.equal(profile.rankings[0].channel,'instagram');assert.equal(profile.basis,'crowd');
});
test('existing Claude writer is callable with a structured provider response and a persistent budget guard',async()=>{
 const originalFetch=globalThis.fetch;let called=0;process.env.ANTHROPIC_API_KEY='test-key';process.env.AGENT_DAILY_LIMIT='1';
 globalThis.fetch=async(_input,init)=>{
  called++;const body=JSON.parse(String(init?.body));assert.match(body.messages[0].content,/Fixture prompt/);assert.ok(body.output_config.format);
  return new Response(JSON.stringify({id:'msg_test',type:'message',role:'assistant',model:'claude-opus-5-5',content:[{type:'text',text:JSON.stringify(draft)}],stop_reason:'end_turn',stop_sequence:null,usage:{input_tokens:20,output_tokens:20}}),{headers:{'Content-Type':'application/json'}});
 };
 try{
  const generated=await draftWithClaude('Fixture prompt with Qloo evidence.');assert.equal(generated.draft.chosen_offer_id,'test_offer');assert.equal(called,1);
  await assert.rejects(withGenerationBudget(async()=>true),/daily generation limit/);
 }finally{globalThis.fetch=originalFetch;process.env.ANTHROPIC_API_KEY='';delete process.env.AGENT_DAILY_LIMIT;}
});

 test('writer guard rejects unsupported availability and internal notes in customer copy',()=>{
  assert.equal(generatedCopyIssues(draft).length,0);
  assert.equal(generatedCopyIssues({...draft,google_post:{...draft.google_post,body:'Tables are available for you.'}}).length,1);
  assert.equal(generatedCopyIssues({...draft,geofenced_ad:{...draft.geofenced_ad,body:'Ads not selected, zero budget.'}}).length,1);
 });

 test('the existing writer repairs one invalid structured response without an unbounded retry',async()=>{
  const originalFetch=globalThis.fetch;let calls=0;process.env.ANTHROPIC_API_KEY='test-key';process.env.AGENT_DAILY_LIMIT='3';
  globalThis.fetch=async()=>{
   calls++;const copy=calls===1?{...draft,dooh:{...draft.dooh,headline:'A headline that is deliberately longer than the channel allows'}}:draft;
   return new Response(JSON.stringify({id:'msg_repair',type:'message',role:'assistant',model:'claude-opus-5-5',content:[{type:'text',text:JSON.stringify(copy)}],stop_reason:'end_turn',stop_sequence:null,usage:{input_tokens:20,output_tokens:20}}),{headers:{'Content-Type':'application/json'}});
  };
  try{const result=await draftReviewedWithClaude('Fixture prompt');assert.equal(calls,2);assert.equal(result.draft.dooh.headline,draft.dooh.headline);await assert.rejects(withGenerationBudget(async()=>true),/daily generation limit/);}
  finally{globalThis.fetch=originalFetch;process.env.ANTHROPIC_API_KEY='';delete process.env.AGENT_DAILY_LIMIT;}
 });

test('locality evidence survives owner edits and is included in the campaign workspace',()=>{
 const review=insert('locality-proof');
 const raw=db.prepare('SELECT evidence_json FROM campaigns WHERE id=?').get('locality-proof') as {evidence_json:string};
 const evidence=JSON.parse(raw.evidence_json);
 evidence.profile.locality={status:'available',radiusM:2500,candidateCount:6,comparableCount:4,offers:[],excludedOffers:[],outcome:'unchanged',eventLeaders:['test_offer'],localLeaders:['test_offer']};
 db.prepare('UPDATE campaigns SET evidence_json=? WHERE id=?').run(JSON.stringify(evidence),'locality-proof');
 saveAgentReview('locality-proof',{...review,message:'My local invitation.'},false,now);
 assert.deepEqual(agentWorkspace('locality-proof',now)?.proof.locality,evidence.profile.locality);
});

test('Qloo shortlist requests use the same filter and candidates with a separate local signal',async()=>{
 const {rankShortlist}=await import('../src/server/qloo/api');
 const old=globalThis.fetch,oldKey=process.env.QLOO_API_KEY;const urls:URL[]=[];process.env.QLOO_API_KEY='fixture-key';
 globalThis.fetch=async input=>{urls.push(new URL(String(input)));return new Response(JSON.stringify({results:{entities:[]}}),{status:200});};
 try{
  const opts={area:{lat:40.75,lon:-73.99,radiusM:2500}},signal={entities:['fixture-artist'],tags:['urn:tag:fixture']};
  await rankShortlist('place',['locality-a','locality-b'],signal,opts);
  await rankShortlist('place',['locality-a','locality-b'],signal,{...opts,localize:true});
  assert.equal(urls.length,2);
  for(const url of urls){assert.equal(url.searchParams.get('filter.results.entities'),'locality-a,locality-b');assert.equal(url.searchParams.get('filter.location'),'POINT(-73.99 40.75)');assert.equal(url.searchParams.get('filter.location.radius'),'2500');assert.equal(url.searchParams.get('signal.interests.entities'),'fixture-artist');assert.equal(url.searchParams.get('signal.interests.tags'),'urn:tag:fixture');}
  assert.equal(urls[0].searchParams.get('signal.location'),null);assert.equal(urls[1].searchParams.get('signal.location'),'POINT(-73.99 40.75)');assert.equal(urls[1].searchParams.get('signal.location.radius'),'2500');
 }finally{globalThis.fetch=old;if(oldKey===undefined)delete process.env.QLOO_API_KEY;else process.env.QLOO_API_KEY=oldKey;}
});

test('new engine versions do not replace an owner-reviewed campaign during ordinary preparation',async()=>{
 const review=insert('owner-kept');saveAgentReview('owner-kept',{...review,message:'Keep my wording.'},false,now);
 const {createCampaign}=await import('../src/server/agent/run');const {getMerchant}=await import('../src/server/events/radar');
 const oldProvider=process.env.AGENT_PROVIDER,oldFetch=globalThis.fetch;process.env.AGENT_PROVIDER='anthropic';
 globalThis.fetch=async()=>{throw new Error('Reviewed campaigns must not trigger generation.');};
 try{const result=await createCampaign(getMerchant('test_agent')!,getEvent('test_event')!);assert.equal(result.id,'owner-kept');assert.equal(getDraft(result)?.google_post.body,'Keep my wording.');}
 finally{globalThis.fetch=oldFetch;process.env.AGENT_PROVIDER=oldProvider;}
});
