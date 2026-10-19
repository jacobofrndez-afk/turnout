// Publishing pipeline. Approve a campaign -> one send per channel the merchant has.
// Each channel has an adapter; adapters without credentials record a simulated send with the exact payload
// they would have pushed, so the demo shows the real shape of every channel and the UI is honest about it.
import { getDb, newId } from "@/server/db/client";
import type { Merchant } from "@/server/events/radar";
import type { CampaignDraft } from "@/server/agent/schema";
import { sendWhatsApp, whatsappConfigured } from "./twilio";

export type ChannelId = "geofenced_ad" | "google_post" | "whatsapp" | "storefront" | "dooh";
export type SendRow = { id: string; campaign_id: string; channel: ChannelId; recipient_ref: string | null; status: string; provider_sid: string | null; simulated: number; sent_at: string; payload_json?: string | null };

export const CHANNEL_LABEL: Record<ChannelId, string> = {
  geofenced_ad: "Geofenced ad",
  google_post: "Google Business post",
  whatsapp: "WhatsApp to regulars",
  storefront: "Storefront",
  dooh: "Digital screen",
};

export function ensureSendColumns(): void {
  const db = getDb();
  const cols = db.prepare("PRAGMA table_info(sends)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "payload_json")) db.exec("ALTER TABLE sends ADD COLUMN payload_json TEXT");
}

export async function publishCampaign(campaignId: string, merchant: Merchant, draft: CampaignDraft): Promise<SendRow[]> {
  ensureSendColumns();
  const db = getDb();
  const channels = (JSON.parse((db.prepare("SELECT channels_json FROM merchants WHERE id = ?").get(merchant.id) as { channels_json: string }).channels_json) as ChannelId[]) ?? [];
  const insert = db.prepare(`INSERT INTO sends (id, campaign_id, channel, recipient_ref, status, provider_sid, simulated, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const rows: SendRow[] = [];
  const record = (channel: ChannelId, status: string, simulated: boolean, payload: unknown, recipient?: string, sid?: string) => {
    const id = newId("send");
    insert.run(id, campaignId, channel, recipient ?? null, status, sid ?? null, simulated ? 1 : 0, JSON.stringify(payload));
    rows.push({ id, campaign_id: campaignId, channel, recipient_ref: recipient ?? null, status, provider_sid: sid ?? null, simulated: simulated ? 1 : 0, sent_at: new Date().toISOString(), payload_json: JSON.stringify(payload) });
  };

  for (const channel of channels) {
    switch (channel) {
      case "whatsapp": {
        const contacts = db.prepare("SELECT id, label, address FROM contacts WHERE merchant_id = ? AND channel = 'whatsapp'").all(merchant.id) as { id: string; label: string; address: string }[];
        if (whatsappConfigured() && process.env.DEMO_WHATSAPP_TO) {
          // Real send goes to the demo number only (the judge's phone after joining the sandbox). Fictional contacts are never messaged.
          try {
            const sid = await sendWhatsApp(process.env.DEMO_WHATSAPP_TO, draft.whatsapp.message);
            record("whatsapp", "sent", false, { to: "demo number", message: draft.whatsapp.message, list_size: contacts.length }, "demo", sid);
          } catch (e) {
            record("whatsapp", `failed: ${String((e as Error).message).slice(0, 120)}`, false, { message: draft.whatsapp.message });
          }
        } else {
          record("whatsapp", "simulated", true, { to: `${contacts.length} opted-in regulars (fictional list)`, message: draft.whatsapp.message, window: draft.windows[0] });
        }
        break;
      }
      case "geofenced_ad":
        record("geofenced_ad", "simulated", true, {
          platform: draft.geofenced_ad.platform,
          geofence: { lat: merchant.lat, lon: merchant.lon, radius_m: draft.geofenced_ad.radius_m, note: "centred on the venue in production; merchant point in the demo" },
          schedule: draft.windows,
          targeting: { interests: draft.geofenced_ad.interests },
          creative: { headline: draft.geofenced_ad.headline, body: draft.geofenced_ad.body, cta: draft.geofenced_ad.cta },
          daily_budget_usd: draft.geofenced_ad.daily_budget_usd,
          status_note: "campaign object ready for the Snapchat Marketing API / Meta Marketing API; not pushed without an ad account",
        });
        break;
      case "google_post":
        record("google_post", "simulated", true, { type: "OFFER", title: draft.google_post.title, body: draft.google_post.body, terms: draft.google_post.offer_terms, schedule: draft.windows, status_note: "Business Profile localPosts payload; needs a verified listing" });
        break;
      case "storefront":
        record("storefront", "ready", true, { chalkboard: draft.storefront.chalkboard, staff_line: draft.storefront.staff_line, status_note: "printed or chalked by the merchant" });
        break;
      case "dooh":
        record("dooh", "simulated", true, { headline: draft.dooh.headline, body: draft.dooh.body, screens: "nearest programmatic screens to the venue", schedule: draft.windows });
        break;
    }
  }
  db.prepare(`UPDATE campaigns SET status = 'sent', updated_at = datetime('now') WHERE id = ?`).run(campaignId);
  return rows;
}

export function getSends(campaignId: string): SendRow[] {
  ensureSendColumns();
  return getDb().prepare("SELECT * FROM sends WHERE campaign_id = ? ORDER BY sent_at").all(campaignId) as SendRow[];
}
