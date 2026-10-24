# One path, round 6: fixes for the build session

After 26d9a64 every screen was re-rendered at 1440 and 390 (`.tmp/onepath/r6/`, captured at 7:56 pm New York) and judged structure first. Scores: clarity 7 (up from 6.5), founder lens 6.5 (up from 6), type 8 (up from 7.5). Who is coming is now the clearest screen (8.5): one name, "about 100 guests", one button above the fold. The money line is honest. The rule book holds: titles, eyebrows, one primary per screen.

What holds clarity at 7 is the clock, not the layout. At 7:56 pm Today still pushes a pre-show happy hour "until 7 pm", and one Publish sends it. From 8 pm the show drops out of Today and Explore, so Today headlines a 38-guest TV game and the ready Harry Styles campaign cannot be reached. The three-second judge: fix the two clock issues and the WhatsApp sentence and the product reads at 8 or more. The founder judge adds the tour-title display and the two clocks on one screen.

Type: keep every token (the judge measured 121 / 36 / 21 / 17 at 1440, 56 / 30 / 19 / 17 at 390, rhythm right). No design change this round. The two items a skeptic filed as design (#4, #17) are rule-book and page decisions, so they are yours.

Each issue was confirmed by a separate skeptic; the fix text is the skeptic's corrected version. Duplicates are marked.

## 1. The clock: nothing expired, nothing missing, one way to write time (fix first)

### #0 [blocker] today + campaign
**BLOCKER. Publish is offered after the offer's window closed. #1 is the same: apply this one.**

Where: src/app/today/page.tsx:127 (plate condition) and :10 (imports); src/app/campaigns/[id]/page.tsx:62-64, :103, :106-108, :159; src/app/api/campaigns/[id]/approve/route.ts:15; secondary: src/server/agent/prompt.ts:57 (timeWindows feeds closed windows to the rewrite)

Problem: Publish is offered for a campaign whose first window has already closed. The plate says "Your pre-show happy hour is ready" after the pre-show window ended. One click sends regulars "Come early: two cocktails for $16 until 7 pm" at 8 pm and starts a 36-hour ad headlined "Two cocktails before Harry".

Fix:

The proposed Today fix is broken. `campaignWindows(next.event as never)` gets a TmEvent, whose fields are startsAt and windowStart, but campaignWindows reads starts_at and window_start. The result is NaN, so `NaN > now` is always false and NO draft would ever get the Publish plate (checked in node: NaN false). Use the DB EventRow instead.

1) src/app/today/page.tsx:10
old: `import { getOffers } from "@/server/qloo/crowd";`
new: `import { getEvent, getOffers } from "@/server/qloo/crowd";
import { campaignWindows } from "@/server/agent/prompt";`
After line 78 (`const draft = ...`) add:
`// Words written for the first window ("until 7 pm") must not be offered once it has closed: the plate falls back to the crowd and "Write my campaign".
const campaignEvent = campaign ? getEvent(campaign.event_id) : undefined;
const draftLive = !!campaignEvent && campaignWindows(campaignEvent)[0].end > now;`
Line 127
old: `{next && w0 && campaign?.status === "drafted" && draft ? (`
new: `{next && w0 && campaign?.status === "drafted" && draft && draftLive ? (`
(A stale drafted row then reaches the last else branch, the "Write my campaign" form.)

2) src/app/campaigns/[id]/page.tsx:63-64
old: `const lastWindowEnd = Math.max(...campaignWindows(event).map((w) => w.end));
  const nightOver = campaign.status === "drafted" && lastWindowEnd < now;`
new: `const wins = campaignWindows(event);
  const lastWindowEnd = Math.max(...wins.map((w) => w.end));
  const nightOver = campaign.status === "drafted" && lastWindowEnd < now;
  const firstOver = campaign.status === "drafted" && !nightOver && wins[0].end < now;`
Line 103
old: `{campaign.status === "drafted" && !nightOver && (`
new: `{campaign.status === "drafted" && !nightOver && !firstOver && (`
After line 108 add:
`{firstOver && (<><p className="t-body mt-10">{wins[0].label} closed at <span className="mono">{clock(wins[0].end, tz)}</span>. These words were written for it, so they stay here.{wins.length > 1 ? ` The crowd comes out at ${clock(wins[wins.length - 1].start, tz)}.` : ""}</p><form action="/api/campaigns" method="post" className="mt-6"><input type="hidden" name="merchant" value={merchant.id} /><input type="hidden" name="event" value={event.id} /><button className="btn btn-accent btn-lg">Write it for the rest of the night</button></form></>)}`
Line 159
old: `campaign.status === "drafted" && !send &&`
new: `campaign.status === "drafted" && !send && !firstOver &&`

3) src/app/api/campaigns/[id]/approve/route.ts: add the imports `import { getEvent } from "@/server/qloo/crowd";` and `import { campaignWindows } from "@/server/agent/prompt";`. Line 15
old: `if (campaign.status === "drafted" && draft && merchant) {`
new: `const event = getEvent(campaign.event_id);
  const open = !!event && campaignWindows(event)[0].end > Date.now();
  if (campaign.status === "drafted" && draft && merchant && open) {`

4) Without this, the rewrite can come back saying "until 7" again. src/server/agent/prompt.ts:57
old: `return campaignWindows(event).map((w) =>`
new: `return campaignWindows(event).filter((w, i, all) => w.end > Date.now() || i === all.length - 1).map((w) =>`

### #1 [major] today + campaign
**Duplicate of #0, skip.**

Where: src/app/today/page.tsx:126 (plate condition; add the check after line 78; imports at lines 9-10), src/app/campaigns/[id]/page.tsx:103 (Publish condition; add the check after line 64), src/server/agent/prompt.ts:55-58 (timeWindows still suggests windows that have already closed)

Problem: The home headlines a pre-show offer, and Publish sends it, after the offer's hours have passed. The plate checks that the campaign is drafted and that the crowd leaves in more than 45 minutes; it never checks that the window the copy is written for is still ahead. The campaign page hides Publish only when the LAST window has closed (nightOver).

Fix:

1) src/server/agent/prompt.ts:57 (otherwise any rewrite brings the closed window back). old: `  return campaignWindows(event).map((w) => ({ label: w.label, start_local: fmt.format(new Date(w.start)), end_local: fmt.format(new Date(w.end)), why: w.why }));` new: `  // Only the windows still ahead: a campaign written at 8 pm must not offer the 5:30 to 7:30 pm happy hour.
  const all = campaignWindows(event);
  const ahead = all.filter((w) => w.end > Date.now());
  return (ahead.length ? ahead : all).map((w) => ({ label: w.label, start_local: fmt.format(new Date(w.start)), end_local: fmt.format(new Date(w.end)), why: w.why }));`
Leave campaignWindows itself alone, because nightOver depends on it.

2) src/app/today/page.tsx. Line 10: old `import { getOffers } from "@/server/qloo/crowd";` new `import { getEvent, getOffers } from "@/server/qloo/crowd";\nimport { campaignWindows } from "@/server/agent/prompt";`. After line 78 add: `  // The draft opens with the window its offer is written for ("until 7 pm"). Once that window has closed, Publish would send an expired offer.
  const ev = next ? getEvent(next.event.id) : undefined;
  const draftFirstEnd = ev && draft ? campaignWindows(ev).find((w) => w.label === draft.windows[0]?.label)?.end : undefined;
  const offerOver = draftFirstEnd !== undefined && draftFirstEnd < now;`
Line 126: old `{next && w0 && campaign?.status === "drafted" && draft ? (` new `{next && w0 && campaign?.status === "drafted" && draft && !offerOver ? (`. The plate then falls to the crowd branch's last case, "Write my campaign". Because of step 1, that writes an after-show-only draft whose first window is "After the show", so it gets Publish.

3) src/app/campaigns/[id]/page.tsx. After line 64 add: `  // The window the draft opens with. Once it has closed, its words ("until 7 pm") are out of date even though the night is not over.
  const firstEnd = draft ? campaignWindows(event).find((w) => w.label === draft.windows[0]?.label)?.end : undefined;
  const firstOver = campaign.status === "drafted" && !nightOver && firstEnd !== undefined && firstEnd < now;
  const nextLabel = campaignWindows(event).find((w) => w.end > now)?.label ?? "the rest of the night";`
Line 103: old `{campaign.status === "drafted" && !nightOver && (` new `{campaign.status === "drafted" && !nightOver && !firstOver && (`. After line 105 add: `              {firstOver && (
                <>
                  <p className="t-body mt-10">{draft.windows[0].label} closed at <span className="mono">{clock(firstEnd!, tz)}</span>, and these words were written for it.</p>
                  <form action="/api/campaigns" method="post" className="mt-6">
                    <input type="hidden" name="merchant" value={merchant.id} />
                    <input type="hidden" name="event" value={event.id} />
                    <button className="btn btn-accent btn-lg">Write it for {lowerFirst(nextLabel)}</button>
                  </form>
                </>
              )}`
This keeps one primary button per screen, because Publish is hidden whenever this one shows.

### #2 [major] today + explore
**A show drops out of Today and Explore the moment it starts, though its after-show crowd is the best part of the night.**

Where: src/server/events/ticketmaster.ts:66 (main cause); src/server/events/radar.ts:67 (second cut, 3 h after the start); optional: src/server/events/radar.ts:76 (fallback SQL '-3 hours'), src/server/events/concentration.ts:110 (timing 0 after -3 h)

Problem: A show disappears from Today and Explore the moment it starts. Its after-show crowd is the best part of the night, so from 8 pm Today headlines a 38-guest TV game, and the ready Harry Styles campaign (after the show, 10:45 pm to 12:15 am) can no longer be reached from Today.

Fix:

