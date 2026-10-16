// Prompt construction. The system prompt is frozen (cacheable); everything volatile goes in the user turn.
import type { Merchant } from "@/server/events/radar";
import type { CrowdProfile, EventRow, OfferRow } from "@/server/qloo/crowd";
import { describeDemographics } from "@/server/qloo/crowd";
import { tagId } from "@/server/qloo/api";

export const SYSTEM_PROMPT = `You are the campaign agent of Crowd to Campaign, a tool for independent merchants (bars, restaurants, shops).

A crowd is about to gather near the merchant for an event. You receive:
- the event (headliner, venue, time),
- Qloo taste data about people who like the headliner: demographics (age and gender affinity relative to average; positive means over-index), taste tags for places, brands they over-index on, bars near the merchant they like,
- the merchant's offers, each with Qloo tag URNs and a fit score (affinity of places with those tags, near the merchant, for this crowd),
- the merchant's tone of voice and suggested time windows.

Your job: pick the one offer that best fits this crowd, write the copy for each channel, and explain why using the Qloo evidence.

Rules:
- Cite concrete Qloo evidence in the rationale: tag names, demographic numbers, brand names, place names. Never invent data.
- Fit scores are compressed (often 0.80 to 0.95). Treat them as one signal among demographics, tags and brands, not as the decision.
- Qloo describes aggregate affinities of a group. Never describe an individual, never predict that someone will come. Say so in limitations.
- Copy is for the channel: short for ads and boards, warmer for WhatsApp regulars, factual for the Google post. Respect the merchant's voice. Mention the event by headliner name where natural.
- Use the merchant's city language: English for US cities, French for France. Prices stay as given.
- Interest keywords for the geofenced ad come from the Qloo tags and brands, phrased as ad-platform interests (e.g. "Cocktail bars", "Luxury fashion", "Pop music").
- Time windows: use the suggested ones unless the evidence says otherwise; keep local HH:MM.
- No exclamation marks. No emojis. No hashtags.`;

export function timeWindows(event: EventRow, merchant: Merchant): { label: string; start_local: string; end_local: string; why: string }[] {
  const start = new Date(event.starts_at);
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: merchant.timezone });
  const at = (offsetMin: number) => fmt.format(new Date(start.getTime() + offsetMin * 60_000));
  const isSport = (event.segment ?? "").toLowerCase() === "sports";
  const durationMin = isSport ? 150 : 165;
  return [
    { label: "Before doors", start_local: at(-150), end_local: at(-30), why: "People arrive early, eat and drink near the venue before doors open." },
    { label: "After the show", start_local: at(durationMin), end_local: at(durationMin + 90), why: "The crowd leaves at once and looks for a place within walking distance." },
  ];
}

export function buildUserPrompt(merchant: Merchant, event: EventRow, profile: CrowdProfile, offers: OfferRow[]): string {
  const demo = describeDemographics(profile.demographics);
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
  const lines: string[] = [];
  lines.push(`# Merchant`, `${merchant.name}, a ${merchant.kind} at ${merchant.address ?? merchant.city}. City: ${merchant.city}. Timezone: ${merchant.timezone}.`, `Voice: ${merchant.voice ?? "friendly and direct"}`, "");
  lines.push(`# Event`, `${event.name} at ${event.venue_name}, ${fmt.format(new Date(event.starts_at))} local. Segment: ${event.segment ?? "?"}${event.genre ? ` / ${event.genre}` : ""}.`, `Headliner resolved in Qloo: ${profile.entity?.name ?? profile.headlinerName} (${profile.entity?.subtype?.replace("urn:entity:", "") ?? "unknown"}), popularity ${((profile.entity?.popularity ?? 0) * 100).toFixed(1)}%.`, "");
  lines.push(`# Qloo: who likes ${profile.entity?.name ?? profile.headlinerName}`);
  if (profile.demographics) {
    const a = profile.demographics.age;
    lines.push(`Age affinity: under 25 ${s(a["24_and_younger"])}, 25-29 ${s(a["25_to_29"])}, 30-34 ${s(a["30_to_34"])}, 35-44 ${s(a["35_to_44"])}, 45-54 ${s(a["45_to_54"])}, 55+ ${s(a["55_and_older"])}.`);
    lines.push(`Gender affinity: female ${s(profile.demographics.gender.female)}, male ${s(profile.demographics.gender.male)}. Summary: ${demo?.gender}.`);
  } else lines.push("Demographics: not available for this entity.");
  lines.push(`Place taste tags (strongest first): ${profile.tags.slice(0, 24).map((t) => `${t.name} [${tagId(t).split(":").slice(2, 4).join(":")}]`).join(", ")}.`);
  lines.push(`Brands this crowd over-indexes on: ${profile.brands.slice(0, 10).map((b) => b.name).join(", ") || "none returned"}.`);
  lines.push(`Bars within ${merchant.radius_m} m this crowd likes (affinity): ${profile.places.slice(0, 8).map((p) => `${p.name} ${(p.query?.affinity ?? 0).toFixed(2)}`).join("; ") || "none returned"}.`, "");
  lines.push(`# Merchant offers and Qloo fit`);
  for (const o of offers) {
    const fit = profile.offerFits.find((f) => f.offerId === o.id);
    lines.push(`- id=${o.id} | ${o.title} | ${o.description} | ${o.price} | tags: ${JSON.parse(o.tag_names_json).join(", ")} | fit ${fit ? fit.affinity.toFixed(2) : "n/a"}${fit?.topPlaces.length ? ` (places this crowd likes with these tags nearby: ${fit.topPlaces.join(", ")})` : ""}`);
  }
  lines.push("", `# Suggested windows (local time)`);
  for (const w of timeWindows(event, merchant)) lines.push(`- ${w.label}: ${w.start_local} to ${w.end_local}. ${w.why}`);
  lines.push("", `# Task`, `Choose the offer, write the campaign for every channel, explain with the Qloo evidence above, and state the limitations. Output must match the required schema.`);
  return lines.join("\n");
}

const s = (v: number) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));
