// Calendar moments: nights when the whole city goes out (Halloween, Thanksgiving Eve, Beaujolais Nouveau,
// Fête de la Musique, New Year's Eve). The date is a fixed fact, so no feed is needed; Qloo reads the crowd
// through the theme (tags for demographics, well-known entities that stand for it for place taste).
import { haversineKm } from "./concentration";
import { registerSource, type SourceMerchant } from "./sources";
import { THEMES, zonedToUtc } from "./street";
import type { TmEvent } from "./ticketmaster";

type Occasion = {
  id: string;
  name: string;
  // Local date of the evening, for a given year.
  date: (year: number) => { month: number; day: number };
  from: string; // local "HH:MM"
  hours: number; // how long the night lasts
  goingOut: number; // share of people around who go out for it
  why: string;
  theme?: keyof typeof THEMES;
  tags?: { id: string; name: string }[];
  proxies?: { query: string; type: string }[];
};

const fixed = (month: number, day: number) => () => ({ month, day });
// nth weekday of a month (weekday 0 = Sunday)
const nth = (month: number, weekday: number, n: number) => (year: number) => {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  return { month, day: 1 + ((weekday - first + 7) % 7) + (n - 1) * 7 };
};
// Thanksgiving Eve: the Wednesday before the 4th Thursday of November
const thanksgivingEve = (year: number) => {
  const t = nth(11, 4, 4)(year);
  return { month: 11, day: t.day - 1 };
};

const CITY: { id: string; lat: number; lon: number; timezone: string; density: number; occasions: Occasion[] }[] = [
  {
    id: "nyc",
    lat: 40.7128,
    lon: -74.006,
    timezone: "America/New_York",
    density: 20_000,
    occasions: [
      { id: "halloween", name: "Halloween night", date: fixed(10, 31), from: "18:00", hours: 8, goingOut: 0.1, theme: "halloween", why: "New York's biggest costume night; bars fill from early evening, parades and parties all over the city." },
      { id: "thanksgiving-eve", name: "Thanksgiving Eve", date: thanksgivingEve, from: "20:00", hours: 6, goingOut: 0.12, why: "The night before Thanksgiving is one of the busiest bar nights of the year: people are home for the holiday and meet old friends." },
      { id: "nye", name: "New Year's Eve", date: fixed(12, 31), from: "20:00", hours: 7, goingOut: 0.15, why: "Everybody is out; most people choose their bar days in advance." },
      { id: "st-patricks", name: "St. Patrick's Day", date: fixed(3, 17), from: "12:00", hours: 14, goingOut: 0.12, why: "The parade on Fifth Avenue and an all-day pub crawl across Manhattan." },
    ],
  },
  {
    id: "paris",
    lat: 48.8566,
    lon: 2.3522,
    timezone: "Europe/Paris",
    density: 21_000,
    occasions: [
      { id: "halloween", name: "Soirée d'Halloween", date: fixed(10, 31), from: "20:00", hours: 6, goingOut: 0.03, theme: "halloween", why: "Smaller than in New York but growing, mostly among people under 35: costume parties in bars and clubs." },
      { id: "beaujolais", name: "Beaujolais Nouveau", date: nth(11, 4, 3), from: "18:00", hours: 7, goingOut: 0.05, why: "The third Thursday of November, bars and wine bars uncork the new Beaujolais; a classic after-work night out.", tags: [{ id: "urn:tag:genre:place:restaurant:wine_bar", name: "Wine bar" }] },
      { id: "fete-musique", name: "Fête de la Musique", date: fixed(6, 21), from: "18:00", hours: 8, goingOut: 0.25, why: "Music on every corner; the whole city is in the street until late." },
      { id: "nye", name: "Réveillon du Nouvel An", date: fixed(12, 31), from: "20:00", hours: 7, goingOut: 0.12, why: "Most people celebrate out or at friends'; bars that announce a plan early fill first." },
      { id: "st-patricks", name: "Saint-Patrick", date: fixed(3, 17), from: "18:00", hours: 7, goingOut: 0.04, why: "Irish pubs and beer bars fill after work." },
    ],
  },
];

export async function calendarMoments(m: SourceMerchant, now: Date, hoursAhead: number): Promise<TmEvent[]> {
  const city = CITY.find((c) => haversineKm(m.lat, m.lon, c.lat, c.lon) <= 60);
  if (!city) return [];
  const radiusKm = Math.min(2, m.radiusM / 1000);
  const people = city.density * Math.PI * radiusKm * radiusKm;
  const out: TmEvent[] = [];
  const year = now.getUTCFullYear();
  for (const o of city.occasions) {
    for (const y of [year, year + 1]) {
      const { month, day } = o.date(y);
      const start = zonedToUtc(`${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${o.from}:00`, city.timezone);
      const end = new Date(start.getTime() + o.hours * 3_600_000);
      if (end.getTime() < now.getTime() || start.getTime() > now.getTime() + hoursAhead * 3_600_000) continue;
      const theme = o.theme ? THEMES[o.theme] : undefined;
      const tags = [...(theme?.tags ?? []), ...(o.tags ?? [])];
      out.push({
        id: `calendar_${m.id}_${o.id}_${y}`,
        name: o.name,
        startsAt: start.toISOString(),
        windowStart: start.toISOString(),
        windowEnd: end.toISOString(),
        origin: "calendar",
        crowdEst: Math.round(people * o.goingOut),
        segment: "Calendar",
        genre: "City night",
        venue: { name: "The whole neighbourhood", lat: m.lat, lon: m.lon },
        attractions: [{ name: o.name }],
        meta: {
          kind: "calendar",
          occasion: o.id,
          windowLabel: "The night itself",
          windowWhy: o.why,
          why: `${o.why} About ${Math.round(o.goingOut * 100)}% of the people around you go out that night: an assumption, not a count.`,
          signal: tags.length ? { tags: tags.map((t) => ({ ...t, type: "tag" })), entities: [] } : undefined,
          themeProxies: theme?.proxies ?? o.proxies ?? [],
        },
      });
    }
  }
  return out;
}

registerSource({ id: "calendar", appliesTo: (m) => CITY.some((c) => haversineKm(m.lat, m.lon, c.lat, c.lon) <= 60), fetch: calendarMoments });
