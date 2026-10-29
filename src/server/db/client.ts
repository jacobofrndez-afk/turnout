import Database from "better-sqlite3";
import { DEMO_OFFER_COPY, DEMO_NEUTRAL_TITLES } from "./demo-offer-copy";
import { readFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

export type Db = Database.Database;

const globalForDb = globalThis as unknown as { __crowdDb?: Db };

export function getDb(): Db {
  if (globalForDb.__crowdDb) return globalForDb.__crowdDb;
  const path = resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATABASE_PATH ?? "data/crowd.db");
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  const schema = readFileSync(resolve(process.cwd(), "src/server/db/schema.sql"), "utf8");
  db.exec(schema);
  migrate(db);
  globalForDb.__crowdDb = db;
  return db;
}

// Additive migrations for columns added after the first release of the schema.
function migrate(db: Db): void {
  const add = (table: string, column: string, ddl: string) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  add("campaigns", "dna_version", "dna_version INTEGER");
  add("campaigns", "dna_snapshot_json", "dna_snapshot_json TEXT");
  add("campaigns", "evidence_json", "evidence_json TEXT");
  add("campaigns", "review_json", "review_json TEXT");
  add("campaigns", "review_revision", "review_revision INTEGER NOT NULL DEFAULT 0");
  add("merchants", "seats", "seats INTEGER NOT NULL DEFAULT 60");
  add("events", "origin", "origin TEXT NOT NULL DEFAULT 'ticketmaster'");
  add("events", "window_start", "window_start TEXT");
  add("events", "window_end", "window_end TEXT");
  add("events", "crowd_est", "crowd_est INTEGER");
  add("events", "meta_json", "meta_json TEXT");
  // Update only unchanged demo text; merchant edits and historical campaigns stay intact.
  for (const field of ["title", "description", "price"] as const) {
    const update = db.prepare(`UPDATE offers SET ${field} = ? WHERE id = ? AND merchant_id = 'm_quai_bercy' AND ${field} = ?`);
    for (const offer of DEMO_OFFER_COPY) {
      if (offer.before[field] !== offer.after[field]) update.run(offer.after[field], offer.id, offer.before[field]);
    }
  }
  const renameDemo = db.prepare("UPDATE offers SET title=? WHERE id=? AND merchant_id=? AND title=?");
  for (const offer of DEMO_NEUTRAL_TITLES) renameDemo.run(offer.after,offer.offerId,offer.merchantId,offer.before);
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
