import { eventCampaignPotential, type EventPotential } from '@/lib/event-potential';
import { localStampAt, localTimeToInstant } from '@/lib/campaign-plan';
import { offerWindow } from '@/lib/offer-window';
import { fitsServiceTime } from '@/lib/offer-service';
import { cacheGet, cacheSet, cacheKey, getDb } from '@/server/db/client';
import { buildCrowdProfile, getOffers, type CrowdProfile, type EventRow, type OfferRow } from '@/server/qloo/crowd';
import { getDna, DnaError } from '@/server/merchants/dna';
import { ensureOfferTags } from '@/server/merchants/onboarding';
import { campaignWindows } from '@/server/agent/prompt';
import { agentWorkspace, assertAgentEvent } from '@/server/agent/review';
import { haversineKm } from '@/server/events/concentration';
import type { Merchant } from '@/server/events/radar';
import type { DnaRecord } from '@/lib/place-dna';

const SOURCE = 'calendar-qloo-potential-v1';
type Analysis = { profile: CrowdProfile; checkedAt: string };
const pending = new Map<string, Promise<EventPotential>>();

// A score is specific to this place, its current menu/DNA and this event's schedule.
export function eventPotentialKey(m: Merchant, e: EventRow, dna: DnaRecord, offers: OfferRow[]) {
  return { merchant: m.id, area: [m.lat, m.lon, m.radius_m], timezone: m.timezone, dna: dna.version,
    event: [e.id, e.name, e.starts_at, e.segment, e.attractions_json, e.lat, e.lon, e.window_start, e.window_end],
    offers: offers.map(o => [o.id, o.title, o.description, o.price, o.tag_urns_json]).sort((a,b) => a[0].localeCompare(b[0])) };
}

/** Find a usable planning window, respecting explicit menu hours and preparation time. */
export function potentialOfferWindow(offer: OfferRow, event: EventRow, timezone: string, leadMinutes: number, now: number) {
  const serving = offerWindow(offer.description);
  for (const window of campaignWindows(event)) {
    let start = Math.ceil(Math.max(window.start, now + leadMinutes * 60000 + 60000) / 60000) * 60000;
    let end = window.end;
    if (serving) {
      const day = localStampAt(start, timezone).slice(0, 10);
      start = Math.max(start, localTimeToInstant(`${day}T${serving.from}`, timezone));
      end = Math.min(end, localTimeToInstant(`${day}T${serving.to}`, timezone));
    }
    // Service periods are menu hints, not claims about the merchant's actual opening hours.
    for (; start + 30 * 60000 <= end; start += 15 * 60000) {
      if (fitsServiceTime(offer, localStampAt(start, timezone).slice(11))) return { start, end };
    }
  }
}

export function potentialFromProfile(m: Merchant, event: EventRow, dna: DnaRecord, offers: OfferRow[], analysis: Analysis, now = Date.now()): EventPotential {
  const base = { score: null, references: [], factors: [], checkedAt: analysis.checkedAt, radiusM: Math.max(m.radius_m, 2500) };
  const { profile } = analysis;
  if (!profile.offerFits.length) return { ...base, label: 'No clear recommendation', reason: 'Not enough Qloo evidence for your menu yet. No score.' };
  // Every priced offer with a usable window is a candidate. Nearby place references rank first, shared taste tags next, then the signature offer.
  const candidates = offers.flatMap(offer => {
    if (!offer.price.trim()) return [];
    const window = potentialOfferWindow(offer, event, m.timezone, dna.profile.leadMinutes, now);
    if (!window) return [];
    const fit = profile.offerFits.find(f => f.offerId === offer.id);
    return [{ offer, window, fit, matches: fit?.matches ?? 0, affinity: fit?.affinity ?? 0, signature: dna.profile.signatureOfferId === offer.id }];
  }).sort((a, b) => Number(b.matches > 0) - Number(a.matches > 0) || b.affinity - a.affinity || b.matches - a.matches || Number(b.signature) - Number(a.signature));
  const best = candidates[0];
  if (!best) return { ...base, label: 'No clear recommendation', reason: 'No offer has a usable window for this event. Check your menu hours and preparation time.' };
  const { fit, offer, window } = best;
  const places = fit?.topPlaces ?? [];
  const tastes = profile.tags.slice(0, 3).map(t => t.name).filter(Boolean).join(', ');
  const potential = eventCampaignPotential({ matches: best.matches, references: places.length, affinity: best.affinity,
    signature: best.signature, ...window, now,
    insideArea: haversineKm(m.lat, m.lon, event.lat, event.lon) <= m.radius_m / 1000 });
  const reason = best.matches > 0
    ? places.length
      ? `Qloo connects this audience with ${places.slice(0, 2).join(' and ')}. Their place tags match this offer.`
      : `Qloo returned ${best.matches} nearby place references matching this offer’s menu tags for this audience.`
    : best.affinity > 0
      ? `Qloo links this audience’s tastes${tastes ? ` (${tastes})` : ''} with this offer’s menu tags. No nearby place reference matched yet.`
      : tastes
        ? `Qloo describes this crowd as ${tastes}. None of these tastes match your menu tags, so the index rests on timing and your place DNA.`
        : 'Qloo returned no taste tags for this crowd. The index rests on timing and your place DNA.';
  return { ...base, ...potential,
    label: potential.score === null ? 'Check the timing' : best.matches === 0 && best.affinity === 0 ? best.signature ? 'Your signature, by default' : 'Low Qloo fit' : potential.score >= 75 ? 'Worth preparing' : 'Worth exploring',
    reason, offer: { id: offer.id, title: offer.title, price: offer.price }, references: places,
    window: { startLocal: localStampAt(window.start, m.timezone), endLocal: localStampAt(window.end, m.timezone) } };
}

