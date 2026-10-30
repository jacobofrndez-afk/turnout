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
// Scattered over the whole frame, beyond the rings too; unnamed ones are small dots.
const BLIPS = JSON.parse(process.env.BLIPS ?? "null") ?? [
  { name: "Arena", sub: "20,000 seats · 2 blocks · out 10:45 pm", u: 16, v: -10, big: true },
  { u: -44, v: -20 }, { name: "Theatre", u: -15, v: -10 }, { u: 46, v: 2 },
  { name: "Stadium", u: -31, v: 6 }, { u: 20, v: -22 }, { name: "Jazz club", sub: "80 people · next door · out 11 pm", u: 9, v: 13, small: true },
  { u: -45, v: 14 }, { name: "Festival", u: 4, v: -20 }, { name: "Comedy club", sub: "200 seats · 5 min · out 10:30 pm", u: 28, v: 9, small: true },
  { u: -22, v: -22 }, { name: "Concert hall", u: -8, v: 18 }, { u: 44, v: -22 },
  { name: "Opera house", u: -36, v: -13 }, { u: -7, v: -4 }, { name: "Cinema", sub: "Late show · 300 seats · out 9:50 pm", u: -30, v: -17, small: true },
  { u: -28, v: 19 }, { name: "Club", u: 24, v: 17 }, { u: 11, v: 4 }, { u: 41, v: 19 },
  { u: 5, v: -7 }, { u: -10, v: 9 }, { u: 13, v: -15 }, { u: -3, v: -14 }, { u: 15, v: 5 }, { u: -17, v: -2 }, { u: 3, v: 8 }, { u: -12, v: 14 },
];
const STEPS = ["The crowd", "Who they are", "The offer", "Your words", "Channels & budget", "Approve", "Out the door"];
const LINES = JSON.parse(readFileSync(join(OUT, "voice/lines.json"), "utf8"));
const L = Object.fromEntries(LINES.map((l) => [l.id, l]));
// The narration clock: planned start of each line, seconds from the start of the recording. Lines spoken
// in one continuous clip share the clip's start and keep their measured offsets inside it.
const planned = {}; { let t = 0, gs = 0; for (const l of LINES) { if (l.first !== false) { t += l.gapBefore; gs = t; t += l.groupDuration ?? l.duration; } planned[l.id] = gs + (l.offset ?? 0); } }
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
    await p.waitForURL(/\/campaigns\/camp_/, { timeout: 90000 });
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
const rec0 = Date.now();   // the screencast starts with the page; the narration clock starts later, with the radar
await page.goto(`${BASE}/api/health`);
await page.setContent(SHELL, { waitUntil: "load" });
// Two app frames: `app` is on screen, `next` loads the following page behind it; swap() crossfades.
let app = page.frame({ name: "app" }), next = page.frame({ name: "app2" });
if (!app || !next) throw new Error("app frames missing");
let t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
const marks = [];
const CAPTIONS = process.env.CAPTIONS !== "0";   // subtitles on the product screens (CAPTIONS=0 to drop them)
const cuts = [];   // dead waits the mix removes (from, to in clock seconds)
let logoAt = 0;    // when the closing logo is complete (music swell)
const sfx = [];    // sonar pings and whooshes, synthesized by music.py at these clock times
const fx = (kind, delay = 0) => sfx.push({ at: now() + delay, kind });
let introAt = 0;
// The sweep turns counter-clockwise at 72 degrees a second from straight up; each time it crosses one of the
// main venues while the radar is on screen, a soft ping. Called when the radar leaves the screen.
function sweepPings(from = 0.9) {
  const until = now() - introAt - 0.25;
  for (const b of BLIPS) {
    if (!b.name || !(b.big || /Theatre|Stadium|Festival|Concert hall|Comedy club|Opera house/.test(b.name))) continue;
    const theta = (Math.atan2(b.v, b.u) * 180) / Math.PI;
    let tau = ((((-90 - theta) % 360) + 360) % 360) / 72;
    for (; tau < until; tau += 5) if (tau >= from) sfx.push({ at: introAt + tau, kind: b.big ? "ping" : "ping-sweep" });
  }
}
let capTimers = [];
// Subtitles: short cues timed on the words of the clip, scheduled from the clip's real start.
function captions(groupFirstId, startAt) {
  capTimers.forEach(clearTimeout); capTimers = [];
  const cues = L[groupFirstId].cues ?? [];
  for (const c of cues) {
    const ms = (startAt + c.start - now()) * 1000;
    capTimers.push(setTimeout(() => tv("cap", c.text).catch(() => {}), Math.max(0, ms)));
  }
  const endMs = (startAt + (L[groupFirstId].groupDuration ?? L[groupFirstId].duration) + 0.35 - now()) * 1000;
  capTimers.push(setTimeout(() => tv("cap", "").catch(() => {}), Math.max(0, endMs)));
}
const tv = (fn, ...args) => page.evaluate(({ fn, args }) => window.tv[fn](...args), { fn, args });

