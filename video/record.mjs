// Records the Turnout demo as one night, driven by the narration's clock: each spoken line has a
// planned start (out/voice/lines.json: pauses and durations); the script waits for that moment,
// shows the caption, marks the real time, and performs the shot while the line plays. The app
// runs inside an iframe of a shell page (tv.js) that owns the radar, the logo morph, the journey
// band, captions and spotlight, so nothing the app re-renders can flash or shift.
// Usage: BASE_URL=https://turnout.example CAMPAIGN_ID=camp_xxx node record.mjs
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "out");
mkdirSync(OUT, { recursive: true });

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3103").replace(/\/$/, "");
let CAMPAIGN = process.env.CAMPAIGN_ID;
const HERO = process.env.HERO ?? "m_penn_pour";
const BOARD_TEXT = process.env.BOARD_TEXT ?? "Before Harry? Two cocktails, one price.";
const HOOK_COUNT = Number(process.env.HOOK_COUNT ?? 20000);
// Blips in units of the mark (the hinge is the merchant); the big one sits where the mark's own blip is.
const BLIPS = JSON.parse(process.env.BLIPS ?? "null") ?? [
  { name: "Arena", sub: "20,000 seats · 2 blocks · out 10:45 pm", u: 16, v: -10, big: true },
  { name: "Theatre", u: -15, v: -10 },
  { name: "Stadium", u: -19, v: 4 },
  { name: "Jazz club", u: 9, v: 13 },
  { name: "Concert hall", u: -7, v: 17 },
  { name: "Festival", u: 4, v: -19 },
];
const STEPS = ["The crowd", "Who they are", "The offer", "Your words", "Approve", "Out the door"];
const LINES = JSON.parse(readFileSync(join(OUT, "voice/lines.json"), "utf8"));
const L = Object.fromEntries(LINES.map((l) => [l.id, l]));
// The narration clock: planned start of each line, seconds from the start of the recording.
const planned = {}; { let t = 0; for (const l of LINES) { t += l.gapBefore; planned[l.id] = t; t += l.duration; } }
// When a shot comes late (a slow page), the whole clock shifts by that delay: pauses stay as written.
let shift = 0;
const start = (id) => planned[id] + shift;

