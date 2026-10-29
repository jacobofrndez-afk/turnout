/** Offers are Turnout menu items, not Qloo entities. Nearby places are taste proxies. */
export type LocalityReference = { id: string; name: string };
export type LocalityOffer = { offerId: string; title: string; references: LocalityReference[] };
export type LocalityResult = { entity_id: string; name: string; query?: { affinity?: number }; affinity?: number };
export type LocalityOfferRank = {
  offerId: string; title: string; eventRank: number; localRank: number;
  references: (LocalityReference & { eventRank: number; localRank: number })[];
};
export type LocalityComparison = {
  status: 'available' | 'unavailable' | 'insufficient';
  radiusM: number; candidateCount: number; comparableCount: number;
  offers: LocalityOfferRank[]; excludedOffers: string[];
  outcome?: 'changed' | 'unchanged' | 'tied';
  eventLeaders: string[]; localLeaders: string[]; reason?: string;
};

const score = (r: LocalityResult) => r.query?.affinity ?? r.affinity;
// Competition ranks keep exact score ties equal; never subtract raw scores across queries.
function ranks(rows: { id: string; value: number }[], descending = true): Map<string, number> {
  const sorted = [...rows].sort((a, b) => (descending ? b.value-a.value : a.value-b.value) || a.id.localeCompare(b.id));
  let rank = 1;
  return new Map(sorted.map((r, i) => {
    if (i && Math.abs(r.value-sorted[i-1].value)>1e-9) rank=i+1;
    return [r.id, rank];
  }));
}

export function compareLocalityOffers(offers: LocalityOffer[], event: LocalityResult[], local: LocalityResult[], radiusM: number): LocalityComparison {
  const ids = new Set(offers.flatMap(o => o.references.map(r => r.id)));
  const valid = (rows: LocalityResult[]) => new Map(rows.filter(r => ids.has(r.entity_id) && Number.isFinite(score(r))).map(r => [r.entity_id, r]));
  const before = valid(event), after = valid(local);
  const common = new Set([...before.keys()].filter(id => after.has(id)));
  const eligible = offers.map(o => ({...o, references: [...new Map(o.references.filter(r => common.has(r.id)).map(r => [r.id, r])).values()]})).filter(o => o.references.length >= 2);
  const result: LocalityComparison = {status:'insufficient',radiusM,candidateCount:ids.size,comparableCount:common.size,offers:[],excludedOffers:offers.filter(o=>!eligible.some(e=>e.offerId===o.offerId)).map(o=>o.title),eventLeaders:[],localLeaders:[]};
  if (eligible.length < 2) return {...result,reason:'Not enough shared references to compare at least two menu offers. The campaign uses the original event analysis.'};
  const sharedIds = new Set(eligible.flatMap(o => o.references.map(r => r.id)));
  const placeRanks = (rows: Map<string, LocalityResult>) => ranks([...sharedIds].map(id => ({id,value:score(rows.get(id)!)!})));
  const eventPlaces=placeRanks(before), localPlaces=placeRanks(after);
  const offerRanks = (places: Map<string,number>) => ranks(eligible.map(o => ({id:o.offerId,value:o.references.reduce((s,r)=>s+places.get(r.id)!,0)/o.references.length})),false);
  const eventOffers=offerRanks(eventPlaces), localOffers=offerRanks(localPlaces);
  result.offers=eligible.map(o=>({offerId:o.offerId,title:o.title,eventRank:eventOffers.get(o.offerId)!,localRank:localOffers.get(o.offerId)!,references:o.references.map(r=>({...r,eventRank:eventPlaces.get(r.id)!,localRank:localPlaces.get(r.id)!})).sort((a,b)=>a.localRank-b.localRank)})).sort((a,b)=>a.localRank-b.localRank||a.eventRank-b.eventRank||a.offerId.localeCompare(b.offerId));
  result.eventLeaders=result.offers.filter(o=>o.eventRank===1).map(o=>o.offerId);
  result.localLeaders=result.offers.filter(o=>o.localRank===1).map(o=>o.offerId);
  result.outcome=result.eventLeaders.length>1||result.localLeaders.length>1?'tied':result.eventLeaders[0]===result.localLeaders[0]?'unchanged':'changed';
  return {...result,status:'available',comparableCount:sharedIds.size};
}

export function localitySummary(c: LocalityComparison): string {
  if(c.status!=='available')return c.reason??'The local comparison is unavailable. The campaign uses the original event analysis.';
  const names=(ids:string[])=>c.offers.filter(o=>ids.includes(o.offerId)).map(o=>o.title).join(' / ');
  if(c.outcome==='changed')return `Adding local context moves the leading offer from ${names(c.eventLeaders)} to ${names(c.localLeaders)}.`;
  if(c.outcome==='tied')return 'The local comparison does not produce a unique winner. Turnout also considers your DNA and the campaign window.';
  return `Adding local context keeps ${names(c.localLeaders)} as the leading offer.`;
}
