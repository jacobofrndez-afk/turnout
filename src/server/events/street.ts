// Street and city events: parades, block parties, festivals, races, open streets, processions. Nobody sells a
// ticket, so Ticketmaster never sees them. New York publishes every permitted event (NYC Open Data, Socrata
// dataset tvpp-9vvx); Paris publishes "Que faire à Paris" (opendata.paris.fr). Neither gives a headcount:
// the size is a typical figure per kind of event, with overrides for the famous ones, and is shown as an estimate.
import { cacheGet, cacheSet } from "@/server/db/client";
import { geocode } from "@/server/merchants/geocode";
import { haversineKm } from "./concentration";
import { registerSource, type SourceMerchant } from "./sources";
import type { TmEvent } from "./ticketmaster";

const NYC = { lat: 40.7128, lon: -74.006 };
const PARIS = { lat: 48.8566, lon: 2.3522 };

// ---------- time zones ----------

// "2026-10-31T19:00:00.000" in a time zone -> UTC instant.
export function zonedToUtc(local: string, timeZone: string): Date {
  const asUtc = new Date(local.replace(/(\.\d+)?Z?$/, "Z"));
  const offset = tzOffsetMs(asUtc, timeZone);
  const guess = new Date(asUtc.getTime() - offset);
  // Second pass handles a DST change between the guess and the target.
  return new Date(asUtc.getTime() - tzOffsetMs(guess, timeZone));
}

function tzOffsetMs(at: Date, timeZone: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(at)
      .map((x) => [x.type, x.value]),
  );
  const wall = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour) % 24, Number(p.minute), Number(p.second));
  return wall - at.getTime();
}

// ---------- Manhattan grid geocoder ----------
// The Manhattan grid is rotated about 29 degrees east of true north. Streets are ~80 m apart; west-side avenues
// ~280 m; east-side avenues are closer together. Good to ~100 m between 14th and 110th Streets, which is enough
// for a radar. Anything else goes to Nominatim (cached).
const REF = { lat: 40.74845, lon: -73.98482, street: 34 }; // 5th Avenue & 34th Street
const STREET_M = 80;
const AVE_M = 280;
const AVENUES: [RegExp, number][] = [
  [/^(5|fifth) avenue$/, 0],
  [/^(6|sixth) avenue$|^avenue of (the )?americas$/, 1],
  [/^(7|seventh) avenue$/, 2],
  [/^(8|eighth) avenue$|^central park west$/, 3],
  [/^(9|ninth) avenue$|^columbus avenue$/, 4],
  [/^(10|tenth) avenue$|^amsterdam avenue$/, 5],
  [/^(11|eleventh) avenue$|^west end avenue$/, 6],
  [/^(12|twelfth) avenue$/, 7],
  [/^madison avenue$/, -0.5],
  [/^park avenue( south)?$/, -1],
  [/^lexington avenue$/, -1.5],
  [/^(3|third) avenue$/, -2.2],
  [/^(2|second) avenue$/, -2.9],
  [/^(1|first) avenue$/, -3.6],
  [/^york avenue$/, -4.3],
];
const avenueIndex = (s: string) => AVENUES.find(([re]) => re.test(s.trim().toLowerCase().replace(/\s+/g, " ")))?.[1];
const streetNumber = (s: string) => {
  const m = s.trim().toLowerCase().replace(/\s+/g, " ").match(/^(?:east |west )?(\d+) street$/);
  return m ? Number(m[1]) : undefined;
};

function gridPoint(street: number, avenue: number): { lat: number; lon: number } | undefined {
  if (street < 14 || street > 110) return undefined;
  const a = (29 * Math.PI) / 180;
  const up = (street - REF.street) * STREET_M; // along the grid's "north"
  const west = avenue * AVE_M; // along the grid's "west"
  const north = up * Math.cos(a) + west * Math.sin(a);
  const east = up * Math.sin(a) - west * Math.cos(a);
  return { lat: REF.lat + north / 111_320, lon: REF.lon + east / (111_320 * Math.cos((REF.lat * Math.PI) / 180)) };
}

