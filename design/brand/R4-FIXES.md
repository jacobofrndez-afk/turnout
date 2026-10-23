# Velours round 4: fixes for the build session (and two for the MKG session)

After commit 02f499a every page was re-rendered at 1440 and 390 (`.tmp/velours/checklist/r4/`) and judged again. Premium 8 (target judge) and 7 (founder judge), up from 7 and 6.5. Readability 9, up from 8. Every recommended R3-FIXES item landed. No blocker is left; the radar loop is gone and the console is clean on all 20 pages.

Each issue below was confirmed by a separate skeptic on the current code; the fix text is the skeptic's corrected version. The five design-owned issues are already fixed in src/app/globals.css: the Now label background, map credit ring spacing, field scroll margin, field ring offset 3 px, curve height.

What still keeps the founder at 7, and the items that fix it:
- Waiting states on hero screens: Today #4 and Pulse #7. Both are mostly demo prep: answer the operator prompts before the demo.
- Analyst words on customer screens: campaigns/new #9, campaigns/[id] #12 and #13, radar #23.
- Credibility bugs: "best fit: Game night big screen" for Harry Styles (#8); "170 extra guests, 100% of your 70 seats" (#16).
- Radar busy at 1440: #14 (no duplicate board in two columns), #2, #3, #15 with #32.

Order: #4 and #7 (demo prep), #16, #8, #9, #14, then the rest. Inside one file, apply from the highest line down. Duplicates are marked: apply the recommended one only.

## src/app/today/page.tsx, src/app/layout.tsx, src/server/agent/scan.ts

### #4 [major] today 1440 and 390
**Today's hero is still a waiting state. Part (1) is demo prep: answer the operator prompt before the demo. Part (2) is code.**

Where: src/app/today/page.tsx:161 (skeleton) and :166 (RefreshEvery), inside the awaiting_operator branch at :158-167; add the `fresh` const after :70

Problem: The one hero is still a waiting state: 'Writing your campaign' plus two skeleton bars on the plate. The target shows the offer title, 'Publish it now' and the three channel texts. In operator mode the draft never arrives, so the skeleton suggests loading forever. RefreshEvery stops after 15 min, but the skeleton stays.

Fix:

(1) Demo prep, no code change: write data/agent-inbox/<campaign>.draft.json for the hero campaign before the demo. Today that is camp_8676c08c1a02, event wave_m_penn_pour_arrival_202610232230. The page's pollOperatorDraft picks the file up and the drafted branch (L109-145, already matching the target) renders. Do it again for each new hero campaign, because the hourly scan keeps creating new awaiting_operator rows.
(2) Code. After L70 (`const draft = campaign ? getDraft(campaign) : undefined;`) add:
  const fresh = campaign?.status === "awaiting_operator" && now - Date.parse(campaign.created_at.replace(" ", "T") + "Z") < 15 * 60_000;
(campaign can be undefined, so the guard is needed. The issue's version, put before the JSX without a guard, does not type-check.)
L161 old:
                  <div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
L161 new:
                  {fresh ? (
                    <div className="mt-4 max-w-2xl" aria-hidden="true"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line" /></div>
                  ) : (
                    <p className="mt-2 max-w-2xl text-base">The crowd read is ready. The offer and the words come with the draft.</p>
                  )}
L166 old:
                  {now - Date.parse(campaign.created_at.replace(" ", "T") + "Z") < 15 * 60_000 && <RefreshEvery seconds={15} />}
L166 new:
                  {fresh && <RefreshEvery seconds={15} />}
The new <p> uses the same classes as the needs_input sentence at L171 (text-base is 17 px in globals.css:33, so the readability floor holds on the plate).

### #16 [major] today, alerts, radar 1440 and 390
**"170 extra guests, 100% of your 70 seats" reads as a bug: say "enough to fill your 70 seats". Also touches alerts and scan.ts.**

Where: src/app/today/page.tsx:82 (hero) and :208 (later list); src/server/agent/scan.ts:124 (composeAlert, new alerts only); src/app/alerts/page.tsx:68-71 (alerts already stored in the DB with the old text)

Problem: 'about 170 extra guests, 100% of your 70 seats': more guests than seats, shown as 100%, reads as a bug. It repeats in 6 alerts ('182 guests, 100% of your 70 seats'). The radar already says it right: 'enough to fill your 70 seats'.

Fix:

1) src/app/today/page.tsx:82
old: {Math.min(100, Math.round(next.fill * 100))}% of your {seats} seats.
new: {next.fill >= 1 ? `enough to fill your ${seats} seats` : `${Math.round(next.fill * 100)}% of your ${seats} seats`}.

2) src/app/today/page.tsx:208
old: About {it.potentialGuests} extra guests, {Math.min(100, Math.round(it.fill * 100))}% of your seats
new: About {it.potentialGuests} extra guests, {it.fill >= 1 ? "enough to fill your seats" : `${Math.round(it.fill * 100)}% of your seats`}

3) src/server/agent/scan.ts:124
old: `Could bring about ${it.potentialGuests} guests, ${Math.min(100, Math.round(it.fill * 100))}% of your ${seats} seats.`,
new: `Could bring about ${it.potentialGuests} guests, ${it.fill >= 1 ? `enough to fill your ${seats} seats` : `${Math.round(it.fill * 100)}% of your ${seats} seats`}.`,

4) src/app/alerts/page.tsx:71 (alerts are stored text, so step 3 alone leaves the 6 existing alerts unchanged)
old:                       .replace(/\nThe agent is writing the campaign now\./, "");
new:                       .replace(/\nThe agent is writing the campaign now\./, "")
                      .replace(/, 100% of your (\d+) seats\./, ", enough to fill your $1 seats.");

The condition fill >= 1 is the same as the radar's guests >= seats check (RadarView.tsx:475), because concentration.ts:112 defines fill = potentialGuests / seats with the same Math.max(10, seats ?? 60).

### #31 [minor] today 1440
Where: src/app/layout.tsx:32

Problem: The 'Powered by Qloo' focus ring is lopsided on every page. The link has pl-3 and no right padding, so the ring has 12 px of air on the left and sits 2 px from the 'o' on the right.

Fix:

src/app/layout.tsx L32 className: `ml-2 hidden min-h-11 items-center whitespace-nowrap pl-3 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--plum)] md:inline-flex` -> `ml-2 -mr-3 hidden min-h-11 items-center whitespace-nowrap px-3 text-xs font-medium text-[var(--muted)] transition-colors hover:text-[var(--plum)] md:inline-flex`

## src/app/radar/RadarMap.tsx, radar.css, RadarView.tsx, radar/page.tsx

### #14 [minor] radar 1440
**Recommended: hide the peek board in the two-column layout (one board, one "See who is coming"). It makes #33 unnecessary and #24 matter only from 640 to 1023 px.**

Where: src/app/radar/radar.css:39 (the board is built at src/app/radar/RadarMap.tsx:291; leave that line as it is)

Problem: The peek board still covers the lower-right third of the 608 px map, over the ring. It repeats the chosen-moment card right beside it and adds a second 'See who is coming, with Qloo', so the same action appears twice on one screen.

Fix:

Fix it in CSS. Leave RadarMap.tsx:291 unchanged.

radar.css L39 OLD:
@media (min-width: 1024px) { .tm-root:not(.is-full):not(:fullscreen) .tm-maparea { position: sticky; top: 100px; } }

NEW:
@media (min-width: 1024px) {
  .tm-root:not(.is-full):not(:fullscreen) .tm-maparea { position: sticky; top: 100px; }
  .tm-root:not(.is-full):not(:fullscreen) .tm-peek { display: none; } /* the chosen moment's card sits beside the map: one board, one "See who is coming" */
}

