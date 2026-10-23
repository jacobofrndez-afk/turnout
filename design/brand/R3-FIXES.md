# Velours round 3: fixes for the build session

After commits 010af9a and 7c9b7b3, every page was re-rendered at 1440 and 390 (`.tmp/velours/checklist/r3/`) and judged. Premium 7 (target judge) and 6.5 (founder judge), up from 5.5. Readability 8, up from 6. Items 85 and 86 are clean. Every issue below was confirmed by a separate skeptic on the current code; the fix text is the skeptic's corrected version.

Design-owned issues are already fixed in src/app/globals.css (slider focus ring drawn by the scroller, map frame ring when the canvas has focus, scroll-padding under the sticky header). Nothing for you there.

Order: the radar render loop at 390 first (#0, blocker), then the radar labels (#33, #10, #12), then Today (#26), then the dev words on customer screens (#3, #30, #28), then the rest. Inside one file, apply from the highest line down. Duplicates are marked: apply the recommended one only.

Founder judge's top four, all covered here: the radar map not readable (labels on labels, sign over the radius handle); dev words on customer screens (SNAP_ACCESS_TOKEN, payload, America/New_York, offerings:place, Qloo live 0 cached 18); the plate carrying 12 to 19 lines of rationale on campaign pages; Today's hero in a waiting state with no button and its title repeated in the sentence.

## src/app/radar/RadarView.tsx

### #0 [blocker] radar 390
**Apply first: blocker.**

Where: src/app/radar/RadarView.tsx:77 (inView not memoized, so markers L143-156 changes every render, so the edge effect at L201-217 re-runs on every commit) and :212 (setEdge updater); edgeRef goes after :93

Problem: Radar at 390 px is stuck in a render loop that never ends. Cause: inView (L77) is a new array on every render, so the curve, cursorPeople and markers memos recompute every render. The edge effect (deps include markers) then re-runs on every commit and calls setEdge. Its updater hands back a new {cursor,left} object with the same content each time, so RadarView re-renders about 220 times per second. RadarMap also re-renders every time, because its merchant, onSelect and onRadiusChange props change on each render. The loop shows at 390 px (scroller clientWidth 350) and not at 480 px or wider. React logs 'Maximum update depth exceeded'. In production the loop runs silently and burns CPU on phones.

Fix:

1) L77: `const inView = all.filter((c) => c.w.leave > t0 && c.w.arrive < t1);` -> `const inView = useMemo(() => all.filter((c) => c.w.leave > t0 && c.w.arrive < t1), [all, t0, t1]);`
2) After L93 (`const [edge, setEdge] = useState<...>(...)`), add: `const edgeRef = useRef(edge);`
3) L212: `setEdge((p) => (p.cursor === cursorOut && p.left.size === left.size && [...left].every((k) => p.left.has(k)) ? p : { cursor: cursorOut, left }));` -> `const p = edgeRef.current; if (p.cursor === cursorOut && p.left.size === left.size && [...left].every((k) => p.left.has(k))) return; edgeRef.current = { cursor: cursorOut, left }; setEdge(edgeRef.current);`
Leave out the L355 RadarMap prop memo from the report. It does not affect the loop: RadarMap effects key on merchant.lat/lon/name/radiusM, points and ready, not on object identity. Wrapping onSelect/changeRadius in useCallback without the full deps would also freeze selectCrowd's zoom/all/now. Either change 1 or change 3 alone stops the loop (checked by patching the bundle in the browser). Ship both.

### #27 [major] radar both
**Timeline labels cut at both edges. #13 edits the same check(): apply #27, then #13's `off` set only if right-edge labels are still cut.**

Where: src/app/radar/RadarView.tsx:204-213 (check() inside the edge effect L201-217); src/app/radar/radar.css:56-57 (.tm-day b, .tm-tick). The issue's radar.css:58 and 69-72 are wrong lines: 58 is .tm-curve, 69 is the .tm-wide media rule, 70-72 are the list.

Problem: Timeline labels are cut by the scroller: ':00' at the left edge and 'Giants at Texar', 'Jets vs Dolphir', '15 sh' at the right at 1440. At 390 the now line runs through 'Toda|y' and the cursor through '1|8:00'.

Fix:

1) src/app/radar/RadarView.tsx L204-211
OLD:
    const check = () => {
      const right = el.scrollLeft + el.clientWidth - 8;
      const lbl = el.querySelector<HTMLElement>(".tm-cursor i");
      const cursorOut = ((cursor - t0) / span) * el.scrollWidth + 8 + (lbl?.offsetWidth ?? 0) > right;
      const left = new Set<string>();
      for (const b of el.querySelectorAll<HTMLElement>(".tm-ev.lbl")) {
        if ((parseFloat(b.style.left) / 100) * el.scrollWidth + b.offsetWidth > right) left.add(b.dataset.id ?? "");
      }
NEW:
    const check = () => {
      const lo = el.scrollLeft + 8;
      const right = el.scrollLeft + el.clientWidth - 8;
      const lbl = el.querySelector<HTMLElement>(".tm-cursor i");
      const cursorOut = ((cursor - t0) / span) * el.scrollWidth + 8 + (lbl?.offsetWidth ?? 0) > right;
      const left = new Set<string>();
      for (const b of el.querySelectorAll<HTMLElement>(".tm-ev.lbl")) {
        const x = (parseFloat(b.style.left) / 100) * el.scrollWidth;
        // A dot outside the visible window takes its name with it: flipped, the name would still be cut at the edge.
        const name = b.querySelector<HTMLElement>("span");
        if (name) name.style.visibility = x < lo || x > right ? "hidden" : "";
        if (x + b.offsetWidth > right) left.add(b.dataset.id ?? "");
      }
      // A clock that would cross either edge of the window is hidden, never cut to ":00".
      for (const t of el.querySelectorAll<HTMLElement>(".tm-tick")) {
        const x = (parseFloat(t.style.left) / 100) * el.scrollWidth;
        t.style.visibility = x - t.offsetWidth / 2 < el.scrollLeft || x + t.offsetWidth / 2 > el.scrollLeft + el.clientWidth ? "hidden" : "";
      }
(L212-216 unchanged. visibility keeps layout, so offsetWidth and the flip logic are untouched; React never resets visibility because the span has no style prop and the tick's style prop only carries left.)

2) src/app/radar/radar.css
L56 OLD: .tm-day b { position: sticky; left: 12px; display: inline-block; white-space: nowrap; }
L56 NEW: .tm-day b { position: sticky; left: 12px; z-index: 1; display: inline-block; white-space: nowrap; background: var(--paper); padding: 0 6px; }
L57 OLD: .tm-tick { position: absolute; transform: translateX(-50%); white-space: nowrap; }
L57 NEW: .tm-tick { position: absolute; z-index: 1; transform: translateX(-50%); white-space: nowrap; background: var(--paper); padding: 0 4px; }
(No ancestor sets a z-index, so these paint above .tm-now and .tm-cursor, which are z auto, and the lines run behind the words. Nothing overlaps: day names sit at 6-29 px, the cursor label starts at 29 px, ticks start at 216 px, the lowest dots end at about 214 px. Side effect: the padding moves the day name text from 12 to 18 px. To keep it at 12 px, design can change `left: 12px` to `left: 6px` in globals `.tm-root .tm-day b`. A negative margin does not work on a sticky box, I tested it.)

### #13 [major] radar 1440
**Alternative or complement to #27, see above.**

Where: src/app/radar/RadarView.tsx:93 (edge state), :206-212 (check loop + setEdge), :412 (button className); src/app/radar/radar.css:62 (add rule after .tm-ev.left)

Problem: Three timeline labels are cut at the scroller's visible right edge (1276): "Giants at Texar", "Jets vs Dolphir" and "15 sh". They are flipped (.left), but their dots sit at 1331 to 1382, past the edge, so the flipped text still runs out.

Fix:

RadarView.tsx L93:
`const [edge, setEdge] = useState<{ cursor: boolean; left: Set<string> }>({ cursor: false, left: new Set() });`
->
`const [edge, setEdge] = useState<{ cursor: boolean; left: Set<string>; off: Set<string> }>({ cursor: false, left: new Set(), off: new Set() });`

RadarView.tsx L208-212:
```
      const left = new Set<string>();
      for (const b of el.querySelectorAll<HTMLElement>(".tm-ev.lbl")) {
        if ((parseFloat(b.style.left) / 100) * el.scrollWidth + b.offsetWidth > right) left.add(b.dataset.id ?? "");
      }
      setEdge((p) => (p.cursor === cursorOut && p.left.size === left.size && [...left].every((k) => p.left.has(k)) ? p : { cursor: cursorOut, left }));
```
->
```
      const left = new Set<string>();
      const off = new Set<string>();
      const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((k) => b.has(k));
      for (const b of el.querySelectorAll<HTMLElement>(".tm-ev.lbl")) {
        const id = b.dataset.id ?? "";
        const x = (parseFloat(b.style.left) / 100) * el.scrollWidth;
        // Its dot is outside the visible window: no label until the dot scrolls in.
        if (x < el.scrollLeft || x > el.scrollLeft + el.clientWidth) off.add(id);
        else if (x + b.offsetWidth > right) left.add(id);
      }
      setEdge((p) => (p.cursor === cursorOut && same(p.left, left) && same(p.off, off) ? p : { cursor: cursorOut, left, off }));
```

RadarView.tsx L412, end of className:
`${edge.left.has(c.id) ? " left" : ""}`}`
->
`${edge.left.has(c.id) ? " left" : ""}${edge.off.has(c.id) ? " off" : ""}`}`

radar.css, new line after L62 (`.tm-ev.left {...}`):
`.tm-ev.off span { visibility: hidden; }`

### #16 [major] radar 1440
Where: src/app/radar/RadarView.tsx:415 (tm-ev <button> opened at 408, insert after its onClick). Cause: radar.css:62 .tm-ev.left translateX(calc(-100% + var(--s) / 2)) together with the edge flip at RadarView.tsx:200-216

Problem: At steps 98 to 100 (Giants at Texans on TV, Jets vs Dolphins on TV, 15 shows starting), the focused dot and its ring sit outside the visible part of .tm-scroll. The .left label keeps part of the button visible, so Chrome does not scroll the scroller (scrollLeft stays 0). The user sees no focus at all.

Fix:

RadarView.tsx:415
old:
                  onClick={() => selectCrowd(c.id)}
new:
                  onClick={() => selectCrowd(c.id)}
                  onFocus={(e) => {
                    // A flipped label can stay in view while its dot and focus ring sit past the scroller edge; Chrome will not scroll then.
                    const dot = e.currentTarget.querySelector("i");
                    const sc = scrollRef.current;
                    if (!dot || !sc) return;
                    const d = dot.getBoundingClientRect(), s = sc.getBoundingClientRect();
                    if (d.left < s.left + 8 || d.right > s.right - 8) dot.scrollIntoView({ block: "nearest", inline: "center" });
                  }}

Do not use the suggested unconditional `scrollIntoView({ block: "nearest", inline: "center" })`. inline:"center" always scrolls, even when the dot is already in view. In the replay it moved the timeline 17 times during one Tab pass, and with Chrome focusing a button on click it would also jump on every mouse click, fighting the cursor-follow effect at lines 187-198. The tabIndex={-1} option is not a substitute: the list only shows "worth a campaign" items by default, so some markers would lose keyboard access.

### #15 [minor] radar 1440
Where: src/app/radar/RadarView.tsx:408-411 (tm-ev <button> inside markers.map; insert after L410 `type="button"`)

Problem: All 90 timeline event buttons are tab stops (steps 19 to 108), so the moment list starts at stop 109. Same-time events stack at one x position: 20 stops in a row (steps 22 to 41, contentX 158.7) and 26 (steps 60 to 85, contentX 614.7) produce pixel-identical frames, so focus moves with no visible change. On the selected wave's members, the focus ring is also nearly identical to the existing selected-state ring (box-shadow 2 px white + 3.5 px plum).

Fix:

RadarView.tsx L410, old:
                  type="button"
                  data-id={c.id}
new:
                  type="button"
                  tabIndex={lane >= 0 ? undefined : -1}
                  data-id={c.id}
Effect: tab stops on the timeline go from 90 to 11. The 11 labelled lane markers stay reachable, and lane allocation (laneEnds) means they never overlap. The 79 unlabelled base-row dots leave the tab order. They stay clickable and stay in the accessibility tree. Keyboard access to every crowd is unchanged: slider Page Down/Page Up steps hot crowds, the .tm-item list covers every future event once "Show every event nearby" is on. The reporter's blanket `tabIndex={-1}` also works but drops the 11 distinct, visible labelled markers for no gain.

### #17 [minor] radar 1440
Where: src/app/radar/RadarView.tsx:354-360 (div.tm-maparea) comes before 362-429 (section.tm-tl) in the DOM; src/app/radar/radar.css:30 ("tl tl" "map list") and radar.css:34 ("tl" "map" "list" under 1024 px) draw the timeline first

Problem: Focus order jumps. The DOM has the map first, but the grid shows the timeline above it. Order: header row (place select and links, doc y 241-277) -> map canvas (doc y 685) and map overlays -> back up to the timeline slider (doc y 431) and its events -> down to the moment list (doc y 857).

Fix:

In src/app/radar/RadarView.tsx, inside <div className="tm-body"> (L353), swap the two blocks.
Old order: L354-360 `<div className="tm-maparea"> <RadarMap .../> <p className="tm-maphint">...</p> <button className="tm-fs">...</button> </div>`, then L362-429 `<section className="tm-tl" aria-label="Crowds over the next hours"> ... </section>`, then L431 `<aside className="tm-list">`.
New order: `<section className="tm-tl" aria-label="Crowds over the next hours"> ... </section>` (moved unchanged), then `<div className="tm-maparea"> ... </div>` (moved unchanged), then `<aside className="tm-list">`.
No CSS change: grid-template-areas places each block. No sibling selectors (+, ~, :first-child) in radar.css or globals.css depend on the order. Result: Tab order is timeline, map, list, matching the layout at 1440 ("tl tl" / "map list") and under 1024 px ("tl" / "map" / "list"). In full screen ("map" / "tl", radar.css:41) the timeline now comes first in focus while the map shows above it. That is acceptable: only two regions, and the list is hidden there.

## src/app/radar/RadarMap.tsx and radar.css

### #33 [major] radar both
**Ring distances overprinted by venue labels. Recommended fix (one line). Same problem as #4, #11, #20: skip those, except #4 step 1 (label only the chosen radius) if the map still feels busy.**

Where: src/app/radar/RadarMap.tsx:417 (ring-label, "text-allow-overlap": true) and 445-452 (venue-label addLayer, closes at L452), in addLayers(); the fix goes at L452/453, before the function's closing brace

Problem: ring-label has text-allow-overlap true and sits below venue-label. venue-label is placed first, then the ring labels draw on top of it, so the text overlaps and garbles. At 390, '1.3 km · 16 min walk' is drawn over 'School Girls;' and '1 km · 13 min walk' over 'Mean Girls Play'. At 1440, 'The Lost Boys (NY)' sits over '1 km · 13 min walk'.

Fix:

In addLayers(), src/app/radar/RadarMap.tsx, after the venue-label block:
old:
    paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.8 },
  });
}

