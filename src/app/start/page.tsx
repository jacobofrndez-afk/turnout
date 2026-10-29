import Link from "next/link";

export default async function StartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="max-w-2xl">
        <p className="eyebrow">Step 1 of 2 · two minutes, no account</p>
        <h1 className="t-title mt-3">Tell Turnout about your place</h1>
        <p className="mt-5 text-base text-[var(--muted)]">
          Nothing you type here reaches Qloo except the words describing your offers. Your address is only used to find the crowds around you.
        </p>

        {error && <p className="mt-6 bg-[var(--danger-soft)] px-5 py-4 text-base text-[var(--danger)]">{error}</p>}

        <form action="/api/merchants" method="post" className="stack-block space-y-10">
          <div className="grid gap-4 sm:grid-cols-[1fr_150px_110px]">
            <div>
              <label htmlFor="f-name" className="text-[15px] font-medium text-[var(--ink)]">Name of your place</label>
              <input id="f-name" name="name" required maxLength={80} placeholder="e.g. Flatbush Tap" className="field mt-2" />
            </div>
            <div>
              <label htmlFor="f-kind" className="text-[15px] font-medium text-[var(--ink)]">Type</label>
              <select id="f-kind" name="kind" className="field mt-2" defaultValue="bar">
                <option value="bar">Bar</option>
                <option value="restaurant">Restaurant</option>
                <option value="cafe">Cafe</option>
                <option value="shop">Shop</option>
              </select>
            </div>
            <div>
              <label htmlFor="f-seats" className="text-[15px] font-medium text-[var(--ink)]">Seats</label>
              <input id="f-seats" name="seats" type="number" min={10} max={2000} step={5} defaultValue={60} required className="field mt-2" />
            </div>
          </div>
          <p className="-mt-6 text-sm text-[var(--muted)]">Your room size sets what counts as a crowd for you: ten extra guests matter to a 40-seat bar, not to a beer hall.</p>
          <div>
            <label htmlFor="f-address" className="text-[15px] font-medium text-[var(--ink)]">Address</label>
            <input id="f-address" name="address" required placeholder="e.g. 620 Atlantic Ave, Brooklyn, NY" className="field mt-2" />
            <p className="mt-2 text-sm text-[var(--muted)]">Street, city, country. We watch a 1.5 km radius around it.</p>
          </div>
          <div>
            <label htmlFor="f-offers" className="text-[15px] font-medium text-[var(--ink)]">What you sell, one offer per line, up to six</label>
            <textarea
              id="f-offers"
              name="offers"
              required
              rows={6}
              className="field mt-2"
              placeholder={"Happy hour cocktails 5 to 7 pm, $16 for two\nCraft beer flight, four local IPAs, $18\nSmash burger and fries until 1 am, $14"}
            />
            <p className="mt-2 text-sm text-[var(--muted)]">Plain words. Turnout translates each line into Qloo taste tags and asks you to confirm.</p>
          </div>
          <div>
            <label htmlFor="f-voice" className="text-[15px] font-medium text-[var(--ink)]">Your tone of voice</label>
            <input id="f-voice" name="voice" maxLength={300} placeholder="e.g. Warm, quick-witted, no exclamation marks" className="field mt-2" />
          </div>
          <fieldset>
            <legend className="text-[15px] font-medium text-[var(--ink)]">Channels you have</legend>
            <div className="mt-4 grid gap-x-10 gap-y-5 text-base sm:grid-cols-2">
              {[
                ["geofenced_ad", "Ad budget", "geofenced ads near the venue"],
                ["google_post", "Google Business Profile", "posts and offers on your listing"],
                ["whatsapp", "WhatsApp list", "your opted-in regulars"],
                ["storefront", "Chalkboard or window", "we write it, you chalk it"],
                ["dooh", "Digital screen nearby", "simulated in the demo"],
              ].map(([v, l, d]) => (
                <label key={v} className="flex cursor-pointer items-start gap-4">
                  <input type="checkbox" name="channels" value={v} defaultChecked={v !== "dooh"} className="mt-0.5" />
                  <span>
                    <span className="font-semibold text-[var(--ink)]">{l}</span>
                    <span className="mt-0.5 block text-sm text-[var(--muted)]">{d}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center justify-between gap-3 pt-6">
            <Link href="/" className="link text-base">Cancel</Link>
            <button className="btn btn-accent btn-lg">Locate my place</button>
          </div>
        </form>
      </div>
    </main>
  );
}