1) ticketmaster.ts:66
old: `      startDateTime: iso(now),`
new: `      startDateTime: iso(new Date(now.getTime() - 5 * 3_600_000)), // shows that started still have their after-show crowd (presenceWindow leave = start + 4 h 15)`
(Use 5 h, not 4 h. presenceWindow leave for a non-sports Ticketmaster show is start + 165 + 90 min = 4.25 h, so a 4 h lookback drops the last 15 min of a concert's exit.)

2) radar.ts:67
old: `    .filter((s) => s.hoursUntil > -3 || (s.event.windowEnd && Date.parse(s.event.windowEnd) > now.getTime()))`
new: `    .filter((s) => presenceWindow(s.event).leave > now.getTime())`
and radar.ts:4
old: `import { scoreConcentration, headliner, type Scored } from "./concentration";`
new: `import { scoreConcentration, headliner, presenceWindow, type Scored } from "./concentration";`
(Moments with windowEnd behave as before, since leave = windowEnd. Today (page.tsx:45) and Explore (radar/page.tsx:80) already filter on presenceWindow leave, so the radar filter then matches them.)

3) Optional, for consistency. radar.ts:76 fallback SQL: `datetime('now', '-3 hours')` becomes `datetime('now', '-5 hours')`. concentration.ts:110: `hoursUntil < -3 ? 0` becomes `now.getTime() > presenceWindow(e).leave ? 0`, so a show in its exit phase does not drop to score 0 and sink in Explore's sort.

### #5 [major] today + alerts + campaign
**24-hour times still on screen for New York (alert stamps and stored alert text). #8, #15, #16 and #20 are the same: apply this one, covering Today and the alerts page.**

Where: src/app/today/page.tsx:263 (stamp) and :264 (stored alert line); src/app/alerts/page.tsx:27 (fmt) / :67 (stamp) / :51 (stored message); src/app/campaigns/[id]/page.tsx:45 (draft.rationale) and :206 (draft.windows[].why, inside the closed "The rest of the reasoning"); root cause for future drafts in src/server/agent/prompt.ts:26 (rule), :56 (timeWindows fmt), :69/:74/:79 (event time fmt), :99 (windows line). The issue's pointer "prompt.ts campaignWindows why text" is wrong: those why strings (prompt.ts:41-51) hold no times. Also on screen: src/app/page.tsx:23 landing shows "Saturday 13:30".

Problem: The 24-hour clock is still on screen for a New York bar, next to "Fri 7 pm" on the same page.

Fix:

1) src/lib/clock.ts, add at end:
/** Text stored before clock.ts says "17:30" or "17:30 to 18:45"; say it the city's way. Text that already says am/pm is left alone. */
export const clockText = (s: string, tz: string) =>
  /\b[ap]m\b/i.test(s) ? s : s.replace(/\b((?:[01]\d|2[0-3]):[0-5]\d)(?: to ((?:[01]\d|2[0-3]):[0-5]\d))?\b/g, (_, a: string, b?: string) => (b ? clockRange(a, b, tz) : clock(a, tz))).replace(/\ba (8|11)\b/g, "an $1");
(Single pass on purpose: a two-pass version tested in node turned "17:30 to 00:15" into "5:30 pm to 12:15 pm am". The am/pm guard stops new scan.ts alerts like "10:45 to 11:30 pm" from being read again as 10:45 am. Paris comes back unchanged.)

2) today/page.tsx:4 import { clock, clockRange } -> import { clock, clockRange, clockText }.
today/page.tsx:263 old: {new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"))}
new: {(() => { const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"); return `${fmtShort.format(at)} ${clock(at, tz)}`; })()}
today/page.tsx:264 old: {a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"}
new: {clockText(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert", tz)}

3) alerts/page.tsx: add import { clock, clockText } from "@/lib/clock";
:27 old: const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
new: const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });
:67 old: {fmt.format(at)}  new: {fmtDay.format(at)}, {clock(at, merchant.timezone)}
:51 old: const clean = a.message  new: const clean = clockText(a.message, merchant.timezone)  (the .replace chain after it stays as is)

4) campaigns/[id]/page.tsx: import { clock, clockRange } -> import { clock, clockRange, clockText }.
:45 old: const why = draft ? plainWords(noScores(draft.rationale)) : "";
new: const why = draft ? clockText(plainWords(noScores(draft.rationale)), merchant.timezone) : "";
(tz is only declared at :55, so use merchant.timezone here; merchant is set at :42.)
:206 old: {nb(w.why)}  new: {nb(clockText(w.why, tz))}
Optional, as a guard: today/page.tsx:161 firstSentences(plainWords(noScores(draft.rationale)), 220) -> clockText(firstSentences(plainWords(noScores(draft.rationale)), 220), tz).

5) prompt.ts, so new drafts stop writing 18:30. Add import { clock, clockRange } from "@/lib/clock".
:26 old: - Time windows: use the suggested ones unless the evidence says otherwise; keep local HH:MM.
new: - Time windows: use the suggested ones unless the evidence says otherwise; keep local HH:MM in start_local and end_local only. Everywhere else (copy, rationale, window why, limitations) say times the way the city says them: "6:30 pm", "8 pm", "5:30 to 7:30 pm" in US cities, "18:30" in France.
:99 old: lines.push(`- ${w.label}: ${w.start_local} to ${w.end_local}. ${w.why}`);
new: lines.push(`- ${w.label}: ${w.start_local} to ${w.end_local} (say "${clockRange(w.start_local, w.end_local, merchant.timezone)}"). ${w.why}`);
:69 fmt: drop hour/minute, and at :74 and :79 write `${fmt.format(new Date(event.starts_at))} at ${clock(new Date(event.starts_at), merchant.timezone)} local`. Pass a Date, not event.starts_at: clock() reads any string as "HH:MM". Keep :56 as is, because the schema windows need HH:MM.

6) Also: src/app/page.tsx:23/:36 landing "Saturday 13:30" -> weekday-only fmt + clock(new Date(live.item.event.startsAt), live.merchant.timezone).

### #8 [major] today + alerts
**Duplicate of #5, skip.**

Where: src/app/today/page.tsx:263 (stamp) and :264 (stored text); src/app/alerts/page.tsx:27 (fmt), :56 (text), :67 (stamp render; the issue said :71); helper goes in src/lib/clock.ts

Problem: Two clocks on the same screen for a New York bar. Times built with clock() are 12-hour, but the alert stamps use en-GB 2-digit (always 24-hour), and the alert text is a message stored before clock.ts existed. The founder sees "Fri 7 pm" and "Fri 19:52" a few lines apart.

Fix:

1) src/lib/clock.ts, add after `clock`:
/** Old alerts were stored with "17:30"; say every bare HH:MM the city's way. Leaves "10:45 pm" alone. */
export const sayClocks = (s: string, tz: string) => s.replace(/\b([01]\d|2[0-3]):[0-5]\d\b(?!\s?[ap]m)/gi, (t) => clock(t, tz));
(The issue's regex had no lookahead. New alerts already come out of scan.ts:123 in 12-hour form, and that regex turns "10:30 pm" into "10:30 am pm" and "12:15 am" into "12:15 pm am". Tested in node.)

2) src/app/today/page.tsx:4: old `import { clock, clockRange } from "@/lib/clock";` new `import { clock, clockRange, sayClocks } from "@/lib/clock";`
:263: old `{new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"))}` new `{(() => { const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"); return nb(`${fmtShort.format(at)} ${clock(at, tz)}`); })()}` (nb keeps "Fri 10:52 pm" on one line in the 6.5rem column)
:264: old `{a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"}` new `{sayClocks(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert", tz)}`

3) src/app/alerts/page.tsx: add `import { clock, sayClocks } from "@/lib/clock";`
:27: old `{ weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone }` new `{ weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone }`
:56: old `const text = dayKey.format(at) === todayKey ? clean : clean.replace(/^Today /, `${weekday.format(at)} `);` new `const text = sayClocks(dayKey.format(at) === todayKey ? clean : clean.replace(/^Today /, `${weekday.format(at)} `), merchant.timezone);`
:67: old `{fmt.format(at)}` new `{fmt.format(at)}, {clock(at, merchant.timezone)}`
Output for New York: "Fri 23 Oct, 7:52 pm" / "Sunday 5:30 pm · about 21,700 people ... from 5:30 pm to 6:45 pm." Paris is unchanged ("17:30").

### #15 [major] alerts
**Duplicate of #5, skip.**

Where: src/app/alerts/page.tsx:27 (stamp formatter, hour 2-digit en-GB), :67 (stamp), :71 (stored alert prose printed as-is); add clockText to src/lib/clock.ts after clockRange (line 14)

Problem: Every time on the alerts page is on a 24-hour clock for a New York bar: the stamp is formatted on the page with hour 2-digit en-GB, and the stored alert text keeps HH:MM. The rule book says times in the merchant's clock (src/lib/clock.ts).

Fix:

The issue's regex has a bug. scan.ts:123 already writes new alerts as "Saturday 10:30 pm: ... from 10:30 to 11:45 pm.". Run on that text, the issue's regex returns "10:30 am pm", "10:30 to 11:45 am pm" and "12:15 pm am" (tested in node). The next hourly scan puts such a row at the top. Fix: leave a line alone when it already has am/pm. One message is all 24-hour (old rows) or all 12-hour (new rows), so this check is safe.

1) src/lib/clock.ts, append after line 14:
/** Stored alert prose with "HH:MM" clocks (rows written before clock.ts), in the merchant's clock: "from 17:30 to 18:45" reads "from 5:30 to 6:45 pm" in New York, unchanged in Paris. Text that already says am/pm is left alone. */
export const clockText = (s: string, tz: string) => (/\d\s?[ap]m\b/i.test(s) ? s : s.replace(/\b((?:[01]\d|2[0-3]):[0-5]\d)(?: to ((?:[01]\d|2[0-3]):[0-5]\d))?\b/g, (_, a: string, b?: string) => (b ? clockRange(a, b, tz) : clock(a, tz))));

2) src/app/alerts/page.tsx, after line 5 add:
import { clock, clockText } from "@/lib/clock";
import { nb } from "@/lib/nbsp";

3) :27 old: const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone });
new: const fmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });

4) :67 old: <span className="t-clock text-[var(--muted)]">{fmt.format(at)}</span>
new: <span className="t-clock text-[var(--muted)]">{fmt.format(at)}, {clock(at, merchant.timezone)}</span>

5) :71 old: {what ? `${when} · ${tail}` : tail} {rest.join(" ")}
new: {nb(clockText(`${what ? `${when} · ${tail}` : tail} ${rest.join(" ")}`, merchant.timezone))}

Results in node, New York: "Fri 23 Oct, 7:52 pm"; "Sunday 2:30 pm · about 16,400 people 1.2 km from you, from 1:30 to 3 pm."; "Saturday 8 pm ... from 5:30 pm to 12:15 am". New 12-hour rows stay as written. Paris stays 24-hour. nb also keeps "1.2 km" and "3 pm" on one line.

### #16 [major] today
**Duplicate of #5, skip.**

Where: src/app/today/page.tsx:263 (stamp: its own en-GB 2-digit formatter, not clock()) and :264 (alert line: prints the stored message, and rows saved before 26d9a64 still hold "HH:MM"); import at :4; helper to add in src/lib/clock.ts after :7

Problem: Today's 'What Turnout did on its own' prints alert stamps and alert crowds on a 24-hour clock, while the plate and Coming next one screen above say '12:15 am' and '7 pm'.

Fix:

1) src/lib/clock.ts, add after line 7 (the `export const clock = ...` line):
/** Every "HH:MM" in stored prose, said the merchant's way: "Sunday 17:30" -> "Sunday 5:30 pm" in New York, unchanged in Paris. */
export const clockText = (s: string, tz: string) => (us(tz) ? s.replace(/\b([01]\d|2[0-3]):([0-5]\d)\b/g, (t) => say(t, true)) : s);

2) src/app/today/page.tsx:4
old: import { clock, clockRange } from "@/lib/clock";
new: import { clock, clockRange, clockText } from "@/lib/clock";

3) src/app/today/page.tsx:263
old: <span className="t-clock text-[var(--muted)]">{new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"))}</span>
new: <span className="t-clock text-[var(--muted)]">{(() => { const d = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"); return nb(`${fmtShort.format(d)} ${clock(d, tz)}`); })()}</span>
(fmtShort already exists at :54, en-GB weekday short in tz.)

4) src/app/today/page.tsx:264
old: <span>{a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"}</span>
new: <span>{nb(clockText(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert", tz))}</span>

Result for m_penn_pour (America/New_York), tested in node: "Fri 7:52 pm  Sunday 5:30 pm: Theatre crowd letting out", "Fri 5:52 pm  Saturday 10:30 pm: Theatre crowd letting out". Paris merchant unchanged ("Sat 01:52", "Sunday 17:30"). Lines 263 and 264 both needed; the issue's fix is right, only clockText did not exist yet and the stamp should go through nb() so "7:52 pm" does not break inside the 6.5rem column.

### #20 [major] today, alerts
**Duplicate of #5, skip.**

Where: src/app/today/page.tsx:263-264 (alert stamp and text, still on an en-GB 24-hour formatter, no clock(), no nb()); src/app/alerts/page.tsx:27 (fmt with hour/minute 2-digit), :67 (stamp), :71 (alert sentence, no clock and no nb); src/lib/clock.ts (needs a sayTimes helper). Merchant m_penn_pour = America/New_York (src/server/db/seed.ts:32).

Problem: Two clocks for one New York bar. On Today, "Coming next" says "Fri 7 pm" and two sections lower "What Turnout did on its own" says "Fri 19:52 / Sunday 17:30: Theatre crowd letting out". The Alerts page is 24-hour throughout ("Fri 23 Oct, 19:52", "Saturday 22:30 · ... from 22:30 to 23:45", "from 17:30 to 00:15"). The alert sentences do not go through nb(), so at 390 "1.1 km" and "0.3 km" split across two lines.

Fix:

1) src/lib/clock.ts, append ONE single-pass helper. The issue's two-pass version is broken: its second regex runs again over clockRange's output, so "from 22:30 to 23:45" becomes "from 10:30 am to 11:45 am pm" and "from 17:30 to 00:15" becomes "from 5:30 pm to 12:15 pm am" (tested in .tmp/onepath/r6-verify/22/t.mjs). Add:
/** Stored alert text says "22:30" and "17:30 to 00:15"; say it the way the merchant's city does. */
export const sayTimes = (s: string, tz: string) => s.replace(/\b([01]\d|2[0-3]):([0-5]\d)(?: to ([01]\d|2[0-3]):([0-5]\d))?\b/g, (m, a, b, c, d) => (c ? clockRange(`${a}:${b}`, `${c}:${d}`, tz) : clock(m, tz)));
2) src/app/alerts/page.tsx: add imports `import { clock, sayTimes } from "@/lib/clock";` and `import { nb } from "@/lib/nbsp";`.
:27 old: { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: merchant.timezone }  -> new: { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone }
:67 old: {fmt.format(at)}  -> new: {fmt.format(at)}, {clock(at, merchant.timezone)}
:71 old: {what ? `${when} · ${tail}` : tail} {rest.join(" ")}  -> new: {nb(sayTimes(`${what ? `${when} · ${tail}` : tail} ${rest.join(" ")}`, merchant.timezone))}
3) src/app/today/page.tsx (clock and nb already imported; add sayTimes to the clock import on line 4: `import { clock, clockRange, sayTimes } from "@/lib/clock";`).
:263 old: {new Intl.DateTimeFormat("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"))}
 -> new: {(() => { const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"); return `${new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz }).format(at)} ${clock(at, tz)}`; })()}
:264 old: {a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"}  -> new: {nb(sayTimes(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert", tz))}
Result New York: "Fri 7:52 pm | Sunday 5:30 pm: Theatre crowd letting out"; Alerts "Fri 23 Oct, 7:52 pm", "Saturday 10:30 pm · about 34,900 people 1.1 km from you, from 10:30 to 11:45 pm.", "from 5:30 pm to 12:15 am", km and pm kept on one line. Paris output unchanged (tested). The 6.5rem stamp column holds "Fri 10:52 pm" at 15px (about 86 px), no width change needed.

### #9 [major] today + campaign
**One offer, four sets of hours. #23 is the same on the campaign plate: apply both parts here.**

Where: src/app/campaigns/[id]/page.tsx:71-78 (offerLine, the t-lead under the display on every drafted campaign, above the fold at 1440 and 390). Secondary, minor: src/app/today/page.tsx:156 (fine print on the strangers card). Not src/app/today/page.tsx:161: Why reads "Two cocktails for the price of one, 5 to 7 pm. $16 for two." This matches the WhatsApp line "two cocktails for $16 until 7 pm" and contradicts nothing.

Problem: One offer, four sets of hours. The windows are when the crowd passes, but they are printed beside the offer hours with no verb, so they read as conflicting offer hours.

Fix:

1) src/app/campaigns/[id]/page.tsx:71-78
OLD:
  // The offer in one line, then the windows: "Before doors 17:30 to 19:30, after the show 22:45 to 00:15."
  const offerLine = draft && (
    <>
      {offer ? `${nb(`${offer.description.replace(/\.$/, "")}. ${offer.price.replace(/\.$/, "")}.`)} ` : ""}
      {draft.windows.map((w, i) => (
        <span key={w.label}>{i > 0 ? `, ${lowerFirst(w.label)}` : w.label} <span className="mono">{clockRange(w.start_local, w.end_local, tz)}</span></span>
      ))}.
    </>
  );
NEW:
  // The offer in one line, then when the crowd is near, with a verb so it never reads as offer hours: "The crowd is near you before doors, 5:30 to 7:30 pm, and after the show, 10:45 pm to 12:15 am."
  const offerLine = draft && (
    <>
      {offer ? `${nb(`${offer.description.replace(/\.$/, "")}. ${offer.price.replace(/\.$/, "")}.`)} ` : ""}
      {draft.windows.map((w, i) => (
        <span key={w.label}>{i > 0 ? ", and " : "The crowd is near you "}{lowerFirst(w.label)}, <span className="mono">{clockRange(w.start_local, w.end_local, tz)}</span></span>
      ))}.
    </>
  );
(lowerFirst stays in use; line 206 uses it too.)

2) Minor: src/app/today/page.tsx:156
OLD: {nb(draft.windows.map((w) => `${w.label}, ${clockRange(w.start_local, w.end_local, tz)}`).join(" · "))}. Snapchat,
NEW: {nb(`Shown ${draft.windows.map((w) => `${lowerFirst(w.label)}, ${clockRange(w.start_local, w.end_local, tz)}`).join(", and ")}`)}. Snapchat,
(lowerFirst is already defined and used in today/page.tsx at line 132.)

3) Leave today/page.tsx:161 alone. The proposed change would strip the description and leave "$16 for two." with nothing before it. It would also undo the build decision to move the offer line under Why.

### #23 [minor] campaign
**Duplicate of #9, skip.**

Where: src/app/campaigns/[id]/page.tsx:71-79 (offerLine, rendered in the plate at :101 as the t-lead, and at :98 once the campaign is out). Data: src/server/db/seed.ts:37 o_pp_happy description "Two cocktails for the price of one, 5 to 7 pm". Same pattern, weaker, at src/app/today/page.tsx:156 and :161.

Problem: The plate's one sentence gives two different times for the offer and suggests the 2-for-1 also runs after the show, when the after-show promise is warm burgers.

Fix:

Do not use the proposed regex. It removes the offer's real hours (5 to 7 pm) and keeps the crowd windows, so the plate would then claim the 2-for-1 runs until 7:30 pm and after the show. That is worse. Instead, keep the offer's own hours and print the windows only when the offer names no time. The windows stay under Why > "The rest of the reasoning" with their weather, so nothing is lost.

old (page.tsx:71-79):
  // The offer in one line, then the windows: "Before doors 17:30 to 19:30, after the show 22:45 to 00:15."
  const offerLine = draft && (
    <>
      {offer ? `${nb(`${offer.description.replace(/\.$/, "")}. ${offer.price.replace(/\.$/, "")}.`)} ` : ""}
      {draft.windows.map((w, i) => (
        <span key={w.label}>{i > 0 ? `, ${lowerFirst(w.label)}` : w.label} <span className="mono">{clockRange(w.start_local, w.end_local, tz)}</span></span>
      ))}.
    </>
  );

new:
  // The offer in one line. Its own hours win: the windows are when the crowd passes (listed under Why), and printing both
  // reads as two times for one deal. Windows only when the offer names no time ("Craft beer flight").
  const offerHasTime = !!offer && /\d\s*(am|pm|h)\b|\d{1,2}[:h]\d{2}|until\s+\d/i.test(offer.description);
  const offerLine = draft && (
    <>
      {offer ? nb(`${offer.description.replace(/\.$/, "")}. ${offer.price.replace(/\.$/, "")}.`) : ""}
      {!offerHasTime && (
        <>
          {offer ? " " : ""}
          {draft.windows.map((w, i) => (
            <span key={w.label}>{i > 0 ? `, ${lowerFirst(w.label)}` : w.label} <span className="mono">{clockRange(w.start_local, w.end_local, tz)}</span></span>
          ))}.
        </>
      )}
    </>
  );

Result on camp_5613879d39a1: "Two cocktails for the price of one, 5 to 7 pm. $16 for two." That is one time, and it matches what Publish sends ("$16 until 7 pm"). The regex also catches the burger offer ("until 1 am") and the Paris offer ("jusqu'à 1 h"), and leaves the windows for offers that name no time. A plate_line field in the schema could come later, but cached drafts would not have it, so it cannot be the fix today.

### #3 [major] campaign + today + alerts
Where: src/app/campaigns/[id]/page.tsx:159 (WhatsApp block in "What goes out"); needs an import near line 8 and a const near line 81. today/page.tsx:266 and alerts/page.tsx are already right, leave them as they are.

Problem: The screens contradict each other on WhatsApp. The campaign page promises regulars get the message the moment you press Publish, while Today and Alerts say WhatsApp is not connected. In this setup nothing is sent.

Fix:

1) src/app/campaigns/[id]/page.tsx, after line 8 add: `import { whatsappConfigured } from "@/server/channels/twilio";`
2) Same file, after line 82 (`const channels: ChannelId[] = ...`) add: `const whatsappLive = whatsappConfigured() && Boolean(process.env.DEMO_WHATSAPP_TO); // same test as publishCampaign and alerts/page.tsx:20`
3) Line 159, old: `{campaign.status === "drafted" && !send && <p className="t-body text-[var(--muted)]">Sent to your regulars the moment you press Publish.</p>}`
new: `{campaign.status === "drafted" && !send && <p className="t-body text-[var(--muted)]">{whatsappLive ? "Sent to your regulars the moment you press Publish." : "WhatsApp is not connected yet, so Publish keeps this message here instead of sending it."}</p>}`
Do not use the issue's wording "Kept here until your WhatsApp is connected, then sent to your regulars." Nothing re-sends a simulated send once WhatsApp is connected, so "then sent" would be a new false promise. Leave today/page.tsx:266 unchanged. That line is about Turnout's alerts to the merchant, and it already agrees with Alerts.

