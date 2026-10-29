import type { SavedAgentReview } from '@/lib/agent-workspace';
import type { CampaignBoardData } from '@/lib/campaign-board';
import { getSends } from '@/server/channels';
import { getMerchant } from '@/server/events/radar';
import { getOffers } from '@/server/qloo/crowd';
import { getCampaign, getDraft } from './run';

/** A printable receipt uses the approved copy, price and time, never a newly generated window. */
export function preparedBoard(id:string):CampaignBoardData|undefined{
 const campaign=getCampaign(id);
 if(!campaign?.review_json||campaign.status==='drafted')return;
 const review=JSON.parse(campaign.review_json) as SavedAgentReview;
 if(!review.channels.includes('storefront'))return;
 const receipt=getSends(id).find(s=>s.channel==='storefront'&&s.status==='ready');
 if(!receipt?.payload_json)return;
 const payload=JSON.parse(receipt.payload_json) as {chalkboard?:string};
 const merchant=getMerchant(campaign.merchant_id),draft=getDraft(campaign);
 if(!merchant||!draft||!payload.chalkboard||!review.offerPrice)return;
 const offer=review.offerSnapshot??getOffers(merchant.id).find(o=>o.id===draft.chosen_offer_id);
 if(!offer)return;
 return {campaignId:id,merchantId:merchant.id,merchantName:merchant.name,address:merchant.address,message:payload.chalkboard,offerTitle:offer.title,price:review.offerPrice,startLocal:review.startLocal,endLocal:review.endLocal,timezone:merchant.timezone};
}
