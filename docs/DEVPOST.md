# DevPost submission draft

Fill the URL fields before submitting. Keep every claim consistent with README.md.

## Project name

Turnout

## Tagline (60 chars)

Turn the crowd outside into customers inside.

## Links

- Live demo: _Railway URL_
- Repository: _GitHub URL_ (public, MIT, license file visible in About)

## Inspiration

Twenty thousand people walk past a bar on a concert night and pick a place in the ten minutes before and after the show. The bar owner does not follow the venue calendar, does not know whether tonight's crowd wants cocktails or pitchers, and cannot buy visibility from strangers. The tools that could help are sold to agencies and chains. We wanted the independent merchant to have an agent that knows the street and knows when it is about to overflow.

## What it does

Turnout is an agent for independent merchants. It watches for crowds about to be around the door, sized to the merchant's own room: a show at a venue within walking distance (Ticketmaster), a wave of small shows starting or letting out together (31 Broadway houses at 22:30), the local team on TV (ESPN schedule, sized by how much the streets around the bar love the team according to Qloo), a street event (NYC and Paris open data: parades, block parties, races) or a city night (Halloween, Thanksgiving Eve, Beaujolais Nouveau). It learns who that crowd is culturally through Qloo (demographics, taste tags, brands, the bars nearby they already like), ranks the merchant's own offers against that crowd, writes the campaign for five channels (geofenced ad, Google Business post, WhatsApp to opted-in regulars, chalkboard and staff line, digital screen) and publishes it once the merchant approves. A weekly "neighbourhood pulse" does the same for the everyday flow of passers-by, using the taste of the street itself as the Qloo signal. Onboarding takes two minutes: address, offers in plain words, Qloo tags confirmed in one screen.

## How it is Qloo-powered

Ticketmaster, ESPN and the city say a crowd is coming; only Qloo says who they are, and for crowds without a ticket Qloo is also what sizes them. Fans of Harry Styles over-index on women 25 to 29, rooftop cocktail bars and Gucci; fans of Gradur on men 25 to 29, Olympique de Marseille and O'Tacos. A Broadway let-out has no headliner, so Qloo reads it through the shows' screen versions plus the Musical Theatre tag. For the Knicks on TV, the Qloo heatmap measures the local fandom of the streets around the bar (0.99 at Penn & Pour, a home crowd; the Celtics 0.77 on the same streets). For the everyday flow, the places Qloo knows around the door give the rhythm of the street: after work, late nights, weekend brunch, each with its evidence in Qloo's own words. Same bar, same radius, same code: the agent picks a different offer and writes different copy, and cites the Qloo evidence by name. Calls used: `/search`, Insights `urn:demographics`, `urn:tag` scoped to places, `urn:entity:brand`, `urn:entity:place` with a WKT point and radius, `urn:heatmap`, multi-entity and tag signals, `/v2/tags` for onboarding, and `signal.location` for the neighbourhood pulse. Every call is cached and logged to a provenance panel the judge can open on any page.

## How we built it

Next.js 16 on a persistent Node process, SQLite, direct Qloo Insights API with a content-hash cache, Ticketmaster Discovery API, Claude with structured output for the agent (or an operator inbox for local tests), Open-Meteo for the weather at the door, Twilio WhatsApp sandbox, Snapchat Marketing API payloads (campaigns created paused), OpenStreetMap for geocoding and tiles. The Qloo harness (`qloo mcp`) was used to spike and validate the recipe.

## Challenges

Ambiguous entities (Harry Styles exists as person, artist, album and author): resolution is deterministic and asks the merchant when unsure, the LLM never guesses an id. Place affinities near a point are compressed, so the agent treats fit scores as one signal among demographics, tags and brands. Non-US coverage is noisier, so the demo leads with New York and keeps Paris as proof of portability. Reaching strangers honestly: real sends only to consenting demo numbers; ad campaigns created paused; everything else labelled simulated with its exact payload.

## What we learned

Cultural grounding changes the decision, not just the words. The highest raw affinity score was the sports-bar offer for a Harry Styles crowd; the demographics and brands overruled it. That is the difference between an agent that answers and an agent that knows what people like.

## What's next

The push alert (hourly scan, WhatsApp to the merchant with the campaign ready), Snapchat and Google Business Profile wired end to end, a Meta fallback, better crowd sizing for TV and street moments, venue partnerships (Live Nation, Ticketmaster) to activate the merchants around an event from the event side.

## Built with

next.js, typescript, qloo, ticketmaster-api, open-meteo, anthropic, sqlite, twilio, snapchat-marketing-api, openstreetmap, railway
