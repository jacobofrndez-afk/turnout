# Turnout

**Your marketing team. Your call.**

Turnout is a marketing assistant for independent businesses. Qualified data and each place’s DNA inform personalised campaigns with a message, timing, channels and planned media cost prepared for the owner to refine and approve. The product ambition is the preparation of a dedicated marketing team, with return on investment as the goal and the business retaining the final decision. In the current Today workflow, approval saves a plan for manual sharing; it does not publish or charge. Public feeds load on page requests, and measured ROI is not yet available. The sections below retain the original hackathon architecture and research; current public-source coverage is documented at the end.

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

Deploy: the Dockerfile runs `next start` as a persistent Node process with SQLite on a mounted disk (`DATABASE_PATH=/data/turnout.db`). `render.yaml` is a Render Blueprint (Docker web service, 1 GB disk at `/data`, health check at `/api/health`, secrets entered in the dashboard); `railway.json` does the same on Railway. On first boot with an empty database the server seeds the two demo merchants and their offers (tags resolved through Qloo), so a fresh disk shows a working demo.

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

## Merchant workspace and validation

The app opens on `/today`: a chronological, paginated agenda of Ticketmaster listings within the selected place’s exact radius. Penn & Pour and Le Quai 12 remain fictional businesses; event names, venues and start times come from the API. Prepared campaigns never influence agenda ordering. Each listing links to its source and shows its actual last verification time.

Missing or tentative times are excluded rather than invented, as are test, cancelled and postponed events. Cached responses preserve their original timestamps. During an outage, only source-verified records less than six hours old may appear, explicitly labelled as saved records; legacy rows without verification never substitute for live data. Refresh bypasses the hourly cache. Calendar-generated occasions are no longer registered in the radar. Crowd size and customer counts remain model estimates in Explore, not facts on the agenda. `/about` explains this distinction without a hardcoded artist or sample campaign. Text can be copied from event campaigns and weekly plans.

Saving without connected adapters records `prepared`, not `sent`. The demo WhatsApp adapter targets only `DEMO_WHATSAPP_TO`; Snapchat creates a paused campaign. Google and screen content remain manual previews. Nothing is automatically replayed when credentials are connected later. Mixed or failed delivery is shown from the individual receipts, including old records.

Campaign approval uses a conditional database claim to prevent duplicate sends. Generation requests reuse an existing usable draft or pending request; expired windows and invalid offer ownership are rejected. Manual drafting mode explicitly says it needs a supplied file instead of showing an indefinite writing animation. To enable automatic drafting, configure the Anthropic credentials and remove `AGENT_PROVIDER=operator` or set it to `anthropic`.

Run `npm test` for the isolated SQLite regression tests and `npm run build` for production compilation. Tests never load `.env.local` and disable messaging and advertising credentials. Qloo exploration/MCP tools are development dependencies; the Docker build prunes them from the server image. Production dependencies were checked with `npm audit --omit=dev`; the exploration toolchain still has upstream advisories under the full development audit.

### Place DNA and photo drafts

`/dna?merchant=m_penn_pour` is the short, prefilled place profile. `/dna/campaigns` compares Penn & Pour and Le Quai 12 using their saved offers, voice, channel preferences, preparation time and paid-media ceilings. These are labelled fictional demo profiles and illustrative messages, not current opportunity forecasts. Existing demo profiles are seeded once; merchant edits are never reset.

Confirmations create a revision in `merchant_dna` and `dna_history`. Event campaigns and neighbourhood briefs capture the DNA they used, receive it in their writing prompt, and enforce its advertising ceiling. New DNA revisions invalidate draft reuse; previously approved or delivered campaigns keep their original snapshot and channel plan. Photo drafts are available in Campaign activity and are saved for manual copying, not automatically published or scheduled.

`/campaigns/from-photo?merchant=…` accepts JPEG, PNG and WebP up to 5 MB. On macOS, run `npm run setup:photo-ocr` once to build the offline Vision reader under `.tmp/photo-ocr/`. This uses the installed Swift compiler and Apple frameworks; no image leaves the Mac. It extracts visible text and explicit prices, leaving item/price associations for the owner to verify. On other hosts, a configured Anthropic provider can transcribe the image; without either reader the interface clearly offers manual entry. Images are not persisted by Turnout; reviewed/extracted text is. Local OCR additionally limits decoded dimensions to 25 megapixels.

