import { Wordmark } from "@/components/Logo";
import Link from "next/link";
import { getMerchant, listMerchants, radarFor, type RadarItem } from "@/server/events/radar";

export const dynamic = "force-dynamic";

// Live proof for the hero: the biggest crowd near the New York demo merchant in the next 48 h.
async function tonightNear(merchantId: string): Promise<{ item: RadarItem; merchant: { id: string; name: string; timezone: string } } | undefined> {
  const merchant = getMerchant(merchantId);
  if (!merchant) return undefined;
  try {
    const items = await radarFor(merchant, 48);
    const item = items.find((i) => i.interesting) ?? items[0];
    return item ? { item, merchant } : undefined;
  } catch {
    return undefined;
  }
}

export default async function Home() {
  const demos = listMerchants().filter((m) => m.id === "m_penn_pour" || m.id === "m_quai_bercy");
  const live = await tonightNear("m_penn_pour");
  const fmt = live ? new Intl.DateTimeFormat("en-GB", { weekday: "long", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: live.merchant.timezone }) : undefined;

  return (
    <main className="mx-auto max-w-6xl px-5">
      {/* Hero */}
      <section className="grid items-center gap-12 pt-16 pb-0 md:grid-cols-[1.2fr_1fr] md:pt-24">
        <div>
          <div className="mb-14 flex" aria-hidden="true">
            <Wordmark size={128} phone={64} motion live={Boolean(live?.item.interesting)} />
          </div>
          <p className="text-[15px] font-medium text-[var(--muted)] tnum">
            {live ? (
              <>
                <span className="mono">{live.item.capacity.toLocaleString("en-US")}</span> people, <span className="mono">{live.item.distanceKm.toFixed(1)}&nbsp;km</span> from a bar in Midtown, <span className="mono">{fmt!.format(new Date(live.item.event.startsAt))}</span>
              </>
            ) : (
              "Tonight, thousands of people walk past your door"
            )}
          </p>
          <h1 className="mt-5 text-[44px] leading-[0.98] md:text-[64px] md:leading-[0.98]">
            Turn the crowd outside into customers inside.
          </h1>
          <p className="t-lead mt-8 max-w-xl">
            Every concert, game and show within walking distance sends a crowd past your door, and they choose a place in the ten minutes before and after. Turnout knows who they are, what they love, and says the one thing that makes them pick you.
          </p>
          <p className="mt-4 text-base text-[var(--muted)]">You approve. It publishes. Two minutes to set up, no agency, no ad manager to learn.</p>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link href="/start" className="btn btn-accent btn-lg">Set up your place, 2 minutes</Link>
            <Link href={`/radar?merchant=${demos[0]?.id ?? "m_penn_pour"}`} className="link text-base">See tonight near Madison Square Garden</Link>
          </div>
        </div>

        {/* Live card */}
        <div className="plate">
          <p className="eyebrow flex items-center gap-3">{live && <span className="live-dot" aria-hidden="true" />}{live ? `Live · next crowd near ${live.merchant.name}` : "Example · near Penn & Pour"}</p>
          <p className="t-name mt-4">{live ? `${live.item.headliner.name} · ${live.item.event.venue.name}` : "Harry Styles · Madison Square Garden"}</p>
          <dl className="mt-10 flex flex-wrap gap-x-12 gap-y-6">
            <div><dt className="eyebrow">Crowd</dt><dd className="t-figure mt-2 whitespace-nowrap text-4xl md:text-5xl">{(live?.item.capacity ?? 20000).toLocaleString("en-US")}</dd></div>
            <div><dt className="eyebrow">Walk</dt><dd className="t-figure mt-2 whitespace-nowrap text-4xl md:text-5xl">{live ? Math.max(1, Math.round(live.item.distanceKm * 12)) : 4}&nbsp;<span className="text-base font-medium text-[var(--muted)]">min</span></dd></div>
          </dl>
          <div className="mt-12">
            <p className="eyebrow">An example: what Turnout wrote for Harry Styles night, two blocks away</p>
            <p className="t-name mt-3">Two cocktails before Harry</p>
            <p className="mt-2 text-base">Penn &amp; Pour, two blocks from MSG. Two cocktails for $16 until 7&nbsp;pm, then we keep the kitchen open until 1&nbsp;am.</p>
            <p className="mt-4 text-sm">
              Why cocktails, not the pitcher: fans of Harry Styles over-index on women 25 to 29 (+0.75), on rooftop cocktail bars like Igloo Bar and 230 Fifth, and on Gucci and Dior. Every number comes from Qloo and is shown with the draft.
            </p>
          </div>
          {live && (
            <Link href={`/campaigns/new?merchant=${live.merchant.id}&event=${live.item.event.id}`} className="link mt-8 inline-flex text-base">
              Qualify this crowd now
            </Link>
          )}
        </div>
      </section>

      {/* The ten-minute window */}
      <section className="stack-section">
        <p className="eyebrow">The problem</p>
        <h2 className="t-heading mt-3 max-w-3xl">The crowd decides where to go in ten minutes. You find out the next morning.</h2>
        <div className="stack-block grid gap-x-16 gap-y-12 md:grid-cols-3">
          {[
            ["20,000", "", "seats empty at once at Madison Square Garden, which hosts more than 300 events a year. Barclays, Bercy, every arena does the same."],
            ["10", "min", "between the last song and the first drink. The place that already spoke to them wins. Everyone else gets the overflow."],
            ["0", "", "tools an independent bar has to know who is coming. Geofencing, event data and taste data exist, but only agencies and chains buy them."],
          ].map(([n, u, d]) => (
            <div key={n}>
              <p className="t-figure text-7xl text-[var(--plum)]">{n}{u && <span className="ml-2 text-base font-medium text-[var(--muted)]"> {u}</span>}</p>
              <p className="mt-5 text-base">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Same bar, same night */}
      <section className="stack-section">
        <p className="eyebrow">Why it works</p>
        <h2 className="t-heading mt-3 max-w-3xl">Same bar, same night, two campaigns. Only one knows the crowd.</h2>
        <p className="measure mt-5 text-base text-[var(--muted)]">
          Anyone can buy a geofenced ad around an arena. Without taste data it says what every bar says. Turnout reads the crowd through Qloo first, then chooses the offer and the words.
        </p>
        <div className="stack-block grid gap-x-24 gap-y-16 md:grid-cols-2">
          <div>
            <p className="eyebrow">Without Turnout · generic ad</p>
            <p className="t-name mt-4 text-[var(--muted)]">Drinks near MSG</p>
            <p className="mt-3 text-base text-[var(--muted)]">Great bar, two blocks from the Garden. Happy hour and game nights. Come by.</p>
            <ul className="mt-5 space-y-2 text-sm text-[var(--muted)]">
              <li>Targeting: everyone within 1 mile</li>
              <li>Offer: whatever was on the board</li>
              <li>Reason: none</li>
            </ul>
          </div>
          <div>
            <p className="eyebrow">With Turnout · written for this crowd</p>
            <p className="t-name mt-4">Two cocktails before Harry</p>
            <p className="mt-3 text-base">Penn &amp; Pour, two blocks from MSG. Two cocktails for $16 until 7&nbsp;pm, then we keep the kitchen open until 1&nbsp;am.</p>
            <ul className="mt-5 space-y-2 text-sm text-[var(--muted)]">
              <li>Targeting: 600&nbsp;m around the venue, 5 to 7&nbsp;pm and after the show, interests Cocktail bars, Pop music, Luxury fashion</li>
              <li>Offer: the cocktail happy hour, not the $22 pitcher</li>
              <li>Reason: women 25 to 29 over-index (+0.75); top nearby bars for this crowd are cocktail rooftops; brands Gucci, Dior, Prada</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="stack-section">
        <p className="eyebrow">How it works</p>
        <div className="stack-block grid gap-x-16 gap-y-12 md:grid-cols-3">
          {[
            ["The radar watches your street", "Every event within walking distance, from Ticketmaster, scored by crowd size, distance and timing. Concerts, games, shows, comedy. You never check a calendar again."],
            ["Qloo reads the crowd", "Who likes tonight's headliner: age and gender affinity, taste tags, brands, and the bars near you they already love. Aggregate affinities from 250M+ entities, never individuals."],
            ["The agent writes, you approve", "One offer chosen with evidence, then copy for a geofenced ad, your Google listing, your regulars on WhatsApp, your chalkboard and your staff. One tap to publish."],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="t-name">{t}</h3>
              <p className="mt-3 text-base text-[var(--muted)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Channels */}
      <section className="stack-section">
        <p className="eyebrow">Where the crowd hears from you</p>
        <h2 className="t-heading mt-3 max-w-3xl">Strangers on their phones, regulars in their pocket, passers-by at your door.</h2>
        <div className="stack-block grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Geofenced ad", "Snapchat or Meta, a few hundred metres around the venue, only during the window. Reaches people you have never met."],
            ["Google listing", "A post and an offer on your profile, live when they search “bar near me” on the way out."],
            ["WhatsApp regulars", "A warm message to the people who opted in. Nobody else."],
            ["Chalkboard and staff", "The line to write outside and the sentence to say at the door. The cheapest channel is the one you already own."],
            ["Digital screens", "Out-of-home near the venue, bought by the hour. Simulated in this demo."],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="text-base font-semibold text-[var(--ink)]">{t}</p>
              <p className="mt-2 text-base text-[var(--muted)]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing anchor + objections */}
      <section className="stack-section grid gap-x-24 gap-y-12 md:grid-cols-[1fr_1.2fr]">
        <h2 className="t-heading max-w-md">Straight answers</h2>
        <dl className="space-y-10">
          <div>
            <dt className="text-base font-semibold text-[var(--ink)]">What will it cost?</dt>
            <dd className="mt-3">
              <p className="t-figure text-5xl text-[var(--ink)]">$49<span className="ml-2 text-base font-medium text-[var(--muted)]">a month</span></p>
              <p className="mt-3 text-base">Radar, crowd profiles, unlimited campaigns, every channel. Ad spend is yours and optional; most nights the chalkboard and the Google post are enough. One extra table on one concert night pays for the month.</p>
              <Link href="/start" className="link mt-4 inline-flex text-base">Start free during the hackathon</Link>
            </dd>
          </div>
          {[
            ["Is this creepy?", "No. Turnout never sends a name, a phone or a location of a person to Qloo. Qloo describes what groups of fans tend to like. The ad platforms do the delivery, under their own consent rules, and your regulars only hear from you if they opted in."],
            ["Do I lose control?", "Nothing goes out without your approval. Every draft shows the offer, the words, the time window and the exact Qloo evidence behind the choice. Edit anything, or say no."],
            ["I have no arena next door.", "Theatres, comedy clubs, stadiums, conference halls and festivals count too. And Turnout's weekly neighbourhood pulse reads the people who pass your door every day, with no event at all."],
            ["How much time does it take?", "Two minutes once, to describe your place and your offers. Then a notification when a crowd is coming, and one tap."],
          ].map(([q, a]) => (
            <div key={q}>
              <dt className="text-base font-semibold text-[var(--ink)]">{q}</dt>
              <dd className="mt-2 text-base">{a}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Final CTA */}
      <section className="stack-section pb-24">
        <h2 className="t-title max-w-3xl">The next crowd is already on the calendar. Be the place it walks into.</h2>
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <Link href="/start" className="btn btn-accent btn-lg">Set up your place, 2 minutes</Link>
          {demos.map((m) => (
            <Link key={m.id} href={`/radar?merchant=${m.id}`} className="link text-base">Try {m.name} · {m.city}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
