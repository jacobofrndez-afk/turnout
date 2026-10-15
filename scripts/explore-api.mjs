// Raw API exploration: hits every endpoint family once and saves the responses.
// Usage: node scripts/explore-api.mjs [entity name] [type]
// Output: spike-results/api/*.json (gitignored).
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envFile = resolve(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const BASE = process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com";
const KEY = process.env.QLOO_API_KEY;
if (!KEY) {
  console.error("QLOO_API_KEY missing. Put it in .env.local (see .env.example).");
  process.exit(2);
}
const name = process.argv[2] ?? "Harry Styles";
const type = process.argv[3] ?? "artist";
const outDir = resolve(root, "spike-results", "api");
mkdirSync(outDir, { recursive: true });

let n = 0;
async function get(label, path, params) {
  const q = new URLSearchParams(params);
  const url = `${BASE}${path}?${q}`;
  const t0 = Date.now();
  const res = await fetch(url, { headers: { "X-Api-Key": KEY } });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text.slice(0, 500) }; }
  const ms = Date.now() - t0;
  writeFileSync(resolve(outDir, `${String(++n).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "_")}.json`), JSON.stringify({ url: url.replace(KEY, "<key>"), status: res.status, body }, null, 2));
  const r = body?.results;
  const count = Array.isArray(r) ? r.length : r?.entities?.length ?? r?.tags?.length ?? r?.demographics?.length ?? r?.heatmap?.length ?? r?.trending?.length ?? (r ? Object.keys(r).length : 0);
  console.log(`${String(n).padStart(2)}. ${label.padEnd(44)} ${res.status} ${String(count).padStart(3)} results ${ms} ms`);
  return body;
}
const names = (arr, k = "name", n = 6) => (arr ?? []).slice(0, n).map((x) => x?.[k] ?? x?.tag_id ?? x?.id).join(" | ");

console.log(`Exploring Qloo for "${name}" (${type})\n`);

// 1. Resolve the entity
const s = await get("search entity", "/search", { query: name, types: `urn:entity:${type}`, take: 5 });
const ent = s?.results?.[0];
console.log("   ->", names(s?.results, "name", 5), "\n");
if (!ent?.entity_id) {
  console.error("Could not resolve entity, stopping.");
  process.exit(1);
}
const id = ent.entity_id;

// 2. Hydrate by id
await get("entities by id", "/entities", { entity_ids: id });

// 3. Taste analysis: tags characterising the entity
const tags = await get("insights urn:tag", "/v2/insights", { "filter.type": "urn:tag", "signal.interests.entities": id, take: 20 });
console.log("   ->", names(tags?.results?.tags, "name", 10), "\n");
await get("insights urn:tag place-only", "/v2/insights", { "filter.type": "urn:tag", "signal.interests.entities": id, "filter.parents.types": "urn:entity:place", take: 20 });

// 4. Demographics
const demo = await get("insights urn:demographics", "/v2/insights", { "filter.type": "urn:demographics", "signal.interests.entities": id });
console.log("   ->", JSON.stringify(demo?.results?.demographics?.[0]?.query ?? demo?.results).slice(0, 220), "\n");

// 5. Recommendations by type
for (const t of ["brand", "artist", "place", "podcast", "movie"]) {
  const r = await get(`recommend ${t}`, "/v2/insights", { "filter.type": `urn:entity:${t}`, "signal.interests.entities": id, take: 10, "feature.explainability": "true" });
  console.log("   ->", names(r?.results?.entities), "\n");
}

