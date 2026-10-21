// Push: the hourly scan. For every merchant, run the radar, take the strongest moment nobody has been told about,
// draft its campaign, and alert the merchant with a link to approve. The merchant never has to open the app to
// learn that a crowd is coming. Alerts go out on WhatsApp when Twilio is configured, else they are recorded as
// simulated and shown on the alerts page.
import { getDb, newId } from "@/server/db/client";
import { listMerchants, radarFor, type Merchant, type RadarItem } from "@/server/events/radar";
import { presenceWindow } from "@/server/events/concentration";
import { getEvent, getOffers } from "@/server/qloo/crowd";
import { sendWhatsApp, whatsappConfigured } from "@/server/channels/twilio";
import { createCampaign, getDraft, type CampaignRow } from "./run";

export type AlertRow = {
  id: string;
  merchant_id: string;
  event_id: string;
  campaign_id: string | null;
  status: "sent" | "simulated" | "failed";
  channel: "whatsapp";
  to_ref: string | null;
  message: string;
  created_at: string;
};

export function ensureAlertsTable(): void {
  getDb().exec(`CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    merchant_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    campaign_id TEXT,
    status TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    to_ref TEXT,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);
  // One alert per moment per merchant, whatever the number of scans running at once (dev runs two processes).
  getDb().exec("CREATE UNIQUE INDEX IF NOT EXISTS alerts_merchant_event ON alerts(merchant_id, event_id)");
}

export function listAlerts(merchantId: string, limit = 30): AlertRow[] {
  ensureAlertsTable();
  return getDb().prepare("SELECT * FROM alerts WHERE merchant_id = ? AND status <> 'pending' ORDER BY created_at DESC LIMIT ?").all(merchantId, limit) as AlertRow[];
}

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3211").replace(/\/$/, "");

type ScanOptions = { hoursAhead?: number; maxNew?: number; now?: Date };

// One merchant: returns the alerts created (at most `maxNew`, one by default so an hourly scan drafts at most one campaign).
export async function scanMerchant(merchant: Merchant, opts: ScanOptions = {}): Promise<AlertRow[]> {
  ensureAlertsTable();
  const now = opts.now ?? new Date();
  const hoursAhead = opts.hoursAhead ?? 48;
  const maxNew = opts.maxNew ?? 1;
  const db = getDb();
  const already = new Set((db.prepare("SELECT event_id FROM alerts WHERE merchant_id = ?").all(merchant.id) as { event_id: string }[]).map((r) => r.event_id));
  const items = await radarFor(merchant, hoursAhead);
  const candidates = items.filter((it) => {
    if (!it.interesting || already.has(it.event.id)) return false;
    const w = presenceWindow(it.event);
    return w.leave > now.getTime() && w.arrive <= now.getTime() + hoursAhead * 3_600_000;
  });
  const out: AlertRow[] = [];
  for (const it of candidates.slice(0, maxNew)) {
    const eventRow = getEvent(it.event.id);
    if (!eventRow) continue;
    // Claim the moment first: a second scan running at the same time finds it taken and does nothing.
    const id = newId("alert");
    const claimed = db.prepare("INSERT OR IGNORE INTO alerts (id, merchant_id, event_id, status, channel, message) VALUES (?, ?, ?, 'pending', 'whatsapp', '')").run(id, merchant.id, it.event.id);
    if (claimed.changes === 0) continue;
    let campaign: CampaignRow | undefined;
    try {
      campaign = await createCampaign(merchant, eventRow);
    } catch (e) {
      console.warn(`[scan] campaign for ${it.event.id} failed: ${String((e as Error).message).slice(0, 160)}`);
    }
    const message = composeAlert(merchant, it, campaign);
    let status: AlertRow["status"] = "simulated";
    let toRef: string | null = null;
    if (whatsappConfigured() && process.env.DEMO_WHATSAPP_TO) {
      try {
        await sendWhatsApp(process.env.DEMO_WHATSAPP_TO, message);
        status = "sent";
        toRef = "demo number";
      } catch (e) {
        status = "failed";
        toRef = String((e as Error).message).slice(0, 120);
      }
    }
    db.prepare("UPDATE alerts SET campaign_id = ?, status = ?, to_ref = ?, message = ?, created_at = datetime('now') WHERE id = ?").run(campaign?.id ?? null, status, toRef, message, id);
    out.push(db.prepare("SELECT * FROM alerts WHERE id = ?").get(id) as AlertRow);
  }
  return out;
}

// Every merchant, each in its own try so one failure never stops the others.
export async function scanAll(opts: ScanOptions = {}): Promise<{ merchant: string; alerts: number; error?: string }[]> {
  const results: { merchant: string; alerts: number; error?: string }[] = [];
  for (const m of listMerchants()) {
    try {
      const alerts = await scanMerchant(m, opts);
      results.push({ merchant: m.id, alerts: alerts.length });
    } catch (e) {
      results.push({ merchant: m.id, alerts: 0, error: String((e as Error).message).slice(0, 160) });
    }
  }
  return results;
}

// The alert the merchant reads on their phone: what is coming, how big it is for their room, what to do.
export function composeAlert(merchant: Merchant, it: RadarItem, campaign?: CampaignRow): string {
  const w = presenceWindow(it.event);
  const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: merchant.timezone });
  const fmtTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: merchant.timezone });
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: merchant.timezone }).format(new Date());
  const startKey = new Intl.DateTimeFormat("en-CA", { timeZone: merchant.timezone }).format(new Date(w.start));
  const day = startKey === todayKey ? "Today" : fmtDay.format(new Date(w.start));
  const origin = it.event.origin ?? "ticketmaster";
  const where = origin === "tv" || origin === "calendar" ? "around you" : `${it.distanceKm.toFixed(1)} km from you`;
  const seats = Math.max(10, merchant.seats ?? 60);
  const lines = [
    `Turnout for ${merchant.name}`,
    `${day} ${fmtTime.format(new Date(w.start))}: ${it.event.name}${origin === "ticketmaster" ? ` at ${it.event.venue.name}` : ""}, about ${it.capacity.toLocaleString("en-US")} people ${where}, from ${fmtTime.format(new Date(w.arrive))} to ${fmtTime.format(new Date(w.leave))}.`,
    `Could bring about ${it.potentialGuests} guests, ${Math.min(100, Math.round(it.fill * 100))}% of your ${seats} seats.`,
  ];
  if (campaign) {
    const draft = getDraft(campaign);
    const offer = draft ? getOffers(merchant.id).find((o) => o.id === draft.chosen_offer_id) : undefined;
    if (campaign.status === "drafted" && offer) lines.push(`Campaign ready: ${offer.title}. ${draft?.whatsapp?.message ? `Regulars would read: "${draft.whatsapp.message.slice(0, 120)}${draft.whatsapp.message.length > 120 ? "…" : ""}"` : ""}`.trim());
    else if (campaign.status === "needs_input") lines.push("Qloo knows several acts by that name: pick the right one and the campaign writes itself.");
    else if (campaign.status === "awaiting_operator") lines.push("The agent is writing the campaign now.");
    else if (campaign.status === "failed") lines.push("The agent could not write the campaign; open it to retry.");
    lines.push(`Review and approve: ${appUrl()}/campaigns/${campaign.id}`);
  } else {
    lines.push(`See it on your radar: ${appUrl()}/radar?merchant=${merchant.id}`);
  }
  return lines.join("\n");
}
