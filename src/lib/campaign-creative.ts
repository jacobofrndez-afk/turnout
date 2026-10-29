import { z } from "zod";

export const MAX_VISUAL_BYTES = 2 * 1024 * 1024;
export const MAX_CAMPAIGN_BODY_BYTES = 3 * 1024 * 1024;
export const CampaignVisualSchema = z.object({
  name: z.string().trim().min(1).max(120).regex(/^[^/\\\x00-\x1f]+$/),
  dataUrl: z.string().max(Math.ceil(MAX_VISUAL_BYTES / 3) * 4 + 40)
    .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/),
});
export type CampaignVisual = z.infer<typeof CampaignVisualSchema>;
export const RevenueScenarioSchema = z.object({
  lowSales: z.number().int().min(0).max(10000),
  highSales: z.number().int().min(0).max(10000),
  basis: z.enum(["illustrative", "owner"]),
}).refine(v => v.highSales >= v.lowSales, "The upper range must be at least the lower range.");
export type RevenueScenario = z.infer<typeof RevenueScenarioSchema>;
export const exampleRevenueScenario: RevenueScenario = { lowSales: 5, highSales: 15, basis: "illustrative" };

/** One sale means one priced offer, including bundles. Never infer order volume from affinity. */
export function offerUnitPrice(price: string | null) {
  if (!price) return null;
  const match = price.trim().match(/^(?:(US\$|USD|EUR|GBP|\$|€|£)\s*(\d{1,5}(?:[.,]\d{1,2})?)|(\d{1,5}(?:[.,]\d{1,2})?)\s*(USD|EUR|GBP|€|£))(?:\s+(?:for two|for 2|pitcher|per person|per glass|each))?$/i);
  if (!match) return null;
  const symbol = (match[1] || match[4]).toUpperCase();
  const amount = Number((match[2] || match[3]).replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, currency: symbol === "€" || symbol === "EUR" ? "EUR" : symbol === "£" || symbol === "GBP" ? "GBP" : "USD" };
}
export function revenueScenario(price: string | null, scenario: RevenueScenario) {
  const unit = offerUnitPrice(price);
  if (!unit || !RevenueScenarioSchema.safeParse(scenario).success) return null;
  const format = (value: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: unit.currency, maximumFractionDigits: Number.isInteger(value) ? 0 : 2 }).format(value);
  return { low: unit.amount * scenario.lowSales, high: unit.amount * scenario.highSales, currency: unit.currency,
    label: `${format(unit.amount * scenario.lowSales)}–${format(unit.amount * scenario.highSales)}`, unitLabel: format(unit.amount) };
}
