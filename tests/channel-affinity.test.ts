import assert from 'node:assert/strict';
import {test} from 'node:test';
import {QLOO_CHANNELS,parseChannelAffinities,selectChannelAffinity,type ChannelAffinityProfile,type AffinityChannel} from '../src/lib/channel-affinity';
import {campaignChannelAffinities,type ChannelAffinityRead} from '../src/server/workspace/channel-affinity';
import {recommendCampaignChannels,type ChannelContext} from '../src/lib/channel-recommendation';
import {recommendDistribution} from '../src/lib/distribution-recommendation';
const now=Date.parse('2030-05-10T12:00Z');
const source={status:'available' as const,retrievedAt:new Date(now).toISOString(),endpoint:'/v2/insights',detail:'Test fixture'};
const base:ChannelContext={dna:{positioning:'A neighbourhood bar',audience:'Neighbours',voice:'warm',exampleLine:'Good company.',goal:'visits',signatureOfferId:'wine',boundaries:'No invented discounts',dailyBudgetUsd:25,leadMinutes:20,channels:['storefront','geofenced_ad']},offer:{id:'wine',title:'Natural wine by the glass',description:'A new pour',price:'$13'},startLocal:'2030-05-13T17:00',timezone:'Europe/Paris',now};
const profile=(order:AffinityChannel[],contextLabel='Wine Enthusiast'):ChannelAffinityProfile=>({basis:'audience',contextLabel,inputs:[{id:'audience',name:contextLabel}],source,rankings:order.map((channel,i)=>({channel,entityId:channel,name:QLOO_CHANNELS.find(c=>c.channel===channel)!.name,rank:i+1,affinity:.95-i*.05}))});
const wine=profile(['snapchat','facebook','whatsapp','instagram','google_post','tiktok']);
const music=profile(['instagram','tiktok','facebook','snapchat','google_post','whatsapp'],'Music Festivals');
const lead=(p:ChannelContext)=>recommendCampaignChannels(p).find(c=>c.recommended)!;
test('real platform affinities change a campaign channel; a higher ineligible channel is explained',()=>{
 assert.equal(lead(base).channel,'facebook');
 const winePlan=lead({...base,channelAffinity:wine}),musicPlan=lead({...base,channelAffinity:music});
 assert.equal(winePlan.channel,'facebook');assert.equal(winePlan.qloo?.rank,2);
 assert.equal(musicPlan.channel,'instagram');assert.equal(musicPlan.qloo?.rank,1);
 const snap=recommendCampaignChannels({...base,channelAffinity:wine}).find(c=>c.channel==='snapchat')!;
 assert.equal(snap.qloo?.rank,1);assert.equal(snap.eligible,false);assert.match(snap.constraint!,/not a usual channel/);
});
test('affinities do not bypass alcohol, preparation or opted-in customer requirements',()=>{
 for(const channel of ['google_post','tiktok','whatsapp','snapchat'] as const){
  const p=profile([channel,'facebook','instagram']);
  assert.notEqual(lead({...base,channelAffinity:p}).channel,channel);
 }
 const dna={...base.dna,channels:['tiktok' as const]};
 assert.notEqual(lead({...base,dna,startLocal:'2030-05-10T17:00',hasVisual:true,channelAffinity:profile(['tiktok','instagram'])}).channel,'tiktok');
 assert.equal(lead({...base,dna,hasVisual:true,channelAffinity:profile(['tiktok','instagram'])}).channel,'tiktok');
});
test('Qloo selects the paid placement but never raises the bounded test cap',()=>{
 const a=recommendDistribution({...base,channelAffinity:wine}),b=recommendDistribution({...base,channelAffinity:music});
 assert.equal(a.promotion.platform,'facebook');assert.equal(b.promotion.platform,'instagram');
 assert.equal(a.budgetUsd,25);assert.equal(b.budgetUsd,a.budgetUsd);assert.equal(a.promotion.radiusKm,b.promotion.radiusKm);
 assert.equal(recommendDistribution({...base,channelAffinity:music,dna:{...base.dna,dailyBudgetUsd:12}}).budgetUsd,12);
 const immediate=recommendDistribution({...base,startLocal:'2030-05-10T15:00',channelAffinity:music});
 assert.ok(!immediate.channels.includes('geofenced_ad'));assert.equal(immediate.budgetUsd,15);
});
test('missing, unscored, stale and single-platform data cannot influence rankings',()=>{
 for(const p of [{...music,source:{...source,status:'unavailable' as const}},{...music,source:{...source,retrievedAt:'2030-05-01T00:00Z'}},{...music,source:{...source,retrievedAt:'2030-06-01T00:00Z'}},{...music,rankings:music.rankings.slice(0,1)}]){
  const c=lead({...base,channelAffinity:p});assert.equal(c.channel,lead(base).channel);assert.equal(c.qloo,undefined);
 }
 const resolved=[{channel:'instagram' as const,id:'ig',name:'Instagram'},{channel:'facebook' as const,id:'fb',name:'Facebook'}];
 assert.deepEqual(parseChannelAffinities([{entity_id:'ig',popularity:.9},{entity_id:'fb',query:{affinity:'0.9'}},{entity_id:'unknown',query:{affinity:1}},{entity_id:'ig',query:{affinity:NaN}}],resolved),[]);
 const ties=parseChannelAffinities([{entity_id:'IG',query:{affinity:.8}},{entity_id:'ig',query:{affinity:.1}},{entity_id:'fb',query:{affinity:.8}}],resolved);
 assert.equal(ties.length,2);assert.ok(ties.every(c=>c.rank===1));
});
test('audience campaigns keep their audience; general campaigns use the selected offer references',()=>{
 const refs={...music,basis:'references' as const};const profiles={audiences:{wine},offers:{wine:refs}};
 assert.equal(selectChannelAffinity(profiles,'wine','wine'),wine);assert.equal(selectChannelAffinity(profiles,'wine'),refs);
 assert.equal(selectChannelAffinity(profiles,'other'),undefined);assert.equal(selectChannelAffinity(profiles,'wine','missing'),undefined);
});
test('server resolves exact brand entities and constrains insights to six channels with real inputs',async()=>{
 const calls:{path:string;params:Record<string,string>}[]=[];
 const fetcher:ChannelAffinityRead=async(path,params)=>{
  calls.push({path,params});
  if(path==='/search')return {body:{results:[{entity_id:`id-${params.query}`,name:params.query,types:['urn:entity:brand']},{entity_id:'unrelated',name:'Different brand',types:['urn:entity:brand']}]},source};
  return {body:{results:{entities:[{entity_id:'id-Instagram',query:{affinity:.8}},{entity_id:'id-Facebook',query:{affinity:.7}},{entity_id:'unrelated',query:{affinity:1}}]}},source};
 };
 const audience={id:'wine',urn:'urn:audience:hobbies_and_interests:wine_enthusiast',name:'Wine Enthusiast',rank:9};
 const offer={offerId:'wine',title:'Wine',price:'$13',menuTags:[],matchingTastes:[],matchingPlaces:[{id:'actual-place-id',name:'Actual place',tags:['Wine']}]};
 const data=await campaignChannelAffinities([audience],[offer],fetcher);
 assert.equal(data.audiences.wine.rankings.length,2);assert.equal(data.offers.wine.rankings[0].channel,'instagram');
 const queries=calls.filter(c=>c.path==='/v2/insights');assert.equal(queries.length,2);
 assert.ok(queries.every(c=>c.params['filter.type']==='urn:entity:brand'&&c.params['filter.results.entities'].split(',').length===6));
 assert.equal(queries[0].params['signal.demographics.audiences'],audience.urn);
 assert.equal(queries[1].params['signal.interests.entities'],'actual-place-id');
 assert.match(data.offers.wine.source.detail,/not platform usage/);
});
test('failed platform reads degrade gracefully without invented data',async()=>{
 const data=await campaignChannelAffinities([{id:'a',urn:'a',name:'A',rank:1}],[],async()=>{throw new Error('offline');});
 assert.equal(data.audiences.a.source.status,'unavailable');assert.deepEqual(data.audiences.a.rankings,[]);
});
