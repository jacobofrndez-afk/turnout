// Neighbourhood pulse: the structural taste of the street outside the merchant, for the everyday flow of passers-by.
// Qloo signal = the merchant's GPS point (signal.location), not an event. Cached by the API layer for a week.
import type { Merchant } from "@/server/events/radar";
import { getOffers, type ProvenanceRow } from "./crowd";
import { qlooGet, type QlooCall, type QlooEntity, type QlooTag, tagId } from "./api";
import { neighbourhoodName } from "@/server/merchants/geocode";

export type PulseOfferFit = { offerId: string; title: string; tagNames: string[]; affinity: number; matches: number; topPlaces: string[] };

export type NeighborhoodPulse = {
  localityName?: string;
  point: string;
  audienceTags: QlooTag[]; // who is on this street: Business Professionals, Couples, Tourists...
  ambienceTags: QlooTag[]; // what the street likes: Intimate, Lively, Cocktail Enthusiasts...
  brands: QlooEntity[];
  places: QlooEntity[];
  offerFits: PulseOfferFit[];
  provenance: ProvenanceRow[];
  qlooCalls: { live: number; cached: number };
};

const AUDIENCE_NS = /customer_identity|age_range|visit_intent|good_for/;

export async function buildNeighborhoodPulse(merchant: Merchant): Promise<NeighborhoodPulse> {
  const provenance: ProvenanceRow[] = [];
  let seq = 0;
  const calls = { live: 0, cached: 0 };
  const onCall = (workflow: string, note?: string) => (c: QlooCall) => {
    c.cacheHit ? calls.cached++ : calls.live++;
    provenance.push({ seq: ++seq, kind: "qloo", workflow, input: c.params, status: c.status === 200 ? "ok" : `http ${c.status}`, resultCount: c.resultCount, cacheHit: c.cacheHit, durationMs: c.durationMs, note });
  };
  const point = `POINT(${merchant.lon} ${merchant.lat})`;

  // Name the neighbourhood for display: OpenStreetMap reverse geocode (Qloo's nearest locality can be a few blocks off).
  let localityName: string | undefined;
  try {
    localityName = await neighbourhoodName(merchant.lat, merchant.lon);
  } catch {
    localityName = undefined;
  }

  // Taste tags of the street, scoped to places. Two reads of the same call: audience-type tags and ambience tags.
  const tagsBody = await qlooGet<{ results?: { tags?: QlooTag[] } }>(
    "/v2/insights",
    { "filter.type": "urn:tag", "signal.location": point, "filter.parents.types": "urn:entity:place", take: "40" },
    { onCall: onCall("entity_tags", "taste of the street (signal.location = merchant point)") },
  );
  const tags = tagsBody.results?.tags ?? [];
  const audienceTags = tags.filter((t) => AUDIENCE_NS.test(tagId(t))).slice(0, 12);
  const ambienceTags = tags.filter((t) => !AUDIENCE_NS.test(tagId(t))).slice(0, 16);

  // Brands and media the street over-indexes on: the cultural register for the copy.
  const brandsBody = await qlooGet<{ results?: { entities?: QlooEntity[] } }>(
    "/v2/insights",
    { "filter.type": "urn:entity:brand", "signal.location": point, take: "12" },
    { onCall: onCall("recommend", "brands the street over-indexes on") },
  );
  const brands = brandsBody.results?.entities ?? [];

  // Bars and restaurants within reach that this street already likes: the competitive set.
  const placesBody = await qlooGet<{ results?: { entities?: QlooEntity[] } }>(
    "/v2/insights",
    {
      "filter.type": "urn:entity:place",
      "signal.location": point,
      "filter.location": point,
      "filter.location.radius": String(Math.max(merchant.radius_m, 1500)),
      "filter.tags": "urn:tag:genre:place:restaurant:bar,urn:tag:genre:place:restaurant",
      "operator.filter.tags": "union",
      take: "12",
    },
    { onCall: onCall("recommend", "places nearby the street likes") },
  );
  const places = placesBody.results?.entities ?? [];

  // Offer fit for the everyday flow: affinity of places with the offer's tags, for this street.
  const offerFits: PulseOfferFit[] = [];
  for (const offer of getOffers(merchant.id)) {
    const urns: string[] = JSON.parse(offer.tag_urns_json);
    if (urns.length === 0) continue;
    const body = await qlooGet<{ results?: { entities?: QlooEntity[] } }>(
      "/v2/insights",
      { "filter.type": "urn:entity:place", "signal.location": point, "filter.location": point, "filter.location.radius": "2500", "filter.tags": urns.join(","), "operator.filter.tags": "union", take: "10" },
      { onCall: onCall("recommend", `offer fit (street): ${offer.title}`) },
    );
    const ents = body.results?.entities ?? [];
    const aff = ents.slice(0, 5).map((p) => p.query?.affinity ?? p.affinity ?? 0);
    const mean = aff.length ? aff.reduce((a, b) => a + b, 0) / aff.length : 0;
    offerFits.push({ offerId: offer.id, title: offer.title, tagNames: JSON.parse(offer.tag_names_json), affinity: Math.round(mean * 100) / 100, matches: ents.length, topPlaces: ents.slice(0, 3).map((p) => p.name) });
  }
  offerFits.sort((a, b) => b.affinity - a.affinity || b.matches - a.matches);
  provenance.push({ seq: ++seq, kind: "decision", workflow: "street_offer_fit", input: {}, status: "ok", resultCount: offerFits.length, cacheHit: false, durationMs: 0, note: offerFits[0] ? `best for the everyday flow: ${offerFits[0].title} (${offerFits[0].affinity})` : "no offers" });

  return { localityName, point, audienceTags, ambienceTags, brands, places, offerFits, provenance, qlooCalls: calls };
}
