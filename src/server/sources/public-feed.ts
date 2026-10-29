import { cacheGet, cacheSet } from "@/server/db/client";
const HOSTS = new Set(["trends.google.com", "public.api.bsky.app", "public.opendatasoft.com"]);
/** Fixed public providers, bounded responses, no redirects or credential forwarding. */
export async function publicFeed(url: URL, ttl: number, format: "text" | "json" = "json") {
  if (url.protocol !== "https:" || !HOSTS.has(url.hostname) || url.port || url.username || url.password) throw new Error("Unsupported source");
  const key = { url: url.href, format };
  const cached = cacheGet<{ data: unknown; checkedAt: string }>("discovery-public-v1", key);
  if (cached) return { ...cached, mode: "cache" as const };
  const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8000), headers: { Accept: format === "text" ? "application/rss+xml, application/xml" : "application/json" } });
  if (!response.ok || !response.body) throw new Error("Source unavailable");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 2_000_000) throw new Error("Source response too large"); chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const text = Buffer.concat(chunks).toString("utf8");
  const result = { data: format === "text" ? text : JSON.parse(text) as unknown, checkedAt: new Date().toISOString() };
  cacheSet("discovery-public-v1", key, result, ttl);
  return { ...result, mode: "live" as const };
}
