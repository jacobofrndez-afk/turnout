// Moments made of several small events: when many shows around the merchant start or end at the same time,
// their audiences arrive or leave together. One 1,000-seat theatre is not worth a campaign; twelve of them
// letting out at 22:30 within a kilometre are.
import type { TmEvent } from "./ticketmaster";
import { presenceWindow, type Scored } from "./concentration";

const SLOT = 30 * 60_000;

type Phase = "arrival" | "exit";

function phaseOf(e: TmEvent, kind: Phase): [number, number] {
  const w = presenceWindow(e);
  return kind === "arrival" ? [w.start - 120 * 60_000, w.start] : [w.end, w.end + 60 * 60_000];
}

function crowdLabel(members: Scored[]): string {
  const bySeg = new Map<string, number>();
  for (const m of members) bySeg.set(m.event.segment ?? "Other", (bySeg.get(m.event.segment ?? "Other") ?? 0) + m.capacity);
  const top = [...bySeg.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  if (/theatre|arts/i.test(top)) return "Theatre crowd";
  if (/music/i.test(top)) return "Concert crowd";
  if (/comedy/i.test(top)) return "Comedy crowd";
  if (/sports/i.test(top)) return "Sports crowd";
  return "Evening crowd";
}

export function detectWaves(
  scored: Scored[],
  merchant: { id: string; lat: number; lon: number; radiusM: number; seats: number },
  now: Date,
  hoursAhead: number,
): TmEvent[] {
  const radiusKm = merchant.radiusM / 1000;
  // Small and mid-size crowds within the radius; big standalone crowds are moments on their own.
  const pool = scored.filter((s) => s.capacity > 0 && !s.interesting && s.distanceKm <= radiusKm && (s.event.origin ?? "ticketmaster") === "ticketmaster");
  const t0 = Math.floor(now.getTime() / SLOT) * SLOT;
  const n = Math.ceil((hoursAhead * 3_600_000) / SLOT);
  const share = 0.005;
  const minGuests = Math.max(8, 0.25 * merchant.seats);
  const waves: TmEvent[] = [];

  for (const kind of ["arrival", "exit"] as Phase[]) {
    const people = new Array(n).fill(0);
    const who: Scored[][] = Array.from({ length: n }, () => []);
    for (const s of pool) {
      const [a, b] = phaseOf(s.event, kind);
      for (let i = Math.max(0, Math.floor((a - t0) / SLOT)); i < Math.min(n, Math.ceil((b - t0) / SLOT)); i++) {
        people[i] += s.capacity;
        who[i].push(s);
      }
    }
    // Peaks: local maxima strong enough to fill a quarter of the room, made of at least three events.
    const candidates = people
      .map((p, i) => ({ i, p }))
      .filter(({ i, p }) => p * share >= minGuests && who[i].length >= 3 && p >= Math.max(...people.slice(Math.max(0, i - 3), i + 4)))
      .sort((a, b) => b.p - a.p);
    const taken: number[] = [];
    for (const c of candidates) {
      if (taken.some((t) => Math.abs(t - c.i) <= 4)) continue;
      taken.push(c.i);
      const peak = t0 + c.i * SLOT;
      const members = [...new Map(who[c.i].map((m) => [m.event.id, m])).values()].sort((a, b) => b.capacity - a.capacity);
      const total = members.reduce((acc, m) => acc + m.capacity, 0);
      const lat = members.reduce((acc, m) => acc + m.event.venue.lat * m.capacity, 0) / total;
      const lon = members.reduce((acc, m) => acc + m.event.venue.lon * m.capacity, 0) / total;
      const label = crowdLabel(members);
      const windowStart = kind === "arrival" ? peak - 60 * 60_000 : peak - 15 * 60_000;
      const windowEnd = kind === "arrival" ? peak + 30 * 60_000 : peak + 60 * 60_000;
      const iso = new Date(peak).toISOString().slice(0, 16);
      waves.push({
        id: `wave_${merchant.id}_${kind}_${iso.replace(/[^0-9]/g, "")}`,
        name: `${label} ${kind === "arrival" ? "arriving" : "letting out"}, ${members.length} shows`,
        startsAt: new Date(peak).toISOString(),
        windowStart: new Date(windowStart).toISOString(),
        windowEnd: new Date(windowEnd).toISOString(),
        origin: "wave",
        crowdEst: total,
        segment: members[0]?.event.segment,
        venue: { name: `${members.length} venues around you`, lat, lon },
        attractions: members.slice(0, 6).map((m) => m.event.attractions[0] ?? { name: m.event.name, segment: m.event.segment }),
        meta: { kind, count: members.length, members: members.slice(0, 40).map((m) => ({ id: m.event.id, name: m.event.attractions[0]?.name ?? m.event.name, venue: m.event.venue.name, capacity: m.capacity, startsAt: m.event.startsAt, segment: m.event.attractions[0]?.segment ?? m.event.segment })) },
      });
    }
  }
  return waves.filter((w) => Date.parse(w.windowEnd!) > now.getTime());
}
