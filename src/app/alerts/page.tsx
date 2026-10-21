import Link from "next/link";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { listAlerts } from "@/server/agent/scan";
import { whatsappConfigured } from "@/server/channels/twilio";

export const dynamic = "force-dynamic";

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ merchant?: string }> }) {
  const sp = await searchParams;
  const merchant = getMerchant(sp.merchant ?? listMerchants()[0]?.id ?? "");
  if (!merchant) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl">No place yet</h1>
        <Link href="/start" className="underline">Set up your place</Link>
      </main>
    );
  }
  const alerts = listAlerts(merchant.id);
  const live = whatsappConfigured() && Boolean(process.env.DEMO_WHATSAPP_TO);
  const every = Number(process.env.SCAN_EVERY_MIN ?? 60);
  const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
  const statusLabel: Record<string, string> = { sent: "Sent on WhatsApp", simulated: "Simulated, WhatsApp not connected", failed: "WhatsApp failed" };

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link href={`/radar?merchant=${merchant.id}`} className="text-sm" style={{ color: "var(--muted)" }}>← Radar</Link>
      <header className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Alerts · push</p>
          <h1 className="mt-1 text-4xl">What Turnout told {merchant.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
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
        <p className="card-flat mt-8 p-5 text-sm" style={{ color: "var(--muted)" }}>
          No alert yet. Run the scan: if a moment worth a campaign is coming in the next two days, the campaign is drafted and the alert appears here.
        </p>
      )}

      <section className="mt-8 space-y-4">
        {alerts.map((a) => (
          <article key={a.id} className="card p-5" style={a.status === "sent" ? { borderColor: "var(--accent)" } : undefined}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="mono text-sm" style={{ color: "var(--ink)" }}>{fmt.format(new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"))}</p>
              <p className="text-xs font-semibold" style={{ color: a.status === "failed" ? "var(--danger)" : a.status === "sent" ? "var(--ok)" : "var(--muted)" }}>
                {statusLabel[a.status] ?? a.status}{a.status === "failed" && a.to_ref ? ` · ${a.to_ref}` : ""}
              </p>
            </div>
            <div className="mt-3 max-w-md p-4 text-sm leading-relaxed" style={{ background: "var(--paper)", whiteSpace: "pre-wrap", color: "var(--text)" }}>
              {a.message}
            </div>
            {a.campaign_id && (
              <Link href={`/campaigns/${a.campaign_id}`} className="mt-3 inline-flex text-sm font-semibold underline underline-offset-4 decoration-[1.5px]" style={{ color: "var(--ink)" }}>
                Open the campaign
              </Link>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
