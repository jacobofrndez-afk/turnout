import { Icon } from "./Icon";
/** Approval and publication are separate; step 3 remains pending until completed externally. */
export function CampaignJourney({step,onStepChange}:{step:1|2|3;onStepChange?:(step:1|2)=>void}) {
  const steps=[{id:1,label:"Your campaign"},{id:2,label:"Review"},{id:3,label:"Publish"}] as const;
  return <nav className="campaign-journey" aria-label="Campaign steps"><ol>{steps.map(item=><li key={item.id} className={item.id===step?"is-current":item.id<step?"is-done":""} aria-current={item.id===step?"step":undefined}>
    {onStepChange&&item.id!==3?<button type="button" onClick={()=>onStepChange(item.id as 1|2)}><span>{item.id<step?<Icon name="check" size={12}/>:item.id}</span>{item.label}</button>:<span><span>{item.id<step?<Icon name="check" size={12}/>:item.id}</span>{item.label}</span>}
  </li>)}</ol></nav>;
}