const VW = 1920, VH = 1080, BAR = 64, ZOOM = 1.25;
const RADAR = { cx: 960, cy: 470, s: 18, blips: BLIPS };
const LOGO = { center: [960, 540], K: 9 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FONT = `"Helvetica Neue", Helvetica, Arial, sans-serif`;
const DARK = "#18101c";
const TVJS = readFileSync(join(here, "tv.js"), "utf8");
const SHELL = `<!doctype html><html><head><meta charset="utf-8"><title>Turnout demo</title></head><body>
<script>window.TV_CONFIG=${JSON.stringify({ font: FONT, dark: DARK, vw: VW, vh: VH, bar: BAR, steps: STEPS, you: "YOUR PLACE" })}</script>
<script>${TVJS}</script></body></html>`;

const browser = await chromium.launch({ channel: "chrome", headless: true, args: [`--window-size=${VW},${VH}`] });
{
  const warm = await browser.newContext({ viewport: { width: VW, height: VH } });
  const p = await warm.newPage();
  for (const u of [`/today?merchant=${HERO}`]) await p.goto(BASE + u, { waitUntil: "networkidle" }).catch(() => {});
  if (!CAMPAIGN) {
    await p.goto(`${BASE}/today?merchant=${HERO}`, { waitUntil: "networkidle" });
    const own = p.getByRole("button", { name: /Make your own version/ });
    if (await own.count()) await own.first().click(); else await p.locator('a[href*="/campaigns/camp_"]').first().click();
    await p.waitForURL(/\/campaigns\/camp_/, { timeout: 30000 });
    CAMPAIGN = new URL(p.url()).pathname.split("/")[2];
    console.log("draft", CAMPAIGN);
  }
  for (const u of [`/campaigns/${CAMPAIGN}?merchant=${HERO}`, `/campaigns/${CAMPAIGN}/board`]) await p.goto(BASE + u, { waitUntil: "networkidle" }).catch(() => {});
  await warm.close();
}
const context = await browser.newContext({
  viewport: { width: VW, height: VH }, deviceScaleFactor: 1, colorScheme: "light", locale: "en-US",
  timezoneId: "America/New_York", recordVideo: { dir: OUT, size: { width: VW, height: VH } },
});
// Inside the app frame, the zoom is a stylesheet present before the first paint: no size change at hydration.
await context.addInitScript((z) => {
  if (window.top === window) return;
  const add = () => { if (!document.head) return false; if (!document.getElementById("tv-zoom")) { const s = document.createElement("style"); s.id = "tv-zoom"; s.textContent = `body{zoom:${z}} html{scrollbar-width:none} ::-webkit-scrollbar{display:none}`; document.head.appendChild(s); } return true; };
  if (!add()) new MutationObserver((_, o) => { if (add()) o.disconnect(); }).observe(document.documentElement, { childList: true });
}, ZOOM);
const page = await context.newPage();
await page.goto(`${BASE}/api/health`);
await page.setContent(SHELL, { waitUntil: "load" });
const app = page.frame({ name: "app" });
if (!app) throw new Error("app frame missing");
const t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
const marks = [];
const tv = (fn, ...args) => page.evaluate(({ fn, args }) => window.tv[fn](...args), { fn, args });

// Wait for the narration clock, mark the real start, then show the line where asked.
async function cue(id, where = "cap", html) {
  const target = start(id);
  const wait = target - now();
  if (wait > 0) await sleep(wait * 1000);
  const at = now();
  if (at - target > 0.05) shift += at - target;
  if (where === "cap") await tv("cap", L[id].text);
  else if (where === "line") await tv("line", html ?? L[id].text);
  else if (where === "tag") await tv("tag", L[id].text);
  marks.push({ id, planned: planned[id], at });
}
// Time left until the line ends (never negative), to pace what happens while it plays.
const left = (id, minMs = 0) => Math.max(minMs, (start(id) + L[id].duration - now()) * 1000);

async function load(path) {
  await app.goto(BASE + path, { waitUntil: "load" });
  await app.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await app.evaluate(() => document.fonts.ready);
  await app.evaluate(() => scrollTo(0, 0));
}
async function dim() { await tv("dim"); await sleep(470); }
async function show() { await tv("show"); await sleep(480); }
async function scrollTo(y, ms = 1000) {
  await app.evaluate(([y, ms]) => new Promise((res) => {
    const s = scrollY, d = Math.max(0, y) - s, t0 = performance.now();
    if (!ms) { window.scrollTo(0, Math.max(0, y)); return res(); }
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const f = (now) => { const p = Math.min(1, (now - t0) / ms); window.scrollTo(0, s + d * ease(p)); p < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), [y, ms]);
}
async function topOf(locator) { const b = await locator.first().boundingBox(); const sy = await app.evaluate(() => scrollY); return b ? b.y + sy : 0; }
async function bring(locator, offset = 120, ms = 1000) { await scrollTo((await topOf(locator)) - offset, ms); await sleep(ms ? 150 : 50); }
async function moveTo(locator) {
  const b = await locator.first().boundingBox(); if (!b) return;
  const x = b.x + b.width / 2, y = b.y + Math.min(b.height / 2, 24);
  await tv("cursor", x, y);
  await page.mouse.move(x, y, { steps: 28 });
  await sleep(320);
}
async function click(locator) { await moveTo(locator); await page.mouse.down(); await sleep(80); await page.mouse.up(); }
// The spotlight covers whole blocks (cards, sections), never a run of text, so edges never cut a line.
async function spot(pad, ...locators) {
  const boxes = (await Promise.all(locators.map((l) => l.first().boundingBox()))).filter(Boolean);
  if (!boxes.length) return;
  const x = Math.min(...boxes.map((b) => b.x)) - pad, y = Math.min(...boxes.map((b) => b.y)) - pad;
  const w = Math.max(...boxes.map((b) => b.x + b.width)) - x + pad, h = Math.max(...boxes.map((b) => b.y + b.height)) - y + pad;
  await tv("spot", x, y, w, h);
}
async function unspot() { await tv("unspot"); }
async function drift(locator, ms = 7000, scale = 1.04) { const b = await locator.first().boundingBox(); if (!b) return; await tv("drift", b.x + b.width / 2, b.y + b.height / 2, ms, scale); }
async function undrift() { await tv("undrift"); await sleep(1100); }
const hookHtml = (t) => t.replace(/twenty[- ]thousand/i, '<b id="num">0</b>').replace(/ten forty[- ]five/i, "<b>10:45 pm</b>");

try {
  // Today loads in the dark, under the stage; the header lockup is cloned for the morph.
  await load(`/today?merchant=${HERO}`);
  const lockup = app.locator(".turnout-wordmark svg.turnout-logo-wide").first();
  await tv("setLogo", await lockup.evaluate((e) => e.outerHTML));
  const lockupRect = await lockup.boundingBox();
  await tv("show");

  // The crowd, on the radar.
  await tv("intro", RADAR);
  await cue("hook1", "line");
  await cue("hook2", "line", hookHtml(L.hook2.text));
  await sleep(300); await tv("count", HOOK_COUNT, 1200);
  await cue("hook3", "line");
  await sleep(left("hook3", 0));

  // The radar becomes the logo, then the logo takes its place in the product.
  await cue("radar1", "none");
  await tv("morph", LOGO);
  await sleep(350);
  await cue("radar2", "cap");
  await tv("fly", lockupRect);
  await tv("journey", true);
  await tv("step", 0);

  // Tonight's crowd.
  const occasion = app.locator(".agent-opportunity").first();
  await bring(occasion, 150, 900);
  await spot(16, occasion);
  await drift(occasion, 6500);
  await cue("today");
  await sleep(left("today", 0) - 900);
  await undrift();

  // Who they are, then the offer.
  const heading = app.locator(".agent-decision-heading").first();
  const evidence = app.locator(".agent-evidence").first();
  const cards = app.locator(".agent-offer-comparison").first();
  await bring(heading, 140, 1000);
  await tv("step", 1);
  await spot(16, heading, (await evidence.count()) ? evidence : cards);
  await cue("profile");
  await sleep(left("profile", 0) - 600);
  await tv("step", 2);
  await spot(14, cards);
  await drift(cards, 7000, 1.05);
  await cue("pick");
  await sleep(left("pick", 0) - 1100);
  await undrift();
  await unspot();
  await tv("cap", "");

  // Your words: the campaign page, the board rewriting itself.
  await dim();
  await load(`/campaigns/${CAMPAIGN}?merchant=${HERO}`);
  const editor = app.locator(".agent-board-editor").first();
  await editor.waitFor({ state: "visible", timeout: 15000 });
  await bring(editor, 150, 0);
  await show();
  await tv("step", 3);
  await spot(16, editor);
  const chalk = (await editor.locator("textarea").count()) ? editor.locator("textarea").first() : app.locator("textarea").last();
  await cue("touch");
  await sleep(700);
  await click(chalk);
  await chalk.fill("");
  await sleep(200);
  await chalk.pressSequentially(BOARD_TEXT, { delay: 40 });
  await sleep(left("touch", 500));
  await unspot();

  // Approve.
  const review = app.getByRole("button", { name: /Review campaign/ });
  await bring(review, 520, 900);
  await tv("step", 4);
  await cue("approve");
  await click(review);
  const approve = app.getByRole("button", { name: /Approve/ });
  await approve.waitFor({ state: "visible", timeout: 15000 });
  await sleep(250);
  await bring(approve, 520, 700);
  await spot(12, approve);
  await sleep(350);
  await click(approve);
  await sleep(250);
  await unspot();
  await sleep(left("approve", 300));

  // Out the door: the receipt, then the board.
  const receipt = app.locator(".agent-receipt-success").first();
  const approved = await receipt.waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
  if (!approved) console.error("approval did not show a receipt; continuing to the board");
  await tv("step", 5);
  const actions = app.locator(".agent-board-actions").first();
  if (approved) { await bring(receipt, 150, 900); await spot(16, receipt, (await actions.count()) ? actions : receipt); }
  await cue("receipt");
  await sleep(left("receipt", 0) - 1500);
  await unspot();
  await tv("cap", "");
  const openBoard = app.locator('a[href$="/board"]').first();
  await dim();
  if (await openBoard.count()) { await openBoard.click(); await app.waitForURL(/\/board/, { timeout: 15000 }); await app.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {}); }
  else await load(`/campaigns/${CAMPAIGN}/board`);
  const board = app.locator(".campaign-board").first();
  await board.waitFor({ state: "visible", timeout: 15000 });
  await app.evaluate(() => document.fonts.ready);
  await bring(board, 120, 0);
  await show();
  await spot(18, board);
  await drift(board, 7500, 1.08);
  await cue("board");
  await sleep(left("board", 0) - 200);
  await unspot();
  await tv("cap", "");

  // The radar again, and the logo to close.
  await tv("stageOn");
  await tv("intro", RADAR);
  await cue("close1", "line", "Turnout. The right message,<br>to the right people, at the right moment.");
  await sleep(left("close1", 0) + 300);
  await tv("morph", LOGO);
  await cue("close2", "tag");
  await sleep(left("close2", 0) + 2200);
} catch (e) {
  console.error("recording stopped early:", e.message.split("\n")[0]);
} finally {
  const endAt = now();
  await context.close();
  await browser.close();
  const webm = readdirSync(OUT).filter((f) => f.endsWith(".webm") && f !== "turnout-demo.webm").sort().pop();
  const target = join(OUT, "turnout-demo.webm");
  if (webm) { rmSync(target, { force: true }); renameSync(join(OUT, webm), target); console.log("recorded", target); }
  writeFileSync(join(OUT, "timeline.json"), JSON.stringify({ endAt, marks }, null, 2));
  console.log("end", endAt.toFixed(1) + "s, clock shifted by", shift.toFixed(1) + "s");
}
