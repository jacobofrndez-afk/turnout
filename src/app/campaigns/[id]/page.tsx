import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign, getDraft, getProvenance, pollOperatorDraft, provider, INBOX } from "@/server/agent/run";
import { getMerchant } from "@/server/events/radar";
import { getEvent, getOffers } from "@/server/qloo/crowd";
import { relative } from "node:path";
import { getSends, CHANNEL_LABEL, type ChannelId } from "@/server/channels";
import { nb } from "@/lib/nbsp";
import { firstSentences, noScores } from "@/lib/text";

const SIMULATED_NOTE: Partial<Record<ChannelId, string>> = {
  geofenced_ad: "Ready for Snapchat, word for word. It goes out once your ad account is connected.",
  google_post: "Ready for your Google listing. It goes out once the listing is verified.",
  whatsapp: "It goes out once WhatsApp is connected.",
  dooh: "Ready for the screens nearest the venue. It goes out once a screen network is connected.",
};

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let campaign = getCampaign(id);
  if (!campaign) notFound();
  campaign = pollOperatorDraft(campaign);
  const merchant = getMerchant(campaign.merchant_id)!;
  const event = getEvent(campaign.event_id)!;
  const draft = getDraft(campaign);
  const why = draft ? noScores(draft.rationale) : "";
  const whyLead = firstSentences(why, 320);
  const whyRest = why.startsWith(whyLead) ? why.slice(whyLead.length).trim() : "";
  const offers = getOffers(merchant.id);
  const offer = offers.find((o) => o.id === draft?.chosen_offer_id);
  const prov = getProvenance(campaign);
  const sends = getSends(campaign.id);
  const weatherByWindow = new Map(prov.filter((p) => p.kind === "weather").map((p) => [String(JSON.parse(p.input_json).window ?? ""), { kind: p.envelope_status, label: (p.note ?? "").split(": ").slice(1).join(": ") }]));
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
  const statusLabel: Record<string, string> = { drafted: "Draft ready", awaiting_operator: "Agent working", needs_input: "Needs your pick", approved: "Approved", sent: "Published", failed: "Failed" };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href={`/radar?merchant=${merchant.id}`} className="link text-sm">Back to the radar</Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Campaign · {statusLabel[campaign.status] ?? campaign.status}</p>
          <h1 className="t-title mt-2">{event.name}</h1>
          <p className="mt-3 text-base text-[var(--muted)]">{event.venue_name} · {fmt.format(new Date(event.starts_at))} · for {merchant.name}</p>
        </div>
        {(campaign.status === "approved" || campaign.status === "sent") && <span className="chip">{sends.some((s) => s.simulated) ? `Ready on ${sends.length} channels` : `Published · ${sends.length} channels`}</span>}
      </header>

      {campaign.status === "awaiting_operator" && (
        <section className="tone stack-block">
          <h2 className="t-heading">The agent is working on it</h2>
          <p className="mt-3 text-base text-[var(--muted)]">
            Provider <code>{provider()}</code>. The brief was written to <code>{relative(process.cwd(), INBOX())}/{campaign.id}.prompt.md</code>. The draft will appear here as <code>{campaign.id}.draft.json</code>; reload to check.
          </p>
          <div className="mt-8 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line mt-6" /><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
        </section>
      )}
      {campaign.status === "needs_input" && (
        <section className="tone stack-block">
          <p className="text-base">The headliner is ambiguous. <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}`} className="link">Pick the right entity</Link> and draft again.</p>
        </section>
      )}
      {campaign.status === "failed" && (
        <section className="tone stack-block">
          <p className="text-base">The agent failed: {campaign.rationale}</p>
        </section>
      )}

      {sends.length > 0 && (
        <section className="stack-block">
          <p className="eyebrow">{sends.some((s) => s.simulated) ? "Where it goes · simulated in the demo" : "Where it went"}</p>
          <ul className="mt-6 grid gap-x-16 gap-y-8 sm:grid-cols-2">
            {sends.map((s) => {
              const payload = s.payload_json ? (JSON.parse(s.payload_json) as Record<string, unknown>) : {};
              const real = !s.simulated && s.status === "sent";
              return (
                <li key={s.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-[var(--ink)]">{CHANNEL_LABEL[s.channel as ChannelId] ?? s.channel}</p>
                    {!s.simulated && <span className="chip">{real ? "Sent" : s.status}</span>}
                  </div>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    {typeof payload.to === "string" ? `To ${payload.to.replace(/ \(fictional list\)$/, "")}. ` : ""}
                    {s.simulated && SIMULATED_NOTE[s.channel as ChannelId] ? SIMULATED_NOTE[s.channel as ChannelId] : typeof payload.status_note === "string" ? payload.status_note : ""}
                    {s.provider_sid ? ` · ${s.provider_sid}` : ""}
                  </p>
                  <details className="mt-1">
                    <summary className="text-sm font-medium text-[var(--muted)]">See the exact request</summary>
                    <pre className="mt-3 max-h-64 overflow-auto bg-[var(--tone)] p-4 text-[13px] leading-relaxed">{JSON.stringify(payload, null, 2)}</pre>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {draft && (
        <>
          <section className="stack-block grid gap-y-16">
            <div>
              <div className="plate">
                <p className="eyebrow">Chosen offer</p>
                <p className="t-heading mt-4">{offer?.title ?? draft.chosen_offer_id}</p>
                <p className="mt-3 text-lg text-[var(--muted)]">{nb(`${offer?.description ?? ""}. ${offer?.price ?? ""}.`)}</p>
                <p className="mt-6 text-sm text-[var(--muted)] tnum">Confidence {(draft.confidence * 100).toFixed(0)}%</p>
                {campaign.status === "drafted" && (<form action={`/api/campaigns/${campaign.id}/approve`} method="post" className="mt-10"><button className="btn btn-accent btn-lg">Publish it now</button></form>)}
              </div>
              <p className="eyebrow mt-12">Why, according to Qloo</p>
              <p className="t-body mt-3">{nb(whyLead)}</p>
              {whyRest && (<details className="mt-4"><summary className="link w-fit text-base">The rest of the reasoning</summary><p className="t-body mt-3">{nb(whyRest)}</p></details>)}
            </div>
            <div className="space-y-12">
              <div>
                <p className="eyebrow">Audience</p>
                <p className="t-body mt-3">{nb(noScores(draft.audience_summary))}</p>
              </div>
              <div>
                <p className="eyebrow">When the crowd is outside, {merchant.timezone.split("/").pop()!.replace(/_/g, " ")} time</p>
                <ul className="mt-4 space-y-5 text-base">
                  {draft.windows.map((w) => (
                    <li key={w.label}>
                      <span className="font-semibold text-[var(--ink)]">{w.label}</span> <span className="tnum">{w.start_local} to {w.end_local}</span>
                      {weatherByWindow.get(w.label) && <span className="ml-2 text-sm text-[var(--muted)]">· {weatherByWindow.get(w.label)!.label}</span>}
                      <span className="mt-1 block text-base text-[var(--muted)]">{nb(w.why)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="stack-section grid gap-x-16 gap-y-16 md:grid-cols-2">
            <Channel title={`Geofenced ad\u00A0· ${draft.geofenced_ad.platform === "meta" ? "Meta" : "Snapchat"}\u00A0· ${draft.geofenced_ad.radius_m}\u00A0m\u00A0· $${draft.geofenced_ad.daily_budget_usd}/day`} tag="reaches strangers near the venue">
              <p className="t-name">{nb(draft.geofenced_ad.headline)}</p>
              <p className="text-base">{nb(draft.geofenced_ad.body)}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Button: {nb(draft.geofenced_ad.cta)}</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Interests: {nb(draft.geofenced_ad.interests.join(" · "))}</p>
            </Channel>
            <Channel title="Google Business post" tag="reaches people searching nearby">
              <p className="t-name">{nb(draft.google_post.title)}</p>
              <p className="text-base">{nb(draft.google_post.body)}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{nb(draft.google_post.offer_terms)}</p>
            </Channel>
            <Channel title="WhatsApp to regulars" tag="opted-in contacts only">
              <p className="t-body whitespace-pre-wrap">{nb(draft.whatsapp.message)}</p>
            </Channel>
            <Channel title="Storefront" tag="chalkboard and staff">
              <p className="whitespace-pre-wrap t-name">{nb(draft.storefront.chalkboard)}</p>
              <p className="mt-3 text-base text-[var(--muted)]">Staff: “{nb(draft.storefront.staff_line)}”</p>
            </Channel>
            <Channel title="Digital screen" tag="simulated">
              <p className="t-name">{nb(draft.dooh.headline)}</p>
              <p className="text-base">{nb(draft.dooh.body)}</p>
            </Channel>
          </section>
          <section className="stack-block">
            <p className="eyebrow">What this does not establish</p>
            <p className="t-body mt-3">{nb(draft.limitations)}</p>
          </section>
        </>
      )}

      <details className="stack-section">
        <summary className="text-base font-semibold text-[var(--ink)]">Provenance · {prov.length} steps</summary>
        <table className="data mt-6 w-full text-sm">
          <tbody>
            {prov.map((r) => (
              <tr key={`${r.kind}-${r.seq}`}>
                <td>{r.seq}</td><td>{r.kind}</td><td><code>{r.workflow}</code></td><td>{r.envelope_status}</td><td className="text-right">{r.result_count}</td>
                <td>{r.kind === "qloo" ? (r.cache_hit ? "cache" : "Qloo live") : r.kind === "llm" ? "agent" : r.kind === "weather" ? "Open-Meteo" : "local"}</td><td className="text-[var(--muted)]">{r.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="t-meta mt-6 tnum">Qloo calls: {prov.filter((p) => p.kind === "qloo" && !p.cache_hit).length} live, {prov.filter((p) => p.kind === "qloo" && p.cache_hit).length} cached.</p>
      </details>
    </main>
  );
}

function Channel({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-sm tnum">{title}</p>
      <p className="t-meta mt-1">{tag}</p>
      <div className="mt-4 space-y-2">{children}</div>
    </div>
  );
}
