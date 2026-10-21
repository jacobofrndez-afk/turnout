// Games on TV: the crowd that never enters a stadium. When the local team plays (away, or at home in an arena
// far from the merchant), its fans watch in bars around the city. The schedule comes from ESPN's public site API;
// Qloo resolves the team (a brand) and measures how much these streets love it (heatmap). No headcount exists
// for this crowd, so the size is a documented estimate, shown as such.
import { cacheGet, cacheSet } from "@/server/db/client";
import { searchEntities, localFandom } from "@/server/qloo/api";
import { haversineKm } from "./concentration";
import { registerSource, type SourceMerchant } from "./sources";
import type { TmEvent } from "./ticketmaster";

type Team = { espn: string; short: string; qloo: string; aliases?: string[]; fan: Record<string, number> };
type Venue = { match: RegExp; lat: number; lon: number };
type Metro = { id: string; lat: number; lon: number; density: number; leagues: string[]; teams: Team[]; venues: Venue[] };

// Share of the people living or working around the merchant who follow the team closely enough to watch the game.
// Rough, published-attendance-and-ratings level assumptions; tuned per league and competition.
const METROS: Metro[] = [
  {
    id: "nyc",
    lat: 40.7128,
    lon: -74.006,
    density: 20_000, // people per km² around a Manhattan or Brooklyn bar in the evening
    leagues: ["basketball/nba", "hockey/nhl", "football/nfl", "soccer/usa.1"],
    teams: [
      { espn: "New York Knicks", short: "Knicks", qloo: "New York Knicks", fan: { "basketball/nba": 0.15 } },
      { espn: "Brooklyn Nets", short: "Nets", qloo: "Brooklyn Nets", fan: { "basketball/nba": 0.06 } },
      { espn: "New York Rangers", short: "Rangers", qloo: "New York Rangers", fan: { "hockey/nhl": 0.08 } },
      { espn: "New York Islanders", short: "Islanders", qloo: "New York Islanders", fan: { "hockey/nhl": 0.04 } },
      { espn: "New Jersey Devils", short: "Devils", qloo: "New Jersey Devils", fan: { "hockey/nhl": 0.03 } },
      { espn: "New York Giants", short: "Giants", qloo: "New York Giants", fan: { "football/nfl": 0.2 } },
      { espn: "New York Jets", short: "Jets", qloo: "New York Jets", fan: { "football/nfl": 0.15 } },
      { espn: "New York City FC", short: "NYCFC", qloo: "New York City FC", fan: { "soccer/usa.1": 0.03 } },
      { espn: "Red Bull New York", short: "Red Bulls", qloo: "New York Red Bulls", fan: { "soccer/usa.1": 0.02 } },
    ],
    venues: [
      { match: /madison square garden/i, lat: 40.7505, lon: -73.9934 },
      { match: /barclays/i, lat: 40.6826, lon: -73.9754 },
      { match: /ubs arena/i, lat: 40.7117, lon: -73.7258 },
      { match: /prudential center/i, lat: 40.7334, lon: -74.1713 },
      { match: /metlife/i, lat: 40.8135, lon: -74.0745 },
      { match: /yankee stadium/i, lat: 40.8296, lon: -73.9262 },
      { match: /citi field/i, lat: 40.7571, lon: -73.8458 },
      { match: /red bull arena|sports illustrated stadium/i, lat: 40.7368, lon: -74.1503 },
    ],
  },
  {
    id: "paris",
    lat: 48.8566,
    lon: 2.3522,
    density: 21_000,
    leagues: ["soccer/fra.1", "soccer/uefa.champions", "rugby/270559", "soccer/uefa.nations", "soccer/fifa.friendly"],
    teams: [
      { espn: "Paris Saint-Germain", short: "PSG", qloo: "PSG", aliases: ["Paris Saint-Germain"], fan: { "soccer/uefa.champions": 0.25, "soccer/fra.1": 0.15 } },
      { espn: "Paris FC", short: "Paris FC", qloo: "Paris FC", fan: { "soccer/fra.1": 0.02 } },
      { espn: "Stade Francais Paris", short: "Stade Français", qloo: "Stade Français", fan: { "rugby/270559": 0.03 } },
      { espn: "Racing 92", short: "Racing 92", qloo: "Racing 92", fan: { "rugby/270559": 0.03 } },
      { espn: "France", short: "France", qloo: "France national football team", fan: { "soccer/uefa.nations": 0.35, "soccer/fifa.friendly": 0.25 } },
    ],
    venues: [
      { match: /parc des princes/i, lat: 48.8414, lon: 2.253 },
      { match: /stade de france/i, lat: 48.9245, lon: 2.3601 },
      { match: /la d[ée]fense arena/i, lat: 48.8957, lon: 2.2296 },
      { match: /jean.bouin/i, lat: 48.8432, lon: 2.2528 },
      { match: /charl[ée]ty/i, lat: 48.8188, lon: 2.3466 },
    ],
  },
];

