// Crowds that are not one ticketed show in a venue: games watched on TV, street and city events, calendar moments.
// Each source returns moments shaped like events (origin, window, crowd estimate, Qloo signal in meta).
// Sources fail independently: one outage never blanks the radar.
import type { TmEvent } from "./ticketmaster";

export type SourceMerchant = { id: string; lat: number; lon: number; radiusM: number; seats: number; city: string; timezone: string };

export type MomentSource = {
  id: string;
  // Only run where it has data (a city feed, a league's home market).
  appliesTo: (m: SourceMerchant) => boolean;
  fetch: (m: SourceMerchant, now: Date, hoursAhead: number) => Promise<TmEvent[]>;
};

const SOURCES: MomentSource[] = [];

// A source that failed recently is skipped for a few minutes, so an outage costs one timeout, not one per page view.
const COOLDOWN_MS = 5 * 60_000;
const failedAt = ((globalThis as unknown as { __sourceFailedAt?: Map<string, number> }).__sourceFailedAt ??= new Map<string, number>());

export function registerSource(s: MomentSource): void {
  if (!SOURCES.some((x) => x.id === s.id)) SOURCES.push(s);
}

export async function collectMoments(m: SourceMerchant, now: Date, hoursAhead: number): Promise<{ moments: TmEvent[]; errors: { source: string; message: string }[] }> {
  const errors: { source: string; message: string }[] = [];
  const runs = SOURCES.filter((s) => s.appliesTo(m)).map(async (s) => {
    const last = failedAt.get(s.id);
    if (last && Date.now() - last < COOLDOWN_MS) {
      errors.push({ source: s.id, message: "skipped, failed less than 5 minutes ago" });
      return [];
    }
    try {
      const out = await withTimeout(s.fetch(m, now, hoursAhead), 9_000);
      failedAt.delete(s.id);
      return out;
    } catch (e) {
      failedAt.set(s.id, Date.now());
      errors.push({ source: s.id, message: String((e as Error).message).slice(0, 160) });
      return [];
    }
  });
  const moments = (await Promise.all(runs)).flat();
  return { moments, errors };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms} ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}
