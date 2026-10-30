import Link from "next/link";
import { Icon } from "@/components/Icon";

const CHANNELS: [string, string, string][] = [
  ["geofenced_ad", "Ad budget", "Geofenced ads near the venue"],
  ["google_post", "Google Business Profile", "Posts and offers on your listing"],
  ["whatsapp", "WhatsApp list", "Your opted-in regulars"],
  ["storefront", "Chalkboard or window", "We write it, you chalk it"],
  ["dooh", "Digital screen nearby", "Simulated in the demo"],
];

export default async function StartPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return <main className="app-page start-page">
    <header className="page-heading"><div><h1>Tell Turnout about your place</h1></div><span className="status-chip">Step 1 of 2 · two minutes, no account</span></header>
    <p className="section-intro">Nothing you type here reaches Qloo except the words describing your offers. Your address is only used to find the crowds around you.</p>
    {error && <p className="plan-inline-error" role="alert">{error}</p>}
    <form action="/api/merchants" method="post" className="start-form">
      <section className="surface start-card">
        <h2><Icon name="pin" size={18}/>Your place</h2>
        <div className="start-grid start-grid-place">
          <label className="start-field"><span>Name of your place</span><input id="f-name" name="name" required maxLength={80} placeholder="e.g. Flatbush Tap"/></label>
          <label className="start-field"><span>Type</span><select id="f-kind" name="kind" defaultValue="bar"><option value="bar">Bar</option><option value="restaurant">Restaurant</option><option value="cafe">Cafe</option><option value="shop">Shop</option></select></label>
          <label className="start-field"><span>Seats</span><input id="f-seats" name="seats" type="number" min={10} max={2000} step={5} defaultValue={60} required/></label>
        </div>
        <p className="start-note">Your room size sets what counts as a crowd for you: ten extra guests matter to a 40-seat bar, not to a beer hall.</p>
        <label className="start-field"><span>Address</span><input id="f-address" name="address" required placeholder="e.g. 620 Atlantic Ave, Brooklyn, NY"/><small>Street, city, country. We watch a 1.5 km radius around it.</small></label>
      </section>
      <section className="surface start-card">
        <h2><Icon name="menu" size={18}/>What you sell</h2>
        <label className="start-field"><span>One offer per line, up to six</span><textarea id="f-offers" name="offers" required rows={5} placeholder={"Happy hour cocktails 5 to 7 pm, $16 for two\nCraft beer flight, four local IPAs, $18\nSmash burger and fries until 1 am, $14"}/><small>Plain words. Turnout translates each line into Qloo taste tags and asks you to confirm.</small></label>
        <label className="start-field"><span>Your tone of voice</span><input id="f-voice" name="voice" maxLength={300} placeholder="e.g. Warm, quick-witted, no exclamation marks"/></label>
      </section>
      <fieldset className="surface start-card">
        <legend className="start-legend"><Icon name="campaign" size={18}/>Channels you have</legend>
        <div className="start-channels">{CHANNELS.map(([v, l, d]) => <label key={v}><input type="checkbox" name="channels" value={v} defaultChecked={v !== "dooh"}/><span><strong>{l}</strong><small>{d}</small></span><i className="start-check"><Icon name="check" size={11}/></i></label>)}</div>
      </fieldset>
      <footer className="start-actions"><Link href="/" className="text-link">Cancel</Link><button className="action-button">Locate my place <Icon name="arrow" size={16}/></button></footer>
    </form>
  </main>;
}
