import Link from "next/link";
import { Mark } from "@/components/Logo";
import { listMerchants } from "@/server/events/radar";

export const dynamic = "force-dynamic";

export default function Home() {
  const demos = listMerchants().filter((m) => m.id === "m_penn_pour" || m.id === "m_quai_bercy");
  return (
    <main className="mx-auto max-w-6xl px-5">
      <section className="grid items-center gap-10 py-20 md:grid-cols-[1.15fr_1fr]">
        <div>
          <p className="eyebrow">For bars, restaurants and shops near a venue</p>
          <h1 className="mt-4 text-5xl leading-[1.05] md:text-6xl">
            Turn the crowd outside into <em style={{ fontStyle: "italic", color: "var(--accent)" }}>customers inside</em>.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: "var(--muted)" }}>
            Concerts, games and shows send thousands of people past your door, and they decide where to go in the ten minutes before and after. Turnout tells you who they are, what they love, and says the right thing to them at the right moment. You approve, it publishes.
          </p>
          <ul className="mt-6 grid max-w-xl gap-2 text-sm sm:grid-cols-3">
            {[
              ["Never miss a crowd", "every event within walking distance, ranked"],
              ["Speak their taste", "offer and words chosen from Qloo's taste graph"],
              ["Reach strangers", "geofenced ads, Google, your regulars, your window"],
            ].map(([t, d]) => (
              <li key={t} className="card-flat px-3 py-2.5">
                <p className="font-semibold" style={{ color: "var(--ink)" }}>{t}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{d}</p>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/start" className="btn btn-accent">Set up your place</Link>
            {demos.map((m) => (
              <Link key={m.id} href={`/radar?merchant=${m.id}`} className="btn btn-ghost">
                Try {m.name} · {m.city}
              </Link>
            ))}
          </div>
        </div>
        <div className="card p-8">
          <div className="flex items-center gap-3">
            <Mark size={40} />
            <div>
              <p className="eyebrow">Tonight, 0.3 km from Penn &amp; Pour</p>
              <p className="font-display text-xl">Harry Styles · Madison Square Garden</p>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-4 text-sm">
            <div><dt className="eyebrow">Crowd</dt><dd className="tnum mt-1 text-2xl font-display">20,000</dd></div>
            <div><dt className="eyebrow">Over-index</dt><dd className="mt-1 text-2xl font-display">F 25-29</dd></div>
            <div><dt className="eyebrow">Picked offer</dt><dd className="mt-1 text-2xl font-display">Cocktails</dd></div>
          </dl>
          <p className="mt-6 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            “Fans of Harry Styles over-index on women aged 25 to 29 (+0.75), on rooftop cocktail bars like Igloo Bar and 230 Fifth, and on Gucci and Dior. The cocktail happy hour wins over the game-night pitcher.”
          </p>
          <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>Agent rationale, with Qloo provenance attached.</p>
        </div>
      </section>

      <section className="grid gap-6 border-t py-14 md:grid-cols-3" style={{ borderColor: "var(--line)" }}>
        {[
          ["01", "The radar", "Real events from Ticketmaster within walking distance, scored by crowd size, distance and timing. Concerts, games, shows."],
          ["02", "The crowd, through Qloo", "Who likes this headliner: age and gender affinity, taste tags, brands, the bars near you they already love. Aggregate affinities, never individuals."],
          ["03", "The campaign", "One offer, chosen with evidence. Copy for a geofenced ad, your Google listing, your regulars on WhatsApp, the chalkboard and the staff."],
        ].map(([n, t, d]) => (
          <div key={n}>
            <p className="font-display text-3xl" style={{ color: "var(--accent)" }}>{n}</p>
            <h2 className="display mt-2 text-xl">{t}</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{d}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
