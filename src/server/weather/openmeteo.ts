// Weather from Open-Meteo (free, no key). Like Ticketmaster, an external signal Qloo does not have:
// it does not change who the crowd is, it changes what to offer them and how to say it.
import { cacheGet, cacheSet } from "@/server/db/client";

type Hour = { t: number; tempC: number; feelsC: number; precipProb: number; precipMm: number; code: number; windKmh: number };

export type WeatherKind = "storm" | "snow" | "rain" | "cold" | "hot" | "windy" | "nice" | "mild";
export type WeatherSummary = { kind: WeatherKind; label: string; tempC: number; feelsC: number; precipProb: number; precipMm: number; windKmh: number; code: number };

const API = "https://api.open-meteo.com/v1/forecast";

async function hourly(lat: number, lon: number): Promise<Hour[]> {
  const key = { lat: lat.toFixed(2), lon: lon.toFixed(2), bucket: Math.floor(Date.now() / 3_600_000) };
  const cached = cacheGet<Hour[]>("open-meteo", key);
  if (cached) return cached;
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    hourly: "temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m",
    timezone: "UTC",
    forecast_days: "7",
  });
  const res = await fetch(`${API}?${q}`);
  if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
  const j = (await res.json()) as { hourly?: Record<string, (number | string | null)[]> };
  const h = j.hourly ?? {};
  const times = (h.time ?? []) as string[];
  const num = (k: string, i: number) => Number((h[k] ?? [])[i] ?? 0);
  const hours: Hour[] = times.map((t, i) => ({
    t: Date.parse(`${t}:00Z`),
    tempC: num("temperature_2m", i),
    feelsC: num("apparent_temperature", i),
    precipProb: num("precipitation_probability", i),
    precipMm: num("precipitation", i),
    code: num("weather_code", i),
    windKmh: num("wind_speed_10m", i),
  }));
  cacheSet("open-meteo", key, hours, 3600);
  return hours;
}

function classify(s: Omit<WeatherSummary, "kind" | "label">): WeatherKind {
  if (s.code >= 95) return "storm";
  if ((s.code >= 71 && s.code <= 77) || s.code === 85 || s.code === 86) return "snow";
  const wetCode = (s.code >= 51 && s.code <= 67) || (s.code >= 80 && s.code <= 82);
  if (s.precipProb >= 50 || s.precipMm >= 0.5 || (wetCode && s.precipProb >= 35)) return "rain";
  if (s.feelsC <= 7) return "cold";
  if (s.feelsC >= 27) return "hot";
  if (s.windKmh >= 35) return "windy";
  if (s.feelsC >= 15) return "nice";
  return "mild";
}

const KIND_LABEL: Record<WeatherKind, string> = {
  storm: "Thunderstorms",
  snow: "Snow",
  rain: "Rain likely",
  cold: "Cold",
  hot: "Hot",
  windy: "Windy",
  nice: "Dry and pleasant",
  mild: "Dry, cool",
};

export function formatTemp(c: number, timezone: string): string {
  return timezone.startsWith("America/") ? `${Math.round((c * 9) / 5 + 32)}°F` : `${Math.round(c)}°C`;
}

// Aggregate the forecast over a time window (the crowd's arrival or exit).
export async function weatherWindow(lat: number, lon: number, startIso: string, endIso: string, timezone: string): Promise<WeatherSummary | undefined> {
  const start = Date.parse(startIso) - 30 * 60_000;
  const end = Date.parse(endIso);
  const hours = (await hourly(lat, lon)).filter((h) => h.t >= start && h.t <= end);
  if (hours.length === 0) return undefined;
  const avg = (k: keyof Hour) => hours.reduce((a, h) => a + h[k], 0) / hours.length;
  const base = {
    tempC: Math.round(avg("tempC") * 10) / 10,
    feelsC: Math.round(avg("feelsC") * 10) / 10,
    precipProb: Math.max(...hours.map((h) => h.precipProb)),
    precipMm: Math.round(hours.reduce((a, h) => a + h.precipMm, 0) * 10) / 10,
    windKmh: Math.round(Math.max(...hours.map((h) => h.windKmh))),
    code: Math.max(...hours.map((h) => h.code)),
  };
  const kind = classify(base);
  const parts = [KIND_LABEL[kind]];
  if (kind === "rain" || kind === "storm") {
    // Past or nowcast hours can carry measured rain with a 0% probability: show millimetres then.
    if (base.precipProb > 0) parts[0] = `${base.precipProb >= 50 || kind === "storm" ? KIND_LABEL[kind] : "Showers possible"} (${base.precipProb}%)`;
    else parts[0] = `Rain (${base.precipMm} mm)`;
  }
  parts.push(formatTemp(base.tempC, timezone));
  if (Math.abs(base.feelsC - base.tempC) >= 3) parts.push(`feels ${formatTemp(base.feelsC, timezone)}`);
  if (base.windKmh >= 25) parts.push(`wind ${base.windKmh} km/h`);
  return { ...base, kind, label: parts.join(", ") };
}

// Evenings of the coming week (17:00 to 21:00 local), for the weekly neighbourhood brief.
export async function eveningsThisWeek(lat: number, lon: number, timezone: string): Promise<{ day: string; summary: WeatherSummary }[]> {
  const out: { day: string; summary: WeatherSummary }[] = [];
  const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: timezone });
  const hourFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: timezone });
  const now = Date.now();
  for (let d = 0; d < 7; d++) {
    // Find 17:00 local on day d by scanning hours (avoids timezone arithmetic).
    const dayStart = now + d * 86_400_000;
    let startMs: number | undefined;
    for (let h = 0; h < 30; h++) {
      const t = Math.floor(dayStart / 3_600_000) * 3_600_000 + h * 3_600_000;
      if (hourFmt.format(new Date(t)) === "17" && t >= now - 3_600_000) {
        startMs = t;
        break;
      }
    }
    if (startMs === undefined) continue;
    const s = await weatherWindow(lat, lon, new Date(startMs).toISOString(), new Date(startMs + 4 * 3_600_000).toISOString(), timezone);
    const day = dayFmt.format(new Date(startMs));
    if (s && !out.some((o) => o.day === day)) out.push({ day, summary: s });
  }
  return out;
}
