# The demo path: one occasion, one decision, your touch, the board

Written 2026-10-29 for the hackathon build (Codex owns `src/`, this file is the spec). It applies
the rules of `docs/UX-ONE-PATH.md`: one home (Today), three type levels, one primary button per
screen, merchant words, no decimals, every number sourced, the honesty line always present.

The ten-second test: a judge who opens the URL reads, without clicking, what is happening
tonight, what Turnout decided and why, and what goes out. The ninety-second test: the judge
changes one word, taps Publish, and holds a board they could print.

The copy below is a worked example with the seeded Penn Pour offers (`src/server/db/seed.ts`).
Real names, times and counts come from the radar, the crowd profile and the draft; the sentence
shapes are the spec.

## Screen 1. The occasion (Today, above the fold)

```
Penn Pour · Thursday 6:12 pm                                  (eyebrow: merchant, merchant clock)

20,000 seats empty out of the Garden at 10:30 pm tonight.      (t-display, the only one)

Harry Styles, Madison Square Garden, a 4 min walk from your door.
Doors 6:30 pm. Ticketmaster, checked 5:40 pm.                   (t-body, source and freshness)
```

- The number is the venue capacity, never a count of people passing by ("seats", not "people").
- Distance in merchant words from `src/lib/distance.ts` (`fromDoor`), time from `src/lib/clock.ts`.
- No button here. The decision is right below; the single primary button of Today is Publish, at
  the end of screen 3's summary.

## Screen 2. The decision (Qloo, "Why this works here")

```
Why this works here                                            (t-title)

Without the crowd, Turnout would push Game night big screen.
This crowd leans women 25 to 34, rooftop cocktail bars, Aperol and Glossier.
Tonight: Happy hour for two, 9:30 pm to midnight.

A 10 min walk around you, they over-index on The Skylark, Pennsylvania 6 and Stout.

[Event only]  [Event + your street]                            (toggle, increment 2)
  1 Game night big screen      →   1 Happy hour for two
  2 Craft beer flight          →   2 Natural wine by the glass
  3 Happy hour for two         →   3 Craft beer flight

What tells us this                                             (details, closed by default)
  Qloo: taste tags, audience, places near you, brands. 5 calls, 3 from cache, 5:41 pm.
  Ticketmaster: the show. Open-Meteo: dry, 54°F at 10:30 pm.
  Qloo describes what this crowd likes, not who walks past your door.
```

- The flip is the hero. Line 1 is the offer the raw score would pick (concentration, timing,
  seats). Line 2 is three Qloo facts in merchant words: one demographic, one place taste, two
  brands. Line 3 is the agent's choice with its window. If the agent keeps the raw pick, write
  "The crowd confirms it: Game night big screen." Never fake a flip.
- The local line names three places from `recommend("place")` with `filter.location` around the
  merchant. Its distance word comes from the radius actually used, through `fromDoor`.
- The toggle is increment 2 (see build order). It ranks the merchant's offers twice: signal =
  event, then signal = event + `signal.location` of the merchant. If nothing moves, the toggle
  says "Your street confirms it." and nothing else.
- The honesty line lives in the drawer; the campaign page repeats it under "What Turnout
  cannot know".

## Screen 3. Your touch (campaign page)

```
Happy hour for two, tonight 9:30 pm to midnight                (t-title)

Out of the Garden and thirsty? Two cocktails for the price of one until midnight,
4 minutes from the exit. Penn Pour, 7th Ave at 33rd.           (the message, tap to edit in place)

On the board from 9:30 pm. Message out at 10:15 pm, before the lights come up.

Where it goes
  Chalkboard at the door            ready
  WhatsApp to 38 regulars           prepared, not sent (no phone connected)
  Screen near the Garden            simulated, $40, not booked

$0 tonight. The screen would add $40.                          (only if the draft carries a budget)

[Publish]                                                      (the one primary button)
```

