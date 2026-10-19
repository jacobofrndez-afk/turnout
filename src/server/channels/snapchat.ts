// Snapchat Marketing API adapter: one PAUSED campaign + one ad squad geofenced around the venue.
// Active only when SNAP_ACCESS_TOKEN and SNAP_AD_ACCOUNT_ID are set. Created PAUSED so nothing spends
// without a human switching it on in Ads Manager. Shapes per developers.snap.com (campaigns, ad squads, targeting).
const API = "https://adsapi.snapchat.com/v1";

export function snapConfigured(): boolean {
  return Boolean(process.env.SNAP_ACCESS_TOKEN && process.env.SNAP_AD_ACCOUNT_ID);
}

export type GeofencedAdSpec = {
  name: string;
  lat: number;
  lon: number;
  radiusM: number;
  countryCode: string; // "us" | "fr"
  startIso: string;
  endIso: string;
  dailyBudgetUsd: number;
  minAge?: number;
  maxAge?: number;
  gender?: "MALE" | "FEMALE";
};

export function buildSnapPayloads(spec: GeofencedAdSpec, adAccountId = process.env.SNAP_AD_ACCOUNT_ID ?? "<ad_account_id>") {
  const campaign = {
    campaigns: [
      {
        name: spec.name,
        ad_account_id: adAccountId,
        status: "PAUSED",
        start_time: spec.startIso,
        end_time: spec.endIso,
        objective_v2_properties: { objective_v2_type: "AWARENESS_AND_ENGAGEMENT" },
      },
    ],
  };
  const demographics: Record<string, string>[] = [];
  if (spec.minAge || spec.maxAge || spec.gender) {
    const d: Record<string, string> = { min_age: String(Math.max(18, spec.minAge ?? 18)), operation: "INCLUDE" };
    if (spec.maxAge) d.max_age = String(spec.maxAge);
    if (spec.gender) d.gender = spec.gender;
    demographics.push(d);
  }
  const adsquad = {
    adsquads: [
      {
        campaign_id: "<campaign_id>",
        name: `${spec.name} · geofence ${spec.radiusM} m`,
        type: "SNAP_ADS",
        placement_v2: { config: "AUTOMATIC" },
        billing_event: "IMPRESSION",
        bid_strategy: "AUTO_BID",
        optimization_goal: "IMPRESSIONS",
        daily_budget_micro: Math.round(spec.dailyBudgetUsd * 1_000_000),
        start_time: spec.startIso,
        end_time: spec.endIso,
        targeting: {
          geos: [{ country_code: spec.countryCode.toLowerCase(), operation: "INCLUDE" }],
          locations: [{ circles: [{ latitude: spec.lat, longitude: spec.lon, radius: Math.max(96, spec.radiusM), unit: "METERS" }], operation: "INCLUDE" }],
          ...(demographics.length ? { demographics } : {}),
        },
      },
    ],
  };
  return { campaign, adsquad };
}

async function snapPost(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SNAP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Snapchat ${path} HTTP ${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  return json;
}

// Creates the campaign and the ad squad (PAUSED). Returns the ids. Creative upload is left to Ads Manager.
export async function createGeofencedCampaign(spec: GeofencedAdSpec): Promise<{ campaignId: string; adSquadId: string }> {
  const { campaign, adsquad } = buildSnapPayloads(spec);
  const c = await snapPost(`/adaccounts/${process.env.SNAP_AD_ACCOUNT_ID}/campaigns`, campaign);
  const campaignId = ((c.campaigns as { campaign?: { id?: string } }[] | undefined)?.[0]?.campaign?.id) ?? "";
  if (!campaignId) throw new Error("Snapchat returned no campaign id");
  adsquad.adsquads[0].campaign_id = campaignId;
  const s = await snapPost(`/campaigns/${campaignId}/adsquads`, adsquad);
  const adSquadId = ((s.adsquads as { adsquad?: { id?: string } }[] | undefined)?.[0]?.adsquad?.id) ?? "";
  return { campaignId, adSquadId };
}
