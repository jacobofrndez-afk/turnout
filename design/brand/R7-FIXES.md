# One path, round 7: fixes for the build session

After 66d797a every screen was re-rendered at 1440 and 390 on Friday 23 October, 8:37 to 8:39 pm New York, and each screen was judged against that time. Scores: clarity 6.5 (round 6: 7), founder lens 6 (6.5), type 7.5 (8). What round 6 fixed holds: one clock everywhere, no expired Publish, the started show stays visible, Explore and Today pick the same crowd, honest money and WhatsApp lines, the rule book holds on every screen. Type: change nothing.

The dip is the evening path. At 8:37 pm a first-time owner cannot publish anything for tonight, and the home says something untrue: "Turnout is writing your campaign" for a campaign stuck since 12:52 pm. The root cause in this environment is an empty ANTHROPIC_API_KEY (operator mode): every Write button ends on a wait that never finishes. The ready Saturday Harry Styles campaign is reachable only through All alerts. The three-second judge: fix the stale state on Today, the firstOver plate and Coming next's ready campaign, set the key for the demo, and every screen reads at 8 or more.

Each issue was confirmed by a separate skeptic; the fix text is the skeptic's corrected version. Duplicates are marked. No design issue this round.

## 0. Demo blocker: nothing gets written in this environment

### #5 [major] today, who, campaign
**Root cause of most of this round: ANTHROPIC_API_KEY is empty in .env.local, so provider() is "operator" and every Write ends on a wait that never finishes. Before the demo: the key in .env.local (local) and in the Railway variables (deploy), set by Jacobo, never pasted in chat; or the operator answers data/agent-inbox before every demo. Then every Write button works as designed.**

Where: Root cause: .env.local, where ANTHROPIC_API_KEY is empty (len=0) and AGENT_PROVIDER is absent, so src/server/agent/run.ts:33-37 provider() returns "operator". The live server confirms it: GET /api/health says "agent":"operator". The worst screen is src/app/today/page.tsx:191-203, not mainly the campaign page. Its awaiting branch has no age limit (`fresh` at :85 only swaps the skeleton), so :193 says "Turnout is writing your campaign." and :197 says "The offer and the words follow." for a row that is hours old. Smaller spot: src/app/campaigns/[id]/page.tsx:135 says "A few minutes" during the first 15 minutes in operator mode.

Problem: In this environment every Write button ends in a wait that never finishes. Campaigns go to data/agent-inbox and stay awaiting_operator unless a Claude Code operator session answers. A merchant who presses "Write my campaign" or "Write it for the rest of the night" reads "A few minutes" and gets nothing.

Fix:

1) Demo prep, Jacobo only (keys live only in .env.local): fill ANTHROPIC_API_KEY. Next dev reloads .env.local and provider() reads process.env on every call, so no server restart is needed. createCampaign then drafts in seconds. Without the key, every button that writes a campaign (Write my campaign on Who, "Write it for the rest of the night" on the campaign page) and the hourly scan each add one more awaiting_operator row.

2) build, src/app/today/page.tsx:193-198. Make the old waiting state match the campaign page's stale state.

old:
<p className="t-name">Turnout is writing your campaign.</p>
...
<p className="t-body mt-3 max-w-2xl">The crowd is read. The offer and the words follow.</p>

new:
<p className="t-name">{fresh ? "Turnout is writing your campaign." : "Your campaign is not written yet."}</p>
...
<p className="t-body mt-3 max-w-2xl">Turnout started it at <span className="mono">{clock(Date.parse(campaign.created_at.replace(" ", "T") + "Z"), tz)}</span> and has not finished it. The crowd is read: see who is coming while it waits.</p>

clock is already imported at :4. Keep the "See who is coming" button and the "Follow it" link.

3) build, optional, src/app/campaigns/[id]/page.tsx:135. Add `provider` to the import from "@/server/agent/run" at :3.

old:
<p className="t-lead mt-5">Turnout reads the crowd through Qloo and writes every channel. A few minutes; this page refreshes on its own.</p>

new:
<p className="t-lead mt-5">{provider() === "operator" ? "Turnout has started this campaign. It appears here as soon as it is written; this page refreshes on its own." : "Turnout reads the crowd through Qloo and writes every channel. A few minutes; this page refreshes on its own."}</p>

The issue's wording "queued" is a system word, so I replaced it.

## 1. Today never claims what is not happening

### #1 [blocker] today
**BLOCKER. The plate says "Turnout is writing your campaign" for a campaign stuck for 8 hours. Apply the same 15-minute stale rule the campaign and Who pages already use. #0, #2 and #18 are the same: apply this one.**

Where: src/app/today/page.tsx:191-203 (awaiting_operator branch of the crowd plate; `fresh` is defined at :85)

Problem: The plate claims "Turnout is writing your campaign. The offer and the words follow." for a campaign stuck since 12:52 pm. There is no Publish on Today. "Follow it" opens a page headed "Not written yet", and the primary leads to a Who page that says "Write my campaign", which contradicts the claim. Dead end.

Fix:

src/app/today/page.tsx
1) :191  `) : campaign?.status === "awaiting_operator" ? (`  ->  `) : fresh ? (`
   (`fresh` at :85 already requires status awaiting_operator and an age under 15 min. A stuck campaign then falls through to the last branch: the "Write my campaign" form plus the "See who is coming first" link. That is the same rule as alerts/page.tsx:64, campaigns/new/page.tsx:147 and campaigns/[id]/page.tsx:75.)
2) :193-198  delete the dead ternary
   `{fresh ? (<div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>) : (<p className="t-body mt-3 max-w-2xl">The crowd is read. The offer and the words follow.</p>)}`
   ->  `<div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>`
3) :201  delete `<Link href={`/campaigns/${campaign.id}`} className="text-base link">Follow it</Link>`
   (while the campaign is fresh, the primary "See who is coming" opens the Who page. That page already shows "See my campaign" for the same campaign.)
4) :203  `{fresh && <RefreshEvery seconds={15} />}`  ->  `<RefreshEvery seconds={15} />`
Ops note, no code: the running server writes in operator mode, so nothing ever turns these rows into drafts. 8 of the last 9 Penn & Pour rows are awaiting_operator, and every one older than 15 min is stuck. For "Write my campaign" to end in words at the demo, Jacobo restarts the server with AGENT_PROVIDER=anthropic (the key stays in .env.local only). Without that, the fix still removes the false claim but the write loop starts again.

### #0 [major] today (and campaign-today, who)
**Duplicate of #1, skip.**

Where: src/app/today/page.tsx:191-203 (awaiting_operator branch of the plate); `fresh` is defined at :85 (not :83) and today only switches skeleton vs sentence and the RefreshEvery at :203

Problem: The home plate says "Turnout is writing your campaign" for a campaign stuck for 8 hours. There is no way to write it from Today. "Follow it" opens a page that says "Not written yet". The Who page, one click away, offers "Write my campaign", which contradicts "is writing".

Fix:

src/app/today/page.tsx
1) :191 old: `) : campaign?.status === "awaiting_operator" ? (` -> new: `) : campaign?.status === "awaiting_operator" && fresh ? (`
2) :194-198 old:
`{fresh ? (
                    <div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
                  ) : (
                    <p className="t-body mt-3 max-w-2xl">The crowd is read. The offer and the words follow.</p>
                  )}`
-> new:
`<div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>`
3) :201 old: `className="text-base link">Follow it</Link>` -> new: `className="text-base link">Watch it being written</Link>`
4) :203 old: `{fresh && <RefreshEvery seconds={15} />}` -> new: `<RefreshEvery seconds={15} />` (fresh is now always true in this branch; the 15 s refresh flips the plate to the last branch once the row is 15 minutes old).
A stale awaiting_operator row then skips the needs_input branch and reaches the last else: button "Write my campaign" plus link "See who is coming first", the same 15-minute rule as Who is coming (campaigns/new/page.tsx:147) and the campaign page ([id]/page.tsx `stale`), and what the rule book says for Today ("Publish when a campaign exists, else Write my campaign", docs/UX-ONE-PATH.md:47-50).

### #2 [major] today
**Duplicate of #1, skip.**

Where: src/app/today/page.tsx:191 (awaiting branch has no age check), :193-198 (t-name "Turnout is writing your campaign." plus the non-fresh line "The crowd is read. The offer and the words follow."), :203 (RefreshEvery). The `fresh` flag is defined at :85. The cause in the environment: .env.local:14 has an empty ANTHROPIC_API_KEY, so provider() in src/server/agent/run.ts:33-37 returns "operator". Same output at 1440 and 390.

