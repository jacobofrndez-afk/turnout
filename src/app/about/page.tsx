import Link from "next/link";
import { listMerchants } from "@/server/events/radar";
import { Icon } from "@/components/Icon";
import { BRAND } from "@/lib/brand-copy";

export const dynamic = "force-dynamic";
export const metadata = { title: "Turnout — Your marketing team. Your call.", description: BRAND.description };

export default function AboutPage() {
  const places = listMerchants().filter(p => ["m_penn_pour", "m_quai_bercy"].includes(p.id));
  return <main className="app-page brand-page">
    <header className="brand-hero"><p className="overline">Marketing intelligence for independent businesses</p><h1>Your marketing team.<br/>Your call.</h1><p className="brand-promise">{BRAND.promise}</p><p className="brand-control">{BRAND.control}</p><Link className="action-button" href="/today">Try a prepared campaign <Icon name="arrow" size={17}/></Link><span className="brand-hero-note">Explore the demo · no account needed</span></header>
    <section className="brand-how" id="how-it-works" aria-labelledby="brand-how-title">
      <div className="section-title"><h2 id="brand-how-title">From a signal to your next move.</h2><span>Turnout prepares. You decide.</span></div>
      <ol className="brand-journey">
        <li><span className="brand-step-number">01</span><span className="brand-step-owner">Turnout · discovery</span><Icon name="voice" size={23}/><h3>Spot the moment.</h3><p>Local occasions, wider trends and neighbourhood habits provide reasons to act, now or ahead of time.</p></li>
        <li className="brand-qloo-step"><span className="brand-step-number">02</span><span className="brand-step-owner">Qloo · taste intelligence</span><span className="qloo-wordmark">Qloo</span><h3>Find your fit.</h3><p>Qloo neighbourhood tastes and nearby places are matched to your menu. Turnout combines that evidence with your DNA and timing to prioritise the opportunity.</p></li>
        <li><span className="brand-step-number">03</span><span className="brand-step-owner">Turnout · preparation</span><Icon name="campaign" size={23}/><h3>A campaign, ready to wear.</h3><p>Your message, offer, timing, channels and media budget, prepared together. The potential score and its evidence explain why it is worth considering.</p></li>
        <li><span className="brand-step-number">04</span><span className="brand-step-owner">You · the decision</span><Icon name="check" size={23}/><h3>Add your touch. Make the call.</h3><p>Keep the proposal or refine the details. Approve the plan, then follow the publication steps in your chosen channels.</p></li>
      </ol>
      <p className="brand-how-note">Built for a return that makes sense for your business. The potential index helps you prioritise; actual ROI needs campaign costs and sales data.</p>
    </section>
    <section className="brand-personal"><div><p className="overline">A dedicated assistant. Your own identity.</p><h2>The care of a marketing team.<br/>The character of your place.</h2></div><p>Your signature offer, your voice, your customers and your limits shape the preparation. A neighbourhood bar in New York and an aperitif spot in Paris should never sound like the same business.</p></section>
    <section className="brand-demos"><div className="section-title"><h2>See the difference for yourself.</h2><span className="status-chip">Two demo places</span></div><p className="section-intro">Fictional businesses, real public sources and campaigns shaped around each place.</p><div>{places.map(place=><Link key={place.id} className="surface brand-demo" href={`/today?merchant=${place.id}`}><span className="icon-tile"><Icon name="pin"/></span><span><strong>{place.name}</strong><small>{place.city} · Campaigns prepared for this place</small></span><Icon name="arrow" size={19}/></Link>)}</div></section>
    <details className="brand-evidence"><summary>What the data and the demo can tell you</summary><p>“Qualified” means checked for source, freshness, location or menu relevance where those data are available. Each proposal shows its supporting evidence and any uncertainty. Qloo describes taste affinities and nearby places; it does not identify individual visitors or measure live footfall.</p><p>Return on investment is the objective, not a guaranteed result. Measuring it requires actual campaign costs, sales and margins. The potential index helps prioritise ideas; it is not an ROI forecast. Example campaign KPIs are clearly labelled as fictional.</p><p>In this preview, approved plans are saved for manual sharing. Approval does not publish a message or charge a budget. Public feeds are checked when pages load. Instagram and Facebook connections require Meta setup; automatic publishing and live performance tracking are not enabled.</p><Link className="text-link" href="/account/sources">Explore the sources <Icon name="arrow" size={15}/></Link></details>
  </main>;
}
