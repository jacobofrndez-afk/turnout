# One path, round 5: fixes for the build session

After d083f4d and fda01d0 every screen was re-rendered at 1440 and 390 (`.tmp/onepath/r5/`) and judged structure first. Scores: clarity 6.5 (first-time bar owner, three-second test), founder lens 6, type 7.5. Today and the campaign page now pass the three-second test above the fold (one huge offer, one Publish, one quiet link), and the path Today > Publish > Today takes two clicks.

What still breaks trust is truth, not type: the same crowd at different times on two screens, a plate pushing a window with minutes left, "tonight" in copy for tomorrow, a paid ad behind a one-click Publish, "What goes out" listing channels Publish never sends, alert links to campaigns stuck "in a few minutes" for hours. The three-second judge says that fixing the times, the Who is coming button, the channel list and the alert dead ends gets it to 8.

Each issue was confirmed by a separate skeptic on the current code; the fix text is the skeptic's corrected version. Duplicates are marked. The one design issue (display line-height 0.9 let descenders hit the next line) is fixed in b7263d1, with the type judge's other values: section titles 30 to 36 px at 1.1, rhythm 72 to 96 px, the map board title in the body family.

## 1. Trust: times, money and what Publish really does (fix first)

### #2 [major] today + explore
**Same crowd, different times on Today and Explore, and past crowds in Coming next. Recommended over #13 (same issue).**

Where: src/app/today/page.tsx:222 (time shown) and src/app/today/page.tsx:45 (order of "Coming next"). Explore, src/app/radar/RadarView.tsx:481, is correct and needs no change.

Problem: The same crowd shows different times on Today and Explore. "Coming next" also lists crowds that started hours ago.

Fix:

1) src/app/today/page.tsx:222
old: <span className="mono">{fmtShort.format(new Date(w.start))} {fmtTime.format(new Date(w.arrive))}</span>
new: <span className="mono">{fmtShort.format(new Date(w.start))} {fmtTime.format(new Date(w.start))}</span>

2) src/app/today/page.tsx:45. Sort by start, because `upcoming` is sorted by arrive (line 41) and arrive lead varies by kind (venue start-150 min, TV start-30, wave about start-60). Without this, change 1 gives a list out of order, e.g. 19:00, 20:00, 19:00.
old: const later = upcoming.filter((it) => it !== next).slice(0, 3);
new: const later = upcoming.filter((it) => it !== next).sort((a, b) => presenceWindow(a.event).start - presenceWindow(b.event).start).slice(0, 3);

Reject the proposed `presenceWindow(it.event).arrive > now` filter. Do not apply it.

### #13 [major] today + explore
**Duplicate of #2, skip.**

Where: src/app/today/page.tsx:222 (line in Coming next), plus :45 (order of `later`) and :51 (fmtShort, unused after the fix). Explore side for reference: src/app/radar/RadarView.tsx:481 prints dayLabel(w.start) + start time + it.headliner (from src/app/radar/page.tsx:58, it.headliner.name).

Problem: Same event shows a different time and name on Today and on Explore. Today prints the presence-window arrival and the short weekday. Explore prints the event start and the headliner.

Fix:

src/app/today/page.tsx:222
old: <span className="mono">{fmtShort.format(new Date(w.start))} {fmtTime.format(new Date(w.arrive))}</span> · <b>{it.event.name}</b>
new: <span className="mono">{whenWord(w.start)} {fmtTime.format(new Date(w.start))}</span> · <b>{it.headliner.name}</b>

src/app/today/page.tsx:45 (lines are picked by arrival time; once they show start times they read out of order, e.g. 19:00, 20:00, 19:00)
old: const later = upcoming.filter((it) => it !== next).slice(0, 3);
new: const later = upcoming.filter((it) => it !== next).slice(0, 3).sort((a, b) => presenceWindow(a.event).start - presenceWindow(b.event).start);

src/app/today/page.tsx:51 (unused after the change)
old: const fmtShort = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz });
new: (delete the line)

Change from the proposed fix: use it.headliner.name, not attractions[0]?.name ?? event.name. Explore takes its name from it.headliner.name (server/events/concentration.ts headliner()). For waves, TV and street moments that function keeps event.name; headlinerOf in radar/page.tsx is only used for the short timeline label. One small difference stays: Today says "Tonight" from 17:00, Explore says "Today". That matches the plate eyebrow and is acceptable.

### #1 [major] today
Where: src/app/today/page.tsx:41 (upcoming filter, which feeds the plate pick at 43-44 and Coming next at 45) and :89 (peopleLine)

Problem: The plate headlines a crowd whose window is almost over and never says so. Publish looks urgent and useful when it has minutes left.

Fix:

1) today/page.tsx:41, apply the guard to `upcoming`, not to `soon`. Old:
`const upcoming = items.filter((it) => it.interesting && presenceWindow(it.event).leave > now).sort((a, b) => presenceWindow(a.event).arrive - presenceWindow(b.event).arrive);`
New:
`const upcoming = items.filter((it) => it.interesting && presenceWindow(it.event).leave > now + 45 * 60_000).sort((a, b) => presenceWindow(a.event).arrive - presenceWindow(b.event).arrive);`
Line 43 stays as it is.
2) today/page.tsx:89, inside peopleLine. Old:
`About {next.capacity.toLocaleString("en-US")} people {around} from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span>. Turnout expects`
New:
`About {next.capacity.toLocaleString("en-US")} people {around} {w0.arrive <= now ? <>right now, until <span className="mono">{fmtTime.format(new Date(w0.leave))}</span></> : <>from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span></>}. Turnout expects`
(the rest of the line is unchanged)

### #11 [major] all
Where: Today plate: src/app/today/page.tsx:89 (formatter at :47), plus :149 (draft.windows) and :222 (Coming next). Campaign plate: src/app/campaigns/[id]/page.tsx:73 and :193. The issue's pointer to :57 is wrong for the plate. Those lines print the stored draft.windows start_local/end_local strings, which come in "HH:MM" from src/server/agent/prompt.ts:54. fmtClock at :57 is only used in outSentence at :66. Who is coming: src/app/campaigns/new/page.tsx:166 (formatter at :104). Explore: src/app/radar/RadarView.tsx:337, 357, 371, 442, 481 (formatter at :60). Alerts body: the text is stored, not formatted on the page. It is built in src/server/agent/scan.ts:114/123 composeAlert, not by the alerts/page.tsx:26 formatter, which only prints the "Fri 23 Oct, 16:52" stamp. Pulse: hard-coded "17:00 to 21:00" at src/app/pulse/page.tsx:108 and "17:00 to 19:00" at :235.

Problem: Times use a 24-hour clock for a New York bar and mix with the offers' "pm" in the same sentence. The rule book's own example is "from 5:30 pm".

Fix:

Do not apply the issue's fix as written. (a) en-US with hour:"numeric", minute:"2-digit" prints "5:30 PM to 7:00 PM", tested in node: capital PM, U+202F, ":00". That still clashes with the offers' "5 to 7 pm" and the rule book's "5:30 pm". (b) "Apply the same switch" to fmtHour (today:48, campaigns/new:105, RadarView:64) breaks code. Those values feed Number(...) >= 17, and en-US gives "5 PM" -> NaN, so "Tonight" never shows. Keep fmtHour as it is. (c) Keep start_local/end_local as "HH:MM" in prompt.ts:54 and schema.ts:6-7, because existing drafts in the DB already hold "17:30". Convert them when the page renders.

NEW src/lib/clock.ts:
```ts
// A US bar says "5:30 pm" and "5 to 7 pm"; a Paris bar says "17:30". Strings are "HH:MM", as stored in draft.windows.
const us = (tz: string) => tz.startsWith("America/") || tz.startsWith("US/") || tz === "Pacific/Honolulu";
export const hhmm = (t: number | Date, tz: string) => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz }).format(t);
const say = (s: string, suffix: boolean) => { const [h, m] = s.split(":").map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""}${suffix ? ` ${h >= 12 ? "pm" : "am"}` : ""}`; };
const str = (t: number | Date | string, tz: string) => (typeof t === "string" ? t : hhmm(t, tz));
export const clock = (t: number | Date | string, tz: string) => (us(tz) ? say(str(t, tz), true) : str(t, tz));
export function clockRange(a: number | Date | string, b: number | Date | string, tz: string): string {
  const sa = str(a, tz), sb = str(b, tz);
  if (!us(tz)) return `${sa} to ${sb}`;
  const same = (Number(sa.slice(0, 2)) >= 12) === (Number(sb.slice(0, 2)) >= 12);
  return `${say(sa, !same)} to ${say(sb, true)}`;
}
```
Call sites (old -> new):
- today/page.tsx:89 `from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span>` -> `from <span className="mono">{clockRange(w0.arrive, w0.leave, tz)}</span>`. Result: "from 5:30 to 7 pm".
- today/page.tsx:149 `${w.start_local} to ${w.end_local}` -> `${clockRange(w.start_local, w.end_local, tz)}`
- today/page.tsx:222 `{fmtTime.format(new Date(w.arrive))}` -> `{clock(w.arrive, tz)}`. This also changes rule book item 4 from "Sat 20:00" to "Sat 8 pm".
- campaigns/[id]/page.tsx:73 and :193 `{w.start_local} to {w.end_local}` -> `{clockRange(w.start_local, w.end_local, tz)}`. Result: "Before doors 5:30 to 7:30 pm, after the show 10:45 pm to 12:15 am".
- campaigns/[id]/page.tsx:66 `fmtClock.format(sentAt)` -> `clock(sentAt, tz)`
- campaigns/new/page.tsx:166 `{fmtTime.format(starts)}` -> `{clock(starts, tz)}`. Result: "tonight at 8 pm".
- RadarView.tsx:337, 357, 371, 442, 481 `fmtTime.format(new Date(X))` -> `clock(X, tz)`
- scan.ts:123 `${day} ${fmtTime.format(new Date(w.start))}: ... from ${fmtTime.format(new Date(w.arrive))} to ${fmtTime.format(new Date(w.leave))}.` -> `${day} ${clock(w.start, merchant.timezone)}: ... from ${clockRange(w.arrive, w.leave, merchant.timezone)}.` This only affects new alerts. Old alert rows keep their "17:30" text.
- pulse/page.tsx:108 `17:00 to 21:00` -> `5 to 9&nbsp;pm`. pulse/page.tsx:235 `17:00 to 19:00` -> `5 to 7&nbsp;pm`. Also run `a.from`/`a.to` through clockRange.
- docs/UX-ONE-PATH.md item 4: change the example "Sat 20:00" to "Sat 8 pm".

### #7 [major] campaign
**Copy says "tonight" for a campaign that runs tomorrow, and nothing says WhatsApp goes out on Publish. #15 is the same root cause: apply this one.**

Where: src/server/agent/prompt.ts:25 (SYSTEM_PROMPT rules) and :69 (buildUserPrompt, no "now" line); src/app/campaigns/[id]/page.tsx:146 (WhatsApp block, nothing about timing before publish); data: stored draft of camp_869f94483d5f

Problem: The copy says "tonight" for a campaign that runs tomorrow, and nothing on screen says WhatsApp goes out the moment you press Publish. Publishing Friday tells regulars Harry Styles plays tonight.

Fix:

1. prompt.ts:25, old:
"- Time windows: use the suggested ones unless the evidence says otherwise; keep local HH:MM."
new:
"- Time windows: use the suggested ones unless the evidence says otherwise; keep local HH:MM.
- Day words: say \"tonight\" or \"today\" only when the event falls on the same local day as Now; otherwise name the weekday (\"Saturday\"). The WhatsApp message is sent the moment the merchant publishes, so it must read right on the day it is sent. Use the same day word in every channel."

2. prompt.ts:69, after the "# Merchant" push, add:
"const fmtNow = new Intl.DateTimeFormat(\"en-GB\", { weekday: \"long\", day: \"numeric\", month: \"long\", hour: \"2-digit\", minute: \"2-digit\", timeZone: merchant.timezone });
lines.push(`# Now`, `${fmtNow.format(new Date())} local. The merchant may publish now or later the same day.`, \"\");"