// "WEST 42 STREET between 5 AVENUE and 6 AVENUE" or "10 AVENUE between WEST 57 STREET and WEST 58 STREET".
export function manhattanPoint(location: string): { lat: number; lon: number } | undefined {
  const first = location.split(/,|:/)[0];
  const m = first.match(/^\s*(.+?)\s+between\s+(.+?)\s+and\s+(.+?)\s*$/i);
  if (!m) return undefined;
  const [, main, a, b] = m;
  const st = streetNumber(main);
  if (st !== undefined) {
    const ia = avenueIndex(a);
    const ib = avenueIndex(b);
    if (ia === undefined || ib === undefined) return undefined;
    return gridPoint(st, (ia + ib) / 2);
  }
  const av = avenueIndex(main);
  const sa = streetNumber(a);
  const sb = streetNumber(b);
  if (av === undefined || sa === undefined || sb === undefined) return undefined;
  return gridPoint((sa + sb) / 2, av);
}

// ---------- crowd sizes ----------
// Typical people present at once, by kind of event, and famous events that are much bigger.
const NYC_TYPE_SIZE: Record<string, number> = {
  Parade: 5000,
  "Street Event": 600,
  "Block Party": 400,
  "Single Block Festival": 1500,
  "Street Festival": 5000,
  "Athletic Race / Tour": 2000,
  "Plaza Partner Event": 300,
  "Plaza Event": 300,
  "Open Street Partner Event": 1000,
  "Religious Event": 1500,
  "Special Event": 800,
};
const FAMOUS: { match: RegExp; people: number; theme?: string }[] = [
  { match: /village halloween parade/i, people: 60000, theme: "halloween" }, // ~1M spectators along 6th Ave; the share near one bar
  { match: /new york city marathon|tcs new york city marathon/i, people: 40000, theme: "marathon" },
  { match: /thanksgiving day parade/i, people: 60000 },
  { match: /pride march/i, people: 50000 },
  { match: /halloween/i, people: 2000, theme: "halloween" },
  { match: /marathon/i, people: 8000, theme: "marathon" },
  { match: /\b(5k|10k|race|run)\b/i, people: 1500, theme: "running" },
  { match: /festival|fest\b/i, people: 2500 },
];

const PARIS_TAG_SIZE: [RegExp, number][] = [
  [/f[êe]te|festival/i, 2500],
  [/d[ée]fil[ée]|parade|carnaval/i, 5000],
  [/brocante|vide.grenier|march[ée]/i, 1500],
  [/concert|musique/i, 600],
  [/sport|course|marathon/i, 1500],
];

// Kinds of events that bring no crowd worth a campaign: filming permits, construction, farmers markets
// (an all-day trickle), sidewalk sales, workshops.
const NYC_SKIP = /production event|theater load|construction|farmers market|sidewalk sale|health outreach|open enrollment/i;
const PARIS_SKIP = /atelier|cours|stage|conf[ée]rence|exposition|visite|club seniors|permanence|lecture|projection/i;

type StreetRow = { id: string; name: string; type: string; start: Date; end: Date; lat: number; lon: number; where: string; people: number; theme?: string; source: string };

// ---------- New York ----------
type NycRaw = { event_id: string; event_name: string; start_date_time: string; end_date_time: string; event_type: string; event_borough: string; event_location: string };

