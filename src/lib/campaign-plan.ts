import { LocalPromotionSchema, type SavedLocalPromotion } from "./local-promotion";
import { z } from "zod";
import { CampaignVisualSchema, RevenueScenarioSchema, type CampaignVisual, type RevenueScenario } from "./campaign-creative";
import { localDateKey } from "./calendar";
import { dateFormatter } from "./date-formatter";
import { clockRange, hhmm } from "./clock";
import { CHANNEL_IDS, type PlaceDna } from "./place-dna";
export type PlanChannel = PlaceDna["channels"][number];
// DNA selects the defaults; a campaign can also use other unpaid destinations.
// A paid destination must still be explicitly enabled in the place's DNA.
export function campaignChannelOptions(preferred: PlanChannel[]): PlanChannel[] {
  return CHANNEL_IDS.filter(c => c !== "geofenced_ad" || preferred.includes(c));
}
export type PlanSlot = { id: string; label: string; startLocal: string; endLocal: string; reason: string; source: string };
export type CampaignPlanProposal = { slots: PlanSlot[]; offerId: string; messages: Record<string, string>; budgetUsd: number };
const localStamp = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d$/;
export const CampaignPlanSchema = z.object({
  requestId: z.string().uuid(), planId: z.string().regex(/^quick_[a-f0-9]{24}$/).optional(), revision: z.number().int().min(1).optional(), version: z.number().int().min(1),
  offerId: z.string().min(1).max(100), offerPrice: z.string().trim().min(1).max(40),
  message: z.string().trim().min(3).max(1200),
  startLocal: z.string().regex(localStamp), endLocal: z.string().regex(localStamp),
  channels: z.array(z.enum(CHANNEL_IDS)).min(1).max(CHANNEL_IDS.length).refine(v => new Set(v).size === v.length, "Choose each channel once."),
  mediaBudgetUsd: z.number().int().min(0).max(200),
  decision: z.enum(["approved", "saved"]),
  localPromotion: LocalPromotionSchema.optional(),
  visual: CampaignVisualSchema.optional(), revenueScenario: RevenueScenarioSchema.optional(),
});
export type CampaignPlanInput = z.infer<typeof CampaignPlanSchema>;
export type SavedCampaignPlan = {
  version: 1; revision: number; decision: "approved" | "saved"; startAt: string; endAt: string; timezone: string;
  channels: PlanChannel[]; mediaBudgetUsd: number; chargedUsd: 0; delivery: "manual";
  preparationMinutes: number; requestHash: string;
  localPromotion?: SavedLocalPromotion;
  visual?: CampaignVisual; revenueScenario?: RevenueScenario;
};
export function localStampAt(at: number | Date, timezone: string) {
  return `${localDateKey(at, timezone)}T${hhmm(at, timezone)}`;
}
/** Reject clock gaps and duplicated local times instead of silently shifting an owner's choice. */
export function localTimeToInstant(local: string, timezone: string): number {
  if (!localStamp.test(local)) throw new Error("Choose a valid date and time.");
  const wall = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(wall) || new Date(wall).toISOString().slice(0,16) !== local) throw new Error("Choose a valid calendar date.");
  const offsets = new Set<number>();
  for (const delta of [-36, 0, 36]) {
    const sample = wall + delta * 3600000;
    const stamp = localStampAt(sample, timezone);
    offsets.add(Date.parse(`${stamp}:00Z`) - sample);
  }
  const matches = [...offsets].map(offset => wall - offset).filter(at => localStampAt(at, timezone) === local);
  if (!matches.length) throw new Error("This local time does not exist because the clocks change. Choose another time.");
  if (matches.length > 1) throw new Error("This local time occurs twice when the clocks change. Choose a time outside that hour.");
  return matches[0];
}
export function validatePlanTiming(startLocal: string, endLocal: string, timezone: string, preparationMinutes: number, now = Date.now()) {
  const start = localTimeToInstant(startLocal, timezone), end = localTimeToInstant(endLocal, timezone);
  if (start < now + preparationMinutes * 60000) throw new Error(`Leave at least ${preparationMinutes} minutes to prepare. Choose a later start.`);
  if (end - start < 30 * 60000 || end - start > 12 * 3600000) throw new Error("Choose a campaign window between 30 minutes and 12 hours.");
  if (start > now + 30 * 86400000) throw new Error("Choose a start within the next 30 days.");
  return { start, end };
}
export function planCost(channels: PlanChannel[], budgetUsd: number) {
  const mediaBudgetUsd = channels.includes("geofenced_ad") ? budgetUsd : 0;
  return { mediaBudgetUsd, chargedUsd: 0 as const, label: mediaBudgetUsd ? `US$${mediaBudgetUsd} max` : "US$0", description: mediaBudgetUsd ? "Planned ad budget for this campaign. Set this limit when you create the ad." : "Organic posts and your existing audience only. No paid local targeting or guaranteed reach. Publish manually." };
}
export function planWindowLabel(startAt: string | number, endAt: string | number, timezone: string) {
  const start = new Date(startAt), end = new Date(endAt);
  const day = dateFormatter("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: timezone });
  return localDateKey(start, timezone) === localDateKey(end, timezone)
    ? `${day.format(start)} · ${clockRange(start, end, timezone)}`
    : `${day.format(start)} ${hhmm(start, timezone)} – ${day.format(end)} ${hhmm(end, timezone)}`;
}

/** A planned window is still worth opening while at least 30 minutes remain after the preparation lead. */
export function windowStillOpen(review: { endLocal: string }, timezone: string, leadMinutes: number, now = Date.now()) {
  return localTimeToInstant(review.endLocal, timezone) - (now + leadMinutes * 60000) >= 30 * 60000;
}