3. page.tsx:146, old:
"{c === \"whatsapp\" && <p className=\"t-body whitespace-pre-wrap\">{nb(draft.whatsapp.message)}</p>}"
new:
"{c === \"whatsapp\" && (<><p className=\"t-body whitespace-pre-wrap\">{nb(draft.whatsapp.message)}</p>{campaign.status === \"drafted\" && !send && <p className=\"t-body text-[var(--muted)]\">Sent to your regulars the moment you press Publish.</p>}</>)}"
(Keep the plate at one sentence per the rule book; do not lengthen the t-lead at line 96 as the issue suggested.)

4. Data: regenerate the draft of camp_869f94483d5f after the prompt change (stored WhatsApp says "plays the Garden tonight", chalkboard "HARRY STYLES TONIGHT", while the Google post already says "Saturday").

### #15 [major] campaign
**Duplicate of #7, skip.**

Where: src/server/agent/prompt.ts:22 (SYSTEM_PROMPT copy rule), plus the stored draft of camp_869f94483d5f (data/crowd.db campaigns.copy_json, source data/agent-inbox/camp_869f94483d5f.draft.json). schema.ts:13 only a minor extra. schema.ts:35 is the wrong place.

Problem: Copy for a Saturday campaign says "tonight" while the plate says "tomorrow", and the Google post says "Saturday". He reads a contradiction in the very words he is about to publish.

Fix:

1) src/server/agent/prompt.ts:22, add a new rule line right after the "Copy is for the channel..." line:
"- Name the event night by its weekday (e.g. \"Saturday\"), never \"tonight\" or \"tomorrow\", in every channel and in the limitations: the copy can be published the day before and is read on other days."
2) src/server/agent/schema.ts:13 "The id of the offer to push tonight" -> "The id of the offer to push for this event" (Anthropic path only, so the field description stops saying tonight).
3) Fix the live demo draft camp_869f94483d5f (built before the rule existed, so 1) will not change it): re-draft it, or patch copy_json: whatsapp.message "Harry Styles plays the Garden tonight, so 8th Avenue" -> "Harry Styles plays the Garden on Saturday, so 8th Avenue"; storefront.chalkboard "HARRY STYLES TONIGHT" -> "HARRY STYLES AT MSG"; limitations "who holds a ticket tonight" -> "who holds a ticket for Saturday".
Do not use the proposed schema.ts:35 change: that description is never seen by the operator provider that wrote this draft.

### #9 [major] today + campaign
**Ad spend shown as a bare "$35 a day" next to a one-click Publish. #14 is the same: apply this one.**

Where: src/app/today/page.tsx:149; src/app/campaigns/[id]/page.tsx:152 (pulse dropped: src/app/pulse/page.tsx:194 has no Publish button and the always-on ad really is daily, so "$12 a day" is right there)

Problem: Ad spend appears as a bare "$35 a day" next to a one-click Publish. A bar owner cannot tell whether Publish spends money, how much, or for how many days.

Fix:

Proposed fix wrong → asserts spend that never happens. Say Publish costs nothing, budget only a cap once switched on. Bind "$N a day" with nbsp (nb() does not cover it; it broke as "$35 / a day" at 1440).

today/page.tsx:149
old: `.join(" · "))} · ${draft.geofenced_ad.daily_budget_usd} a day</p>`
new: `.join(" · "))}. Snapchat, up to ${draft.geofenced_ad.daily_budget_usd}&nbsp;a&nbsp;day once you switch it on. Publish costs nothing.</p>`

campaigns/[id]/page.tsx:152
old: `, <span className="mono">${draft.geofenced_ad.daily_budget_usd}</span> a day. Button: {nb(draft.geofenced_ad.cta)}.`
new: `, up to <span className="mono">${draft.geofenced_ad.daily_budget_usd}</span>&nbsp;a&nbsp;day once you switch it on. Publish costs nothing. Button: {nb(draft.geofenced_ad.cta)}.`

Do not use "$35 for tonight" or "{dayword} only": wrong for the code.
- Ad end = now + 36 h (src/server/channels/index.ts:64) → could run two calendar days.
- Windows can cross midnight (campaign render: 22:45 to 00:15).

### #14 [major] today, campaign
**Duplicate of #9, skip.**

Where: src/app/today/page.tsx:125 (lead of the drafted plate); src/app/campaigns/[id]/page.tsx:96 (lead of the plate when the campaign is not out yet). Not line 69: offerLine is also reused at line 93 after publish.

Problem: Publish starts a paid ad but the plate never says so. The daily cost only shows as small grey text under the third card, or deep in the channel list. A merchant feels trapped, and it does not look premium.

Fix:

today/page.tsx:125
old:
              {peopleLine}
new:
              {peopleLine}{` The ad to strangers costs $${draft.geofenced_ad.daily_budget_usd} a day.`}

campaigns/[id]/page.tsx:96
old:
                <p className="t-lead mt-5">{offerLine}</p>
new:
                <p className="t-lead mt-5">{offerLine}{campaign.status === "drafted" && !nightOver ? ` The ad to strangers costs $${draft.geofenced_ad.daily_budget_usd} a day.` : ""}</p>

Leave offerLine (line 69) alone, so the out state (line 93) does not repeat the cost under "Ready on 3 channels". The nbsp keeps "$35 a day" on one line. The card line at today:149 currently breaks as "$35 / a day" at 1440 because nb() does not bind "a day". No rule-book conflict: it is still the plate's one sentence, with no new element and no second button.

### #5 [major] today + campaign
Where: src/app/campaigns/[id]/page.tsx:78 (campaign page only; the Today half, src/app/today/page.tsx:135-151, is refuted)

Problem: "What goes out" does not match what Publish sends. Today shows 3 channels with no screens. The campaign page shows 5, including a Google listing that is never sent.

Fix:

src/app/campaigns/[id]/page.tsx only.
1) Imports, after line 8 add:
import { getDb } from "@/server/db/client";
2) Line 78:
old: const channels: ChannelId[] = CHANNEL_ORDER.filter((c) => draft || sendByChannel.has(c));
new:
  // Only what Publish will send (the merchant's channels, as in publishCampaign), plus the chalkboard, which is the merchant's own.
  const merchantChannels = JSON.parse((getDb().prepare("SELECT channels_json FROM merchants WHERE id = ?").get(merchant.id) as { channels_json: string } | undefined)?.channels_json ?? "[]") as ChannelId[];
  const channels: ChannelId[] = CHANNEL_ORDER.filter((c) => sendByChannel.has(c) || (draft && (c === "storefront" || merchantChannels.includes(c))));
Result for Penn & Pour / Le Quai 12: chalkboard, WhatsApp, strangers, screens. "On your Google listing" goes away. Atlantic Tap (has google_post) keeps it.
Today: no change. UX-ONE-PATH.md line 51 says Today shows "the three channel cards (chalkboard, regulars, strangers), unchanged", and line 25 limits eyebrows to those three cards. So Today leaving out screens follows the rule book. It is not a build defect. Adding a fourth card would be a design call against the rule book.

### #8 [major] campaign (after Publish)
Where: src/app/campaigns/[id]/page.tsx:66 (outSentence, simulated branch, shown as .t-lead in the plate at line 91); src/app/today/page.tsx:166 (plate, sent/approved branch)

Problem: After pressing Publish, the owner never reads "Published". The campaign page says "Ready on 3 channels." while Today says "is out".

Fix:

1) src/app/campaigns/[id]/page.tsx:66, simulated branch.
OLD: sends.some((s) => s.simulated) ? `Ready on ${sends.length} channels.` :
NEW: sends.some((s) => s.simulated) ? `Published at ${fmtClock.format(sentAt)}. Each channel goes out as soon as it is connected.` :
(sentAt is always defined here because sends.length > 0. Leave the count out: the page lists 5 channel blocks but only 3 have a send, so "3 channels" adds a second mismatch. The sentence also stays true when one channel is live and the others are simulated.)
2) src/app/today/page.tsx:166.
OLD: <p className="t-name">{offer?.title ?? "Your campaign"} is out.</p>
NEW: <p className="t-name">{offer?.title ?? "Your campaign"} is published.</p>
Optional, same line group: link "See where it went" -> "See where it goes", so it does not claim something already went out.

