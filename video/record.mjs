// Records the Turnout demo path as a video with Playwright and the installed Google Chrome.
// Usage: BASE_URL=https://turnout.example CAMPAIGN_ID=camp_xxx npm run record
// Without CAMPAIGN_ID the script opens Today and takes "Make your own version" (or the first
// campaign link) to get a draft. Output: out/turnout-demo.webm, then `npm run mp4`.
import { chromium } from "playwright-core";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3103").replace(/\/$/, "");
let CAMPAIGN = process.env.CAMPAIGN_ID;
const HERO = process.env.HERO ?? "m_penn_pour";
const OTHER = process.env.OTHER ?? "m_quai_bercy";
const BOARD_TEXT = process.env.BOARD_TEXT ?? "Before Harry? Two cocktails, one price.";

const W = 1920, H = 1080;
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "out");
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome", headless: true, args: [`--window-size=${W},${H}`] });

// Warm-up pass so the dev server compiles every route before the recording starts.
{
  const warm = await browser.newContext({ viewport: { width: W, height: H } });
  const p = await warm.newPage();
  const urls = [`/today?merchant=${HERO}`, `/today?merchant=${OTHER}`];
  if (CAMPAIGN) urls.push(`/campaigns/${CAMPAIGN}?merchant=${HERO}`, `/campaigns/${CAMPAIGN}/board`);
  for (const u of urls) await p.goto(BASE + u, { waitUntil: "networkidle" }).catch(() => {});
  await warm.close();
}

const context = await browser.newContext({
  viewport: { width: W, height: H }, deviceScaleFactor: 1, colorScheme: "light", locale: "en-US",
  timezoneId: "America/New_York", recordVideo: { dir: OUT, size: { width: W, height: H } },
});
// Every page starts invisible; `reveal` fades it in once fonts and hydration are done.
await context.addInitScript(() => {
  if (document.documentElement) document.documentElement.style.cssText += ";background:#152220;opacity:0;transition:opacity .55s ease";
});
const page = await context.newPage();

async function overlays() {
  await page.evaluate(() => {
    if (document.getElementById("tv-cap")) return;
    const style = document.createElement("style");
    style.textContent = `
      #tv-cap{position:fixed;left:50%;bottom:44px;transform:translateX(-50%);max-width:1240px;padding:16px 30px;border-radius:16px;
        background:rgba(14,20,17,.88);color:#f6f1e8;font:500 31px/1.3 "Helvetica Neue",Helvetica,Arial,sans-serif;letter-spacing:.01em;
        opacity:0;transition:opacity .35s ease;z-index:2147483646;pointer-events:none;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.25)}
      #tv-cur{position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483645;pointer-events:none;transform:translate(-9999px,-9999px);
        filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}
      html{scrollbar-width:none} ::-webkit-scrollbar{display:none}`;
    document.head.appendChild(style);
    const cap = document.createElement("div"); cap.id = "tv-cap";
    const cur = document.createElement("div"); cur.id = "tv-cur";
    cur.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 2l16 9-7 1.5L17 21l-3 1-4-8.5L4 18z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.body.append(cap, cur);
    document.addEventListener("mousemove", (e) => { cur.style.transform = `translate(${e.clientX - 2}px,${e.clientY - 2}px)`; }, true);
  });
}
async function reveal() {
  await page.evaluate(() => document.fonts.ready);
  await overlays();
  await page.evaluate(() => { document.documentElement.style.opacity = "1"; });
  await sleep(600);
}
async function hide() { await page.evaluate(() => { document.documentElement.style.opacity = "0"; }); await sleep(600); }
async function cap(text) { await page.evaluate((t) => { const c = document.getElementById("tv-cap"); if (!c) return; c.textContent = t; c.style.opacity = t ? "1" : "0"; }, text); }
async function go(path) { await hide(); await page.goto(BASE + path, { waitUntil: "load" }); await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {}); await page.evaluate(() => scrollTo(0, 0)); await reveal(); }
async function scrollTo(y, ms = 1000) {
  await page.evaluate(([y, ms]) => new Promise((res) => {
    const s = scrollY, d = Math.max(0, y) - s, t0 = performance.now();
    const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    const f = (now) => { const p = Math.min(1, (now - t0) / ms); window.scrollTo(0, s + d * ease(p)); p < 1 ? requestAnimationFrame(f) : res(); };
    requestAnimationFrame(f);
  }), [y, ms]);
}
async function topOf(locator) { const b = await locator.first().boundingBox(); const sy = await page.evaluate(() => scrollY); return b ? b.y + sy : 0; }
async function bring(locator, offset = 140) { await scrollTo((await topOf(locator)) - offset); await sleep(250); }
async function moveTo(locator) { const b = await locator.first().boundingBox(); await page.mouse.move(b.x + b.width / 2, b.y + Math.min(b.height / 2, 28), { steps: 28 }); await sleep(350); }
async function click(locator) { await moveTo(locator); await page.mouse.down(); await sleep(90); await page.mouse.up(); }
async function card(lines, ms, small) {
  await hide();
  await page.setContent(`<!doctype html><html style="opacity:0;transition:opacity .55s ease"><body style="margin:0;background:#152220;color:#f3eee4;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;display:grid;place-items:center;height:100vh;text-align:center">
    <div><div style="font-size:30px;letter-spacing:.18em;text-transform:uppercase;opacity:.65;margin-bottom:36px">turnout</div>
    <div style="font-size:${small ? 60 : 76}px;font-weight:600;line-height:1.12;max-width:1500px;margin:0 auto">${lines.map((l) => `<div>${l}</div>`).join("")}</div></div></body></html>`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.documentElement.style.opacity = "1"; });
  await sleep(ms);
}

