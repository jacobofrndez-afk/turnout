# Marquise sweep checklist for the pages owner

> SUPERSEDED by Velours (v3.0). Do not apply. The live list is design/brand/PREMIUM-CHECKLIST.md; tokens and rules in design/brand/tokens.css and GUIDELINES.md.

Identity landed in commit 5464f1a: tokens and shared classes in src/app/globals.css, fonts in src/app/layout.tsx, logo in src/components/Logo.tsx. The items below are in files owned by the product session and were found by the verifiers on real renders (1440 and 390 px, scale 1 and 2).

## UI rules

1. Page --paper #F2F3F3; content sits on .card boards (white, 1 px hairline, 3 px ink top rail). Nested or quiet panels: .card-flat.
2. Corners 0 everywhere (rounded-* is a no-op). Only map venues are circles; your place is a square.
3. No soft shadows, no blur, no glass, no gradients on boards.
4. Raspberry #E0115F only for live, hot, go: the live rail (.card-live), the hot venue, the needle, one .btn-accent per screen.
5. Raspberry text under 24 px is var(--accent-text) #B8094B, never var(--accent). Never a heading, numbered list or stat colour.
6. Status is --ok / --warn / --danger with their -soft fills, never raspberry.
7. Labels: .eyebrow (sentence case, Instrument Sans 500, 13 px, muted). No uppercase, no letter-spacing, no tracked caps.
8. Names, titles, figures: Big Shoulders 800 (h1, h2.display, .font-display); figures add .tnum, unit after in 13 px muted sans.
9. Sentences: Instrument Sans 400; buttons 600 15 px. Clock, distances, hex: .mono (IBM Plex Mono 500).
10. No italics: drop <em>/fontStyle italic (html has font-synthesis: none, so they render upright anyway).
11. Buttons: .btn + .btn-primary (ink) / .btn-accent (raspberry, once) / .btn-ghost (1.5 px ink outline), 44 px square.
12. Tags: .chip (22 px, square), .chip-dot for the 6 px square dot. Fields: .field (44 px, ink focus ring).
13. Scores: .score-ring with style="--p: N" (20-segment marquee bar). Tables: table.data.
14. Colours only through tokens (var(--...)); never a hard-coded hex in a page.

## Tokens

```css
:root (src/app/globals.css, same values as design/brand/tokens.css):
--paper #F2F3F3; --panel #FFFFFF; --panel-2 #F8F8F8; --line #E3E4E4; --line-strong #C9CBCD; --tag #EBECEC
--ink #111114; --ink-hover #2E2E30; --text #26262C; --muted #62646B; --placeholder #898B90
--accent #E0115F; --accent-ink #FFFFFF; --accent-soft #FDE6EF; --accent-text #B8094B
--ok #0B7A4E / --ok-soft #E2F4EA; --warn #8A5D00 / --warn-soft #FCF0D6; --danger #B83A0A / --danger-soft #FCE8E0
--map-land #ECEDEC; --map-hot #E0115F; --map-cold #7C8794; --sweep rgba(224,17,95,0.22)
--mark-ink #111114; --mark-needle #E0115F; --mark-arc #606062 (ink 65 % on paper); --mark-arc-white #646466 (on white)
--radius 0px; --radius-sm 0px; --rail 3px; --shadow 0 1px 0 rgba(17,17,20,0.06)
@theme: --radius-xs..--radius-full all 0px (every rounded-* utility does nothing); --font-display / --font-sans / --font-mono set by next/font on <html>.
Every var(--x) used under src/ is defined (checked by grep; only --s, local to radar.css, is not global).

Base: html { background var(--paper); font-synthesis: none } (new this round); body Instrument Sans 400 on --paper; h1 Big Shoulders 800, opsz auto, -0.005em, leading 0.98, ink; checkbox/radio accent-color ink.
Shared classes:
.card: white, 3 px top rail (border-top, ink), 1 px --line hairline as inset box-shadow, radius 0; .card-live/.card-ok/.card-warn/.card-danger or inline borderColor recolour the rail only
.card-flat: --panel-2, 1 px --line, radius 0
.eyebrow: Instrument Sans 500, 13 px, leading 1.35, letter-spacing 0, text-transform none, --muted
.btn: 44 px min-height, 0 20px, 1.5 px border, radius 0, Instrument Sans 600 15 px, sentence case; focus 2 px ink outline offset 2
.btn-primary ink fill (hover --ink-hover); .btn-accent raspberry fill (hover --accent-text), once per screen; .btn-ghost 1.5 px ink outline
.chip: 22 px, 0 8px, --tag fill, radius 0, 12 px 500; .chip-dot = 6 px square dot in currentColor; .chip-live/-ok/-warn/-danger soft fills
.field: 44 px, 1 px --line-strong, radius 0, 15 px; focus = ink border + 1 px ink ring (no raspberry)
.score-ring: figure (Big Shoulders 800 28 px tabular) + 20-segment marquee bar 80x10 (60 px on phones), raspberry, cold grey inside .card-flat; markup style="--p: N"
table.data: heads 12 px 500 sentence case muted over --line-strong; rows hairline; tabular figures; code in mono
h2.display, h3.display, .font-display: Big Shoulders 800, opsz auto (.font-display tracking 0, leading 1.05); .tnum tabular; .mono IBM Plex Mono 500 tabular
MapLibre: ctrl groups, attribution and popups square with hairline; no tile filter (style painted from --map-land/--map-cold/--map-hot).
```

