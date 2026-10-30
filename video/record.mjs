// Records the Turnout demo as a story: the crowd on a radar, the week around the place, the pick,
// the owner's words, the approval, the receipt, the board. Captions are the voice-over lines
// (out/voice/lines.json from voice.mjs); each shot holds at least as long as its line, and the
// moments are written to out/timeline.json so mix.mjs can lay the voice over the video.
// Usage: BASE_URL=https://turnout.example CAMPAIGN_ID=camp_xxx node record.mjs
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
const HOOK1_SCREEN = process.env.HOOK1_SCREEN ?? `Tonight, <span id="num">0</span> people walk out of Madison Square Garden.`;
const BLIPS = JSON.parse(process.env.BLIPS ?? "null") ?? [
  { name: "Madison Square Garden", sub: "20,000 seats · 2 blocks", x: 250, y: -160, big: true },
  { name: "Nederlander Theatre", x: -260, y: -210 },
  { name: "New Amsterdam Theatre", x: -340, y: 70 },
  { name: "Birdland Jazz Club", x: 300, y: 190 },
  { name: "St. Luke's Theatre", x: -110, y: 300 },
  { name: "Jacobs Theatre", x: 120, y: -330 },
];
const LINES = JSON.parse(readFileSync(join(OUT, "voice/lines.json"), "utf8"));
const L = Object.fromEntries(LINES.map((l) => [l.id, l]));
const dur = (id) => Math.round((L[id]?.duration ?? 0) * 1000);
const LOCKUP = readFileSync(join(ROOT, "public/brand/lockup-reverse.svg"), "utf8");

const VW = 1920, VH = 1080, ZOOM = 1.25;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FONT = `"Helvetica Neue", Helvetica, Arial, sans-serif`;
const DARK = "#18101c";

const browser = await chromium.launch({ channel: "chrome", headless: true, args: [`--window-size=${VW},${VH}`] });
{
  const warm = await browser.newContext({ viewport: { width: VW, height: VH } });
  const p = await warm.newPage();
  const urls = [`/calendar?merchant=${HERO}`, `/today?merchant=${HERO}`, `/today?merchant=${OTHER}`];
  if (CAMPAIGN) urls.push(`/campaigns/${CAMPAIGN}?merchant=${HERO}`, `/campaigns/${CAMPAIGN}/board`);
  for (const u of urls) await p.goto(BASE + u, { waitUntil: "networkidle" }).catch(() => {});
  await warm.close();
}
const context = await browser.newContext({
  viewport: { width: VW, height: VH }, deviceScaleFactor: 1, colorScheme: "light", locale: "en-US",
  timezoneId: "America/New_York", recordVideo: { dir: OUT, size: { width: VW, height: VH } },
});
await context.addInitScript((dark) => {
  document.documentElement.style.background = dark;
  const dim = () => { if (document.body) { document.body.style.opacity = "0"; document.body.style.transition = "opacity .55s ease"; return true; } return false; };
  if (!dim()) new MutationObserver((_, o) => { if (dim()) o.disconnect(); }).observe(document.documentElement, { childList: true });
}, DARK);
const page = await context.newPage();
const t0 = Date.now();
const marks = [];
const mark = (id) => marks.push({ id, at: (Date.now() - t0) / 1000 });

