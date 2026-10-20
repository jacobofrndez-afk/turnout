// Concentration scoring: how much of a crowd does this event bring near the merchant?
// Ticketmaster rarely exposes capacity, so we keep a venue tier table and a default per segment.
import type { TmEvent } from "./ticketmaster";

type VenueTier = { match: RegExp; capacity: number };

// Capacities are public approximations, enough to rank concentrations.
export const VENUE_TIERS: VenueTier[] = [
  // New York
  { match: /metlife/i, capacity: 82000 },
  { match: /yankee stadium/i, capacity: 47000 },
  { match: /citi field/i, capacity: 41000 },
  { match: /infosys theater|theater at madison square garden|hulu theater/i, capacity: 5600 },
  { match: /madison square garden/i, capacity: 20000 },
  { match: /barclays/i, capacity: 19000 },
  { match: /ubs arena|prudential/i, capacity: 17500 },
  { match: /forest hills/i, capacity: 14000 },
  { match: /radio city/i, capacity: 6000 },
  { match: /hammerstein/i, capacity: 3500 },
  { match: /terminal 5|kings theatre|united palace/i, capacity: 3000 },
  { match: /beacon|carnegie|lincoln center|david geffen/i, capacity: 2800 },
  { match: /palladium times square|brooklyn steel|town hall|apollo|webster hall/i, capacity: 1600 },
  { match: /irving plaza|gramercy|sony hall|racket|bowery ballroom|music hall of williamsburg|le poisson/i, capacity: 1000 },
  { match: /blue note|birdland|iridium|village vanguard|joe.?s pub|rockwood|mercury lounge|bitter end/i, capacity: 200 },
  // Paris
  { match: /stade de france/i, capacity: 80000 },
  { match: /parc des princes/i, capacity: 48000 },
  { match: /la d[ée]fense arena/i, capacity: 40000 },
  { match: /accor arena|bercy/i, capacity: 20000 },
  { match: /adidas arena|porte de la chapelle/i, capacity: 8000 },
  { match: /z[ée]nith/i, capacity: 6300 },
  { match: /grand rex|palais des congr[èe]s|salle pleyel|philharmonie|olympia/i, capacity: 2500 },
  { match: /bataclan|casino de paris|cigale|trianon|elys[ée]e montmartre|folies berg[èe]re|th[ée][âa]tre du ch[âa]telet/i, capacity: 1500 },
  { match: /bellevilloise|maroquinerie|boule noire|new morning|caf[ée] de la danse|petit bain|caveau/i, capacity: 400 },
];

const SEGMENT_DEFAULT: Record<string, number> = {
  Sports: 12000,
  Music: 700,
  "Arts & Theatre": 500,
  Comedy: 500,
  Family: 1500,
  Film: 300,
  Miscellaneous: 300,
};

// Venue tours, exhibitions, museum tickets and the like are all-day trickles, not crowds.
const NOT_A_CROWD = /\btours?\b|tour experience|guided tour|visite|exposition|exhibition|entr[ée]e|billet|ticket d'entr|mus[ée]e|museum|aquarium|parking|hospitality|premium seating|vip package|meet and greet|post-game|pre-game|free throw|option tickets|opportunity|add-on|upgrade/i;

export function isCrowdEvent(e: TmEvent): boolean {
  if (NOT_A_CROWD.test(e.name)) return false;
  if ((e.segment === "Miscellaneous" || !e.segment) && e.attractions.length === 0) return false;
  return true;
}

