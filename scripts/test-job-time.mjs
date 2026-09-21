import assert from "node:assert/strict";
import { toInstant, localDateTime, todayBounds } from "../lib/jobs/time.ts";

assert.equal(toInstant("2026-01-15T09:00"), "2026-01-15T14:00:00.000Z");
assert.equal(toInstant("2026-07-15T09:00"), "2026-07-15T13:00:00.000Z");
assert.equal(toInstant("2026-03-08T02:30"), null, "nonexistent DST time must not silently shift");
assert.equal(toInstant("2026-02-30T09:00"), null);
assert.equal(toInstant("invalid"), null);
assert.equal(localDateTime("2026-07-15T13:00:00.000Z"), "2026-07-15T09:00");
assert.equal(toInstant("2026-11-01T01:30"), "2026-11-01T05:30:00.000Z", "repeated fall hour uses earlier occurrence");
const spring = todayBounds(new Date("2026-03-08T16:00:00Z"));
const fall = todayBounds(new Date("2026-11-01T16:00:00Z"));
assert.equal(Date.parse(spring.end) - Date.parse(spring.start), 23 * 3600000);
assert.equal(Date.parse(fall.end) - Date.parse(fall.start), 25 * 3600000);
console.log("PASS: New York scheduling, invalid dates, DST gap/repeat, and 23/25-hour day filters.");