### #4 [major] today
Where: src/app/today/page.tsx:142-158 (grid at :143). The cause is the rule book: docs/UX-ONE-PATH.md:52 ("the three channel cards (chalkboard, regulars, strangers), unchanged") and :25 ("three on Today, five on the campaign"). design/brand/R5-FIXES.md:212 kept Today unchanged on purpose and called a fourth card "a design call against the rule book".

Problem: Today's "What goes out" leaves out the screens that its one-click Publish sends to, so Today and the campaign page list different channels for the same campaign.

Fix:

1) Design, docs/UX-ONE-PATH.md:52
old: `2. "What goes out": the three channel cards (chalkboard, regulars, strangers), unchanged.`
new: `2. "What goes out": the same blocks as the campaign page: the chalkboard, then only the channels Publish sends (the merchant's channels), with the same eyebrows.`
docs/UX-ONE-PATH.md:25
old: `(three on Today, five on the campaign)`
new: `(the chalkboard plus the channels Publish sends, on Today and on the campaign)`

2) Build, src/app/today/page.tsx (getDb is already imported at :8). After line 80 add:
`const sendsTo = JSON.parse((getDb().prepare("SELECT channels_json FROM merchants WHERE id = ?").get(merchant.id) as { channels_json: string } | undefined)?.channels_json ?? "[]") as string[];`
Line 143
old: `<div className="mt-8 grid gap-x-16 gap-y-12 md:grid-cols-3">`
new: `<div className="mt-8 grid gap-x-16 gap-y-12 md:grid-cols-2">`
(2x2, the same grid as campaigns/[id]/page.tsx:145. Four columns at max-w-5xl would be about 196 px wide, too narrow for the WhatsApp text.)
Wrap the WhatsApp card (:148-151) in `{sendsTo.includes("whatsapp") && (...)}` and the strangers card (:152-157) in `{sendsTo.includes("geofenced_ad") && (...)}`. After the strangers card's closing `</div>` (:157) add:
`{sendsTo.includes("dooh") && (<div><p className="eyebrow">On the screens near the venue</p><p className="t-name mt-4">{nb(draft.dooh.headline)}</p><p className="t-body mt-3">{nb(draft.dooh.body)}</p></div>)}`
Do the same for google_post (`On your Google listing`, draft.google_post.title and body) so Today matches publishCampaign for every merchant.

### #10 [minor] explore + today
**Explore preselects a different crowd than Today. #25 is the same: apply this one.**

Where: src/app/radar/RadarView.tsx:83 (firstHot), src/app/radar/RadarView.tsx:378 (row time), src/app/today/page.tsx:230 (Coming next time)

Problem: Explore preselects and tones the first crowd by start time, a Knicks TV game with 38 guests that started an hour earlier. Today pushes Harry Styles with 100 guests. The founder cannot tell which crowd matters. Rows that have already started still show their start time, and Today shows today as "Fri".

Fix:

1) RadarView.tsx:83. Old: `const firstHot = all.find((c) => c.interesting && c.w.leave > now);` New, the same pick as today/page.tsx:45-48, fallback included:
```
const pickable = all.filter((c) => c.interesting && c.w.leave > now + 45 * 60_000);
const soonPick = pickable.filter((c) => c.w.arrive <= now + 12 * H);
const firstHot = [...(soonPick.length ? soonPick : pickable)].sort((a, b) => b.guests - a.guests || a.w.arrive - b.w.arrive)[0] ?? all.find((c) => c.interesting && c.w.leave > now);
```
2) RadarView.tsx:378. Old: `<span className="mono">{dayLabel(it.w.start, true)} {clock(it.w.start, tz)}</span>` New: `<span className="mono">{it.w.arrive <= now ? `Now, until ${clock(it.w.leave, tz)}` : `${dayLabel(it.w.start, true)} ${clock(it.w.start, tz)}`}</span>` (same "right now, until" logic as Today's lead).
3) today/page.tsx:230. Old: `<span className="mono">{fmtShort.format(new Date(w.start))} {clock(w.start, tz)}</span>` New: `<span className="mono">{w.arrive <= now ? <>Now, until {clock(w.leave, tz)}</> : <>{dayOf(w.start) === "Today" || dayOf(w.start) === "Tomorrow" ? dayOf(w.start) : fmtShort.format(new Date(w.start))} {clock(w.start, tz)}</>}</span>`. This also maps Tomorrow. The proposed fix only mapped Today, so it would still print "Sat" where Explore prints "Tomorrow".

### #25 [minor] explore + today
**Duplicate of #10, skip.**

Where: src/app/radar/RadarView.tsx:83 (firstHot sets the first selection, which gets the grey `tone` row via :379); src/app/today/page.tsx:49 (`later`, not :50)

Problem: Explore highlights a different crowd than Today: the grey first row is a TV game that started an hour ago (38 guests), while Today and the map label point to Harry Styles (100). Today's "Coming next" also lists "Fri 7 pm" at 8 pm.

Fix:

1) src/app/radar/RadarView.tsx:83. Use exactly the rule Today uses at today/page.tsx:45-48 (the issue's version used leave > now and had no 'most guests ahead' fallback, so it would still drift from Today):
old: `  const firstHot = all.find((c) => c.interesting && c.w.leave > now);`
new:
```
  // The crowd Today headlines (src/app/today/page.tsx:45-48): most guests among those still around in 45 minutes
  // and arriving within twelve hours, else most guests in the next two days.
  const ahead = all.filter((c) => c.interesting && c.w.leave > now + 45 * 60_000 && c.w.arrive < now + 48 * H);
  const soon = ahead.filter((c) => c.w.arrive <= now + 12 * H);
  const firstHot = [...(soon.length ? soon : ahead)].sort((a, b) => b.guests - a.guests || a.w.arrive - b.w.arrive)[0] ?? all.find((c) => c.interesting && c.w.leave > now);
```
(`ahead` and `soon` are not used anywhere else in RadarView; H is defined at :39.)

2) src/app/today/page.tsx:49
old: `  const later = upcoming.filter((it) => it !== next).sort((a, b) => presenceWindow(a.event).start - presenceWindow(b.event).start).slice(0, 3);`
new: `  const later = upcoming.filter((it) => it !== next && presenceWindow(it.event).start > now).sort((a, b) => presenceWindow(a.event).start - presenceWindow(b.event).start).slice(0, 3);`
This is not the `arrive > now` filter that R5-FIXES #2 rejected. That one would drop a show 150 minutes before it starts. This one only drops crowds that have already started.

## 2. Today's words

### #7 [major] today (also campaign eyebrow)
**The display is a tour title ("Harry Styles: Together, Together"). #18, #19 and #22 are the same: apply this one.**