// Game length in minutes, kickoff to final whistle.
const DURATION: Record<string, number> = { "basketball/nba": 135, "hockey/nhl": 150, "football/nfl": 195, "baseball/mlb": 180 };
const durationOf = (league: string) => DURATION[league] ?? (league.startsWith("soccer") ? 115 : league.startsWith("rugby") ? 110 : 150);
const LEAGUE_LABEL: Record<string, string> = {
  "basketball/nba": "NBA",
  "hockey/nhl": "NHL",
  "football/nfl": "NFL",
  "soccer/usa.1": "MLS",
  "soccer/fra.1": "Ligue 1",
  "soccer/uefa.champions": "Champions League",
  "rugby/270559": "Top 14",
  "soccer/uefa.nations": "Nations League",
  "soccer/fifa.friendly": "International friendly",
};

// Share of watchers who watch out, in a bar, and the share of those a single bar can hope for.
const WATCH_OUT = 0.08;

type EspnEvent = {
  id: string;
  date: string;
  name: string;
  competitions: {
    neutralSite?: boolean;
    venue?: { fullName?: string; address?: { city?: string } };
    competitors: { homeAway: "home" | "away"; team: { displayName: string; shortDisplayName?: string } }[];
    broadcasts?: { names?: string[] }[];
    geoBroadcasts?: { type?: { shortName?: string }; market?: { type?: string }; media?: { shortName?: string } }[];
    notes?: { headline?: string }[];
    status?: { type?: { name?: string } };
  }[];
};

