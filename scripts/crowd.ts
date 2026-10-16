// CLI: build the crowd profile for an event near a merchant.
// Usage: npx tsx scripts/crowd.ts <merchantId> <event name fragment> [pickedEntityId]
import { loadEnv } from "@/server/env";
loadEnv();
const { getMerchant } = await import("@/server/events/radar");
const { getDb } = await import("@/server/db/client");
const { buildCrowdProfile, describeDemographics } = await import("@/server/qloo/crowd");

const [merchantId = "m_penn_pour", fragment = "Harry Styles", picked] = process.argv.slice(2);
const merchant = getMerchant(merchantId);
if (!merchant) throw new Error(`unknown merchant ${merchantId}`);
const event = getDb().prepare("SELECT * FROM events WHERE (name LIKE ? OR attractions_json LIKE ?) AND starts_at > datetime('now') ORDER BY starts_at LIMIT 1").get(`%${fragment}%`, `%${fragment}%`) as import("@/server/qloo/crowd").EventRow | undefined;
if (!event) throw new Error(`no upcoming event matching "${fragment}" in the events table (run the radar first)`);
console.log(`Event: ${event.name} @ ${event.venue_name} ${event.starts_at}`);

const t0 = Date.now();
const p = await buildCrowdProfile(merchant, event, picked);
console.log(`\nstatus: ${p.status}  headliner: ${p.headlinerName} (${p.headlinerType ?? "?"})  entity: ${p.entity?.name ?? "-"} ${p.entity?.subtype ?? ""}`);
if (p.status === "needs_input") console.log("candidates:", p.candidates.map((c) => `${c.name} [${c.type.replace("urn:entity:", "")}] ${c.id}`).join("\n            "));
const d = describeDemographics(p.demographics);
if (d) console.log(`demographics: ${d.ageTop.join(", ")} | low: ${d.ageLow.join(", ")} | ${d.gender}`);
console.log(`taste tags: ${p.tags.slice(0, 14).map((t) => t.name).join(", ")}`);
console.log(`bars nearby: ${p.places.slice(0, 8).map((e) => `${e.name} ${(e.query?.affinity ?? 0).toFixed(2)}`).join(" | ")}`);
console.log(`brands: ${p.brands.slice(0, 8).map((e) => e.name).join(" | ")}`);
console.log("\noffer fit:");
for (const f of p.offerFits) console.log(`  ${f.affinity.toFixed(2)}  ${f.title.padEnd(34)} ${f.matches} places  e.g. ${f.topPlaces.join(", ")}`);
console.log(`\nprovenance: ${p.provenance.length} steps, Qloo live ${p.qlooCalls.live} / cached ${p.qlooCalls.cached}, ${Date.now() - t0} ms`);
for (const r of p.provenance) console.log(`  ${String(r.seq).padStart(2)} ${r.kind.padEnd(8)} ${r.workflow.padEnd(22)} ${r.status.padEnd(11)} ${String(r.resultCount).padStart(3)} ${r.cacheHit ? "cache" : "live "} ${r.note ?? ""}`);
