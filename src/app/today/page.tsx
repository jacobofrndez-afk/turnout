import Link from "next/link";
import { getMerchant, listMerchants, radarFor, type RadarItem } from "@/server/events/radar";
import { presenceWindow } from "@/server/events/concentration";
import { getDb } from "@/server/db/client";
import { getCampaign, getDraft, pollOperatorDraft, type CampaignRow } from "@/server/agent/run";
import { getOffers } from "@/server/qloo/crowd";
import { getBrief, latestPulse } from "@/server/agent/pulse";
import { listAlerts } from "@/server/agent/scan";
import { weatherWindow } from "@/server/weather/openmeteo";
import MerchantSwitch from "../radar/MerchantSwitch";

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
          <Link href="/start" className="underline">Set up your place</Link> in two minutes.
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
  const next = upcoming[0];
  const later = upcoming.slice(1, 4);
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

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{dateLine} · {merchant.city}</p>
          <h1 className="mt-1 text-4xl">Today at {merchant.name}</h1>
        </div>
        <MerchantSwitch current={merchant.id} options={merchants.map((m) => ({ id: m.id, label: `${m.name}, ${m.city}` }))} />
      </header>

      {error && (
        <p className="mt-6 p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>
          Could not read the events right now: {error}
        </p>
      )}

      {/* The campaign to launch comes first: that is what a merchant reads. The crowd is the reason, underneath. */}
      {next && campaign?.status === "drafted" && draft ? (
        <section className="card card-live mt-8 p-6">
          <p className="eyebrow">Your campaign for {dayOf(presenceWindow(next.event).start).toLowerCase()}, ready to publish</p>
          <h2 className="display mt-1 text-4xl">{offer?.title ?? draft.chosen_offer_id}</h2>
          {offer && <p className="mt-1 text-base" style={{ color: "var(--text)" }}>{offer.description} · {offer.price}</p>}

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div>
              <p className="eyebrow">On your chalkboard</p>
              <p className="mt-1 whitespace-pre-wrap p-3 font-display text-xl leading-tight" style={{ background: "var(--ink)", color: "var(--panel)" }}>{draft.storefront.chalkboard}</p>
            </div>
            <div>
              <p className="eyebrow">To your regulars, on WhatsApp</p>
              <p className="mt-1 whitespace-pre-wrap p-3 text-sm leading-relaxed" style={{ background: "var(--paper)", color: "var(--text)" }}>{draft.whatsapp.message}</p>
            </div>
            <div>
              <p className="eyebrow">To strangers nearby, {draft.geofenced_ad.radius_m} m around the venue</p>
              <div className="mt-1 p-3 text-sm" style={{ background: "var(--paper)" }}>
                <p className="font-display text-xl leading-tight">{draft.geofenced_ad.headline}</p>
                <p className="mt-1" style={{ color: "var(--text)" }}>{draft.geofenced_ad.body}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>{draft.windows.map((w) => `${w.label} ${w.start_local} to ${w.end_local}`).join(" · ")} · ${draft.geofenced_ad.daily_budget_usd} a day</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-4">
            <form action={`/api/campaigns/${campaign.id}/approve`} method="post">
              <button className="btn btn-accent">Publish it now</button>
            </form>
            <Link href={`/campaigns/${campaign.id}`} className="text-sm font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>
              Read every word, change anything
            </Link>
          </div>

          <div className="card-flat mt-5 p-4 text-sm">
            <p className="eyebrow">Why this, why now</p>
            <p className="mt-1" style={{ color: "var(--text)" }}>
              {dayOf(presenceWindow(next.event).start)} <span className="mono">{fmtTime.format(new Date(presenceWindow(next.event).arrive))}</span> to <span className="mono">{fmtTime.format(new Date(presenceWindow(next.event).leave))}</span>: {next.event.name}, about <span className="mono">{next.capacity.toLocaleString("en-US")}</span> people
              {next.event.origin === "tv" || next.event.origin === "calendar" ? " around you" : <>, <span className="mono">{next.distanceKm.toFixed(1)} km</span> from your door</>}. Turnout expects <b style={{ color: "var(--ink)" }}>about {next.potentialGuests} extra guests</b>, {Math.min(100, Math.round(next.fill * 100))}% of your {seats} seats.{weather ? ` Weather at your door: ${weather}.` : ""}
            </p>
            <p className="mt-2" style={{ color: "var(--muted)" }}>{firstSentences(draft.rationale, 300)}</p>
          </div>
        </section>
      ) : next ? (
        <section className="card card-live mt-8 p-6">
          <p className="eyebrow">Next crowd at your door</p>
          <h2 className="display mt-1 text-3xl">
            {dayOf(presenceWindow(next.event).start)} <span className="mono text-2xl">{fmtTime.format(new Date(presenceWindow(next.event).arrive))}</span> to{" "}
            <span className="mono text-2xl">{fmtTime.format(new Date(presenceWindow(next.event).leave))}</span>: {next.event.name}
          </h2>
          <p className="mt-2 text-base" style={{ color: "var(--text)" }}>
            About <span className="mono">{next.capacity.toLocaleString("en-US")}</span> people{next.event.origin === "tv" || next.event.origin === "calendar" ? " around you" : <>, <span className="mono">{next.distanceKm.toFixed(1)} km</span> from your door</>}.
            Turnout expects <b style={{ color: "var(--ink)" }}>about {next.potentialGuests} extra guests</b>, {Math.min(100, Math.round(next.fill * 100))}% of your {seats} seats.
            {weather ? ` Weather at your door: ${weather}.` : ""}
          </p>
          <div className="card-flat mt-5 p-4">
            {campaign?.status === "sent" || campaign?.status === "approved" ? (
              <>
                <p className="eyebrow">Published</p>
                <p className="mt-1 font-display text-2xl">{offer?.title ?? "Your campaign"} is out</p>
                <Link href={`/campaigns/${campaign.id}`} className="mt-2 inline-flex text-sm font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>
                  See where it went
                </Link>
              </>
            ) : campaign?.status === "awaiting_operator" ? (
              <>
                <p className="eyebrow">Your campaign is being written</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>The agent has read the crowd through Qloo and is choosing your offer and the words. Come back in a minute.</p>
                <Link href={`/campaigns/${campaign.id}`} className="mt-2 inline-flex text-sm font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>
                  Follow it
                </Link>
              </>
            ) : campaign?.status === "needs_input" ? (
              <>
                <p className="eyebrow">One question before the campaign</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>Qloo knows several acts by that name. Pick the right one and the campaign writes itself.</p>
                <Link href={`/campaigns/new?merchant=${merchant.id}&event=${next.event.id}`} className="btn btn-accent mt-3">Pick the act</Link>
              </>
            ) : (
              <>
                <p className="eyebrow">No campaign yet</p>
                <p className="mt-1 text-sm" style={{ color: "var(--text)" }}>Turnout reads who this crowd is through Qloo, picks the offer they will go for, and writes the words for every channel you have. You only approve.</p>
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <form action="/api/campaigns" method="post">
                    <input type="hidden" name="merchant" value={merchant.id} />
                    <input type="hidden" name="event" value={next.event.id} />
                    <button className="btn btn-accent">Write my campaign</button>
                  </form>
                  <Link href={`/campaigns/new?merchant=${merchant.id}&event=${next.event.id}`} className="text-sm font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>
                    See who is coming first
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="card mt-8 p-6">
          <p className="eyebrow">Next crowd at your door</p>
          <p className="mt-1 font-display text-2xl">Nothing big enough for your {seats} seats in the next two days</p>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Turnout keeps watching every hour. Your everyday offer, below, does the work meanwhile.</p>
        </section>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* Later */}
        <section className="card p-5">
          <p className="eyebrow">Also coming</p>
          {later.length === 0 && <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Nothing else worth a campaign in the next two days.</p>}
          <ul className="mt-2 space-y-3">
            {later.map((it) => {
              const w = presenceWindow(it.event);
              return (
                <li key={it.event.id} className="text-sm">
                  <p style={{ color: "var(--muted)" }}>
                    {dayOf(w.start)} <span className="mono">{fmtTime.format(new Date(w.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w.leave))}</span>
                  </p>
                  <p className="font-display text-lg leading-tight">{it.event.name}</p>
                  <p style={{ color: "var(--text)" }}>About {it.potentialGuests} extra guests, {Math.min(100, Math.round(it.fill * 100))}% of your seats</p>
                </li>
              );
            })}
          </ul>
          <Link href={`/radar?merchant=${merchant.id}`} className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>
            See the next three days on the radar
          </Link>
        </section>

        {/* Every day */}
        <section className="card p-5">
          <p className="eyebrow">Every day this week</p>
          {brief ? (
            <>
              <p className="mt-1 font-display text-2xl">{weekOffer?.title ?? brief.featured_offer_id}</p>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{brief.street_in_one_line}</p>
              <p className="mt-3 whitespace-pre-wrap p-3 font-display text-lg" style={{ background: "var(--ink)", color: "var(--panel)" }}>{brief.chalkboard}</p>
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Your chalkboard line for a normal weekday.</p>
            </>
          ) : (
            <p className="mt-2 text-sm" style={{ color: "var(--text)" }}>Turnout reads the people who walk past your door on a normal day and picks the offer to feature all week.</p>
          )}
          <Link href={`/pulse?merchant=${merchant.id}`} className="mt-4 inline-flex text-sm font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>
            {brief ? "Read this week's plan" : "Read your street"}
          </Link>
        </section>
      </div>

      {/* What happened without you */}
      <section className="card-flat mt-4 p-5">
        <p className="eyebrow">What Turnout did on its own</p>
        {alerts.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Every hour, Turnout scans for crowds, writes the campaign for the strongest new one and alerts you. Nothing yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-3">
                <span className="mono" style={{ color: "var(--muted)" }}>{new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"))}</span>
                <span style={{ color: "var(--text)" }}>{a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{a.status === "sent" ? "sent on WhatsApp" : a.status === "simulated" ? "recorded, WhatsApp not connected" : "failed"}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/alerts?merchant=${merchant.id}`} className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>
          All alerts
        </Link>
      </section>
    </main>
  );
}

// Whole sentences only, up to about `max` characters: a cut mid-word reads as a bug.
function firstSentences(text: string, max: number): string {
  if (text.length <= max) return text;
  const parts = text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text];
  let out = "";
  for (const p of parts) {
    if ((out + p).length > max) break;
    out += p;
  }
  return out.trim() || `${text.slice(0, max - 1).trim()}…`;
}

