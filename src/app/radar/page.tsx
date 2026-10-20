import Link from "next/link";
import { getMerchant, listMerchants, radarFor, type RadarItem } from "@/server/events/radar";
import RadarView, { type ViewItem } from "./RadarView";
import { weatherWindow, type WeatherSummary } from "@/server/weather/openmeteo";

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
  const top = items.slice(0, 40);
  // Weather at the merchant around each crowd worth a campaign (one forecast call per place, cached 1 h).
  const weather = new Map<string, WeatherSummary>();
  for (const it of top.filter((i) => i.interesting)) {
    const start = new Date(it.event.startsAt).getTime();
    try {
      const w = await weatherWindow(merchant.lat, merchant.lon, new Date(start - 150 * 60_000).toISOString(), new Date(start + 255 * 60_000).toISOString(), merchant.timezone);
      if (w) weather.set(it.event.id, w);
    } catch {
      // no weather, no chip
    }
  }
  const hot = top.filter((i) => i.interesting).length;
  const view: ViewItem[] = top.map((it) => ({
    id: it.event.id,
    headliner: it.headliner.name,
    venue: it.event.venue.name,
    lat: it.event.venue.lat,
    lon: it.event.venue.lon,
    startsAt: it.event.startsAt,
    segment: it.event.segment,
    genre: it.event.genre,
    capacity: it.capacity,
    score: it.score,
    interesting: it.interesting,
    distanceKm: it.distanceKm,
    weather: weather.get(it.event.id) ? { label: weather.get(it.event.id)!.label, kind: weather.get(it.event.id)!.kind } : undefined,
  }));

  return (
    <main className="mx-auto max-w-[1200px] px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Radar · next {hours} h</p>
          <h1 className="mt-1 text-4xl">{merchant.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {merchant.address} · {items.length} events within reach · <span style={{ color: "var(--accent)" }}>{hot} worth a campaign</span>
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {merchants.map((m) => (
            <Link key={m.id} href={`/radar?merchant=${m.id}&hours=${hours}`} className="chip" style={m.id === merchant.id ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : undefined}>
              {m.name}
            </Link>
          ))}
          <Link href="/start" className="chip" style={{ color: "var(--accent)" }}>+ your place</Link>
          <Link href={`/pulse?merchant=${merchant.id}`} className="chip" style={{ color: "var(--ink)", fontWeight: 600 }}>Neighbourhood pulse →</Link>
        </nav>
      </header>

      {error && (
        <p className="mt-6 rounded-xl p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          Could not load events: {error}
        </p>
      )}

      <div className="mt-8">
        <RadarView
          merchant={{ id: merchant.id, name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: merchant.radius_m, timezone: merchant.timezone }}
          items={view}
          nowIso={new Date().toISOString()}
          hours={hours}
        />
      </div>
    </main>
  );
}
