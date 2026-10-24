# One path, round 8: fixes for the build session

After f9e1eba every screen was re-rendered at 1440 and 390 on Friday 23 October, 9:14 to 9:17 pm New York. Scores: clarity 7.5 (round 7: 6.5), founder lens 7 (6). The evening path tells the truth now: nothing expired, no crowd missing, no false waiting state, the ready Saturday campaign leads Coming next and is two clicks from Publish. The Saturday campaign page scores 8.5, the best page in the app. Type was not re-judged (tokens stable).

What holds it under 8: Who is coming for Harry Styles still says "Your pre-show happy hour fits them best" an hour after doors, one click before a page that says those words were for before doors; the firstOver page is mostly copy that is over; "What goes out" is plain paragraphs, not the objects a merchant recognises. The empty API key stays the known environment limit.

Design done in this round (36fd53b): the plate eyebrow takes the plate's width (no more two-line label), and the preview classes for #4. Each issue was confirmed by a separate skeptic; duplicates are marked.

## 1. Two screens, one message

### #2 [major] who (Harry Styles, on now)
**Who is coming for Harry Styles still crowns the pre-show happy hour after doors: the drafted offer bypasses the leaving filter (new/page.tsx:157). #0 and #6 are the same: apply this one.**

Where: src/app/campaigns/new/page.tsx:157 (the `top` choice). Line 161 (`tooClose`) stays as it is. Who page for Harry Styles, MSG, event G5diZ_dfkEICb, merchant m_penn_pour, at 1440 and 390.

Problem: After doors, the fit fact still crowns the pre-show offer. The written campaign's chosen offer bypasses the 'leaving' filter, because line 157 picks chosenId before fits[0].

Fix:

src/app/campaigns/new/page.tsx:157
old:
  const top = profile.offerFits.find((f) => f.offerId === chosenId) ?? fits[0];
new:
  const chosenFit = profile.offerFits.find((f) => f.offerId === chosenId);
  // After doors a written pre-show choice is over. The campaign page now says "After the show", so the after-show offer leads, then the best one left.
  const top = chosenFit && fits.includes(chosenFit) ? chosenFit : (chosenFit && fits.find((f) => /\bafter-(show|game|concert)\b|\blate\b|après/i.test(f.title) && f.matches > 0 && f.affinity > 0)) || fits[0];

Line 158 (topFits) needs no change: `top.offerId === chosenId` can only be true when the choice survived the filter. Line 161: keep `!chosenId &&`. Do NOT apply the founder's change there. With a campaign already written, the pair sentence "Turnout picks one ... when it writes your campaign" would be false.
Expected after the fix, show on now: "Your after-show late plate fits them best" / "Burgers and late-night food, like McGee's Pub, Hard Rock Cafe and Little Italy Pizza, which they already like." This matches the campaign page's "After the show" and "Write it for after the show".

### #0 [major] who (Harry Styles, G5diZ_dfkEICb)
**Duplicate of #2, skip.**

Where: src/app/campaigns/new/page.tsx:157 (Who is coming page, Harry Styles G5diZ_dfkEICb, m_penn_pour, 1440 and 390)

Problem: At 9:16 pm, with the show started, the third fact still says "Your pre-show happy hour fits them best". The leaving filter at :155-156 works (leaving is true from 7:30 pm), but `top` takes the drafted campaign's chosen offer from the unfiltered profile.offerFits, so the pre-show offer comes back. One click later, "See my campaign" opens "After the show ... These words were for before doors".

Fix:

src/app/campaigns/new/page.tsx:157 old: `const top = profile.offerFits.find((f) => f.offerId === chosenId) ?? fits[0];` new: `const top = fits.find((f) => f.offerId === chosenId) ?? fits[0];`. Nothing changes before the crowd leaves (then fits === profile.offerFits), and nothing changes when the chosen offer passes the filter. Only a pre-show choice is dropped once the crowd is leaving. For this crowd, top then becomes fits[0] = "Game night big screen" (Strongest fit; matches and affinity above 0), so topFits passes on the match test. tooClose stays false because chosenId is set. Third fact becomes "Your game night big screen fits them best" with "Sports bar and beer, like Slattery's Midtown Pub, The Rutherford and Smithfield Hall NYC, which they already like."

### #6 [major] who is coming (Harry Styles, show on now)
**Duplicate of #2, skip.**

Where: src/app/campaigns/new/page.tsx:157 (top), :158 (topFits), :161 (tooClose). Page: /campaigns/new?merchant=m_penn_pour&event=G5diZ_dfkEICb (Harry Styles, show on now), at 1440 and 390.

Problem: R7 #9 landed, but the written campaign's offer skips the leaving filter. At 9:16 pm, with the show on and the lead saying "now until 12:15 am", the third fact reads "Your pre-show happy hour fits them best". The pre-show window closed at 7:30 pm.

Fix:

src/app/campaigns/new/page.tsx
:157 old:
  const top = profile.offerFits.find((f) => f.offerId === chosenId) ?? fits[0];
new:
  // The written campaign's offer leads only while it can still go out: a pre-show pick does not fit a crowd already inside.
  const chosen = fits.find((f) => f.offerId === chosenId);
  const top = chosen ?? fits[0];
:158 old:
  const topFits = !!top && (top.matches > 0 && top.affinity > 0 || top.offerId === chosenId);
new:
  const topFits = !!top && (top.matches > 0 && top.affinity > 0 || top === chosen);
:161 old:
  const tooClose = !chosenId && !!top && !!second && second.matches > 0 && top.affinity - second.affinity <= 0.02;
new:
  const tooClose = !chosen && !!top && !!second && second.matches > 0 && top.affinity - second.affinity <= 0.02;

I applied this to a scratch copy (.tmp/onepath/r8-verify/7/page.patched.tsx) and esbuild parses it.

Expected after 7:30 pm NY on this page: fits leaves out o_pp_happy, so top = Game night big screen (rank 1 in the evidence table, "Strongest fit") and second = After-show late plate ("Further", more than 0.02 behind), so tooClose stays false. The third fact then reads "Your game night big screen fits them best" with "Sports bar and beer, like Slattery's Midtown Pub, The Rutherford and Smithfield Hall NYC, which they already like."

Before 7:30 pm nothing changes: fits = offerFits, so chosen = the campaign's pick. The :158 change gives the same result as today and only keeps the names consistent. :157 and :161 are the changes that do the work.

Optional edge case, not live: when top is not the chosen offer and topPlaces is empty, the fallback sentence ": the choice Turnout made for this crowd." would be false. It only applies when top === chosen.

### #3 [minor] campaign (firstOver, camp_5613879d39a1)
**Under the "After the show" plate, about 600 px of before-doors copy and a Why defending it.**

Where: src/app/campaigns/[id]/page.tsx:91 (add a const after whatsappLive), :156-157 (channel section open and its t-title), :203 (channel section close), :208 and :225 (Why section open and close). Campaign camp_5613879d39a1 in the firstOver state. Captured live Fri Oct 23 at 9:30:58 pm (1440) and 9:31:04 pm (390) New York: /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r8-verify/3/campaign-1440.png, campaign-390.png, campaign-390-fold.png and the .json files next to them. Patched copy: /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r8-verify/3/page.patched.tsx (esbuild parses it, tsc -p passes against the project config).

