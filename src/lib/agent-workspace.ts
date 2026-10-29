import type { LocalityComparison } from "./locality-comparison";
import { z } from 'zod';
import { CHANNEL_IDS, type DnaRecord, type MenuOffer } from './place-dna';
import { CampaignVisualSchema, type CampaignVisual } from './campaign-creative';
import type { DistributionRecommendation } from './distribution-recommendation';
import type { PlanChannel } from './campaign-plan';

export const AgentReviewSchema=z.object({
 revision:z.number().int().min(0),
 title:z.string().trim().min(1).max(58),message:z.string().trim().min(1).max(300),terms:z.string().max(120),
 whatsapp:z.string().trim().min(1).max(320),chalkboard:z.string().trim().min(1).max(90),staffLine:z.string().max(140),
 adHeadline:z.string().max(40),adBody:z.string().max(125),
 startLocal:z.string().max(16),endLocal:z.string().max(16),
 channels:z.array(z.enum(CHANNEL_IDS)).min(1).refine(a=>new Set(a).size===a.length),
 mediaBudgetUsd:z.number().int().min(0).max(200),
 visual:CampaignVisualSchema.optional(),
});
export type AgentReview=z.infer<typeof AgentReviewSchema>;
export type AgentOpportunity={id:string;name:string;venue:string;when:string;distanceKm:number;sourceUrl?:string;checkedAt?:string;};
export type AgentReceipt={channel:PlanChannel;status:string;simulated:number;providerId?:string;};
export type AgentWorkspace={
 id:string;merchantId:string;merchantName:string;timezone:string;status:string;source:'anthropic'|'operator';
 event:AgentOpportunity;offer:MenuOffer;dna:DnaRecord;review:AgentReview;distribution:DistributionRecommendation;
 reasoning:string;audience:string;limitations:string;proof:{locality?:LocalityComparison;tags:string[];places:string[];comparedOffers:{title:string;places:string[]}[];qlooCalls:number;};
 potential:{score:number|null;factors:{label:string;points:number;max:number}[]};
 originalChannels:PlanChannel[];receipts:AgentReceipt[];generatedAt:string;
};
export type SavedAgentReview=AgentReview & {offerPrice:string;visual?:CampaignVisual};

export function receiptLabel(receipt:{status:string;simulated:number;channel:string}){
 if(receipt.status.startsWith('failed')||receipt.status==='undelivered')return 'Delivery failed';
 if(receipt.simulated)return receipt.channel==='storefront'?'Ready for your board':receipt.channel==='whatsapp'?'Prepared · not sent':'Prepared · share manually';
 if(receipt.status==='delivered'||receipt.status==='read')return receipt.status==='read'?'Read on demo phone':'Delivered to demo phone';
 if(receipt.status==='sent')return 'Sent · delivery not confirmed';
 if(receipt.status==='created (paused)')return 'Created in Snapchat · paused';
 return 'Accepted by provider · awaiting delivery';
}