Where: src/app/today/page.tsx:88 (around) and :101 (crowdName), used by the h1 at :130 and :168; src/app/campaigns/[id]/page.tsx:91 (eyebrow)

Problem: The first and largest words on the home are a Ticketmaster tour name, "Harry Styles: Together, Together". It reads like a stutter or a bug, takes three lines at 390, and differs from the Who page, which says "Harry Styles". The rule book asks for the crowd in about five words. The live Ticketmaster events carry no origin, so the ticketmaster branch of crowdName never runs. The campaign eyebrow wraps to two lines for the same reason.

Fix:

1) src/app/today/page.tsx:88
old:
  const around = next ? (next.event.origin === "tv" || next.event.origin === "calendar" ? "around you" : `${next.distanceKm.toFixed(1)} km from your door`) : "";
new:
  // A Ticketmaster show (live events carry no origin, stored ones say "ticketmaster"): the act is the headline, the house goes in the sentence.
  const isShow = !!next && (next.event.origin ?? "ticketmaster") === "ticketmaster";
  const around = next ? (next.event.origin === "tv" || next.event.origin === "calendar" ? "around you" : `${isShow ? `at ${next.event.venue.name}, ` : ""}${next.distanceKm.toFixed(1)} km from your door`) : "";
(Both leads use `around`: the drafted one at :132 and peopleLine at :95, so neither needs its own change.)

2) src/app/today/page.tsx:101
old:
  const crowdName = next ? (next.event.origin === "ticketmaster" ? `${next.event.name} at ${next.event.venue.name}` : next.event.name) : "";
new:
  const crowdName = next ? (isShow ? next.headliner.name : next.event.name) : "";
Expected: h1 "Harry Styles" on one line at 1440 and at 390, the same as the Who page h1. Lead: "About 20,000 people at Madison Square Garden, 0.3 km from your door from 5:30 pm. Your pre-show happy hour is ready." Waves, TV, street and calendar moments keep event.name.

3) src/app/campaigns/[id]/page.tsx, after line 43 (`const event = getEvent(campaign.event_id)!;`), add:
  const actName = (event.origin ?? "ticketmaster") === "ticketmaster" ? ((JSON.parse(event.attractions_json) as { name?: string }[])[0]?.name ?? event.name) : event.name;
then line 91
old: <p className="eyebrow">Your campaign for {dayword}, {event.name} at {event.venue_name}</p>
new: <p className="eyebrow">Your campaign for {dayword}, {actName} at {event.venue_name}</p>
I prefer this to the issue's `event.name.replace(/:.*$/, "")`. It uses the same first attraction as headliner() and the Who page, so it also works on tour names with no colon. Expected eyebrow: "Your campaign for tonight, Harry Styles at Madison Square Garden". Measured at 1 line at 1440, still 2 at 390.

### #18 [major] today
**Duplicate of #7, skip.**

Where: src/app/today/page.tsx:101 (crowdName, used by both plate branches at :130 drafted and :168 no draft). Root cause: src/server/events/ticketmaster.ts:91-106 never sets `origin`, and src/server/events/radar.ts writes "ticketmaster" only in persist() (:143) and rowToEvent() (:102, the stored fallback). Widths 1440 and 390.

Problem: Today's display is the tour title, not 'the crowd in five words' ('Harry Styles at the Garden'). The branch meant to give 'the act and the house' never fires: live Ticketmaster events from fetchEventsNear carry no origin (radar.ts only writes 'ticketmaster' when persisting, and radar/page.tsx:54 already uses `origin ?? "ticketmaster"`). The headline also matches no other screen: Who and Explore say 'Harry Styles', alerts say 'Harry Styles: Together, Together at Madison Square Garden'.

Fix:

src/app/today/page.tsx:101
old: const crowdName = next ? (next.event.origin === "ticketmaster" ? `${next.event.name} at ${next.event.venue.name}` : next.event.name) : "";
new: const crowdName = next ? ((next.event.origin ?? "ticketmaster") === "ticketmaster" ? `${next.headliner.name} at ${next.event.venue.name}` : next.event.name) : "";
Result: "Harry Styles at Madison Square Garden" and "ASAKE at ACCOR ARENA". Moments are unchanged because moments.ts:80, tv.ts:258, street.ts:307 and calendar.ts:86 all set origin. The headline then uses the same name as Who, Coming next (:230) and headliner() in concentration.ts:126, and it no longer changes when Ticketmaster fails.
Optional, same line: Ticketmaster sends Paris venues in capitals. To show "ASAKE at Accor Arena", wrap the venue: `${next.headliner.name} at ${/[a-z]/.test(next.event.venue.name) ? next.event.venue.name : next.event.venue.name.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase())}`. Alerts and Who already show "ACCOR ARENA" in capitals, so this is polish, not required.
Simulated on the live page by swapping the DOM text (/Users/jacobofernandez/Code/Qloo/.tmp/onepath/r6-verify/20/):
- fix-1440: 2 lines, the same height as today.
- fix-390: 3 lines, Publish bottom at 700 px in an 844 px fold.
- paris-raw-390: 2 lines.

### #19 [major] today
**Duplicate of #7, skip.**

Where: src/app/today/page.tsx:101 (crowdName, rendered at :130 drafted plate and :168 crowd plate). Same tour title also in src/app/campaigns/[id]/page.tsx:91 (campaign eyebrow). Rule book example docs/UX-ONE-PATH.md:48.

Problem: The one level-1 line on the home screen is the event's tour title. "Harry Styles: Together, Together" is 32 characters with a colon and a repeated word, which looks like a glitch at 121 px. It takes 2 lines (252 px) at 1440 and 3 lines (175 px) at 390, pushing Publish down to y 610. The same crowd is called "Harry Styles" on Who is coming (its display) and in the Explore list, so the merchant does not see one name across screens.

Fix:

src/app/today/page.tsx:101
old: const crowdName = next ? (next.event.origin === "ticketmaster" ? `${next.event.name} at ${next.event.venue.name}` : next.event.name) : "";
new: const crowdName = next ? next.headliner.name : "";
(RadarItem.headliner is at src/server/events/radar.ts:33. headliner() in src/server/events/concentration.ts:124 returns attractions[0].name for Ticketmaster events and event.name for waves, TV, street and calendar moments, so "Knicks at Celtics on Prime Video" and "Theatre crowd arriving, 28 shows" stay the same. Explore, Coming next and Who is coming already use this name.)
Rule book, docs/UX-ONE-PATH.md:48
old: `.t-display` the crowd in five words ("Harry Styles at the Garden")
new: `.t-display` the crowd's name, the same as on Explore and Who is coming ("Harry Styles")
Optional, same change: src/app/campaigns/[id]/page.tsx:91, eyebrow "Your campaign for {dayword}, {event.name} at {event.venue_name}". Use the headliner name there too: headliner() from src/server/events/concentration.ts on the stored event, or the crowd profile's headlinerName. Then the eyebrow reads "Your campaign for tonight, Harry Styles at Madison Square Garden".
Expected after the fix: h1 "Harry Styles" fits on 1 line at both widths, the same as who-1440 and who-390 (who-390: h1 y 200, lead y 278, so 58 px is one line). Publish moves up by about 126 px at 1440 (694 to about 568) and by about 116 px at 390 (610 to about 494).

### #22 [minor] today
**Duplicate of #7, skip.**

Where: src/app/today/page.tsx:101 (crowdName is used by both Today h1s, lines 130 and 168). The bug report said line 104, but the line is 101.

Problem: The display shows the tour title, "Harry Styles: Together, Together", which reads like a stutter and does not say where. Who is coming says "Harry Styles" for the same crowd.

Fix:

src/app/today/page.tsx:101
old: const crowdName = next ? (next.event.origin === "ticketmaster" ? `${next.event.name} at ${next.event.venue.name}` : next.event.name) : "";
new: const crowdName = next ? ((next.event.origin ?? "ticketmaster") === "ticketmaster" ? `${next.headliner.name} at ${next.event.venue.name}` : next.event.name) : "";
Result: "Harry Styles at Madison Square Garden", the same act name as the Who is coming h1 (profile.headlinerName). This also fixes the waiting-state h1 at line 168. Line count stays the same: about 2 lines at 1440 px and 3 lines at 390 px (56 px), as now. Waves, TV, street and calendar moments set origin explicitly, so they keep event.name.

### #26 [minor] today
Where: src/app/today/page.tsx:89 (guestsLine, also shown in Why at :161), :95 (peopleLine) and :132 (drafted-plate lead); src/server/agent/scan.ts:123 (capacity) and :124 (percent). The issue's :91 and scan.ts:125 are off by one or two lines.

Problem: Percentages and unrounded counts on Today, while Explore uses words and round figures for the same crowd.

Fix:

1) src/app/today/page.tsx:89
old: const guestsLine = next ? (next.fill >= 1 ? `enough to fill your ${seats} seats` : `${Math.round(next.fill * 100)}% of your ${seats} seats`) : "";
new: const guestsLine = next ? (next.fill >= 1 ? `enough to fill your ${seats} seats` : next.fill >= 0.5 ? "enough for half your seats" : "enough for a few tables") : "";
(Keep the fill >= 1 branch. The issue's proposed ternary drops it. fill = potentialGuests / seats, so fill >= 0.5 is the same band as Explore's guests * 2 >= seats.)

2) src/app/today/page.tsx:95 and :132, both places
old: {next.capacity.toLocaleString("en-US")}
new: {(Math.round(next.capacity / 100) * 100).toLocaleString("en-US")}

3) src/server/agent/scan.ts:123
old: about ${it.capacity.toLocaleString("en-US")} people ${where}
new: about ${(Math.round(it.capacity / 100) * 100).toLocaleString("en-US")} people ${where}

4) src/server/agent/scan.ts:124
old: ${it.fill >= 1 ? `enough to fill your ${seats} seats` : `${Math.round(it.fill * 100)}% of your ${seats} seats`}
new: ${it.fill >= 1 ? `enough to fill your ${seats} seats` : it.fill >= 0.5 ? "enough for half your seats" : "enough for a few tables"}

