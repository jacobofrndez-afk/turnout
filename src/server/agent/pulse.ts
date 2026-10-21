// Weekly neighbourhood brief: the agent turns the street's taste into one offer to feature, a chalkboard line,
// a Google post and a WhatsApp note. Same provider logic as campaigns (Claude, or the operator inbox).
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { getDb, newId } from "@/server/db/client";
import type { Merchant } from "@/server/events/radar";
import { getOffers } from "@/server/qloo/crowd";
import { tagId } from "@/server/qloo/api";
import { buildNeighborhoodPulse, type NeighborhoodPulse } from "@/server/qloo/neighborhood";
import { INBOX, provider } from "./run";
import { eveningsThisWeek } from "@/server/weather/openmeteo";

export const PulseBriefSchema = z.object({
  language: z.enum(["en", "fr"]),
  street_in_one_line: z.string().max(160).describe("Who walks past this door on a normal week, in one sentence, citing Qloo tags"),
  featured_offer_id: z.string(),
  rationale: z.string().describe("Why this offer for the everyday flow. Cite Qloo audience tags, ambience tags, brands and nearby places."),
  chalkboard: z.string().max(90).describe("Two lines max for the board outside, for a normal weekday"),
  google_post: z.object({ title: z.string().max(58), body: z.string().max(300) }),
  whatsapp: z.string().max(280).describe("A short weekly note to regulars; warm, one offer, no exclamation marks"),
  always_on_ad: z.object({ radius_m: z.number().int().min(200).max(1500), interests: z.array(z.string()).min(2).max(6), headline: z.string().max(40), body: z.string().max(125), daily_budget_usd: z.number().min(5).max(40) }),
  limitations: z.string(),
});
export type PulseBrief = z.infer<typeof PulseBriefSchema>;

const SYSTEM = `You are Turnout's neighbourhood agent for an independent merchant. No event tonight: this is about the everyday flow of people who walk past the door.

You receive Qloo's taste profile of the street (signal = the merchant's GPS point): audience tags (who is here), ambience tags (what they like in a place), brands and media they over-index on, nearby bars and restaurants they already like, and the merchant's offers with a fit score.

You also get the evening weather forecast for the coming week (Open-Meteo): use it to say which evenings to push which line (wet or cold evenings favour shelter and warm food, warm dry evenings favour terraces and cold drinks), never invent weather.

Pick the one offer to feature this week, write the board line, the Google post, the note to regulars and a small always-on geofenced ad. Cite Qloo evidence by name. Qloo describes aggregate affinities of an area, never individuals, and never predicts a visit: say so in limitations. Use the city's language (English for US cities, French for France). No exclamation marks, no emojis, no hashtags.`;

export type PulseRow = { id: string; merchant_id: string; status: "awaiting_operator" | "drafted" | "failed"; brief_json: string | null; error: string | null; created_at: string };

export function ensurePulseTable(): void {
  getDb().exec(`CREATE TABLE IF NOT EXISTS pulses (id TEXT PRIMARY KEY, merchant_id TEXT NOT NULL, status TEXT NOT NULL, brief_json TEXT, error TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`);
}

export function latestPulse(merchantId: string): PulseRow | undefined {
  ensurePulseTable();
  const row = getDb().prepare("SELECT * FROM pulses WHERE merchant_id = ? ORDER BY created_at DESC LIMIT 1").get(merchantId) as PulseRow | undefined;
  return row ? pollOperator(row) : undefined;
}

export async function createPulseBrief(merchant: Merchant, pulse?: NeighborhoodPulse): Promise<PulseRow> {
  ensurePulseTable();
  const p = pulse ?? (await buildNeighborhoodPulse(merchant));
  const id = newId("pulse");
  const db = getDb();
  db.prepare("INSERT INTO pulses (id, merchant_id, status) VALUES (?, ?, 'awaiting_operator')").run(id, merchant.id);
  let evenings: { day: string; label: string }[] = [];
  try {
    evenings = (await eveningsThisWeek(merchant.lat, merchant.lon, merchant.timezone)).map((e) => ({ day: e.day, label: e.summary.label }));
  } catch {
    evenings = [];
  }
  const user = buildPrompt(merchant, p, evenings);
  if (provider() === "anthropic") {
    try {
      const client = new Anthropic();
      const res = await client.messages.parse({
        model: "claude-opus-5-5",
        max_tokens: 8000,
        output_config: { effort: "medium", format: zodOutputFormat(PulseBriefSchema) },
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: user }],
      });
      if (res.stop_reason === "refusal" || !res.parsed_output) throw new Error("no brief returned");
      db.prepare("UPDATE pulses SET status = 'drafted', brief_json = ? WHERE id = ?").run(JSON.stringify(res.parsed_output), id);
    } catch (e) {
      db.prepare("UPDATE pulses SET status = 'failed', error = ? WHERE id = ?").run(String((e as Error).message).slice(0, 400), id);
    }
  } else {
    mkdirSync(INBOX(), { recursive: true });
    writeFileSync(resolve(INBOX(), `${id}.prompt.md`), `<!-- Write the brief as JSON matching PulseBriefSchema to ${id}.draft.json next to this file. -->\n\n# System\n\n${SYSTEM}\n\n# User\n\n${user}\n`);
  }
  return db.prepare("SELECT * FROM pulses WHERE id = ?").get(id) as PulseRow;
}

