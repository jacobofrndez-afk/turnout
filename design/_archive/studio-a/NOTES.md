# Turnout, Studio A: rationale

## Point of view
Turnout is a sense, not a marketing tool: a good bar near the Garden already feels a show coming, and Turnout makes that instinct precise and gives it a voice. The identity should feel like hospitality first and instrument second. The six earlier sheets got the instrument right and stopped there. Our rule for this round: the mark must be a radar and, in the same lines, something that belongs to the room you are filling. Each idea gives the sweep a second life.

Palette unchanged on purpose (paper #F7F4EE, ink #17150F, amber #B4530A; reverse accent #E39A5F, 7.9:1 on ink). The surprise is in the drawing, not the colour.

## I. Swing (recommended)
- Idea: an architect draws a door on a plan as hinge, leaf and quarter arc, which is exactly a radar sweep. Leaf = leading edge (amber), arc = ring, afterglow = light spilling over the threshold, two wall stubs = the doorway.
- Why: Turnout sells one moment, the crowd outside walking in. Every owner has this symbol on their own plans; it keeps the rings, trail and crisp edge the founder liked.
- Fails: a quarter radar is less instantly "radar" than a full disc; without the wall stubs it becomes a generic fan. Never crop the walls.
- Application: partner window cling on a bar door ("the symbol on the door is a door").

## II. Coupe
- Idea: half a radar hung from a line is a capital T; add a foot and it is a coupe glass whose drink is the afterglow. Glass in ink, radar (sweep + glow) in amber.
- Why: initial, instrument and the drink the campaign sells, in four lines, in the grammar of a cocktail menu.
- Fails: says bar louder than shop; at 16 px it sits near the generic map "bar" icon; radar is the third reading.
- Application: 1080 x 1080 ad creative written for a bar near the Garden.

## III. Ola (the bold one)
- Idea: 36 ticks are the sections of a stadium bowl; the wave stands at the leading edge and sits down behind it, amber cooling to ink. The afterglow is made of people.
- Why: the only mark that literally shows turnout; a natural "listening" state for the agent; nobody in hospitality tech owns it.
- Fails: below 24 px it is a system activity spinner; some read sound or loading before crowd.
- Application: loading animation, three frames plus a live CSS version (36 steps, 2.4 s).

## Recommendation
Swing as the mark. Ola as the product motion (loading / listening). Coupe as a campaign-template object.
Wordmark note: across Turn|out the u is an n turned 180 degrees around the o; cut the final u as the exact rotation of the n.

## Swing geometry (viewBox 0 0 32 32)
- Hinge (6, 25.5). No dots.
- Walls: `M2 25.5H6`, `M26 25.5H30`, stroke 1.7, ink, butt caps.
- Swing arc: `M26 25.5A20 20 0 0 0 6 5.5`, stroke 1.0, ink.
- Ring: `M17.5 25.5A11.5 11.5 0 0 0 6 14`, stroke 0.8, ink at 55 %.
- Leaf: `M6 25.5L16.33 8.96` (58 degrees, length 19.5), stroke 1.4, accent, butt.
- Afterglow: 16 stacked sectors r 19.5 ending on the leaf; sector i starts at 58 * i / 16 degrees; opacity `1 - (1 - T_i)/(1 - T_(i-1))`, `T_i = 0.30 ((i+1)/16)^1.35`.
- 20 px master (header): 1 px = 1.6 units; hinge (6.4, 26.4), r 19.2, walls 1.6 on the 1.6 grid, arcs 1.6, ring 45 %, leaf 1.9, 12 sectors max 0.36.
- 16 px master: hinge (6, 25), walls `M2 25H6` / `M26 25H30` at 2, arc r 20 at 2, no ring, leaf 2, 6 sectors max 0.34.
- Mono: all ink, glow x0.6. Reverse: lines paper, leaf and glow #E39A5F, glow x1.25.
- Full JSX with precomputed sectors is in index.html, "Geometry for React".

## Craft and verification
- All marks are hand-specified geometry in `generate.mjs` (static SVG output, no raster, gradients built from stacked sectors).
- Pixel honesty: every horizontal and vertical stroke in the 16 px masters has both edges on even units (1 px), and in the 20 px header masters on multiples of 1.6 units (1 px). The generator asserts this and fails the build otherwise; the deck shows each master rasterised at 1x and enlarged without smoothing.
- Ola has no axis-aligned ticks at 16 / 20 px by construction (half-step offset), so nothing pretends to be crisp.
- Lockups use live text (Fraunces 500, opsz 144, -0.02em; descriptor Inter 600 justified to the wordmark width with textLength). Outline before print.
- Validation: all 21 SVGs pass `xmllint`; index.html rendered in headless Chrome at 1280 px and in a 390 px frame.

## Files
- `index.html` presentation; `01-swing.svg`, `02-coupe.svg`, `03-ola.svg` hero lockups.
- `marks/NN-name-{32,20,16,mono,mono-16,reverse}.svg`.
- `generate.mjs` (masters + checks), `deck.mjs` (builds index.html). Run `node design/studio-a/deck.mjs`.
