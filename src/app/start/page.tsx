import Link from "next/link";

export default async function StartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <p className="eyebrow">Step 1 of 2 · two minutes, no account</p>
      <h1 className="mt-2 text-4xl">Tell Turnout about your place</h1>
      <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        Nothing you type here reaches Qloo except the words describing your offers. Your address is only used to draw the radar.
      </p>

      {error && <p className="mt-5 p-3 text-sm" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{error}</p>}

      <form action="/api/merchants" method="post" className="card mt-8 space-y-6 p-7">
        <div className="grid gap-4 sm:grid-cols-[1fr_150px_110px]">
          <div>
            <label className="eyebrow">Name of your place</label>
            <input name="name" required maxLength={80} placeholder="e.g. Flatbush Tap" className="field mt-2" />
          </div>
          <div>
            <label className="eyebrow">Type</label>
            <select name="kind" className="field mt-2" defaultValue="bar">
              <option value="bar">Bar</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Café</option>
              <option value="shop">Shop</option>
            </select>
          </div>
          <div>
            <label className="eyebrow">Seats</label>
            <input name="seats" type="number" min={10} max={2000} step={5} defaultValue={60} required className="field mt-2" />
          </div>
        </div>
        <p className="-mt-3 text-xs" style={{ color: "var(--muted)" }}>Your room size sets what counts as a crowd for you: ten extra guests matter to a 40-seat bar, not to a beer hall.</p>
        <div>
          <label className="eyebrow">Address</label>
          <input name="address" required placeholder="e.g. 620 Atlantic Ave, Brooklyn, NY" className="field mt-2" />
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>Street, city, country. We watch a 1.5 km radius around it.</p>
        </div>
        <div>
          <label className="eyebrow">What you sell, one offer per line, up to six</label>
          <textarea
            name="offers"
            required
            rows={6}
            className="field mt-2"
            placeholder={"Happy hour cocktails 5 to 7 pm, $16 for two\nCraft beer flight, four local IPAs, $18\nSmash burger and fries until 1 am, $14"}
          />
          <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>Plain words. Turnout translates each line into Qloo taste tags and asks you to confirm.</p>
        </div>
        <div>
          <label className="eyebrow">Your tone of voice</label>
          <input name="voice" maxLength={300} placeholder="e.g. Warm, quick-witted, no exclamation marks" className="field mt-2" />
        </div>
        <div>
          <label className="eyebrow">Channels you have</label>
          <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["geofenced_ad", "Ad budget", "geofenced ads near the venue"],
              ["google_post", "Google Business Profile", "posts and offers on your listing"],
              ["whatsapp", "WhatsApp list", "your opted-in regulars"],
              ["storefront", "Chalkboard or window", "we write it, you chalk it"],
              ["dooh", "Digital screen nearby", "simulated in the demo"],
            ].map(([v, l, d]) => (
              <label key={v} className="card-flat flex cursor-pointer items-start gap-3 px-3 py-2.5">
                <input type="checkbox" name="channels" value={v} defaultChecked={v !== "dooh"} className="mt-1" />
                <span>
                  <span className="font-semibold" style={{ color: "var(--ink)" }}>{l}</span>
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>{d}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 pt-2">
          <Link href="/" className="text-sm" style={{ color: "var(--muted)" }}>Cancel</Link>
          <button className="btn btn-accent">Locate my place</button>
        </div>
      </form>
    </main>
  );
}