Result: in the two-column layout the board is gone and the selected list card carries the moment. The board still shows in full screen, where the list is hidden, and from 640 to 1023 px, where the list sits under the map instead of beside it.

### #2 [major] radar 390 (1440 close)
Where: src/app/radar/RadarMap.tsx:468 (ring-label layout) and :508-509 (comment + m.moveLayer("ring-label") at the end of addLayers)

Problem: Ring labels collide at 390. The tops of "lk" in "1.3 km · 16 min walk" are hidden under the Full screen button. "1 km · 13 min walk" and "500 m · 6 min walk" print over the chosen crowd's wine dots. text-allow-overlap is true and the layer is placed first, so the keepout boxes never move it, and it draws above the dots.

Fix:

1) RadarMap.tsx:468, in the ring-label layout:
old: "text-anchor": "bottom", "text-offset": [0, -0.2], "text-allow-overlap": true
new: "text-variable-anchor": ["bottom", "bottom-right", "bottom-left"], "text-offset": [0, -0.2], "text-allow-overlap": true
(Keep allow-overlap true. With variable anchors, MapLibre 5.24 first tries every anchor with no overlap, and overlaps only as a last resort, so a ring label never disappears.)

2) RadarMap.tsx:508-509:
old:
  // ring labels place first (top symbol layer); venue labels then collide with them instead of drawing over them
  m.moveLayer("ring-label");
new:
  // Wine-dot cores take room in label placement too (invisible 14 px icons), so ring labels slide off the chosen crowd.
  if (!m.hasImage("dot-block")) m.addImage("dot-block", { width: 14, height: 14, data: new Uint8Array(14 * 14 * 4) });
  m.addLayer({ id: "dot-block", type: "symbol", source: "venues", filter: ["==", ["get", "tonight"], 1], layout: { "icon-image": "dot-block", "icon-allow-overlap": true } });
  // Placement runs top layer first: keepout, dot-block, ring labels, then venue labels, which collide with all three.
  // Dots stay under all text. A ring label takes its next free anchor and overlaps only when none is free.
  m.moveLayer("ring-label", "dot-block");
  m.moveLayer("keepout");
Final order: venue-mass, venue-dot, venue-label, ring-label, dot-block, keepout. The 14 px block is narrower than a venue label's own offset (0.9 em radial minus 4 px padding is 7.7 px, more than the 7 px half-width), so a labelled venue never collides with its own dot.

Do NOT apply the reported fix. I tested it live: moving venue-dot above the text leaves the 1 km label in the same place, so a wine disc now covers "lk" and it reads "1 km · 13 min wa". allow-overlap false also lets a ring label vanish when no anchor is free (rings can be only 150 m apart). It also puts every venue name under the dots.

### #3 [minor] radar 390 and 1440
Where: src/app/radar/RadarMap.tsx:263

Problem: A cold venue label is printed across the chosen crowd's wine dots. "The Lost Boys (NY)" appears at both widths, and r4 1440 also shows "Oh Mary! (NY)" over a wine dot. labelData drops a cold label only when it sits within 80 px of a signed crowd. The selected crowd has no sign (`!q.selected`), so its 13 dots do not count.

Fix:

src/app/radar/RadarMap.tsx L263
old: `const signed = points.filter((q) => q.hot && q.tonight && !q.selected).map((q) => m.project([q.lon, q.lat]));`
new: `const signed = points.filter((q) => q.hot && q.tonight).map((q) => m.project([q.lon, q.lat]));`
(L264 nearSign and L270 `labelled` stay as they are. Optional wider version: `(q.hot && q.tonight) || q.selected`, which also keeps a chosen cold venue clear. Not needed for this case.)

### #15 [minor] radar 1440 and 390
**Apply steps 2 and 3. For step 1 use #32 instead (inner ring labels kept on desktop).**

Where: src/app/radar/RadarMap.tsx:530 (ring-label features in drawRings) and :501-503 (venue-label layout, end of its addLayer in addLayers). Not :468, not :500, not the Map options at :178-187.

Problem: Map labels still collide. Half-faded ghost labels ('The New York Pops', 'School Girls; Or, The African Mean Girls Play') sit under Full screen. Markers overprint 'The Lost Boys (NY)' and 'Oh Mary! (NY)'. At 390 a marker covers 'walk' in '1 km · 13 min walk'. Three ring labels plus venue names in a 350 px map is too much text.

Fix:

1) RadarMap.tsx:530 (R3-FIXES #4 step 1, one edit instead of the issue's main flag plus layer filter; same result)
OLD:     features: rings.map((x) => ({ type: "Feature", properties: { label: `${fmtKm(x.r)} · ${walkMin(x.r)} min walk` }, geometry: { type: "Point", coordinates: northOf(c, x.r) } })),
NEW:     features: rings.filter((x) => x.main).map((x) => ({ type: "Feature", properties: { label: `${fmtKm(x.r)} · ${walkMin(x.r)} min walk` }, geometry: { type: "Point", coordinates: northOf(c, x.r) } })),

2) RadarMap.tsx:501, venue-label layout
OLD: "text-max-width": 9, "text-padding": 4 },
NEW: "text-max-width": 9, "text-padding": 2 },

3) RadarMap.tsx, right after L503 (the `  });` that closes the venue-label addLayer), before the keepout comment at L504, insert:
  // Venue names avoid every venue dot (circle layers take no part in label collision): an empty 14 px icon per venue,
  // placed before the names, so a name takes its next free anchor or drops out instead of printing over a dot.
  if (!m.hasImage("dotbox")) m.addImage("dotbox", { width: 14, height: 14, data: new Uint8Array(14 * 14 * 4) });
  m.addLayer({ id: "venue-dotbox", type: "symbol", source: "venues", layout: { "icon-image": "dotbox", "icon-allow-overlap": true, "icon-ignore-placement": false } });
(Resulting symbol order: venue-label, venue-dotbox, keepout, ring-label on top. This is the order tested live.)

Leave out from the proposed fix:
- fadeDuration: 0. The ghost labels only show in the capture.
- venue-label filter cap >= 1500. It removes every venue name and lets basemap labels show under the dots.

### #32 [minor] radar 390
**Use this as #15 step 1.**

Where: src/app/radar/RadarMap.tsx:530 (drawRings, ring-labels setData; called at L204, L221, L228, L441)

Problem: At 390 the three ring distances still collide with the theatre-cluster dots: a wine dot sits on the 'k' of '1 km · 13 min walk', '500 m · 6 min walk' touches the dots, and the 'l' of '16 min walk' is clipped. R3 #4 step 1 was left out on purpose, but the map still feels busy on phones.

Fix:

L530 old: `    features: rings.map((x) => ({ type: "Feature", properties: { label: `${fmtKm(x.r)} · ${walkMin(x.r)} min walk` }, geometry: { type: "Point", coordinates: northOf(c, x.r) } })),` -> new: `    features: rings.filter((x) => x.main || window.matchMedia("(min-width: 640px)").matches).map((x) => ({ type: "Feature", properties: { label: `${fmtKm(x.r)} · ${walkMin(x.r)} min walk` }, geometry: { type: "Point", coordinates: northOf(c, x.r) } })),` (rest of the line unchanged). Use the viewport media query, as L291 already does. Do not test `m.getCanvas().clientWidth >= 640`: the map canvas is only 608 px wide at 1440, so that test would also strip the inner labels on desktop, where they are clean. Under 640 px only the chosen radius gets a label, and the 500 m and 1 km rings stay as quiet lines. The 1440 view does not change.

