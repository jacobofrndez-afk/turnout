// Radar: events near a merchant, scored and persisted.
import { getDb } from "@/server/db/client";
import { fetchEventsNear, type TmEvent } from "./ticketmaster";
import { scoreConcentration, headliner, type Scored } from "./concentration";
import { detectWaves } from "./moments";

export type Merchant = {
  id: string;
  name: string;
  kind: string;
  address: string | null;
  lat: number;
  lon: number;
  city: string;
  timezone: string;
  radius_m: number;
  voice: string | null;
  seats: number;
};

export function getMerchant(id: string): Merchant | undefined {
  return getDb().prepare("SELECT * FROM merchants WHERE id = ?").get(id) as Merchant | undefined;
}

export function listMerchants(): Merchant[] {
  return getDb().prepare("SELECT * FROM merchants ORDER BY city").all() as Merchant[];
}

export type RadarItem = Scored & { headliner: { name: string; qlooType?: string } };

export async function radarFor(merchant: Merchant, hoursAhead = 72): Promise<RadarItem[]> {
  // Look a bit wider than the merchant radius so big venues just outside still register.
  const radiusKm = Math.max(3, (merchant.radius_m / 1000) * 3);
  let events: TmEvent[];
  try {
    events = await fetchEventsNear({ lat: merchant.lat, lon: merchant.lon, radiusKm, hoursAhead });
    persist(events);
  } catch (e) {
    // Ticketmaster down or key missing: serve what we already stored around this point.
    events = storedEventsNear(merchant, radiusKm, hoursAhead);
    if (events.length === 0) throw e;
  }
  const now = new Date();
  const m = { lat: merchant.lat, lon: merchant.lon, radiusM: merchant.radius_m, seats: merchant.seats ?? 60 };
  const scored = events.map((e) => scoreConcentration(e, m, now));
  // Waves: several small shows starting or ending together near the merchant.
  const waves = detectWaves(scored, { id: merchant.id, ...m }, now, hoursAhead);
  persist(waves);
  return [...scored, ...waves.map((w) => scoreConcentration(w, m, now))]
    .map((s) => ({ ...s, headliner: headliner(s.event) }))
    .filter((s) => s.hoursUntil > -3 || (s.event.windowEnd && Date.parse(s.event.windowEnd) > now.getTime()))
    .sort((a, b) => b.score - a.score || a.hoursUntil - b.hoursUntil);
}

// Fallback source: events persisted earlier within the radius and time window.
function storedEventsNear(merchant: Merchant, radiusKm: number, hoursAhead: number): TmEvent[] {
  const deg = radiusKm / 111;
  const rows = getDb()
    .prepare(
      `SELECT * FROM events WHERE origin = 'ticketmaster' AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? AND starts_at BETWEEN datetime('now', '-3 hours') AND datetime('now', ?) ORDER BY starts_at`,
    )
    .all(merchant.lat - deg, merchant.lat + deg, merchant.lon - deg / Math.cos((merchant.lat * Math.PI) / 180), merchant.lon + deg / Math.cos((merchant.lat * Math.PI) / 180), `+${Math.round(hoursAhead)} hours`) as {
    id: string; name: string; venue_name: string; venue_id: string | null; lat: number; lon: number; starts_at: string; timezone: string | null; segment: string | null; genre: string | null; attractions_json: string; status: string | null; url: string | null; image_url: string | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    url: r.url ?? undefined,
    imageUrl: r.image_url ?? undefined,
    startsAt: r.starts_at,
    timezone: r.timezone ?? undefined,
    status: r.status ?? undefined,
    segment: r.segment ?? undefined,
    genre: r.genre ?? undefined,
    venue: { id: r.venue_id ?? undefined, name: r.venue_name, lat: r.lat, lon: r.lon },
    attractions: JSON.parse(r.attractions_json),
  }));
}

function persist(events: TmEvent[]): void {
  const db = getDb();
  const stmt = db.prepare(
    `INSERT INTO events (id, name, venue_name, venue_id, lat, lon, starts_at, timezone, segment, genre, attractions_json, status, url, image_url, fetched_at, origin, window_start, window_end, crowd_est, meta_json)
     VALUES (@id, @name, @venue_name, @venue_id, @lat, @lon, @starts_at, @timezone, @segment, @genre, @attractions_json, @status, @url, @image_url, datetime('now'), @origin, @window_start, @window_end, @crowd_est, @meta_json)
     ON CONFLICT(id) DO UPDATE SET name=excluded.name, venue_name=excluded.venue_name, lat=excluded.lat, lon=excluded.lon, starts_at=excluded.starts_at, status=excluded.status, attractions_json=excluded.attractions_json, fetched_at=excluded.fetched_at,
       origin=excluded.origin, window_start=excluded.window_start, window_end=excluded.window_end, crowd_est=excluded.crowd_est, meta_json=excluded.meta_json`,
  );
  const tx = db.transaction((rows: TmEvent[]) => {
    for (const e of rows) {
      stmt.run({
        id: e.id,
        name: e.name,
        venue_name: e.venue.name,
        venue_id: e.venue.id ?? null,
        lat: e.venue.lat,
        lon: e.venue.lon,
        starts_at: e.startsAt,
        timezone: e.timezone ?? null,
        segment: e.segment ?? null,
        genre: e.genre ?? null,
        attractions_json: JSON.stringify(e.attractions),
        status: e.status ?? null,
        url: e.url ?? null,
        image_url: e.imageUrl ?? null,
        origin: e.origin ?? "ticketmaster",
        window_start: e.windowStart ?? null,
        window_end: e.windowEnd ?? null,
        crowd_est: e.crowdEst ?? null,
        meta_json: e.meta ? JSON.stringify(e.meta) : null,
      });
    }
  });
  tx(events);
}