async function overlays() {
  await page.evaluate((font) => {
    if (document.getElementById("tv-cap")) return;
    const style = document.createElement("style");
    style.textContent = `
      #tv-spot{position:fixed;left:0;top:0;width:0;height:0;border-radius:18px;box-shadow:0 0 0 9999px rgba(18,10,22,.52);opacity:0;transition:all .7s ease;z-index:2147483640;pointer-events:none}
      #tv-cap{position:fixed;left:50%;bottom:40px;transform:translateX(-50%);max-width:1300px;padding:16px 30px;border-radius:16px;
        background:rgba(24,16,28,.92);color:#f6f1f8;font:500 32px/1.3 ${font};letter-spacing:.01em;
        opacity:0;transition:opacity .35s ease;z-index:2147483646;pointer-events:none;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.3)}
      #tv-cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483645;pointer-events:none;transform:translate(-9999px,-9999px);filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}
      html{scrollbar-width:none} ::-webkit-scrollbar{display:none}`;
    document.head.appendChild(style);
    const spot = document.createElement("div"); spot.id = "tv-spot";
    const cap = document.createElement("div"); cap.id = "tv-cap";
    const cur = document.createElement("div"); cur.id = "tv-cur";
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 9-7 1.5L17 21l-3 1-4-8.5L4 18z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.append(spot, cap, cur);
    document.addEventListener("mousemove", (e) => { cur.style.transform = `translate(${e.clientX - 2}px,${e.clientY - 2}px)`; }, true);
  }, FONT);
}
async function reveal() {
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate((z) => { document.body.style.zoom = String(z); }, ZOOM);
  await overlays();
  await page.evaluate(() => { document.body.style.opacity = "1"; });
  await sleep(600);
}
async function hide() { await page.evaluate(() => { document.body.style.opacity = "0"; }); await sleep(600); }
async function cap(text) { await page.evaluate((t) => { const c = document.getElementById("tv-cap"); if (!c) return; c.textContent = t; c.style.opacity = t ? "1" : "0"; }, text); }
async function say(id, minMs = 0) { await cap(L[id].text); mark(id); await sleep(Math.max(minMs, dur(id) + 600)); }
async function go(path) {
  await hide();
  await page.goto(BASE + path, { waitUntil: "load" });
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.evaluate(() => scrollTo(0, 0));
  await reveal();
}
async function scrollTo(y, ms = 1000) {
  await page.evaluate(([y, ms]) => new Promise((res) => {
    const s = scrollY, d = Math.max(0, y) - s, t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    const f = (now) => { const p = Math.min(1, (now - t0) / ms); window.scrollTo(0, s + d * ease(p)); p < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), [y, ms]);
}
async function topOf(locator) { const b = await locator.first().boundingBox(); const sy = await page.evaluate(() => scrollY); return b ? b.y + sy : 0; }
async function bring(locator, offset = 120, ms = 1000) { await scrollTo((await topOf(locator)) - offset, ms); await sleep(250); }
async function moveTo(locator) { const b = await locator.first().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 24), { steps: 28 }); await sleep(350); }
async function click(locator) { await moveTo(locator); await page.mouse.down(); await sleep(90); await page.mouse.up(); }
// Spotlight: dims everything but the box spanning locator a (top-left) to locator b (bottom-right).
async function spot(a, b = a, pad = 18) {
  const ra = await a.first().boundingBox(), rb = await b.first().boundingBox();
  if (!ra || !rb) return;
  const x = Math.min(ra.x, rb.x) - pad, y = Math.min(ra.y, rb.y) - pad;
  const w = Math.max(ra.x + ra.width, rb.x + rb.width) - x + pad, h = Math.max(ra.y + ra.height, rb.y + rb.height) - y + pad;
  await page.evaluate(([x, y, w, h]) => { const s = document.getElementById("tv-spot"); s.style.left = x + "px"; s.style.top = y + "px"; s.style.width = w + "px"; s.style.height = h + "px"; s.style.opacity = "1"; }, [x, y, w, h]);
}
async function unspot() { await page.evaluate(() => { const s = document.getElementById("tv-spot"); if (s) s.style.opacity = "0"; }); }
// A slow push-in on the main content towards a point, reset by the next scroll.
async function drift(locator, ms = 8000) {
  const b = await locator.first().boundingBox(); if (!b) return;
  await page.evaluate(([x, y, ms, z]) => { const m = document.querySelector("main"); if (!m) return; const r = m.getBoundingClientRect();
    m.style.transformOrigin = `${(x - r.left) / z}px ${(y - r.top) / z}px`; m.style.transition = `transform ${ms}ms linear`; m.style.transform = "scale(1.045)"; }, [b.x + b.width / 2, b.y + b.height / 2, ms, ZOOM]);
}
async function undrift() { await page.evaluate(() => { const m = document.querySelector("main"); if (m) { m.style.transition = "transform 900ms ease"; m.style.transform = "scale(1)"; } }); }

