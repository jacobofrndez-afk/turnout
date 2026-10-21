# Turnout brand guidelines, identity "Marquise" (v2.0)

For developers. Tokens: `tokens.css` (the app copy is the `:root` of `src/app/globals.css`) and `tokens.json`. Brand sheet: `index.html` (open it in a browser). The logo masters and their generator live in `design/studio-a/` (`swing-final.mjs`, sheet `swing-final.html`); this folder holds no logo files of its own. `palettes.json` only marks the v1 palettes as superseded; it holds no palette (the retired v1 exploration is in `design/_archive/brand/palettes-v1.json`).

## 1. Idea

Stadium signage on a light page. Ink on concrete paper, white boards hung from a rail, one raspberry light that means "now". Names and numbers lead; sentences explain.

## 2. Logo: Swing, housed pivot

- Geometry: 32-unit grid, datum on the wall-top line, walls 1.5 units. The needle pivots on a round hub set into the end of the left wall (a socket with a fine paper reveal at large sizes, simplified at small sizes). The afterglow is 64 sectors from the floor line to the needle. Do not redraw it; use the masters.
- Colours: ink `#111114`; needle and afterglow `#E0115F`.
- Outer arc, thinner than the walls:
  - 128 px and above (hero-large master, native 128 / 256 / 512): 0.25 unit, so 1 px at 128 and 2 px at 256, full ink.
  - 64 px hero: 1 device px in `--mark-arc`, ink at 65 % over the page (`#606062` on paper, `#646466` on white).
  - 48, 32, 20 and 16 px: 1 px in `--mark-arc`.
  - The inner ring is never heavier than the arc.
- Masters: 16, 20, 32, 48, 64 (hero), 128 (hero-large), 180 (apple-touch). Use the nearest master; never scale a small one up.
- Wordmark: "Turnout", Big Shoulders 800, sentence case, tracking 0 (+0.005em at 23 px in the header).
- Lockup: the mark's floor sits on the wordmark baseline. App header: wordmark 23 px with the 20 px master on whole pixels and a 6 px gap; hero at 64 px with a 12 px gap.
- Files: favicon `src/app/icon.svg`; apple-touch `src/app/apple-icon.png` (from `marks/01-swing-final-180.svg`); Open Graph `src/app/opengraph-image.png` (from `01-swing-final-og.svg`); masters `design/studio-a/marks/01-swing-final-*.svg`; lockups `design/studio-a/01-swing-final.svg` and `01-swing-final-lockup-header.svg`. Only the `01-swing-final*` files are the logo.
- Don't: recolour the needle, tint the walls, round the corners, add shadows, gradients or outlines, animate it, set the wordmark in caps.

