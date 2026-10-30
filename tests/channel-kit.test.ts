import assert from 'node:assert/strict';
import {test} from 'node:test';
import {AgentReviewSchema} from '../src/lib/agent-workspace';
import {campaignSpend,channelCreative,channelMaterial,channelStarter,spendIssues,withChannelCaps} from '../src/lib/channel-kit';
const review=AgentReviewSchema.parse({revision:0,title:'A local pause',message:'A board for two before the show.',terms:'$20 for two.',whatsapp:'Hello again. Join us for a board.',chalkboard:'A board for two · $20',staffLine:'Welcome.',adHeadline:'A local pause',adBody:'A board for two before the show.',startLocal:'2026-11-01T17:00',endLocal:'2026-11-01T19:00',channels:['facebook','instagram','tiktok','storefront','whatsapp'],mediaBudgetUsd:0});
test('channel starters differ, with a filmable TikTok storyboard and a short Story overlay',()=>{
 assert.notEqual(channelCreative('facebook',review,'The place').caption,channelCreative('instagram',review,'The place').caption);
 assert.equal(channelCreative('tiktok',review,'The place').shots.length,3);
 assert.equal(channelCreative('snapchat',review,'The place').overlay,review.chalkboard);
 assert.equal(channelMaterial('whatsapp',review,'The place'),review.whatsapp);
 assert.equal(channelMaterial('storefront',review,'The place'),review.chalkboard);
});
test('an owner’s channel version survives a changed brief and other channel edits',()=>{
 const custom={...review,channelCreatives:{facebook:{caption:'My Facebook invitation.',overlay:'',shots:[]}}};
 assert.equal(channelCreative('facebook',{...custom,message:'New base message.'},'The place').caption,'My Facebook invitation.');
 assert.notEqual(channelCreative('instagram',custom,'The place').caption,custom.channelCreatives.facebook.caption);
 assert.match(channelMaterial('tiktok',custom,'The place'),/Shot 3:/);
});
test('multiple paid channels and messaging share one ceiling; over-allocation is rejected',()=>{
 const planned={...review,channelCaps:{facebook:10,instagram:8,whatsapp:2},mediaBudgetUsd:18,totalSpendCapUsd:20};
 assert.deepEqual(campaignSpend(planned),{media:18,messaging:2,allocated:20,ceiling:20});
 assert.deepEqual(spendIssues(planned,25,true),[]);
 assert.match(spendIssues({...planned,channelCaps:{...planned.channelCaps,instagram:15},mediaBudgetUsd:25},25,true).join(' '),/exceed/);
 assert.match(spendIssues({...planned,mediaBudgetUsd:10},25,true).join(' '),/match/);
 assert.match(spendIssues(planned,25,false).join(' '),/Enable paid/);
 assert.match(spendIssues({...planned,totalSpendCapUsd:26},25,true).join(' '),/saved/);
});
test('changing channel allocations does not silently increase the total cap',()=>{
 const paid={...review,channelCaps:{facebook:10},mediaBudgetUsd:10,totalSpendCapUsd:15};
 const changed={...paid,...withChannelCaps(paid,paid.channels,{facebook:10,instagram:10})};
 assert.equal(changed.totalSpendCapUsd,15);
 assert.match(spendIssues(changed,25,true).join(' '),/exceed/);
 const removed={...paid,...withChannelCaps(paid,['instagram','storefront'],paid.channelCaps)};
 assert.equal(removed.mediaBudgetUsd,0);
 assert.equal(removed.channelCaps.facebook,undefined);
});
test('legacy local ads remain readable and unselected or printing budgets cannot pass validation',()=>{
 const legacy={...review,channels:['geofenced_ad'] as const,mediaBudgetUsd:15};
 assert.equal(campaignSpend({...legacy,channels:[...legacy.channels]}).ceiling,15);
 assert.match(spendIssues({...review,channelCaps:{geofenced_ad:15}},25,true).join(' '),/unselected/);
 assert.match(spendIssues({...review,channelCaps:{storefront:5},mediaBudgetUsd:5,totalSpendCapUsd:5},25,true).join(' '),/Printing/);
 assert.equal(AgentReviewSchema.safeParse({...review,channelCaps:{facebook:-1}}).success,false);
 assert.equal(AgentReviewSchema.safeParse({...review,channelCreatives:{facebook:{caption:'x'.repeat(601),overlay:'',shots:[]}}}).success,false);
 assert.ok(channelStarter('facebook',review,'The place').caption.length<=600);
});
