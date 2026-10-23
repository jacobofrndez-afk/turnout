import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign, getDraft, getProvenance, pollOperatorDraft } from "@/server/agent/run";
import { campaignWindows } from "@/server/agent/prompt";
import { getMerchant } from "@/server/events/radar";
import { getEvent, getOffers } from "@/server/qloo/crowd";
import { RefreshEvery } from "@/app/today/RefreshEvery";
import { getSends, type ChannelId, type SendRow } from "@/server/channels";
import { nb } from "@/lib/nbsp";
import { firstSentences, noScores } from "@/lib/text";

const SIMULATED_NOTE: Partial<Record<ChannelId, string>> = {
  geofenced_ad: "Ready for Snapchat, word for word. It goes out once your ad account is connected.",
  google_post: "Ready for your Google listing. It goes out once the listing is verified.",
  whatsapp: "It goes out once WhatsApp is connected.",
  dooh: "Ready for the screens nearest the venue. It goes out once a screen network is connected.",
};

// The channels in the order a merchant reads them: the door first, then the people they know, then strangers.
const CHANNEL_ORDER: ChannelId[] = ["storefront", "whatsapp", "geofenced_ad", "google_post", "dooh"];
const CHANNEL_NAME: Record<ChannelId, string> = {
  storefront: "On your chalkboard",
  whatsapp: "To your regulars on WhatsApp",
  geofenced_ad: "To strangers around the venue",
  google_post: "On your Google listing",
  dooh: "On the screens near the venue",
};

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
// SQLite stamps are "YYYY-MM-DD HH:MM:SS" in UTC without a zone; ISO stamps carry theirs.
const parseUtc = (s: string) => Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(s) ? s : `${s.replace(" ", "T")}Z`);

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
  const sendByChannel = new Map(sends.map((s) => [s.channel, s]));
  const weatherByWindow = new Map(prov.filter((p) => p.kind === "weather").map((p) => [String(JSON.parse(p.input_json).window ?? ""), (p.note ?? "").split(": ").slice(1).join(": ")]));

  const tz = merchant.timezone;
  const now = Date.now();
  const fmtDayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz });
  const fmtClock = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
  const eventKey = fmtDayKey.format(new Date(event.starts_at));
  const dayword = eventKey === fmtDayKey.format(new Date(now)) ? "tonight" : eventKey === fmtDayKey.format(new Date(now + 86_400_000)) ? "tomorrow" : new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: tz }).format(new Date(event.starts_at));

  // The night is over once every window has closed (instants, compared in UTC). A draft then has nothing left to publish.
  const lastWindowEnd = Math.max(...campaignWindows(event).map((w) => w.end));
  const nightOver = campaign.status === "drafted" && lastWindowEnd < now;
  const out = campaign.status === "approved" || campaign.status === "sent";
  const sentAt = sends.length ? Math.min(...sends.map((s) => parseUtc(s.sent_at))) : undefined;
  const outSentence = sends.length === 0 ? "Going out now." : sends.some((s) => s.simulated) ? `Ready on ${sends.length} channels.` : `Out since ${fmtClock.format(sentAt)} on ${fmtDay.format(sentAt)}.`;

  // The offer in one line, then the windows: "Before doors 17:30 to 19:30, after the show 22:45 to 00:15."
  const offerLine = draft && (
    <>
      {offer ? `${nb(`${offer.description.replace(/\.$/, "")}. ${offer.price.replace(/\.$/, "")}.`)} ` : ""}
      {draft.windows.map((w, i) => (
        <span key={w.label}>{i > 0 ? `, ${lowerFirst(w.label)}` : w.label} <span className="mono">{w.start_local} to {w.end_local}</span></span>
      ))}.
    </>
  );

  const channels: ChannelId[] = CHANNEL_ORDER.filter((c) => draft || sendByChannel.has(c));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href={`/today?merchant=${merchant.id}`} className="link text-sm">Today</Link>

      <section className="stack-block">
        <div className="plate">
          <p className="eyebrow">Your campaign for {dayword}, {event.name} at {event.venue_name}</p>
          {draft ? (
            <>
              <h1 className="t-display mt-5">{offer?.title ?? draft.chosen_offer_id}</h1>
              {out ? (
                <>
                  <p className="t-lead mt-5">{outSentence}</p>
                  <p className="t-body mt-4">{offerLine}</p>
                </>
              ) : (
                <p className="t-lead mt-5">{offerLine}</p>
              )}
              {campaign.status === "drafted" && !nightOver && (
                <form action={`/api/campaigns/${campaign.id}/approve`} method="post" className="mt-10"><button className="btn btn-accent btn-lg">Publish</button></form>
              )}
              {nightOver && (
                <p className="t-body mt-10">This night has passed. The windows closed on {fmtDay.format(new Date(lastWindowEnd))}. Write a new campaign for the next crowd from <Link href={`/today?merchant=${merchant.id}`} className="link">Today</Link>.</p>
              )}
            </>
          ) : campaign.status === "awaiting_operator" ? (
            <div aria-busy="true">
              <h1 className="t-display mt-5">Writing your campaign</h1>
              <p className="t-lead mt-5">Turnout reads the crowd through Qloo and writes every channel. A few minutes; this page refreshes on its own.</p>
              <div className="mt-8 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line mt-6" /><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
              <RefreshEvery seconds={20} />
            </div>
          ) : campaign.status === "needs_input" ? (
            <>
              <h1 className="t-display mt-5">One question first</h1>
              <p className="t-lead mt-5">Qloo knows several acts by that name. Pick the right one and the campaign writes itself.</p>
              <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}`} className="btn btn-accent btn-lg mt-10">Pick the act</Link>
            </>
          ) : campaign.status === "failed" ? (
            <>
              <h1 className="t-display mt-5">Turnout could not write this one</h1>
              <p className="t-lead mt-5">{campaign.rationale}</p>
            </>
          ) : (
            <p className="t-lead mt-5">Nothing to read for this campaign yet.</p>
          )}
        </div>
      </section>

      {channels.length > 0 && (
        <section className="stack-section">
          <h2 className="t-title">What goes out</h2>
          <div className="mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2">
            {channels.map((c) => {
              const send = sendByChannel.get(c);
              return (
                <div key={c}>
                  <h3 className="t-heading">{CHANNEL_NAME[c]}</h3>
                  {draft && (
                    <div className="mt-4 space-y-3">
                      {c === "storefront" && (
                        <>
                          <p className="t-name whitespace-pre-wrap">{nb(draft.storefront.chalkboard)}</p>
                          <p className="t-body text-[var(--muted)]">Your staff say: “{nb(draft.storefront.staff_line)}”</p>
                        </>
                      )}
                      {c === "whatsapp" && <p className="t-body whitespace-pre-wrap">{nb(draft.whatsapp.message)}</p>}
                      {c === "geofenced_ad" && (
                        <>
                          <p className="t-name">{nb(draft.geofenced_ad.headline)}</p>
                          <p className="t-body">{nb(draft.geofenced_ad.body)}</p>
                          <p className="t-body text-[var(--muted)]">
                            Within <span className="mono">{draft.geofenced_ad.radius_m} m</span> of the venue, on {draft.geofenced_ad.platform === "meta" ? "Meta" : "Snapchat"}, <span className="mono">${draft.geofenced_ad.daily_budget_usd}</span> a day. Button: {nb(draft.geofenced_ad.cta)}.
                          </p>
                          <p className="t-body text-[var(--muted)]">Aimed at people into: {nb(draft.geofenced_ad.interests.join(", "))}.</p>
                        </>
                      )}
                      {c === "google_post" && (
                        <>
                          <p className="t-name">{nb(draft.google_post.title)}</p>
                          <p className="t-body">{nb(draft.google_post.body)}</p>
                          <p className="t-body text-[var(--muted)]">{nb(draft.google_post.offer_terms)}</p>
                        </>
                      )}
                      {c === "dooh" && (
                        <>
                          <p className="t-name">{nb(draft.dooh.headline)}</p>
                          <p className="t-body">{nb(draft.dooh.body)}</p>
                        </>
                      )}
                    </div>
                  )}
                  {send && <SendStatus send={send} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {draft && (
        <>
          <section className="stack-section">
            <h2 className="t-title">Why</h2>
            <p className="t-body measure mt-6">{nb(whyLead)}</p>
            {(whyRest || draft.windows.length > 0) && (
              <details className="mt-4">
                <summary className="link w-fit text-base">The rest of the reasoning</summary>
                {whyRest && <p className="t-body measure mt-3">{nb(whyRest)}</p>}
                {draft.windows.map((w) => {
                  const weather = weatherByWindow.get(w.label);
                  return (
                    <p key={w.label} className="t-body measure mt-3">
                      {w.label}, <span className="mono">{w.start_local} to {w.end_local}</span>{weather ? `, ${lowerFirst(weather)}` : ""}. {nb(w.why)}
                    </p>
                  );
                })}
              </details>
            )}
            <p className="t-body measure mt-6">Who they are: {nb(noScores(draft.audience_summary))}</p>
            <p className="t-body measure mt-6">{draft.confidence >= 0.75 ? "Turnout is fairly sure of this choice." : "Turnout is less sure of this choice; read it closely."}</p>
          </section>

          <section className="stack-section">
            <h2 className="t-title">What this does not establish</h2>
            <p className="t-body measure mt-6">{nb(noScores(draft.limitations))}</p>
          </section>
        </>
      )}

      <details className="stack-section">
        <summary className="link w-fit text-base">How Turnout got here, {prov.length} steps</summary>
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

// Where one channel stands once the campaign is out: who it went to, what still has to be connected, the exact request.
function SendStatus({ send }: { send: SendRow }) {
  const payload = send.payload_json ? (JSON.parse(send.payload_json) as Record<string, unknown>) : {};
  const real = !send.simulated && send.status === "sent";
  const state = send.simulated ? "" : real ? "Sent. " : `${send.status}. `;
  const to = typeof payload.to === "string" ? `To ${payload.to.replace(/ \(fictional list\)$/, "")}. ` : "";
  const note = send.simulated ? SIMULATED_NOTE[send.channel] ?? "" : typeof payload.status_note === "string" ? payload.status_note : "";
  return (
    <div className="mt-5">
      <p className="t-body text-[var(--muted)]">{state}{to}{note}{send.provider_sid ? ` Reference ${send.provider_sid}.` : ""}</p>
      <details className="mt-2">
        <summary className="link w-fit text-base">See the exact request</summary>
        <pre className="mt-3 max-h-64 overflow-auto bg-[var(--tone)] p-4 text-[13px] leading-relaxed">{JSON.stringify(payload, null, 2)}</pre>
      </details>
    </div>
  );
}
