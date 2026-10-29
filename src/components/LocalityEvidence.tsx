import type { ReactNode } from 'react';
import { localitySummary, type LocalityComparison } from '@/lib/locality-comparison';
import { fromDoor } from '@/lib/distance';
import { Icon } from './Icon';

export function LocalityEvidence({comparison,offerId,children}:{comparison?:LocalityComparison;offerId:string;children:ReactNode}){
 if(!comparison)return <details className="agent-evidence"><summary><Icon name="spark" size={16}/>Why this works here</summary>{children}</details>;
 const selected=comparison.offers.find(o=>o.offerId===offerId);
 return <section className="agent-evidence agent-locality" aria-label="Why this works here">
  <div className="agent-locality-heading"><Icon name="spark" size={17}/><strong>Why this works here</strong><span>Qloo · Locality Intelligence</span></div>
  <p>{localitySummary(comparison)}</p>
  {selected&&<p className="agent-locality-refs">{selected.references.slice(0,3).map(r=>r.name).join(' · ')}</p>}
  <details><summary>See Qloo evidence <Icon name="chevron" size={14}/></summary>
   {comparison.status==='available'&&<>
    <div className="agent-locality-table"><table><caption>Offer ranking · the same local references in both analyses</caption><thead><tr><th scope="col">Menu offer</th><th scope="col">Event only</th><th scope="col">Event + area</th></tr></thead><tbody>{comparison.offers.map(o=><tr key={o.offerId} className={o.offerId===offerId?'is-selected':''}><th scope="row">{o.title}{o.offerId===offerId&&<small>Chosen for this campaign</small>}</th><td>#{o.eventRank}</td><td>#{o.localRank}</td></tr>)}</tbody></table></div>
    <p className="agent-note">Turnout ranks offers by the average rank of their reference places. Qloo scores the places, not your menu items. {comparison.comparableCount} shared places out of {comparison.candidateCount} candidates; at least two per compared offer. Ties share a rank.</p>
    {comparison.excludedOffers.length>0&&<p className="agent-note">Not compared — insufficient shared references: {comparison.excludedOffers.join(', ')}.</p>}
   </>}
   <p className="agent-note">Reference search radius: {fromDoor(comparison.radiusM/1000)} from your place. This is separate from your ad area.</p>
   {children}
  </details>
 </section>;
}