### #10 [major] alerts (and campaign)
Where: src/app/campaigns/[id]/page.tsx:105-111 (awaiting_operator branch has no age check; a stale-flag line goes after :66), src/app/alerts/page.tsx:60 and :75-77 (link label ignores campaign status; import at :3)

Problem: "What Turnout did on its own" links to campaigns that are not written. The page then promises "a few minutes" for campaigns started hours ago: a dead end.

Fix:

1) campaigns/[id]/page.tsx, after line 66 (`const out = ...`), add:
  const stale = campaign.status === "awaiting_operator" && now - parseUtc(campaign.created_at) > 15 * 60_000;

Line 105, old:
          ) : campaign.status === "awaiting_operator" ? (
new (insert a stale branch before the existing fresh one, and leave lines 106-111 unchanged for fresh rows):
          ) : stale ? (
            <>
              <h1 className="t-display mt-5">Not written yet</h1>
              <p className="t-lead mt-5">Turnout started this campaign at {fmtClock.format(parseUtc(campaign.created_at))} and has not finished it. The crowd is read: see who is coming while it waits.</p>
              {lastWindowEnd < now
                ? <p className="t-body mt-10">This night has passed. Write a new campaign for the next crowd from <Link href={`/today?merchant=${merchant.id}`} className="link">Today</Link>.</p>
                : <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}`} className="btn btn-accent btn-lg mt-10">See who is coming</Link>}
            </>
          ) : campaign.status === "awaiting_operator" ? (
(no RefreshEvery in the stale branch, so the page stops refreshing every 20 s forever.)

2) alerts/page.tsx:3, old: import { listAlerts } from "@/server/agent/scan";
new: import { listAlerts } from "@/server/agent/scan";
import { getCampaign } from "@/server/agent/run";
Line 60, old:
            const href = a.campaign_id ? `/campaigns/${a.campaign_id}` : `/radar?merchant=${merchant.id}`;
new:
            const camp = a.campaign_id ? getCampaign(a.campaign_id) : undefined;
            const unwritten = camp?.status === "awaiting_operator" && Date.now() - Date.parse(camp.created_at.replace(" ", "T") + "Z") > 15 * 60_000;
            const href = unwritten ? `/campaigns/new?merchant=${merchant.id}&event=${a.event_id}` : a.campaign_id ? `/campaigns/${a.campaign_id}` : `/radar?merchant=${merchant.id}`;
Lines 75-77, old:
                <Link href={href} className="link mt-3 inline-flex text-base">
                  {a.campaign_id ? "See the campaign" : "Explore the map"}
                </Link>
new:
                {unwritten && <p className="t-body mt-2 text-[var(--muted)]">Not written yet.</p>}
                <Link href={href} className="link mt-3 inline-flex text-base">
                  {unwritten ? "See who is coming" : a.campaign_id ? "See the campaign" : "Explore the map"}
                </Link>

Do not use the proposed "Write it now" button that posts to /api/campaigns. The live server drafts in operator mode, so the post makes one more awaiting_operator row and lands on this same page again.

## 2. Who is coming

### #3 [major] who is coming
**The one button below the fold. #17 adds the guests figure: apply both together.**

Where: /Users/jacobofernandez/Code/Qloo/src/app/campaigns/new/page.tsx:164-168 (h1 + t-lead, no plate) and :204-209 (the form placed after the three facts, className="stack-section"). Rule book /Users/jacobofernandez/Code/Qloo/docs/UX-ONE-PATH.md, "Who is coming" step 3 (button after the facts), conflicts with its own rule ".btn-lg on the plate".

Problem: The screen's one button is below the first viewport at both widths, so there is no visible action in the first three seconds.

Fix:

Use the campaign page pattern (src/app/campaigns/[id]/page.tsx:84-98): put the headline, the one sentence and the button on one plate, with the three facts after it.

OLD (164-168):
      <h1 className="t-display mt-5">{profile.headlinerName}</h1>
      <p className="t-lead mt-5">
        {event.venue_name}, {day} ... {merchant.name}</>}.
      </p>

NEW:
      <section className="stack-block">
        <div className="plate">
          <h1 className="t-display">{profile.headlinerName}</h1>
          <p className="t-lead mt-5">
            {event.venue_name}, {day} ... {merchant.name}</>}.
          </p>
          {hasSignal(profile) && (
            <form action="/api/campaigns" method="post" className="mt-10">
              <input type="hidden" name="merchant" value={merchant.id} />
              <input type="hidden" name="event" value={event.id} />
              {sp.pick && <input type="hidden" name="pick" value={sp.pick} />}
              <button className="btn btn-accent btn-lg">Write my campaign</button>
            </form>
          )}
        </div>
      </section>

OLD (204-209): the whole <form action="/api/campaigns" method="post" className="stack-section"> ... </form> block
NEW: delete it. The facts <section className="stack-section"> (196-203) stays as is, and so does the stack-block on each fact.

Rule book (build): in "Who is coming", step 1 becomes "Link 'Today'. Plate: `.t-display` the crowd's name, `.t-lead` where and when, button 'Write my campaign'". Step 2 stays the three facts, step 3 is removed.

Do NOT ship the issue's "at minimum" fallback (mt-12 space-y-10, form mt-10). Simulated live, it still fails at 390: button bottom at 940 with the fold at 844. At 1440 the button bottom lands at exactly 900, right on the fold, and below it in a real 1440 laptop window (about 790 px tall).

### #17 [major] who
Where: src/app/campaigns/new/page.tsx:165-168 (the lead) and :204-209 (the form, not 203-208: line 203 is the facts section's closing tag); src/app/campaigns/new/page.tsx:3-4 and after :115 (guest count); src/server/events/radar.ts:89 (rowToEvent is not exported); docs/UX-ONE-PATH.md:72-76 (Who order)

Problem: The one action sits below the fold at both widths, and the page never says how many guests this crowd could bring, which is the only number a merchant cares about.

Fix:

1) src/server/events/radar.ts:89
old: function rowToEvent(r: EventDbRow): TmEvent {
new: export function rowToEvent(r: EventDbRow): TmEvent {

2) src/app/campaigns/new/page.tsx:3-4
old: import { haversineKm } from "@/server/events/concentration";
import { getMerchant } from "@/server/events/radar";
new: import { haversineKm, scoreConcentration } from "@/server/events/concentration";
import { getMerchant, rowToEvent } from "@/server/events/radar";

3) src/app/campaigns/new/page.tsx, insert after :115 (the `const radius = ...` line):
  // The number Explore and Today show for this crowd: the extra guests it could bring this place.
  const guests = scoreConcentration(rowToEvent(event as Parameters<typeof rowToEvent>[0]), { lat: merchant.lat, lon: merchant.lon, radiusM: merchant.radius_m, seats: merchant.seats ?? 60 }).potentialGuests;

4) src/app/campaigns/new/page.tsx:165-168
old:
      <p className="t-lead mt-5">
        {event.venue_name}, {day} {isShow ? "at" : "from"} <span className="mono">{fmtTime.format(starts)}</span>
        {isShow && <>, {walk ?? <><span className="mono">{nb(km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`)}</span> from</>} {merchant.name}</>}.
      </p>
