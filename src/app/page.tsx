import Link from "next/link";
import { Mark } from "@/components/Logo";
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
  const fmt = live ? new Intl.DateTimeFormat("en-US", { weekday: "long", hour: "numeric", minute: "2-digit", timeZone: live.merchant.timezone }) : undefined;

  return (
    <main className="mx-auto max-w-6xl px-5">
      {/* Hero */}
      <section className="grid items-center gap-12 py-16 md:grid-cols-[1.2fr_1fr] md:py-24">
        <div>
          <p className="eyebrow">
            {live ? `${live.item.capacity.toLocaleString("en-US")} people, ${live.item.distanceKm.toFixed(1)} km from a bar in Midtown, ${fmt!.format(new Date(live.item.event.startsAt))}` : "Tonight, thousands of people walk past your door"}
          </p>
          <h1 className="mt-4 text-5xl leading-[1.02] md:text-[4.4rem]">
            Turn the crowd outside into <em style={{ fontStyle: "italic", color: "var(--accent)" }}>customers inside</em>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: "var(--text)" }}>
            Every concert, game and show within walking distance sends a crowd past your door, and they choose a place in the ten minutes before and after. Turnout knows who they are, what they love, and says the one thing that makes them pick you.
          </p>
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>You approve. It publishes. Two minutes to set up, no agency, no ad manager to learn.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/start" className="btn btn-accent">Set up your place, 2 minutes</Link>
            <Link href={`/radar?merchant=${demos[0]?.id ?? "m_penn_pour"}`} className="btn btn-ghost">See tonight near Madison Square Garden</Link>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: "var(--muted)" }}>
            <li><span className="font-semibold" style={{ color: "var(--ink)" }}>Qloo taste graph</span> · 250M+ entities</li>
            <li><span className="font-semibold" style={{ color: "var(--ink)" }}>Live events</span> · Ticketmaster, every venue</li>
            <li><span className="font-semibold" style={{ color: "var(--ink)" }}>Works today</span> · New York and Paris</li>
            <li><span className="font-semibold" style={{ color: "var(--ink)" }}>No personal data</span> · groups, never people</li>
          </ul>
        </div>

        {/* Live card */}
        <div className="card p-7">
          <div className="flex items-center gap-3">
            <Mark size={40} />
            <div>
              <p className="eyebrow">{live ? `Live · next crowd near ${live.merchant.name}` : "Example · near Penn & Pour"}</p>
              <p className="font-display text-xl">{live ? `${live.item.headliner.name} · ${live.item.event.venue.name}` : "Harry Styles · Madison Square Garden"}</p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <div><dt className="eyebrow">Crowd</dt><dd className="tnum mt-1 font-display text-2xl">{(live?.item.capacity ?? 20000).toLocaleString("en-US")}</dd></div>
            <div><dt className="eyebrow">Walk</dt><dd className="tnum mt-1 font-display text-2xl">{live ? `${Math.max(1, Math.round(live.item.distanceKm * 12))} min` : "4 min"}</dd></div>
            <div><dt className="eyebrow">Score</dt><dd className="tnum mt-1 font-display text-2xl">{live?.item.score ?? 72}</dd></div>
          </dl>
          <div className="card-flat mt-6 p-4">
            <p className="eyebrow">What Turnout wrote for Harry Styles night, two blocks away</p>
            <p className="mt-2 font-display text-lg">Two cocktails before Harry</p>
            <p className="text-sm" style={{ color: "var(--text)" }}>Penn &amp; Pour, two blocks from MSG. Two cocktails for $16 until 7 pm, then we keep the kitchen open until 1 am.</p>
            <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
              Why cocktails, not the pitcher: fans of Harry Styles over-index on women 25 to 29 (+0.75), on rooftop cocktail bars like Igloo Bar and 230 Fifth, and on Gucci and Dior. Every number comes from Qloo and is shown with the draft.
            </p>
          </div>
          {live && (
            <Link href={`/campaigns/new?merchant=${live.merchant.id}&event=${live.item.event.id}`} className="mt-4 inline-flex text-sm font-semibold" style={{ color: "var(--accent)" }}>
              Qualify this crowd now →
            </Link>
          )}
        </div>
      </section>

      {/* The ten-minute window */}
      <section className="border-t py-16" style={{ borderColor: "var(--line)" }}>
        <p className="eyebrow">The problem</p>
        <h2 className="display mt-2 max-w-3xl text-3xl md:text-4xl">The crowd decides where to go in ten minutes. You find out the next morning.</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            ["20,000", "people leave Madison Square Garden at once, 180 nights a year. Barclays, Bercy, the Garden, every arena does the same."],
            ["10 min", "between the last song and the first drink. The place that already spoke to them wins. Everyone else gets the overflow."],
            ["0", "tools an independent bar has to know who is coming. Geofencing, event data and taste data exist, but only agencies and chains buy them."],
          ].map(([n, d]) => (
            <div key={n} className="card-flat p-6">
              <p className="tnum font-display text-4xl" style={{ color: "var(--accent)" }}>{n}</p>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text)" }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Same bar, same night */}
      <section className="border-t py-16" style={{ borderColor: "var(--line)" }}>
        <p className="eyebrow">Why it works</p>
        <h2 className="display mt-2 max-w-3xl text-3xl md:text-4xl">Same bar, same night, two campaigns. Only one knows the crowd.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
          Anyone can buy a geofenced ad around an arena. Without taste data it says what every bar says. Turnout reads the crowd through Qloo first, then chooses the offer and the words.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card-flat p-6" style={{ opacity: 0.85 }}>
            <p className="eyebrow">Without Turnout · generic ad</p>
            <p className="mt-3 font-display text-xl">Drinks near MSG</p>
            <p className="mt-1 text-sm">Great bar, two blocks from the Garden. Happy hour and game nights. Come by.</p>
            <ul className="mt-4 space-y-1 text-xs" style={{ color: "var(--muted)" }}>
              <li>Targeting: everyone within 1 mile</li>
              <li>Offer: whatever was on the board</li>
              <li>Reason: none</li>
            </ul>
          </div>
          <div className="card p-6" style={{ borderColor: "var(--accent)" }}>
            <p className="eyebrow" style={{ color: "var(--accent)" }}>With Turnout · written for this crowd</p>
            <p className="mt-3 font-display text-xl">Two cocktails before Harry</p>
            <p className="mt-1 text-sm">Penn &amp; Pour, two blocks from MSG. Two cocktails for $16 until 7 pm, then we keep the kitchen open until 1 am.</p>
            <ul className="mt-4 space-y-1 text-xs" style={{ color: "var(--muted)" }}>
              <li>Targeting: 600 m around the venue, 5 to 7 pm and after the show, interests Cocktail bars, Pop music, Luxury fashion</li>
              <li>Offer: the cocktail happy hour, not the $22 pitcher</li>
              <li>Reason: women 25 to 29 over-index (+0.75); top nearby bars for this crowd are cocktail rooftops; brands Gucci, Dior, Prada</li>
            </ul>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t py-16" style={{ borderColor: "var(--line)" }}>
        <p className="eyebrow">How it works</p>
        <div className="mt-6 grid gap-8 md:grid-cols-3">
          {[
            ["01", "The radar watches your street", "Every event within walking distance, from Ticketmaster, scored by crowd size, distance and timing. Concerts, games, shows, comedy. You never check a calendar again."],
            ["02", "Qloo reads the crowd", "Who likes tonight's headliner: age and gender affinity, taste tags, brands, and the bars near you they already love. Aggregate affinities from 250M+ entities, never individuals."],
            ["03", "The agent writes, you approve", "One offer chosen with evidence, then copy for a geofenced ad, your Google listing, your regulars on WhatsApp, your chalkboard and your staff. One tap to publish."],
          ].map(([n, t, d]) => (
            <div key={n}>
              <p className="font-display text-3xl" style={{ color: "var(--accent)" }}>{n}</p>
              <h3 className="display mt-2 text-xl">{t}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Channels */}
      <section className="border-t py-16" style={{ borderColor: "var(--line)" }}>
        <p className="eyebrow">Where the crowd hears from you</p>
        <h2 className="display mt-2 max-w-3xl text-3xl">Strangers on their phones, regulars in their pocket, passers-by at your door.</h2>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Geofenced ad", "Snapchat or Meta, a few hundred metres around the venue, only during the window. Reaches people you have never met."],
            ["Google listing", "A post and an offer on your profile, live when they search “bar near me” on the way out."],
            ["WhatsApp regulars", "A warm message to the people who opted in. Nobody else."],
            ["Chalkboard and staff", "The line to write outside and the sentence to say at the door. The cheapest channel is the one you already own."],
            ["Digital screens", "Out-of-home near the venue, bought by the hour. Simulated in this demo."],
          ].map(([t, d]) => (
            <div key={t} className="card-flat p-4">
              <p className="font-semibold" style={{ color: "var(--ink)" }}>{t}</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing anchor + objections */}
      <section className="grid gap-10 border-t py-16 md:grid-cols-[1fr_1.2fr]" style={{ borderColor: "var(--line)" }}>
        <div className="card p-7">
          <p className="eyebrow">Planned pricing</p>
          <p className="mt-3 font-display text-4xl">$49<span className="text-base" style={{ color: "var(--muted)" }}> / month</span></p>
          <p className="mt-2 text-sm" style={{ color: "var(--text)" }}>Radar, crowd profiles, unlimited campaigns, every channel. Ad spend is yours and optional; most nights the chalkboard and Google post are enough.</p>
          <p className="mt-4 text-sm font-semibold" style={{ color: "var(--ink)" }}>One extra table on one concert night pays for the month.</p>
          <Link href="/start" className="btn btn-primary mt-6">Start free during the hackathon</Link>
        </div>
        <div>
          <p className="eyebrow">Straight answers</p>
          <dl className="mt-4 space-y-5">
            {[
              ["Is this creepy?", "No. Turnout never sends a name, a phone or a location of a person to Qloo. Qloo describes what groups of fans tend to like. The ad platforms do the delivery, under their own consent rules, and your regulars only hear from you if they opted in."],
              ["Do I lose control?", "Nothing goes out without your approval. Every draft shows the offer, the words, the time window and the exact Qloo evidence behind the choice. Edit anything, or say no."],
              ["I have no arena next door.", "Theatres, comedy clubs, stadiums, conference halls and festivals count too. And Turnout's weekly neighbourhood pulse works on the people who pass your door every day, with no event at all."],
              ["How much time does it take?", "Two minutes once, to describe your place and your offers. Then a notification when a crowd is coming, and one tap."],
            ].map(([q, a]) => (
              <div key={q}>
                <dt className="font-semibold" style={{ color: "var(--ink)" }}>{q}</dt>
                <dd className="mt-1 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t py-20 text-center" style={{ borderColor: "var(--line)" }}>
        <h2 className="display mx-auto max-w-2xl text-3xl md:text-4xl">The next crowd is already on the calendar. Be the place it walks into.</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/start" className="btn btn-accent">Set up your place, 2 minutes</Link>
          {demos.map((m) => (
            <Link key={m.id} href={`/radar?merchant=${m.id}`} className="btn btn-ghost">Try {m.name} · {m.city}</Link>
          ))}
        </div>
      </section>
    </main>
  );
}
