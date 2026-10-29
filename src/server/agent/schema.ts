// The campaign draft the agent must produce. Structured output keeps the UI and channels deterministic.
import { z } from "zod";

export const WindowSchema = z.object({
  label: z.string().describe("Short label, e.g. 'Before doors' or 'After the show'"),
  start_local: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).describe("Local time HH:MM in the merchant's timezone"),
  end_local: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/).describe("Local time HH:MM in the merchant's timezone"),
  why: z.string().describe("One sentence: why this window for this crowd"),
});

export const CampaignDraftSchema = z.object({
  language: z.enum(["en", "fr"]).describe("Use en for new drafts; fr is retained for reading historical drafts"),
  chosen_offer_id: z.string().describe("The id of the offer to push for this event"),
  audience_summary: z.string().describe("Two sentences on who this crowd is, citing Qloo demographics and tags"),
  rationale: z.string().describe("Why this offer beats the others for this crowd. Cite specific Qloo evidence: tags, demographics, brands, nearby places. No marketing fluff."),
  windows: z.array(WindowSchema).min(1).max(3),
  geofenced_ad: z.object({
    platform: z.enum(["snapchat", "meta"]),
    radius_m: z.number().int().min(200).max(3000),
    interests: z.array(z.string()).min(2).max(8).describe("Interest targeting keywords derived from Qloo tags and brands"),
    headline: z.string().max(40),
    body: z.string().max(125),
    cta: z.string().max(20),
    daily_budget_usd: z.number().min(0).max(200),
  }),
  google_post: z.object({
    title: z.string().max(58),
    body: z.string().max(300),
    offer_terms: z.string().max(120),
  }),
  whatsapp: z.object({
    message: z.string().max(320).describe("Message to opted-in regulars. Warm, specific, one offer, one time window, no exclamation marks."),
  }),
  storefront: z.object({
    chalkboard: z.string().max(90).describe("What to write on the board outside, max two lines"),
    staff_line: z.string().max(140).describe("One sentence staff can say to people walking in"),
  }),
  dooh: z.object({
    headline: z.string().max(32),
    body: z.string().max(60),
  }),
  confidence: z.number().min(0).max(1).describe("How well the Qloo evidence supports this choice"),
  limitations: z.string().describe("What the Qloo data does not establish. Group affinities, not individuals; no prediction of visits."),
});

export type CampaignDraft = z.infer<typeof CampaignDraftSchema>;

// Keep historical drafts readable while requesting a compact, single-window campaign for Today.
export const CampaignGenerationSchema=CampaignDraftSchema.extend({
  rationale:z.string().max(650),audience_summary:z.string().max(300),
  windows:z.array(WindowSchema).length(1),limitations:z.string().max(350),
});

export function generatedCopyIssues(draft:CampaignDraft):string[]{
 const copy=[draft.google_post.title,draft.google_post.body,draft.google_post.offer_terms,draft.whatsapp.message,draft.storefront.chalkboard,draft.storefront.staff_line,draft.geofenced_ad.headline,draft.geofenced_ad.body].join('\n');
 const issues:string[]=[];
 if(/\b(?:street|block|neighbou?rhood) (?:will be|is going to be) (?:busy|packed|crowded)\b/i.test(copy))issues.push('Remove unsupported predictions of local footfall. Use the verified event and an invitation, not a claim that the street will be busy.');
 if(/\b(?:tables? (?:are |is )?(?:open|available|waiting|reserved)|your table is here|guaranteed (?:table|seat|space)|seats? (?:are )?available)\b/i.test(copy))issues.push('Remove unverified claims about available or reserved tables, seats or space. Invite people without promising availability.');
 if(/\b(?:ads? not selected|zero budget|not connected|manual sharing|Qloo|DNA|media cap)\b/i.test(copy))issues.push('Customer-facing copy must not contain internal platform, budget or preparation notes.');
 return issues;
}
