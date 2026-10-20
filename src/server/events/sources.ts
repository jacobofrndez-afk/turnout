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

export function registerSource(s: MomentSource): void {
  if (!SOURCES.some((x) => x.id === s.id)) SOURCES.push(s);
}

export async function collectMoments(m: SourceMerchant, now: Date, hoursAhead: number): Promise<{ moments: TmEvent[]; errors: { source: string; message: string }[] }> {
  const errors: { source: string; message: string }[] = [];
  const runs = SOURCES.filter((s) => s.appliesTo(m)).map(async (s) => {
    try {
      return await withTimeout(s.fetch(m, now, hoursAhead), 12_000);
    } catch (e) {
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