## Residues to clear, per file

A. LOGO AGENT (owns src/components/Logo.tsx and design/studio-a/; I may not edit them). Verifier issue 1 is real:
- design/studio-a/swing-final.mjs, Wordmark template: letterSpacing = (size >= 21 && size <= 26) ? "0.005em" : 0. This regenerates src/components/Logo.tsx:389 as `letterSpacing: size >= 21 && size <= 26 ? "0.005em" : 0` (layout.tsx renders <Wordmark size={23}>).
- src/components/Logo.tsx:382 doc: "20 in the app header (mark 20, gap 6)" -> "23 in the app header (mark 20, gap 6)".
- Regenerate design/studio-a/01-swing-final-lockup-header.svg with the wordmark at 23 px, letter-spacing 0.005em (it is still drawn at 20 px, tracking 0).

B. src/app/page.tsx (still shows artifact traits; home-r3.png):
- :34 `Turn the crowd outside into <em style={{ fontStyle: "italic", color: "var(--accent)" }}>customers inside</em>.` -> `Turn the crowd outside into customers inside.` (whole h1 ink; raspberry is never a heading colour; the italic already renders upright thanks to font-synthesis: none).
- :75 link `style={{ color: "var(--accent)" }}` -> `style={{ color: "var(--accent-text)" }}` (raspberry text under 24 px).
- :93 stat figures `style={{ color: "var(--accent)" }}` -> `style={{ color: "var(--ink)" }}`.
- :119 `<p className="eyebrow" style={{ color: "var(--accent)" }}>` -> `<p className="eyebrow">` (keep the raspberry rail at :118).
- :141 numbered steps 01/02/03 `style={{ color: "var(--accent)" }}` -> `style={{ color: "var(--ink)" }}` (never a numbered list in raspberry).

C. src/app/radar/radar.css (uppercase tracked labels TODAY / TOMORROW / FRIDAY / NOW and rounded boxes visible in radar-r3.png):
- :70 .tm-day b `letter-spacing: 0.1em; text-transform: uppercase; ... font-weight: 600` -> `letter-spacing: 0; text-transform: none; font-size: 12px; font-weight: 500; color: var(--muted)`
- :86 .tm-now i `letter-spacing: 0.08em; text-transform: uppercase;` -> `letter-spacing: 0; text-transform: none;`
- :95 .tm-daygroup h3 `font-size: 11.5px; letter-spacing: 0.12em; text-transform: uppercase; ... font-weight: 600` -> `font-size: 13px; letter-spacing: 0; text-transform: none; font-weight: 500`
- :19 .tm-peek-k `font-weight: 600; letter-spacing: 0.02em;` -> `font-weight: 500; letter-spacing: 0;`
- border-radius -> 0 at :2 (.tm-mapwrap 14px), :8 (.tm-fullbtn 999px), :12 (.tm-chip 8px), :16 (.tm-handle-lbl 6px), :18 (.tm-peek 12px), :26 (.tm-radius button 50%), :55 (.tm-btn 999px), :58 (.tm-chip-btn 999px), :59 and :60 (.tm-seg and its buttons 999px), :64 (.tm-scroll 14px), :80 (.tm-ev span 5px), :88 (.tm-cursor i 6px), :93 (.tm-legend i 3px), :104 (.tm-maphint 8px), :105 (.tm-fs 999px), :111 (.tm-ev.moment i 2px), :11 (.tm-me 50%: your place is a square).
- soft shadows -> none: :12 .tm-chip `box-shadow: 0 1px 2px ...` -> `box-shadow: none`; :15 .tm-handle-dot `box-shadow: 0 1px 4px ...` -> `box-shadow: none`; :18 .tm-peek `box-shadow: 0 10px 28px -12px ...` -> `box-shadow: none; border-top: var(--rail) solid var(--ink)`.
- :105 .tm-fs `min-width: 34px; height: 34px;` -> `min-width: 44px; height: 44px;` (44 px square buttons).

