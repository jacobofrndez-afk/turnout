import Link from "next/link";
import { getMerchant } from "@/server/events/radar";
import { buildCrowdProfile, describeDemographics, getEvent, hasSignal } from "@/server/qloo/crowd";
import { tagId } from "@/server/qloo/api";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ merchant?: string; event?: string; pick?: string }> }) {
  const sp = await searchParams;
  const merchant = sp.merchant ? getMerchant(sp.merchant) : undefined;
  const event = sp.event ? getEvent(sp.event) : undefined;
  if (!merchant || !event) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl">Missing place or event</h1>
        <Link href="/radar" className="underline">Back to the radar</Link>
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
        <Link href={`/radar?merchant=${merchant.id}`} className="text-sm" style={{ color: "var(--muted)" }}>← Radar</Link>
        <h1 className="mt-3 text-3xl">{event.name}</h1>
        <p className="mt-4 p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          Qloo could not be reached, so this crowd cannot be read yet. Nothing was sent. Try again in a minute.
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>{String((e as Error).message).slice(0, 160)}</p>
      </main>
    );
  }
  const demo = describeDemographics(profile.demographics);
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
  const ageLabel = (k: string) => k.replace("24_and_younger", "<25").replace("55_and_older", "55+").replace("_to_", "-");

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href={`/radar?merchant=${merchant.id}`} className="text-sm" style={{ color: "var(--muted)" }}>← Radar</Link>
      <header className="mt-3">
        <p className="eyebrow">The crowd, through Qloo</p>
        <h1 className="mt-1 text-4xl">{profile.headlinerName}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          {event.name} · {event.venue_name} · {fmt.format(new Date(event.starts_at))} · for {merchant.name}
        </p>
      </header>

      {profile.status === "needs_input" && (
        <section className="card mt-8 p-6" style={{ borderColor: "var(--warn)" }}>
          <h2 className="display text-xl">Which one is playing tonight?</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Qloo knows several entities named like “{profile.headlinerName}”. Pick the right one so the taste data describes the right crowd.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {profile.candidates.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}&pick=${c.id}`} className="card-flat block p-4 hover:border-[var(--ink)]">
                  <p className="font-semibold" style={{ color: "var(--ink)" }}>{c.name} <span className="chip ml-1">{c.type.replace("urn:entity:", "")}</span></p>
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{c.description || "no description"} · popularity {((c.popularity ?? 0) * 100).toFixed(0)}%</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.status === "unresolved" && (
        <section className="card mt-8 p-6" style={{ borderColor: "var(--danger)" }}>
          <h2 className="display text-xl">Qloo does not know this headliner</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>No entity matched “{profile.headlinerName}”. The campaign can still run on the event's genre and venue, but without taste evidence.</p>
        </section>
      )}

      {hasSignal(profile) && (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            {profile.entity ? (
              <div className="card p-5">
                <p className="eyebrow">Resolved entity</p>
                <p className="mt-2 font-display text-xl">{profile.entity.name}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{profile.entity.subtype?.replace("urn:entity:", "")} · popularity {((profile.entity.popularity ?? 0) * 100).toFixed(1)}% · {profile.status === "auto" ? "matched automatically" : "picked by you"}</p>
              </div>
            ) : (
              <div className="card p-5">
                <p className="eyebrow">What Qloo was asked about</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {[...profile.signal.entities, ...profile.signal.tags].map((x) => (
                    <li key={x.id}>
                      <span className="font-semibold" style={{ color: "var(--ink)" }}>{x.name}</span>{" "}
                      <span style={{ color: "var(--muted)" }}>· {x.type}{x.note ? ` · ${x.note}` : ""}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>One crowd made of several audiences, read by Qloo as a whole.</p>
              </div>
            )}
            <div className="card p-5">
              <p className="eyebrow">Who over-indexes</p>
              {demo ? (
                <>
                  <p className="mt-2 font-display text-xl">{demo.ageTop.join(", ") || "no strong age skew"}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{demo.gender}{demo.ageLow.length ? ` · under-indexes: ${demo.ageLow.join(", ")}` : ""}</p>
                </>
              ) : (
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>No demographic data for this entity.</p>
              )}
            </div>
            <div className="card p-5">
              <p className="eyebrow">Brands this crowd likes</p>
              <p className="mt-2 text-sm leading-relaxed">{profile.brands.slice(0, 8).map((b) => b.name).join(" · ") || "—"}</p>
            </div>
          </section>

          {profile.demographics && (
            <section className="card mt-4 p-5">
              <p className="eyebrow">Age affinity · relative to average, positive means over-index</p>
              <div className="mt-4 grid grid-cols-6 gap-3 text-center text-xs">
                {Object.entries(profile.demographics.age).map(([k, v]) => (
                  <div key={k}>
                    <div className="mx-auto flex h-20 w-full items-end justify-center">
                      <div className="w-9" style={{ height: `${Math.max(4, Math.min(100, Math.abs(v) * 100))}%`, background: v >= 0 ? "var(--ink)" : "var(--line-strong)" }} />
                    </div>
                    <p className="mt-1.5 font-semibold" style={{ color: "var(--ink)" }}>{ageLabel(k)}</p>
                    <p className="tnum" style={{ color: "var(--muted)" }}>{v >= 0 ? "+" : ""}{v.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <p className="eyebrow">Taste tags · places</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.tags.slice(0, 24).map((t) => (
                  <span key={tagId(t)} className="chip" title={tagId(t)}>{t.name}</span>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <p className="eyebrow">Bars within {merchant.radius_m} m this crowd already likes</p>
              <ol className="mt-3 space-y-1.5 text-sm">
                {profile.places.slice(0, 8).map((p) => (
                  <li key={p.entity_id} className="flex justify-between gap-2">
                    <span className="truncate">{p.name} <span className="text-xs" style={{ color: "var(--muted)" }}>{(p.properties?.geocode as { name?: string } | undefined)?.name}</span></span>
                    <span className="tnum font-display text-base" style={{ color: "var(--ink)" }}>{(p.query?.affinity ?? 0).toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="card mt-4 p-5">
            <p className="eyebrow">Your offers against this crowd</p>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Affinity of places carrying each offer's tags, near you, for this crowd. Higher means the crowd already seeks this kind of place around here. One signal among several; the agent decides with the demographics and brands too.</p>
            <table className="data mt-3 w-full text-sm">
              <tbody>
                {profile.offerFits.map((f, i) => (
                  <tr key={f.offerId}>
                    <td className="font-semibold" style={{ color: "var(--ink)" }}>{i === 0 ? "★ " : ""}{f.title}</td>
                    <td className="text-xs" style={{ color: "var(--muted)" }}>{f.tagNames.join(", ")}</td>
                    <td className="text-xs" style={{ color: "var(--muted)" }}>e.g. {f.topPlaces.join(", ")}</td>
                    <td className="tnum text-right font-display text-base" style={{ color: i === 0 ? "var(--accent-text)" : "var(--ink)" }}>{f.affinity.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-6 flex flex-wrap items-center gap-4">
            <form action="/api/campaigns" method="post">
              <input type="hidden" name="merchant" value={merchant.id} />
              <input type="hidden" name="event" value={event.id} />
              {sp.pick && <input type="hidden" name="pick" value={sp.pick} />}
              <button className="btn btn-accent">Draft the campaign</button>
            </form>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Qloo calls: {profile.qlooCalls.live} live, {profile.qlooCalls.cached} cached.</p>
          </section>
        </>
      )}

      <details className="card-flat mt-8 p-5">
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--ink)" }}>Provenance · {profile.provenance.length} steps</summary>
        <table className="data mt-3 w-full text-xs">
          <thead>
            <tr><th>#</th><th>Kind</th><th>Workflow</th><th>Status</th><th className="text-right">Results</th><th>Source</th><th>Note</th></tr>
          </thead>
          <tbody>
            {profile.provenance.map((r) => (
              <tr key={r.seq}>
                <td>{r.seq}</td><td>{r.kind}</td><td><code>{r.workflow}</code></td><td>{r.status}</td><td className="text-right">{r.resultCount}</td>
                <td>{r.kind === "qloo" ? (r.cacheHit ? "cache" : "Qloo live") : "local"}</td><td style={{ color: "var(--muted)" }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          What this does not establish: Qloo describes aggregate affinities of people who like {profile.entity ? profile.headlinerName : [...profile.signal.entities, ...profile.signal.tags].map((x) => x.name).join(", ")}. It says nothing about any individual attendee, and a high affinity is not a prediction that anyone will visit.
        </p>
      </details>
    </main>
  );
}
