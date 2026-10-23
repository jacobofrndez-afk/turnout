import Link from "next/link";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { listAlerts } from "@/server/agent/scan";
import { getCampaign } from "@/server/agent/run";
import { whatsappConfigured } from "@/server/channels/twilio";

export const dynamic = "force-dynamic";

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ merchant?: string; all?: string }> }) {
  const sp = await searchParams;
  const merchant = getMerchant(sp.merchant ?? listMerchants()[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="t-title">No place yet</h1>
        <Link href="/start" className="link mt-6 inline-flex text-base">Set up your place</Link>
      </main>
    );
  }
  const live = whatsappConfigured() && Boolean(process.env.DEMO_WHATSAPP_TO);
  const allAlerts = listAlerts(merchant.id);
  const alerts = sp.all ? allAlerts : allAlerts.slice(0, 6);
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: merchant.timezone });
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: merchant.timezone });
  const todayKey = dayKey.format(new Date());
  const sentAs = live ? "sent" : "simulated";
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
  const statusLabel: Record<string, string> = { sent: "Sent on WhatsApp", simulated: "Kept here, WhatsApp not connected", failed: "WhatsApp failed" };

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="max-w-3xl">
        <Link href={`/today?merchant=${merchant.id}`} className="link text-base">Today</Link>
        <h1 className="t-display mt-6">What Turnout did on its own</h1>
        <p className="t-lead mt-5">Every hour Turnout looks for a crowd worth a campaign, writes it and tells you.</p>
        <form action="/api/scan" method="post" className="mt-4">
          <input type="hidden" name="merchant" value={merchant.id} />
          <button className="link text-base">Look for a crowd now</button>
        </form>

        {alerts.length === 0 && (
          <div className="empty stack-block">
            <p className="empty-title">Nothing yet</p>
            <p>When a crowd worth a campaign is coming in the next two days, Turnout writes the campaign and tells you here.</p>
          </div>
        )}

        <section className="stack-block space-y-12">
          {alerts.map((a) => {
            const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z");
            const clean = a.message
              .replace(/\n(Review and approve|See it on your radar):[\s\S]*$/, "")
              .replace(/^Turnout for [^\n]*\n/, "")
              .replace(/\nThe agent is writing the campaign now\./, "")
              .replace(/, 100% of your (\d+) seats\./, ", enough to fill your $1 seats.");
            const text = dayKey.format(at) === todayKey ? clean : clean.replace(/^Today /, `${weekday.format(at)} `);
            const [first = "", ...rest] = text.split("\n");
            const when = first.split(": ")[0];
            const what = first.slice(when.length + 2).split(", about ")[0];
            const tail = what ? first.slice(when.length + 2 + what.length + 2) : first;
            const camp = a.campaign_id ? getCampaign(a.campaign_id) : undefined;
            const unwritten = camp?.status === "awaiting_operator" && Date.now() - Date.parse(camp.created_at.replace(" ", "T") + "Z") > 15 * 60_000;
            const href = unwritten ? `/campaigns/new?merchant=${merchant.id}&event=${a.event_id}` : a.campaign_id ? `/campaigns/${a.campaign_id}` : `/radar?merchant=${merchant.id}`;
            return (
              <article key={a.id}>
                <p className="t-body">
                  <span className="t-clock text-[var(--muted)]">{fmt.format(at)}</span>
                  {what && <> · <span className="font-semibold text-[var(--ink)]">{what}</span></>}
                </p>
                <p className="t-body mt-2">
                  {what ? `${when} · ${tail}` : tail} {rest.join(" ")}
                </p>
                {a.status !== sentAs && (
                  <p className={a.status === "failed" ? "t-body mt-2 text-[var(--danger)]" : "t-body mt-2 text-[var(--muted)]"}>
                    {statusLabel[a.status] ?? a.status}{a.status === "failed" && a.to_ref ? `: ${a.to_ref}` : ""}
                  </p>
                )}
                {unwritten && <p className="t-body mt-2 text-[var(--muted)]">Not written yet.</p>}
                <Link href={href} className="link mt-3 inline-flex text-base">
                  {unwritten ? "See who is coming" : a.campaign_id ? "See the campaign" : "Explore the map"}
                </Link>
              </article>
            );
          })}
        </section>
        {!sp.all && allAlerts.length > alerts.length && (
          <Link href={`/alerts?merchant=${merchant.id}&all=1`} className="link stack-block inline-flex text-base">Show older alerts</Link>
        )}
        <p className="t-body stack-block text-[var(--muted)]">
          {live ? "WhatsApp is connected: each message also goes to the demo number." : "WhatsApp is not connected yet, so the messages are kept here instead of sent."}
        </p>
      </div>
    </main>
  );
}
