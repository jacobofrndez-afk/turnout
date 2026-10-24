// A US bar says "5:30 pm" and "5 to 7 pm"; a Paris bar says "17:30". Strings are "HH:MM", as stored in draft.windows.
const us = (tz: string) => tz.startsWith("America/") || tz.startsWith("US/") || tz === "Pacific/Honolulu";
export const hhmm = (t: number | Date, tz: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz }).format(t);
const say = (s: string, suffix: boolean) => { const [h, m] = s.split(":").map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${suffix ? ` ${h >= 12 ? "pm" : "am"}` : ""}`; };
const str = (t: number | Date | string, tz: string) => (typeof t === "string" ? t : hhmm(t, tz));
/** One clock, the way the merchant's city says it: "5:30 pm" in New York, "17:30" in Paris. */
export const clock = (t: number | Date | string, tz: string) => (us(tz) ? say(str(t, tz), true) : str(t, tz));
/** A range, with the am/pm said once when both ends share it: "5:30 to 7 pm", "10:45 pm to 12:15 am", "17:30 to 19:00". */
export function clockRange(a: number | Date | string, b: number | Date | string, tz: string): string {
  const sa = str(a, tz), sb = str(b, tz);
  if (!us(tz)) return `${sa} to ${sb}`;
  const same = (Number(sa.slice(0, 2)) >= 12) === (Number(sb.slice(0, 2)) >= 12);
  return `${say(sa, !same)} to ${say(sb, true)}`;
}

/** Text stored before clock.ts says "17:30" or "17:30 to 18:45"; say it the city's way. Text that already says am/pm is left alone. */
export const clockText = (s: string, tz: string) =>
  /\b[ap]m\b/i.test(s) ? s : s.replace(/\b((?:[01]\d|2[0-3]):[0-5]\d)(?: to ((?:[01]\d|2[0-3]):[0-5]\d))?\b/g, (_, a: string, b?: string) => (b ? clockRange(a, b, tz) : clock(a, tz))).replace(/\ba (8|11)\b/g, "an $1");