- Editing is in place: tap the message, change "Two cocktails for the price of one" to
  "Half-price cocktails", the board preview (screen 4's object) updates as you type. No modal,
  no form page.
- The window comes from the draft (`draftFirstWindow` in `src/server/agent/prompt.ts`).
- Channel lines use the three statuses only: ready, prepared, simulated. Never "sent" unless an
  adapter really sent.

## Screen 4. The board (what goes out) and the receipt

```
+----------------------------------------------+
|            OUT OF THE GARDEN?                |   (the chalkboard object, .preview-board,
|      2-for-1 cocktails till midnight         |    chalk on black, three lines, seven words
|          4 min from the exit                 |    per line at most)
+----------------------------------------------+
[Print the board]  [Show on a screen]

Published 6:14 pm.
Chalkboard: ready to print.
WhatsApp to 38 regulars: prepared, not sent (no phone connected).
Screen near the Garden: simulated. Nothing was charged.

See who is coming                                              (link)
```

- The board copy is the agent's short form of the message, not the message cut off.
- "Print the board" opens `/campaigns/<id>/board`: a print-ready page (Letter and A4, chalk on
  black, no navigation) the merchant prints and stands at the door. "Show on a screen" is the
  same page full-screen for a tablet or the bar TV. This is the verifiable output: the judge can
  print it; in the video, the board stands on the real bar.
- The receipt is exact. Three statuses, a time, "Nothing was charged".

## No crowd tonight

Same four screens; the occasion is the street.

```
No crowd tonight. Your street is busiest Thursday 6 to 8 pm.    (t-display)

Your street leans natural wine and late dinner (Qloo, the taste of a 10 min walk around you).
Tonight: Natural wine by the glass, 6 to 8 pm.
```

Then the campaign page and the board as above. Never an empty Today.

## The judge's path, three clicks

1. Open the URL. Today, Penn Pour preselected by cookie. Read screens 1 and 2 without clicking.
2. Tap the message, change one word. Tap Publish.
3. Tap Print the board.

Second merchant (Quai Bercy, Paris) through the merchant switch: the same path with a different
occasion and a different pick. Personalization shown, not claimed.

## The ninety-second video

| Seconds | On screen |
|---|---|
| 0 to 10 | Today: the seats line, the show, the walk. |
| 10 to 30 | The flip: three lines, then the three local places. |
| 30 to 50 | Tap the message, change a word, the board updates. Publish. |
| 50 to 70 | The board full screen, Print, then the printed board on the real bar (phone footage). |
| 70 to 85 | The receipt. "Prepared, not sent" read aloud. "What Turnout cannot know". |
| 85 to 90 | Quai Bercy, Paris: another crowd, another pick. End card: the promise. |

## Build order for Codex

Increment 1, the complete path, before anything else:
1. Today top (screen 1) and the decision block (screen 2 without the toggle) from the existing
   crowd profile (`src/server/qloo/crowd.ts`) and draft (`src/server/agent/run.ts`). The
   "without the crowd" offer is the top raw-score offer; the chosen offer is the agent's.
2. Campaign page: in-place edit of the message, the window, the three channel lines, Publish.
3. The board route `/campaigns/<id>/board` (print and full screen) from `.preview-board`.
4. The receipt wording, three statuses, "Nothing was charged".
5. No-crowd state from the street taste (`src/server/qloo/neighborhood.ts`).

Increment 2, only after increment 1 runs end to end locally:
6. The Event only / Event + your street toggle. First a fifteen-minute API check that
   `rankShortlist` accepts `signal.location` with the hackathon key; if it returns 400, drop the
   toggle and keep the local places line.

Already there, reuse rather than rebuild: the crowd recipe, the agent and its schema, the
windows, the board object in `src/app/globals.css` (used by `src/components/CampaignPreview.tsx`),
the honesty block, `src/lib/clock.ts`, `src/lib/distance.ts`, `src/lib/text.ts`.