function drawRings(
new:
    paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.8 },
  });
  // ring labels place first (top symbol layer); venue labels then collide with them instead of drawing over them
  m.moveLayer("ring-label");
}

function drawRings(
Tested live on __tmMap at 390 and 1440. All 3 ring labels stay; venue labels move to another anchor or drop out. Side effect: ring text now draws above the venue dots (at 390 the 'lk' of '1 km · 13 min walk' slightly covers one dot). If dots must stay above all text, use m.moveLayer("venue-label", "ring-label") instead. Placement order is the same, but venue labels then draw under the dots.

### #10 [major] radar both
**Radius handle and its 1.3 km label under the Harry Styles sign. Recommended over #34 (#34's drop-below still collides at 390).**

Where: src/app/radar/RadarMap.tsx:295-297 (handle flip; also 131, 204, 210-212, 304, 391, 478) and src/app/radar/radar.css:11 and :21

Problem: The draggable radius handle and its "1.3 km" label sit under the biggest crowd's sign (Harry Styles). The handle marker has no z-index, so the signs (z-index 1) paint over it. The flip rule (x > map width - 120) sends the label left, straight into the sign, and the handle is never an obstacle in declutter. At 390 the handle cannot be seen while the hint under the map says "Drag the white handle". At 1440 the label reads "km".

Fix:

The reported fix only half works. Checked live: with z-index 3 plus a measured label side, 1440 is clean (label goes right of the dot, [692,953,757,977], clear). At 390 the label goes "below" but the dot stays at the east point, [326,968,344,986], and now paints over the last letter of the biggest sign, Harry Styles [245,960,343,985], so the sign reads "Harry Style". Render: .tmp/velours/r3-verify/11/fx390-crop.png. z-index on its own is worse: the "1.3 km" label covers "Harry Styles" (sim-s-390.png, fx1440-crop.png). So the handle also has to move along the ring. Measured at 390, the south point is free: dot [186,1108,204,1126], label on the right [209,1105,274,1129]. At 1440 east stays free.

radar.css
L11 old: `.tm-sign.maplibregl-marker { z-index: 1; }`
new:
```
.tm-sign.maplibregl-marker { z-index: 1; }
.tm-handle.maplibregl-marker { z-index: 3; } /* the radius handle is a control: above the signs; the peek board steps around it */
```
L21 old: `.tm-handle.flip .tm-handle-lbl { left: auto; right: 14px; }`
new:
```
.tm-handle.flip .tm-handle-lbl { left: auto; right: 14px; }
.tm-handle.below .tm-handle-lbl { left: auto; right: -9px; top: 16px; }
.tm-handle.ns { cursor: ns-resize; }
```
(The 0,3,0 specificity beats `.tm-root .tm-handle-lbl { top: -12px }` in globals.css, so no design edit is needed.)

RadarMap.tsx
L131 after `const handle = useRef<ML>(null);` add:
```
  const hAng = useRef(0); // where the handle sits on the radius ring (radians, 0 = east), chosen by the placement pass
  const dragging = useRef(false);
```
L204 old: `.setLngLat(eastOf(merchant, merchant.radiusM)).addTo(m);` -> new: `.setLngLat(ringPt(merchant, merchant.radiusM, hAng.current)).addTo(m);`, then add after L204:
`        mk.on("dragstart", () => (dragging.current = true));`
L210-212 old: `mk.on("dragend", () => {` ... `mk.setLngLat(eastOf(merchant, r));`
new: `mk.on("dragend", () => {` + `dragging.current = false;` as the first line, and `mk.setLngLat(ringPt(merchant, r, hAng.current));`
L295-297 old:
```
      const hEl = handle.current?.getElement() as HTMLElement | undefined;
      if (hEl && handle.current) hEl.classList.toggle("flip", m.project(handle.current.getLngLat()).x > mapRect.width - 120);
      const hits = (a: DOMRect, b: DOMRect, pad = 4) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
```
new:
```
      const hits = (a: DOMRect, b: DOMRect, pad = 4) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
      // The radius handle takes the first point of its ring (east, south, north, west) where its dot and its label
      // (right, left or below the dot) stay inside the map and clear of the biggest crowd's sign, your place and the
      // full screen button; lesser signs and the peek board then step around it. Never while it is being dragged.
      const hMk = handle.current;
      const hEl = hMk?.getElement() as HTMLElement | undefined;
      if (hMk && hEl && !dragging.current) {
        const rNow = metersBetween(merchant, hMk.getLngLat());
        const dotEl = hEl.querySelector(".tm-handle-dot") as HTMLElement;
        const lblEl = hEl.querySelector(".tm-handle-lbl") as HTMLElement;
        const block = [signs.current[0]?.getElement(), meEl.current?.querySelector(".tm-me"), meEl.current?.querySelector(".tm-chip-me"), wrapRef.current?.parentElement?.querySelector(".tm-fs")]
          .filter((e): e is Element => !!e).map((e) => e.getBoundingClientRect());
        const free = (r: DOMRect) => r.left >= mapRect.left + 8 && r.right <= mapRect.right - 8 && r.top >= mapRect.top + 8 && r.bottom <= mapRect.bottom - 8 && !block.some((b) => hits(b, r));
        const place = (a: number, side: string) => {
          hMk.setLngLat(ringPt(merchant, rNow, a));
          hEl.classList.remove("flip", "below");
          if (side) hEl.classList.add(side);
          hEl.classList.toggle("ns", Math.abs(Math.sin(a)) > 0.5);
        };
        let found = false;
        for (const a of [0, -Math.PI / 2, Math.PI / 2, Math.PI]) {
          for (const side of ["", "flip", "below"]) {
            place(a, side);
            if (free(dotEl.getBoundingClientRect()) && free(lblEl.getBoundingClientRect())) { hAng.current = a; found = true; break; }
          }
          if (found) break;
        }
        if (!found) { hAng.current = 0; place(0, m.project(ringPt(merchant, rNow, 0) as [number, number]).x > mapRect.width - 120 ? "flip" : ""); }
      }
```
After L304 `if (fs) obstacles.push(fs);` add (the report said after L303, which is the `const fs` line):
`      if (hEl) for (const q of [".tm-handle-dot", ".tm-handle-lbl"]) obstacles.push(hEl.querySelector(q)!.getBoundingClientRect());`
L391 old: `handle.current?.setLngLat(eastOf(merchant, radius));` -> new: `handle.current?.setLngLat(ringPt(merchant, radius, hAng.current));`
L478 old: `const eastOf = (c: { lat: number; lon: number }, r: number) => offset(c, r, 0);` -> new: `const ringPt = (c: { lat: number; lon: number }, r: number, a: number) => offset(c, r * Math.cos(a), r * Math.sin(a));` (after the three swaps above eastOf has no other use).

### #12 [major] radar 1440
Where: src/app/radar/RadarMap.tsx:313 (insert before `const c = card.current;`) and :342-349 (candidate loop), plus src/app/radar/radar.css:12

Problem: The peek board in the top-left corner covers all three ring labels (anchors at x 468, labels about 150 px wide, board right edge at 470). Only "5 min walk", "mi" and "min walk" show, so no distance is readable at 1440. Ring labels are not obstacles for the board.

Fix:

The proposed fix is right at 1440 but has 2 side effects: (1) it sends the board to the bottom-right corner [466,1002,766,1199]. The board has z-index 4 and the controls have 2, so it hides the map credit "i" [732,1165,760,1193]. This also happens at 1280, 1366 and 768. (2) At 1024 the map is 537 px wide and no spot is free. The fallback then picks the top-right corner [251,721,551,918]: it covers the Full screen button and still most of the ring labels, which is worse than today. Corrected fix in 3 edits:

EDIT 1, src/app/radar/RadarMap.tsx:313
old:
      const c = card.current;
      if (c) {
new:
      // The walking-time labels on the rings (map text north of your place): the board avoids them when it can.
      const ringLabels: DOMRect[] = m.queryRenderedFeatures({ layers: ["ring-label"] }).map((f: ML) => {
        const p = m.project(f.geometry.coordinates);
        return new DOMRect(mapRect.left + p.x - 85, mapRect.top + p.y - 26, 170, 24);
      });
      const c = card.current;
      if (c) {

EDIT 2, src/app/radar/RadarMap.tsx:342-349
old:
        let chosen: [number, number] | undefined;
        for (const [ccx, ccy] of candidates) {
          const r = new DOMRect(ccx - w / 2, ccy - h / 2, w, h);
          if (!obstacles.some((o) => hits(o, r))) {
            chosen = [ccx - cx, ccy - cy];
            break;
          }
        }
new:
        let chosen: [number, number] | undefined;
        // First pass keeps the ring labels clear; a narrow map with no such spot falls back to the old rule.
        for (const avoid of [[...obstacles, ...ringLabels], obstacles]) {
          for (const [ccx, ccy] of candidates) {
            const r = new DOMRect(ccx - w / 2, ccy - h / 2, w, h);
            if (!avoid.some((o) => hits(o, r))) {
              chosen = [ccx - cx, ccy - cy];
              break;
            }
          }
          if (chosen) break;
        }

EDIT 3, src/app/radar/radar.css:12
old:
.tm-peek.maplibregl-marker { z-index: 4; }
new:
.tm-peek.maplibregl-marker { z-index: 4; }
.tm-mapwrap .maplibregl-ctrl-bottom-right { z-index: 5; } /* the map credit stays above the board when the board takes the bottom-right corner */

### #14 [minor] radar 390
Where: src/app/radar/RadarMap.tsx:443-452 (the venue-label layer at the end of addLayers: MapLibre places labels with no knowledge of the map edges or the HTML Full screen button) and :190 (load handler, right after addLayers). labelData (:247-257) and the zoomend hook (:260, :371) are not the cause.

Problem: Venue labels are cut or covered at the map's right side. "The Lost Boys (NY)" reads "The Lost E" at the right edge (anchor x 275 in a 350 px map; the left anchor is tried first). "The New York Pops" sits under the Full screen button and reads "The N.. York P..". The labels are recomputed only on zoomend.

Fix:

Leave :450 (text-variable-anchor) and labelData/zoomend as they are. Add a keep-out layer: invisible icons that MapLibre places before the labels, so a label takes its next free anchor instead of running past an edge or under the button.

1) src/app/radar/RadarMap.tsx:452, end of addLayers, right after the venue-label `m.addLayer({...});`, add:
  // Keep-out: invisible icons that take room in label placement (this layer is placed first), so no label runs
  // past the map's edges or under the Full screen button; a label takes its next free anchor instead.
  m.addSource("keepout", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  m.addLayer({ id: "keepout", type: "symbol", source: "keepout", layout: { "icon-image": ["get", "img"], "icon-anchor": "top-left", "icon-allow-overlap": true, "icon-ignore-placement": false } });

2) New module function, just before `function drawRings` (:455):
function keepOut(m: ML, fs?: DOMRect) {
  const c = m.getCanvas(), W = c.clientWidth, H = c.clientHeight, P = 100, g = 6, r = c.getBoundingClientRect();
  const boxes = [[W, -P, P, H + 2 * P], [-P, -P, P, H + 2 * P], [0, -P, W, P], [0, H, W, P]];
  if (fs) boxes.push([fs.left - r.left - g, fs.top - r.top - g, fs.width + 2 * g, fs.height + 2 * g]);
  const features = boxes.map(([x, y, w, h], i) => {
    const iw = Math.ceil(w), ih = Math.ceil(h), img = `keepout-${i}-${iw}x${ih}`;
    if (!m.hasImage(img)) m.addImage(img, { width: iw, height: ih, data: new Uint8Array(iw * ih * 4) });
    return { type: "Feature", properties: { img }, geometry: { type: "Point", coordinates: m.unproject([x, y]).toArray() } };
  });
  m.getSource("keepout")?.setData({ type: "FeatureCollection", features });
}

3) :190, right after `addLayers(m, palette());`, add:
        const ko = () => keepOut(m, wrapRef.current?.parentElement?.querySelector(".tm-fs")?.getBoundingClientRect());
        ko();
        m.on("move", ko);
        m.on("resize", ko);
(map.remove() in the cleanup already drops these listeners.)

### #32 [minor] radar both
**Base map labels under 13 px. Recommended over #6 (also removes uppercase and tracking).**

Where: src/app/radar/RadarMap.tsx:109-110 (velours(), symbol branch, before the text-color line)

Problem: Base-map canvas labels are under 13 px. road_shield_us and the shield layers are 10 px. highway-name-major is 12 to 12.2 px (West 23rd Street, 7th Avenue, Madison Avenue). label_other is 9 to 10 px, uppercase and tracked 0.1, and water_name_point is 10 px. velours() recolours these layers but never resizes them, so R2 (map counts) still fails.

Fix:

In src/app/radar/RadarMap.tsx, velours():
old:
    } else if (l.type === "symbol" && l.layout?.["text-field"]) {
      p["text-color"] = id.startsWith("label_") ? C.place : C.label;
new:
    } else if (l.type === "symbol" && l.layout?.["text-field"]) {
      // R2 on the base map too: nothing under 13 px, no uppercase, no tracking. Route shields (10 px refs such as "9A" in a sprite sized for them) go.
      if (id.includes("shield")) { l.layout.visibility = "none"; continue; }
      const up = (v: unknown) => (typeof v === "number" ? Math.max(13, v) : v);
      const s = l.layout["text-size"] ?? 16;
      l.layout["text-size"] = Array.isArray(s) && s[0] === "interpolate" ? [...s.slice(0, 3), ...s.slice(3).map((v: unknown, i: number) => (i % 2 ? up(v) : v))] : up(s);
      delete l.layout["text-transform"];
      l.layout["text-letter-spacing"] = 0;
      p["text-color"] = id.startsWith("label_") ? C.place : C.label;
(The reported fix is functionally the same; this is a tidier version. I ran it in node on the cached positron style, .tmp/velours/r3-verify/35/fix-check.mjs, and every expression stays valid: the highway-name-* sizes become [interpolate, linear, zoom, 13,13, 14,13], label_other becomes 8,13 / 12,13, and the 3 shield layers are hidden.)

### #4 [major] radar 390 (also 1440)
**Duplicate of #33, only step 1 is optional.**

Where: src/app/radar/RadarMap.tsx:461 (ring labels), :416-417 moved to after :452 (layer order), :295-297 (handle label flip), :304 (peek board obstacles); src/app/radar/radar.css:21 (add one line after it)

Problem: Map labels pile up. At 390: '1.3 km · 16 min walk' sits under 'School Girls;', '1 km · 13 min walk' under 'Mean Girls Play', 'Oh Mary! (NY)' under dots, the 'Harry Styles' sign covers the 1.3 km handle label, and 'The New York P...' is hidden under Full screen. At 1440: the peek board cuts '5 min walk' to 'min walk', and 'The Lost Boys (NY)' collides with the ring label 'mi...'. Pas lisible on the hero screen of the demo.

Fix:

All edits are in build files. In one file, apply them from the bottom up so the line numbers stay true.

1. RadarMap.tsx:461. Label only the chosen radius; the inner rings stay as quiet lines.
OLD: `features: rings.map((x) => ({ type: "Feature", properties: { label: ...`
NEW: `features: rings.filter((x) => x.main).map((x) => ({ type: "Feature", properties: { label: ...` (rest of the line unchanged)

2. RadarMap.tsx:416-417. Cut both lines unchanged: the `m.addSource("ring-labels", ...)` line and the `m.addLayer({ id: "ring-label", ... "text-allow-overlap": true }, ...)` line. Keep "text-anchor": "bottom" (do NOT switch to bottom-right: tried it, and "School Girls; Or, The African Mean Girls Play" then lands under the Full screen button at 390). Paste them right after L452, the `});` that closes the venue-label addLayer, before the `}` on L453. Add this comment above them: `// last on purpose: MapLibre places the top symbol layer first, so venue names avoid the radius label.`

3. RadarMap.tsx:295-297. Replace these three lines:
OLD:
      const hEl = handle.current?.getElement() as HTMLElement | undefined;
      if (hEl && handle.current) hEl.classList.toggle("flip", m.project(handle.current.getLngLat()).x > mapRect.width - 120);
      const hits = (a: DOMRect, b: DOMRect, pad = 4) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
NEW:
      const hits = (a: DOMRect, b: DOMRect, pad = 4) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
      // The radius label flips left only when its real width would pass the map's right edge, and drops under its dot when it would sit on a sign.
      const hEl = handle.current?.getElement() as HTMLElement | undefined;
      const hLbl = hEl?.querySelector(".tm-handle-lbl") as HTMLElement | null | undefined;
      if (hEl && hLbl && handle.current) {
        hEl.classList.toggle("flip", m.project(handle.current.getLngLat()).x + 14 + hLbl.offsetWidth > mapRect.width - 8);
        hEl.classList.remove("below");
        const lr = hLbl.getBoundingClientRect();
        if (signs.current.some((s) => hits(lr, (s.getElement() as HTMLElement).getBoundingClientRect()))) hEl.classList.add("below");
      }
radar.css: add after L21 (`.tm-handle.flip .tm-handle-lbl { ... }`):
.tm-handle.below .tm-handle-lbl { top: 16px; }
(Specificity 0,3,0 beats globals `.tm-root .tm-handle-lbl { top: -12px }` at 0,2,0; both sheets are unlayered.)
Do NOT use the proposed `.tm-handle.maplibregl-marker { z-index: 3; }`. It only swaps which box is covered: at 390 the label (x 236-301) would then hide the top sign "Harry Styles" (x 225-323), and that sign is always shown.

4. RadarMap.tsx, after L304 (`if (fs) obstacles.push(fs);`), add:
      // The radius label: a canvas symbol on the chosen ring, north of your place, 15 px (about 7.2 px a character, 22 px tall).
      const rLbl = `${fmtKm(radiusRef.current)} · ${walkMin(radiusRef.current)} min walk`, rp = m.project(northOf(merchant, radiusRef.current));
      obstacles.push(new DOMRect(mapRect.left + rp.x - rLbl.length * 3.6, mapRect.top + rp.y - 25, rLbl.length * 7.2, 22));
At 1440 this rect is (232,45,144x22). MapLibre's own collision box for the label is (234,47,140x22), so the estimate is close.

Drop from the proposed fix: venue-label "text-size" 13 -> 14 and "text-padding" 4 -> 8. Neither causes the overlap. Item 94's 14 px is for HTML signs, item 19 set the venue labels to 13 on purpose, and both changes would hide more names.

Small leftovers that this issue did not fully name (optional, minor):
- At 390, "The New York Pops" and "Movements" at the map's top edge still sit under Full screen.
- At 390, "The Lost B..." is cut off at the map's right edge.
- Dots still show behind "Oh Mary! (NY)" (circle layers take no part in label collision).
- At 390 the "k" of "walk" touches the Full screen box by about 3 px.

### #34 [major] radar both
**Duplicate of #10, skip.**

Where: src/app/radar/RadarMap.tsx:295-296 (handle label placed by flip only, never tested against signs) and :298-304 (handle not in obstacles); src/app/radar/radar.css:11 + 17-21 (.tm-sign z-index 1, .tm-handle has none and comes earlier in DOM)

Problem: The radius handle chip '1.3 km' (the merchant's own radius, 15 px) is covered by the wine 'Harry Styles' sign at both widths. Only 'km' shows. The handle is not in the obstacle list and it paints under the signs.

Fix:

RadarMap.tsx L295-296, old:
      const hEl = handle.current?.getElement() as HTMLElement | undefined;
      if (hEl && handle.current) hEl.classList.toggle("flip", m.project(handle.current.getLngLat()).x > mapRect.width - 120);
new:
      const hEl = handle.current?.getElement() as HTMLElement | undefined;
      if (hEl && handle.current) {
        hEl.classList.toggle("flip", m.project(handle.current.getLngLat()).x > mapRect.width - 120);
        // The radius label never sits under a sign: if its side is taken it drops below the dot, else above.
        const lbl = hEl.querySelector(".tm-handle-lbl") as HTMLElement | null;
        const signR = signs.current.map((s) => (s.getElement() as HTMLElement).getBoundingClientRect());
        const clash = () => { const r = lbl!.getBoundingClientRect(); return signR.some((o) => o.left < r.right + 4 && o.right > r.left - 4 && o.top < r.bottom + 4 && o.bottom > r.top - 4); };
        hEl.classList.remove("low", "high");
        if (lbl && clash()) { hEl.classList.add("low"); if (clash()) { hEl.classList.replace("low", "high"); if (clash()) hEl.classList.remove("high"); } }
      }

RadarMap.tsx after L304 `if (fs) obstacles.push(fs);` add:
      for (const q of [".tm-handle-dot", ".tm-handle-lbl"]) { const r = hEl?.querySelector(q)?.getBoundingClientRect(); if (r) obstacles.push(r); }

radar.css after L21 `.tm-handle.flip .tm-handle-lbl { left: auto; right: 14px; }` add:
.tm-handle.maplibregl-marker { z-index: 3; } /* the drag control stays above signs (1), under the peek board (4) */
.tm-handle.low .tm-handle-lbl { top: 14px; left: -9px; }
.tm-handle.high .tm-handle-lbl { top: -38px; left: -9px; }
.tm-handle.flip.low .tm-handle-lbl, .tm-handle.flip.high .tm-handle-lbl { left: auto; right: -9px; }

### #11 [major] radar 390
**Duplicate of #33, skip.**

Where: src/app/radar/RadarMap.tsx:417 (ring-label layer added before venue-label, whose addLayer block is L445-452)

Problem: The ring distances are overprinted by a bold venue label. MapLibre places the top symbol layer first, so venue-label claims the space and ring-label (text-allow-overlap) is drawn on top of it anyway. Both texts become unreadable: "1.3 km · 16 min walk" and "1 km · 13 min walk" under "School Girls; Or, The African Mean Girls Play" (fails R3).

Fix:

In addLayers, move the ring-label layer so it is the last layer added (top symbol layer, placed first).
OLD (L416-418):
  m.addSource("ring-labels", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  m.addLayer({ id: "ring-label", type: "symbol", source: "ring-labels", layout: { "text-field": ["get", "label"], "text-font": FONT, "text-size": 15, "text-anchor": "bottom", "text-offset": [0, -0.2], "text-allow-overlap": true }, paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.6 } });
  m.addSource("venues", ...
NEW (L416-417):
  m.addSource("ring-labels", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  m.addSource("venues", ...
and OLD (end of venue-label block, L451-453):
    paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.8 },
  });
}
NEW:
    paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.8 },
  });
  // top symbol layer: MapLibre places it first, so venue labels yield to the ring distances
  m.addLayer({ id: "ring-label", type: "symbol", source: "ring-labels", layout: { "text-field": ["get", "label"], "text-font": FONT, "text-size": 15, "text-anchor": "bottom", "text-offset": [0, -0.2], "text-allow-overlap": true }, paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.6 } });
}
Keep "text-allow-overlap": true, add no "text-ignore-placement" (the ring boxes must stay in the collision index so venue labels avoid them). The addSource for ring-labels can stay where it is; drawRings only needs the source.

