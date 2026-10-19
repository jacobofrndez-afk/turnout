# Turnout brand guidelines (v1.0)

Written for developers. The visual page is `index.html`; the tokens are `tokens.css` (paste into `src/app/globals.css`) and `tokens.json`. Written around logo direction 01 (the threshold); if another direction is chosen, only the logo section, `icon.svg`, `apple-touch.svg` and `og.svg` change.

## 1. Brand idea

Turnout. Turn the crowd outside into customers inside. We are the host who already knows what the people walking past will love, and who says so plainly. Hospitality warmth, data precision. Paper, ink and one amber light. Never dark, never neon, never a dashboard pretending to be a nightclub.

Three principles decide every call:

1. Warm paper, not dark glass. Paper `#F7F4EE` pages, white panels, ink text. Every screen should look fine printed.
2. One amber. `#B4530A` marks the person who showed up, the thing to look at, the one decision. One accent per view.
3. Evidence, not promises. Tabular numbers, visible sources, careful verbs. Never "they will come".

## 2. Logo

- Mark: direction 01, a squared doorway open on the left, three dots on the floor (r 1.6 / 2.3 / 3.2 on a 32 grid), the largest amber. Masters: `design/logo/01-threshold.svg` (lockup), `design/logo/marks/01-threshold-mark.svg` (32 px), `-mark-16.svg` (pixel-snapped), `-mark-mono.svg`.
- Wordmark: Fraunces 500, `font-variation-settings: "opsz" 144`, `letter-spacing: -0.02em`, `line-height: 1`. Cap height is 0.70 em.
- Descriptor: Inter 600, 10 px, `letter-spacing: 0.14em`, uppercase, `--muted`; baseline 0.53 em below the wordmark baseline.
- Lockup geometry: mark drawn height = cap height x 1.15, mark bottom (the floor) on the wordmark baseline, gap 0.5 x cap height. In the 56 px app header: mark 20 px tall, wordmark 20 px, gap 10 px, descriptor 10 px.
- Clear space: 8 grid units (25 % of mark height) on all sides.
- Minimum sizes: mark 16 px (use the 16 px drawing), horizontal lockup with a 20 px wordmark, stacked lockup 64 px wide. Below that, mark alone.
- Reverse on ink: mark and wordmark in paper, amber stays amber, descriptor `#A8A196`.
- One colour: all ink; the amber dot becomes ink at the same size.
- Don't: recolour the dots, make the mark all amber, place it on amber tints, rotate, stretch, thin the stroke, fade with opacity, add shadows or gradients, animate it.

## 3. Colour

All values in `tokens.css`. Contrast ratios are WCAG 2.x against paper `#F7F4EE` and white.

| Token | Hex | On paper | On white | Use |
|---|---|---|---|---|
| `--ink` (ink-950) | #17150F | 16.63 | 18.25 | titles, primary buttons, marks |
| `--text` (ink-900) | #2A2721 | 13.56 | 14.89 | body |
| ink-700 | #4A463E | 8.55 | 9.39 | strong secondary |
| `--muted` (ink-600) | #6B655B | 5.26 | 5.77 | secondary text, eyebrows (floor for readable text) |
| `--faint` (ink-500) | #857E71 | 3.66 | 4.02 | disabled, large labels only |
| `--placeholder` (ink-400) | #A39C8F | 2.48 | 2.72 | placeholders only, label required |
| ink-300 / `--line-strong` | #CFC7B8 | 1.53 | 1.68 | field borders, data dividers |
| ink-200 / `--line` | #E4DED3 | 1.22 | 1.34 | default 1 px border |
| ink-100, ink-50 / `--panel-2` | #EFEBE3, #FBF9F5 | | | tints |
| `--accent` (amber-500) | #B4530A | 4.57 | 5.02 | fills, rings, dots, display italics |
| `--accent-text` | #A54A07 | 5.34 | 5.86 | amber text under 18 px (4.96 on amber-soft) |
| `--accent-hover` (amber-600) | #9D4808 | 5.69 | 6.24 | hover on accent fills |
| amber-700 / 800 | #7F3A06 / #5E2B05 | 7.62 / 10.49 | | dark amber, charts, print |
| amber-300 | #E0955A | 2.22 | | charts only |
| `--accent-soft` (amber-50), amber-100 | #FBE9D9, #F5D3B4 | | | tints, focus halo, chip borders |
| `--ok` / `--ok-text` / `--ok-soft` | #1F7A4D / #1B6B44 / #E3F3EA | 4.84 / 5.92 | | ok-text on ok-soft 4.63 |
| `--warn` / `--warn-text` / `--warn-soft` | #9A6400 / #805300 / #FFF3D6 | 4.56 / 6.06 | | warn-text on warn-soft 5.63 |
| `--danger` / `--danger-soft` | #B42318 / #FDE8E6 | 5.99 | | danger on danger-soft 5.59 |
| `--info` / `--info-soft` | #3B5B7A / #E6EDF3 | 6.46 | | info on info-soft 6.00 |