async function nycRows(m: SourceMerchant, now: Date, hoursAhead: number): Promise<StreetRow[]> {
  const from = new Date(now.getTime() - 6 * 3_600_000);
  const to = new Date(now.getTime() + hoursAhead * 3_600_000);
  const local = (d: Date) => new Intl.DateTimeFormat("sv-SE", { timeZone: "America/New_York", dateStyle: "short", timeStyle: "medium", hourCycle: "h23" }).format(d).replace(" ", "T");
  const where = `end_date_time >= '${local(from)}' AND start_date_time <= '${local(to)}' AND event_borough = 'Manhattan'`;
  const key = { where, bucket: Math.floor(now.getTime() / (3 * 3_600_000)) };
  let raw = cacheGet<NycRaw[]>("nyc-events", key);
  if (!raw) {
    const q = new URLSearchParams({ $where: where, $limit: "2000", $order: "start_date_time" });
    const res = await fetch(`https://data.cityofnewyork.us/resource/tvpp-9vvx.json?${q}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`NYC Open Data HTTP ${res.status}`);
    raw = (await res.json()) as NycRaw[];
    cacheSet("nyc-events", key, raw, 3 * 3600);
  }
  const out: StreetRow[] = [];
  let lookups = 0;
  for (const r of raw) {
    if (NYC_SKIP.test(r.event_type) || NYC_SKIP.test(r.event_name)) continue;
    const start = zonedToUtc(r.start_date_time, "America/New_York");
    const end = zonedToUtc(r.end_date_time, "America/New_York");
    // Multi-day permits are installations, not crowds.
    if (end.getTime() - start.getTime() > 14 * 3_600_000) continue;
    let p = manhattanPoint(r.event_location);
    if (!p && lookups < 3) {
      // Off-grid (downtown, plazas): Nominatim, cached for a month, a few per run to respect its rate limit.
      lookups++;
      const g = await geocode(`${nominatimQuery(r.event_location)}, Manhattan, New York, NY`).catch(() => undefined);
      if (g) p = { lat: g.lat, lon: g.lon };
    }
    if (!p) continue;
    const famous = FAMOUS.find((f) => f.match.test(r.event_name));
    out.push({
      id: r.event_id,
      name: tidy(r.event_name),
      type: r.event_type,
      start,
      end,
      lat: p.lat,
      lon: p.lon,
      where: tidy(r.event_location.split(/,|:/)[0]),
      people: famous?.people ?? NYC_TYPE_SIZE[r.event_type] ?? 500,
      theme: famous?.theme,
      source: "NYC Open Data, permitted events",
    });
  }
  return out;
}

function nominatimQuery(location: string): string {
  const first = location.split(/,|:/)[0];
  const m = first.match(/^\s*(.+?)\s+between\s+(.+?)\s+and/i);
  return tidy(m ? `${m[1]} & ${m[2]}` : first);
}

const tidy = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\b(\d+) (Street|Avenue)\b/g, "$1 $2");

// ---------- Paris ----------
type ParisRaw = { id: string; title: string; date_start: string; date_end: string; address_name?: string; address_street?: string; qfap_tags?: string; lat_lon?: { lat: number; lon: number } };

async function parisRows(m: SourceMerchant, now: Date, hoursAhead: number): Promise<StreetRow[]> {
  const from = new Date(now.getTime() - 6 * 3_600_000).toISOString().slice(0, 19);
  const to = new Date(now.getTime() + hoursAhead * 3_600_000).toISOString().slice(0, 19);
  const radius = Math.max(1500, Math.min(3000, m.radiusM * 2));
  const where = `within_distance(lat_lon, geom'POINT(${m.lon} ${m.lat})', ${radius}m) AND date_end >= '${from}' AND date_start <= '${to}'`;
  const key = { where: where.replace(/\d{2}:\d{2}:\d{2}/g, ""), bucket: Math.floor(now.getTime() / (3 * 3_600_000)) };
  let raw = cacheGet<ParisRaw[]>("paris-events", key);
  if (!raw) {
    const q = new URLSearchParams({ where, limit: "100", select: "id,title,date_start,date_end,address_name,address_street,qfap_tags,lat_lon" });
    const res = await fetch(`https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records?${q}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Paris Open Data HTTP ${res.status}`);
    raw = ((await res.json()) as { results?: ParisRaw[] }).results ?? [];
    cacheSet("paris-events", key, raw, 3 * 3600);
  }
  const out: StreetRow[] = [];
  for (const r of raw) {
    if (!r.lat_lon || PARIS_SKIP.test(`${r.title} ${r.qfap_tags ?? ""}`)) continue;
    const start = new Date(r.date_start);
    const end = new Date(r.date_end);
    if (end.getTime() - start.getTime() > 14 * 3_600_000) continue; // long runs and seasons are not moments
    const size = PARIS_TAG_SIZE.find(([re]) => re.test(`${r.qfap_tags ?? ""} ${r.title}`))?.[1];
    if (!size) continue;
    const famous = FAMOUS.find((f) => f.match.test(r.title));
    out.push({
      id: r.id,
      name: r.title.trim(),
      type: (r.qfap_tags ?? "").split(";")[0] || "Événement",
      start,
      end,
      lat: r.lat_lon.lat,
      lon: r.lat_lon.lon,
      where: r.address_name ?? r.address_street ?? "",
      people: famous?.people ?? size,
      theme: famous?.theme,
      source: "Que faire à Paris (Ville de Paris)",
    });
  }
  return out;
}

// Taste themes: a street crowd has no headliner, so Qloo reads it through a theme tag (demographics) and, when
// available, a few well-known entities that stand for the theme (place taste, heatmap).
export const THEMES: Record<string, { tags: { id: string; name: string }[]; proxies: { query: string; type: string }[] }> = {
  halloween: {
    tags: [{ id: "urn:tag:keyword:qloo:halloween", name: "Halloween" }],
    proxies: [{ query: "Hocus Pocus", type: "movie" }, { query: "Beetlejuice", type: "movie" }, { query: "The Nightmare Before Christmas", type: "movie" }],
  },
  marathon: {
    tags: [{ id: "urn:tag:genre:brand:fashion:footwear:sneaker:running", name: "Running sneakers" }],
    proxies: [{ query: "Asics", type: "brand" }, { query: "Saucony", type: "brand" }, { query: "Nike Training Club", type: "brand" }],
  },
  running: {
    tags: [{ id: "urn:tag:genre:brand:fashion:footwear:sneaker:running", name: "Running sneakers" }],
    proxies: [{ query: "Asics", type: "brand" }, { query: "Saucony", type: "brand" }],
  },
};

export async function streetMoments(m: SourceMerchant, now: Date, hoursAhead: number): Promise<TmEvent[]> {
  const nyc = haversineKm(m.lat, m.lon, NYC.lat, NYC.lon) <= 30;
  const rows = nyc ? await nycRows(m, now, hoursAhead) : await parisRows(m, now, hoursAhead);
  const reachKm = (m.radiusM / 1000) * 2; // scoring fades to zero at 3x the radius; keep a bit less
  return rows
    .filter((r) => r.end.getTime() > now.getTime() && haversineKm(m.lat, m.lon, r.lat, r.lon) <= reachKm)
    .map((r) => {
      const theme = r.theme ? THEMES[r.theme] : undefined;
      return {
        id: `street_${m.id}_${r.id}`,
        name: r.name,
        startsAt: r.start.toISOString(),
        windowStart: r.start.toISOString(),
        windowEnd: new Date(r.end.getTime() + 60 * 60_000).toISOString(),
        origin: "street" as const,
        crowdEst: r.people,
        segment: "Street",
        genre: r.type,
        venue: { name: r.where, lat: r.lat, lon: r.lon },
        attractions: [{ name: r.name }],
        meta: {
          kind: "street",
          type: r.type,
          source: r.source,
          theme: r.theme ?? null,
          windowLabel: "While the street is busy",
          windowWhy: `${r.name} fills ${r.where || "the street"} from ${r.start.toISOString().slice(11, 16)} UTC; people linger nearby for about an hour after it ends.`,
          why: `${r.type} published by ${r.source}. About ${r.people.toLocaleString("en-US")} people is a typical figure for this kind of event, not a count.`,
          // Resolved into Qloo entities when the crowd is profiled; tags work directly.
          signal: theme ? { tags: theme.tags.map((t) => ({ ...t, type: "tag" })), entities: [] } : undefined,
          themeProxies: theme?.proxies ?? [],
        },
      };
    });
}

registerSource({
  id: "street",
  appliesTo: (m) => haversineKm(m.lat, m.lon, NYC.lat, NYC.lon) <= 30 || haversineKm(m.lat, m.lon, PARIS.lat, PARIS.lon) <= 15,
  fetch: streetMoments,
});