Problem: Under the 'After the show' plate, the page still shows all four pre-show channel blocks as an open section, then a Why defending that dead choice. Most of the page talks about an offer that is over.

Fix:

The issue's fix has a bug. Changing `{draft && (` at :206 to `{draft && !firstOver && (` hides BOTH Why and "What this does not establish", because one fragment holds both. That is not the page the issue promises ("plate, Write it for after the show, What this does not establish, provenance"). Its `{blocks}` is also pseudo-code. Exact edits:

1. After :91 (`const whatsappLive = ...`), add:
  // Once the first window is over, the old words fold away under the plate: the page is about the rewrite.
  const ChannelsWrap = firstOver ? "details" : "section";

2. :156-157 old:
        <section className="stack-section">
          <h2 className="t-title">{firstOver ? `Written for ${lowerFirst(wins[0].label)}` : nightOver ? "What was written" : "What goes out"}</h2>
new:
        <ChannelsWrap className="stack-section">
          {firstOver ? <summary className="link w-fit text-base">{`The words written for ${lowerFirst(wins[0].label)}`}</summary> : <h2 className="t-title">{nightOver ? "What was written" : "What goes out"}</h2>}

3. :201-204 old (the close of the same section; the bare `</section>` line appears more than once, so match it with its context):
            })}
          </div>
        </section>
      )}
new:
            })}
          </div>
        </ChannelsWrap>
      )}

4. :208-209 old:
          <section className="stack-section">
            <h2 className="t-title">Why</h2>
new:
          {!firstOver && (<section className="stack-section">
            <h2 className="t-title">Why</h2>

5. :224-225 old (the end of Why, before the limitations section):
            </details>
          </section>

          <section className="stack-section">
            <h2 className="t-title">What this does not establish</h2>
new:
            </details>
          </section>)}

          <section className="stack-section">
            <h2 className="t-title">What this does not establish</h2>

Result when firstOver: the plate with "After the show" and its one button, then a closed link "The words written for before doors" (it echoes the lead's "These words were for before doors"), then "What this does not establish", then provenance. The pre-show and nightOver states do not change. The rule book (docs/UX-ONE-PATH.md:66-71) only describes the live campaign, so docs should add one line under "The campaign": "When the first window is over, What goes out folds into a closed link and Why is dropped."

### #5 [major] campaign (firstOver rewrite) + today
Where: src/app/campaigns/[id]/page.tsx:70 (also :102, :109, :157 follow firstOver); src/app/today/page.tsx:51 and :84; src/app/api/campaigns/[id]/approve/route.ts:19 (missing from the issue); cause src/server/agent/prompt.ts:58 (the prompt drops the closed window, but every gate still tests campaignWindows(event)[0])

Problem: The firstOver button cannot lead to Publish. "Write it for after the show" posts a new campaign. The prompt's timeWindows (prompt.ts:58) drops the closed "Before doors" window, so the new draft carries only "After the show". But firstOver (:70) still tests campaignWindows(event)[0], which is "Before doors" and closed at 7:30 pm. The rewritten campaign therefore shows the display "After the show", the false lead "These words were for before doors" and the same "Write it for after the show" button again, with no Publish. Today's draftLive (:84) and ready (:51) use the same test, so Today never offers it either. Once the key is set, or an operator answers, the evening path loops.

Fix:

1) src/server/agent/prompt.ts, add after timeWindows (line 59):
// The first window a draft was written for, as instants. A rewrite after doors carries only "After the show".
// Match on the label or on the local start time (same formatter as timeWindows), so a relabelled window still matches.
export function draftFirstWindow(event: EventRow, draftWindows: { label: string; start_local: string }[], timeZone: string) {
  const all = campaignWindows(event);
  const fmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone });
  return all.find((w) => draftWindows.some((d) => d.label === w.label || d.start_local === fmt.format(new Date(w.start)))) ?? all[0];
}

2) src/app/campaigns/[id]/page.tsx:4
old: import { campaignWindows } from "@/server/agent/prompt";
new: import { campaignWindows, draftFirstWindow } from "@/server/agent/prompt";
:70
old: const firstOver = campaign.status === "drafted" && !nightOver && wins[0].end < now;
new: const firstOver = campaign.status === "drafted" && !nightOver && !!draft && draftFirstWindow(event, draft.windows, tz).end < now;
(:102, :109, :157 keep wins[0] / wins[last]: they only render when firstOver, i.e. for a draft that really carries Before doors.)

3) src/app/today/page.tsx:11
old: import { campaignWindows } from "@/server/agent/prompt";
new: import { draftFirstWindow } from "@/server/agent/prompt";
:51 old: .filter((r) => { const e = getEvent(r.event_id); return !!e && campaignWindows(e)[0].end > now; })
new: .filter((r) => { const e = getEvent(r.event_id); const d = getDraft(getCampaign(r.id)!); return !!e && !!d && draftFirstWindow(e, d.windows, merchant.timezone).end > now; })
:84 old: const draftLive = !!campaignEvent && campaignWindows(campaignEvent)[0].end > now;
new: const draftLive = !!campaignEvent && !!draft && draftFirstWindow(campaignEvent, draft.windows, tz).end > now;
(tz is declared at :53, before :84; :51 uses merchant.timezone because tz is not yet declared.)

4) src/app/api/campaigns/[id]/approve/route.ts:5
old: import { campaignWindows } from "@/server/agent/prompt";
new: import { draftFirstWindow } from "@/server/agent/prompt";
:19 old: const open = !!event && campaignWindows(event)[0].end > Date.now();
new: const open = !!event && !!draft && !!merchant && draftFirstWindow(event, draft.windows, merchant.timezone).end > Date.now();
Without step 4 the page would show Publish, but pressing it would just redirect back with nothing published.

What should happen after the fix (read-only check at 9:30 pm NY): the rewritten draft is no longer firstOver and the approve route accepts it. The old camp_5613879d39a1 still carries Before doors 17:30, so it stays firstOver and keeps "Write it for after the show".

### #1 [minor] today
Where: src/app/today/page.tsx:241 (Coming next row time label, same component at 1440 and 390). Same wording at src/app/radar/RadarView.tsx:384 (Explore list).

Problem: Coming next shows two Harry Styles rows with the same figures: "Tomorrow 8 pm · Harry Styles · about 100 guests ... · Your campaign is ready" and "Now, until 12:15 am · Harry Styles · about 100 guests ... · See who is coming". A first-time owner reads it as a duplicate. "Now" is untrue for a show: at 9:14 pm the crowd is inside the Garden and comes out at 10:45 pm.

Fix:

src/app/today/page.tsx:241
old: `{w.arrive <= now ? <>Now, until {clock(w.leave, tz)}</> : <>`
new: `{w.arrive <= now ? ((it.event.origin ?? "ticketmaster") === "ticketmaster" && w.start <= now && now < w.end ? <>Out at {clock(w.end, tz)}</> : <>Now, until {clock(w.leave, tz)}</>) : <>`

Keep one wording for one state: apply the same change on Explore.
src/app/radar/RadarView.tsx:384
old: `{it.w.arrive <= now ? `Now, until ${clock(it.w.leave, tz)}` : `
new: `{it.w.arrive <= now ? (it.kind === "venue" && it.w.start <= now && now < it.w.end ? `Out at ${clock(it.w.end, tz)}` : `Now, until ${clock(it.w.leave, tz)}`) : `

