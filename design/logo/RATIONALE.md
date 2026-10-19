# Turnout logo directions: rationale

Six different thoughts for one brand: a hospitality-plus-data product on warm paper, never dark, never "tech". Open `index.html` (two minutes, view at 1200 px or wider so the 16 px and 20 px instances render at their real size). `details.html` has the full ramps, lockups and construction grids. Each direction has a clean master (`0X-name.svg`, the horizontal lockup) and three mark drawings in `marks/` (`-mark.svg` 32 px master, `-mark-16.svg` pixel-snapped favicon drawing, `-mark-mono.svg` one colour).

## Shared system

- 32 unit grid. Stroke 2.4 units (7.5 %) in the 32 px drawing. Every 16 px drawing uses 4 unit strokes (2 px) on even unit lines so that edges land on pixels; this was checked in headless Chrome at device scale 1, not assumed. Round caps for line marks (02, 03), square joins for architecture (01, 04, 06). Distance and emphasis are size and colour, never opacity.
- Visual bottom of every mark is the wordmark baseline. Mark drawn height = cap height x 1.15 in lockups; in the 56 px app header the mark is 20 px tall beside a 20 px wordmark, gap 10 px.
- Wordmark: Fraunces, weight 500, `font-variation-settings: "opsz" 144`, letter-spacing -0.02 em. Cap height measured on the Google Fonts build: 0.70 em. Descriptor: Inter 600, 10 px, letter-spacing 0.14 em, uppercase, muted `#6B655B`, baseline 0.53 em below the wordmark baseline. On ink, the descriptor uses `#A8A196`.
- Amber `#B4530A` is used once per mark and always for the thing that matters: the person who arrived, the arrival point, the fifth tally, the lit window, the centre of the crowd, the one under the arch.

```css
font-family: Fraunces, "Iowan Old Style", Georgia, serif;
font-weight: 500; font-variation-settings: "opsz" 144; letter-spacing: -0.02em; line-height: 1;
/* descriptor */ font-family: Inter; font-weight: 600; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
```

## 01 The threshold

The owner's doorway, finished. Door centre lines 15 x 24 (1:1.6), square corners that stay crisp, stroke 2.4 at one weight including the floor. The left post stops at 13 so the open side is the reading side and the people enter left to right (the earlier sketch had them walking through the solid post). Three dots r 1.6 / 2.3 / 3.2 stand on the floor and grow as they come in; the amber one sits at the optical centre of the opening. The floor of the door is the baseline of the word.
Pros: approved idea; reads at every size; passes the 16 px and 20 px tests; one colour needs no tricks. Cons: the busiest of the six; a row of growing dots is a known device.

## 02 The turn

One line walks in from the left, turns a quarter circle (r 9) and stops; an amber dot r 3.2 sits 2.2 units below the end. The moment a crowd changes course toward you, and the word "turn" in the name. Nothing to simplify at 16 px beyond the 2 px stroke.
Pros: calmest and most elegant; says the name; becomes an icon language (routes, arrivals) inside the product. Cons: a line ending in a dot can read as a route or a cursor; the crowd is implied, not shown.

## 03 The count

A tally. Four ink strokes 5.33 apart, the fifth in amber across them at 36 degrees, drawn last so it sits on top. Turnout as a number you can see, which is also what the product promises.
Pros: immediate; speaks to the data side without a chart; the strongest one-colour version. Cons: tally marks carry prison and bar-tab jokes; nothing in it says a place.

## 04 The lit window

A solid facade 18 x 26.4 with five windows and an arched door cut out, and the sixth window lit amber, beside the door. The place people are drawn to at night. At 16 px it becomes a 2 x 2 facade with one lit window and no door.
Pros: the most emotional and the best app icon; amber as light is amber doing what amber does. Cons: heavy beside a light paper UI; at 20 px the windows merge into texture; house icons are common, the night and the one light must carry it.

## 05 The queue becomes a crowd

Two dots spaced 8.2 and 7 apart, then a flat-top hexagon of six dots on a ring r 6 around the amber centre: spacing 8.2, 7, 6, densifying. Turnout as it happens.
Pros: tells the whole story; shares a dot language with the product's charts; unique silhouette. Cons: the hexagon reads molecule or network at mid sizes; the mark is 31 x 15.6 units, wide and low, so it fails the 20 px header test (a string of specks) and is weak as a favicon.

## 06 Under the n

Pure type. The Fraunces wordmark, and one amber dot r 0.062 em standing on the baseline under the arch of the n, centred at 1.64 em from the origin (measured: the n starts at 1.349 em and advances 0.48 em at -0.02 em tracking). The monogram is that n: stems at 7 and 25, arch r 9, stroke 2.6 (letters are heavier than lines), dot r 3.2.
Pros: nothing added to the name; the most editorial; monogram and wordmark share one gesture. Cons: the dot can read as a blot; it depends on the font rendering, so it is fragile in email signatures and partner decks; at 20 px the dot is 2.5 px and nearly disappears.

