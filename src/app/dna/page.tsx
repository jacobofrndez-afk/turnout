import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { listMerchants, getMerchant } from "@/server/events/radar";
import { getOffers } from "@/server/qloo/crowd";
import { getDna } from "@/server/merchants/dna";
import { DnaForm } from "./DnaForm";
import "./dna.css";
export const dynamic = "force-dynamic";
export default async function DnaPage({ searchParams }: { searchParams: Promise<{ merchant?: string; event?: string; step?: string }> }) {
  const sp = await searchParams;
  const merchants = listMerchants();
  const id = sp.merchant ?? (await cookies()).get("merchant")?.value ?? "m_penn_pour";
  const merchant = getMerchant(id); if (!merchant) notFound();
  return <main className="dna-page">
    <div className="dna-top"><Link href={`/account?merchant=${id}`} className="link">← Account</Link><span className="t-small">Place DNA · always evolving</span></div>
    <DnaForm key={id} merchant={{ id, name: merchant.name, city: merchant.city }} merchants={merchants.map(m => ({ id: m.id, name: m.name }))} record={getDna(id)} offers={getOffers(id)} eventId={sp.event} initialStep={sp.step === "3" ? 2 : 0} />
  </main>;
}