### #20 [major] radar 1440 and 390
**Duplicate of #33 and #10, skip.**

Where: src/app/radar/RadarMap.tsx:417 (ring-label layer drawn below venue-label) and src/app/radar/RadarMap.tsx:305-312 (declutter: the top sign is always shown and never tested against the radius chip), plus src/app/radar/radar.css:21

Problem: Map labels print over each other. 'School Girls; Or, The African Mean Girls Play' sits on '1.3 km · 16 min walk', 'The Lost Boys (NY)' sits under the markers, and the handle's '1.3 km' chip hides behind the 'Harry Styles' sign (only 'km' shows). At 390, 'The N... York P...' sits under Full screen and 'The Lost B' is cut at the edge.

Fix:

1) RadarMap.tsx L417: cut the whole line
  m.addLayer({ id: "ring-label", type: "symbol", source: "ring-labels", layout: { "text-field": ["get", "label"], "text-font": FONT, "text-size": 15, "text-anchor": "bottom", "text-offset": [0, -0.2], "text-allow-overlap": true }, paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.6 } });
and paste it as the last statement of addLayers(), right after the venue-label addLayer (after L452, before the closing `}` at L453). Leave the addSource("ring-labels") at L416 where it is.

2) The handle part of the reported fix does not work: the sign covering the chip is "Harry Styles", which is signs[0] (biggest crowd). That sign is always shown and is pushed as an obstacle at L305-312. The obstacle test only runs on signs.slice(1), so pushing the handle rect changes nothing for it. Flipping Harry Styles to the left would land on the merchant square and chip (simulated: hits .tm-me at 1440, and .tm-me plus .tm-chip-me at 390). So move the chip, not the sign. In declutter, insert right after the `if (top) { ... }` block (after L312):
      // The radius chip drops below its handle when the biggest crowd's sign covers it; the board and the other signs avoid it.
      const hLbl = hEl?.querySelector(".tm-handle-lbl") as HTMLElement | null | undefined;
      if (hEl && hLbl) {
        hEl.classList.remove("low");
        if (top && hits(hLbl.getBoundingClientRect(), (top.getElement() as HTMLElement).getBoundingClientRect())) hEl.classList.add("low");
        obstacles.push(hLbl.getBoundingClientRect());
      }

