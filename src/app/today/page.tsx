import Link from "next/link";
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

  const w0 = next ? presenceWindow(next.event) : undefined;
  const others = merchants.filter((m) => m.id !== merchant.id);
  const hugeBtn = { minHeight: 56, padding: "0 28px", fontSize: 17 } as const;
  const crowdLine = next && w0 ? (
    <>
      {dayOf(w0.start)} from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span>, {next.event.name.charAt(0).toLowerCase() + next.event.name.slice(1)}: about {next.capacity.toLocaleString("en-US")} people
      {next.event.origin === "tv" || next.event.origin === "calendar" ? " around you" : ` ${next.distanceKm.toFixed(1)} km from your door`}. Turnout expects <b style={{ color: "var(--ink)" }}>about {next.potentialGuests} extra guests</b>, {Math.min(100, Math.round(next.fill * 100))}% of your {seats} seats.{weather ? ` ${weather} at your door.` : ""}
    </>
  ) : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header>
        <p className="eyebrow">{dateLine} · {merchant.city}</p>
        <h1 className="mt-2 text-5xl md:text-6xl">Today at {merchant.name}</h1>
        {others.length > 0 && (
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            Also yours:{" "}
            {others.map((m, i) => (
              <span key={m.id}>
                {i > 0 ? ", " : ""}
                <Link href={`/today?merchant=${m.id}`} className="underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>{m.name}, {m.city}</Link>
              </span>
            ))}
          </p>
        )}
      </header>

      {error && (
        <p className="mt-8 text-sm" style={{ color: "var(--danger)" }}>Could not read the events right now: {error}</p>
      )}

      {/* One thing in charge: the campaign to launch. The crowd is the reason, in prose, underneath. */}
      {next && w0 && campaign?.status === "drafted" && draft ? (
        <section className="mt-16">
          <p className="eyebrow">Your campaign for {dayOf(w0.start).toLowerCase()}, ready to publish</p>
          <h2 className="display mt-3" style={{ fontSize: "clamp(44px, 6.5vw, 76px)", lineHeight: 0.95, letterSpacing: "-0.01em" }}>{offer?.title ?? draft.chosen_offer_id}</h2>
          {offer && <p className="mt-4 text-xl" style={{ color: "var(--muted)" }}>{offer.description}. {offer.price}.</p>}
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <form action={`/api/campaigns/${campaign.id}/approve`} method="post">
              <button className="btn btn-accent" style={hugeBtn}>Publish it now</button>
            </form>
            <Link href={`/campaigns/${campaign.id}`} className="text-base font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>
              Read every word, change anything
            </Link>
          </div>

          <div className="mt-14 grid gap-10 md:grid-cols-3">
            <div>
              <p className="eyebrow">On your chalkboard</p>
              <p className="mt-3 whitespace-pre-wrap font-display text-[28px] leading-[1.05]" style={{ color: "var(--ink)" }}>{draft.storefront.chalkboard}</p>
            </div>
            <div>
              <p className="eyebrow">To your regulars, on WhatsApp</p>
              <p className="mt-3 whitespace-pre-wrap text-[17px] leading-relaxed" style={{ color: "var(--text)" }}>{draft.whatsapp.message}</p>
            </div>
            <div>
              <p className="eyebrow">To strangers, {draft.geofenced_ad.radius_m} m around the venue</p>
              <p className="mt-3 font-display text-[26px] leading-[1.05]" style={{ color: "var(--ink)" }}>{draft.geofenced_ad.headline}</p>
              <p className="mt-2 text-[17px] leading-relaxed" style={{ color: "var(--text)" }}>{draft.geofenced_ad.body}</p>
              <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>{draft.windows.map((w) => `${w.label}, ${w.start_local} to ${w.end_local}`).join(" · ")} · ${draft.geofenced_ad.daily_budget_usd} a day</p>
            </div>
          </div>

          <div className="mt-14 max-w-3xl">
            <p className="eyebrow">Why this, why now</p>
            <p className="mt-3 text-lg leading-relaxed" style={{ color: "var(--text)" }}>{crowdLine}</p>
            <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--muted)" }}>{firstSentences(draft.rationale, 320)}</p>
          </div>
        </section>
      ) : next && w0 ? (
        <section className="mt-16">
          <p className="eyebrow">Next crowd at your door</p>
          <h2 className="display mt-3" style={{ fontSize: "clamp(40px, 5.5vw, 64px)", lineHeight: 0.98, letterSpacing: "-0.01em" }}>{next.event.name}</h2>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed" style={{ color: "var(--text)" }}>{crowdLine}</p>
          <div className="mt-8">
            {campaign?.status === "sent" || campaign?.status === "approved" ? (
              <>
                <p className="font-display text-3xl">{offer?.title ?? "Your campaign"} is out</p>
                <Link href={`/campaigns/${campaign.id}`} className="mt-3 inline-flex text-base font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>See where it went</Link>
              </>
            ) : campaign?.status === "awaiting_operator" ? (
              <>
                <p className="font-display text-3xl">Your campaign is being written</p>
                <p className="mt-2 max-w-2xl text-base" style={{ color: "var(--muted)" }}>The agent has read the crowd through Qloo and is choosing your offer and the words. Come back in a minute.</p>
                <Link href={`/campaigns/${campaign.id}`} className="mt-3 inline-flex text-base font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>Follow it</Link>
              </>
            ) : campaign?.status === "needs_input" ? (
              <>
                <p className="font-display text-3xl">One question before the campaign</p>
                <p className="mt-2 max-w-2xl text-base" style={{ color: "var(--muted)" }}>Qloo knows several acts by that name. Pick the right one and the campaign writes itself.</p>
                <Link href={`/campaigns/new?merchant=${merchant.id}&event=${next.event.id}`} className="btn btn-accent mt-5" style={hugeBtn}>Pick the act</Link>
              </>
            ) : (
              <div className="flex flex-wrap items-center gap-6">
                <form action="/api/campaigns" method="post">
                  <input type="hidden" name="merchant" value={merchant.id} />
                  <input type="hidden" name="event" value={next.event.id} />
                  <button className="btn btn-accent" style={hugeBtn}>Write my campaign</button>
                </form>
                <Link href={`/campaigns/new?merchant=${merchant.id}&event=${next.event.id}`} className="text-base font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>See who is coming first</Link>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="mt-16">
          <p className="eyebrow">Next crowd at your door</p>
          <h2 className="display mt-3 text-5xl">Nothing big enough for your {seats} seats in the next two days</h2>
          <p className="mt-4 max-w-2xl text-lg" style={{ color: "var(--muted)" }}>Turnout keeps watching every hour. Your everyday offer, below, does the work meanwhile.</p>
        </section>
      )}

      <div className="mt-20 grid gap-16 md:grid-cols-2">
        <section>
          <p className="eyebrow">Also coming</p>
          {later.length === 0 && <p className="mt-3 text-base" style={{ color: "var(--muted)" }}>Nothing else worth a campaign in the next two days.</p>}
          <ul className="mt-3 space-y-6">
            {later.map((it) => {
              const w = presenceWindow(it.event);
              return (
                <li key={it.event.id}>
                  <p className="text-sm" style={{ color: "var(--muted)" }}>
                    {dayOf(w.start)} <span className="mono">{fmtTime.format(new Date(w.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w.leave))}</span>
                  </p>
                  <p className="mt-1 font-display text-2xl leading-tight">{it.event.name}</p>
                  <p className="mt-1 text-base" style={{ color: "var(--text)" }}>About {it.potentialGuests} extra guests, {Math.min(100, Math.round(it.fill * 100))}% of your seats</p>
                </li>
              );
            })}
          </ul>
          <Link href={`/radar?merchant=${merchant.id}`} className="mt-6 inline-flex text-base font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>The next three days on the radar</Link>
        </section>

        <section>
          <p className="eyebrow">Every day this week</p>
          {brief ? (
            <>
              <p className="mt-3 font-display text-2xl leading-tight">{weekOffer?.title ?? brief.featured_offer_id}</p>
              <p className="mt-2 text-base" style={{ color: "var(--muted)" }}>{brief.street_in_one_line}</p>
              <p className="mt-5 whitespace-pre-wrap font-display text-[26px] leading-[1.05]" style={{ color: "var(--ink)" }}>{brief.chalkboard}</p>
              <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Your chalkboard line for a normal weekday.</p>
            </>
          ) : (
            <p className="mt-3 text-base leading-relaxed" style={{ color: "var(--text)" }}>Turnout reads the people who walk past your door on a normal day and picks the offer to feature all week.</p>
          )}
          <Link href={`/pulse?merchant=${merchant.id}`} className="mt-6 inline-flex text-base font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>{brief ? "This week's plan" : "Read your street"}</Link>
        </section>
      </div>

      <section className="mt-20">
        <p className="eyebrow">What Turnout did on its own</p>
        {alerts.length === 0 ? (
          <p className="mt-3 text-base" style={{ color: "var(--muted)" }}>Every hour, Turnout scans for crowds, writes the campaign for the strongest new one and alerts you. Nothing yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-base">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-4">
                <span className="mono text-sm" style={{ color: "var(--muted)" }}>{new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"))}</span>
                <span style={{ color: "var(--text)" }}>{a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"}</span>
                <span className="text-sm" style={{ color: "var(--muted)" }}>{a.status === "sent" ? "sent on WhatsApp" : a.status === "simulated" ? "recorded, WhatsApp not connected" : "failed"}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href={`/alerts?merchant=${merchant.id}`} className="mt-4 inline-flex text-base font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>All alerts</Link>
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