async function leagueDay(league: string, day: string): Promise<EspnEvent[]> {
  const key = { league, day };
  const cached = cacheGet<EspnEvent[]>("espn", key);
  if (cached) return cached;
  const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/${league}/scoreboard?dates=${day}`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`ESPN ${league} ${day} HTTP ${res.status}`);
  const events = (((await res.json()) as { events?: EspnEvent[] }).events ?? []).map(slim);
  cacheSet("espn", key, events, 3 * 3600);
  return events;
}

// Keep only what the radar needs (the raw scoreboard is large).
function slim(e: EspnEvent): EspnEvent {
  const c = e.competitions?.[0];
  return {
    id: e.id,
    date: e.date,
    name: e.name,
    competitions: c
      ? [
          {
            neutralSite: c.neutralSite,
            venue: { fullName: c.venue?.fullName, address: { city: c.venue?.address?.city } },
            competitors: (c.competitors ?? []).map((x) => ({ homeAway: x.homeAway, team: { displayName: x.team.displayName, shortDisplayName: x.team.shortDisplayName } })),
            broadcasts: (c.broadcasts ?? []).map((b) => ({ names: b.names })),
            geoBroadcasts: (c.geoBroadcasts ?? []).map((g) => ({ type: { shortName: g.type?.shortName }, market: { type: g.market?.type }, media: { shortName: g.media?.shortName } })),
            notes: (c.notes ?? []).map((n) => ({ headline: n.headline })),
            status: { type: { name: c.status?.type?.name } },
          },
        ]
      : [],
  };
}

// Run with n workers; stop early when the first n calls all fail (the API is down, no point waiting on the rest).
async function pool<T, R>(items: T[], n: number, fn: (t: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array(items.length);
  let i = 0;
  let ok = 0;
  let failed = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        if (ok === 0 && failed >= n) break;
        const k = i++;
        try {
          out[k] = { status: "fulfilled", value: await fn(items[k]) };
          ok++;
        } catch (e) {
          out[k] = { status: "rejected", reason: e };
          failed++;
        }
      }
    }),
  );
  for (let k = 0; k < items.length; k++) out[k] ??= { status: "rejected", reason: new Error("not attempted") };
  return out;
}

// TV: national over-the-air or cable reaches every bar; regional sports networks most; streaming-only fewer.
function tvOf(c: EspnEvent["competitions"][0]): { label?: string; factor: number } {
  const names = [...(c.broadcasts ?? []).flatMap((b) => b.names ?? []), ...(c.geoBroadcasts ?? []).map((g) => g.media?.shortName ?? "")].filter(Boolean);
  const uniq = [...new Set(names)].filter((n) => !/radio|^ERA/i.test(n));
  if (uniq.length === 0) return { factor: 0.85 };
  const national = uniq.find((n) => /^(NBC|CBS|FOX|Fox|ABC|ESPN|ESPN2|TNT|TBS|truTV|Prime Video|NHL Net|NFL Net|Peacock)$/i.test(n));
  const regional = uniq.find((n) => /MSG|SNY|YES|SportsNet|MSGSN/i.test(n));
  const label = national ?? regional ?? uniq[0];
  return { label, factor: national ? 1 : regional ? 0.9 : 0.75 };
}

// Kickoff in the bar's evening or on a weekend afternoon is worth more than a late or morning game.
function slotFactor(kickoff: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short", hour: "2-digit", hour12: false }).formatToParts(kickoff);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 20) % 24;
  const weekend = /Sat|Sun/.test(parts.find((p) => p.type === "weekday")?.value ?? "");
  if (hour < 11 || hour >= 23) return 0.5;
  if (weekend && hour >= 12 && hour < 22) return 1.2;
  if (hour >= 17 && hour < 22) return 1;
  return 0.7;
}

const FANDOM_BANDS = [
  { min: 0.95, factor: 1, label: "home crowd" },
  { min: 0.85, factor: 0.8, label: "strong" },
  { min: 0.7, factor: 0.5, label: "present" },
  { min: 0, factor: 0.25, label: "weak" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// Teams are brands in Qloo. Accept an exact name or alias only; a brand search for "Paris FC" returns PSG first.
async function teamEntity(t: Team): Promise<{ id: string; name: string } | undefined> {
  const results = await searchEntities(t.qloo, ["brand"]);
  const names = [t.qloo, t.espn, ...(t.aliases ?? [])].map(norm);
  const hit = results.find((r) => names.includes(norm(r.name)));
  return hit ? { id: hit.entity_id, name: hit.name } : undefined;
}

export async function tvMoments(m: SourceMerchant, now: Date, hoursAhead: number): Promise<TmEvent[]> {
  const metro = METROS.find((x) => haversineKm(m.lat, m.lon, x.lat, x.lon) <= 60);
  if (!metro) return [];
  // ESPN dates are local to the US; fetch one extra day on each side and filter on the kickoff instant.
  const days: string[] = [];
  for (let t = now.getTime() - 24 * 3_600_000; t <= now.getTime() + (hoursAhead + 24) * 3_600_000; t += 24 * 3_600_000) days.push(new Date(t).toISOString().slice(0, 10).replace(/-/g, ""));
  const jobs = metro.leagues.flatMap((league) => days.map((day) => ({ league, day })));
  const settled = await pool(jobs, 5, (j) => leagueDay(j.league, j.day).then((events) => events.map((e) => ({ league: j.league, e }))));
  const failed = settled.filter((s) => s.status === "rejected").length;
  if (failed === jobs.length) throw new Error(`ESPN unreachable (${failed} calls failed)`);
  const seen = new Set<string>();
  const games = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : [])).filter(({ league, e }) => {
    const k = `${league}:${e.id}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const radiusKm = Math.min(2, m.radiusM / 1000);
  const people = metro.density * Math.PI * radiusKm * radiusKm;
  const out: TmEvent[] = [];
  for (const { league, e } of games) {
    const c = e.competitions[0];
    if (!c) continue;
    const kickoff = new Date(Date.parse(e.date.length === 17 ? e.date.replace("Z", ":00Z") : e.date));
    const end = kickoff.getTime() + durationOf(league) * 60_000;
    if (end + 30 * 60_000 < now.getTime() || kickoff.getTime() > now.getTime() + hoursAhead * 3_600_000) continue;
    if (/FINAL|POSTPONED|CANCELED/i.test(c.status?.type?.name ?? "")) continue;
    for (const side of c.competitors) {
      const team = metro.teams.find((t) => t.espn === side.team.displayName);
      const share = team?.fan[league];
      if (!team || !share) continue;
      const opp = c.competitors.find((x) => x !== side)?.team;
      // A home game in an arena within walking distance is already a venue crowd on the radar.
      const venue = metro.venues.find((v) => v.match.test(c.venue?.fullName ?? ""));
      if (side.homeAway === "home" && venue && haversineKm(m.lat, m.lon, venue.lat, venue.lon) <= m.radiusM / 1000) continue;
      const tv = tvOf(c);
      const slot = slotFactor(kickoff, m.timezone);
      let entity: { id: string; name: string } | undefined;
      let fandom: { rank: number; cells: number } | undefined;
      try {
        entity = await teamEntity(team);
        if (entity) fandom = await localFandom([entity.id], m.lat, m.lon);
      } catch {
        // Qloo unreachable: keep the game with a neutral fandom factor, say so in the reasons
      }
      const band = fandom ? FANDOM_BANDS.find((b) => fandom!.rank >= b.min)! : undefined;
      const crowd = Math.round(people * share * WATCH_OUT * slot * tv.factor * (band?.factor ?? 0.6));
      const label = LEAGUE_LABEL[league] ?? league;
      const note = (c.notes ?? []).map((n) => n.headline).filter(Boolean).join(", ");
      const where = side.homeAway === "home" ? "vs" : "at";
      const oppName = opp?.shortDisplayName ?? opp?.displayName ?? "opponent";
      out.push({
        id: `tv_${m.id}_${league.replace(/[^a-z0-9]+/gi, "-")}_${e.id}`,
        name: `${team.short} ${where} ${oppName}${tv.label ? ` on ${tv.label}` : ""}`,
        startsAt: kickoff.toISOString(),
        windowStart: new Date(kickoff.getTime() - 30 * 60_000).toISOString(),
        windowEnd: new Date(end + 30 * 60_000).toISOString(),
        origin: "tv",
        crowdEst: crowd,
        segment: "Sports",
        genre: label,
        venue: { name: `${team.short} fans watching around you`, lat: m.lat, lon: m.lon },
        attractions: [{ name: team.espn, segment: "Sports" }, ...(opp ? [{ name: opp.displayName, segment: "Sports" }] : [])],
        meta: {
          kind: "watch_party",
          league: label,
          side: side.homeAway,
          tv: tv.label ?? null,
          venue: c.venue?.fullName ?? null,
          note: note || null,
          fandom: fandom ? { rank: Math.round(fandom.rank * 1000) / 1000, cells: fandom.cells, band: band!.label } : null,
          windowLabel: "During the game",
          windowWhy: `${team.short} fans who are not at ${c.venue?.fullName ?? "the game"} look for a bar with the game on, from just before kickoff to the final whistle.`,
          why: `${label}${note ? `, ${note}` : ""}. ${side.homeAway === "away" ? "Away game" : "Home game across town"}, so local fans watch on TV${tv.label ? ` (${tv.label})` : ""}. Qloo local fandom ${fandom ? `${fandom.rank.toFixed(2)} (${band!.label})` : "not measured"}.`,
          estimate: { people: Math.round(people), share, watchOut: WATCH_OUT, slot, tv: tv.factor, fandom: band?.factor ?? 0.6 },
          signal: entity ? { entities: [{ id: entity.id, name: entity.name, type: "brand", note: fandom ? `local fandom ${fandom.rank.toFixed(2)}, ${band!.label}` : undefined }] } : undefined,
        },
      });
    }
  }
  return out;
}

registerSource({ id: "tv", appliesTo: (m) => METROS.some((x) => haversineKm(m.lat, m.lon, x.lat, x.lon) <= 60), fetch: tvMoments });
