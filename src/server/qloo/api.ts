// Direct Qloo API client (hackathon base URL). Used for what the harness workflows do not expose:
// point + radius place queries, shortlist affinity, tag lookups. Every call is cached.
import { cacheGet, cacheSet } from "@/server/db/client";
import { requireEnv } from "@/server/env";

export type QlooEntity = {
  entity_id: string;
  name: string;
  subtype?: string;
  types?: string[]; // /search returns types[] instead of subtype
  popularity?: number;
  affinity?: number;
  query?: { affinity?: number; explainability?: unknown };
  properties?: Record<string, unknown>;
  tags?: { id?: string; tag_id?: string; name: string; type?: string }[];
  disambiguation?: string;
};

export type QlooTag = { tag_id?: string; id?: string; name: string; subtype?: string; type?: string; query?: { affinity?: number } };

export type Demographics = {
  age: Record<"24_and_younger" | "25_to_29" | "30_to_34" | "35_to_44" | "45_to_54" | "55_and_older", number>;
  gender: { male: number; female: number };
};

export type QlooCall = { path: string; params: Record<string, string>; status: number; durationMs: number; cacheHit: boolean; resultCount: number };

const DEFAULT_TTL = 7 * 24 * 3600;

export async function qlooGet<T = unknown>(
  path: string,
  params: Record<string, string>,
  opts: { ttl?: number; onCall?: (c: QlooCall) => void } = {},
): Promise<T> {
  const t0 = Date.now();
  const cached = cacheGet<T>("qloo", { path, params });
  if (cached !== undefined) {
    opts.onCall?.({ path, params, status: 200, durationMs: Date.now() - t0, cacheHit: true, resultCount: countResults(cached) });
    return cached;
  }
  const base = process.env.QLOO_BASE_URL ?? "https://hackathon.api.qloo.com";
  let res: Response | undefined;
  let body: T = {} as T;
  // The hackathon key rate-limits bursts (HTTP 429). Retry a few times with backoff.
  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(`${base}${path}?${new URLSearchParams(params)}`, { headers: { "X-Api-Key": requireEnv("QLOO_API_KEY") } });
    body = (await res.json().catch(() => ({}))) as T;
    if (res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 800 * 2 ** attempt));
  }
  if (!res) throw new Error("Qloo request failed before any response");
  const call: QlooCall = { path, params, status: res.status, durationMs: Date.now() - t0, cacheHit: false, resultCount: countResults(body) };
  opts.onCall?.(call);
  if (!res.ok) throw new Error(`Qloo ${path} HTTP ${res.status}: ${JSON.stringify(body).slice(0, 200)}`);
  cacheSet("qloo", { path, params }, body, opts.ttl ?? DEFAULT_TTL);
  return body;
}

function countResults(body: unknown): number {
  const r = (body as { results?: unknown })?.results as Record<string, unknown> | unknown[] | undefined;
  if (Array.isArray(r)) return r.length;
  if (r && typeof r === "object") {
    for (const k of ["entities", "tags", "demographics", "heatmap", "trending", "audiences"]) {
      const v = (r as Record<string, unknown>)[k];
      if (Array.isArray(v)) return v.length;
    }
  }
  return 0;
}

type Opts = { onCall?: (c: QlooCall) => void };

export async function searchEntities(query: string, types?: string[], opts: Opts = {}): Promise<QlooEntity[]> {
  const params: Record<string, string> = { query, take: "6" };
  if (types?.length) params.types = types.map((t) => `urn:entity:${t}`).join(",");
  const body = await qlooGet<{ results?: QlooEntity[] }>("/search", params, opts);
  // Normalise: search results carry types[] while insights carry subtype.
  return (body.results ?? []).map((e) => ({ ...e, subtype: e.subtype ?? e.types?.find((t) => t.startsWith("urn:entity:")) }));
}

// What Qloo is asked about: one entity (a headliner), several (a wave of shows), or taste tags (a moment with no single star).
export type Signal = string | { entities?: string[]; tags?: string[] };

function signalParams(s: Signal): Record<string, string> {
  if (typeof s === "string") return { "signal.interests.entities": s };
  const out: Record<string, string> = {};
  if (s.entities?.length) out["signal.interests.entities"] = s.entities.join(",");
  if (s.tags?.length) out["signal.interests.tags"] = s.tags.join(",");
  return out;
}

export async function tasteTags(signal: Signal, o: { parentTypes?: string[]; tagTypes?: string[]; take?: number } = {}, opts: Opts = {}): Promise<QlooTag[]> {
  const params: Record<string, string> = { "filter.type": "urn:tag", ...signalParams(signal), take: String(o.take ?? 20) };
  if (o.parentTypes?.length) params["filter.parents.types"] = o.parentTypes.map((t) => `urn:entity:${t}`).join(",");
  if (o.tagTypes?.length) params["filter.tag.types"] = o.tagTypes.join(",");
  const body = await qlooGet<{ results?: { tags?: QlooTag[] } }>("/v2/insights", params, opts);
  return body.results?.tags ?? [];
}

