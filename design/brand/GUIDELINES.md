# Turnout brand guidelines, identity "Velours" (v3.0)

For developers. Tokens: `tokens.css` (the app copy is the `:root` of `src/app/globals.css`) and `tokens.json`. The shared classes live in `src/app/globals.css`. Logo: `src/components/Logo.tsx` (sizes and lockups belong to the logo session). `index.html` and `SWEEP-CHECKLIST.md` describe the retired Marquise identity and are kept for history only.

## 1. Idea

A white page, a flat aubergine plate, a deep wine that is only ever a dot. Restraint and space do the work: no lines, no gradients, no shadows, corners 0. Names and numbers in Big Shoulders, every sentence in Instrument Sans.

## 2. Colour

| Token | Hex | Contrast | Use |
|---|---|---|---|
| `--paper` | #FFFFFF | | the page, everywhere |
| `--tone` / `--tone-2` | #F6F3F7 / #EFEAF1 | | the one quiet surface per screen; fields; its hover |
| `--plum` | #3B1C42 | 14.68 on white | the plate, primary button, links, timeline cursor |
| `--on-plum` / `--on-plum-text` / `--on-plum-muted` | #F6F1F8 / #E8DEEC / #CDBBD6 | 13.18 / 11.25 / 8.16 on plum | titles / sentences / labels on the plate |
| `--rose-on-plum` | #E6A4C2 | 7.31 on plum | the live dot on the plate |
| `--ink` | #1D1424 | 17.83 | titles, names, figures |
| `--text` | #3A3342 | 12.12 (11.02 on tone) | body |
| `--muted` | #635C6D | 6.40 (5.81 on tone) | labels, meta |
| `--wine` (`--accent`) | #84204D | 9.15 | dots and marks only |
| `--map-hot` / `--map-cold` / `--map-land` | #84204D / #BDB6C5 / #F4F2F5 | hot vs cold 4.65 | map |
| `--bar-hot` / `--bar-other` | #6A4874 / #E6E1EA | 7.52 | timeline columns |

Rules:

- Wine is a dot or a mark: hot crowds, map signs (white words 9.15), the logo needle, the score needle on the chosen moment, link hover, errors. Never a button fill, never a word, never an arrow, never decoration.
- At most one aubergine plate (`.plate`, `.card-live`) and one tone surface (`.tone`) per screen. The radar has no plate: the map is in charge.
- An object that depicts a real dark thing (the chalkboard, a screen near the venue) may be dark: ink #1D1424 slate or glass, a `--bar-hot` frame, on-plum lettering. It is an object in "What goes out", not a plate, and never takes aubergine (`.preview-board`, `.preview-screen`).
- Status folds into muted: weather is information, not an alarm. Only an error speaks wine (`--danger`).
- Body text is AAA everywhere, the plate included. Muted (6.40) is for labels and meta only.

## 3. Type

| Step | Face | Size | Leading | Class |
|---|---|---|---|---|
| Display | Big Shoulders 500 | 56 to 124 | 0.9 | `.t-display` (one hero line per screen) |
| Title | Big Shoulders 500 | 44 to 80 | 0.94 | `.t-title`, `h1` |
| Heading | Big Shoulders 500 | 32 to 48 | 1.02 | `.t-heading`, `h2.display` |
| Name | Big Shoulders 600 | 24 to 30 | 1.08 | `.t-name`, `.font-display` |
| Figure | Big Shoulders 500, tabular | any | 0.92 | `.t-figure` |
| Lead | Instrument Sans 400 | 19 to 21 | 1.6 | `.t-lead`, `text-lg` |
| Body | Instrument Sans 400 | 17 | 1.65 | `.t-body`, `text-base` |
| Small | Instrument Sans 400 | 15 | 1.6 | `.t-small`, `text-sm` |
| Label | Instrument Sans 500, muted | 14 | 1.4 | `.eyebrow`, `.t-label` |
| Meta | Instrument Sans 400, muted | 13 | 1.5 | `.t-meta`, `text-xs` |
| Clock | Instrument Sans 500, tabular | 15 | | `.t-clock`, `.mono` |

- Tailwind's `text-*` scale is retuned in `globals.css` (xs 13, sm 15, base 17, lg 20, xl 22, 2xl 26, 3xl 34, 4xl 46, 5xl 58, 6xl 72), so nothing renders under 13 px.
- A paragraph never runs past `--measure` (32em, about 70 characters at any size; `ch` is the width of a 0, 0.665 em in Instrument Sans, so 66ch set about 97). `.measure-narrow` and `.empty` hold 25em. Wide `max-w-*` on a paragraph falls back to the measure.
- Readability floor in `main`: a sentence set `text-sm` renders 17 px, a sentence set `text-xs` 15 px; 13 px stays for metadata (labels, tags, table heads, chips). Code is the size of the words around it. Clocks and distances 15 px tabular and never break across lines (`.mono`, `.tm-mono` are nowrap).
- Sentence case everywhere. No uppercase, no tracked-out labels, no italics, no serif. One exception: chalk on the chalkboard object is Big Shoulders 600 uppercase at the title size, because that is how a bar writes its board. IBM Plex Mono is retired; clocks and distances use tabular Instrument Sans.

## 4. Space and shape