3) src/app/radar/radar.css, after L21 (`.tm-handle.flip .tm-handle-lbl { ... }`), add:
.tm-handle.low .tm-handle-lbl { top: 16px; }
(At 0,3,0 this beats `.tm-root .tm-handle-lbl { top: -12px }` in globals.css at 0,2,0.)

### #6 [minor] radar both
**Duplicate of #32, skip.**

Where: src/app/radar/RadarMap.tsx:109-113 (velours(), symbol branch)

Problem: Nothing under 13 px (R2, which names map text-size 12 and 10.5) fails on the map. velours() recolours the positron base-map labels but keeps their text-size. Street names (highway-name-major, interpolate z13 12 to z14 13) render at about 12.2 px. US road shields render at 10 px.

Fix:

In src/app/radar/RadarMap.tsx, replace L109-110:
OLD:
    } else if (l.type === "symbol" && l.layout?.["text-field"]) {
      p["text-color"] = id.startsWith("label_") ? C.place : C.label;
NEW:
    } else if (l.type === "symbol" && l.layout?.["text-field"]) {
      if (id.includes("shield")) l.layout.visibility = "none";
      const ts = l.layout["text-size"];
      if (typeof ts === "number") l.layout["text-size"] = Math.max(13, ts);
      else if (Array.isArray(ts) && ts[0] === "interpolate") for (let i = 4; i < ts.length; i += 2) if (typeof ts[i] === "number") ts[i] = Math.max(13, ts[i]);
      p["text-color"] = id.startsWith("label_") ? C.place : C.label;
Why the loop works: every positron text-size expression is ["interpolate", curve, ["zoom"], z0, v0, z1, v1, ...], so the values sit at even indexes from 4. Hiding the shields avoids pushing 13 px numbers past their icons. Drop the optional venue-label 13 to 14 change: checklist item 19 asks for 13 px there.

## src/app/radar/page.tsx

### #31 [minor] radar both
Where: src/app/radar/page.tsx:77 (the address line is lines 77 to 79; the text is on L78)

Problem: Header: at 1440 the address line wraps and leaves 'around you' alone on line 2. At 390 the page nav ('Penn & Pour, New York', 'Today', 'Alerts', 'Weekly pulse') wraps onto two rows of 17 px aubergine semibold right under the site nav, and 'Today' duplicates the header link.

Fix:

L77: `<p className="mt-3 text-base text-[var(--muted)]">` -> `<p className="mt-3 max-w-none text-base text-[var(--muted)]">`. Leave L78 text and L81-91 nav as they are: do NOT delete the Today link and do NOT drop the Alerts / Weekly pulse links to text-sm. The reported L77 fix also uses `{radius}`, a variable that does not exist (the radius is computed inline on L78), so that fix would not compile.

## src/app/today/page.tsx

### #26 [major] today both
**Recommended. #19 is the smaller subset of the same fix.**

Where: src/app/today/page.tsx:157-162 (awaiting_operator branch). Also L78-83 (crowdLine), L141 and L150 (where crowdLine is used), and the imports at L1-10.

Problem: The page's one hero moment has no action. Title 'Theatre crowd arriving, 34 shows', then the sentence repeats 'theatre crowd arriving, 34 shows', then 'Your campaign is being written ... Come back in a minute.' with only 'Follow it'. The founder sees a waiting room, not a campaign.

Fix:

1) L78-83: turn crowdLine into a function so the hero lead can leave out the event name. The h2 at L149 already shows it.
OLD:  const crowdLine = next && w0 ? (
    <>
      {dayOf(w0.start)} from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span>, {next.event.name.charAt(0).toLowerCase() + next.event.name.slice(1)}: about {next.capacity.toLocaleString("en-US")} people
NEW:  const crowdLine = (withName: boolean) => next && w0 ? (
    <>
      {dayOf(w0.start)} from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span>{withName ? `, ${next.event.name.charAt(0).toLowerCase() + next.event.name.slice(1)}:` : ":"} about {next.capacity.toLocaleString("en-US")} people
(the rest of the block stays as it is).
L141 (drafted branch, "Why this, why now", where the h2 is the offer, so the name is still needed): {crowdLine} -> {crowdLine(true)}
L150 (plate lead under the event-name h2): {crowdLine} -> {crowdLine(false)}. Result: "Today from 17:30 to 19:00: about 33,900 people 1.2 km from your door..."

2) L157-162:
OLD:
                <>
                  <p className="t-name">Your campaign is being written</p>
                  <p className="mt-2 max-w-2xl text-base">The agent has read the crowd through Qloo and is choosing your offer and the words. Come back in a minute.</p>
                  <Link href={`/campaigns/${campaign.id}`} className="mt-3 inline-flex text-base link">Follow it</Link>
                </>
NEW:
                <>
                  <p className="t-name">Writing your campaign</p>
                  <div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
                  <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                    <Link href={`/campaigns/new?merchant=${merchant.id}&event=${next.event.id}`} className="btn btn-accent btn-lg">See who is coming</Link>
                    <Link href={`/campaigns/${campaign.id}`} className="text-base link">Follow the draft</Link>
                  </div>
                  {now - Date.parse(campaign.created_at.replace(" ", "T") + "Z") < 15 * 60_000 && <RefreshEvery seconds={15} />}
                </>

3) New file src/app/today/RefreshEvery.tsx:
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export function RefreshEvery({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => { const t = setInterval(() => router.refresh(), seconds * 1000); return () => clearInterval(t); }, [router, seconds]);
  return null;
}
Add to the page imports: import { RefreshEvery } from "./RefreshEvery";