function pollOperator(row: PulseRow): PulseRow {
  if (row.status !== "awaiting_operator") return row;
  const file = resolve(INBOX(), `${row.id}.draft.json`);
  if (!existsSync(file)) return row;
  const parsed = PulseBriefSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  const db = getDb();
  if (parsed.success) db.prepare("UPDATE pulses SET status = 'drafted', brief_json = ? WHERE id = ?").run(JSON.stringify(parsed.data), row.id);
  else db.prepare("UPDATE pulses SET status = 'failed', error = ? WHERE id = ?").run(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ").slice(0, 400), row.id);
  return db.prepare("SELECT * FROM pulses WHERE id = ?").get(row.id) as PulseRow;
}

export function getBrief(row: PulseRow | undefined): PulseBrief | undefined {
  if (!row?.brief_json) return undefined;
  const r = PulseBriefSchema.safeParse(JSON.parse(row.brief_json));
  return r.success ? r.data : undefined;
}

function buildPrompt(m: Merchant, p: NeighborhoodPulse, evenings: { day: string; label: string }[] = []): string {
  const offers = getOffers(m.id);
  const L: string[] = [];
  L.push(`# Merchant`, `${m.name}, a ${m.kind} at ${m.address ?? m.city}. City: ${m.city}. Timezone: ${m.timezone}. Voice: ${m.voice ?? "friendly and direct"}.`, "");
  L.push(`# Qloo: the street outside (${p.localityName ?? m.city})`);
  L.push(`Audience tags: ${p.audienceTags.map((t) => `${t.name} [${tagId(t).split(":").slice(2, 4).join(":")}]`).join(", ") || "none"}.`);
  L.push(`Ambience and offering tags: ${p.ambienceTags.map((t) => t.name).join(", ") || "none"}.`);
  L.push(`Brands and media the street over-indexes on: ${p.brands.map((b) => b.name).join(", ") || "none"}.`);
  L.push(`Bars and restaurants nearby this street already likes: ${p.places.map((x) => `${x.name} ${(x.query?.affinity ?? 0).toFixed(2)}`).join("; ") || "none"}.`, "");
  L.push(`# Offers and street fit`);
  for (const o of offers) {
    const f = p.offerFits.find((x) => x.offerId === o.id);
    L.push(`- id=${o.id} | ${o.title} | ${o.description} | ${o.price} | tags: ${JSON.parse(o.tag_names_json).join(", ")} | fit ${f ? f.affinity.toFixed(2) : "n/a"}${f?.topPlaces.length ? ` (e.g. ${f.topPlaces.join(", ")})` : ""}`);
  }
  if (p.rhythm?.moments.length) {
    L.push("", `# The rhythm of the street (from the ${p.rhythm.placesRead} places Qloo knows around the door, ${p.rhythm.hospitality} of them bars and restaurants)`);
    const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (const r of p.rhythm.moments) L.push(`- ${r.label} (${r.strength}): ${r.days.map((d) => DAY[d]).join(", ")} ${r.from} to ${r.to}. Evidence: ${r.evidence.join("; ")}.`);
    if (p.rhythm.passersBy.length) L.push(`Who the place descriptions say walks past: ${p.rhythm.passersBy.map((w) => `${w.label} (${w.places} places)`).join(", ")}.`);
    if (p.rhythm.eventHabits.length) L.push(`Event habits the street already has: ${p.rhythm.eventHabits.map((h) => `${h.place}: "${h.text}"`).join("; ")}.`);
    L.push(`Plan the week around these moments: the board line for the strongest weekday moment, the always-on ad on its hours, the regulars note for the weekend one.`);
  }
  L.push("", `# Evenings this week at the merchant (17:00 to 21:00 local, Open-Meteo)`);
  L.push(evenings.length ? evenings.map((e) => `${e.day}: ${e.label}`).join("; ") + "." : "Not available. Do not mention the weather.");
  L.push("", `# Task`, `Choose the offer to feature for the everyday flow this week and write the board, Google post, regulars note and always-on ad. Output must match the schema.`);
  return L.join("\n");
}
