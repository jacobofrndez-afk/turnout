import Link from "next/link";
import { Icon, type IconName } from "@/components/Icon";
import { demoCampaignHistory, campaignKpis, type DemoCampaign } from "@/lib/demo-campaign-history";
import { CHANNELS } from "@/lib/place-dna";

const dateLabel = (date: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
const money = (value: number, decimals = 0) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
const number = (value: number) => new Intl.NumberFormat("en-US").format(value);
const percent = (value: number | null) => value === null ? "—" : new Intl.NumberFormat("en-US", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
const costLabel = (value: number | null) => value === null ? "—" : money(value, 2);
const outcomeClass = (campaign: DemoCampaign) => campaign.outcome === "Needs a rethink" ? "history-outcome needs-rethink" : "history-outcome";

function Kpi({ label, value, note, icon }: { label: string; value: string; note: string; icon: IconName }) {
  return <div><dt><Icon name={icon} size={16}/>{label}</dt><dd>{value}</dd><small>{note}</small></div>;
}

function CampaignResults({ campaign }: { campaign: DemoCampaign }) {
  const k = campaignKpis([campaign]);
  return <section className="history-campaign-kpis" aria-label={`Simulated KPIs for ${campaign.title}`}>
    <p className="overline">Campaign KPIs · simulated</p>
    <dl>
      <div><dt>Offer revenue</dt><dd>{money(k.offerRevenueUsd)}</dd></div>
      <div><dt>Offers redeemed</dt><dd>{number(k.redemptions)}</dd></div>
      <div><dt>Media spend</dt><dd>{money(k.spendUsd)}</dd></div>
      <div><dt>Media / redemption</dt><dd>{costLabel(k.mediaCostPerRedemptionUsd)}</dd></div>
      <div><dt>Digital reach</dt><dd>{number(campaign.digital.reach)}</dd></div>
      <div><dt>Digital impressions</dt><dd>{number(k.impressions)}</dd></div>
      <div><dt>Link clicks</dt><dd>{number(k.clicks)}</dd></div>
      <div><dt>Click-through rate</dt><dd>{percent(k.ctr)}</dd></div>
    </dl>
    <p>Revenue = {number(k.redemptions)} offers × {money(campaign.offerPriceUsd)}. Media / redemption includes paid and unpaid channels. Digital metrics exclude the chalkboard.</p>
  </section>;
}

export function DemoCampaignHistory({ merchantId, compact = false, expandedId }: { merchantId: string; compact?: boolean; expandedId?: string }) {
  const campaigns = demoCampaignHistory(merchantId);
  if (!campaigns.length) return null;
  const k = campaignKpis(campaigns);
  const base = `/campaigns?merchant=${encodeURIComponent(merchantId)}`;
  return <section id={compact ? "recent-campaign-results" : "campaign-history"} className={`demo-campaign-history${compact ? " history-compact" : ""}`} aria-label="Demo campaign history">
    <div className="section-title"><h2><Icon name="campaign"/>{compact ? "Recent campaign results" : "Campaign history"}</h2>{compact ? <Link className="text-link" href={`${base}#campaign-history`}>View all {campaigns.length}<Icon name="arrow" size={16}/></Link> : <span className="history-demo-badge">Demo history</span>}</div>
    <p className="history-disclosure">Fictional campaigns and KPIs for Penn & Pour. No actual sends, charges or measured visits.</p>
    <div className="history-performance">
      <div className="history-performance-heading"><span>{campaigns.length} completed campaigns · 9–23 Oct 2026</span><span>Simulated · USD</span></div>
      <dl className="history-kpi-grid" aria-label="Simulated campaign performance">
        <Kpi label="Offer revenue" value={money(k.offerRevenueUsd)} note="Redeemed offers × offer price" icon="wallet"/>
        <Kpi label="Offers redeemed" value={number(k.redemptions)} note="Across paid & unpaid channels" icon="ticket"/>
        <Kpi label="Media spend" value={money(k.spendUsd)} note="Advertising budget used" icon="campaign"/>
        <Kpi label="Media / redemption" value={costLabel(k.mediaCostPerRedemptionUsd)} note="Media spend ÷ offers redeemed" icon="arrow"/>
      </dl>
      <div className="history-digital-strip" aria-label="Simulated digital engagement"><span><strong>{number(k.impressions)}</strong> digital impressions</span><span><strong>{number(k.clicks)}</strong> link clicks</span><span><strong>{percent(k.ctr)}</strong> click-through rate</span></div>
    </div>
    <details className="history-kpi-definitions"><summary>What these KPIs mean</summary>
      <div><p><strong>Offer revenue</strong> is the sum of redeemed offers at their advertised price, excluding extra purchases, tax and tips. It is not profit or proven additional revenue. One redemption can cover a two-drink offer; it does not mean one new customer.</p><p><strong>Media / redemption</strong> divides total ad spend by all offer redemptions, including unpaid channels. It is a blended media-cost indicator, not customer acquisition cost. Product costs, staff time and subscription fees are excluded.</p><p><strong>Click-through rate</strong> = link clicks ÷ digital impressions. The total uses combined counts, not an average of campaign rates. Reach is shown per campaign only; people may overlap across channels and campaigns. Chalkboard views are not counted, and redemptions are not assumed to come from link clicks.</p><p>All figures are invented for this demo. There is no connected ad report, till or attribution source behind them.</p></div>
    </details>
    {compact ? <div className="history-preview-grid">{campaigns.slice(0, 3).map(c => {
      const result = campaignKpis([c]);
      return <Link className="history-preview" href={`${base}&example=${c.id}#${c.id}`} key={c.id}>
        <div className="history-preview-top"><span className={`history-icon history-icon-${c.icon}`}><Icon name={c.icon} size={19}/></span><span>{dateLabel(c.date)} · Demo</span><Icon name="chevron" size={16}/></div>
        <h3>{c.title}</h3><p>{c.occasion} · {c.window}</p>
        <div className="history-preview-results"><span><strong>{money(result.offerRevenueUsd)}</strong> offer revenue</span><span><strong>{c.redemptions}</strong> offers redeemed</span></div>
        <p className="history-preview-cost">{money(c.spendUsd)} media · {costLabel(result.mediaCostPerRedemptionUsd)} / redemption</p><span className={outcomeClass(c)}>{c.outcome}</span>
      </Link>;
    })}</div> : <div className="history-timeline">{campaigns.map(c => {
      const result = campaignKpis([c]);
      return <details className="history-entry" key={c.id} id={c.id} open={expandedId === c.id}>
        <summary><span className={`history-icon history-icon-${c.icon}`}><Icon name={c.icon}/></span><span className="history-entry-heading"><span>{dateLabel(c.date)} · {c.occasion} · Completed demo</span><strong>{c.title}</strong><small>{c.channels.map(ch => CHANNELS[ch]).join(" · ")}</small></span><span className="history-entry-metrics"><span><b>{money(result.offerRevenueUsd)}</b> offer revenue</span><span>{c.redemptions} redemptions · {money(c.spendUsd)} media</span></span><span className={outcomeClass(c)}>{c.outcome}</span><span className="history-entry-caret"><Icon name="chevron" size={16}/></span></summary>
        <CampaignResults campaign={c}/>
        <div className="history-entry-body"><div><p className="overline">The message</p><blockquote>{c.message}</blockquote><dl className="history-facts"><div><dt>Offer</dt><dd>{c.offer}</dd></div><div><dt>When</dt><dd>{dateLabel(c.date)} 2026 · {c.window}<small>America/New_York</small></dd></div><div><dt>Channels</dt><dd>{c.channels.map(ch => CHANNELS[ch]).join(" · ")}</dd></div><div><dt>Simulated media spend</dt><dd>{money(c.spendUsd)}</dd></div></dl></div><aside><p className="overline">The idea behind it</p><p>{c.reason}</p><div className="history-learning"><Icon name="spark" size={18}/><div><h3>What to try next</h3><p>{c.takeaway}</p></div></div><p className="history-metric-note">Illustrative learning only. This demo does not update your place DNA or today’s potential index.</p><Link className="text-link" href={`/campaigns/from-photo?merchant=${encodeURIComponent(merchantId)}&offer=${encodeURIComponent(c.offerId)}`}>Use this offer again<Icon name="arrow" size={16}/></Link></aside></div>
      </details>;
    })}</div>}
  </section>;
}
