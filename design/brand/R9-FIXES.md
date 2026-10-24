# One path, round 9: fixes for the build session

After 9b2e1ac and the objects (f8da045) every screen was re-rendered at 1440 and 390 on Friday 23 October, 10:48 to 10:52 pm New York. Scores: clarity 8 (round 8: 7.5), founder lens 7.5 (7). Every screen passes the three-second test. The ready Saturday campaign page scores 9: the four objects show exactly what goes out, and the founder lens says this is the moment he wanted, on that page.

What keeps it from "ça déchire": tonight Today headlines a crowd with no campaign, so the objects are two clicks deep; Pulse still shows the same four channels as plain text; one sentence is false after 10:45 pm ("comes out at 10:45 pm"); Alerts still show old-format text because the hourly scan runs the code loaded at boot. The three-second judge: fix the tense and the screen line, normalise the alert text, and it reads at 8.5.

Design done this round (7f08e53): the screen near the venue stands on a street pole instead of a desk stand (#20). Each issue was confirmed by a separate skeptic; duplicates are marked.

## 1. The last false sentence and the objects everywhere

### #0 [major] campaign (firstOver, camp_5613879d39a1)
**After 10:45 pm the firstOver lead still says the crowd "comes out at 10:45 pm". #12 is the same: apply this one.**

Where: src/app/campaigns/[id]/page.tsx:111 (the firstOver branch of the plate's t-lead; `now` is already defined at line 59, wins at line 66)

Problem: After 10:45 pm the firstOver lead still uses the future tense for a crowd that is already out. It is the one false time statement on the evening path, and a merchant may wait for a crowd that is already on the street.

Fix:

src/app/campaigns/[id]/page.tsx:111
old: <p className="t-lead mt-5">{firstOver ? <>The crowd went in at <span className="mono">{clock(wins[0].end, tz)}</span> and comes out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span>. These words were for {lowerFirst(wins[0].label)}, so nothing goes out until Turnout writes new ones.</> : offerLine}</p>
new: <p className="t-lead mt-5">{firstOver ? <>{wins[wins.length - 1].start <= now ? <>The crowd came out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span> and is near you until <span className="mono">{clock(wins[wins.length - 1].end, tz)}</span>.</> : <>The crowd went in at <span className="mono">{clock(wins[0].end, tz)}</span> and comes out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span>.</>} These words were for {lowerFirst(wins[0].label)}, so nothing goes out until Turnout writes new ones.</> : offerLine}</p>
This is safe because firstOver already implies !nightOver, so the last window's end is still ahead whenever the new branch shows. The h1 ("After the show") and the button ("Write it for after the show") stay as they are.

### #12 [minor] campaign (Harry Styles tonight, firstOver)
**Duplicate of #0, skip.**

Where: src/app/campaigns/[id]/page.tsx:111 (firstOver branch of the t-lead; now at :59, wins = campaignWindows(event) at :66, After the show = start+165 min to start+255 min in src/server/agent/prompt.ts:50-53)

Problem: At 10:50 pm the lead says the crowd 'comes out at 10:45 pm', which is future tense for a time already past. The real news, that the crowd is coming out right now until 12:15 am, is missing from the plate that asks him to write for after the show.

Fix:

src/app/campaigns/[id]/page.tsx:111 replace
and comes out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span>
with
{now >= wins[wins.length - 1].start ? <>and is coming out now, until <span className="mono">{clock(wins[wins.length - 1].end, tz)}</span></> : <>and comes out at <span className="mono">{clock(wins[wins.length - 1].start, tz)}</span></>}
(now is the Date.now() at :59, same scope. firstOver already rules out nightOver, so the last window cannot be over here. Between doors and 10:45 pm the old wording stays. Inside the window it reads: "The crowd went in at 7:30 pm and is coming out now, until 12:15 am. These words were for before doors, so nothing goes out until Turnout writes new ones.")

### #1 [major] campaign (camp_869f94483d5f) and Today (drafted plate)
**The screen is the only object that says nothing about Publish (DOOH is always simulated).**

Where: src/app/campaigns/[id]/page.tsx:192 (screen block, both widths); src/app/today/page.tsx:149 (WhatsApp bubble) and :168 (screen) in the drafted plate's "What goes out"; import goes after today/page.tsx:15. Root: src/server/channels/index.ts:95 always records dooh as simulated.

Problem: The screen on a stand is the only object that says nothing about Publish. WhatsApp says "Publish keeps this message here" and the ad says "once you switch it on", so a merchant concludes that Publish puts this one on the screens near MSG. publishCampaign always records dooh as simulated (src/server/channels/index.ts:95). On Today, the WhatsApp bubble also lacks the line the campaign page has, although the rule book says both pages show the same blocks.

Fix:

1) src/app/campaigns/[id]/page.tsx:192
old: <div className="preview preview-screen"><p className="t-name">{nb(draft.dooh.headline)}</p><p className="t-body mt-2">{nb(draft.dooh.body)}</p></div>
new: <div className="preview preview-screen"><p className="t-name">{nb(draft.dooh.headline)}</p><p className="t-body mt-2">{nb(draft.dooh.body)}</p></div>{campaign.status === "drafted" && !send && !firstOver && !nightOver && <p className="t-body text-[var(--muted)]">No screen network is connected yet, so Publish keeps this here instead of showing it.</p>}
(Same condition as the WhatsApp line at :175. send, firstOver and nightOver are already in scope.)

2) src/app/today/page.tsx:168
old: <div className="preview preview-screen mt-4"><p className="t-name">{nb(draft.dooh.headline)}</p><p className="t-body mt-2">{nb(draft.dooh.body)}</p></div>
new: the same div, then on the next line
<p className="mt-4 text-sm text-[var(--muted)]">No screen network is connected yet, so Publish keeps this here instead of showing it.</p>

3) src/app/today/page.tsx:149
old: <div className="preview preview-bubble mt-4"><p className="t-body whitespace-pre-wrap">{nb(draft.whatsapp.message)}</p></div>
new: the same div, then on the next line
<p className="mt-4 text-sm text-[var(--muted)]">{whatsappConfigured() && process.env.DEMO_WHATSAPP_TO ? "Sent to your regulars the moment you press Publish." : "WhatsApp is not connected yet, so Publish keeps this message here instead of sending it."}</p>

4) src/app/today/page.tsx:15
old: import { RefreshEvery } from "./RefreshEvery";
new: import { RefreshEvery } from "./RefreshEvery";
import { whatsappConfigured } from "@/server/channels/twilio";

No condition is needed on Today. That branch only renders when campaign.status === "drafted" && draftLive (:124), so nothing has been sent and the first window is still open. text-sm matches the ad caption already on Today at :156. Patched copies are in /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r9-verify/1/campaign.page.patched.tsx and today.page.patched.tsx. esbuild parses both; tsc was not run.

### #4 [minor] campaign (ready Saturday) and today What goes out
**The 2x2 grid leaves a hole beside the board: two independent columns (CSS columns) fix it on both pages.**

Where: src/app/campaigns/[id]/page.tsx:160 and src/app/today/page.tsx:141 (the "What goes out" grid wrapper). Not CHANNEL_ORDER at :22-23.

Problem: The 2x2 grid pairs a tall board with a short bubble, and a short ad card plus two notes with a screen. That leaves an empty tone hole beside the board and a screen floating alone. The rows do not line up, which is what makes the section look unfinished rather than premium.

Fix:

Change the layout, not the order. Keep CHANNEL_ORDER and Today's block order as they are. Two independent columns remove the hole inside the section and keep the reading order "door, regulars, strangers, screen" down the columns and on phones.

src/app/campaigns/[id]/page.tsx:160
old:
          <div className="tone mt-8 grid gap-x-16 gap-y-12 md:grid-cols-2">
new:
          <div className="tone mt-8 gap-x-16 md:columns-2 *:break-inside-avoid [&>*:not(:last-child)]:mb-12">

src/app/today/page.tsx:141
old:
          <div className="tone mt-8 grid gap-x-16 gap-y-12 md:grid-cols-2">
new:
          <div className="tone mt-8 gap-x-16 md:columns-2 *:break-inside-avoid [&>*:not(:last-child)]:mb-12">

