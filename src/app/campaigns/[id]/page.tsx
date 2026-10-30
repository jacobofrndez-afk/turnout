import { campaignEntryView } from '@/lib/campaign-workflow';
import { Icon } from '@/components/Icon';
import { agentWorkspace } from "@/server/agent/review";
import { AgentCampaign } from "@/components/AgentCampaign";
import { EventSource } from "@/components/EventSource";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaign, getDraft, getProvenance, pollOperatorDraft, provider } from "@/server/agent/run";
import { campaignWindows, draftFirstWindow } from "@/server/agent/prompt";
import { getMerchant } from "@/server/events/radar";
import { getEvent, getOffers } from "@/server/qloo/crowd";
import { RefreshEvery } from "@/app/today/RefreshEvery";
import { getSends, deliveryPlan, type ChannelId } from "@/server/channels";
import { deliverySummary } from "@/lib/delivery";
import { CampaignPreview } from "@/components/CampaignPreview";
import { ActionForm } from "@/components/ActionForm";
import { nb } from "@/lib/nbsp";
import { clock, clockRange, clockText } from "@/lib/clock";
import { firstSentences, noScores, plainList, plainWords } from "@/lib/text";
import { getDb } from "@/server/db/client";

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
// SQLite stamps are "YYYY-MM-DD HH:MM:SS" in UTC without a zone; ISO stamps carry theirs.
const parseUtc = (s: string) => Date.parse(/[zZ]$|[+-]\d\d:\d\d$/.test(s) ? s : `${s.replace(" ", "T")}Z`);

export const dynamic = "force-dynamic";