Every photo draft requires review of the offer, exact currency, availability and final message. A separate, explicit choice can retain a phrase as the place's future voice example. A temporary offer does not silently become a permanent DNA preference. The current quick-draft composer assembles one editable message from the reviewed offer and DNA; channel-specific formatting, cost forecasts and scheduling remain separate work.

Validation: `npm test` covers merchant isolation, optimistic revision checks, explicit learning, frozen snapshots/channel plans, paid-media limits, photo price extraction and unavailable reader behavior. `npm run build` verifies the application and types.

### Public discovery sources (Today / Account → Sources)

`opportunitySources` now combines city feeds with:

- **Google Trends RSS**, France / United States, 15-minute cache. Only fresh topics with an explicit food/drink match to a priced menu offer can suggest a campaign. National interest is not local demand; unrelated news is excluded.
- **OpenAgenda via Opendatasoft's public catalogue**, Greater Paris, one-hour cache, Licence Ouverte v1.0. Requires coordinates and individual session timestamps. Does not use OpenAgenda's retired legacy JSON export. Duplicates are collapsed, including minor title/date-range differences between feeds.
- **Bluesky public author feeds**, up to five selected publishers per place, 15-minute cache. Handles resolve through the fixed public API and are saved as DIDs. Only recent original posts are considered. Public social observations remain context; no location, event time, demographics or footfall is inferred from them.

All checks run on page load, not in a background polling service. Coverage shows retrieval time, scope, failures and paused feeds. Public source preferences are versioned in `source_settings`; these demo settings are not private user accounts. Bounded fetches reject redirects, arbitrary hosts and oversized responses. Fixtures are used only in tests, never as fallback feed data.

Instagram and Facebook account connection now lives in **Account → Your channels**. The OAuth flow, account selection and private token storage are implemented, but actual connection remains disabled until a Meta app and a canonical HTTPS address are configured. See [Meta channel setup](docs/meta-channels.md). No real authorization has been tested yet. These are account connections, not audience insights or an automatic publishing integration. Google Business Profile, X, Reddit, TikTok and DATAtourisme are not active private feeds.

The demo business data remains public. Social access has a separate authenticated owner/session boundary: a public merchant ID or merchant cookie never grants access to tokens or connected account metadata. Existing campaign APIs do not read these credentials.

### Campaign publication destinations

Today and saved campaigns show **Where to publish**: selected channel, format, account/status and a copy action followed by a link to the provider. Instagram captions explicitly need a photo/video added in Instagram; Facebook uses the authorized Page when available. Account connection links open separately so the draft stays in place. The current account comes from a private no-store endpoint and is never included in public campaign records. The interface refreshes account status when the browser regains focus.

Unpaid channels can be added for an individual campaign without changing its place DNA. DNA still controls default channels and whether a paid local ad is allowed. The recorded decision remains manual, with no provider post or charge. Saved plans and older event campaigns retain manual materials for Instagram/Facebook too. Opening a provider is not posting, and Turnout does not claim delivery from a copy action.

Meta app setup is on hold pending an authorized administrator or partner; the project owner does not want to use or create a personal account. A future Render HTTPS origin can be set as `TURNOUT_PUBLIC_URL` once known. No Render service or Meta app has been created by this setup work.


### Guided campaign review

Today leads with the campaign potential index and a visible signal → Qloo neighbourhood match → place DNA explanation. The leading proposal is selected by valid timing, then potential score, with earlier windows breaking score ties; other sourced ideas also show their indices. The number uses the existing documented prioritisation rules, not a new success or ROI prediction. Missing Qloo evidence or invalid timing still leaves the score unavailable.

The merchant moves from **Opportunity** to **Your campaign** (editable message, offer, timing, channels and media budget), then approves to reach **Publish**. Moving between the first two steps preserves edits. Saving for later stops at review; approval records a decision and exposes manual publication instructions, never a delivered status. The About page explains discovery, Qloo matching, preparation and the merchant's decision as one journey. Provider publication and live result measurement remain outside this preview.