All four classes compile on the repo's tailwindcss 4.3.3: columns:2 at >=48rem, column-gap 4rem, break-inside:avoid on children, margin-bottom 3rem on every child except the last. On phones the layout stays a block stack with the same 48 px spacing that gap-y-12 gave. Simulated at 11:05 pm New York (DOM style injection, crop /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r9-verify/4/m-cols.png):
- left column: board, then bubble
- right column: ad, then screen
- no hole inside any cell
- the two columns end 47 px apart at the bottom
- the section gets 127 px shorter (1023 to 896 css px)
- the bubble tail and the board feet still render past the edges
Same result at 1024: no hole inside the section.

### #2 [major] pulse
**Pulse names the same four channels but shows plain text: reuse the .preview objects there. #10 is the same: apply this one.**

Where: src/app/pulse/page.tsx:80 (grid), :82, :85-86, :89, :95-96 (the four channels); also :60 and :65 (waiting and failed notes are .tone too). Width 1440 and 390. Reproduced on HEAD f8da045: the r9 render was captured Fri Oct 23 at 10:50 pm New York, and my DOM test ran at 11:05 pm New York.

Problem: Your words for this week shows the chalkboard, Google post, WhatsApp message and ad as plain paragraphs. The campaign page draws them as objects (board, card, bubble, sponsored post), so the founder sees one visual language on one page and another on the next. This is exactly the spec-sheet look he called not premium.

Fix:

Markup only. The CSS (.preview, .preview-board, .preview-bubble, .preview-by) is already in globals.css:512-595. Do NOT add md:row-span-2.

1) :80 `<div className="mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2">` -> `<div className="tone mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2">`
2) :82 `<p className="t-name whitespace-pre-wrap">{nb(brief.chalkboard)}</p>` -> `<div className="preview preview-board"><p className="t-name whitespace-pre-wrap">{nb(brief.chalkboard)}</p></div>`
3) :85-86 `<p className="t-body font-semibold text-[var(--ink)]">{nb(brief.google_post.title)}</p>` + `<p className="t-body">{nb(brief.google_post.body)}</p>` -> `<div className="preview"><p className="t-name">{nb(brief.google_post.title)}</p><p className="t-body mt-2">{nb(brief.google_post.body)}</p></div>`
4) :89 `<p className="t-body">{nb(brief.whatsapp)}</p>` -> `<div className="preview preview-bubble"><p className="t-body">{nb(brief.whatsapp)}</p></div>`
5) :95-96 `<p className="t-body font-semibold text-[var(--ink)]">{nb(brief.always_on_ad.headline)}</p>` + `<p className="t-body">{nb(brief.always_on_ad.body)}</p>` -> `<div className="preview"><p className="preview-by">{merchant.name} · Sponsored</p><p className="t-name mt-2">{nb(brief.always_on_ad.headline)}</p><p className="t-body mt-2">{nb(brief.always_on_ad.body)}</p></div>`. The muted 'Aimed at people into' line at :97 stays outside the card, as it is now.
6) The one-tone rule (GUIDELINES.md:28). :60 and :65 `<section className="tone stack-block">` -> `<section className={brief ? "stack-block" : "tone stack-block"}>`. The words grid only renders when there is a brief, so each screen keeps one .tone.
Keep every eyebrow and tag above its object (Block at :261-269 stays as it is).

Optional, not part of this issue: Today:252 still shows the weekly chalkboard as a plain t-name paragraph. Today's one tone is already taken by What goes out, so leave it unless design asks for it.

### #10 [minor] pulse
**Duplicate of #2, skip.**

Where: src/app/pulse/page.tsx:80 (grid), :82 (chalkboard), :85-86 (Google), :89 (WhatsApp), :95-96 (ad; the issue says :96-97, which is off by one), plus :60 and :65 (status sections that carry .tone). Pulse /pulse?merchant=m_penn_pour, section "Your words for this week", at 1440 and 390.

Problem: Pulse names the same four channels as the campaign page ("On your chalkboard", "To your regulars on WhatsApp", ...) but shows them as plain text. The chalkboard line, an object on one page, is bold body text here, so the founder's moment does not carry over.

Fix:

Markup only. The .preview classes are already global in globals.css:512-625, so no new CSS is needed.

:80
old: <div className="mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2">
new: <div className="tone mt-10 grid gap-x-16 gap-y-14 md:grid-cols-2">

:82
old: <p className="t-name whitespace-pre-wrap">{nb(brief.chalkboard)}</p>
new: <div className="preview preview-board"><p className="t-name whitespace-pre-wrap">{nb(brief.chalkboard)}</p></div>

:85-86 (correction to the issue: retype the title to match the campaign and Today. If you only wrap the two p elements, the body sits flush under a bold t-body title, because the Block's space-y-2 does not reach inside the wrapper)
old:
                <p className="t-body font-semibold text-[var(--ink)]">{nb(brief.google_post.title)}</p>
                <p className="t-body">{nb(brief.google_post.body)}</p>
new:
                <div className="preview"><p className="t-name">{nb(brief.google_post.title)}</p><p className="t-body mt-2">{nb(brief.google_post.body)}</p></div>

:89
old: <p className="t-body">{nb(brief.whatsapp)}</p>
new: <div className="preview preview-bubble"><p className="t-body whitespace-pre-wrap">{nb(brief.whatsapp)}</p></div>

:95-96
old:
                <p className="t-body font-semibold text-[var(--ink)]">{nb(brief.always_on_ad.headline)}</p>
                <p className="t-body">{nb(brief.always_on_ad.body)}</p>
new:
                <div className="preview"><p className="preview-by">{merchant.name} · Sponsored</p><p className="t-name mt-2">{nb(brief.always_on_ad.headline)}</p><p className="t-body mt-2">{nb(brief.always_on_ad.body)}</p></div>
(:97, "Aimed at people into", stays muted and outside the card.)

To keep one tone surface per screen when a status note shows above the plan (both notes can appear while a brief exists):
:60 old: <section className="tone stack-block">  new: <section className={brief ? "stack-block" : "tone stack-block"}>
:65 old: <section className="tone stack-block">  new: <section className={brief ? "stack-block" : "tone stack-block"}>

### #3 [major] today
Where: src/app/today/page.tsx:251-252 ("Every day this week" column). Seen at 1440 and 390 in r9 (10:48 pm NY Fri Oct 23), and again live at 11:05 pm NY: the headline is now "Harry Styles" (right now, until 12:15 am) with "Write my campaign", there are 0 .preview elements, and the page has 3 .t-title (Coming next, Every day this week, What Turnout found on its own). The layout is the same as r8/today-1440.png. Scratch: /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r9-verify/3/ (today-*.json, fix-1440.png, fix-390.png, fixdrop-1440-crop.png, page.patched.tsx)

Problem: Tonight Today has no campaign for its headline crowd, so 'What goes out' is absent. Everything below the plate is text lists: Coming next, Every day this week, alerts. The objects the founder asked for are two clicks away behind the body link 'Your campaign is ready'. His first screen looks the same as in round 8.

Fix:

Apply this corrected version, not the issue's as written. The issue's version would put two chalkboards on Today whenever a ready campaign leads the plate: the campaign's board in "What goes out" (:144) and the weekday board.

src/app/today/page.tsx
:251 delete:
            <p className="t-body mt-5">{nb(noScores(brief.street_in_one_line))}</p>
:252 old:
            <p className="t-name mt-5 whitespace-pre-wrap">{nb(brief.chalkboard)}</p>
new:
            {campaign?.status === "drafted" && draftLive ? <p className="t-name mt-5 whitespace-pre-wrap">{nb(brief.chalkboard)}</p> : <div className="preview preview-board mt-5"><p className="t-name whitespace-pre-wrap">{nb(brief.chalkboard)}</p></div>}
Keep :253 "Your chalkboard line for a normal weekday." and :258 "This week's plan" as they are.

`campaign?.status === "drafted" && draftLive` matches the plate's drafted branch at :124. campaign is only set when next exists, and draftLive implies draft. So the board is drawn exactly when Today has no "What goes out". Dropping :251 also follows the rule book (Today 5: "the weekly offer in two lines + link"). The street sentence repeats Pulse's lead. noScores is still used at :174.

The scratch copy page.patched.tsx parses with esbuild. A live DOM simulation at 1440 and 390 shows a 468x390 px board with 36 px chalk at 1440, a 354x295 px board with 30 px chalk at 390, and no horizontal scroll (scrollW 1440/390). mt-5 wins over the component margin while margin-inline -6px stays.

Design follow-up, one line: GUIDELINES.md:29 says the dark board "is an object in 'What goes out'". Extend it to "and the weekday chalkboard on Today". Optional for consistency: pulse/page.tsx:82 shows the same weekly board as plain .t-name.

## 2. Who is coming

### #9 [minor] who (Harry Styles, firstOver campaign)
**Once the first window is over, the Who page still offers "See my campaign". #14 is the same: apply this one.**

Where: src/app/campaigns/new/page.tsx:10 (imports), :158 (const chosenId, not :157 as the issue says; :157 is guests), :187 (button branch). Both 1440 and 390, since the layout does not change this. Page /campaigns/new?merchant=m_penn_pour&event=G5diZ_dfkEICb

Problem: Once the written campaign's first window is over, the Who page still offers "See my campaign". That page cannot publish and only offers "Write it for after the show", so tonight's Harry Styles path takes 4 clicks instead of 3.

Fix:

Keep the label "Write my campaign". Today uses those words for the same crowd and so does the rule book. Drop the issue's :194 label edit. Add a guard for a night that is over: without it, after 12:15 am the issue's version would offer a rewrite for a night that has passed.

1) :10 old:
import { getCampaign, getDraft } from "@/server/agent/run";
new:
import { getCampaign, getDraft } from "@/server/agent/run";
import { campaignWindows, draftFirstWindow } from "@/server/agent/prompt";

