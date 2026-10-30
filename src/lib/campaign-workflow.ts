export type CampaignView = 'proposal' | 'personalize' | 'review' | 'materials';

/** A saved receipt cannot become an editable form without explicitly creating a copy. */
export function campaignEntryView(status:string,requested?:string):CampaignView {
 const draft=status==='drafted';
 if(requested==='proposal'||requested==='review')return requested;
 if(requested==='personalize')return draft?'personalize':'review';
 if(requested==='materials')return draft?'review':'materials';
 return draft?'personalize':'materials';
}

export function campaignWorkflowHref(id:string,merchantId:string,view:CampaignView){
 return `/campaigns/${encodeURIComponent(id)}?${new URLSearchParams({merchant:merchantId,view})}`;
}
