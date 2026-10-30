import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { eventCampaignPotential } from '../src/lib/event-potential';
import { eventPotentialKey, potentialFromProfile, potentialOfferWindow, savedEventPotential } from '../src/server/workspace/event-potential';
import { cacheSet, getDb } from '../src/server/db/client';
import { getDna } from '../src/server/merchants/dna';
import { getEvent, getOffers, type CrowdProfile, type OfferFit } from '../src/server/qloo/crowd';
import { getMerchant } from '../src/server/events/radar';
import { POST } from '../src/app/api/events/potential/route';

mkdirSync('.tmp',{recursive:true});
const temp=mkdtempSync(resolve('.tmp/event-potential-'));
process.env.DATABASE_PATH=resolve(temp,'test.db');
const db=getDb(), now=Date.now(), start=new Date(now+86400000); start.setUTCHours(20,0,0,0);
db.prepare('INSERT INTO merchants(id,name,kind,lat,lon,city,timezone,radius_m) VALUES(?,?,?,?,?,?,?,?)').run('potential_place','Test place','bar',40.75,-73.99,'New York','UTC',1500);
db.prepare('INSERT INTO offers(id,merchant_id,title,description,price,tag_names_json,tag_urns_json) VALUES(?,?,?,?,?,?,?)').run('potential_offer','potential_place','A shared board','A board for two','$20','["Food"]','["urn:tag:food"]');
const initial=getDna('potential_place');
db.prepare("INSERT INTO merchant_dna(merchant_id,profile_json,version,status,source) VALUES(?,?,1,'confirmed','Test')").run('potential_place',JSON.stringify({...initial.profile,leadMinutes:15,signatureOfferId:'potential_offer'}));
db.prepare('INSERT INTO events(id,name,venue_name,lat,lon,starts_at,timezone,segment,meta_json,status) VALUES(?,?,?,?,?,?,?,?,?,?)').run('potential_event','Test concert','Test venue',40.751,-73.99,start.toISOString(),'UTC','Music',JSON.stringify({sourceCheck:{source:'Ticketmaster',checkedAt:new Date(now).toISOString(),mode:'live'}}),'onsale');
const merchant=getMerchant('potential_place')!, event=getEvent('potential_event')!, dna=getDna(merchant.id), offers=getOffers(merchant.id);
const fit:OfferFit={offerId:offers[0].id,title:offers[0].title,tagUrns:['urn:tag:food'],tagNames:['Food'],affinity:.7,matches:2,topPlaces:['Reference one','Reference two']};
const profile:CrowdProfile={id:'test_profile',eventId:event.id,headlinerName:'Test artist',status:'auto',candidates:[],tags:[],places:[],brands:[],offerFits:[fit],provenance:[],qlooCalls:{live:2,cached:1},origin:'ticketmaster',signal:{entities:[{id:'artist',name:'Test artist',type:'artist'}],tags:[]}};
const analysis={profile,checkedAt:new Date(now).toISOString()};
after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});

test('potential requires Qloo evidence and a usable nearby campaign window, not model confidence',()=>{
  const input={matches:2,references:2,signature:true,start:now+3600000,end:now+7200000,now,insideArea:true};
  assert.equal(eventCampaignPotential(input).score,90);
  assert.equal(eventCampaignPotential({...input,matches:0}).score,null);
  assert.equal(eventCampaignPotential({...input,insideArea:false}).score,null);
  assert.equal(eventCampaignPotential({...input,end:input.start+20*60000}).score,null);
  assert.equal(eventCampaignPotential({...input,now:input.end+1}).score,null);
});
test('calendar offer matching skips stronger Qloo matches with incompatible service hours',()=>{
  const early={...offers[0],id:'early',title:'Morning coffee',description:'8 to 10 am'};
  const result=potentialFromProfile(merchant,event,dna,[early,...offers],{...analysis,profile:{...profile,offerFits:[{...fit,offerId:'early',affinity:.99},fit]}},now);
  assert.equal(result.offer?.id,offers[0].id);
  assert.equal(result.score,90);
  assert.match(result.reason,/Reference one and Reference two/);
  assert.equal(result.window?.startLocal.slice(11),'17:30');
  assert.equal(potentialOfferWindow(early,event,'UTC',15,now),undefined);
});
test('explicit happy hour ends on time and game screenings are not inferred from a concert',()=>{
  const happy={...offers[0],title:'Two cocktails',description:'5 to 7 pm'};
  const window=potentialOfferWindow(happy,event,'UTC',15,now)!;
  assert.equal(new Date(window.end).getUTCHours(),19);
  assert.equal(potentialOfferWindow({...happy,title:'Game night big screen',description:'Watch the game'},event,'UTC',15,now),undefined);
  assert.equal(potentialOfferWindow(happy,event,'UTC',15,window.end-30*60000),undefined);
});
test('missing matches have no numeric score, rather than a fabricated zero',()=>{
  const result=potentialFromProfile(merchant,event,dna,offers,{...analysis,profile:{...profile,offerFits:[]}},now);
  assert.equal(result.score,null);assert.equal(result.offer,undefined);
  assert.match(result.reason,/Not enough Qloo evidence/);
});
test('calendar caches are isolated by place, DNA, menu, area and event schedule',()=>{
  const key=eventPotentialKey(merchant,event,dna,offers);
  cacheSet('calendar-qloo-potential-v1',key,analysis,3600);
  assert.equal(savedEventPotential(merchant,event,now)?.score,90);
  for(const changed of [
    eventPotentialKey({...merchant,id:'other'},event,dna,offers),
    eventPotentialKey({...merchant,radius_m:2000},event,dna,offers),
    eventPotentialKey(merchant,event,{...dna,version:2},offers),
    eventPotentialKey(merchant,event,dna,[{...offers[0],price:'$25'}]),
    eventPotentialKey(merchant,{...event,starts_at:new Date(start.getTime()+3600000).toISOString()},dna,offers),
  ])assert.notDeepEqual(changed,key);
  db.prepare("UPDATE offers SET price='$25' WHERE id='potential_offer'").run();
  assert.equal(savedEventPotential(merchant,event,now),undefined);
  db.prepare("UPDATE offers SET price='$20' WHERE id='potential_offer'").run();
});
test('checking an assessed event returns evidence without creating a campaign; foreign requests are refused',async()=>{
  const foreign=await POST(new Request('http://localhost/api/events/potential',{method:'POST',headers:{Origin:'https://unrelated.example'}}));
  assert.equal(foreign.status,403);
  const response=await POST(new Request('http://localhost/api/events/potential',{method:'POST',headers:{Origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({merchant:merchant.id,event:event.id})}));
  assert.equal(response.status,200);assert.equal((await response.json()).potential.score,90);
  assert.equal((db.prepare('SELECT COUNT(*) AS n FROM campaigns').get() as {n:number}).n,0);
});
