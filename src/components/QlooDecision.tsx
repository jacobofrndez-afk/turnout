import { Icon } from "./Icon";
export type QlooDecisionData = {tastes:string[];places:number;placeNames?:string[];usual?:{title:string;tastes:number;places:number};complete:boolean};
export function QlooDecision({data,title,isSignature}:{data:QlooDecisionData;title:string;isSignature:boolean}) {
  const hasEvidence=!!(data.tastes.length||data.places);
  return <div className="qloo-decision" aria-label="What Qloo changes"><span className="qloo-wordmark">Qloo</span><div>
    <p><strong>{data.tastes.length?data.tastes.join(" · "):hasEvidence?`${data.places} local menu references`:"Matching evidence unavailable"}</strong></p>
    {!data.complete?<small>Partial Qloo data. Treat this as a menu suggestion until both local sources are available.</small>:data.usual&&!isSignature?<><p className="qloo-offer-comparison"><span>Your usual</span><s>{data.usual.title}</s><Icon name="arrow" size={13}/><strong>{title}</strong></p><small>{data.tastes.length} taste matches + {data.places} local references, versus {data.usual.tastes} + {data.usual.places} for your usual offer.</small></>:<small>{hasEvidence?`Local support for your signature: ${data.tastes.length} taste ${data.tastes.length===1?"match":"matches"} + ${data.places} nearby references.`:"Your menu remains available; Qloo has not returned evidence supporting this offer."}</small>}
    {!!data.placeNames?.length&&<details><summary>Which local places?</summary><p>{data.placeNames.join(" · ")}</p><small>These places share menu tags in Qloo. They are not identified customers or event attendees. This is evidence of local fit, not measured demand.</small></details>}
  </div></div>;
}