try {
  // 1. Title card.
  await card(["A real occasion.", "A Qloo decision.", "Your touch. The board."], 3200);

  // 2. Today, the hero merchant: the occasion, the two cards, the locality comparison.
  await go(`/today?merchant=${HERO}`);
  await cap("A real occasion next door. Source and time on screen.");
  await sleep(4200);
  await bring(page.locator("text=YOUR SIGNATURE"), 220);
  await cap("Qloo's decision: your signature, and what this crowd prefers.");
  await sleep(5200);
  await bring(page.locator("text=Why this works here"), 420);
  await cap("Then checked against your street: the places this crowd likes near you.");
  await sleep(4200);
  await cap("");

  // A draft to edit: the given one, or a fresh copy made from Today.
  if (!CAMPAIGN) {
    const own = page.getByRole("button", { name: /Make your own version/ });
    if (await own.count()) { await bring(own, 420); await click(own); await page.waitForURL(/\/campaigns\/camp_/, { timeout: 30000 }); }
    else { const link = page.locator('a[href*="/campaigns/camp_"]').first(); await bring(link, 420); await click(link); await page.waitForURL(/\/campaigns\/camp_/, { timeout: 30000 }); }
    CAMPAIGN = new URL(page.url()).pathname.split("/")[2];
    console.log("draft", CAMPAIGN);
  }

  // 3. The campaign page: edit the board line, the preview rewrites, review, approve.
  await go(`/campaigns/${CAMPAIGN}?merchant=${HERO}`);
  // The chalkboard textarea is the one whose value feeds the board invitation; fall back to the last textarea.
  const taIndex = await page.evaluate(() => {
    const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
    const inv = norm(document.querySelector(".board-invitation")?.textContent);
    const tas = [...document.querySelectorAll("textarea")];
    const i = tas.findIndex((t) => inv && norm(t.value) === inv);
    return i >= 0 ? i : tas.length - 1;
  });
  const chalk = page.locator("textarea").nth(Math.max(0, taIndex));
  await bring(chalk, 300);
  await cap("Your touch: change the words, the board rewrites as you type.");
  await sleep(1200);
  await click(chalk);
  await chalk.fill("");
  await sleep(300);
  await chalk.pressSequentially(BOARD_TEXT, { delay: 48 });
  await sleep(2200);
  const review = page.getByRole("button", { name: /Review campaign/ });
  await bring(review, 520);
  await cap("One button. Nothing is sent, nothing is charged.");
  await sleep(900);
  await click(review);
  const approve = page.getByRole("button", { name: /Approve/ });
  await approve.waitFor({ state: "visible", timeout: 15000 });
  await sleep(1200);
  await bring(approve, 520);
  await sleep(900);
  await click(approve);
  await page.waitForLoadState("networkidle");
  await sleep(1500);
  await overlays();

  // 4. The receipt.
  const receipt = page.locator("text=Materials ready").first();
  const approved = await receipt.waitFor({ state: "visible", timeout: 30000 }).then(() => true).catch(() => false);
  if (!approved) console.error("approval did not show a receipt; continuing to the board");
  if (approved) await bring(receipt, 240);
  await cap("The receipt says exactly what exists: ready, prepared, not sent.");
  await sleep(5200);
  const open = page.locator('a[href$="/board"]').first();
  if (await open.count()) { await bring(open, 420); await sleep(600); await cap(""); await click(open); await page.waitForLoadState("load"); await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {}); await sleep(300); await reveal(); }
  else { await cap(""); await go(`/campaigns/${CAMPAIGN}/board`); }

  // 5. The board, then full screen.
  await cap("Your board. Print it, or put it on a screen by the door.");
  await sleep(4200);
  try { await click(page.getByRole("button", { name: /Show on a screen/ })); } catch {}
  await sleep(600);
  await cap("");
  await sleep(4200);

  // 6. The other merchant.
  await go(`/today?merchant=${OTHER}`);
  await bring(page.locator("text=YOUR SIGNATURE"), 220);
  await cap("Another place, another crowd, another pick.");
  await sleep(4800);
  await cap("");

  // 7. End cards.
  await card(["Turn the crowd outside", "into customers inside."], 4200);
  await card(["Prepared by Claude.", "Informed by Qloo.", "Your call."], 3200, true);
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