Why w.end and not the issue's version: for a Ticketmaster show, presenceWindow gives end = start + 165 min (150 for sports). Ticketmaster rows have no windowEnd, so this equals campaignWindows' "After the show" start (10:45 pm). No getEvent(...)! is needed, so nothing can crash on an event that was never stored. Once the crowd is out (after 10:45 pm) the row goes back to "Now, until 12:15 am", which is true then. The issue's version would keep "Tonight after the show, 10:45 pm to 12:15 am" all night and depends on getEvent.

Expected at 9:14 pm: "Tomorrow 8 pm · Harry Styles · ... · Your campaign is ready" / "Now, until 11:15 pm · Andrew Yang ..." / "Out at 10:45 pm · Harry Styles · about 100 guests, enough to fill your seats · See who is coming". The Today patch was applied to a scratch copy (/Users/jacobofernandez/Code/Qloo/.tmp/onepath/r8-verify/1/page.patched.tsx) and parses with esbuild (tsx). All names it uses (it, w, now, clock, tz) are in scope at :241.

## 2. What goes out, as objects (the wow moment the founder lens asks for)

### #4 [major] campaign and Today 'What goes out'
**Design part is in globals.css now (commit 36fd53b): .preview, .preview-board, .preview-bubble, .preview-by, .preview-screen, white objects on the screen's one tone surface. Apply the markup part on the campaign page and on Today exactly as written below.**

Where: src/app/globals.css:501 (insert after the .tone block, inside @layer components); src/app/campaigns/[id]/page.tsx:158 (grid), :168, :172, :175-176, :192-193; src/app/today/page.tsx:141 (grid), :144, :149, :155-156, :170-171

Problem: The four channels are plain paragraphs under 14 px labels. There is no object a merchant recognises, so the core page reads like a spec sheet, not a premium product.

Fix:

The proposed fix breaks the brand rules, so use this corrected version. Problems with the issue's own fix: --line is `transparent` (globals.css:77, "hairlines are retired"), so the .adcard border would never show. A plum or near-black .slate and a dark .screen would put a second and third dark block on a screen that may have only one plate (GUIDELINES.md:28). An 18 px radius breaks "corners 0" (GUIDELINES.md:7; every --radius-* is 0px at globals.css:20-29). Neither page uses .tone today, so the screen's one tone surface is free for this section, and "a draft to read" is what .tone is for (globals.css:482).

DESIGN, globals.css, insert after line 501:
  /* What goes out: each channel shown as the thing it becomes, on the screen's one tone surface.
     White objects on the tone, corners 0, no lines, no shadow, no new type size. */
  .preview { background: var(--paper); padding: 24px 28px; }
  .preview-board { text-align: center; padding: 36px 28px 40px; max-width: 26rem; }
  .preview-bubble { position: relative; max-width: 36ch; padding: 14px 18px 16px; margin-left: 10px; }
  .preview-bubble::before { content: ""; position: absolute; left: -10px; bottom: 0; width: 10px; height: 14px; background: var(--paper); clip-path: polygon(100% 0, 100% 100%, 0 100%); }
  .preview-bubble .t-body { max-width: none; }
  .preview-by { font-size: var(--fs-label); line-height: 1.4; font-weight: 500; color: var(--muted); }
  .preview-screen { aspect-ratio: 16 / 9; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; max-width: 32rem; }

BUILD, campaigns/[id]/page.tsx:
:158 `className="mt-8 grid gap-x-16 gap-y-12 md:grid-cols-2"` -> `className="tone mt-8 grid gap-x-16 gap-y-12 md:grid-cols-2"` (on phones, the existing rule at globals.css:859 runs it edge to edge)
:168 `<p className="t-name whitespace-pre-wrap">{nb(draft.storefront.chalkboard)}</p>` -> `<div className="preview preview-board"><p className="t-name whitespace-pre-wrap">{nb(draft.storefront.chalkboard)}</p></div>`
:172 `<p className="t-body whitespace-pre-wrap">{nb(draft.whatsapp.message)}</p>` -> `<div className="preview preview-bubble"><p className="t-body whitespace-pre-wrap">{nb(draft.whatsapp.message)}</p></div>`
:175-176 the headline and body -> `<div className="preview"><p className="preview-by">{merchant.name} · Sponsored</p><p className="t-name mt-2">{nb(draft.geofenced_ad.headline)}</p><p className="t-body mt-2">{nb(draft.geofenced_ad.body)}</p></div>` (the radius/budget and "Aimed at people into" lines stay outside, muted)
:192-193 -> `<div className="preview preview-screen"><p className="t-name">{nb(draft.dooh.headline)}</p><p className="t-body mt-2">{nb(draft.dooh.body)}</p></div>`
The Google post at :185-186 gets the same treatment as the ad, without the Sponsored line.

BUILD, today/page.tsx: make the same changes at :141 (add `tone`), :144 (board; drop mt-4 from the p and put mt-4 on the div), :149 (bubble), :155-156 (ad card with `{merchant.name} · Sponsored`), :170-171 (screen). Keep every eyebrow above its object. No new type sizes: only .t-name, .t-body and --fs-label.

Optional: a dark chalk slate would need design to amend GUIDELINES.md:28 first ("at most one aubergine plate per screen").

## 3. Today

### #10 [minor] today
**Alert rows on Today show two times with no word between them and lead nowhere. #15 is the same: apply both parts here.**

Where: src/app/today/page.tsx:273-276 (the li grid at :273, the stamp at :274, the "Failed to send" span at :276), section "What Turnout found on its own"

Problem: Each row in "What Turnout found on its own" shows two times with nothing to tell them apart: "Fri 8:52 pm   Sunday 7 pm: New York Knicks vs. Orlando Magic ...". A bar owner cannot tell when it was found from when the crowd comes. Round 7 already flagged this.

Fix:

Keep the "Found" word from the proposed fix. Keep the weekday only when the alert is from an earlier day, and stack the stamp above the crowd on phones.

1) :274
old: return `${fmtShort.format(at)} ${clock(at, tz)}`;
new: return `Found ${dayOf(at.getTime()) === "Today" ? "" : `${fmtShort.format(at)} `}${clock(at, tz)}`;

2) :273
old: className="grid grid-cols-[6.5rem_1fr] items-baseline gap-x-6 sm:grid-cols-[6.5rem_1fr_auto]"
new: className="grid grid-cols-1 items-baseline gap-x-6 gap-y-1 sm:grid-cols-[9.5rem_1fr_auto]"

3) :276 (otherwise col-start-2 adds a second column to the one-column phone grid)
old: className="col-start-2 text-sm text-[var(--danger)] sm:col-start-auto"
new: className="text-sm text-[var(--danger)]"

Result at 9:14 pm NY: "Found 8:52 pm / Sunday 7 pm: New York Knicks vs. Orlando Magic at Madison Square Garden". A row from an earlier day reads "Found Thu 8:52 pm".

### #15 [minor] today
**Duplicate of #10, skip.**

Where: src/app/today/page.tsx:272-278 (the alerts.map in "What Turnout found on its own")

Problem: Each alert row on Today shows two clocks (when it was found, then when the crowd comes) and cannot be clicked, so the home has a list that leads nowhere.

