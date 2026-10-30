import Link from "next/link";
import { SavedCampaignPlan as PlanDetail } from "@/components/SavedCampaignPlan";
import { CampaignPlanCard } from "@/components/CampaignPlanCard";
import { localStampAt, type SavedCampaignPlan } from "@/lib/campaign-plan";
import { getDna } from "@/server/merchants/dna";
import { getOffers } from "@/server/qloo/crowd";
import { proposeCampaign } from "@/server/workspace/proposal";
import { notFound } from "next/navigation";
import { getDb } from "@/server/db/client";
import { getMerchant } from "@/server/events/radar";
import { CHANNELS, type DnaRecord } from "@/lib/place-dna";
import { CampaignDestinations } from "@/components/CampaignDestination";
import { CopyText } from "@/components/CopyText";
import "@/app/dna/dna.css";
export const dynamic = "force-dynamic";
export default async function QuickDraft({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const row = getDb().prepare("SELECT * FROM quick_campaigns WHERE id=?").get(id) as { merchant_id: string; copy: string; input_json: string; dna_snapshot_json: string } | undefined; if (!row) notFound();
  const m = getMerchant(row.merchant_id)!; const dna = JSON.parse(row.dna_snapshot_json) as DnaRecord; const input = JSON.parse(row.input_json);
  if (input.plan) {
    const plan = input.plan as SavedCampaignPlan;
    if (plan.decision === "saved") {
      const current = getDna(m.id), offers = getOffers(m.id), now = Date.now();
      const proposal = proposeCampaign(current, offers, m.timezone, [], now);
      if (proposal && offers.some(o => o.id === input.offer.id && o.price === input.offer.price)) {
        proposal.offerId = input.offer.id;
        proposal.slots.unshift({id:"saved",label:"Your saved time",startLocal:localStampAt(new Date(plan.startAt),m.timezone),endLocal:localStampAt(new Date(plan.endAt),m.timezone),reason:"The window you chose when saving this campaign. Check it still leaves enough preparation time.",source:"Your saved plan."});
        return <main className="app-page plan-review-page"><Link className="text-link" href={`/campaigns?merchant=${m.id}`}>← Your campaigns</Link><header className="page-heading"><div><h1>Pick up your plan.</h1><p>Keep your edits, adjust what you need and decide.</p></div></header><CampaignPlanCard merchantId={m.id} merchantName={m.name} timezone={m.timezone} dna={current} offers={offers} proposal={proposal} now={now} existing={{id,plan,offerId:input.offer.id,message:input.messageBody ?? row.copy,dnaVersion:dna.version}}/></main>;
      }
    }
    return <main className="app-page"><Link className="text-link" href={`/campaigns?merchant=${m.id}`}>← Your campaigns</Link>{plan.decision === "saved" && <p className="notice">Your menu or DNA has changed. Keep this record for reference and prepare a new campaign from Today.</p>}<PlanDetail id={id} merchantId={m.id} merchantName={m.name} offer={input.offer} copy={row.copy} plan={plan} dna={dna}/></main>;
  }
  return <main className="dna-page"><Link className="link" href={`/campaigns?merchant=${m.id}`}>← {m.name} · Campaigns</Link><header className="dna-heading"><p className="eyebrow">Campaign draft saved · nothing published</p><h1 className="t-display">Your draft is saved.</h1><p className="t-lead">Your reviewed offer, in your words. Copy the message into the channel you choose.</p></header><article className="dna-campaign max-w-2xl"><h2 className="t-title">{input.offer.title}</h2><p>{input.offer.price} · {input.availability}</p><div className="dna-copy"><blockquote>{row.copy}</blockquote><CopyText text={row.copy} /></div><p className="t-small">{input.source} · Place DNA v{dna.version}</p><CampaignDestinations channels={dna.profile.channels} merchantId={m.id} merchantName={m.name} text={row.copy}/><p className="t-small">{dna.profile.leadMinutes} min to prepare. {dna.profile.channels.includes("geofenced_ad") ? `US$${dna.profile.dailyBudgetUsd}/day paid media ceiling; no ad spend has started.` : "No paid ad selected."} Provider fees and product costs are not included.</p><p className="t-small mt-4">This is your reviewed message, saved for manual use. Channel-specific formatting and scheduling are not applied.</p></article><div className="photo-actions"><Link className="btn btn-primary" href={`/campaigns/from-photo?merchant=${m.id}`}>Create another draft</Link><Link className="link" href={`/dna?merchant=${m.id}`}>Keep refining your DNA →</Link></div></main>;
}
