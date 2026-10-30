// Publishing pipeline. Approve a campaign -> one send per channel the merchant has.
// Each channel has an adapter; adapters without credentials record a simulated send with the exact payload
// they would have pushed, so the demo shows the real shape of every channel and the UI is honest about it.
import { deliverySummary } from "@/lib/delivery";
import { getDb, newId } from "@/server/db/client";
import type { Merchant } from "@/server/events/radar";
import type { CampaignDraft } from "@/server/agent/schema";
import type { SavedAgentReview } from '@/lib/agent-workspace';
import { googlePromotionNote } from '@/lib/channel-recommendation';
import { channelCap, channelCreative, campaignSpend } from '@/lib/channel-kit';
import { submitWhatsApp, whatsappConfigured, whatsappStatus } from "./twilio";
import { buildSnapPayloads, createGeofencedCampaign, snapConfigured, type GeofencedAdSpec } from "./snapchat";

export type ChannelId = "instagram" | "facebook" | "tiktok" | "snapchat" | "geofenced_ad" | "google_post" | "whatsapp" | "storefront" | "dooh";
export type SendRow = { id: string; campaign_id: string; channel: ChannelId; recipient_ref: string | null; status: string; provider_sid: string | null; simulated: number; sent_at: string; payload_json?: string | null };