## Recommendation

1. **The threshold (01).** The approved idea, executed, and the only direction that passes every test on the sheet without a caveat: favicon, header, one colour, reverse. Build the brand on it.
2. **The turn (02).** The most elegant drawing and the one that says the name. Pick it if the brand should feel like a considered hospitality house rather than a tool. The threshold would survive as the icon language inside the product.
3. **The lit window (04).** The most emotional and the best app icon; too textured for the 20 px header, so it would live as the icon with the wordmark alone in the header.

The count is strong but has no place in it. The crowd fails the header. Under the n is a detail worth keeping in the brand (an amber dot under an arch is a usable motif) rather than the mark to build on.

## What I could not fully achieve

- Curves at 16 px (02, 06) are anti-aliased; only straight strokes on even units are pixel-exact.
- 06 positions the dot from measured font metrics, so a different Fraunces build or a fallback font moves it. A React version should render the dot inside the same inline element as the text, with `position: absolute; left: 1.64em; bottom: 0`.
- Stroke weights at 24 px (1.8 px) and 32 px (2.4 px) are anti-aliased, as with any logo.

---

# Second sheet: radar directions and primary colour (`radar.html`)

Founder feedback: the six directions felt abstract; he wanted marks built on the product's first screen (the radar: map, dashed radius, venues as dots, hot ones in accent), alternative primary colours including Qloo and Ticketmaster translations, and a result that reads professional. Same frames as the first sheet, same stroke logic, same honesty line.

## 07 The sweep
Quarter sector at (6, 24) r 16, filled with the soft tint, only the outer arc stroked, five field dots, the lit one r 2.6 deep in the sector. Elegant because the sector is a tint, not a blade. 16 px: arc 2 px, two dots, tint kept (fills survive where strokes do not). Needs three colours; the field dots are decoration at small sizes.

## 08 Rings and a door
Dashed ring r 13.5 (dash 3, gap 2.6, butt caps), the doorway glyph at the centre, two dots on the ring, the accent dot inside it on its way in. The fullest story and the most fragile: at 16 px it becomes a solid ring, a 3 px block and a dot, a different drawing, declared on the sheet. At 20 px the door is 5 px wide and reads as a block.

## 09 The map
Three solid 7-unit blocks around a crossing, dashed ring r 14, the accent dot on the fourth corner. Your corner of the city. Solid shapes keep it crisp at 16 px (ring goes solid). Heavy beside a light serif; can read as a window at 24 px.

## 10 Signal
Ink point r 3.2 and two accent arcs r 7 and 12, 76 degrees wide, equal 2.6 gaps. The simplest radar. Passes every test; generic (wifi, podcast, sonar live here), so the wordmark carries the brand.

## 11 Venue and bar
Arena: light circle r 6.5 at (9, 9); bar: ink square 6 at (23, 23); dotted diagonal path; accent dot r 2.4 at the midpoint. The product in one glyph. Passes the header; at 16 px the path goes. Abstract until explained; diagonal marks sit less well on a baseline.

## Palettes (`../brand/palettes.json`, token names as in `tokens.css`)
- P1 Current: paper, ink, amber #B4530A (accent as text 4.57 on paper, AA by a hair).
- P2 Qloo-inspired: same warm neutrals, accent #5B4BD6 (5.59), accent-text #4A3BC2 (7.10). Gradient #6B4EFF to #2E8BFF allowed on the hero lockup only. Risk: lavender stationery; hot venues lose warmth.
- P3 Ticketmaster-inspired: cool neutral #F5F6F8, ink #121417, accent #0A66D0 (5.08), accent-text #0556B8 (6.41). The pro palette, shown also on warm paper. Risk: default B2B look, the warmth goes.
- P4 Qloo x Ticketmaster: ink #1B1F3B (indigo-navy), accent #4A56E2 (5.14), accent-text #3B47CF (6.40), warm paper kept, amber kept only as the hot data colour. The two worlds meet as ink (Ticketmaster's seriousness) and signal (Qloo's intelligence) on our paper. Risk: three hues need discipline; amber stays inside charts and maps.
- P5 Bottle green (mine): warm neutrals, accent #1F5B47 (7.23, AAA), accent-text #1A4F3D (8.58), amber as hot. Premium and institutional, a hotel bar. Risk: collides with the ok colour (palettes.json quiets ok to #2B6F8E) and reads seasonal with amber at size.

## Pairings, ranked
1. 01 Threshold x P4 The blend: serious to the investor and the CTO, warm to the entertainer and the operator, amber alive on the radar for the Live Nation executive. This is what I would ship for the jury.
2. 11 Venue and bar x P3 Pro blue: the most professional combination, the warmth gone; the pitch-deck alternate.
3. 01 Threshold x P5 Bottle green: premium and warm, distinctive among blue SaaS; the ok colour needs a rethink.

---

# Third sheet: true radars, one blip (`radar2.html`)