export function estimateCapacity(e: TmEvent): number {
  if (!isCrowdEvent(e)) return 0;
  const tier = VENUE_TIERS.find((t) => t.match.test(e.venue.name));
  if (tier) return tier.capacity;
  return SEGMENT_DEFAULT[e.segment ?? ""] ?? 400;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export type Scored = {
  event: TmEvent;
  capacity: number; // people around (venue capacity, wave total, fans watching nearby...)
  distanceKm: number;
  hoursUntil: number;
  potentialGuests: number; // rough estimate of extra guests this moment could bring
  fill: number; // potentialGuests / seats
  score: number; // 0-100: share of the merchant's room this moment could fill, adjusted for timing
  interesting: boolean;
  reasons: string[];
};

// When the crowd is around: explicit window for moments, else arrival 2.5 h before and exit 1.5 h after the show.
export function presenceWindow(e: TmEvent): { arrive: number; start: number; end: number; leave: number } {
  const start = Date.parse(e.startsAt);
  const showMin = (e.segment ?? "").toLowerCase() === "sports" ? 150 : 165;
  const arrive = e.windowStart ? Date.parse(e.windowStart) : start - 150 * 60_000;
  const leave = e.windowEnd ? Date.parse(e.windowEnd) : start + (showMin + 90) * 60_000;
  const end = e.windowEnd && e.origin !== "ticketmaster" ? Math.max(start, leave - 30 * 60_000) : start + showMin * 60_000;
  return { arrive, start, end, leave };
}

// Share of the people around who may stop at a bar nearby. Rough, documented assumptions:
// venue and wave crowds pass by on their way in or out; TV crowds actively look for a bar to watch;
// street crowds wander.
const SHARE: Record<string, number> = { ticketmaster: 0.005, wave: 0.005, tv: 0.03, street: 0.003, calendar: 0.003 };

// Relevance is relative to the merchant: a 40-seat bar needs 10 extra guests, not 20,000 people.
export function scoreConcentration(e: TmEvent, merchant: { lat: number; lon: number; radiusM: number; seats?: number }, now = new Date()): Scored {
  const capacity = e.crowdEst ?? estimateCapacity(e);
  const distanceKm = haversineKm(merchant.lat, merchant.lon, e.venue.lat, e.venue.lon);
  const hoursUntil = (new Date(e.startsAt).getTime() - now.getTime()) / 3_600_000;
  const seats = Math.max(10, merchant.seats ?? 60);
  const radiusKm = merchant.radiusM / 1000;
  // Full weight inside the merchant radius, fades to 0 at 3x the radius. TV and calendar crowds are "around you" by construction.
  const walk = e.origin === "tv" || e.origin === "calendar" ? 1 : distanceKm <= radiusKm ? 1 : clamp(1 - (distanceKm - radiusKm) / (2 * radiusKm), 0, 1);
  const timing = hoursUntil < -3 ? 0 : hoursUntil <= 24 ? 1 : clamp(1 - (hoursUntil - 24) / 96, 0.5, 1);
  const potentialGuests = Math.round(capacity * walk * (SHARE[e.origin ?? "ticketmaster"] ?? 0.005));
  const fill = potentialGuests / seats;
  const score = Math.round(100 * clamp(fill, 0, 1) * timing);
  const reasons = [
    `${capacity.toLocaleString("en-US")} people around`,
    e.origin === "tv" ? "watching on TV nearby" : `${distanceKm.toFixed(1)} km from you`,
    `could bring about ${potentialGuests} guests, ${Math.round(fill * 100)}% of your ${seats} seats`,
  ];
  return { event: e, capacity, distanceKm, hoursUntil, potentialGuests, fill, score, interesting: fill >= 0.25 && potentialGuests >= 8 && capacity > 0, reasons };
}

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export function headliner(e: TmEvent): { name: string; qlooType: "artist" | "brand" | "person" | "movie" | "tv_show" | undefined } {
  // Moments made of several events are named after the moment, not after one of their members.
  if (e.origin && e.origin !== "ticketmaster") return { name: e.name, qlooType: undefined };
  const a = e.attractions[0];
  const name = a?.name ?? e.name;
  const seg = (a?.segment ?? e.segment ?? "").toLowerCase();
  if (seg === "music") return { name, qlooType: "artist" };
  if (seg === "sports") return { name, qlooType: "brand" }; // teams live as brands in Qloo
  if (seg === "comedy") return { name, qlooType: "person" };
  return { name, qlooType: undefined };
}
