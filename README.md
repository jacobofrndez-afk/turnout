# Turnout

**Turn the crowd outside into customers inside.**

Turnout is an agent for independent merchants (bars, restaurants, shops). It watches for crowds about to be around the door, learns who that crowd is through Qloo's taste graph, picks the merchant's offer that fits, writes the campaign for every channel, and publishes it once the merchant approves. A second, weekly mode reads the taste and the rhythm of the street outside the door for the everyday flow of passers-by.

A crowd is anything that could fill a quarter of the merchant's room, not only a stadium:

- a show at a venue within walking distance (Ticketmaster);
- a wave: several small shows starting or letting out together (31 Broadway houses at 22:30 is one 32,000-person moment, even if each theatre alone is not);
- the local team on TV, away or at home across town (ESPN schedule; Qloo measures how much these streets love the team);
- a street or city event: parades, block parties, races, processions (NYC Open Data permitted events, Que faire à Paris);
- a city night: Halloween, Thanksgiving Eve, Beaujolais Nouveau, New Year's Eve.

Relevance is relative to the merchant: a 50-seat bar needs twelve extra guests, so a Tuesday hockey game on TV counts for it and a 20,000-seat arena is not the only thing worth a campaign.

Built for the Qloo Agentic Hackathon (Agents, but with taste), October 2026.

- Live demo: _URL to come_
- Repository: this one, MIT licensed
- Demo merchants: Penn & Pour (two blocks from Madison Square Garden, New York) and Le Quai 12 (Accor Arena, Paris). Or set up your own place in two minutes at `/start`.

## The problem

Twenty thousand people walk past a bar on a concert night and decide where to go in the ten minutes before and after the show. The bar owner does not follow the venue calendar, does not know whether tonight's crowd wants cocktails or pitchers, and has no way to buy visibility from strangers. Geofencing platforms, event-data vendors and marketing agents exist separately, for agencies and chains. Nobody serves the independent merchant, and nobody connects *where and when* with *who, culturally, and what to say*.

## Why it only works with Qloo

Ticketmaster, ESPN and the city tell us a crowd is coming. Only Qloo tells us who they are culturally, and for some crowds Qloo is also what sizes them:

- fans of Harry Styles over-index on women aged 25 to 29 (+0.75), on 'Moderately expensive' rooftop cocktail bars (Igloo Bar, 230 Fifth), and on Gucci and Dior;
- fans of Gradur over-index on men aged 25 to 29 (+0.59), on Olympique de Marseille, Betclic and O'Tacos, and on the bars 911 Paris and Café Oz.

- a Broadway let-out has no single headliner: Qloo reads Schmigadoon!, Aladdin and The Lion King through their screen versions plus the Musical Theatre tag, and returns a young, female crowd that likes The Green Room 42 and Beer Culture;
- for the Knicks on TV, the Qloo heatmap says how much the streets around the bar love the team (median affinity rank within 800 m: Knicks at Penn & Pour 0.99, Celtics 0.77; PSG at Le Quai 12 0.88, Marseille 0.76). That number sizes the watch party;
- the weekly pulse reads the rhythm of the street from the places Qloo knows around the door: hours, happy-hour and brunch tags, and Qloo's own descriptions ("after work" for four places next to Le Quai 12, "late-night meals after concerts" at Tick Tock Diner). That gives the after-work, late-night and brunch moments with their evidence.

Same bar, same radius, same code: the agent picks the cocktail happy hour for one crowd and the midnight croque for the other, and writes different copy. Without Qloo the merchant could still buy a geofenced ad, but a generic one with generic targeting.

## Qloo workflows used, and why

| Job in the product | Qloo call | Why it fits |
| --- | --- | --- |
| Resolve the headliner | `/search` with a type hint (Music → artist, Sports → brand) | Deterministic; ambiguity is shown to the merchant, never guessed by the LLM |
| Who is this crowd | Insights `urn:demographics` | Age and gender affinity, positive = over-index |
| What they like in a place | Insights `urn:tag` scoped to `urn:entity:place` | Taste vocabulary for copy and offer matching |
| Which brands they love | Insights `urn:entity:brand` | Cultural register and ad interest targeting |
| Which bars near the merchant they already like | Insights `urn:entity:place` with `filter.location` (WKT point) + `filter.location.radius` + bar tag | The competitive set, and proof the crowd seeks this kind of place here |
| Offer fit | Insights `urn:entity:place` filtered by the offer's tag URNs near the merchant | How strongly the crowd seeks places like this offer, around here |
| Offers → Qloo tags (onboarding) | `/v2/tags` semantic search, merchant confirms | Free-text offers become stable tag URNs |
| Taste of the street (weekly mode) | Insights `urn:tag`, `urn:entity:brand`, `urn:entity:place` with `signal.location` = the merchant's GPS point | Structural taste of the everyday flow, no event needed |

Weather comes from Open-Meteo (free, no key), forecast at the merchant for each window. Like Ticketmaster it is a signal Qloo does not have: it does not change who the crowd is, it changes what to offer (rain favours shelter and warm food, heat favours cold drinks and terraces). The agent cites it when it tips the choice, and it is logged in provenance.

