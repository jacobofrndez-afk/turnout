import { loadEnv } from "@/server/env";
loadEnv();
const { seed } = await import("@/server/db/seed");
console.log("Seeding merchants, offers (tags resolved via Qloo) and demo contacts...");
await seed();
console.log("Done.");