new:
      <p className="t-lead mt-5">
        {event.venue_name}, {day} {isShow ? "at" : "from"} <span className="mono">{fmtTime.format(starts)}</span>
        {isShow && <>, {walk ?? <><span className="mono">{nb(km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`)}</span> from</>} {merchant.name}</>}.
        {guests > 0 && <> It could bring you about {guests} guests.</>}
      </p>
      {hasSignal(profile) && (
        <form action="/api/campaigns" method="post" className="mt-10">
          <input type="hidden" name="merchant" value={merchant.id} />
          <input type="hidden" name="event" value={event.id} />
          {sp.pick && <input type="hidden" name="pick" value={sp.pick} />}
          <button className="btn btn-accent btn-lg">Write my campaign</button>
        </form>
      )}

5) src/app/campaigns/new/page.tsx:204-209: delete the old form block (from `<form action="/api/campaigns" method="post" className="stack-section">` through `</form>`), so the hasSignal fragment holds only the three-facts section. Keep the hasSignal guard on the moved form. The issue's fix leaves it out, and that would show the button on needs_input and unresolved crowds.

6) docs/UX-ONE-PATH.md:72-76 (Who is coming), make the rule match:
old: 1. Link "Today". `.t-display` the crowd's name. `.t-lead` where and when, for which place. / 2. Three facts ... / 3. Button "Write my campaign".
new: 1. Link "Today". `.t-display` the crowd's name. `.t-lead` where and when, for which place, and "It could bring you about N guests." / 2. Button "Write my campaign", right under the sentence, as on Today and the campaign page. / 3. Three facts ... (renumber the evidence disclosure to 4).

Expected after the fix: button top about 433 at 1440 (fold 900), about 384 at 390 (fold 844). For this crowd the lead reads "...two blocks from Penn & Pour. It could bring you about 100 guests."

### #4 [major] who is coming
Where: src/app/campaigns/new/page.tsx:147 (the `written` query) and :204-209 (the form). Also docs/UX-ONE-PATH.md:76 (the rule book says only "Button 'Write my campaign'"). Width-independent server markup → same at 1440 and 390.

Problem: Who is coming offers "Write my campaign" even when Turnout already wrote one. The Explore path then leads to a duplicate, not to the campaign waiting to be published.

Fix:

1) Line 147, old:
const written = getDb().prepare("SELECT id FROM campaigns WHERE merchant_id = ? AND event_id = ? AND status IN ('drafted', 'approved', 'sent') ORDER BY created_at DESC LIMIT 1").get(merchant.id, event.id) as { id: string } | undefined;
new:
const written = getDb().prepare("SELECT id FROM campaigns WHERE merchant_id = ? AND event_id = ? AND (status IN ('drafted', 'approved', 'sent') OR (status = 'awaiting_operator' AND created_at > datetime('now', '-15 minutes'))) ORDER BY created_at DESC LIMIT 1").get(merchant.id, event.id) as { id: string } | undefined;
(Use the same 15-minute window as Today's `fresh`, today/page.tsx:76. In operator mode, rows stuck in awaiting_operator for days are common: camp_07e2e9db752e has been waiting since Oct 21. With no time limit, the link would trap the merchant on "Writing your campaign" for good and remove the only way to write the campaign again.)

2) Lines 204-209, old:
          <form action="/api/campaigns" method="post" className="stack-section">
            <input type="hidden" name="merchant" value={merchant.id} />
            <input type="hidden" name="event" value={event.id} />
            {sp.pick && <input type="hidden" name="pick" value={sp.pick} />}
            <button className="btn btn-accent btn-lg">Write my campaign</button>
          </form>
new:
          {written ? (
            <div className="stack-section">
              <Link href={`/campaigns/${written.id}`} className="btn btn-accent btn-lg">See my campaign</Link>
            </div>
          ) : (
            <form action="/api/campaigns" method="post" className="stack-section">
              <input type="hidden" name="merchant" value={merchant.id} />
              <input type="hidden" name="event" value={event.id} />
              {sp.pick && <input type="hidden" name="pick" value={sp.pick} />}
              <button className="btn btn-accent btn-lg">Write my campaign</button>
            </form>
          )}
(Wrap the Link in a div that carries stack-section. The suggested fix puts the button classes on the bare Link and drops the section spacing. Keep the label "See my campaign", not "Follow the draft": the rule book bans the word "draft".)

3) docs/UX-ONE-PATH.md:76, old: `3. Button "Write my campaign".` → new: `3. Button "Write my campaign", or "See my campaign" when Turnout already wrote one (or started less than 15 minutes ago).`

## 3. The campaign page

### #16 [major] campaign
**Channel names at the same 36 px as "What goes out". Recommended fix: the five h3 become .t-name (body family, 600, about 21 px). #6, #24 and #30 are the same: skip them.**

Where: src/app/campaigns/[id]/page.tsx:137 (the issue said 136; 136 is the `<div key={c}>`). Linked doc line: docs/UX-ONE-PATH.md:67

Problem: Channel names use .t-heading, which is the same 36 px as the section title above them. "What goes out" is followed by five headings at the same size, so the screen has eight level-2 heads and no hierarchy. Today shows the same channels as small labels.

Fix:

src/app/campaigns/[id]/page.tsx:137
old: `<h3 className="t-heading">{CHANNEL_NAME[c]}</h3>`
new: `<h3 className="eyebrow">{CHANNEL_NAME[c]}</h3>`
Keep the h3 tag so the heading outline still works for screen readers. The look then matches Today's `<p className="eyebrow">`: 14 px muted label, with the existing `mt-4` copy below it, same as today/page.tsx:138-146.

Also fix the rule book so the next pass does not undo this:
docs/UX-ONE-PATH.md:67
old: `2. "What goes out": one block per channel, \`.t-title\` the channel in merchant words, the copy in \`.t-body\`.`
new: `2. "What goes out": one block per channel, \`.eyebrow\` the channel in merchant words (as on Today), the copy in \`.t-body\`.`
And on line 26, change "above the three channel cards" to "above the channel cards", because the campaign page shows five.

### #6 [major] campaign
**Duplicate of #16, skip.**

Where: src/app/campaigns/[id]/page.tsx:137 (cause: docs/UX-ONE-PATH.md:67 tells the page to set channel names in .t-title; the token at src/app/globals.css:153 makes .t-heading the same size as .t-title)

Problem: Channel names are the same size and family as the section title above them, so "What goes out" collapses into 8 equal level-2 headings, breaking the three-level rule.

Fix:

1) src/app/campaigns/[id]/page.tsx:137
old: <h3 className="t-heading">{CHANNEL_NAME[c]}</h3>
new: <h3 className="eyebrow">{CHANNEL_NAME[c]}</h3>
Each block then has a 14 px muted label, with the .t-name copy (21 px, 600) as the loudest line. This matches Today, src/app/today/page.tsx:138-146.
2) Fix the rule book in the same commit so a later pass does not undo this. docs/UX-ONE-PATH.md:67
old: 2. "What goes out": one block per channel, `.t-title` the channel in merchant words, the copy in `.t-body`.
new: 2. "What goes out": one block per channel, `.eyebrow` the channel in merchant words (as on Today), the copy in `.t-name` / `.t-body`.
Optionally widen line 25 from "above the three channel cards" to "above the channel blocks".
Leave globals.css:153 as it is. Only src/app/page.tsx (the landing page: 96, 114, 162, 181) still uses .t-heading, so changing the token would only move the landing page, not this screen.

### #24 [major] campaign
**Duplicate of #16, skip. (Design note: --fs-heading stays equal to --fs-title on purpose; the home page's .t-heading lines are section heads.)**

Where: src/app/campaigns/[id]/page.tsx:137 (the cause is src/app/globals.css:153, where --fs-heading is var(--fs-title)); docs/UX-ONE-PATH.md, "The campaign" step 2 and the Hierarchy eyebrow line

Problem: The five channel names use h3.t-heading. globals.css:153 makes --fs-heading equal to --fs-title, so each one is 36 px, the same size as its parent "What goes out". The screen shows 8 heads at section-title size (rule max 4). The counter does not see it, because the class is t-heading and not t-title.

Fix:

1) src/app/campaigns/[id]/page.tsx:137
old: <h3 className="t-heading">{CHANNEL_NAME[c]}</h3>
new: <h3 className="eyebrow">{CHANNEL_NAME[c]}</h3>
Keep the h3 for the accessibility outline. The only base h3 rule (globals.css:229) is text-wrap, so this looks the same as Today's <p className="eyebrow"> at today/page.tsx:138. Line 139 keeps <div className="mt-4 space-y-3">, so the spacing matches Today's eyebrow then mt-4.
2) docs/UX-ONE-PATH.md, The campaign step 2
old: "What goes out": one block per channel, `.t-title` the channel in merchant words, the copy in `.t-body`.
new: "What goes out": one block per channel, an eyebrow names the channel in merchant words, as on Today, the copy in `.t-body`.
3) docs/UX-ONE-PATH.md, Hierarchy
old: Eyebrows (`.eyebrow`) only inside the plate and above the three channel cards.
new: Eyebrows (`.eyebrow`) only inside the plate and above the channel cards (three on Today, five on the campaign).
Optional, in .tmp only: the audit should count .t-heading as .t-title, so this kind of problem cannot hide from the counter again.
Do not fix it in globals.css instead: --fs-heading is design-owned and also drives the 4 h2.t-heading on the landing page, src/app/page.tsx:96/114/162/181.

### #30 [major] campaign
**Duplicate of #16, skip.**

Where: src/app/campaigns/[id]/page.tsx:137 (h3 channel head). The grid is at :132, not :131; :131 is h2 "What goes out". The cause is also in the rule book: docs/UX-ONE-PATH.md:67 tells the campaign page to use `.t-title` for each channel, which contradicts line 24's limit of four level-2 heads per screen.

Problem: The five channel heads (On your chalkboard, To your regulars on WhatsApp, To strangers around the venue, On your Google listing, On the screens near the venue) are h3.t-heading. --fs-heading equals --fs-title, so they render at the same size as the section head 'What goes out', only 40 px below it. That makes 8 level-2 lines on one screen, and the section and its subsections cannot be told apart.

Fix:

1) src/app/campaigns/[id]/page.tsx:137
old: <h3 className="t-heading">{CHANNEL_NAME[c]}</h3>
new: <h3 className="eyebrow">{CHANNEL_NAME[c]}</h3>
2) src/app/campaigns/[id]/page.tsx:132
old: <div className="mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2">
new: <div className="mt-8 grid gap-x-16 gap-y-12 md:grid-cols-2">
This matches the Today grid at src/app/today/page.tsx:136. The copy under each label keeps its mt-4 wrapper.
3) docs/UX-ONE-PATH.md:67 (so the next audit does not undo the fix)
old: 2. "What goes out": one block per channel, `.t-title` the channel in merchant words, the copy in `.t-body`.
new: 2. "What goes out": one block per channel, `.eyebrow` the channel in merchant words (as on Today), the copy in `.t-body` (`.t-name` for a headline).
4) docs/UX-ONE-PATH.md:25
old: above the three channel cards
new: above the channel cards (Today and the campaign)

### #25 [major] campaign
**System words in the agent prose (signals, over-index, affinities, scores). #33 is the same root cause: apply this one.**

Where: src/server/agent/prompt.ts:19,20,21 (system prompt teaches the words); src/lib/text.ts:36 (add helper after noScores); src/app/campaigns/[id]/page.tsx:10,43,199,205; src/app/today/page.tsx:3,154 (same rationale shows as the Today hero's Why)

Problem: System words in visible agent prose: 'signals', 'over-index', 'under-index', 'aggregate affinities', 'Place affinities ... are compressed', 'those scores'. Rule: no signal, affinity or over-index on screen. The prompt itself uses these words, so the agent copies them.

Fix:

1) prompt.ts:19
OLD: "- Cite concrete Qloo evidence in the rationale: tag names, which age and gender groups over-index, brand names, place names. Never invent data. No scores or decimals in the prose: say strong, high or weak instead."
NEW: "- Cite concrete Qloo evidence in the rationale: tag names, which age and gender groups are more common than usual, brand names, place names. Never invent data. No scores or decimals in the prose: say strong, high or weak instead.
- Write every field for a bar owner. Never write signal, over-index, under-index, affinity, affinities, aggregate, score, compressed, entity or URN. Say \"more women than usual\", \"fewer 35 to 44\", \"they like\", \"leans toward\", \"reasons\"."

2) prompt.ts:20
OLD: "- Fit scores are compressed (often 0.80 to 0.95). Treat them as one signal among demographics, tags and brands, not as the decision."
NEW: "- Fit numbers sit close together (often 0.80 to 0.95). Weigh them with demographics, tags and brands, not as the decision, and never mention them in the copy, rationale or limitations."