Fix:

Replace lines 272-278. Old:
```tsx
              {alerts.map((a) => (
                <li key={a.id} className="grid grid-cols-[6.5rem_1fr] items-baseline gap-x-6 sm:grid-cols-[6.5rem_1fr_auto]">
                  <span className="t-clock text-[var(--muted)]">{(() => { const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"); return `${fmtShort.format(at)} ${clock(at, tz)}`; })()}</span>
                  <span>{clockText(unshout(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"), tz)}</span>
                  {a.status === "failed" && <span className="col-start-2 text-sm text-[var(--danger)] sm:col-start-auto">Failed to send</span>}
                </li>
              ))}
```
New (same target rule as src/app/alerts/page.tsx, one link at the end of the line like Coming next):
```tsx
              {alerts.map((a) => {
                const [when = "", ...what] = clockText(unshout(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? ""), tz).split(": ");
                const camp = a.campaign_id ? getCampaign(a.campaign_id) : undefined;
                const unwritten = !camp || (camp.status === "awaiting_operator" && now - Date.parse(camp.created_at.replace(" ", "T") + "Z") > 15 * 60_000);
                return (
                  <li key={a.id} className="t-body">
                    <span className="mono">{when}</span> · {what.join(": ")} ·{" "}
                    <Link href={unwritten ? `/campaigns/new?merchant=${merchant.id}&event=${a.event_id}` : `/campaigns/${a.campaign_id}`} className="link">{unwritten ? "See who is coming" : "See the campaign"}</Link>
                    {a.status === "failed" && <span className="text-[var(--danger)]"> · Failed to send</span>}
                  </li>
                );
              })}
```
Also change `<ul className="mt-6 space-y-4 text-base">` (line 271) to `<ul className="mt-6 space-y-5">` to match Coming next. getCampaign is already imported. Result: "Sunday 7 pm · New York Knicks vs. Orlando Magic at Madison Square Garden · See who is coming". Optional hardening, as the alerts page already does: if `when` starts with "Today " and the alert's created_at falls on another day in tz, swap in that weekday, so an old alert never says "Today".

### #13 [minor] today
Where: src/app/today/page.tsx:183 (the plate's eyebrow when no campaign has been written yet). The lead is built at :97 (`around` ends with `${next.distanceKm.toFixed(1)} km from your door`) and shown at :185.

Problem: The plate eyebrow says "Tonight at your door" for a crowd 1.2 km away (a 16 minute walk), and the lead says "1.2 km from your door" in the next line.

Fix:

src/app/today/page.tsx:183 old: `<span className="live-dot" aria-hidden="true" />{whenWord(w0.start)} at your door</p>` new: `<span className="live-dot" aria-hidden="true" />{whenWord(w0.start)} near you</p>`. Another fix that also works: drop " at your door" and keep just `{whenWord(w0.start)}`, the same eyebrow the drafted plate already uses at :127. Leave :177 alone: there "at your door" is about the weather, which is true.

### #26 [minor] campaign (fresh waiting) + today (fresh plate)
Where: src/app/campaigns/[id]/page.tsx:133 (fresh awaiting_operator display) and :99 (eyebrow); src/app/today/page.tsx:9 (import) and :194 (fresh plate t-name). All widths: 1440 and 390 render the same.

Problem: Pressing Today's primary "Write my campaign" (or "Write it for after the show") redirects to a page whose Level 1 is a status, "Writing your campaign". R7 #11 fixed the same breach ("Not written yet") for the stale state only. Today's fresh plate says "Turnout is writing your campaign." in operator mode, while the campaign page lead was made provider-aware (R7 #5.3).

Fix:

1) src/app/campaigns/[id]/page.tsx:133
old: <h1 className="t-display mt-5">Writing your campaign</h1>
new: <h1 className="t-display mt-5">{actName}</h1>

2) src/app/campaigns/[id]/page.tsx:99 (so the eyebrow does not repeat the act now in the display, same as the stale branch)
old: <p className="eyebrow">Your campaign for {dayword}{!draft && stale ? "" :
new: <p className="eyebrow">Your campaign for {dayword}{!draft && campaign.status === "awaiting_operator" ? "" :
(the rest of the line stays as it is. stale already implies awaiting_operator, so the stale render does not change. provider is already imported at :3. Keep the :134 lead, skeleton and RefreshEvery.)

3) src/app/today/page.tsx:9
old: import { getCampaign, getDraft, pollOperatorDraft, type CampaignRow } from "@/server/agent/run";
new: import { getCampaign, getDraft, pollOperatorDraft, provider, type CampaignRow } from "@/server/agent/run";

4) src/app/today/page.tsx:194
old: <p className="t-name">Turnout is writing your campaign.</p>
new: <p className="t-name">{provider() === "operator" ? "Turnout has started your campaign." : "Turnout is writing your campaign."}</p>

Expected for camp_13af266b2134 in its first 15 minutes: eyebrow "Your campaign for Sunday", display "Giants at Texans on Fox", lead "Turnout has started this campaign. It appears here as soon as it is written; this page refreshes on its own." After 15 minutes the display stays the same and only the lead and button change.

### #17 [minor] today, explore
**The one link per row breaks across lines, and #25 the guest count breaks from its unit: apply both (nb and whitespace-nowrap).**

Where: src/app/today/page.tsx:242 (both links in the Coming next row) and src/app/radar/RadarView.tsx:391

Problem: The one link per row breaks across two lines ('See' / 'who is coming').

Fix:

src/app/today/page.tsx:242, two edits on the same line:
old: <Link href={`/campaigns/${ready.get(it.event.id)}`} className="link">Your campaign is ready</Link>
new: <Link href={`/campaigns/${ready.get(it.event.id)}`} className="link whitespace-nowrap">Your campaign is ready</Link>
old: <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.event.id}`} className="link">See who is coming</Link>
new: <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.event.id}`} className="link whitespace-nowrap">See who is coming</Link>

src/app/radar/RadarView.tsx:391:
old: <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.id}`} className="link">See who is coming</Link>
new: <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.id}`} className="link whitespace-nowrap">See who is coming</Link>

Change only these links. Do not add white-space: nowrap to the global .link rule, because longer inline links (footer, prose) need to wrap. Tailwind v4 (@import "tailwindcss" in globals.css) already ships whitespace-nowrap, and layout.tsx uses it.

### #25 [minor] explore + today (Coming next)
Where: src/app/radar/RadarView.tsx:388 (and :389); src/app/today/page.tsx:241, :104, :98; src/lib/nbsp.ts:4 (optional)

Problem: The rule says numbers keep their unit on the same line, but the guest count breaks away from "guests" in every Explore row and in Today's Coming next. nb() does not cover guests, people or seats, and these lines do not call it.

Fix:

