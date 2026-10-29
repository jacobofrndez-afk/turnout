import { recentlyChecked } from "@/lib/event-evidence";
import { isCrowdEvent } from "./concentration";
import type { RadarItem } from "./radar";

// The agenda is ordered by the published start time, never by a prepared demo campaign or a guessed headcount.
export function scheduledAgenda(items: RadarItem[], now = Date.now()): RadarItem[] {
  return items.filter(({ event }) =>
    (event.origin ?? "ticketmaster") === "ticketmaster" &&
    recentlyChecked(event.meta, now) && isCrowdEvent(event) &&
    !["cancelled", "canceled", "postponed"].includes(event.status?.toLowerCase() ?? "") &&
    Date.parse(event.startsAt) >= now,
  ).sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt) || a.distanceKm - b.distanceKm || a.event.id.localeCompare(b.event.id));
}