2) :158 old:
  const chosenId = written ? getDraft(getCampaign(written.id)!)?.chosen_offer_id : undefined;
new:
  const writtenRow = written ? getCampaign(written.id) : undefined;
  const writtenDraft = writtenRow ? getDraft(writtenRow) : undefined;
  const chosenId = writtenDraft?.chosen_offer_id;
  // Same test as the campaign page's firstOver and Today's draftLive: words for a closed first window cannot go out, so the button writes new ones (a night already over keeps "See my campaign").
  const writtenOver = writtenRow?.status === "drafted" && !!writtenDraft && draftFirstWindow(event, writtenDraft.windows, tz).end < now && Math.max(...campaignWindows(event).map((w) => w.end)) >= now;

3) :187 old:
          {hasSignal(profile) && (written ? (
new:
          {hasSignal(profile) && (written && !writtenOver ? (

:188-196 stay as they are. The existing form posts merchant and event to /api/campaigns, the same POST as the campaign page's "Write it for after the show".

I applied the patch to a copy at /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r9-verify/9/page.patched.tsx and tsc -p /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r9-verify/9/tsconfig.json reports no errors.

Expected at 11:05 pm NY: the Who plate shows the button "Write my campaign", which matches Today's plate. A fresh awaiting_operator rewrite (under 15 min old) still shows "See my campaign". So do approved and sent campaigns, and nights that are over (the campaign page there says "This night has passed").

### #14 [minor] who (Harry Styles, show letting out)
**Duplicate of #9, skip.**

Where: src/app/campaigns/new/page.tsx:187-194 (the plate button). Root cause is at :155-158: `written` matches the drafted pre-show campaign camp_5613879d39a1, and the page never checks the firstOver state that campaigns/[id]/page.tsx:70 uses.

Problem: The button says 'See my campaign', but the campaign's words were for before doors. One click later the only action is 'Write it for after the show'. That is an extra hop, and the button promises something to see when there is nothing to send.

Fix:

Copy the campaign page's firstOver rule. Do not key it off the title regex at :161: an offer with a neutral name (for example "Happy hour") would pass that filter, so the button would still say "See my campaign" while the campaign page says "After the show".

1) Imports, after line 10:
old: import { getCampaign, getDraft } from "@/server/agent/run";
new: import { getCampaign, getDraft } from "@/server/agent/run";
import { campaignWindows, draftFirstWindow } from "@/server/agent/prompt";

2) Line 158:
old: const chosenId = written ? getDraft(getCampaign(written.id)!)?.chosen_offer_id : undefined;
new: const writtenCampaign = written ? getCampaign(written.id) : undefined;
  const writtenDraft = writtenCampaign ? getDraft(writtenCampaign) : undefined;
  const chosenId = writtenDraft?.chosen_offer_id;
  // Same rule as the campaign page's firstOver: the draft's first window has closed but the night goes on, so its words are over. Go straight to the rewrite instead of a page that only offers it.
  const showWins = campaignWindows(event);
  const writtenOver = writtenCampaign?.status === "drafted" && !!writtenDraft && draftFirstWindow(event, writtenDraft.windows, tz).end < now && Math.max(...showWins.map((w) => w.end)) >= now;

3) Line 187:
old: {hasSignal(profile) && (written ? (
new: {hasSignal(profile) && (written && !writtenOver ? (

4) Line 194:
old: <button className="btn btn-accent btn-lg">Write my campaign</button>
new: <button className="btn btn-accent btn-lg">{writtenOver ? `Write it for ${showWins[showWins.length - 1].label.toLowerCase()}` : "Write my campaign"}</button>

The form already posts to /api/campaigns with hidden merchant and event, the same POST as campaigns/[id]/page.tsx:118. So the button becomes "Write it for after the show" and does the same thing in one click.

### #8 [minor] who (theatre crowd, wave_m_penn_pour_exit_202610240230)
**For a theatre wave the "what they like" fact says the theatre crowd likes theatre. #13 is the same: apply this one.**

Where: src/app/campaigns/new/page.tsx:143-144 (likeTags) and :149-152 (the like Fact). The issue says :142, but the code is one line lower.

Problem: For a theatre wave, the "what they like" fact restates the crowd itself and teaches the merchant nothing. It also spells theatre two ways on one screen (display "Theatre crowd", title "theater").

Fix:

1) :143 old:
  let likeTags = shownTags.map((t) => t.name).filter(isTaste).filter(oneStem).slice(0, 3);
new:
  // A theatre wave's tastes are the theatre itself ("Musicals", "Performing arts theater"): they restate the crowd.
  const ownKind = (n: string) => isWave && /musical|theat(er|re)|performing arts|broadway|show ?tunes/i.test(n);
  let likeTags = shownTags.map((t) => t.name).filter(isTaste).filter((n) => !ownKind(n)).filter(oneStem).slice(0, 3);

2) :144 old: ...map((t) => t.name).filter(isTaste).slice(0, 3);
new: ...map((t) => t.name).filter(isTaste).filter((n) => !ownKind(n)).slice(0, 3);

3) :149-152 old:
  const like: Fact = {
    title: likeTitle.length >= 2 ? cap(andList(likeTitle)) : andList(brands.slice(0, 3)) || "Their tastes, through Qloo",
    sentence: bars.length ? `They already go to ${andList(bars)}.` : brands.length ? `They like ${andList(brands.slice(0, 3))}.` : "Qloo lists no bar nearby and no brand for this crowd yet.",
  };
new:
  // Nothing left but the crowd itself: the bars near you they already go to say more than a brand list.
  const barsLead = likeTitle.length < 2 && isWave && bars.length >= 2;
  const like: Fact = barsLead
    ? { title: `Bars like ${andList(bars.slice(0, 2))}`, sentence: `${bars[2] ? `They also go to ${bars[2]}. ` : ""}Everything else they like is the theatre itself.` }
    : {
        title: likeTitle.length >= 2 ? cap(andList(likeTitle)) : andList(brands.slice(0, 3)) || "Their tastes, through Qloo",
        sentence: bars.length ? `They already go to ${andList(bars)}.` : brands.length ? `They like ${andList(brands.slice(0, 3))}.` : "Qloo lists no bar nearby and no brand for this crowd yet.",
      };

Result for wave_m_penn_pour_exit_202610240230: title "Bars like The Liberty NYC and Crompton Ale House", sentence "They also go to The Altman Building. Everything else they like is the theatre itself." Shows and street crowds are unchanged because isWave is false for them. The candidate is at /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r9-verify/8/page.tsx and passes tsc with no errors.

### #13 [minor] who (theatre crowd letting out)
**Duplicate of #8, skip.**

Where: src/app/campaigns/new/page.tsx:139 (isTaste) and :149-152 (the "like" fact). Page: /campaigns/new?merchant=m_penn_pour&event=wave_m_penn_pour_exit_202610240230, at 1440 and 390.

Problem: The 'what they like' fact for the theatre crowd is 'Musicals and performing arts theater'. Saying the theatre crowd likes theatre tells a bar owner nothing, and a child would laugh at it.

Fix:

Two edits are needed. The issue's one-line fix is not enough: on its own it turns the title into "Buzzfeed, Fitbit and Ebay" (see why).

1) src/app/campaigns/new/page.tsx:139
old: const isTaste = (n: string) => !GENERIC_TAG.test(n) && !CUISINE_TAG.test(n);
new: const isTaste = (n: string) => !GENERIC_TAG.test(n) && !CUISINE_TAG.test(n) && !(isWave && /theat|musical|perform|broadway|comed|stand-?up|\bshows?\b/i.test(n));
(isWave is defined at :118. Comedy is added because a comedy wave would repeat itself the same way.)

2) src/app/campaigns/new/page.tsx:149-152
old:
  const like: Fact = {
    title: likeTitle.length >= 2 ? cap(andList(likeTitle)) : andList(brands.slice(0, 3)) || "Their tastes, through Qloo",
    sentence: bars.length ? `They already go to ${andList(bars)}.` : brands.length ? `They like ${andList(brands.slice(0, 3))}.` : "Qloo lists no bar nearby and no brand for this crowd yet.",
  };
new:
  // A theatre crowd's only tastes are the theatre itself. The bars they already go to are then the fact a merchant can use.
  const like: Fact = likeTitle.length < 2 && bars.length
    ? { title: `They already go to ${andList(bars)}`, sentence: `The bars within ${radius} this crowd likes most. Everything else they like is the show itself.` }
    : {
        title: likeTitle.length >= 2 ? cap(andList(likeTitle)) : andList(brands.slice(0, 3)) || "Their tastes, through Qloo",
        sentence: bars.length ? `They already go to ${andList(bars)}.` : brands.length ? `They like ${andList(brands.slice(0, 3))}.` : "Qloo lists no bar nearby and no brand for this crowd yet.",
      };
(radius is defined at :120. Result for this crowd, simulated: title "They already go to The Liberty NYC, Crompton Ale House and The Altman Building", sentence "The bars within 1.3 km this crowd likes most. Everything else they like is the show itself." The sentence leaves out "Qloo" because the rule book allows the word once per screen, and "All the evidence from Qloo" already uses it. Shows, and crowds with real tastes, do not change. A crowd with no bars still falls back to its brands, as before.)

### #26 [minor] who (all crowds)
Where: src/app/campaigns/new/page.tsx:238 (Who is coming, every crowd and the today wave variant, at 1440 and 390)

Problem: The only action under the facts, the disclosure "All the evidence from Qloo", is not a .link. It renders in ink, and the audit does not count it as a link. The same disclosure on Pulse, and every summary on the campaign page, use "link w-fit text-base". The rule says every other action is a .link.

Fix:

src/app/campaigns/new/page.tsx:238
old:         <summary className="text-base font-semibold text-[var(--ink)]">All the evidence from Qloo</summary>
new:         <summary className="link w-fit text-base">All the evidence from Qloo</summary>

### #31 [minor] who (needs_input state)
Where: src/app/campaigns/new/page.tsx:202 (Who page, needs_input section, all widths)

Problem: The section head in the needs_input state hard-codes "tonight" for every crowd, including tomorrow's and Sunday's. The page already computes the right word in `day`.

Fix:

src/app/campaigns/new/page.tsx:202
old:           <h2 className="t-title">Which one plays tonight?</h2>
new:           <h2 className="t-title">Which one plays {day}?</h2>
(`day` is already computed at line 110 and gives "tonight", "today", "tomorrow" or "on Sunday 25 Oct". The issue's template-literal version `{`Which one plays ${day}?`}` renders the same text.)

## 3. Alerts

### #5 [minor] alerts
**Stored alert text is in the old format because the hourly scan keeps the code loaded at boot (instrumentation.ts guard). #23 is the same symptom: apply both.**

Where: src/app/alerts/page.tsx:57 (the clean chain only rewrites "100% of your N seats") and src/app/alerts/page.tsx:29 (fmtDay en-GB). Root cause: src/instrumentation.ts:10 (globalThis.__turnoutScan guard) keeps the scan code loaded at server boot, which is older than 66d797a. Seen at 1440 and 390.

Problem: Stored alert text arrives in the pre-round-6 format, because the hourly scan keeps the code loaded at server boot (src/instrumentation.ts guards with globalThis.__turnoutScan, so hot reload never replaces it). The page only rewrites "100%", so exact counts and percentages leak. R8 #16, the American date order, also did not land.

Fix:

1) src/app/alerts/page.tsx:57
old: .replace(/, 100% of your (\d+) seats\./, ", enough to fill your $1 seats.");
new: .replace(/, (\d+)% of your (\d+) seats\./, (_m: string, p: string, s: string) => (Number(p) >= 100 ? `, enough to fill your ${s} seats.` : Number(p) >= 50 ? ", enough for half your seats." : ", enough for a few tables.")).replace(/about ([\d,]{3,}) people/, (_m: string, n: string) => `about ${(Math.round(Number(n.replace(/,/g, "")) / 100) * 100).toLocaleString("en-US")} people`);
(Same as the issue's fix with one change: {3,} instead of {4,}, so a 3-digit count like "about 639 people" is rounded too, the way composeAlert rounds every count now. The rewrite only touches the tail, so the what/tail slicing at :61 is unaffected.)
2) src/app/alerts/page.tsx:29
old: const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });
new: const fmtDay = new Intl.DateTimeFormat(merchant.timezone.startsWith("America/") ? "en-US" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });
(Same test as today/page.tsx:91. Tested in node: New York gives "Fri, Oct 23", so the line reads "Fri, Oct 23, 9:52 pm". Paris stays "Sat 24 Oct".)
New alerts use composeAlert's current wording only after the founder restarts the server. Step 1 also covers the rows already stored, and those stay in the DB whether or not the server restarts. Do not start or stop the server from a session.

