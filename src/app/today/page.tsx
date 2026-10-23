import Link from "next/link";
import { nb } from "@/lib/nbsp";
import { getMerchant, listMerchants, radarFor, type RadarItem } from "@/server/events/radar";
import { presenceWindow } from "@/server/events/concentration";
import { getDb } from "@/server/db/client";
import { getCampaign, getDraft, pollOperatorDraft, type CampaignRow } from "@/server/agent/run";
import { getOffers } from "@/server/qloo/crowd";
import { getBrief, latestPulse } from "@/server/agent/pulse";
import { listAlerts } from "@/server/agent/scan";
import { weatherWindow } from "@/server/weather/openmeteo";

export const dynamic = "force-dynamic";

// The merchant's home: what is coming, what it could bring, and the one thing to do about it.
// Plain words, one action. The radar, the crowd page and the pulse are where to look further.
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const sp = await searchParams;
  const merchants = listMerchants().filter((m) => m.id === "m_penn_pour" || m.id === "m_quai_bercy" || m.id === (sp.merchant ?? ""));
  const merchant = getMerchant(sp.merchant ?? merchants[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl">No place yet</h1>
        <p className="mt-2" style={{ color: "var(--muted)" }}>
          <Link href="/start" className="link">Set up your place</Link> in two minutes.
        </p>
      </main>
    );
  }
  const now = Date.now();
  const seats = Math.max(10, merchant.seats ?? 60);
  let items: RadarItem[] = [];
  let error: string | undefined;
  try {
    items = await radarFor(merchant, 48);
  } catch (e) {
    error = (e as Error).message;
  }
  const upcoming = items.filter((it) => it.interesting && presenceWindow(it.event).leave > now).sort((a, b) => presenceWindow(a.event).arrive - presenceWindow(b.event).arrive);
  // The hero is the strongest moment of the coming twelve hours (the one worth a campaign now), not merely the next one.
  const soon = upcoming.filter((it) => presenceWindow(it.event).arrive <= now + 12 * 3_600_000);
  const next = (soon.length ? soon : upcoming).slice().sort((a, b) => b.potentialGuests - a.potentialGuests)[0];
  const later = upcoming.filter((it) => it !== next).slice(0, 3);
  const tz = merchant.timezone;
  const fmtTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
  const fmtDayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  const fmtWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: tz });
  const todayKey = fmtDayKey.format(new Date(now));
  const tomorrowKey = fmtDayKey.format(new Date(now + 86_400_000));
  const dayOf = (t: number) => {
    const k = fmtDayKey.format(new Date(t));
    return k === todayKey ? "Today" : k === tomorrowKey ? "Tomorrow" : fmtWeekday.format(new Date(t));
  };
  const offers = getOffers(merchant.id);

  // The campaign for the next crowd, if the agent (or the merchant) already made one.
  let campaign: CampaignRow | undefined;
  let weather: string | undefined;
  if (next) {
    const row = getDb().prepare("SELECT * FROM campaigns WHERE merchant_id = ? AND event_id = ? ORDER BY created_at DESC LIMIT 1").get(merchant.id, next.event.id) as CampaignRow | undefined;
    campaign = row ? pollOperatorDraft(getCampaign(row.id)!) : undefined;
    const w = presenceWindow(next.event);
    try {
      weather = (await weatherWindow(merchant.lat, merchant.lon, new Date(w.arrive).toISOString(), new Date(w.leave).toISOString(), tz))?.label;
    } catch {
      weather = undefined;
    }
  }
  const draft = campaign ? getDraft(campaign) : undefined;
  const offer = draft ? offers.find((o) => o.id === draft.chosen_offer_id) : undefined;
  const brief = getBrief(latestPulse(merchant.id));
  const weekOffer = brief ? offers.find((o) => o.id === brief.featured_offer_id) : undefined;
  const alerts = listAlerts(merchant.id, 3);
  const dateLine = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date(now));

  const w0 = next ? presenceWindow(next.event) : undefined;
  const others = merchants.filter((m) => m.id !== merchant.id);
  const crowdLine = next && w0 ? (
    <>
      {dayOf(w0.start)} from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span>, {next.event.name.charAt(0).toLowerCase() + next.event.name.slice(1)}: about {next.capacity.toLocaleString("en-US")} people
      {next.event.origin === "tv" || next.event.origin === "calendar" ? " around you" : ` ${next.distanceKm.toFixed(1)}\u00A0km from your door`}. Turnout expects <b style={{ color: "var(--ink)" }}>about {next.potentialGuests} extra guests</b>, {Math.min(100, Math.round(next.fill * 100))}% of your {seats} seats.{weather ? ` ${weather} at your door.` : ""}
    </>
  ) : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header>
        <p className="eyebrow">{dateLine} · {merchant.city}</p>
        <h1 className="t-heading mt-3">Today at {merchant.name}</h1>
        {others.length > 0 && (
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            Also yours:{" "}
            {others.map((m, i) => (
              <span key={m.id}>
                {i > 0 ? ", " : ""}
                <Link href={`/today?merchant=${m.id}`} className="link">{m.name}, {m.city}</Link>
              </span>
            ))}
          </p>
        )}
      </header>

      {error && (
        <p className="mt-8 bg-[var(--danger-soft)] px-5 py-4 text-base text-[var(--danger)]">Could not read the events right now: {error}</p>
      )}

      {/* One thing in charge: the campaign to launch. The crowd is the reason, in prose, underneath. */}
      {next && w0 && campaign?.status === "drafted" && draft ? (
        <section className="stack-block">
          <div className="plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">
            <p className="eyebrow flex items-center gap-3"><span className="live-dot" aria-hidden="true" />Your campaign for {dayOf(w0.start).toLowerCase()}, ready to publish</p>
            <h2 className="t-display mt-5">{offer?.title ?? draft.chosen_offer_id}</h2>
            {offer && <p className="t-lead mt-5">{offer.description}. {offer.price}.</p>}
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <form action={`/api/campaigns/${campaign.id}/approve`} method="post">
                <button className="btn btn-accent btn-lg">Publish it now</button>
              </form>
              <Link href={`/campaigns/${campaign.id}`} className="link text-base">Read every word, change anything</Link>
            </div>
          </div>

          <div className="stack-block grid gap-x-16 gap-y-12 md:grid-cols-3">
            <div>
              <p className="eyebrow">On your chalkboard</p>
              <p className="t-name mt-4 whitespace-pre-wrap">{nb(draft.storefront.chalkboard)}</p>
            </div>
            <div>
              <p className="eyebrow">To your regulars, on WhatsApp</p>
              <p className="t-body mt-4 whitespace-pre-wrap">{nb(draft.whatsapp.message)}</p>
            </div>
            <div>
              <p className="eyebrow">To strangers, {draft.geofenced_ad.radius_m}&nbsp;m around the venue</p>
              <p className="t-name mt-4">{nb(draft.geofenced_ad.headline)}</p>
              <p className="t-body mt-3">{nb(draft.geofenced_ad.body)}</p>
              <p className="mt-4 text-sm text-[var(--muted)] tnum">{draft.windows.map((w) => `${w.label}, ${w.start_local} to ${w.end_local}`).join(" · ")} · ${draft.geofenced_ad.daily_budget_usd} a day</p>
            </div>
          </div>

          <div className="stack-section max-w-3xl">
            <p className="eyebrow">Why this, why now</p>
            <p className="t-lead mt-4">{crowdLine}</p>
            <p className="t-body mt-4 text-[var(--muted)]">{nb(firstSentences(draft.rationale, 320))}</p>
          </div>
        </section>
      ) : next && w0 ? (
        <section className="stack-block">
          <div className="plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">
            <p className="eyebrow flex items-center gap-3"><span className="live-dot" aria-hidden="true" />Next crowd at your door</p>
            <h2 className="t-title mt-5">{next.event.name}</h2>
            <p className="t-lead mt-5">{crowdLine}</p>
            <div className="mt-10">
              {campaign?.status === "sent" || campaign?.status === "approved" ? (
                <>
                  <p className="t-name">{offer?.title ?? "Your campaign"} is out</p>
                  <Link href={`/campaigns/${campaign.id}`} className="mt-3 inline-flex text-base link">See where it went</Link>
                </>
              ) : campaign?.status === "awaiting_operator" ? (
                <>
                  <p className="t-name">Your campaign is being written</p>
                  <p className="mt-2 max-w-2xl text-base">The agent has read the crowd through Qloo and is choosing your offer and the words. Come back in a minute.</p>
                  <Link href={`/campaigns/${campaign.id}`} className="mt-3 inline-flex text-base link">Follow it</Link>
                </>
              ) : campaign?.status === "needs_input" ? (
                <>
                  <p className="t-name">One question before the campaign</p>
                  <p className="mt-2 max-w-2xl text-base">Qloo knows several acts by that name. Pick the right one and the campaign writes itself.</p>
                  <Link href={`/campaigns/new?merchant=${merchant.id}&event=${next.event.id}`} className="btn btn-accent btn-lg mt-6">Pick the act</Link>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                  <form action="/api/campaigns" method="post">
                    <input type="hidden" name="merchant" value={merchant.id} />
                    <input type="hidden" name="event" value={next.event.id} />
                    <button className="btn btn-accent btn-lg">Write my campaign</button>
                  </form>
                  <Link href={`/campaigns/new?merchant=${merchant.id}&event=${next.event.id}`} className="text-base link">See who is coming first</Link>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-16">
          <p className="eyebrow">Next crowd at your door</p>
          <h2 className="t-title mt-4">Nothing big enough for your {seats} seats in the next two days</h2>
          <p className="t-lead mt-5 text-[var(--muted)]">Turnout keeps watching every hour. Your everyday offer, below, does the work meanwhile.</p>
        </section>
      )}

      <div className="stack-section grid gap-x-24 gap-y-20 md:grid-cols-2">
        <section>
          <p className="eyebrow">Also coming</p>
          {later.length === 0 && <div className="empty"><p className="empty-title">Nothing else this week</p><p>Nothing else worth a campaign in the next two days.</p></div>}
          <ul className="mt-6 space-y-10">
            {later.map((it) => {
              const w = presenceWindow(it.event);
              return (
                <li key={it.event.id}>
                  <p className="text-sm text-[var(--muted)] tnum">
                    {dayOf(w.start)} <span className="mono">{fmtTime.format(new Date(w.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w.leave))}</span>
                  </p>
                  <p className="t-name mt-2">{it.event.name}</p>
                  <p className="mt-1 text-base">About {it.potentialGuests} extra guests, {Math.min(100, Math.round(it.fill * 100))}% of your seats</p>
                </li>
              );
            })}
          </ul>
          <Link href={`/radar?merchant=${merchant.id}`} className="mt-6 inline-flex text-base link">The next three days on the radar</Link>
        </section>

        <section>
          <p className="eyebrow">Every day this week</p>
          {brief ? (
            <>
              <p className="t-name mt-4">{weekOffer?.title ?? brief.featured_offer_id}</p>
              <p className="mt-2 text-base">{nb(brief.street_in_one_line)}</p>
              <p className="t-name mt-6 whitespace-pre-wrap">{nb(brief.chalkboard)}</p>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Your chalkboard line for a normal weekday.</p>
            </>
          ) : (
            <div className="empty"><p className="empty-title">No weekly plan yet</p><p>Turnout reads the people who walk past your door on a normal day and picks the offer to feature all week.</p></div>
          )}
          <Link href={`/pulse?merchant=${merchant.id}`} className="mt-6 inline-flex text-base link">{brief ? "This week's plan" : "Read your street"}</Link>
        </section>
      </div>

      <section className="stack-section">
        <p className="eyebrow">What Turnout did on its own</p>
        {alerts.length === 0 ? (
          <div className="empty"><p className="empty-title">Nothing yet</p><p>Every hour, Turnout scans for crowds, writes the campaign for the strongest new one and alerts you.</p></div>
        ) : (
          <>
            <ul className="mt-6 space-y-4 text-base">
              {alerts.map((a) => (
                <li key={a.id} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-x-6 sm:grid-cols-[6.5rem_1fr_auto]">
                  <span className="t-clock text-[var(--muted)]">{new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"))}</span>
                  <span>{a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"}</span>
                  {a.status === "failed" && <span className="col-start-2 text-sm text-[var(--danger)] sm:col-start-auto">Failed to send</span>}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm text-[var(--muted)]">{alerts.some((a) => a.status === "simulated") ? "Recorded here; WhatsApp is not connected yet." : "Each one was sent to you on WhatsApp."}</p>
          </>
        )}
        <Link href={`/alerts?merchant=${merchant.id}`} className="mt-4 inline-flex text-base link">All alerts</Link>
      </section>
    </main>
  );
}

// Whole sentences only, up to about `max` characters: a cut mid-word reads as a bug. A full stop counts as a
// sentence end only when a space and a capital letter follow it, so "0.92" or "5 to 7 pm. The" behave.
function firstSentences(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = "";
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c !== "." && c !== "!" && c !== "?") continue;
    const atEnd = i === text.length - 1;
    const next = text[i + 1];
    const after = text[i + 2];
    const capital = !!after && after !== after.toLowerCase();
    if (!atEnd && !(next === " " && capital)) continue;
    const sentence = text.slice(start, i + 1);
    if ((out + sentence).length > max) break;
    out += sentence + " ";
    start = i + 2;
  }
  return out.trim() || `${text.slice(0, max - 1).trim()}…`;
}
