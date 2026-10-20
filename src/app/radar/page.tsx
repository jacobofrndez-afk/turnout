import Link from "next/link";
import { getMerchant, listMerchants, radarFor, type RadarItem } from "@/server/events/radar";
import RadarView, { type ViewItem } from "./RadarView";
import MerchantSwitch from "./MerchantSwitch";
import { weatherWindow, type WeatherSummary } from "@/server/weather/openmeteo";
import { presenceWindow } from "@/server/events/concentration";

export const dynamic = "force-dynamic";

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ merchant?: string; hours?: string }> }) {
  const sp = await searchParams;
  const merchants = listMerchants().filter((m) => m.id === "m_penn_pour" || m.id === "m_quai_bercy" || m.id === (sp.merchant ?? ""));
  const merchant = getMerchant(sp.merchant ?? merchants[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl">No place yet</h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>
          <Link href="/start" className="underline">Set up your place</Link> or run <code>npm run seed</code> for the demo merchants.
        </p>
      </main>
    );
  }
  const hours = Number(sp.hours ?? 72);
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
      short: origin === "wave" ? `${Number(it.event.meta?.count ?? members.length)} shows ${it.event.meta?.kind === "arrival" ? "starting" : "letting out"}` : it.headliner.name,
      blurb: names.length ? `${names.slice(0, 3).join(", ")}${Number(it.event.meta?.count ?? names.length) > 3 ? ` and ${Number(it.event.meta?.count ?? names.length) - 3} more` : ""}` : undefined,
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

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Radar · next 3 days</p>
          <h1 className="mt-1 text-4xl">{merchant.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {merchant.address} · {merchant.seats ?? 60} seats · watching {merchant.radius_m >= 1000 ? `${(merchant.radius_m / 1000).toLocaleString("en-US")} km` : `${merchant.radius_m} m`} around you
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <MerchantSwitch current={merchant.id} options={merchants.map((m) => ({ id: m.id, label: `${m.name}, ${m.city}` }))} />
          <Link href={`/pulse?merchant=${merchant.id}`} className="font-semibold" style={{ color: "var(--ink)" }}>
            Weekly pulse →
          </Link>
        </div>
      </header>

      {error && (
        <p className="mt-6 rounded-xl p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          Could not load events: {error}
        </p>
      )}

      <div className="mt-8">
        <RadarView
          merchant={{ id: merchant.id, name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: merchant.radius_m, timezone: merchant.timezone, seats: merchant.seats ?? 60 }}
          items={view}
          nowIso={new Date().toISOString()}
          hours={hours}
        />
      </div>
    </main>
  );
}