export const CHANNEL_LABEL: Record<ChannelId, string> = {
  instagram: "Instagram post",
  facebook: "Facebook Page post",
  tiktok: "TikTok photo or video",
  snapchat: "Snapchat Story",
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

export async function publishCampaign(campaignId: string, merchant: Merchant, draft: CampaignDraft, options:{sendDemo?:boolean;createPausedAd?:boolean} = {}): Promise<SendRow[]> {
  ensureSendColumns();
  const db = getDb();
  const saved = db.prepare("SELECT channels_json, dna_snapshot_json, review_json FROM campaigns WHERE id=? AND merchant_id=?").get(campaignId, merchant.id) as { channels_json: string; dna_snapshot_json: string | null; review_json:string|null } | undefined;
  const review=saved?.review_json?JSON.parse(saved.review_json) as SavedAgentReview:undefined;
  const channels = saved?.dna_snapshot_json ? JSON.parse(saved.channels_json) as ChannelId[] : (JSON.parse((db.prepare("SELECT channels_json FROM merchants WHERE id = ?").get(merchant.id) as { channels_json: string }).channels_json) as ChannelId[]) ?? [];
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
        if (options.sendDemo === true && whatsappConfigured() && process.env.DEMO_WHATSAPP_TO) {
          // Real send goes to the demo number only (the judge's phone after joining the sandbox). Fictional contacts are never messaged.
          try {
            const result = await submitWhatsApp(process.env.DEMO_WHATSAPP_TO, draft.whatsapp.message);
            record("whatsapp", result.status, false, { to: "demo number", message: draft.whatsapp.message, list_size: contacts.length }, "demo", result.sid);
          } catch (e) {
            record("whatsapp", "failed: provider rejected the demo message", false, { message: draft.whatsapp.message });
          }
        } else {
          record("whatsapp", "simulated", true, { to: `${contacts.length} fictional demo contacts`, message: draft.whatsapp.message, window: draft.windows[0], planned_cap_usd:review?channelCap(review,'whatsapp'):0, pricing:'Provider quote required before any sending.' });
        }
        break;
      }
      case "geofenced_ad": {
        const spec: GeofencedAdSpec = {
          name: `Turnout · ${merchant.name} · ${draft.geofenced_ad.headline}`,
          lat: merchant.lat,
          lon: merchant.lon,
          radiusM: draft.geofenced_ad.radius_m,
          countryCode: merchant.timezone.startsWith("Europe/Paris") ? "fr" : "us",
          startIso: new Date().toISOString().replace(/\.\d{3}Z/, "Z"),
          endIso: new Date(Date.now() + 36 * 3600_000).toISOString().replace(/\.\d{3}Z/, "Z"),
          dailyBudgetUsd: review?channelCap(review,'geofenced_ad'):draft.geofenced_ad.daily_budget_usd,
        };
        const payloads = buildSnapPayloads(spec);
        const creative = { headline: draft.geofenced_ad.headline, body: draft.geofenced_ad.body, cta: draft.geofenced_ad.cta, interests_from_qloo: draft.geofenced_ad.interests, schedule: draft.windows };
        if (!review?.channelCaps && options.createPausedAd !== false && draft.geofenced_ad.platform === "snapchat" && snapConfigured()) {
          try {
            const ids = await createGeofencedCampaign(spec);
            record("geofenced_ad", "created (paused)", false, { platform: "snapchat", ...ids, creative, request: payloads, status_note: "Created in your Snapchat ad account, paused. Attach the creative in Ads Manager and start it." }, undefined, ids.campaignId);
          } catch (e) {
            record("geofenced_ad", `failed: ${String((e as Error).message).slice(0, 120)}`, false, { platform: "snapchat", creative, request: payloads });
          }
        } else {
          record("geofenced_ad", "simulated", true, {
            platform: draft.geofenced_ad.platform,
            geofence: { lat: merchant.lat, lon: merchant.lon, radius_m: draft.geofenced_ad.radius_m, note: "centred on the merchant in the demo; the venue in production" },
            creative,
            planned_total_cap_usd: review?channelCap(review,'geofenced_ad'):draft.geofenced_ad.daily_budget_usd,
            request: payloads,
            status_note: "Saved here. No ad was created or scheduled.",
          });
        }
        break;
      }
      case "instagram":
      case "facebook":
      case "tiktok":
      case "snapchat": {
        const creative=review?channelCreative(channel,review,merchant.name):draft.social?.[channel];
        record(channel, "ready", true, { message: creative?.caption??`${draft.google_post.title}\n${draft.google_post.body}\n${draft.google_post.offer_terms}`, overlay:creative?.overlay,shots:creative?.shots,visual:review?.visual,planned_ad_cap_usd:review?channelCap(review,channel):0,total_campaign_cap_usd:review?campaignSpend(review).ceiling:0,status_note: "Content draft only. No video rendered, social post published or paid placement created." });
        break;
      }
      case "google_post": {
        const neutral=!!review&&!!googlePromotionNote(`${review.title} ${review.message} ${review.terms}`);
        record("google_post", "simulated", true, { type: neutral?"STANDARD":"OFFER", title: neutral?merchant.name:draft.google_post.title, body: review?channelCreative('google_post',review,merchant.name).caption:draft.google_post.body, terms: neutral?undefined:draft.google_post.offer_terms, schedule: draft.windows,visual:review?.visual,planned_ad_cap_usd:review?channelCap(review,'google_post'):0, status_note: "Business post saved for manual use. Any Google Ads budget is a separate unlaunched placement." });
        break;
      }
      case "storefront":
        record("storefront", "ready", true, { chalkboard: draft.storefront.chalkboard, staff_line: draft.storefront.staff_line, status_note: "Yours to chalk on the board and say at the door." });
        break;
      case "dooh":
        record("dooh", "simulated", true, { headline: draft.dooh.headline, body: draft.dooh.body, screens: "nearest programmatic screens to the venue", schedule: draft.windows });
        break;
    }
  }
  db.prepare(`UPDATE campaigns SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(deliverySummary(rows).status, campaignId);
  return rows;
}

export function getSends(campaignId: string): SendRow[] {
  ensureSendColumns();
  return getDb().prepare("SELECT * FROM sends WHERE campaign_id = ? ORDER BY sent_at").all(campaignId) as SendRow[];
}

export async function refreshDeliveryReceipts(campaignId:string):Promise<void>{
 if(!whatsappConfigured())return;
 const pending=getSends(campaignId).filter(s=>s.channel==='whatsapp'&&!s.simulated&&s.provider_sid&&['accepted','queued','sending','sent'].includes(s.status));
 for(const receipt of pending){
  try{const status=await whatsappStatus(receipt.provider_sid!);getDb().prepare('UPDATE sends SET status=? WHERE id=?').run(status,receipt.id);}
  catch{/* An unavailable status check is not evidence of failed delivery. */}
 }
 if(pending.length)getDb().prepare("UPDATE campaigns SET status=?,updated_at=datetime('now') WHERE id=?").run(deliverySummary(getSends(campaignId)).status,campaignId);
}

export function deliveryPlan(channels: string[], draft: CampaignDraft) {
  const whatsapp = false; // The demo prepares WhatsApp copy without sending it.
  const snap = false; // Approval saves materials only.
  return {
    label: whatsapp ? "Send demo & save" : snap ? "Create paused ad & save" : "Save campaign",
    description: [whatsapp ? "Sends one WhatsApp message to the configured demo number, never to your customer list." : "No WhatsApp message will be sent.", snap ? "Creates a paused Snapchat ad. No ad spend starts here." : "No ad will be launched.", "Your texts stay available to copy and use."].join(" "),
  };
}
