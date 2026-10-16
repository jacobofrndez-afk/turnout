// Follow-up checks after the first exploration: correct bar tag, UUID signals through MCP,
// trending on other types, neighbourhood taste via signal.location.query.
// Usage: node scripts/explore-followup.mjs
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
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
for (const k of ["QLOO_HOME", "TMPDIR"]) if (process.env[k]?.startsWith("./")) process.env[k] = resolve(root, process.env[k]);
const BASE = process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com";
const KEY = process.env.QLOO_API_KEY;
const outDir = resolve(root, "spike-results", "followup");
mkdirSync(outDir, { recursive: true });
let n = 0;
const save = (label, data) => writeFileSync(resolve(outDir, `${String(++n).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "_")}.json`), JSON.stringify(data, null, 2));

async function get(label, path, params) {
  const q = new URLSearchParams(params);
  const res = await fetch(`${BASE}${path}?${q}`, { headers: { "X-Api-Key": KEY } });
  const body = await res.json().catch(() => ({}));
  save(label, { path, params, status: res.status, body });
  const r = body?.results;
  const count = Array.isArray(r) ? r.length : r?.entities?.length ?? r?.tags?.length ?? r?.trending?.length ?? r?.heatmap?.length ?? 0;
  console.log(`${String(n).padStart(2)}. ${label.padEnd(46)} ${res.status} ${String(count).padStart(3)} results`);
  return body;
}
const names = (arr, n = 8) => (Array.isArray(arr) ? arr : []).slice(0, n).map((x) => `${x.name}${x.query?.affinity != null ? " " + x.query.affinity.toFixed(2) : ""}`).join(" | ");

const STYLES = "5D28EDAC-F84F-42EB-8DB3-28EC65330287";
const KNICKS = "9E65EACE-19B1-446B-ABE3-713CCA8D37C7";
const MSG = "POINT(-73.9934 40.7505)";
const BAR = "urn:tag:genre:place:restaurant:bar";