### #23 [minor] radar 390 and 1440
Where: src/app/radar/page.tsx:141 (blurbOf, case "tv"). The same blurb also feeds the list detail at src/app/radar/RadarView.tsx:471 and the timeline title tooltip at RadarView.tsx:421, so one fix covers all three.

Problem: A raw score reaches the customer: "NBA · away game · Prime Video · Qloo local fandom 0.99, home crowd" (also NHL 0.98, NFL 0.98). These are the longest detail lines and the ones the clamp cuts at 390.

Fix:

src/app/radar/page.tsx L141: `meta.fandom ? `Qloo local fandom ${meta.fandom.rank.toFixed(2)}, ${meta.fandom.band}` : undefined` -> `meta.fandom ? `Qloo local fandom: ${meta.fandom.band}` : undefined`. Result: "NBA · away game · Prime Video · Qloo local fandom: home crowd". I would not use the reported fix (`meta.fandom.band` on its own). The bands come from src/server/events/tv.ts:183-188 ("home crowd", "strong", "present", "weak"). On their own they read as "NFL · home game across town · CBS · strong", which means nothing, and "away game · home crowd" sounds like a contradiction. It would also drop the Qloo source that the blurbOf comment asks for ("where the evidence comes from"). tv.ts:274 (`why`) and :276 (`signal.note`) still hold the raw number, but no radar screen shows them, so leave them alone.

### #30 [minor] radar 1440
Where: src/app/radar/RadarView.tsx:446-452 (div.tm-maparea: RadarMap L447, p.tm-maphint L448, button.tm-fs L449-451)

Problem: In the map group, focus goes canvas, radius handle, peek board link, map credit (bottom right, y 842), then jumps back up to 'Full screen' at the map's top right (y 370), then into the list. The button comes after RadarMap in the DOM.

Fix:

In src/app/radar/RadarView.tsx, move the Full screen button above RadarMap.
OLD (L446-452):
        <div className="tm-maparea">
          <RadarMap merchant={{ name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: radius }} points={points} onSelect={(id) => selectCrowd(id)} onRadiusChange={changeRadius} />
          <p className="tm-maphint">{saving ? "Updating your radius…" : <>Drag the white handle to change your radius&nbsp;· <span className="tm-mono">{fmtKm(radius)}, {walkMin(radius)}&nbsp;min</span> walk</>}</p>
          <button type="button" className="tm-fs" onClick={toggleFull} aria-label={full ? "Exit full screen" : "Full screen"} title={full ? "Exit full screen" : "Full screen"}>
            {full ? "Exit full screen" : "Full screen"}
          </button>
        </div>
NEW:
        <div className="tm-maparea">
          <button type="button" className="tm-fs" onClick={toggleFull} aria-label={full ? "Exit full screen" : "Full screen"} title={full ? "Exit full screen" : "Full screen"}>
            {full ? "Exit full screen" : "Full screen"}
          </button>
          <RadarMap merchant={{ name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: radius }} points={points} onSelect={(id) => selectCrowd(id)} onRadiusChange={changeRadius} />
          <p className="tm-maphint">{saving ? "Updating your radius…" : <>Drag the white handle to change your radius&nbsp;· <span className="tm-mono">{fmtKm(radius)}, {walkMin(radius)}&nbsp;min</span> walk</>}</p>
        </div>
Map focus order becomes Full screen, canvas, radius handle, peek board link, map credit, then the list.

### #24 [minor] radar 1440
**Optional once #14 is in: only matters from 640 to 1023 px.**

Where: src/app/radar/RadarMap.tsx:408 (insert after the `}` that closes `if (c) {`, before `for (const sgn of signs.current.slice(1))`); src/app/radar/radar.css:14; design follow-up src/app/globals.css:1171 (after the attrib `a:focus-visible` rule, before `@media (max-width: 640px)`)

Problem: The board takes the bottom-right corner. The map credit sits above it (z-index 5, deliberate per R3 #12), so a bare aubergine "i" shows inside the board next to "See who is coming, with Qloo" and reads as part of the board.

Fix:

Do not move the credit to the bottom-left for good. Move it only while the board holds the bottom-right corner. Leave RadarMap L183 `attributionControl: { compact: true },` as it is.

1) src/app/radar/RadarMap.tsx, insert after L408 (`      }`, the end of `if (c) { ... }`):
old:
        c.setOffset(chosen);
        obstacles.push(el.getBoundingClientRect());
      }
      for (const sgn of signs.current.slice(1)) {
new:
        c.setOffset(chosen);
        obstacles.push(el.getBoundingClientRect());
      }
      // The map credit never sits inside the board: it takes the bottom-left corner while the board holds the bottom-right one.
      const creditBR = new DOMRect(mapRect.right - 40, mapRect.bottom - 40, 28, 28);
      const boardBR = !!c && hits((c.getElement() as HTMLElement).getBoundingClientRect(), creditBR);
      const credit = wrapRef.current?.querySelector(".maplibregl-ctrl-attrib");
      const corner = wrapRef.current?.querySelector(boardBR ? ".maplibregl-ctrl-bottom-left" : ".maplibregl-ctrl-bottom-right");
      if (credit && corner && credit.parentElement !== corner) corner.appendChild(credit);
      for (const sgn of signs.current.slice(1)) {

2) src/app/radar/radar.css L14:
old: .tm-mapwrap .maplibregl-ctrl-bottom-right { z-index: 5; } /* the map credit stays above the board when the board takes the bottom-right corner */
new: .tm-mapwrap :is(.maplibregl-ctrl-bottom-right, .maplibregl-ctrl-bottom-left) { z-index: 5; } /* the map credit, in either bottom corner, opens above the board */

3) Design, src/app/globals.css: insert after L1171, before `@media (max-width: 640px) {`. This mirrors the credit for the left corner. Without it the square sits flush at left 0.
.maplibregl-map .maplibregl-ctrl-bottom-left .maplibregl-ctrl.maplibregl-ctrl-attrib,
.maplibregl-map .maplibregl-ctrl-bottom-left .maplibregl-ctrl.maplibregl-ctrl-attrib.maplibregl-compact,
.maplibregl-map .maplibregl-ctrl-bottom-left .maplibregl-ctrl.maplibregl-ctrl-attrib.maplibregl-compact.maplibregl-compact-show { margin: 0 0 12px 12px; padding: 0 0 0 28px; }
.maplibregl-map .maplibregl-ctrl-bottom-left .maplibregl-ctrl.maplibregl-ctrl-attrib .maplibregl-ctrl-attrib-button,
.maplibregl-map .maplibregl-ctrl-bottom-left .maplibregl-ctrl.maplibregl-ctrl-attrib.maplibregl-compact .maplibregl-ctrl-attrib-button,
.maplibregl-map .maplibregl-ctrl-bottom-left .maplibregl-ctrl.maplibregl-ctrl-attrib.maplibregl-compact-show .maplibregl-ctrl-attrib-button { right: auto; left: 0; }

### #33 [minor] radar 1440
**Skip if #14 is applied.**

Where: src/app/radar/radar.css:27 (new rule under the "peek card on the selected crowd" comment). No change to src/app/radar/RadarMap.tsx:345: the proposed obstacle line causes a regression.

Problem: The peek board takes the bottom-right corner and the map credit 'i' (z-index 5) sits inside it like a stray letter. The board also repeats the call 'See who is coming, with Qloo' as a link while the selected tone card beside the map has the same call as the primary button. That is two calls for one selection in one viewport.

Fix:

