// Capture a real screenshot of the running app through the Chrome DevTools Protocol (real time, so WebGL map tiles load).
// Usage: node scripts/journey-shot.mjs <url> <out.png> <selector> [waitMs] [width] [height] [jsToRunBefore]
// The shot spans the full width from the top of the page down to the bottom of <selector>; the Next.js dev badge is hidden.
// Chrome's profile lives in .tmp/chrome-cdp (inside the project).
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
const [, , url, out, selector, waitMs = "14000", w = "1240", h = "1500", eval_ = ""] = process.argv;
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", `--user-data-dir=${process.cwd()}/.tmp/chrome-cdp`, "--remote-debugging-port=9333", `--window-size=${w},${h}`,
  "--hide-scrollbars", "--ignore-gpu-blocklist", "--use-angle=metal", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch("http://127.0.0.1:9333/json")).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Emulation.setDeviceMetricsOverride", { width: +w, height: +h, deviceScaleFactor: 2, mobile: false });
await send("Page.enable"); await send("Runtime.enable");
await send("Page.navigate", { url });
await sleep(+waitMs);
if (eval_) { await send("Runtime.evaluate", { expression: eval_, awaitPromise: true }); await sleep(2500); }
let clip;
if (selector) {
  const r = await send("Runtime.evaluate", { expression: `JSON.stringify((()=>{document.querySelectorAll('nextjs-portal').forEach(n=>n.remove());scrollTo(0,0);const e=document.querySelector(${JSON.stringify(selector)});const b=e.getBoundingClientRect();return {x:0,y:0,width:innerWidth,height:Math.ceil(b.bottom+scrollY+24)}})())`, returnByValue: true });
  clip = { ...JSON.parse(r.result.result.value), scale: 1 };
  await sleep(1200);
}
const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, ...(clip ? { clip } : {}) });
writeFileSync(out, Buffer.from(shot.result.data, "base64"));
console.log("saved", out, clip ? JSON.stringify(clip) : "");
ws.close(); chrome.kill();