How this differs from the reported fix: refreshing every 15 s and adding a skeleton is not enough on its own. In operator mode the draft never arrives, so the poller would spin forever on a page that is force-dynamic (radar and weather on every refresh) and the hero would still have no action. This version stops refreshing after 15 minutes and gives the hero a real button (the Qloo crowd page). The btn on a Link is already used in this file at L167.

### #19 [minor] today 1440 and 390
**Subset of #26, skip if #26 is applied.**

Where: src/app/today/page.tsx:78-80 (crowdLine), used at :141 (drafted) and :150 (non-drafted hero lead)

Problem: In the state the demo actually shows, the hero has no offer, no primary action (only a 'Follow it' link) and no channel texts. The plate is a status card, and its lead repeats the h2 ('Theatre crowd arriving, 34 shows' then '..., theatre crowd arriving, 34 shows: about 33,900...'). The target shows the offer, 'Publish it now' and the three texts. Every alert since Wed 21 Oct says 'The agent is writing the campaign now', so this state is the norm.

Fix:

Only part (3) holds. Drop the event name from the lead when the h2 already shows it.
L78-80 old:
  const crowdLine = next && w0 ? (
    <>
      {dayOf(w0.start)} from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span>, {next.event.name.charAt(0).toLowerCase() + next.event.name.slice(1)}: about {next.capacity.toLocaleString("en-US")} people
new:
  const crowdLine = (withName: boolean) => next && w0 ? (
    <>
      {dayOf(w0.start)} from <span className="mono">{fmtTime.format(new Date(w0.arrive))}</span> to <span className="mono">{fmtTime.format(new Date(w0.leave))}</span>{withName ? `, ${next.event.name.charAt(0).toLowerCase() + next.event.name.slice(1)}` : ""}: about {next.capacity.toLocaleString("en-US")} people
(the rest of the expression, ending in `) : null;`, stays as it is)
L141 old: <p className="t-lead mt-4">{crowdLine}</p>  new: <p className="t-lead mt-4">{crowdLine(true)}</p>
L150 old: <p className="t-lead mt-5">{crowdLine}</p>  new: <p className="t-lead mt-5">{crowdLine(false)}</p>
Result on the plate: "Today from 17:30 to 19:00: about 33,900 people 1.2 km from your door. ..."
Reject part (2), the skeleton grid plus a 20 s router.refresh: it is a new feature, not a Velours defect. In operator mode no draft ever arrives on its own, so the skeletons would sit there forever and suggest something is loading when nothing is. Part (1), drafting the hero campaign before the demo, is demo prep and not a code change. The drafted branch (L108-143) already matches the target.

## src/app/campaigns/[id]/page.tsx

### #3 [major] campaign-sent both
Where: src/app/campaigns/[id]/page.tsx:77 (the note is rendered raw from the stored payload; this is the line that fixes the demo page), page.tsx:81 (summary "payload"), page.tsx:62 and 71-73 (eyebrow and chip); src/server/channels/index.ts:83 and :89 (only affect sends made after the change)

Problem: Customer page shows environment variable names and debug words: 'exact Snapchat Marketing API payload, not pushed without an ad account (SNAP_ACCESS_TOKEN, SNAP_AD_ACCOUNT_ID)', three lowercase 'payload' disclosures opening 13 px JSON, and a 'simulated' chip on every card. Reads as a dev console, not a product.

Fix:

Main correction: the issue's index.ts:83 fix on its own does NOT fix the page. status_note is saved in sends.payload_json when the campaign is sent (index.ts:33-36, record() does JSON.stringify(payload)). The demo campaign camp_7d4b6d90b536 is already sent, so it keeps the old string. The page has to replace the note when it renders:

1) page.tsx, after the imports (line 8) add:
const SIMULATED_NOTE: Partial<Record<ChannelId, string>> = {
  geofenced_ad: "Ready for Snapchat, word for word. It goes out once your ad account is connected.",
  google_post: "Ready for your Google listing. It goes out once the listing is verified.",
};
page.tsx:77
old: {typeof payload.status_note === "string" ? payload.status_note : ""}
new: {s.simulated && SIMULATED_NOTE[s.channel as ChannelId] ? SIMULATED_NOTE[s.channel as ChannelId] : typeof payload.status_note === "string" ? payload.status_note : ""}

2) page.tsx:81
old: <summary className="text-sm font-medium text-[var(--muted)]">payload</summary>
new: <summary className="text-sm font-medium text-[var(--muted)]">See the exact request</summary>
(Not "See exactly what was sent": these sends are simulated, so nothing was sent.)

