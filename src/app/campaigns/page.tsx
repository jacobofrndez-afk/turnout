import Link from "next/link";
import { cookies } from "next/headers";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { workspaceCampaigns } from "@/server/workspace/campaigns";
import { WorkspaceContext } from "@/components/WorkspaceContext";
import { Icon } from "@/components/Icon";
import { DemoCampaignHistory } from "@/components/DemoCampaignHistory";
export const dynamic = "force-dynamic";
export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ merchant?: string; example?: string }> }) {
  const sp = await searchParams; const merchants = listMerchants(); const m = getMerchant(sp.merchant ?? (await cookies()).get("merchant")?.value ?? "m_penn_pour") ?? merchants[0];
  if (!m) return <main className="app-page"><Link href="/start">Set up your place</Link></main>;
  const all = workspaceCampaigns(m.id);
  // One card per occasion: retries on the same event sit under "Earlier versions", with legacy records and past occasions that never got a draft.
  const campaigns = all.filter(c => !c.legacy && !c.superseded && !c.stale); const earlier = all.filter(c => c.legacy || c.superseded || c.stale);
  const when = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: m.timezone });
  const created = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: m.timezone });
  const stamp = (s: string) => new Date(/[zZ]$|[+-]\d\d:\d\d$/.test(s) ? s : s.replace(" ", "T") + "Z");
  return <main className="app-page"><WorkspaceContext merchant={m} merchants={merchants} destination="/campaigns"/><header className="page-heading"><div><h1>Your campaigns</h1></div><Link className="action-button" href={`/campaigns/from-photo?merchant=${m.id}`}><Icon name="plus" size={18}/>New campaign</Link></header><div className="section-title campaign-count"><h2>{campaigns.length} {campaigns.length === 1 ? "campaign" : "campaigns"}</h2><span className="campaign-links">{m.id === "m_penn_pour" && <a className="text-link" href="#campaign-history">Past results · demo <Icon name="arrow" size={16}/></a>}<Link className="text-link" href={`/alerts?merchant=${m.id}`}>Activity <Icon name="arrow" size={16}/></Link></span></div><div className="campaign-library">{campaigns.map(c => <Link className="surface campaign-library-item" key={c.id} href={c.href}><span className="icon-tile"><Icon name={c.kind === "menu" ? "menu" : "ticket"}/></span><div><h2>{c.title}</h2><p>{c.detail}{c.date && <> · {when.format(stamp(c.date))}</>}</p><span className="status-chip">{c.status}</span>{c.versions > 0 && <small className="campaign-versions">{c.versions} earlier {c.versions === 1 ? "version" : "versions"}</small>}</div><Icon name="chevron" size={18}/></Link>)}</div>{!campaigns.length && <section className="surface empty-library"><Icon name="campaign" size={32}/><h2>Your first campaign starts here.</h2><p>Take a photo of your menu or choose an offer you already have.</p><Link className="action-button" href={`/campaigns/from-photo?merchant=${m.id}`}>Create my first draft <Icon name="arrow" size={18}/></Link></section>}<DemoCampaignHistory merchantId={m.id} expandedId={sp.example}/>{earlier.length > 0 && <details className="campaign-history"><summary>Earlier versions · {earlier.length} records</summary><p>Previous takes on the same occasions and records from before the place DNA flow. Kept for reference, not new recommendations.</p><ul>{earlier.map(c => <li key={c.id}><Link href={c.href}><strong>{c.title}</strong><span>{c.detail}</span><small>{c.status} · Created {created.format(stamp(c.createdAt))}</small></Link></li>)}</ul></details>}</main>;
}