1) src/app/radar/RadarView.tsx:388
old: people, could bring about {it.guests} guests
new: people, could bring about {it.guests}&nbsp;guests
2) src/app/today/page.tsx:241
old: · about {it.potentialGuests} guests{it.fill >= 1
new: · about {it.potentialGuests}&nbsp;guests{it.fill >= 1
3) src/app/today/page.tsx:104 (same break on the plate, not in the issue)
old: about {next.potentialGuests} extra guests</b>
new: about {next.potentialGuests}&nbsp;extra&nbsp;guests</b>
4) src/app/today/page.tsx:98 (the plate's "your 70 / seats" breaks too)
old: `enough to fill your ${seats} seats`
new: `enough to fill your ${seats} seats`
5) src/app/radar/RadarView.tsx:389, so it can never break
old: `, enough to fill your ${merchant.seats} seats`
new: `, enough to fill your ${merchant.seats} seats`
6) Optional. src/lib/nbsp.ts:4
old: (pm|am|km|m|min|h)\b
new: (pm|am|km|m|min|h|guests|people|seats|shows)\b
This only helps strings that already go through nb(), such as today/page.tsx:177 "your 70 seats". It does nothing for steps 1 to 4, which do not call nb(). Keep the replacement character as U+00A0, as it is now.

## 4. Alerts

### #7 [minor] alerts (+ today empty state)
**R7 #26 part 1 did not land: the lead still promises Turnout "starts writing the strongest one" above five "Not written yet" rows.**

Where: src/app/alerts/page.tsx:37 (lead, seen on every load) and :46 (empty state). Same promise in src/app/today/page.tsx:268 (Today empty state, shown only when there are no alerts, so not in today renders). Seen in r8/alerts-1440.png (9:16:46 pm NY Fri Oct 23) and alerts-390.png (same code). Checked live with curl at 9:31 pm NY: lead unchanged, 5 "Not written yet." rows, /api/health agent "operator".

Problem: R7 #22 said 'apply both parts here', but #26 part 1 did not land. The lead still promises that Turnout "starts writing the strongest one". Five of the six rows under it say "Not written yet.", and in operator mode nothing gets written.

Fix:

1) src/app/alerts/page.tsx:37
old: <p className="t-lead mt-5">Every hour Turnout looks for the crowds worth a campaign and starts writing the strongest one. Here is what it found.</p>
new: <p className="t-lead mt-5">Every hour Turnout looks for the crowds worth a campaign near you. Here is what it found.</p>
2) src/app/alerts/page.tsx:46
old: <p>When a crowd worth a campaign is coming in the next two days, Turnout finds it and starts writing the campaign here.</p>
new: <p>When a crowd worth a campaign is coming in the next two days, Turnout finds it and lists it here.</p>
3) src/app/today/page.tsx:268
old: <p className="t-body mt-5 text-[var(--muted)]">Nothing yet. Every hour Turnout looks for the crowds worth a campaign and starts writing the strongest one.</p>
new: <p className="t-body mt-5 text-[var(--muted)]">Nothing yet. Every hour Turnout looks for the crowds worth a campaign near you.</p>
Copy only. Leave line 61 (`what`/`tail`) and the `name` line alone: #22 part 2 already landed.

### #9 [minor] alerts
**Wave names keep the count on Alerts. #16 adds the British date order: apply both here.**

Where: src/app/alerts/page.tsx:64 (both widths, and the "Show older alerts" list too, since it runs the same code)

Problem: Wave names keep the count ("Theatre crowd letting out, 22 shows", "Theatre crowd arriving, 35 shows"), while Today, Explore and Who is coming dropped it in round 7. The same crowd has two names.

Fix:

src/app/alerts/page.tsx:64 old: `const name = what.replace(/^([^:]*[^\d:]): .*? at /, "$1 at ");` new: `const name = what.replace(/^([^:]*[^\d:]): .*? at /, "$1 at ").replace(/, \d+ shows$/, "");` (wave rows then read "Theatre crowd letting out", the same as Today and the Who page. Tour titles and new alerts are unchanged.)

### #16 [minor] alerts
**Duplicate of #9, skip.**

Where: src/app/alerts/page.tsx:29 (fmtDay) and src/app/alerts/page.tsx:64 (const name)

Problem: The date is in British order in New York, and the wave names keep the count that Today dropped.

Fix:

:29 old: `const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });` new: `const fmtDay = new Intl.DateTimeFormat(merchant.timezone.startsWith("America/") ? "en-US" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });` (same test as today/page.tsx:91; gives "Fri, Oct 23, 8:52 pm" in New York, "Sat 24 Oct" in Paris stays as is).
:64 old: `const name = what.replace(/^([^:]*[^\d:]): .*? at /, "$1 at ");` new: `const name = what.replace(/^([^:]*[^\d:]): .*? at /, "$1 at ").replace(/, \d+ shows$/, "");`
Change only `name`, never `what`: :62 slices `tail` by what.length, so a shorter `what` would cut the next line mid-word. Tested in node: "Theatre crowd letting out, 22 shows" becomes "Theatre crowd letting out", "Theatre crowd arriving, 35 shows" becomes "Theatre crowd arriving", Harry Styles still becomes "Harry Styles at Madison Square Garden", and the Knicks, "2:22 - A Ghost Story" and new count-free wave names do not change. Scratch: /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r8-verify/21/out.txt

## 5. Pulse

### #8 [major] pulse + today (weekly plan waiting state)
Where: src/server/agent/pulse.ts:43-47 (latestPulse returns newest row, brief or not) and :54 (createPulseBrief inserts awaiting_operator row first); src/app/pulse/page.tsx:7, :26-27, :57-61; src/app/today/page.tsx:12, :89 (and :259 "No weekly plan yet."). All widths.

Problem: Pulse's only action, "Write this week's plan again", inserts a new awaiting_operator row (pulse.ts:54). latestPulse returns the newest row, which has no brief. In operator mode the written plan then disappears from both screens. Pulse falls back to "Every day at Penn & Pour" with "Turnout is writing this week's plan. Reload in a moment." forever, and Today's "Every day this week" says "No weekly plan yet." The waiting note has no 15-minute stale rule, unlike the campaign, Who and Today pages.

Fix:

1) src/server/agent/pulse.ts, insert after line 47:
/** The newest plan that was written: a new one still being written (or never answered in operator mode) must not hide it. */
export function latestWrittenPulse(merchantId: string): PulseRow | undefined {
  latestPulse(merchantId); // picks up an operator answer for the newest row first
  return getDb().prepare("SELECT * FROM pulses WHERE merchant_id = ? AND brief_json IS NOT NULL ORDER BY created_at DESC LIMIT 1").get(merchantId) as PulseRow | undefined;
}

2) src/app/pulse/page.tsx:2 old: import { clockRange } from "@/lib/clock";
new: import { clock, clockRange } from "@/lib/clock";
:7 old: import { getBrief, latestPulse } from "@/server/agent/pulse";
new: import { getBrief, latestPulse, latestWrittenPulse } from "@/server/agent/pulse";
:27 old: const brief = getBrief(row);
new:
const brief = getBrief(latestWrittenPulse(merchant.id));
const startedAt = row ? Date.parse(row.created_at.replace(" ", "T") + "Z") : 0;
const writingStale = row?.status === "awaiting_operator" && Date.now() - startedAt > 15 * 60_000;
:59 old: <p className="t-body">Turnout is writing this week's plan. Reload in a moment.</p>
new: <p className="t-body">{writingStale ? `Turnout started a new plan at ${clock(startedAt, tz)} and has not finished it.${brief ? " The last one stays here." : ""}` : brief ? "Turnout is writing a new plan for this week. The last one stays here until then." : "Turnout is writing this week's plan. Reload in a moment."}</p>
(optional, :64 old: This week's plan could not be written: {row.error}  new: {brief ? "The new plan could not be written" : "This week's plan could not be written"}: {row.error})

3) src/app/today/page.tsx:12 old: import { getBrief, latestPulse } from "@/server/agent/pulse";
new: import { getBrief, latestWrittenPulse } from "@/server/agent/pulse";
:89 old: const brief = getBrief(latestPulse(merchant.id));
new: const brief = getBrief(latestWrittenPulse(merchant.id));