// Wait for the narration clock, mark the real start, then show the line where asked.
async function cue(id, where = "cap", html) {
  const target = start(id);
  const wait = target - now();
  if (wait > 0) await sleep(wait * 1000);
  const at = now();
  if (at - target > 0.05 && L[id].first !== false) shift += at - target;   // inside a clip the audio runs on; only a new clip can wait
  if (where === "cap" && CAPTIONS) { if (L[id].first !== false) { if (L[id].cues) captions(id, at); else await tv("cap", L[id].text); } }
  else if (where === "line") await tv("line", html ?? L[id].text);
  else if (where === "tag") await tv("tag", L[id].text);
  marks.push({ id, planned: planned[id], at });
}
// Time left until the line ends (never negative), to pace what happens while it plays.
const left = (id, minMs = 0) => Math.max(minMs, (start(id) + L[id].duration - now()) * 1000);

// Load a page into the hidden frame, wait for fonts and for React to be live (hydrated).
async function load(path) {
  await next.goto(BASE + path, { waitUntil: "load" });
  await next.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await next.evaluate(() => document.fonts.ready);
  await live(next, "main button, main textarea");
  await next.evaluate(() => scrollTo(0, 0));
  return next;
}
// Wait until React has attached its handlers to the matching elements (selective hydration can lag the header).
async function live(f, selector, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) {
    const ok = await f.evaluate((sel) => { const els = [...document.querySelectorAll(sel)]; return els.length > 0 && els.every((e) => Object.keys(e).some((k) => k.startsWith("__reactProps"))); }, selector).catch(() => false);
    if (ok) return true;
    await sleep(200);
  }
  console.error("not hydrated after", ms, "ms:", selector);
  return false;
}
// Crossfade from the page on screen to the one loaded behind it.
async function swap() { await tv("swap", next.name()); [app, next] = [next, app]; await sleep(900); }
async function scrollTo(y, ms = 1000, f = app) {
  await f.evaluate(([y, ms]) => new Promise((res) => {
    const s = scrollY, d = Math.max(0, y) - s, t0 = performance.now();
    if (!ms) { window.scrollTo(0, Math.max(0, y)); return res(); }
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const f = (now) => { const p = Math.min(1, (now - t0) / ms); window.scrollTo(0, s + d * ease(p)); p < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), [y, ms]);
}
// Document position inside the frame, unaffected by any transform of the view around it.
async function topOf(locator) { return locator.first().evaluate((el) => el.getBoundingClientRect().top + scrollY).catch(() => 0); }
async function bring(locator, offset = 120, ms = 800, f = app) { await scrollTo((await topOf(locator)) - offset, ms, f); await sleep(ms ? 150 : 50); }
async function moveTo(locator) {
  const b = await locator.first().boundingBox(); if (!b) return;
  const x = b.x + b.width / 2, y = b.y + Math.min(b.height / 2, 24);
  await tv("cursor", x, y);
  await page.mouse.move(x, y, { steps: 28 });
  await sleep(320);
}
async function click(locator) {
  await moveTo(locator);
  const b = await locator.first().boundingBox();
  if (b) console.log("click at", Math.round(b.x + b.width / 2), Math.round(b.y + Math.min(b.height / 2, 24)), "hits", await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); const st = document.getElementById("tv-stage"); return (e ? e.tagName + " " + (e.getAttribute("name") || e.id || e.className || "") : "nothing") + " · stage " + getComputedStyle(st).display + "/" + getComputedStyle(st).opacity + " · on=" + [...document.querySelectorAll("#tv-view iframe.on")].map((f) => f.name).join(","); }, [b.x + b.width / 2, b.y + Math.min(b.height / 2, 24)]), "frame", locator._frame?.name?.() ?? "?");
  await page.mouse.down(); await sleep(80); await page.mouse.up();
}
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
async function undrift() { await tv("undrift"); await sleep(120); }
const hookHtml = (t) => t.replace(/twenty[- ]thousand/i, '<b id="num">0</b>').replace(/ten forty[- ]five/i, "<b>10:45 pm</b>");

