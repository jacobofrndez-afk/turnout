// Records the Turnout demo as a story: the crowd, the radar, the pick, your touch, the board.
// Usage: BASE_URL=https://turnout.example npm run record   (CAMPAIGN_ID optional: a draft of HERO)
// HOOK1 / HOOK2 / PICK override the three lines that quote the day's data.
// Output: out/turnout-demo.webm, then `npm run mp4`. Captions carry the voice-over lines (VOICE-OVER.md).
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3103").replace(/\/$/, "");
let CAMPAIGN = process.env.CAMPAIGN_ID;
const HERO = process.env.HERO ?? "m_penn_pour";
const OTHER = process.env.OTHER ?? "m_quai_bercy";
const BOARD_TEXT = process.env.BOARD_TEXT ?? "Before Harry? Two cocktails, one price.";
const HOOK1 = process.env.HOOK1 ?? "Tonight, 20,000 people walk out of Madison Square Garden.";
const HOOK2 = process.env.HOOK2 ?? "Two blocks from your bar.";
const PICK = process.env.PICK ?? "From your own menu, it picks the offer that fits. Tonight, happy hour beats the usual beer flight.";

// 1080p viewport; the app body is zoomed 1.25x so the text reads at video size (overlays sit outside the zoom).
const VW = 1920, VH = 1080, DPR = 1, ZOOM = 1.25, W = 1920, H = 1080;
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "out");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome", headless: true, args: [`--window-size=${VW},${VH}`] });

// Warm-up pass so the dev server compiles every route before the recording starts.
{
  const warm = await browser.newContext({ viewport: { width: VW, height: VH } });
  const p = await warm.newPage();
  const urls = [`/calendar?merchant=${HERO}`, `/today?merchant=${HERO}`, `/today?merchant=${OTHER}`];
  if (CAMPAIGN) urls.push(`/campaigns/${CAMPAIGN}?merchant=${HERO}`, `/campaigns/${CAMPAIGN}/board`);
  for (const u of urls) await p.goto(BASE + u, { waitUntil: "networkidle" }).catch(() => {});
  await warm.close();
}

const context = await browser.newContext({
  viewport: { width: VW, height: VH }, deviceScaleFactor: DPR, colorScheme: "light", locale: "en-US",
  timezoneId: "America/New_York", recordVideo: { dir: OUT, size: { width: W, height: H } },
});
// Every page starts invisible on a dark canvas; `reveal` fades it in once fonts and hydration are done.
await context.addInitScript(() => {
  document.documentElement.style.background = "#152220";
  const dim = () => { if (document.body) { document.body.style.opacity = "0"; document.body.style.transition = "opacity .55s ease"; return true; } return false; };
  if (!dim()) new MutationObserver((_, o) => { if (dim()) o.disconnect(); }).observe(document.documentElement, { childList: true });
});
const page = await context.newPage();