export async function demographics(signal: Signal, opts: Opts = {}): Promise<Demographics | undefined> {
  const body = await qlooGet<{ results?: { demographics?: { entity_id: string; query: Demographics }[] } }>(
    "/v2/insights",
    { "filter.type": "urn:demographics", ...signalParams(signal) },
    opts,
  );
  // Several entities return one row each: average them into one crowd.
  const rows = (body.results?.demographics ?? []).map((d) => d.query).filter(Boolean);
  if (rows.length <= 1) return rows[0];
  const avg = (pick: (d: Demographics) => Record<string, number>) => {
    const out: Record<string, number> = {};
    for (const k of Object.keys(pick(rows[0]))) out[k] = rows.reduce((a, d) => a + (pick(d)[k] ?? 0), 0) / rows.length;
    return out;
  };
  return { age: avg((d) => d.age), gender: avg((d) => d.gender) } as Demographics;
}

export async function recommend(
  targetType: string,
  o: { entities?: string[]; tags?: string[]; location?: { lat: number; lon: number; radiusM: number }; filterTags?: string[]; take?: number; explain?: boolean },
  opts: Opts = {},
): Promise<QlooEntity[]> {
  const params: Record<string, string> = { "filter.type": `urn:entity:${targetType}`, take: String(o.take ?? 15) };
  if (o.entities?.length) params["signal.interests.entities"] = o.entities.join(",");
  if (o.tags?.length) params["signal.interests.tags"] = o.tags.join(",");
  if (o.location) {
    params["filter.location"] = `POINT(${o.location.lon} ${o.location.lat})`;
    params["filter.location.radius"] = String(o.location.radiusM);
  }
  if (o.filterTags?.length) params["filter.tags"] = o.filterTags.join(",");
  if (o.explain) params["feature.explainability"] = "true";
  const body = await qlooGet<{ results?: { entities?: QlooEntity[] } }>("/v2/insights", params, opts);
  return body.results?.entities ?? [];
}

// Affinity of a fixed shortlist toward the signals (the "rank" job).
export async function rankShortlist(targetType: string, optionIds: string[], signalEntities: string[], opts: Opts = {}): Promise<QlooEntity[]> {
  const body = await qlooGet<{ results?: { entities?: QlooEntity[] } }>(
    "/v2/insights",
    { "filter.type": `urn:entity:${targetType}`, "signal.interests.entities": signalEntities.join(","), "filter.results.entities": optionIds.join(","), take: "20" },
    opts,
  );
  return body.results?.entities ?? [];
}

export async function findTags(query: string, take = 8, opts: Opts = {}): Promise<QlooTag[]> {
  const body = await qlooGet<{ results?: { tags?: QlooTag[] } | QlooTag[] }>("/v2/tags", { "filter.query": query, take: String(take) }, opts);
  const r = body.results;
  return Array.isArray(r) ? r : (r?.tags ?? []);
}

export const tagId = (t: QlooTag) => t.tag_id ?? t.id ?? "";

// Local fandom: how much the streets around a point love an entity, from the Qloo heatmap.
// affinity and popularity are rescaled inside each response (they average 0.5), so only affinity_rank
// compares entities. We keep the median affinity_rank of the cells within `nearM` of the point.
export type HeatCell = { location: { latitude: number; longitude: number; geohash: string }; query: { affinity?: number; affinity_rank?: number; popularity?: number } };

export async function localFandom(entityIds: string[], lat: number, lon: number, opts: Opts & { nearM?: number } = {}): Promise<{ rank: number; cells: number } | undefined> {
  const nearM = opts.nearM ?? 800;
  const key = { entityIds: [...entityIds].sort(), lat: lat.toFixed(4), lon: lon.toFixed(4), nearM };
  const cached = cacheGet<{ rank: number; cells: number } | null>("qloo-fandom", key);
  if (cached !== undefined) return cached ?? undefined;
  const body = await qlooGet<{ results?: { heatmap?: HeatCell[] } }>(
    "/v2/insights",
    { "filter.type": "urn:heatmap", "signal.interests.entities": entityIds.join(","), "filter.location": `POINT(${lon} ${lat})`, "filter.location.radius": "2000" },
    { ...opts, ttl: 60 }, // the raw heatmap is large: keep the computed median for a week instead
  );
  const cells = body.results?.heatmap ?? [];
  const near = cells
    .filter((c) => metres(lat, lon, c.location.latitude, c.location.longitude) <= nearM && typeof c.query.affinity_rank === "number")
    .map((c) => c.query.affinity_rank as number)
    .sort((a, b) => a - b);
  const out = near.length ? { rank: near[Math.floor(near.length / 2)], cells: near.length } : null;
  cacheSet("qloo-fandom", key, out, 7 * 24 * 3600);
  return out ?? undefined;
}

function metres(lat1: number, lon1: number, lat2: number, lon2: number): number {
  return Math.hypot((lat2 - lat1) * 111_320, (lon2 - lon1) * 111_320 * Math.cos((lat1 * Math.PI) / 180));
}