White on accent 5.02, white on ok 5.32, white on danger 6.57, paper on ink 16.63, amber on ink 3.63 (dots and large only).

Rules:

- Amber is scarce: one accent per view (the score ring, or the one CTA, or the lit dot; not all three).
- Ink is the primary action. `.btn-accent` is reserved for the single irreversible step (publish, send).
- Amber text on paper or white under 18 px uses `--accent-text`. Never amber text on amber-soft under 14 px bold.
- `--muted` is the floor for anything the user must read. `--faint` is for disabled states and large labels.
- Semantic colours speak once, in a badge or a left border. No coloured card backgrounds.
- Reverse (ink) surfaces are for physical objects and previews: chalkboards, OG, tooltips. Never a whole screen.

Data visualisation:

- Sequential, paper to amber: `#F3E6D6 #EACBAA #DDA874 #C97D3E #B4530A` (`--seq-1..5`). Concentration scores, affinity bars.
- Neutral: `#EFEBE3 #D9D2C5 #B8AF9F #857E71 #4A463E` (`--neu-1..5`). Comparison series, below-baseline values, cold venues.
- Bars: length is the value, ramp step is intensity; track `--neu-1`; numbers tabular, ratios with one decimal.
- Map: tiles desaturated (`filter: saturate(0.55) contrast(0.95)`), 14 px radius, 1 px line. Merchant: ink dot 16 px with 2 px paper ring and 1 px line-strong halo. Hot venues: amber dot 14 px, label on white chip. Cold venues: ink-300 dot, muted label. Radius: 1.5 px dashed line-strong circle, no fill. No heatmaps, no pulsing, no blue.

## 4. Typography

- Fraunces (Google Fonts, variable: opsz 9..144, wght 300..700). Weight 500 only, upright and italic. Titles, offers, display numbers. Never below 22 px, never for body or table cells. No bold Fraunces.
- Inter (400, 500, 600) with `font-feature-settings: "ss01", "cv11"`. UI, body, data. Never above 18 px.
- Data numbers: `font-variant-numeric: tabular-nums` (class `.tnum`). Display numbers in Fraunces may be proportional.

Scale (size / line height, tracking, family, opsz):

| px | lh | tracking | family | use |
|---|---|---|---|---|
| 64 | 66 | -0.025em | Fraunces 500, opsz 144 | marketing hero only |
| 48 | 52 | -0.02em | Fraunces 500, opsz 144 | hero, big numbers |
| 36 | 42 | -0.02em | Fraunces 500, opsz 96 | page titles |
| 28 | 34 | -0.015em | Fraunces 500, opsz 72 | section titles, offers |
| 22 | 28 | -0.01em | Fraunces 500, opsz 48 | card titles |
| 18 | 26 | -0.005em | Inter 500 | lede, UI card titles |
| 16 | 24 | 0 | Inter 400 | body |
| 14 | 20 | 0 | Inter 400/600 | UI default, buttons, fields |
| 13 | 18 | 0 | Inter 400/500 | table cells, secondary UI |
| 12 | 16 | 0.01em | Inter 400/600 | meta, captions, badges |
| 11 | 16 | 0.14em | Inter 600, uppercase, muted | eyebrow |

- Italic amber emphasis: one phrase per headline, the phrase the merchant should act on. Never in body copy, never two phrases.
- Colour: titles `--ink`, body `--text`, meta `--muted`. No fourth grey.
- Uppercase only in eyebrow and descriptor, tracked 0.14 em.
- Wordmark: see section 2.

## 5. Layout

- Spacing: 4, 8, 12, 16, 24, 32, 48, 64, 96 (`--space-1..9`). Inside components 8/12/16, between components 24/32, between sections 64/96. Card padding 20 px.
- Containers: 1200 (marketing, radar with map), 960 (app pages), 640 (forms, onboarding). Gutters 24 px, 16 px under 640. 12 columns, 24 px gaps.
- Radius: 14 cards (`--radius`), 10 fields, 8 badges and small panels, 999 pills. Nested radius = outer minus padding.
- Border: 1 px `--line` everywhere; `--line-strong` only on fields and data dividers. Cards have border and shadow; flat cards have border and tint.
- Shadow: `--shadow` at rest, `--shadow-lift` on hover (with 1 px translate), `--shadow-pop` for menus and dialogs.
- Tables: regular rows 44 px (12 px padding, 13 px type), compact rows 36 px for provenance and long lists, never lower. Header on `--panel-2` with eyebrow type. Numbers right aligned and tabular. Empty cells show "·".

