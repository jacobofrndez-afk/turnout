// Playwright records VP8 at 1 Mbit/s from JPEG frames at quality 90, which blurs UI text.
// This raises both (idempotent); `npm run record` runs it first.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const base = join(here, "node_modules/playwright-core/lib/server/chromium");
const edits = [
  [join(base, "videoRecorder.js"), "-qmin 0 -qmax 50 -crf 8 -deadline realtime -speed 8 -b:v 1M", "-qmin 0 -qmax 18 -crf 4 -deadline realtime -speed 8 -b:v 14M"],
  [join(base, "crPage.js"), "quality: 90,", "quality: 100,"],
];
for (const [file, from, to] of edits) {
  const s = readFileSync(file, "utf8");
  if (s.includes(to)) continue;
  if (!s.includes(from)) { console.warn("recorder patch: pattern not found in", file); continue; }
  writeFileSync(file, s.replace(from, to));
  console.log("patched", file);
}