Issue's own step 4 copy says "the last one stays here" even when no plan was ever written (first plan); the conditional above fixes that. Expected after fix: one click on "Write this week's plan again" in operator mode keeps "After work, before the train" plate on Pulse and the chalkboard on Today, with the note "Turnout is writing a new plan for this week. The last one stays here until then." for 15 minutes, then "Turnout started a new plan at 9:31 pm and has not finished it. The last one stays here."

### #19 [major] pulse
Where: src/app/pulse/page.tsx:26-27 (brief read only from the newest row), :57-61 (waiting state with no age check), and src/app/today/page.tsx:89 (same read). Root: src/server/agent/pulse.ts:43-47, where latestPulse returns the newest row whatever its status. The caption at pulse/page.tsx:51 is a separate, cosmetic point.

Problem: A caption and the rewrite link sit stuck 24 px under the plate, like leftovers. The waiting state also has no 15-minute rule, so without the key 'Reload in a moment' would stay forever.

Fix:

A) src/server/agent/pulse.ts, add after latestPulse (:47):
```ts
// The plan on screen: the newest written one, even while a newer one is still being written.
export function shownBrief(merchantId: string): PulseBrief | undefined {
  const row = latestPulse(merchantId);
  if (row?.status === "drafted") return getBrief(row);
  ensurePulseTable();
  return getBrief(getDb().prepare("SELECT * FROM pulses WHERE merchant_id = ? AND status = 'drafted' ORDER BY created_at DESC LIMIT 1").get(merchantId) as PulseRow | undefined);
}
```
B) src/app/pulse/page.tsx
- :2 old `import { clockRange } from "@/lib/clock";` -> new `import { clock, clockRange } from "@/lib/clock";`
- :7 old `import { getBrief, latestPulse } from "@/server/agent/pulse";` -> new `import { latestPulse, shownBrief } from "@/server/agent/pulse";`
- :27 old `const brief = getBrief(row);` -> new:
```ts
  const brief = shownBrief(merchant.id);
  const waitingSince = row?.status === "awaiting_operator" ? Date.parse(`${row.created_at.replace(" ", "T")}Z`) : undefined;
  const stale = waitingSince !== undefined && Date.now() - waitingSince > 15 * 60_000;
```
- :57-61 old:
```tsx
      {row?.status === "awaiting_operator" && (
        <section className="tone stack-block">
          <p className="t-body">Turnout is writing this week's plan. Reload in a moment.</p>
        </section>
      )}
```
new:
```tsx
      {waitingSince !== undefined && (
        <section className="tone stack-block">
          <p className="t-body">{stale ? `Turnout started a new plan at ${clock(waitingSince, tz)} and has not finished it.${brief ? " The plan below stays." : ""}` : `Turnout is writing a new plan.${brief ? " The plan below stays until it is ready." : ""} Reload in a moment.`}</p>
        </section>
      )}
```
C) src/app/today/page.tsx:12 old `import { getBrief, latestPulse } from "@/server/agent/pulse";` -> new `import { shownBrief } from "@/server/agent/pulse";`. Then :89 old `const brief = getBrief(latestPulse(merchant.id));` -> new `const brief = shownBrief(merchant.id);`
D) The caption half of the issue: no change required. "1.5 km" is true, because Qloo's floor is 1500 m at src/server/qloo/neighborhood.ts:70, so do not change it to 1.3. Appending it to the plate lead would break the rule book's plate "the one sentence". If design wants it gone anyway, delete only pulse/page.tsx:51 and keep the form at :52-55.

### #14 [minor] pulse
Where: src/lib/text.ts:42 (plainWords, the replacement string), rendered by src/app/pulse/page.tsx:120 under "What this does not establish" at 1440 and 390. Source text: data/agent-inbox/pulse_aa01f1fc5555.draft.json limitations ("The offer fits are affinities of places with the offer's tags nearby; they compare offers, they do not forecast sales.")

Problem: "What this does not establish" reads "The offer matches only compare your offers with each other". "Offer matches" is a system phrase that a bar owner does not use.

Fix:

src/lib/text.ts:42, replacement string only (keep the regex as it is). old: "The offer matches only compare your offers with each other; they do not forecast sales." new: "Which of your offers fits best only compares them with each other; it is not a sales forecast."

## 6. Explore

### #11 [minor] explore
Where: src/app/radar/RadarView.tsx:388 (the TV row under "Crowds worth a campaign" on Explore, at 1440 and 390)

Problem: For a TV moment, "About 1,300 people, could bring about 38 guests" does not say who or where. Next to "NBA · away game", an owner reads 1,300 people at a game that is not here.

Fix:

src/app/radar/RadarView.tsx:388
old: About <span className="mono">{(Math.round(it.capacity / 100) * 100).toLocaleString("en-US")}</span> people, could bring about {it.guests} guests
new: About <span className="mono">{(Math.round(it.capacity / 100) * 100).toLocaleString("en-US")}</span> {it.kind === "tv" ? it.venue : "people"}, could bring about {it.guests} guests

The issue's fix will not compile. The row's Crowd type has no `event` field; the origin is `it.kind` (page.tsx:59 sets kind = origin for anything not from Ticketmaster). For TV rows, `it.venue` already holds "<Team> fans watching around you" (tv.ts:260), and the row never prints it because line 385 shows the blurb in its place. Use that text, not a new hard-coded phrase.
Expected: "Now, until 9:45 pm · Knicks at Celtics on Prime Video · NBA · away game / About 1,300 Knicks fans watching around you, could bring about 38 guests, enough for half your seats." The Rangers, Giants and Jets rows change the same way. Venue, wave, street and calendar rows stay unchanged.

### #18 [minor] explore
Where: src/app/radar/radar.css:31 (rule .tm-sign.sel; stale comment on line 30)

Problem: The selected crowd's map label wraps, leaving an orphan word.

Fix:

old: `.tm-sign.sel { white-space: normal; text-overflow: clip; max-width: 180px; text-align: center; }`
new: `.tm-sign.sel { white-space: normal; text-overflow: clip; max-width: 220px; text-align: center; text-wrap: balance; }`
Optional on line 30, stale since round 7 dropped the count: old `(a wave reads "Theatre crowd arriving, 34 shows")` new `(a long show name such as "Harry Potter and the Cursed Child (NY)")`.
Do not use the proposed nowrap at 280px. With `text-overflow: clip`, a long name gets cut mid-letter with no ellipsis, and a 280px sign does not fit on the 350px phone map when it is placed left or right of its dot.

## 7. Words on Who is coming and the campaign

### #12 [minor] who (theatre wave, wave_m_penn_pour_exit_202610240130)
**The Who lead names the crowd differently from Today. #23 is the same: apply this one.**

Where: src/app/campaigns/new/page.tsx:176-177 (Who page lead), plus import at line 5 and new consts after line 112