## 6. Components

Classes match `globals.css`; see `index.html` for the live versions.

- Buttons: `.btn` pill, 12 px / 22 px padding, Inter 600 14 px, 40 px target. `.btn-primary` ink (hover `--ink-900`), `.btn-accent` amber (hover `--accent-hover`), `.btn-ghost` transparent with `--line-strong`. Active: `translateY(1px)`. Disabled: opacity 0.5. `.btn-sm` 8 px / 14 px, 13 px.
- Chips: `--panel-2`, 1 px line, 12 px, pill. Selected: `--accent-soft` background, amber-100 border, `--accent-text`. Max two lines, then "and N more".
- Cards: `.card` white, line, radius, `--shadow`, lifts 1 px on hover. `.card-flat` panel-2, line, no shadow. Two levels only.
- Score ring: conic gradient `--accent` over `--line`, 5 px track; 88 / 56 / 36 px; number Fraunces 500 (Inter 600 at 36). Always amber; the value tells the story. Fills from 0 over 320 ms on first paint.
- Header pattern: eyebrow (11 px, 0.14 em, uppercase, 600, muted), title Fraunces 28/34, meta line Inter 13 muted with middle dots.
- Fields: `.field` white, 1 px `--line-strong`, radius 10, 10 px / 12 px padding, 14 px. Focus: border `--accent`, `box-shadow: 0 0 0 3px var(--accent-soft)`. Error: border `--danger`, danger-soft halo, help text in `--danger-text`. Labels visible, 13 px 500; placeholders are examples.
- Badges: pill, 12 px 600, 7 px dot. Draft ready (panel-2, ink-700), Agent working (info-soft, info; dot pulses 1.2 s, off under reduced motion), Needs your pick (accent-soft, accent-text; the only amber badge), Approved (ok-soft, ok-text), Published (ink fill, paper text), Failed (danger-soft, danger).
- Provenance table: 12.5 px, first column muted 140 px, keys in monospace, ISO dates, sources named as the merchant knows them.
- Caution box ("What this does not establish"): white, 1 px line-strong, 3 px `--warn` left border, radius 10, eyebrow in `--warn-text`, bullets for what is missing.
- Empty state: dashed line-strong border on panel-2, the mark in ink-300 with the amber dot, Fraunces title, muted one-liner, one ghost button.

## 7. Iconography

- 20 px grid, 1.75 px stroke, round caps and joins, 1.5 px inner padding, `currentColor`. At 16 px: same stroke, simpler geometry.
- No fills except one amber dot (r 1) as a focal point (offer, listing).
- Set: crowd (heads, not a pictogram), venue (stadium bowl), window (clock), offer (tag), publish (arrow through a door; never a megaphone), message (neutral bubble; never the WhatsApp mark), listing (card with lines; never the Google mark), chalkboard.
- No megaphones, pins, radar sweeps. Icon plus label always; icon-only needs tooltip and `aria-label`. Lucide at 1.75 px is an acceptable fallback with caps set to round.

## 8. Voice

- Sentences under 18 words, one idea each. Verbs first in buttons: "Review campaign", "Publish", "Not now".
- No exclamation marks, emojis or hashtags. Enthusiasm is precision.
- Numbers specific and sourced: "19 000 ticket holders, doors 18:30".
- "You" for the merchant, "they" for the crowd, "we" for Turnout. Never "our AI".
- Qloo evidence: "fans of X over-index on Y (11x the city baseline, Qloo)", "are more likely to", "tend to". Never "will come", "love you", "are your customers". Every evidence block ends with what it does not establish.
- Errors: what happened, then what to do. Apologies two words at most.
- Bilingual: English for US merchants, French for France. French uses French typography (espaces insécables before : ; ! ?, guillemets « », 18 h 30), "sur-indexent", vous only. UI language follows the merchant's country.

## 9. Applications