3) page.tsx:62 and 71-73, say "simulated" once (same idea as the Alerts line "Recorded here; WhatsApp is not connected yet."):
old (62): <p className="eyebrow">Published</p>
new: <p className="eyebrow">{sends.some((s) => s.simulated) ? "Published · simulated in the demo" : "Published"}</p>
old (71-73): <span className="chip">\n{real ? "sent" : s.status}\n</span>
new: {!s.simulated && <span className="chip">{real ? "Sent" : s.status}</span>}

4) For sends made from now on (this also cleans the JSON inside the disclosure):
index.ts:83
old: status_note: "exact Snapchat Marketing API payload, not pushed without an ad account (SNAP_ACCESS_TOKEN, SNAP_AD_ACCOUNT_ID)",
new: status_note: "Ready for Snapchat, word for word. It goes out once your ad account is connected.",
index.ts:89
old: status_note: "Business Profile localPosts payload; needs a verified listing"
new: status_note: "Ready for your Google listing. It goes out once the listing is verified."

5) Drop the issue's page.tsx:82 change (text-[13px] -> text-sm). Keep text-[13px]: the readability rules allow 13 px for metadata, checklist item 52 asks for exactly this size, and the block is a JSON code dump inside a closed disclosure.

### #25 [major] campaign-draft, campaign-sent both
Where: src/app/campaigns/[id]/page.tsx:94-102 (rationale at L98-99, inside the .plate div L94-102)

Problem: The aubergine plate holds the full 'Why, according to Qloo' rationale: 12 lines (draft) and 15 lines (sent) at 1440, about 19 lines at 390, in #E8DEEC on plum. A long read on the dark block, and the offer drowns in it.

Fix:

Take the rationale off the plate and set it on white directly under the plate, in the same left column. Keep its "Why, according to Qloo" label. Leave Confidence and Publish on the plate.

OLD (L94-102):
            <div className="plate">
              <p className="eyebrow">Chosen offer</p>
              <p className="t-heading mt-4">{offer?.title ?? draft.chosen_offer_id}</p>
              <p className="mt-3 text-lg text-[var(--muted)]">{nb(`${offer?.description ?? ""}. ${offer?.price ?? ""}.`)}</p>
              <p className="eyebrow mt-10">Why, according to Qloo</p>
              <p className="t-body mt-3">{nb(draft.rationale)}</p>
              <p className="mt-6 text-sm text-[var(--muted)] tnum">Confidence {(draft.confidence * 100).toFixed(0)}%</p>
              {campaign.status === "drafted" && (<form action={`/api/campaigns/${campaign.id}/approve`} method="post" className="mt-10"><button className="btn btn-accent btn-lg">Publish it now</button></form>)}
            </div>

NEW:
            <div>
              <div className="plate">
                <p className="eyebrow">Chosen offer</p>
                <p className="t-heading mt-4">{offer?.title ?? draft.chosen_offer_id}</p>
                <p className="mt-3 text-lg text-[var(--muted)]">{nb(`${offer?.description ?? ""}. ${offer?.price ?? ""}.`)}</p>
                <p className="mt-6 text-sm text-[var(--muted)] tnum">Confidence {(draft.confidence * 100).toFixed(0)}%</p>
                {campaign.status === "drafted" && (<form action={`/api/campaigns/${campaign.id}/approve`} method="post" className="mt-10"><button className="btn btn-accent btn-lg">Publish it now</button></form>)}
              </div>
              <p className="eyebrow mt-12">Why, according to Qloo</p>
              <p className="t-body mt-3">{nb(draft.rationale)}</p>
            </div>

Do not use the reported fix as written:
- firstSentences is a local function at src/app/today/page.tsx:253 and is not exported, so calling it from the campaign page fails to compile.
- The rationale's first sentence would appear twice on the screen.
- With the full rationale above Audience, the right column becomes about twice the plate's height, at a 405 px measure.

Follow-up for design: checklist item 47 (design/brand/PREMIUM-CHECKLIST.md L294) says to keep "its reason" on the plate. Its text should change to match.

### #9 [minor] campaign-draft, campaign-sent 1440
Where: src/app/campaigns/[id]/page.tsx:93

Problem: Measure is under 65 to 75 on the page's main reading text. The plate takes the 1.25fr column (507 px, text 379 to 405 px), so the 'Why, according to Qloo' rationale runs 12 to 15 lines at 47 to 50 characters. Audience sits at 52 to 53 characters, limitations at 59 to 60. Every other single-column page measures 67 to 73.

Fix:

L93 `<section className="stack-block grid gap-x-16 gap-y-12 md:grid-cols-[1.25fr_1fr]">` -> `<section className="stack-block grid gap-y-16">`. Nothing else changes: the plate (L94-102) spans the 976 px column like Today's plate, its `.t-body` rationale caps at var(--measure) (544 px), and the `space-y-12` div at L103 (Audience and Windows) stacks below it, also capped at the measure. I checked this by injecting the class on the live page. Not covered by this fix: "What this does not establish" (L146-149) stays in the 2-column channel grid at L123, at 456 px and 55 to 56 characters.

### #7 [minor] campaign-draft, campaign-sent both
Where: src/app/campaigns/[id]/page.tsx:124 (Geofenced ad title template) and src/app/campaigns/[id]/page.tsx:177 (Channel eyebrow)

Problem: The geofenced-ad channel title puts a distance ('900 m', '600 m') in a 14 px label. R3 asks for distances of at least 15 px. At 1440 the title also wraps, and the second line starts with '· $35/day', which R6 forbids (item 103).

Fix:

Both edits are needed. The issue's L177 class change on its own leaves the dot at the start of line 2 at 1440, and its L124 string as printed loses the existing   between the number and "m".

L124 old:
title={`Geofenced ad · ${draft.geofenced_ad.platform} · ${draft.geofenced_ad.radius_m} m · $${draft.geofenced_ad.daily_budget_usd}/day`}
L124 new:
title={`Geofenced ad · ${draft.geofenced_ad.platform} · ${draft.geofenced_ad.radius_m} m · $${draft.geofenced_ad.daily_budget_usd}/day`}

L177 old:
<p className="eyebrow">{title}</p>
L177 new:
<p className="eyebrow text-sm tnum">{title}</p>

Alternative for L177 (design owner, changes every label on the site): globals.css L157 `--fs-label: 14px;` -> `--fs-label: 15px;`. L124 still needs the   before each dot either way.

### #30 [minor] campaign-draft, campaign-sent, pulse both
Where: src/app/campaigns/[id]/page.tsx:109, :124, :156 (summary :155-157, table ends :167); src/app/pulse/page.tsx:37 (provenance table ends :195). Not :127.

Problem: More dev words on product pages: 'Windows · America/New_York', 'Geofenced ad · snapchat' (lowercase), 'Button: Get directions', 'Provenance · 22 steps · Qloo live 0, cached 18' (reads as Qloo failing), and the pulse subtitle '· 0 live calls, 9 cached'.

Fix:

1. campaigns/[id]/page.tsx:109
old: <p className="eyebrow">Windows · {merchant.timezone}</p>
new: <p className="eyebrow">When the crowd is outside, {merchant.timezone.split("/").pop()!.replace(/_/g, " ")} time</p>
(This shows "New York time" or "Paris time". It uses the timezone, not merchant.city, because geocode.ts:25 can store city "" or a village name for onboarded merchants. The proposed "{merchant.city} time" would then show " time".)

2. campaigns/[id]/page.tsx:124
old: title={`Geofenced ad · ${draft.geofenced_ad.platform} · ${draft.geofenced_ad.radius_m} m · $${draft.geofenced_ad.daily_budget_usd}/day`}
new: title={`Geofenced ad · ${draft.geofenced_ad.platform === "meta" ? "Meta" : "Snapchat"} · ${draft.geofenced_ad.radius_m} m · $${draft.geofenced_ad.daily_budget_usd}/day`}
(The enum is "snapchat" | "meta" (schema.ts:18). The non-breaking spaces also fix "· $35/day" starting the second line at 1440, which breaks R6 and item 103.)

3. campaigns/[id]/page.tsx:127: no change. Keep "Button: {cta}".

4. campaigns/[id]/page.tsx:155-157
old: <summary className="text-base font-semibold text-[var(--ink)]">
          Provenance · {prov.length} steps · Qloo live {prov.filter((p) => p.kind === "qloo" && !p.cache_hit).length}, cached {prov.filter((p) => p.kind === "qloo" && p.cache_hit).length}
        </summary>
new: <summary className="text-base font-semibold text-[var(--ink)]">Provenance · {prov.length} steps</summary>
Then after </table> at :167, add:
        <p className="t-meta mt-6 tnum">Qloo calls: {prov.filter((p) => p.kind === "qloo" && !p.cache_hit).length} live, {prov.filter((p) => p.kind === "qloo" && p.cache_hit).length} cached.</p>

5. pulse/page.tsx:37
old: ...radius around your door · {pulse.qlooCalls.live} live calls, {pulse.qlooCalls.cached} cached
new: ...radius around your door
Then after </table> at pulse :195, add:
        <p className="t-meta mt-6 tnum">Qloo calls: {pulse.qlooCalls.live} live, {pulse.qlooCalls.cached} cached.</p>
(This matches campaigns/new/page.tsx:192, so all three provenance blocks read the same.)

## src/app/campaigns/new/page.tsx

### #36 [major] campaign-new 390
**Recommended (tags and examples as one line on phones). #5 and #22 are the same fix with other breakpoints: skip.**

