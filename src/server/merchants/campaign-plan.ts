import { assertOfferWindow } from "@/lib/offer-window";
import { createHash } from "node:crypto";
import { CampaignPlanSchema, campaignChannelOptions, validatePlanTiming, planCost, planWindowLabel, type SavedCampaignPlan } from "@/lib/campaign-plan";
import { canonical, getDb } from "@/server/db/client";
import { getMerchant } from "@/server/events/radar";
import { getOffers } from "@/server/qloo/crowd";
import { validateCampaignVisual } from "./campaign-visual";
import { readyDna, DnaError } from "./dna";
export function saveCampaignPlan(merchantId: string, raw: unknown, now = Date.now()) {
  const parsed = CampaignPlanSchema.safeParse(raw);
  if (!parsed.success) throw new DnaError("Check your message, time, channels and budget before saving.");
  const input = parsed.data;
  if (input.visual) validateCampaignVisual(input.visual);
  const db = getDb();
  const hash = (value: string) => createHash("sha256").update(value).digest("hex");
  const id = input.planId ?? `quick_${hash(`${merchantId}:${input.requestId}`).slice(0,24)}`;
  const requestHash = hash(canonical(input));
  return db.transaction(() => {
    const previous = db.prepare("SELECT input_json FROM quick_campaigns WHERE id=? AND merchant_id=?").get(id,merchantId) as {input_json:string} | undefined;
    let revision = 1;
    if (input.planId && !previous) throw new DnaError("Saved plan not found for this place.",404);
    if (previous) {
      const plan = JSON.parse(previous.input_json).plan as SavedCampaignPlan;
      if (plan.requestHash === requestHash) return {id,decision:plan.decision};
      if (!input.planId || plan.decision !== "saved" || plan.revision !== input.revision) throw new DnaError("This plan has already changed. Reload it before making another decision.",409);
      revision = plan.revision + 1;
    }
    const merchant = getMerchant(merchantId); if (!merchant) throw new DnaError("Place not found.",404);
    const dna = readyDna(merchantId);
    if (dna.version !== input.version) throw new DnaError("Your DNA changed. Reload this proposal before deciding; your edits have not been saved.",409);
    const offer = getOffers(merchantId).find(o => o.id === input.offerId);
    if (!offer || !offer.price?.trim()) throw new DnaError("Choose an active, priced offer belonging to this place.");
    if (offer.price.trim() !== input.offerPrice) throw new DnaError("The menu price changed. Reload and review the updated offer before deciding.",409);
    if (input.channels.some(c => !campaignChannelOptions(dna.profile.channels).includes(c))) throw new DnaError("Enable paid channels in your saved DNA preferences first.");
    const paid = input.channels.includes("geofenced_ad");
    if (paid && (input.mediaBudgetUsd < 10 || input.mediaBudgetUsd > dna.profile.dailyBudgetUsd)) throw new DnaError(`Choose a campaign ad budget from US$10 to US$${dna.profile.dailyBudgetUsd}. Your DNA ceiling cannot be exceeded.`);
    if (!paid && input.localPromotion) throw new DnaError("Remove paid targeting when no local ad is selected.");
    if (!paid && input.mediaBudgetUsd !== 0) throw new DnaError("Remove the ad budget when no local ad is selected.");
    let timing: {start:number;end:number};
    try { timing = validatePlanTiming(input.startLocal,input.endLocal,merchant.timezone,dna.profile.leadMinutes,now); assertOfferWindow(offer.description,input.startLocal,input.endLocal); }
    catch(e) { throw new DnaError(e instanceof Error ? e.message : "Choose a future time with enough preparation."); }
    const cost = planCost(input.channels,input.mediaBudgetUsd);
    const plan: SavedCampaignPlan = { version:1,revision,decision:input.decision,startAt:new Date(timing.start).toISOString(),endAt:new Date(timing.end).toISOString(),timezone:merchant.timezone,channels:input.channels,mediaBudgetUsd:cost.mediaBudgetUsd,chargedUsd:0,delivery:"manual",preparationMinutes:dna.profile.leadMinutes,requestHash,visual:input.visual,revenueScenario:input.revenueScenario,localPromotion:paid&&input.localPromotion?{...input.localPromotion,center:{name:merchant.name,lat:merchant.lat,lon:merchant.lon},status:"draft"}:undefined };
    // This records a decision. It deliberately does not call any delivery or payment adapter.
    const savedInput = JSON.stringify({offer:{id:offer.id,title:offer.title,description:offer.description ?? "",price:offer.price},availability:planWindowLabel(timing.start,timing.end,merchant.timezone),source:"Menu campaign reviewed by merchant",plan});
    const copy = `${input.message}\n${planWindowLabel(timing.start,timing.end,merchant.timezone)}`;
    // Keep the editable body separate from the date line, which follows the chosen time.
    const inputWithBody = JSON.stringify({...JSON.parse(savedInput), messageBody:input.message});
    if (previous) db.prepare("UPDATE quick_campaigns SET input_json=?,copy=?,dna_snapshot_json=? WHERE id=? AND merchant_id=?").run(inputWithBody,copy,JSON.stringify(dna),id,merchantId);
    else db.prepare("INSERT INTO quick_campaigns(id,merchant_id,input_json,copy,dna_snapshot_json) VALUES(?,?,?,?,?)").run(id,merchantId,inputWithBody,copy,JSON.stringify(dna));
    return {id,decision:input.decision};
  })();
}
