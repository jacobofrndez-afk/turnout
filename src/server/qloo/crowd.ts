// Crowd profile: who is coming to this event, culturally, and which of the merchant's offers fits them.
// Fixed, cached Qloo recipe. The LLM never picks UUIDs: resolution is deterministic or asks the merchant.
import { getDb, newId } from "@/server/db/client";
import type { Merchant } from "@/server/events/radar";
import { headliner as pickHeadliner } from "@/server/events/concentration";
import type { TmEvent } from "@/server/events/ticketmaster";
import { searchEntities, tasteTags, demographics, recommend, findTags, type QlooEntity, type QlooTag, type Demographics, type QlooCall, type Signal, tagId } from "./api";

export type Candidate = { id: string; name: string; type: string; popularity?: number; description?: string };
export type OfferFit = { offerId: string; title: string; tagUrns: string[]; tagNames: string[]; affinity: number; matches: number; topPlaces: string[] };
export type ProvenanceRow = { seq: number; kind: string; workflow: string; input: Record<string, string>; status: string; resultCount: number; cacheHit: boolean; durationMs: number; note?: string };

export type CrowdProfile = {
  id: string;
  eventId: string;
  headlinerName: string;
  headlinerType?: string;
  status: "auto" | "needs_input" | "resolved" | "unresolved";
  entity?: QlooEntity;
  candidates: Candidate[];
  tags: QlooTag[];
  demographics?: Demographics;
  places: QlooEntity[];
  brands: QlooEntity[];
  offerFits: OfferFit[];
  provenance: ProvenanceRow[];
  qlooCalls: { live: number; cached: number };
  // What Qloo was asked about. One entity for a show; several entities or taste tags for a moment.
  origin: string;
  signal: { entities: SignalPart[]; tags: SignalPart[] };
};

export type SignalPart = { id: string; name: string; type: string; note?: string };

export const hasSignal = (p: CrowdProfile) => p.signal.entities.length + p.signal.tags.length > 0;

export type EventRow = {
  id: string; name: string; venue_name: string; lat: number; lon: number; starts_at: string; segment: string | null; genre: string | null; attractions_json: string; timezone: string | null;
  origin?: string | null; window_start?: string | null; window_end?: string | null; crowd_est?: number | null; meta_json?: string | null;
};

// Members of a wave, or a ready-made Qloo signal for TV, street and calendar moments (stored in meta_json).
export type MomentMeta = {
  kind?: string;
  members?: { id: string; name: string; venue: string; capacity: number; startsAt: string; segment?: string; genre?: string }[];
  signal?: { entities?: SignalPart[]; tags?: SignalPart[] };
  themeProxies?: { query: string; type: string }[];
  windowLabel?: string;
  windowWhy?: string;
  why?: string;
};

export const momentMeta = (e: EventRow): MomentMeta => {
  try {
    return e.meta_json ? (JSON.parse(e.meta_json) as MomentMeta) : {};
  } catch {
    return {};
  }
};
export type OfferRow = { id: string; title: string; description: string; price: string; tag_urns_json: string; tag_names_json: string };

export function getEvent(id: string): EventRow | undefined {
  return getDb().prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
}
export function getOffers(merchantId: string): OfferRow[] {
  return getDb().prepare("SELECT * FROM offers WHERE merchant_id = ? AND active = 1").all(merchantId) as OfferRow[];
}

const BAR_OR_RESTAURANT = ["urn:tag:genre:place:restaurant:bar", "urn:tag:genre:place:restaurant"];