Where: src/app/campaigns/new/page.tsx:156-158 (offers table in the 'Your offers against this crowd' section)

Problem: The offers table keeps 4 columns on a phone. The tags and 'e.g.' cells shrink to about 100 px: 9 to 14 characters per line, 6 to 7 lines per cell, and lines such as 'big' / 'screen' / 'best' / 'fit'. It reads as a word column, not sentences.

Fix:

L156 old:
<td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}</td>
L156 new:
<td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}<span className="mt-1 block text-sm font-normal text-[var(--muted)] md:hidden">{f.tagNames.join(", ")}. e.g. {f.topPlaces.join(", ")}</span></td>

L157 old:
<td className="text-sm text-[var(--muted)]">{f.tagNames.join(", ")}</td>
L157 new:
<td className="hidden text-sm text-[var(--muted)] md:table-cell">{f.tagNames.join(", ")}</td>

L158 old:
<td className="text-sm text-[var(--muted)]">e.g. {f.topPlaces.join(", ")}</td>
L158 new:
<td className="hidden text-sm text-[var(--muted)] md:table-cell">e.g. {f.topPlaces.join(", ")}</td>

(The new span goes after the 'best fit' expression, not between the title and 'best fit', so 'best fit' stays on the title line.)

### #5 [major] campaign-new 390
**Duplicate of #36, skip.**

Where: src/app/campaigns/new/page.tsx:156-158 (table at L152, rows L156 title td, L157 tags td, L158 examples td; file matches HEAD 7c9b7b3, no working-tree change)

Problem: Offers table keeps 4 columns on a phone: tags and examples set one word per line ('Sports / Bar, / Beer', 'e.g. / Slattery's / Midtown / Pub,'), and 'best / fit' breaks.

Fix:

L156 old: <td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}</td>
L156 new: <td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 whitespace-nowrap text-sm font-medium text-[var(--muted)]">best fit</span>}<span className="mt-1 block text-sm font-normal text-[var(--muted)] md:hidden">{f.tagNames.join(", ")}</span></td>
L157 old: <td className="text-sm text-[var(--muted)]">{f.tagNames.join(", ")}</td>
L157 new: <td className="hidden text-sm text-[var(--muted)] md:table-cell">{f.tagNames.join(", ")}</td>
L158 old: <td className="text-sm text-[var(--muted)]">e.g. {f.topPlaces.join(", ")}</td>
L158 new: <td className="hidden text-sm text-[var(--muted)] md:table-cell">e.g. {f.topPlaces.join(", ")}</td>
(Tailwind v4.3, md = 768 px default, no breakpoint override in globals.css; md:table-cell gets generated once it appears in source. Phone drops the "e.g." places column; acceptable, those places already show in the "Bars within 1300 m" list above.)

### #22 [major] campaign-new 390
**Duplicate of #36, skip.**

Where: src/app/campaigns/new/page.tsx:156-158 (table at 152, row map at 154; source unchanged since 7c9b7b3)

Problem: The 'Your offers against this crowd' table keeps 4 columns on a phone. The examples column wraps one word per line ('e.g. / Slattery's / Midtown / Pub, / The / Rutherford...'), 'Game night big screen best fit' is squeezed into about 90 px, and the block runs about 800 px of ragged words.

Fix:

In src/app/campaigns/new/page.tsx, change three lines.

L156 old:
<td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}</td>
L156 new:
<td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}<span className="mt-1 block text-sm font-normal text-[var(--muted)] sm:hidden">{f.tagNames.join(" · ")}</span></td>

L157 old:
<td className="text-sm text-[var(--muted)]">{f.tagNames.join(", ")}</td>
L157 new:
<td className="text-sm text-[var(--muted)] max-sm:hidden">{f.tagNames.join(", ")}</td>

L158 old:
<td className="text-sm text-[var(--muted)]">e.g. {f.topPlaces.join(", ")}</td>
L158 new:
<td className="text-sm text-[var(--muted)] max-sm:hidden">e.g. {f.topPlaces.join(", ")}</td>

Tailwind is ^4.3.3, so the max-sm: and sm: variants work. On a phone each row shows the offer name with "best fit", then one muted line of tags at 15 px, then the score. From 640 px up the table keeps its 4 columns.

## src/app/start/confirm/page.tsx

### #28 [major] confirm both
**Recommended (one chip per label, plain labels, no raw namespace). #21 is the same idea: skip.**

Where: src/app/start/confirm/page.tsx:24 (timezone in intro), :17 (candidates go straight from offerTagCandidates to the chips), :44 (raw namespace span)

Problem: Every chip prints a raw Qloo namespace ('· offerings:place', '· good_for:qloo', '· beverage_offerings:qloo', '· dining_option:qloo', '· genre:media'), and each concept shows four look-alike chips ('Craft Beer' x4). The intro says '(America/New_York)'. This is the owner's onboarding step 2.

Fix:

1) After L3 add:
const TAG_KIND: Record<string, string> = {
  "offerings:place": "on the menu",
  "genre:place": "kind of place",
  "category:place": "category",
  "cuisine:qloo": "cuisine",
  "good_for:qloo": "good for",
  "specialty_dish:place": "signature dish",
  "menu_highlight:qloo": "menu highlight",
  "beverage_offerings:qloo": "drinks",
  "dining_option:qloo": "dining",
  "resy:collection": "Resy list",
};
// One chip per label, no media tags, three at most. The first (top-ranked, default-ticked) is unchanged.
function plainCandidates<T extends { name: string; namespace: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list
    .filter((t) => {
      const k = t.name.toLowerCase();
      return !t.namespace.endsWith(":media") && !seen.has(k) && !!seen.add(k);
    })
    .slice(0, 3);
}

2) L17 `const offers = await offerTagCandidates(merchant.id);` -> `const offers = (await offerTagCandidates(merchant.id)).map((o) => ({ ...o, concepts: o.concepts.map((c) => ({ ...c, candidates: plainCandidates(c.candidates) })) }));` (filter here, so the L39 empty check and the L42 `defaultChecked={i === 0}` both run on the filtered list).

3) L44 `<span className="text-[var(--muted)]">· {t.namespace}</span>` -> `{TAG_KIND[t.namespace] && <span className="text-[var(--muted)]">· {TAG_KIND[t.namespace]}</span>}` (a namespace not in the map shows no suffix; L41 `title={t.id}` still holds the full URN).

4) L24 `{merchant.name}, located at {merchant.address} ({merchant.timezone}). For each offer,` -> `{merchant.name}, located at {merchant.address}. For each offer,`

### #21 [major] confirm 1440 and 390
**Duplicate of #28, skip.**

Where: src/app/start/confirm/page.tsx:44 (the chip block is lines 38 to 47; the namespace strings come from src/server/qloo/tags.ts:33)

Problem: Onboarding step 2 shows raw taxonomy ids to the merchant ('· offerings:place', '· good_for:qloo', '· beverage_offerings:qloo', '· resy:collection'), with four near-identical chips per concept. At 390 each chip takes its own line, so the page runs 3,905 px of developer vocabulary.

Fix:

1) Under the imports (after line 3), add:

// Human labels for Qloo tag namespaces. The raw id stays in the title tooltip.
const NAMESPACE_LABEL: Record<string, string> = {
  "genre:place": "kind of place",
  "offerings:place": "on the menu",
  "cuisine:qloo": "cuisine",
  "category:place": "category",
  "dining_option:qloo": "way to eat",
  "good_for:qloo": "good for",
  "beverage_offerings:qloo": "drinks",
  "specialty_dish:place": "dish",
  "menu_highlight:qloo": "menu highlight",
  "resy:collection": "Resy list",
  "genre:media": "music or film genre",
};

2) Replace lines 38 to 47, old:
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.candidates.length === 0 && <span className="text-sm text-[var(--muted)]">No Qloo tag found.</span>}
                      {c.candidates.map((t, i) => (
                        <label key={t.id} className="chip h-10 cursor-pointer gap-3 px-4 text-[15px]" title={t.id}>
                          <input type="checkbox" name={`tag:${o.id}`} value={`${t.id}::${t.name}`} defaultChecked={i === 0} />
                          {t.name}
                          <span className="text-[var(--muted)]">· {t.namespace}</span>
                        </label>
                      ))}
                    </div>
new:
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.candidates.length === 0 && <span className="text-sm text-[var(--muted)]">No Qloo tag found.</span>}
                      {c.candidates.slice(0, 2).map((t, i) => (
                        <label key={t.id} className="chip h-10 cursor-pointer gap-3 px-4 text-[15px]" title={t.id}>
                          <input type="checkbox" name={`tag:${o.id}`} value={`${t.id}::${t.name}`} defaultChecked={i === 0} />
                          {t.name}
                          {NAMESPACE_LABEL[t.namespace] && <span className="text-[var(--muted)]">· {NAMESPACE_LABEL[t.namespace]}</span>}
                        </label>
                      ))}
                    </div>
                    {c.candidates.length > 2 && (
                      <details className="mt-3">
                        <summary className="link cursor-pointer text-[15px]">More tags</summary>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {c.candidates.slice(2).map((t) => (
                            <label key={t.id} className="chip h-10 cursor-pointer gap-3 px-4 text-[15px]" title={t.id}>
                              <input type="checkbox" name={`tag:${o.id}`} value={`${t.id}::${t.name}`} />
                              {t.name}
                              {NAMESPACE_LABEL[t.namespace] && <span className="text-[var(--muted)]">· {NAMESPACE_LABEL[t.namespace]}</span>}
                            </label>
                          ))}
                        </div>
                      </details>
                    )}

Correction to the reported fix: key the map on the full namespace, not on t.namespace.split(":")[0]. The live page includes "genre:media" (a music genre tag on "Beer"), and the reported version would label it "kind of place". Checked inputs inside a closed details element are still submitted, so the API route does not change.

## src/app/alerts/page.tsx

### #29 [major] alerts both
**Recommended.**

