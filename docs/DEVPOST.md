# DevPost submission (copy into the form)

Fill the two URL fields before submitting. Every claim below matches what the hosted app does
on 2026-10-30: it prepares, it never sends or charges. Hosted on Render: https://turnout-x7vm.onrender.com

## Project name

Turnout

## Tagline (60 chars)

Turn the crowd outside into customers inside.

## Links

- Try it out: https://turnout-x7vm.onrender.com/today?merchant=m_penn_pour
- Repository: https://github.com/jacobofrndez-afk/turnout (public, MIT)
- Video demo: https://youtu.be/CvlIxLkMVsM

## Inspiration

Every night, a crowd walks past a door. Twenty thousand people out of an arena two blocks away, or
eighty people out of a jazz club next door. Most places never see it coming: the owner does not
follow the venue calendar, does not know what tonight's crowd likes, and the tools that could
help are sold to agencies and chains. We wanted the independent business to have a marketing
agent that watches the street and, above all, knows who is coming.

## What it does

Turnout is a marketing agent for independent businesses: a bar, a restaurant, a shop. It watches
every event around the door, big or small, and when a crowd is about to be nearby it profiles
that exact crowd with Qloo: what kind of people, what they love, the places around you they
already go to. Then it opens your menu and picks the one offer that speaks to them at that hour,
compares it with your signature offer, writes the campaign, picks the channels where this crowd
really is, and caps the budget. You add your words and the chalkboard rewrites itself as you type.
One tap approves. The receipt is exact: the board at your door ready to print, a message for your
regulars prepared, a local ad prepared with a cap, nothing sent without you, nothing charged.

The judge path, three clicks: open Today, read the occasion and the decision without clicking,
change one word of the board, approve, print the board.

## How it is Qloo-powered

Ticketmaster says a show lets out at 10:45 pm; only Qloo says who is in it. For the crowd of the
night, Turnout calls Qloo Insights for the audience's demographics, its taste tags, the brands it
over-indexes on and the places it already likes within a walk of the door, then ranks the
merchant's own offers against those tastes. A second pass adds the taste of the street itself
(places around the merchant's address as the signal), and the two rankings are shown side by side:
"Event only" and "Event + your street". The raw affinity score alone would often pick the wrong
offer; demographics and brands overrule it, and the drawer says so. Every Qloo fact on screen is
in merchant words, with the number of calls, the cache hits and the time of the check. The honesty
line is always present: Qloo describes what this crowd likes, not who walks past your door.

Calls used: Insights with entity signals (`urn:demographics`, `urn:tag`, `urn:entity:brand`,
`urn:entity:place` with a point and a radius), `signal.location` for the street, `/search` for
entity resolution, `/v2/tags` to tag the offers at onboarding. All cached by content hash and
logged.

## How we built it

Next.js 16 on a persistent Node process with SQLite, the Qloo Insights API behind a content-hash
cache, the Ticketmaster Discovery API for events, Claude with structured output to write the
campaign from the Qloo profile and the merchant's offers, Open-Meteo for the weather at the door.
The demo video is a scripted recording of the hosted app with a generated voice.

## Challenges

Ambiguous entities: resolution is deterministic and asks the merchant when unsure, the model never
guesses an id. Place affinities near a point are compressed, so the fit score is one signal among
demographics, tags and brands. Saying only what we can prove: capacities are seats, not people;
exit times are estimates; no footfall, no sales forecast, no "sent" unless something was sent.

## Accomplishments

A decision a judge can read in ten seconds and verify in ninety: the occasion with its source,
the pick with its Qloo evidence, the board they can print.

## What we learned

Cultural grounding changes the decision, not just the words. The highest raw score for a Harry
Styles crowd was the sports-bar offer; the audience's tastes overruled it. That is the difference
between an agent that answers and an agent that knows what people like.

## What's next

Real sends behind the receipt (a connected WhatsApp number, a local ad account), the hourly scan
that alerts the owner before the crowd arrives, and the no-crowd nights driven by the taste of the
street alone.

## Built with

next.js, typescript, qloo, ticketmaster-api, anthropic, sqlite, open-meteo, render
