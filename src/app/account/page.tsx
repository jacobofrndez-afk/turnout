import Link from "next/link";
import { cookies } from "next/headers";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { getDna } from "@/server/merchants/dna";
import { getOffers } from "@/server/qloo/crowd";
import { CHANNELS, VOICES, GOALS } from "@/lib/place-dna";
import { WorkspaceContext } from "@/components/WorkspaceContext";
import { AccountChannels } from "@/components/AccountChannels";
import { Icon } from "@/components/Icon";
export const dynamic = "force-dynamic";
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ merchant?: string; channelNotice?: string; channelSelection?: string }> }) {
  const sp = await searchParams; const merchants = listMerchants(); const m = getMerchant(sp.merchant ?? (await cookies()).get("merchant")?.value ?? "m_penn_pour") ?? merchants[0];
  if (!m) return <main className="app-page"><Link href="/start">Set up your place</Link></main>;
  const dna = getDna(m.id); const p = dna.profile; const offers = getOffers(m.id); const q = `?merchant=${m.id}`;
  return <main className="app-page account-page"><WorkspaceContext merchant={m} merchants={merchants} destination="/account"/>
    <header className="page-heading"><div><h1>Your account</h1></div><nav className="account-nav" aria-label="Account sections"><a href="#channels">Channels</a><a href="#dna">Place DNA</a><a href="#preferences">Preferences</a><a href="#sources">Sources</a><a href="#offers">Offers</a></nav></header>
    <div className="account-overview">
      <section className="surface account-section" id="place"><h2><Icon name="pin"/>Your place</h2><p><strong>{m.name}</strong><br/>{m.address ?? m.city}</p><p className="muted">{m.timezone.replaceAll("_", " ")} · {m.radius_m / 1000} km local radius</p><p className="account-note">{["m_penn_pour", "m_quai_bercy"].includes(m.id) ? "Fictional demo business. Switch places above to compare." : "Your saved business details."}</p></section>
      <section className="surface account-section" id="plan"><h2><Icon name="wallet"/>Your plan</h2><p><strong>Demo access</strong><br/>No payment required</p><p className="account-note">Publishing and billing stay manual. Nothing is charged from this account.</p></section>
    </div>
    <AccountChannels merchant={m.id} merchantName={m.name} noticeCode={sp.channelNotice} selectionId={sp.channelSelection}/>
    <div className="account-grid">
      <section className="surface account-dna" id="dna"><div className="section-title"><h2><Icon name="spark"/>Place DNA</h2><span className="status-chip">{dna.status === "suggested" ? "To review" : "Saved"} · v{dna.version}</span></div><h3>{m.name}</h3><p className="account-positioning">{p.positioning}</p><dl className="account-facts"><div><dt>Your voice</dt><dd>{VOICES[p.voice]}</dd></div><div><dt>Your focus</dt><dd>{GOALS[p.goal]}</dd></div><div><dt>Who you want to welcome</dt><dd>{p.audience}</dd></div></dl><blockquote>“{p.exampleLine}”</blockquote><div className="account-actions"><Link className="action-button" href={`/dna${q}`}>Edit my DNA <Icon name="arrow" size={17}/></Link><Link className="text-link" href={`/dna/campaigns${q}`}>Preview a campaign</Link></div><p className="account-note">Your DNA evolves with the changes you choose to keep. Each saved campaign keeps its original version.</p></section>
      <section className="surface account-section" id="preferences"><h2><Icon name="settings"/>Campaign preferences</h2><div className="channel-tags">{p.channels.map(c => <span key={c}>{CHANNELS[c]}</span>)}</div><p>{p.leadMinutes} min to prepare · {p.channels.includes("geofenced_ad") ? `US$${p.dailyBudgetUsd}/day ad ceiling` : "No paid media selected"}</p><p className="account-note">These preferences guide your drafts. Manage account access in Your channels above. Publishing and billing remain manual.</p><Link className="text-link" href={`/dna${q}&step=3`}>Edit preferences <Icon name="arrow" size={16}/></Link></section>
      <section className="surface account-sources" id="sources"><span className="icon-tile"><Icon name="voice"/></span><div><h2>Discovery sources</h2><p>Local agendas, search trends and the public voices you choose to follow.</p></div><Link className="action-button secondary" href={`/account/sources${q}`}>Manage sources <Icon name="arrow" size={16}/></Link></section>
      <section className="surface account-offers" id="offers"><div className="section-title"><h2><Icon name="menu"/>Your offers</h2><Link className="text-link" href={`/campaigns/from-photo${q}`}><Icon name="camera" size={17}/>Start from a photo</Link></div><ul>{offers.map(o => <li key={o.id}><div><strong>{o.title}</strong>{o.id === p.signatureOfferId && <span className="status-chip">Signature</span>}<p>{o.description}</p></div><span className="offer-price">{o.price}</span><Link aria-label={`Create a campaign for ${o.title}`} className="offer-action" href={`/campaigns/from-photo${q}&offer=${encodeURIComponent(o.id)}`}><Icon name="arrow" size={18}/></Link></li>)}</ul></section>
    </div>
  </main>;
}
