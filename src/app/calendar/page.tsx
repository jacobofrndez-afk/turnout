import Link from "next/link";
import { cookies } from "next/headers";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { workspaceAgenda } from "@/server/workspace/agenda";
import { WeekAgenda } from "@/components/WeekAgenda";
import { WorkspaceContext } from "@/components/WorkspaceContext";
import { Icon } from "@/components/Icon";
export const dynamic = "force-dynamic";
export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ merchant?: string; refresh?: string; date?: string; view?: string }> }) {
  const sp = await searchParams; const merchants = listMerchants(); const m = getMerchant(sp.merchant ?? (await cookies()).get("merchant")?.value ?? "m_penn_pour") ?? merchants[0];
  if (!m) return <main className="app-page"><Link href="/start">Set up your place</Link></main>;
  const data = await workspaceAgenda(m, sp.refresh === "1");
  return <main className="app-page calendar-page"><WorkspaceContext merchant={m} merchants={merchants} destination="/calendar"/><header className="page-heading"><div><p className="overline">A little ahead goes a long way</p><h1>Your calendar</h1><p>Choose a day, find a moment and prepare your campaign.</p></div><Link className="action-button secondary" href={`/today?merchant=${m.id}`}><Icon name="home"/>Back to today</Link></header><WeekAgenda full initialFilter={sp.view === "plans" ? "draft" : "all"} initialDate={sp.date} now={data.now} timezone={m.timezone} entries={data.entries} merchantId={m.id} unavailable={data.unavailable}/><div className="calendar-footer"><p>Events within {m.radius_m/1000} km · Published listings and inferred local habits. This is not an automatic publishing schedule.</p><Link className="text-link" href={`/calendar?merchant=${m.id}&refresh=1`} prefetch={false}>Refresh event listings</Link><Link className="text-link" href={`/radar?merchant=${m.id}`}>Explore the area <Icon name="arrow" size={16}/></Link></div></main>;
}