D. src/app/radar/RadarView.tsx:454 "Qualify this crowd with Qloo" `style={{ color: "var(--accent)" }}` -> `style={{ color: "var(--accent-text)" }}`.

E. src/app/campaigns/[id]/page.tsx (campaign-sent-r3.png: small raspberry labels used as decoration):
- :84 payload summary `style={{ color: "var(--accent)" }}` -> `style={{ color: "var(--muted)" }}`
- :85 remove `rounded-md`
- :129 CTA `style={{ color: "var(--accent)" }}` -> `style={{ color: "var(--accent-text)" }}`
- :177 hot weather tag `color: "var(--accent)"` -> `color: "var(--accent-text)"`
- :190 channel note `className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}` -> `className="text-[12px] font-medium" style={{ color: "var(--muted)" }}`

F. src/app/campaigns/new/page.tsx: :29 remove `rounded-xl`; :58 `hover:border-[var(--accent)]` -> `hover:border-[var(--ink)]`; :122 remove `rounded-sm`; :147 and :164 affinity figures `color: "var(--accent)"` -> `color: "var(--ink)"`.

G. src/app/pulse/page.tsx: :53 remove `rounded-lg`; :77 `"var(--accent)"` -> `"var(--accent-text)"`; :133 and :147 `color: "var(--accent)"` -> `color: "var(--ink)"`; :226 `className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}` -> `className="text-[12px] font-medium" style={{ color: "var(--muted)" }}`.

H. Cosmetic leftovers (no visual effect, the radius scale is 0): src/app/start/page.tsx:13 and src/app/radar/page.tsx:93 remove `rounded-xl`.