3) prompt.ts:21
OLD: "- Qloo describes aggregate affinities of a group. Never describe an individual, never predict that someone will come. Say so in limitations."
NEW: "- Qloo describes what a group of fans tends to like, not any one person. Never describe an individual, never predict that someone will come. Say so in limitations, in plain words."

4) text.ts, append after line 36 (safety net; stored drafts like camp_869f94483d5f never regenerate, so the prompt change alone leaves the demo campaign unchanged). Tested on the live strings in .tmp/onepath/r5-verify/27/plain.mjs:
// Analyst words read as a system talking. The agent is told not to use them; this catches stored drafts.
export function plainWords(s: string): string {
  return s
    .replace(/[^.]*\bcompressed\b[^.]*\./gi, "")
    .replace(/\bover-?index(?:es|ed)? on ([^,.;]*?) and on\b/gi, "lean toward $1 and toward")
    .replace(/\bover-?index(?:es|ed)? on\b/gi, "lean toward")
    .replace(/\bunder-?index(?:es|ed)? on\b/gi, "lean away from")
    .replace(/\bover-?index(?:es|ed)?\b/gi, "stand out")
    .replace(/\bsignals\b/gi, "reasons")
    .replace(/\bsignal\b/gi, "reason")
    .replace(/\baggregate affinities\b/gi, "shared tastes")
    .replace(/\baffinities\b/gi, "tastes")
    .replace(/\baffinity\b/gi, "taste")
    .trim();
}
Output on the live draft: "wins on three reasons that agree"; "lean toward women and toward 25 to 29 year olds, ..., and clearly lean away from 35 to 44"; "Qloo describes shared tastes of people who like Harry Styles. ... will walk in. The weather is a forecast and can change." (the whole compressed/those scores sentence is dropped). The issue's proposed regex left "Place tastes near MSG are compressed ... as on those scores" on screen and gave the broken "lean toward women and on 25 to 29"; this version fixes both.

5) campaigns/[id]/page.tsx:10 import { firstSentences, noScores } -> import { firstSentences, noScores, plainWords }
:43 noScores(draft.rationale) -> plainWords(noScores(draft.rationale))
:199 nb(noScores(draft.audience_summary)) -> nb(plainWords(noScores(draft.audience_summary)))
:205 nb(noScores(draft.limitations)) -> nb(plainWords(noScores(draft.limitations)))
today/page.tsx:3 add plainWords to the import; :154 firstSentences(noScores(draft.rationale), 320) -> firstSentences(plainWords(noScores(draft.rationale)), 320)

### #33 [minor] campaign, today, pulse
**Duplicate of #25, skip.**

Where: Root cause: src/server/agent/prompt.ts:19-21 and src/server/agent/pulse.ts:20,31,35 (the prompts tell the model to write "over-index", "signal", "aggregate affinities", "audience tags, ambience tags"). Safety net for drafts already stored: src/lib/text.ts:31-35 (noScores; every piece of agent prose already goes through it: campaigns/[id]/page.tsx:43,199,205; today/page.tsx:154,235; pulse/page.tsx:28,65,203). UI strings: src/app/pulse/page.tsx:35 (brief), :185 (Google Business post). Seen at 1440 and 390 on campaign camp_869f94483d5f and on /pulse; Today Why seen in r5/today-1440.png.

Problem: System words the rule book bans are still on screen in the reasoning a merchant reads before publishing.

Fix:

1) src/lib/text.ts:35. Extend the noScores chain (tested on the real on-screen strings in /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r5-verify/35/plain.mjs). Replace
    .replace(/\+?\b0\.\d\d\b/g, (n) => adjective(n.replace("+", "")));
with
    .replace(/\+?\b0\.\d\d\b/g, (n) => adjective(n.replace("+", "")))
    // System words the rule book bans (docs/UX-ONE-PATH.md, Words), turned into merchant words.
    .replace(/\bover-?index(es|ed|ing)?( on| toward)\b/gi, (_, e = "") => `${({ es: "leans", ed: "leaned", ing: "leaning" } as Record<string, string>)[e.toLowerCase()] ?? "lean"} toward`)
    .replace(/\bunder-?index(es|ed|ing)?( on)?\b/gi, (_, e = "") => `${({ es: "leans", ed: "leaned", ing: "leaning" } as Record<string, string>)[e.toLowerCase()] ?? "lean"} away from`)
    .replace(/\bover-?index(es|ed|ing)?\b/gi, "stand out")
    .replace(/\bsignal(s)?\b/gi, (_, p) => (p ? "reasons" : "reason"))
    .replace(/\baggregate affinities\b/gi, "the shared tastes")
    .replace(/\b(a )?high affinity\b/gi, "a strong taste")
    .replace(/\baffinit(y|ies)\b/gi, (_, p) => (p === "y" ? "taste" : "tastes"))
    .replace(/\baudience tags\b/gi, "crowds")
    .replace(/\bambience tags\b/gi, "moods")
    .replace(/\boffer fit\b/gi, "match");
Results: "three signals that agree" becomes "three reasons that agree"; "over-index on women ... clearly under-index on 35 to 44" becomes "lean toward women ... clearly lean away from 35 to 44"; "over-indexes on Disney+" becomes "leans toward Disney+"; "aggregate affinities" becomes "the shared tastes"; "a high affinity" becomes "a strong taste"; "audience tags are" becomes "crowds are"; "the offer fit for cocktail places" becomes "the match for cocktail places".
2) src/server/agent/prompt.ts:19 "which age and gender groups over-index" -> "which age and gender groups lean in"; :20 "Treat them as one signal among" -> "Treat them as one reason among"; :21 "Qloo describes aggregate affinities of a group." -> "Qloo describes the shared tastes of a group."; add a new rule after :21: "- rationale, audience_summary and limitations are read by a bar owner: never write signal, affinity, affinities, aggregate, over-index, under-index, tag, fit score, offer fit or compressed; say lean toward, fewer, reasons, taste, match." Lines :11-12 only describe the input and can stay.
3) src/server/agent/pulse.ts:20 "Cite Qloo audience tags, ambience tags, brands and nearby places." -> "Name who walks past, the kind of place they like, the brands and the nearby places, in plain words (never tag, affinity, signal, over-index)."; :35 "Qloo describes aggregate affinities of an area" -> "Qloo describes the shared tastes of an area", and add the same plain-words sentence.
4) src/app/pulse/page.tsx:35 "Redo this week's brief" / "Ask for the brief again" / "Write this week's brief" -> "Redo this week's plan" / "Ask for the plan again" / "Write this week's plan" (matches the Today link at today/page.tsx:242, "This week's plan"). Optional: :185 title="Google Business post" -> title="On your Google listing".
Step 1 is required: the stored demo drafts were written before any prompt change, so a fix to the prompts alone leaves the current screens unchanged.

## 4. Pulse

### #18 [major] pulse
**Pulse is a data dump: 16 titles, the display outside the plate, no button. Recommended single fix; #0, #12, #23 and #31 describe the same page: skip them.**

Where: src/app/pulse/page.tsx:40-47 (h1 + t-lead outside the plate), :62-66 (plate whose headline is only a t-title), :75-103 and :120-177 (evidence sections, 11 t-titles), :181-200 + :248-256 (four channel Blocks, each an h2.t-title)

Problem: Pulse is a data dump. It has 16 section titles (rule: at most four), a display headline outside the plate plus a smaller headline inside the plate, and a plate with no button. Pages run 4726 px at 1440 and 6361 px at 390.

Fix:

1. pulse/page.tsx:40-47. Old: h1.t-display "Every day at {merchant.name}" + p.t-lead context + form, with the plate further down at :62-66. New: the plate holds the headline when a brief exists, and the old lead becomes body text:
```tsx
{brief ? (
  <section className="plate stack-block">
    <p className="eyebrow">This week at {merchant.name}</p>
    <h1 className="t-display mt-5">{featured?.title ?? brief.featured_offer_id}</h1>
    <p className="t-lead mt-5">{nb(noScores(brief.street_in_one_line))}</p>
  </section>
) : (
  <h1 className="t-display mt-6">Every day at {merchant.name}</h1>
)}
<p className="t-body mt-6">The people who walk past your door on a normal day, read by Qloo within <span className="mono">{nb(`${radiusKm} km`)}</span>.</p>
<form action="/api/pulse" method="post" className="mt-4">...{briefAction} link unchanged...</form>
```
Delete the old plate at :62-66, so the brief fragment starts at "Why".
2. "What goes out" goes right after "Why", the way the campaign page orders it. Move :181-200 there. Old: `<section className="stack-section grid gap-x-16 gap-y-16 md:grid-cols-2"><Block .../>x4</section>`. New: `<section className="stack-section"><h2 className="t-title">What goes out</h2><div className="mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2"><Block .../>x4</div></section>`. In Block (:251), old `<h2 className="t-title">{title}</h2>` -> new `<h3 className="eyebrow">{title}</h3>`. The rule book allows eyebrows above the channel cards.
3. Move "Evenings this week" (:105-118) up so it follows "What goes out", unchanged. Keep "What this does not establish" (:201-204). Visible t-title set: What goes out, Why, Evenings this week, What this does not establish (4).
4. Wrap the rhythm section (:75-103) and both evidence grids (:120-177) in one closed disclosure placed just before the provenance details: `<details className="stack-section"><summary className="link w-fit text-base">All the evidence from Qloo</summary>...</details>`. Who is coming does the same. The first inner section switches from stack-section to stack-block. Optional: inner h3 moment labels (:83) go from t-title to t-name.
5. No plate button is needed. The rule book's "Alerts and pulse pages" line asks only for the Today link, one t-display, t-title sections and no stray eyebrows. The only action, POST /api/pulse (redo the brief), stays a link, as on Alerts (0 primary buttons).

### #0 [major] pulse
**Duplicate of #18, skip.**

Where: src/app/pulse/page.tsx:64,83,107,122,133,139,148,163,251 (title count also uses 68, 77 and 202). The issue's list leaves out line 64, the plate's h2.t-title "Pre-show happy hour".

