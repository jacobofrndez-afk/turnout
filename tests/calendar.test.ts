import assert from "node:assert/strict";
import { test } from "node:test";
import { calendarDays, localDateKey } from "../src/lib/calendar";
test("calendar assigns an event to the place's date, not UTC or the viewer's date", () => {
  assert.equal(localDateKey("2026-10-25T01:30:00Z", "America/New_York"), "2026-10-24");
  assert.equal(localDateKey("2026-10-25T01:30:00Z", "Europe/Paris"), "2026-10-25");
});
test("seven calendar dates stay consecutive over autumn DST and month boundaries", () => {
  const dates = calendarDays(Date.parse("2026-10-31T03:30:00Z"), "America/New_York");
  assert.deepEqual(dates.map(d => d.key), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05"]);
  assert.equal(dates[2].weekday, 0);
});
test("spring DST neither duplicates nor skips a local calendar day", () => {
  const dates = calendarDays(Date.parse("2026-03-28T23:30:00Z"), "Europe/Paris");
  assert.deepEqual(dates.map(d => d.key), ["2026-03-29", "2026-03-30", "2026-03-31", "2026-04-01", "2026-04-02", "2026-04-03", "2026-04-04"]);
});
