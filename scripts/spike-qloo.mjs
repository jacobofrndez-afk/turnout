// Day-1 spike: does Qloo cover what Crowd-to-Campaign needs for an NYC event?
// Runs a fixed recipe through the local `qloo mcp` server and prints a go/no-go table.
// Usage: node scripts/spike-qloo.mjs
// Raw envelopes are written to spike-results/ (gitignored: Qloo data must not be published).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

// Minimal .env.local loader (no dependency). Existing env wins.
const envFile = resolve(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
for (const k of ["QLOO_HOME", "TMPDIR"]) {
  if (process.env[k]?.startsWith("./")) process.env[k] = resolve(root, process.env[k]);
}
process.env.QLOO_HOME ??= resolve(root, ".qloo");
process.env.TMPDIR ??= resolve(root, ".tmp");
process.env.QLOO_BASE_URL ??= "https://hackathon.api.qloo.com";
process.env.QLOO_TRUSTED_BASE_URL ??= "https://hackathon.api.qloo.com";
if (!process.env.QLOO_API_KEY) {
  console.error("QLOO_API_KEY missing. Put it in .env.local (see .env.example).");
  process.exit(2);
}

// Real MSG headliners this week (msg.com calendar, Oct 14-20 2026).
const HEADLINERS = [
  { name: "Harry Styles", type: "artist" },
  { name: "New York Knicks", type: "brand" },
  { name: "New York Rangers", type: "brand" },
];
// Madison Square Garden and a bar-sized spot on the Lower East Side.
const NEAR_MSG = "Madison Square Garden, New York";
const NEAR_LES = "Lower East Side, New York";

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(root, "node_modules/@qloo/qloo-harness/dist/bin.js"), "mcp"],
  env: { ...process.env },
});
const client = new Client({ name: "crowd-to-campaign-spike", version: "0.0.1" });
await client.connect(transport);

const outDir = resolve(root, "spike-results");
mkdirSync(outDir, { recursive: true });
const rows = [];
let seq = 0;

async function call(label, name, args) {
  const t0 = Date.now();
  let env;
  try {
    const r = await client.callTool({ name, arguments: args });
    env = r.structuredContent ?? { status: "error", summary: "no structuredContent", results: [] };
  } catch (e) {
    env = { status: "error", summary: String(e?.message ?? e), results: [] };
  }
  const ms = Date.now() - t0;
  const results = Array.isArray(env.results) ? env.results : [];
  rows.push({
    label,
    tool: name,
    status: env.status,
    count: env.result_count ?? results.length,
    ms,
    note: env.error?.code ?? (env.summary ?? "").slice(0, 90),
  });
  writeFileSync(resolve(outDir, `${String(++seq).padStart(2, "0")}-${label.replace(/[^a-z0-9]+/gi, "_")}.json`), JSON.stringify({ tool: name, args, envelope: env }, null, 2));
  return env;
}

const sample = (env, n = 5) =>
  (env.results ?? []).slice(0, n).map((r) => r.name ?? r.title ?? r.tag ?? r.id ?? JSON.stringify(r).slice(0, 60));

const cap = await client.callTool({ name: "qloo_capabilities", arguments: {} });
console.log("capabilities:", JSON.stringify(cap.structuredContent?.adapter ?? cap.structuredContent).slice(0, 300));

for (const h of HEADLINERS) {
  const d = await call(`describe ${h.name}`, "qloo_describe", { entity: h.name, type: h.type });
  console.log(`\n== ${h.name} -> ${d.status}: ${sample(d, 3).join(" | ")}`);
  const t = await call(`entity_tags ${h.name}`, "qloo_entity_tags", { entities: [h.name], entity_type: h.type, limit: 15 });
  console.log(`   tags: ${sample(t, 8).join(", ")}`);
  const a = await call(`audience_demographics ${h.name}`, "qloo_audience_demographics", { entity: h.name, entity_type: h.type });
  console.log(`   demographics: ${JSON.stringify(a.results?.[0] ?? a.summary).slice(0, 200)}`);
}