Problem: Today's plate says "Turnout is writing your campaign. The crowd is read. The offer and the words follow." for a campaign stuck in awaiting_operator since 12:52 pm, 7 h 45 min before the 8:37 pm capture. The waiting branch never checks age. Because of it the plate offers no "Write my campaign", which breaks the rule book's "Publish when a campaign exists, else Write my campaign".

Fix:

src/app/today/page.tsx. Skip the issue's step 1: it declares a `stale` that is never used, and `fresh` at :85 already includes the status check.
1) Line 191
old: ) : campaign?.status === "awaiting_operator" ? (
new: ) : fresh ? (
2) Lines 194-198
old:
                  {fresh ? (
                    <div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
                  ) : (
                    <p className="t-body mt-3 max-w-2xl">The crowd is read. The offer and the words follow.</p>
                  )}
new:
                  <div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
3) Line 203
old: {fresh && <RefreshEvery seconds={15} />}
new: <RefreshEvery seconds={15} />
After this, an awaiting_operator row older than 15 minutes goes to the last else branch (:211-219): "Write my campaign" plus "See who is coming first". Who is coming already treats stale rows this way (R5 #? `written` query, 15-minute window). Environment (user, not build): set ANTHROPIC_API_KEY in .env.local, or have an operator session answer data/agent-inbox/*.prompt.md. Until then each "Write my campaign" adds one more awaiting_operator row. Today shows the skeleton for 15 minutes and then offers the button again. That is honest, but it never reaches Publish.

### #18 [major] today
**Duplicate of #1, skip.**

Where: src/app/today/page.tsx:191 (awaiting_operator branch has no age check), :194-198 (the not-fresh text), :203 (RefreshEvery). Today at 1440 and 390, plate at the fold.

Problem: The waiting state is not true and it crowds the plate. At 8:37 pm it says 'Turnout is writing your campaign. The crowd is read. The offer and the words follow.' The campaign camp_8f959758633c has been awaiting_operator since 12:52 pm, 7 h 45 min earlier. 'Follow it' opens a page whose display reads 'Not written yet'. In the plate, a 21 px weight-600 line and a 17 px line sit under a 21 px lead that already has a bold run, so the plate carries five text tiers instead of headline, sentence and button.

Fix:

1) src/app/today/page.tsx:191
old: `) : campaign?.status === "awaiting_operator" ? (`
new: `) : campaign?.status === "awaiting_operator" && fresh ? (`
2) src/app/today/page.tsx:194-198
old:
```
{fresh ? (
  <div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
) : (
  <p className="t-body mt-3 max-w-2xl">The crowd is read. The offer and the words follow.</p>
)}
```
new:
```
<div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
```
3) src/app/today/page.tsx:203 (optional cleanup, fresh is always true inside the branch now)
old: `{fresh && <RefreshEvery seconds={15} />}`
new: `<RefreshEvery seconds={15} />`
After the fix, a row older than 15 minutes falls to the existing last branch (:211-219): "Write my campaign" plus the link "See who is coming first". POST /api/campaigns does not reuse the stuck row. createCampaign (src/server/agent/run.ts:42-44) inserts a new row and redirects to that row's page. Today's query (:70, ORDER BY created_at DESC LIMIT 1) then picks the new row, so the stuck one is ignored and Today never shows two waiting campaigns. R5-FIXES.md:273 turned down a Write button on the campaign page because it posted back to the same page. That objection does not apply here: from Today the post lands on the new campaign's page. Known limit: ANTHROPIC_API_KEY is empty in .env.local, so the server runs in operator mode and the new row also waits. Today shows the skeleton for 15 minutes, then "Write my campaign" again. That is true, where the current text is not.

### #4 [major] today
**The one campaign that can be published (Saturday's Harry Styles) is invisible from Today. #7 and #24 are the same (Coming next sorted by start, ready campaigns not surfaced): apply this one.**

Where: src/app/today/page.tsx:50 (`later`) and :246 (row link); docs/UX-ONE-PATH.md:54 (Coming next spec). Same component at 1440 and 390.

Problem: Today hides the one campaign that can be published (tomorrow's Harry Styles, Publish live). Coming next shows three crowds that have already started, sorted by start time, under a title that says next. Harry Styles, the crowd with a campaign, comes last.

Fix:

1) src/app/today/page.tsx, insert after line 49 (after `const next = ...`, `now` is defined at :37; getDb, getEvent, campaignWindows already imported at :8, :10, :11):
```
  // A campaign already written whose first window is still ahead leads Coming next: it is one click from Publish.
  const ready = new Map((getDb().prepare("SELECT id, event_id FROM campaigns WHERE merchant_id = ? AND status = 'drafted' ORDER BY created_at ASC").all(merchant.id) as { id: string; event_id: string }[]).filter((r) => { const e = getEvent(r.event_id); return !!e && campaignWindows(e)[0].end > now; }).map((r) => [r.event_id, r.id] as const));
```
2) src/app/today/page.tsx:50
old: `  const later = upcoming.filter((it) => it !== next).sort((a, b) => presenceWindow(a.event).start - presenceWindow(b.event).start).slice(0, 3);`
new: `  const later = upcoming.filter((it) => it !== next).sort((a, b) => Number(ready.has(b.event.id)) - Number(ready.has(a.event.id)) || presenceWindow(a.event).start - presenceWindow(b.event).start).slice(0, 3);`
3) src/app/today/page.tsx:246
old: `                  <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.event.id}`} className="link">See who is coming</Link>`
new: `                  {ready.has(it.event.id) ? <Link href={`/campaigns/${ready.get(it.event.id)}`} className="link">Your campaign is ready</Link> : <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.event.id}`} className="link">See who is coming</Link>}`
4) docs/UX-ONE-PATH.md:54
old: `4. "Coming next": up to three lines, each "Sat 8 pm · Harry Styles · about 100 guests" + link "See who is coming".`
new: `4. "Coming next": up to three lines, each "Sat 8 pm · Harry Styles · about 100 guests" + link "See who is coming"; a crowd whose campaign waits for Publish comes first, with the link "Your campaign is ready".`
Result now: first row "Tomorrow 8 pm · Harry Styles · about 100 guests, enough to fill your seats · Your campaign is ready" → campaign page → Publish (2 clicks). I ran the `ready` query read-only against data/crowd.db. Only camp_869f94483d5f qualifies. camp_5613879d39a1 (Friday) and the older drafted waves have first windows that already closed, so no expired offer comes back. The plate pick and the "Now, until" rows are untouched.

### #7 [major] today
**Duplicate of #4, skip.**

Where: src/app/today/page.tsx:50 (`later` = sorted by start, slice(0, 3)) and :246 (Coming next link, always "See who is coming"). Reproduced Fri Oct 23, 8:53 pm New York (r7 render at 8:37 pm shows the same thing). Scratch: /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r7-verify/7/

Problem: A campaign that is written and can be published (Saturday's Harry Styles) is invisible on Today. The home offers no Publish at all, while the one ready action sits only behind All alerts, 4th row.

Fix:

Keep the plate as it is: round 6 headlines the strongest crowd by design, and the 9:30 pm theatre wave (122 guests, 40 min away) beats tomorrow's Harry Styles (100). Reject the issue's "headline ready[0]" swap. Fix only Coming next: put a ready campaign first, then link it to the campaign.

1) src/app/today/page.tsx:50
old:
  const later = upcoming.filter((it) => it !== next).sort((a, b) => presenceWindow(a.event).start - presenceWindow(b.event).start).slice(0, 3);
new:
  // A campaign already written and still good to send (its first window still ahead) is the one action waiting: its crowd comes first in Coming next, linked to the campaign.
  const readyId = new Map<string, string>();
  for (const it of upcoming) {
    if (it === next) continue;
    const row = getDb().prepare("SELECT id, status FROM campaigns WHERE merchant_id = ? AND event_id = ? ORDER BY created_at DESC LIMIT 1").get(merchant.id, it.event.id) as { id: string; status: string } | undefined;
    const ev = row?.status === "drafted" ? getEvent(it.event.id) : undefined;
    if (row && ev && campaignWindows(ev)[0].end > now) readyId.set(it.event.id, row.id);
  }
  const later = upcoming.filter((it) => it !== next).sort((a, b) => Number(readyId.has(b.event.id)) - Number(readyId.has(a.event.id)) || presenceWindow(a.event).start - presenceWindow(b.event).start).slice(0, 3);