/** Read-only: rendering a calendar never fans out into Qloo or Claude calls. */
export function savedEventPotential(m: Merchant, event: EventRow, now = Date.now()): EventPotential | undefined {
  const dna = getDna(m.id), offers = getOffers(m.id);
  if (dna.status === 'suggested') return;
  // Keep the calendar's number consistent with the campaign the owner will actually open.
  const row = getDb().prepare("SELECT id FROM campaigns WHERE merchant_id=? AND event_id=? AND dna_version=? AND copy_parent_id IS NULL AND copy_json IS NOT NULL AND evidence_json IS NOT NULL ORDER BY created_at DESC, rowid DESC LIMIT 1").get(m.id, event.id, dna.version) as { id: string } | undefined;
  const campaign = row ? agentWorkspace(row.id, now) : undefined;
  if (campaign?.potential.score !== null && campaign?.potential.score !== undefined && campaign.offer.price && offers.some(o => o.id === campaign.offer.id && o.price === campaign.offer.price)) {
    return { ...campaign.potential, label: 'Campaign prepared', reason: campaign.proof.places.length
      ? `Qloo audience references include ${campaign.proof.places.slice(0,2).join(' and ')}. Their place tags support the chosen offer.`
      : 'Qloo connects this audience with nearby places matching the chosen offer’s menu tags.',
      offer: {id:campaign.offer.id,title:campaign.offer.title,price:campaign.offer.price}, references: campaign.proof.places, radiusM: Math.max(m.radius_m,2500), checkedAt: campaign.generatedAt,
      window: { startLocal: campaign.review.startLocal, endLocal: campaign.review.endLocal }, campaignId: campaign.id };
  }
  const cached = cacheGet<Analysis>(SOURCE, eventPotentialKey(m,event,dna,offers));
  return cached ? potentialFromProfile(m,event,dna,offers,cached,now) : undefined;
}

export async function assessEventPotential(m: Merchant, event: EventRow): Promise<EventPotential> {
  assertAgentEvent(m.id, event);
  const saved = savedEventPotential(m,event); if (saved) return saved;
  const key = cacheKey(SOURCE,eventPotentialKey(m,event,getDna(m.id),getOffers(m.id)));
  const underway = pending.get(key); if (underway) return underway;
  if (pending.size >= 2) throw new DnaError('Two Qloo checks are already running. Try again shortly.',429);
  const run = (async () => {
    await ensureOfferTags(m.id);
    const dna = getDna(m.id), offers = getOffers(m.id), input = eventPotentialKey(m,event,dna,offers);
    const profile = await buildCrowdProfile(m,event);
    const analysis = { profile, checkedAt: new Date().toISOString() };
    cacheSet(SOURCE,input,analysis,profile.offerFits.length ? 24 * 3600 : 10 * 60);
    return potentialFromProfile(m,event,dna,offers,analysis);
  })();
  pending.set(key,run);
  try { return await run; } finally { pending.delete(key); }
}
