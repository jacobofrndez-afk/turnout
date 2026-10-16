import Database from "better-sqlite3";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

export type Db = Database.Database;

const globalForDb = globalThis as unknown as { __crowdDb?: Db };

export function getDb(): Db {
  if (globalForDb.__crowdDb) return globalForDb.__crowdDb;
  const path = resolve(process.cwd(), process.env.DATABASE_PATH ?? "data/crowd.db");
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  const schema = readFileSync(resolve(process.cwd(), "src/server/db/schema.sql"), "utf8");
  db.exec(schema);
  globalForDb.__crowdDb = db;
  return db;
}

export function cacheKey(source: string, input: unknown): string {
  return createHash("sha256").update(source + "\n" + canonical(input)).digest("hex");
}

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
  }
  return JSON.stringify(value);
}

export function cacheGet<T>(source: string, input: unknown): T | undefined {
  const row = getDb()
    .prepare("SELECT response_json FROM api_cache WHERE key = ? AND expires_at > datetime('now')")
    .get(cacheKey(source, input)) as { response_json: string } | undefined;
  return row ? (JSON.parse(row.response_json) as T) : undefined;
}

export function cacheSet(source: string, input: unknown, value: unknown, ttlSeconds: number): void {
  getDb()
    .prepare(
      "INSERT OR REPLACE INTO api_cache (key, source, response_json, created_at, expires_at) VALUES (?, ?, ?, datetime('now'), datetime('now', ?))",
    )
    .run(cacheKey(source, input), source, JSON.stringify(value), `+${ttlSeconds} seconds`);
}

export function newId(prefix: string): string {
  return `${prefix}_${createHash("sha1").update(String(Math.random()) + Date.now()).digest("hex").slice(0, 12)}`;
}