// The radar page: the brand lockup, rings, a sweep, the venues around the bar, a line of text.
async function radar({ logoCenter = false } = {}) {
  await hide();
  const blips = BLIPS.map((b, i) => `<g class="blip" style="--d:${1.1 + i * 0.45}s" transform="translate(${960 + b.x} ${600 + b.y})">
      <circle r="${b.big ? 11 : 7}" fill="#E6A4C2"/><circle class="pulse" r="${b.big ? 11 : 7}" fill="none" stroke="#E6A4C2" stroke-width="2"/>
      <text x="${b.x < 0 ? -18 : 18}" y="${b.big ? -6 : 8}" text-anchor="${b.x < 0 ? "end" : "start"}" fill="#F6F1F8" font-size="${b.big ? 30 : 24}" font-weight="${b.big ? 600 : 500}">${b.name}</text>
      ${b.sub ? `<text x="${b.x < 0 ? -18 : 18}" y="26" text-anchor="${b.x < 0 ? "end" : "start"}" fill="#C4AECA" font-size="22">${b.sub}</text>` : ""}</g>`).join("");
  await page.setContent(`<!doctype html><html style="background:${DARK}"><head><style>
    body{margin:0;background:${DARK};color:#F6F1F8;font-family:${FONT};opacity:0;transition:opacity .55s ease;width:1920px;height:1080px;overflow:hidden;position:relative}
    #logo{position:absolute;left:50%;top:${logoCenter ? 300 : 54}px;transform:translateX(-50%);width:${logoCenter ? 600 : 380}px;opacity:0;animation:in .9s ease .2s forwards}
    #logo svg{width:100%;height:auto;display:block}
    svg.radar{position:absolute;left:0;top:0}
    .ring{fill:none;stroke:#C4AECA;stroke-opacity:.22;stroke-width:1.5;stroke-dasharray:4000;stroke-dashoffset:4000;animation:draw 1.6s ease .3s forwards}
    .axis{stroke:#C4AECA;stroke-opacity:.1;stroke-width:1}
    .sweep{transform-origin:960px 600px;animation:spin 4.5s linear infinite;opacity:0;animation:spin 4.5s linear infinite, in .8s ease .9s forwards}
    .blip{opacity:0;animation:in .6s ease var(--d) forwards}
    .pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-out var(--d) infinite}
    .bar{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-out .6s infinite}
    #line{position:absolute;left:50%;bottom:${logoCenter ? 250 : 92}px;transform:translateX(-50%);width:1500px;text-align:center;font-size:${logoCenter ? 68 : 58}px;font-weight:600;line-height:1.15;opacity:0;transition:opacity .45s ease}
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
      window.line = (html) => { const l = document.getElementById("line"); l.style.opacity = "0"; setTimeout(() => { l.innerHTML = html; l.style.opacity = "1"; }, 200); };
      window.count = (to, ms) => { const n = document.getElementById("num"); if (!n) return; const t0 = performance.now();
        const f = (now) => { const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3); n.textContent = Math.round(to * e).toLocaleString("en-US"); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); };
    </script></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.body.style.opacity = "1"; });
}
async function radarLine(id, html, minMs = 0, count) {
  await page.evaluate((h) => window.line(h), html);
  if (count) { await sleep(260); await page.evaluate((c) => window.count(c, 1300), count); }
  mark(id);
  await sleep(Math.max(minMs, dur(id) + 700));
}

try {
  // 1. The crowd, on the radar.
  await radar();
  await sleep(2600);
  await radarLine("hook1", HOOK1_SCREEN, 4200, HOOK_COUNT);
  await radarLine("hook2", L.hook2.text, 2600);

  // 2. The week around the place.
  await go(`/calendar?merchant=${HERO}`);
  await say("radar1", 3400);
  const events = page.getByRole("button", { name: "Events", exact: true });
  if (await events.count()) { await bring(events, 260, 800); await click(events); await sleep(800); }
  await cap(L.radar2.text); mark("radar2");
  await scrollTo((await page.evaluate(() => scrollY)) + 760, Math.max(4500, dur("radar2") + 400));
  await sleep(400);
  await cap("");

  // 3. Today: the occasion.
  await go(`/today?merchant=${HERO}`);
  const occasionA = page.locator("text=A VERIFIED OCCASION NEARBY");
  const occasionB = page.locator("text=/Checked \\d/");
  await bring(occasionA, 170, 900);
  await spot(occasionA, occasionB);
  await drift(occasionA, 9000);
  await say("today", 6500);

  // 4. The decision.
  await undrift();
  const sigCard = page.locator("text=YOUR SIGNATURE").locator("xpath=..");
  const recCard = page.locator("text=RECOMMENDED FOR THIS OCCASION").locator("xpath=..");
  await bring(sigCard, 230, 1000);
  await spot(sigCard, recCard);
  await say("qloo", 4800);
  const why = page.locator("text=Why this works here");
  const evidence = page.locator("text=See Qloo evidence");
  await spot(sigCard, evidence);
  await drift(recCard, 8000);
  await say("pick", 6000);
  await unspot();
  await cap("");
  await undrift();

  // A draft to edit: the given one, or a fresh copy made from Today.
  if (!CAMPAIGN) {
    const own = page.getByRole("button", { name: /Make your own version/ });
    if (await own.count()) { await bring(own, 380); await click(own); await page.waitForURL(/\/campaigns\/camp_/, { timeout: 30000 }); }
    else { const link = page.locator('a[href*="/campaigns/camp_"]').first(); await bring(link, 380); await click(link); await page.waitForURL(/\/campaigns\/camp_/, { timeout: 30000 }); }
    CAMPAIGN = new URL(page.url()).pathname.split("/")[2];
    console.log("draft", CAMPAIGN);
  }

  // 5. Your touch.
  await go(`/campaigns/${CAMPAIGN}?merchant=${HERO}`);
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
  await cap(L.touch.text); mark("touch");
  await sleep(1400);
  await click(chalk);
  await chalk.fill("");
  await sleep(250);
  await chalk.pressSequentially(BOARD_TEXT, { delay: 55 });
  await sleep(Math.max(1800, dur("touch") - 1400 - BOARD_TEXT.length * 55));
  await unspot();

  // 6. Approve.
  const review = page.getByRole("button", { name: /Review campaign/ });
  await bring(review, 480, 900);
  await cap(L.approve.text); mark("approve");
  await sleep(700);
  await click(review);
  const approve = page.getByRole("button", { name: /Approve/ });
  await approve.waitFor({ state: "visible", timeout: 15000 });
  await sleep(900);
  await bring(approve, 480, 800);
  await spot(approve, approve, 14);
  await sleep(900);
  await click(approve);
  await page.waitForLoadState("networkidle");
  await sleep(1000);
  await overlays();
  await unspot();

  // 7. The receipt.
  const receipt = page.locator("text=Materials ready").first();
  const approved = await receipt.waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
  if (!approved) console.error("approval did not show a receipt; continuing to the board");
  const open = page.locator('a[href$="/board"]').first();
  if (approved) { await bring(receipt, 200, 900); await spot(receipt, (await open.count()) ? open : receipt); }
  await say("receipt", 6200);
  await unspot();
  await cap("");
  if (await open.count()) { await bring(open, 380, 800); await sleep(400); await click(open); await page.waitForLoadState("load"); await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {}); await sleep(300); await reveal(); }
  else await go(`/campaigns/${CAMPAIGN}/board`);

  // 8. The board, then full screen.
  await say("board", 3000);
  try { await click(page.getByRole("button", { name: /Show on a screen/ })); } catch {}
  await sleep(500);
  await cap("");
  await sleep(3400);

  // 9. The other city.
  await go(`/today?merchant=${OTHER}`);
  const sig2 = page.locator("text=YOUR SIGNATURE").locator("xpath=..");
  const rec2 = page.locator("text=RECOMMENDED FOR THIS OCCASION").locator("xpath=..");
  await bring(sig2, 230, 900);
  await spot(sig2, rec2);
  await say("other", 3800);
  await unspot();
  await cap("");

  // 10. The promise, on the radar with the logo.
  await radar({ logoCenter: true });
  await sleep(1400);
  await radarLine("promise", "Turn the crowd outside<br>into customers inside.", 4000);
  await radarLine("sign", `<span style="font-size:44px;font-weight:500;color:#C4AECA">Prepared by Claude. Informed by Qloo. Your call.</span>`, 3400);
  await hide();
} catch (e) {
  console.error("recording stopped early:", e.message.split("\n")[0]);
} finally {
  const endAt = (Date.now() - t0) / 1000;
  await context.close();
  await browser.close();
  const webm = readdirSync(OUT).filter((f) => f.endsWith(".webm") && f !== "turnout-demo.webm").sort().pop();
  const target = join(OUT, "turnout-demo.webm");
  if (webm) { rmSync(target, { force: true }); renameSync(join(OUT, webm), target); console.log("recorded", target); }
  writeFileSync(join(OUT, "timeline.json"), JSON.stringify({ endAt, marks }, null, 2));
}
