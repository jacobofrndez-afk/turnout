import Link from "next/link";
import { nb } from "@/lib/nbsp";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { buildNeighborhoodPulse, type NeighborhoodPulse } from "@/server/qloo/neighborhood";
import { getBrief, latestPulse } from "@/server/agent/pulse";
import { getOffers } from "@/server/qloo/crowd";
import { eveningsThisWeek } from "@/server/weather/openmeteo";

export const dynamic = "force-dynamic";

export default async function PulsePage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const sp = await searchParams;
  const merchant = getMerchant(sp.merchant ?? listMerchants()[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl">No place yet</h1>
        <Link href="/start" className="link">Set up your place</Link>
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
      <Link href={`/radar?merchant=${merchant.id}`} className="link text-sm">Back to the radar</Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Neighbourhood pulse · the everyday flow</p>
          <h1 className="t-title mt-2">The street outside {merchant.name}</h1>
          <p className="mt-3 text-base text-[var(--muted)]">
            {pulse.localityName ? `${pulse.localityName}, ` : ""}{merchant.city} · Qloo taste of a 1.5&nbsp;km radius around your door
          </p>
        </div>
        <form action="/api/pulse" method="post">
          <input type="hidden" name="merchant" value={merchant.id} />
          <button className="btn btn-accent">{brief ? "Redo this week's brief" : row?.status === "awaiting_operator" ? "Ask for the brief again" : "Write this week's brief"}</button>
        </form>
      </header>

      {row?.status === "awaiting_operator" && (
        <section className="tone stack-block">
          <p className="text-base">The agent is writing this week's brief. Reload in a moment.</p>
        </section>
      )}
      {row?.status === "failed" && (
        <section className="tone stack-block">
          <p className="text-base">The brief failed: {row.error}</p>
        </section>
      )}

      {brief && (
        <section className="stack-block">
          <div className="plate">
            <p className="eyebrow">This week</p>
            <p className="t-heading mt-4">{featured?.title ?? brief.featured_offer_id}</p>
            <p className="mt-3 text-lg text-[var(--muted)]">{nb(brief.street_in_one_line)}</p>
            <p className="eyebrow mt-10">Why, according to Qloo</p>
            <p className="t-body mt-3">{nb(brief.rationale)}</p>
          </div>
          <div className="stack-block grid gap-x-16 gap-y-16 md:grid-cols-2">
            <Block title="Chalkboard" tag="every weekday"><p className="t-name whitespace-pre-wrap">{nb(brief.chalkboard)}</p></Block>
            <Block title="Google Business post" tag="this week"><p className="t-name">{nb(brief.google_post.title)}</p><p className="text-base">{nb(brief.google_post.body)}</p></Block>
            <Block title="Note to regulars" tag="WhatsApp"><p className="text-base">{nb(brief.whatsapp)}</p></Block>
            <Block title={`Always-on ad · ${brief.always_on_ad.radius_m}\u00A0m · $${brief.always_on_ad.daily_budget_usd}/day`} tag={adSlot(pulse.rhythm)}>
              <p className="t-name">{nb(brief.always_on_ad.headline)}</p>
              <p className="text-base">{nb(brief.always_on_ad.body)}</p>
              <p className="mt-3 text-sm text-[var(--muted)]">Interests: {brief.always_on_ad.interests.join(" · ")}</p>
            </Block>
          </div>
          <div className="stack-block">
            <p className="eyebrow">What this does not establish</p>
            <p className="t-body mt-3">{nb(brief.limitations)}</p>
          </div>
        </section>
      )}

      {evenings.length > 0 && (
        <section className="stack-section">
          <p className="eyebrow">Evenings this week at your door · <span className="mono">17:00 to 21:00</span> · Open-Meteo</p>
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 text-sm sm:grid-cols-4 lg:grid-cols-7">
            {evenings.map((e) => (
              <div key={e.day}>
                <p className="text-sm font-semibold text-[var(--ink)]">{e.day}</p>
                <p className="mt-1 text-sm text-[var(--text)] tnum">{e.summary.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {pulse.rhythm && pulse.rhythm.moments.length > 0 && (
        <section className="stack-section">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="eyebrow">The rhythm of your street · when the everyday flow peaks, according to Qloo</p>
            <p className="text-sm text-[var(--muted)]">
              Read from {pulse.rhythm.placesRead} places Qloo knows around your door, {pulse.rhythm.hospitality} of them bars and restaurants, {pulse.rhythm.withHours} with opening hours
            </p>
          </div>
          <div className="stack-block grid gap-x-16 gap-y-12 md:grid-cols-3">
            {pulse.rhythm.moments.map((r) => (
              <div key={r.id}>
                <p className="t-name">{r.label}</p>
                <p className="mt-2 text-base font-semibold text-[var(--ink)] tnum">
                  {dayRange(r.days)} · {r.from} to {r.to}
                  <span className={r.strength === "strong" ? "ml-3 text-sm font-semibold text-[var(--ink)]" : "ml-3 text-sm text-[var(--muted)]"}>{r.strength === "strong" ? "strong" : "likely"}</span>
                </p>
                <ul className="mt-4 space-y-2 text-base">
                  {r.evidence.map((e) => <li key={e}>{e}</li>)}
                </ul>
                {r.places.length > 0 && (
                  <p className="mt-4 text-sm text-[var(--muted)]">Their crowd is yours: {r.places.map((pl) => pl.name).join(", ")}</p>
                )}
              </div>
            ))}
          </div>
          {(pulse.rhythm.passersBy.length > 0 || pulse.rhythm.eventHabits.length > 0) && (
            <div className="stack-block measure text-base">
              {pulse.rhythm.passersBy.length > 0 && (
                <p>
                  <span className="font-semibold text-[var(--ink)]">Who walks past, in Qloo's own words about the places here:</span>{" "}
                  {pulse.rhythm.passersBy.map((w) => `${w.label.toLowerCase()} (${w.places} places)`).join(", ")}.
                </p>
              )}
              {pulse.rhythm.eventHabits.map((h) => (
                <p key={h.place} className="mt-1.5 text-[var(--muted)]">
                  <span className="font-semibold text-[var(--text)]">{h.place}:</span> “{h.text}”
                </p>
              ))}
            </div>
          )}
        </section>
      )}

      <section className="stack-section grid gap-x-16 gap-y-12 md:grid-cols-3">
        <div>
          <p className="eyebrow">Who walks past</p>
          <p className="mt-4 text-base">{pulse.audienceTags.length ? pulse.audienceTags.map((t) => t.name).join(" · ") : <span className="text-[var(--muted)]">No audience tags returned.</span>}</p>
        </div>
        <div>
          <p className="eyebrow">What they like in a place</p>
          <p className="mt-4 text-base">{pulse.ambienceTags.length ? pulse.ambienceTags.map((t) => t.name).join(" · ") : <span className="text-[var(--muted)]">No ambience tags returned.</span>}</p>
        </div>
        <div>
          <p className="eyebrow">Brands and media they over-index on</p>
          <p className="mt-4 text-base">{pulse.brands.slice(0, 10).map((b) => b.name).join(" · ") || "—"}</p>
        </div>
      </section>

      <section className="stack-section grid gap-x-24 gap-y-16 lg:grid-cols-2">
        <div>
          <p className="eyebrow">Where they already go, within reach</p>
          <ol className="mt-3 space-y-1.5 text-base">
            {pulse.places.slice(0, 10).map((p) => (
              <li key={p.entity_id} className="flex justify-between gap-2">
                <span className="truncate">{p.name} <span className="text-sm text-[var(--muted)]">{(p.properties?.geocode as { name?: string } | undefined)?.name}</span></span>
                <span className="t-figure text-2xl">{(p.query?.affinity ?? 0).toFixed(2)}</span>
              </li>
            ))}
            {pulse.places.length === 0 && <li className="text-[var(--muted)]">Nothing returned for this radius.</li>}
          </ol>
        </div>
        <div>
          <p className="eyebrow">Your offers against the street</p>
          <table className="data mt-2 w-full text-base">
            <tbody>
              {pulse.offerFits.map((f, i) => (
                <tr key={f.offerId}>
                  <td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}</td>
                  <td className="text-sm text-[var(--muted)]">{f.tagNames.join(", ")}</td>
                  <td className="t-figure text-right text-2xl">{f.affinity.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <details className="stack-section">
        <summary className="text-base font-semibold text-[var(--ink)]">Provenance · {pulse.provenance.length} steps</summary>
        <table className="data mt-3 w-full text-sm">
          <tbody>
            {pulse.provenance.map((r) => (
              <tr key={r.seq}>
                <td>{r.seq}</td><td>{r.kind}</td><td><code>{r.workflow}</code></td><td>{r.status}</td><td className="text-right">{r.resultCount}</td>
                <td>{r.kind === "qloo" ? (r.cacheHit ? "cache" : "Qloo live") : "local"}</td><td className="text-[var(--muted)]">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="t-meta mt-6 tnum">Qloo calls: {pulse.qlooCalls.live} live, {pulse.qlooCalls.cached} cached.</p>
      </details>
    </main>
  );
}

const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayRange(days: number[]): string {
  const k = days.join(",");
  if (k === "1,2,3,4,5") return "Mon to Fri";
  if (k === "6,0" || k === "0,6") return "Sat and Sun";
  return days.map((d) => DAY[d]).join(", ");
}
function adSlot(r: NeighborhoodPulse["rhythm"]): string {
  const a = r?.moments.find((m) => m.id === "afterwork");
  return a ? `${dayRange(a.days)} ${a.from} to ${a.to}` : "weekdays 17:00 to 19:00";
}

function Block({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="eyebrow">{title}</p>
        <span className="t-meta">{tag}</span>
      </div>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}
