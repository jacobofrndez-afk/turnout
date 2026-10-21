"use client";
import { useEffect, useRef, useState } from "react";

// Vector map in the spirit of the global search prototype: MapLibre on OpenFreeMap "positron" (free, no key),
// a short flight in from the globe on first open, venues drawn as map layers (size = crowd), a peek card on the
// selected crowd, radar rings with walking times, and a draggable handle to widen or narrow the merchant's radius.
// Brand rules (Marquise): merchant in ink as a square, hot crowds solid raspberry with a sign label, others cold grey, no blue, no pulsing.

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
type Palette = { ink: string; accent: string; neutral: string; ring: string; lineStrong: string; muted: string; panel: string; paper: string; sky: string };
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
  const ink = tok("--ink", "#111114");
  const muted = tok("--muted", "#62646B");
  const panel = tok("--panel", "#FFFFFF");
  // Map-specific tokens win when the identity defines them (--map-land, --map-cold, --map-hot); otherwise the
  // colours derive from the shared tokens.
  const mapCold = tok("--map-cold", "#7C8794");
  const mapHot = tok("--map-hot", tok("--accent", "#E0115F"));
  const mapLand = tok("--map-land", tok("--paper", "#ECEDEC"));
  return {
    ink: resolveColor(ink, "#111114"),
    accent: resolveColor(mapHot, "#E0115F"),
    neutral: resolveColor(mapCold, "#7C8794"),
    ring: resolveColor(ink, "#111114"),
    lineStrong: resolveColor(tok("--line-strong", "#C9CBCD"), "#C9CBCD"),
    muted: resolveColor(muted, "#62646B"),
    panel: resolveColor(panel, "#FFFFFF"),
    paper: resolveColor(mapLand, "#ECEDEC"),
    sky: resolveColor(tok("--line", "#E3E4E4"), "#E3E4E4", panel, 0.6),
  };
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
      // Markers update their DOM position on the same "move" event, after this listener: defer a frame so the
      // placement pass reads settled positions; run again when a move or a fly-in ends.
      const later = () => requestAnimationFrame(() => declutter.current());
      m.on("move", later);
      m.on("moveend", later);
      m.on("idle", later);
      m.on("load", () => {
        if (cancelled) return;
        addLayers(m, palette());
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
        const mk = new ml.Marker({ element: h, draggable: true, anchor: "center" }).setLngLat(eastOf(merchant, merchant.radiusM)).addTo(m);
        mk.on("drag", () => {
          const r = clampR(metersBetween(merchant, mk.getLngLat()));
          drawRings(m, merchant, r);
          h.querySelector(".tm-handle-lbl")!.textContent = fmtKm(r);
        });
        mk.on("dragend", () => {
          const r = Math.round(clampR(metersBetween(merchant, mk.getLngLat())) / 100) * 100;
          mk.setLngLat(eastOf(merchant, r));
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
    const src = m.getSource("venues");
    src?.setData({
      type: "FeatureCollection",
      features: points.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lon, p.lat] },
        properties: { eventId: p.eventId, label: p.label, cap: p.capacity, hot: p.hot ? 1 : 0, active: p.active ? 1 : 0, selected: p.selected ? 1 : 0, labelled: p.hot || p.active || p.selected ? 1 : 0 },
      })),
    });
    const ml = (window as unknown as { maplibregl: ML }).maplibregl;
    // Hot venues carry a solid sign label (an HTML marker); cold venues keep the map's own text layer.
    for (const sgn of signs.current) sgn.remove();
    signs.current = points
      .filter((p) => p.hot && !p.selected)
      .sort((a, b) => b.capacity - a.capacity)
      .map((p) => {
        const el = document.createElement("div");
        el.className = "tm-sign";
        el.textContent = p.label;
        return new ml.Marker({ element: el, anchor: "left", offset: [13, 0] }).setLngLat([p.lon, p.lat]).addTo(m);
      });
    const sel = points.find((p) => p.selected);
    card.current?.remove();
    card.current = null;
    if (sel) {
      const el = document.createElement("div");
      el.className = `tm-peek${sel.hot ? " hot" : ""}`;
      el.innerHTML = `<p class="tm-peek-k">${escapeHtml(sel.time)}${sel.active ? ` · <span class="on">around you now on the timeline</span>` : ""}</p><p class="tm-peek-t">${escapeHtml(sel.label)}</p><p class="tm-peek-s">${escapeHtml(sel.venue)} · ~<span class="mono">${sel.capacity.toLocaleString("en-US")}</span> people · <span class="mono">${walkMin(sel.distanceKm * 1000)} min</span> walk</p>${sel.href && sel.hot ? `<a class="tm-peek-a" href="${sel.href}">Qualify this crowd with Qloo</a>` : ""}`;
      // Anchored at the centre; the placement pass below moves it to the free side of the venue.
      card.current = new ml.Marker({ element: el, anchor: "center", offset: [0, 0] }).setLngLat([sel.lon, sel.lat]).addTo(m);
    }
    // Placement and declutter, re-run on every map move:
    // 1. the peek board takes the first free side of its venue (below, above, left, right) that stays inside the map
    //    and covers neither your place, nor the biggest crowd's marker and sign, nor the full screen button;
    // 2. the biggest crowd's sign is always shown; any other sign that overlaps the board or a bigger sign is hidden.
    declutter.current = () => {
      const mapRect = mapEl.current?.getBoundingClientRect();
      if (!mapRect) return;
      const hits = (a: DOMRect, b: DOMRect, pad = 4) => a.left < b.right + pad && a.right > b.left - pad && a.top < b.bottom + pad && a.bottom > b.top - pad;
      const obstacles: DOMRect[] = [];
      for (const q of [".tm-me", ".tm-chip-me"]) {
        const r = meEl.current?.querySelector(q)?.getBoundingClientRect();
        if (r) obstacles.push(r);
      }
      const fs = wrapRef.current?.parentElement?.querySelector(".tm-fs")?.getBoundingClientRect();
      if (fs) obstacles.push(fs);
      const top = signs.current[0];
      if (top) {
        const el = top.getElement() as HTMLElement;
        el.style.visibility = "visible";
        obstacles.push(el.getBoundingClientRect());
        const pt = m.project(top.getLngLat());
        obstacles.push(new DOMRect(mapRect.left + pt.x - 12, mapRect.top + pt.y - 12, 24, 24));
      }
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
        let chosen: [number, number] | undefined;
        let fallback: [number, number] = sides[0];
        for (const [dx, dy] of sides) {
          const ccx = clamp(cx + dx, mapRect.left + 6 + w / 2, mapRect.right - 6 - w / 2);
          const ccy = clamp(cy + dy, mapRect.top + 6 + h / 2, mapRect.bottom - 6 - h / 2);
          const r = new DOMRect(ccx - w / 2, ccy - h / 2, w, h);
          const off: [number, number] = [ccx - cx, ccy - cy];
          if (dx === 0 && dy > 0) fallback = off;
          if (!obstacles.some((o) => hits(o, r))) {
            chosen = off;
            break;
          }
        }
        c.setOffset(chosen ?? fallback);
        obstacles.push(el.getBoundingClientRect());
      }
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
    return () => clearTimeout(settle);
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
    handle.current?.setLngLat(eastOf(merchant, radius));
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
  m.addLayer({ id: "ring-label", type: "symbol", source: "ring-labels", layout: { "text-field": ["get", "label"], "text-font": FONT, "text-size": 10.5, "text-anchor": "bottom", "text-offset": [0, -0.2], "text-allow-overlap": true }, paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.6 } });
  m.addSource("venues", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  // crowd mass: radius grows with the square root of the crowd
  m.addLayer({
    id: "venue-mass",
    type: "circle",
    source: "venues",
    paint: {
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 12, ["*", 0.12, ["sqrt", ["get", "cap"]]], 16, ["*", 0.34, ["sqrt", ["get", "cap"]]]],
      "circle-color": ["case", ["==", ["get", "hot"], 1], P.accent, P.neutral],
      "circle-opacity": ["case", ["==", ["get", "active"], 1], 0.14, 0.05],
      "circle-stroke-color": ["case", ["==", ["get", "hot"], 1], P.accent, P.neutral],
      "circle-stroke-width": ["case", ["==", ["get", "active"], 1], 1, 0],
      "circle-stroke-opacity": 0.6,
    },
  });
  m.addLayer({
    id: "venue-dot",
    type: "circle",
    source: "venues",
    layout: { "circle-sort-key": ["+", ["get", "hot"], ["*", 2, ["get", "selected"]]] },
    paint: {
      "circle-radius": ["case", ["==", ["get", "hot"], 1], 7, 5],
      "circle-color": ["case", ["==", ["get", "hot"], 1], P.accent, P.neutral],
      "circle-opacity": 1,
      "circle-stroke-color": ["case", ["==", ["get", "selected"], 1], P.ink, P.panel],
      "circle-stroke-width": ["case", ["==", ["get", "selected"], 1], 2.5, 1.8],
    },
  });
  m.addLayer({
    id: "venue-label",
    type: "symbol",
    source: "venues",
    filter: ["all", ["==", ["get", "labelled"], 1], ["==", ["get", "selected"], 0], ["==", ["get", "hot"], 0]],
    layout: { "text-field": ["get", "label"], "text-font": FONT_BOLD, "text-size": 12, "text-anchor": "left", "text-offset": [0.9, 0], "text-max-width": 12, "text-padding": 4 },
    paint: { "text-color": P.muted, "text-halo-color": P.panel, "text-halo-width": 1.8 },
  });
}