### #23 [minor] alerts
Where: src/app/alerts/page.tsx:57 (stored text is only normalised for 100%). Root cause of the new rows: src/instrumentation.ts:10-11. The dev hot-reload guard keeps the scanAll closure loaded when the server booted (5:52 PM Paris, before round 5), so the hourly scan at :52 still uses the old composeAlert. That old version writes 24-hour times, "N% of your seats" and raw headcounts. The current composeAlert in src/server/agent/scan.ts:123-124 already writes bands and counts rounded to the hundred.

Problem: Percentages and raw headcounts in prose. Only "100% of your N seats" becomes words, so a TV crowd reads "87% of your 70 seats" (the newest alert reads "84%"). Explore uses bands ("enough for half your seats") and rounded counts, but Alerts prints "about 2,039 people" where Explore says "About 2,000 Giants fans" for the same crowd.

Fix:

src/app/alerts/page.tsx:57
old:
              .replace(/, 100% of your (\d+) seats\./, ", enough to fill your $1 seats.");
new:
              .replace(/, (\d+)% of your (\d+) seats\./, (_m: string, p: string, s: string) => (Number(p) >= 100 ? `, enough to fill your ${s} seats.` : Number(p) >= 50 ? ", enough for half your seats." : ", enough for a few tables."))
              .replace(/about (\d{1,3}(?:,\d{3})+) people/, (_m: string, n: string) => `about ${(Math.round(Number(n.replace(/,/g, "")) / 100) * 100).toLocaleString("en-US")} people`);
(The bands are the same as composeAlert and RadarView: fill >= 1 / >= 0.5. The `, about ` split at :61 still works on the rounded text.)

Second change, also build, so that new rows stop arriving in the old wording. In src/instrumentation.ts, move `const { scanAll } = await import("./server/agent/scan");` from line 11 into the start of `run`, so each hourly run loads the current module. Or restart the dev server once (the founder's job: the workflow must not start or stop servers). Rows are written once and never rewritten (scan.ts:91), so the page-side normalisation is still needed for the rows already stored.

### #17 [minor] alerts
**British date and percentages. #22 is the same: apply this one.**

Where: src/app/alerts/page.tsx:29 (fmtDay locale) and src/app/alerts/page.tsx:57 (stored message clean-up). Root cause is upstream: src/instrumentation.ts:9-11. The hourly scan was loaded when the dev server booted (5:52 pm CEST Oct 23), and the __turnoutScan guard keeps it across hot reloads, so it still runs the composeAlert from before 66d797a. The old rows also stay in data/crowd.db as written.

Problem: Alerts in New York write 'Fri 23 Oct' (a British date), say '87% of your 70 seats' where every other screen says 'enough to fill your seats' or 'enough for a few tables', and show 'about 2,039 people' (false precision beside 'about 20,000'). Five identical 'Not written yet.' lines make the page read like a log.

Fix:

1) src/app/alerts/page.tsx:29
old: const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });
new: const fmtDay = new Intl.DateTimeFormat(merchant.timezone.startsWith("America/") ? "en-US" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });
(Same rule as today/page.tsx:91. Tested: "Fri 23 Oct" becomes "Fri, Oct 23".)