Problem: The lead reads "23 venues around you, tonight from 9:30 pm". Today, one click before, says "leaving 23 shows 1.2 km from your door from 9:30 to 10:45 pm". The same crowd is described in different words, and the Who page loses "leaving", the distance and the end time.

Fix:

1) line 5: `import { clock } from "@/lib/clock";` -> `import { clock, clockRange } from "@/lib/clock";`
2) insert after line 112 (`const walk = ...`):
```
  // A wave is shows on the move: say it the way Today does ("leaving 23 shows 1.2 km from ..."), over its own window.
  const ev = rowToEvent(event as Parameters<typeof rowToEvent>[0]);
  const win = presenceWindow(ev);
  const isWave = event.origin === "wave";
  const kmText = nb(km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`);
```
3) lines 176-177 old:
```
            {event.venue_name}, {starts.getTime() <= now ? <>now until <span className="mono">{clock(presenceWindow(rowToEvent(event as Parameters<typeof rowToEvent>[0])).leave, tz)}</span></> : <>{day} {isShow ? "at" : "from"} <span className="mono">{clock(starts, tz)}</span></>}
            {isShow && <>, {walk ?? <><span className="mono">{nb(km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`)}</span> from</>} {merchant.name}</>}.
```
new:
```
            {isWave ? <>{ev.meta?.kind === "arrival" ? "Heading to" : "Leaving"} {Number(ev.meta?.count ?? 0)} shows <span className="mono">{kmText}</span> from {merchant.name}</> : event.venue_name}, {(isWave ? win.arrive : starts.getTime()) <= now ? <>now until <span className="mono">{clock(win.leave, tz)}</span></> : <>{day} {isShow ? "at" : "from"} <span className="mono">{isWave ? clockRange(win.arrive, win.leave, tz) : clock(starts, tz)}</span></>}
            {isShow && <>, {walk ?? <><span className="mono">{kmText}</span> from</>} {merchant.name}</>}.
```
Result: "Leaving 23 shows 1.2 km from Penn & Pour, tonight from 9:30 to 10:45 pm." before the window, "..., now until 10:45 pm." during it. Note: MomentMeta (crowd.ts:44) has no `count` field, so read kind/count from rowToEvent(...).meta the way Today does, not from momentMeta(event). Using win.arrive for waves also fixes arrival waves: their window opens 60 min before startsAt (moments.ts:71), so the current code says "from 8 pm" where Today says "from 7 to 8:30 pm".

### #23 [minor] who (theatre crowd)
**Duplicate of #12, skip.**

Where: src/app/campaigns/new/page.tsx:176 (lead start and time), :177 (place clause only for shows), :5 (import)

Problem: The Who lead names the same crowd differently from Today and drops the distance and the end time.

Fix:

1) src/app/campaigns/new/page.tsx:5
old: import { clock } from "@/lib/clock";
new: import { clock, clockRange } from "@/lib/clock";

2) src/app/campaigns/new/page.tsx:176
old:
            {event.venue_name}, {starts.getTime() <= now ? <>now until <span className="mono">{clock(presenceWindow(rowToEvent(event as Parameters<typeof rowToEvent>[0])).leave, tz)}</span></> : <>{day} {isShow ? "at" : "from"} <span className="mono">{clock(starts, tz)}</span></>}
new:
            {event.origin === "wave" ? <>{momentMeta(event).kind === "arrival" ? "Heading to" : "Leaving"} {momentMeta(event).members?.length ?? 0} shows {walk ?? <><span className="mono">{nb(km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`)}</span> from</>} {merchant.name}, </> : <>{event.venue_name}, </>}{starts.getTime() <= now ? <>now until <span className="mono">{clock(presenceWindow(rowToEvent(event as Parameters<typeof rowToEvent>[0])).leave, tz)}</span></> : event.origin === "wave" ? <>{day} from <span className="mono">{clockRange(starts, presenceWindow(rowToEvent(event as Parameters<typeof rowToEvent>[0])).leave, tz)}</span></> : <>{day} {isShow ? "at" : "from"} <span className="mono">{clock(starts, tz)}</span></>}

(Leave :177 as it is. The `isShow &&` place clause still covers Ticketmaster shows, and the wave branch above now names the place.)

Expected result. Before the wave starts: "Leaving 23 shows 1.2 km from Penn & Pour, tonight from 9:30 to 10:45 pm. It could bring you about 122 guests." Once it has started: "Leaving 23 shows 1.2 km from Penn & Pour, now until 10:45 pm. ..." Shows, TV and calendar crowds stay as they are. momentMeta is already imported at :7, and walk, km, day, nb and presenceWindow are already in scope. members.length equals meta.count on every stored wave (23/23, 36/36, 29/29 checked in data/crowd.db). Wave window_start equals starts_at, so this matches Today's clockRange(w0.arrive, w0.leave).

Changes from the issue's fix: it hard-coded "tonight", and I use `day` instead. I also keep merchant.name, as the rule book asks ("for which place"), and Today's "your door" is not used.

### #21 [minor] campaign
Where: src/lib/text.ts:45 (plainWords). Insert right after the Demographics line and before the `tags` -> `tastes` lines. Feeds the Why lead and the hidden part at src/app/campaigns/[id]/page.tsx:48, and the Today lead at src/app/today/page.tsx:177. Shows at 1440 and 390 on camp_869f94483d5f and camp_5613879d39a1.

Problem: The Why paragraph keeps a label and jargon from the draft.

Fix:

old (src/lib/text.ts:45):
    .replace(/\bDemographics: an? (female|male)-skew(?:ing|ed)\b/g, "A mostly $1")
new:
    .replace(/\bDemographics: an? (female|male)-skew(?:ing|ed)\b/g, "A mostly $1")
    .replace(/\b(?:Demographics|Places|Brands): (\p{L})/gu, (_m, c) => c.toUpperCase())
    .replace(/\band the ([^.,;]+?)'s own tags map to the same places(?:, a strong fit)?/gi, "and your $1 suits the same places")
Do not use the proposed fix as written, for three reasons. First, `.replace(/\bPlaces: /g, "")` leaves a sentence that starts with a lowercase letter ("audience. the nearby bars"). Second, its second regex needs ", a strong fit", so it misses the two drafts that end at "map to the same places." (camp_7d4b6d90b536, camp_8659baf6e594). Third, it leaves the sibling label "Brands:" in place. Tested in .tmp/onepath/r8-verify/27/test.mjs on all 5 stored drafts. Result: "...the core cocktail-bar audience. The nearby bars this crowd likes are cocktail-led rooftops, Igloo Bar NYC, 230 Fifth, Spyglass, and your happy hour suits the same places. Gucci, Dior and Prada say a crowd that pays for the setting..."

### #24 [minor] campaign, pulse
Where: src/app/campaigns/[id]/page.tsx:228 (h2.t-title); src/app/pulse/page.tsx:119 (h2.t-title); src/app/campaigns/new/page.tsx:330 (same words inline, inside the closed "All the evidence from Qloo" disclosure); docs/UX-ONE-PATH.md:70 (the rule book spells out this heading, so the build followed it); docs/DEMO.md:34 (demo script names the heading). Leave README.md:70 and src/server/agent/schema.ts:43 as they are: neither is a merchant screen.

Problem: 'What this does not establish' is a lawyer's phrase, not words a bar owner uses.

Fix:

1) src/app/campaigns/[id]/page.tsx:228
old: <h2 className="t-title">What this does not establish</h2>
new: <h2 className="t-title">What Turnout cannot know</h2>
2) src/app/pulse/page.tsx:119
old: <h2 className="t-title">What this does not establish</h2>
new: <h2 className="t-title">What Turnout cannot know</h2>
3) src/app/campaigns/new/page.tsx:330
old: What this does not establish: Qloo describes what people who like
new: What Turnout cannot know: Qloo describes what people who like
4) docs/UX-ONE-PATH.md:70 (rule book line, design-owned words, applied in the same commit)
old: 4. "What this does not establish": `.t-body`.
new: 4. "What Turnout cannot know": `.t-body`.
5) docs/DEMO.md:34
old: Then **What this does not establish**.
new: Then **What Turnout cannot know**.
Body copy stays the same. The number of .t-title per screen does not change. The new heading is shorter (24 characters vs 28), so it does not break the 30 px title at 390.

### #28 [minor] who is coming, campaign, pulse (disclosures and non-default states)
**System words and decimals once a disclosure opens. #22 is a subset: apply this one.**

Where: Fix these: src/app/campaigns/new/page.tsx:284 (evidence disclosure heading), :196, :201-202, :212-213 (needs_input and unresolved states). Optional: :266 (age-bar labels). Leave as they are: the provenance tables at src/app/campaigns/new/page.tsx:322-323, src/app/campaigns/[id]/page.tsx:240-241 and src/app/pulse/page.tsx:225-226.

Problem: System words and decimals appear on screen once a disclosure opens or in rarer states. Who shows "in order of affinity" and signed decimals "+0.42", even though the file's own comment says "Never a signed number". The needs_input and unresolved states say "entities", "entity" and "headliner" and show a raw type chip and a popularity %. The provenance tables print raw kind, workflow and status codes and notes such as "brands this crowd over-indexes on" and "best: Pre-show happy hour (0.93)".

Fix:

1) src/app/campaigns/new/page.tsx:284
old: this crowd already likes, in order of affinity</h3>
new: this crowd already likes, the best match first</h3>

2) :196
old: Qloo knows several entities named like “{profile.headlinerName}”.
new: Qloo knows several acts named like “{profile.headlinerName}”.
(This is the wording Today :204 and campaigns/[id] :140 already use: "Qloo knows several acts by that name".)

3) :202
old: {c.description || "no description"} · popularity {((c.popularity ?? 0) * 100).toFixed(0)}%
new: {c.description || "No description"}
Optional on :201: keep the chip, which helps tell the acts apart, but in plain words.
old: {c.type.replace("urn:entity:", "")}
new: {c.type.replace("urn:entity:", "").replace(/_/g, " ")}

4) :212
old: Qloo does not know this headliner
new: Qloo does not know this act
:213
old: No entity matched “{profile.headlinerName}”.
new: Qloo found no act named “{profile.headlinerName}”.

5) Optional (design call), :266: delete the line
<p className="tnum text-[var(--muted)]">{v >= 0 ? "+" : "−"}{Math.abs(v).toFixed(2)}</p>
The bar height and the sentence at :258 already say more or fewer.

Do NOT apply the issue's provenance change (dropping the kind, workflow and status cells and rewording notes in all three tables). Leave those tables as they are.

### #22 [minor] who (evidence disclosure)
**Duplicate of #28, skip.**

Where: src/app/campaigns/new/page.tsx:284, the h3.t-title inside the closed "All the evidence from Qloo" details (lines 230-333). Who is coming page, 1440 and 390, visible once the disclosure is open.

Problem: Opening 'All the evidence from Qloo' shows signed decimals and the system word 'affinity'.

Fix:

Only :284. old: `this crowd already likes, in order of affinity</h3>` new: `this crowd already likes, most liked first</h3>`. Result: "Bars within 1.3 km this crowd already likes, most liked first". Do not use the issue's "the closest match first": it sits right after "within 1.3 km", so "closest" reads as distance, but the list is ranked by taste, not by distance. Leave :266 (the signed figures under the age bars) as it is.

### #27 [minor] who is coming + pulse (evidence disclosures)
Where: src/app/campaigns/new/page.tsx:236, 258, 274, 279, 284, 295, 314 (h3.t-title inside the details opened at :230, summary :231); src/app/pulse/page.tsx:128, 158, 169, 175, 184, 199 (h2.t-title inside the details opened at :124, summary :125). All line numbers checked on HEAD f9e1eba. Same defect at 1440 and 390.

Problem: The limit is four .t-title per screen. Opening "All the evidence from Qloo" adds 7 more .t-title on Who and 6 more on Pulse, all at 36 px, so each screen shows 10.

Fix:

Change the class only and keep the tags as they are. No closing-tag edits are needed, and pulse:134 (h3.t-name moment labels) stays nested under its h2.

src/app/campaigns/new/page.tsx
:236 <h3 className="t-title">What Qloo was asked about</h3> -> <h3 className="t-name">What Qloo was asked about</h3>
:258 <h3 className="t-title">Each age, against everyone</h3> -> <h3 className="t-name">Each age, against everyone</h3>
:274 <h3 className="t-title">Brands this crowd likes</h3> -> <h3 className="t-name">Brands this crowd likes</h3>
:279 <h3 className="t-title">{placesKnown ? ... -> <h3 className="t-name">{placesKnown ? ...
:284 <h3 className="t-title">Bars within <span className="mono">{radius}</span> ... -> <h3 className="t-name">Bars within <span className="mono">{radius}</span> ...
:295 <h3 className="t-title">Your offers against this crowd</h3> -> <h3 className="t-name">Your offers against this crowd</h3>
:314 <h3 className="t-title">How Turnout got here, {profile.provenance.length} steps</h3> -> <h3 className="t-name">How Turnout got here, {profile.provenance.length} steps</h3>

src/app/pulse/page.tsx
:128 <h2 className="t-title">The rhythm of your street</h2> -> <h2 className="t-name">The rhythm of your street</h2>
:158 <h2 className="t-title">Who walks past</h2> -> <h2 className="t-name">Who walks past</h2>
:169 <h2 className="t-title">What they like in a place</h2> -> <h2 className="t-name">What they like in a place</h2>
:175 <h2 className="t-title">Brands they like</h2> -> <h2 className="t-name">Brands they like</h2>
:184 <h2 className="t-title">Where they already go</h2> -> <h2 className="t-name">Where they already go</h2>
:199 <h2 className="t-title">Your offers for them</h2> -> <h2 className="t-name">Your offers for them</h2>

The issue's own fix (also changing the pulse h2 tags to h3) works too. It just needs the matching closing-tag edits, and it makes :128 a sibling of the h3 moment labels it contains.

I tested the swap live by changing the classes in the browser. With the disclosure open, Who drops to 3 .t-title and Pulse to 4. The headings inside the disclosure render at 20.88 px at 1440 and 19 px at 390. No CSS rule in globals.css depends on .t-title in these spots.

One leftover, a design call and not part of this fix: on Pulse, "The rhythm of your street" ends up the same size as its moment labels ("After work", "Weekend brunch"). The muted intro sentence between them keeps it readable.

## Not verified

9 minor issues reported by one judge only are in `.tmp/onepath/r8-result.json` under `unverified`.
