import { z } from "zod";

export const CHANNEL_IDS = ["storefront", "instagram", "facebook", "tiktok", "snapchat", "google_post", "whatsapp", "geofenced_ad"] as const;
export const CHANNELS = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", snapchat: "Snapchat", storefront: "Chalkboard", google_post: "Google Business", whatsapp: "WhatsApp", geofenced_ad: "Local ad" } as const;
export const VOICES = { direct: "Direct & witty", warm: "Warm & familiar", refined: "Understated & refined" } as const;
export const GOALS = { visits: "Bring in new faces", regulars: "Bring regulars back", quiet: "Fill quieter hours" } as const;
export const DnaSchema = z.object({
  positioning: z.string().trim().min(10).max(240),
  audience: z.string().trim().min(3).max(180),
  voice: z.enum(["direct", "warm", "refined"]),
  exampleLine: z.string().trim().min(3).max(180),
  goal: z.enum(["visits", "regulars", "quiet"]),
  signatureOfferId: z.string().min(1).max(100),
  boundaries: z.string().trim().max(300),
  dailyBudgetUsd: z.number().int().min(0).max(200),
  leadMinutes: z.number().int().min(5).max(1440),
  channels: z.array(z.enum(CHANNEL_IDS)).min(1).max(CHANNEL_IDS.length).transform(v => [...new Set(v)]),
}).refine(p => !p.channels.includes("geofenced_ad") || p.dailyBudgetUsd >= 10, { message: "Local ads need a daily ceiling of at least US$10. You can also remove Local ad.", path: ["dailyBudgetUsd"] });
export type PlaceDna = z.infer<typeof DnaSchema>;
export type DnaRecord = { profile: PlaceDna; version: number; status: "suggested" | "demo" | "confirmed"; source: string; updatedAt: string | null };
export type MenuOffer = { id: string; title: string; description: string | null; price: string | null };
export type ExampleContext = "neighbourhood" | "event";
export function campaignExample(p: PlaceDna, offer: MenuOffer, context: ExampleContext = "neighbourhood") {
  const invitation = context === "event" ? (p.voice === "direct" ? "Make us your first stop before the show." : p.voice === "refined" ? "A little time together before the evening begins." : "Meet here before heading to the show.") : (p.voice === "direct" ? "Your next stop is right here." : p.voice === "refined" ? "Take a moment. Stay a little longer." : "A familiar table. Something good to share.");
  return { headline: offer.title, message: `${p.exampleLine}\n${offer.title}${offer.price ? ` · ${offer.price}` : ""}.\n${invitation}`, board: `${offer.title}${offer.price ? ` · ${offer.price}` : ""}`, budget: p.channels.includes("geofenced_ad") ? p.dailyBudgetUsd : 0 };
}
