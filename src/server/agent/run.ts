// Campaign agent runner. Two providers:
// - "anthropic": Claude via the Anthropic SDK with structured output (needs ANTHROPIC_API_KEY or an `ant auth login` profile).
// - "operator": no credentials; the prompt is written to data/agent-inbox/<campaign>.prompt.md and the draft is
//   expected back as data/agent-inbox/<campaign>.draft.json. Used for local tests from a Claude Code session.
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDb, newId } from "@/server/db/client";
import type { Merchant } from "@/server/events/radar";
import { buildCrowdProfile, getEvent, getOffers, hasSignal, type CrowdProfile, type EventRow } from "@/server/qloo/crowd";
import { CampaignDraftSchema, type CampaignDraft } from "./schema";
import { SYSTEM_PROMPT, buildUserPrompt, windowsIso, type WindowWeather } from "./prompt";
import { weatherWindow } from "@/server/weather/openmeteo";

export type CampaignStatus = "needs_input" | "awaiting_operator" | "drafted" | "approved" | "sent" | "failed";
export type CampaignRow = {
  id: string;
  merchant_id: string;
  event_id: string;
  crowd_profile_id: string | null;
  status: CampaignStatus;
  offer_id: string | null;
  copy_json: string | null;
  rationale: string | null;
  limitations: string | null;
  llm_usage_json: string | null;
  created_at: string;
};

export const INBOX = () => resolve(process.cwd(), process.env.AGENT_INBOX ?? "data/agent-inbox");

export function provider(): "anthropic" | "operator" {
  if (process.env.AGENT_PROVIDER === "operator") return "operator";
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.AGENT_PROVIDER === "anthropic") return "anthropic";
  return "operator";
}

export async function createCampaign(merchant: Merchant, event: EventRow, pickedEntityId?: string): Promise<CampaignRow> {
  const profile = await buildCrowdProfile(merchant, event, pickedEntityId);
  const db = getDb();
  const id = newId("camp");
  const status: CampaignStatus = hasSignal(profile) ? "awaiting_operator" : "needs_input";
  db.prepare(`INSERT INTO campaigns (id, merchant_id, event_id, crowd_profile_id, status) VALUES (?, ?, ?, ?, ?)`).run(id, merchant.id, event.id, profile.id, status);
  if (!hasSignal(profile)) return getCampaign(id)!;
  const offers = getOffers(merchant.id);
  const weather = await forecastWindows(id, profile.id, merchant, event);
  const user = buildUserPrompt(merchant, event, profile, offers, weather);
  if (provider() === "anthropic") {
    try {
      const { draft, usage } = await draftWithClaude(user);
      storeDraft(id, draft, usage, profile, "anthropic");
    } catch (e) {
      db.prepare(`UPDATE campaigns SET status = 'failed', rationale = ?, updated_at = datetime('now') WHERE id = ?`).run(String((e as Error).message).slice(0, 500), id);
    }
  } else {
    writePromptForOperator(id, user);
  }
  return getCampaign(id)!;
}

// Weather for each window, recorded in provenance so the campaign page and the judge can see what the agent saw.
async function forecastWindows(campaignId: string, profileId: string, merchant: Merchant, event: EventRow): Promise<WindowWeather[]> {
  const out: WindowWeather[] = [];
  const db = getDb();
  const seq0 = (db.prepare("SELECT COALESCE(MAX(seq), 0) AS m FROM provenance WHERE crowd_profile_id = ?").get(profileId) as { m: number }).m;
  let seq = seq0;
  for (const w of windowsIso(event)) {
    try {
      const s = await weatherWindow(merchant.lat, merchant.lon, w.startIso, w.endIso, merchant.timezone);
      if (!s) continue;
      out.push({ label: w.label, summary: s.label });
      db.prepare(`INSERT INTO provenance (campaign_id, crowd_profile_id, seq, kind, workflow, input_json, envelope_status, result_count, cache_hit, duration_ms, note) VALUES (?, ?, ?, 'weather', 'open_meteo_forecast', ?, ?, 1, 0, 0, ?)`).run(
        campaignId,
        profileId,
        ++seq,
        JSON.stringify({ window: w.label, start: w.startIso, end: w.endIso }),
        s.kind,
        `${w.label}: ${s.label}`,
      );
    } catch {
      // Weather is a bonus signal: never block a campaign on it.
    }
  }
  return out;
}

