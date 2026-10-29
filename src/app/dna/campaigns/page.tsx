import Link from "next/link";
import { notFound } from "next/navigation";
import { getMerchant } from "@/server/events/radar";
import { getOffers } from "@/server/qloo/crowd";
import { getDna } from "@/server/merchants/dna";
import { CampaignComparison } from "./CampaignComparison";
import "../dna.css";
export const dynamic = "force-dynamic";
export default async function DnaCampaigns({ searchParams }: { searchParams: Promise<{ merchant?: string; event?: string }> }) {
  const sp = await searchParams; const id = sp.merchant ?? "m_penn_pour";
  if (!getMerchant(id)) notFound();
  const ids = ["m_penn_pour", "m_quai_bercy"].includes(id) ? ["m_penn_pour", "m_quai_bercy"] : [id];
  const places = ids.flatMap(id => { const m = getMerchant(id); return m ? [{ id, name: m.name, city: m.city, dna: getDna(id), offers: getOffers(id) }] : []; });
  return <main className="dna-page"><div className="dna-top"><Link href={`/dna?merchant=${id}`} className="link">← Place DNA</Link><span className="t-small">From identity to action</span></div><header className="dna-heading"><p className="eyebrow">Same opportunity. Your own approach.</p><h1 className="t-display">Your campaign preview</h1><p className="t-lead">See how the saved DNA changes the offer, the words and the channels. Switch the occasion to compare.</p></header><CampaignComparison places={places} selectedId={id} /><div className="dna-next"><div><h2 className="t-title">Ready to create your own?</h2><p className="t-body">A menu, a chalkboard, a quieter evening or an event nearby.</p></div><Link className="btn btn-primary" href={`/campaigns/from-photo?merchant=${id}`}>Start from a photo</Link><Link className="link" href={sp.event ? `/campaigns/new?merchant=${id}&event=${encodeURIComponent(sp.event)}` : `/today?merchant=${id}`}>{sp.event ? "Continue with your event →" : "Find live opportunities →"}</Link></div></main>;
}