export async function buildCrowdProfile(merchant: Merchant, event: EventRow, pickedEntityId?: string): Promise<CrowdProfile> {
  const provenance: ProvenanceRow[] = [];
  let seq = 0;
  const calls = { live: 0, cached: 0 };
  const onCall = (workflow: string, note?: string) => (c: QlooCall) => {
    c.cacheHit ? calls.cached++ : calls.live++;
    provenance.push({ seq: ++seq, kind: "qloo", workflow, input: redact(c.params), status: c.status === 200 ? "ok" : `http ${c.status}`, resultCount: c.resultCount, cacheHit: c.cacheHit, durationMs: c.durationMs, note });
  };

  const tm: TmEvent = { id: event.id, name: event.name, startsAt: event.starts_at, venue: { name: event.venue_name, lat: event.lat, lon: event.lon }, attractions: JSON.parse(event.attractions_json), segment: event.segment ?? undefined, genre: event.genre ?? undefined, origin: (event.origin ?? "ticketmaster") as TmEvent["origin"] };
  const head = pickHeadliner(tm);
  const origin = event.origin ?? "ticketmaster";
  const profile: CrowdProfile = { id: newId("cp"), eventId: event.id, headlinerName: head.name, headlinerType: head.qlooType, status: "unresolved", candidates: [], tags: [], places: [], brands: [], offerFits: [], provenance, qlooCalls: calls, origin, signal: { entities: [], tags: [] } };

  if (origin === "ticketmaster") {
    // 1. Resolve the headliner. Deterministic: exact name + expected type, else ask.
    const types = head.qlooType ? [head.qlooType] : undefined;
    let results = await searchEntities(head.name, types, { onCall: onCall("describe", `search "${head.name}"${types ? ` as ${types[0]}` : ""}`) });
    if (results.length === 0 && types) results = await searchEntities(head.name, undefined, { onCall: onCall("describe", "retry without type") });
    profile.candidates = results.slice(0, 5).map((r) => ({ id: r.entity_id, name: r.name, type: r.subtype ?? "", popularity: r.popularity, description: r.disambiguation ?? String(r.properties?.short_description ?? "") }));

    let entity: QlooEntity | undefined;
    if (pickedEntityId) {
      entity = results.find((r) => r.entity_id === pickedEntityId);
      profile.status = entity ? "resolved" : "unresolved";
    } else {
      const exact = results.filter((r) => norm(r.name) === norm(head.name) && (!head.qlooType || r.subtype === `urn:entity:${head.qlooType}`));
      if (exact.length >= 1 && (exact.length === 1 || (exact[0].popularity ?? 0) - (exact[1].popularity ?? 0) > 0.05)) {
        entity = exact[0];
        profile.status = "auto";
      } else if (results.length > 0) {
        profile.status = "needs_input";
      }
    }
    provenance.push({ seq: ++seq, kind: "decision", workflow: "resolve_headliner", input: { headliner: head.name, type: head.qlooType ?? "any" }, status: profile.status, resultCount: results.length, cacheHit: false, durationMs: 0, note: entity ? `picked ${entity.name} (${entity.subtype})` : "no confident match" });
    if (!entity) return profile;
    profile.entity = entity;
    profile.signal.entities = [{ id: entity.entity_id, name: entity.name, type: entity.subtype?.replace("urn:entity:", "") ?? "" }];
  } else {
    // 1'. A moment: several shows, a game on TV, a street event. Build the signal from its parts, never ask the merchant.
    await momentSignal(event, profile, onCall);
    provenance.push({ seq: ++seq, kind: "decision", workflow: "moment_signal", input: { moment: event.name, origin }, status: hasSignal(profile) ? "auto" : "unresolved", resultCount: profile.signal.entities.length + profile.signal.tags.length, cacheHit: false, durationMs: 0, note: [...profile.signal.entities, ...profile.signal.tags].map((x) => x.name).join(", ") || "nothing Qloo knows" });
    if (!hasSignal(profile)) return profile;
    profile.status = "auto";
  }
  const id: Signal = { entities: profile.signal.entities.map((e) => e.id), tags: profile.signal.tags.map((t) => t.id) };

  // 2. Fixed recipe: taste tags (place-scoped), demographics, bars near the merchant, brands.
  profile.tags = await tasteTags(id, { parentTypes: ["place"], take: 30 }, { onCall: onCall("entity_tags", "place-scoped taste tags") });
  // Films, series and some artists carry no place tags: fall back to their general taste tags.
  if (profile.tags.length < 5) profile.tags = await tasteTags(id, { take: 30 }, { onCall: onCall("entity_tags", "general taste tags (no place tags)") });
  profile.demographics = await demographics(id, { onCall: onCall("audience_demographics") }).catch(() => undefined);
  profile.places = await recommend("place", { ...signalOf(id), location: { lat: merchant.lat, lon: merchant.lon, radiusM: merchant.radius_m }, filterTags: [BAR_OR_RESTAURANT[0]], take: 12, explain: true }, { onCall: onCall("recommend", `bars within ${merchant.radius_m} m`) });
  profile.brands = await recommend("brand", { ...signalOf(id), take: 12 }, { onCall: onCall("recommend", "brands this crowd over-indexes on") });

  // 3. Offer fit: for each offer, how strongly does this crowd like places with the offer's tags around the merchant?
  for (const offer of getOffers(merchant.id)) {
    const urns: string[] = JSON.parse(offer.tag_urns_json);
    const names: string[] = JSON.parse(offer.tag_names_json);
    if (urns.length === 0) continue;
    const places = await recommend("place", { ...signalOf(id), location: { lat: merchant.lat, lon: merchant.lon, radiusM: Math.max(merchant.radius_m, 2500) }, filterTags: urns, take: 10 }, { onCall: onCall("recommend", `offer fit: ${offer.title}`) });
    const aff = places.slice(0, 5).map((p) => p.query?.affinity ?? p.affinity ?? 0);
    const mean = aff.length ? aff.reduce((a, b) => a + b, 0) / aff.length : 0;
    // Also credit direct overlap between the offer's tags and the crowd's taste tags.
    const overlap = profile.tags.filter((t) => urns.includes(tagId(t))).length;
    profile.offerFits.push({ offerId: offer.id, title: offer.title, tagUrns: urns, tagNames: names, affinity: Math.round((mean + 0.05 * overlap) * 100) / 100, matches: places.length, topPlaces: places.slice(0, 3).map((p) => p.name) });
  }
  profile.offerFits.sort((a, b) => b.affinity - a.affinity || b.matches - a.matches);
  provenance.push({ seq: ++seq, kind: "decision", workflow: "offer_fit", input: {}, status: "ok", resultCount: profile.offerFits.length, cacheHit: false, durationMs: 0, note: profile.offerFits[0] ? `best: ${profile.offerFits[0].title} (${profile.offerFits[0].affinity})` : "no offers" });

  persist(profile);
  return profile;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const signalOf = (s: Signal) => (typeof s === "string" ? { entities: [s] } : { entities: s.entities, tags: s.tags });

// Segment of a wave to a Qloo taste tag: added to theatre and comedy waves, and used alone when no show is known to Qloo.
const SEGMENT_TAG_QUERY: Record<string, string> = { "Arts & Theatre": "musical theatre", Music: "live music", Comedy: "stand-up comedy", Sports: "sports", Family: "family" };

// How a wave member is looked up in Qloo. Broadway shows live in Qloo through their film adaptations
// (Wicked, Hamilton, Chicago...), so a theatre show only counts when a well-known film or series has its exact name.
function memberLookup(m: { segment?: string; genre?: string; venue: string }): { types: string[]; minPopularity: number } | undefined {
  const segment = m.segment;
  // Ticketmaster sometimes files a play under a band of the same name: a theatre with no real genre means a show.
  const playInATheatre = /theat/i.test(m.venue) && (!m.genre || /other|undefined/i.test(m.genre));
  if (playInATheatre || /theatre|arts/i.test(segment ?? "")) return { types: ["movie", "tv_show"], minPopularity: 0.8 };
  if (/music/i.test(segment ?? "")) return { types: ["artist"], minPopularity: 0 };
  if (/comedy/i.test(segment ?? "")) return { types: ["person"], minPopularity: 0 };
  if (/sports/i.test(segment ?? "")) return { types: ["brand"], minPopularity: 0 };
  return undefined;
}

async function momentSignal(event: EventRow, profile: CrowdProfile, onCall: (w: string, note?: string) => (c: QlooCall) => void): Promise<void> {
  const meta = momentMeta(event);
  // TV, street and calendar moments carry a signal resolved when they were detected (a team, a theme tag).
  if (meta.signal) {
    profile.signal.entities = [...(meta.signal.entities ?? [])];
    profile.signal.tags = [...(meta.signal.tags ?? [])];
    // A theme (Halloween, a marathon) also has well-known entities that stand for it: Qloo needs entities for
    // place taste and offer fit, tags alone only echo their own words.
    for (const p of meta.themeProxies ?? []) {
      if (profile.signal.entities.length >= 3) break;
      const results = await searchEntities(p.query, [p.type], { onCall: onCall("describe", `theme proxy "${p.query}"`) });
      const hit = results.find((r) => norm(r.name) === norm(p.query) && (r.popularity ?? 0) >= 0.5);
      if (hit) profile.signal.entities.push({ id: hit.entity_id, name: hit.name, type: p.type, note: "stands for the theme of this crowd" });
    }
    if (hasSignal(profile)) return;
  }
  // A street event with no theme: read it through the closest Qloo tag to its own name.
  if (event.origin === "street") {
    const words = event.name.replace(/[^\p{L}\p{N} ]/gu, " ").split(/\s+/).filter((w) => w.length > 3).slice(0, 3).join(" ");
    const tag = words ? (await findTags(words, 3, { onCall: onCall("find_tags", `tag for "${words}"`) }))[0] : undefined;
    if (tag) {
      profile.signal.tags.push({ id: tagId(tag), name: tag.name, type: "tag", note: "closest Qloo tag to the event's name" });
      return;
    }
  }
  // A wave: resolve its biggest shows by exact name. Unknown shows are skipped, not guessed.
  const seen = new Set<string>();
  const members = (meta.members ?? []).filter((m) => {
    const k = norm(m.name);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  let looked = 0;
  for (const m of members) {
    if (profile.signal.entities.length >= 3 || looked >= 8) break;
    const how = memberLookup(m);
    if (!how) continue;
    looked++;
    // Strip Ticketmaster suffixes such as "(NY)", "(New York, NY)" or "- Broadway" before the exact-name match.
    const name = m.name.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+-\s+(broadway|on broadway|the musical)$/i, "").trim();
    const results = await searchEntities(name, how.types, { onCall: onCall("describe", `wave member "${name}"`) });
    const hit = results.find((r) => norm(r.name) === norm(name) && (r.popularity ?? 0) >= how.minPopularity);
    if (hit) profile.signal.entities.push({ id: hit.entity_id, name: hit.name, type: hit.subtype?.replace("urn:entity:", "") ?? "", note: `${m.venue}, ~${m.capacity.toLocaleString("en-US")} people${/movie|tv_show/.test(hit.subtype ?? "") ? ", read through its screen adaptation" : ""}` });
    profile.candidates.push({ id: hit?.entity_id ?? "", name: m.name, type: hit?.subtype ?? "not in Qloo", description: m.venue });
  }
  // The wave's dominant kind of show, by people: theatre and comedy waves also carry their genre tag.
  const bySeg = new Map<string, number>();
  for (const m of members) bySeg.set(m.segment ?? "", (bySeg.get(m.segment ?? "") ?? 0) + m.capacity);
  const dominant = [...bySeg.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? event.segment ?? "";
  if (profile.signal.entities.length === 0 || /theatre|arts|comedy/i.test(dominant)) {
    const q = SEGMENT_TAG_QUERY[dominant] ?? "nightlife";
    const tag = (await findTags(q, 3, { onCall: onCall("find_tags", `fallback taste tag "${q}"`) }))[0];
    if (tag) profile.signal.tags.push({ id: tagId(tag), name: tag.name, type: "tag", note: profile.signal.entities.length ? `the wave is mostly ${dominant.toLowerCase()}` : "no show in this wave is known to Qloo by name" });
  }
}

function redact(params: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) out[k] = v.length > 80 ? v.slice(0, 77) + "..." : v;
  return out;
}

function persist(p: CrowdProfile): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO crowd_profiles (id, event_id, headliner_name, headliner_type, entity_id, resolution_status, candidates_json, tags_json, demographics_json, places_json, brands_json, built_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  ).run(p.id, p.eventId, p.headlinerName, p.headlinerType ?? null, p.entity?.entity_id ?? p.signal.entities[0]?.id ?? null, p.status, JSON.stringify(p.candidates), JSON.stringify(p.tags.map((t) => ({ id: tagId(t), name: t.name, subtype: t.subtype, affinity: t.query?.affinity }))), JSON.stringify(p.demographics ?? null), JSON.stringify(p.places.map(slim)), JSON.stringify(p.brands.map(slim)));
  const ins = db.prepare(`INSERT INTO provenance (crowd_profile_id, seq, kind, workflow, input_json, envelope_status, result_count, cache_hit, duration_ms, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const r of p.provenance) ins.run(p.id, r.seq, r.kind, r.workflow, JSON.stringify(r.input), r.status, r.resultCount, r.cacheHit ? 1 : 0, r.durationMs, r.note ?? null);
}

const slim = (e: QlooEntity) => ({ entity_id: e.entity_id, name: e.name, affinity: e.query?.affinity ?? e.affinity, popularity: e.popularity, address: e.properties?.address, neighborhood: (e.properties?.geocode as { name?: string } | undefined)?.name });

// Human-readable summary of the demographics, for the UI and the LLM prompt.
export function describeDemographics(d?: Demographics): { ageTop: string[]; ageLow: string[]; gender: string } | undefined {
  if (!d) return undefined;
  const label: Record<string, string> = { "24_and_younger": "under 25", "25_to_29": "25-29", "30_to_34": "30-34", "35_to_44": "35-44", "45_to_54": "45-54", "55_and_older": "55+" };
  const ages = Object.entries(d.age).sort((a, b) => b[1] - a[1]);
  const gender = Math.abs(d.gender.female) < 0.1 ? "balanced gender mix" : d.gender.female > 0 ? `skews female (+${d.gender.female.toFixed(2)})` : `skews male (+${d.gender.male.toFixed(2)})`;
  return { ageTop: ages.filter(([, v]) => v > 0.1).slice(0, 2).map(([k, v]) => `${label[k]} (+${v.toFixed(2)})`), ageLow: ages.filter(([, v]) => v < -0.2).slice(-2).map(([k, v]) => `${label[k]} (${v.toFixed(2)})`), gender };
}
