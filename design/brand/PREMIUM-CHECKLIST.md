# Velours premium checklist for the build session

One commit. The design system already lives in `src/app/globals.css` (tokens, `.plate`, `.tone`, `.btn*`, `.link`, `.field`, `.score-ring`, `.empty`, `.skeleton`, `.t-*` scale, RADAR CHROME, MapLibre chrome) and the Velours logo in `src/components/Logo.tsx`, `src/app/icon.svg`, `src/app/apple-icon.png`, `src/app/opengraph-image.png`, `public/logo.svg`. Items 1 to 90 and 97 to 104 are in files the build session owns and take the pages to the full design; 91 to 96 and 105 to 107 are for the design session (globals.css), listed so nothing is lost. The markup still carries Marquise frames, underlines, tiny sizes and the old header.

Evidence: the current pages rendered on 2026-10-23 at 1440x900 and 390x844 (DSF 2, load + 4 s) with a DOM audit per page, in `.tmp/velours/checklist/` (`<page>-1440.png`, `<page>-390.png`, `<page>-<w>.json`, crops `c-*.png`), and again after the system and logo passes in `.tmp/velours/checklist/r2/` (same names, crops `c-radar-top.png`, `c-radar390-top.png`, `c-home-top.png`, `c-today390-top.png`). Verifier renders: `.tmp/velours/verify-premium-r1/`, `.tmp/velours/verify-build-r1/`, `.tmp/velours/verify-readability-r1/`. Re-run: `node .tmp/velours/checklist/shot.mjs .tmp/velours/checklist/r2/jobs.json checklist`.

How to apply: line numbers are the files as of those renders (none of the page files changed between them). Inside one file, apply the items from the highest line to the lowest so the cited numbers stay true. "old -> new" quotes the class list or value to replace; keep everything not quoted. Item numbers are stable across passes (other notes cite them): items added in a later pass (97 to 104) sit in their page section at their rank, not at the end. Highest impact overall: 27 and 28 (home hero logo), 73 (header logo), 1, 2 and 10 (Today: one plate, one hero), 12, 97 and 26 (radar: one action per selection, wine as a mark only), 30 (home plate), 36 and 38 (home without the landing-page template).

## Where it stands (verifier verdict, 2026-10-23)

- Not more premium than the Velours render yet, at 1440 and 390, on today, radar, home and campaigns/new. Palette and type are at parity; the components are better than the render (drawn select chevron, 48 px tone fields, the 2 px ring, the score mark, the empty state, the skeleton: `.tmp/velours/verify-premium-r1/specimen-1440.png`).
- Composition falls behind because the render hid by injected CSS what the live pages still show: the tagline, the home trust row and Score cell, kind labels, 19 repeated "See who is coming" links, the timeline legend. Today has no plate (`today-1440.png` against `.tmp/premium-dir/velours/today-1440.png`), the radar h1 is 46 px where the render had about 76, home brings back the Score cell and the trust row.
- None of the page items has landed: the r2 audit still finds the 36 px header lockup with "crowd to campaign" in a 65 px bar, no hero lockup on home (one mark on the page), home h1 90 px at -1.08 px tracking, Today h1 72 px over a 64 px h2, 11 and 12 px text on campaigns/[id].
- Requirement 4 (the logo bigger) is invisible on every live page until items 73, 74, 27 and 28 land; Logo.tsx itself is right (injected markup lands on whole pixels: `.tmp/velours/verify-build-r1/inject-home-1440-2x.png`, `inject-home-390-2x.png`).
- Estimate once items 1 to 104 land: about 7.5 out of 10. Then re-render (items 85 to 89) and re-judge against the render.

## The Velours system in 12 lines

- S1. White page #FFFFFF everywhere. One quiet tone #F6F3F7 (`.tone`) at most once per screen: the chosen moment, the latest alert, a block to pick from.
- S2. One flat aubergine plate #3B1C42 (`.plate`) at most once per screen: Today's campaign, Home's live crowd, a campaign's chosen offer, Pulse's weekly offer. Radar has none (the map is in charge).
- S3. Ink #1D1424 for titles, names, figures; text #3A3342 for sentences; muted #635C6D for labels and meta. Inside `.plate` these re-scope by themselves to #F6F1F8, #E8DEEC, #CDBBD6, so inline `var(--ink)` / `var(--text)` / `var(--muted)` keep working there.
- S4. Deep wine #84204D is a dot or a mark only (live dot, hot crowd, map sign, logo needle). Never a word, a button, a border or a heading. On the plate the dot turns dusty rose #E6A4C2.
- S5. No lines: no `border`, `border-t`, `borderColor`, rail, hairline box, rule, underline, outlined button. Space separates: `.stack-section` (96 to 160 px) between sections, `.stack-block` (48 to 80 px) between groups.
- S6. No gradients, no shadows, corners 0, no arrows (← →), no ★, no uppercase, no negative tracking, no italics.
- S7. Big Shoulders 500 for titles and figures (`.t-display` 56 to 124 px, `.t-title` 44 to 80, `.t-heading` 32 to 48, `.t-figure`), 600 for names (`.t-name` 24 to 30). Instrument Sans for every sentence. IBM Plex Mono is retired: clocks and distances are tabular Instrument Sans (`.mono`, `.tnum`, `.t-clock`).
- S8. Body 17 px (`text-base`, leading 1.65); `text-sm` is 15 px for secondary sentences; `text-xs` is 13 px and only for metadata (dates, sources, footnotes). Lead `.t-lead` 19 to 21 px. Nothing under 13 px.
- S9. Buttons: `.btn .btn-accent` is the primary (aubergine, one per screen, inverts to light on the plate), `.btn-lg` on heroes, `.btn-secondary` (tone), `.btn-text`. The second action is always a `.link`, never a second button.
- S10. Links: `.link` (aubergine 600, no underline, wine on hover, light on the plate). Fields: `.field` (tone fill, no outline, 48 px, 17 px). Select: `select.field` (drawn chevron). Checkboxes: native inputs, drawn by globals. Focus: the 2 px aubergine ring, offset 3 px, everywhere.
- S11. Data: `.score-ring` (one Big Shoulders figure and the Swing needle, on the chosen moment only), `table.data` (no rules), `.chip` only for a real status, tag lists as dot-separated sentences, `.empty` and `.skeleton` for empty and loading.
- S12. Logo: the Swing in Velours (aubergine walls and word, wine needle). Header lockup 44 px word (34 on phones) in a 76 px bar (64 on phones); home hero lockup 128 px (64 on phones), needle swinging open once on load ("live" personality).

## Readability rules (check every item against them)

- R1. Body copy 17 px minimum (`text-base` or `.t-body`), leading 1.6 to 1.7. Any sentence longer than one line that is `text-sm` or `text-xs` today moves up one step.
- R2. Nothing under 13 px. `text-[11px]`, `text-[12px]`, `fontSize: 11`, map `text-size` 10.5 and 12 all go. 13 px (`text-xs`, `.t-meta`) only for metadata.
- R3. Clocks and distances at least 15 px and tabular: `text-sm` + `tnum`, or `.t-clock`.
- R4. Measure 65 to 75 characters: paragraphs inherit `max-width: var(--measure)` from globals; add `measure` on any `div` of prose, never a wider `max-w-*` on a paragraph.
- R5. Contrast, computed: on white ink 17.83, text 12.12, muted 6.40, link 14.68, wine 9.15; on tone muted 5.81, placeholder 4.58; on the plate title #F6F1F8 13.18, sentences #E8DEEC 11.25, labels #CDBBD6 8.16, rose dot 7.31, light button with aubergine words 13.18. Never put a hard-coded grey or `opacity` on text.
- R6. A non-breaking space between a number and its unit: `7&nbsp;pm`, `1.3&nbsp;km`, `900&nbsp;m`, `12&nbsp;min` (see item 82). A non-breaking hyphen in a range (`25‑29`, `‑`) and a true minus in a signed figure (`−0.72`, `−`) (item 102). A non-breaking space before a list dot (`Gucci · Dior`), so no line starts with "·" (item 103).
- R7. Labels sit in sentence case, 14 to 15 px, never uppercase or tracked.

## Logo: which personality

The four variants in `.tmp/personality/` (board `.tmp/personality/board.png`): live, signal, plate, marquee. Velours takes **live** ("En direct"): the Swing at full size, the needle swings open once when the home hero first draws (900 ms, rest state pixel-identical to the master, still under reduced motion), and a small round wine dot lights after the word while a crowd is live. Signal (thicker needle, heavy afterglow) is louder than the restraint the founder asked for; plate is a dark block (no dark backgrounds); marquee draws an underline rail (no lines, and it reads as a link). The header mark never moves; the motion runs once per page, on the home hero only. Items 27, 28, 73 and 90 wire it.

