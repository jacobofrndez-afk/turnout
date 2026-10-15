# Qloo API, what we can retrieve (hackathon notes)

Base URL for hackathon keys: `https://hackathon.api.qloo.com`. Header `X-Api-Key`. GET with query-string parameters.
Invalid parameters are silently ignored (you get 200 and an empty list), so always validate IDs first.

## 1. Entities: the graph nodes

Ten insight types: `artist`, `book`, `brand`, `destination`, `movie`, `person`, `place`, `podcast`, `tv_show`, `videogame`
(plus `locality` for cities/neighbourhoods, search-only or as a location ID).

Every entity: `entity_id` (UUID), `name`, `subtype`, `popularity` (0-1 percentile), `affinity` (0-1, relative to your signals),
`tags[]`, `disambiguation`, `properties` (type specific), external ids.

Place properties worth using: address, neighborhood, metro, lat/lon, phone, website, menu_url, `business_rating`,
`price_level` (1-4), hours, `is_closed`, plus tags for cuisine, ambience, amenities, decor, payments, pets.
Brand properties: industries, products, `price_tier`, `target_audience`, `brand_personality`, `lifestyles`,
`use_occasions`, `psychographic_segments`, `customer_personas`, `competitive_set`, `complementary_brands`.

## 2. Tags: the vocabulary

URN pattern `urn:tag:{category}:{namespace}[:sub...]`. Families seen:
- `urn:tag:genre:music`, `urn:tag:genre:media`, `urn:tag:keyword:media`
- `urn:tag:genre:place` (restaurant, bar, hotel subtrees), `urn:tag:cuisine:place`, `urn:tag:ambience:place`,
  `urn:tag:amenity:place`, `urn:tag:decor:place`, `urn:tag:parking:place`, `urn:tag:payments:place`
- `urn:tag:genre:brand` (hierarchical, e.g. fashion:footwear:sneaker), `urn:tag:adjective:qloo` (brand personality)
- `urn:tag:audience:qloo` (artist audience traits: loyal, passionate, youthful...)
- `urn:tag:wikipedia_category:wikidata`, `urn:tag:occupation:person`, `urn:tag:genre:locality`

Lookup: `GET /v2/tags?filter.query=craft beer&filter.tag.types=...` and `GET /v2/tags/types`.

## 3. Audiences: named segments

`GET /v2/audiences` (marked deprecated but still the way to get IDs), filtered by `filter.parents.types` among:
communities, global_issues, hobbies_and_interests, investing_interests, leisure, life_stage,
lifestyle_preferences_beliefs, political_preferences, professional_area, spending_habits.
Used as `signal.demographics.audiences` (+ `.weight`).

## 4. The Insights endpoint, one endpoint, six jobs

`GET /v2/insights?filter.type=...` with signals and filters.

| Job | filter.type | Key inputs | Output |
| --- | --- | --- | --- |
| Recommendations | `urn:entity:<type>` | `signal.interests.entities`, `signal.interests.tags`, `signal.demographics.*`, `signal.location` | entities ranked by `affinity` |
| Taste analysis | `urn:tag` | same signals, `filter.tag.types`, `filter.parents.types` | tags that characterise the input |
| Demographics | `urn:demographics` | `signal.interests.entities` or tags | affinity per age bucket (24_and_younger ... 55_and_older) and gender, positive = over-index |
| Heatmap | `urn:heatmap` | one signal + `filter.location` or `filter.location.query` | geohash points with `affinity`, `affinity_rank`, `popularity` |
| Location-aware | any | `signal.location` (taste of an area) vs `filter.location` + `filter.location.radius` (constrain output) | |
| Affinity check | any | `filter.results.entities` = your shortlist | affinity of each shortlisted entity toward the signals (this is `rank`) |

Useful knobs:
- `filter.location` = WKT `POINT(lon lat)` / POLYGON / locality UUID; `filter.location.radius` in metres (0 = strict).
- `filter.location.query` = fuzzy locality name ("Lower East Side"). Note: the harness `recommend` workflow only exposes this form.
- Place filters: `filter.price_level.min/max`, `filter.properties.business_rating.min`, `filter.hours=friday`,
  `filter.popularity.min`, `filter.tags` + `operator.filter.tags`, `filter.exclude.tags`, `filter.references_brand`,
  `filter.external.exists=resy,michelin,tablet`, `bias.quality`, `sort_by=affinity|distance|rating|quality`.
- Signals accept weights (POST body) and `operator.signal.interests.tags=union|intersection`.
- `feature.explainability=true` returns per-result contribution of each input signal (0-1). Provenance for free.
- `bias.trends` leans toward currently trending entities.
- `diversify.by=properties.geocode.city` + `diversify.take` caps results per city.
- Paging: `take` (max 50), `page` (1-100).

## 5. Supporting endpoints

- `GET /search?query=...&types=urn:entity:place&filter.location=lat,lon&filter.radius=<miles>&sort_by=distance` : resolve names to IDs, or list places near a point.
- `GET /entities?entity_ids=...` or `external.spotify.ids=...` etc.: hydrate by Qloo or external IDs (Spotify, IMDb, Resy, Michelin, Instagram, Wikidata...).
- `GET /v2/analysis/compare?a.signal.interests.entities=...&b.signal.interests.entities=...&filter.type=...` : what differentiates two groups.
- `GET /v2/trending?filter.type=...&signal.interests.entities=...&filter.start_date=...&filter.end_date=...` : weekly `population_percentile`, `population_rank`, `population_rank_velocity`, `velocity_fold_change`.

## 6. Harness workflows → API mapping

| `qloo exec` / MCP tool | Underlying call |
| --- | --- |
| `find_tags` | `/v2/tags` (semantic) |
| `describe` | `/search` then `/entities` |
| `recommend` | insights `urn:entity:<target_type>` with signals, `filter.location.query` |
| `rank` | insights with `filter.results.entities` = options |
| `entity_tags` | insights `urn:tag` |
| `audience_demographics` | insights `urn:demographics` |
| `where_popular` | insights `urn:heatmap` with `filter.location.query` |
| `compare_audiences` | `/v2/analysis/compare` |
| `trends` | `/v2/trending` |

## 7. Rules

Group affinities, not individuals. No personal data sent to Qloo. Key server-side only. Private caching allowed. Do not publish raw Qloo data in the repo.