try {
  // Today loads in the dark, under the stage; the header lockup is cloned for the morph.
  await load(`/today?merchant=${HERO}`);
  [app, next] = [next, app];
  const lockup = app.locator(".turnout-wordmark svg.turnout-logo-wide").first();
  await tv("setLogo", await lockup.evaluate((e) => e.outerHTML));
  const lockupRect = await lockup.boundingBox();
  await tv("show", app.name());

  // The crowd, on the radar. The narration clock starts here.
  t0 = Date.now();
  await tv("intro", RADAR);
  introAt = now();
  fx("ping", 1.0);
  await cue("hook1", "line");
  await cue("hook2", "line", hookHtml(L.hook2.text));
  await sleep(300); await tv("count", HOOK_COUNT, 1000); fx("ping");
  await cue("small", "line", "Or <b>80</b> people out of a jazz club.");
  fx("ping-soft", 0.05); fx("ping-soft", 0.31); fx("ping-soft", 0.57);
  await tv("small");
  const ecc = (L.hook1.cues ?? []).find((c) => /every crowd counts/i.test(c.text));
  if (ecc) { const w = (start("hook1") + ecc.start - 0.15 - now()) * 1000; if (w > 0) await sleep(w); await tv("line", "<b>Every crowd counts.</b>"); }
  await cue("hook3", "line");
  await sleep(left("hook3", 0));

  // The radar becomes the logo, then the logo takes its place in the product.
  await cue("radar1", "none");
  sweepPings();
  fx("whoosh");
  await tv("morph", LOGO);
  await sleep(250);
  await cue("radar2", "cap");
  await tv("fly", lockupRect);
  await tv("journey", true);
  await tv("step", 0);

  // Tonight's crowd: the occasion, then who they are. The picture moves first, the voice follows.
  const occasion = app.locator(".agent-opportunity").first();
  const heading = app.locator(".agent-decision-heading").first();
  const evidence = app.locator(".agent-evidence").first();
  const cards = app.locator(".agent-offer-comparison").first();
  await bring(occasion, 150, 700);
  await spot(16, occasion);
  await drift(occasion, 5000, 1.03);
  await cue("today");
  await sleep(900);
  await undrift();
  await bring(heading, 140, 700);
  await tv("step", 1);
  await spot(16, heading, (await evidence.count()) ? evidence : cards);
  await sleep(left("today", 0) - 1100);
  // The offer.
  await tv("step", 2);
  await spot(14, cards);
  await drift(cards, 4500, 1.05);
  await cue("pick");
  const preCampaign = load(`/campaigns/${CAMPAIGN}?merchant=${HERO}`);   // behind the Today page
  await sleep(left("pick", 0) - 900);
  await undrift();
  await unspot();

  // Your words: the campaign page is already loaded behind; place it, then crossfade.
  await preCampaign;
  const editor = next.locator(".agent-board-editor").first();
  await editor.waitFor({ state: "visible", timeout: 15000 });
  await bring(editor, 150, 0, next);
  await swap();
  await tv("step", 3);
  await spot(16, editor);
  const chalk = (await editor.locator("textarea").count()) ? editor.locator("textarea").first() : app.locator("textarea").last();
  await live(app, "textarea");
  await cue("touch");
  await click(chalk);
  await chalk.fill("");
  await sleep(120);
  await chalk.pressSequentially(BOARD_TEXT, { delay: 30 });
  await tv("cursor", -200, -200);
  await sleep(left("touch", 0) - 1100);

  // Channels and budget: where this crowd really is, and a cap.
  const plan = app.locator(".agent-plan-summary").first();
  const reason = app.locator(".channel-choice-reason").first();
  const picks = app.locator(".agent-channel-picks").first();
  await bring(plan, 150, 700);
  await tv("step", 4);
  await spot(16, plan, (await reason.count()) ? reason : picks);
  await cue("channels");
  await sleep(left("channels", 0) - 1500);
  await unspot();

  // Approve: the review opens under the end of the sentence, "One tap." lands on the click.
  const review = app.getByRole("button", { name: /Review campaign/ });
  await bring(review, 520, 600);
  await live(app, "main button");
  await click(review);
  const approve = app.getByRole("button", { name: /Approve/ });
  await approve.waitFor({ state: "visible", timeout: 15000 });
  await sleep(150);
  await bring(approve, 520, 500);
  await tv("step", 5);
  await spot(12, approve);
  await moveTo(approve);
  await cue("approve");
  await page.mouse.down(); await sleep(80); await page.mouse.up();
  await sleep(250);
  await unspot();
  await tv("cursor", -200, -200);

  // Out the door: the receipt, then the board. A slow save is cut out of the film (see cuts).
  const receipt = app.locator(".agent-receipt-success").first();
  const waitFrom = now();
  const approved = await receipt.waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
  if (now() - waitFrom > 1.1) cuts.push({ from: waitFrom + 0.45, to: now() - 0.05 });
  if (!approved) console.error("approval did not show a receipt; continuing to the board");
  await tv("step", 6);
  const preBoard = load(`/campaigns/${CAMPAIGN}/board`);   // behind the receipt
  const rows = app.locator(".agent-receipt-row");
  const actions = app.locator(".agent-board-actions, .agent-ready-board a").first();
  if (approved) { await bring(receipt, 150, 700); await spot(16, receipt, (await rows.count()) ? rows.last() : (await actions.count()) ? actions : receipt); }
  await cue("receipt");
  await sleep(left("receipt", 0) - 900);
  await unspot();
  await preBoard;
  const board = next.locator(".campaign-board").first();
  await board.waitFor({ state: "visible", timeout: 15000 });
  await bring(board, 120, 0, next);
  await swap();
  await spot(18, board);
  await drift(board, 5000, 1.08);
  await cue("board");
  await sleep(left("board", 0) + 500);

  // The board collapses into one point, your place; a flash, and the radar ripples out of it.
  await tv("cap", "");
  const bb = await board.boundingBox();
  const collapsing = tv("collapse", bb.x + bb.width / 2, bb.y + bb.height / 2, RADAR.cx, RADAR.cy);
  fx("ping-deep", 1.15);
  await sleep(1350);
  await tv("intro", { ...RADAR, fast: true, ripple: true });
  introAt = now();
  fx("ping", 0.3);
  await collapsing;
  // The promise, one statement at a time over the radar; then the logo alone; then one signature.
  // The promise, three statements that light up on their words and stay on screen together.
  const STACK = ["Right <b>place</b>.", "Right <b>hour</b>.", "Right <b>people</b>."];
  await tv("dimRadar", 0.2);
  await tv("stack", STACK, 0);
  await cue("close1", "none");
  const c1 = start("close1");
  const cues1 = (L.close1.cues ?? []).map((c) => c.start);
  for (let i = 0; i < 3; i++) { const t = cues1[i] ?? i * 1.1; const w = c1 + t - 0.1 - now(); if (w > 0) await sleep(w * 1000); await tv("stack", STACK, i + 1); }
  await sleep(left("close1", 0) + 1100);
  await tv("stack", null);
  await sleep(350);
  sweepPings(1.4);
  fx("whoosh");
  const morphing = tv("morph", LOGO);   // the radar brightens back as it collapses into the mark
  await sleep(1900);                       // the word starts writing itself here
  await cue("close2", "none");             // "Turnout." over the writing, the promise on the signature
  await morphing;
  logoAt = now();                          // the music swells to this moment
  fx("ping-long", 0.2); fx("ping-long", 0.9); fx("ping-final", 1.8);   // the sonar rings out into the end
  await tv("tag", "Turn the crowd <b>outside</b> into customers <b>inside</b>.");
  await tv("finale");
  await sleep(left("close2", 0) + 4300);   // the film ends on this image, the music gone quiet before the cut
} catch (e) {
  console.error("recording stopped early:", e.message.split("\n")[0]);
} finally {
  const endAt = now();
  await context.close();
  await browser.close();
  const webm = readdirSync(OUT).filter((f) => f.endsWith(".webm") && f !== "turnout-demo.webm").sort().pop();
  const target = join(OUT, "turnout-demo.webm");
  if (webm) { rmSync(target, { force: true }); renameSync(join(OUT, webm), target); console.log("recorded", target); }
  const lead = (t0 - rec0) / 1000;   // seconds of recording before the narration clock started
  writeFileSync(join(OUT, "timeline.json"), JSON.stringify({ endAt, lead, marks, cuts, logoAt, sfx }, null, 2));
  if (cuts.length) console.log("cuts", cuts.map((c) => (c.to - c.from).toFixed(1) + "s").join(", "));
  console.log("end", endAt.toFixed(1) + "s, clock shifted by", shift.toFixed(1) + "s");
}