Where: src/app/alerts/page.tsx:31 (eyebrow), :53-55 (status line on every row), :58 (message rendered raw), :19 (no cap on the list). Leave src/server/agent/scan.ts:122 and :131 as they are: they build the WhatsApp message itself, and the phone needs the "Turnout for ..." header.

Problem: Reads like a log. Twelve identical blocks (4,658 px tall at 1440) each repeat 'Simulated, WhatsApp not connected' (already said in the intro) and 'Turnout for Penn & Pour', and alerts two days old still say 'The agent is writing the campaign now.' 'Today 12:00' inside a Wednesday alert is wrong when read on Friday. The eyebrow says 'Alerts · push'.

Fix:

All changes go in src/app/alerts/page.tsx. Leave scan.ts alone: on the phone, "Turnout for {name}" tells the reader who sent it. Strip the repeats only where the page renders.

1. L8: `searchParams: Promise<{ merchant?: string }>` -> `searchParams: Promise<{ merchant?: string; all?: string }>`

2. L19: `const alerts = listAlerts(merchant.id);` ->
```tsx
  const allAlerts = listAlerts(merchant.id);
  const alerts = sp.all ? allAlerts : allAlerts.slice(0, 6);
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: merchant.timezone });
  const weekday = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: merchant.timezone });
  const todayKey = dayKey.format(new Date());
  const sentAs = live ? "sent" : "simulated";
```
(put this after L21, so that `live` is already defined)

3. L31: `<p className="eyebrow">Alerts · push</p>` -> `<p className="eyebrow">Alerts</p>`

4. L53-55: show the status only when it differs from what the intro already says (the issue's "only failed or sent" is wrong: once WhatsApp is connected, a "sent" label would repeat the intro):
```tsx
                {a.status !== sentAs && (
                  <p className={a.status === "failed" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--muted)]"}>
                    {statusLabel[a.status] ?? a.status}{a.status === "failed" && a.to_ref ? ` · ${a.to_ref}` : ""}
                  </p>
                )}
```

5. L49-58: turn the arrow body into a block so the date is computed once. L52's inline `new Date(...)` becomes `at`, and L58 becomes:
```tsx
{(() => {
  const text = a.message
    .replace(/\nReview and approve:[\s\S]*$/, "")
    .replace(/^Turnout for [^\n]*\n/, "")
    .replace(/\nThe agent is writing the campaign now\./, "");
  return dayKey.format(at) === todayKey ? text : text.replace(/^Today /, `${weekday.format(at)} `);
})()}
```
where `const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z");`, and L52 renders `{fmt.format(at)}`.

6. After L67 `</section>`:
```tsx
        {!sp.all && allAlerts.length > alerts.length && (
          <Link href={`/alerts?merchant=${merchant.id}&all=1`} className="link stack-block inline-flex text-base">Show older alerts</Link>
        )}
```

### #35 [major] alerts 1440
Where: src/app/alerts/page.tsx:57

Problem: Alert message bodies run 84 to 87 characters per line, above the 65 to 75 measure on all 13 messages. max-w-[60ch] resolves to 679 px at 17 px because a ch in Instrument Sans is 11.3 px, and R4 bans a wider max-w on prose.

Fix:

src/app/alerts/page.tsx:57 `<div className="mt-4 max-w-[60ch] whitespace-pre-wrap text-base text-[var(--text)]">` -> `<div className="measure mt-4 whitespace-pre-wrap text-base text-[var(--text)]">`. Optional, design side: design/brand/PREMIUM-CHECKLIST.md L315 (item 62) still prescribes `max-w-[60ch]` for this box. Change it to `measure` there too so nobody re-applies 60ch.

### #23 [minor] alerts 1440 and 390
**Alternative layout to #29: skip if #29 is applied.**

Where: src/app/alerts/page.tsx:48-67 (the alerts.map; the status line is L53-55 and the message is L57-59), plus 3 helper lines after L23

Problem: 19 near-identical blocks. Each one repeats 'Simulated, WhatsApp not connected' (already said in the intro), 'Turnout for Penn & Pour' and 'The agent is writing the campaign now.' The page runs 4,658 px at 1440 and 5,830 px at 390 and reads like a log, not a premium feed.

Fix:

Don't use the reporter's <table className="data">. At 390 px a 3-column table leaves the moment column about 117 px wide (roughly 12 characters a line), which breaks the 65 to 75 measure rule. Use a list that stacks on phones and goes 2 columns from sm. Say the WhatsApp status once, as checklist item 9 does on Today; the intro at L35 already says it.

1) After L23 add:
  const when = (s: string) => fmt.format(new Date(s.endsWith("Z") ? s : s.replace(" ", "T") + "Z"));
  const body = (m: string) => m.replace(/\nReview and approve:[\s\S]*$/, "").replace(/^Turnout for [^\n]*\n/, "");
  const [latest, ...rest] = alerts;

2) Replace L48-67 (old: <section className="stack-block space-y-16">{alerts.map((a, i) => (<article key={a.id} className={i === 0 ? "tone" : undefined}> ... </article>))}</section>) with:
        {latest && (
          <article className="tone stack-block">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="t-clock text-[var(--ink)]">{when(latest.created_at)}</p>
              {latest.status !== "simulated" && (
                <p className={latest.status === "failed" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--muted)]"}>
                  {statusLabel[latest.status] ?? latest.status}{latest.status === "failed" && latest.to_ref ? ` · ${latest.to_ref}` : ""}
                </p>
              )}
            </div>
            <div className="mt-4 max-w-[60ch] whitespace-pre-wrap text-base text-[var(--text)]">{body(latest.message)}</div>
            {latest.campaign_id && (
              <Link href={`/campaigns/${latest.campaign_id}`} className="link mt-4 inline-flex text-base">Open the campaign</Link>
            )}
          </article>
        )}

        {rest.length > 0 && (
          <ul className="stack-block space-y-8">
            {rest.map((a) => (
              <li key={a.id} className="grid gap-x-8 gap-y-1 sm:grid-cols-[10.5rem_1fr]">
                <p className="t-clock text-[var(--muted)]">{when(a.created_at)}</p>
                <p className="max-w-[60ch] text-base text-[var(--text)]">
                  {body(a.message).split("\n")[0]}
                  {a.status === "failed" && <span className="text-[var(--danger)]"> WhatsApp failed{a.to_ref ? ` · ${a.to_ref}` : ""}.</span>}
                  {a.campaign_id && <> <Link href={`/campaigns/${a.campaign_id}`} className="link">Open the campaign</Link></>}
                </p>
              </li>
            ))}
          </ul>
        )}

Older rows show only the moment line, the 15 px t-clock and the link. A row adds a status only when it failed. The latest alert stays on .tone with its full message, without the "Turnout for Penn & Pour" line and without the status when simulated.

## src/app/pulse/page.tsx

### #24 [minor] pulse 1440 and 390
Where: src/app/pulse/page.tsx:147-151 (the awaiting note; the issue cites 146-150), :152-182 (the failed note and the brief plate have the same problem), :42 (the button), insert after :44, before the weather section at :46

Problem: No focal point. The h1 is followed by five data sections. The brief, the page's reason to exist, appears only at the very bottom as a tone note ('The agent is writing this week's brief. Reload in a moment.'). Meanwhile 'Write this week's brief' stays active next to the h1 while the agent is already writing it. Nothing marks the one plate a page may have (Pulse's weekly offer).

Fix:

All in src/app/pulse/page.tsx.

1. Move the three state blocks under the header. Cut L147-182 (the `row?.status === "awaiting_operator"` tone, the `row?.status === "failed"` tone, and the whole `{brief && (<section ...>...)}` block) and paste them right after `</header>` (L44), before `{evenings.length > 0 && (` (L46). The weekly offer plate, or the status of the brief that was just asked for, then sits straight under the h1. The data sections become the evidence below it, the same order as Today.
   - In the moved brief block, L159: `<section className="stack-section">` -> `<section className="stack-block">`
   - Weather, L47: `<section className="stack-block">` -> `<section className="stack-section">` (it now follows a section)
   - The awaiting block stays `tone stack-block`. Do not make it a `.plate`. If a loading cue is wanted, follow checklist item 51 (the campaign wave): after the sentence, add `<div className="mt-8 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-title" /><span className="skeleton skeleton-line mt-6" /><span className="skeleton skeleton-line" /></div>`

2. L42, do NOT add `disabled`. Change the label only:
   `{brief ? "Redo this week's brief" : "Write this week's brief"}`
   ->
   `{brief ? "Redo this week's brief" : row?.status === "awaiting_operator" ? "Ask for the brief again" : "Write this week's brief"}`

3. Optional, related, also build-owned. L23-24 show only the newest row, so a pending or failed row hides the last brief that was drafted. Add `latestDraftedPulse(merchantId)` in src/server/agent/pulse.ts (`... WHERE merchant_id = ? AND status = 'drafted' ORDER BY created_at DESC LIMIT 1`). Then L24 `const brief = getBrief(row);` -> `const brief = getBrief(row) ?? getBrief(latestDraftedPulse(merchant.id));`

### #8 [minor] pulse both
Where: src/app/pulse/page.tsx:48

Problem: Clocks '17:00 to 21:00' sit in a 14 px eyebrow. R3 asks for clocks of at least 15 px, tabular.

Fix:

L48: `<p className="eyebrow">Evenings this week at your door · 17:00 to 21:00 · Open-Meteo</p>` -> `<p className="eyebrow">Evenings this week at your door · <span className="mono">17:00 to 21:00</span> · Open-Meteo</p>`. Why `.mono`: it triggers the existing `p.eyebrow:has(.mono) { font-size: var(--fs-clock) }` rule in globals.css (L906, 15 px). That is the pattern checklist item 94 already uses for eyebrows that carry a clock. `.mono` (L369) also makes the clock tabular and keeps it on one line. The reported fix, `eyebrow text-sm` with a `tnum` span, skips that system rule. It also changes the label leading from 1.4 to 1.6, because Tailwind's text-sm sets line-height too.

## Not verified (49 minor issues, reported by one judge only)

Listed in `.tmp/velours/r3-result.json` under `unverified`. Optional; none is a blocker.