const star = HEADLINERS[0].name;
const p1 = await call("recommend place near MSG", "qloo_recommend", { target_type: "place", signals: [star], filter_location: NEAR_MSG, limit: 15 });
console.log(`\nplaces near MSG for ${star} fans: ${sample(p1, 8).join(" | ")}`);
const p2 = await call("recommend place near LES", "qloo_recommend", { target_type: "place", signals: [star], filter_location: NEAR_LES, limit: 15 });
console.log(`places near LES for ${star} fans: ${sample(p2, 8).join(" | ")}`);
const b = await call("recommend brand", "qloo_recommend", { target_type: "brand", signals: [star], limit: 15 });
console.log(`brands for ${star} fans: ${sample(b, 10).join(" | ")}`);
const w = await call("where_popular NYC", "qloo_where_popular", { entity: star, entity_type: "artist", within: "New York City", limit: 10 });
console.log(`where popular: ${sample(w, 6).join(" | ")}`);

const ft = await call("find_tags craft beer", "qloo_find_tags", { query: "craft beer", limit: 5 });
console.log(`\nfind_tags craft beer: ${sample(ft, 5).join(" | ")}`);
const ft2 = await call("find_tags cocktail bar", "qloo_find_tags", { query: "cocktail bar", limit: 5 });
console.log(`find_tags cocktail bar: ${sample(ft2, 5).join(" | ")}`);
// Can rank order a merchant's offer concepts? Options must be entities, so try brands as a proxy.
const rk = await call("rank brands for crowd", "qloo_rank", { options: ["Shake Shack", "Sweetgreen", "Starbucks", "Brooklyn Brewery", "Chipotle"], option_type: "brand", signals: [star] });
console.log(`rank brands: ${sample(rk, 5).join(" | ")}`);
// Direct Insights call with a WKT point + radius: the workflow only exposes a free-text location query.
const starId = (() => {
  try { return JSON.parse(readFileSync(resolve(outDir, "01-describe_Harry_Styles.json"), "utf8")).envelope.results?.[0]?.entity_id
    ?? JSON.parse(readFileSync(resolve(outDir, "01-describe_Harry_Styles.json"), "utf8")).envelope.results?.[0]?.id; } catch { return undefined; }
})();
if (starId) {
  const q = new URLSearchParams({
    "filter.type": "urn:entity:place",
    "signal.interests.entities": starId,
    "filter.location": "POINT(-73.9934 40.7505)", // MSG
    "filter.location.radius": "1500",
    take: "15",
  });
  const t0 = Date.now();
  const res = await fetch(`${process.env.QLOO_BASE_URL}/v2/insights?${q}`, { headers: { "X-Api-Key": process.env.QLOO_API_KEY } });
  const body = await res.json().catch(() => ({}));
  const ents = body?.results?.entities ?? [];
  rows.push({ label: "raw insights place radius 1.5km MSG", tool: "GET /v2/insights", status: res.ok ? "ok" : `http ${res.status}`, count: ents.length, ms: Date.now() - t0, note: ents.slice(0, 3).map((e) => e.name).join(", ") });
  writeFileSync(resolve(outDir, `${String(++seq).padStart(2, "0")}-raw_insights_radius.json`), JSON.stringify({ query: Object.fromEntries(q), status: res.status, body }, null, 2));
  console.log(`raw radius places: ${ents.slice(0, 8).map((e) => e.name).join(" | ")}`);
} else {
  console.log("raw radius test skipped: no entity id from describe");
}
const cmp = await call("compare Styles vs Knicks", "qloo_compare_audiences", { group_a: [star], group_b: ["New York Knicks"], target_type: "brand", limit: 10 });
console.log(`compare audiences: ${cmp.status} ${sample(cmp, 6).join(" | ")}`);

await client.close();

console.log("\n=== SPIKE SUMMARY ===");
console.table(rows);
const resolved = rows.filter((r) => r.tool === "qloo_describe" && r.status === "ok").length;
const placesOk = Math.max(...rows.filter((r) => r.label.startsWith("recommend place")).map((r) => (r.status === "ok" ? r.count : 0)));
const go = resolved >= 2 && placesOk > 5;
console.log(`headliners resolved: ${resolved}/${HEADLINERS.length}; best place recommend count: ${placesOk}`);
console.log(go ? "GO: Qloo coverage is sufficient for the full plan." : "NO-GO on places: fall back to tag/brand affinities and simulated map layer.");
