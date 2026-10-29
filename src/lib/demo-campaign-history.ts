import type { IconName } from "@/components/Icon";
import type { CHANNELS } from "@/lib/place-dna";

export type DemoCampaign = {
  id: string;
  date: string;
  window: string;
  title: string;
  occasion: string;
  icon: IconName;
  offerId: string;
  offer: string;
  channels: (keyof typeof CHANNELS)[];
  spendUsd: number;
  redemptions: number;
  offerPriceUsd: number;
  digital: { reach: number; impressions: number; clicks: number };
  message: string;
  reason: string;
  takeaway: string;
  outcome: "Worth repeating" | "Promising" | "Needs a rethink";
};

// Display-only fixtures requested for the Penn & Pour demo. Never used by the
// campaign engine, delivery, billing, DNA learning or Qloo potential scoring.
const PENN_HISTORY: readonly DemoCampaign[] = [
  {
    id: "demo-pp-afterwork", date: "2026-10-23", window: "5–7 pm",
    title: "Clock off. Cocktails on.", occasion: "After work", icon: "clock",
    offerId: "o_pp_happy", offer: "Pre-show happy hour · $16 for two",
    channels: ["storefront", "geofenced_ad"], spendUsd: 25, redemptions: 18,
    offerPriceUsd: 16, digital: { reach: 940, impressions: 1340, clicks: 67 },
    message: "Laptop shut. First round sorted.\nTwo cocktails for $16, 5–7 pm at Penn & Pour.\nBring your favourite colleague. Or leave them at work.",
    reason: "A cocktail offer for the walk home, with a short window and a nearby audience.",
    takeaway: "Try the same window next Friday. Keep the two-drink offer and test a new opening line.",
    outcome: "Worth repeating",
  },
  {
    id: "demo-pp-rain", date: "2026-10-21", window: "5–8 pm",
    title: "Rain check? Beer flight.", occasion: "Weather moment", icon: "rain",
    offerId: "o_pp_beer", offer: "Craft beer flight · $18",
    channels: ["storefront", "google_post"], spendUsd: 0, redemptions: 9,
    offerPriceUsd: 18, digital: { reach: 180, impressions: 240, clicks: 14 },
    message: "Forecast: four good beers, zero umbrellas.\nDuck into Penn & Pour for a $18 craft beer flight.\nBrooklyn and Queens, all on one tray. Tonight, 5–8 pm.",
    reason: "A same-day invitation to get out of the rain, built around an existing offer.",
    takeaway: "Keep a weather-ready message handy. This small, unpaid campaign is easy to repeat.",
    outcome: "Promising",
  },
  {
    id: "demo-pp-wine", date: "2026-10-18", window: "4–7 pm",
    title: "A slower kind of Sunday.", occasion: "Quiet hours", icon: "sun",
    offerId: "o_pp_wine", offer: "Natural wine by the glass · $13",
    channels: ["google_post", "geofenced_ad"], spendUsd: 18, redemptions: 7,
    offerPriceUsd: 13, digital: { reach: 620, impressions: 930, clicks: 31 },
    message: "No big plans required.\nNatural wine, $13 a glass. Orange or pét-nat? We’ll help you choose.\nSunday, 4–7 pm at Penn & Pour.",
    reason: "An alternative to the signature beer offer, with a gentler message for a quiet afternoon.",
    takeaway: "Test the same offer on the chalkboard before adding more paid reach.",
    outcome: "Promising",
  },
  {
    id: "demo-pp-late", date: "2026-10-16", window: "10 pm–1 am",
    title: "One last stop. Something hot.", occasion: "Late-night appetite", icon: "ticket",
    offerId: "o_pp_late", offer: "After-show late plate · $14",
    channels: ["storefront", "geofenced_ad"], spendUsd: 30, redemptions: 3,
    offerPriceUsd: 14, digital: { reach: 1120, impressions: 1600, clicks: 18 },
    message: "Still out? Kitchen’s still on.\nSmash burger and fries, $14.\nPenn & Pour, 10 pm until 1 am. The night can wait five more minutes.",
    reason: "A late-food offer for people already out nearby, without relying on one named event.",
    takeaway: "The response was modest for the media spend. Try an earlier message and a smaller budget.",
    outcome: "Needs a rethink",
  },
  {
    id: "demo-pp-board", date: "2026-10-12", window: "5–8 pm",
    title: "Fresh on the board.", occasion: "From a menu photo", icon: "camera",
    offerId: "o_pp_beer", offer: "Craft beer flight · $18",
    channels: ["storefront", "google_post"], spendUsd: 0, redemptions: 12,
    offerPriceUsd: 18, digital: { reach: 250, impressions: 360, clicks: 22 },
    message: "New board. Same good company.\nFour local pours from Brooklyn and Queens. One $18 flight.\nCome find your new favourite, 5–8 pm at Penn & Pour.",
    reason: "A chalkboard photo becomes a short campaign, with the offer and price checked by the owner.",
    takeaway: "Lead with what is new on the board. Keep the owner’s informal wording.",
    outcome: "Worth repeating",
  },
  {
    id: "demo-pp-friday", date: "2026-10-09", window: "5–8 pm",
    title: "Four pours. Your Friday.", occasion: "Neighbourhood regulars", icon: "coffee",
    offerId: "o_pp_beer", offer: "Craft beer flight · $18",
    channels: ["storefront", "geofenced_ad"], spendUsd: 22, redemptions: 15,
    offerPriceUsd: 18, digital: { reach: 840, impressions: 1180, clicks: 53 },
    message: "You’ve done enough deciding this week.\nFour local beers. One $18 flight.\nFriday, 5–8 pm. We’ll save the good company for you.",
    reason: "The signature offer, in the place’s own voice, for an easy end-of-week visit.",
    takeaway: "Use this as a baseline when trying a different offer in the same time window.",
    outcome: "Worth repeating",
  },
];

export function demoCampaignHistory(merchantId: string): readonly DemoCampaign[] {
  return merchantId === "m_penn_pour" ? PENN_HISTORY : [];
}

export type CampaignKpiInput = Pick<DemoCampaign, "spendUsd" | "redemptions" | "offerPriceUsd" | "digital">;

/** Derived from display-only sample counts, never measured or causal results. */
export function campaignKpis(campaigns: readonly CampaignKpiInput[]) {
  const totals = campaigns.reduce((sum, c) => ({
    spendUsd: sum.spendUsd + c.spendUsd,
    redemptions: sum.redemptions + c.redemptions,
    offerRevenueUsd: sum.offerRevenueUsd + c.redemptions * c.offerPriceUsd,
    impressions: sum.impressions + c.digital.impressions,
    clicks: sum.clicks + c.digital.clicks,
  }), { spendUsd: 0, redemptions: 0, offerRevenueUsd: 0, impressions: 0, clicks: 0 });
  return {
    ...totals,
    // Blended across all channels; do not label this acquisition cost or ROAS.
    mediaCostPerRedemptionUsd: totals.redemptions > 0 ? totals.spendUsd / totals.redemptions : null,
    ctr: totals.impressions > 0 ? totals.clicks / totals.impressions : null,
  };
}