export default async function CampaignPage({ params,searchParams }: { params: Promise<{ id: string }>;searchParams:Promise<{view?:string}> }) {
  const { id } = await params;
  let campaign = getCampaign(id);
  if (!campaign) notFound();
  campaign = pollOperatorDraft(campaign);
  const merchant = getMerchant(campaign.merchant_id);
  const event = getEvent(campaign.event_id);
  if (!merchant || !event) notFound();
  const workspace=campaign.evidence_json?agentWorkspace(id):undefined;
  if(workspace){
    const entry=campaignEntryView(workspace.status,(await searchParams).view);
    return <main className="app-page campaign-workflow-page">
      <header className="workflow-page-heading">
        <div><nav aria-label="Breadcrumb"><Link href={`/campaigns?merchant=${merchant.id}`}>Campaigns</Link><Icon name="chevron" size={12}/><span>{merchant.name}</span></nav><h1>{workspace.offer.title}</h1><p>{workspace.event.name}</p></div>
        <span className="workflow-place"><Icon name="pin" size={16}/>{merchant.name}</span>
      </header>
      <AgentCampaign key={workspace.id} entry={entry} merchantId={merchant.id} event={workspace.event} initial={workspace} writerConnected={provider()==="anthropic"}/>
    </main>;
  }
  // The act, as on Today and Who is coming; a tour title ("Harry Styles: Together, Together") reads like a stutter.
  const actName = (event.origin ?? "ticketmaster") === "ticketmaster" ? ((JSON.parse(event.attractions_json) as { name?: string }[])[0]?.name ?? event.name) : event.name;
  const draft = getDraft(campaign);
  const why = draft ? clockText(plainWords(noScores(draft.rationale)), merchant.timezone) : "";
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
  const eventKey = fmtDayKey.format(new Date(event.starts_at));
  const dayword = eventKey === fmtDayKey.format(new Date(now)) ? "tonight" : eventKey === fmtDayKey.format(new Date(now + 86_400_000)) ? "tomorrow" : new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: tz }).format(new Date(event.starts_at));

  // The night is over once every window has closed (instants, compared in UTC). A draft then has nothing left to publish.
  const wins = campaignWindows(event);
  const lastWindowEnd = Math.max(...wins.map((w) => w.end));
  const nightOver = campaign.status === "drafted" && lastWindowEnd < now;
  // The first window closed but the night goes on: the words were written for "until 7 pm", so Publish waits for a rewrite.
  const firstOver = campaign.status === "drafted" && !nightOver && !!draft && draftFirstWindow(event, draft.windows, tz).end < now;
  const out = ["approved", "sent", "prepared", "partial"].includes(campaign.status) || campaign.status === "failed" && !!draft;
  const outcome = deliverySummary(sends);
  const outSentence = campaign.status === "approved" ? "Delivery was started but has not finished. Check the recorded results below before trying again." : outcome.description;
  // Started in operator mode and never answered: the page must not promise "a few minutes" for hours.
  const stale = campaign.status === "awaiting_operator" && now - parseUtc(campaign.created_at) > 15 * 60_000;

  // The offer in one line, then when the crowd is near, with a verb so it never reads as offer hours:
  // "The crowd is near you before doors, 5:30 to 7:30 pm, and after the show, 10:45 pm to 12:15 am."
  const offerLine = draft && (
    <>
      {offer ? `${nb(`${offer.description.replace(/\.$/, "")}. ${offer.price.replace(/\.$/, "")}.`)} ` : ""}
      {draft.windows.map((w, i) => (
        <span key={w.label}>{i > 0 ? ", and " : "The crowd is near you "}{lowerFirst(w.label)}, <span className="mono">{clockRange(w.start_local, w.end_local, tz)}</span></span>
      ))}.
    </>
  );

  // Only what Publish will send (the merchant's channels, as in publishCampaign), plus the chalkboard, which is the merchant's own.
  const merchantChannels = campaign.dna_snapshot_json ? JSON.parse(campaign.channels_json ?? "[]") as ChannelId[] : JSON.parse((getDb().prepare("SELECT channels_json FROM merchants WHERE id = ?").get(merchant.id) as { channels_json: string } | undefined)?.channels_json ?? "[]") as ChannelId[];
  const channels = [...new Set(["storefront", ...merchantChannels, ...sends.map(s => s.channel)])];
  const plan = draft ? deliveryPlan(merchantChannels, draft) : undefined;
  // Once the first window is over, the old words fold away under the plate: the page is about the rewrite.
  const ChannelsWrap = firstOver ? "details" : "section";

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <Link href={`/today?merchant=${merchant.id}`} className="link">Today</Link>

      {campaign.dna_version && <p className="t-small mt-4">Prepared with Place DNA v{campaign.dna_version}. <Link className="link" href={`/dna?merchant=${merchant.id}`}>Refine future campaigns →</Link></p>}
      <section className="stack-block">
        <div className="plate">
          <EventSource event={event} timezone={tz} />
          <p className="eyebrow">Your campaign for {dayword}{!draft && campaign.status === "awaiting_operator" ? "" : (event.origin ?? "ticketmaster") === "ticketmaster" ? `, ${actName} at ${event.venue_name}` : event.origin === "wave" ? `, ${lowerFirst(actName)}` : `, ${actName}`}</p>
          {draft ? (
            <>
              <h1 className="t-display mt-5">{firstOver ? wins[wins.length - 1].label : (offer?.title ?? draft.chosen_offer_id)}</h1>
              {out ? (
                <>
                  <p className="t-name mt-5">{campaign.status === "approved" ? "Delivery needs checking" : outcome.title}</p><p className="t-body mt-3">{outSentence}</p>
                  <p className="t-body mt-4">{offerLine}</p>
                </>
              ) : (
                <p className="t-lead mt-5">{firstOver ? <>{wins[wins.length - 1].start <= now ? <>The crowd came out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span> and is near you until <span className="mono">{clock(wins[wins.length - 1].end, tz)}</span>.</> : <>The crowd went in at <span className="mono">{clock(wins[0].end, tz)}</span> and comes out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span>.</>} These words were for {lowerFirst(wins[0].label)}, so nothing goes out until Turnout writes new ones.</> : offerLine}</p>
              )}
              {campaign.status === "drafted" && !nightOver && !firstOver && (
                <div className="mt-8"><ActionForm action={`/api/campaigns/${campaign.id}/approve`} label={plan!.label} pendingLabel="Saving campaign…" /><p className="t-small mt-4 max-w-2xl">{plan!.description}</p></div>
              )}
              {firstOver && (
                <>
                  <ActionForm action="/api/campaigns" className="mt-8" label={`Write it for ${lowerFirst(wins[wins.length - 1].label)}`} pendingLabel="Rewriting…"><input type="hidden" name="merchant" value={merchant.id} /><input type="hidden" name="event" value={event.id} /></ActionForm>
                </>
              )}
              {nightOver && (
                <p className="t-body mt-10">This night has passed. The windows closed on {fmtDay.format(new Date(lastWindowEnd))}. Write a new campaign for the next crowd from <Link href={`/today?merchant=${merchant.id}`} className="link">Today</Link>.</p>
              )}
            </>
          ) : campaign.status === "awaiting_operator" && provider() === "operator" ? (
            <>
              <h1 className="t-display mt-5">Automatic writing is not connected.</h1>
              <p className="t-lead mt-5">Your request for {actName} is saved. This setup needs a draft to be supplied manually; waiting here will not generate one.</p>
              <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}`} className="btn btn-primary btn-lg mt-8">Read the crowd insights</Link>
              <details className="mt-5"><summary className="link">How to enable writing</summary><p className="t-body mt-3">Configure the campaign writer on the server, or provide the draft in the project’s agent inbox. Your API key stays on the server.</p></details>
            </>
          ) : stale ? (
            <>
              <h1 className="t-display mt-5">{actName}</h1>
              <p className="t-lead mt-5">Turnout started your campaign at {clock(parseUtc(campaign.created_at), tz)} and has not finished it.{lastWindowEnd < now ? "" : " See who is coming, then write it again."}</p>
              {lastWindowEnd < now
                ? <p className="t-body mt-10">This night has passed. Write a new campaign for the next crowd from <Link href={`/today?merchant=${merchant.id}`} className="link">Today</Link>.</p>
                : <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}`} className="btn btn-accent btn-lg mt-10">See who is coming</Link>}
            </>
          ) : campaign.status === "awaiting_operator" ? (
            <div aria-busy="true">
              <h1 className="t-display mt-5">{actName}</h1>
              <p className="t-lead mt-5">{provider() === "operator" ? "Turnout has started this campaign. It appears here as soon as it is written; this page refreshes on its own." : "Turnout reads the crowd through Qloo and writes every channel. A few minutes; this page refreshes on its own."}</p>
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
              <p className="t-lead mt-5">The campaign could not be completed. Your existing campaigns are still available.</p><Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}`} className="btn btn-primary btn-lg mt-8">Try again from the crowd</Link><details className="mt-5"><summary className="link">Error details</summary><p className="t-body mt-3">{campaign.rationale}</p></details>
            </>
          ) : (
            <p className="t-lead mt-5">Nothing to read for this campaign yet.</p>
          )}
        </div>
      </section>

      {draft && channels.length > 0 && (
        <ChannelsWrap className="stack-section">
          {firstOver ? <summary className="link w-fit text-base">{`The words written for ${lowerFirst(wins[0].label)}`}</summary> : <h2 className="t-title">{nightOver ? "What was written" : "Your campaign materials"}</h2>}
          {draft && <CampaignPreview validTiming={draftFirstWindow(event,draft.windows,tz).end > now} draft={draft} merchantId={merchant.id} merchantName={merchant.name} channels={channels} sends={sends} />}
        </ChannelsWrap>
      )}

      {draft && (
        <>
          {!firstOver && (<section className="stack-section">
            <h2 className="t-title">Why</h2>
            <p className="t-body measure mt-6">{nb(whyLead)}</p>
            <p className="t-body measure mt-4">{draft.confidence >= 0.75 ? "Turnout is fairly sure of this choice." : "Turnout is less sure of this choice; read it closely."}</p>
            <details className="mt-4">
              <summary className="link w-fit text-base">The rest of the reasoning</summary>
              {whyRest && <p className="t-body measure mt-3">{nb(whyRest)}</p>}
              {draft.windows.map((w) => {
                const weather = weatherByWindow.get(w.label);
                return (
                  <p key={w.label} className="t-body measure mt-3">
                    {w.label}, <span className="mono">{clockRange(w.start_local, w.end_local, tz)}</span>{weather ? `, ${lowerFirst(weather)}` : ""}. {nb(clockText(w.why, tz))}
                  </p>
                );
              })}
              <p className="t-body measure mt-3">Who they are: {nb(plainWords(noScores(draft.audience_summary)))}</p>
            </details>
          </section>)}

          <section className="stack-section">
            <h2 className="t-title">What Turnout cannot know</h2>
            <p className="t-body measure mt-6">{nb(plainWords(noScores(draft.limitations)))}</p>
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
