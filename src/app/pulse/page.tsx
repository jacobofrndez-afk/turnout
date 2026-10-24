import Link from "next/link";
import { clockRange } from "@/lib/clock";
import { nb } from "@/lib/nbsp";
import { firstSentences, noScores, plainWords } from "@/lib/text";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { buildNeighborhoodPulse, type NeighborhoodPulse, type PulseOfferFit } from "@/server/qloo/neighborhood";
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
        <h1 className="t-title">No place yet</h1>
        <Link href="/start" className="link mt-6 inline-flex text-base">Set up your place</Link>
      </main>
    );
  }
  const tz = merchant.timezone;
  const pulse = await buildNeighborhoodPulse(merchant);
  const row = latestPulse(merchant.id);
  const brief = getBrief(row);
  const offers = getOffers(merchant.id);
  const featured = offers.find((o) => o.id === brief?.featured_offer_id);
  const why = brief ? plainWords(noScores(brief.rationale)) : "";
  const whyLead = firstSentences(why, 320);
  const whyRest = why.startsWith(whyLead) ? why.slice(whyLead.length).trim() : "";
  const evenings = await eveningsThisWeek(merchant.lat, merchant.lon, merchant.timezone).catch(() => []);
  // Qloo reads the street within the merchant radius, never under 1.5 km (see buildNeighborhoodPulse).
  const radiusKm = (Math.max(merchant.radius_m, 1500) / 1000).toLocaleString("en-US");
  const bestFit = pulse.offerFits.find((f) => f.matches > 0);
  const briefAction = brief ? "Write this week's plan again" : row?.status === "awaiting_operator" ? "Ask for this week's plan again" : "Write this week's plan";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href={`/today?merchant=${merchant.id}`} className="link text-base">Today</Link>
      {brief ? (
        <section className="plate stack-block">
          <p className="eyebrow">This week at {merchant.name}</p>
          <h1 className="t-display mt-5">{featured?.title ?? brief.featured_offer_id}</h1>
          <p className="t-lead mt-5">{nb(plainWords(noScores(brief.street_in_one_line)))}</p>
        </section>
      ) : (
        <h1 className="t-display mt-6">Every day at {merchant.name}</h1>
      )}
      <p className="t-body mt-6">The people who walk past your door on a normal day, read by Qloo within <span className="mono">{nb(`${radiusKm} km`)}</span>.</p>
      <form action="/api/pulse" method="post" className="mt-4">
        <input type="hidden" name="merchant" value={merchant.id} />
        <button className="link text-base">{briefAction}</button>
      </form>

      {row?.status === "awaiting_operator" && (
        <section className="tone stack-block">
          <p className="t-body">Turnout is writing this week's plan. Reload in a moment.</p>
        </section>
      )}
      {row?.status === "failed" && (
        <section className="tone stack-block">
          <p className="t-body">This week's plan could not be written: {row.error}</p>
        </section>
      )}

      {brief && (
        <>
          <section className="stack-block">
            <h2 className="t-title">Why</h2>
            <p className="t-body mt-4">{nb(whyLead)}</p>
            {whyRest && (<details className="mt-4"><summary className="link w-fit text-base">The rest of the reasoning</summary><p className="t-body mt-3">{nb(whyRest)}</p></details>)}
          </section>
          <section className="stack-section">
            <h2 className="t-title">Your words for this week</h2>
            <p className="t-body mt-4">Turnout sends none of this for you. Copy what you want; the ad runs only if you set it up yourself.</p>
            <div className="mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2">
              <Block title="On your chalkboard" tag="Every weekday">
                <p className="t-name whitespace-pre-wrap">{nb(brief.chalkboard)}</p>
              </Block>
              <Block title="On your Google listing" tag="This week">
                <p className="t-body font-semibold text-[var(--ink)]">{nb(brief.google_post.title)}</p>
                <p className="t-body">{nb(brief.google_post.body)}</p>
              </Block>
              <Block title="To your regulars on WhatsApp" tag="This week">
                <p className="t-body">{nb(brief.whatsapp)}</p>
              </Block>
              <Block
                title="To strangers nearby"
                tag={<>{adSlot(pulse.rhythm, tz)}, within <span className="mono">{nb(`${brief.always_on_ad.radius_m} m`)}</span>, up to ${brief.always_on_ad.daily_budget_usd}&nbsp;a&nbsp;day if you run it</>}
              >
                <p className="t-body font-semibold text-[var(--ink)]">{nb(brief.always_on_ad.headline)}</p>
                <p className="t-body">{nb(brief.always_on_ad.body)}</p>
                <p className="t-body text-[var(--muted)]">Interests: {brief.always_on_ad.interests.join(", ")}</p>
              </Block>
            </div>
          </section>
        </>
      )}

      {evenings.length > 0 && (
        <section className="stack-section">
          <h2 className="t-title">Evenings this week</h2>
          <p className="t-body mt-4 text-[var(--muted)]">At your door, <span className="mono">{nb(clockRange("17:00", "21:00", tz))}</span>, from the weather forecast.</p>
          <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4 lg:grid-cols-7">
            {evenings.map((e) => (
              <div key={e.day}>
                <p className="t-body font-semibold text-[var(--ink)]">{e.day}</p>
                <p className="t-body mt-1 tnum">{e.summary.label}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {brief && (
        <section className="stack-section">
          <h2 className="t-title">What this does not establish</h2>
          <p className="t-body mt-4">{nb(plainWords(noScores(brief.limitations)))}</p>
        </section>
      )}

      <details className="stack-section">
        <summary className="link w-fit text-base">All the evidence from Qloo</summary>
        {pulse.rhythm && pulse.rhythm.moments.length > 0 && (
          <section className="stack-block">
            <h2 className="t-title">The rhythm of your street</h2>
            <p className="t-body mt-4 text-[var(--muted)]">
              When the everyday flow peaks, read from {pulse.rhythm.placesRead} places around your door, {pulse.rhythm.hospitality} of them bars and restaurants, {pulse.rhythm.withHours} with opening hours.
            </p>
            {pulse.rhythm.moments.map((r) => (
              <div key={r.id} className="stack-block">
                <h3 className="t-name">{r.label}</h3>
                <p className="t-body mt-3">
                  {dayRange(r.days)}, <span className="mono">{nb(clockRange(r.from, r.to, tz))}</span>, {r.strength === "strong" ? "strong" : "likely"}
                </p>
                {r.evidence.map((e) => <p key={e} className="t-body mt-2 text-[var(--muted)]">{e}</p>)}
                {r.places.length > 0 && (
                  <p className="t-body mt-2 text-[var(--muted)]">Same crowd as: {r.places.map((pl) => (pl.name === pl.name.toUpperCase() ? pl.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : pl.name)).join(", ")}.</p>
                )}
              </div>
            ))}
            {pulse.rhythm.eventHabits.length > 0 && (
              <div className="stack-block">
                {pulse.rhythm.eventHabits.map((h) => (
                  <p key={h.place} className="t-body mt-2 text-[var(--muted)]">
                    <span className="font-semibold text-[var(--text)]">{h.place}:</span> “{h.text}”
                  </p>
                ))}
              </div>
            )}
          </section>
        )}

        <section className={`${pulse.rhythm && pulse.rhythm.moments.length > 0 ? "stack-section" : "stack-block"} grid gap-x-16 gap-y-16 md:grid-cols-3`}>
          <div>
            <h2 className="t-title">Who walks past</h2>
            <p className="t-body mt-4">
              {pulse.audienceTags.length ? pulse.audienceTags.map((t) => t.name.toLowerCase()).join(", ") : <span className="text-[var(--muted)]">No one described yet.</span>}
            </p>
            {pulse.rhythm && pulse.rhythm.passersBy.length > 0 && (
              <p className="t-body mt-3 text-[var(--muted)]">
                In the words of the places around you: {pulse.rhythm.passersBy.map((w) => `${w.label.toLowerCase()} (${w.places} places)`).join(", ")}.
              </p>
            )}
          </div>
          <div>
            <h2 className="t-title">What they like in a place</h2>
            <p className="t-body mt-4">
              {pulse.ambienceTags.length ? pulse.ambienceTags.map((t) => t.name.toLowerCase()).join(", ") : <span className="text-[var(--muted)]">Nothing described yet.</span>}
            </p>
          </div>
          <div>
            <h2 className="t-title">Brands they like</h2>
            <p className="t-body mt-4">
              {pulse.brands.length ? pulse.brands.slice(0, 10).map((b) => b.name).join(", ") : <span className="text-[var(--muted)]">No brand stands out yet.</span>}
            </p>
          </div>
        </section>

        <section className="stack-section grid gap-x-24 gap-y-16 lg:grid-cols-2">
          <div>
            <h2 className="t-title">Where they already go</h2>
            <p className="t-body mt-4 text-[var(--muted)]">Within reach of your door, strongest fit first.</p>
            <ol className="mt-6 space-y-2">
              {pulse.places.slice(0, 10).map((p) => {
                const locality = (p.properties?.geocode as { name?: string } | undefined)?.name;
                return (
                  <li key={p.entity_id} className="t-body">
                    {p.name}{locality && <span className="text-[var(--muted)]"> {locality}</span>}
                  </li>
                );
              })}
              {pulse.places.length === 0 && <li className="t-body text-[var(--muted)]">Nothing within reach yet.</li>}
            </ol>
          </div>
          <div>
            <h2 className="t-title">Your offers for them</h2>
            <table className="data mt-6 w-full text-base">
              <tbody>
                {pulse.offerFits.map((f) => (
                  <tr key={f.offerId}>
                    <td className="font-semibold text-[var(--ink)]">{f.title}<span className="mt-1 block font-normal text-[var(--muted)] md:hidden">{f.tagNames.map((t) => t.toLowerCase()).join(", ")}</span></td>
                    <td className="hidden text-[var(--muted)] md:table-cell">{f.tagNames.map((t) => t.toLowerCase()).join(", ")}</td>
                    <td className="whitespace-nowrap text-right">{f.offerId === brief?.featured_offer_id ? "This week's pick" : fitWord(f, bestFit)}</td>
                  </tr>
                ))}
                {pulse.offerFits.length === 0 && <tr><td className="text-[var(--muted)]">No offer described yet.</td></tr>}
              </tbody>
            </table>
            {featured && bestFit && bestFit.offerId !== featured.id && (
              <p className="t-body mt-4 text-[var(--muted)]">{bestFit.title} fits the street best on paper. This week's pick is {featured.title}: the reason is under Why, in The rest of the reasoning.</p>
            )}
          </div>
        </section>
      </details>

      <details className="stack-section">
        <summary className="link w-fit text-base">How Turnout got here, {pulse.provenance.length} steps</summary>
        <table className="data mt-4 w-full text-sm">
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
function adSlot(r: NeighborhoodPulse["rhythm"], tz: string): React.ReactNode {
  const a = r?.moments.find((m) => m.id === "afterwork");
  return a ? <>{dayRange(a.days)} <span className="mono">{nb(clockRange(a.from, a.to, tz))}</span></> : <>weekdays <span className="mono">{nb(clockRange("17:00", "19:00", tz))}</span></>;
}

// The fit of an offer in words, against the best one: the list is sorted, so the first matched offer is the strongest.
function fitWord(f: PulseOfferFit, best: PulseOfferFit | undefined): string {
  if (f.matches === 0 || !best) return "No match nearby";
  if (f === best) return "Strongest fit";
  const gap = Math.round((best.affinity - f.affinity) * 100);
  if (gap <= 2) return "Close";
  if (gap <= 6) return "Further";
  return "Weak";
}

function Block({ title, tag, children }: { title: string; tag: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="eyebrow">{title}</h3>
      <p className="t-body mt-3 text-[var(--muted)]">{tag}</p>
      <div className="mt-5 space-y-2">{children}</div>
    </div>
  );
}
