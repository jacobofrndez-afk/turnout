import Link from "next/link";
import { Icon } from "./Icon";
import type { Observation } from "@/lib/discovery-signals";
import type { SourceCoverage } from "@/lib/opportunity-signals";
import type { MenuOffer } from "@/lib/place-dna";
export function SourceWatch({observations,coverage,offers,merchantId,timezone}:{observations:Observation[];coverage:SourceCoverage[];offers:MenuOffer[];merchantId:string;timezone:string}) {
  const trends=coverage.find(s=>s.name.startsWith("Google Trends")),social=coverage.filter(s=>s.name.startsWith("Bluesky"));
  const stamp=(s:string)=>new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit",timeZone:timezone}).format(new Date(s));
  return <section className="source-watch"><div className="section-title"><h2><Icon name="voice"/>Beyond the event calendar</h2><Link className="text-link" href={`/account/sources?merchant=${merchantId}`}>Manage sources <Icon name="arrow" size={15}/></Link></div><p className="section-intro">National search interest and public voices, filtered for your menu.</p>
    <div className="watch-grid">{[{kind:"trend",name:"What’s picking up",icon:"spark" as const,sources:trends?[trends]:[]},{kind:"social",name:"Your public social watch",icon:"voice" as const,sources:social}].map(group=>{
      const items=observations.filter(o=>o.kind===group.kind),available=group.sources.some(s=>s.state==="available"),paused=group.sources.length>0&&group.sources.every(s=>s.state==="disabled");
      return <article className="watch-card" key={group.kind}><span className="watch-icon"><Icon name={group.icon} size={18}/></span><h3>{group.name}</h3><span className={`watch-status ${available?"is-available":""}`}>{paused?"Paused":available?"Feed checked":"Needs attention"}</span>
        {items.length?<ul>{items.slice(0,3).map(o=><li key={o.id}><a href={o.source.url} target="_blank" rel="noreferrer">{o.title} ↗</a><p>{o.explanation}</p><small>Menu fit: {offers.filter(f=>o.offerIds.includes(f.id)).map(f=>f.title).join(" · ")}</small><small>Published {stamp(o.publishedAt)} · checked {stamp(o.source.checkedAt)}</small></li>)}</ul>:<p className="watch-empty">{paused?"This source is paused for your place.":available?group.kind==="trend"?"No current search topic is a strong enough menu match. Your local opportunities stay the priority.":"No recent, relevant post from your selected publishers. Older posts do not become today’s opportunities.":group.sources.some(s=>s.state==="unavailable")?"The feed is temporarily unavailable. Your other sources remain available.":group.kind==="trend"?"National trend coverage currently supports France and the United States.":"Choose public accounts to follow in Sources."}</p>}
        <details><summary>{group.kind==="trend"?"What was checked":"Publishers & freshness"}</summary>{group.sources.map(s=><div key={s.name}><strong>{s.name}</strong><p>{s.detail}</p>{s.checkedAt&&<small>Retrieved {stamp(s.checkedAt)}</small>}</div>)}</details>
      </article>;
    })}</div>
  </section>;
}
