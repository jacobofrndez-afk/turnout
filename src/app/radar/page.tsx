import Link from "next/link";
import { getMerchant, listMerchants, radarFor, type RadarItem } from "@/server/events/radar";
import RadarMap from "./RadarMap";

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
  const hot = top.filter((i) => i.interesting).length;
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
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

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="card overflow-hidden p-2">
          <RadarMap
            merchant={{ name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: merchant.radius_m }}
            points={top.map((it) => ({ id: it.event.id, name: it.headliner.name, venue: it.event.venue.name, lat: it.event.venue.lat, lon: it.event.venue.lon, score: it.score, capacity: it.capacity, startsAt: it.event.startsAt }))}
          />
        </div>
        <ol className="space-y-3">
          {top.map((it) => (
            <li key={it.event.id} className={it.interesting ? "card p-4" : "card-flat p-4"} style={it.interesting ? { borderColor: "var(--accent)" } : undefined}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate font-display text-lg">{it.headliner.name}</p>
                  <p className="truncate text-sm" style={{ color: "var(--muted)" }}>
                    {fmt.format(new Date(it.event.startsAt))} · {it.event.venue.name} · {it.distanceKm.toFixed(1)} km
                  </p>
                  <p className="tnum mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    ~{it.capacity.toLocaleString("en-US")} people · {it.event.segment ?? "?"}{it.event.genre ? ` / ${it.event.genre}` : ""}
                  </p>
                  {it.interesting && (
                    <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.event.id}`} className="mt-3 inline-flex text-sm font-semibold" style={{ color: "var(--accent)" }}>
                      Qualify this crowd with Qloo →
                    </Link>
                  )}
                </div>
                <div className="score-ring shrink-0" style={{ ["--p" as string]: it.score }} title="Concentration score">
                  <span>{it.score}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