## 3. Colour

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--paper` | #F2F3F3 | | page |
| `--panel` | #FFFFFF | | boards, fields |
| `--panel-2` | #F8F8F8 | | board without a rail, nested panels |
| `--line` / `--line-strong` | #E3E4E4 / #C9CBCD | | hairlines / field borders, table heads |
| `--ink` | #111114 | 16.96 on paper | titles, figures, ink buttons, rails, the mark |
| `--text` | #26262C | 13.53 | body |
| `--muted` | #62646B | 5.31 on paper, 5.91 on white | labels, secondary text (floor for readable text) |
| `--accent` | #E0115F | 4.28 on paper, white on it 4.76 | live, hot, go: fills, marks, large type |
| `--accent-text` | #B8094B | 5.94 on paper, 6.61 on white | raspberry text under 24 px, hover of raspberry fills |
| `--accent-soft` | #FDE6EF | | live tag fill only |
| `--ok` / `--warn` / `--danger` | #0B7A4E / #8A5D00 / #B83A0A | 4.83 / 5.18 / 5.18 | status, with their `-soft` fills |
| `--map-land` / `--map-cold` / `--map-hot` | #ECEDEC / #7C8794 / #E0115F | cold 3.11 on land | map |

Rules:

- Raspberry means live, hot or go and nothing else: the needle, the hot venue, the live rail, one primary action per screen. Never decoration, never a heading colour, never a numbered list.
- Raspberry text is `--accent-text`; `--accent` as text only at 24 px and up.
- Status is green, amber, vermilion, never raspberry.

## 4. Type

- Big Shoulders (opsz 10..72, `font-optical-sizing: auto`) speaks names and numbers. Titles 800 at -0.005em, leading about 1. Hero 800, up to 90 px, leading 0.88, -0.012em. Figures 700 or 800, tabular, with the unit in 13 px muted sans after them.
- Instrument Sans speaks sentences: 400 body, 500 labels, 600 buttons.
- IBM Plex Mono 500 speaks clock, distances and hex (`.mono`).
- No italics, no uppercase, no letter-spaced labels. Labels are sentence case, Instrument Sans 500, 12 to 13 px, muted, beside or above their value (`.eyebrow` now renders exactly that).
- Only upright faces are loaded and `html` sets `font-synthesis: none`: a stray italic renders upright, never as a faked oblique or a smeared bold.

## 5. Shape

- Corners are 0 everywhere. Tailwind's radius scale is set to 0 in `globals.css`, so `rounded-*` does nothing. Only map objects are round: venues are circles (`border-radius: 50%` in CSS), your place is a square.
- Boards: white, 1 px `--line` hairline, hung from a 3 px top rail, ink by default, raspberry when live, status colour for a status. No soft shadows, no blur, no glass.

## 6. Components (shared classes in `globals.css`)

- `.card`: board with rail. Rail colour: `.card-live`, `.card-ok`, `.card-warn`, `.card-danger`, or an inline `borderColor` (it recolours the rail only).
- `.card-flat`: board without a rail, `--panel-2`.
- `.btn` + `.btn-primary` (ink fill), `.btn-accent` (raspberry fill, once per screen), `.btn-ghost` (1.5 px ink outline). 44 px tall, square, sentence case 600 / 15 px.
- `.chip`: 22 px tag, soft fill, square. `.chip-dot` adds the 6 px square dot; `.chip-live`, `.chip-ok`, `.chip-warn`, `.chip-danger` colour it.
- `.field`: 44 px, square, ink border on focus doubled by a 1 px ink ring (focus is not live, so never raspberry). Checkboxes and radios are ink.
- App header: opaque `--paper` with a 1 px `--line` bottom rule, no blur. Nav links are 44 px tall text links, Instrument Sans 500, ink, an ink underline on hover; no pills, no hover fill. "Powered by Qloo" is 12 px muted text.
- `.score-ring`: the figure plus a 20-segment marquee bar (one segment per 5 points), raspberry on hot boards, cold grey on `.card-flat`.
- `table.data`: sentence-case muted heads, hairline rows, tabular figures.
- `h1`, `h2.display`, `.font-display`: Big Shoulders 800. `.tnum`: tabular figures.

## 7. Data and map

- Scores: 20-segment marquee bar. Time series: square columns, the hot window in raspberry, "now" a 2 px ink line.
- Map (MapLibre): the style is painted from `--map-land` `#ECEDEC`, `--map-cold` `#7C8794` and `--map-hot`, so no tile filter. The hot venue is raspberry with a solid sign label, a dashed ink radius, the sweep from floor line to needle at 0 to 22 % (the logo's afterglow). Controls, attribution and popups are square with a hairline (`globals.css`).

## 8. Retired

Cream paper `#F7F4EE`, amber `#B4530A`, Fraunces and its italic accent word, Inter, uppercase tracked eyebrows, rounded soft-shadow cards, pills, frosted (blurred) headers, the threshold mark. None of it ships in the logo files, `globals.css` or the shared components; the last residues in `src/app/page.tsx`, `src/app/radar/` and `src/app/start/` are being cleared by the page owner.