(Rounding to the nearest 100 cannot give "About 0 people" for a crowd that gets shown. The interesting filter needs at least 8 guests at a 3% share at most, which means about 267 people or more.)

### #32 [minor] today
Where: src/app/today/page.tsx:106-119 (date line with the "Also yours" links) and :275-279 (page footer line). The duplicate is src/app/layout.tsx:37 ("Set up a place"). Line numbers in the issue are correct for HEAD 26d9a64.

Problem: The first text line is a breadcrumb for a second bar ("Also yours: Le Quai 12") that means nothing to a one-bar owner; at 390 it wraps with a dangling dot. The page footer "Set up another place" duplicates the layout footer "Set up a place" just below it.

Fix:

1) today/page.tsx:106-119. Old:
      <p className="t-body text-[var(--muted)]">
        {dateLine} · {merchant.name}, {merchant.city}
        {others.length > 0 && (
          <>
            {" · Also yours: "}
            {others.map((m, i) => (
              <span key={m.id}>
                {i > 0 ? ", " : ""}
                <Link href={`/today?merchant=${m.id}`} className="link">{m.name}</Link>
              </span>
            ))}
          </>
        )}
      </p>
New:
      <p className="t-body text-[var(--muted)]">
        {dateLine} · {merchant.name}, {merchant.city}
      </p>

2) today/page.tsx:275-279. Old:
      <p className="stack-section t-body">
        <Link href={`/radar?merchant=${merchant.id}`} className="link">Explore the map</Link>
        {" · "}
        <Link href="/start" className="link">Set up another place</Link>
      </p>
New:
      <p className="stack-section t-body">
        <Link href={`/radar?merchant=${merchant.id}`} className="link">Explore the map</Link>
        {others.length > 0 && (
          <>
            {" · Other places: "}
            {others.map((m, i) => (
              <span key={m.id}>
                {i > 0 ? ", " : ""}
                <Link href={`/today?merchant=${m.id}`} className="link">{m.name}</Link>
              </span>
            ))}
          </>
        )}
      </p>

Changes from the proposed fix: (a) say "Other places:", not "Also yours:" (see why); (b) a no-break space before the dot (" · ") so the dot stays at the end of "Explore the map" if the line wraps, instead of moving the dangling dot from the top line to the footer. "Set up another place" is deleted; the layout footer's "Set up a place" (layout.tsx:37) stays the one way to /start. The switch between the New York and Paris demo bars is kept, one click away in the footer.

### #28 [minor] today
Where: src/app/today/page.tsx:278 (the issue said 283; the footer link it duplicates is src/app/layout.tsx:37)

Problem: Two links to the same /start page with different words, and no way to reach "Your place and offers" (rule book Today step 7).

Fix:

src/app/today/page.tsx:278
old: <Link href="/start" className="link">Set up another place</Link>
new: <Link href={`/start/confirm?merchant=${merchant.id}`} className="link">Your place and offers</Link>
Do not use the issue's `/start?merchant=${merchant.id}`. src/app/start/page.tsx only reads `error` from searchParams and ignores `merchant`. That URL would open an empty "Step 1 of 2 · Tell Turnout about your place" form behind a link that says "Your place and offers". /start/confirm?merchant=m_penn_pour is the only page that shows this place: "Penn & Pour, located at W 31st St & 8th Ave, New York, NY", its five offers with prices and tags, and a button that posts back to /today?merchant=m_penn_pour. Keep the footer link "Set up a place" in layout.tsx:37 for adding a new place. Follow-ups, separate and not blocking: on that page, change the eyebrow "Step 2 of 2 · confirm what Turnout understood" and the "Start over" link when someone arrives from Today; also, the tag boxes start on the first suggestion each time rather than on the tags already saved.

## 3. Agent prose that reads like a machine

### #11 [major] pulse
**plainWords turns sentences into nonsense. #21 is the same: apply this one.**

Where: src/lib/text.ts:39-56 (plainWords: line 41 starts the chain, line 50 is the `\btags\b` replace). Shows at src/app/pulse/page.tsx:30/72 (Why lead) and :119 (What this does not establish), at 1440 and 390. Same "a high taste" residue on src/app/campaigns/[id]/page.tsx:218 for camp_6eb2de8cb7f5, camp_ee4a790ce23e and camp_8676c08c1a02 (not on the headline camp_5613879d39a1).

Problem: The plain-words pass turns the limitations into nonsense and leaves Qloo tags in Title Case inside prose. A founder reading it says "c'est pourri".

Fix:

The proposed fix will not work as written. Its sentence regex looks for "offer's tags nearby", but it is placed just before the aggregate-affinities line, and by then lines 49-50 have already changed "offer's tags" to "offer's kinds of places". So it never matches. I tested this on the stored strings: the second limitations sentence stays nonsense. Move both new replaces to the start of the chain.

src/lib/text.ts:40-41
OLD:
  return s
    .replace(/[^.]*\bcompressed\b[^.]*\./gi, "")
NEW:
  return s
    .replace(/The offer fits are affinities of places with the offer's tags nearby;\s*they compare offers, they do not forecast sales\./gi, "The offer matches only compare your offers with each other; they do not forecast sales.")
    .replace(/\ba high affinity\b/gi, "a strong match")
    .replace(/[^.]*\bcompressed\b[^.]*\./gi, "")

src/lib/text.ts:50
OLD:
    .replace(/\btags\b/gi, "tastes")
NEW:
    .replace(/\btags\b/gi, "tastes")
    .replace(/\b(crowds are|moods run) ([^:.;]+)/g, (_m: string, a: string, b: string) => `${a} ${b.toLowerCase()}`)

Tested on every stored rationale, limitations and audience_summary (51 strings). Only 5 strings change. Pulse limitations becomes "...and a strong match is not a prediction that anyone walks in. The offer matches only compare your offers with each other; they do not forecast sales." Pulse Why becomes "The street's strongest crowds are cocktail enthusiasts, business professionals and couples, and its moods run intimate, social, energetic and lively: ...". The three campaign limitations now read "a strong match". No proper nouns get lowercased in the current data. Longer term, the pulse prompt (src/server/agent/pulse.ts) should write these words plainly in the first place.

### #21 [minor] pulse
**Duplicate of #11, skip.**

Where: src/lib/text.ts:46-55 (plainWords swaps, order); src/app/pulse/page.tsx:30 (why built from brief.rationale; also used at :72-73) and :119 (limitations); root data = stored brief pulse_aa01f1fc5555 (m_penn_pour, 2026-10-20), written before the round 5 prompt

Problem: The regex word swaps produce nonsense sentences, and the Why paragraph still prints raw Qloo tag names in Title Case.

Fix:

Corrections to the proposed fix:
1. The prompt rule already exists: pulse.ts:18, :20 and :35 say "plain lower-case words" and ban tag, affinity and score (added in 26d9a64). The brief was never regenerated, so adding the rule again changes nothing.
2. brief.audience_tags and brief.ambience_tags do not exist in PulseBriefSchema. Use pulse.audienceTags and pulse.ambienceTags instead.
3. Dropping text.ts:53-55 alone would leave the raw word "affinity" on screen. Add whole-phrase swaps first instead.

A) src/lib/text.ts, inside plainWords. Insert right after line 41 (the "compressed" line) and before line 42, so these run before the generic tag and affinity swaps:
old:
    .replace(/[^.]*\bcompressed\b[^.]*\./gi, "")
new:
    .replace(/[^.]*\bcompressed\b[^.]*\./gi, "")
    .replace(/\bare affinities of places with the (?:offer's|offers') tags nearby\b/gi, "measure how much this street likes places like each offer")
    .replace(/\ba (?:high|strong) affinity\b/gi, "a strong match")
    .replace(/\baggregate (?:taste|affinit(?:y|ies))\b/gi, "shared taste")
Keep lines 53-55 as the fallback.

B) src/app/pulse/page.tsx:30
old:
  const why = brief ? plainWords(noScores(brief.rationale)) : "";
