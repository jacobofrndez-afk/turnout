// Records the Turnout demo as one night, driven by the narration's clock: each spoken line has a
// planned start (out/voice/lines.json: pauses and durations); the script waits for that moment,
// shows the caption, marks the real time, and performs the shot while the line plays. mix.mjs then
// lays the voice on the video. Usage: BASE_URL=https://turnout.example CAMPAIGN_ID=camp_xxx node record.mjs
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, "..");
const OUT = join(here, "out");
mkdirSync(OUT, { recursive: true });

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3103").replace(/\/$/, "");
let CAMPAIGN = process.env.CAMPAIGN_ID;
const HERO = process.env.HERO ?? "m_penn_pour";
const OTHER = process.env.OTHER ?? "m_quai_bercy";
const BOARD_TEXT = process.env.BOARD_TEXT ?? "Before Harry? Two cocktails, one price.";
const HOOK_COUNT = Number(process.env.HOOK_COUNT ?? 20000);
const BLIPS = JSON.parse(process.env.BLIPS ?? "null") ?? [
  { name: "Arena", sub: "20,000 seats · 2 blocks", x: 250, y: -160, big: true },
  { name: "Theatre", x: -260, y: -210 },
  { name: "Stadium", x: -340, y: 70 },
  { name: "Jazz club", x: 300, y: 190 },
  { name: "Concert hall", x: -110, y: 300 },
  { name: "Festival", x: 120, y: -330 },
];
const LINES = JSON.parse(readFileSync(join(OUT, "voice/lines.json"), "utf8"));
const L = Object.fromEntries(LINES.map((l) => [l.id, l]));
// The narration clock: planned start of each line, seconds from the start of the recording.
const planned = {}; { let t = 0; for (const l of LINES) { t += l.gapBefore; planned[l.id] = t; t += l.duration; } }
const ends = Object.fromEntries(LINES.map((l) => [l.id, planned[l.id] + l.duration]));
const LOCKUP = readFileSync(join(ROOT, "public/brand/lockup-reverse.svg"), "utf8");

const VW = 1920, VH = 1080, ZOOM = 1.25;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FONT = `"Helvetica Neue", Helvetica, Arial, sans-serif`;
const DARK = "#18101c";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: [`--window-size=${VW},${VH}`] });
{
  const warm = await browser.newContext({ viewport: { width: VW, height: VH } });
  const p = await warm.newPage();
  for (const u of [`/calendar?merchant=${HERO}`, `/today?merchant=${HERO}`, `/today?merchant=${OTHER}`]) await p.goto(BASE + u, { waitUntil: "networkidle" }).catch(() => {});
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
await context.addInitScript((dark) => {
  const paint = () => { const h = document.documentElement; if (h.style.background !== dark) h.style.background = dark; };
  paint();
  new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["style", "class"] });
  const dim = () => { if (document.body) { document.body.style.opacity = "0"; document.body.style.transition = "opacity .5s ease"; return true; } return false; };
  if (!dim()) new MutationObserver((_, o) => { if (dim()) o.disconnect(); }).observe(document.documentElement, { childList: true });
}, DARK);
const page = await context.newPage();
const t0 = Date.now();
const now = () => (Date.now() - t0) / 1000;
const marks = [];

