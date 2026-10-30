import test from 'node:test';
import assert from 'node:assert/strict';
import {campaignEntryView,campaignWorkflowHref} from '../src/lib/campaign-workflow';
test('draft links open editing and can resume review, never show a receipt',()=>{
 assert.equal(campaignEntryView('drafted'),'personalize');
 assert.equal(campaignEntryView('drafted','review'),'review');
 assert.equal(campaignEntryView('drafted','materials'),'review');
 assert.equal(campaignEntryView('drafted','unknown'),'personalize');
});
test('saved campaigns remain read-only until a separate copy has been created',()=>{
 for(const status of ['prepared','approved','partial','sent']){
  assert.equal(campaignEntryView(status),'materials');
  assert.equal(campaignEntryView(status,'personalize'),'review');
  assert.equal(campaignEntryView(status,'proposal'),'proposal');
 }
});
test('workflow links keep the place and step in the Campaigns context',()=>{
 assert.equal(campaignWorkflowHref('camp_demo','m_penn_pour','personalize'),'/campaigns/camp_demo?merchant=m_penn_pour&view=personalize');
 assert.equal(new URL(campaignWorkflowHref('a/b','place & one','review'),'https://example.com').searchParams.get('merchant'),'place & one');
});