(getDb, getEvent and campaignWindows are already imported at lines 8, 10, 11. It uses the same first-window rule as draftLive at :82. So Friday's camp_5613879d39a1, whose pre-show window is over, does not count as ready.)

2) src/app/today/page.tsx:246
old:
                  <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.event.id}`} className="link">See who is coming</Link>
new:
                  {readyId.has(it.event.id) ? <Link href={`/campaigns/${readyId.get(it.event.id)}`} className="link">See my campaign</Link> : <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.event.id}`} className="link">See who is coming</Link>}

("See my campaign" is the wording the Who is coming page already uses for this campaign.) Expected at 8:53 pm: the first Coming next row reads "Tomorrow 8 pm · Harry Styles · about 100 guests, enough to fill your seats · See my campaign", followed by two of the Now rows.

### #24 [minor] today
**Duplicate of #4, skip.**

Where: src/app/today/page.tsx:50 (the `later` sort). The row text is at :245, not :243, and it needs no change.

Problem: "Coming next" holds three rows that are on now, sorted by start, so the smallest crowd comes first and the biggest (Harry Styles, 0.3 km) last.

Fix:

src/app/today/page.tsx:50
old: `  const later = upcoming.filter((it) => it !== next).sort((a, b) => presenceWindow(a.event).start - presenceWindow(b.event).start).slice(0, 3);`
new:
```
  // Crowds already at the door first, the biggest first; then the ones still to come, in order of start.
  const onNow = (it: RadarItem) => presenceWindow(it.event).arrive <= now;
  const later = upcoming.filter((it) => it !== next).sort((a, b) => Number(onNow(b)) - Number(onNow(a)) || (onNow(a) ? b.potentialGuests - a.potentialGuests || presenceWindow(a.event).leave - presenceWindow(b.event).leave : presenceWindow(a.event).start - presenceWindow(b.event).start)).slice(0, 3);
```
(RadarItem is already imported as a type at :6.) Expected at 8:59 pm NY: Harry Styles 100, then Knicks at Celtics 38, then Andrew Yang 18. Drop the proposed `Now, until` -> `On now, until` change. Explore says the same thing in the same words (RadarView.tsx:384 `Now, until`), so changing only Today would give one state two wordings, and nothing shows the current label confuses anyone.

### #30 [minor] today
Where: src/server/events/moments.ts:76 (wave name); src/app/today/page.tsx:96 (lead `around`, so the count isn't lost); src/app/today/page.tsx:90 (date line, secondary)

Problem: The headline is 35 characters ("Theatre crowd letting out, 23 shows"): 2 lines at 1440, 3 at 390, longer than the rule book's five words. The date line is British for a New York bar.

Fix:

1) src/server/events/moments.ts:76
old: name: `${label} ${kind === "arrival" ? "arriving" : "letting out"}, ${members.length} shows`,
new: name: `${label} ${kind === "arrival" ? "arriving" : "letting out"}`,
(The count is still kept in meta.count and in venue.name "23 venues around you". The Explore timeline label at radar/page.tsx:120 already reads meta.count. The upsert at radar.ts:126 sets name=excluded.name, so stored waves pick up the new name on the next fetch. One name on every screen: Explore, Coming next, Who is coming, campaign.)

2) src/app/today/page.tsx:96, inside `around`
old: ${isShow ? `at ${next.event.venue.name}, ` : ""}
new: ${isShow ? `at ${next.event.venue.name}, ` : next.event.origin === "wave" ? `${next.event.meta?.kind === "arrival" ? "heading to" : "leaving"} ${Number(next.event.meta?.count ?? 0)} shows ` : ""}
-> lead: "About 24,300 people leaving 23 shows 1.2 km from your door from 9:30 to 10:45 pm." The h1 becomes "Theatre crowd letting out": 4 words, 25 chars, expected 2 lines at 390 instead of 3.

3) Secondary, src/app/today/page.tsx:90
old: new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz })
new: new Intl.DateTimeFormat(tz.startsWith("America/") ? "en-US" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: tz })
-> "Friday, October 23" (checked with node). Paris stays "Friday 23 October". Explore (RadarView.tsx:62), campaign (campaigns/[id]/page.tsx:61) and alerts (alerts/page.tsx:29) still use en-GB dates, so a shared date helper next to clock() in src/lib/clock.ts would be cleaner later.

### #31 [minor] today (Le Quai 12, reached from the footer)
Where: src/app/today/page.tsx:96 (around, venue name) and :109 (crowdName); also :245 (Coming next) and :279 (alerts line) for consistency; weather label at src/server/weather/openmeteo.ts:88 (not in today/page.tsx)

Problem: The other demo place shouts in capitals and shows a percentage: "ASAKE", "at ACCOR ARENA", "Rain likely (100%)".

Fix:

1) src/lib/text.ts, add a helper. It title-cases any run of all-capitals words that contains a word of 4 or more letters, and keeps short acronyms such as UFC, NBA and AC/DC:
export function unshout(s: string): string {
  return s.replace(/\b\p{Lu}[\p{Lu}'’.&\/-]*(?:\s+\p{Lu}[\p{Lu}'’.&\/-]*)*\b/gu, (run) => (/\p{Lu}{4,}/u.test(run) ? run.toLowerCase().replace(/(^|[\s\-'’\/&])(\p{L})/gu, (_, p, c) => p + c.toUpperCase()) : run));
}
2) src/app/today/page.tsx: import { firstSentences, noScores, plainWords, unshout } from "@/lib/text"; then
:96  `at ${next.event.venue.name}, ` -> `at ${unshout(next.event.venue.name)}, `
:109 (isShow ? next.headliner.name : next.event.name) -> unshout(isShow ? next.headliner.name : next.event.name)
:245 <b>{it.headliner.name}</b> -> <b>{unshout(it.headliner.name)}</b>
:279 {clockText(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert", tz)} -> {clockText(unshout(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"), tz)}
Result: "Asake", "at Accor Arena", "Sunday 19:00: Don Toliver at Accor Arena", "Korn".
3) src/server/weather/openmeteo.ts:88-89:
if (base.precipProb > 0) parts[0] = `${base.precipProb >= 50 || kind === "storm" ? KIND_LABEL[kind] : "Showers possible"} (${base.precipProb}%)`;
else parts[0] = `Rain (${base.precipMm} mm)`;
->
parts[0] = base.precipProb === 0 || base.precipProb >= 80 ? (kind === "storm" ? KIND_LABEL.storm : "Rain") : base.precipProb >= 50 || kind === "storm" ? KIND_LABEL[kind] : "Showers possible";
Result: "Rain, 12°C, feels 9°C." (and no "Rain likely (100%)", which contradicts itself). This one line also fixes the campaign page (:220, lowerFirst(weather)) and Explore (RadarView :390), which use the same label. precipProb stays in WeatherSummary for the agent prompt.

## 2. A campaign whose first window is over

### #3 [major] campaign (firstOver)
**The display and lead still sell the expired offer at 121 px. #8, #12 and #19 are the same: apply this one (lead with the next window or the truth, one sentence, one button).**

Where: src/app/campaigns/[id]/page.tsx:102 (h1), :109 (t-lead), :116-117 (firstOver sentence and form), :158 (section title)

Problem: After the first window closes, the plate's display and lead still sell the expired offer ("Pre-show happy hour", "5 to 7 pm"). The reason sits in small body text with odd wording. "What goes out" lists four channels of "until 7 pm" copy that will not go out.

Fix:

All lines in src/app/campaigns/[id]/page.tsx. A patched copy typechecks clean: /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r7-verify/3/page.patched.tsx (tsc exit 0).
:102 old: `<h1 className="t-display mt-5">{offer?.title ?? draft.chosen_offer_id}</h1>` new: `<h1 className="t-display mt-5">{firstOver ? wins[wins.length - 1].label : (offer?.title ?? draft.chosen_offer_id)}</h1>` (shows "After the show").
:109 old: `<p className="t-lead mt-5">{offerLine}</p>` new: `<p className="t-lead mt-5">{firstOver ? <>The crowd went in at <span className="mono">{clock(wins[0].end, tz)}</span> and comes out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span>. These words were for {lowerFirst(wins[0].label)}, so nothing goes out until Turnout writes new ones.</> : offerLine}</p>` (shows "The crowd went in at 7:30 pm and comes out at 10:45 pm. These words were for before doors, so nothing goes out until Turnout writes new ones.").
:116 delete the whole line `<p className="t-body mt-10">{wins[0].label} closed at <span className="mono">{clock(wins[0].end, tz)}</span>. These words were written for it, so they stay here.{wins.length > 1 ? ` The crowd comes out at ${clock(wins[wins.length - 1].start, tz)}.` : ""}</p>`.
:117 old: `method="post" className="mt-6">` new: `method="post" className="mt-10">`. Also on :117, old: `<button className="btn btn-accent btn-lg">Write it for the rest of the night</button>` new: `<button className="btn btn-accent btn-lg">{`Write it for ${lowerFirst(wins[wins.length - 1].label)}`}</button>` (shows "Write it for after the show").
:158 old: `<h2 className="t-title">What goes out</h2>` new: `<h2 className="t-title">{firstOver ? `Written for ${lowerFirst(wins[0].label)}` : "What goes out"}</h2>` (shows "Written for before doors").
Changes from the issue's proposed fix: (a) the proposed lead "These words were for before doors, which closed at 7:30 pm" brings back the odd "before doors ... closed" wording the issue itself complains about, and "so Turnout writes new ones" says Turnout is already rewriting, which only happens after the click. (b) The proposed title "What it said before doors" reads as "what it said before the doors". The rest of the proposed fix is correct. wins[wins.length - 1] is safe: firstOver needs two windows, and only Ticketmaster events have two ("Before doors" and "After the show"); a one-window event goes to nightOver instead.

### #8 [major] campaign
**Duplicate of #3, skip.**

Where: src/app/campaigns/[id]/page.tsx:70 (add after firstOver), :103-110 (lead), :116-117 (note + form), :158 ("What goes out" title), :179 ("Publish costs nothing.")

Problem: At 8:38 pm the plate still shows the dead offer at 121 px ("Pre-show happy hour", lead "5 to 7 pm"). The note is broken English and reads like a system message. Below it, "What goes out" still shows the "until 7" chalkboard as if it would go out.

Fix:

Keep the display as the offer. The rule book (docs/UX-ONE-PATH.md:66) says the campaign display is the offer, and "After the show, 10:45 pm" is a time, not an offer. Instead, do what the `out` branch already does: the status goes in the lead and the offer line drops to body.

1) After line 70 add:
```
  // firstOver only happens on a two-window night (Before doors, then After the show).
  const after = wins[wins.length - 1];
  const overSentence = `The pre-show crowd went in at ${clock(wins[0].end, tz)}, so these words no longer go out. ${after.start > now ? `The crowd comes back out at ${clock(after.start, tz)}.` : `The crowd is out now, until ${clock(after.end, tz)}.`}`;
```
2) Lines 103-110:
old: `{out ? (` ... `<p className="t-lead mt-5">{outSentence}</p>` ... `<p className="t-body mt-4">{offerLine}</p>`
new: `{out || firstOver ? (` ... `<p className="t-lead mt-5">{out ? outSentence : overSentence}</p>` ... `<p className="t-body mt-4">{offerLine}</p>` (the else branch stays the same)
3) Line 116: delete the whole `<p className="t-body mt-10">{wins[0].label} closed at ... so they stay here.{...}</p>`. Line 117: `className="mt-6"` -> `className="mt-10"` (the button keeps its label).
4) Line 158:
old: `<h2 className="t-title">What goes out</h2>`
new: `<h2 className="t-title">{firstOver ? "Written for the pre-show" : "What goes out"}</h2>`
5) Line 179:
old: `once you switch it on. Publish costs nothing. Button: {nb(draft.geofenced_ad.cta)}.`
new: `once you switch it on.{firstOver ? " " : " Publish costs nothing. "}Button: {nb(draft.geofenced_ad.cta)}.`

