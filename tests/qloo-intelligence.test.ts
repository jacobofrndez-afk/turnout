import assert from 'node:assert/strict';
import {test} from 'node:test';
import {selectLocalAudiences,readTrend,trendEffect,comparisonEffect,type MarketingIntelligence} from '../src/lib/qloo-intelligence';
import {marketingIntelligence,type IntelligenceRead} from '../src/server/workspace/marketing-intelligence';
import {proposeImmediateCampaign} from '../src/server/workspace/proposal';
import {intelligenceProposals} from '../src/server/workspace/intelligence-proposals';
import {campaignTimingChoices} from '../src/lib/campaign-timing';
import {assertOfferWindow} from '../src/lib/offer-window';
import {potentialFor,type QlooSnapshot} from '../src/lib/daily-potential';
import type {DnaRecord} from '../src/lib/place-dna';
const now=Date.parse('2030-05-10T12:00Z'),wine='urn:tag:genre:place:restaurant:wine_bar',beer='urn:tag:offerings:place:craft_beer';
const dna:DnaRecord={version:1,status:'demo',source:'Fixture',updatedAt:null,profile:{positioning:'A neighbourhood bar',audience:'Neighbours',voice:'direct',exampleLine:'Good beer. Good company.',goal:'visits',signatureOfferId:'beer',boundaries:'No invented deals',dailyBudgetUsd:25,leadMinutes:20,channels:['facebook','storefront','geofenced_ad']}};
const offers=[{id:'beer',title:'Craft beer flight',description:'Four local beers',price:'$18'},{id:'wine',title:'Natural wine by the glass',description:'Orange wine',price:'$13'}];
const evidence=offers.map(o=>({...o,offerId:o.id,menuTags:[{id:o.id==='wine'?wine:beer,name:o.id}],matchingTastes:[{id:o.id==='wine'?wine:beer,name:o.id}],matchingPlaces:[{id:`ref-${o.id}`,name:`Local ${o.id}`,tags:[o.id]}]}));
const snapshot:QlooSnapshot={tastes:evidence.flatMap(e=>e.matchingTastes),places:evidence.flatMap(e=>e.matchingPlaces.map(p=>({...p,tags:e.menuTags}))),sources:[{kind:'tastes',status:'available',retrievedAt:new Date(now).toISOString(),count:2},{kind:'places',status:'available',retrievedAt:new Date(now).toISOString(),count:2}]};
const source={status:'available' as const,endpoint:'/v2/insights',retrievedAt:new Date(now).toISOString(),detail:'Fixture'};
const audience={id:'WINE-ID',urn:'urn:audience:hobbies_and_interests:wine_enthusiast',name:'Wine Enthusiast',rank:2};
const intel:MarketingIntelligence={audiences:[audience],comparison:{a:{offerId:'beer',title:offers[0].title,places:[{id:'a',name:'Beer reference'}],tags:[{id:beer,name:'Craft beer'}]},b:{offerId:'wine',title:offers[1].title,places:[{id:'b',name:'Wine reference'}],tags:[{id:wine,name:'Wine Bar'}]},shared:[]},trends:[{id:'brand',name:'A cultural reference',status:'stable',points:[{date:'2030-05-01',rank:10},{date:'2030-05-08',rank:10}],latestDate:'2030-05-08',rankChange:0}],sources:{audiences:source,comparison:source,trends:source}};
const context={merchantId:'demo',placeName:'Demo',dna,offers,evidence,timezone:'Europe/Paris',now,moments:[]};
test('only catalog-resolved leisure audiences with actual affinity enter campaigns',()=>{
 const catalog=[{entity_id:'wine-id',id:audience.urn,name:'Wine Enthusiast'},{entity_id:'politics',id:'urn:audience:political_preferences:any',name:'Politics'}];
 assert.deepEqual(selectLocalAudiences(catalog,[{entity_id:'politics',query:{affinity:1}},{entity_id:'WINE-ID',query:{affinity:.9}},{entity_id:'unknown',query:{affinity:1}}]),[{...audience,id:'wine-id'}]);
 assert.deepEqual(selectLocalAudiences(catalog,[{entity_id:'wine-id',query:{}}]),[]);
});
test('trends use dated rank changes; flat, missing, stale, malformed and future series cannot create urgency',()=>{
 const points=[{date:'2030-05-08',population_rank:'100'},{date:'2030-05-01',population_rank:100},{date:'2030-05-09',population_rank:null},{date:'2031-01-01',population_rank:1}];
 assert.equal(readTrend('x','X',points,now).status,'stable');
 assert.equal(readTrend('x','X',[...points,{date:'2030-05-09',population_rank:80}],now).rankChange,20);
 assert.equal(readTrend('x','X',[...points,{date:'2030-05-09',population_rank:120}],now).status,'falling');
 assert.equal(readTrend('x','X',[],now).status,'empty');
 assert.equal(readTrend('x','X',[{date:'2029-01-01',population_rank:10}],now).status,'stale');
 assert.match(trendEffect(intel.trends),/no rise/);
});
test('an audience changes the selected menu offer and copy without inventing products or corrupting DNA',()=>{
 const ideas=intelligenceProposals(context,intel),aud=ideas.find(o=>o.id.endsWith('-now')&&o.intelligence?.audience)!;
 assert.equal(aud.proposal.offerId,'wine');assert.match(aud.proposal.messages.wine,/Natural wine by the glass · \$13/);
 assert.doesNotMatch(aud.proposal.messages.wine,/Good beer/);assert.equal(dna.profile.signatureOfferId,'beer');
 assert.match(aud.intelligence!.change,/instead of your usual Craft beer flight/);
 const ahead=ideas.find(o=>o.id.endsWith('-ahead')&&o.intelligence?.audience)!;
 assert.notEqual(aud.proposal.messages.wine,ahead.proposal.messages.wine);
 assert.ok(ideas.every(o=>!o.id.startsWith('qloo-trend')));
 for(const o of ideas){const slot=o.proposal.slots[0];assertOfferWindow(offers.find(f=>f.id===o.proposal.offerId)!.description,slot.startLocal,slot.endLocal);}
});
test('unsupported audiences, missing evidence and unconfirmed DNA never produce audience-led campaigns',()=>{
 assert.deepEqual(intelligenceProposals({...context,dna:{...dna,status:'suggested'}},intel),[]);
 const empty={...intel,comparison:undefined,audiences:[]};assert.deepEqual(intelligenceProposals(context,empty),[]);
 assert.deepEqual(intelligenceProposals({...context,evidence:[]},{...intel,comparison:undefined}),[]);
});
test('Qloo picks respect horizons and never add points to the potential index',()=>{
 const opportunities=intelligenceProposals(context,intel);
 const input={context:{timezone:context.timezone,now,dna,moments:[],events:[]},snapshot,evidence,opportunities,proposals:{},immediateProposals:{}};
 const chosen=campaignTimingChoices('now',input)[0];assert.ok(chosen.id?.includes('audience'));
 const slot=chosen.proposal.slots[0];assert.equal(chosen.potential?.score,potentialFor(evidence[1],snapshot,input.context,slot.startLocal,slot.endLocal).score);
 assert.ok(campaignTimingChoices('evergreen',input).every(c=>c.id?.endsWith('evergreen')));
});
test('a rising trend needs a verified menu match; no venue partnership or fabricated occasion appears in the message',()=>{
 const trend={...intel.trends[0],status:'rising' as const,rankChange:4};
 assert.ok(!intelligenceProposals(context,{...intel,trends:[trend]}).some(o=>o.signal.category==='trend'));
 const matched={...trend,matchingOffers:[{offerId:'wine',tags:[{id:wine,name:'Wine Bar'}]}]};
 const idea=intelligenceProposals(context,{...intel,trends:[matched]}).find(o=>o.signal.category==='trend')!;
 assert.ok(idea);assert.doesNotMatch(idea.proposal.messages.wine,/A cultural reference|partner|show|trending/i);assert.match(idea.intelligence!.change,/global Qloo/);
 assert.equal(idea.proposal.budgetUsd,dna.profile.dailyBudgetUsd);
});
test('server integration calls the real contracts, compares disjoint references and preserves observed trend dates',async()=>{
 const calls:{path:string;params:Record<string,string>}[]=[];
 const fetcher:IntelligenceRead=async(path,params)=>{calls.push({path,params});let results:any={};
  if(path==='/v2/audiences')results={audiences:[{entity_id:audience.id,id:audience.urn,name:audience.name}]};
  else if(params['filter.type']==='urn:audience')results={entities:[{entity_id:audience.id,query:{affinity:.9}}]};
  else if(params['filter.type']==='urn:entity:brand'&&path==='/v2/insights')results={entities:[{entity_id:'brand',name:'Reference'}]};
  else if(path==='/v2/analysis/compare')results={a:[{tag_id:beer,name:'Craft beer'},{tag_id:'urn:tag:offerings:place:pool',name:'Pool'}],b:[{tag_id:wine,name:'Wine Bar'}]};
  else if(path==='/v2/trending')results={trending:[{date:'2030-05-01',population_rank:40},{date:'2030-05-08',population_rank:40}]};
  return {body:{results},source:{...source,endpoint:path}};
 };
 const data=await marketingIntelligence({merchant:{id:'demo',lat:48,lon:2},snapshot,dna,offers,evidence,now},fetcher);
 assert.equal(data.trends[0].status,'stable');assert.equal(data.trends[0].latestDate,'2030-05-08');
 assert.deepEqual(data.comparison?.a.tags,[{id:beer,name:'Craft beer'}]);
 const cmp=calls.find(c=>c.path==='/v2/analysis/compare')!;assert.notEqual(cmp.params['a.signal.interests.entities'],cmp.params['b.signal.interests.entities']);
 assert.ok(calls.some(c=>c.path==='/v2/trending'&&c.params['signal.interests.entities']==='brand'));
});
test('optional Qloo failures remain explicit and do not prevent baseline campaigns',async()=>{
 const data=await marketingIntelligence({merchant:{id:'demo',lat:48,lon:2},snapshot,dna,offers,evidence,now},async()=>{throw new Error('Unavailable');});
 assert.deepEqual(data.audiences,[]);assert.equal(data.comparison,undefined);assert.equal(data.sources.trends.status,'unavailable');assert.deepEqual(intelligenceProposals(context,data),[]);
});

test('shared comparison tags never become a claimed comparative advantage',()=>{
 const cmp={...intel.comparison!,shared:[...intel.comparison!.a.tags,...intel.comparison!.b.tags]};
 assert.match(comparisonEffect(cmp,'wine'),/no clear comparative edge/);
 assert.equal(readTrend('x','X',[{date:'2030-02-31',population_rank:1}],now).status,'empty');
});

test('unverified overnight service never becomes an immediate audience campaign',()=>{
 const early=Date.parse('2030-05-10T02:00Z');
 assert.equal(proposeImmediateCampaign(dna,offers,'Europe/Paris',early,'wine'),undefined);
 assert.ok(!intelligenceProposals({...context,now:early},intel).some(o=>o.id.endsWith('-now')));
 const explicit=offers.map(o=>o.id==='wine'?{...o,description:'Served 3 to 6 am'}:o);
 assert.ok(proposeImmediateCampaign(dna,explicit,'Europe/Paris',early,'wine'));
});
