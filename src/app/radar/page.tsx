import { cookies } from "next/headers";
import Link from "next/link";
import { nb } from "@/lib/nbsp";
import { getMerchant, listMerchants, radarFor, type RadarItem } from "@/server/events/radar";
import RadarView, { type ViewItem } from "./RadarView";
import { weatherWindow, type WeatherSummary } from "@/server/weather/openmeteo";
import { presenceWindow } from "@/server/events/concentration";
import { memberSummary } from "@/lib/summary";

export const dynamic = "force-dynamic";

const H = 3_600_000;

// Explore (docs/UX-ONE-PATH.md): one link back to Today, who is around the place, then the map first,
// the hours folded under a link, and the crowds worth a campaign with one link each.
export default async function RadarPage({ searchParams }: { searchParams: Promise<{ merchant?: string; hours?: string }> }) {
  const sp = await searchParams;
  const id = sp.merchant ?? (await cookies()).get("merchant")?.value ?? "";
  const merchants = listMerchants();
  const merchant = getMerchant(id) ?? getMerchant(merchants[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl">No place yet</h1>
        <p className="mt-2 text-[var(--muted)]">
          <Link href="/start" className="link">Set up your place</Link> or run <code>npm run seed</code> for the demo merchants.
        </p>
      </main>
    );
  }
  const now = Date.now();
  const hours = Number(sp.hours ?? 72);
  const seats = merchant.seats ?? 60;
  let items: RadarItem[] = [];
  let error: string | undefined;
  try {
    items = await radarFor(merchant, hours);
  } catch (e) {
    error = (e as Error).message;
  }
  const top = items.slice(0, 90);
  // Weather at the merchant around each crowd worth a campaign (one forecast call per place, cached 1 h).
  const weather = new Map<string, WeatherSummary>();
  for (const it of top.filter((i) => i.interesting)) {
    const w = presenceWindow(it.event);
    try {
      const ws = await weatherWindow(merchant.lat, merchant.lon, new Date(w.arrive).toISOString(), new Date(w.leave).toISOString(), merchant.timezone);
      if (ws) weather.set(it.event.id, ws);
    } catch {
      // no weather, no chip
    }
  }
  const view: ViewItem[] = top.map((it) => {
    const origin = it.event.origin ?? "ticketmaster";
    const members = (it.event.meta?.members as { id: string; name: string }[] | undefined) ?? [];
    const names = [...new Set(members.map((m) => m.name))];
    return {
      id: it.event.id,
      kind: origin === "ticketmaster" ? "venue" : origin,
      headliner: it.headliner.name,
      short: shortLabel(it.event, members.length),
      blurb: blurbOf(it.event, names),
      members: members.map((m) => m.id),
      venue: it.event.venue.name,
      lat: it.event.venue.lat,
      lon: it.event.venue.lon,
      startsAt: it.event.startsAt,
      w: presenceWindow(it.event),
      segment: it.event.segment,
      genre: it.event.genre,
      capacity: it.capacity,
      guests: it.potentialGuests,
      score: it.score,
      interesting: it.interesting,
      distanceKm: it.distanceKm,
      weather: weather.get(it.event.id) ? { label: weather.get(it.event.id)!.label, kind: weather.get(it.event.id)!.kind } : undefined,
    };
  });
  // The crowds the list under the map will show: worth a campaign, still around, within the three days.
  const worth = view.filter((v) => v.interesting && v.w.leave > now && v.w.arrive < now + 72 * H).length;
  const reach = merchant.radius_m >= 1000 ? `${(merchant.radius_m / 1000).toLocaleString("en-US")} km` : `${merchant.radius_m} m`;

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href={`/today?merchant=${merchant.id}`} className="link">Today</Link>
      <h1 className="t-display mt-6">Who is around {merchant.name}</h1>
      <p className="t-lead mt-5">
        The next three days around your address. Your target radius is <span className="mono">{nb(reach)}</span>.
      </p>
      <p className="t-small mt-3 text-[var(--muted)]">Event schedules come from external sources. Crowd sizes, arrival windows and potential guests are model estimates, not measured attendance. Nearby TV audiences and combined show crowds are inferred.</p>
      {worth > 0 && (
        <p className="t-body mt-3">
          {worth === 1 ? "One crowd" : `${worth} crowds`} worth a campaign, sized for your {seats} seats.
        </p>
      )}

      {error && (
        <p className="mt-6 bg-[var(--danger-soft)] px-5 py-4 text-base text-[var(--danger)]">
          Could not load events: {error}
        </p>
      )}

      <div className="mt-10">
        <RadarView
          merchant={{ id: merchant.id, name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: merchant.radius_m, timezone: merchant.timezone, seats }}
          items={view}
          nowIso={new Date(now).toISOString()}
        />
      </div>
    </main>
  );
}

type Meta = Record<string, unknown> & { fandom?: { rank: number; band: string } | null };

// Label on the timeline: short enough to sit next to a marker.
function shortLabel(e: RadarItem["event"], memberCount: number): string {
  const meta = (e.meta ?? {}) as Meta;
  switch (e.origin) {
    case "wave":
      return `${Number(meta.count ?? memberCount)} shows ${meta.kind === "arrival" ? "starting" : "letting out"}`;
    case "tv":
      return e.name.replace(/ on .+$/, "") + " on TV";
    case "street":
      return e.name.length > 30 ? `${e.name.slice(0, 28).trim()}…` : e.name;
    default:
      return headlinerOf(e);
  }
}

const headlinerOf = (e: RadarItem["event"]) => e.attractions[0]?.name ?? e.name;

// One line saying what the moment is made of and where the evidence comes from.
function blurbOf(e: RadarItem["event"], memberNames: string[]): string | undefined {
  const meta = (e.meta ?? {}) as Meta;
  switch (e.origin) {
    case "wave": {
      const count = Number(meta.count ?? memberNames.length);
      return memberNames.length ? memberSummary(memberNames, 60, "shows", count) : undefined;
    }
    case "tv":
      return [meta.league, meta.side === "away" ? "away game" : "home game across town"].filter(Boolean).join("\u00A0· ");
    case "street":
      return [meta.type, e.venue.name].filter(Boolean).join(" · ");
    case "calendar":
      return "A night the whole city goes out";
    default:
      return undefined;
  }
}
