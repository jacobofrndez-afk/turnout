import Link from "next/link";
import { nb } from "@/lib/nbsp";
import { firstSentences, noScores } from "@/lib/text";
import { getMerchant, listMerchants, radarFor, type RadarItem } from "@/server/events/radar";
import { presenceWindow } from "@/server/events/concentration";
import { getDb } from "@/server/db/client";
import { getCampaign, getDraft, pollOperatorDraft, type CampaignRow } from "@/server/agent/run";
import { getOffers } from "@/server/qloo/crowd";
import { getBrief, latestPulse } from "@/server/agent/pulse";
import { listAlerts } from "@/server/agent/scan";
import { weatherWindow } from "@/server/weather/openmeteo";
import { RefreshEvery } from "./RefreshEvery";

export const dynamic = "force-dynamic";

// The merchant's only home (docs/UX-ONE-PATH.md): one headline, one sentence, one button. The campaign to publish
// when there is one, else the crowd at the door. Everything else is a short section with a single link.
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const sp = await searchParams;
  const merchants = listMerchants().filter((m) => m.id === "m_penn_pour" || m.id === "m_quai_bercy" || m.id === (sp.merchant ?? ""));
  const merchant = getMerchant(sp.merchant ?? merchants[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="t-display">No place yet</h1>
        <p className="t-lead mt-5">
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
  // The headline is the strongest moment of the coming twelve hours (the one worth a campaign now), not merely the next one.
  const soon = upcoming.filter((it) => presenceWindow(it.event).arrive <= now + 12 * 3_600_000);
  const next = (soon.length ? soon : upcoming).slice().sort((a, b) => b.potentialGuests - a.potentialGuests)[0];
  const later = upcoming.filter((it) => it !== next).slice(0, 3);
  const tz = merchant.timezone;
  const fmtTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
  const fmtHour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz });
  const fmtDayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  const fmtWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: tz });
  const fmtShort = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz });
  const todayKey = fmtDayKey.format(new Date(now));
  const tomorrowKey = fmtDayKey.format(new Date(now + 86_400_000));
  const dayOf = (t: number) => {
    const k = fmtDayKey.format(new Date(t));
    return k === todayKey ? "Today" : k === tomorrowKey ? "Tomorrow" : fmtWeekday.format(new Date(t));
  };
  // "Tonight" from five in the afternoon: the word a merchant uses.
  const whenWord = (t: number) => (dayOf(t) === "Today" && Number(fmtHour.format(new Date(t))) >= 17 ? "Tonight" : dayOf(t));
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
  const fresh = campaign?.status === "awaiting_operator" && now - Date.parse(campaign.created_at.replace(" ", "T") + "Z") < 15 * 60_000;
  const offer = draft ? offers.find((o) => o.id === draft.chosen_offer_id) : undefined;
  const brief = getBrief(latestPulse(merchant.id));
  const weekOffer = brief ? offers.find((o) => o.id === brief.featured_offer_id) : undefined;
  const alerts = listAlerts(merchant.id, 3);
  const dateLine = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz }).format(new Date(now));

  const w0 = next ? presenceWindow(next.event) : undefined;
  const others = merchants.filter((m) => m.id !== merchant.id);
  const around = next ? (next.event.origin === "tv" || next.event.origin === "calendar" ? "around you" : `${next.distanceKm.toFixed(1)} km from your door`) : "";
  // The crowd in one sentence: how many, when, what it could bring.
  const peopleLine = next && w0 ? (
    <>
      About {next.capacity.toLocaleString("en-US")} people {around} from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span>. Turnout expects <b style={{ color: "inherit" }}>about {next.potentialGuests} extra guests</b>, {next.fill >= 1 ? `enough to fill your ${seats} seats` : `${Math.round(next.fill * 100)}% of your ${seats} seats`}.
    </>
  ) : null;
  // The crowd named the way the merchant says it: the act and the house, or the wave itself.
  const crowdName = next ? (next.event.origin === "ticketmaster" ? `${next.event.name} at ${next.event.venue.name}` : next.event.name) : "";
  const plateClass = "plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!";

  return (
    <main className="mx-auto max-w-5xl px-6 py-14">
      <p className="t-body text-[var(--muted)]">
        {dateLine} · {merchant.name}, {merchant.city}
        {others.length > 0 && (
          <>
            {" · Also yours: "}
            {others.map((m, i) => (
              <span key={m.id}>
                {i > 0 ? ", " : ""}
                <Link href={`/today?merchant=${m.id}`} className="link">{m.name}</Link>
              </span>
            ))}
          </>
        )}
      </p>

      {error && (
        <p className="mt-8 bg-[var(--danger-soft)] px-5 py-4 text-base text-[var(--danger)]">Could not read the events right now: {error}</p>
      )}

      {/* The plate: the campaign to publish when it exists, else the crowd. One headline, one sentence, one button. */}
      {next && w0 && campaign?.status === "drafted" && draft ? (
        <section className="stack-block">
          <div className={plateClass}>
            <p className="eyebrow flex items-center gap-3"><span className="live-dot" aria-hidden="true" />{whenWord(w0.start)} · {crowdName}</p>
            <h1 className="t-display mt-5">{offer?.title ?? draft.chosen_offer_id}</h1>
            <p className="t-lead mt-5">
              {offer ? `${offer.description}. ${offer.price}. ` : ""}
              {peopleLine}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <form action={`/api/campaigns/${campaign.id}/approve`} method="post">
                <button className="btn btn-accent btn-lg">Publish</button>
              </form>
              <Link href={`/campaigns/${campaign.id}`} className="link text-base">Read every word first</Link>
            </div>
          </div>

          <h2 className="t-title stack-block">What goes out</h2>
          <div className="mt-8 grid gap-x-16 gap-y-12 md:grid-cols-3">
            <div>
              <p className="eyebrow">On your chalkboard</p>
              <p className="t-name mt-4 whitespace-pre-wrap">{nb(draft.storefront.chalkboard)}</p>
            </div>
            <div>
              <p className="eyebrow">To your regulars, on WhatsApp</p>
              <p className="t-body mt-4 whitespace-pre-wrap">{nb(draft.whatsapp.message)}</p>
            </div>
            <div>
              <p className="eyebrow">To strangers, <span className="mono">{draft.geofenced_ad.radius_m}&nbsp;m</span> around the venue</p>
              <p className="t-name mt-4">{nb(draft.geofenced_ad.headline)}</p>
              <p className="t-body mt-3">{nb(draft.geofenced_ad.body)}</p>
              <p className="mt-4 text-sm text-[var(--muted)] tnum">{nb(draft.windows.map((w) => `${w.label}, ${w.start_local} to ${w.end_local}`).join(" · "))} · ${draft.geofenced_ad.daily_budget_usd} a day</p>
            </div>
          </div>

          <h2 className="t-title stack-section">Why</h2>
          <p className="t-body measure mt-5">{nb(firstSentences(noScores(draft.rationale), 320))}{weather ? ` ${weather} at your door.` : ""}</p>
          <Link href={`/campaigns/${campaign.id}`} className="mt-5 inline-flex text-base link">The rest of the reasoning</Link>
        </section>
      ) : next && w0 ? (
        <section className="stack-block">
          <div className={plateClass}>
            <p className="eyebrow flex items-center gap-3"><span className="live-dot" aria-hidden="true" />{whenWord(w0.start)} at your door</p>
            <h1 className="t-display mt-5">{crowdName}</h1>
            <p className="t-lead mt-5">{peopleLine}{weather ? ` ${weather}.` : ""}</p>
            <div className="mt-10">
              {campaign?.status === "sent" || campaign?.status === "approved" ? (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                  <p className="t-name">{offer?.title ?? "Your campaign"} is out.</p>
                  <Link href={`/campaigns/${campaign.id}`} className="text-base link">See where it went</Link>
                </div>
              ) : campaign?.status === "awaiting_operator" ? (
                <>
                  <p className="t-name">Turnout is writing your campaign.</p>
                  {fresh ? (
                    <div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
                  ) : (
                    <p className="t-body mt-3 max-w-2xl">The crowd is read. The offer and the words come with the draft.</p>
                  )}
                  <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                    <Link href={`/campaigns/new?merchant=${merchant.id}&event=${next.event.id}`} className="btn btn-accent btn-lg">See who is coming</Link>
                    <Link href={`/campaigns/${campaign.id}`} className="text-base link">Follow the draft</Link>
                  </div>
                  {fresh && <RefreshEvery seconds={15} />}
                </>
              ) : campaign?.status === "needs_input" ? (
                <>
                  <p className="t-name">One question before the campaign.</p>
                  <p className="t-body mt-3 max-w-2xl">Qloo knows several acts by that name. Pick the right one and the campaign writes itself.</p>
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
        <section className="stack-block">
          <div className={plateClass}>
            <p className="eyebrow">Quiet day</p>
            <h1 className="t-display mt-5">Nothing big enough for your {seats} seats</h1>
            <p className="t-lead mt-5">Turnout keeps watching every hour. Your everyday offer, below, does the work meanwhile.</p>
          </div>
        </section>
      )}

      <section className="stack-section">
        <h2 className="t-title">Coming next</h2>
        {later.length === 0 ? (
          <p className="t-body mt-5 text-[var(--muted)]">Nothing else worth a campaign in the next two days.</p>
        ) : (
          <ul className="mt-6 space-y-5">
            {later.map((it) => {
              const w = presenceWindow(it.event);
              return (
                <li key={it.event.id} className="t-body">
                  <span className="mono">{fmtShort.format(new Date(w.start))} {fmtTime.format(new Date(w.arrive))}</span> · <b>{it.event.name}</b> · about {it.potentialGuests} guests{it.fill >= 1 ? ", enough to fill your seats" : ""} ·{" "}
                  <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.event.id}`} className="link">See who is coming</Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="stack-section">
        <h2 className="t-title">Every day this week</h2>
        {brief ? (
          <>
            <p className="t-body mt-5"><b>{weekOffer?.title ?? brief.featured_offer_id}.</b> {nb(noScores(brief.street_in_one_line))}</p>
            <p className="t-name mt-5 whitespace-pre-wrap">{nb(brief.chalkboard)}</p>
            <p className="t-body mt-2 text-[var(--muted)]">Your chalkboard line for a normal weekday.</p>
          </>
        ) : (
          <p className="t-body mt-5 text-[var(--muted)]">No weekly plan yet. Turnout reads the people who walk past your door on a normal day and picks the offer to feature all week.</p>
        )}
        <Link href={`/pulse?merchant=${merchant.id}`} className="mt-5 inline-flex text-base link">{brief ? "This week's plan" : "Read your street"}</Link>
      </section>

      <section className="stack-section">
        <h2 className="t-title">What Turnout did on its own</h2>
        {alerts.length === 0 ? (
          <p className="t-body mt-5 text-[var(--muted)]">Nothing yet. Every hour, Turnout scans for crowds, writes the campaign for the strongest new one and alerts you.</p>
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
            <p className="t-body mt-5 text-[var(--muted)]">{alerts.some((a) => a.status === "simulated") ? "Recorded here; WhatsApp is not connected yet." : "Each one was sent to you on WhatsApp."}</p>
          </>
        )}
        <Link href={`/alerts?merchant=${merchant.id}`} className="mt-4 inline-flex text-base link">All alerts</Link>
      </section>

      <p className="stack-section t-body">
        <Link href={`/radar?merchant=${merchant.id}`} className="link">Explore the map</Link>
        {" · "}
        <Link href="/start" className="link">Set up another place</Link>
      </p>
    </main>
  );
}