radar.css L27
old:
/* peek card on the selected crowd: a board */
new:
/* peek card on the selected crowd: a board */
/* Two columns: the selected card's button beside the map is the one action. In full screen the list is hidden, so the board keeps its link there. */
@media (min-width: 1024px) { .tm-root:not(.is-full):not(:fullscreen) .tm-peek-a { display: none; } }

Do NOT add the reported RadarMap.tsx line after L345 (`const credit = ...querySelector(".maplibregl-ctrl-attrib")...; if (credit) obstacles.push(credit);`). It is a hard obstacle, and it sends the board back over the ring labels. Once the link is hidden the board is shorter (164 px instead of 196) and moves to the bottom-left corner by itself, so the credit "i" is clear and no line is needed.

## src/app/campaigns/[id]/page.tsx

### #0 [major] campaign-draft, campaign-sent 1440 and 390
Where: src/app/campaigns/[id]/page.tsx:120

Problem: bodySmall 15.0: each window's reason sentence ('Twenty-nine shows start at 19:00 within a kilometre...', 'A cold exit, feels like 41°F: a warm place two blocks away beats the walk to the subway.') is a muted span at text-sm (15 px). It runs 2 lines (draft 1440), 3 lines (draft 390) and 1 to 2 lines (sent), which breaks R1. The globals readability floor misses it because it is a span, not a p.

Fix:

L120: `<span className="mt-1 block text-sm text-[var(--muted)]">{nb(w.why)}</span>` -> `<span className="mt-1 block text-base text-[var(--muted)]">{nb(w.why)}</span>` (17 px, Tailwind text-base brings leading 1.65; muted on white stays 6.40). Leave L119, the one-line weather label (`ml-2 text-sm`), at 15 px: it is metadata.

### #6 [minor] campaign-draft, campaign-sent 1440 and 390
**Recommended. #19 is the same fix: skip it.**

Where: src/app/campaigns/[id]/page.tsx:180-183 (Channel header row; the component is at 177-186, unchanged since 02f499a, no working-tree diff)

Problem: Channel headers wrap in two squeezed columns: 'Geofenced ad · Snapchat · / 900 m · $35/day' next to 'reaches strangers near the / venue' at 1440. At 390, 4 of 6 cards wrap ('Google Business / post' | 'reaches people searching / nearby'), with the tag at 13 px on two lines.

Fix:

src/app/campaigns/[id]/page.tsx L180-183
old:
      <div className="flex items-baseline justify-between gap-2">
        <p className="eyebrow text-sm tnum">{title}</p>
        <span className="t-meta">{tag}</span>
      </div>
new:
      <p className="eyebrow text-sm tnum">{title}</p>
      <p className="t-meta mt-1">{tag}</p>
Keep L184 `<div className="mt-4 space-y-2">{children}</div>` as it is. Tested by injecting this DOM on the live pages (camp_ee4a790ce23e and camp_7d4b6d90b536, at 1440 and 390): all 5 titles go to 1 line (456 px column at 1440, 342 px at 390), all 5 tags go to 1 line at 13 px, there is a 4 px gap from title to tag, and the 16 px gap to the channel copy stays. Renders: /Users/jacobofernandez/Code/Qloo/.tmp/velours/r4-verify/9/out/crop-1440-fix.png and crop-390-fix.png.

### #19 [minor] campaign-draft, campaign-sent 1440 and 390
**Duplicate of #6, skip.**

Where: src/app/campaigns/[id]/page.tsx:180-182 (Channel header, function Channel at L178; the tags are passed at L129 and L135)

Problem: The 13 px t-meta channel tags sit beside the title in a justify-between row and wrap to 2 lines: 'reaches strangers near the / venue' at 1440 and 390, and 'reaches people searching / nearby' at 390. A 13 px phrase that runs two lines reads as a sentence, not metadata. It also squeezes the title into an awkward break ('Geofenced ad · Snapchat · / 600 m · $60/day').

Fix:

L180: `<div className="flex items-baseline justify-between gap-2">` -> `<div>`
L182: `<span className="t-meta">{tag}</span>` -> `<p className="t-meta mt-1">{tag}</p>`
(L181 `<p className="eyebrow text-sm tnum">{title}</p>` unchanged.) Checked live with the fix injected in the DOM: all 5 titles and all 5 tags fit on 1 line at 1440 (456 px column) and at 390 (342 px column), for draft and sent. Screenshots: .tmp/velours/r4-verify/22/{draft,sent}-{1440,390}-fixed.png

### #12 [minor] campaign-draft, campaign-sent 1440 and 390
Where: src/app/campaigns/[id]/page.tsx:106 (Why, according to Qloo) and :111 (Audience); helper to move: src/app/today/page.tsx:256-276 (firstSentences), used at today/page.tsx:143. The reported lines 96-97 and 101-102 are out of date: 02f499a moved both blocks down.

Problem: Rationale and audience are still walls of analyst prose. Sent 'Why' runs 10 lines at 1440 and 14 at 390 with '(0.90), (0.89), (0.86)'. 'Audience' runs 6-8 lines with five signed decimals '(+0.72) … (−0.72)'. Draft: 'offer fit … is 0.92', 'skews female (+0.41)'. Pas lisible for a bar owner.

Fix:

1) New file src/lib/text.ts:
// Whole sentences only, up to about `max` characters: a cut mid-word reads as a bug. A full stop counts as a
// sentence end only when a space and a capital letter follow it, so "0.92" or "5 to 7 pm. The" behave.
export function firstSentences(text: string, max: number): string { /* body moved unchanged from today/page.tsx:258-276 */ }
// Agent prose cites Qloo scores in brackets, "(0.90)", "(+0.72)", "(-0.72)". A bar owner reads the words, not the decimals.
export const noScores = (s: string) => s.replace(/\s?\([+−-]?\d+\.\d+\)/g, "");

2) src/app/today/page.tsx: delete the local function and its comment (L256-276). Add `import { firstSentences, noScores } from "@/lib/text";`. L143 `{nb(firstSentences(draft.rationale, 320))}` -> `{nb(firstSentences(noScores(draft.rationale), 320))}`.

3) src/app/campaigns/[id]/page.tsx: add `import { firstSentences, noScores } from "@/lib/text";` after L8. After L23 (`const draft = getDraft(campaign);`) add:
  const why = draft ? noScores(draft.rationale) : "";
  const whyLead = firstSentences(why, 320);
  const whyRest = why.startsWith(whyLead) ? why.slice(whyLead.length).trim() : "";
L106 `<p className="t-body mt-3">{nb(draft.rationale)}</p>` ->
  <p className="t-body mt-3">{nb(whyLead)}</p>
  {whyRest && (<details className="mt-4"><summary className="link w-fit text-base">The rest of the reasoning</summary><p className="t-body mt-3">{nb(whyRest)}</p></details>)}
L111 `<p className="t-body mt-3">{nb(draft.audience_summary)}</p>` -> `<p className="t-body mt-3">{nb(noScores(draft.audience_summary))}</p>`

Changes from the reported fix: the disclosure holds only the sentences that are not already shown. The reported version repeated the lead sentences inside <details>, and R3 #25 already turned down a repeated first sentence. Scores are stripped before the cut, so the 320-character budget counts the text a reader actually sees. The "w-fit" class stops the click area of the flex summary from spanning the whole row. Checked on the live texts: sent Why drops from 671 to 306 characters on screen (the rest, 343 characters, sits in the disclosure), with no decimals. Sent Audience drops from 362 to 322 characters and reads "over-index on women and on 25 to 29 year olds, with 30 to 34 and under 25 behind, and clearly under-index on 35 to 44." Draft Audience reads "It skews female and under 25". Not covered: the draft's unbracketed "offer fit ... is 0.92". That is agent wording and needs a prompt change, not a regex. The Provenance table still shows the Qloo evidence.