Problem: 16 .t-title on one screen. Rule: at most four. Moment names, the evidence columns and the four channel blocks are all .t-title, so nothing ranks.

Fix:

The fix in the issue misses line 64, so it leaves 5 titles, not 4. Corrected fix, old -> new:
1. L64 `<h2 className="t-title mt-4">{featured?.title ?? brief.featured_offer_id}</h2>` -> `<p className="t-name mt-4">{featured?.title ?? brief.featured_offer_id}</p>`
2. L83 `<h3 className="t-title">{r.label}</h3>` -> `<p className="t-name">{r.label}</p>`
3. L106-107 `<section className="stack-section">` + `<h2 className="t-title">Evenings this week</h2>` -> `<section className="stack-block">` + `<p className="t-name">Evenings this week</p>`. The section stays outside the `pulse.rhythm &&` conditional, so the forecast still shows when there is no rhythm.
4. Evidence goes into one closed disclosure:
   - L120 `<section className="stack-section grid gap-x-16 gap-y-16 md:grid-cols-3">` -> `<details className="stack-section"><summary className="link w-fit text-base">All the evidence</summary><div className="mt-10 grid gap-x-16 gap-y-16 md:grid-cols-3">`
   - L144 `</section>` -> `</div>`
   - L146 `<section className="stack-section grid gap-x-24 gap-y-16 lg:grid-cols-2">` -> `<div className="mt-16 grid gap-x-24 gap-y-16 lg:grid-cols-2">`
   - L177 `</section>` -> `</div></details>`
   - Leave out "from Qloo": L42 already names Qloo, and the rule allows Qloo once per screen.
   - L122, 133, 139, 148, 163: `<h2 className="t-title">X</h2>` -> `<p className="t-name">X</p>`
5. L181 `<section className="stack-section grid gap-x-16 gap-y-16 md:grid-cols-2">` -> `<section className="stack-section"><h2 className="t-title">What goes out</h2><div className="mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2">`, and L200 `</section>` -> `</div></section>`
6. L251 `<h2 className="t-title">{title}</h2>` -> `<p className="eyebrow">{title}</p>`. Eyebrows are allowed above channel cards; Today does the same at today/page.tsx:138-146.
Result: exactly 4 .t-title (Why L68, The rhythm of your street L77, What goes out, What this does not establish L202), or 1 when there is no brief.

### #12 [major] pulse
**Duplicate of #18, skip.**

Where: src/app/pulse/page.tsx:40-47 (display is the page name, outside the plate, plus a second t-lead), 62-66 (the offer sits in the plate as an h2.t-title), 75-103 / 120-177 / 179-205 (12 more t-title sections, 248-256 Block renders each channel as an h2.t-title). Same at 1440 and 390.

Problem: The pulse page breaks the hierarchy rules. The display is a page name, the week's offer is a smaller t-title inside the plate, and there are 16 section titles (rule: at most four), so it reads as a data dump.

Fix:

1) Lines 40-47. Old: <h1 className="t-display mt-6">Every day at {merchant.name}</h1> + <p className="t-lead mt-5">The people who walk past your door on a normal day, read by Qloo within ...</p> + the briefAction form. New: render these three only when !brief (fallback state). When brief exists, leave nothing between the "Today" link and the plate.
2) Lines 62-66, plate. Old: <p className="eyebrow">This week</p><h2 className="t-title mt-4">{featured?.title ?? brief.featured_offer_id}</h2><p className="t-lead mt-4">{nb(noScores(brief.street_in_one_line))}</p>. New: <p className="eyebrow">Every day this week</p><h1 className="t-display mt-5">{featured?.title ?? brief.featured_offer_id}</h1><p className="t-lead mt-5">{nb(noScores(brief.street_in_one_line))}</p>, then the briefAction form, which stays a .link ("Redo this week's brief"), right after the lead.
3) Reorder after the plate so the page has four sections, each with one t-title: (a) "What goes out": move the Block grid from 181-200 here, wrapped as <section className="stack-section"><h2 className="t-title">What goes out</h2><div className="mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2">...</div></section>. Rename the Block titles to match CHANNEL_NAME in src/app/campaigns/[id]/page.tsx:21-27: "Chalkboard" -> "On your chalkboard", "Google Business post" -> "On your Google listing", "Note to regulars" -> "To your regulars on WhatsApp", "Ad to strangers nearby" -> "To strangers nearby". In Block (line 251): <h2 className="t-title">{title}</h2> -> <p className="eyebrow">{title}</p>. (b) "Why" (67-71, unchanged). (c) "Evenings this week" (105-118, unchanged). (d) "What this does not establish" (201-204, unchanged).
4) Put everything else in one closed disclosure, like src/app/campaigns/new/page.tsx:213-297: <details className="stack-section"><summary className="text-base font-semibold text-[var(--ink)]">All the evidence from Qloo</summary> ... </details>. Inside it go: the old lead as <p className="t-body mt-6">The people who walk past your door on a normal day, read by Qloo within {radiusKm} km.</p>; rhythm 75-103 (h2 -> h3; per-moment h3.t-title at 83 -> <p className="t-name">); Who walks past / What they like in a place / Brands they like 120-144 (h2 -> h3); Where they already go / Your offers for them 146-177 (h2 -> h3); and the provenance details 208-221 as the last child.
Result: 1 t-display (the offer, in the plate), 4 visible t-title, 1 t-lead, the only eyebrows in the plate and above the channel cards. Rules met: max four t-title, plate holds the headline, t-lead used once.

### #23 [major] pulse
**Duplicate of #18, skip.**

Where: src/app/pulse/page.tsx:40-41 (h1 and intro sentence outside the plate) and :62-66 (plate holding eyebrow + h2.t-title + second t-lead), at 1440 and 390

Problem: The plate holds an eyebrow, a .t-title and a .t-lead, but no headline. The .t-display "Every day at Penn & Pour" sits outside the plate, and the page has two .t-lead. Rule: the plate holds the headline and the one sentence; .t-lead is only the sentence under the headline.

Fix:

Line 40, old: <h1 className="t-display mt-6">Every day at {merchant.name}</h1>
new: {brief ? (<section className="plate stack-block"><p className="eyebrow">Every day this week at {merchant.name}</p><h1 className="t-display mt-5">{featured?.title ?? brief.featured_offer_id}</h1><p className="t-lead mt-5">{nb(noScores(brief.street_in_one_line))}</p></section>) : (<h1 className="t-display mt-6">Every day at {merchant.name}</h1>)}
Line 41, old: <p className="t-lead mt-5">
new: <p className={brief ? "t-body stack-block" : "t-lead mt-5"}>
Lines 62-66, old: <section className="plate stack-block"><p className="eyebrow">This week</p><h2 className="t-title mt-4">{featured?.title ?? brief.featured_offer_id}</h2><p className="t-lead mt-4">{nb(noScores(brief.street_in_one_line))}</p></section>
new: (delete; the "Why" section at 67-71 stays inside the brief fragment)
This differs from the proposed fix in one way. The plate moves up to sit right under the "Today" link, so the headline comes first. In the proposed fix, a body sentence and the "Redo this week's brief" link would still come before the headline. When there is no brief yet, the page keeps the "Every day at" h1 with its sentence as the one lead, which still follows the rules.

### #31 [major] pulse
**Duplicate of #18, skip.**

Where: src/app/pulse/page.tsx:40 and :63-64 (plate), :83 (rhythm moments), :107 (Evenings this week), :122/:133/:139 (3-col grid), :148/:163 (2-col grid), :202 (What this does not establish), :251 (Block, the 4 channel cards). The cited lines :83 :133 :139 :163 :251 are correct.

Problem: Pulse shows 16 .t-title lines (36/28 px), several side by side in 2 or 3 columns, against a maximum of four. Sub-labels such as 'After work', 'Weekend brunch', 'Brands they like', 'Chalkboard' and 'Google Business post' carry the same weight as 'Why', so nothing ranks. The offer in the plate ('Pre-show happy hour', a t-title) is also quieter than the 121 px page name above it.

Fix:

