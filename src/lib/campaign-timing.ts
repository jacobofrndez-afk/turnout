import { localTimeToInstant, type CampaignPlanProposal } from "./campaign-plan";
import { rankCampaignChoices, type OfferEvidence, type PotentialContext, type QlooSnapshot } from "./daily-potential";
import type { SourcedOpportunity } from "./sourced-opportunity";

export type CampaignTimeframe = "now" | "ahead" | "evergreen";
type Choice = { id:string|null; proposal:CampaignPlanProposal };
type Inputs = { proposals:Record<string,CampaignPlanProposal>; immediateProposals:Record<string,CampaignPlanProposal>; opportunities:SourcedOpportunity[]; evidence:OfferEvidence[]; snapshot:QlooSnapshot; context:PotentialContext };
const advanceOccasions = new Set(["calendar","culture","market","street","rhythm"]);
const copyKey=(choice:Choice)=>`${choice.proposal.offerId}:${choice.proposal.messages[choice.proposal.offerId]?.toLowerCase().replace(/\s+/g," ").trim()}`;

/** Different decision horizons, not a date filter over the same weather-led campaign. */
export function campaignTimingChoices(mode:CampaignTimeframe,inputs:Inputs,at=inputs.context.now) {
  const {proposals,immediateProposals,opportunities,evidence,snapshot,context}=inputs;
  const belongs=(proposal:CampaignPlanProposal,horizon:CampaignTimeframe)=>{
    try {const start=localTimeToInstant(proposal.slots[0].startLocal,context.timezone);return horizon==="now"?start<=at+2*3600000:start>at+2*3600000;}catch{return false;}
  };
  const rank=(choices:Choice[])=>rankCampaignChoices(choices,evidence,snapshot,{...context,now:at}).filter(c=>c.potential?.timingValid).sort((a,b)=>{
    // A specific supported audience is the decision context, not extra potential points.
    const audienceRank=(id:string|null)=>opportunities.find(o=>o.id===id)?.intelligence?.audience?.rank??Infinity;
    const left=audienceRank(a.id),right=audienceRank(b.id);
    return left===right?0:left-right;
  });
  if(mode==="evergreen")return rank(opportunities.filter(o=>o.signal.category==="evergreen").map(o=>({id:o.id,proposal:o.proposal})));
  const immediate=rank([
    ...opportunities.filter(o=>o.signal.category!=="evergreen"&&!o.signal.timeConflict&&belongs(o.proposal,"now")).map(o=>({id:o.id,proposal:o.proposal})),
    ...Object.values(immediateProposals).filter(p=>belongs(p,"now")).map(proposal=>({id:null,proposal})),
  ]);
  if(mode==="now")return immediate;
  const immediateCopy=new Set(immediate.map(copyKey));
  const future=rank([
    // Weather and current search trends refine a short-notice action; they are not an advance occasion.
    ...opportunities.filter(o=>!o.signal.timeConflict&&!["weather","trend","evergreen"].includes(o.signal.category)&&belongs(o.proposal,"ahead")).map(o=>({id:o.id,proposal:o.proposal})),
    ...Object.values(proposals).filter(p=>belongs(p,"ahead")).map(proposal=>({id:null,proposal})),
  ]).filter(c=>!immediateCopy.has(copyKey(c)));
  const priority=(choice:Choice)=>opportunities.find(o=>o.id===choice.id)?.intelligence?.audience?2:advanceOccasions.has(opportunities.find(o=>o.id===choice.id)?.signal.category??"")?1:0;
  // Keep the actual potential score. A future occasion has planning priority, not extra Qloo points.
  return future.sort((a,b)=>priority(b)-priority(a));
}