async function overlays() {
  await page.evaluate((font) => {
    if (document.getElementById("tv-cap")) return;
    const style = document.createElement("style");
    style.textContent = `
      #tv-spot{position:fixed;left:0;top:0;width:0;height:0;border-radius:20px;box-shadow:0 0 0 9999px rgba(18,10,22,.5);opacity:0;transition:all .9s cubic-bezier(.4,0,.2,1);z-index:2147483640;pointer-events:none}
      #tv-cap{position:fixed;left:50%;bottom:44px;transform:translate(-50%,12px);max-width:1320px;padding:18px 34px;border-radius:18px;
        background:rgba(24,16,28,.86);backdrop-filter:blur(14px);color:#f6f1f8;font:500 33px/1.32 ${font};letter-spacing:.005em;
        opacity:0;transition:opacity .45s ease,transform .45s ease;z-index:2147483646;pointer-events:none;text-align:center;box-shadow:0 14px 48px rgba(0,0,0,.28)}
      #tv-cap.on{opacity:1;transform:translate(-50%,0)}
      #tv-tag{position:fixed;left:50%;bottom:166px;transform:translateX(-50%);padding:9px 16px;border-radius:999px;background:rgba(24,16,28,.86);backdrop-filter:blur(14px);color:#E6A4C2;font:600 21px/1 ${font};letter-spacing:.16em;text-transform:uppercase;opacity:0;transition:opacity .5s ease;z-index:2147483646;pointer-events:none}
      #tv-cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483645;pointer-events:none;transform:translate(-9999px,-9999px);filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}
      html{scrollbar-width:none} ::-webkit-scrollbar{display:none}`;
    document.head.appendChild(style);
    const spot = document.createElement("div"); spot.id = "tv-spot";
    const cap = document.createElement("div"); cap.id = "tv-cap";
    const tag = document.createElement("div"); tag.id = "tv-tag";
    const cur = document.createElement("div"); cur.id = "tv-cur";
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 9-7 1.5L17 21l-3 1-4-8.5L4 18z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.append(spot, cap, tag, cur);
    document.addEventListener("mousemove", (e) => { cur.style.transform = `translate(${e.clientX - 2}px,${e.clientY - 2}px)`; }, true);
  }, FONT);
}
async function reveal() {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((z) => { document.body.style.zoom = String(z); }, ZOOM);
  await overlays();
  await page.evaluate(() => { document.body.style.opacity = "1"; });
  await sleep(400);
}
async function hide() { await page.evaluate(() => { document.body.style.opacity = "0"; }); await sleep(450); }
async function cap(text) { await page.evaluate((t) => { const c = document.getElementById("tv-cap"); if (!c) return; if (t) { c.textContent = t; c.classList.add("on"); } else c.classList.remove("on"); }, text); }
async function tag(text) { await page.evaluate((t) => { const e = document.getElementById("tv-tag"); if (!e) return; e.textContent = t; e.style.opacity = t ? "1" : "0"; }, text); }
// Wait for the narration clock, then show the line and record when it really started.
async function cue(id) {
  const wait = planned[id] - now();
  if (wait > 0) await sleep(wait * 1000);
  await cap(L[id].text);
  marks.push({ id, planned: planned[id], at: now() });
}
// Time left until the line ends (never negative), to pace what happens while it plays.
const left = (id, minMs = 0) => Math.max(minMs, (ends[id] - now()) * 1000);
async function go(path) {
  await hide();
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {});
  await page.evaluate(() => scrollTo(0, 0));
  await reveal();
}
async function scrollTo(y, ms = 1100) {
  await page.evaluate(([y, ms]) => new Promise((res) => {
    const s = scrollY, d = Math.max(0, y) - s, t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const f = (now) => { const p = Math.min(1, (now - t0) / ms); window.scrollTo(0, s + d * ease(p)); p < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), [y, ms]);
}
async function topOf(locator) { const b = await locator.first().boundingBox(); const sy = await page.evaluate(() => scrollY); return b ? b.y + sy : 0; }
async function bring(locator, offset = 120, ms = 1100) { await scrollTo((await topOf(locator)) - offset, ms); await sleep(150); }
async function moveTo(locator) { const b = await locator.first().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 24), { steps: 30 }); await sleep(260); }
async function click(locator) { await moveTo(locator); await page.mouse.down(); await sleep(80); await page.mouse.up(); }
async function spot(a, b = a, pad = 18) {
  const ra = await a.first().boundingBox(), rb = await b.first().boundingBox();
  if (!ra || !rb) return;
  const x = Math.min(ra.x, rb.x) - pad, y = Math.min(ra.y, rb.y) - pad;
  const w = Math.max(ra.x + ra.width, rb.x + rb.width) - x + pad, h = Math.max(ra.y + ra.height, rb.y + rb.height) - y + pad;
  await page.evaluate(([x, y, w, h]) => { const s = document.getElementById("tv-spot"); s.style.left = x + "px"; s.style.top = y + "px"; s.style.width = w + "px"; s.style.height = h + "px"; s.style.opacity = "1"; }, [x, y, w, h]);
}
async function unspot() { await page.evaluate(() => { const s = document.getElementById("tv-spot"); if (s) s.style.opacity = "0"; }); }
async function drift(locator, ms = 8000, scale = 1.04) {
  const b = await locator.first().boundingBox(); if (!b) return;
  await page.evaluate(([x, y, ms, z, sc]) => { const m = document.querySelector("main"); if (!m) return; const r = m.getBoundingClientRect();
    m.style.transformOrigin = `${(x - r.left) / z}px ${(y - r.top) / z}px`; m.style.transition = `transform ${ms}ms cubic-bezier(.3,0,.7,1)`; m.style.transform = `scale(${sc})`; }, [b.x + b.width / 2, b.y + b.height / 2, ms, ZOOM, scale]);
}
async function undrift() { await page.evaluate(() => { const m = document.querySelector("main"); if (m) { m.style.transition = "transform 1100ms cubic-bezier(.4,0,.2,1)"; m.style.transform = "scale(1)"; } }); }