async function draftWithClaude(user: string): Promise<{ draft: CampaignDraft; usage: unknown }> {
  const client = new Anthropic();
  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    output_config: { effort: "medium", format: zodOutputFormat(CampaignDraftSchema) },
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") throw new Error(`Claude declined: ${response.stop_details?.explanation ?? "refusal"}`);
  if (!response.parsed_output) throw new Error("Claude returned no parseable draft");
  return { draft: response.parsed_output, usage: response.usage };
}

function writePromptForOperator(id: string, user: string): void {
  mkdirSync(INBOX(), { recursive: true });
  const file = resolve(INBOX(), `${id}.prompt.md`);
  writeFileSync(file, `<!-- Write the draft as JSON matching CampaignDraftSchema to ${id}.draft.json next to this file. -->\n\n# System\n\n${SYSTEM_PROMPT}\n\n# User\n\n${user}\n`);
}

// Operator provider: pick up a draft file if it has appeared.
export function pollOperatorDraft(campaign: CampaignRow): CampaignRow {
  if (campaign.status !== "awaiting_operator") return campaign;
  const file = resolve(INBOX(), `${campaign.id}.draft.json`);
  if (!existsSync(file)) return campaign;
  const parsed = CampaignDraftSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
  if (!parsed.success) {
    getDb().prepare(`UPDATE campaigns SET status = 'failed', rationale = ?, updated_at = datetime('now') WHERE id = ?`).run(`Operator draft invalid: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`.slice(0, 500), campaign.id);
    return getCampaign(campaign.id)!;
  }
  storeDraft(campaign.id, parsed.data, { provider: "operator" }, undefined, "operator");
  return getCampaign(campaign.id)!;
}

function storeDraft(id: string, draft: CampaignDraft, usage: unknown, profile: CrowdProfile | undefined, source: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE campaigns SET status = 'drafted', offer_id = ?, copy_json = ?, window_json = ?, channels_json = ?, rationale = ?, limitations = ?, llm_usage_json = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(draft.chosen_offer_id, JSON.stringify(draft), JSON.stringify(draft.windows), JSON.stringify(["geofenced_ad", "google_post", "whatsapp", "storefront", "dooh"]), draft.rationale, draft.limitations, JSON.stringify({ source, usage }), id);
  const seq = (db.prepare("SELECT COALESCE(MAX(seq), 0) AS m FROM provenance WHERE campaign_id = ? OR crowd_profile_id = ?").get(id, profile?.id ?? "") as { m: number }).m;
  db.prepare(`INSERT INTO provenance (campaign_id, crowd_profile_id, seq, kind, workflow, input_json, envelope_status, result_count, cache_hit, duration_ms, note) VALUES (?, ?, ?, 'llm', 'draft_campaign', ?, 'ok', 1, 0, 0, ?)`).run(
    id,
    profile?.id ?? null,
    seq + 1,
    JSON.stringify({ provider: source, model: source === "anthropic" ? "claude-opus-5-5" : "operator session" }),
    `chose ${draft.chosen_offer_id}, confidence ${draft.confidence}`,
  );
}

export function getCampaign(id: string): CampaignRow | undefined {
  return getDb().prepare("SELECT * FROM campaigns WHERE id = ?").get(id) as CampaignRow | undefined;
}

export function getDraft(c: CampaignRow): CampaignDraft | undefined {
  if (!c.copy_json) return undefined;
  const parsed = CampaignDraftSchema.safeParse(JSON.parse(c.copy_json));
  return parsed.success ? parsed.data : undefined;
}

export type ProvenanceDbRow = { seq: number; kind: string; workflow: string; input_json: string; envelope_status: string; result_count: number; cache_hit: number; duration_ms: number; note: string | null };
export function getProvenance(c: CampaignRow): ProvenanceDbRow[] {
  return getDb().prepare("SELECT * FROM provenance WHERE campaign_id = ? OR crowd_profile_id = ? ORDER BY seq").all(c.id, c.crowd_profile_id ?? "") as ProvenanceDbRow[];
}

export function approveCampaign(id: string): void {
  getDb().prepare(`UPDATE campaigns SET status = 'approved', updated_at = datetime('now') WHERE id = ? AND status = 'drafted'`).run(id);
}

export { getEvent };
