import assert from 'node:assert/strict';
import {test} from 'node:test';
import {compareLocalityOffers,localitySummary,type LocalityOffer,type LocalityResult} from '../src/lib/locality-comparison';
import {compareOfferLocality} from '../src/server/qloo/locality';

const offers:LocalityOffer[]=[
 {offerId:'wine',title:'Wine & board',references:[{id:'a',name:'Wine one'},{id:'b',name:'Wine two'}]},
 {offerId:'beer',title:'Craft beer',references:[{id:'c',name:'Beer one'},{id:'d',name:'Beer two'}]},
];
const rows=(ids:string[]):LocalityResult[]=>ids.map((id,i)=>({entity_id:id,name:id,query:{affinity:1-i/10}}));
const before=rows(['a','b','c','d']),after=rows(['c','d','a','b']);
test('local context changes the leading offer using the same scored reference set',()=>{
 const result=compareLocalityOffers(offers,before,after,2500);
 assert.equal(result.status,'available');assert.equal(result.outcome,'changed');
 assert.deepEqual(result.eventLeaders,['wine']);assert.deepEqual(result.localLeaders,['beer']);
 assert.equal(result.offers[0].eventRank,2);assert.equal(result.offers[0].localRank,1);
 assert.match(localitySummary(result),/Wine & board to Craft beer/);
});
test('a raw score increase is not a decision change when the order is unchanged',()=>{
 const result=compareLocalityOffers(offers,before,before.map(r=>({...r,query:{affinity:r.query!.affinity!*100}})),1500);
 assert.equal(result.outcome,'unchanged');assert.match(localitySummary(result),/keeps Wine & board/);
 assert.equal(result.radiusM,1500);
});
test('missing local references never become rank zero or evidence of poor fit',()=>{
 const result=compareLocalityOffers(offers,before,rows(['a','c','d']),2500);
 assert.equal(result.status,'insufficient');assert.equal(result.offers.length,0);
 assert.deepEqual(result.excludedOffers,['Wine & board']);assert.equal(result.comparableCount,3);
 assert.match(localitySummary(result),/original event analysis/);
});
test('unrelated and unscored entities are excluded, shared references are compared identically',()=>{
 const withExtra=[{...offers[0],references:[...offers[0].references,{id:'missing',name:'Missing'}]},offers[1]];
 const result=compareLocalityOffers(withExtra,[...rows(['x','a','b','c','d']),{entity_id:'missing',name:'Missing'}],after,2500);
 assert.equal(result.candidateCount,5);assert.equal(result.comparableCount,4);assert.equal(result.status,'available');
 assert.ok(result.offers.every(o=>o.references.length===2));assert.equal(result.offers.find(o=>o.offerId==='wine')?.eventRank,1);
});
test('equal affinities produce tied offers, not an invented winner',()=>{
 const result=compareLocalityOffers(offers,before,after.map(r=>({...r,query:{affinity:.9}})),2500);
 assert.equal(result.outcome,'tied');assert.equal(result.localLeaders.length,2);
 assert.match(localitySummary(result),/does not produce a unique winner/);
});
test('comparison preserves the candidate pool and area, adding only locality to the second call',async()=>{
 const calls:any[]=[];const signal={entities:['artist-id'],tags:['urn:tag:music']};const area={lat:40.75,lon:-73.99,radiusM:2500};
 const result=await compareOfferLocality(offers,signal,area,undefined,async(type,ids,inputs,opts)=>{
  calls.push({type,ids,inputs,opts});return opts?.localize?after:before;
 });
 assert.equal(result.outcome,'changed');assert.equal(calls.length,2);
 assert.deepEqual(calls[0].ids,calls[1].ids);assert.deepEqual(calls[0].inputs,signal);
 assert.deepEqual(calls[0].opts.area,calls[1].opts.area);assert.equal(calls[0].opts.localize,undefined);assert.equal(calls[1].opts.localize,true);
});
test('an unsupported or failing combined request falls back without blocking the campaign',async()=>{
 let calls=0;
 const result=await compareOfferLocality(offers,{entities:['artist-id']},{lat:1,lon:2,radiusM:2500},undefined,async()=>{if(calls++)throw new Error('HTTP 400');return before;});
 assert.equal(result.status,'unavailable');assert.equal(result.offers.length,0);assert.match(localitySummary(result),/original event analysis/);
});
