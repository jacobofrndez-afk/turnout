import { z } from "zod";
import { getDb, newId } from "@/server/db/client";
import { readyDna, saveDna, DnaError } from "./dna";
export const QuickCampaignSchema = z.object({
  version: z.number().int().min(1), captureId: z.string().max(100).optional(),
  offer: z.object({ title: z.string().trim().min(2).max(100), description: z.string().trim().max(240), price: z.string().trim().min(1).max(40) }),
  availability: z.string().trim().min(3).max(140), copy: z.string().trim().min(3).max(1200),
  verified: z.literal(true), rememberLine: z.string().trim().min(3).max(180).optional(),
});
export function saveQuickCampaign(merchantId: string, raw: unknown) {
  const parsed = QuickCampaignSchema.safeParse(raw);
  if (!parsed.success) throw new DnaError("Check the offer, price, availability and message, then confirm that you reviewed them.");
  const input = parsed.data; const db = getDb();
  return db.transaction(() => {
    const dna = readyDna(merchantId);
    if (dna.version !== input.version) throw new DnaError("Your DNA changed. Reload and review this draft before saving.", 409);
    if (input.captureId && !db.prepare("SELECT id FROM menu_captures WHERE id=? AND merchant_id=?").get(input.captureId, merchantId)) throw new DnaError("This photo reference does not belong to this place.");
    const id = newId("quick");
    db.prepare("INSERT INTO quick_campaigns (id,merchant_id,input_json,copy,dna_snapshot_json) VALUES (?,?,?,?,?)").run(id, merchantId, JSON.stringify({ offer: input.offer, availability: input.availability, source: input.captureId ? "Photo transcription, reviewed by merchant" : "Entered and reviewed by merchant", captureId: input.captureId }), input.copy, JSON.stringify(dna));
    if (input.rememberLine) saveDna(merchantId, { ...dna.profile, exampleLine: input.rememberLine }, dna.version, "Wording you chose to remember from a campaign");
    return { id };
  })();
}
