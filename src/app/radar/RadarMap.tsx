"use client";
import { useEffect, useRef, useState } from "react";

// Vector map in the spirit of the global search prototype: MapLibre on OpenFreeMap "positron" (free, no key),
// a short flight in from the globe on first open, venues drawn as map layers (size = crowd), a peek card on the
// selected crowd, radar rings with walking times, and a draggable handle to widen or narrow the merchant's radius.
// Velours: your place an aubergine square, hot crowds wine discs with a sign, cold ones hollow rings, no blue, no pulsing.

export type MapPoint = {
  key: string;
  eventId: string;
  label: string;
  time: string;
  venue: string;
  capacity: number;
  distanceKm: number;
  href?: string;
  lat: number;
  lon: number;
  hot: boolean;
  tonight: boolean;
  active: boolean;
  selected: boolean;
};

type Props = {
  merchant: { name: string; lat: number; lon: number; radiusM: number };
  points: MapPoint[];
  onSelect?: (eventId: string) => void;
  onRadiusChange?: (radiusM: number) => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type ML = any;

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
const FONT = ["Noto Sans Regular"];
const FONT_BOLD = ["Noto Sans Bold"];
// MapLibre paint cannot read CSS variables: resolve the design tokens to concrete colours once, at map load,
// so a new identity in globals.css restyles the map too. A canvas pixel handles any CSS colour syntax.
type Palette = { ink: string; accent: string; neutral: string; ring: string; lineStrong: string; muted: string; panel: string; paper: string; sky: string; coldRing: string; bar: string };
function resolveColor(css: string, fallback: string, under?: string, alpha = 1): string {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return fallback;
    if (under) {
      ctx.fillStyle = under;
      ctx.fillRect(0, 0, 1, 1);
    }
    ctx.fillStyle = fallback;
    ctx.fillStyle = css;
    ctx.globalAlpha = alpha;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgb(${r}, ${g}, ${b})`;
  } catch {
    return fallback;
  }
}
function palette(): Palette {
  const css = getComputedStyle(document.documentElement);
  const tok = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
  const ink = tok("--ink", "#1D1424");
  const muted = tok("--muted", "#635C6D");
  const panel = tok("--panel", "#FFFFFF");
  // Map-specific tokens win when the identity defines them (--map-land, --map-cold, --map-hot); otherwise the
  // colours derive from the shared tokens.
  const mapCold = tok("--map-cold", "#BDB6C5");
  const mapHot = tok("--map-hot", tok("--accent", "#84204D"));
  const mapLand = tok("--map-land", tok("--paper", "#F4F2F5"));
  return {
    ink: resolveColor(ink, "#1D1424"),
    accent: resolveColor(mapHot, "#84204D"),
    neutral: resolveColor(mapCold, "#BDB6C5"),
    ring: resolveColor(ink, "#1D1424"),
    lineStrong: resolveColor(tok("--line-strong", "#E4DFE8"), "#E4DFE8"),
    muted: resolveColor(muted, "#635C6D"),
    panel: resolveColor(panel, "#FFFFFF"),
    paper: resolveColor(mapLand, "#F4F2F5"),
    sky: resolveColor(tok("--line", "#F6F3F7"), "#F6F3F7", panel, 0.6),
    coldRing: resolveColor(tok("--map-cold-ring", "#8E8598"), "#8E8598"),
    bar: resolveColor(tok("--bar-hot", "#6A4874"), "#6A4874"),
  };
}
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
      // R2 on the base map too: nothing under 13 px, no uppercase, no tracking. Route shields (10 px refs such as "9A" in a sprite sized for them) go.
      if (id.includes("shield")) { l.layout.visibility = "none"; continue; }
      const up = (v: unknown) => (typeof v === "number" ? Math.max(13, v) : v);
      const s = l.layout["text-size"] ?? 16;
      l.layout["text-size"] = Array.isArray(s) && s[0] === "interpolate" ? [...s.slice(0, 3), ...s.slice(3).map((v: unknown, i: number) => (i % 2 ? up(v) : v))] : up(s);
      delete l.layout["text-transform"];
      l.layout["text-letter-spacing"] = 0;
      p["text-color"] = id.startsWith("label_") ? C.place : C.label;
      p["text-halo-color"] = C.land;
      p["text-halo-width"] = 1.4;
      p["text-halo-blur"] = 0;
    }
  }
  return style;
}
const MIN_R = 300;
const MAX_R = 5000;

export const walkMin = (m: number) => Math.max(1, Math.round(m / 80));

export default function RadarMap({ merchant, points, onSelect, onRadiusChange }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<ML>(null);
  const card = useRef<ML>(null);
  const signs = useRef<ML[]>([]);
  const meEl = useRef<HTMLElement | null>(null);
  const declutter = useRef<() => void>(() => undefined);
  const handle = useRef<ML>(null);
  const hAng = useRef(0); // where the handle sits on the radius ring (radians, 0 = east), chosen by the placement pass
  const dragging = useRef(false);
  const [ready, setReady] = useState(false);
  const [radius, setRadius] = useState(merchant.radiusM);
  const cb = useRef({ onSelect, onRadiusChange });
  cb.current = { onSelect, onRadiusChange };
  const radiusRef = useRef(merchant.radiusM);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => setRadius(merchant.radiusM), [merchant.radiusM]);
  radiusRef.current = radius;

  // Create the map once per merchant.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadMapLibre();
      if (cancelled || !mapEl.current) return;
      const ml = (window as unknown as { maplibregl: ML }).maplibregl;
      let style: ML = STYLE_URL;
      try {
        style = await (await fetch(STYLE_URL)).json();
        style = velours(style, palette());
        style.projection = { type: "globe" };
        const pal = palette();
        style.sky = { "sky-color": pal.sky, "horizon-color": pal.paper, "fog-color": pal.paper, "sky-horizon-blend": 0.7, "horizon-fog-blend": 0.8, "fog-ground-blend": 0.9, "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 0.8, 4, 0.5, 6.5, 0] };
      } catch {
        // keep the style URL; the map still renders
      }
      if (cancelled || !mapEl.current) return;
      let firstVisit = true;
      try {
        firstVisit = sessionStorage.getItem("turnout-radar-flown") !== "1" && new URLSearchParams(location.search).get("flight") !== "0";
        sessionStorage.setItem("turnout-radar-flown", "1");
      } catch {
        firstVisit = false;
      }
      const target = { center: [merchant.lon, merchant.lat], zoom: zoomFor(merchant.radiusM) };
      const m = new ml.Map({
        container: mapEl.current,
        style,
        center: target.center,
        zoom: firstVisit ? 2.2 : target.zoom,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        cooperativeGestures: true,
      });
      m.touchPitch?.disable?.();
      if (process.env.NODE_ENV !== "production") (window as unknown as { __tmMap?: ML }).__tmMap = m; // dev-only handle for debugging
      m.on("error", (e: { error?: Error }) => console.warn("[map]", e.error?.message ?? e));
      // Markers update their DOM position on the same "move" event, after this listener: defer a frame so the
      // placement pass reads settled positions; run again when a move or a fly-in ends.
      const later = () => requestAnimationFrame(() => declutter.current());
      m.on("move", later);
      m.on("moveend", later);
      m.on("idle", later);
      m.on("load", () => {
        if (cancelled) return;
        addLayers(m, palette());
        const ko = () => keepOut(m, wrapRef.current?.parentElement?.querySelector(".tm-fs")?.getBoundingClientRect());
        ko();
        m.on("move", ko);
        m.on("resize", ko);
        drawRings(m, merchant, merchant.radiusM);
        // merchant
        const me = document.createElement("div");
        meEl.current = me;
        me.className = "tm-me-wrap";
        me.innerHTML = `<span class="tm-me" aria-hidden="true"></span><span class="tm-chip tm-chip-me">${escapeHtml(merchant.name)}</span>`;
        new ml.Marker({ element: me, anchor: "center" }).setLngLat(target.center).addTo(m);
        // radius handle
        const h = document.createElement("button");
        h.type = "button";
        h.className = "tm-handle";
        h.setAttribute("aria-label", "Drag to change your radius");
        h.innerHTML = `<span class="tm-handle-dot" aria-hidden="true"></span><span class="tm-handle-lbl">${fmtKm(merchant.radiusM)}</span>`;
        const mk = new ml.Marker({ element: h, draggable: true, anchor: "center" }).setLngLat(ringPt(merchant, merchant.radiusM, hAng.current)).addTo(m);
        mk.on("dragstart", () => (dragging.current = true));
        mk.on("drag", () => {
          const r = clampR(metersBetween(merchant, mk.getLngLat()));
          drawRings(m, merchant, r);
          h.querySelector(".tm-handle-lbl")!.textContent = fmtKm(r);
        });
        mk.on("dragend", () => {
          dragging.current = false;
          const r = Math.round(clampR(metersBetween(merchant, mk.getLngLat())) / 100) * 100;
          mk.setLngLat(ringPt(merchant, r, hAng.current));
          drawRings(m, merchant, r);
          h.querySelector(".tm-handle-lbl")!.textContent = fmtKm(r);
          setRadius(r);
          cb.current.onRadiusChange?.(r);
        });
        handle.current = mk;
        // interactions
        m.on("mouseenter", "venue-dot", () => (m.getCanvas().style.cursor = "pointer"));
        m.on("mouseleave", "venue-dot", () => (m.getCanvas().style.cursor = ""));
        m.on("click", "venue-dot", (e: ML) => {
          const id = e.features?.[0]?.properties?.eventId;
          if (id) cb.current.onSelect?.(id);
        });
        map.current = m;
        setReady(true);
        m.resize();
        if (firstVisit) m.flyTo({ ...target, duration: 2600, curve: 1.5, essential: true });
      });
    })();
    return () => {
      cancelled = true;
      card.current?.remove();
      for (const sgn of signs.current) sgn.remove();
      signs.current = [];
      map.current?.remove();
      map.current = null;
      setReady(false);
    };
  }, [merchant.lat, merchant.lon, merchant.name]); // eslint-disable-line react-hooks/exhaustive-deps

  // Venues and the peek card follow the points (cursor, selection).
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    const labelData = () => {
      const signed = points.filter((q) => (q.hot && q.tonight) || q.selected).map((q) => m.project([q.lon, q.lat]));
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
    const ml = (window as unknown as { maplibregl: ML }).maplibregl;
    // Hot venues carry a solid sign label (an HTML marker); the chosen crowd keeps one too, so it reads on phones
    // where the peek board does not open. Cold venues keep the map's own text layer.
    // Priority: your place, then the chosen crowd's sign (always shown), then the biggest crowds.
    for (const sgn of signs.current) sgn.remove();
    signs.current = points
      .filter((p) => (p.hot && p.tonight) || p.selected)
      .sort((a, b) => Number(b.selected) - Number(a.selected) || b.capacity - a.capacity)
      .map((p) => {
        const el = document.createElement("div");
        el.className = p.selected ? "tm-sign sel" : "tm-sign";
        el.textContent = p.label;
        return new ml.Marker({ element: el, anchor: "center" }).setLngLat([p.lon, p.lat]).addTo(m);
      });
    const sel = points.find((p) => p.selected);
    card.current?.remove();
    card.current = null;
    if (sel && window.matchMedia("(min-width: 640px)").matches) {
      const el = document.createElement("div");
      el.className = `tm-peek${sel.hot ? " hot" : ""}`;
      el.innerHTML = `<p class="tm-peek-k">${escapeHtml(sel.time)}</p><p class="tm-peek-t">${escapeHtml(sel.label)}</p><p class="tm-peek-s">~<span class="mono">${sel.capacity.toLocaleString("en-US")}</span>&nbsp;people · <span class="mono">${walkMin(sel.distanceKm * 1000)}&nbsp;min</span> walk · ${escapeHtml(sel.venue)}</p>${sel.href && sel.hot ? `<a class="tm-peek-a" href="${sel.href}">See who is coming</a>` : ""}`;
      // Anchored at the centre; the placement pass below moves it to the free side of the venue.
      card.current = new ml.Marker({ element: el, anchor: "center", offset: [0, 0] }).setLngLat([sel.lon, sel.lat]).addTo(m);
    }
    // Placement and declutter, re-run on every map move:
    // 1. the peek board takes the first free side of its venue (below, above, left, right) that stays inside the map
    //    and covers neither your place, nor the biggest crowd's marker and sign, nor the full screen button;
    // 2. the first sign (the chosen crowd's, else the biggest crowd's) is always shown; any other sign that overlaps
    //    the board or a higher sign is hidden.
    declutter.current = () => {
      const mapRect = mapEl.current?.getBoundingClientRect();
      if (!mapRect) return;
      // A sign sits right of its dot, or left of it when it would run past the map's right edge; the radius label too.
      for (const sgn of signs.current) {
        const el = sgn.getElement() as HTMLElement, x = m.project(sgn.getLngLat()).x, w = el.offsetWidth;
        sgn.setOffset(x + 13 + w > mapRect.width - 8 ? [-(13 + w / 2), 0] : [13 + w / 2, 0]);
      }
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
      const obstacles: DOMRect[] = [];
      for (const q of [".tm-me", ".tm-chip-me"]) {
        const r = meEl.current?.querySelector(q)?.getBoundingClientRect();
        if (r) obstacles.push(r);
      }
      const fs = wrapRef.current?.parentElement?.querySelector(".tm-fs")?.getBoundingClientRect();
      if (fs) obstacles.push(fs);
      if (hEl) for (const q of [".tm-handle-dot", ".tm-handle-lbl"]) obstacles.push(hEl.querySelector(q)!.getBoundingClientRect());
      const top = signs.current[0];
      if (top) {
        const el = top.getElement() as HTMLElement;
        el.style.visibility = "visible";
        obstacles.push(el.getBoundingClientRect());
        const pt = m.project(top.getLngLat());
        obstacles.push(new DOMRect(mapRect.left + pt.x - 12, mapRect.top + pt.y - 12, 24, 24));
      }
      // The walking-time labels on the rings (map text north of your place): the board avoids them when it can.
      const ringLabels: DOMRect[] = m.queryRenderedFeatures({ layers: ["ring-label"] }).map((f: ML) => {
        const p = m.project(f.geometry.coordinates);
        return new DOMRect(mapRect.left + p.x - 85, mapRect.top + p.y - 26, 170, 24);
      });
      const c = card.current;
      if (c) {
        const el = c.getElement() as HTMLElement;
        const { width: w, height: h } = el.getBoundingClientRect();
        const pt = m.project(c.getLngLat());
        const cx = mapRect.left + pt.x;
        const cy = mapRect.top + pt.y;
        const gap = 18;
        // The board never covers its own venue either.
        obstacles.push(new DOMRect(cx - 12, cy - 12, 24, 24));
        // Each side slides along the map edge to stay inside, then is tested against the obstacles.
        const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
        const sides: [number, number][] = [[0, h / 2 + gap], [0, -(h / 2 + gap)], [-(w / 2 + gap), 0], [w / 2 + gap, 0]];
        // Try first the side facing away from the crowds (the centroid of the signs), then the farthest corners.
        const sp = signs.current.map((s) => m.project(s.getLngLat()));
        const gx = sp.length ? sp.reduce((a, p) => a + p.x, 0) / sp.length : pt.x;
        const gy = sp.length ? sp.reduce((a, p) => a + p.y, 0) / sp.length : pt.y;
        sides.sort((a, b) => b[0] * (pt.x - gx) + b[1] * (pt.y - gy) - (a[0] * (pt.x - gx) + a[1] * (pt.y - gy)));
        // Then the four corners of the map (narrow screens often leave no free side next to the venue).
        const corners: [number, number][] = [
          [mapRect.left + 6 + w / 2, mapRect.top + 6 + h / 2],
          [mapRect.right - 6 - w / 2, mapRect.top + 6 + h / 2],
          [mapRect.left + 6 + w / 2, mapRect.bottom - 6 - h / 2],
          [mapRect.right - 6 - w / 2, mapRect.bottom - 6 - h / 2],
        ];
        corners.sort((a, b) => Math.hypot(b[0] - mapRect.left - gx, b[1] - mapRect.top - gy) - Math.hypot(a[0] - mapRect.left - gx, a[1] - mapRect.top - gy));
        const candidates: [number, number][] = [
          ...sides.map(([dx, dy]): [number, number] => [clamp(cx + dx, mapRect.left + 6 + w / 2, mapRect.right - 6 - w / 2), clamp(cy + dy, mapRect.top + 6 + h / 2, mapRect.bottom - 6 - h / 2)]),
          ...corners,
        ];
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
        if (!chosen) {
          // Nothing free: the corner farthest from your place, so the merchant always reads.
          const meR = meEl.current?.querySelector(".tm-me")?.getBoundingClientRect();
          const far = meR ? [...corners].sort((a, b) => Math.hypot(b[0] - meR.left, b[1] - meR.top) - Math.hypot(a[0] - meR.left, a[1] - meR.top))[0] : corners[0];
          chosen = [far[0] - cx, far[1] - cy];
        }
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
        const el = sgn.getElement() as HTMLElement;
        el.style.visibility = "visible";
        const r = el.getBoundingClientRect();
        if (obstacles.some((o) => hits(o, r))) el.style.visibility = "hidden";
        else obstacles.push(r);
      }
    };
    requestAnimationFrame(() => declutter.current());
    // The fly to the selected crowd lasts 1.1 s; place the board once more when it has landed.
    const settle = setTimeout(() => declutter.current(), 1400);
    return () => { clearTimeout(settle); m.off("zoomend", labelData); };
  }, [points, ready]);

  // Fly to a newly selected crowd.
  const selKey = points.find((p) => p.selected)?.key;
  useEffect(() => {
    const m = map.current;
    const sel = pointsRef.current.find((p) => p.selected);
    if (!ready || !m || !sel) return;
    // Keep the whole radius in view, plus the selected venue if it sits outside it.
    const r = Math.max(radiusRef.current, 400);
    const b = new (window as unknown as { maplibregl: ML }).maplibregl.LngLatBounds(offset(merchant, -r, -r), offset(merchant, r, r)).extend([sel.lon, sel.lat]);
    m.fitBounds(b, { padding: { top: 70, bottom: 30, left: 30, right: 30 }, maxZoom: 15.4, duration: 1100 });
  }, [ready, selKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Radius changes from outside (buttons): move the ring and the handle.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    drawRings(m, merchant, radius);
    handle.current?.setLngLat(ringPt(merchant, radius, hAng.current));
    const lbl = handle.current?.getElement()?.querySelector(".tm-handle-lbl");
    if (lbl) lbl.textContent = fmtKm(radius);
  }, [radius, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // The radar view owns full screen; the map follows its container's size.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => map.current?.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="tm-mapwrap">
      <div ref={mapEl} className="tm-map" role="region" aria-label={`Map of crowds around ${merchant.name}`} />
    </div>
  );
}

function addLayers(m: ML, P: Palette) {
  m.addSource("rings", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  m.addLayer({ id: "ring-fill", type: "fill", source: "rings", filter: ["==", ["get", "main"], 1], paint: { "fill-color": P.ink, "fill-opacity": 0.025 } });
  m.addLayer({ id: "ring-line", type: "line", source: "rings", filter: ["==", ["geometry-type"], "Polygon"], paint: { "line-color": ["case", ["==", ["get", "main"], 1], P.ink, P.lineStrong], "line-width": ["case", ["==", ["get", "main"], 1], 1.5, 0.8], "line-dasharray": ["case", ["==", ["get", "main"], 1], ["literal", [3, 2.5]], ["literal", [1]]] } });
  m.addSource("ring-labels", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  m.addLayer({ id: "ring-label", type: "symbol", source: "ring-labels", layout: { "text-field": ["get", "label"], "text-font": FONT, "text-size": 15, "text-variable-anchor": ["bottom", "bottom-right", "bottom-left"], "text-offset": [0, -0.2], "text-allow-overlap": true }, paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.6 } });
  m.addSource("venues", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  // crowd mass: radius grows with the square root of the crowd
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
  m.addLayer({
    id: "venue-dot",
    type: "circle",
    source: "venues",
    layout: { "circle-sort-key": ["+", ["get", "hot"], ["*", 2, ["get", "selected"]]] },
    paint: {
      "circle-radius": ["case", ["==", ["get", "tonight"], 1], 7, ["==", ["get", "hot"], 1], 6, 4.5],
      "circle-color": ["case", ["==", ["get", "tonight"], 1], P.accent, ["==", ["get", "hot"], 1], P.bar, P.panel],
      "circle-opacity": 1,
      "circle-stroke-color": ["case", ["==", ["get", "selected"], 1], P.ink, ["==", ["get", "hot"], 1], P.panel, P.coldRing],
      "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 2.5, ["==", ["get", "hot"], 1], 1.8, 1.5],
    },
  });
  m.addLayer({
    id: "venue-label",
    type: "symbol",
    source: "venues",
    filter: ["==", ["get", "labelled"], 1],
    layout: { "text-field": ["get", "label"], "text-font": FONT_BOLD, "text-size": 14, "text-variable-anchor": ["left", "right", "top", "bottom"], "text-radial-offset": 0.9, "text-justify": "auto", "text-max-width": 9, "text-padding": 2 },
    paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.8 },
  });
  // Venue names avoid every venue dot (circle layers take no part in label collision): an empty 14 px icon per venue,
  // placed before the names, so a name takes its next free anchor or drops out instead of printing over a dot.
  if (!m.hasImage("dotbox")) m.addImage("dotbox", { width: 14, height: 14, data: new Uint8Array(14 * 14 * 4) });
  m.addLayer({ id: "venue-dotbox", type: "symbol", source: "venues", layout: { "icon-image": "dotbox", "icon-allow-overlap": true, "icon-ignore-placement": false } });
  // Keep-out: invisible icons that take room in label placement (this layer is placed first), so no label runs
  // past the map's edges or under the Full screen button; a label takes its next free anchor instead.
  m.addSource("keepout", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  m.addLayer({ id: "keepout", type: "symbol", source: "keepout", layout: { "icon-image": ["get", "img"], "icon-anchor": "top-left", "icon-allow-overlap": true, "icon-ignore-placement": false } });
  // Wine-dot cores take room in label placement too (invisible 14 px icons), so ring labels slide off the chosen crowd.
  if (!m.hasImage("dot-block")) m.addImage("dot-block", { width: 14, height: 14, data: new Uint8Array(14 * 14 * 4) });
  m.addLayer({ id: "dot-block", type: "symbol", source: "venues", filter: ["==", ["get", "tonight"], 1], layout: { "icon-image": "dot-block", "icon-allow-overlap": true } });
  // Placement runs top layer first: keepout, dot-block, ring labels, then venue labels, which collide with all three.
  // Dots stay under all text. A ring label takes its next free anchor and overlaps only when none is free.
  m.moveLayer("ring-label", "dot-block");
  m.moveLayer("keepout");
}

function keepOut(m: ML, fs?: DOMRect) {
  const c = m.getCanvas(), W = c.clientWidth, H = c.clientHeight, P = 100, g = 6, r = c.getBoundingClientRect();
  const boxes = [[W, -P, P, H + 2 * P], [-P, -P, P, H + 2 * P], [0, -P, W, P], [0, H, W, P]];
  if (fs) boxes.push([fs.left - r.left - g, fs.top - r.top - g, fs.width + 2 * g, fs.height + 2 * g]);
  // A box 100 px outside the canvas has no latitude while the fly-in is zoomed far out (MapLibre throws past 90°):
  // that box is skipped for this move and placed again on the next one.
  const at = (x: number, y: number): number[] | null => { try { return m.unproject([x, y]).toArray(); } catch { return null; } };
  const features = boxes.flatMap(([x, y, w, h], i) => {
    const coordinates = at(x, y);
    if (!coordinates) return [];
    const iw = Math.ceil(w), ih = Math.ceil(h), img = `keepout-${i}-${iw}x${ih}`;
    if (!m.hasImage(img)) m.addImage(img, { width: iw, height: ih, data: new Uint8Array(iw * ih * 4) });
    return [{ type: "Feature", properties: { img }, geometry: { type: "Point", coordinates } }];
  });
  m.getSource("keepout")?.setData({ type: "FeatureCollection", features });
}

function drawRings(m: ML, c: { lat: number; lon: number }, r: number) {
  const rings = [500, 1000, 2000, 3000].filter((x) => x < r - 150).map((x) => ({ r: x, main: 0 }));
  rings.push({ r, main: 1 });
  m.getSource("rings")?.setData({ type: "FeatureCollection", features: rings.map((x) => ({ type: "Feature", properties: { main: x.main }, geometry: { type: "Polygon", coordinates: [circle(c, x.r)] } })) });
  m.getSource("ring-labels")?.setData({
    type: "FeatureCollection",
    features: rings.filter((x) => x.main || window.matchMedia("(min-width: 640px)").matches).map((x) => ({ type: "Feature", properties: { label: `${fmtKm(x.r)} · ${walkMin(x.r)}\u00A0min walk` }, geometry: { type: "Point", coordinates: northOf(c, x.r) } })),
  });
}

function circle(c: { lat: number; lon: number }, r: number): number[][] {
  const pts: number[][] = [];
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * 2 * Math.PI;
    pts.push(offset(c, r * Math.cos(a), r * Math.sin(a)));
  }
  return pts;
}
function offset(c: { lat: number; lon: number }, dxM: number, dyM: number): number[] {
  const dLat = dyM / 111_320;
  const dLon = dxM / (111_320 * Math.cos((c.lat * Math.PI) / 180));
  return [c.lon + dLon, c.lat + dLat];
}
const ringPt = (c: { lat: number; lon: number }, r: number, a: number) => offset(c, r * Math.cos(a), r * Math.sin(a));
const northOf = (c: { lat: number; lon: number }, r: number) => offset(c, 0, r);
function metersBetween(c: { lat: number; lon: number }, p: { lat: number; lng: number }) {
  const dy = (p.lat - c.lat) * 111_320;
  const dx = (p.lng - c.lon) * 111_320 * Math.cos((c.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}
const clampR = (r: number) => Math.min(MAX_R, Math.max(MIN_R, r));
export const fmtKm = (m: number) => (m < 1000 ? `${Math.round(m / 50) * 50}\u00A0m` : `${(Math.round(m / 100) / 10).toLocaleString("en-US")}\u00A0km`);
function zoomFor(r: number) {
  return Math.max(11.5, Math.min(15.6, 14.6 - Math.log2(r / 1500)));
}

let mlPromise: Promise<void> | undefined;
function loadMapLibre(): Promise<void> {
  if (mlPromise) return mlPromise;
  mlPromise = new Promise((resolve, reject) => {
    if ((window as unknown as { maplibregl?: unknown }).maplibregl) return resolve();
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/5.24.0/maplibre-gl.min.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/5.24.0/maplibre-gl.min.js";
    js.onload = () => resolve();
    js.onerror = () => reject(new Error("MapLibre failed to load"));
    document.head.appendChild(js);
  });
  return mlPromise;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