2) src/app/alerts/page.tsx:57
old: .replace(/, 100% of your (\d+) seats\./, ", enough to fill your $1 seats.");
new: .replace(/, 100% of your (\d+) seats\./, ", enough to fill your $1 seats.")
              .replace(/, (\d+)% of your \d+ seats\./, (_, p) => (Number(p) >= 50 ? ", enough for half your seats." : ", enough for a few tables."))
              .replace(/about ([\d,]+) people/, (_, n) => `about ${(Math.round(Number(n.replace(/,/g, "")) / 100) * 100).toLocaleString("en-US")} people`);
Correction to the proposed fix: the words are "enough for half your seats", with no seat count. That is what RadarView.tsx:389 and scan.ts:124 say. Round every count to the nearest 100 as scan.ts:123 does, not only counts under 10,000. Tested on the stored rows: "about 2,000 people around you ... enough for half your seats.", "about 11,700 ... enough for half your seats.", and 100% still gives "enough to fill your 70 seats".

3) Optional, same file :82. Five "Not written yet." lines are true (the API key is empty), but stacked they read like a log. Show the line only on the first unwritten row (track it with a let flag outside the map), or say it once above the list: "Turnout has not written these campaigns yet."

Note for the founder (no server action from this session): a dev server restart lets the hourly scan pick up the current composeAlert. The page fix is still needed because the old rows stay in the database as written.

### #22 [minor] alerts
**Duplicate of #17, skip.**

Where: src/app/alerts/page.tsx:29 (fmtDay, used at :68 for every alert stamp, both widths, and in the "all" list)

Problem: Fix #16 did not land. R8 #9 said "#16 adds the British date order: apply both here", but only the change to the wave names landed. The stamps are still in British order in New York, while Today's date line reads "Friday, October 23".

Fix:

src/app/alerts/page.tsx:29
old: const fmtDay = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });
new: const fmtDay = new Intl.DateTimeFormat(merchant.timezone.startsWith("America/") ? "en-US" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: merchant.timezone });
(Same test as src/app/today/page.tsx:91. In node: New York gives "Fri, Oct 23", so the stamp reads "Fri, Oct 23, 9:52 pm"; Paris stays "Sat 24 Oct". Leave the `weekday` formatter at :26 alone: it only prints a long weekday, the same in both locales.)

## 4. Today