function drawRings(m: ML, c: { lat: number; lon: number }, r: number) {
  const rings = [500, 1000, 2000, 3000].filter((x) => x < r - 150).map((x) => ({ r: x, main: 0 }));
  rings.push({ r, main: 1 });
  m.getSource("rings")?.setData({ type: "FeatureCollection", features: rings.map((x) => ({ type: "Feature", properties: { main: x.main }, geometry: { type: "Polygon", coordinates: [circle(c, x.r)] } })) });
  m.getSource("ring-labels")?.setData({
    type: "FeatureCollection",
    features: rings.map((x) => ({ type: "Feature", properties: { label: `${fmtKm(x.r)} · ${walkMin(x.r)} min walk` }, geometry: { type: "Point", coordinates: northOf(c, x.r) } })),
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
const eastOf = (c: { lat: number; lon: number }, r: number) => offset(c, r, 0);
const northOf = (c: { lat: number; lon: number }, r: number) => offset(c, 0, r);
function metersBetween(c: { lat: number; lon: number }, p: { lat: number; lng: number }) {
  const dy = (p.lat - c.lat) * 111_320;
  const dx = (p.lng - c.lon) * 111_320 * Math.cos((c.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}
const clampR = (r: number) => Math.min(MAX_R, Math.max(MIN_R, r));
export const fmtKm = (m: number) => (m < 1000 ? `${Math.round(m / 50) * 50} m` : `${(Math.round(m / 100) / 10).toLocaleString("en-US")} km`);
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