### #12 [major] campaign (firstOver, camp_5613879d39a1)
**Duplicate of #3, skip.**

Where: src/app/campaigns/[id]/page.tsx:109 (the plate's t-lead), :116 (the firstOver t-body note inside .plate), :117 (the form's mt-6). The copy was taken word for word from design/brand/R6-FIXES.md:48. Labels come from src/server/agent/prompt.ts:51-52.

Problem: The firstOver note is a second paragraph in the plate. The rule says the plate holds the headline, one sentence and one button, nothing else. The note is also ungrammatical, because the window label becomes the subject: "Before doors closed at 7:30 pm."

Fix:

Line 109
old: <p className="t-lead mt-5">{offerLine}</p>
new: <p className="t-lead mt-5">{firstOver ? <>{offer ? nb(`${offer.description.replace(/\.$/, "")}. `) : ""}These words were for the crowd {lowerFirst(wins[0].label)}, until <span className="mono">{clock(wins[0].end, tz)}</span>. The crowd comes out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span>.</> : offerLine}</p>

Line 116: delete the whole line
<p className="t-body mt-10">{wins[0].label} closed at <span className="mono">{clock(wins[0].end, tz)}</span>. These words were written for it, so they stay here.{wins.length > 1 ? ` The crowd comes out at ${clock(wins[wins.length - 1].start, tz)}.` : ""}</p>

Line 117
old: <form action="/api/campaigns" method="post" className="mt-6">
new: <form action="/api/campaigns" method="post" className="mt-10">

Result at 8:38 pm on camp_5613879d39a1: "Two cocktails for the price of one, 5 to 7 pm. These words were for the crowd before doors, until 7:30 pm. The crowd comes out at 10:45 pm." That leaves the headline, one lead and the button "Write it for the rest of the night", 40 px under the lead like Publish.

Changes from the proposed fix:
- It keeps the existing phrase "The crowd comes out at", not "comes out again". Before doors the crowd arrives, it does not come out.
- It drops "Written for the crowd before doors, which ended at". That is still a fragment, and "which" could refer to the crowd.
- It drops the wins.length > 1 guard. firstOver needs wins[0].end < now while nightOver is false, and that can only happen with two windows. So when firstOver is true the label is always "Before doors".
- It puts the second time in a mono span, like the first.

### #19 [major] campaign (camp_5613879d39a1, after 7:30 pm)
**Duplicate of #3, skip.**

Where: src/app/campaigns/[id]/page.tsx:108-110 (the non-out lead branch also renders in firstOver) and :116 (closed sentence in t-body). Campaign camp_5613879d39a1, 1440 and 390, re-captured live at 8:56:49 pm and 8:56:55 pm New York (Fri Oct 23). Renders: /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r7-verify/20/campaign-1440-fold.png, campaign-390-fold.png, plus the matching .json files.

Problem: In the firstOver state the type order puts the closed offer above the truth. 'Pre-show happy hour' stays at 121 px, and the 21 px lead still reads 'Two cocktails for the price of one, 5 to 7 pm'. The sentence that it closed at 7:30 pm is plain 17 px body under it. A merchant reading top-down sees a live 5 to 7 pm offer at 8:38 pm.

Fix:

Use the lead-and-body pattern the `out` branch already uses (lines 103-107).

Lines 108-110 old:
              ) : (
                <p className="t-lead mt-5">{offerLine}</p>
              )}
new:
              ) : firstOver ? (
                <>
                  <p className="t-lead mt-5">{wins[0].label} closed at <span className="mono">{clock(wins[0].end, tz)}</span>.{wins.length > 1 && <> The crowd comes out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span>.</>}</p>
                  <p className="t-body mt-4">{offerLine}</p>
                </>
              ) : (
                <p className="t-lead mt-5">{offerLine}</p>
              )}

Line 116 old:
                  <p className="t-body mt-10">{wins[0].label} closed at <span className="mono">{clock(wins[0].end, tz)}</span>. These words were written for it, so they stay here.{wins.length > 1 ? ` The crowd comes out at ${clock(wins[wins.length - 1].start, tz)}.` : ""}</p>
new:
                  <p className="t-body mt-10">These words were written for those hours, so they stay here.</p>

One change from the issue's version: once the closed sentence moves up to the lead, the offer line sits between it and this sentence, so "it" no longer points back to "Before doors". "Those hours" does. The issue's exact wording also works. I applied the patch to a copy at /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r7-verify/20/page.patched.tsx and it parses with esbuild (tsx). All the names it uses (wins, clock, tz, offerLine, firstOver) are already in scope at those lines. Expected result: display "Pre-show happy hour", then the 21 px lead "Before doors closed at 7:30 pm. The crowd comes out at 10:45 pm.", then the offer line in 17 px body, the note, and "Write it for the rest of the night".

### #13 [major] campaign (firstOver and nightOver)
Where: src/app/campaigns/[id]/page.tsx:158, :179, plus :173 (the WhatsApp note in the nightOver state)

