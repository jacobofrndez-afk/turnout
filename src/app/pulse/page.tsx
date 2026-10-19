import Link from "next/link";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { buildNeighborhoodPulse } from "@/server/qloo/neighborhood";
import { getBrief, latestPulse } from "@/server/agent/pulse";
import { getOffers } from "@/server/qloo/crowd";
import { tagId } from "@/server/qloo/api";
import { eveningsThisWeek } from "@/server/weather/openmeteo";

export const dynamic = "force-dynamic";

export default async function PulsePage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const sp = await searchParams;
  const merchant = getMerchant(sp.merchant ?? listMerchants()[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl">No place yet</h1>
        <Link href="/start" className="underline">Set up your place</Link>
      </main>
    );
  }
  const pulse = await buildNeighborhoodPulse(merchant);
  const row = latestPulse(merchant.id);
  const brief = getBrief(row);
  const offers = getOffers(merchant.id);
  const featured = offers.find((o) => o.id === brief?.featured_offer_id);
  const evenings = await eveningsThisWeek(merchant.lat, merchant.lon, merchant.timezone).catch(() => []);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href={`/radar?merchant=${merchant.id}`} className="text-sm" style={{ color: "var(--muted)" }}>← Radar</Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Neighbourhood pulse · the everyday flow</p>
          <h1 className="mt-1 text-4xl">The street outside {merchant.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            {pulse.localityName ? `${pulse.localityName}, ` : ""}{merchant.city} · Qloo taste of a 1.5 km radius around your door · {pulse.qlooCalls.live} live calls, {pulse.qlooCalls.cached} cached
          </p>
        </div>
        <form action="/api/pulse" method="post">
          <input type="hidden" name="merchant" value={merchant.id} />
          <button className="btn btn-accent">{brief ? "Redo this week's brief" : "Write this week's brief →"}</button>
        </form>
      </header>

      {evenings.length > 0 && (
        <section className="card-flat mt-8 p-4">
          <p className="eyebrow">Evenings this week at your door · 17:00 to 21:00 · Open-Meteo</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7">
            {evenings.map((e) => {
              const wet = ["rain", "storm", "snow", "cold"].includes(e.summary.kind);
              return (
                <div key={e.day} className="rounded-lg px-2 py-1.5" style={{ background: wet ? "var(--warn-soft)" : "var(--ok-soft)", color: wet ? "var(--warn)" : "var(--ok)" }}>
                  <p className="font-semibold">{e.day}</p>
                  <p>{e.summary.label}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="eyebrow">Who walks past</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pulse.audienceTags.map((t) => <span key={tagId(t)} className="chip" title={tagId(t)}>{t.name}</span>)}
            {pulse.audienceTags.length === 0 && <span className="text-sm" style={{ color: "var(--muted)" }}>No audience tags returned.</span>}
          </div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">What they like in a place</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pulse.ambienceTags.map((t) => <span key={tagId(t)} className="chip" title={tagId(t)}>{t.name}</span>)}
          </div>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Brands and media they over-index on</p>
          <p className="mt-3 text-sm leading-relaxed">{pulse.brands.slice(0, 10).map((b) => b.name).join(" · ") || "—"}</p>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <p className="eyebrow">Where they already go, within reach</p>
          <ol className="mt-3 space-y-1.5 text-sm">
            {pulse.places.slice(0, 10).map((p) => (
              <li key={p.entity_id} className="flex justify-between gap-2">
                <span className="truncate">{p.name} <span className="text-xs" style={{ color: "var(--muted)" }}>{(p.properties?.geocode as { name?: string } | undefined)?.name}</span></span>
                <span className="tnum font-semibold" style={{ color: "var(--accent)" }}>{(p.query?.affinity ?? 0).toFixed(2)}</span>
              </li>
            ))}
            {pulse.places.length === 0 && <li style={{ color: "var(--muted)" }}>Nothing returned for this radius.</li>}
          </ol>
        </div>
        <div className="card p-5">
          <p className="eyebrow">Your offers against the street</p>
          <table className="data mt-2 w-full text-sm">
            <tbody>
              {pulse.offerFits.map((f, i) => (
                <tr key={f.offerId}>
                  <td className="font-semibold" style={{ color: "var(--ink)" }}>{i === 0 ? "★ " : ""}{f.title}</td>
                  <td className="text-xs" style={{ color: "var(--muted)" }}>{f.tagNames.join(", ")}</td>
                  <td className="tnum text-right font-semibold" style={{ color: "var(--accent)" }}>{f.affinity.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {row?.status === "awaiting_operator" && (
        <section className="card mt-6 p-6" style={{ borderColor: "var(--warn)" }}>
          <p className="text-sm">The agent is writing this week's brief. Reload in a moment.</p>
        </section>
      )}
      {row?.status === "failed" && (
        <section className="card mt-6 p-6" style={{ borderColor: "var(--danger)" }}>
          <p className="text-sm">The brief failed: {row.error}</p>
        </section>
      )}

      {brief && (
        <section className="mt-6">
          <div className="card p-6" style={{ borderColor: "var(--accent)" }}>
            <p className="eyebrow">This week</p>
            <p className="mt-2 font-display text-2xl">{featured?.title ?? brief.featured_offer_id}</p>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{brief.street_in_one_line}</p>
            <p className="eyebrow mt-5">Why, according to Qloo</p>
            <p className="mt-2 text-sm leading-relaxed">{brief.rationale}</p>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Block title="Chalkboard" tag="every weekday"><p className="whitespace-pre-wrap font-display text-lg">{brief.chalkboard}</p></Block>
            <Block title="Google Business post" tag="this week"><p className="font-display text-lg">{brief.google_post.title}</p><p className="text-sm">{brief.google_post.body}</p></Block>
            <Block title="Note to regulars" tag="WhatsApp"><p className="text-sm leading-relaxed">{brief.whatsapp}</p></Block>
            <Block title={`Always-on ad · ${brief.always_on_ad.radius_m} m · $${brief.always_on_ad.daily_budget_usd}/day`} tag="weekdays 17:00-19:00">
              <p className="font-display text-lg">{brief.always_on_ad.headline}</p>
              <p className="text-sm">{brief.always_on_ad.body}</p>
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Interests: {brief.always_on_ad.interests.join(" · ")}</p>
            </Block>
          </div>
          <div className="card-flat mt-4 p-5" style={{ borderColor: "var(--warn)" }}>
            <p className="eyebrow">What this does not establish</p>
            <p className="mt-2 text-sm leading-relaxed">{brief.limitations}</p>
          </div>
        </section>
      )}

      <details className="card-flat mt-8 p-5">
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--ink)" }}>Provenance · {pulse.provenance.length} steps</summary>
        <table className="data mt-3 w-full text-xs">
          <tbody>
            {pulse.provenance.map((r) => (
              <tr key={r.seq}>
                <td>{r.seq}</td><td>{r.kind}</td><td><code>{r.workflow}</code></td><td>{r.status}</td><td className="text-right">{r.resultCount}</td>
                <td>{r.kind === "qloo" ? (r.cacheHit ? "cache" : "Qloo live") : "local"}</td><td style={{ color: "var(--muted)" }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </main>
  );
}

function Block({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="eyebrow">{title}</p>
        <span className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>{tag}</span>
      </div>
      <div className="mt-3 space-y-1">{children}</div>
    </div>
  );
}
