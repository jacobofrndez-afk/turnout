import Link from "next/link";
import { getMerchant, listMerchants, radarFor, type RadarItem } from "@/server/events/radar";
import RadarMap from "./RadarMap";

export const dynamic = "force-dynamic";

export default async function RadarPage({ searchParams }: { searchParams: Promise<{ merchant?: string; hours?: string }> }) {
  const sp = await searchParams;
  const merchants = listMerchants();
  const merchant = getMerchant(sp.merchant ?? merchants[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold">No merchant yet</h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>Run <code>npm run seed</code> first.</p>
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
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--accent-2)" }}>Radar</p>
          <h1 className="text-3xl font-semibold">{merchant.name}</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{merchant.address} · next {hours} h · {items.length} events within reach</p>
        </div>
        <nav className="flex gap-2 text-sm">
          {merchants.map((m) => (
            <Link
              key={m.id}
              href={`/radar?merchant=${m.id}&hours=${hours}`}
              className="rounded-full px-3 py-1"
              style={{ background: m.id === merchant.id ? "var(--accent)" : "var(--panel)", border: "1px solid var(--line)" }}
            >
              {m.city}
            </Link>
          ))}
        </nav>
      </header>

      {error && (
        <p className="mt-6 rounded-md p-3 text-sm" style={{ background: "#3b1d1d", border: "1px solid #7f1d1d" }}>
          Could not load events: {error}
        </p>
      )}

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <RadarMap
          merchant={{ name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: merchant.radius_m }}
          points={top.map((it) => ({ id: it.event.id, name: it.headliner.name, venue: it.event.venue.name, lat: it.event.venue.lat, lon: it.event.venue.lon, score: it.score, capacity: it.capacity, startsAt: it.event.startsAt }))}
        />
        <ol className="space-y-2">
          {top.map((it) => (
            <li key={it.event.id} className="rounded-lg p-3" style={{ background: "var(--panel)", border: `1px solid ${it.interesting ? "var(--accent)" : "var(--line)"}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.headliner.name}</p>
                  <p className="truncate text-sm" style={{ color: "var(--muted)" }}>
                    {fmt.format(new Date(it.event.startsAt))} · {it.event.venue.name} · {it.distanceKm.toFixed(1)} km
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    ~{it.capacity.toLocaleString("en-US")} people · {it.event.segment ?? "?"}{it.event.genre ? ` / ${it.event.genre}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold" style={{ color: it.interesting ? "var(--ok)" : "var(--text)" }}>{it.score}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>concentration</p>
                </div>
              </div>
              {it.interesting && (
                <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.event.id}`} className="mt-2 inline-block text-sm" style={{ color: "var(--accent-2)" }}>
                  Qualify this crowd with Qloo →
                </Link>
              )}
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