Goal: one .t-display and 4 .t-title (Why, The rhythm of your street, Who walks past, What goes out). The issue's own fix leaves 7, or 6 after the merge, which is still over the 4 the rule book allows off Today.
1. Plate becomes the headline. :40 `<h1 className="t-display mt-6">Every day at {merchant.name}</h1>` -> `{!brief && <h1 className="t-display mt-6">Every day at {merchant.name}</h1>}`. Move the plate (:62-66) to sit right after the Today link (:39). In the plate, :63 `<p className="eyebrow">This week</p>` -> `<p className="eyebrow">Every day at {merchant.name}, this week</p>` and :64 `<h2 className="t-title mt-4">{featured?.title ?? brief.featured_offer_id}</h2>` -> `<h1 className="t-display mt-4">{featured?.title ?? brief.featured_offer_id}</h1>`. :41 `<p className="t-lead mt-5">` -> `<p className="t-body mt-6 text-[var(--muted)]">` (one t-lead, the plate's).
2. :83 `<h3 className="t-title">{r.label}</h3>` -> `<h3 className="t-name">{r.label}</h3>`.
3. :106-107 `<section className="stack-section"><h2 className="t-title">Evenings this week</h2>` -> `<section className="stack-block"><h3 className="t-name">Evenings this week</h3>` (now part of the rhythm section).
4. :120-122: put `<h2 className="t-title">Who walks past</h2>` above the grid (`<section className="stack-section"><h2 ...>Who walks past</h2><div className="mt-8 grid gap-x-16 gap-y-12 md:grid-cols-3">`). The first column has no heading. :133 `<h2 className="t-title">What they like in a place</h2>` -> `<h3 className="t-name">What they like in a place</h3>`. :139 `<h2 className="t-title">Brands they like</h2>` -> `<h3 className="t-name">Brands they like</h3>`.
5. :146 `stack-section` -> `stack-block` (part of Who walks past). :148 `<h2 className="t-title">Where they already go</h2>` -> `<h3 className="t-name">Where they already go</h3>`. :163 `<h2 className="t-title">Your offers for them</h2>` -> `<h3 className="t-name">Your offers for them</h3>`.
6. :181 add `<h2 className="t-title">What goes out</h2>` as the section head above the 2-col grid (grid gets mt-10). :251 in Block, `<h2 className="t-title">{title}</h2>` -> `<p className="eyebrow">{title}</p>`. The rule book allows eyebrows above the channel cards, and this matches today/page.tsx:138.
7. Move the :201-204 section to directly after Why (:71) as `<section className="stack-block">`, with :202 `<h2 className="t-title">What this does not establish</h2>` -> `<h3 className="t-name">What this does not establish</h3>`.
Expected audit result: summary.display 1 (2 states, never both), summary.title 4, lead 1.

### #19 [major] pulse
**Raw Qloo taxonomy and system words. #26 is the same: apply this one.**

Where: src/server/agent/pulse.ts:18, :20, :31, :35 (prompt words that end up in the stored brief); src/app/pulse/page.tsx:35, :89, :97, :108, :124, :135, :168-169, :240; src/server/qloo/rhythm.ts:38-43 + :139 (lowercased quotes), :117 ("tagged")

Problem: Raw Qloo taxonomy and system words on screen. Title Case tag lists, all-caps names, lowercase raw descriptions, "tags", "brief", "Open-Meteo". It reads like an export, not premium.

Fix:

1. pulse.ts:20 "Cite Qloo audience tags, ambience tags, brands and nearby places." -> "Name the kinds of people and places in plain lower-case words, with brands and nearby places by name; never write tag, audience, ambience, affinity, signal, score or over-index."
2. pulse.ts:18 "citing Qloo tags" -> "in plain lower-case words, never the word tag"
3. pulse.ts:35 "Qloo describes aggregate affinities of an area, never individuals, and never predicts a visit: say so in limitations." -> "Qloo describes the shared taste of an area, never individuals, and never predicts a visit: say so in limitations, in plain words, without the words affinity, tag or score."
   Then regenerate the brief (POST /api/pulse for m_penn_pour). The stored brief keeps "audience tags ... Cocktail Enthusiasts" (Why lead) and "a high affinity" (limitations) until rewritten.
4. page.tsx:35 "Redo this week's brief" / "Ask for the brief again" / "Write this week's brief" -> "Write this week's plan again" / "Ask for this week's plan again" / "Write this week's plan" (matches Today link "This week's plan", today/page.tsx:242, and this page's :51 "writing this week's plan").
5. page.tsx:108 "from the Open-Meteo forecast." -> "from the weather forecast."
6. page.tsx:124 `pulse.audienceTags.map((t) => t.name).join(", ")` -> `pulse.audienceTags.map((t) => t.name.toLowerCase()).join(", ")`; same at :135 for ambienceTags; :168 and :169 `f.tagNames.join(", ")` -> `f.tagNames.map((t) => t.toLowerCase()).join(", ")`.
7. page.tsx:89 all-caps names: `r.places.map((pl) => pl.name)` -> `r.places.map((pl) => (pl.name === pl.name.toUpperCase() ? pl.name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : pl.name))` ("TONCHIN NEW YORK" -> "Tonchin New York"). Label "Their crowd is yours:" is not a system word; optional -> "Same crowd as:".
8. rhythm.ts:38-43 split `text` into `const rawText = (p: PlaceEntity) => Object.entries(...).filter(...).map(...).join(" ");` and `const text = (p: PlaceEntity) => rawText(p).toLowerCase();`; rhythm.ts:139 `text(p).match(/...\b[^.]*/)` -> `rawText(p).match(/...\b[^.]*/i)` so the quoted descriptions at page.tsx:97 keep Qloo's own capitals instead of "iconic midtown theater-district italian restaurant".
9. page.tsx:240 "no match nearby" -> "No match nearby" (siblings are "Strongest fit", "Close", "Weak").
10. rhythm.ts:117 "places around you are tagged for brunch" -> "places around you serve brunch"; page.tsx:173 "No offer with tags yet." -> "No offer described yet."

### #26 [major] pulse
**Duplicate of #19, skip.**

Where: src/server/agent/pulse.ts:20,35 (root cause: the prompt itself says "Cite Qloo audience tags, ambience tags" and "Qloo describes aggregate affinities", and the model repeats it); src/app/pulse/page.tsx:3,28,65,203 (prose goes out filtered by noScores only); src/lib/text.ts:36 (no plainWords helper exists: grep finds none in src or .tmp, so the "helper from the campaign fix" cannot be reused)

Problem: The Pulse prose shows system words. The visible Why lead says 'audience tags' and 'ambience tags'. The limitations say 'aggregate taste', 'a high affinity', 'offer fits are affinities'. The rest of the reasoning says 'scores very high'.

Fix:

1) src/server/agent/pulse.ts:20, rationale describe:
old: "Why this offer for the everyday flow. Cite Qloo audience tags, ambience tags, brands and nearby places. No scores or decimals in the prose: say strong, high or weak instead."
new: "Why this offer for the everyday flow. Name who walks past, what they like in a place, the brands and the nearby places Qloo shows, by name. Never write tags, audience tags, ambience tags, affinity, aggregate, score, signal or over-index. No decimals: say strong, close or weak."
pulse.ts:18: "citing Qloo tags" -> "naming who they are and where they already go".

2) pulse.ts:35:
old: "Qloo describes aggregate affinities of an area, never individuals, and never predicts a visit: say so in limitations."
new: "In limitations, say in plain words that Qloo describes what the people of an area tend to like, never one person, and never predicts that anyone walks in. Never write tags, audience tags, ambience tags, affinity, aggregate, score, signal or over-index anywhere in the prose; say \"the people who walk past\", \"what they like in a place\", \"a strong fit\"."
pulse.ts:31 (input description, optional): "audience tags (who is here), ambience tags (what they like in a place), brands and media they over-index on" -> "who walks past, what they like in a place, the brands and media they like most".

3) The brief on screen is already stored in the DB, so the prompt change alone shows nothing until someone clicks Redo. Add this safety net under line 36 of src/lib/text.ts:
const SCORE: Record<string, string> = { "very high": "fits very well", high: "fits well", good: "fits", moderate: "fits less well" };
// Analyst words become merchant words (UX-ONE-PATH.md, Words). Run after noScores.
export function plainWords(s: string): string {
  return s
    .replace(/\baudience tags\b/gi, "crowds")
    .replace(/\bambience tags\b/gi, "favourite rooms")
    .replace(/\bthe aggregate taste of\b/gi, "what people tend to like in")
    .replace(/\baggregate\s+/gi, "")
    .replace(/\ba (?:high|strong|very high) affinity\b/gi, "a strong fit")
    .replace(/\baffinities of\b/gi, "how much the street likes")
    .replace(/\baffinity\b/gi, "fit")
    .replace(/\baffinities\b/gi, "fits")
    .replace(/\bthe offer's tags\b/gi, "the offer's style")
    .replace(/\bscores? (very high|high|good|moderate)\b/gi, (_, b: string) => SCORE[b.toLowerCase()])
    .replace(/\bover-index(?:es)? on\b/gi, "like most");
}

4) src/app/pulse/page.tsx:
:3 import { firstSentences, noScores } -> import { firstSentences, noScores, plainWords }
:28 noScores(brief.rationale) -> plainWords(noScores(brief.rationale))
:65 nb(noScores(brief.street_in_one_line)) -> nb(plainWords(noScores(brief.street_in_one_line)))
:203 nb(noScores(brief.limitations)) -> nb(plainWords(noScores(brief.limitations)))
Tested on the live strings (.tmp/onepath/r5-verify/28/plain.mjs). Output: "The street's strongest crowds are Cocktail Enthusiasts, ... and its favourite rooms run Intimate, Social..."; "The late plate fits very well but belongs to show nights"; "Qloo describes what people tend to like in this stretch of Chelsea, ... and a strong fit is not a prediction that anyone walks in. The offer fits are how much the street likes places with the offer's style nearby". The plate line does not change.
Leave out of scope: "signal.location" and "over-indexes" in the provenance table, which sits inside the closed "How Turnout got here" disclosure the rule book allows.

### #20 [minor] pulse
Where: src/app/pulse/page.tsx:170 (fit cell) and :175 (after </table>); bestFit at :34, featured at :27

Problem: The page contradicts its own pick. The offers table ranks another offer as the strongest fit and never explains why the featured offer won.

Fix:

1) src/app/pulse/page.tsx:170
old: <td className="whitespace-nowrap text-right">{fitWord(f, bestFit)}</td>
new: <td className="whitespace-nowrap text-right">{f.offerId === brief?.featured_offer_id ? "This week's pick" : fitWord(f, bestFit)}</td>

2) src/app/pulse/page.tsx:175
old: </table>
new: </table>
          {featured && bestFit && bestFit.offerId !== featured.id && (
            <p className="t-body mt-4 text-[var(--muted)]">{bestFit.title} fits the street best on paper. This week's pick is {featured.title}: the reason is under Why, in The rest of the reasoning.</p>
          )}

Do NOT use the issue's proposed sentence: firstSentences(brief.rationale, 140) returns the rationale's first sentence (about audience tags, not the comparison), and raw brief.rationale skips noScores, so decimals could leak. Not proposing to feature bestFit instead: the pick is an agent decision (prompt in src/server/agent/pulse.ts), and the table ranks raw tag affinity with no hour of day.

## 5. Explore

### #22 [major] explore
Where: src/app/radar/RadarView.tsx:473-497 (the list map is at line 474, not 473; 473 is the <ul>), RadarView.tsx:477 (`counted`), :485, :486; src/app/radar/page.tsx:139 (blurbOf, case "tv")

Problem: "Crowds worth a campaign" is a wall of 19 rows that all look alike, with percentages, false precision and jargon. Nothing tells him which crowd to pick.

Fix:

