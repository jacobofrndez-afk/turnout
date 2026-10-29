// Ticketmaster Discovery API client: events around a point, deduplicated and cached.
import { cacheGet, cacheSet, getDb } from "@/server/db/client";
import { requireEnv } from "@/server/env";
import { sourceCheck } from "@/lib/event-evidence";

export type Attraction = { id?: string; name: string; segment?: string; genre?: string };

export type TmEvent = {
  id: string;
  name: string;
  url?: string;
  imageUrl?: string;
  startsAt: string; // ISO UTC
  timezone?: string;
  status?: string;
  segment?: string;
  genre?: string;
  venue: { id?: string; name: string; lat: number; lon: number; city?: string; country?: string };
  attractions: Attraction[];
  distanceKm?: number;
  // Moments that are not a single Ticketmaster event (waves of small shows, games on TV, street events).
  origin?: "ticketmaster" | "wave" | "tv" | "street" | "calendar";
  windowStart?: string; // ISO; when the crowd is around (defaults to arrival before start, exit after end)
  windowEnd?: string;
  crowdEst?: number; // people around, when not derived from the venue
  meta?: Record<string, unknown>;
};

export type RawEvent = {
  id: string;
  name: string;
  test?: boolean;
  url?: string;
  images?: { url: string; width: number; ratio?: string }[];
  distance?: number;
  dates?: { start?: { dateTime?: string; localDate?: string; localTime?: string; dateTBD?: boolean; dateTBA?: boolean; timeTBA?: boolean; noSpecificTime?: boolean }; timezone?: string; status?: { code?: string } };
  classifications?: { segment?: { name?: string }; genre?: { name?: string } }[];
  _embedded?: {
    venues?: { id?: string; name?: string; city?: { name?: string }; country?: { countryCode?: string }; location?: { latitude?: string; longitude?: string } }[];
    attractions?: { id?: string; name?: string; classifications?: { segment?: { name?: string }; genre?: { name?: string } }[] }[];
  };
};

const API = "https://app.ticketmaster.com/discovery/v2/events.json";
const PAGE_SIZE = 200; // Ticketmaster maximum
const MAX_PAGES = 5; // size * page must stay <= 1000

export type FetchArgs = { lat: number; lon: number; radiusKm: number; hoursAhead: number };

export async function fetchEventsNear(args: FetchArgs, refresh = false): Promise<TmEvent[]> {
  const cacheInput = { ...args, version: 2, lookbackH: 5, bucket: Math.floor(Date.now() / 3_600_000) };
  const cached = refresh ? undefined : cacheGet<TmEvent[]>("ticketmaster", cacheInput);
  if (cached) return cached.map((e) => ({ ...e, meta: { ...e.meta, sourceCheck: { ...sourceCheck(e.meta), mode: "cache" } } }));

  const key = requireEnv("TICKETMASTER_API_KEY");
  const now = new Date();
  const end = new Date(now.getTime() + args.hoursAhead * 3_600_000);
  const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z/, "Z");
  const raw: RawEvent[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const q = new URLSearchParams({
      apikey: key,
      latlong: `${args.lat},${args.lon}`,
      radius: String(Math.max(1, Math.round(args.radiusKm))),
      unit: "km",
      locale: "*", // required to see non-US markets (Paris returns 0 without it)
      startDateTime: iso(new Date(now.getTime() - 5 * 3_600_000)), // shows that started still have their after-show crowd (presenceWindow leave = start + 4 h 15)
      endDateTime: iso(end),
      size: String(PAGE_SIZE),
      page: String(page),
      sort: "date,asc",
    });
    const res = await fetch(`${API}?${q}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Ticketmaster HTTP ${res.status}`);
    const body = (await res.json()) as { _embedded?: { events?: RawEvent[] }; page?: { totalPages?: number } };
    raw.push(...(body._embedded?.events ?? []));
    if ((body.page?.totalPages ?? 1) <= page + 1) break;
  }
  const checkedAt = new Date().toISOString();
  const normalized = raw.map((e) => normalize(e, checkedAt));
  // A source correction must also invalidate an older saved row, otherwise an outage can resurrect it.
  const invalidate = getDb().prepare("UPDATE events SET status = ? WHERE id = ?");
  raw.forEach((event, i) => {
    if (!normalized[i]) invalidate.run(["cancelled", "canceled", "postponed"].includes(event.dates?.status?.code ?? "") ? event.dates!.status!.code : "unconfirmed", event.id);
  });
  const events = dedupe(normalized.filter((e): e is TmEvent => e !== null));
  cacheSet("ticketmaster", cacheInput, events, 3600);
  return events;
}

export function normalize(e: RawEvent, checkedAt: string): TmEvent | null {
  const start = e.dates?.start;
  if (e.test || start?.dateTBD || start?.dateTBA || start?.timeTBA || start?.noSpecificTime) return null;
  if (["cancelled", "canceled", "postponed"].includes(e.dates?.status?.code?.toLowerCase() ?? "")) return null;
  const v = e._embedded?.venues?.[0];
  const lat = Number(v?.location?.latitude);
  const lon = Number(v?.location?.longitude);
  // A local date without an exact instant is not a confirmed performance time. Never invent 20:00 or treat local time as UTC.
  const startsAt = start?.dateTime;
  if (!e.id || !e.name?.trim() || !v?.name || !v.location?.latitude?.trim() || !v.location?.longitude?.trim() || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !startsAt || !Number.isFinite(Date.parse(startsAt)) || !/(?:Z|[+-]\d{2}:\d{2})$/.test(startsAt)) return null;
  const cls = e.classifications?.[0];
  const image = (e.images ?? []).filter((i) => i.ratio === "16_9").sort((a, b) => b.width - a.width)[0] ?? e.images?.[0];
  return {
    id: e.id,
    name: e.name.trim(),
    url: e.url,
    imageUrl: image?.url,
    startsAt,
    timezone: e.dates?.timezone,
    status: e.dates?.status?.code,
    segment: clean(cls?.segment?.name),
    genre: clean(cls?.genre?.name),
    venue: { id: v.id, name: v.name.trim(), lat, lon, city: v.city?.name, country: v.country?.countryCode },
    attractions: (e._embedded?.attractions ?? [])
      .filter((a) => a.name)
      .map((a) => ({ id: a.id, name: a.name!.trim(), segment: clean(a.classifications?.[0]?.segment?.name), genre: clean(a.classifications?.[0]?.genre?.name) })),
    distanceKm: e.distance,
    origin: "ticketmaster",
    meta: { sourceCheck: { source: "Ticketmaster", checkedAt, mode: "live" } },
  };
}

const clean = (s?: string) => (s && s.toLowerCase() !== "undefined" ? s : undefined);

// Ticketmaster lists the same show several times (outlets, premium seating, duplicate venue records).
// Keep one row per (headliner or name, venue, start hour).
function dedupe(events: TmEvent[]): TmEvent[] {
  const seen = new Map<string, TmEvent>();
  for (const e of events) {
    const who = (e.attractions[0]?.name ?? e.name).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const venue = e.venue.name.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").slice(0, 2).join(" ");
    const hour = e.startsAt.slice(0, 13);
    const k = `${who}|${venue}|${hour}`;
    const prev = seen.get(k);
    if (!prev || (e.attractions.length > prev.attractions.length)) seen.set(k, e);
  }
  return [...seen.values()];
}
