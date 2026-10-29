import { localTimeToInstant, type SavedCampaignPlan } from "@/lib/campaign-plan";
import { getDb } from "@/server/db/client";
import { deliverySummary, type DeliveryReceipt } from "@/lib/delivery";
export function workspaceCampaigns(merchantId: string) {
  const db = getDb();
  const events = db.prepare(`SELECT c.rowid AS position,c.id,c.event_id,c.status,c.created_at,c.copy_json,c.dna_snapshot_json,c.review_json,m.timezone,e.name,e.starts_at,o.title FROM campaigns c JOIN events e ON e.id=c.event_id JOIN merchants m ON m.id=c.merchant_id LEFT JOIN offers o ON o.id=c.offer_id WHERE c.merchant_id=? ORDER BY c.created_at DESC,c.rowid DESC LIMIT 60`).all(merchantId) as { position:number; event_id:string; review_json:string|null; timezone:string; id: string; status: string; created_at: string; copy_json: string | null; dna_snapshot_json: string | null; name: string; starts_at: string; title: string | null }[];
  const quick = db.prepare("SELECT id,input_json,created_at FROM quick_campaigns WHERE merchant_id=? ORDER BY created_at DESC LIMIT 60").all(merchantId) as { id: string; input_json: string; created_at: string }[];
  return [...events.map(c => {
    const receipts = db.prepare("SELECT status,simulated,channel FROM sends WHERE campaign_id=?").all(c.id) as DeliveryReceipt[];
    const label = receipts.length ? deliverySummary(receipts).title : c.status === "failed" ? "Needs attention" : c.status === "awaiting_operator" ? "Needs a manual draft" : c.status === "needs_input" ? "Needs your input" : c.copy_json ? "Draft" : "Not yet drafted";
    let date=c.starts_at,planned=false;
    if(c.review_json){
      try{const review=JSON.parse(c.review_json);date=new Date(localTimeToInstant(review.startLocal,c.timezone)).toISOString();planned=true;}catch{/* Preserve older records with no reviewed time. */}
    }
    const superseded=!c.review_json&&['drafted','failed','awaiting_operator','needs_input'].includes(c.status)&&events.some(other=>other.event_id===c.event_id&&other.position>c.position&&other.copy_json&&other.status!=='failed');
    return { superseded, legacy: !c.dna_snapshot_json, id: c.id, title: c.title ?? c.name, detail: c.name, status: label, createdAt: c.created_at, date, href: `/campaigns/${c.id}?merchant=${encodeURIComponent(merchantId)}`, planned, kind: "event" as const };
  }), ...quick.map(c => {
    const input = JSON.parse(c.input_json) as { offer?: { title?: string }; availability?: string; plan?: SavedCampaignPlan };
    return { superseded:false, legacy: false, id: c.id, title: input.offer?.title ?? "Menu campaign", detail: input.availability ?? "Your menu", status: input.plan ? input.plan.decision === "approved" ? "Approved · share manually" : "Saved plan · not scheduled" : "Draft · not scheduled", createdAt: c.created_at, date: input.plan?.startAt ?? null, href: `/campaigns/quick/${c.id}?merchant=${encodeURIComponent(merchantId)}`, planned: !!input.plan, kind: "menu" as const };
  })].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
}
