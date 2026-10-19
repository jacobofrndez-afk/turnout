# Turnout, Studio B: rationale

Open `index.html` (view at 1200 px or wider; the 16, 20 and 24 px instances render at real size, and the 16 px views are rasterised live by the browser).

## Point of view

Turnout is a verb before it is a noun: the moment a crowd turns out of the arena, round the corner, through somebody's door. The earlier sheets drew that moment as a picture inside a 32 px circle. We put it in the letters. Everything starts from Fraunces itself (its leaning "wonky" n at opsz 144, its hairline T) and from the pavement outside a venue at the hour the doors open. Palette unchanged: paper #F7F4EE, ink #17150F, amber #B4530A; on ink the accent lifts to #E0955A so it reads as light, not rust.

## 01 The Turn (recommended)

The Fraunces n, and the same n turned 180 degrees about the foot of its leaning right stem. The right foot serif is removed and both stem edges are extended 14 font units past the baseline, so the two halves fuse into one diagonal with no seam. Result: an arch standing on a street line and a cup hanging below it, point-symmetric (turn it upside down and it is still the mark). Arch in ink (outside, the arena), cup in amber (inside, the glass).

Why it is right: it is drawn from the wordmark's own letter, it needs no pictogram, and it survives the gesture it names.
Where it fails: read left to right it spells "nu" (French for naked); there is no radar in it.

Optical sizes, like the font: 48 px and up use the opsz 144 n (lean 7.4 degrees), 20 to 47 px use the opsz 24 n (lean 6.5 degrees, sturdier hairlines), below 20 px a hand-drawn 16 px master: one 4-unit (2 px) line `M6 16V10A5 5 0 0 1 16 10V22A5 5 0 0 0 26 22V16`, stems on even units, split at (16,16) into ink and amber, plus 2-unit slab serifs (`M2 14H10V16H2ZM2 6H6V8H2Z` and their 180 degree copy `M22 16H30V18H22ZM26 24H30V26H26Z`). Verified in headless Chrome: stems and serifs land on whole pixels; only the two arcs anti-alias.

Lockup: the arch is cap height and stands on the wordmark baseline; the cup hangs below the line, beside the descriptor. Header: 20 px mark (opsz 24 drawing), 9 px gap, 20 px Fraunces wordmark, both centred on the 56 px bar.

React geometry (viewBox 0 0 32 32, pivot 16,16, mark height 28 units from y 2 to 30, width 25.11 units at opsz 144 and 27.18 at opsz 24) is printed in full on the page, with path data, as a `TurnoutMark` component.

Application: loading state. A copy of the n turns 180 degrees about the pivot and becomes the cup (2.8 s loop, ease in out, reduced motion respected).

## 02 The Seal

A brasserie seal whose inner field is a working radar. 320 unit drawing: rings r 154 (2.6), r 148.5 (0.9), r 113 (1.6, the radar rim), r 70 (0.9 at 55 %); leading edge amber 2.2 at 64 degrees from 12 o'clock; afterglow 116 degrees, to 32 %, cumulative curve max * ((i+1)/N)^1.35. Rim lettering Fraunces 600 opsz 36: TURNOUT on top, tracked 0.30 em; CROWD TO CAMPAIGN below, upright, tracked 0.20 em; diamonds at 3 and 9 o'clock. Each top letter is mixed from ink to amber by the glow at its own angle, so it reads TURN in ink and OUT in amber: the letters the sweep has just passed are still warm.

Sizes: full seal at 96 px and up; 20 to 64 px the core (double rim r 14.6 / 12.4, inner ring r 6.8 at 50 %, edge, glow); 16 px master with one 2 px ring and the leading edge turned to 3 o'clock so it lands on pixel rows 7 and 8.

Why it is right: everything the founder liked in the radar (rings, afterglow, a crisp leading edge) given a hospitable house.
Where it fails: the most expected of the three; at 24 px it is one more radar icon.

Application: phone home screen with the core as the app icon and a "Garden lets out at 22:40" widget.

## 03 The Opening

Turnout is two words. The wordmark parts "Turn" and "out" by 0.15 em, the baseline becomes a facade seen from above (0.034 em thick, 0.028 em under the baseline), it breaks at the door, and warm light falls through the opening onto the pavement (one linear gradient, 0.62 em deep, 0.2 em flare). Cropped, the doorway is a T: the crossbar is the wall (3.0 of 32), parted by a 5.2 door (the Fraunces T's stem ratio), and the stem is the light, 100 % to 16 % over 22.6 units with 1.4 flare each side. 16 px master: crossbar on rows 2 and 3, door 4 px, light in four bands on whole rows at 100 / 60 / 36 / 18 %. Verified: zero anti-aliased pixels.

Why it is right: the only idea that shows outside and inside at once, and a layout gesture for every campaign the agent writes.
Where it fails: splitting the name can read as an instruction, and alone at 24 px the T of light can look like a T running out of ink.

Application: a 1080 x 1080 owner ad whose layout is the facade line and its open door.

## Craft notes

- Wordmark, The Turn and the seal lettering are real Fraunces outlines (Google Fonts build as served to this project), rendered by Chrome/Skia to PDF and read back from the Type3 glyph procedures; descriptor outlines are Inter 600 at 0.14 em. Masters therefore render identically without the fonts installed. Data: `_build/glyphs.json`.
- Afterglows in the seal are baked as opaque slices against the known background (paper, or ink for the reverse). Stacking dozens of faint transparent sectors drifts in 8-bit compositing (the tail turned pink in Chrome: measured 245,231,224 instead of 246,241,233). For use on arbitrary backgrounds, the 14-step transparent stack from the sixth sheet or a CSS conic-gradient is the right tool.
- No raster anywhere in the marks. The only gradient is the light of The Opening.
- Rebuild: `node design/studio-b/_build/gen.mjs` (writes the three lockup masters, `marks/`, and `index.html`).

## Files

- `01-the-turn.svg`, `02-the-seal.svg`, `03-the-opening.svg`: horizontal lockup masters (outlined, transparent background).
- `marks/`: for each idea a hero drawing (128), the 32 px master, the 16 px master, one-colour and reverse.
- `index.html`: the presentation.
- `_build/`: generator (`gen.mjs`, `marks.mjs`) and glyph outlines.
