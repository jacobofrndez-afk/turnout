import { radarFor, type Merchant } from "@/server/events/radar";
import { scheduledAgenda } from "@/server/events/agenda";
import { streetRhythm } from "@/server/qloo/rhythm";
import { sourceCheck } from "@/lib/event-evidence";
import { calendarDays, localDateKey } from "@/lib/calendar";
import { clock, hhmm } from "@/lib/clock";
import { dateFormatter } from "@/lib/date-formatter";
import { getOffers } from "@/server/qloo/crowd";
import { fitsRhythm } from "@/lib/offer-service";
import { assertOfferWindow } from "@/lib/offer-window";
import { workspaceCampaigns } from "./campaigns";
import type { AgendaEntry } from "@/components/WeekAgenda";
export async function workspaceAgenda(merchant: Merchant, refresh = false) {
  const now = Date.now();
  const [events, rhythm] = await Promise.allSettled([radarFor(merchant, 168, { refresh, scheduledOnly: true }), streetRhythm(merchant)]);
  const days = calendarDays(now, merchant.timezone);
  const dated = scheduledAgenda(events.status === "fulfilled" ? events.value : [], now).filter(i => i.distanceKm <= merchant.radius_m / 1000);
  const entries: AgendaEntry[] = dated.map(item => {
    const e = item.event; const check = sourceCheck(e.meta);
    return { id: e.id, title: e.name, detail: `${e.venue.name} · ${item.distanceKm.toFixed(1)} km`, date: localDateKey(e.startsAt, merchant.timezone), time: clock(new Date(e.startsAt), merchant.timezone), sortTime: hhmm(new Date(e.startsAt), merchant.timezone), kind: "event", href: `/today?merchant=${merchant.id}&event=${encodeURIComponent(e.id)}`, source: `Ticketmaster${check ? ` · checked ${dateFormatter("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone }).format(new Date(check.checkedAt))}${check.mode === "stored" ? " · saved source record" : ""}` : ""}`, evidence: "A published event near your place. Open it to explore the audience and suitable offers. Attendance and visits to your business are not measured." };
  });
  const offers=getOffers(merchant.id);
  const moments = rhythm.status === "fulfilled" ? rhythm.value.moments : [];
  const localHour = hhmm(now, merchant.timezone);
  for (const day of days) for (const m of moments) {
    if (!m.days.includes(day.weekday)) continue;
    if (day.key === days[0].key && m.to > m.from && m.to <= localHour) continue;
    const matchingOffer=offers.find(o=>{if(!fitsRhythm(o,m.id))return false;try{assertOfferWindow(o.description,`${day.key}T${m.from}`,`${day.key}T${m.to}`);return true;}catch{return false;}});
    entries.push({ id: `${m.id}-${day.key}`, title: m.label, detail: matchingOffer?`Menu match: ${matchingOffer.title}`:"Local context · add a suitable menu offer", date: day.key, time: `${m.from}–${m.to}`, sortTime: m.from, kind: "rhythm", href: `/campaigns/from-photo?merchant=${merchant.id}&date=${day.key}${matchingOffer?`&offer=${matchingOffer.id}&occasion=${m.id}`:""}`, source: "Qloo place descriptions & opening hours · inferred pattern, not a live crowd count", evidence: m.evidence.join(". ") });
  }
  for (const c of workspaceCampaigns(merchant.id).filter(c => !c.legacy && !c.superseded && c.date && (c.status === "Draft" || c.planned))) {
    entries.push({ id: c.id, title: c.title, detail: c.status, date: localDateKey(c.date!, merchant.timezone), time: clock(new Date(c.date!), merchant.timezone), sortTime: hhmm(new Date(c.date!), merchant.timezone), kind: "draft", href: c.href, source: c.planned ? "Your chosen campaign time. Approved plans still require manual sharing; no automatic delivery is scheduled." : "Saved campaign · shown at its associated event’s start time. No automatic delivery is scheduled." });
  }
  entries.sort((a,b) => a.date.localeCompare(b.date) || a.sortTime.localeCompare(b.sortTime));
  const leadEvent=[...dated].filter(i=>Date.parse(i.event.startsAt)<=now+48*3600000).sort((a,b)=>b.score-a.score||a.distanceKm-b.distanceKm)[0]?.event.id ?? dated[0]?.event.id;
  return { now, entries, moments, leadEvent, unavailable: events.status === "rejected" };
}