async function radar({ logoCenter = false } = {}) {
  await hide();
  const blips = BLIPS.map((b, i) => `<g class="blip" style="--d:${1.0 + i * 0.4}s" transform="translate(${960 + b.x} ${600 + b.y})">
      <circle r="${b.big ? 11 : 7}" fill="#E6A4C2"/><circle class="pulse" r="${b.big ? 11 : 7}" fill="none" stroke="#E6A4C2" stroke-width="2"/>
      <text x="${b.x < 0 ? -18 : 18}" y="${b.big ? -6 : 8}" text-anchor="${b.x < 0 ? "end" : "start"}" fill="#F6F1F8" font-size="${b.big ? 30 : 24}" font-weight="${b.big ? 600 : 500}">${b.name}</text>
      ${b.sub ? `<text x="${b.x < 0 ? -18 : 18}" y="26" text-anchor="${b.x < 0 ? "end" : "start"}" fill="#C4AECA" font-size="22">${b.sub}</text>` : ""}</g>`).join("");
  await page.setContent(`<!doctype html><html style="background:${DARK}"><head><style>
    body{margin:0;background:${DARK};color:#F6F1F8;font-family:${FONT};opacity:0;transition:opacity .5s ease;width:1920px;height:1080px;overflow:hidden;position:relative}
    #logo{position:absolute;left:50%;top:${logoCenter ? 300 : 54}px;transform:translateX(-50%);width:${logoCenter ? 600 : 380}px;opacity:0;animation:in .9s ease .2s forwards}
    #logo svg{width:100%;height:auto;display:block}
    svg.radar{position:absolute;left:0;top:0}
    .ring{fill:none;stroke:#C4AECA;stroke-opacity:.22;stroke-width:1.5;stroke-dasharray:4000;stroke-dashoffset:4000;animation:draw 1.6s ease .3s forwards}
    .axis{stroke:#C4AECA;stroke-opacity:.1;stroke-width:1}
    .sweep{transform-origin:960px 600px;opacity:0;animation:spin 4.5s linear infinite, in .8s ease .9s forwards}
    .blip{opacity:0;animation:in .6s ease var(--d) forwards}
    .pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-out var(--d) infinite}
    .bar{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-out .6s infinite}
    #line{position:absolute;left:50%;bottom:${logoCenter ? 250 : 92}px;transform:translate(-50%,10px);width:1500px;text-align:center;font-size:${logoCenter ? 66 : 58}px;font-weight:600;line-height:1.15;opacity:0;transition:opacity .5s ease,transform .5s ease}
    #line.on{opacity:1;transform:translate(-50%,0)}
    #line b,#line span{color:#E6A4C2;font-weight:700}
    @keyframes in{to{opacity:1}} @keyframes draw{to{stroke-dashoffset:0}} @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes pulse{0%{transform:scale(1);opacity:.9}100%{transform:scale(3.2);opacity:0}}
  </style></head><body>
    <div id="logo">${LOCKUP}</div>
    <svg class="radar" width="1920" height="1080" viewBox="0 0 1920 1080">
      <defs><linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E6A4C2" stop-opacity=".35"/><stop offset="1" stop-color="#E6A4C2" stop-opacity="0"/></linearGradient></defs>
      <line class="axis" x1="520" y1="600" x2="1400" y2="600"/><line class="axis" x1="960" y1="160" x2="960" y2="1040"/>
      ${[110, 220, 330, 440].map((r) => `<circle class="ring" cx="960" cy="600" r="${r}"/>`).join("")}
      <path class="sweep" d="M960 600 L960 160 A440 440 0 0 1 1341 380 Z" fill="url(#sw)"/>
      ${logoCenter ? "" : blips}
      <g transform="translate(960 600)"><circle r="9" fill="#F6F1F8"/><circle class="bar" r="9" fill="none" stroke="#F6F1F8" stroke-width="2"/>
        <text y="42" text-anchor="middle" fill="#C4AECA" font-size="22" letter-spacing=".12em">YOUR BAR</text></g>
    </svg>
    <div id="line"></div>
    <script>
      window.line = (html) => { const l = document.getElementById("line"); l.classList.remove("on"); setTimeout(() => { l.innerHTML = html; l.classList.add("on"); }, 260); };
      window.count = (to, ms) => { const n = document.getElementById("num"); if (!n) return; const t0 = performance.now();
        const f = (now) => { const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3); n.textContent = Math.round(to * e).toLocaleString("en-US"); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
    </script></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.body.style.opacity = "1"; });
}
async function radarCue(id, html, count) {
  const wait = planned[id] - now();
  if (wait > 0) await sleep(wait * 1000);
  await page.evaluate((h) => window.line(h), html);
  if (count) { await sleep(300); await page.evaluate((c) => window.count(c, 1200), count); }
  marks.push({ id, planned: planned[id], at: now() });
}

try {
  // The crowd, on the radar.
  await radar();
  await radarCue("hook1", L.hook1.text);
  await radarCue("hook2", L.hook2.text.replace(/twenty thousand/i, '<span id="num">0</span>'), HOOK_COUNT);
  await radarCue("hook3", L.hook3.text);
  await sleep(left("hook3", 0));

  // The radar in the product: the week around the place.
  await go(`/calendar?merchant=${HERO}`);
  await tag("1 · The radar");
  await cue("radar1");
  const events = page.getByRole("button", { name: "Events", exact: true });
  await sleep(700);
  if (await events.count()) { await bring(events, 260, 900); await click(events); }
  await cue("radar2");
  await scrollTo((await page.evaluate(() => scrollY)) + 640, left("radar2", 2600));
  await cap("");

  // Tonight's moment.
  await go(`/today?merchant=${HERO}`);
  await tag("2 · Tonight's moment");
  const occasionA = page.locator("text=A VERIFIED OCCASION NEARBY");
  const occasionB = page.locator("text=/Checked \\d/");
  await bring(occasionA, 170, 900);
  await spot(occasionA, occasionB);
  await drift(occasionA, 7000);
  await cue("today");
  await sleep(left("today", 0) - 900);

  // The crowd profile and the pick.
  await undrift();
  const sigCard = page.locator("text=YOUR SIGNATURE").locator("xpath=..");
  const recCard = page.locator("text=RECOMMENDED FOR THIS OCCASION").locator("xpath=..");
  const evidence = page.locator("text=See Qloo evidence");
  await bring(sigCard, 230, 1100);
  await tag("3 · The crowd profile");
  await spot(sigCard, evidence);
  await cue("profile");
  await sleep(left("profile", 0) - 700);
  await tag("4 · The pick");
  await spot(sigCard, recCard);
  await drift(recCard, 7000);
  await cue("pick");
  await sleep(left("pick", 0) - 600);
  await unspot();
  await cap("");
  await undrift();

  // Your touch.
  await go(`/campaigns/${CAMPAIGN}?merchant=${HERO}`);
  await tag("5 · Your touch");
  const taIndex = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const inv = norm(document.querySelector(".board-invitation")?.textContent);
    const tas = [...document.querySelectorAll("textarea")];
    const i = tas.findIndex((t) => inv && norm(t.value) === inv);
    return i >= 0 ? i : tas.length - 1;
  });
  const chalk = page.locator("textarea").nth(Math.max(0, taIndex));
  const board = page.locator("article.campaign-board");
  await bring(chalk, 260, 900);
  await spot(chalk, board);
  await cue("touch");
  await sleep(900);
  await click(chalk);
  await chalk.fill("");
  await sleep(200);
  await chalk.pressSequentially(BOARD_TEXT, { delay: 42 });
  await sleep(left("touch", 500));
  await unspot();

  // Approve.
  const review = page.getByRole("button", { name: /Review campaign/ });
  await bring(review, 480, 900);
  await cue("approve");
  await click(review);
  const approve = page.getByRole("button", { name: /Approve/ });
  await approve.waitFor({ state: "visible", timeout: 15000 });
  await sleep(300);
  await bring(approve, 480, 700);
  await spot(approve, approve, 14);
  await sleep(350);
  await click(approve);
  await page.waitForLoadState("networkidle");
  await sleep(500);
  await overlays();
  await unspot();

  // The receipt.
  await tag("6 · Out the door");
  const receipt = page.locator("text=Materials ready").first();
  const approved = await receipt.waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
  if (!approved) console.error("approval did not show a receipt; continuing to the board");
  const open = page.locator('a[href$="/board"]').first();
  if (approved) { await bring(receipt, 200, 900); await spot(receipt, (await open.count()) ? open : receipt); }
  await cue("receipt");
  await sleep(left("receipt", 0) - 1200);
  await unspot();
  await cap("");
  if (await open.count()) { await bring(open, 380, 700); await click(open); await page.waitForLoadState("load"); await page.waitForLoadState("networkidle", { timeout: 3000 }).catch(() => {}); await sleep(150); await reveal(); }
  else await go(`/campaigns/${CAMPAIGN}/board`);

  // The board, then full screen.
  await tag("6 · Out the door");
  await cue("board");
  await sleep(1400);
  try { await click(page.getByRole("button", { name: /Show on a screen/ })); } catch {}
  await sleep(left("board", 1800));
  await cap("");

  // Any street.
  await go(`/today?merchant=${OTHER}`);
  await tag("Any street");
  const sig2 = page.locator("text=YOUR SIGNATURE").locator("xpath=..");
  const rec2 = page.locator("text=RECOMMENDED FOR THIS OCCASION").locator("xpath=..");
  await bring(sig2, 230, 1000);
  await spot(sig2, rec2);
  await cue("other");
  await sleep(left("other", 0) - 500);
  await unspot();
  await cap("");

  // The promise, on the radar with the logo.
  await radar({ logoCenter: true });
  await radarCue("close1", "Turnout. The right message,<br>to the right people,<br>at the right moment.");
  await radarCue("close2", `<span style="font-size:46px;font-weight:500;color:#C4AECA">Your marketing agent. Your call.</span>`);
  await sleep(left("close2", 0) + 1800);
  await hide();
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
  const late = marks.filter((m) => m.at - m.planned > 0.4).map((m) => `${m.id} +${(m.at - m.planned).toFixed(1)}s`);
  console.log("end", endAt.toFixed(1) + "s", late.length ? "late: " + late.join(", ") : "on the narration clock");
}