Problem: The section title says "What goes out" and the strangers block says "Publish costs nothing.", yet the page offers no Publish once the first window has closed. "Button: Get directions." is a UI word.

Fix:

Line 158
old: <h2 className="t-title">What goes out</h2>
new: <h2 className="t-title">{firstOver || nightOver ? "What was written" : "What goes out"}</h2>

Line 179
old: once you switch it on. Publish costs nothing. Button: {nb(draft.geofenced_ad.cta)}.
new: once you switch it on.{campaign.status === "drafted" && !firstOver && !nightOver ? " Publish costs nothing." : ""} People tap “{nb(draft.geofenced_ad.cta)}”.

Line 173 (same problem on the WhatsApp card once the night is over: the gate checks firstOver but not nightOver)
old: {campaign.status === "drafted" && !send && !firstOver && <p className="t-body text-[var(--muted)]">
new: {campaign.status === "drafted" && !send && !firstOver && !nightOver && <p className="t-body text-[var(--muted)]">

### #11 [major] campaign (stale, camp_8f959758633c)
Where: src/app/campaigns/[id]/page.tsx:99 (eyebrow, shared by every branch), :126 (stale display), :127 (stale lead). Reached from Today's plate link "Follow it" (src/app/today/page.tsx:201) whenever the headline crowd has a stuck campaign.

Problem: The display is "Not written yet", a status. The rule book's Level 1 must be the thing that matters: the offer, the crowd or the place. The lead says "while it waits" after 8 hours.

The eyebrow stutters and capitalises mid-sentence: "Your campaign for tonight, Theatre crowd letting out, 23 shows at 23 venues around you".

Fix:

Line 99
old: <p className="eyebrow">Your campaign for {dayword}, {actName} at {event.venue_name}</p>
new: <p className="eyebrow">Your campaign for {dayword}{!draft && stale ? "" : (event.origin ?? "ticketmaster") === "ticketmaster" ? `, ${actName} at ${event.venue_name}` : event.origin === "wave" ? `, ${lowerFirst(actName)}` : `, ${actName}`}</p>

Line 126
old: <h1 className="t-display mt-5">Not written yet</h1>
new: <h1 className="t-display mt-5">{actName}</h1>

Line 127
old: <p className="t-lead mt-5">Turnout started this campaign at {clock(parseUtc(campaign.created_at), tz)} and has not finished it. The crowd is read: see who is coming while it waits.</p>
new: <p className="t-lead mt-5">Turnout started your campaign at {clock(parseUtc(campaign.created_at), tz)} and has not finished it.{lastWindowEnd < now ? "" : " See who is coming, then write it again."}</p>

Expected at 8:56 pm New York: eyebrow "Your campaign for tonight", display "Theatre crowd letting out, 23 shows" (same as Today and Who is coming), lead "Turnout started your campaign at 12:52 pm and has not finished it. See who is coming, then write it again.", button "See who is coming" (that page offers "Write my campaign"). A drafted wave campaign reads "Your campaign for Thursday, theatre crowd arriving, 36 shows". A TV campaign reads "Your campaign for Thursday, Rangers at Maple Leafs on MSG". A Ticketmaster campaign is unchanged ("..., Harry Styles at Madison Square Garden"). lastWindowEnd (:64), stale (:74) and lowerFirst (:31) are already defined above the return.

### #14 [major] campaign
Where: src/app/campaigns/[id]/page.tsx:212-227 (Why section; the details block is at :212-225, the two stray paragraphs at :226 "Who they are:" and :227 the confidence sentence). Reproduced in r7/campaign-1440.png and r7/campaign-390.png (captured Fri Oct 23, 8:38 pm New York, camp_5613879d39a1). Audit r7/campaign-1440.json and -390.json list "The rest of the reasoning" in detailsClosed.

Problem: The rule book says Why is three lines followed by "The rest of the reasoning". Here "Who they are: …" and "Turnout is fairly sure of this choice." render after the closed disclosure, so the disclosure looks open and the link sits mid-section.

Fix:

Don't move both lines above the link (the issue's fix). That makes the visible Why about 11 lines at 1440 (lead 4 + Who they are 6 + confidence 1) and 15 at 390, and the rule asks for three. Instead, the confidence sentence goes up under the lead, "Who they are" goes inside the disclosure, and the disclosure always renders, since audience_summary is a required string (src/server/agent/schema.ts:14). Then the link ends the section.

old (:211-227):
            <p className="t-body measure mt-6">{nb(whyLead)}</p>
            {(whyRest || draft.windows.length > 0) && (
              <details className="mt-4">
                <summary className="link w-fit text-base">The rest of the reasoning</summary>
                {whyRest && <p className="t-body measure mt-3">{nb(whyRest)}</p>}
                {draft.windows.map((w) => {
                  ...unchanged...
                })}
              </details>
            )}
            <p className="t-body measure mt-6">Who they are: {nb(plainWords(noScores(draft.audience_summary)))}</p>
            <p className="t-body measure mt-6">{draft.confidence >= 0.75 ? "Turnout is fairly sure of this choice." : "Turnout is less sure of this choice; read it closely."}</p>

new:
            <p className="t-body measure mt-6">{nb(whyLead)}</p>
            <p className="t-body measure mt-4">{draft.confidence >= 0.75 ? "Turnout is fairly sure of this choice." : "Turnout is less sure of this choice; read it closely."}</p>
            <details className="mt-4">
              <summary className="link w-fit text-base">The rest of the reasoning</summary>
              {whyRest && <p className="t-body measure mt-3">{nb(whyRest)}</p>}
              {draft.windows.map((w) => {
                ...unchanged...
              })}
              <p className="t-body measure mt-3">Who they are: {nb(plainWords(noScores(draft.audience_summary)))}</p>
            </details>

(Change the window-map lines only by removing one indent level. Nothing else changes.)

## 3. Who is coming knows what time it is

### #9 [major] who is coming (theatre wave, Today's primary target)
**The page Today's main button opens offers a pre-show deal to a crowd that is leaving, and names Buzzfeed, Fitbit and Ebay as what they like.**

Where: src/app/campaigns/new/page.tsx:151 and :154 (fit fact, main defect); :7 (import); secondary minor: :135 (stuttering like title), :143 (brands in the sentence). Reached from Today's only btn-accent "See who is coming" -> /campaigns/new?merchant=m_penn_pour&event=wave_m_penn_pour_exit_202610240130

Problem: The page Today's main button opens suggests a pre-show offer to a crowd that is leaving, names Buzzfeed, Fitbit and Ebay as what they like, and uses a three-tag title.

Fix:

MAIN (major). Line 7 old: `import { buildCrowdProfile, describeDemographics, getEvent, hasSignal, type CrowdProfile } from "@/server/qloo/crowd";` new: `import { buildCrowdProfile, describeDemographics, getEvent, hasSignal, momentMeta, type CrowdProfile } from "@/server/qloo/crowd";`
Line 151 old: `  const top = profile.offerFits.find((f) => f.offerId === chosenId) ?? profile.offerFits[0];` new:
```
  // A crowd letting out (an exit wave, or a show past its before-doors window) cannot take a pre-show offer.
  const leaving = momentMeta(event).kind === "exit" || (isShow && now > starts.getTime() - 30 * 60_000);
  const fits = leaving ? profile.offerFits.filter((f) => !/\bpre-(show|game|concert)\b|avant-(concert|spectacle|match)|\bbefore (the )?(show|game|doors)\b/i.test(f.title)) : profile.offerFits;
  const top = profile.offerFits.find((f) => f.offerId === chosenId) ?? fits[0];
```
Line 154 old: `  const second = profile.offerFits[1];` new: `  const second = fits[1];`
(isShow :112, starts :104, now :108 already exist; event meta kind is "exit" in DB.) Expected result on this wave: "Your craft beer flight or your after-show late plate" (both "Close" in the evidence table, both matches > 0, so tooClose holds). Regex also covers "Pre-game pitchers" and "Apéro d'avant-concert".
SECONDARY (minor, same file). Line 135 old: `  let likeTags = shownTags.map((t) => t.name).filter(isTaste).slice(0, 3);` new:
```
  // "Musicals", "Musical Theater", "Musical Drama", "Music and Theater" are one taste in a title: keep the first.
  const seenStem = new Set<string>();
  const oneStem = (n: string) => { const k = n.toLowerCase().replace(/[^a-z]/g, "").slice(0, 5); if (seenStem.has(k)) return false; seenStem.add(k); return true; };
  let likeTags = shownTags.map((t) => t.name).filter(isTaste).filter(oneStem).slice(0, 3);
```
-> title "Musicals and performing arts theater". (The issue's "title is Musicals" is not reachable: line 142 needs >= 2 items or falls back to brands.)
Line 143: do NOT use the issue's isCommercialBrand media/e-commerce filter: the 8 brands are Buzzfeed, Fitbit, Ebay, New York Magazine, The New York Times, IMDB, Getty Images, Disney+, all media or e-commerce, so the list empties. If wanted, name brands only when no bar is known: old `sentence: bars.length && brands.length ? \`They already go to ${andList(bars)}, and like ${andList(brands.slice(0, 3))}.\` : bars.length ? ...` new `sentence: bars.length ? \`They already go to ${andList(bars)}.\` : brands.length ? \`They like ${andList(brands.slice(0, 3))}.\` : "Qloo lists no bar nearby and no brand for this crowd yet.",` (brands stay in the evidence disclosure). Design call, minor.

### #15 [minor] who is coming (G5diZ_dfkEICb)
**"Tonight at 8 pm" 38 minutes after the start. #25 is the same: apply this one.**

Where: src/app/campaigns/new/page.tsx:170 (the plate's t-lead), plus the import at :3. Seen in /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r7/who-1440-fold.png (captured Fri 8:38:42 pm New York) and who-390.json (8:38:50 pm), and again live at 8:56 pm (curl copy in /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r7-verify/16/).

Problem: The plate gives the start as a future time after the show has started. At 8:38 pm it reads "tonight at 8 pm", while Today and Explore say "Now, until 12:15 am".

Fix:

Line 3
old: import { haversineKm, scoreConcentration } from "@/server/events/concentration";
new: import { haversineKm, presenceWindow, scoreConcentration } from "@/server/events/concentration";

Line 170
old: {event.venue_name}, {day} {isShow ? "at" : "from"} <span className="mono">{clock(starts, tz)}</span>
new: {event.venue_name}, {starts.getTime() <= now ? <>now until <span className="mono">{clock(presenceWindow(rowToEvent(event as Parameters<typeof rowToEvent>[0])).leave, tz)}</span></> : <>{day} {isShow ? "at" : "from"} <span className="mono">{clock(starts, tz)}</span></>}

Result at 8:38 pm: "Madison Square Garden, now until 12:15 am, two blocks from Penn & Pour. It could bring you about 100 guests." That uses Today's own words ("Now, until 12:15 am"). Before the start time it still says "tonight at 8 pm", which the pre-show offer needs. Keep the test as start <= now, not Today's arrive <= now: with arrive, the 8 pm start would already disappear at 5:30 pm. Do not use the issue's wording "started at 8 pm, the crowd is around until 12:15 am, two blocks from": it is a run-on with two clauses, and the distance ends up attached to the wrong part. rowToEvent is already imported (:4), and clock() accepts a number. Paris merchants get "now until 00:15".

### #25 [minor] who is coming (Harry Styles)
**Duplicate of #15, skip.**

Where: /Users/jacobofernandez/Code/Qloo/src/app/campaigns/new/page.tsx:159 (fit title) and :170 (lead clock); the new consts go after :150. Reproduced in r7 who-1440/who-390 (captured 8:38:44 pm and 8:38:52 pm NY) and again live at 8:58:39 pm NY via curl of /campaigns/new?merchant=m_penn_pour&event=G5diZ_dfkEICb

Problem: The lead says "tonight at 8 pm" 38 minutes after the start. "Your pre-show happy hour fits them best" after the pre-show ended. The button leads to the closed campaign.

Fix:

1) Imports: add `import { campaignWindows } from "@/server/agent/prompt";` (the campaign page already uses this import).
2) After line 150 (`const chosenId = ...`), add:
`const wins = campaignWindows(event);
const onNow = isShow && starts.getTime() <= now;
const preShowOver = isShow && !!written && wins[0].end < now;`
3) Line 159, old:
`? { title: \`Your ${inSentence(top.title)} fits them best\`, sentence: ...`
new:
`? { title: preShowOver && top.offerId === chosenId ? \`Your ${inSentence(top.title)} fit them best before the show\` : \`Your ${inSentence(top.title)} fits them best\`, sentence: ...` (sentence unchanged)
4) Line 170, old:
`{event.venue_name}, {day} {isShow ? "at" : "from"} <span className="mono">{clock(starts, tz)}</span>`
new:
`{event.venue_name}, {onNow ? <>on now, out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span></> : <>{day} {isShow ? "at" : "from"} <span className="mono">{clock(starts, tz)}</span></>}`
→ result: "Madison Square Garden, on now, out at 10:45 pm, two blocks from Penn & Pour." This matches the campaign page line "The crowd comes out at 10:45 pm."
Do NOT apply the issue's proposed title "After the show, your pre-show happy hour still fits them". It contradicts itself, and the offer is "5 to 7 pm".
Leave the "See my campaign" button as it is. It is not a dead end.

