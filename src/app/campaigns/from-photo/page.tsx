import Link from "next/link";
import { notFound } from "next/navigation";
import { getMerchant } from "@/server/events/radar";
import { cookies } from "next/headers";
import { getOffers } from "@/server/qloo/crowd";
import { getDna } from "@/server/merchants/dna";
import { photoReaderMode } from "@/server/merchants/photo-reader";
import { PhotoForm } from "./PhotoForm";
import "@/app/dna/dna.css";
export const dynamic = "force-dynamic";
export default async function PhotoPage({ searchParams }: { searchParams: Promise<{ merchant?: string; offer?: string; date?: string; occasion?: string }> }) {
  const sp = await searchParams; const id = sp.merchant ?? (await cookies()).get("merchant")?.value ?? "m_penn_pour"; const m = getMerchant(id); if (!m) notFound();
  const dna = getDna(id);
  const offer = getOffers(id).find(o => o.id === (sp.offer ?? (sp.occasion ? dna.profile.signatureOfferId : "")));
  const initialOffer = offer ? { title: offer.title, description: offer.description ?? "", price: offer.price ?? "" } : undefined;
  const initialDate = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : "";
  return <main className="dna-page"><Link href={`/campaigns?merchant=${id}`} className="link">← Campaigns · {m.name}</Link><header className="dna-heading"><p className="eyebrow">From the counter to a campaign</p><h1 className="t-display">New campaign</h1><p className="t-lead">Start with your menu or chalkboard. Check the offer, add your words and save a campaign draft in your place’s voice.</p></header>{dna.status === "suggested" ? <div className="photo-stage"><p>First, confirm the essentials of your place so the campaign sounds like you.</p><Link className="btn btn-primary mt-5" href={`/dna?merchant=${id}`}>Confirm place DNA</Link></div> : <PhotoForm merchantId={id} dna={dna} readerMode={photoReaderMode()} initialOffer={initialOffer} initialDate={initialDate} />}</main>;
}
