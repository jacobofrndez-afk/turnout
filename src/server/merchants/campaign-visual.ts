import { MAX_VISUAL_BYTES, CampaignVisualSchema, type CampaignVisual } from "@/lib/campaign-creative";
import { imageType } from "./photo";
import { DnaError } from "./dna";
export function validateCampaignVisual(visual: CampaignVisual) {
  if (!CampaignVisualSchema.safeParse(visual).success) throw new DnaError("Choose a JPG, PNG or WebP image up to 2 MB.");
  const [header, data] = visual.dataUrl.split(",");
  const bytes = Buffer.from(data, "base64");
  if (!bytes.length || bytes.length > MAX_VISUAL_BYTES || bytes.toString("base64") !== data || imageType(bytes) !== header.slice(5, -7)) {
    throw new DnaError("This visual is not a valid JPG, PNG or WebP image up to 2 MB.");
  }
}