Founder rule for this round: immediately recognisable as a radar, at most one blip (the crowd detected, in accent) plus the centre; no dot fields. Each variant is shown in P1 and, directly beneath, in the front-runner P4 (navy ink #1B1F3B, blue-violet accent #4A56E2, warm paper). Strokes 2.4 of 32 (2 px at 16), thin rings 1.8, sweep tint = accent at 18 % (`fill-opacity`), so a palette swap is one token. Blips are solid dots.

- **12 Classic.** Rings r 6 and 13.5, tinted quarter sweep with its leading edge in ink, blip r 2.2 inside the edge between the rings, centre r 1.8. 16 px: one ring (1 px, soft), tint, centre, blip; edge line dropped. The most literal, the least ownable.
- **13 Rings and door.** Same rings, doorway bracket at the centre (posts 12.5/19.5, lintel 12.5), blip on the outer ring at 150 degrees. 16 px: one ring, 8-unit bracket at 2 px, blip on the ring. Two ideas in one mark; the bracket is a 6 px block at 20 px.
- **14 Half radar.** Horizon y 22, arcs r 6.5 and 13.5, centre on the horizon, blip between the arcs. 30 x 16 units: at 20 px tall it is 38 px wide, the best header neighbour of the five. 16 px: horizon and one arc at 2 px. Weak stacked and as an app icon; can read as a sunrise.
- **15 Sweep only.** Centre dot, long arc r 15, inner arc r 8, blip past the end of the sweep. Calm; honestly reads as a tilted wifi or RSS mark before it reads as a radar.
- **16 Radar in the o.** The first o of Turnout replaced (not overdrawn) by a radar at the o's advance: measured 'Turn' 1.829 em, o 0.48 em, 'ut' from 2.309 em; ring r 13 stroke 5 at 0.47 em, tint, centre, blip. The standalone o is the favicon and survives 16 px honestly; in the 20 px word the blip is 1 px and the o reads as a ring.

**Top two:** 1. Half radar (14): a radar and a good neighbour, blip still 2.2 px at 20 px. 2. Classic (12): the most recognisable, soft rings at 16 px, best used large.
**Tomorrow, in the app header:** Half radar (14) in P4, 20 px beside the 20 px wordmark; Classic (12) for the radar page's empty state and the app icon.

---

# Fourth sheet: Classic, refined (`radar3.html`)

The founder chose the Classic approach (two rings, tinted sweep, one blip, centre) and asked for less childishness: hairlines, hierarchy, restraint. Four executions, each at 96 px on paper, in P1 and P4. Shared geometry: centre (16, 16); sweep from 12 o'clock clockwise to 50 degrees from vertical; blip at 43 degrees from vertical (detected, not pinned); tint opacity is a token (`--sweep-tint`); header rule: no stroke renders under 1 px at 20 px, so 32-unit strokes below 1.5 snap to 1.5 there; 16 px: one ring at 2 units (1 px, anti-aliased as every circle is), tint, blip r 2.6.

- **17 Dial.** Rings r 14 (1.4) and r 8 (1.0), 0.8 hairline leading edge at 58 degrees from vertical (15 degrees past the blip so they never touch), tint 12 %, blip r 1.6 at r 11, centre dot 1.2. Header: 1.6 / 1.5 / 1.5, blip 1.9. The finest at 96 px; the hierarchy flattens at 20 px.
- **18 Weighted.** Rings r 14 (1.8) and r 8.5 (1.0), no edge, tint 14 %, blip r 1.8 exactly on the inner ring, no centre. Header: inner 1.5, blip 2.0. Keeps its hierarchy at every size; the eye lands on the blip.
- **19 Open ring.** Outer ring r 14 (1.6) interrupted across the sweep plus 3 degrees each side, inner hairline r 8 (0.9), centre 1.2, blip r 1.8 in the gap at 25 degrees from vertical on r 13, tint 12 %. The opening is a door; risk: spinner.
- **20 Lens.** Rings r 14 (1.2), r 9.5 (0.9), r 5 (0.7 at 45 %), sweep graded 0 to 18 % on the hero and flat 14 % elsewhere, blip r 1.7 at r 12 (outward of the band's middle), centre empty. Most editorial; the faint ring is invisible below 48 px.

**Top one: Weighted (18).** Exact geometry for React (viewBox 0 0 32 32): outer ring r 14 stroke 1.8; inner ring r 8.5 stroke 1.0 (1.5 at header size); sweep path `M16 16 V2 A14 14 0 0 1 26.72 7.00 Z`, fill accent, fill-opacity `var(--sweep-tint, 0.14)`; blip r 1.8 (2.0 at header) at (21.80, 9.78), i.e. 43 degrees from vertical on r 8.5, solid accent; no centre, no edge line. 16 px master: ring r 13 stroke 2, tint 0.18, blip r 2.6. One colour: blip ink, no tint. Reverse: ink parts paper, tint x2, blip accent.
