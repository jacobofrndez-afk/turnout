// Address geocoding via OpenStreetMap Nominatim (no key; 1 request per second; demo volumes only).
import { cacheGet, cacheSet } from "@/server/db/client";

export type Geocoded = { lat: number; lon: number; displayName: string; city: string; countryCode: string; timezone: string };

export async function geocode(address: string): Promise<Geocoded | undefined> {
  const key = { address: address.trim().toLowerCase() };
  const cached = cacheGet<Geocoded>("nominatim", key);
  if (cached) return cached;
  const q = new URLSearchParams({ q: address, format: "jsonv2", limit: "1", addressdetails: "1" });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${q}`, {
    headers: { "User-Agent": "crowd-to-campaign/0.1 (hackathon demo)", "Accept-Language": "en" },
  });
  if (!res.ok) return undefined;
  const rows = (await res.json()) as { lat: string; lon: string; display_name: string; address?: Record<string, string> }[];
  const r = rows[0];
  if (!r) return undefined;
  const a = r.address ?? {};
  const countryCode = (a.country_code ?? "").toUpperCase();
  const lon = Number(r.lon);
  const out: Geocoded = {
    lat: Number(r.lat),
    lon,
    displayName: r.display_name,
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? "",
    countryCode,
    timezone: guessTimezone(countryCode, lon),
  };
  cacheSet("nominatim", key, out, 30 * 24 * 3600);
  return out;
}

// Reverse geocode a point to its neighbourhood name (Nominatim). Cached for 30 days.
export async function neighbourhoodName(lat: number, lon: number): Promise<string | undefined> {
  const key = { lat: lat.toFixed(4), lon: lon.toFixed(4) };
  const cached = cacheGet<{ name?: string }>("nominatim-reverse", key);
  if (cached) return cached.name;
  const q = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "jsonv2", zoom: "15", addressdetails: "1" });
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${q}`, {
    headers: { "User-Agent": "turnout/0.1 (hackathon demo)", "Accept-Language": "en" },
  });
  if (!res.ok) return undefined;
  const r = (await res.json()) as { address?: Record<string, string> };
  const a = r.address ?? {};
  const name = a.neighbourhood ?? a.suburb ?? a.quarter ?? a.city_district ?? a.borough ?? a.city ?? undefined;
  cacheSet("nominatim-reverse", key, { name }, 30 * 24 * 3600);
  return name;
}

function guessTimezone(cc: string, lon: number): string {
  switch (cc) {
    case "FR": return "Europe/Paris";
    case "GB": return "Europe/London";
    case "DE": return "Europe/Berlin";
    case "ES": return "Europe/Madrid";
    case "IT": return "Europe/Rome";
    case "NL": return "Europe/Amsterdam";
    case "BE": return "Europe/Brussels";
    case "CH": return "Europe/Zurich";
    case "PT": return "Europe/Lisbon";
    case "CA": return lon < -115 ? "America/Vancouver" : lon < -90 ? "America/Edmonton" : "America/Toronto";
    case "US": return lon < -140 ? "Pacific/Honolulu" : lon < -115 ? "America/Los_Angeles" : lon < -102 ? "America/Denver" : lon < -85 ? "America/Chicago" : "America/New_York";
    case "MX": return "America/Mexico_City";
    case "BR": return "America/Sao_Paulo";
    case "JP": return "Asia/Tokyo";
    case "AU": return "Australia/Sydney";
    default: return "UTC";
  }
}
