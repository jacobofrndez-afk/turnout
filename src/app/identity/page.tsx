import { BRAND } from "@/lib/brand-copy";
import Link from "next/link";
import { Mark, Wordmark } from "@/components/Logo";
import { markDrawing, SWEEP_STOPS, FIELD_OPACITY } from "@/components/logo-geometry";
import "./identity.css";

export const metadata = { title: "Turnout — Door & radar" };

function DoorPlan() {
  const m = markDrawing(144);
  return <svg viewBox="0 0 144 144" width="144" height="144" shapeRendering="geometricPrecision" aria-hidden="true"><path d={m.ringShapes[0]} fill="#927798"/><path d={m.structure} fill="currentColor"/></svg>;
}
function RadarScope() {
  return <svg viewBox="0 0 144 144" width="144" height="144" shapeRendering="geometricPrecision" aria-hidden="true">
    <defs><linearGradient id="radar-explainer-sweep" gradientUnits="userSpaceOnUse" x1="72" y1="72" x2="109.67" y2="93.75">{SWEEP_STOPS.map(s => <stop key={s.offset} offset={s.offset} stopColor="var(--wine)" stopOpacity={s.opacity}/>)}</linearGradient></defs>
    <circle cx="72" cy="72" r="57" fill="var(--wine)" fillOpacity={FIELD_OPACITY}/>
    <path d="M72 72H130A58 58 0 0 0 101 21.77053Z" fill="url(#radar-explainer-sweep)"/>
    <g fill="none" stroke="#927798" strokeWidth="1">{[58,38,18].map(r => <circle key={r} cx="72" cy="72" r={r}/>)}</g>
    <path d="M70.70096 71.25L100.45096 21.45355L101.317 21.95355L73.29904 72.75Z" fill="currentColor"/><circle cx="72" cy="72" r="2" fill="currentColor"/><circle cx="109" cy="89" r="6" fill="var(--wine)"/>
  </svg>;
}

export default function IdentityPage() {
  return <main className="identity-page mx-auto max-w-6xl px-5 py-10" lang="en">
    <div className="identity-heading"><div><p className="t-label">Turnout · Identity</p><h1 className="t-display mt-4">Door &amp; radar.</h1></div><Link href="/today?merchant=m_penn_pour" className="link">View in the app →</Link></div>
    <p className="identity-intro t-lead">An architect’s door plan meets a radar scan. One pivot, one shared movement.</p>

    <section className="identity-signature" aria-label="Turnout signature">
      <Wordmark size={144} phone={52} />
      <p>{BRAND.tagline}</p>
    </section>
    <div className="identity-variants">
      <section className="identity-reverse" aria-label="Reverse version"><Wordmark size={78} phone={48} tone="reverse"/><p>Aubergine · Ivory · Rose signal</p></section>
      <section className="identity-mono" aria-label="One-colour version"><Mark size={120} tone="mono"/><p>The geometry also works in one colour.</p></section>
    </div>

    <section className="identity-section">
      <h2 className="t-title">Two ideas. One mark.</h2>
      <div className="identity-construction">
        <article><div className="identity-drawing"><DoorPlan/></div><p className="identity-number">01 · The door</p><h3>Drawn like an architectural plan.</h3><p>Two walls, an opening and a door leaf. The outer arc traces the swing of the door.</p></article>
        <article><div className="identity-drawing"><RadarScope/></div><p className="identity-number">02 · The radar</p><h3>Range, sweep and signal.</h3><p>Concentric rings, a clear needle and a detected point. A fading trail follows the sweep.</p></article>
        <article><div className="identity-drawing"><Mark size={144}/></div><p className="identity-number">03 · The connection</p><h3>The door leaf becomes the needle.</h3><p>Both share a pivot. Radar rings fill the space opened by the door. The point marks a nearby opportunity.</p></article>
      </div>
    </section>

    <section className="identity-section identity-transparency">
      <div><h2 className="t-title">Transparent by design.</h2><p className="t-body mt-4">A translucent tint fills the entire arc. The sweep grows stronger behind the tapered needle, while the background shows through.</p></div>
      <div className="identity-checkerboard" aria-label="Logo on a transparency grid"><Mark size={192}/></div>
    </section>

    <section className="identity-section identity-comparison">
      <div><p className="t-label">Before</p><div className="identity-old"><img src="/brand/previous-lockup.svg" alt="Previous Turnout logo with a thin arc and condensed lettering" width="240" height="70"/></div><p>A fine symbol paired with tightly condensed lettering.</p></div>
      <div><p className="t-label">Now</p><div className="identity-new"><Wordmark size={52} phone={48}/></div><p>Geometric lettering drawn for Turnout. Subtle 60° cuts on both t crossbars echo the radar needle.</p></div>
    </section>

    <section className="identity-section">
      <h2 className="t-title">From favicon to storefront.</h2>
      <p className="t-body mt-4">At the smallest sizes, one ring is removed and the strokes gain weight. The door, sweep and signal remain clear.</p>
      <div className="identity-sizes">{[16, 24, 32, 48, 64, 96].map(size => <div key={size}><span><Mark size={size}/></span><p>{size} px</p></div>)}</div>
      <div className="identity-app-header"><Wordmark size={44} phone={34}/><div><span>Today</span><span>Explore</span></div></div>
      <p className="t-small mt-3 text-[var(--muted)]">A steady mark in the app header, with a distinct silhouette at every size.</p>
    </section>
    <section className="identity-section identity-downloads">
      <div><h2 className="t-title">The identity files.</h2><p className="t-body mt-3">Transparent SVG and PNG files. Lettering included, with no fonts to install.</p></div>
      <div><a href="/brand/lockup.svg" download className="link">Full logo · SVG ↓</a><a href="/brand/mark.svg" download className="link">Symbol · SVG ↓</a><a href="/brand/mark-mono.svg" download className="link">One colour · SVG ↓</a><a href="/brand/lockup-reverse.svg" download className="link">Reverse · SVG ↓</a><a href="/brand/lockup.png" download className="link">Full logo · PNG ↓</a><a href="/brand/mark.png" download className="link">Symbol · PNG ↓</a></div>
    </section>
  </main>;
}
