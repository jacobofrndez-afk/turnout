import { getDb } from "@/server/db/client";
import Link from "next/link";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { listAlerts } from "@/server/agent/scan";
import { getCampaign, provider } from "@/server/agent/run";
import { whatsappConfigured } from "@/server/channels/twilio";
import { clock, clockText } from "@/lib/clock";
import { nb } from "@/lib/nbsp";
import { WorkspaceContext } from "@/components/WorkspaceContext";
import { Icon } from "@/components/Icon";

export const dynamic = "force-dynamic";

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ merchant?: string; all?: string }> }) {
  const sp = await searchParams;
  const merchants = listMerchants();
  const merchant = getMerchant(sp.merchant ?? merchants[0]?.id ?? "");
  if (!merchant) return <main className="app-page"><Link href="/start">Set up your place</Link></main>;
  const quickDrafts = getDb().prepare("SELECT id,input_json,created_at FROM quick_campaigns WHERE merchant_id=? ORDER BY created_at DESC, rowid DESC LIMIT 12").all(merchant.id) as { id: string; input_json: string; created_at: string }[];
  const live = whatsappConfigured() && Boolean(process.env.DEMO_WHATSAPP_TO);
  const allAlerts = listAlerts(merchant.id);
  const alerts = sp.all ? allAlerts : allAlerts.slice(0, 6);
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: merchant.timezone });
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: merchant.timezone });
  const todayKey = dayKey.format(new Date());
  const sentAs = live ? "sent" : "simulated";
  const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });
  const statusLabel: Record<string, string> = { sent: "Sent on WhatsApp", simulated: "Kept here · WhatsApp not connected", failed: "WhatsApp failed" };
  const q = `?merchant=${merchant.id}`;

  return <main className="app-page activity-page"><WorkspaceContext merchant={merchant} merchants={merchants} destination="/alerts"/>
    <header className="page-heading"><div><h1>Activity</h1></div><form action="/api/scan" method="post"><input type="hidden" name="merchant" value={merchant.id}/><button className="action-button secondary"><Icon name="spark" size={16}/>Look for a crowd now</button></form></header>
    <p className="section-intro">Every hour Turnout looks for the crowds worth a campaign near you. Each find is listed here with what it prepared.</p>
    {alerts.length === 0 && quickDrafts.length === 0 && <section className="surface empty-library"><Icon name="campaign" size={32}/><h2>Nothing yet</h2><p>When a crowd worth a campaign is coming in the next two days, Turnout finds it and lists it here.</p></section>}
    <ul className="activity-list">{alerts.map((a) => {
      const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z");
      const clean = clockText(a.message, merchant.timezone)
        .replace(/\n(Review and approve|See it on your radar):[\s\S]*$/, "")
        .replace(/^Turnout for [^\n]*\n/, "")
        .replace(/\nThe agent is writing the campaign now\./, "")
        .replace(/, 100% of your (\d+) seats\./, ", enough to fill your $1 seats.");
      const text = dayKey.format(at) === todayKey ? clean : clean.replace(/^Today /, `${weekday.format(at)} `);
      const [first = "", ...rest] = text.split("\n");
      const when = first.split(": ")[0];
      const what = first.slice(when.length + 2).split(", about ")[0];
      const tail = what ? first.slice(when.length + 2 + what.length + 2) : first;
      // A tour title ("Harry Styles: Together, Together at MSG") reads as the act, as on Today.
      const name = what.replace(/^([^:]*[^\d:]): .*? at /, "$1 at ").replace(/, \d+ shows$/, "");
      const camp = a.campaign_id ? getCampaign(a.campaign_id) : undefined;
      const unwritten = camp?.status === "awaiting_operator" && (provider() === "operator" || Date.now() - Date.parse(camp.created_at.replace(" ", "T") + "Z") > 15 * 60_000);
      const href = unwritten ? `/campaigns/new?merchant=${merchant.id}&event=${a.event_id}` : a.campaign_id ? `/campaigns/${a.campaign_id}${q}` : `/radar${q}`;
      return <li key={a.id} className="surface activity-item"><span className="icon-tile"><Icon name={a.campaign_id ? "campaign" : "pin"}/></span><div><small className="activity-when">{fmtDay.format(at)} · {clock(at, merchant.timezone)}</small>{what && <h2>{name}</h2>}<p>{nb(`${what ? `${when} · ${tail}` : tail} ${rest.join(" ")}`)}</p><div className="activity-foot">{a.status !== sentAs && <span className={`status-chip${a.status === "failed" ? " chip-danger" : ""}`}>{statusLabel[a.status] ?? a.status}{a.status === "failed" && a.to_ref ? `: ${a.to_ref}` : ""}</span>}{unwritten && <span className="status-chip">Needs a completed draft</span>}<Link className="text-link" href={href}>{unwritten ? "See who is coming" : a.campaign_id ? "See the campaign" : "Explore the map"} <Icon name="arrow" size={15}/></Link></div></div></li>;
    })}</ul>
    {!sp.all && allAlerts.length > alerts.length && <Link href={`/alerts${q}&all=1`} className="quiet-button calendar-more">Show older activity · {allAlerts.length - alerts.length} more</Link>}
    {quickDrafts.length > 0 && <section className="activity-drafts"><div className="section-title"><h2><Icon name="camera"/>Your menu & photo drafts</h2><span>Saved for manual use · nothing published or scheduled</span></div><ul className="activity-list">{quickDrafts.map((d) => { const input = JSON.parse(d.input_json) as { offer?: { title?: string }; availability?: string }; return <li key={d.id} className="surface activity-item"><span className="icon-tile"><Icon name="menu"/></span><div><small className="activity-when">{fmtDay.format(new Date(d.created_at.replace(" ", "T") + "Z"))}</small><h2>{input.offer?.title ?? "Menu campaign"}</h2><p>{input.availability ?? "Your menu"}</p><div className="activity-foot"><Link className="text-link" href={`/campaigns/quick/${d.id}${q}`}>Open the draft <Icon name="arrow" size={15}/></Link></div></div></li>; })}</ul></section>}
    <p className="calendar-note">{live ? "WhatsApp is configured for the demo number. Nothing is sent without your approval." : "WhatsApp is not connected, so messages are kept here instead of sent."}</p>
  </main>;
}
