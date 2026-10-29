/** Calendar dates are local to the place, never the owner's device. */
export function localDateKey(value: number | string | Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (key: string) => parts.find(p => p.type === key)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function calendarDays(now: number, timezone: string, count = 7) {
  const today = localDateKey(now, timezone);
  // Advance calendar dates at UTC noon, not 24-hour instants in a zone with DST.
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(`${today}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + i);
    return { key: date.toISOString().slice(0, 10), number: date.getUTCDate(), weekday: date.getUTCDay(), short: new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(date), label: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(date) };
  });
}