// 6. Places near Madison Square Garden, radius forms
const msg = "POINT(-73.9934 40.7505)";
const p1 = await get("places radius 1500m MSG", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": id, "filter.location": msg, "filter.location.radius": "1500", take: 20 });
console.log("   ->", names(p1?.results?.entities, "name", 8), "\n");
const p2 = await get("bars radius 1500m MSG", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": id, "filter.location": msg, "filter.location.radius": "1500", "filter.tags": "urn:tag:genre:place:bar", take: 20 });
console.log("   ->", names(p2?.results?.entities, "name", 8), "\n");
const p3 = await get("places query Lower East Side", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": id, "filter.location.query": "Lower East Side", take: 20 });
console.log("   ->", names(p3?.results?.entities, "name", 8), "\n");
const p4 = await get("places radius + price + rating", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": id, "filter.location": msg, "filter.location.radius": "2000", "filter.price_level.min": "2", "filter.properties.business_rating.min": "4", take: 20 });
console.log("   ->", names(p4?.results?.entities, "name", 8), "\n");

// 7. Rank a shortlist (affinity of specific places/brands toward the crowd)
const shortlist = await get("search bars near MSG", "/search", { query: "bar", types: "urn:entity:place", "filter.location": "40.7505,-73.9934", "filter.radius": "1", sort_by: "distance", take: 8 });
const ids = (shortlist?.results ?? []).map((e) => e.entity_id).filter(Boolean).slice(0, 8);
console.log("   ->", names(shortlist?.results, "name", 8), "\n");
if (ids.length) {
  const rk = await get("rank shortlist of nearby bars", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": id, "filter.results.entities": ids.join(","), take: 20 });
  console.log("   ->", (rk?.results?.entities ?? []).map((e) => `${e.name} ${e.query?.affinity?.toFixed?.(2) ?? e.affinity?.toFixed?.(2) ?? ""}`).join(" | "), "\n");
}

// 8. Heatmap over NYC
const hm = await get("heatmap NYC", "/v2/insights", { "filter.type": "urn:heatmap", "signal.interests.entities": id, "filter.location.query": "New York City", take: 50 });
console.log("   ->", (hm?.results?.heatmap ?? []).slice(0, 4).map((h) => `${h.location?.geohash} aff ${h.query?.affinity?.toFixed?.(2)} pop ${h.query?.popularity?.toFixed?.(2)}`).join(" | "), "\n");

// 9. Trending
const end = new Date();
const start = new Date(end.getTime() - 120 * 86400e3);
const iso = (d) => d.toISOString().slice(0, 10);
const tr = await get("trending", "/v2/trending", { "filter.type": `urn:entity:${type}`, "signal.interests.entities": id, "filter.start_date": iso(start), "filter.end_date": iso(end), take: 20 });
console.log("   ->", (tr?.results?.trending ?? []).slice(0, 3).map((t) => `${t.date} pct ${t.population_percentile} rank ${t.population_rank}`).join(" | "), "\n");

// 10. Compare with a second entity
const other = await get("search New York Knicks", "/search", { query: "New York Knicks", take: 3 });
const oid = other?.results?.[0]?.entity_id;
console.log("   ->", names(other?.results, "name", 3), other?.results?.[0]?.subtype ?? "", "\n");
if (oid) {
  const cmp = await get("analysis compare", "/v2/analysis/compare", { "a.signal.interests.entities": id, "b.signal.interests.entities": oid, "filter.type": "urn:entity:brand", take: 15 });
  console.log("   ->", JSON.stringify(cmp?.results).slice(0, 300), "\n");
}

// 11. Tags and audiences vocabulary
const ft = await get("tags search craft beer", "/v2/tags", { "filter.query": "craft beer", take: 10 });
console.log("   ->", names(ft?.results?.tags ?? ft?.results, "name", 8), "\n");
await get("tag types", "/v2/tags/types", { take: 50 });
const aud = await get("audiences spending_habits", "/v2/audiences", { "filter.parents.types": "urn:audience:spending_habits", take: 30 });
console.log("   ->", names(aud?.results?.audiences ?? aud?.results?.entities ?? aud?.results, "name", 10), "\n");
await get("audience types", "/v2/audiences/types", { take: 50 });

// 12. Demographic-signal recommendation (no entity): places for men 25-34 near MSG
const dm = await get("places for men 25-34 near MSG", "/v2/insights", { "filter.type": "urn:entity:place", "signal.demographics.age": "25_to_29,30_to_34", "signal.demographics.gender": "male", "filter.location": msg, "filter.location.radius": "1500", take: 10 });
console.log("   ->", names(dm?.results?.entities, "name", 8), "\n");

console.log(`Done. Raw responses in ${outDir}`);
