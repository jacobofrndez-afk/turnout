import Link from "next/link";

export default async function StartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const field = "mt-1 w-full rounded-md px-3 py-2 text-sm";
  const fieldStyle = { background: "var(--bg)", border: "1px solid var(--line)", color: "var(--text)" } as const;
  const label = "block text-xs uppercase tracking-wider";
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Link href="/" className="text-sm" style={{ color: "var(--accent-2)" }}>← Home</Link>
      <p className="mt-2 text-xs uppercase tracking-widest" style={{ color: "var(--accent-2)" }}>Set up your place</p>
      <h1 className="text-3xl font-semibold">Tell the agent about your place</h1>
      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>Two minutes. No account. Nothing you type here is sent to Qloo except the words describing your offers.</p>

      {error && <p className="mt-4 rounded-md p-3 text-sm" style={{ background: "#3b1d1d", border: "1px solid #7f1d1d" }}>{error}</p>}

      <form action="/api/merchants" method="post" className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <div>
            <label className={label} style={{ color: "var(--muted)" }}>Name of your place</label>
            <input name="name" required maxLength={80} placeholder="e.g. Flatbush Tap" className={field} style={fieldStyle} />
          </div>
          <div>
            <label className={label} style={{ color: "var(--muted)" }}>Type</label>
            <select name="kind" className={field} style={fieldStyle} defaultValue="bar">
              <option value="bar">Bar</option>
              <option value="restaurant">Restaurant</option>
              <option value="cafe">Café</option>
              <option value="shop">Shop</option>
            </select>
          </div>
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>Address</label>
          <input name="address" required placeholder="e.g. 620 Atlantic Ave, Brooklyn, NY" className={field} style={fieldStyle} />
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Street, city, country. We locate it and watch a 1.5 km radius around it.</p>
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>What you sell, one offer per line (up to 6)</label>
          <textarea
            name="offers"
            required
            rows={6}
            className={field}
            style={fieldStyle}
            placeholder={"Happy hour cocktails 5 to 7 pm, $16 for two\nCraft beer flight, four local IPAs, $18\nSmash burger and fries until 1 am, $14"}
          />
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Plain words. The agent translates each line into Qloo taste tags and asks you to confirm.</p>
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>Your tone of voice</label>
          <input name="voice" maxLength={300} placeholder="e.g. Warm, quick-witted, no exclamation marks" className={field} style={fieldStyle} />
        </div>
        <div>
          <label className={label} style={{ color: "var(--muted)" }}>Channels you have</label>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
            {[
              ["geofenced_ad", "Ad budget (geofenced ads near the venue)"],
              ["google_post", "Google Business Profile"],
              ["whatsapp", "WhatsApp list of regulars"],
              ["storefront", "Chalkboard or window"],
              ["dooh", "Digital screen nearby"],
            ].map(([v, l]) => (
              <label key={v} className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                <input type="checkbox" name="channels" value={v} defaultChecked={v !== "dooh"} /> {l}
              </label>
            ))}
          </div>
        </div>
        <button className="rounded-md px-5 py-3 font-medium text-white" style={{ background: "var(--accent)" }}>Locate my place and read my offers</button>
      </form>
    </main>
  );
}
