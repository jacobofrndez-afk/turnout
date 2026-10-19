import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign, getDraft, getProvenance, pollOperatorDraft, provider, INBOX } from "@/server/agent/run";
import { getMerchant } from "@/server/events/radar";
import { getEvent, getOffers } from "@/server/qloo/crowd";
import { relative } from "node:path";
import { getSends, CHANNEL_LABEL, type ChannelId } from "@/server/channels";

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let campaign = getCampaign(id);
  if (!campaign) notFound();
  campaign = pollOperatorDraft(campaign);
  const merchant = getMerchant(campaign.merchant_id)!;
  const event = getEvent(campaign.event_id)!;
  const draft = getDraft(campaign);
  const offers = getOffers(merchant.id);
  const offer = offers.find((o) => o.id === draft?.chosen_offer_id);
  const prov = getProvenance(campaign);
  const sends = getSends(campaign.id);
  const weatherByWindow = new Map(prov.filter((p) => p.kind === "weather").map((p) => [String(JSON.parse(p.input_json).window ?? ""), { kind: p.envelope_status, label: (p.note ?? "").split(": ").slice(1).join(": ") }]));
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
  const statusLabel: Record<string, string> = { drafted: "Draft ready", awaiting_operator: "Agent working", needs_input: "Needs your pick", approved: "Approved", sent: "Published", failed: "Failed" };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href={`/radar?merchant=${merchant.id}`} className="text-sm" style={{ color: "var(--muted)" }}>← Radar</Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Campaign · {statusLabel[campaign.status] ?? campaign.status}</p>
          <h1 className="mt-1 text-4xl">{event.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{event.venue_name} · {fmt.format(new Date(event.starts_at))} · for {merchant.name}</p>
        </div>
        {campaign.status === "drafted" && (
          <form action={`/api/campaigns/${campaign.id}/approve`} method="post">
            <button className="btn btn-primary">Approve and publish →</button>
          </form>
        )}
        {(campaign.status === "approved" || campaign.status === "sent") && <span className="chip" style={{ background: "var(--ok-soft)", color: "var(--ok)", borderColor: "transparent" }}>Published · {sends.length} channels</span>}
      </header>

      {campaign.status === "awaiting_operator" && (
        <section className="card mt-8 p-6" style={{ borderColor: "var(--warn)" }}>
          <h2 className="display text-xl">The agent is working on it</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Provider <code>{provider()}</code>. The brief was written to <code>{relative(process.cwd(), INBOX())}/{campaign.id}.prompt.md</code>. The draft will appear here as <code>{campaign.id}.draft.json</code>; reload to check.
          </p>
        </section>
      )}
      {campaign.status === "needs_input" && (
        <section className="card mt-8 p-6" style={{ borderColor: "var(--warn)" }}>
          <p className="text-sm">The headliner is ambiguous. <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}`} className="underline">Pick the right entity</Link> and draft again.</p>
        </section>
      )}
      {campaign.status === "failed" && (
        <section className="card mt-8 p-6" style={{ borderColor: "var(--danger)" }}>
          <p className="text-sm">The agent failed: {campaign.rationale}</p>
        </section>
      )}

      {sends.length > 0 && (
        <section className="card mt-8 p-5" style={{ borderColor: "var(--ok)" }}>
          <p className="eyebrow">Published</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {sends.map((s) => {
              const payload = s.payload_json ? (JSON.parse(s.payload_json) as Record<string, unknown>) : {};
              const real = !s.simulated && s.status === "sent";
              return (
                <li key={s.id} className="card-flat p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold" style={{ color: "var(--ink)" }}>{CHANNEL_LABEL[s.channel as ChannelId] ?? s.channel}</p>
                    <span className="chip" style={real ? { background: "var(--ok-soft)", color: "var(--ok)", borderColor: "transparent" } : s.status.startsWith("failed") ? { background: "var(--danger-soft)", color: "var(--danger)", borderColor: "transparent" } : { background: "var(--warn-soft)", color: "var(--warn)", borderColor: "transparent" }}>
                      {real ? "sent" : s.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    {typeof payload.to === "string" ? `To ${payload.to}. ` : ""}
                    {typeof payload.status_note === "string" ? payload.status_note : ""}
                    {s.provider_sid ? ` · ${s.provider_sid}` : ""}
                  </p>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px]" style={{ color: "var(--accent)" }}>payload</summary>
                    <pre className="mt-1 max-h-48 overflow-auto rounded-md p-2 text-[11px]" style={{ background: "var(--paper)" }}>{JSON.stringify(payload, null, 2)}</pre>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {draft && (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-[1.25fr_1fr]">
            <div className="card p-6" style={{ borderColor: "var(--accent)" }}>
              <p className="eyebrow">Chosen offer</p>
              <p className="mt-2 font-display text-2xl">{offer?.title ?? draft.chosen_offer_id}</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{offer?.description} · {offer?.price}</p>
              <p className="eyebrow mt-5">Why, according to Qloo</p>
              <p className="mt-2 text-sm leading-relaxed">{draft.rationale}</p>
              <p className="tnum mt-4 text-xs" style={{ color: "var(--muted)" }}>Confidence {(draft.confidence * 100).toFixed(0)}%</p>
            </div>
            <div className="space-y-4">
              <div className="card p-5">
                <p className="eyebrow">Audience</p>
                <p className="mt-2 text-sm leading-relaxed">{draft.audience_summary}</p>
              </div>
              <div className="card p-5">
                <p className="eyebrow">Windows · {merchant.timezone}</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {draft.windows.map((w) => (
                    <li key={w.label}>
                      <span className="font-semibold" style={{ color: "var(--ink)" }}>{w.label}</span> <span className="tnum">{w.start_local} to {w.end_local}</span>
                      {weatherByWindow.get(w.label) && <WeatherChip kind={weatherByWindow.get(w.label)!.kind} label={weatherByWindow.get(w.label)!.label} />}
                      <span className="block text-xs" style={{ color: "var(--muted)" }}>{w.why}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-4 grid gap-4 md:grid-cols-2">
            <Channel title={`Geofenced ad · ${draft.geofenced_ad.platform} · ${draft.geofenced_ad.radius_m} m · $${draft.geofenced_ad.daily_budget_usd}/day`} tag="reaches strangers near the venue">
              <p className="font-display text-lg">{draft.geofenced_ad.headline}</p>
              <p className="text-sm">{draft.geofenced_ad.body}</p>
              <p className="mt-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>{draft.geofenced_ad.cta}</p>
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Interests: {draft.geofenced_ad.interests.join(" · ")}</p>
            </Channel>
            <Channel title="Google Business post" tag="reaches people searching nearby">
              <p className="font-display text-lg">{draft.google_post.title}</p>
              <p className="text-sm">{draft.google_post.body}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{draft.google_post.offer_terms}</p>
            </Channel>
            <Channel title="WhatsApp to regulars" tag="opted-in contacts only">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{draft.whatsapp.message}</p>
            </Channel>
            <Channel title="Storefront" tag="chalkboard and staff">
              <p className="whitespace-pre-wrap font-display text-lg">{draft.storefront.chalkboard}</p>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Staff: “{draft.storefront.staff_line}”</p>
            </Channel>
            <Channel title="Digital screen" tag="simulated">
              <p className="font-display text-lg">{draft.dooh.headline}</p>
              <p className="text-sm">{draft.dooh.body}</p>
            </Channel>
            <div className="card-flat p-5" style={{ borderColor: "var(--warn)" }}>
              <p className="eyebrow">What this does not establish</p>
              <p className="mt-2 text-sm leading-relaxed">{draft.limitations}</p>
            </div>
          </section>
        </>
      )}

      <details className="card-flat mt-8 p-5">
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--ink)" }}>
          Provenance · {prov.length} steps · Qloo live {prov.filter((p) => p.kind === "qloo" && !p.cache_hit).length}, cached {prov.filter((p) => p.kind === "qloo" && p.cache_hit).length}
        </summary>
        <table className="data mt-3 w-full text-xs">
          <tbody>
            {prov.map((r) => (
              <tr key={`${r.kind}-${r.seq}`}>
                <td>{r.seq}</td><td>{r.kind}</td><td><code>{r.workflow}</code></td><td>{r.envelope_status}</td><td className="text-right">{r.result_count}</td>
                <td>{r.kind === "qloo" ? (r.cache_hit ? "cache" : "Qloo live") : r.kind === "llm" ? "agent" : r.kind === "weather" ? "Open-Meteo" : "local"}</td><td style={{ color: "var(--muted)" }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </main>
  );
}

function WeatherChip({ kind, label }: { kind: string; label: string }) {
  const wet = kind === "rain" || kind === "storm" || kind === "snow";
  const style = wet || kind === "cold" ? { background: "var(--warn-soft)", color: "var(--warn)" } : kind === "hot" ? { background: "var(--accent-soft)", color: "var(--accent)" } : { background: "var(--ok-soft)", color: "var(--ok)" };
  return (
    <span className="chip ml-2" style={{ ...style, borderColor: "transparent", fontSize: 11, padding: "1px 8px" }} title="Open-Meteo forecast at your place">
      {label}
    </span>
  );
}

function Channel({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
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
