// CLI view of the radar for one merchant. Usage: npx tsx scripts/radar.ts [merchantId] [hoursAhead]
import { loadEnv } from "@/server/env";
loadEnv();
const { getMerchant, listMerchants, radarFor } = await import("@/server/events/radar");

const id = process.argv[2] ?? "m_penn_pour";
const hours = Number(process.argv[3] ?? 72);
const merchant = getMerchant(id);
if (!merchant) {
  console.error(`Unknown merchant ${id}. Known: ${listMerchants().map((m) => m.id).join(", ")}. Run npm run seed first.`);
  process.exit(1);
}
const items = await radarFor(merchant, hours);
console.log(`${merchant.name} (${merchant.city}): ${items.length} events in the next ${hours} h\n`);
for (const it of items.slice(0, 25)) {
  const flag = it.interesting ? "**" : "  ";
  console.log(
    `${flag} ${String(it.score).padStart(3)}  ${it.event.startsAt.slice(0, 16)}  ${it.event.venue.name.slice(0, 32).padEnd(32)}  ${it.headliner.name.slice(0, 34).padEnd(34)}  ${it.capacity.toString().padStart(6)} ppl  ${it.distanceKm.toFixed(1)} km  ${it.event.segment ?? ""}/${it.event.genre ?? ""}`,
  );
}
