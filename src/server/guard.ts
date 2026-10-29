// Small in-memory rate limit for the public demo's POST routes (one Node process, one replica).
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(req: Request, key: string, max: number, windowMs: number): { ok: boolean; retryAfterS: number } {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const k = `${key}:${ip}`;
  const now = Date.now();
  const b = buckets.get(k);
  if (!b || b.resetAt < now) {
    buckets.set(k, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterS: 0 };
  }
  b.count += 1;
  if (b.count > max) return { ok: false, retryAfterS: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfterS: 0 };
}

export function tooMany(retryAfterS: number): Response {
  return new Response("Too many requests for the demo, try again in a minute.", { status: 429, headers: { "Retry-After": String(retryAfterS) } });
}

// Next may normalize req.url to localhost while the browser uses 127.0.0.1.
// Compare against the incoming Host as well; never accept an arbitrary forwarded host.
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const source = new URL(origin), target = new URL(req.url);
    return source.origin === target.origin || (source.protocol === target.protocol && source.host === req.headers.get("host"));
  } catch { return false; }
}
