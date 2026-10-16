import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign, getDraft, getProvenance, pollOperatorDraft, provider, INBOX } from "@/server/agent/run";
import { getMerchant } from "@/server/events/radar";
import { getEvent, getOffers } from "@/server/qloo/crowd";
import { relative } from "node:path";

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
  const panel = { background: "var(--panel)", border: "1px solid var(--line)" } as const;
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/radar?merchant=${merchant.id}`} className="text-sm" style={{ color: "var(--accent-2)" }}>← Radar</Link>
      <header className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--accent-2)" }}>Campaign · {campaign.status.replace("_", " ")}</p>
          <h1 className="text-3xl font-semibold">{event.name}</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>{event.venue_name} · {fmt.format(new Date(event.starts_at))} · for {merchant.name}</p>
        </div>
        {campaign.status === "drafted" && (
          <form action={`/api/campaigns/${campaign.id}/approve`} method="post">
            <button className="rounded-md px-5 py-3 font-medium text-white" style={{ background: "var(--ok)", color: "#062" }}>Approve and publish</button>
          </form>
        )}
      </header>

      {campaign.status === "awaiting_operator" && (
        <section className="mt-6 rounded-lg p-4" style={{ ...panel, borderColor: "var(--warn)" }}>
          <h2 className="font-medium">Waiting for the agent</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Provider: <code>{provider()}</code>. The prompt was written to <code>{relative(process.cwd(), INBOX())}/{campaign.id}.prompt.md</code>. Drop <code>{campaign.id}.draft.json</code> next to it and reload this page.
          </p>
        </section>
      )}
      {campaign.status === "needs_input" && (
        <section className="mt-6 rounded-lg p-4" style={{ ...panel, borderColor: "var(--warn)" }}>
          <p className="text-sm">The headliner is ambiguous. <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}`} style={{ color: "var(--accent-2)" }}>Pick the right entity</Link> and draft again.</p>
        </section>
      )}
      {campaign.status === "failed" && (
        <section className="mt-6 rounded-lg p-4" style={{ ...panel, borderColor: "#7f1d1d" }}>
          <p className="text-sm">The agent failed: {campaign.rationale}</p>
        </section>
      )}

      {draft && (
        <>
          <section className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <div className="rounded-lg p-4" style={{ ...panel, borderColor: "var(--accent)" }}>
              <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Chosen offer</h2>
              <p className="mt-1 text-xl font-semibold">{offer?.title ?? draft.chosen_offer_id}</p>
              <p className="text-sm" style={{ color: "var(--muted)" }}>{offer?.description} · {offer?.price}</p>
              <h3 className="mt-4 text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Why, according to Qloo</h3>
              <p className="mt-1 text-sm leading-relaxed">{draft.rationale}</p>
              <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Confidence {(draft.confidence * 100).toFixed(0)}%</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg p-4" style={panel}>
                <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Audience</h2>
                <p className="mt-1 text-sm">{draft.audience_summary}</p>
              </div>
              <div className="rounded-lg p-4" style={panel}>
                <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>Windows ({merchant.timezone})</h2>
                <ul className="mt-1 space-y-1 text-sm">
                  {draft.windows.map((w) => (
                    <li key={w.label}><span className="font-medium">{w.label}</span> {w.start_local} to {w.end_local} <span style={{ color: "var(--muted)" }}>· {w.why}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-4 grid gap-4 md:grid-cols-2">
            <Channel title={`Geofenced ad · ${draft.geofenced_ad.platform} · ${draft.geofenced_ad.radius_m} m · $${draft.geofenced_ad.daily_budget_usd}/day`} tag="reaches strangers near the venue">
              <p className="font-medium">{draft.geofenced_ad.headline}</p>
              <p className="text-sm">{draft.geofenced_ad.body}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--accent-2)" }}>{draft.geofenced_ad.cta}</p>
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Interests: {draft.geofenced_ad.interests.join(" · ")}</p>
            </Channel>
            <Channel title="Google Business post" tag="reaches people searching nearby">
              <p className="font-medium">{draft.google_post.title}</p>
              <p className="text-sm">{draft.google_post.body}</p>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{draft.google_post.offer_terms}</p>
            </Channel>
            <Channel title="WhatsApp to regulars" tag="opted-in contacts only">
              <p className="whitespace-pre-wrap text-sm">{draft.whatsapp.message}</p>
            </Channel>
            <Channel title="Storefront" tag="chalkboard and staff">
              <p className="whitespace-pre-wrap font-medium">{draft.storefront.chalkboard}</p>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Staff: “{draft.storefront.staff_line}”</p>
            </Channel>
            <Channel title="Digital screen (simulated)" tag="DOOH near the venue">
              <p className="font-medium">{draft.dooh.headline}</p>
              <p className="text-sm">{draft.dooh.body}</p>
            </Channel>
            <div className="rounded-lg p-4" style={{ ...panel, borderColor: "var(--warn)" }}>
              <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>What this does not establish</h2>
              <p className="mt-1 text-sm">{draft.limitations}</p>
            </div>
          </section>
        </>
      )}

      <details className="mt-6 rounded-lg p-4" style={panel}>
        <summary className="cursor-pointer text-sm font-medium">Provenance: {prov.length} steps · Qloo live {prov.filter((p) => p.kind === "qloo" && !p.cache_hit).length}, cached {prov.filter((p) => p.kind === "qloo" && p.cache_hit).length}</summary>
        <table className="mt-3 w-full text-xs">
          <tbody>
            {prov.map((r) => (
              <tr key={`${r.kind}-${r.seq}`} style={{ borderTop: "1px solid var(--line)" }}>
                <td className="py-1 pr-2">{r.seq}</td><td className="pr-2">{r.kind}</td><td className="pr-2"><code>{r.workflow}</code></td><td className="pr-2">{r.envelope_status}</td><td className="pr-2 text-right">{r.result_count}</td>
                <td className="pr-2">{r.kind === "qloo" ? (r.cache_hit ? "cache" : "Qloo live") : r.kind === "llm" ? "agent" : "local"}</td><td style={{ color: "var(--muted)" }}>{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </main>
  );
}

function Channel({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg p-4" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-xs uppercase tracking-wider" style={{ color: "var(--muted)" }}>{title}</h2>
        <span className="text-[10px]" style={{ color: "var(--accent-2)" }}>{tag}</span>
      </div>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}
