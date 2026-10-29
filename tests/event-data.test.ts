import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { normalize, type RawEvent } from "../src/server/events/ticketmaster";
import { getDb } from "../src/server/db/client";
import { getMerchant, radarFor } from "../src/server/events/radar";
import { scheduledAgenda } from "../src/server/events/agenda";
import { recentlyChecked, sourceCheck } from "../src/lib/event-evidence";

mkdirSync(".tmp", { recursive: true });
const temp = mkdtempSync(resolve(".tmp/event-data-"));
process.env.DATABASE_PATH = resolve(temp, "test.db");
process.env.TICKETMASTER_API_KEY = "test-only";
const db = getDb();
const checkedAt = new Date().toISOString();
const startsAt = new Date(Date.now() + 3_600_000).toISOString();
const raw: RawEvent = {
  id: "source_event", name: "Published show", url: "https://www.ticketmaster.com/event/source_event",
  dates: { start: { dateTime: startsAt }, timezone: "America/New_York", status: { code: "onsale" } },
  classifications: [{ segment: { name: "Music" } }],
  _embedded: { venues: [{ name: "Venue", location: { latitude: "40.75", longitude: "-73.99" } }], attractions: [{ name: "Published artist" }] },
};
after(() => { db.close(); rmSync(temp, { recursive: true, force: true }); });

test("source facts and verification time survive normalization", () => {
  const event = normalize(raw, checkedAt)!;
  assert.equal(event.name, raw.name);
  assert.equal(event.startsAt, startsAt);
  assert.equal(event.url, raw.url);
  assert.deepEqual(sourceCheck(event.meta), { source: "Ticketmaster", checkedAt, mode: "live" });
});

test("no invented evening time or UTC conversion from an unconfirmed local date", () => {
  assert.equal(normalize({ ...raw, dates: { start: { localDate: "2030-10-24" } } }, checkedAt), null);
  assert.equal(normalize({ ...raw, dates: { start: { localDate: "2030-10-24", localTime: "20:00:00" } } }, checkedAt), null);
  assert.equal(normalize({ ...raw, dates: { start: { dateTime: "2030-10-24T20:00:00" } } }, checkedAt), null);
  for (const flag of ["dateTBA", "dateTBD", "timeTBA", "noSpecificTime"]) assert.equal(normalize({ ...raw, dates: { ...raw.dates, start: { dateTime: startsAt, [flag]: true } } }, checkedAt), null);
});

test("test events, cancellations, postponements and invalid coordinates are excluded", () => {
  assert.equal(normalize({ ...raw, test: true }, checkedAt), null);
  for (const code of ["cancelled", "canceled", "postponed"]) assert.equal(normalize({ ...raw, dates: { ...raw.dates, status: { code } } }, checkedAt), null);
  for (const latitude of ["", "91", "NaN"]) assert.equal(normalize({ ...raw, _embedded: { venues: [{ name: "Bad venue", location: { latitude, longitude: "-73.99" } }] } }, checkedAt), null);
});

test("old unverified records cannot masquerade as current event data", () => {
  assert.equal(recentlyChecked(undefined), false);
  assert.equal(recentlyChecked({ sourceCheck: { source: "Ticketmaster", checkedAt: new Date(Date.now() - 7 * 3_600_000).toISOString(), mode: "stored" } }), false);
});

test("live, cached and outage paths preserve provenance and never revive corrected records", async () => {
  db.prepare("INSERT INTO merchants (id,name,kind,lat,lon,city,timezone) VALUES ('place','Test','bar',40.75,-73.99,'New York','America/New_York')").run();
  // A legacy row whose source was never recorded must not appear in an outage.
  db.prepare("INSERT INTO events (id,name,venue_name,lat,lon,starts_at) VALUES ('legacy','Old demo','Venue',40.75,-73.99,?)").run(startsAt);
  const merchant = getMerchant("place")!;
  const originalFetch = globalThis.fetch;
  const tmGlobal = globalThis as typeof globalThis & { __tmFailedAt?: number };
  let requests = 0;
  const later = { ...raw, id: "later", name: "Large later event", dates: { ...raw.dates, start: { dateTime: new Date(Date.now() + 7_200_000).toISOString() } } };
  try {
    globalThis.fetch = async () => { requests++; return Response.json({ _embedded: { events: [later, raw] }, page: { totalPages: 1 } }); };
    const live = await radarFor(merchant, 48, { scheduledOnly: true, refresh: true });
    assert.equal(live.length, 2);
    const time = sourceCheck(live[0].event.meta)!.checkedAt;
    assert.deepEqual(scheduledAgenda(live).map((e) => e.event.id), ["source_event", "later"]);
    const cached = await radarFor(merchant, 48, { scheduledOnly: true });
    assert.equal(requests, 1);
    assert.equal(sourceCheck(cached[0].event.meta)?.mode, "cache");
    assert.equal(sourceCheck(cached[0].event.meta)?.checkedAt, time);
    assert.equal((db.prepare("SELECT fetched_at FROM events WHERE id='later'").get() as { fetched_at: string }).fetched_at, time);
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    const saved = await radarFor(merchant, 48, { scheduledOnly: true, refresh: true });
    assert.equal(saved.length, 2);
    assert.ok(saved.every((e) => sourceCheck(e.event.meta)?.mode === "stored"));
    assert.ok(saved.every((e) => sourceCheck(e.event.meta)?.checkedAt === time));
    // A later source response cancels one show and removes the other. Do not merge either back from storage.
    globalThis.fetch = async () => Response.json({ _embedded: { events: [{ ...raw, dates: { ...raw.dates, status: { code: "cancelled" } } }] } });
    assert.deepEqual(await radarFor(merchant, 48, { scheduledOnly: true, refresh: true }), []);
    assert.equal((db.prepare("SELECT status FROM events WHERE id='source_event'").get() as { status: string }).status, "cancelled");
    globalThis.fetch = async () => new Response("Unavailable", { status: 503 });
    const fallback = await radarFor(merchant, 48, { scheduledOnly: true, refresh: true });
    assert.deepEqual(fallback.map((e) => e.event.id), ["later"]);
    const old = new Date(Date.now() - 7 * 3_600_000).toISOString();
    db.prepare("UPDATE events SET meta_json = ?").run(JSON.stringify({ sourceCheck: { source: "Ticketmaster", checkedAt: old, mode: "live" } }));
    await assert.rejects(radarFor(merchant, 48, { scheduledOnly: true, refresh: true }), /503/);
  } finally { globalThis.fetch = originalFetch; tmGlobal.__tmFailedAt = undefined; }
});