## 4. Pulse

### #6 [major] pulse (and today 'Every day this week')
**The weekly plan is headlined "Pre-show happy hour" (open since round 6). #10 is the same: apply this one.**

Where: src/app/pulse/page.tsx:45 (plate h1.t-display); src/app/today/page.tsx:258 (bold offer title in "Every day this week"), plus :88 (weekOffer, unused once :258 changes). Same at 1440 and 390, whatever the time of day. Seen in r7 pulse-1440/390 (captured 8:39 pm New York), r7 today-1440 (8:37 pm), and live curl at 8:54 pm New York on HEAD 66d797a with a clean tree.

Problem: The weekly plan is headlined "Pre-show happy hour" (the offer's title). There is no show every weekday, and the lead and chalkboard say after work. The founder judge flagged this in r6; it is unchanged.

Fix:

1) src/app/pulse/page.tsx:45
old: `<h1 className="t-display mt-5">{featured?.title ?? brief.featured_offer_id}</h1>`
new: `<h1 className="t-display mt-5">{nb(brief.always_on_ad.headline.replace(/[.!]$/, ""))}</h1>`
Today this reads "After work, before the train", the same text as the issue's chalkboard version. Use the ad headline, not chalkboard.split("\n")[0]: the schema caps the headline at 40 characters and the agent writes it as a headline. The chalkboard allows up to 90 characters and may come as one line, which would run 4 or 5 display lines at 121 px. Keep `featured` (line 29), which pulse :212-213 still uses.

2) src/app/today/page.tsx:258
old: `<p className="t-body mt-5"><b>{weekOffer?.title ?? brief.featured_offer_id}.</b> {nb(noScores(brief.street_in_one_line))}</p>`
new: `<p className="t-body mt-5">{nb(noScores(brief.street_in_one_line))}</p>`
(The t-name chalkboard just under it, "After work, before the train. Two cocktails $16 until 7.", already names the deal.)

3) src/app/today/page.tsx:88, delete the line, which becomes unused:
`  const weekOffer = brief ? offers.find((o) => o.id === brief.featured_offer_id) : undefined;`
(`offers` stays, :86 uses it.)

Expected: Pulse plate reads "This week at Penn & Pour" / "After work, before the train" / "Chelsea after work: ...". Its h1 no longer matches the campaign page's "Pre-show happy hour". Today's weekly block starts "Chelsea after work: ...". No change to type levels or counts.

### #10 [major] pulse + today
**Duplicate of #6, skip.**

Where: src/app/pulse/page.tsx:45 (Pulse plate h1.t-display, 1440 and 390); src/app/today/page.tsx:258 (bold line under "Every day this week", 1440 and 390) and :88 (weekOffer, unused once :258 changes). Root data: stored brief pulse_aa01f1fc5555 (m_penn_pour) has featured_offer_id o_pp_happy, and that offer's title is "Pre-show happy hour". The campaign camp_5613879d39a1 uses the same offer as its display.

Problem: The weekly plan is still headlined "Pre-show happy hour" (open since R6 #6). That is the same headline as the campaign page, and it contradicts its own words (after work, before the train).

Fix:

Use one name for the weekly plan on both screens: the brief's own Google post title ("Happy hour, 5 to 7 pm, every weekday"). Do not use the offer record's title. Do not hardcode the string.

1) src/app/pulse/page.tsx:45
old: `<h1 className="t-display mt-5">{featured?.title ?? brief.featured_offer_id}</h1>`
new: `<h1 className="t-display mt-5">{nb(brief.google_post.title.replace(/\.$/, ""))}</h1>`
(Keep `featured` at :29. It is still used at :212-213, the evidence note "This week's pick is ...".)

