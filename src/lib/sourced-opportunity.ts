import type { CampaignPlanProposal } from "./campaign-plan";
import type { OpportunitySignal } from "./opportunity-signals";
export type SourcedOpportunity = {id:string;title:string;fit:string;signal:OpportunitySignal;proposal:CampaignPlanProposal;intelligence?:import("./qloo-intelligence").CampaignIntelligence;why:{label:string;text:string}[]};
