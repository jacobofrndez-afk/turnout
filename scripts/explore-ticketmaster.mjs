// Ticketmaster Discovery API check: events within a radius of a point over the next days.
// Usage: node scripts/explore-ticketmaster.mjs [lat,lon] [radiusKm] [days]
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
const KEY = process.env.TICKETMASTER_API_KEY;
if (!KEY) {
  console.error("TICKETMASTER_API_KEY missing in .env.local");
  process.exit(2);
}
const latlong = process.argv[2] ?? "40.7505,-73.9934"; // Madison Square Garden
const radius = process.argv[3] ?? "2";
const days = Number(process.argv[4] ?? 3);
const iso = (d) => d.toISOString().replace(/\.\d{3}Z/, "Z");
const q = new URLSearchParams({
  apikey: KEY,
  latlong,
  radius,
  unit: "km",
  startDateTime: iso(new Date()),
  endDateTime: iso(new Date(Date.now() + days * 86400e3)),
  size: "50",
  sort: "date,asc",
});
const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${q}`);
console.log("HTTP", res.status, "| rate limit", res.headers.get("rate-limit"), "| available", res.headers.get("rate-limit-available"));
const body = await res.json();
const outDir = resolve(root, "spike-results", "tm");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, `events-${latlong.replace(/[^0-9.-]/g, "_")}-${radius}km-${days}d.json`), JSON.stringify(body, null, 2));
const events = body._embedded?.events ?? [];
console.log(`events: ${events.length} (total ${body.page?.totalElements ?? "?"})\n`);
for (const e of events) {
  const v = e._embedded?.venues?.[0];
  const attractions = (e._embedded?.attractions ?? [])
    .map((a) => `${a.name} [${a.classifications?.[0]?.segment?.name ?? ""}/${a.classifications?.[0]?.genre?.name ?? ""}]`)
    .join(", ");
  console.log(`- ${e.dates?.start?.dateTime ?? e.dates?.start?.localDate} | ${e.name} | ${v?.name} (${v?.location?.latitude},${v?.location?.longitude}) | ${attractions} | ${e.dates?.status?.code}`);
}
if (events[0]) {
  const v = events[0]._embedded?.venues?.[0] ?? {};
  console.log("\nevent keys:", Object.keys(events[0]).join(", "));
  console.log("venue keys:", Object.keys(v).join(", "));
  console.log("venue upcomingEvents:", JSON.stringify(v.upcomingEvents));
}