new:
  const tagNames = [...pulse.audienceTags, ...pulse.ambienceTags].map((t) => t.name).filter((n) => n !== n.toLowerCase());
  const lowerTags = (s: string) => tagNames.reduce((a, n) => a.replace(new RegExp(`(?<!^|[.!?]\\s)\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g"), n.toLowerCase()), s);
  const why = brief ? lowerTags(plainWords(noScores(brief.rationale))) : "";
The lookbehind keeps a capital at the start of a sentence.

C) Optional: regenerate the brief for m_penn_pour with "Write this week's plan again" (POST /api/pulse). It goes through the operator, so do not rely on it for the demo.

Tested in node on the stored strings (.tmp/onepath/r6-verify/23/t.mjs):
- Limitations: "Qloo describes the shared taste of this stretch of Chelsea, ... and a strong match is not a prediction that anyone walks in. The offer fits measure how much this street likes places like each offer; they compare offers, they do not forecast sales."
- Why: "The street's strongest crowds are cocktail enthusiasts, business professionals and couples, and its moods run intimate, social, energetic and lively: ..."

### #12 [major] today + campaign
Where: src/lib/text.ts:40-41 (plainWords, runs before firstSentences at src/app/today/page.tsx:161 with a 220 cut and src/app/campaigns/[id]/page.tsx:45-46 with a 320 cut). Seen in .tmp/onepath/r6/today-1440.png (Why) and live on /campaigns/camp_5613879d39a1. The 390 width shows the same text because it comes from the same code.

Problem: Why announces "three reasons that agree" and then shows one, because the text is cut at 220 or 320 characters. It also uses analyst words ("Demographics:", "female-skewing").

Fix:

src/lib/text.ts, insert three lines between line 40 and line 41.
old:
  return s
    .replace(/[^.]*\bcompressed\b[^.]*\./gi, "")
new:
  return s
    .replace(/[^.]*\bwins on (?:two|three|four) (?:signals|reasons) that agree\.\s*/gi, "")
    .replace(/\bDemographics: an? (female|male)-skew(?:ing|ed)\b/g, "A mostly $1")
    .replace(/\b(female|male)-skew(?:ing|ed)\b/gi, "mostly $1")
    .replace(/[^.]*\bcompressed\b[^.]*\./gi, "")
This differs from the proposed fix. It also covers "female-skewed", which 3 stored campaigns use (camp_20b6f1cbd624 sent, camp_7d4b6d90b536 sent, camp_8659baf6e594). The proposed regexes only match "-skewing". Output I tested on the stored rationale:
- Today (220 cut): "A mostly female crowd of 25 to 34 year olds, the core cocktail-bar audience."
- Campaign page (320 cut) adds the Places sentence.
- The 3 theatre rationales ("Before curtain...") do not change at 220. Their "young, female-skewing audience" deeper in the text becomes "young, mostly female audience".
Test script: /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r6-verify/13/test.mts

### #13 [major] who is coming
**Who is coming: taxonomy as a fact title, Dunkin' as a cocktail example. #24 is the same: apply this one.**

Where: src/app/campaigns/new/page.tsx:138 (likeTitle) and src/server/qloo/crowd.ts:138 (topPlaces, the source of the sentence at page.tsx:159, the evidence table at page.tsx:295/297 and the agent prompt at src/server/agent/prompt.ts:96). Who page, 1440 and 390.

Problem: The best page is let down by two raw-data moments. A fact title is made of Qloo tags ("Moderately expensive places, brunch and bar + grill"), and Dunkin' is given as an example of a cocktail bar and happy hour place they like.

Fix:

1) src/app/campaigns/new/page.tsx:138. Old: `const likeTitle = [...(costTag ? [`${costTag.toLowerCase()} places`] : []), ...likeTags.map((n) => n.toLowerCase())].slice(0, 3);` New: `const likeTitle = [...(costTag ? [`${costTag.toLowerCase().replace("moderately expensive", "mid-priced")} places`] : []), ...likeTags.map((n) => n.toLowerCase().replace(/\s*\+\s*/g, " & "))].slice(0, 3);` Result: "Mid-priced places, brunch and bar & grill". Leave isTaste at line 134 as it is. The proposed `!n.includes("+")` drops likeTags to [Brunch], triggers the fallback at line 136 and gives "Mid-priced places, tourist attraction and hotel". I simulated this on the stored tags for event G5diZ_dfkEICb, so that fix makes the title worse.
2) src/server/qloo/crowd.ts:138. Fix it at the source with Qloo's own place tags rather than a name denylist in the page. Old: `topPlaces: places.slice(0, 3).map((p) => p.name) });` New: `topPlaces: places.filter((p) => !(p.tags ?? []).some((t) => /:restaurant:(fast_food|donut_shop|coffee_shop)$/.test(tagId(t)))).slice(0, 3).map((p) => p.name) });` (tagId is already imported there). This only filters the example names, so affinity and matches stay the same. Page line 159 needs no change: if the list comes out empty, its existing branch already falls back to "<tags>: the choice Turnout made for this crowd." This one change also takes Dunkin' out of the evidence table (pre-show happy hour, after-show late plate) and out of the places the agent's prompt is fed.

### #24 [minor] who is coming
**Duplicate of #13, skip.**

Where: src/server/qloo/crowd.ts:138 (topPlaces, the source of the fact 3 examples, the "e.g." column in the evidence and the agent prompt's "places this crowd likes with these tags nearby") and src/app/campaigns/new/page.tsx:137-139 (fact 2 title). The issue's location, page.tsx:159, only prints topPlaces.

Problem: The evidence lines undermine trust: Dunkin' is named as an example of a cocktail happy hour, and fact 2 is Qloo taxonomy, not bar-owner words.

Fix:

1) src/server/qloo/crowd.ts:138. Do NOT use the issue's "keep places whose own tags include an offer tag" filter. Dunkin' carries urn:tag:offerings:place:happy_hour itself, so that filter keeps it. Drop fast-food and donut places from the examples only. The affinity mean at :134 stays over all places.
old:
    profile.offerFits.push({ offerId: offer.id, title: offer.title, tagUrns: urns, tagNames: names, affinity: Math.round((mean + 0.05 * overlap) * 100) / 100, matches: places.length, topPlaces: places.slice(0, 3).map((p) => p.name) });
new:
    // A donut chain or a fast-food counter is no example a bar owner trusts, even when Qloo tags it "happy hour".
    const examples = places.filter((p) => !(p.tags ?? []).some((t) => /^urn:tag:(genre:place:restaurant|category:place):(fast_food|fast_food_restaurant|donut_shop)$/.test(t.tag_id ?? t.id ?? "")));
    profile.offerFits.push({ offerId: offer.id, title: offer.title, tagUrns: urns, tagNames: names, affinity: Math.round((mean + 0.05 * overlap) * 100) / 100, matches: places.length, topPlaces: examples.slice(0, 3).map((p) => p.name) });
Do not add coffee_shop to the filter. In the cache it would also remove Paris bistrots: Chez Prosper, Le temps des cerises, and Lenouvô Cosmos, which Qloo tags "Bar musical & Bistrot". Qloo has no chain tag for Hard Rock Cafe, so it stays.

2) src/app/campaigns/new/page.tsx:137-139
old:
  // "Moderately expensive" is the one price word Qloo gives; it leads the title when it exists.
  const costTag = profile.tags.find((t) => tagId(t).includes(":cost_description:"))?.name;
  const likeTitle = [...(costTag ? [`${costTag.toLowerCase()} places`] : []), ...likeTags.map((n) => n.toLowerCase())].slice(0, 3);
new:
  // Qloo's price word in a bar owner's words ("Moderately expensive" becomes "mid-priced"); it leads the title when it exists.
  const PRICE_WORD: Record<string, string> = { inexpensive: "low-priced", "moderately expensive": "mid-priced", expensive: "upscale", "very expensive": "high-end" };
  const costName = profile.tags.find((t) => tagId(t).includes(":cost_description:"))?.name.toLowerCase();
  const costTag = costName ? (PRICE_WORD[costName] ?? costName) : undefined;
  // Qloo writes "Bar + Grill"; a merchant writes "bar & grill" (not "bar and grill", which doubles the "and" in the list).
  const likeTitle = [...(costTag ? [`${costTag} places`] : []), ...likeTags.map((n) => n.toLowerCase().replace(/\s*\+\s*/g, " & "))].slice(0, 3);
Expected: fact 2 reads "Mid-priced places, brunch and bar & grill". Fact 3 reads "Cocktail bar and happy hour, like 230 Fifth Rooftop Bar, Social Drink & Food and ...", with no Dunkin'.

## 4. Alerts

### #14 [major] alerts + today
**The page promises actions, most rows say "Not written yet". #27 is the same: apply this one.**

Where: src/app/alerts/page.tsx:34, :35, :44; src/app/today/page.tsx:255, :257, :269 (and docs/UX-ONE-PATH.md:56). Leave today/page.tsx:264 as it is. Seen at 1440 and 390.

Problem: The headline promises actions ("What Turnout did on its own", "writes it and tells you"), but 5 of 6 rows say "Not written yet" and the footer says nothing was sent. On Today the three rows have no verb at all. The agentic claim reads as empty.

Fix:

1. alerts/page.tsx:34: "What Turnout did on its own" -> "What Turnout found on its own".
2. alerts/page.tsx:35: "Every hour Turnout looks for a crowd worth a campaign, writes it and tells you." -> "Every hour Turnout looks for the crowds worth a campaign and starts writing the strongest one. Here is what it found."
3. alerts/page.tsx:44 (empty state makes the same promise): "When a crowd worth a campaign is coming in the next two days, Turnout writes the campaign and tells you here." -> "When a crowd worth a campaign is coming in the next two days, Turnout finds it and starts writing the campaign here."
4. today/page.tsx:255: "What Turnout did on its own" -> "What Turnout found on its own". Change docs/UX-ONE-PATH.md:56 (Today step 6) the same way.
5. today/page.tsx:257: "Nothing yet. Every hour, Turnout scans for crowds, writes the campaign for the strongest new one and alerts you." -> "Nothing yet. Every hour Turnout looks for the crowds worth a campaign and starts writing the strongest one."
6. today/page.tsx:264: leave it alone. Do not add "Found " or lowercase the first letter. Under the title "found", each row already reads as something found. Lowercasing would print "harry Styles" on the Harry Styles alert, and the prefix gives "Found Today 21:30" on same-day rows.
7. today/page.tsx:269: "Recorded here; WhatsApp is not connected yet." -> "Kept here until WhatsApp is connected."
alerts/page.tsx:90 stays: it is honest and matches the new lead.

### #27 [minor] alerts + today
**Duplicate of #14, skip.**

Where: src/app/alerts/page.tsx:35 (lead), :78 ("Not written yet."), :71 (the line that breaks at the unit; the issue said :79, which is wrong); src/app/today/page.tsx:264

Problem: "What Turnout did on its own" never says what it did. Alerts promises "writes it", then 4 of 6 rows say "Not written yet". On Today the rows have no verb. At 390 the distance loses its unit.

Fix:

1. alerts/page.tsx:35
old: `Every hour Turnout looks for a crowd worth a campaign, writes it and tells you.`
new: `Every hour Turnout picks the strongest crowd of the next two days, tells you and starts its campaign.`

2. alerts/page.tsx:78
old: `Not written yet.`
new: `Turnout did not finish this campaign.`
The "See who is coming" link under it still lets the merchant write it.

3. alerts/page.tsx:71 (not :79). Add `import { nb } from "@/lib/nbsp";` at the top, then
old: `{what ? `${when} · ${tail}` : tail} {rest.join(" ")}`
new: `{nb(`${what ? `${when} · ${tail}` : tail} ${rest.join(" ")}`)}`

4. today/page.tsx:264
old: `<span>{a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"}</span>`
new: `<span>{(() => { const [when = "", ...name] = (a.message.split("\n")[1] ?? "").split(", about ")[0].split(": "); const st = a.campaign_id ? getCampaign(a.campaign_id)?.status : undefined; return name.length ? `${st === "drafted" || st === "approved" || st === "sent" ? "Wrote the campaign for" : "Found"} ${name.join(": ")}, ${when}` : "Alert"; })()}</span>`
getCampaign is already imported. Rows then read "Found Theatre crowd letting out, Sunday 17:30". This also fixes a hidden bug: the current comma regex would cut "Harry Styles: Together, Together" down to "Harry Styles: Together".

### #33 [minor] alerts
Where: src/app/alerts/page.tsx:71 (row text). Imports at lines 1 to 5 do not include nb.

Problem: Numbers lose their unit at the line end on every row (flagged in r5, still there).

Fix:

Add the import at the top: `import { nb } from "@/lib/nbsp";`. Then change line 71. Old: `{what ? `${when} · ${tail}` : tail} {rest.join(" ")}`. New: `{nb(`${what ? `${when} · ${tail}` : tail} ${rest.join(" ")}`)}`. The two-call version in the issue works the same way. The nb regex `(\d) (pm|am|km|m|min|h)\b` matches "1.2 km", so every row keeps the number with its unit.

## 5. Pulse

### #6 [major] pulse
Where: src/app/pulse/page.tsx:76 (title "What goes out"), :90 (bare "$12 a day"), :261 (Block h3.eyebrow); docs/UX-ONE-PATH.md:25 and :83 (eyebrow rule). Same at 1440 and 390: the code does not depend on width. Checked against r6/pulse-1440.png and pulse-1440.json, rendered 01:58, after HEAD 26d9a64 at 01:54, working tree clean.

Problem: "What goes out" on Pulse lists a paid ad at "$12 a day" with no button and no status, so the owner cannot tell whether it is running or spending money. Pulse also carries four eyebrows outside the plate, which the rule book forbids on Pulse.

Fix:

1) pulse/page.tsx:76
old: `<h2 className="t-title">What goes out</h2>`
new: `<h2 className="t-title">Your words for this week</h2>
            <p className="t-body mt-4">Turnout sends none of this for you. Copy what you want; the ad runs only if you set it up yourself.</p>`