2) src/app/today/page.tsx:258
old: `<p className="t-body mt-5"><b>{weekOffer?.title ?? brief.featured_offer_id}.</b> {nb(noScores(brief.street_in_one_line))}</p>`
new: `<p className="t-body mt-5"><b>{nb(brief.google_post.title.replace(/\.$/, ""))}.</b> {nb(noScores(brief.street_in_one_line))}</p>`

3) src/app/today/page.tsx:88: delete `const weekOffer = brief ? offers.find((o) => o.id === brief.featured_offer_id) : undefined;` (nothing else uses it).

Expected result. Pulse plate: "This week at Penn & Pour" / "Happy hour, 5 to 7 pm, every weekday" (2 lines at 1440, about 3 at 390, the same length as Today's display "Theatre crowd letting out, 23 shows"). Today: "Happy hour, 5 to 7 pm, every weekday. Chelsea after work: ...", then the chalkboard. The campaign page keeps "Pre-show happy hour" as its own display.

### #29 [minor] pulse
Where: src/app/pulse/page.tsx:40 (main container), :43 to :47 (the plate section)

Problem: Pulse's plate text starts 64 px right of its titles and of the "Today" link. Today, the campaign page, Who and Alerts all line up at 232 px.

Fix:

Line 40: `<main className="mx-auto max-w-6xl px-5 py-10">` -> `<main className="mx-auto max-w-5xl px-6 py-10">`. Line 43: `<section className="plate stack-block">` -> `<section className="stack-block"><div className="plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">` (the same class string the campaign page uses at src/app/campaigns/[id]/page.tsx:98 and Today uses at src/app/today/page.tsx:110). Line 47: `</section>` -> `</div></section>`, so the div closes after the t-lead paragraph. Lines 44 to 46 (eyebrow, h1, lead) stay as they are, inside the div.

## 5. Explore

### #17 [major] explore
Where: src/app/radar/RadarView.tsx:182 (hour ticks in the "Hour by hour" timeline, rendered at :441-445; also in Full screen)

Problem: The hour ticks are hard-coded to 24-hour time, so New York shows "18:00". This breaks "Times in the merchant's clock" and the build note that all clocks go through clock.ts.

Fix:

src/app/radar/RadarView.tsx:182
old: if (h % 6 === 0) ticks.push({ left: pct(t), label: `${String(h).padStart(2, "0")}:00`, major: h === 0 });
new: if (h % 6 === 0) ticks.push({ left: pct(t), label: clock(t, tz), major: h === 0 });
Optional, same block, :186
old: }, [t0, t1]); // eslint-disable-line react-hooks/exhaustive-deps
new: }, [t0, t1, tz]); // eslint-disable-line react-hooks/exhaustive-deps
clock is already imported at :2 and tz is defined at :55. Tested in node: New York ticks become "6 pm", "12 am", "6 am", "12 pm"; Paris ticks stay "18:00", "00:00", "06:00", "12:00".

### #20 [minor] explore
Where: src/app/radar/RadarMap.tsx:296 (peek card innerHTML on the Explore map, 1440 width, shown at min-width 640px)

Problem: The map card says "on the timeline", which points at a fold that is closed by default ("Hour by hour"). Its link says "See who is coming, with Qloo" while every other link on the page says "See who is coming".

Fix:

RadarMap.tsx:296, two edits on the same template string.
1) old: `<p class="tm-peek-k">${escapeHtml(sel.time)}${sel.active ? ` · <span class="on">on the timeline</span>` : ""}</p>`
   new: `<p class="tm-peek-k">${escapeHtml(sel.time)}</p>`
2) old: `<a class="tm-peek-a" href="${sel.href}">See who is coming, with Qloo</a>`
   new: `<a class="tm-peek-a" href="${sel.href}">See who is coming</a>`
Leave globals.css:1005 `.tm-root .tm-peek-k .on` alone (design-owned; it just goes unused).

### #21 [minor] explore
**The selected row leaves a hole in the two-column list. #27 is the same: apply this one.**

Where: src/app/radar/radar.css:75 (the `.tm-crowds` rule at min-width 1024px). Cause: the tone padding from globals.css:856 `.tone { padding: var(--tone-pad); }`, which is 44 px at 1440, landing on the selected `<li className="tone">` in src/app/radar/RadarView.tsx:382.

Problem: In the two-column list, the selected row's tone padding (44 px at 1440) indents its text and makes its grid row 88 px taller. This leaves a white hole beside Harry Styles.

Fix:

radar.css:75 old: `@media (min-width: 1024px) { .tm-crowds { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 64px; row-gap: 32px; } }` new: `@media (min-width: 1024px) { .tm-crowds { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 64px; row-gap: 32px; } .tm-crowds > li.tone { padding: 20px 16px; margin: -20px -16px; } }`. This uses 16 px on the sides, not the 24 px the issue proposed. The page is `max-w-6xl px-5` (src/app/radar/page.tsx:84), so the gutter is only 20 px from 1024 to about 1160 px wide. With -24 px, a selected card in the right column pokes 4 px past the viewport. Measured at 1024: card right edge 1028, horizontal scroll on. With 16 px: no overflow at 1024, 1100 or 1440, and the text lines up with its neighbours. At 1440 the text starts at x 752, same as Andrew Yang. Row 2 drops from 260 to 144 px, and the gap beside Harry Styles drops from 171 to 55 px. The 55 px left over is the card's two extra lines of text, which is honest content, not padding.

### #27 [minor] explore
**Duplicate of #21, skip.**

Where: src/app/radar/radar.css:75 (the 2-column .tm-crowds media query). The selected row is `<li className="tone">` in src/app/radar/RadarView.tsx:382, and its padding comes from src/app/globals.css:856 `.tone { padding: var(--tone-pad); }` (44 px at 1440). The phone bleed rule at globals.css:858 has no desktop equivalent.

Problem: In the two-column crowd list, the grey highlighted card is taller than its neighbour, which leaves a hole under Harry Styles. Its inset text does not line up with the column edge. It looks unfinished.

Fix:

radar.css:75
old:
@media (min-width: 1024px) { .tm-crowds { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 64px; row-gap: 32px; } }
new:
@media (min-width: 1024px) {
  .tm-crowds { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 64px; row-gap: 32px; }
  /* the chosen crowd: the tone bleeds into the gutter, its words stay on the column edge and the row keeps its height */
  .tm-crowds > li.tone { padding: 20px 24px; margin: -20px -24px; }
}
Do NOT use the proposed `.tm-crowds > li.sel { grid-column: 1 / -1; order: -1; }`. The selected class is `tone`, not `sel`. I tested it as `li.tone` and it fails: the card stays 544 px wide instead of 1112, so it leaves a new hole on the right. It also puts "Today 9:30 pm" above the three "Now" rows, which breaks the soonest-first order, and it leaves "Tomorrow 4:30 pm" alone on its row.

## 6. Words

### #16 [minor] today + campaign + pulse
Where: src/app/today/page.tsx:147, :153, :156; src/app/campaigns/[id]/page.tsx:26-27; src/app/pulse/page.tsx:90 (all widths; Today side shows only while a live drafted campaign headlines)

Problem: The rule book says Today shows "the same blocks as the campaign page… with the same eyebrows", and Pulse's channel blocks are "named in the same merchant words as on Today and the campaign". The three files name two channels three ways.

Fix:

One name per channel on all three pages. Use "To strangers nearby": the Pulse weekly ad is centred on the bar, not a venue, and the demo geofence is centred on the merchant (src/server/channels/index.ts:79). The radius and the venue stay in the muted line, as the campaign page already does.

src/app/campaigns/[id]/page.tsx:27
old: geofenced_ad: "To strangers around the venue",
new: geofenced_ad: "To strangers nearby",

src/app/today/page.tsx:147
old: <p className="eyebrow">To your regulars, on WhatsApp</p>
new: <p className="eyebrow">To your regulars on WhatsApp</p>

src/app/today/page.tsx:153
old: <p className="eyebrow">To strangers, <span className="mono">{draft.geofenced_ad.radius_m}&nbsp;m</span> around the venue</p>
new: <p className="eyebrow">To strangers nearby</p>