- App header: 56 px, paper, 1 px bottom line; mark 20 px tall, wordmark 20 px, descriptor 10 px; nav Inter 500 13 px muted, current item ink 600.
- Radar row: 56 px ring, title Inter 600 14, meta 12.5 muted, badge, fit number in Fraunces 22 with an uppercase 11 px label.
- Campaign card: eyebrow + schedule, badge, offer in Fraunces 24 with one amber phrase, "why" line in muted 13, channel chips, footer on panel-2 with provenance count, Edit (ghost) and Publish (accent).
- Ad creative 1080 x 1080: paper, Fraunces 132 px headline with one amber italic, Inter 42 px body, eyebrow top-left, mark 84 px bottom-right. A warm photo may replace paper on up to 40 % of the area.
- Chalkboard: physical object, so dark: slate `#1B1A14`, wood frame, chalk `#F2EEE4`, price in chalk amber `#E8A35D`, Fraunces 30 px+, two lines maximum. Delivered as a PDF to copy by hand.
- WhatsApp broadcast: plain text under 300 characters, no emoji, two messages (offer, then address). Our own UI uses neutral bubbles and never imitates the channel.
- OG 1200 x 630: `og.svg`. Paper, lockup 40 px, Fraunces 76 px headline with one amber italic, Inter 22 px, mark 256 px right. Rasterise with Fraunces and Inter installed.
- Favicon: `icon.svg`, the 16 px drawing, transparent, flips to paper in dark chrome. App icon: `apple-touch.svg` (180; scale for 512), paper square, 32 px drawing in an 80 % safe area.

## 10. Motion

- Durations: `--dur-1` 120 ms (hover, press, colour), `--dur-2` 200 ms (reveal, expand, badge change), `--dur-3` 320 ms (score ring fill on first paint, publish confirmation).
- Easing: `--ease-out: cubic-bezier(0.2, 0, 0, 1)`, `--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)` for height.
- Animates: ring fill, card hover lift 1 px, publish check drawing in (stroke-dashoffset) with the badge changing to Published, menu open, provenance expand.
- Never animates: page backgrounds, the logo, table rows on load, cards staggering in, numbers counting up, map markers, anything looping (except the working-dot pulse, 1.2 s).
- `prefers-reduced-motion: reduce`: durations to 0, pulse off, ring renders filled.

## 11. Accessibility

- Text: AAA for ink and text on paper and white, AA minimum for everything else readable (see the table in section 3 and on the page). `--faint` is large-text only; placeholders are never the only label.
- Focus: `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` on every interactive element; fields use the amber border plus 3 px amber-soft halo. Never `outline: none` without an equal replacement.
- Targets: 40 x 40 px pointer, 44 x 44 touch (under 768 px). Small buttons get invisible padding to 40. Interactive chips are 32 px tall.
- Status never by colour alone: badges have words, rings have numbers, venues have labels.
- `lang` follows the merchant's locale. Italic amber emphasis is decoration unless it changes meaning.

## Alternative palettes

`palettes.json` holds five complete token sets with the same names as `tokens.css` (current, Qloo-inspired violet, Ticketmaster-inspired blue on a cool neutral, the Qloo x Ticketmaster blend with indigo-navy ink, and bottle green), each with computed contrast ratios. Any of them can replace the `:root` colour block. The visual comparison is `design/logo/radar.html`, section B; the recommended pairing for the jury is direction 01 in the blend (P4).

## 12. Changes from the current app

Existing names kept: paper, panel, panel-2, line, line-strong, ink, text, muted, accent, accent-ink, accent-soft, ok, ok-soft, warn, warn-soft, danger, danger-soft, radius, shadow. Values unchanged.

Added or changed:

1. `--accent-text #A54A07` for amber text under 18 px (accent is 4.57 on paper, 4.25 on amber-soft).
2. `--warn-text #805300`, `--ok-text #1B6B44` for badge text on soft tints (warn was 4.56 on paper, marginal at 12 px).
3. `--info #3B5B7A`, `--info-soft #E6EDF3` for "agent working" (no colour existed).
4. Ink scale ink-50..950, `--faint`, `--placeholder`; the literals `#a39c8f` (placeholder) and `#2b2820` (primary hover) become tokens; primary hover is `--ink-900 #2A2721`.
5. `--accent-hover #9D4808` (was a literal in `.btn-accent:hover`).
6. `--radius-sm 8`, `--radius-field 10` (was a literal), `--radius-pill 999`.
7. `--shadow-lift`, `--shadow-pop`.
8. Data-viz tokens (`--seq-*`, `--neu-*`, `--map-*`), type scale, spacing, container, focus and motion tokens, `--font-display` / `--font-sans` as plain custom properties (Next's font variables can be assigned to them).
9. Logo: `Logo.tsx` mark becomes direction 01 (open side left, solid dots, no opacity); wordmark gains `font-variation-settings: "opsz" 144` and letter-spacing -0.02 em; header mark is 20 px tall beside the 20 px wordmark (was 1.45 x font size). `public/logo.svg` and `src/app/icon.svg` are replaced by `design/logo/01-threshold.svg` and `design/brand/icon.svg`.
