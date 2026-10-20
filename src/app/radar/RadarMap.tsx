"use client";
import { useEffect, useRef, useState } from "react";

// Map styled per design/brand/GUIDELINES.md: desaturated tiles, merchant ink dot with paper ring,
// hot venues amber with a label on a white chip, cold venues neutral with a muted label,
// radius as a thin dashed circle with no fill, no blue, no pulsing.

export type MapPoint = {
  key: string; // venue key (one marker per venue)
  eventId: string;
  label: string;
  sub: string;
  lat: number;
  lon: number;
  hot: boolean;
  active: boolean; // crowd present at the cursor time
  selected: boolean;
};

type Props = {
  merchant: { name: string; lat: number; lon: number; radiusM: number };
  points: MapPoint[];
  onSelect?: (eventId: string) => void;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
type L = any;

export default function RadarMap({ merchant, points, onSelect }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapEl = useRef<HTMLDivElement>(null);
  const map = useRef<L>(null);
  const layer = useRef<L>(null);
  const [ready, setReady] = useState(false);
  const [full, setFull] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Create the map once per merchant.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadLeaflet();
      if (cancelled || !mapEl.current) return;
      const Lf = (window as unknown as { L: L }).L;
      const m = Lf.map(mapEl.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([merchant.lat, merchant.lon], 15);
      Lf.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "&copy; OpenStreetMap contributors", maxZoom: 19 }).addTo(m);
      Lf.circle([merchant.lat, merchant.lon], { radius: merchant.radiusM, color: "#cfc7b8", weight: 1.5, dashArray: "6 6", fill: false, interactive: false }).addTo(m);
      Lf.marker([merchant.lat, merchant.lon], {
        icon: Lf.divIcon({ className: "tm-marker", iconSize: [0, 0], html: `<span class="tm-me" aria-hidden="true"></span><span class="tm-chip tm-chip-me">${escapeHtml(merchant.name)}</span>` }),
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(m);
      layer.current = Lf.layerGroup().addTo(m);
      map.current = m;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
      setReady(false);
    };
  }, [merchant.lat, merchant.lon, merchant.radiusM, merchant.name]);

  // Redraw venue markers when the points change (cursor moves, selection changes).
  useEffect(() => {
    if (!ready || !layer.current) return;
    const Lf = (window as unknown as { L: L }).L;
    layer.current.clearLayers();
    for (const p of points) {
      const cls = ["tm-venue", p.hot ? "is-hot" : "is-cold", p.active ? "is-active" : "is-idle", p.selected ? "is-selected" : ""].join(" ");
      const showLabel = p.hot || p.selected || p.active;
      const html = `<span class="${cls}"><span class="tm-dot" aria-hidden="true"></span>${showLabel ? `<span class="tm-chip">${escapeHtml(p.label)}<small>${escapeHtml(p.sub)}</small></span>` : ""}</span>`;
      const mk = Lf.marker([p.lat, p.lon], {
        icon: Lf.divIcon({ className: "tm-marker", iconSize: [0, 0], html }),
        title: `${p.label} · ${p.sub}`,
        riseOnHover: true,
        zIndexOffset: p.selected ? 900 : p.hot ? 500 : 0,
      });
      mk.on("click", () => onSelectRef.current?.(p.eventId));
      layer.current.addLayer(mk);
    }
  }, [points, ready]);

  // Pan to the selected venue.
  const selected = points.find((p) => p.selected);
  useEffect(() => {
    if (!ready || !map.current || !selected) return;
    map.current.panTo([selected.lat, selected.lon], { animate: true });
  }, [ready, selected?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Full screen on the map container; keep Leaflet's size in sync.
  useEffect(() => {
    const onChange = () => {
      setFull(document.fullscreenElement === wrapRef.current);
      setTimeout(() => map.current?.invalidateSize(), 120);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFull() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await wrapRef.current?.requestFullscreen();
    } catch {
      // Fullscreen refused (embedded frame, some mobile browsers): fall back to a tall in-page map.
      setFull((f) => !f);
      setTimeout(() => map.current?.invalidateSize(), 120);
    }
  }

  return (
    <div ref={wrapRef} className={`tm-mapwrap${full ? " is-full" : ""}`}>
      <div ref={mapEl} className="tm-map" role="region" aria-label={`Map of crowds around ${merchant.name}`} />
      <button type="button" className="tm-fullbtn" onClick={toggleFull} aria-pressed={full}>
        {full ? "Exit full screen" : "Full screen"}
      </button>
    </div>
  );
}

let leafletPromise: Promise<void> | undefined;
function loadLeaflet(): Promise<void> {
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if ((window as unknown as { L?: unknown }).L) return resolve();
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    document.head.appendChild(css);
    const js = document.createElement("script");
    js.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    js.onload = () => resolve();
    js.onerror = () => reject(new Error("Leaflet failed to load"));
    document.head.appendChild(js);
  });
  return leafletPromise;
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);