The harness workflows (`qloo mcp`) were used to spike and validate the recipe; the app calls the Insights API directly because the `recommend` workflow only exposes a locality name, not a point and radius. Every call is cached by content hash for seven days and logged to a provenance table shown in the UI (live vs cached, status, result count).

## Request-to-result trace (redacted)

Event: Harry Styles at Madison Square Garden, merchant Penn & Pour, 0.3 km.

1. `GET /search?query=Harry+Styles&types=urn:entity:artist` → one exact match of the expected type → auto-resolved (`5D28EDAC-…`).
2. `GET /v2/insights?filter.type=urn:tag&signal.interests.entities=<id>&filter.parents.types=urn:entity:place` → Moderately expensive, Bar, Brunch, Vegan, Relaxed, Trendy…
3. `GET /v2/insights?filter.type=urn:demographics&signal.interests.entities=<id>` → 25-29 +0.75, female +0.72, 35-44 -0.72.
4. `GET /v2/insights?filter.type=urn:entity:place&signal.interests.entities=<id>&filter.location=POINT(-73.9957 40.7494)&filter.location.radius=1500&filter.tags=urn:tag:genre:place:restaurant:bar` → Igloo Bar 0.90, 230 Fifth 0.89, Social Drink & Food 0.88…
5. `GET /v2/insights?filter.type=urn:entity:brand&signal.interests.entities=<id>` → Gucci, Calvin Klein, Louis Vuitton, Dior…
6. Five offer-fit calls (same as 4, with each offer's tag URNs) → happy hour 0.88, late plate 0.87, sports bar 0.89…
7. Agent (Claude, structured output) → chooses the happy hour over the higher-scoring sports-bar offer, citing the female 25-34 skew, the rooftop cocktail bars and the luxury brands; writes copy for the geofenced ad, Google post, WhatsApp, chalkboard and screen; states limitations.
8. Approve → one send per channel the merchant has, with the exact payload, labelled real or simulated.

## What the result does not establish

Qloo describes aggregate affinities of people who like an entity or an area. It says nothing about any individual, it does not know who holds a ticket tonight, and a high affinity is not a prediction that anyone will walk in. Place affinities near a point are compressed (often 0.80 to 0.95), so the offer ranking is one signal; the agent weighs it with demographics, tags and brands and says so. Coverage is denser in New York than in Paris (Paris place tags mix hotels and spas). No personal data is sent to Qloo: inputs are headliner names, venue coordinates, the merchant's own address and offer words.

## Channels

| Channel | Reaches | Status in the demo |
| --- | --- | --- |
| Geofenced ad (Snapchat or Meta) | strangers around the venue, before and after the show | campaign object built with radius, schedule, interests from Qloo tags, creative and budget; pushed to a sandbox ad account when one is configured, otherwise shown as "simulated" |
| Google Business Profile post | people searching nearby | localPosts payload ready; needs a verified listing |
| WhatsApp to regulars | the merchant's opted-in contacts | real send through the Twilio WhatsApp sandbox to the demo number when configured; the fictional contact list is never messaged |
| Storefront | passers-by | chalkboard text and a staff line, ready to use |
| Digital screen | passers-by | simulated |

## Setup

Requirements: Node 22.19 or newer, a Qloo hackathon key, a Ticketmaster Discovery API key (free). Optional: an Anthropic API key (otherwise the agent runs in "operator" mode and writes its brief to `data/agent-inbox/`), Twilio credentials.

```bash
npm install
cp .env.example .env.local   # fill QLOO_API_KEY, TICKETMASTER_API_KEY, optionally ANTHROPIC_API_KEY and TWILIO_*
npm run seed                 # two demo merchants, offers resolved to Qloo tags
npm run dev                  # http://localhost:3000
```

Useful scripts: `npm run spike` (Qloo coverage go/no-go through `qloo mcp`), `npm run explore` (raw API tour), `npm run radar -- m_penn_pour`, `npm run crowd -- m_penn_pour "Harry Styles"`.

Deploy: the Dockerfile runs `next start` as a persistent Node process with SQLite on a volume (`DATABASE_PATH=/data/turnout.db`). `railway.json` points the health check at `/api/health`.

## Repository map

- `src/server/events/` crowd sources and scoring: Ticketmaster client and deduplication, waves of small shows (`moments.ts`), games on TV via ESPN with Qloo local fandom (`tv.ts`), street and city events (`street.ts`), city nights (`calendar.ts`), relevance relative to the merchant's seats (`concentration.ts`).
- `src/server/qloo/` direct Qloo API client with cache and provenance, crowd profile recipe (one headliner, or several entities and tags for a moment), neighbourhood pulse, street rhythm (`rhythm.ts`), local fandom heatmap, tag selection.
- `src/server/agent/` campaign and weekly-brief agents (Claude structured output, or operator inbox), prompts and schemas.
- `src/server/channels/` publishing pipeline and adapters.
- `src/server/weather/` Open-Meteo forecast per window and evenings of the week.
- `src/app/` radar, crowd profile, campaign, neighbourhood pulse, onboarding.
- `docs/QLOO_API.md` what the API returns, verified live.

## Rules we follow

Key server-side only. No personal data to Qloo. Private caching only; raw Qloo responses are gitignored. Results presented with source and limits, and distinguished from the agent's interpretation.