### #13 [minor] campaign-sent 1440 and 390
Where: src/app/campaigns/[id]/page.tsx:10-13 (SIMULATED_NOTE), :42 (chip), :67 (eyebrow), :79 (To line); src/server/channels/index.ts:52 (new sends only)

Problem: The published block still reads as a dev log. Eyebrow 'Published · simulated in the demo'. 'To 6 opted-in regulars (fictional list).' Three 'See the exact request' disclosures open 13 px JSON. 'Digital screen' has nothing but that disclosure. The chip says 'Published · 3 channels' while the ad note says 'It goes out once your ad account is connected'.

Fix:

1) page.tsx:10-13: add two entries to SIMULATED_NOTE:
  whatsapp: "It goes out once WhatsApp is connected.",
  dooh: "Ready for the screens nearest the venue. It goes out once a screen network is connected.",
2) page.tsx:42
old: <span className="chip">Published · {sends.length} channels</span>
new: <span className="chip">{sends.some((s) => s.simulated) ? `Ready on ${sends.length} channels` : `Published · ${sends.length} channels`}</span>
3) page.tsx:67
old: {sends.some((s) => s.simulated) ? "Published · simulated in the demo" : "Published"}
new: {sends.some((s) => s.simulated) ? "Where it goes · simulated in the demo" : "Where it went"}
4) page.tsx:79 (this is the line that fixes the demo page, because `to` is read from the stored payload_json)
old: {typeof payload.to === "string" ? `To ${payload.to}. ` : ""}
new: {typeof payload.to === "string" ? `To ${payload.to.replace(/ \(fictional list\)$/, "")}. ` : ""}
5) channels/index.ts:52, for sends made from now on only
old: to: `${contacts.length} opted-in regulars (fictional list)`,
new: to: `${contacts.length} opted-in regulars`,
6) Reject the L83-86 change. Keep the <details> "See the exact request" and its 13 px <pre>, as R3-FIXES #3 steps 2 and 5 decided.
Result: chip "Ready on 3 channels"; eyebrow "Where it goes · simulated in the demo"; WhatsApp "To 6 opted-in regulars. It goes out once WhatsApp is connected."; Digital screen gets a line of its own.

### #20 [minor] campaign-draft, campaign-sent 1440
Where: src/app/campaigns/[id]/page.tsx:151-155

Problem: Measure: 'What this does not establish' is body prose (t-body, 7 lines), but it sits in the 2-column channel grid at 456 px, so it runs 56 characters a line against the 65 to 75 rule. R3-FIXES #9 named this as not covered.

Fix:

In src/app/campaigns/[id]/page.tsx, delete L151-154 from inside the channel grid (the grid that opens at L128 with `<section className="stack-section grid gap-x-16 gap-y-16 md:grid-cols-2">`):
OLD (L151-155):
            <div>
              <p className="eyebrow">What this does not establish</p>
              <p className="t-body mt-3">{nb(draft.limitations)}</p>
            </div>
          </section>
NEW:
          </section>
          <section className="stack-block">
            <p className="eyebrow">What this does not establish</p>
            <p className="t-body mt-3">{nb(draft.limitations)}</p>
          </section>
The new section stays inside the `{draft && (<>...</>)}` fragment, just before its closing `</>` (L156). Nothing changes in globals.css: `.t-body` already caps at var(--measure) = 544 px.

## src/app/campaigns/new/page.tsx

### #9 [major] campaign-new 1440 and 390
**Dev words on a customer screen ("Resolved entity", "popularity 99.7%", signed decimals).**

Where: src/app/campaigns/new/page.tsx:80-82 and 99-103 (L104 is only the closing fragment; the labels come from describeDemographics in src/server/qloo/crowd.ts:244-245, which this fix leaves alone)

Problem: Dev and analyst words on a customer screen: 'Resolved entity', 'artist · popularity 99.7% · matched automatically', 'Who over-indexes', a t-name heading of '25-29 (+0.75), 30-34 (+0.46)', and 'skews female (+0.72) · under-indexes: 55+ (−0.34), 35-44 (−0.72)'. The founder flagged 'Resolved entity' in round 3 and it is still there.

Fix:

src/app/campaigns/new/page.tsx:
L80 `<p className="eyebrow">Resolved entity</p>` -> `<p className="eyebrow">The act</p>`
L82 `<p className="mt-2 text-sm text-[var(--muted)]">{profile.entity.subtype?.replace("urn:entity:", "")} · popularity {((profile.entity.popularity ?? 0) * 100).toFixed(1)}% · {profile.status === "auto" ? "matched automatically" : "picked by you"}</p>` -> `<p className="mt-2 text-base text-[var(--muted)]">{profile.entity.subtype?.replace("urn:entity:", "")} · {profile.status === "auto" ? "found by Qloo" : "picked by you"}</p>`
L99 `<p className="eyebrow">Who over-indexes</p>` -> `<p className="eyebrow">Who is coming</p>`
L102 `<p className="t-name mt-3">{nb(demo.ageTop.join(", ")) || "no strong age skew"}</p>` -> `<p className="t-name mt-3">{nb(demo.ageTop.map((a) => a.replace(/\s*\([^)]*\)/g, "")).join(" and ")) || "every age"}</p>`
L103 `<p className="mt-2 text-sm text-[var(--muted)]">{nb(`${demo.gender}${demo.ageLow.length ? ` · under-indexes: ${demo.ageLow.join(", ")}` : ""}`)}</p>` -> `<p className="mt-2 text-base text-[var(--muted)]">{nb(demo.gender.replace(/\s*\([^)]*\)/g, ""))}</p>`
Result: "The act / Harry Styles / artist · found by Qloo" and "Who is coming / 25‑29 and 30‑34 / skews female". The age chart below still shows the signed numbers for anyone who wants them.

### #8 [major] campaign-new 1440 and 390
**"best fit: Game night big screen" for a Harry Styles crowd contradicts the agent. Also touches pulse/page.tsx L174.**

Where: src/app/campaigns/new/page.tsx:154 and :156; src/app/pulse/page.tsx:172, :174 and :176

Problem: The 'best fit' tag sits on the top raw place-affinity row. For a Harry Styles crowd (women 25-29, cocktail rooftops, Gucci) it reads 'Game night big screen · best fit' (Sports Bar, Beer). The agent's own rationale on the sent campaign says 'not $22 for a game-night pitcher, even though that offer had the best raw score'. Pulse prints 'Game night big screen 0.00' as a big figure. Both read as bugs and kill credibility.

Fix:

1) src/app/campaigns/new/page.tsx:156
old: <td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}<span className="mt-1 block text-sm font-normal text-[var(--muted)] md:hidden">
new: <td className="font-semibold text-[var(--ink)]">{f.title}<span className="mt-1 block text-sm font-normal text-[var(--muted)] md:hidden">
and :154 old: {profile.offerFits.map((f, i) => (
new: {profile.offerFits.map((f) => (

2) src/app/pulse/page.tsx:174
old: <td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}</td>
new: <td className="font-semibold text-[var(--ink)]">{f.title}</td>
and :172 old: {pulse.offerFits.map((f, i) => (
new: {pulse.offerFits.map((f) => (

3) src/app/pulse/page.tsx:176
old: <td className="t-figure text-right text-2xl">{f.affinity.toFixed(2)}</td>
new: <td className={f.matches > 0 && f.affinity > 0 ? "t-figure text-right text-2xl" : "text-right text-sm text-[var(--muted)]"}>{f.matches > 0 && f.affinity > 0 ? f.affinity.toFixed(2) : "no match nearby"}</td>
(PulseOfferFit already has matches, see src/server/qloo/neighborhood.ts:9. Drop the unused `i` in steps 1 and 2 or no-unused-vars warns.)

### #11 [major] campaign-new 1440 and 390
Where: src/app/campaigns/new/page.tsx:43-49 (header), 166-173 (bottom action section), 133-134 (taste tags), plus a new const after L38. The report's line numbers were off: the tags are at 133-134, not 130-133, and the form is at 166-173, not 164-171.

Problem: (a) A wall of 24 dot-joined tags (4 lines at 1440, 7 at 390) full of noise: 'P E I Mussels', 'Identifies as women-owned', 'Tourist attraction', 'Hotel', 'Refried Beans', 'American Express'. (b) The only action, 'Write my campaign', sits at the very bottom after about 2,000 px (1440) and 2,900 px (390) of data. Nothing in the first viewport says what to do.

Fix:

1) Header, L43-49. Old:
      <header className="mt-3">
        <p className="eyebrow">The crowd, through Qloo</p>
        <h1 className="t-title mt-2">{profile.headlinerName}</h1>
        <p className="mt-3 text-base text-[var(--muted)]">
          {event.name} · {event.venue_name} · {fmt.format(new Date(event.starts_at))} · for {merchant.name}
        </p>
      </header>
New:
      <header className="mt-3 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">The crowd, through Qloo</p>
          <h1 className="t-title mt-2">{profile.headlinerName}</h1>
          <p className="mt-3 text-base text-[var(--muted)]">
            {event.name} · {event.venue_name} · {fmt.format(new Date(event.starts_at))} · for {merchant.name}
          </p>
        </div>
        {hasSignal(profile) && (
          <form action="/api/campaigns" method="post">
            <input type="hidden" name="merchant" value={merchant.id} />
            <input type="hidden" name="event" value={event.id} />
            {sp.pick && <input type="hidden" name="pick" value={sp.pick} />}
            <button className="btn btn-accent btn-lg">Write my campaign</button>
          </form>
        )}
      </header>
Keep the hasSignal(profile) guard. Without it, the button would appear on needs_input and unresolved pages, where it is hidden today.

2) Delete L166-173 in full, the section <section className="stack-block flex flex-wrap items-center gap-x-8 gap-y-4"><form action="/api/campaigns" ...>...</form></section>.

3) Tags. Add the import `import { tagId } from "@/server/qloo/api";`. After L38 (ageLabel), add:
  const placeTags = profile.tags.filter((t) => tagId(t).startsWith("urn:tag:genre:place:restaurant"));
  const shownTags = (placeTags.length >= 4 ? placeTags : profile.tags).slice(0, 8);
Then, at L133-134, old:
              <p className="eyebrow">Taste tags · places</p>
              <p className="mt-4 text-base">{profile.tags.slice(0, 24).map((t) => t.name).join(" · ")}</p>
New:
              <p className="eyebrow">Kinds of places this crowd likes</p>
              <p className="mt-4 text-base">{shownTags.map((t) => t.name).join(" · ")}</p>
In the source,   is the literal non-breaking space that is already there (item 103). For this event the line becomes "Bar · Restaurant · European · American · French · Brunch · Bar + Grill · Cafe".

### #10 [minor] campaign-new 1440 and 390
**Recommended for the age bars. From #34 take only the L134 tag filter.**

Where: src/app/campaigns/new/page.tsx:118-122 (L118 grid, L121 over-index bar, L122 under-index bar)

Problem: The age 'chart' is six floating 40 px rectangles in 56 px tracks with no baseline. The negative bars hang as pale squares, and a signed decimal sits under each. It reads as confetti, not data. Pas lisible.

Fix:

Keep the diverging chart from checklist item 44 (ages in order, signed figures, bars meeting at a shared zero, no rule because S5 says no lines). Fix only what is actually broken: the near-invisible under-index bars, and how sparse the chart looks at 1440.
L118 old: className="mt-8 grid grid-cols-6 gap-3 text-center text-sm"
L118 new: className="mt-8 grid max-w-2xl grid-cols-6 gap-3 text-center text-sm"
L121 old: <div className="w-10" style={{ height: `${Math.max(4, Math.min(100, v * 100))}%`, background: "var(--bar-hot)" }} />
L121 new: <div className="w-12" style={{ height: `${Math.max(4, Math.min(100, v * 100))}%`, background: "var(--bar-hot)" }} />
L122 old: <div className="w-10" style={{ height: `${Math.max(4, Math.min(100, -v * 100))}%`, background: "var(--bar-other)" }} />
L122 new: <div className="w-12" style={{ height: `${Math.max(4, Math.min(100, -v * 100))}%`, background: "var(--muted)" }} />
Effect: under-index bars go from #E6E1EA (1.29:1 on white) to #635C6D (6.40:1). That is item 44's "grey", and it passes 3:1 for a graphic. At 1440 the column pitch goes from 187 px to about 114 px, so the six bars read as one chart and not as scattered squares. At 390 the tracks are (350-60)/6 = 48.3 px, so w-12 (48 px) fits, with 12 px gaps. Do not apply the reported ranked list: sorting by value breaks the age order, it drops the figures, the thresholds are made up (+0.42, +0.46 and +0.75 all become "much more likely"), it keeps the pale --bar-other, and at 390 a 64+16+180+16+~115 px row (about 391 px) does not fit the 350 px column, so the empty bar span shrinks and the bar lengths stop matching the values. The eyebrow copy can stay.

### #34 [minor] campaign-new 1440 and 390
**Apply only the L134 tag filter; the bars are covered by #10.**

Where: src/app/campaigns/new/page.tsx:121, :122 (age bars, both halves) and :134 (taste tags)

Problem: The age-affinity chart is 40 px bars at most 56 px tall in a 220 px band. It reads as floating confetti, not a premium data mark. 'Taste tags · places' dumps 24 dot-separated tags over 6 lines ('American Express', 'P E I Mussels').

Fix:

L121: `<div className="mx-auto flex h-14 w-full items-end justify-center">{v >= 0 && <div className="w-10"` -> `<div className="mx-auto flex h-14 w-full items-end justify-center md:h-24">{v >= 0 && <div className="w-10 md:w-20"`
L122: `<div className="mx-auto flex h-14 w-full items-start justify-center">{v < 0 && <div className="w-10"` -> `<div className="mx-auto flex h-14 w-full items-start justify-center md:h-24">{v < 0 && <div className="w-10 md:w-20"`
L134: `{profile.tags.slice(0, 24).map((t) => t.name).join(" · ")}` -> `{profile.tags.filter((t) => !/credit_card|inclusivity|hotel_rating/.test(t.subtype ?? "")).slice(0, 10).map((t) => t.name).join(" · ")}`

### #18 [minor] campaign-new 1440 and 390
Where: src/app/campaigns/new/page.tsx:137

Problem: A distance sits in a 14 px label: 'Bars within 1300 m this crowd already likes'. R3 asks for distances of at least 15 px, tabular. The shot.mjs tinyClock check misses it because React renders the number as its own text node.

Fix:

L137: `<p className="eyebrow">Bars within {merchant.radius_m}&nbsp;m this crowd already likes</p>` -> `<p className="eyebrow">Bars within <span className="mono">{merchant.radius_m >= 1000 ? `${(merchant.radius_m / 1000).toLocaleString("en-US")} km` : `${merchant.radius_m} m`}</span> this crowd already likes</p>`. This uses the same formatter as radar/page.tsx:78, so 1000 m reads "1 km", not the "1.0 km" that toFixed(1) would give. The .mono span triggers globals.css:909 `p.eyebrow:has(.mono)`, which sets 15 px and tabular figures, the same pattern as pulse/page.tsx:85. Same pattern also at src/app/today/page.tsx:133 ("To strangers, {draft.geofenced_ad.radius_m}&nbsp;m around the venue"): wrap the number and unit in the same `<span className="mono">`.

### #22 [minor] campaign-new 390
Where: src/app/campaigns/new/page.tsx:117

Problem: The label carries an explanation: 'Age affinity · relative to average, positive means over-index' is a 14 px eyebrow that wraps to 2 lines on phones (R7).

Fix:

L117: `<p className="eyebrow">Age affinity · relative to average, positive means over-index</p>` -> `<p className="eyebrow">Age affinity</p>
              <p className="measure mt-3 text-base text-[var(--muted)]">Against the average: a bar that rises means this age over-indexes, a bar that hangs means it under-indexes.</p>` (keep the `mt-8` grid on L118 as is). This copies the page's own pattern for a label that needs an explanation: L150 eyebrow, then L151 `measure mt-3 text-base text-[var(--muted)]`. The explanation then renders at 17 px with 1.65 leading, as R1 requires. The reported wording "a bar above the line" is wrong: Velours draws no baseline rule (S5, checklist item 44: "the gap between the halves is the baseline"), so the sentence describes bars that rise and bars that hang instead. The reported `mt-1 text-sm` would also land at 17 px through the globals floor (globals.css L892), but it would drift from the L151 pattern.

## src/app/pulse/page.tsx and data

### #7 [major] pulse 1440 and 390
**Data only, demo prep: answer the pending pulse prompt so the weekly offer plate shows.**

Where: data/crowd.db, the pulses row pulse_aa01f1fc5555 (m_penn_pour, awaiting_operator since 2026-10-20 14:30 UTC, no data/agent-inbox/pulse_aa01f1fc5555.draft.json), read by src/app/pulse/page.tsx:23-24 and shown by :46-50. The button at :42 and the tone block at :46-50 follow the spec and need no code change.

Problem: First block under the title is a grey tone box: 'The agent is writing this week's brief. Reload in a moment.' The page has no plate and no focal point, and it asks the owner to reload by hand. The status is awaiting_operator, so the brief never arrives during a demo. The primary button reads 'Ask for the brief again'.

Fix:

DATA ONLY, before the demo:
1. The operator answers the pending prompt data/agent-inbox/pulse_aa01f1fc5555.prompt.md by writing data/agent-inbox/pulse_aa01f1fc5555.draft.json. It must be JSON that matches PulseBriefSchema (src/server/agent/pulse.ts:16-26), and featured_offer_id must be one of o_pp_late, o_pp_happy, o_pp_beer, o_pp_wine, o_pp_screen.
2. On the next GET /pulse?merchant=m_penn_pour, pollOperator (pulse.ts:84-93) sets the row to drafted. Then getBrief(row) returns, the existing plate at page.tsx:57-81 renders under the header, and the button reads "Redo this week's brief".
3. Do not click the pulse button during the demo. The provider is "operator", because ANTHROPIC_API_KEY is empty in .env.local. Each click inserts a new awaiting_operator row, and latestPulse would then hide the brief again.

NO CODE CHANGE at page.tsx:42 or :46-50.

REJECT the reported code fix. It is wrong on five counts:
(a) `import RefreshEvery from "../today/RefreshEvery"` does not compile. The file has a named export (`export function RefreshEvery`), so it would need `import { RefreshEvery } from "../today/RefreshEvery"`.
(b) It turns the waiting state into a .plate. R3-FIXES #24 step 1 says the opposite: "The awaiting block stays `tone stack-block`. Do not make it a `.plate`."
(c) A 15 s RefreshEvery on an operator row loops forever, so "It lands here in about a minute" is a false promise.
(d) Wrapping L39-43 in `{row?.status !== "awaiting_operator" && ...}` removes the only way to retry a stuck row. That also goes against #24 step 2.
(e) Its line numbers (L39-43) are off. The form is at L40-43.

Optional, only if the team revisits the omission it made on purpose: R3-FIXES #24 step 3 (a latestDraftedPulse fallback in pulse.ts, plus `const brief = getBrief(row) ?? getBrief(latestDraftedPulse(merchant.id));` at page.tsx:24). It would bring back the drafted 2026-10-19 brief pulse_ebbdff0ca92e and protect against a stray click.

### #1 [minor] pulse 1440 and 390
Where: src/app/pulse/page.tsx:100-102

Problem: bodySmall 14.0: a 74-character sentence is set as a 14 px eyebrow and wraps to 2 lines at both widths ('...according / to Qloo' at 1440). R7 wants a label to be one short line. The explanation belongs in the 17 px line next to it.

Fix:

L100: `<p className="eyebrow">The rhythm of your street · when the everyday flow peaks, according to Qloo</p>` -> `<p className="eyebrow">The rhythm of your street</p>`
L102: `Read from {pulse.rhythm.placesRead} places Qloo knows around your door, {pulse.rhythm.hospitality} of them bars and restaurants, {pulse.rhythm.withHours} with opening hours` -> `When the everyday flow peaks, read by Qloo from {pulse.rhythm.placesRead} places around your door, {pulse.rhythm.hospitality} of them bars and restaurants, {pulse.rhythm.withHours} with opening hours`
Leave L101 `<p className="text-sm text-[var(--muted)]">` alone: the globals floor (globals.css L892) already sets it at 17 px with 1.65 leading. Change only the wording, not the classes. The reported L102 text ("When the everyday flow peaks, read from N places Qloo knows...") reads as if the reading happens at peak time, and it drops the "according to Qloo" source. "read by Qloo from" keeps the source and reads cleanly.

### #35 [minor] pulse 390 (table) and both (focus)
**Apply after #8 step 2: keep #8's removal of "best fit", add only the phone line and the hidden columns.**

Where: src/app/pulse/page.tsx:174-176 (offers table, 'Your offers against the street'). Not :44-50 or :23-24: part (c) dropped.

Problem: (a) The offers table keeps 3 columns on phones, so tags wrap as 'Burgers, Late- / night food'. This is the #36 problem, fixed on campaigns/new but not here. (b) 'Game night big screen 0.00' reads as broken. (c) The page has no focal point: under the h1 sits only a grey note, 'The agent is writing this week's brief. Reload in a moment.'

Fix:

All in src/app/pulse/page.tsx. Same pattern as R3 #36 on campaigns/new, plus an honest empty score.

L174 old:
<td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}</td>
L174 new:
<td className="font-semibold text-[var(--ink)]">{f.title}{i === 0 && <span className="ml-3 text-sm font-medium text-[var(--muted)]">best fit</span>}<span className="mt-1 block text-sm font-normal text-[var(--muted)] md:hidden">{f.tagNames.join(", ")}</span></td>

L175 old:
<td className="text-sm text-[var(--muted)]">{f.tagNames.join(", ")}</td>
L175 new:
<td className="hidden text-sm text-[var(--muted)] md:table-cell">{f.tagNames.join(", ")}</td>

L176 old:
<td className="t-figure text-right text-2xl">{f.affinity.toFixed(2)}</td>
L176 new:
<td className="t-figure text-right text-2xl">{f.matches > 0 ? f.affinity.toFixed(2) : <span className="font-sans whitespace-nowrap text-sm font-medium text-[var(--muted)]">no match</span>}</td>

Two changes from the reported fix:
- Test `f.matches > 0`, not `f.affinity > 0`. PulseOfferFit already has `matches`. A real mean that rounds to 0.00 must not be called "no match".
- The span needs `font-sans`. Without it, it inherits Big Shoulders from the `.t-figure` td.

Drop part (c). Do not add latestDraftedPulse or change L23-24.

## src/app/alerts/page.tsx

### #17 [major] alerts 1440 and 390
Where: src/app/alerts/page.tsx:54-82 (the alerts.map; the article is L57-80, the message div L66-74, the repeated link L75-79)

Problem: Still a log. Six look-alike paragraphs, each with two clocks ('Fri 23 Oct, 15:52' then 'Saturday 18:30: Theatre crowd arriving, 35 shows, about 36,300 people 1.1 km from you…'), no headline per alert, and 'Open the campaign' repeated 6 times.

Fix:

Replace the whole alerts.map body, L54-82, from `{alerts.map((a, i) => {` to its closing `})}`. Keep `<section className="stack-block space-y-16">` as it is.

OLD (L54-82): the current map. It holds `const at = ...`, then `<article ...>`, the t-clock row in `text-[var(--ink)]`, the `<div className="measure mt-4 whitespace-pre-wrap ...">{(() => { const text = a.message.replace(/\nReview and approve:[\s\S]*$/, "")... })()}</div>`, and `{a.campaign_id && (<Link ... className="link mt-4 inline-flex text-base">Open the campaign</Link>)}`.

NEW:
```tsx
          {alerts.map((a, i) => {
            const at = new Date(a.created_at.endsWith("Z") ? a.created_at : a.created_at.replace(" ", "T") + "Z");
            const clean = a.message
              .replace(/\n(Review and approve|See it on your radar):[\s\S]*$/, "")
              .replace(/^Turnout for [^\n]*\n/, "")
              .replace(/\nThe agent is writing the campaign now\./, "");
            const text = dayKey.format(at) === todayKey ? clean : clean.replace(/^Today /, `${weekday.format(at)} `);
            const [first = "", ...rest] = text.split("\n");
            const when = first.split(": ")[0];
            const what = first.slice(when.length + 2).split(", about ")[0];
            const tail = what ? first.slice(when.length + 2 + what.length + 2) : first;
            const href = a.campaign_id ? `/campaigns/${a.campaign_id}` : `/radar?merchant=${merchant.id}`;
            return (
              <article key={a.id} className={i === 0 ? "tone" : undefined}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="t-clock text-[var(--muted)]">{fmt.format(at)}</p>
                  {a.status !== sentAs && (
                    <p className={a.status === "failed" ? "text-sm text-[var(--danger)]" : "text-sm text-[var(--muted)]"}>
                      {statusLabel[a.status] ?? a.status}{a.status === "failed" && a.to_ref ? ` · ${a.to_ref}` : ""}
                    </p>
                  )}
                </div>
                {what && (
                  <h2 className="t-name mt-3">
                    {i === 0 ? what : <Link href={href} className="hover:text-[var(--link-hover)]">{what}</Link>}
                  </h2>
                )}
                <p className="mt-2 text-base text-[var(--text)]">
                  {what ? `${when} · ${tail}` : tail} {rest.join(" ")}
                </p>
                {i === 0 && (
                  <Link href={href} className="link mt-4 inline-flex text-base">
                    {a.campaign_id ? "Open the campaign" : "See it on the radar"}
                  </Link>
                )}
              </article>
            );
          })}
```

Changes from the reported fix:
(1) The strip regex also removes "\nSee it on your radar: <url>". Today, campaign-less alerts show the raw localhost URL on the page (live on /alerts?merchant=m_quai_bercy, the ASAKE alert).
(2) For those alerts, the link and the name point to the radar instead of breaking.
(3) The split uses ", about " (with the trailing space), and a line with no ": " falls back to the plain text.
(4) The name is an h2, not a p.

The candidate typechecks (tsc on a scratch copy: .tmp/velours/r4-verify/20/page.tsx). On all 40 alert messages in the DB, the split gives a clean name every time, for example "Theatre crowd arriving, 35 shows" over "Saturday 18:30 · about 36,300 people 1.1 km from you, from 17:30 to 19:00. Could bring about 182 guests, 100% of your 70 seats."

## For the MKG session: src/app/page.tsx (home)

The home page content belongs to the MKG session. Please pass these two on.

### #5 [major] home 1440 and 390
Where: src/app/page.tsx:58 (plate title) and src/app/page.tsx:67-69 ('Why cocktails' paragraph inside the .plate, L56-76)

Problem: The plate is overloaded: 790 px tall at 1440, with four text groups and about 16 lines (title, two figures, example offer, then a five-line 'Why cocktails' paragraph). Its title breaks a number from its noun and repeats the count: 'Theatre crowd arriving, 34 / shows · 34 venues around you' at both widths.

Fix:

1) src/app/page.tsx:58
old:
<p className="t-name mt-4">{live ? `${live.item.headliner.name} · ${live.item.event.venue.name}` : "Harry Styles · Madison Square Garden"}</p>
new:
<p className="t-name mt-4">{live ? (live.item.event.origin === "wave" ? live.item.headliner.name : `${live.item.headliner.name} · ${live.item.event.venue.name}`).replace(/(\d) /g, "$1 ") : "Harry Styles · Madison Square Garden"}</p>
(Use origin === "wave", not endsWith("venues around you"): the wave is the only origin whose venue name repeats the count (moments.ts:77 and :83). Do not use nb() here. It is not imported in page.tsx, and src/lib/nbsp.ts only glues pm|am|km|m|min|h, so it would leave "34 shows" breakable. The inline replace keeps every number with its noun.)

2) src/app/page.tsx:67-69, delete these three lines:
            <p className="mt-4 text-sm">
              Why cocktails, not the pitcher: fans of Harry Styles over-index on women 25 to 29 (+0.75), on rooftop cocktail bars like Igloo Bar and 230 Fifth, and on Gucci and Dior. Every number comes from Qloo and is shown with the draft.
            </p>
The reasoning is already in 'Why it works' at L120-122: Targeting, Offer, and "Reason: women 25 to 29 over-index (+0.75)...".

Tested by changing the live DOM: plate 790 -> 634 px at 1440 (target 620), so it now ends at y 874, above a 900 px fold. At 390 it goes 721 -> 536 px. Title reads "Theatre crowd / arriving, 34 shows" at both widths.

### #21 [minor] home 1440 and 390
Where: src/app/page.tsx:64

Problem: The plate's example label is a 69-character sentence at 14 px that wraps to 2 lines at both widths. It is the same defect as pulse L100, but 1 character under the 70-character bodySmall threshold, so the audit misses it.

Fix:

L64: `<p className="eyebrow">An example: what Turnout wrote for Harry Styles night, two blocks away</p>` -> `<p className="eyebrow">An example from Harry Styles night</p>`. Do not use the reported text "What Turnout wrote for Harry Styles night". It drops "An example", which R3-FIXES item 30 added on purpose because the live crowd above is often another event. It is another event in the current render: "Theatre crowd arriving, 34 shows" sits above the Harry Styles copy, so without "example" the copy reads as a real campaign. That text also still wraps to 2 lines at 768 (232 px inner) and at 360 (264 px inner). The new text measured one line at 360, 390, 640, 768, 1024, 1280 and 1440. Dropping "two blocks away" is safe because the next line already says "Penn & Pour, two blocks from MSG."

## Not verified

34 minor issues reported by one judge only are in `.tmp/velours/r4-result.json` under `unverified`. Optional.