Second pass (logo verifiers): no gradient and no hairline in the mark. The afterglow is one flat tint between the floor and the needle (#F0E4EA on white, #5A3459 on the plate), the door's swept area instead of a fade; the inner ring is dropped; the arc is full ink at two thirds of the walls' weight from 32 px up (4 px at 128, 2 px at 64 and 48, 1 px at 32), so mark and word carry the same weight. The share card is the white page (the plate stays for the favicon and apple-icon chips): checked after the verifier flagged an 88.9 % plum card, `design/studio-a/swing-final.mjs` L875 now has `plate: false` and `src/app/opengraph-image.png` is the white page with the colour lockup (item 107). Renders: `.tmp/velours/logo/r2-*.png`, `assets-board.png`, `motion-frames.png`.

---

## /today (`src/app/today/page.tsx`)

1. **L106-118, the drafted campaign becomes the one plate.** Replace L107-118 with:
    ```tsx
    <section className="stack-block">
      <div className="plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">
        <p className="eyebrow flex items-center gap-3"><span className="live-dot" aria-hidden="true" />Your campaign for {dayOf(w0.start).toLowerCase()}, ready to publish</p>
        <h2 className="t-display mt-5">{offer?.title ?? draft.chosen_offer_id}</h2>
        {offer && <p className="t-lead mt-5">{offer.description}. {offer.price}.</p>}
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <form action={`/api/campaigns/${campaign.id}/approve`} method="post">
            <button className="btn btn-accent btn-lg">Publish it now</button>
          </form>
          <Link href={`/campaigns/${campaign.id}`} className="link text-base">Read every word, change anything</Link>
        </div>
      </div>
    ```
    (the section's closing tag stays at L142). Why: one aubergine plate holds the decision. The main column is `max-w-5xl px-6` (976 px of text), the header `max-w-6xl px-5` (1112 px): from 1152 px wide the plate bleeds 68 px each side so its edges land on the logo's left wall and on "Powered by Qloo", while its words stay on the page column. The button inverts to light on aubergine by itself (13.18). The inline `fontSize: clamp(44px, 6.5vw, 76px)` and `letterSpacing: -0.01em` go: negative tracking is retired and `.t-display` runs 56 to 124 px. The `!` beats the unlayered `.plate { padding }` in globals.
2. **L144-176, the next crowd gets the same plate.** Wrap L145-176 in `<div className="plate min-[1152px]:-mx-[68px] min-[1152px]:px-[68px]!">`; `section className="mt-16"` (L144) -> `"stack-block"`; L145 `<p className="eyebrow">` -> `<p className="eyebrow flex items-center gap-3"><span className="live-dot" aria-hidden="true" />`; L146 `className="display mt-3" style={{ fontSize: "clamp(40px, 5.5vw, 64px)", lineHeight: 0.98, letterSpacing: "-0.01em" }}` -> `className="t-title mt-5"` (event names run long: "It's Up for Debate: Andrew Yang vs. Scott Jennings" would take four lines at display size); L147 `mt-4 max-w-3xl text-lg leading-relaxed` + inline colour -> `t-lead mt-5`; L148 `mt-8` -> `mt-10`; L151, L156, L162 `font-display text-3xl` -> `t-name`; L157, L163 drop the inline colour (muted re-scopes on the plate); L167 `gap-6` -> `gap-x-8 gap-y-4`. Why: the same hero whatever the campaign state; one plate per screen.
3. **L75, L113, L164, L171: drop `hugeBtn`.** Delete L75 (`const hugeBtn = ...`); each `className="btn btn-accent" style={hugeBtn}` and `className="btn btn-accent mt-5" style={hugeBtn}` -> `className="btn btn-accent btn-lg"` / `"btn btn-accent btn-lg mt-6"`. Why: `.btn-lg` is the designed hero size (60 px, 17 px semibold, padding 36).
4. **L94, L115, L152, L158, L173, L204, L219, L238: links.** Every `underline underline-offset-4 decoration-[1.5px]` + `style={{ color: "var(--ink)" }}` -> `link` (keep `text-base`, `mt-*`, `inline-flex`); L24 `className="underline"` -> `className="link"`. Why: aubergine 600 links, no underline, wine on hover, light on the plate.
5. **L120-135, the three texts.** L120 `mt-14 grid gap-10 md:grid-cols-3` -> `stack-block grid gap-x-16 gap-y-12 md:grid-cols-3`; L123 `mt-3 whitespace-pre-wrap font-display text-[28px] leading-[1.05]` + inline -> `t-name mt-4 whitespace-pre-wrap`; L127 `mt-3 whitespace-pre-wrap text-[17px] leading-relaxed` + inline -> `t-body mt-4 whitespace-pre-wrap`; L131 `mt-3 font-display text-[26px] leading-[1.05]` + inline -> `t-name mt-4`; L132 `mt-2 text-[17px] leading-relaxed` + inline -> `t-body mt-3`; L133 `mt-3 text-sm` + inline -> `mt-4 text-sm text-[var(--muted)] tnum` (it carries clocks: 15 px); L130 `{draft.geofenced_ad.radius_m} m` -> `{draft.geofenced_ad.radius_m}&nbsp;m`. Why: frameless columns with a real gutter, names in the display face, the scale instead of pixel values.
6. **L137-141, the reason.** `mt-14 max-w-3xl` -> `stack-section max-w-3xl`; L139 `mt-3 text-lg leading-relaxed` + inline -> `t-lead mt-4`; L140 `mt-3 text-base leading-relaxed` + inline -> `t-body mt-4 text-[var(--muted)]`.
7. **L186-221, what else is coming.** L186 `mt-20 grid gap-16 md:grid-cols-2` -> `stack-section grid gap-x-24 gap-y-20 md:grid-cols-2`; L190 `mt-3 space-y-6` -> `mt-6 space-y-10`; L195 `text-sm` + inline -> `text-sm text-[var(--muted)] tnum`; L198 `mt-1 font-display text-2xl leading-tight` -> `t-name mt-2`; L199, L212 drop the inline colour; L211 `mt-3 font-display text-2xl leading-tight` -> `t-name mt-4`; L213 `mt-5 whitespace-pre-wrap font-display text-[26px] leading-[1.05]` + inline -> `t-name mt-6 whitespace-pre-wrap`.
8. **L216-218, empty state.** Replace the bare paragraph with `<div className="empty"><p className="empty-title">No weekly plan yet</p><p>Turnout reads the people who walk past your door on a normal day and picks the offer to feature all week.</p></div>`; same at L189 (`<div className="empty"><p className="empty-title">Nothing else this week</p><p>Nothing else worth a campaign in the next two days.</p></div>`) and L226 (`empty-title` "Nothing yet", then the sentence). Why: the designed empty state (the Swing's quarter arc, a name, one sentence) instead of a lone grey line (today-1440.png, right column).
9. **L223-238, the log as two clean columns, the WhatsApp status said once.** `mt-20` -> `stack-section`; L228 `mt-3 space-y-2 text-base` -> `mt-6 space-y-4 text-base`; L230 `flex flex-wrap items-baseline gap-x-4` -> `grid grid-cols-[6.5rem_1fr] items-baseline gap-x-6 sm:grid-cols-[6.5rem_1fr_auto]`; L231 `mono text-sm` + inline -> `t-clock text-[var(--muted)]`; L232 drop the inline colour; L233 -> `{a.status === "failed" && <span className="col-start-2 text-sm text-[var(--danger)] sm:col-start-auto">Failed to send</span>}` (a row speaks only when it failed). After the `</ul>` (L236) add
    ```tsx
    <p className="mt-5 text-sm text-[var(--muted)]">{alerts.some((a) => a.status === "simulated") ? "Recorded here; WhatsApp is not connected yet." : "Each one was sent to you on WhatsApp."}</p>
    ```
    (wrap the `<ul>` branch of the ternary, L228-236, in `<>...</>` so the sentence sits under the list). Why: today-1440.png (r2) shows inline runs, so the second column wobbles (the event starts at x 389 after "Fri 12:52", x 400 after "Thu 07:45") and "recorded, WhatsApp not connected" wraps under every row: a raw log. A 6.5 rem clock column holds "Thu 07:45" at 15 px tabular.
10. **L85-98, page title: one hero.** L87 `mt-2 text-5xl md:text-6xl` -> `t-heading mt-3` in every state; L86 stays `eyebrow`. Why: items 1 and 2 put a `t-display` / `t-title` plate title right under it, and a `t-title` page title would land at about 78 px next to a 78 px plate title (two heroes; r2 already shows h1 72 px over an h2 of 64 px, four lines on phones: `c-today390-top.png`). At `t-heading` (32 to 48 px) the place name reads as the page's label and the offer or the crowd is the one hero. With nothing coming, item 11's `t-title` h2 is the hero.
11. **L101-103, error.** `mt-8 text-sm` + inline -> `mt-8 bg-[var(--danger-soft)] px-5 py-4 text-base text-[var(--danger)]`; L179-183 (nothing coming): L181 `display mt-3 text-5xl` -> `t-title mt-4`, L182 `mt-4 max-w-2xl text-lg` + inline -> `t-lead mt-5 text-[var(--muted)]`. No plate when there is nothing to act on.

## /radar (`src/app/radar/page.tsx`, `RadarView.tsx`, `RadarMap.tsx`, `radar.css`, `MerchantSwitch.tsx`)

12. **RadarView L426-456, one action per selection.** L426 the `className={`${it.interesting ? (isSel ? "card card-live" : "card") : "card-flat"} p-4${isSel ? " tm-card-sel" : ""}`}` and its `style` -> `className={isSel ? "tone tm-card-sel" : undefined}` (no style). L432 delete the kind label line. L433 `truncate font-display text-lg` -> `t-name mt-1 text-balance` (no ellipsis on a name). L434 `truncate text-sm` + inline -> `mt-1 line-clamp-2 text-sm text-[var(--muted)]`, and L435 puts the figures first, the places last (a clamp then cuts a list of shows, never the crowd size):
    ```tsx
    {it.kind === "venue" || it.kind === "street" ? <><span className="tm-mono">{it.distanceKm.toFixed(1)}&nbsp;km</span> · </> : null}~<span className="tm-mono">{it.capacity.toLocaleString("en-US")}</span>&nbsp;people{it.kind === "venue" || it.kind === "wave" ? "" : " (estimate)"} · {it.kind === "venue" ? it.venue : (it.blurb ?? it.venue)}
    ```
    (verifier: 16 truncated lines at 1440 and 21 at 390, "Manhattan Center Hammerstein Ballroom · 0.4 km · ~3,500 pe..."). L438 `text-sm` + inline -> `mt-2 text-base`. L442 `{it.weather && (` -> `{isSel && it.weather && (`, L443 `mt-1 text-xs font-semibold` + the warn/ok style -> `mt-3 text-sm text-[var(--muted)]`. L448-450 render the score only when `isSel`: `{isSel && (<div className="score-ring shrink-0" ...>...</div>)}`. L452 `{it.interesting && (` -> `{isSel && it.interesting && (`, L453 className -> `"btn btn-accent mt-6"`. Why: radar-1440.png and radar-390.png show 19 moments each with a figure, a needle, a weather line and the same link (19 calls to action). The chosen one sits on the tone with one calm score (its needle lights wine) and one button; the others are a name, a place and the guests sentence. Names wrap instead of "Theatre crowd arriving, 34 ...".
13. **radar.css, the map stays with the list.** Add `@media (min-width: 1024px) { .tm-root:not(.is-full):not(:fullscreen) .tm-maparea { position: sticky; top: 100px; } }`. Why: at 1440 the list runs about 4,000 px under an empty left column (c-radar-mid.png); 100 = the 76 px sticky header + 24. Full screen keeps its own grid.
14. **RadarView L418-419, list title and empty state.** L418 `<p className="eyebrow">` -> `<h2 className="t-heading">`. L419 -> `{groups.size === 0 && <div className="empty"><p className="empty-title">Nothing worth a campaign yet</p><p>No crowd big enough for your {merchant.seats} seats in the next {hours} hours. Show every event nearby to see the smaller ones.</p></div>}` (the old text pointed to an "All" switch that no longer exists).
15. **RadarView L358-361, L369, L405-414, timeline chrome.** Delete the `nights.map(...)` block (L359-361), the `tm-tickline` span (L369; keep the `tm-tick` label), and the legend `<p className="tm-legend">` (L405-414). Why: no night bands, no hour rules, no legend in Velours; CSS already hides the first two, so they are dead markup.
16. **RadarView L401, the cursor label on phones.** `{`${cursorPeople.toLocaleString("en-US")} people around`}` -> `<>{cursorPeople.toLocaleString("en-US")} <span className="tm-wide">people </span>around</>`; radar.css add `@media (max-width: 640px) { .tm-wide { display: none; } }`. Why: at 390 the label "Today 17:30 · 11,500 people around" runs past the scroll edge (r2 `c-radar390-top.png`: "11,500 peo"); "Today 17:30 · 11,500 around" fits. Items 100 and 101 keep it and the event labels inside the visible window.
100. **RadarView L186-191 and radar.css L67, the timeline opens on the cursor and the day name stays.** Add `const placed = useRef(false);` after L92, and replace the effect L186-191 with
    ```tsx
    useEffect(() => {
      const el = scrollRef.current;
      if (!el || el.scrollWidth <= el.clientWidth) return;
      const x = ((cursor - t0) / span) * el.scrollWidth;
      if (!placed.current) {
        placed.current = true;
        el.scrollLeft = Math.max(0, x - el.clientWidth * 0.3);
        return;
      }
      if (x < el.scrollLeft + el.clientWidth * 0.15 || x > el.scrollLeft + el.clientWidth * 0.75) el.scrollTo({ left: Math.max(0, x - el.clientWidth * 0.3), behavior: "smooth" });
    }, [cursor, zoom, full]); // eslint-disable-line react-hooks/exhaustive-deps
    ```
    radar.css L67 `.tm-day b { position: absolute; top: 7px; left: 9px; font-size: 12px; ... }` -> `.tm-day b { position: sticky; left: 12px; display: inline-block; white-space: nowrap; }` (globals keeps its type and its `top: 6px`, which a sticky box honours too). Why: at 390 the page opens with "Today" and the empty past on screen while "Tomorrow" is cut to "Tom" and "Knicks at Celtics on T" at the edge (r2 `c-radar390-top.png`); the cursor at 30 % shows what is coming, and a sticky day name is never clipped at the left edge while you scroll through its day.
101. **RadarView L384-402, labels flip against the visible window, not the track.** Add after L92: `const [edge, setEdge] = useState<{ cursor: boolean; left: Set<string> }>({ cursor: false, left: new Set() });` and after the effect of item 100:
    ```tsx
    // A label that would run past the visible edge of the scroller goes to the left of its line or dot.
    useEffect(() => {
      const el = scrollRef.current;
      if (!el) return;
      const check = () => {
        const right = el.scrollLeft + el.clientWidth - 8;
        const lbl = el.querySelector<HTMLElement>(".tm-cursor i");
        const cursorOut = ((cursor - t0) / span) * el.scrollWidth + 8 + (lbl?.offsetWidth ?? 0) > right;
        const left = new Set<string>();
        for (const b of el.querySelectorAll<HTMLElement>(".tm-ev.lbl")) {
          if ((parseFloat(b.style.left) / 100) * el.scrollWidth + b.offsetWidth > right) left.add(b.dataset.id ?? "");
        }
        setEdge((p) => (p.cursor === cursorOut && p.left.size === left.size && [...left].every((k) => p.left.has(k)) ? p : { cursor: cursorOut, left }));
      };
      check();
      el.addEventListener("scroll", check, { passive: true });
      return () => el.removeEventListener("scroll", check);
    }, [cursor, zoom, full, cursorPeople, markers]); // eslint-disable-line react-hooks/exhaustive-deps
    ```
    L385-388: add `data-id={c.id}` on the button and `${edge.left.has(c.id) ? " left" : ""}` at the end of its className. L400 `${cursorPct > 80 ? " flip" : ""}` -> `${edge.cursor ? " flip" : ""}`. radar.css add `.tm-ev.left { flex-direction: row-reverse; transform: translateX(calc(-100% + var(--s) / 2)); }`. Why: measured at 390, the cursor label spans x 200 to 466 while the scroller ends at 370 (96 px cut, `.flip` not applied because the cursor sits at 40 % of the track), and "Knicks at Celtics on TV" spans 224 to 386. Widths are read from the unflipped box (`style.left`, `offsetWidth`), so a flipped label never flips back and forth.
17. **page.tsx L72-92, header.** L72 `max-w-[1200px]` -> `max-w-6xl` (the header measure: the title starts on the logo's left wall). L76 `mt-1 text-4xl` -> `t-title mt-2`. L77 `mt-1 text-sm` + inline -> `mt-3 text-base text-[var(--muted)]`, and the radius strings get `&nbsp;` (`` `${...}\u00A0km` ``, `` `${merchant.radius_m}\u00A0m` ``). L81 `flex flex-wrap items-center gap-3 text-sm` -> `flex flex-wrap items-center gap-x-6 gap-y-4`, and move `<MerchantSwitch .../>` (L85) first, before the Today link. L82, L86, L89 `font-semibold underline underline-offset-4 decoration-[1.5px]` + inline -> `link text-base`. L19 `className="underline"` -> `"link"`. L96 error -> `mt-6 bg-[var(--danger-soft)] px-5 py-4 text-base text-[var(--danger)]`. Why: at 390 "Weekly pulse" wraps alone on a second row; with the select first, the three links share one row.
18. **MerchantSwitch L13.** `style={{ width: "auto", padding: "6px 10px", fontSize: 13 }}` -> `style={{ width: "auto" }}`. Why: the select keeps its drawn chevron room and 17 px words (in the header it is the quiet select: no fill, an aubergine link with the chevron, drawn by globals); the design session then deletes the `!important` patch in globals (item 93).
19. **RadarMap L362, L391-398, L210-218, map labels readable and clear of the signs.** L362 ring-label `"text-size": 10.5` -> `15` (a distance and a walking time: R3; `FONT` is already Noto Sans Regular). L396 venue-label layout -> `{ "text-field": ["get", "label"], "text-font": FONT_BOLD, "text-size": 13, "text-variable-anchor": ["left", "right", "top", "bottom"], "text-radial-offset": 0.9, "text-justify": "auto", "text-max-width": 9, "text-padding": 4 }` (no `text-allow-overlap`: collision stays on); L395 filter -> `["==", ["get", "labelled"], 1]`. Replace the `src?.setData(...)` call (L210-218) with a function that drops the label of any venue within 80 px of a sign, re-run on zoom:
    ```ts
    const labelData = () => {
      const signed = points.filter((q) => q.hot && q.tonight && !q.selected).map((q) => m.project([q.lon, q.lat]));
      const nearSign = (p: MapPoint) => { const a = m.project([p.lon, p.lat]); return signed.some((b) => Math.hypot(a.x - b.x, a.y - b.y) < 80); };
      m.getSource("venues")?.setData({
        type: "FeatureCollection",
        features: points.map((p) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [p.lon, p.lat] },
          properties: { eventId: p.eventId, label: p.label, cap: p.capacity, hot: p.hot ? 1 : 0, tonight: p.tonight ? 1 : 0, active: p.active ? 1 : 0, selected: p.selected ? 1 : 0, labelled: p.active && !p.selected && !(p.hot && p.tonight) && !nearSign(p) ? 1 : 0 },
        })),
      });
    };
    labelData();
    m.on("zoomend", labelData);
    ```
    and the effect's cleanup (L316) -> `return () => { clearTimeout(settle); m.off("zoomend", labelData); };`. Needs `tonight` from item 26. Why: the canvas labels escape the DOM audits: ring distances at 10.5 px, cold names at 12 px, and "School Girls; Or, The African Mean Girls Play (NY)" runs under the "Buena Vista Social Club" sign with "NY)" sticking out, "Oh Mary! (NY)" under the MANHATTAN base label (`.tmp/velours/verify-premium-r1/c-radar-map.png`, r2 `c-radar-top.png`).
20. **RadarMap L118-121, the base map in Velours tints.** After `style = await (await fetch(STYLE_URL)).json();` insert `style = velours(style, palette());` and add at module level:
    ```ts
    // Velours base map: the positron style recoloured once at load, no CSS filter. Land is --map-land; the rest are
    // aubergine tints of it. Street labels in --muted (5.75 on land), place labels #4A4252 (8.61).
    function velours(style: ML, P: Palette): ML {
      const C = { land: P.paper, park: "#EEEAF0", water: "#E4DEE8", building: "#ECE8EF", edge: P.lineStrong, road: "#FFFFFF", minor: "#FAF9FB", casing: P.lineStrong, rail: "#DDD7E1", dash: "#F8F6F9", boundary: "#C9C1CF", label: P.muted, place: "#4A4252" };
      for (const l of style.layers ?? []) {
        const id: string = l.id, p = (l.paint = l.paint ?? {});
        if (l.type === "background") p["background-color"] = C.land;
        else if (l.type === "fill") {
          if (id === "water") p["fill-color"] = C.water;
          else if (id === "park" || id === "landcover_wood") p["fill-color"] = C.park;
          else if (id === "building") { p["fill-color"] = C.building; p["fill-outline-color"] = C.edge; }
          else if (id.startsWith("aeroway")) p["fill-color"] = C.minor;
          else p["fill-color"] = C.land;
        } else if (l.type === "line") {
          if (id === "waterway") p["line-color"] = C.water;
          else if (id.includes("casing") || id.endsWith("_subtle")) p["line-color"] = C.casing;
          else if (id.includes("dashline")) p["line-color"] = C.dash;
          else if (id.startsWith("railway")) p["line-color"] = C.rail;
          else if (id.startsWith("boundary")) p["line-color"] = C.boundary;
          else if (id === "highway_minor" || id === "highway_path") p["line-color"] = C.minor;
          else if (id === "road_pier") p["line-color"] = C.land;
          else p["line-color"] = C.road;
        } else if (l.type === "symbol" && l.layout?.["text-field"]) {
          p["text-color"] = id.startsWith("label_") ? C.place : C.label;
          p["text-halo-color"] = C.land;
          p["text-halo-width"] = 1.4;
          p["text-halo-blur"] = 0;
        }
      }
      return style;
    }
    ```
    Why: the positron greys (#E8E8E8 land, blue-grey water) are the last cold grey surface on the site; the map now reads as the same paper as the page. Same layer ids as the monochrome pass already proven in `.tmp/premium-dir/contraste/inject.mjs`.
21. **RadarMap L383-389, hollow cold venues.** In `palette()` (L61-83) add `coldRing: resolveColor(tok("--map-cold-ring", "#8E8598"), "#8E8598")` (and `coldRing: string` in the `Palette` type, L40). venue-dot paint -> `"circle-radius": ["case", ["==", ["get", "hot"], 1], 7, 4.5]`, `"circle-color": ["case", ["==", ["get", "hot"], 1], P.accent, P.panel]`, `"circle-stroke-color": ["case", ["==", ["get", "selected"], 1], P.ink, ["==", ["get", "hot"], 1], P.panel, P.coldRing]`, `"circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 2.5, ["==", ["get", "hot"], 1], 1.8, 1.5]`. Why: hot is a filled wine disc, cold a hollow ring (#8E8598, 3.17 on land), so the state never depends on hue alone (cold #BDB6C5 is 1.77 on land today).
97. **RadarMap L365-377, no wine areas: venue-mass becomes a quiet plum tint for tonight's crowds at the cursor only.** Replace the layer with
    ```ts
    m.addLayer({
      id: "venue-mass",
      type: "circle",
      source: "venues",
      filter: ["all", ["==", ["get", "tonight"], 1], ["==", ["get", "active"], 1]],
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, ["*", 0.12, ["sqrt", ["get", "cap"]]], 16, ["*", 0.34, ["sqrt", ["get", "cap"]]]],
        "circle-color": P.bar,
        "circle-opacity": 0.08,
        "circle-stroke-width": 0,
      },
    });
    ```
    (`tonight` and `P.bar` come from item 26, which is now mandatory). Why: hot crowds draw translucent wine discs (fill 0.14, a 1 px stroke at 0.6), so wine becomes an area and a line instead of "a dot or a mark only", and cold masses add grey haze (`.tmp/velours/verify-premium-r1/c-radar-map.png`, r2 `c-radar-top.png`: the pink discs round Harry Styles and the theatre cluster). The crowd's size still reads, in plum at 8 %, without a ring.
22. **Peek on phones: hidden by CSS, not built, above the place.** globals.css hides it under 560 px today and moves to 639 px (item 105). radar.css: L12 `z-index: 3` -> `z-index: 2`; L14 `.tm-peek.maplibregl-marker { z-index: 2; }` -> `z-index: 4`, so the board always wins over your place. RadarMap L234 (now mandatory) `if (sel) {` -> `if (sel && window.matchMedia("(min-width: 640px)").matches) {`, so under 640 px the board is not built at all: the chosen moment is the first card under the map, which says the same thing. Test the viewport, not the map: at 1440 the map is about 608 to 634 px wide and would fail a 640 px map test. Why: measured at 390 before the CSS hide, the board (230x257 in a 350x380 map) sat under "Full screen" (elementFromPoint at the right end of `.tm-peek-k` returned `button.tm-fs`) and the place chip pierced "See who is coming" (`.tmp/velours/verify-premium-r1/crop-radar-390-map.png`).
98. **RadarMap L229 and L245, signs and the radius label never clip at the map's right edge.** L229 `new ml.Marker({ element: el, anchor: "left", offset: [13, 0] })` -> `new ml.Marker({ element: el, anchor: "center" })`. At the top of `declutter` (after L247) add
    ```ts
    // A sign sits right of its dot, or left of it when it would run past the map's right edge; the radius label too.
    for (const sgn of signs.current) {
      const el = sgn.getElement() as HTMLElement, x = m.project(sgn.getLngLat()).x, w = el.offsetWidth;
      sgn.setOffset(x + 13 + w > mapRect.width - 8 ? [-(13 + w / 2), 0] : [13 + w / 2, 0]);
    }
    const hEl = handle.current?.getElement() as HTMLElement | undefined;
    if (hEl && handle.current) hEl.classList.toggle("flip", m.project(handle.current.getLngLat()).x > mapRect.width - 120);
    ```
    radar.css add `.tm-handle.flip .tm-handle-lbl { left: auto; right: 14px; }`. Why: at 390 the signs read "Buena Vista Soc" and "Bruce C" and the radius label "1." of 1.3 km (r2 `c-radar390-top.png`). The offsets are set before the obstacles are measured, so the declutter pass below sees the final boxes.
99. **RadarMap L237 and L276-287, the peek board: shorter, and away from the crowds.** L237 `` ` · <span class="on">around you now on the timeline</span>` `` -> `` ` · <span class="on">on the timeline</span>` ``, and the sentence puts the figures first: `` `<p class="tm-peek-s">~<span class="mono">${sel.capacity.toLocaleString("en-US")}</span>&nbsp;people · <span class="mono">${walkMin(sel.distanceKm * 1000)}&nbsp;min</span> walk · ${escapeHtml(sel.venue)}</p>` ``. After L276 (`const sides`) add
    ```ts
    // Try first the side facing away from the crowds (the centroid of the signs), then the farthest corners.
    const sp = signs.current.map((s) => m.project(s.getLngLat()));
    const gx = sp.length ? sp.reduce((a, p) => a + p.x, 0) / sp.length : pt.x;
    const gy = sp.length ? sp.reduce((a, p) => a + p.y, 0) / sp.length : pt.y;
    sides.sort((a, b) => b[0] * (pt.x - gx) + b[1] * (pt.y - gy) - (a[0] * (pt.x - gx) + a[1] * (pt.y - gy)));
    ```
    and after L283 (`const corners`) add `corners.sort((a, b) => Math.hypot(b[0] - mapRect.left - gx, b[1] - mapRect.top - gy) - Math.hypot(a[0] - mapRect.left - gx, a[1] - mapRect.top - gy));`. Why: at 1440 the board covers about 45 % of the map and two hot signs, and its eyebrow wraps "around you now on / the timeline" (r2 `c-radar-top.png`); "Today 18:30 · on the timeline" fits one line at 15 px, and the board lands where the crowds are not.
23. **Attribution: done in globals.css, nothing to do in RadarMap.** It is collapsed at every width to a 28 px white square with an aubergine "i" and opens on hover or keyboard focus (CSS decides, not `[open]`: `::details-content` stays rendered and the inner line is hidden until asked for). Keep `attributionControl: { compact: true }` (RadarMap L139).
24. **RadarMap L7, L64-81, Marquise leftovers.** L7 comment -> `// Velours: your place an aubergine square, hot crowds wine discs with a sign, cold ones hollow rings, no blue, no pulsing.`; fallbacks `"#111114"` -> `"#1D1424"`, `"#62646B"` -> `"#635C6D"`, `"#7C8794"` -> `"#BDB6C5"`, `"#E0115F"` (L70, L74) -> `"#84204D"`, `"#ECEDEC"` -> `"#F4F2F5"`, `"#C9CBCD"` -> `"#E4DFE8"`, `"#E3E4E4"` -> `"#F6F3F7"`. RadarView L126 comment -> `// Square columns per 15-minute slot: other crowds in grey, the window worth a campaign in plum on top.` Why: the last raspberry hex and words in the source (item 85's second grep checks them).
25. **radar.css, delete what RADAR CHROME in globals supersedes, keep the layout.** Delete whole lines: L23, L26-33, L63, L66, L68, L70-71, L75-80, L87-89, L93, L95-97, L101-103, L105-106. Strip declarations, keep the rest of the line: L4 drop `border: 1px solid var(--line); border-radius: 0;` and `background: ...`; L15 keep only `position: absolute; left: -7px; top: -7px; width: 14px; height: 14px;`; L16 keep `position: absolute; white-space: nowrap;`; L21 keep `position: absolute; left: -9px; top: -9px; width: 18px; height: 18px;`; L22 keep `position: absolute; left: 14px; top: -10px; white-space: nowrap;`; L36 keep `white-space: nowrap; pointer-events: none; max-width: 180px; overflow: hidden; text-overflow: ellipsis;`; L61 keep `overflow-x: auto;`; L65 drop `border-left: ...`; L67 becomes the sticky day name of item 100; L69 keep `position: absolute; transform: translateX(-50%); white-space: nowrap;`; L74 drop `background` and `box-shadow`; L83 drop `border-left: 2px solid var(--ink);`; L84 keep `position: absolute; font-style: normal;`; L85 keep `position: absolute; top: 0; bottom: 0; pointer-events: none;`; L86 keep `position: absolute; font-style: normal; white-space: nowrap;`; L104 keep `position: absolute; z-index: 5; line-height: 1;`; L107 keep `justify-self: start; border: 0; background: none; cursor: pointer;`. L1-3 comment -> `/* Radar layout only: positions, sizes, grid. Colours, type and surfaces live in the RADAR CHROME block of globals.css (Velours). */`; L10 comment -> `/* your place */`; L59 comment -> `/* timeline: three rows, day names, cursor label, columns */`. Why: borders, rails, IBM Plex Mono (L22, L32, L69, L86, L97) and 10 to 12 px sizes still sit under the globals overrides; one source of truth.
26. **Mandatory (it was optional), after 12-25: wine for tonight only.** Items 19 and 97 read its `tonight` property and `P.bar`. RadarView, after L99: `const isTonight = (c: Crowd) => isHot(c) && fmtDayKey.format(new Date(c.w.start)) === todayKey && c.w.leave > now;` L388 `${isHot(c) ? " hot" : ""}` -> `${isTonight(c) ? " hot" : isHot(c) ? " later" : ""}`; points L280 add `tonight: cs.some(isTonight),` and `tonight: boolean` in `MapPoint` (RadarMap L9-23); RadarMap L216 add `tonight: p.tonight ? 1 : 0`, L223 `p.hot && !p.selected` -> `p.hot && p.tonight && !p.selected`, venue-dot colour case `["==", ["get", "hot"], 1], P.accent` -> `["==", ["get", "tonight"], 1], P.accent, ["==", ["get", "hot"], 1], P.bar` with `bar: resolveColor(tok("--bar-hot", "#6A4874"), "#6A4874")` in `palette()`, radius 7 tonight, 6 later; radar.css `.tm-ev.later i { background: var(--bar-hot); }`. Why: 19 wine marks over three days dilute the one accent; tonight's crowds keep wine and a sign, later ones turn plum and smaller (size and sign carry the difference; wine and plum are close in lightness, 1.22).

## / home (`src/app/page.tsx`)

27. **Hero, the Velours lockup at 128 px.** L1 add `import { Wordmark } from "@/components/Logo";`. Insert as the first child of the hero's first `<div>` (L28, before L29):
    ```tsx
    <div className="mb-14 flex" aria-hidden="true">
      <Wordmark size={128} phone={64} motion live={Boolean(live?.item.interesting)} />
    </div>
    ```
    Why: the founder asked for the logo bigger on the page. Mark 128 and word 128 on wide screens, 64 and 64 on phones; the needle swings open once on load; the wine dot lights when a crowd is live near the demo bar. The lockup hangs its mark by its own blank margin, so its left wall lines up with the eyebrow and the h1 (no manual offset); the flex wrapper avoids a line-box strut; `aria-hidden` because the header link already says Turnout. Reference renders: `.tmp/velours/logo/r2-home-hero-1440.png`, `r2-home-hero-1440-2x.png`, `r2-home-hero-390-2x.png` (live probe after the change: hero mark w 128 at (156, 172) on 1440, w 64 at (16, 128) on 390).
28. **L38, the promise steps down.** `mt-4 text-5xl leading-[0.98] md:text-[90px] md:leading-[0.88] md:tracking-[-0.012em]` -> `mt-5 text-[44px] leading-[0.98] md:text-[64px] md:leading-[0.98]`. Why: the lockup is the one hero; two giant display lines stacked fight (`home-hero-A-1440.png`). Negative tracking goes.
29. **L49-54, delete the trust row.** Why: four tiny bold-plus-grey claims under the buttons read as a SaaS template; the plate is the proof.
30. **L58-84, the live card becomes the plate.** L58 `className={live ? "card card-live p-7" : "card p-7"}` -> `className="plate"`. L59-65 -> `<p className="eyebrow flex items-center gap-3">{live && <span className="live-dot" aria-hidden="true" />}{live ? `Live · next crowd near ${live.merchant.name}` : "Example · near Penn & Pour"}</p>` then `<p className="t-name mt-4">{...the same name expression...}</p>` (the square span L60 goes: the title and the figures now share one left edge, see home-1440.png where the title is indented by the dot). L66 `mt-6 grid grid-cols-3 gap-4 text-sm` -> `mt-10 grid grid-cols-2 gap-x-12 gap-y-6`; L67-68 dd `tnum mt-1 font-display text-2xl` -> `t-figure mt-2 text-5xl`; the `min` span `eyebrow inline` -> `ml-1 text-base font-medium text-[var(--muted)]`; delete the Score cell L69. L71 `card-flat mt-6 p-4` -> `mt-12`. L72 text -> `An example: what Turnout wrote for Harry Styles night, two blocks away` (the live crowd above is often another event). L73 `mt-2 font-display text-lg` -> `t-name mt-3`. L74 `text-sm` + inline -> `mt-2 text-base`, with `7&nbsp;pm` and `1&nbsp;am`. L75 `mt-3 text-xs` + inline -> `mt-4 text-sm` (lilac on aubergine, 8.16). L80 `mt-4 inline-flex text-sm font-semibold underline underline-offset-4 decoration-[1.5px]` + inline -> `link mt-8 inline-flex text-base`. Why: one flat plate, two calm figures, no dashboard score, nothing under 15 px.
31. **L41-48, hero copy and actions.** L41 `mt-6 max-w-xl text-lg leading-relaxed` + inline -> `t-lead mt-8 max-w-xl`; L44 `mt-3 text-sm` + inline -> `mt-4 text-base text-[var(--muted)]`; L45 `mt-8 flex flex-wrap items-center gap-3` -> `mt-10 flex flex-wrap items-center gap-x-8 gap-y-4`; L46 `btn btn-accent` -> `btn btn-accent btn-lg`; L47 `btn btn-ghost` -> `link text-base`. L29 `className="eyebrow"` -> `className="text-[15px] font-medium text-[var(--muted)] tnum"` (it carries a distance and a clock: R3), and `{live.item.distanceKm.toFixed(1)} km` -> `{live.item.distanceKm.toFixed(1)}&nbsp;km`.
32. **L88, L106, L137, L155, sections separate by space.** `className="border-t py-16" style={{ borderColor: "var(--line)" }}` -> `className="stack-section"`. L175 and L202 are rewritten by items 38 and 39.
33. **L90, L108, L157, one heading size.** `display mt-2 max-w-3xl text-3xl md:text-4xl` (L90, L108) and `display mt-2 max-w-3xl text-3xl` (L157) -> `t-heading mt-3 max-w-3xl`; L203 is item 39. Why: home-1440.png sets the channels heading at 34 px and the others at 46.
34. **L91-101, the three figures.** L91 `mt-8 grid gap-6 md:grid-cols-3` -> `stack-block grid gap-x-16 gap-y-12 md:grid-cols-3`; L97 `card-flat p-6` -> remove the className; L98 `tnum font-display text-4xl` + inline -> `t-figure text-7xl text-[var(--plum)]`, unit span `eyebrow inline` -> `ml-2 text-base font-medium text-[var(--muted)]`; L99 `mt-3 text-sm leading-relaxed` + inline -> `mt-5 text-base`.
35. **L109-133, the comparison.** L109 `mt-3 max-w-2xl text-sm leading-relaxed` + inline -> `measure mt-5 text-base text-[var(--muted)]` (no `max-w-2xl` on a paragraph: 672 px sets 88 characters); L112 `mt-8 grid gap-4 md:grid-cols-2` -> `stack-block grid gap-x-24 gap-y-16 md:grid-cols-2`; L113 `card-flat p-6` and L123 `card p-6` -> no className; L115 `mt-3 font-display text-xl` -> `t-name mt-4 text-[var(--muted)]` (the generic ad greyed, Velours render); L125 -> `t-name mt-4`; L116 `mt-1 text-sm` -> `mt-3 text-base text-[var(--muted)]`; L126 `mt-1 text-sm` -> `mt-3 text-base`; L117, L127 `mt-4 space-y-1 text-xs` + inline -> `mt-5 space-y-2 text-sm text-[var(--muted)]`; L126 and L128 `7 pm`, `1 am`, `600 m` -> `&nbsp;`.
36. **L139-150, how it works, without numbered steps (revised).** L139 `mt-6 grid gap-8 md:grid-cols-3` -> `stack-block grid gap-x-16 gap-y-12 md:grid-cols-3`; L141-143 drop the first element of each tuple (`"01"`, `"02"`, `"03"`); L144 `.map(([n, t, d]) => (` -> `.map(([t, d]) => (`; L145 `key={n}` -> `key={t}`; delete L146 (the step number); L147 `display mt-2 text-xl` -> `t-name`; L148 `mt-2 text-sm leading-relaxed` + inline -> `mt-3 text-base text-[var(--muted)]`. Why: "01 02 03" is a SaaS landing device (`.tmp/velours/verify-premium-r1/c-home-c.png`), and the first version of this item enlarged it to 60 px plum figures; the three names carry the order on their own.
37. **L158-170, channels.** L158 `mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5` -> `stack-block grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3` (five columns at 17 px set 22 characters a line); L166 `card-flat p-4` -> no className; L167 `font-semibold` + inline -> `text-base font-semibold text-[var(--ink)]`; L168 `mt-1 text-xs leading-relaxed` + inline -> `mt-2 text-base text-[var(--muted)]` (globals already lifts it to 17 px).
38. **L174-199, no pricing card: the price is one answer among the answers (revised).** Replace L175-199 with
    ```tsx
    <section className="stack-section grid gap-x-24 gap-y-12 md:grid-cols-[1fr_1.2fr]">
      <h2 className="t-heading max-w-md">Straight answers</h2>
      <dl className="space-y-10">
        <div>
          <dt className="text-base font-semibold text-[var(--ink)]">What will it cost?</dt>
          <dd className="mt-3">
            <p className="t-figure text-5xl text-[var(--ink)]">$49<span className="ml-2 text-base font-medium text-[var(--muted)]">a month</span></p>
            <p className="mt-3 text-base">Radar, crowd profiles, unlimited campaigns, every channel. Ad spend is yours and optional; most nights the chalkboard and the Google post are enough. One extra table on one concert night pays for the month.</p>
            <Link href="/start" className="link mt-4 inline-flex text-base">Start free during the hackathon</Link>
          </dd>
        </div>
        {[
          /* the four [question, answer] pairs of L187-190 unchanged, except L189: delete "See it for Penn & Pour at /pulse." (a raw path in prose) */
        ].map(([q, a]) => (
          <div key={q}>
            <dt className="text-base font-semibold text-[var(--ink)]">{q}</dt>
            <dd className="mt-2 text-base">{a}</dd>
          </div>
        ))}
      </dl>
    </section>
    ```
    Why: a "Planned pricing" eyebrow, a "$49 / month" card and a "Start free" button are the pricing block of a SaaS template (`.tmp/velours/verify-premium-r1/c-home-d.png`), and the first version of this item blew $49 up to 96 px plum. The price stays a calm 48 px figure in ink, led by a question, and its action is a link (the closing section keeps the one primary button). "What will it cost?" keeps the "planned" meaning. Answers at 17 px in text colour, not 15 px muted at 81 characters a line (home-1440.json).
39. **L201-210, the closing lines on the wall, not a centred band (revised).** L202 `border-t py-20 text-center` + style -> `stack-section pb-24`; L203 `display mx-auto max-w-2xl text-3xl md:text-4xl` -> `t-title max-w-3xl`; L204 `mt-8 flex flex-wrap justify-center gap-3` -> `mt-10 flex flex-wrap items-center gap-x-8 gap-y-4`; L205 `btn btn-accent` -> `btn btn-accent btn-lg`; L207 `btn btn-ghost` -> `link text-base`. Why: the centred CTA band is the last landing-page device; every other section starts on the logo's left wall, so the page ends there too.
40. **L25 main.** `mx-auto max-w-6xl px-5` stays (the header measure). Hero L27 `py-16 md:py-24` -> `pt-16 pb-0 md:pt-24`; the first `stack-section` gives the space below.

## /campaigns/new (`src/app/campaigns/new/page.tsx`)

41. **L52-65, the pick list.** L52 `card mt-8 p-6` + `style={{ borderColor: "var(--warn)" }}` -> `className="tone stack-block"`; L53 `display text-xl` -> `t-heading`; L54 `mt-1 text-sm` + inline -> `mt-3 text-base text-[var(--muted)]`; L55 `mt-4 grid gap-2 sm:grid-cols-2` -> `mt-8 grid gap-x-10 gap-y-3 sm:grid-cols-2`; L58 `card-flat block p-4 hover:border-[var(--ink)]` -> `block bg-white px-5 py-4 transition-colors hover:bg-[var(--tone-2)]`; L59 `chip ml-1` -> `chip ml-2`; L60 `mt-1 text-xs` + inline -> `mt-1 text-sm text-[var(--muted)]`. L69-71 (headliner unknown) the same: `card mt-8 p-6` + `style={{ borderColor: "var(--danger)" }}` -> `className="tone stack-block"`, L70 `display text-xl` -> `t-heading`, L71 `mt-1 text-sm` + inline -> `mt-3 text-base text-[var(--muted)]`. Why: frameless candidates looked unclickable; white tiles on the one tone read as choices without a single line.
42. **L42 and L27, back link.** `<Link ... className="text-sm" style={{ color: "var(--muted)" }}>← Radar</Link>` -> `<Link href={`/radar?merchant=${merchant.id}`} className="link text-sm">Back to the radar</Link>`. L16 `className="underline"` -> `"link"`.
43. **L45-48, title.** L45 `mt-1 text-4xl` -> `t-title mt-2`; L46 `mt-1 text-sm` + inline -> `mt-3 text-base text-[var(--muted)]`.
44. **L115-129, the age chart diverges.** L116 `card mt-4 p-5` -> `stack-block`; L118 `mt-4 grid grid-cols-6 gap-3 text-center text-xs` -> `mt-8 grid grid-cols-6 gap-3 text-center text-sm`; replace L121-123 with
    ```tsx
    <div className="mx-auto flex h-14 w-full items-end justify-center">{v >= 0 && <div className="w-10" style={{ height: `${Math.max(4, Math.min(100, v * 100))}%`, background: "var(--bar-hot)" }} />}</div>
    <div className="mx-auto flex h-14 w-full items-start justify-center">{v < 0 && <div className="w-10" style={{ height: `${Math.max(4, Math.min(100, -v * 100))}%`, background: "var(--bar-other)" }} />}</div>
    ```
    Why: today every bar grows up, so -0.72 draws taller than +0.46 and reads as more (campaign-new-1440.png); over-index rises in plum, under-index hangs in grey, the gap between the halves is the baseline.
45. **L77-169, frameless facts.** L77 `mt-8 grid gap-4 md:grid-cols-3` -> `stack-block grid gap-x-16 gap-y-12 md:grid-cols-3`; L79, L85, L98, L109, L133, L141 `card p-5` -> no className; L81, L102 `mt-2 font-display text-xl` -> `t-name mt-3`; L82, L95, L103 `mt-1 text-xs` / `mt-2 text-xs` + inline -> `mt-2 text-sm text-[var(--muted)]`; L87 `text-sm` -> `text-base`; L106, L111 `text-sm` -> `text-base`; L132 `mt-4 grid gap-4 lg:grid-cols-2` -> `stack-block grid gap-x-24 gap-y-16 lg:grid-cols-2`; L135-139 the 24 chips -> `<p className="mt-4 text-base">{profile.tags.slice(0, 24).map((t) => t.name).join(" · ")}</p>`; L143 `mt-3 space-y-1.5 text-sm` -> `mt-4 space-y-2 text-base`; L145 `flex justify-between gap-2` -> `flex items-baseline justify-between gap-6`; L146 inner `text-xs` -> `text-sm`; L147 `tnum font-display text-base` + inline -> `t-figure text-2xl`; L154 `card mt-4 p-5` -> `stack-block`; L156 `mt-1 text-xs` + inline -> `measure mt-3 text-base text-[var(--muted)]` (four lines of explanation, not metadata: R1); L157 `data mt-3 w-full text-sm` -> `data mt-6 w-full text-base`; L161 `{i === 0 ? "★ " : ""}{f.title}` -> `{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}`; L162-163 `text-xs` -> `text-sm`; L164 `tnum text-right font-display text-base` + style -> `t-figure text-right text-2xl`. Why: chip clouds and nine boards made this page a dashboard; ★ is not in the system.
46. **L171-201, action and provenance; the telemetry leaves the button.** L171 `mt-6 flex flex-wrap items-center gap-4` -> `stack-block flex flex-wrap items-center gap-x-8 gap-y-4`; L176 `btn btn-accent` -> `btn btn-accent btn-lg`; delete L178 (`Qloo calls: ... live, ... cached.`) and add it after the table, before L198: `<p className="t-meta mt-6 tnum">Qloo calls: {profile.qlooCalls.live} live, {profile.qlooCalls.cached} cached.</p>` (developer telemetry next to the primary "Write my campaign" read as cheap: `.tmp/velours/verify-premium-r1/campaign-new-1440.png`, r2 the same); L183 `card-flat mt-8 p-5` -> `stack-section`; L184 `cursor-pointer text-sm font-semibold` + inline -> `text-base font-semibold text-[var(--ink)]`; L185 `data mt-3 w-full text-xs` -> `data mt-6 w-full text-sm` (code in it renders 12.35 px today); L198 `mt-3 text-xs` + inline -> `measure mt-6 text-sm text-[var(--muted)]`; L29 error `mt-4 p-3 text-sm` + style -> `mt-6 bg-[var(--danger-soft)] px-5 py-4 text-base text-[var(--danger)]`.

102. **L38, L102-103, L125, age ranges that never break, true minus signs.** L38 `.replace("_to_", "-")` -> `.replace("_to_", "‑")` (non-breaking hyphen); L125 `{v >= 0 ? "+" : ""}{v.toFixed(2)}` -> `{v >= 0 ? "+" : "−"}{Math.abs(v).toFixed(2)}`; L102 `{demo.ageTop.join(", ") || "no strong age skew"}` -> `{nb(demo.ageTop.join(", ")) || "no strong age skew"}`; L103 wrap the whole expression: `{nb(`${demo.gender}${demo.ageLow.length ? ` · under-indexes: ${demo.ageLow.join(", ")}` : ""}`)}` (with `import { nb } from "@/lib/nbsp";` and the two extra rules of item 82). `src/server/qloo/crowd.ts` L241 keeps "35-44": it also feeds the agent's prompt; the page fixes the display. Why: "under-indexes: 55+ (-0.34), 35- / 44 (-0.72)" broke at the hyphen at 1440 and 390 (`.tmp/velours/verify-premium-r1/c-cn390-a.png`), and a hyphen-minus is the wrong glyph for a signed figure in a premium table.

## /campaigns/[id] (`src/app/campaigns/[id]/page.tsx`)

47. **L36-40 and L97-104, the decision goes on the plate.** Move the publish form out of the header into the plate, after L103: `{campaign.status === "drafted" && (<form action={`/api/campaigns/${campaign.id}/approve`} method="post" className="mt-10"><button className="btn btn-accent btn-lg">Publish it now</button></form>)}`. L97 `card card-live p-6` -> `plate`; L99 `mt-2 font-display text-2xl` -> `t-heading mt-4`; L100 `text-sm` + inline -> `mt-3 text-lg text-[var(--muted)]` and `{offer?.description} · {offer?.price}` -> `{offer?.description}. {offer?.price}.` (at 390 the "· $16 for two" separator starts a line); L101 `eyebrow mt-5` -> `eyebrow mt-10`; L102 `mt-2 text-sm leading-relaxed` -> `t-body mt-3`; L103 `tnum mt-4 text-xs` + inline -> `mt-6 text-sm text-[var(--muted)] tnum`. Why: one plate, the offer, its reason and its one action together (campaign-draft-1440.png has the button floating top right, away from the reason).
48. **L96 and L125, space after the plate.** L96 `mt-8 grid gap-4 md:grid-cols-[1.25fr_1fr]` -> `stack-block grid gap-x-16 gap-y-12 md:grid-cols-[1.25fr_1fr]`; L125 `mt-4 grid gap-4 md:grid-cols-2` -> `stack-section grid gap-x-16 gap-y-16 md:grid-cols-2`. Why: the channels start 16 px under the plate today.
49. **L185-195 and L126-150, channels frameless and readable.** `Channel`: L187 `card p-5` -> no className; L190 `text-[12px] font-medium` + inline -> `t-meta`; L192 `mt-3 space-y-1` -> `mt-4 space-y-2`. Children: L127, L133, L141, L145 `font-display text-lg` -> `t-name`; L128, L134, L146 `text-sm` -> `text-base`; L138 `whitespace-pre-wrap text-sm leading-relaxed` -> `t-body whitespace-pre-wrap`; L129 `mt-1 text-xs font-semibold` + accent-text style -> `mt-2 text-sm text-[var(--muted)]` with the text `Button: {draft.geofenced_ad.cta}` (ad copy, not a control: "Get directions" read as a link); L130, L135 `text-xs` -> `text-sm text-[var(--muted)]`; L142 `mt-2 text-sm` + inline -> `mt-3 text-base text-[var(--muted)]`; L148 `card-flat p-5` + borderColor -> no className, no style; L150 `mt-2 text-sm leading-relaxed` -> `t-body mt-3`.
50. **L105-121, audience and windows.** L105 `space-y-4` -> `space-y-12`; L106, L110 `card p-5` -> no className; L108 `mt-2 text-sm leading-relaxed` -> `t-body mt-3`; L112 `mt-2 space-y-2 text-sm` -> `mt-4 space-y-5 text-base`; L116 `<WeatherChip .../>` -> `<span className="ml-2 text-sm text-[var(--muted)]">· {weatherByWindow.get(w.label)!.label}</span>`; L117 `block text-xs` + inline -> `mt-1 block text-sm text-[var(--muted)]`; delete `WeatherChip` (L175-183: an 11 px chip, and a hot day drew a wine fill).
51. **L44-61, status blocks.** L45, L53, L58 `card mt-8 p-6` + borderColor -> `tone stack-block`; L46 `display text-xl` -> `t-heading`; L47 `mt-1 text-sm` + inline -> `mt-3 text-base text-[var(--muted)]`; after L49 add the loading skeleton `<div className="mt-8 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line mt-6" /><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>`; L54, L59 `text-sm` -> `text-base`; L54 `className="underline"` -> `"link"`.
52. **L63-91, what was published.** L64 `card mt-8 p-5` + borderColor -> `stack-block` (plain: the plate is on this screen); L66 `mt-3 grid gap-2 sm:grid-cols-2` -> `mt-6 grid gap-x-16 gap-y-8 sm:grid-cols-2`; L71 `card-flat p-3` -> no className; L74 the chip's three inline style objects -> `className="chip"` with no style; L78 `mt-1 text-xs` + inline -> `mt-2 text-sm text-[var(--muted)]`; L84 `cursor-pointer text-[11px]` + inline -> `text-sm font-medium text-[var(--muted)]`; L85 `mt-1 max-h-48 overflow-auto p-2 text-[11px]` + `background: var(--paper)` -> `mt-3 max-h-64 overflow-auto bg-[var(--tone)] p-4 text-[13px] leading-relaxed` (no style). L41 the chip's inline style -> `className="chip"` only.
53. **L28-34, column, back link, title.** L28 `max-w-5xl px-5` -> `max-w-5xl px-6` (the same text edge as Today); L29 back link as item 42; L33 `mt-1 text-4xl` -> `t-title mt-2`; L34 `mt-1 text-sm` + inline -> `mt-3 text-base text-[var(--muted)]`; L126 `${draft.geofenced_ad.radius_m} m` -> `${draft.geofenced_ad.radius_m}\u00A0m`.
54. **L156-170, provenance.** `card-flat mt-8 p-5` -> `stack-section`; L157 summary `cursor-pointer text-sm font-semibold` + inline -> `text-base font-semibold text-[var(--ink)]`; L160 `data mt-3 w-full text-xs` -> `data mt-6 w-full text-sm`.

## /pulse (`src/app/pulse/page.tsx`)

55. **L46-61, weather without seven tiles.** L47 `card-flat mt-8 p-4` -> `stack-block`; L49 `mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-7` -> `mt-6 grid grid-cols-2 gap-x-8 gap-y-6 text-sm sm:grid-cols-4 lg:grid-cols-7`; L53 drop `className="px-2 py-1.5"` and the warn/ok background and colour style (no wrapper class left); L54 `font-semibold` -> `text-sm font-semibold text-[var(--ink)]`; L55 `<p>` -> `<p className="mt-1 text-sm text-[var(--text)] tnum">`. Why: seven tone tiles are seven surfaces on one screen, the rule is one (pulse-1440.png); weather is information. "Dry, cool, 54°F, feels 48°F" is a figure the merchant scans at a glance: it was 13 px muted on tone (5.81), it becomes 15 px tabular text on white (12.12).
56. **L166-189, the weekly offer is the plate.** L167 `mt-6` -> `stack-section`; L168 `card p-6` + accent border -> `plate`; L170 `mt-2 font-display text-2xl` -> `t-heading mt-4`; L171 `mt-1 text-sm` + inline -> `mt-3 text-lg text-[var(--muted)]`; L172 `eyebrow mt-5` -> `eyebrow mt-10`; L173 `mt-2 text-sm leading-relaxed` -> `t-body mt-3`; L175 `mt-4 grid gap-4 md:grid-cols-2` -> `stack-block grid gap-x-16 gap-y-16 md:grid-cols-2`; `Block` L223 `card p-5` -> no className, L226 `text-[12px] font-medium` + inline -> `t-meta`, L228 `mt-3 space-y-1` -> `mt-4 space-y-2`; children L176-182 `font-display text-lg` -> `t-name`, `text-sm` -> `text-base`, L182 `mt-2 text-xs` + inline -> `mt-3 text-sm text-[var(--muted)]`; L185 `card-flat mt-4 p-5` + borderColor -> `stack-block`; L187 -> `t-body mt-3`.
57. **L63-104, the rhythm.** L64 `mt-4` -> `stack-section`; L67 `text-xs` + inline -> `text-sm text-[var(--muted)]`; L71 `mt-3 grid gap-4 md:grid-cols-3` -> `stack-block grid gap-x-16 gap-y-12 md:grid-cols-3`; L73 `card p-5` + accent border -> no className, no style; L74 `font-display text-xl` -> `t-name`; L75 `tnum mt-1 text-sm font-semibold` + inline -> `mt-2 text-base font-semibold text-[var(--ink)] tnum`; L77 `ml-2 text-xs font-medium` + style -> `className={r.strength === "strong" ? "ml-3 text-sm font-semibold text-[var(--ink)]" : "ml-3 text-sm text-[var(--muted)]"}`; L79 `mt-3 space-y-1.5 text-sm` + inline -> `mt-4 space-y-2 text-base`; L83 `mt-3 text-xs` + inline -> `mt-4 text-sm text-[var(--muted)]`; L89 `card-flat mt-4 p-4 text-sm` -> `stack-block measure text-base`.
58. **L106-153, tags, places, offers.** L106 `mt-4 grid gap-4 md:grid-cols-3` -> `stack-section grid gap-x-16 gap-y-12 md:grid-cols-3`; L126 `mt-4 grid gap-4 lg:grid-cols-2` -> `stack-section grid gap-x-24 gap-y-16 lg:grid-cols-2`; L107, L114, L120, L127, L139 `card p-5` -> no className; L109-112 -> `<p className="mt-4 text-base">{pulse.audienceTags.length ? pulse.audienceTags.map((t) => t.name).join(" · ") : <span className="text-[var(--muted)]">No audience tags returned.</span>}</p>`; L116-118 the same for `ambienceTags`; L122 `mt-3 text-sm leading-relaxed` -> `mt-4 text-base`; L129 `text-sm` -> `text-base`, L132 inner `text-xs` -> `text-sm`, L133 `tnum font-display text-base` + inline -> `t-figure text-2xl`; L141 `text-sm` -> `text-base`; L145 ★ -> the `best fit` span of item 45; L146 `text-xs` -> `text-sm`; L147 -> `t-figure text-right text-2xl`, no style.
59. **L31-42, header.** L31 back link as item 42; L35 `mt-1 text-4xl` -> `t-title mt-2`; L36 `mt-1 text-sm` + inline -> `mt-3 text-base text-[var(--muted)]`; `1.5 km` -> `1.5&nbsp;km`.
60. **L155-164 and L192-204, status and provenance.** L156, L161 `card mt-6 p-6` + borderColor -> `tone stack-block`; L157, L162 `text-sm` -> `text-base`; L192 `card-flat mt-8 p-5` -> `stack-section`; L193 summary as item 54; L194 `text-xs` -> `text-sm`.
61. **L218, ranges in words.** `` `${dayRange(a.days)} ${a.from}-${a.to}` `` -> `` `${dayRange(a.days)} ${a.from} to ${a.to}` ``, `"weekdays 17:00-19:00"` -> `"weekdays 17:00 to 19:00"`. L18 `className="underline"` -> `"link"`.

## /alerts (`src/app/alerts/page.tsx`)

62. **L49-67, letters, not boards.** L49 `mt-8 space-y-4` -> `stack-block space-y-16`; `alerts.map((a) =>` -> `alerts.map((a, i) =>`; L51 `card p-5` + borderColor -> `className={i === 0 ? "tone" : undefined}` (the latest alert on the tone, the rest plain); L58 the message box `mt-3 max-w-md p-4 text-sm leading-relaxed` + style -> `className="mt-4 max-w-[60ch] whitespace-pre-wrap text-base text-[var(--text)]"`, no style, and render `{a.message.replace(/\nReview and approve:[\s\S]*$/, "")}` (the raw localhost URL repeats the link below). Why: `var(--paper)` is white now, so the box is invisible padding; the raw URL breaks the column (c-alerts.png).
63. **L53-56, clock and status.** L53 `mono text-sm` + inline -> `t-clock text-[var(--ink)]`; L54 `text-xs font-semibold` + coloured style -> `className={a.status === "failed" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--muted)]"}`.
64. **L62, link.** `mt-3 inline-flex text-sm font-semibold underline underline-offset-4 decoration-[1.5px]` + inline -> `link mt-4 inline-flex text-base`.
65. **L43-47, empty state.** -> `<div className="empty stack-block"><p className="empty-title">No alert yet</p><p>Run the scan: if a moment worth a campaign is coming in the next two days, the campaign is drafted and the alert appears here.</p></div>`.
66. **L26-36, column and header.** L26 `max-w-3xl px-5 py-10` -> `max-w-5xl px-6 py-10` and wrap the children in `<div className="max-w-3xl">` (the text starts on Today's edge, not a centred island); L27 back link as item 42; L31 `mt-1 text-4xl` -> `t-title mt-2`; L32 `mt-1 text-sm` + inline -> `mt-4 text-base text-[var(--muted)]`; L15 `className="underline"` -> `"link"`.

## /start and /start/confirm (`src/app/start/page.tsx`, `src/app/start/confirm/page.tsx`)

67. **start L17-54, labels that read as labels.** L18, L22, L31, L37, L42, L53 `<label className="eyebrow">` -> `<label htmlFor="f-name" className="text-[15px] font-medium text-[var(--ink)]">` with ids `f-name`, `f-kind`, `f-seats`, `f-address`, `f-offers`, `f-voice`, and the matching `id` on each input, select and textarea. L56-75: `<div>` + `<label className="eyebrow">Channels you have</label>` -> `<fieldset>` + `<legend className="text-[15px] font-medium text-[var(--ink)]">Channels you have</legend>`. Why: muted 14 px labels read as hints; ink 15 px labels with `htmlFor` focus their field on click and show the ring.
68. **start L15, the form frameless.** `card mt-8 space-y-6 p-7` -> `stack-block space-y-10`; L35 `-mt-3 text-xs` + inline -> `-mt-6 text-sm text-[var(--muted)]`; L39, L50 `mt-1.5 text-xs` + inline -> `mt-2 text-sm text-[var(--muted)]`.
69. **start L58-73, channel choices.** L58 `mt-2 grid gap-2 text-sm sm:grid-cols-2` -> `mt-4 grid gap-x-10 gap-y-5 text-base sm:grid-cols-2`; L66 `card-flat flex cursor-pointer items-start gap-3 px-3 py-2.5` -> `flex cursor-pointer items-start gap-4`; L67 `mt-1` -> `mt-0.5`; L70 `block text-xs` + inline -> `mt-0.5 block text-sm text-[var(--muted)]`.
70. **start L76-79 and L6-13, actions and column.** L76 `pt-2` -> `pt-6`; L77 `text-sm` + inline -> `link text-base`; L78 `btn btn-accent` -> `btn btn-accent btn-lg`; L6 `max-w-2xl px-5 py-14` -> `max-w-5xl px-6 py-16` with the children in `<div className="max-w-2xl">`; L8 `mt-2 text-4xl` -> `t-title mt-3`; L9 `mt-3 text-sm leading-relaxed` + inline -> `mt-5 text-base text-[var(--muted)]`; L13 error -> `mt-6 bg-[var(--danger-soft)] px-5 py-4 text-base text-[var(--danger)]`.
71. **confirm L25-51, offers frameless, tags as toggles.** L25 `mt-8 space-y-4` -> `stack-block space-y-16`; L27 `card p-5` -> no className; L29 `font-display text-lg` -> `t-name`; L30 `tnum text-sm` + inline -> `text-base text-[var(--muted)] tnum`; L32 `text-xs` + inline -> `mt-1 text-sm text-[var(--muted)]`; L33 `mt-4 space-y-3` -> `mt-6 space-y-6`; L37 `mt-1.5` -> `mt-3`; L38 `text-xs` -> `text-sm`; L40 `chip cursor-pointer` -> `chip h-10 cursor-pointer gap-3 px-4 text-[15px]`; L41 `className=""` -> remove; L43 `style={{ color: "var(--muted)" }}` -> `className="text-[var(--muted)]"`. Why: these tags are the content being confirmed, so 15 px, not 13.
72. **confirm L19-23 and L52-56.** L19 as item 70 (column); L21 `mt-2 text-4xl` -> `t-title mt-3`; L22 `mt-3 text-sm leading-relaxed` + inline -> `mt-5 text-base text-[var(--muted)]`; L52 `text-sm` -> `text-base`; L54 `text-sm` + inline -> `link text-base`; L55 `btn btn-accent` -> `btn btn-accent btn-lg`; L13 `className="underline"` -> `"link"`.

## layout.tsx header and footer (`src/app/layout.tsx`)

73. **L23-26, the bigger Velours lockup.** Replace with
    ```tsx
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-5 sm:h-[76px]">
      <Link href="/" aria-label="Turnout home" className="flex shrink-0 items-center">
        <Wordmark size={44} phone={34} />
      </Link>
    ```
    Why: word 44 px with the 48 px mark from 640 px wide, word 34 with the 32 mark below (`.tmp/velours/logo/r2-header-1440-2x.png`, `r2-header-390-2x.png`; today the lockup is 36 px with the descriptor; live probe after the change: header mark w 48 at y 14 on 1440, w 32 at y 16 on 390). Bar 64 px under 640, 76 px above: even heights, so the 32 and 48 marks centre on whole pixels (y 16 and 14). The tagline "crowd to campaign" is dropped.
74. **L22, no line under the header.** `style={{ background: "var(--paper)", borderBottom: "1px solid var(--line)" }}` -> `style={{ background: "var(--paper)" }}`.
75. **L3, L7-8, L11, L20, IBM Plex Mono out.** L3 `import { Big_Shoulders, IBM_Plex_Mono, Instrument_Sans }` -> `import { Big_Shoulders, Instrument_Sans }`; L7-8 comment -> `// Velours type: Big Shoulders (variable, opsz 10..72) for names and numbers, Instrument Sans for sentences, clocks and distances (tabular).`; delete L11 (`const mono = ...`); L20 `` `${display.variable} ${sans.variable} ${mono.variable}` `` -> `` `${display.variable} ${sans.variable}` ``. Why: one font file less; globals already maps `--font-mono` to Instrument Sans.
76. **L27-33, nav links.** L27 `gap-1 text-sm font-medium` -> `gap-1 text-[15px] font-medium`; L28-30 each `inline-flex min-h-11 items-center whitespace-nowrap px-3 decoration-[1.5px] underline-offset-[6px] hover:underline` + `style={{ color: "var(--ink)" }}` -> `inline-flex min-h-11 items-center whitespace-nowrap px-3 text-[var(--ink)] transition-colors hover:text-[var(--wine)]`, no style. Why: no underline; hover deepens to wine like every link.
77. **L34, Powered by Qloo.** `ml-2 hidden min-h-11 items-center whitespace-nowrap pl-3 text-xs font-medium decoration-[1.5px] underline-offset-[5px] hover:underline md:inline-flex` + inline -> `ml-2 hidden min-h-11 items-center whitespace-nowrap pl-3 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--plum)] md:inline-flex`, no style.
78. **L41-43, footer.** `<footer className="mx-auto max-w-6xl px-5 py-10 text-xs" style={{ color: "var(--muted)" }}>` + text -> `<footer className="mx-auto max-w-6xl px-5 pb-12 pt-24"><p className="measure text-sm text-[var(--muted)]">Qloo results describe ...</p></footer>`. Why: the disclaimer was 13 px on one line of 159 characters (1152 px) at 1440; 15 px held to the measure sets about 70 characters, and space replaces a rule above it. Globals already patches it (`body > footer`), and the design session deletes that patch once this lands (item 93).

## Everywhere

79. **Containers, two edges only.** Wide pages (home, radar, campaigns/new, pulse) use `mx-auto max-w-6xl px-5`: the content starts on the logo's left wall. Reading and form pages (today, campaigns/[id], alerts, start, confirm) use `mx-auto max-w-5xl px-6`: the text starts 68 px in, and Today's plate bleeds back to the logo's wall. Items 17, 53, 66, 70, 72 apply it.
80. **Leftover `underline` on the no-place fallbacks.** today L24, radar/page L19, campaigns/new L16, campaigns/[id] L54, pulse L18, alerts L15, start/confirm L13: `className="underline"` -> `className="link"`.
81. **No arrows.** The five `← Radar` (campaigns/new L27 and L42, campaigns/[id] L29, pulse L31, alerts L27) -> `Back to the radar` (item 42).
82. **Non-breaking spaces.** Add `src/lib/nbsp.ts` (new folder):
    ```ts
    // Units stay with their number, ranges never break at the hyphen, a signed figure gets a true minus.
    export const nb = (s: string) =>
      s
        .replace(/(\d) (pm|am|km|m|min|h)\b/g, "$1\u00A0$2")
        .replace(/(\d)-(\d)/g, "$1\u2011$2")
        .replace(/\(-(\d)/g, "(\u2212$1");
    ```
    and wrap every agent-written string rendered as prose: today L110, L123, L127, L131-132, L140, L213; campaigns/[id] L100, L102, L108, L117, L127-146, L150; pulse L171, L173, L176-182, L187. In code-built strings write `\u00A0` directly: RadarMap L237 (`min walk`), L407 (`min walk`), L432 (`fmtKm`: `` `${...}\u00A0m` ``, `` `${...}\u00A0km` ``); RadarView L329 (`min`), L435 (`km`); today L79 (`km from your door`, which also fixes the JSX `crowdLine` at L139 and L147); home L32, L68 (static copy such as home L74 and L126 takes `&nbsp;` by hand, items 30 and 35); radar/page L78; campaigns/new L142 (`m this crowd`). Why: "pm." or "km" never starts a line.
83. **Loading.** Add `src/app/radar/loading.tsx` and `src/app/today/loading.tsx` (radar and today wait on Qloo and weather, several seconds on a cold cache):
    ```tsx
    export default function Loading() {
      return (
        <main className="mx-auto max-w-6xl px-5 py-16" aria-busy="true" aria-label="Loading">
          <span className="skeleton skeleton-title" />
          <span className="skeleton skeleton-line mt-8" />
          <span className="skeleton skeleton-line" />
          <span className="skeleton skeleton-block mt-12" />
        </main>
      );
    }
    ```
    (`max-w-5xl px-6` for today). Why: tone blocks that breathe instead of a blank white page.
84. **Inline colours.** After the items above, remove any remaining `style={{ color: "var(--ink)" }}`, `"var(--text)"`, `"var(--muted)"` in favour of `text-[var(--ink)]`, `text-[var(--muted)]` utilities; they behave the same and on the plate they still re-scope.
103. **No line starts with a list dot.** Every `.join(" · ")` -> `.join(" · ")`: today L133, pulse L122 and L182, campaigns/[id] L130, campaigns/new L111, radar/page L141 and L143, and the tag lines written by items 45 and 58. Literal separators in JSX between spans (`{" · "}`, `</span> · <span`) -> `&nbsp;· `. Why: campaigns/new at 1440 sets the brands as "Gucci · ... · Versace / · Christian Dior · ... / · Guess" (r2 `campaign-new-1440.png`): the dot belongs to the end of a line.
104. **Prose floor, file by file (recap for the commit).** The verifier counted prose blocks of 60+ characters under 17 px at 1440: home 15, pulse 10, campaign wave 8, radar 7, alerts 5, campaigns/new 4, start 3 (Today passes). The items above move each one: home 30, 31, 34, 35, 36, 37, 38; pulse 55 to 58; campaigns/new 41, 45, 46; campaigns/[id] 47 to 50; alerts 62, 66; start 67 to 70; radar 12, 17. Rule while touching any other line: `text-sm leading-relaxed` -> `text-base`, `text-xs leading-relaxed` -> `text-sm`, and `text-xs` stays only on dates, sources, table heads and chips. Globals carries a temporary floor (R3 block) that the design session deletes after this commit (item 93), so a missed line will show at its real size in the re-render.

## Checks after the commit

85. `grep -rnE 'underline|borderColor|border-t[ "]|text-\[1[0-2]px\]|fontSize: 1[0-2]\b|tracking-\[|letterSpacing|card-flat|"card |card card-live|IBM_Plex|font-mono|hugeBtn|btn-ghost|←|★|"text-size": 1[0-2]|"text-size": 10\.5' src/app --include='*.tsx' --include='radar.css'` returns nothing (globals.css is excluded: it still defines the legacy classes). Then the Marquise leftovers, over every source file the build session owns: `grep -rnE '#111114|#E0115F|#F2F3F3|#B8094B|#62646B|#7C8794|#ECEDEC|#C9CBCD|#E3E4E4|IBM Plex|IBM_Plex|Marquise|raspberry' src --include='*.tsx' --include='*.ts' --include='radar.css'` returns nothing. Why: items 24, 25 and 75 remove RadarMap's '#111114' and '#E0115F' fallbacks, the radar.css header comment and layout.tsx's IBM_Plex_Mono, but the first grep checks none of them, so a missed edit would pass; Plex Mono is still the third font preloaded on every page (it downloads and is never used, since globals maps `--font-mono` to Instrument Sans).
86. `grep -rn 'card-live\|className="card' src/app --include='*.tsx'` returns nothing (every board is a plate, a tone or plain).
87. Re-render (`node .tmp/velours/checklist/shot.mjs .tmp/velours/checklist/jobs.json checklist`): every `*.json` shows `small {}`, `underline []`, `borders` only `tm-handle-dot` and `tm-now`, `plates` at most 1, `tones` at most 1, every h1 `letterSpacing` at 0 or above, `bodySmall` holding metadata only; header lockup 44 px word in a 76 px bar at 1440, 34 px in a 64 px bar at 390; home hero lockup 128 px at 1440, 64 px at 390. The logo probe: `node .tmp/velours/verify-build-r1/cdp.mjs .tmp/velours/verify-build-r1/jobs-live.json` must report the header mark w 48 at y 14 (1440) and w 32 at y 16 (390), the hero mark w 128 at (156, 172) (1440) and w 64 at (16, 128) (390), and no "crowd to campaign" in the header.
88. Look at radar-390.png: no peek board under 640 px, your place is not covered, the attribution is the "i" button, the cursor label and "Knicks at Celtics on TV" end inside the scroller, a day name shows at the timeline's left edge, no sign or radius label is cut at the map's right edge. At 1440: no wine disc on the map, no cold label under a sign, the peek eyebrow on one line, the board away from the signs.
89. Keyboard: Tab through Today, Radar and Start: every link, button, field, select, checkbox and the timeline slider shows the 2 px aubergine ring with its 3 px offset (light on the plate).

## Logo wiring recap

90. Header: item 73 (44/34, no tagline, still mark). Home hero: items 27 and 28 (128/64, `motion`, `live` while a crowd is live). Icons and share card: nothing to wire; Next serves `src/app/icon.svg`, `apple-icon.png` and `opengraph-image.png` on its own. On an aubergine plate pass `tone="reverse"` or rely on the `.plate` overrides of `--mark-ink`, `--mark-needle`, `--mark-ground`, `--mark-arc` and `--wordmark` (the afterglow follows `--mark-needle` over `--mark-ground` on its own); Wordmark API: `size`, `phone`, `tone` ("color" | "reverse" | "mono"), `live`, `motion`, `mark`.

## Design session follow-ups (globals.css): 91, 92, 94, 95 applied; 93, 96, 105, 106 to do; 107 resolved

91. Applied, as `--measure: 32em` (not 60ch: `ch` is the width of a 0, 0.665 em in Instrument Sans, so 60ch still set about 88 characters; 32em sets about 70 at any size). `.measure-narrow`, `.empty` 25em, `.tm-summary` the measure; wide `max-w-*` on a `main` paragraph falls back to it.
92. Applied: `.score-ring::before` and `.empty::before` draw in `--mark-arc` #806B84 (4.82 on white, 4.38 on tone); the plate re-scopes it to #B5A6B8 (6.37 on plum).
93. Still to do once the pages land: delete the unlayered `select.field, select.select { ... !important }` block once item 18 lands (keep its 17 px), and the `a.underline` block once item 85 returns nothing; delete `.tm-root .tm-night, .tm-root .tm-tickline` and `.tm-root .tm-legend*` after item 15; delete the R3 readability floor (`main :where(p, li).text-xs...`, `main :where(p, dd, blockquote).text-sm...`, the `max-w-*` paragraph fallbacks) once the pages use `text-base` and `text-sm` as listed (item 104); delete the `body > footer` rule once item 78 lands; delete the stopgaps of item 106.
94. Applied: ticks, radius label, peek clock and sentence, map hint at 15 px tabular; hero eyebrow and table cells carrying a `.mono` at 15 px; `code` at the size of its words; map signs, timeline names, day names and your place's label at 14 px; `.mono` and `.tm-mono` never break across lines.
95. Applied: `--map-cold-ring: #8E8598` for item 21; `--tone-2` and `--skeleton` re-scoped on the plate and the tone; the tinted alternate day is gone (one tonal surface per screen: on the radar it is the chosen moment).
96. Logo afterglow token (optional): Logo.tsx draws the afterglow as `var(--mark-glow, color-mix(in srgb, var(--mark-needle) 12%, var(--mark-ground)))`. Leave `--mark-glow` unset (the plum scope's `--mark-needle` and `--mark-ground` already retint it, to rose 12 % over plum), or set both `:root { --mark-glow: #F0E4EA }` and, in the plum scope, `--mark-glow: #5A3459` (the reverse master's tint). Never set it on `:root` alone: the plate would inherit a light pink sector. `--mark-arc` #806B84 now only draws the 20 and 16 px arcs (and item 92's arcs).
105. Peek board (with items 22 and 99): the phone hide `@media (max-width: 559px) { .tm-root .tm-peek { display: none; } }` -> `max-width: 639px`, so CSS and RadarMap agree on 640 (between 560 and 639 the board still sat under the full screen button and over your place). Keep `.tm-root .tm-peek` at `max-width: 300px`: the verifier proposed 340 with `white-space: normal` on the eyebrow, but item 99 shortens it to "Today 18:30 · on the timeline" (about 215 px at 15 px, one line), and the board already covers about 45 % of a 608 to 634 px map; wider would cover more. Add `.tm-root .tm-peek-s { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; }` so the figures-first sentence never runs to three lines of show names.
106. Stopgap, optional, only if the build commit is late: `.tm-root .tm-item p.font-display.truncate { white-space: normal; overflow: visible; text-overflow: clip; text-wrap: balance; }`, so names wrap instead of "Theatre crowd arriving, 34 ..." until item 12 lands. Delete it with item 93. The verifier's other stopgap (`z-index: 6; margin-top: 52px` on the phone peek) is superseded by 105: under 640 px there is no board.
107. Share card and icons, resolved: the verifier found `opengraph-image.png` 88.9 % flat #3B1C42, against the founder's "no dark backgrounds" and this file's own rejection of the plate personality. `design/studio-a/swing-final.mjs` L875 now sets `OG.plate: false`, and the PNG is the white page with the aubergine lockup, the wine needle and the promise (checked 2026-10-23). The apple icon (80.4 % plum) and the 16 px favicon keep the aubergine chip on purpose: an icon is an object on the phone's home screen, not a page background, as `design/brand/GUIDELINES.md` L85 already says.
