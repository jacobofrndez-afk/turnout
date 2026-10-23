import Link from "next/link";
import { getMerchant } from "@/server/events/radar";
import { tagId } from "@/server/qloo/api";
import { buildCrowdProfile, describeDemographics, getEvent, hasSignal } from "@/server/qloo/crowd";
import { nb } from "@/lib/nbsp";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ merchant?: string; event?: string; pick?: string }> }) {
  const sp = await searchParams;
  const merchant = sp.merchant ? getMerchant(sp.merchant) : undefined;
  const event = sp.event ? getEvent(sp.event) : undefined;
  if (!merchant || !event) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl">Missing place or event</h1>
        <Link href="/radar" className="link">Back to the radar</Link>
      </main>
    );
  }
  let profile: Awaited<ReturnType<typeof buildCrowdProfile>>;
  try {
    profile = await buildCrowdProfile(merchant, event, sp.pick);
  } catch (e) {
    // Qloo unreachable or rate limited: say so plainly instead of a blank error page.
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <Link href={`/radar?merchant=${merchant.id}`} className="link text-sm">Back to the radar</Link>
        <h1 className="mt-3 text-3xl">{event.name}</h1>
        <p className="mt-6 bg-[var(--danger-soft)] px-5 py-4 text-base text-[var(--danger)]">
          Qloo could not be reached, so this crowd cannot be read yet. Nothing was sent. Try again in a minute.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">{String((e as Error).message).slice(0, 160)}</p>
      </main>
    );
  }
  const demo = describeDemographics(profile.demographics);
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
  const ageLabel = (k: string) => k.replace("24_and_younger", "<25").replace("55_and_older", "55+").replace("_to_", "‑");
  const placeTags = profile.tags.filter((t) => tagId(t).startsWith("urn:tag:genre:place:restaurant"));
  const placesKnown = placeTags.length >= 4;
  // "Musical Theater", "Musical Theatre" and "Musical Theatre Performances" are one idea for a merchant: keep the first spelling.
  const seenTag = new Set<string>();
  const shownTags = (placesKnown ? placeTags : profile.tags)
    .filter((t) => {
      const k = t.name.toLowerCase().replace(/theater/g, "theatre").replace(/[^a-z]/g, "").replace(/(performances?|s)$/, "");
      if (seenTag.has(k)) return false;
      seenTag.add(k);
      return true;
    })
    .slice(0, 8);

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href={`/radar?merchant=${merchant.id}`} className="link text-sm">Back to the radar</Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">The crowd, through Qloo</p>
          <h1 className="t-title mt-2">{profile.headlinerName}</h1>
          <p className="mt-3 text-base text-[var(--muted)]">
            {event.name} · {event.venue_name} · {fmt.format(new Date(event.starts_at))} · for {merchant.name}
          </p>
        </div>
        {hasSignal(profile) && (
          <form action="/api/campaigns" method="post">
            <input type="hidden" name="merchant" value={merchant.id} />
            <input type="hidden" name="event" value={event.id} />
            {sp.pick && <input type="hidden" name="pick" value={sp.pick} />}
            <button className="btn btn-accent btn-lg">Write my campaign</button>
          </form>
        )}
      </header>

      {profile.status === "needs_input" && (
        <section className="tone stack-block">
          <h2 className="t-heading">Which one is playing tonight?</h2>
          <p className="mt-3 text-base text-[var(--muted)]">Qloo knows several entities named like “{profile.headlinerName}”. Pick the right one so the taste data describes the right crowd.</p>
          <ul className="mt-8 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {profile.candidates.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}&pick=${c.id}`} className="block bg-white px-5 py-4 transition-colors hover:bg-[var(--tone-2)]">
                  <p className="font-semibold text-[var(--ink)]">{c.name} <span className="chip ml-2">{c.type.replace("urn:entity:", "")}</span></p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{c.description || "no description"} · popularity {((c.popularity ?? 0) * 100).toFixed(0)}%</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.status === "unresolved" && (
        <section className="tone stack-block">
          <h2 className="t-heading">Qloo does not know this headliner</h2>
          <p className="mt-3 text-base text-[var(--muted)]">No entity matched “{profile.headlinerName}”. The campaign can still run on the event's genre and venue, but without taste evidence.</p>
        </section>
      )}

      {hasSignal(profile) && (
        <>
          <section className="stack-block grid gap-x-16 gap-y-12 md:grid-cols-3">
            {profile.entity ? (
              <div>
                <p className="eyebrow">The act</p>
                <p className="t-name mt-3">{profile.entity.name}</p>
                <p className="mt-2 text-base text-[var(--muted)]">{profile.entity.subtype?.replace("urn:entity:", "")} · {profile.status === "auto" ? "found by Qloo" : "picked by you"}</p>
              </div>
            ) : (
              <div>
                <p className="eyebrow">What Qloo was asked about</p>
                <ul className="mt-2 space-y-1.5 text-base">
                  {[...profile.signal.entities, ...profile.signal.tags].map((x) => (
                    <li key={x.id}>
                      <span className="font-semibold text-[var(--ink)]">{x.name}</span>&nbsp;
                      <span className="text-[var(--muted)]">· {x.type}{x.note ? ` · ${x.note}` : ""}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-sm text-[var(--muted)]">One crowd made of several audiences, read by Qloo as a whole.</p>
              </div>
            )}
            <div>
              <p className="eyebrow">Who is coming</p>
              {demo ? (
                <>
                  <p className="t-name mt-3">{nb(demo.ageTop.map((a) => a.replace(/\s*\([^)]*\)/g, "")).join(" and ")) || "every age"}</p>
                  <p className="mt-2 text-base text-[var(--muted)]">{nb(demo.gender.replace(/\s*\([^)]*\)/g, ""))}</p>
                </>
              ) : (
                <p className="mt-2 text-base text-[var(--muted)]">No demographic data for this entity.</p>
              )}
            </div>
            <div>
              <p className="eyebrow">Brands this crowd likes</p>
              <p className="mt-2 text-base leading-relaxed">{profile.brands.slice(0, 8).map((b) => b.name).join(" · ") || "—"}</p>
            </div>
          </section>

          {profile.demographics && (
            <section className="stack-block">
              <p className="eyebrow">Age affinity</p>
              <p className="measure mt-3 text-base text-[var(--muted)]">Against the average: a bar that rises means this age over-indexes, a bar that hangs means it under-indexes.</p>
              <div className="mt-8 grid max-w-2xl grid-cols-6 gap-3 text-center text-sm">
                {Object.entries(profile.demographics.age).map(([k, v]) => (
                  <div key={k}>
                    <div className="mx-auto flex h-14 w-full items-end justify-center">{v >= 0 && <div className="w-12" style={{ height: `${Math.max(4, Math.min(100, v * 100))}%`, background: "var(--bar-hot)" }} />}</div>
                    <div className="mx-auto flex h-14 w-full items-start justify-center">{v < 0 && <div className="w-12" style={{ height: `${Math.max(4, Math.min(100, -v * 100))}%`, background: "var(--muted)" }} />}</div>
                    <p className="mt-1.5 font-semibold text-[var(--ink)]">{ageLabel(k)}</p>
                    <p className="tnum text-[var(--muted)]">{v >= 0 ? "+" : "−"}{Math.abs(v).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="stack-block grid gap-x-24 gap-y-16 lg:grid-cols-2">
            <div>
              <p className="eyebrow">{placesKnown ? "Kinds of places this crowd likes" : "What this crowd likes"}</p>
              <p className="mt-4 text-base">{shownTags.map((t) => t.name).join(" · ")}</p>
            </div>
            <div>
              <p className="eyebrow">Bars within <span className="mono">{merchant.radius_m >= 1000 ? `${(merchant.radius_m / 1000).toLocaleString("en-US")} km` : `${merchant.radius_m} m`}</span> this crowd already likes</p>
              <ol className="mt-4 space-y-2 text-base">
                {profile.places.slice(0, 8).map((p) => (
                  <li key={p.entity_id} className="flex items-baseline justify-between gap-6">
                    <span className="truncate">{p.name} <span className="text-sm text-[var(--muted)]">{(p.properties?.geocode as { name?: string } | undefined)?.name}</span></span>
                    <span className="t-figure text-2xl">{(p.query?.affinity ?? 0).toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="stack-block">
            <p className="eyebrow">Your offers against this crowd</p>
            <p className="measure mt-3 text-base text-[var(--muted)]">Affinity of places carrying each offer's tags, near you, for this crowd. Higher means the crowd already seeks this kind of place around here. One signal among several; the agent decides with the demographics and brands too.</p>
            <table className="data mt-6 w-full text-base">
              <tbody>
                {profile.offerFits.map((f) => (
                  <tr key={f.offerId}>
                    <td className="font-semibold text-[var(--ink)]">{f.title}<span className="mt-1 block text-sm font-normal text-[var(--muted)] md:hidden">{f.tagNames.join(", ")}. e.g. {f.topPlaces.join(", ")}</span></td>
                    <td className="hidden text-sm text-[var(--muted)] md:table-cell">{f.tagNames.join(", ")}</td>
                    <td className="hidden text-sm text-[var(--muted)] md:table-cell">e.g. {f.topPlaces.join(", ")}</td>
                    <td className="t-figure text-right text-2xl">{f.affinity.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}

      <details className="stack-section">
        <summary className="text-base font-semibold text-[var(--ink)]">Provenance · {profile.provenance.length} steps</summary>
        <table className="data mt-6 w-full text-sm">
          <thead>
            <tr><th>#</th><th>Kind</th><th>Workflow</th><th>Status</th><th className="text-right">Results</th><th>Source</th><th>Note</th></tr>
          </thead>
          <tbody>
            {profile.provenance.map((r) => (
              <tr key={r.seq}>
                <td>{r.seq}</td><td>{r.kind}</td><td><code>{r.workflow}</code></td><td>{r.status}</td><td className="text-right">{r.resultCount}</td>
                <td>{r.kind === "qloo" ? (r.cacheHit ? "cache" : "Qloo live") : "local"}</td><td className="text-[var(--muted)]">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="t-meta mt-6 tnum">Qloo calls: {profile.qlooCalls.live} live, {profile.qlooCalls.cached} cached.</p>
        <p className="measure mt-6 text-sm text-[var(--muted)]">
          What this does not establish: Qloo describes aggregate affinities of people who like {profile.entity ? profile.headlinerName : [...profile.signal.entities, ...profile.signal.tags].map((x) => x.name).join(", ")}. It says nothing about any individual attendee, and a high affinity is not a prediction that anyone will visit.
        </p>
      </details>
    </main>
  );
}
