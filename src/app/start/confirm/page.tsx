import Link from "next/link";
import { getMerchant } from "@/server/events/radar";
import { offerTagCandidates } from "@/server/merchants/onboarding";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const { merchant: id } = await searchParams;
  const merchant = id ? getMerchant(id) : undefined;
  if (!merchant) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-14">
        <p>Unknown place. <Link href="/start" className="underline">Start again</Link></p>
      </main>
    );
  }
  const offers = await offerTagCandidates(merchant.id);
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <p className="eyebrow">Step 2 of 2 · confirm what Turnout understood</p>
      <h1 className="mt-2 text-4xl">Did I read your offers right?</h1>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        {merchant.name}, located at {merchant.address} ({merchant.timezone}). For each offer, Turnout searched Qloo's tag vocabulary. Keep the tags that mean what you mean, untick the rest.
      </p>
      <form action={`/api/merchants/${merchant.id}/offers`} method="post" className="mt-8 space-y-4">
        {offers.map((o) => (
          <section key={o.id} className="card p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-lg">{o.title}</p>
              <span className="tnum text-sm" style={{ color: "var(--muted)" }}>{o.price}</span>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{o.description}</p>
            <div className="mt-4 space-y-3">
              {o.concepts.map((c) => (
                <div key={c.concept}>
                  <p className="eyebrow">I read “{c.concept}”</p>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {c.candidates.length === 0 && <span className="text-xs" style={{ color: "var(--muted)" }}>No Qloo tag found.</span>}
                    {c.candidates.map((t, i) => (
                      <label key={t.id} className="chip cursor-pointer" title={t.id}>
                        <input type="checkbox" name={`tag:${o.id}`} value={`${t.id}::${t.name}`} defaultChecked={i === 0} className="" />
                        {t.name}
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
        <div className="flex items-center justify-between gap-3 pt-2">
          <Link href="/start" className="text-sm" style={{ color: "var(--muted)" }}>Start over</Link>
          <button className="btn btn-accent">Confirm and see my day</button>
        </div>
      </form>
    </main>
  );
}