1) RadarView.tsx:473-497: pull the row out of the `.map` callback into a local function `const row = (it: Crowd) => { const isSel = ...; const onMap = ...; return (<li ...>...</li>); };` (same body as now, `counted` removed). Then replace
`<ul className="tm-crowds">{crowds.map((it) => { ... })}</ul>`
with
`<ul className="tm-crowds">{crowds.slice(0, 6).map(row)}</ul>
{crowds.length > 6 && (
  <details className="mt-5">
    <summary className="link">All {crowds.length} crowds</summary>
    <ul className="tm-crowds mt-5">{crowds.slice(6).map(row)}</ul>
  </details>
)}`
The list is already in time order, so the first 6 are the soonest. A crowd picked on the map that falls in the folded part still shows in the map card with its own link.

2) RadarView.tsx:477: delete `const counted = it.kind === "venue" || it.kind === "wave";`. It is unused after fix 3, and leaving it fails lint.

3) RadarView.tsx:485:
old: `About <span className="mono">{it.capacity.toLocaleString("en-US")}</span> people{counted ? "" : " by our estimate"}, could bring about {it.guests} guests`
new: `About <span className="mono">{(Math.round(it.capacity / 100) * 100).toLocaleString("en-US")}</span> people, could bring about {it.guests} guests`

4) RadarView.tsx:486:
old: `{it.guests >= merchant.seats ? \`, enough to fill your ${merchant.seats} seats\` : \`, ${Math.round((it.guests / merchant.seats) * 100)}% of your ${merchant.seats} seats\`}.`
new: `{it.guests >= merchant.seats ? \`, enough to fill your ${merchant.seats} seats\` : it.guests * 2 >= merchant.seats ? ", enough for half your seats" : ", enough for a few tables"}.`
(This replaces the issue's wording "could fill half your seats". 77% would still read as half, which is true as a lower bound and fits the sentence.)

5) page.tsx:139:
old: `return [meta.league, meta.side === "away" ? "away game" : "home game across town", meta.tv, meta.fandom ? \`Qloo local fandom: ${meta.fandom.band}\` : undefined].filter(Boolean).join(" · ");`
new: `return [meta.league, meta.side === "away" ? "away game" : "home game across town"].filter(Boolean).join(" · ");`
This also drops `meta.tv`, because the channel is already in the headliner ("Knicks at Celtics on Prime Video · NBA · away game · Prime Video"). `meta.fandom` is used nowhere else in src/app, so dropping it is safe.

## 6. Today

### #27 [major] today
**Your call: you kept the offer as the display on purpose. If you keep it, amend the rule book's Today step 1 so the two agree.**

Where: src/app/today/page.tsx:121-126 (drafted branch of the plate), with the moved facts landing at :154. Same pattern, smaller, at :160-162 (no-draft branch: eyebrow "Tonight at your door", lead of 2 sentences plus weather)

Problem: The rule book Today step 1 says: eyebrow 'Tonight', .t-display the crowd in five words, one .t-lead sentence. The build shows the offer as the display, pushes the crowd into a 14 px eyebrow, and runs the lead to 4 sentences. Today and the campaign page now carry the same h1 'Pre-show happy hour', so the merchant cannot tell the two screens apart.

Fix:

L121 old: <p className="eyebrow flex items-center gap-3"><span className="live-dot" aria-hidden="true" />{whenWord(w0.start)} · {crowdName}</p>
new: <p className="eyebrow flex items-center gap-3"><span className="live-dot" aria-hidden="true" />{whenWord(w0.start)}</p>

L122 old: <h1 className="t-display mt-5">{offer?.title ?? draft.chosen_offer_id}</h1>
new: <h1 className="t-display mt-5">{crowdName}</h1>

L123-126 old: <p className="t-lead mt-5">{offer ? `${offer.description}. ${offer.price}. ` : ""}{peopleLine}</p>
new: <p className="t-lead mt-5">{nb(`About ${next.capacity.toLocaleString("en-US")} people ${around} from ${fmtTime.format(new Date(w0.arrive))}.`)} Your {offer ? offer.title.charAt(0).toLowerCase() + offer.title.slice(1) : "campaign"} is ready.</p>
(Keep the existing `around` phrase. The suggested `pass ${around}` would render "pass 1.2 km from your door", which is bad grammar. Expected render: "About 33,900 people 1.2 km from your door from 17:30. Your pre-show happy hour is ready.")

L154 old: <p className="t-body measure mt-5">{nb(firstSentences(noScores(draft.rationale), 320))}{weather ? ` ${weather} at your door.` : ""}</p>
new: <p className="t-body measure mt-5">{offer ? nb(`${offer.description}. ${offer.price}. `) : ""}{nb(`Turnout expects about ${next.potentialGuests} extra guests, ${next.fill >= 1 ? `enough to fill your ${seats} seats` : `${Math.round(next.fill * 100)}% of your ${seats} seats`}. `)}{nb(firstSentences(noScores(draft.rationale), 220))}{weather ? ` ${weather} at your door.` : ""}</p>
(The rationale cap drops from 320 to 220 so Why stays about three lines. `next`, `w0`, `around`, `seats` and `fmtTime` are already in scope and narrowed in this branch, so no new helper is needed.)

Optional, same rule, L160-162: change the eyebrow to {whenWord(w0.start)} only, and make the lead one sentence ("About N people <around> from HH:MM."), moving the guests figure and the weather below the plate.

### #21 [minor] today
Where: src/app/today/page.tsx:212-243 (section "Coming next" L212-229, section "Every day this week" L231-243)

Problem: Below the plate, every 1440 page is a single column about 540 px wide with the right 60% empty. Today scrolls 3054 px. It looks like a Word document, not a premium app (r4 placed Coming next and Every day this week side by side).

Fix:

today/page.tsx, wrap the two sections in one two-column grid. This is the same pattern pulse/page.tsx:181 already uses.
L212 old: `      <section className="stack-section">` (the one holding "Coming next")
L212 new: `      <div className="stack-section grid gap-x-16 gap-y-16 md:grid-cols-2">` + newline + `      <section>`
L231 old: `      <section className="stack-section">` (the one holding "Every day this week")
L231 new: `      <section>`
After L243 `      </section>`, add the line `      </div>`.
No other change. "Why" and "What Turnout did on its own" stay in one column.
Simulated in a live render (DOM wrap, same CSS) at /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r5-verify/23/:
- fix-1440.png: page height 2545 -> 2197 px (348 px shorter). Coming next sits at x 232-688, Every day at x 752-1208.
- fix-1024.png and fix-800.png: two columns of about 344-456 px. Lines wrap to two rows and still read cleanly.
- Under 768 px the sections stack, 64 px apart instead of 72 (--section). That gap is fine on phones.

### #28 [minor] today
Where: src/app/today/page.tsx:124 (line 85 is not affected)

Problem: A number loses its unit in the hero. offer.description is printed raw without nb(), so on phones '5 to 7' ends one line and 'pm.' starts the next. The distance at line 85 is built with a plain space, so '1.2 km' can split the same way.

Fix:

Line 124 only:
old: {offer ? `${offer.description}. ${offer.price}. ` : ""}
new: {offer ? nb(`${offer.description}. ${offer.price}. `) : ""}
nb is already imported on line 2 from "@/lib/nbsp". Its regex /(\d) (pm|am|km|m|min|h)\b/ turns "7 pm" into "7 pm". Leave line 85 alone: it already has the non-breaking space.

## 7. Everywhere

### #29 [major] all
Where: Symptom: src/app/layout.tsx:27-28, where the header links are bare href="/today" and href="/radar". The fallback that causes the jump: src/app/today/page.tsx:19-21 and src/app/radar/page.tsx:16-18 use getMerchant(sp.merchant ?? merchants[0]?.id). listMerchants() sorts ORDER BY city, so merchants[0] = m_penn_pour (New York) and m_quai_bercy (Paris) comes last.

Problem: The header links Today and Explore are bare /today and /radar, so they drop ?merchant=. On any Le Quai 12 page, the header sends the owner to Penn & Pour (merchants[0]). The campaign page carries no merchant param at all.

Fix:

Keep the header links bare. Remember the place on the server instead. The proposed HeaderNav fix does not work as written, for two reasons. First, cookies().set() inside a page throws in Next 16.4 ("Cookies can only be modified in a Server Action or Route Handler", node_modules/next/dist/server/web/spec-extension/adapters/request-cookies.js:53). Second, useSearchParams in the root layout without <Suspense> breaks the build for static routes (/_not-found).

1) NEW src/proxy.ts (Next 16 name for middleware, next to src/app):
import { NextResponse, type NextRequest } from "next/server";

// Remember the place the owner is looking at, so the header's bare /today and /radar stay on it.
export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const id = request.nextUrl.searchParams.get("merchant");
  if (id) response.cookies.set("merchant", id, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 30 });
  return response;
}

export const config = { matcher: ["/today", "/radar", "/alerts", "/pulse", "/campaigns/new"] };

2) src/app/today/page.tsx: add the import `import { cookies } from "next/headers";`. Then lines 19-21:
OLD:
  const sp = await searchParams;
  const merchants = listMerchants().filter((m) => m.id === "m_penn_pour" || m.id === "m_quai_bercy" || m.id === (sp.merchant ?? ""));
  const merchant = getMerchant(sp.merchant ?? merchants[0]?.id ?? "");
NEW:
  const sp = await searchParams;
  const id = sp.merchant ?? (await cookies()).get("merchant")?.value ?? "";
  const merchants = listMerchants().filter((m) => m.id === "m_penn_pour" || m.id === "m_quai_bercy" || m.id === id);
  const merchant = getMerchant(id) ?? getMerchant(merchants[0]?.id ?? "");

3) src/app/radar/page.tsx: make the same import and the same change at lines 16-18 (identical OLD text, identical NEW text).

No change to layout.tsx. The campaign page /campaigns/[id] is covered because every in-app route to it (Today, alerts, the approve redirect) passes through a ?merchant= page first. That sets the cookie. A cold deep link from scan.ts:133 still falls back to Penn & Pour, which is an acceptable edge case.

## Not verified

50 minor issues reported by one judge only are in `.tmp/onepath/r5-result.json` under `unverified`.
