import Link from "next/link";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { listAlerts } from "@/server/agent/scan";
import { whatsappConfigured } from "@/server/channels/twilio";

export const dynamic = "force-dynamic";

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ merchant?: string; all?: string }> }) {
  const sp = await searchParams;
  const merchant = getMerchant(sp.merchant ?? listMerchants()[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl">No place yet</h1>
        <Link href="/start" className="link">Set up your place</Link>
      </main>
    );
  }
  const live = whatsappConfigured() && Boolean(process.env.DEMO_WHATSAPP_TO);
  const every = Number(process.env.SCAN_EVERY_MIN ?? 60);
  const allAlerts = listAlerts(merchant.id);
  const alerts = sp.all ? allAlerts : allAlerts.slice(0, 6);
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: merchant.timezone });
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: merchant.timezone });
  const todayKey = dayKey.format(new Date());
  const sentAs = live ? "sent" : "simulated";
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
  const statusLabel: Record<string, string> = { sent: "Sent on WhatsApp", simulated: "Simulated, WhatsApp not connected", failed: "WhatsApp failed" };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="max-w-3xl">
        <Link href={`/radar?merchant=${merchant.id}`} className="link text-sm">Back to the radar</Link>
        <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Alerts</p>
            <h1 className="t-title mt-2">What Turnout told {merchant.name}</h1>
            <p className="mt-4 text-base text-[var(--muted)]">
              {every > 0 ? `Every ${every} minutes` : "When asked"}, Turnout scans the radar, drafts the campaign for the strongest new moment and sends this message.{" "}
              {live ? "WhatsApp is connected: messages go to the demo number." : "WhatsApp is not connected yet, so messages are recorded here instead of sent."}
            </p>
          </div>
          <form action="/api/scan" method="post">
            <input type="hidden" name="merchant" value={merchant.id} />
            <button className="btn btn-accent">Run the scan now</button>
          </form>
        </header>

        {alerts.length === 0 && (
          <div className="empty stack-block"><p className="empty-title">No alert yet</p><p>Run the scan: if a moment worth a campaign is coming in the next two days, the campaign is drafted and the alert appears here.</p></div>
        )}

        <section className="stack-block space-y-16">
          {alerts.map((a, i) => {
            const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z");
            return (
              <article key={a.id} className={i === 0 ? "tone" : undefined}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="t-clock text-[var(--ink)]">{fmt.format(at)}</p>
                  {a.status !== sentAs && (
                    <p className={a.status === "failed" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--muted)]"}>
                      {statusLabel[a.status] ?? a.status}{a.status === "failed" && a.to_ref ? ` · ${a.to_ref}` : ""}
                    </p>
                  )}
                </div>
                <div className="measure mt-4 whitespace-pre-wrap text-base text-[var(--text)]">
                  {(() => {
                    const text = a.message
                      .replace(/\nReview and approve:[\s\S]*$/, "")
                      .replace(/^Turnout for [^\n]*\n/, "")
                      .replace(/\nThe agent is writing the campaign now\./, "");
                    return dayKey.format(at) === todayKey ? text : text.replace(/^Today /, `${weekday.format(at)} `);
                  })()}
                </div>
                {a.campaign_id && (
                  <Link href={`/campaigns/${a.campaign_id}`} className="link mt-4 inline-flex text-base">
                    Open the campaign
                  </Link>
                )}
              </article>
            );
          })}
        </section>
        {!sp.all && allAlerts.length > alerts.length && (
          <Link href={`/alerts?merchant=${merchant.id}&all=1`} className="link stack-block inline-flex text-base">Show older alerts</Link>
        )}
      </div>
    </main>
  );
}
