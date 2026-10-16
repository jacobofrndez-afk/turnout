import Link from "next/link";
import { getMerchant } from "@/server/events/radar";
import { buildCrowdProfile, describeDemographics, getEvent } from "@/server/qloo/crowd";
import { tagId } from "@/server/qloo/api";

export const dynamic = "force-dynamic";

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ merchant?: string; event?: string; pick?: string }> }) {
  const sp = await searchParams;
  const merchant = sp.merchant ? getMerchant(sp.merchant) : undefined;
  const event = sp.event ? getEvent(sp.event) : undefined;
  if (!merchant || !event) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="text-2xl font-semibold">Missing merchant or event</h1>
        <Link href="/radar" style={{ color: "var(--accent-2)" }}>Back to the radar</Link>
      </main>
    );
  }
  const profile = await buildCrowdProfile(merchant, event, sp.pick);
  const demo = describeDemographics(profile.demographics);
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
  const panel = { background: "var(--panel)", border: "1px solid var(--line)" } as const;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link href={`/radar?merchant=${merchant.id}`} className="text-sm" style={{ color: "var(--accent-2)" }}>← Radar</Link>
      <header className="mt-2">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--accent-2)" }}>Crowd profile</p>
        <h1 className="text-3xl font-semibold">{profile.headlinerName}</h1>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {event.name} · {event.venue_name} · {fmt.format(new Date(event.starts_at))} · for {merchant.name}
        </p>
      </header>

      {profile.status === "needs_input" && (
        <section className="mt-6 rounded-lg p-4" style={{ ...panel, borderColor: "var(--warn)" }}>
          <h2 className="font-medium">Which one is playing tonight?</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>Qloo found several entities named like “{profile.headlinerName}”. Pick the right one so the taste data is about the right crowd.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {profile.candidates.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}&pick=${c.id}`} className="block rounded-md p-3 hover:opacity-90" style={panel}>
                  <p className="font-medium">{c.name} <span className="text-xs" style={{ color: "var(--muted)" }}>{c.type.replace("urn:entity:", "")}</span></p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{c.description || "no description"} · popularity {((c.popularity ?? 0) * 100).toFixed(0)}%</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.status === "unresolved" && (
        <section className="mt-6 rounded-lg p-4" style={{ ...panel, borderColor: "#7f1d1d" }}>
          <h2 className="font-medium">Qloo does not know this headliner</h2>
          <p className="text-sm" style={{ color: "var(--muted)" }}>No entity matched “{profile.headlinerName}”. The campaign can still run on the event's genre and venue, but without taste evidence.</p>
        </section>
      )}

      {profile.entity && (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg p-4" style={panel}>
              <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Resolved entity</h2>
              <p className="mt-1 font-medium">{profile.entity.name}</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>{profile.entity.subtype?.replace("urn:entity:", "")} · popularity {((profile.entity.popularity ?? 0) * 100).toFixed(1)}% · {profile.status === "auto" ? "matched automatically" : "picked by you"}</p>
            </div>
            <div className="rounded-lg p-4" style={panel}>
              <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Who over-indexes</h2>
              {demo ? (
                <>
                  <p className="mt-1 font-medium">{demo.ageTop.join(", ") || "no strong age skew"}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{demo.gender}{demo.ageLow.length ? ` · under-indexes: ${demo.ageLow.join(", ")}` : ""}</p>
                </>
              ) : (
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>No demographic data for this entity.</p>
              )}
            </div>
            <div className="rounded-lg p-4" style={panel}>
              <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Brands this crowd likes</h2>
              <p className="mt-1 text-sm">{profile.brands.slice(0, 8).map((b) => b.name).join(" · ") || "—"}</p>
            </div>
          </section>

          {profile.demographics && (
            <section className="mt-4 rounded-lg p-4" style={panel}>
              <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Age affinity (Qloo, relative to average; positive = over-index)</h2>
              <div className="mt-3 grid grid-cols-6 gap-2 text-center text-xs">
                {Object.entries(profile.demographics.age).map(([k, v]) => (
                  <div key={k}>
                    <div className="mx-auto flex h-20 w-full items-end justify-center">
                      <div className="w-8 rounded-sm" style={{ height: `${Math.min(100, Math.abs(v) * 100)}%`, background: v >= 0 ? "var(--ok)" : "#f87171", opacity: 0.85 }} />
                    </div>
                    <p className="mt-1" style={{ color: "var(--muted)" }}>{k.replace("_and_younger", "-").replace("_and_older", "+").replace("_to_", "-")}</p>
                    <p>{v >= 0 ? "+" : ""}{v.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg p-4" style={panel}>
              <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Taste tags (places)</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.tags.slice(0, 24).map((t) => (
                  <span key={tagId(t)} className="rounded-full px-2 py-0.5 text-xs" style={{ background: "var(--bg)", border: "1px solid var(--line)" }} title={tagId(t)}>
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-lg p-4" style={panel}>
              <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Bars within {merchant.radius_m} m this crowd likes</h2>
              <ol className="mt-2 space-y-1 text-sm">
                {profile.places.slice(0, 8).map((p) => (
                  <li key={p.entity_id} className="flex justify-between gap-2">
                    <span className="truncate">{p.name} <span className="text-xs" style={{ color: "var(--muted)" }}>{(p.properties?.geocode as { name?: string } | undefined)?.name}</span></span>
                    <span style={{ color: "var(--ok)" }}>{(p.query?.affinity ?? 0).toFixed(2)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="mt-4 rounded-lg p-4" style={panel}>
            <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Your offers against this crowd</h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Affinity of places carrying each offer's tags, near you, for this crowd. Higher = the crowd already seeks this kind of place around here.</p>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {profile.offerFits.map((f, i) => (
                  <tr key={f.offerId} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="py-2 pr-2 font-medium">{i === 0 ? "★ " : ""}{f.title}</td>
                    <td className="py-2 pr-2 text-xs" style={{ color: "var(--muted)" }}>{f.tagNames.join(", ")}</td>
                    <td className="py-2 pr-2 text-xs" style={{ color: "var(--muted)" }}>e.g. {f.topPlaces.join(", ")}</td>
                    <td className="py-2 text-right" style={{ color: "var(--ok)" }}>{f.affinity.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="mt-4 flex flex-wrap items-center gap-3">
            <form action="/api/campaigns" method="post">
              <input type="hidden" name="merchant" value={merchant.id} />
              <input type="hidden" name="event" value={event.id} />
              {sp.pick && <input type="hidden" name="pick" value={sp.pick} />}
              <button className="rounded-md px-5 py-3 font-medium text-white" style={{ background: "var(--accent)" }}>
                Draft the campaign with the agent
              </button>
            </form>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Qloo calls: {profile.qlooCalls.live} live, {profile.qlooCalls.cached} cached.</p>
          </section>
        </>
      )}

      <details className="mt-6 rounded-lg p-4" style={panel}>
        <summary className="cursor-pointer text-sm font-medium">Provenance: {profile.provenance.length} steps</summary>
        <table className="mt-3 w-full text-xs">
          <thead style={{ color: "var(--muted)" }}>
            <tr><th className="text-left">#</th><th className="text-left">Kind</th><th className="text-left">Workflow</th><th className="text-left">Status</th><th className="text-right">Results</th><th className="text-left pl-3">Source</th><th className="text-left pl-3">Note</th></tr>
          </thead>
          <tbody>
            {profile.provenance.map((r) => (
              <tr key={r.seq} style={{ borderTop: "1px solid var(--line)" }}>
                <td className="py-1">{r.seq}</td><td>{r.kind}</td><td><code>{r.workflow}</code></td><td>{r.status}</td><td className="text-right">{r.resultCount}</td>
                <td className="pl-3">{r.kind === "qloo" ? (r.cacheHit ? "cache" : "Qloo live") : "local"}</td><td className="pl-3" style={{ color: "var(--muted)" }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          What this does not establish: Qloo describes aggregate affinities of people who like {profile.headlinerName}. It says nothing about any individual attendee, and a high affinity is not a prediction that anyone will visit.
        </p>
      </details>
    </main>
  );
}
