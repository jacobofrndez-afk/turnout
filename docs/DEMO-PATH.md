# The demo path: one occasion, one decision, your touch, the board

Written 2026-10-29 for the hackathon build (Codex owns `src/`, this file is the spec), revised the
same day with Codex's corrections. It applies the rules of `docs/UX-ONE-PATH.md`: one home (Today),
three type levels, one primary button per screen, merchant words, no decimals, every number
sourced, the honesty line always present.

The ten-second test: a judge who opens the URL reads, without clicking, what is happening
tonight, what Turnout decided and why, and what goes out. The ninety-second test: the judge
changes one word, taps Publish, and holds a board they could print.

The copy below is a worked example with the seeded Penn Pour offers (`src/server/db/seed.ts`).
Real names, times and counts come from the radar, the crowd profile and the draft; the sentence
shapes are the spec. Every claim on screen must be one the product can prove (see "What the copy
may claim" at the end).

## Screen 1. The occasion (Today, above the fold)

```
Penn Pour · Thursday 6:12 pm                                  (eyebrow: merchant, merchant clock)

A 20,000-seat show lets out around 10:30 pm tonight.           (t-display, the only one)

Harry Styles, Madison Square Garden, a 4 min walk from your door.
Doors 6:30 pm, end estimated. Ticketmaster, checked 5:40 pm.    (t-body, source and freshness)

Your campaign is ready. Adjust and approve.                     (t-body, the product line)
```

- The number is the venue capacity from the venue table (`capacity_est`), never a count of people
  and never a fill rate: "seats", not "people", "a 20,000-seat show", not "20,000 people".
- The exit time is `ends_at_est`: always "around", and "end estimated" sits next to the source.
- Distance in merchant words from `src/lib/distance.ts` (`fromDoor`), time from `src/lib/clock.ts`.
- No button here. The decision is right below; the single primary button of Today is Publish, at
  the end of screen 3's summary.

## Screen 2. The decision (Qloo, "Why this works here")

```
Why this works here                                            (t-title)

+---------------------------+   +-----------------------------------+
| Your signature            |   | Recommended for this occasion     |
| Natural wine by the glass |   | Late-night burger & fries         |
| $13                       |   | Served until 1 am · $14           |
+---------------------------+   +-----------------------------------+

This crowd leans 18 to 34, late-night food and cocktail bars.
A 10 min walk around you, they over-index on The Skylark, Pennsylvania 6 and Stout.

[Event only]  [Event + your street]                            (shipped in 19d0a80)
  1 Late-night burger & fries  →   1 Late-night burger & fries
  2 Happy hour for two         →   2 Craft beer flight
  3 Craft beer flight          →   3 Happy hour for two

What tells us this                                             (details, closed by default)
  Qloo: taste tags, audience, places near you, brands. 5 calls, 3 from cache, 5:41 pm.
  Without the crowd, the raw score would pick Game night big screen.
  Ticketmaster: the show. Open-Meteo: dry, 54°F at 10:30 pm.
  Qloo describes what this crowd likes, not who walks past your door.
```

- Two cards are the hero. Left: the signature offer from the Place DNA (`signatureOfferId`).
  Right: the agent's pick for this occasion, with the offer's own hours and price from the seed.
  If the pick is the signature, the right card reads "The crowd confirms your signature." Never
  fake a flip.
- Under the cards, three Qloo facts in merchant words (one demographic, one taste, one brand or
  place), then the local line: three places from `recommend("place")` with `filter.location`
  around the merchant. Its distance word comes from the radius actually used, through `fromDoor`.
- The comparison toggle exists since `19d0a80` (`src/lib/locality-comparison.ts`,
  `src/components/LocalityEvidence.tsx`): signal = event, then signal = event + the merchant's
  street. The first choice may stay the same while the alternatives move; show exactly that. If
  nothing moves at all, the toggle says "Your street confirms it." and nothing else.
- The counterfactual ("the raw score would pick") lives in the drawer, not in the cards.
- The honesty line lives in the drawer; the campaign page repeats it under "What Turnout
  cannot know".

## Screen 3. Your touch (campaign page)

```
Late-night burger & fries, tonight until 1 am                  (t-title)

Out of the Garden and hungry? Smash burger and fries until 1 am,
4 minutes from the exit. Penn Pour, 7th Ave at 33rd.           (the message, tap to edit in place)

[ photo ]                                                      (optional, the merchant's own)

On the board from 10 pm. Message out at 10:15 pm, before the lights come up.

Where it goes
  Chalkboard at the door            ready
  WhatsApp to your demo list        prepared, not sent (no phone connected, fictional contacts)

$0 tonight.                                                    (a budget line only if the DNA
                                                                carries a paid channel)

[Publish]                                                      (the one primary button)
```

- Editing is in place: tap the message, change "Smash burger and fries" to "Burger and fries,
  half price", the board preview (screen 4's object) updates as you type. No modal, no form page.
- The photo slot already exists (`src/server/merchants/photo.ts`: jpeg, png, webp, server
  validation, size cap). It stays in the product. The video skips the upload step to keep its pace.
- The window comes from the draft (`draftFirstWindow` in `src/server/agent/prompt.ts`) and never
  extends an offer beyond its seeded hours: happy hour is 5 to 7 pm, the burger runs until 1 am.
- Channel lines use the three statuses only: ready, prepared, simulated. Never "sent" unless an
  adapter really sent. A geofenced screen appears only if the Place DNA selected that channel and
  the draft really prepared it; then it reads "simulated, $40, not booked".
- Channels are the merchant's to tick off before Publish.

## Screen 4. The board (what goes out) and the receipt

```
+----------------------------------------------+
|             AFTER THE SHOW?                  |   (the chalkboard object, .preview-board,
|       Burger & fries till 1 am · $14         |    chalk on black, three lines, seven words
|           4 min from the exit                |    per line at most, the price on it)
+----------------------------------------------+
[Print the board]  [Show on a screen]

Published 6:14 pm. Materials ready.
Chalkboard: ready to print.
WhatsApp: prepared, not sent (demo list, fictional contacts).
Nothing was charged.

See who is coming                                              (link)
```

- The board copy is the agent's short form of the message, not the message cut off. It carries
  the price and the hours as seeded.
- "Print the board" opens `/campaigns/<id>/board`: a print-ready page (Letter and A4, chalk on
  black, no navigation) the merchant prints and stands at the door. "Show on a screen" is the
  same page full-screen for a tablet or the bar TV. This is the verifiable output: the judge can
  print it; in the video, the printed board stands on a real counter.
- The receipt is exact: "Materials ready" because materials are what we produce, one line per
  channel that was really prepared, a time, "Nothing was charged". No ad screen line unless a
  screen was prepared. No contact counts: the demo list is six fictional contacts per merchant.

## No crowd tonight

Same four screens; the occasion is the street.

```
No crowd tonight. Your street still has a taste.               (t-display)

Your street leans natural wine and late dinner (Qloo, the taste of a 10 min walk around you).
Tonight: Natural wine by the glass.
```

Then the campaign page and the board as above. The window comes from the merchant's hours, never
from a footfall claim: Turnout has no visit counts, so no "busiest at" sentence anywhere. Never an
empty Today.

## The judge's path, three clicks

1. Open `/today?merchant=m_penn_pour`. Penn Pour is the default for a new visitor; the explicit
   link protects against a cookie left by an earlier choice. Read screens 1 and 2 without clicking.
2. Tap the message, change one word. Tap Publish.
3. Tap Print the board.

Second merchant (Quai 12, Paris) through the merchant switch: the same path with a different
occasion and a different pick. Personalization shown, not claimed.

Why Penn Pour is the default: in the local events table on 2026-10-29, Madison Square Garden has a
show or a game every night from October 30 to November 4 (Harry Styles on the 30th and 31st, then
Rangers and Knicks). Accor Arena has Jungle on the 30th, Simple Plan on the 31st, Hans Zimmer on
November 2 and nothing on the 3rd, 4th and 5th. Judging runs November 2 to 5.

## The ninety-second video

The hero of the video is chosen on the filming day: run both merchants in the morning, check the
real event, the capacity and the draft, film the one whose two cards tell the clearest story. The
copy in the video must match the real occasion of that day, never a script written in advance.

| Seconds | On screen |
|---|---|
| 0 to 10 | Today: the seats line with "around", the show, the walk, "Your campaign is ready". |
| 10 to 30 | The two cards, the three facts, the three local places, the toggle as it really ranks. |
| 30 to 50 | Tap the message, change a word, the board updates. Publish. No upload. |
| 50 to 70 | The board full screen, Print, then the printed board on a real counter (phone footage). |
| 70 to 85 | The receipt read aloud: "prepared, not sent", "Nothing was charged". "What Turnout cannot know". |
| 85 to 90 | The other merchant: another crowd, another pick. End card: "Turn the crowd outside into customers inside". |

Two signatures only, both already agreed: the promise line closes the video; "Your marketing
team. Your call." stays on About. No third line.

## What the copy may claim

- Capacity: sourced from the venue table, shown as seats, never as people or a fill rate.
- Exit time: an estimate, always "around" and "end estimated".
- Offers: title, price and hours as seeded; the script never stretches an offer's hours.
- Qloo facts: taste of the crowd and of the street, never individuals, never a visit forecast.
- Footfall: none. No "busiest at", no "people passing".
- Contacts: the WhatsApp list is fictional; say so, never a count that reads as real.
- Channels: only what was prepared appears on the receipt, with its real status.
- Money: "Nothing was charged" on every receipt; a budget line only when a paid channel is in
  the DNA and the draft carries a figure.

## Build order for Codex

Shipped: the crowd recipe, the agent and its schema, the windows, the comparison toggle
(`19d0a80`), the photo slot, the board object in `src/app/globals.css` (used by
`src/components/CampaignPreview.tsx`), the honesty block, `src/lib/clock.ts`,
`src/lib/distance.ts`, `src/lib/text.ts`, Penn Pour as the default merchant.

What lifts the demo, in this order:
1. The two cards on Today (screen 2): signature from the Place DNA, pick from the draft, the
   counterfactual in the drawer.
2. The board route `/campaigns/<id>/board` (print and full screen) from `.preview-board`, with
   the price and the seeded hours on it.
3. The receipt wording: "Materials ready", one line per prepared channel, "Nothing was charged".
4. The occasion line with "around" and "end estimated" (screen 1).
5. In-place edit of the message with the live board preview (screen 3), if not already in place.
6. No-crowd state from the street taste (`src/server/qloo/neighborhood.ts`), hours from the
   merchant, no footfall sentence.