async function overlays() {
  await page.evaluate(() => {
    if (document.getElementById("tv-cap")) return;
    const style = document.createElement("style");
    style.textContent = `
      #tv-cap{position:fixed;left:50%;bottom:40px;transform:translateX(-50%);max-width:1300px;padding:16px 30px;border-radius:16px;
        background:rgba(14,20,17,.9);color:#f6f1e8;font:500 32px/1.3 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:.01em;
        opacity:0;transition:opacity .35s ease;z-index:2147483646;pointer-events:none;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.25)}
      #tv-cur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483645;pointer-events:none;transform:translate(-9999px,-9999px);
        filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}
      html{scrollbar-width:none} ::-webkit-scrollbar{display:none}`;
    document.head.appendChild(style);
    const cap = document.createElement("div"); cap.id = "tv-cap";
    const cur = document.createElement("div"); cur.id = "tv-cur";
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 9-7 1.5L17 21l-3 1-4-8.5L4 18z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.append(cap, cur);
    document.addEventListener("mousemove", (e) => { cur.style.transform = `translate(${e.clientX - 2}px,${e.clientY - 2}px)`; }, true);
  });
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
async function card(lines, ms, size = 64) {
  await hide();
  await page.setContent(`<!doctype html><html style="background:#152220"><body style="opacity:0;transition:opacity .55s ease;margin:0;background:#152220;color:#f3eee4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;display:grid;place-items:center;height:100vh;text-align:center">
    <div><div style="font-size:22px;letter-spacing:.2em;text-transform:uppercase;opacity:.6;margin-bottom:30px">turnout</div>
    <div style="font-size:${size}px;font-weight:600;line-height:1.14;max-width:1200px;margin:0 auto">${lines.map((l) => `<div>${l}</div>`).join("")}</div></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.body.style.opacity = "1"; });
  await sleep(ms);
}

try {
  // 1. The crowd: two lines, big.
  await card([HOOK1], 3600);
  await card([HOOK2], 2400, 76);

  // 2. The radar: the week around the place.
  await go(`/calendar?merchant=${HERO}`);
  await cap("Turnout watches what happens around your place, all week.");
  await sleep(2600);
  const events = page.getByRole("button", { name: "Events", exact: true });
  if (await events.count()) { await bring(events, 260, 800); await click(events); await sleep(900); }
  await cap("Concerts, games, theatre crowds, the rhythm of your street.");
  await scrollTo((await page.evaluate(() => scrollY)) + 700, 4500);
  await sleep(500);
  await cap("");

  // 3. Today: the one that matters tonight.
  await go(`/today?merchant=${HERO}`);
  const occasion = page.locator("text=A VERIFIED OCCASION NEARBY").first();
  await bring(occasion, 150, 900);
  await cap("Today, it picks the one that matters tonight. A real listing, a real time, a short walk from your door.");
  await sleep(5500);

  // 4. The decision: Qloo, the street, the menu.
  const cards = page.locator("text=YOUR SIGNATURE").first();
  await bring(cards, 220, 1100);
  await cap("Then it asks Qloo what this crowd likes, and checks it against your street.");
  await sleep(4600);
  await cap(PICK);
  await sleep(5200);
  await cap("");

  // A draft to edit: the given one, or a fresh copy made from Today.
  if (!CAMPAIGN) {
    const own = page.getByRole("button", { name: /Make your own version/ });
    if (await own.count()) { await bring(own, 380); await click(own); await page.waitForURL(/\/campaigns\/camp_/, { timeout: 30000 }); }
    else { const link = page.locator('a[href*="/campaigns/camp_"]').first(); await bring(link, 380); await click(link); await page.waitForURL(/\/campaigns\/camp_/, { timeout: 30000 }); }
    CAMPAIGN = new URL(page.url()).pathname.split("/")[2];
    console.log("draft", CAMPAIGN);
  }

  // 5. Your touch: the board line, typed live.
  await go(`/campaigns/${CAMPAIGN}?merchant=${HERO}`);
  const taIndex = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const inv = norm(document.querySelector(".board-invitation")?.textContent);
    const tas = [...document.querySelectorAll("textarea")];
    const i = tas.findIndex((t) => inv && norm(t.value) === inv);
    return i >= 0 ? i : tas.length - 1;
  });
  const chalk = page.locator("textarea").nth(Math.max(0, taIndex));
  await bring(chalk, 250, 900);
  await cap("It writes the campaign. You put your words on it, and the board rewrites itself.");
  await sleep(1600);
  await click(chalk);
  await chalk.fill("");
  await sleep(300);
  await chalk.pressSequentially(BOARD_TEXT, { delay: 55 });
  await sleep(2200);

  // 6. Approve.
  const review = page.getByRole("button", { name: /Review campaign/ });
  await bring(review, 480, 900);
  await cap("You approve. Nothing goes out without you.");
  await sleep(800);
  await click(review);
  const approve = page.getByRole("button", { name: /Approve/ });
  await approve.waitFor({ state: "visible", timeout: 15000 });
  await sleep(1000);
  await bring(approve, 480, 800);
  await sleep(700);
  await click(approve);
  await page.waitForLoadState("networkidle");
  await sleep(1200);
  await overlays();

  // 7. The receipt.
  const receipt = page.locator("text=Materials ready").first();
  const approved = await receipt.waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
  if (!approved) console.error("approval did not show a receipt; continuing to the board");
  if (approved) await bring(receipt, 200, 900);
  await cap("Chalkboard, WhatsApp to your regulars, a local ad. Prepared, not sent, nothing charged.");
  await sleep(5500);
  const open = page.locator('a[href$="/board"]').first();
  await cap("");
  if (await open.count()) { await bring(open, 380, 800); await sleep(500); await click(open); await page.waitForLoadState("load"); await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {}); await sleep(300); await reveal(); }
  else await go(`/campaigns/${CAMPAIGN}/board`);

  // 8. The board, then full screen.
  await cap("Your board, by the door, tonight.");
  await sleep(3200);
  try { await click(page.getByRole("button", { name: /Show on a screen/ })); } catch {}
  await sleep(500);
  await cap("");
  await sleep(3600);

  // 9. The other city.
  await go(`/today?merchant=${OTHER}`);
  await bring(page.locator("text=YOUR SIGNATURE"), 220, 900);
  await cap("Paris or New York. Any street with a crowd.");
  await sleep(4200);
  await cap("");

  // 10. End cards.
  await card(["Turn the crowd outside", "into customers inside."], 3800, 72);
  await card(["Prepared by Claude.", "Informed by Qloo.", "Your call."], 3000, 54);
  await hide();
} catch (e) {
  console.error("recording stopped early:", e.message.split("\n")[0]);
} finally {
  await context.close();
  await browser.close();
  const webm = readdirSync(OUT).filter((f) => f.endsWith(".webm") && f !== "turnout-demo.webm").sort().pop();
  const target = join(OUT, "turnout-demo.webm");
  if (webm) { rmSync(target, { force: true }); renameSync(join(OUT, webm), target); console.log("recorded", target); }
}
