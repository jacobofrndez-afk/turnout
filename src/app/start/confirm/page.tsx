import Link from "next/link";
import { getMerchant } from "@/server/events/radar";
import { offerTagCandidates } from "@/server/merchants/onboarding";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const { merchant: id } = await searchParams;
  const merchant = id ? getMerchant(id) : undefined;
  if (!merchant) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <p>Unknown merchant. <Link href="/start" style={{ color: "var(--accent-2)" }}>Start again</Link></p>
      </main>
    );
  }
  const offers = await offerTagCandidates(merchant.id);
  const panel = { background: "var(--panel)", border: "1px solid var(--line)" } as const;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--accent-2)" }}>Step 2 of 2</p>
      <h1 className="text-3xl font-semibold">Did I understand your offers?</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        {merchant.name} located at {merchant.address} ({merchant.timezone}). For each offer, the agent searched Qloo's tag vocabulary. Keep the tags that match what you mean; untick the rest.
      </p>
      <form action={`/api/merchants/${merchant.id}/offers`} method="post" className="mt-6 space-y-4">
        {offers.map((o) => (
          <section key={o.id} className="rounded-lg p-4" style={panel}>
            <p className="font-medium">{o.title} <span className="text-xs" style={{ color: "var(--muted)" }}>{o.price}</span></p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{o.description}</p>
            <div className="mt-3 space-y-2">
              {o.concepts.map((c) => (
                <div key={c.concept}>
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: "var(--muted)" }}>I read: “{c.concept}”</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {c.candidates.length === 0 && <span className="text-xs" style={{ color: "var(--muted)" }}>No Qloo tag found.</span>}
                    {c.candidates.map((t, i) => (
                      <label key={t.id} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs" style={{ background: "var(--bg)", border: "1px solid var(--line)" }} title={t.id}>
                        <input type="checkbox" name={`tag:${o.id}`} value={`${t.id}::${t.name}`} defaultChecked={i === 0} /> {t.name}
                        <span style={{ color: "var(--muted)" }}>· {t.namespace}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
        {offers.length === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No offers were parsed. Go back and add one per line.</p>}
        <div className="flex items-center gap-3">
          <button className="rounded-md px-5 py-3 font-medium text-white" style={{ background: "var(--accent)" }}>Confirm and open my radar</button>
          <Link href="/start" className="text-sm" style={{ color: "var(--muted)" }}>Start over</Link>
        </div>
      </form>
    </main>
  );
}
