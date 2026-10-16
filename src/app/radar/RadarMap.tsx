"use client";
import { useEffect, useRef } from "react";

type Point = { id: string; name: string; venue: string; lat: number; lon: number; score: number; capacity: number; startsAt: string };
type Props = { merchant: { name: string; lat: number; lon: number; radiusM: number }; points: Point[] };

// Leaflet loaded from a CDN at runtime to keep the bundle small; tiles from OpenStreetMap.
export default function RadarMap({ merchant, points }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: { remove: () => void } | undefined;
    let cancelled = false;
    (async () => {
      await loadLeaflet();
      if (cancelled || !ref.current) return;
      const L = (window as unknown as { L: LeafletLike }).L;
      map = L.map(ref.current, { zoomControl: true, attributionControl: true }).setView([merchant.lat, merchant.lon], 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);
      L.circle([merchant.lat, merchant.lon], { radius: merchant.radiusM, color: "#7c5cff", weight: 1, fillOpacity: 0.08 }).addTo(map);
      L.circleMarker([merchant.lat, merchant.lon], { radius: 7, color: "#fff", fillColor: "#7c5cff", fillOpacity: 1, weight: 2 })
        .addTo(map)
        .bindTooltip(merchant.name, { permanent: true, direction: "top", offset: [0, -8] });
      for (const p of points) {
        const r = 5 + Math.sqrt(p.capacity) / 10;
        const hot = p.score >= 45;
        L.circleMarker([p.lat, p.lon], { radius: Math.min(r, 28), color: hot ? "#34d399" : "#38bdf8", fillColor: hot ? "#34d399" : "#38bdf8", fillOpacity: hot ? 0.55 : 0.25, weight: 1 })
          .addTo(map)
          .bindPopup(`<b>${escapeHtml(p.name)}</b><br/>${escapeHtml(p.venue)}<br/>~${p.capacity.toLocaleString("en-US")} people · score ${p.score}`);
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [merchant, points]);

  return <div ref={ref} className="h-[520px] w-full rounded-lg" style={{ background: "var(--panel)", border: "1px solid var(--line)" }} />;
}

type LeafletLike = {
  map: (el: HTMLElement, o: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, o: Record<string, unknown>) => { addTo: (m: LeafletMap) => void };
  circle: (ll: [number, number], o: Record<string, unknown>) => { addTo: (m: LeafletMap) => void };
  circleMarker: (ll: [number, number], o: Record<string, unknown>) => LeafletLayer;
};
type LeafletMap = { setView: (ll: [number, number], z: number) => LeafletMap; remove: () => void };
type LeafletLayer = { addTo: (m: LeafletMap) => LeafletLayer; bindPopup: (html: string) => LeafletLayer; bindTooltip: (t: string, o: Record<string, unknown>) => LeafletLayer };

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
