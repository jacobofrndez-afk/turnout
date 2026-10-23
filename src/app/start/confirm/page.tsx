import Link from "next/link";
import { getMerchant } from "@/server/events/radar";
import { offerTagCandidates } from "@/server/merchants/onboarding";

const TAG_KIND: Record<string, string> = {
  "offerings:place": "on the menu",
  "genre:place": "kind of place",
  "category:place": "category",
  "cuisine:qloo": "cuisine",
  "good_for:qloo": "good for",
  "specialty_dish:place": "signature dish",
  "menu_highlight:qloo": "menu highlight",
  "beverage_offerings:qloo": "drinks",
  "dining_option:qloo": "dining",
  "resy:collection": "Resy list",
};
// One chip per label, no media tags, three at most. The first (top-ranked, default-ticked) is unchanged.
function plainCandidates<T extends { name: string; namespace: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list
    .filter((t) => {
      const k = t.name.toLowerCase();
      return !t.namespace.endsWith(":media") && !seen.has(k) && !!seen.add(k);
    })
    .slice(0, 3);
}

export const dynamic = "force-dynamic";

export default async function ConfirmPage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const { merchant: id } = await searchParams;
  const merchant = id ? getMerchant(id) : undefined;
  if (!merchant) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-14">
        <p>Unknown place. <Link href="/start" className="link">Start again</Link></p>
      </main>
    );
  }
  const offers = (await offerTagCandidates(merchant.id)).map((o) => ({ ...o, concepts: o.concepts.map((c) => ({ ...c, candidates: plainCandidates(c.candidates) })) }));
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">Step 2 of 2 · confirm what Turnout understood</p>
        <h1 className="t-title mt-3">Did I read your offers right?</h1>
        <p className="mt-5 text-base text-[var(--muted)]">
          {merchant.name}, located at {merchant.address}. For each offer, Turnout searched Qloo's tag vocabulary. Keep the tags that mean what you mean, untick the rest.
        </p>
        <form action={`/api/merchants/${merchant.id}/offers`} method="post" className="stack-block space-y-16">
          {offers.map((o) => (
            <section key={o.id}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="t-name">{o.title}</p>
                <span className="text-base text-[var(--muted)] tnum">{o.price}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">{o.description}</p>
              <div className="mt-6 space-y-6">
                {o.concepts.map((c) => (
                  <div key={c.concept}>
                    <p className="eyebrow">I read “{c.concept}”</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.candidates.length === 0 && <span className="text-sm text-[var(--muted)]">No Qloo tag found.</span>}
                      {c.candidates.map((t, i) => (
                        <label key={t.id} className="chip h-10 cursor-pointer gap-3 px-4 text-[15px]" title={t.id}>
                          <input type="checkbox" name={`tag:${o.id}`} value={`${t.id}::${t.name}`} defaultChecked={i === 0} />
                          {t.name}
                          {TAG_KIND[t.namespace] && <span className="text-[var(--muted)]">· {TAG_KIND[t.namespace]}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {offers.length === 0 && <p className="text-base text-[var(--muted)]">No offers were parsed. Go back and add one per line.</p>}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Link href="/start" className="link text-base">Start over</Link>
            <button className="btn btn-accent btn-lg">Confirm and see my day</button>
          </div>
        </form>
      </div>
    </main>
  );
}
