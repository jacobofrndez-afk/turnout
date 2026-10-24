# One path: the merchant UX rules

Decided on 2026-10-24 after Jacobo's verdict on the app ("no hierarchy, I do not know what to click"). Every merchant
screen follows these rules. The design tokens and classes in `src/app/globals.css` stay as they are (design-owned);
these rules only say which ones a page may use and where.

## The path

1. **Today** (`/today`) is the only home. It answers one question: what do I do now? One headline, one button.
2. **Explore** (`/radar`) is the map of who is around, for the curious. Reached from Today only.
3. **The campaign** (`/campaigns/[id]`) is one page: the offer, the button, what goes out, why.
4. **Who is coming** (`/campaigns/new`) is the crowd in three facts and one button.
5. Alerts and the weekly pulse are sections of Today first; their pages stay for the detail, reached from Today.

Header: the logo, "Today", "Explore", "Powered by Qloo". Nothing else. No second navigation row on any page.
Every secondary page starts with one link back: "Today" (not "Back to the radar").

## Hierarchy: three levels per screen

- **Level 1, one per screen**: `.t-display` for the thing that matters now (the offer, the crowd, the place). Never a
  section name, never a date.
- **Level 2, at most four per screen (five on Today, the home carries two more sections)**: `.t-title` for section heads. Section heads are plain words a merchant
  says: "What goes out", "Why", "Coming next", "Every day this week".
- **Level 3**: `.t-body` for everything else; `.t-lead` only for the one sentence under the headline.
- Eyebrows (`.eyebrow`) only inside the plate and above the channel cards (the chalkboard plus the channels Publish sends, on Today and on the campaign; the weekly plan's four channel blocks). Everywhere else a label becomes a
  `.t-title` or disappears. Dates and places go in `.t-body` sentences, not in labels.
- Figures: at most two big figures per screen (`.t-figure`), both answering "how many people, when".
- The plate (`.plate`): one per screen, holds the headline, the one sentence, the one button. Nothing else.

## One action per screen

- One primary button per screen (`.btn-lg` on the plate): "Publish", "Write my campaign", "See who is coming".
- Every other action is a `.link` sentence: "Read every word first", "All alerts", "Explore the map".
- A list item carries one link, at the end of its line, never two.

## Words

- Say what happens, in the merchant's words: "Publish" not "Approve and publish"; "Who is coming" not "Crowd profile";
  "Why" not "Rationale"; "What goes out" not "Channels".
- No system words on screen: no "provider", "operator", "draft", "entity", "signal", "affinity", "over-index".
  The one exception is "Qloo", named once per screen where the evidence comes from.
- No decimals in prose (see `noScores` in `src/lib/text.ts`). Bands are words: strongest fit, close, further.
- Numbers keep their unit on the same line (`nb()` in `src/lib/nbsp.ts`).

## Screens

### Today
1. Plate: eyebrow "Tonight" (or "Today", "Tomorrow"), `.t-display` the crowd in five words ("Harry Styles at the
   Garden"), `.t-lead` "About 20,000 people 0.3 km from your door from 5:30 pm. Your pre-show happy hour is ready."
   Button "Publish" when a campaign exists, else "Write my campaign"; secondary link "Read every word first". Times
   in the merchant's clock (`src/lib/clock.ts`): "5:30 pm" in New York, "17:30" in Paris.
2. "What goes out": the same blocks as the campaign page: the chalkboard, then only the channels Publish sends (the merchant's channels), with the same eyebrows.
3. "Why": three lines, `.t-body .measure`, then the link "The rest of the reasoning".
4. "Coming next": up to three lines, each "Sat 8 pm · Harry Styles · about 100 guests" + link "See who is coming"; a crowd whose campaign waits for Publish comes first, with the link "Your campaign is ready".
5. "Every day this week": the weekly offer in two lines + link "This week's plan".
6. "What Turnout found on its own": three alerts + link "All alerts".
7. Footer links in one line: "Explore the map", "Your place and offers".

### Explore (radar)
1. Link "Today". `.t-display` "Who is around Penn & Pour". `.t-lead` "The next three days, within 1.3 km."
2. The map, full width, first. The radius handle stays.
3. The timeline folds under a `.link` "Hour by hour" (closed by default).
4. "Crowds worth a campaign": the list, each line with one link "See who is coming".

### The campaign
1. Link "Today". Plate: eyebrow "Your campaign for <night>", `.t-display` the offer, `.t-lead` its one line and the
   window, button "Publish" (hidden when the night has passed or the campaign is already out).
2. "What goes out": one block per channel, an eyebrow names the channel in merchant words (as on Today), the copy in `.t-body` (`.t-name` for a headline). Only the channels Publish sends, plus the chalkboard.
3. "Why": three lines + "The rest of the reasoning".
4. "What Turnout cannot know": `.t-body`.
   When the first window is over, "What goes out" folds into a closed link and "Why" is dropped: the page is about the rewrite.
5. "How Turnout got here" (provenance) stays a closed disclosure at the end.

### Who is coming
1. Link "Today". Plate: `.t-display` the crowd's name, `.t-lead` where and when, for which place, and "It could bring
   you about N guests.", then the button "Write my campaign", or "See my campaign" when Turnout already wrote one (or
   started less than 15 minutes ago).
2. Three facts as `.t-title` lines with one sentence each: who ("Women, 25 to 34"), what they like ("Cocktail
   rooftops and brunch"), what fits ("Your pre-show happy hour fits them best").
3. "All the evidence from Qloo": a closed disclosure holding the bars list, the brands, the tags, the age bars, the
   offers table and the provenance.

### Alerts and pulse pages
Same rules: link "Today", one `.t-display`, `.t-title` sections, no eyebrows outside a plate except above the weekly plan's four channel blocks, named in the same merchant words as on Today and the campaign.