### #11 [minor] today
**Alert rows on Today still lead nowhere (R8 #15 skipped). #25 is the same: apply this one.**

Where: src/app/today/page.tsx:272 (the crowd span inside alerts.map, section "What Turnout found on its own", lines 268-276). Same at every width: 1440 and 390 use the same markup.

Problem: The alert rows on Today still lead nowhere. R8 #10 only landed the "Found" stamp; the link part (R8 #15) was skipped. A merchant who sees "Sunday 1 pm: Giants at Texans on Fox" has to go through "All alerts" to act on it.

Fix:

src/app/today/page.tsx:272
old: <span>{clockText(unshout(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"), tz)}</span>
new: <span>{clockText(unshout(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"), tz)} ·{" "}{ready.has(a.event_id) ? <Link href={`/campaigns/${ready.get(a.event_id)}`} className="link whitespace-nowrap">Your campaign is ready</Link> : <Link href={`/campaigns/new?merchant=${merchant.id}&event=${a.event_id}`} className="link whitespace-nowrap">See who is coming</Link>}</span>
This uses the `ready` map from line 51 and the same two links as the Coming next rows (line 239), so a crowd gets the same link in both lists. Nothing new to import. Result at 11:06 pm NY: "Found 9:52 pm / Sunday 1 pm: Giants at Texans on Fox · See who is coming". The issue's own fix gives the wrong line (273, the real line is 272). It also always says "See who is coming", even when the link opens the campaign page, so the words would not match where the link goes.

### #25 [minor] today
**Duplicate of #11, skip.**

Where: src/app/today/page.tsx:269-275 (the alerts.map in "What Turnout found on its own"; the ul at :268, the "Failed to send" span at :273)

Problem: The rows in "What Turnout found on its own" carry no link, so the home page has one list that leads nowhere. Coming next has one link per row. The headline of R8 #10 named this ("lead nowhere"), but only the "Found" word and the stacking landed. #15, which held the link, was skipped as a duplicate.

Fix:

src/app/today/page.tsx:269-275
old:
              {alerts.map((a) => (
                <li key={a.id} className="grid grid-cols-1 items-baseline gap-x-6 gap-y-1 sm:grid-cols-[9.5rem_1fr_auto]">
                  <span className="t-clock text-[var(--muted)]">{(() => { const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"); return `Found ${dayOf(at.getTime()) === "Today" ? "" : `${fmtShort.format(at)} `}${clock(at, tz)}`; })()}</span>
                  <span>{clockText(unshout(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"), tz)}</span>
                  {a.status === "failed" && <span className="text-sm text-[var(--danger)]">Failed to send</span>}
                </li>
              ))}
new:
              {alerts.map((a) => {
                const camp = a.campaign_id ? getCampaign(a.campaign_id) : undefined;
                const unwritten = !camp || (camp.status === "awaiting_operator" && now - Date.parse(camp.created_at.replace(" ", "T") + "Z") > 15 * 60_000);
                return (
                  <li key={a.id} className="grid grid-cols-1 items-baseline gap-x-6 gap-y-1 sm:grid-cols-[9.5rem_1fr_auto]">
                    <span className="t-clock text-[var(--muted)]">{(() => { const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z"); return `Found ${dayOf(at.getTime()) === "Today" ? "" : `${fmtShort.format(at)} `}${clock(at, tz)}`; })()}</span>
                    <span>{clockText(unshout(a.message.split("\n")[1]?.replace(/,.*$/, "") ?? "Alert"), tz)} ·{" "}<Link href={unwritten ? `/campaigns/new?merchant=${merchant.id}&event=${a.event_id}` : `/campaigns/${a.campaign_id}`} className="link whitespace-nowrap">{unwritten ? "See who is coming" : "See the campaign"}</Link></span>
                    {a.status === "failed" && <span className="text-sm text-[var(--danger)]">Failed to send</span>}
                  </li>
                );
              })}
getCampaign (line 9), Link (line 1) and now (line 37) are already in scope. Optional, to match Coming next: line 268 `<ul className="mt-6 space-y-4 text-base">` -> `<ul className="mt-6 space-y-5 t-body">`. Typecheck: a scratch copy with this exact replacement passes tsc against the project tsconfig (/Users/jacobofernandez/Code/Qloo/.tmp/onepath/r9-verify/26/tc/today/page.tsx). Live targets all return 200 with the right display: tv_m_penn_pour_football-nfl_401873016 -> "Giants at Texans on Fox", G5diZ_o6t6Fbt -> "New York Knicks", wave_m_penn_pour_arrival_202610252200 -> "Theatre crowd arriving".

### #21 [minor] today
Where: src/app/today/page.tsx:97 (the `around` string). Same distance sentence on the next screen: src/app/campaigns/new/page.tsx:114, 119, 183, 184.

Problem: In New York the lead says '1.2 km from your door' next to '47°F'. A New York merchant does not think in km. Explore already computes walking minutes ('12 min walk'), which is a merchant word in any city.

Fix:

Do not import walkMin from src/app/radar/RadarMap.tsx. That file starts with "use client", and today/page.tsx is an async server component, so calling walkMin there throws "Attempted to call walkMin() from the server". Put one helper that is safe on the server in a new file, src/lib/distance.ts:
```ts
// Distance in the merchant's words: blocks when close, walking minutes after (80 m a minute, the map's pace).
export const walkMinutes = (km: number) => Math.max(1, Math.round((km * 1000) / 80));
export const fromDoor = (km: number) => (km <= 0.25 ? "a block" : km <= 0.5 ? "two blocks" : km <= 0.9 ? "a few blocks" : km < 2 ? `a ${walkMinutes(km)} min walk` : `${km.toFixed(1)} km`);
```
1) today/page.tsx: add `import { fromDoor } from "@/lib/distance";`. At :97, old `${next.distanceKm.toFixed(1)} km from your door` -> new `${fromDoor(next.distanceKm)} from your door`.
2) campaigns/new/page.tsx (so Today and Who is coming say it the same way): add the same import. :114 old `const walk = km <= 0.25 ? "a block from" : km <= 0.5 ? "two blocks from" : km <= 0.9 ? "a few blocks from" : undefined;` -> new `const walk = `${fromDoor(km)} from`;`. :183 old `<span className="mono">{kmText}</span> from {merchant.name}` -> new `{walk} {merchant.name}`. :184 old `{walk ?? <><span className="mono">{kmText}</span> from</>} {merchant.name}` -> new `{walk} {merchant.name}`. Delete kmText at :119 if nothing else uses it. Keep km on Explore's rings and in the radius text.
Expected now (11:09 pm New York): Today reads "About 20,000 people at Madison Square Garden, two blocks from your door right now, until 12:15 am", the same words as Who. The 1.2 km wave reads "leaving 34 shows a 15 min walk from your door". It says 15 min, not the issue's "12 min": 1.2 km at the map's pace is 15 min.

### #18 [minor] today and explore lists
**At 390 a line starts with "· about 149 guests". #32 is the same: apply this one.**

Where: src/app/today/page.tsx:238 (Coming next row, 3 separators); src/app/radar/RadarView.tsx:384 (Crowds worth a campaign row button, 2 separators)

Problem: At 390, list lines wrap before the separator, so a line starts with '· about 149 guests' or '· Manhattan Center'. It looks broken.

Fix:

Use a no-break space before each dot so the dot stays on the line of the word before it. Same pattern RadarView.tsx:404 already uses ("radius&nbsp;· "). today/page.tsx:238: `</span> · <b>` -> `</span>&nbsp;· <b>`; `</b> · about` -> `</b>&nbsp;· about`; `: ""} ·{" "}` -> `: ""}&nbsp;·{" "}`. RadarView.tsx:384: `</span> · <b>{it.headliner}</b> ·{" "}` -> `</span>&nbsp;· <b>{it.headliner}</b>&nbsp;·{" "}`. Do NOT use the proposed fix: `{" · "}` renders the same string as the JSX text " · " (plain spaces), so the line can still break before the dot.

### #32 [minor] today (Coming next), explore (list)
**Duplicate of #18, skip.**

Where: src/app/today/page.tsx:238 (Coming next row); src/app/radar/RadarView.tsx:384 (Explore crowd row, button.tm-item)

Problem: At phone width the " · " separator wraps to the start of a line, leaving an orphan dot before the next phrase.

Fix:

src/app/today/page.tsx:238
old: </span> · <b>{unshout(it.headliner.name)}</b> · about {it.potentialGuests}&nbsp;guests{it.fill >= 1 ? ", enough to fill your seats" : ""} ·{" "}
new: </span>&nbsp;· <b>{unshout(it.headliner.name)}</b>&nbsp;· about {it.potentialGuests}&nbsp;guests{it.fill >= 1 ? ", enough to fill your seats" : ""}&nbsp;·{" "}

src/app/radar/RadarView.tsx:384
old: </span> · <b>{it.headliner}</b> ·{" "}
new: </span>&nbsp;· <b>{it.headliner}</b>&nbsp;·{" "}

Each dot sticks to the word before it, so a line can end with a dot but never start with one. Same pattern as the "&nbsp;guests" already on line 238. The proposed fix missed the third separator on the Today line (the " ·" before the "See who is coming" / "Your campaign is ready" link). It needs the same &nbsp; or a dot can still start a line there when the link wraps.

### #28 [minor] today, who, explore
Where: Reproduced: src/app/campaigns/new/page.tsx:254 (Who is coming, wave crowd, "All the evidence from Qloo" list). It renders the note from src/server/qloo/crowd.ts:209, `${m.venue}, about ${m.capacity.toLocaleString("en-US")} seats`, with no nb(). Latent only, plain space present but no split at any tested width with tonight's data: src/app/campaigns/new/page.tsx:183 and :185, src/app/today/page.tsx:97, :104 and :130, src/app/radar/RadarView.tsx:388.

Problem: The rule says numbers keep their unit, but some counts sit outside nb(), &nbsp; and .mono, so "100 guests", "34 shows" and "35,900 people" can split across lines. R8 #25 covered guests in Coming next and Explore only.

Fix:

1) Reproduced split. src/app/campaigns/new/page.tsx:254
old: {x.type === "tag" ? `, a taste Qloo knows${x.note ? `: ${x.note}` : ""}` : `${x.note ? `, ${x.note}` : ""}${READ_THROUGH[x.type] ? `, read through ${READ_THROUGH[x.type]}` : ""}`}.
new: {x.type === "tag" ? `, a taste Qloo knows${x.note ? `: ${nb(x.note)}` : ""}` : `${x.note ? `, ${nb(x.note)}` : ""}${READ_THROUGH[x.type] ? `, read through ${READ_THROUGH[x.type]}` : ""}`}.
(nb is already imported there. Its regex already covers "0 seats".)
2) Latent ones, same rule, apply in the same commit:
src/app/campaigns/new/page.tsx:183 old: {Number(ev.meta?.count ?? 0)} shows <span new: {Number(ev.meta?.count ?? 0)}&nbsp;shows <span
src/app/campaigns/new/page.tsx:185 old: about {guests} guests. new: about {guests}&nbsp;guests.
src/app/today/page.tsx:97 old: ${Number(next.event.meta?.count ?? 0)} shows ` new: ${Number(next.event.meta?.count ?? 0)} shows `
src/app/today/page.tsx:104 and :130 old: .toLocaleString("en-US")} people {around} new: .toLocaleString("en-US")}&nbsp;people {around}
src/app/radar/RadarView.tsx:388 old: </span> {it.kind === "tv" ? it.venue : "people"} new: </span>&nbsp;{it.kind === "tv" ? it.venue : "people"}

## 5. Explore

### #6 [minor] explore
**The map card and the list give one crowd two times and two number styles. #16 and #24 are the same: apply this one.**

Where: src/app/radar/RadarView.tsx:340 (venue peek time), :360 (wave peek time), :384 (row time, the rule to share); src/app/radar/RadarMap.tsx:296 (peek figure)

Problem: The map's peek card and the list row give one crowd two times and two number styles on the same screen. The card shows the start time, already past, with a tilde. The row shows "Now, until" with "About".

Fix:

1) src/app/radar/RadarView.tsx, after dayLabel (line 72), add one shared rule:
old:
    return short ? fmtShortDay.format(new Date(t)) : fmtWeekday.format(new Date(t));
  };
new:
    return short ? fmtShortDay.format(new Date(t)) : fmtWeekday.format(new Date(t));
  };
  // One clock for a crowd, the same in the list and on the map's peek card.
  const whenText = (c: Crowd) =>
    c.w.arrive <= now
      ? c.kind === "venue" && c.w.start <= now && now < c.w.end ? `Out at ${clock(c.w.end, tz)}` : `Now, until ${clock(c.w.leave, tz)}`
      : `${dayLabel(c.w.start, true)} ${clock(c.w.start, tz)}`;

2) src/app/radar/RadarView.tsx:340
old:        time: `${dayLabel(rep.w.start)} ${clock(rep.w.start, tz)}`,
new:        time: whenText(rep),

3) src/app/radar/RadarView.tsx:360
old:          time: `${dayLabel(selWave.w.start)} ${clock(selWave.w.start, tz)}`,
new:          time: whenText(selWave),

4) src/app/radar/RadarView.tsx:384
old:          <span className="mono">{it.w.arrive <= now ? (it.kind === "venue" && it.w.start <= now && now < it.w.end ? `Out at ${clock(it.w.end, tz)}` : `Now, until ${clock(it.w.leave, tz)}`) : `${dayLabel(it.w.start, true)} ${clock(it.w.start, tz)}`}</span>
new:          <span className="mono">{whenText(it)}</span>

5) points useMemo deps (line ~370)
old:  }, [all, cursor, selected, tz, merchant.id, hotMembers]);
new:  }, [all, cursor, selected, tz, merchant.id, hotMembers, now]);

6) src/app/radar/RadarMap.tsx:296
old: <p class="tm-peek-s">~<span class="mono">${sel.capacity.toLocaleString("en-US")}</span>&nbsp;people
new: <p class="tm-peek-s">About <span class="mono">${(Math.round(sel.capacity / 100) * 100).toLocaleString("en-US")}</span>&nbsp;people

Note on the proposed fix: use the `now` already in scope (line 53, from the nowIso prop), not Date.now(). The list row uses that `now`. Date.now() inside the memo would let the card and the row go out of step, and it can break hydration between the server render and the client. Making the row and the card share one helper also brings the "Out at" case for a running show to the card, which the proposed fix left out.