(Do not use "switch it on" as the issue proposes: nothing on Pulse creates an ad that could be switched on.)

2) pulse/page.tsx:90
old: `, ${brief.always_on_ad.daily_budget_usd} a day</>}`
new: `, up to ${brief.always_on_ad.daily_budget_usd}&nbsp;a&nbsp;day if you run it</>}`
(This matches today/page.tsx:156 and campaigns/[id]/page.tsx:165. The nbsp keeps "$12 a day" on one line.)

3) Eyebrows: do not apply the issue's `h3.t-body font-semibold` at :261. That would style each channel name exactly like the headline under it (:82 and :92 are `p.t-body font-semibold text-[var(--ink)]`), so each block would open with two lines that look the same. Keep the eyebrows, which follow the channel-card pattern of Today (today/page.tsx:145-152) and the campaign page (:150), and change the rule book instead:
docs/UX-ONE-PATH.md:25 old: `above the channel cards (three on Today, five on the campaign).` -> new: `above the channel cards (three on Today, five on the campaign, four on the weekly plan).`
docs/UX-ONE-PATH.md:83 old: `` `.t-title` sections, no eyebrows outside a plate.`` -> new: `` `.t-title` sections, no eyebrows outside a plate except above the weekly plan's four channel blocks.``
Optional, for the same words as Today: pulse/page.tsx:78 "Chalkboard" -> "On your chalkboard"; :81 "Google Business post" -> "On your Google listing"; :85 "Note to regulars" -> "To your regulars, on WhatsApp"; :89 "Ad to strangers nearby" -> "To strangers nearby".

### #17 [minor] pulse
**Rule-book text and page disagree on eyebrows outside the plate: align one with the other.**

Where: docs/UX-ONE-PATH.md:25 and :83 (rule text); src/app/pulse/page.tsx:78, :81, :85, :89 (channel names). src/app/pulse/page.tsx:261 (Block h3.eyebrow) is correct as built: leave it.

Problem: Pulse puts 4 eyebrows outside the plate. Rule book, 'Alerts and pulse pages': 'no eyebrows outside a plate'. The channel names also differ from the campaign page's merchant words ('Google Business post', 'Note to regulars').

Fix:

1) Design, docs/UX-ONE-PATH.md:25
old: - Eyebrows (`.eyebrow`) only inside the plate and above the channel cards (three on Today, five on the campaign). Everywhere else a label becomes a
new: - Eyebrows (`.eyebrow`) only inside the plate and above the channel cards (three on Today, five on the campaign, four on the pulse). Everywhere else a label becomes a

2) Design, docs/UX-ONE-PATH.md:83
old: Same rules: link "Today", one `.t-display`, `.t-title` sections, no eyebrows outside a plate.
new: Same rules: link "Today", one `.t-display`, `.t-title` sections, no eyebrows outside a plate except above the pulse's four channel blocks, named in the same merchant words as on Today and the campaign.

3) Build, same change, src/app/pulse/page.tsx (names only, keep the eyebrow class):
:78 <Block title="Chalkboard" tag="Every weekday"> -> <Block title="On your chalkboard" tag="Every weekday">
:81 <Block title="Google Business post" tag="This week"> -> <Block title="On your Google listing" tag="This week">
:85 <Block title="Note to regulars" tag="On WhatsApp"> -> <Block title="To your regulars on WhatsApp" tag="This week">
:89 title="Ad to strangers nearby" -> title="To strangers nearby" (not "around the venue": the pulse ad is always on, around the bar, not tied to a venue)

Reject the issue's :261 change (h3.eyebrow -> h3.t-body font-semibold). Today (today/page.tsx:145-153) and the campaign page also put channel eyebrows outside the plate. That change would make the pulse the only screen without them.

## 6. One frame for every page

### #29 [minor] today vs campaign vs who
**Plate width and left edge change from page to page. #30 is the same: apply this one.**

Where: src/app/today/page.tsx:102 (plateClass with the 68 px bleed; line 105 is the main tag); src/app/campaigns/[id]/page.tsx:90 (plain plate; the issue said 91); src/app/campaigns/new/page.tsx:167 (plain plate) and :164 (main uses px-5, not px-6)

Problem: The plate changes width and left edge from Today to the campaign page and Who is coming, so the next screen looks like a different app.

Fix:

1) src/app/campaigns/[id]/page.tsx:90
old: <div className="plate">
new: <div className="plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">
2) src/app/campaigns/new/page.tsx:167
old: <div className="plate">
new: <div className="plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">
3) src/app/campaigns/new/page.tsx:164
old: <main className="mx-auto max-w-5xl px-5 py-10">
new: <main className="mx-auto max-w-5xl px-6 py-10">
Result at 1440: all three plates run 164 to 1276. The plate text sits at 232, in line with the "Today" link and the section titles below. Keep Today's bleed: removing it would put Today's plate text at 296, off the date line. Also seen but outside this issue: Pulse (src/app/pulse/page.tsx:40, max-w-6xl px-5, plate at :43) has its own edge too.

### #30 [minor] all merchant pages
**Duplicate of #29, skip.**

Where: src/app/pulse/page.tsx:40 and :43; src/app/radar/page.tsx:84; src/app/campaigns/new/page.tsx:164 and :167; src/app/campaigns/[id]/page.tsx:90. Leave src/app/today/page.tsx:102 and :105 alone: they are the model. campaigns/[id]/page.tsx:86 is already `max-w-5xl px-6`, so it needs no change.

Problem: Page edges and plate widths jump from page to page, so going from Today to a campaign the plate shrinks and shifts. That is not premium.

Fix:

1. src/app/pulse/page.tsx:40
old: `<main className="mx-auto max-w-6xl px-5 py-10">`
new: `<main className="mx-auto max-w-5xl px-6 py-10">`
2. src/app/pulse/page.tsx:43
old: `<section className="plate stack-block">`
new: `<section className="plate stack-block min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">`
3. src/app/radar/page.tsx:84
old: `<main className="mx-auto max-w-6xl px-5 py-10">`
new: `<main className="mx-auto max-w-5xl px-6 py-10">`
Do not make the map wrapper at :102 bleed. If it did, RadarView's "Crowds worth a campaign" title would sit at 164 again.
4. src/app/campaigns/new/page.tsx:164
old: `<main className="mx-auto max-w-5xl px-5 py-10">`
new: `<main className="mx-auto max-w-5xl px-6 py-10">`
5. src/app/campaigns/new/page.tsx:167
old: `<div className="plate">`
new: `<div className="plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">`
6. src/app/campaigns/[id]/page.tsx:90
old: `<div className="plate">`
new: `<div className="plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">`
Optional: export Today's `plateClass` string (today/page.tsx:102) as a shared constant and use it in all four places so the pages cannot drift apart again. Do not move the bleed into `.plate` in globals.css: src/app/page.tsx:57 and :74 also use `.plate`, and that landing page sits in a different column.

### #31 [minor] explore
Where: src/app/radar/radar.css:74 (.tm-crowds). The note about radar.css:37 (.tm-list) is not part of the problem: .tm-list already spans the full .tm-root (1112 px at 1440). The 544 px comes from li max-width var(--measure) = 32em (globals.css:234) in a single-track grid.

Problem: Below the map, the list is a 544 px column and the right half of the page is empty, so it reads as unfinished.

Fix:

src/app/radar/radar.css:74
old: `.tm-crowds { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }`
new: `.tm-crowds { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; }
@media (min-width: 1024px) { .tm-crowds { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 64px; row-gap: 32px; } }`
Leave .tm-list (line 37) alone; it already spans the full width. Leave RadarView.tsx alone too: the folded list "All N crowds" reuses .tm-crowds and gets the same two columns.

## Not verified

39 minor issues reported by one judge only are in `.tmp/onepath/r6-result.json` under `unverified`.