src/app/today/page.tsx:156
old: <p className="mt-4 text-sm text-[var(--muted)] tnum">{nb(`Shown ${
new: <p className="mt-4 text-sm text-[var(--muted)] tnum">Within <span className="mono">{draft.geofenced_ad.radius_m}&nbsp;m</span> of the venue. {nb(`Shown ${

src/app/pulse/page.tsx:90: no change ("To strangers nearby" is already the target).

Better fix: move CHANNEL_NAME from src/app/campaigns/[id]/page.tsx:24-30 into a new src/lib/channels.ts. Import it in campaigns/[id]/page.tsx, today/page.tsx (eyebrows at :143, :147, :153, :160, :167 become {CHANNEL_NAME.storefront} and so on) and pulse/page.tsx (Block titles at :80, :83, :86, :90). Then the names cannot drift apart again.

### #22 [minor] alerts
**Alerts still print the tour title. #26 is the same plus the lead's promise: apply both parts here.**

Where: src/app/alerts/page.tsx:61-62 (`what`, and `tail`, which slices by `what.length`) and :70 (the bold name `{what}`). The text comes from the stored message built at src/server/agent/scan.ts:123 (`${it.event.name} at ${it.event.venue.name}`).

Problem: The Harry Styles row, the only alert with a ready campaign, still prints the tour title. Today, Who is coming and the campaign page all say "Harry Styles".

Fix:

Leave line 61 alone. The issue's fix is wrong: it shortens `what`, but line 62 slices `tail` by `what.length`, so the line under it would start mid-word. I tested this in node and it gives "Saturday 8 pm · ison Square Garden, about 20,000 people ...". Its regex also turns "2:22 - A Ghost Story" into "2". Corrected fix:
1) After alerts/page.tsx:62 (`const tail = what ? first.slice(when.length + 2 + what.length + 2) : first;`) add:
`const name = what.replace(/^([^:]*[^\d:]): .*? at /, "$1 at ");`
2) alerts/page.tsx:70 old: `{what && <> · <span className="font-semibold text-[var(--ink)]">{what}</span></>}`
new: `{what && <> · <span className="font-semibold text-[var(--ink)]">{name}</span></>}`
Tested in node:
- "Harry Styles: Together, Together at Madison Square Garden" becomes "Harry Styles at Madison Square Garden", and the line under it still starts "about 20,000 people".
- Waves ("Theatre crowd letting out, 22 shows") do not change.
- "New York Knicks vs. Orlando Magic at Madison Square Garden" does not change.
- "2:22 - A Ghost Story at ..." does not change.
- "Six: The Musical at X" becomes "Six at X".
Optional root fix for new alerts (not checked): at scan.ts:123, print the headliner's name for Ticketmaster events instead of `it.event.name`, as Today does with `headliner.name`. Rows already stored still need the page fix.

### #26 [minor] alerts + today
**Duplicate of #22, skip.**

Where: src/app/alerts/page.tsx:37 (the lead) and src/app/alerts/page.tsx:70 (where the row name is shown). Not lines 57-59. Today does not show either problem: the sentence at src/app/today/page.tsx:272 only appears when there are no alerts, and the Harry Styles alert was not in Today's three-row list at 8:37 or 8:59 pm NY.

Problem: The lead promises that Turnout writes the campaign; 5 of 6 rows say "Not written yet". The Harry Styles row still shows the tour title.

Fix:

1) src/app/alerts/page.tsx:37
old: <p className="t-lead mt-5">Every hour Turnout looks for the crowds worth a campaign and starts writing the strongest one. Here is what it found.</p>
new: <p className="t-lead mt-5">Every hour Turnout looks for the crowds worth a campaign near you. Here is what it found.</p>

2) src/app/alerts/page.tsx:70 (change only what is shown, not the `what` variable)
old: {what && <> · <span className="font-semibold text-[var(--ink)]">{what}</span></>}
new: {what && <> · <span className="font-semibold text-[var(--ink)]">{what.replace(/^([^:]+): .+? at /, "$1 at ")}</span></>}

Do NOT add the replace to `const what` on line 61, as the issue suggests. Line 62 cuts the rest of the line using what.length, so a shorter `what` garbles that text. Tested in node: the row would read "ison Square Garden, about 20,000 people 0.3 km from you...". With the replace on line 70 instead, the row reads "Harry Styles at Madison Square Garden". The Knicks and theatre rows have no colon, so they do not change.

### #23 [minor] campaign, pulse
**Spec-sheet leftovers ("Button: Get directions.", Title Case interests, "aggregate taste"). #28 is the same: apply this one.**

Where: src/lib/text.ts:40 (start of the plainWords chain, plus a new helper after it); src/app/pulse/page.tsx:4 and :95; src/app/campaigns/[id]/page.tsx:12, :179, :181. Seen in r7/pulse-1440.png (captured 8:38 pm New York, Fri Oct 23) and r7/campaign-1440.png (8:38 pm). Also seen live with curl at 8:57 pm New York on /pulse and /campaigns/camp_5613879d39a1. Same code at 390.

Problem: Spec-sheet leftovers in the channel copy: "Button: Get directions." and Title Case tag lists. Pulse's limitations still say "aggregate taste".

Fix:

1) src/lib/text.ts:40-41 (plainWords). Put this first in the chain:
old:
  return s
    .replace(/The offer fits are affinities
new:
  return s
    .replace(/\baggregate (tastes?)\b/gi, "shared $1")
    .replace(/The offer fits are affinities
Result: "Qloo describes the shared taste of this stretch of Chelsea, ..."

2) src/lib/text.ts: add a new export after plainWords:
// Ad interests arrive in Qloo's capitals. A common phrase of two or more words with no capital after the first letter gets lowercased. Single words keep their capital, because they are often names (Broadway, Aladdin, Hamilton, Gradur).
export const plainList = (xs: string[]) => xs.map((t) => (/^\p{Lu}[\p{Ll}-]+( [\p{Ll}&-]+)+$/u.test(t) ? t.toLowerCase() : t)).join(", ");
Change the imports at pulse/page.tsx:4 and campaigns/[id]/page.tsx:12 from `{ firstSentences, noScores, plainWords }` to `{ firstSentences, noScores, plainList, plainWords }`.

3) src/app/campaigns/[id]/page.tsx:181
old: Aimed at people into: {nb(draft.geofenced_ad.interests.join(", "))}.
new: Aimed at people into: {nb(plainList(draft.geofenced_ad.interests))}.

4) src/app/pulse/page.tsx:95
old: Interests: {brief.always_on_ad.interests.join(", ")}
new: Aimed at people into: {nb(plainList(brief.always_on_ad.interests))}.
(This uses the campaign page's merchant label. "Interests:" is a spec label.)

5) src/app/campaigns/[id]/page.tsx:179, lowest priority:
old: Publish costs nothing. Button: {nb(draft.geofenced_ad.cta)}.
new: Publish costs nothing.

Do NOT use the issue's regex /^[A-Z][a-z]+( [a-z&]+)*$/. The `*` also matches single words, so stored campaigns would show "broadway, ..., aladdin" (camp_6eb2de8cb7f5, camp_8676c08c1a02), "hamilton" (camp_ee4a790ce23e) and "gradur" (camp_1c96329e6431). It also misses "Rap français" and "After-work drinks".

### #28 [minor] campaign
**Duplicate of #23, skip.**

Where: src/app/campaigns/[id]/page.tsx:179 and :181 (the "To strangers around the venue" block under "What goes out"). Same text at 1440 and 390, because the server markup does not depend on width. Also seen: src/app/pulse/page.tsx:95 "Interests: {brief.always_on_ad.interests.join(", ")}" has the same spec-sheet label, but it is a separate page.

Problem: The ad block still reads like a spec sheet: "Button: Get directions." and Title Case interests.

Fix:

Line 179, old: ` Publish costs nothing. Button: {nb(draft.geofenced_ad.cta)}.` -> new: ` Publish costs nothing.`
Line 181, old: `Aimed at people into: {nb(draft.geofenced_ad.interests.join(", "))}.` -> new: `For people who like {nb(draft.geofenced_ad.interests.map((s) => (/^\p{Lu}\p{Ll}+(?: \p{Ll}[\p{Ll}-]*)+$/u.test(s) ? s.toLowerCase() : s)).join(", "))}.`
Do not apply the issue's `.slice(0, 4).map((s) => s.toLowerCase())`. Tested on every stored draft in data/agent-inbox, the new line gives "For people who like cocktail bars, pop music, luxury fashion, rooftop bars, Harry Styles, brunch spots." and "For people who like Broadway, musical theatre, cocktail bars, Disney+, Hamilton, The Lion King."

## Not verified

23 minor issues reported by one judge only are in `.tmp/onepath/r7-result.json` under `unverified`.
