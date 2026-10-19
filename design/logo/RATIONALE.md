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