### #16 [minor] explore
**Duplicate of #6, skip.**

Where: src/app/radar/RadarMap.tsx:296 (tilde, raw capacity). Card time is built in src/app/radar/RadarView.tsx:340 (rep) and :360 (selWave), not in RadarMap. Same "~" also in RadarView.tsx:465 (timeline hover title).

Problem: The map card says '~35,900 people' (a tilde is a system mark) and 'Today 10:30 pm' (the start time, already past), while the list right below says 'Now, until 11:45 pm' and 'About 35,900 people'. Two ways of saying the same crowd.

Fix:

1) src/app/radar/RadarView.tsx, add right after dayLabel (after :72):
const whenText = (c: Crowd) => c.w.arrive <= now ? (c.kind === "venue" && c.w.start <= now && now < c.w.end ? `Out at ${clock(c.w.end, tz)}` : `Now, until ${clock(c.w.leave, tz)}`) : `${dayLabel(c.w.start, true)} ${clock(c.w.start, tz)}`;
2) RadarView.tsx:340 old: time: `${dayLabel(rep.w.start)} ${clock(rep.w.start, tz)}`, -> new: time: whenText(rep),
3) RadarView.tsx:360 old: time: `${dayLabel(selWave.w.start)} ${clock(selWave.w.start, tz)}`, -> new: time: whenText(selWave),
4) RadarView.tsx:384 old: <span className="mono">{it.w.arrive <= now ? (it.kind === "venue" && it.w.start <= now && now < it.w.end ? `Out at ${clock(it.w.end, tz)}` : `Now, until ${clock(it.w.leave, tz)}`) : `${dayLabel(it.w.start, true)} ${clock(it.w.start, tz)}`}</span> -> new: <span className="mono">{whenText(it)}</span>
5) src/app/radar/RadarMap.tsx:296 old: <p class="tm-peek-s">~<span class="mono">${sel.capacity.toLocaleString("en-US")}</span>&nbsp;people -> new: <p class="tm-peek-s">About <span class="mono">${(Math.round(sel.capacity / 100) * 100).toLocaleString("en-US")}</span>&nbsp;people
Optional same pass: RadarView.tsx:465 title "~${c.capacity...} people · could bring ~${c.guests} guests" -> "about ${(Math.round(c.capacity / 100) * 100).toLocaleString("en-US")} people · could bring about ${c.guests} guests".
Expected at 10:49 pm NY: card "Now, until 11:45 pm / Theatre crowd letting out / About 35,900 people · 12 min walk", same words as the list row.

### #24 [minor] explore
**Duplicate of #6, skip.**

Where: src/app/radar/RadarView.tsx:340 (time of a venue's map point), :360 (time of a selected wave; the issue said :359), :384 (the list row's own time words, which these should share); src/app/radar/RadarMap.tsx:296 (the peek card's people count). Explore at 1440 only, since the peek card is hidden under 640 px.

Problem: The map's peek card gives the selected crowd's start time, already in the past, while the list row under the map says the crowd is out now. It also uses a tilde and an unrounded count ("~35,900 people") where the list says "About" and rounds to the hundred.

Fix:

src/app/radar/RadarView.tsx:73 (insert after the closing "};" of dayLabel)
old:
    return short ? fmtShortDay.format(new Date(t)) : fmtWeekday.format(new Date(t));
  };
new:
    return short ? fmtShortDay.format(new Date(t)) : fmtWeekday.format(new Date(t));
  };
  // One set of time words for a crowd, on the map's card and in the list: in the show, out now, else when it starts.
  const whenText = (c: Crowd, short = false) =>
    c.w.arrive <= now
      ? c.kind === "venue" && c.w.start <= now && now < c.w.end ? `Out at ${clock(c.w.end, tz)}` : `Now, until ${clock(c.w.leave, tz)}`
      : `${dayLabel(c.w.start, short)} ${clock(c.w.start, tz)}`;

src/app/radar/RadarView.tsx:340
old:         time: `${dayLabel(rep.w.start)} ${clock(rep.w.start, tz)}`,
new:         time: whenText(rep),

src/app/radar/RadarView.tsx:360
old:           time: `${dayLabel(selWave.w.start)} ${clock(selWave.w.start, tz)}`,
new:           time: whenText(selWave),

src/app/radar/RadarView.tsx:371 (the points useMemo deps, so the card follows the clock)
old:   }, [all, cursor, selected, tz, merchant.id, hotMembers]); // eslint-disable-line react-hooks/exhaustive-deps
new:   }, [all, cursor, selected, tz, merchant.id, hotMembers, now]); // eslint-disable-line react-hooks/exhaustive-deps

src/app/radar/RadarView.tsx:384
old:           <span className="mono">{it.w.arrive <= now ? (it.kind === "venue" && it.w.start <= now && now < it.w.end ? `Out at ${clock(it.w.end, tz)}` : `Now, until ${clock(it.w.leave, tz)}`) : `${dayLabel(it.w.start, true)} ${clock(it.w.start, tz)}`}</span>
new:           <span className="mono">{whenText(it, true)}</span>

src/app/radar/RadarMap.tsx:296
old: <p class="tm-peek-s">~<span class="mono">${sel.capacity.toLocaleString("en-US")}</span>&nbsp;people
new: <p class="tm-peek-s">About <span class="mono">${(Math.round(sel.capacity / 100) * 100).toLocaleString("en-US")}</span>&nbsp;people

(Keep sel.capacity unrounded everywhere else: it still sorts the signs at RadarMap.tsx:283 and sizes the circles at :270. Only the displayed number is rounded.)

### #7 [minor] explore
**On phones the radius label hides Harry Styles' sign. #15 is the same: apply this one.**

Where: src/app/radar/RadarMap.tsx:323 (radius handle block list; signs are hidden by the loop at :420-426; the fallback is at :340, not :343)

Problem: On phones the closest crowd, Harry Styles two blocks away, loses its sign. The radius handle only avoids the first sign. Its "1.3 km" label then becomes an obstacle, and the declutter loop at :420-426 hides the Harry Styles sign underneath it.

Fix:

src/app/radar/RadarMap.tsx:323
old: const block = [signs.current[0]?.getElement(), meEl.current?.querySelector(".tm-me"), meEl.current?.querySelector(".tm-chip-me"), wrapRef.current?.parentElement?.querySelector(".tm-fs")]
new: const block = [...signs.current.map((s) => s.getElement()), meEl.current?.querySelector(".tm-me"), meEl.current?.querySelector(".tm-chip-me"), wrapRef.current?.parentElement?.querySelector(".tm-fs")]
Also fix the comment at :314-316 so it says "clear of every sign" instead of "the biggest crowd's sign". The fallback at :340 stays as it is. Simulated on the live page with Andrew Yang selected: the handle moves to the south point of the ring (dot 186-204 x 802-820, label 209-274 x 799-824). Nothing blocks it there, and Harry Styles, Andrew Yang, Operation Mincemeat and Oh, Mary! all stay visible.

### #15 [minor] explore
**Duplicate of #7, skip.**

Where: src/app/radar/RadarMap.tsx:323 (block list for the radius handle placement, :314-341). The sign is then hidden at :420-426, because the handle label is pushed as an obstacle at :349. The cause is not at :270 or :277-290.

Problem: On the phone map, tonight's biggest show next door (Harry Styles, 0.3 km, 20,000 people, on now) is an unlabelled dot beside Penn & Pour. Billy Crystal, The Outsiders (NY) and Andrew Yang all get signs. This carries over from round 8.

Fix:

RadarMap.tsx:323. Make the radius handle also keep clear of the biggest crowd nobody chose, which is the first sign without the .sel class.
OLD:
        const block = [signs.current[0]?.getElement(), meEl.current?.querySelector(".tm-me"), meEl.current?.querySelector(".tm-chip-me"), wrapRef.current?.parentElement?.querySelector(".tm-fs")]
NEW:
        const lead = signs.current.find((s) => !(s.getElement() as HTMLElement).classList.contains("sel")); // the biggest crowd nobody chose
        const block = [signs.current[0]?.getElement(), lead?.getElement(), meEl.current?.querySelector(".tm-me"), meEl.current?.querySelector(".tm-chip-me"), wrapRef.current?.parentElement?.querySelector(".tm-fs")]