- Spacing scale 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160. Sections separate by `--section` (96 to 160 px, `.stack-section`), groups by `--block` (48 to 80 px, `.stack-block`), never by a rule.
- Corners 0. Round only: map venues, the radio, the live dot.
- No lines. The only strokes left are data marks (cursor, now mark, map rings), the checkbox ring (the one boundary WCAG 1.4.11 needs) and the focus ring.

## 5. Components (`globals.css`)

- Surfaces: `.card` and `.card-flat` are frameless groups (no side or top padding, so they align with the text around them); `.tone` is the quiet surface; `.plate` / `.card-live` the aubergine plate, which re-scopes ink, text, muted, links, focus and the logo tokens to their light versions.
- Buttons: `.btn` 52 px, 16 px semibold. `.btn-primary` and `.btn-accent` aubergine; `.btn-secondary` tone; `.btn-ghost` / `.btn-text` aubergine words. On the plate the primary inverts (light fill). Sizes `.btn-lg` 60, `.btn-sm` 44. Hover lightens the fill, press deepens it.
- Links: aubergine 600, no underline, hover wine (`a.underline`, `.link`).
- Focus: a 2 px aubergine ring, 3 px offset (2 px on fields), light on the plate.
- Fields: `.field` 48 px, tone fill, 17 px; focus is the ring. `select.field` has no OS chrome and a fine aubergine chevron. Checkbox 20 px with a muted ring, aubergine when on; radio round.
- Chips: `.chip` 30 px, tone, 13 px, rare. `.chip-live` adds the wine dot.
- Score: `.score-ring` is the figure plus the Swing (quarter arc, floor, needle opening from flat to upright). Arc `--mark-arc` #806B84 (4.82 on white; #B5A6B8 on the plate), plum needle, wine on the chosen moment, rose on the plate. No bar.
- Tables: `table.data` without rules, 14 px rows, 13 px muted heads, tabular figures, cells on one baseline.
- Empty state: `.empty` with `.empty-title` and one sentence, under a quarter arc in `--mark-arc`. Loading: `.skeleton`, `.skeleton-line`, `.skeleton-title`, `.skeleton-block` in `--skeleton` #E6E1EA (1.30 on white), breathing 1 to 0.7 (opacity only, still under reduced motion).
- Focus: the 2 px aubergine ring, offset 3 px (light on the plate). Inline links draw it tight with a 2 px halo of the surface (`--focus-halo`), so it never touches the neighbouring word or a trailing period.
- Quiet select: in a header row of links, `select.field` (or `.select-quiet`) drops its fill and reads as an aubergine link with the chevron.
- Disclosure: `summary` gets an aubergine chevron that turns when open.

## 6. Data and map

- Timeline: columns plum for the window worth a campaign, grey for the rest; no surface, no day walls, no hour rules, no night bands, no tinted alternate day; day names 14 px, then the cursor tag (aubergine, 15 px tabular), then the columns; ticks 15 px tabular, event names 14 px.
- Map: borderless; flat white 44 px controls with no separators; attribution collapsed at every width to a 28 px white square with an aubergine "i", opening on hover or focus to a solid white strip, 13 px muted; the peek board white, frameless, clocks 15 px, its hot state marked by a wine dot, hidden under 560 px; hot signs wine with white words, 14 px; radius label 15 px tabular; your place an aubergine square.
- One tonal surface per screen: on the radar it is the chosen moment.

## 7. Logo

Swing, personality "live". Walls and arc aubergine (`--mark-ink` #3B1C42), needle wine (`--mark-needle` #84204D), the afterglow behind the needle one flat tint (`--mark-glow`, by default the needle at 12 % over `--mark-ground`, #F0E4EA on white): the door's swept area, never a fade. From 32 px up the arc is full ink, two thirds of the walls' weight; at 20 and 16 px it is 1 px at 65 % (`--mark-arc` #806B84). No inner ring. On the plate use `tone="reverse"`: `--mark-ink-reverse` #F6F1F8, `--mark-needle-reverse` #E6A4C2, afterglow #5A3459 (`--mark-glow-reverse`, rose at 18 % over `--plum`), `--mark-arc-reverse` #B5A6B8 at 20 and 16 px. Wordmark `--wordmark`, Big Shoulders 500.

- Sizes: header `<Wordmark size={44} phone={34} />` (48 master, 32 on phones) in a 76 px bar (64 on phones); home hero `<Wordmark size={128} phone={64} motion />` (128 master, 64 on phones), the needle swings open once, still under reduced motion. Other sizes, lockups and variants: `src/components/Logo.tsx`.
- The aubergine plate is for objects, never a whole surface: the hero plate, the favicon chip (16 px, `src/app/icon.svg`) and the apple-touch icon chip (`src/app/apple-icon.png`). The share card (`src/app/opengraph-image.png`) is the white page with the colour lockup and the promise, as the site is.
- If `globals.css` sets `--mark-glow`, set it in the plum scope too (`--mark-glow: #5A3459`), or leave both unset: the default follows `--mark-needle` and `--mark-ground`, which the plum scope already retints.

## 8. Retired

Marquise: grey concrete page #F2F3F3, white boards on a 3 px rail, hairlines, raspberry #E0115F, IBM Plex Mono, the 20-segment score bar, outlined ghost buttons, underlined links. Earlier: cream paper, serif with an italic word, Inter, uppercase tracked eyebrows, rounded soft-shadow cards, pills, dark backgrounds.