I. src/app/alerts/page.tsx (not in either agent's list; left as is): :58 drop `borderRadius: "var(--radius)"`; :62 link `color: "var(--accent)"` -> `color: "var(--accent-text)"`.

Note: dev server http://localhost:3210 was down (connection refused); all r3 renders came from http://localhost:3211. No dev server was started.

## Verifier findings in pages (latest round)

1. **Home hero H1, src/app/page.tsx:34 (other session)**  
   Evidence: Source: `Turn the crowd outside into <em style={{ fontStyle: "italic", color: "var(--accent)" }}>customers inside</em>.` In the render, 'customers inside.' is solid #E0115F (44,347 px sampled in the H1 crop). This is the rejected 'italic accent word' move with amber swapped for raspberry. It only renders upright because globals.css sets font-synthesis:none. Raspberry here means nothing live, hot or go. Renders: verify-anti-artifact-r3/home-1440.png, home-1440@2x.png, mobile-390-frame-top.png.  
   Fix: Remove the <em> and its inline style, so the whole H1 is ink #111114. No colour word and no italic in any headline. If the line needs stress, use the 90 px hero scale from the identity, not colour.
2. **Radar timeline and moment list, src/app/radar/radar.css:70, :86, :95 (other session)**  
   Evidence: Uppercase tracked labels survive. `.tm-day b {letter-spacing:0.1em; text-transform:uppercase}` gives TODAY / TOMORROW / FRIDAY 23 on the timeline. `.tm-now i {letter-spacing:0.08em; uppercase}` gives NOW. `.tm-daygroup h3 {11.5px; letter-spacing:0.12em; uppercase; 600}` gives the TODAY / TOMORROW / FRIDAY 23 OCT group heads above the cards. radar.css:19 `.tm-peek-k` is also tracked 0.02em. Renders: radar2x-timeline-left.png, radar2x-cards.png, radar-1440-gl.png.  
   Fix: Use sentence case ('Today', 'Tomorrow', 'Friday 23 Oct', 'Now') in Instrument Sans 500, 12 to 13 px, muted, letter-spacing 0, text-transform none. Applying the existing .eyebrow class to these elements is enough.
3. **Radar chrome, src/app/radar/radar.css:2, 8, 12, 16, 18, 26, 55, 58-60, 64, 80, 88, 93, 104, 105 (other session)**  
   Evidence: Hard-coded radii override the zeroed Tailwind scale. Timeline board .tm-scroll and map frame .tm-mapwrap have border-radius:14px, visibly rounded in radar2x-timeline-left.png and radar2x-legend-mapcorner.png. The fullscreen button .tm-fs is a 34 px circle (999px), not a 44 px square. The black cursor label 'Today 11:00 · 400 people around' (.tm-cursor i, 6px) and the selected '16 shows starting' tag (.tm-ev span, 5px) are pills. The map hint 'Drag the white handle…' is 8px rounded. Legend swatches are 3px rounded. .tm-btn, .tm-chip-btn and .tm-seg are 999px pills. The .tm-radius buttons are 28 px circles.  
   Fix: Set radius 0 on all of this chrome. Make the timeline a .card (3 px ink rail, 1 px hairline), make the map frame square, and make the fullscreen and radius controls 44 px square .btn-ghost. Labels and swatches square. Only map objects (venue dots, your place marker) stay round.
4. **Radar hover peek and handle, src/app/radar/radar.css:12, 15, 18, 21 (other session)**  
   Evidence: `.tm-peek {border-radius:12px; box-shadow:0 10px 28px -12px color-mix(in srgb, var(--ink) 35%, transparent)}` is literally the rejected 'rounded soft-shadow card', shown on hover over the map. `.tm-handle-dot` has a `0 1px 4px` blurred shadow and `.tm-chip` has `0 1px 2px`. `.tm-peek-t` still falls back to `Georgia, serif`, a leftover from the Fraunces era.  
   Fix: Remove every blurred shadow. The peek becomes a board: white, 1 px #E3E4E4 hairline, 3 px ink top rail, corners 0. Change the font fallback to "Arial Narrow", sans-serif.
5. **Radar 72 h timeline chart, src/app/radar/RadarView.tsx:380, :408 and radar.css:85 (other session)**  
   Evidence: The crowd curve is a smooth area chart: `<path d={curvePaths.hot} style={{fill:"var(--accent)"}} fillOpacity="0.45"/>` (washed pink) over a grey area, and 'now' is a 1.5 px dashed muted line (`.tm-now {border-left:1.5px dashed var(--muted)}`). That is the stock chart-library look. Identity rule 6, and the brand sheet's 'Data and map' board (brand-part3.png), call for square columns, the hot window in solid raspberry and 'now' as a 2 px solid ink line. Compare radar2x-timeline-left.png with brand-part3.png.  
   Fix: Draw the series as square columns per slot (cold in --line-strong, hot window solid #E0115F, no opacity). 'Now' becomes a 2 px solid ink line labelled 'Now' in sentence case. Legend swatches become square, matching the brand sheet.
6. **Radar moment cards, src/app/radar/RadarView.tsx:427, :433, :449, :454 (other session)**  
   Evidence: Every 'interesting' card gets `borderColor: var(--accent)`: a raspberry rail, a raspberry kicker ('Several shows at once'), a raspberry marquee bar and a raspberry 'Qualify this crowd with Qloo →' link, repeated 13 times. That includes the score-22 'Rangers at Maple Leafs' card (radar-1440-gl.png, lower list). The link is #E0115F (sampled), not the raspberry text token #B8094B. Raspberry ends up as wallpaper and stops meaning hot.  
   Fix: Only a hot moment (top score, or above the hot threshold) gets .card-live and a raspberry bar. Other cards get an ink rail and the cold-grey bar (--map-cold). The 'Qualify' link becomes ink with an underline (or one .btn on the selected card only). Kicker in muted, not raspberry.
7. **Home page raspberry use, src/app/page.tsx:55-56, :75, :93, :118-119, :141 (other session)**  
   Evidence: Raspberry is used as ornament: the 'The problem' stat figures '20,000 / 10 min / 0' (:93), the '01 02 03' step numerals (:141), the 'With Turnout · written for this crowd' rail and label (:118-119), and the #E0115F 'Qualify this crowd now →' link (:75) sitting in the same viewport as the raspberry 'Set up your place' button. Meanwhile the one board that really is live ('Live · next crowd near Penn & Pour', :55 `card p-7`) has an ink rail, and it uses the logo `<Mark size={40}/>` as a decorative card icon. Renders: home-1440.png, home2x-livecard.png, home-part1.png, home-part2.png.  
   Fix: Invert the logic. The live board gets .card-live, and a 6 px raspberry live square before 'Live' replaces the Mark icon. Stat figures, step numbers and the comparison card go ink (ink rail, muted label). The 'Qualify' link becomes ink and underlined. The raspberry button stays the single raspberry action in the hero viewport.
8. **Home page structure, src/app/page.tsx (whole file, other session)**  
   Evidence: The page follows the stock generated-landing sequence: a hero with two stacked CTAs and a 4-item trust strip ('Qloo taste graph · 250M+ entities'…, :44-49), a 3 stat cards 'problem' section, a before/after pair (the 'without' card faded with opacity 0.85), '01/02/03 How it works', 5 equal feature tiles, a pricing card next to an FAQ, then a centred closing CTA band with 3 buttons. Every section is a muted kicker ('The problem', 'Why it works', 'How it works', 'Where the crowd hears from you', 'Straight answers') over a big H2 and a muted lead, between hairline rules. The kickers are the old eyebrows put into sentence case. Renders: home-part1.png to home-part3.png.  
   Fix: Cut the section kickers and let the H2s stand alone. Drop the trust strip and the 01/02/03 numerals. Turn the stat trio into one board of Big Shoulders figures with their units in 13 px muted sans. Remove the opacity fade. Make the closing band left-aligned with one action. The page should read as signage boards, not a SaaS template.
9. **Clock and distance type on home, radar and start: src/app/page.tsx:30-31, src/app/radar/RadarView.tsx (card times, ticks, cursor), radar.css .tm-tick/.tm-cursor (other session)**  
   Evidence: IBM Plex Mono, the identity's third voice, appears nowhere on the pages: `grep -rn mono src/app` (excluding globals.css and layout.tsx) returns nothing. Clocks ('12:00', '16:30', 'Today 11:00', ticks 06:00/12:00/18:00) and distances ('0.3 km', '1.3 km', home '1.2 km … 12:00 PM') are all Instrument Sans. That leaves a generic display + sans pairing.  
   Fix: Add className="mono" (Plex Mono 500, tabular) to every clock and distance: card times, timeline ticks, the cursor readout, distances, and the home hero line. Use 24 h time as on the radar.
10. **Arrow-suffixed CTAs on home, radar, start (and alerts, pulse): page.tsx:76, RadarView.tsx:455, radar page links, src/app/start/page.tsx primary button (other session)**  
   Evidence: 'Qualify this crowd now →', 'Qualify this crowd with Qloo →' (×13), 'Alerts →', 'Weekly pulse →', 'Locate my place and read my offers →' on the start primary button. At 390 px that last one wraps to two lines with the arrow orphaned (mobile-390-frame-bot.png). The trailing-arrow CTA is a generic AI-landing tic and adds nothing to a 44 px square button.  
   Fix: Remove '→' from buttons and links. Links are ink with a 1.5 px underline. Buttons are plain sentence-case labels; shorten the start button to 'Locate my place'.
11. **v1 hex residues in shipped source: src/app/start/page.tsx:67, src/app/start/confirm/page.tsx:41, src/app/radar/RadarMap.tsx:67, :75, :81 (other session)**  
   Evidence: `className="mt-1 accent-[#b4530a]"` and `className="accent-[#b4530a]"` (v1 amber) on the checkboxes. RadarMap fallbacks are `tok("--paper", "#f7f4ee")`, `resolveColor(mapHot, "#b4530a")` and `resolveColor(paper, "#f7f4ee")` (v1 cream and amber). The render is neutralised (globals.css forces accent-color ink and the map reads the tokens), but the founder's rule is that nothing of v1 remains.  
   Fix: Delete the accent-[#b4530a] utilities. Change the fallbacks to the Marquise values: #F2F3F3 paper, #ECEDEC map land, #E0115F hot.
12. **Secondary pages: src/app/alerts/page.tsx (not in the other session's listed paths, confirm owner) and src/app/pulse/page.tsx (other session)**  
   Evidence: Alerts: each board ends with an #E0115F 'Open the campaign →' link under the raspberry 'Run the scan now →' button, so 4 raspberry actions on one screen (alerts-1440.png). Pulse: every affinity score in 'Where they already go' and 'Your offers against the street' is raspberry, including '0.00' for 'Game night big screen' (pulse-1440.png). Raspberry is used as decoration.  
   Fix: Alerts: per-board links become ink and underlined; keep the one raspberry button. Pulse: scores become ink Big Shoulders figures (tabular). Raspberry only for the single strongest match, or as a marquee bar on the hot one.
13. **src/app/globals.css (.card, lines 159-168). The mark is used at src/app/page.tsx:55 <Mark size={40} />, which belongs to the other session.**  
   Evidence: Note: http://localhost:3210 refused every connection (curl 000; only :3211 is listening), so every live check ran on :3211, which serves the same /Users/jacobofernandez/Code/Qloo. Checks that passed: tsc --noEmit is clean. swingMaster sends 12/16/18 to px16, 20/24 to px20, 32/40 to px32, 48 to px48, 64/96 to hero, 128/180 to heroLarge, 256 to heroLarge256 and 512 to heroLarge512. The arc is 0.25 u in full ink from 128 up and 1 px at 65 % below. A copy of swing-final.mjs run in scratch gives 569 ok, 0 FAIL, and its output is byte-identical to Logo.tsx, icon.svg and logo.svg. apple-icon.png and opengraph-image.png re-render byte-identical from marks/01-swing-final-180.svg and 01-swing-final-og.svg. No warm pixels and no retired hex in any logo file. The header lockup is Big Shoulders 800 at 23 px, letter-spacing 0.115px, text-transform none. Mark floor is on the baseline at 1x (wall bottom row 35 = T stem bottom row 35) and at 2x (rows 70-71 = 70-71), gap 6. OG floor is row 365 = baseline row 365. The defect: on the home page the live-card mark sits on a white board (.card p-7, ground rgb(255,255,255)), but its arc path computes to rgb(96,96,98) = #606062, the paper value. Read with the browser JS tool on :3211, svg viewBox '-4 -4 40 40'. The rule says the 65 % arc is a precomputed solid per ground: #646466 on white. Logo.tsx says to pass ground="white" or let the board set --mark-arc: var(--mark-arc-white). Neither is done: page.tsx passes no ground prop, and .card in globals.css does not set the token.  
   Fix: In src/app/globals.css add `--mark-arc: var(--mark-arc-white);` to the .card rule, so every mark on a white board gets #646466. globals.css is not in the other session's list. If page.tsx is preferred instead, list `<Mark size={40} ground="white" />` for the other session; do not edit it.
14. **src/app/page.tsx:34 (owned by the other session; not a logo file, list it, do not edit)**  
   Evidence: The home hero h1 still carries the rejected look's accent word: `Turn the crowd outside into <em style={{ fontStyle: "italic", color: "var(--accent)" }}>customers inside</em>.` Render .tmp/final-marquise/verify-logo-files-r3/home-1280-1x.png shows 'customers inside' in raspberry #E0115F, right under the header lockup. font-synthesis: none keeps it upright, but it is still the italic accent-word pattern the founder rejected. It also uses raspberry as decoration, which breaks identity rule 2 (raspberry only for live, hot or go).  
   Fix: List for the other session: remove the <em> and its italic/accent style so the whole h1 is ink, Big Shoulders 800.
15. **src/app/start/page.tsx:67, src/app/start/confirm/page.tsx:41, src/app/radar/RadarMap.tsx:64-81 (all owned by the other session; list, do not edit)**  
   Evidence: Retired-palette hex literals are still in shipped source (grep -rniE 'b4530a|f7f4ee|17150f' src). The two start pages have className="... accent-[#b4530a]" on checkboxes. In RadarMap.tsx palette() the fallbacks are tok("--ink", "#17150f") and tok("--paper", "#f7f4ee"); the accent fallback "#b4530a" appears three times; there are also warm greys #6b655b, #b8af9f, #a39c8f, #cfc7b8 and #e4ded3. None of these shows on screen right now: computed accent-color on /start checkboxes is rgb(17,17,20) because of the unlayered override in globals.css:118-121, and the tokens are defined. The task still says nothing of the old look may remain in the shipped app.  
   Fix: List for the other session: drop accent-[#b4530a] from both start pages (globals already sets ink). In RadarMap.tsx, replace the retired fallbacks with the Marquise values: ink #111114, paper/land #ECEDEC, hot #E0115F, cold #7C8794, muted #62646B, line-strong #C9CBCD, line #E3E4E4.
16. **src/app/page.tsx:34 (home hero h1). Owned by the other session, so listed here, not edited**  
   Evidence: The h1 still contains <em style={{ fontStyle: "italic", color: "var(--accent)" }}>customers inside</em>. Computed style on 'h1 em': font-style italic, color rgb(224, 17, 95). It only renders upright because globals.css sets font-synthesis: none. This is the same italic-accent-word device as the rejected look, now in raspberry, and raspberry here is decoration, not live, hot or go. Render: /Users/jacobofernandez/Code/Qloo/.tmp/final-marquise/verify-app-r3/crop-home-hero@2x.png. All renders used http://localhost:3211 because :3210 refused connections (nothing listening).  
   Fix: Remove the <em> and its italic and accent colour so the whole h1 is var(--ink). If emphasis is wanted, use weight or size only, never colour.
17. **src/app/page.tsx:75, :93, :118-119, :141 (home). Other session's file**  
   Evidence: The audit found 16 raspberry hits on home. Only the btn-accent CTA is allowed. The others: (1) the 20,000 / 10 min / 0 stat figures are color var(--accent) (:93). (2) The 'With Turnout · written for this crowd' comparison board has a raspberry rail (borderColor accent) and a raspberry label (:118-119), although it is not live. Meanwhile the hero board labelled 'Live · next crowd near Penn & Pour' keeps an ink rail (computed border-top 3px rgb(17,17,20)), which inverts the rule 'rail ink; raspberry when live'. (3) The step numbers 01/02/03 are accent (:141). (4) 'Qualify this crowd now →' (:75) is a second raspberry action, and it sets 14 px text in #E0115F instead of the raspberry-text token #B8094B. Render: /Users/jacobofernandez/Code/Qloo/.tmp/final-marquise/verify-app-r3/home-1440.png  
   Fix: Use var(--ink) for the stat figures and the 01-03 numbers. Give the comparison board an ink rail or card-flat, with a muted label. Put card-live on the live hero board. Set the Qualify link in ink, or in var(--accent-text) if it must read as go, and keep btn-accent as the only raspberry action on the screen.
18. **src/app/radar/RadarView.tsx:427, :433, :454. Other session's file**  
   Evidence: /radar?merchant=m_penn_pour has 99 raspberry hits. All 13 moment cards show 'Qualify this crowd with Qloo →' in var(--accent) at 14 px (:454), so there are 13 raspberry actions on one screen and the text uses #E0115F, not #B8094B. Every 'interesting' card gets a raspberry rail (:427), including weak moments scored 22 (Rangers), 16 (Andrew Yang) and 33. The kind labels 'Several shows at once' and 'A game on TV' are raspberry text (:433), but they are categories, not live signals. Render: /Users/jacobofernandez/Code/Qloo/.tmp/final-marquise/verify-app-r3/radar-1440.png  
   Fix: Make one raspberry action per screen: only the selected or top card's Qualify link uses accent-text or btn-accent, and the others are ink. Give a raspberry rail only to hot boards (score above a threshold). Weaker boards get an ink rail or card-flat, where the bar already turns cold grey. Set the kind labels in muted sans 500, 12-13 px.
19. **src/app/radar/radar.css:70, :86, :95. Other session's file**  
   Evidence: Uppercase tracked eyebrows remain, found by the computed audit at 1440 and 390. In .tm-day b (11px, letter-spacing 1.1px = 0.1em, uppercase): TODAY, TOMORROW, FRIDAY 23 OCT, SATURDAY 24 OCT. In .tm-now i (10px, 0.08em): NOW. In .tm-daygroup h3 (11.5px, 1.38px = 0.12em): TODAY, TOMORROW, FRIDAY 23 OCT. Home and /start have 0 such elements. Render: /Users/jacobofernandez/Code/Qloo/.tmp/final-marquise/verify-app-r3/crop-radar-top@2x.png  
   Fix: Use text-transform: none and letter-spacing: 0, in sentence case ('Today', 'Tomorrow', 'Friday 23 Oct', 'Now'), set in Instrument Sans 500 at 12-13 px, var(--muted). For example, reuse the .eyebrow class from globals.css.
20. **src/app/radar/radar.css:2, 8, 11, 12, 16, 18, 26, 55, 58-60, 64, 80, 88, 93, 104, 105. Other session's file**  
   Evidence: The radar page has 113 elements with a non-zero border-radius, against 0 on home and /start. Non-map UI with rounded corners: the map frame .tm-mapwrap (14px), the timeline frame .tm-scroll (14px), the fullscreen button .tm-fs (999px, a round circle at the map's top right), the map hint .tm-maphint (8px), the cursor label 'Today 11:00 · 500 people around' .tm-cursor i (6px), the event labels .tm-ev span (5px), the legend swatches (3px), the popup .tm-peek (12px), the 'Penn & Pour' chip .tm-chip (8px), the '1.3 km' handle label (6px), and the pills .tm-btn, .tm-chip-btn, .tm-seg (999px). Also, 'Your place' .tm-me is a 16 px circle (radius 50%), but the spec says your place is a square. Render: /Users/jacobofernandez/Code/Qloo/.tmp/final-marquise/verify-app-r3/crop-radar-map@2x.png  
   Fix: Set border-radius: 0 on every .tm-* surface, button, label and pill. Keep 50% only on venue dots and hit areas. Make .tm-me a square of 12-14 px in ink.
21. **src/app/radar/radar.css:12, :15, :18. Other session's file**  
   Evidence: Soft blurred shadows show up in computed style once the map renders (WebGL run). .tm-peek popup: box-shadow 0 10px 28px -12px (ink at 35%). .tm-handle-dot: 0 1px 4px (ink at 25%). .tm-chip-me: 0 1px 2px (ink at 8%). Source: /Users/jacobofernandez/Code/Qloo/.tmp/final-marquise/verify-app-r3/audit@2x-gl.json  
   Fix: Remove the shadows. Hang the popup as a board (white, 1 px var(--line), 3 px ink top rail, as globals.css already does for .maplibregl-popup-content). Give the chips and the handle a 1 px var(--line-strong) border.
22. **src/app/radar/RadarView.tsx:378-380 and src/app/radar/radar.css:85. Other session's files**  
   Evidence: The time series is drawn as smooth filled area curves: path curvePaths.hot with fill var(--accent) at fillOpacity 0.45, which renders as a washed pink blob, plus curvePaths.other in grey. 'Now' is a 1.5 px dashed var(--muted) line. Spec point 6: 'time series are square columns, the hot window in raspberry, "now" a 2 px ink line.' Render: crop-radar-top@2x.png  
   Fix: Draw square columns per time bucket: grey for other crowds, solid raspberry for the hot window. Draw 'now' as a solid 2 px var(--ink) line.
23. **src/app/radar/RadarView.tsx:430 (clock) and the distance labels in RadarView.tsx/RadarMap.tsx; src/app/page.tsx hero eyebrow. Other session's files**  
   Evidence: IBM Plex Mono 500 is never used. No element has .mono on /, /radar or /start (audit: mono = null on all six renders). document.fonts lists 'IBM Plex Mono 500 normal unloaded', and document.fonts.check('500 13px "IBM Plex Mono"') returns false. The radar clock '12:00 · crowd from 11:00 to 12:30' computes to Instrument Sans 600. The distances '0.3 km', '1 km · 13 min walk', '500 m · 6 min walk' and '1.3 km' are all sans.  
   Fix: Wrap the clock times and distances in <span className="mono"> (Plex Mono 500, tabular). For the map's ring and handle labels, use var(--font-mono) in the HTML markers.
24. **src/app/radar/RadarMap.tsx:7, :64-82; src/app/start/page.tsx:67; src/app/start/confirm/page.tsx:41. Other session's files**  
   Evidence: The rejected palette is still in shipped source. Both start pages have className accent-[#b4530a] on their checkboxes. It does not show, because the unlayered input accent-color: var(--ink) rule (globals.css:118-121) overrides it, and the checkboxes render ink in start-1440.png. RadarMap.tsx has fallbacks '#f7f4ee' (paper), '#b4530a' (accent, three times), '#17150f', '#6b655b', '#b8af9f', '#cfc7b8' and '#e4ded3', and a comment at line 7: 'hot crowds in amber'. The brief says 'Nothing of it may remain in the shipped app'. globals.css and layout.tsx themselves are clean: no F7F4EE, B4530A, Fraunces or Inter.  
   Fix: Remove accent-[#b4530a] from both checkboxes. Replace the RadarMap fallbacks with the Marquise values (#F2F3F3/#ECEDEC, #E0115F, #111114, #62646B, #7C8794, #C9CBCD, #E3E4E4), and change the comment to raspberry.
25. **src/app/radar/RadarMap.tsx:285-298, plus the map popup layout. Other session's file**  
   Evidence: Hot venue dots that are not active are drawn at circle-opacity 0.5. Sampled pixels are #E3749C and #EC7EA8 (washed pink), not solid #E0115F. Venue names are halo text (text-halo-color panel), not 'a solid sign label' (spec point 8). The selected-moment popup is clipped at the top edge of the map: its first line is cut at 1440, and at 390 the round fullscreen button sits on top of it. Renders: crop-radar-top@2x.png, crop-radar-390-a.png  
   Fix: Draw hot venues as solid raspberry circles at full opacity, and cold venues as solid #7C8794. Put the hot venue's name in a solid sign label (raspberry or ink fill, white text, square). Keep the popup inside the map bounds, or anchor it below the venue, and move it clear of the fullscreen button.
26. **src/app/page.tsx (hero h1 classes 'text-5xl leading-[1.02]', the Walk and Problem figures, the pricing block). Other session's file**  
   Evidence: The home hero h1 computes to Big Shoulders 800 at 70.4px, line-height 1.02, letter-spacing -0.352px (-0.005em). The spec hero is 90 px, leading 0.88, -0.012em. Units are set inside the Big Shoulders figure ('14 min', '10 min') or inherit it ('$49 / month' renders condensed bold). The spec says the unit goes in 13 px muted sans after the figure. Render: crop-home-hero@2x.png, crop-home-bottom.png  
   Fix: At desktop width, set the hero h1 to 90px, line-height 0.88, letter-spacing -0.012em. Render units as <span class="eyebrow"> (Instrument Sans 13 px, muted) after the figure, with the figure alone in Big Shoulders.