Optionally change the comment at :315 from "clear of the biggest crowd's sign" to "clear of the chosen crowd's sign and the biggest crowd's sign". Neither fix proposed in the issue works. Reordering at :283 does nothing: with Andrew Yang chosen, Harry Styles is already signs[1] and is still hidden. Setting labelled to 1 at :270 would print the MapLibre text under the HTML "1.3 km" label, because HTML markers do not take part in symbol collision.

## 6. Pulse and the rest

### #19 [minor] pulse
Where: src/app/pulse/page.tsx:53-57 (caption and regenerate form, directly under the plate), :36-37 (radiusKm = max(radius_m, 1500)), insertion point after :99 (end of the "Your words for this week" grid, before </section> at :100). Merchant m_penn_pour, radius_m = 1300 in data/crowd.db. Seen in r9 pulse-1440-fold.png and pulse-390-fold.png (captured 10:50 pm New York, Fri Oct 23) and live by curl at 11:08 pm New York (/.tmp/onepath/r9-verify/19/pulse.html: "read by Qloo within 1.5 km."; radar.html: "within 1.3 km of your door" and "change your radius · 1.3 km"). Patched copy: /Users/jacobofernandez/Code/Qloo/.tmp/onepath/r9-verify/19/page.patched.tsx (esbuild parse OK).

Problem: Under the plate sits an orphan caption, 'The people who walk past your door on a normal day, read by Qloo within 1.5 km.', followed by the link 'Write this week's plan again'. 'Read by Qloo' is odd wording. 1.5 km disagrees with Explore's 1.3 km, and the regenerate link is the first thing after the headline.

Fix:

1) Delete :36-37:
old:
  // Qloo reads the street within the merchant radius, never under 1.5 km (see buildNeighborhoodPulse).
  const radiusKm = (Math.max(merchant.radius_m, 1500) / 1000).toLocaleString("en-US");
new: (nothing; radiusKm has no other use)

2) :53-57, keep the caption and link at the top only when there is no plan yet (then the link is the page's one action):
old:
      <p className="t-body mt-6">The people who walk past your door on a normal day, read by Qloo within <span className="mono">{nb(`${radiusKm} km`)}</span>.</p>
      <form action="/api/pulse" method="post" className="mt-4">
        <input type="hidden" name="merchant" value={merchant.id} />
        <button className="link text-base">{briefAction}</button>
      </form>
new:
      {!brief && (
        <>
          <p className="t-body mt-6">The people who walk past your door on a normal day.</p>
          <form action="/api/pulse" method="post" className="mt-4">
            <input type="hidden" name="merchant" value={merchant.id} />
            <button className="link text-base">{briefAction}</button>
          </form>
        </>
      )}

3) After :99 (the `</div>` that closes the four channel Blocks) and before :100 `</section>`, insert:
            <p className="t-body mt-14 text-[var(--muted)]">Written from the people who pass your door on a normal day.</p>
            <form action="/api/pulse" method="post" className="mt-4">
              <input type="hidden" name="merchant" value={merchant.id} />
              <button className="link text-base">{briefAction}</button>
            </form>

Changes from the issue's fix: (a) the move depends on whether a plan exists. The issue's version would leave the no-plan page ("Every day at ...") with no way to ask for a plan above the fold. (b) The km figure is gone, not swapped for merchant.radius_m. Neither radius describes "the people". buildNeighborhoodPulse reads them at the door's point (signal.location, no radius, neighborhood.ts:47-50). The 1.5 km floor applies only to the nearby-places call (:70), and that list is already inside "All the evidence from Qloo". So 1.3 km would be false too. (c) "read by Qloo" goes. Qloo already appears on this page in "All the evidence from Qloo", in the limitations and in the header, and the rule book (UX-ONE-PATH.md:41) names it once per screen.

### #29 [minor] pulse
Where: src/app/pulse/page.tsx:53 (caption), src/app/pulse/page.tsx:122 (limitations, from the model, asked for by src/server/agent/pulse.ts:35); src/app/pulse/page.tsx:127 summary "All the evidence from Qloo" stays as the one allowed mention. 1440 and 390.

Problem: The rule allows Qloo to be named once per screen. Pulse names it three times in the visible page: the caption under the plate ("read by Qloo"), the limitations text ("Qloo describes..."), and the summary "All the evidence from Qloo".

Fix:

The issue's fix is not enough. It removes one of the three mentions and leaves two (the limitations and the summary). Keep the summary at :127, which matches the Who is coming page, and fix the other two.

1) src/app/pulse/page.tsx:53
old: <p className="t-body mt-6">The people who walk past your door on a normal day, read by Qloo within <span className="mono">{nb(`${radiusKm} km`)}</span>.</p>
new: <p className="t-body mt-6">The people who walk past your door on a normal day, within <span className="mono">{nb(`${radiusKm} km`)}</span>.</p>

2) src/app/pulse/page.tsx:122. This covers the brief already stored, because it cannot be written again while ANTHROPIC_API_KEY is empty. Change only this page, not plainWords: the campaign page has its own single mention in its limitations.
old: <p className="t-body mt-4">{nb(plainWords(noScores(brief.limitations)))}</p>
new: <p className="t-body mt-4">{nb(plainWords(noScores(brief.limitations)).replace(/\bQloo describes\b/g, "The evidence describes"))}</p>

3) src/server/agent/pulse.ts:35, for briefs written later:
old: say so in limitations, in plain words, without the words affinity, tag or score.
new: say so in limitations, in plain words, without naming Qloo and without the words affinity, tag or score.

Result: the page body names Qloo once ("All the evidence from Qloo"). The header "Powered by Qloo" and the footer disclaimer are site chrome on every page and are not counted.

### #30 [minor] pulse, alerts (no-place state)
Where: src/app/pulse/page.tsx:19; src/app/alerts/page.tsx:17 (same state also at src/app/radar/page.tsx:24, `text-3xl`)

Problem: With no place set up, these two screens put their only headline in .t-title, so the screen has no Level 1. Today's no-place state uses .t-display for the same words.

Fix:

src/app/pulse/page.tsx:19
old: <h1 className="t-title">No place yet</h1>
new: <h1 className="t-display">No place yet</h1>

src/app/alerts/page.tsx:17
old: <h1 className="t-title">No place yet</h1>
new: <h1 className="t-display">No place yet</h1>

Optional, same state: src/app/radar/page.tsx:24
old: <h1 className="text-3xl">No place yet</h1>
new: <h1 className="t-display">No place yet</h1>
(radar:25-27 also shows "npm run seed" to the merchant, a system word. Today:31-33 has the merchant-word version: `<p className="t-lead mt-5"><Link href="/start" className="link">Set up your place</Link> in two minutes.</p>`.)

### #27 [minor] campaign, who
Where: src/app/campaigns/[id]/page.tsx:97 (campaign page); src/app/campaigns/new/page.tsx:178 (Who page, the normal state); also src/app/campaigns/new/page.tsx:79 and :92 (the "Missing place or event" and "Qloo could not be reached" error states, not captured but same link)

Problem: The one link back, "Today", comes in two sizes: 15 px (text-sm) on the campaign and Who pages, 17 px on Explore, Pulse and Alerts. The same first step of every secondary page should look the same.

Fix:

src/app/campaigns/[id]/page.tsx:97
old: <Link href={`/today?merchant=${merchant.id}`} className="link text-sm">Today</Link>
new: <Link href={`/today?merchant=${merchant.id}`} className="link">Today</Link>

src/app/campaigns/new/page.tsx:178
old: <Link href={`/today?merchant=${merchant.id}`} className="link text-sm">Today</Link>
new: <Link href={`/today?merchant=${merchant.id}`} className="link">Today</Link>

src/app/campaigns/new/page.tsx:92
old: <Link href={`/today?merchant=${merchant.id}`} className="link text-sm">Today</Link>
new: <Link href={`/today?merchant=${merchant.id}`} className="link">Today</Link>

src/app/campaigns/new/page.tsx:79
old: <Link href={merchant ? `/today?merchant=${merchant.id}` : "/today"} className="link text-sm">Today</Link>
new: <Link href={merchant ? `/today?merchant=${merchant.id}` : "/today"} className="link">Today</Link>

Plain "link" picks up the 17 px body size, the same as Explore (src/app/radar/page.tsx:85, a.link, 17 px). Pulse and Alerts already get 17 px with "link text-base", so after this change all five secondary pages show the link at the same size.

## Not verified

0 minor issues reported by one judge only are in `.tmp/onepath/r9-result.json` under `unverified`.