console.log("--- raw API ---");
const b1 = await get("bars 1.5km MSG (correct tag)", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": STYLES, "filter.location": MSG, "filter.location.radius": "1500", "filter.tags": BAR, take: 20, "feature.explainability": "true" });
console.log("   ->", names(b1?.results?.entities), "\n");
const b2 = await get("bars 1.5km MSG for Knicks fans", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": KNICKS, "filter.location": MSG, "filter.location.radius": "1500", "filter.tags": BAR, take: 20 });
console.log("   ->", names(b2?.results?.entities), "\n");
const b3 = await get("restaurants 1.5km MSG Styles, open friday", "/v2/insights", { "filter.type": "urn:entity:place", "signal.interests.entities": STYLES, "filter.location": MSG, "filter.location.radius": "1500", "filter.tags": "urn:tag:genre:place:restaurant", "filter.hours": "friday", take: 20 });
console.log("   ->", names(b3?.results?.entities), "\n");
const b4 = await get("bars 1.5km MSG, no signal (baseline)", "/v2/insights", { "filter.type": "urn:entity:place", "filter.location": MSG, "filter.location.radius": "1500", "filter.tags": BAR, take: 20 });
console.log("   ->", names(b4?.results?.entities), "\n");
const t1 = await get("taste of Chelsea (signal.location.query)", "/v2/insights", { "filter.type": "urn:tag", "signal.location.query": "Chelsea, New York", "filter.parents.types": "urn:entity:place", take: 15 });
console.log("   ->", names(t1?.results?.tags, 12), "\n");
const t2 = await get("tags Styles x place, cost/ambience only", "/v2/insights", { "filter.type": "urn:tag", "signal.interests.entities": STYLES, "filter.tag.types": "urn:tag:ambience:qloo,urn:tag:cost_description:place,urn:tag:beverage_offering:qloo,urn:tag:cuisine:qloo", take: 20 });
console.log("   ->", names(t2?.results?.tags, 12), "\n");
const end = new Date(), start = new Date(end.getTime() - 180 * 86400e3);
const iso = (d) => d.toISOString().slice(0, 10);
for (const [t, id] of [["brand", KNICKS], ["artist", STYLES]]) {
  const tr = await get(`trending ${t} 180d`, "/v2/trending", { "filter.type": `urn:entity:${t}`, "signal.interests.entities": id, "filter.start_date": iso(start), "filter.end_date": iso(end), take: 30 });
  console.log("   ->", (tr?.results?.trending ?? []).slice(0, 3).map((x) => `${x.date} pct ${x.population_percentile} rank ${x.population_rank}`).join(" | "), "\n");
}
const trm = await get("trending movie no entity", "/v2/trending", { "filter.type": "urn:entity:movie", "filter.start_date": iso(start), "filter.end_date": iso(end), take: 10 });
console.log("   ->", JSON.stringify(trm?.results ?? trm).slice(0, 300), "\n");
const cmp = await get("compare Styles vs Knicks (tags)", "/v2/analysis/compare", { "a.signal.interests.entities": STYLES, "b.signal.interests.entities": KNICKS, take: 20 });
console.log("   -> a:", names(cmp?.results?.a, 8), "\n   -> b:", names(cmp?.results?.b, 8), "\n");
const hm = await get("heatmap 3km around MSG", "/v2/insights", { "filter.type": "urn:heatmap", "signal.interests.entities": STYLES, "filter.location": MSG, "filter.location.radius": "3000", take: 50 });
console.log("   ->", (hm?.results?.heatmap ?? []).slice(0, 5).map((h) => `${h.location.geohash} aff ${h.query.affinity.toFixed(2)} pop ${h.query.popularity.toFixed(2)}`).join(" | "), "\n");

console.log("--- MCP workflows with UUID signals ---");
const transport = new StdioClientTransport({ command: process.execPath, args: [resolve(root, "node_modules/@qloo/qloo-harness/dist/bin.js"), "mcp"], env: { ...process.env } });
const client = new Client({ name: "followup", version: "0.0.1" });
await client.connect(transport);
async function tool(label, name, args) {
  const r = await client.callTool({ name, arguments: args });
  const env = r.structuredContent ?? {};
  save(`mcp ${label}`, { name, args, envelope: env });
  console.log(`${String(n).padStart(2)}. ${label.padEnd(46)} ${env.status} ${String(env.result_count ?? 0).padStart(3)} results  ${env.summary?.slice(0, 80) ?? ""}`);
  return env;
}
const r1 = await tool("recommend place uuid + location query", "qloo_recommend", { target_type: "place", signals: [STYLES], filter_location: "Chelsea, New York", limit: 10 });
console.log("   ->", names(r1.results), "\n");
const r2 = await tool("recommend brand uuid", "qloo_recommend", { target_type: "brand", signals: [STYLES], limit: 10 });
console.log("   ->", names(r2.results), "\n");
const r3 = await tool("recommend place uuid + bar tag", "qloo_recommend", { target_type: "place", signals: [STYLES], include_tags: [BAR], filter_location: "Chelsea, New York", limit: 10 });
console.log("   ->", names(r3.results), "\n");
const r4 = await tool("rank brand uuids", "qloo_rank", { options: ["Shake Shack", "Sweetgreen", "Chipotle"], option_type: "brand", signals: [STYLES] });
console.log("   ->", names(r4.results), JSON.stringify(r4.resolution?.issues?.map((i) => [i.input, i.kind])), "\n");
const r5 = await tool("compare uuids", "qloo_compare_audiences", { group_a: [STYLES], group_b: [KNICKS], target_type: "brand", limit: 10 });
console.log("   ->", names(r5.results), "\n");
const r6 = await tool("recommend place demographic only", "qloo_recommend", { target_type: "place", demographic: "women 25-34", filter_location: "Chelsea, New York", limit: 10 });
console.log("   ->", names(r6.results), "\n");
await client.close();
console.log(`Done. Raw in ${outDir}`);
