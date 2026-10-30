// The overlay engine of the demo recording. It runs in a shell page that frames the app in an
// iframe and owns everything the app's own React tree would wipe at hydration: the radar and the
// logo morph, the journey band, the captions, the spotlight and the cursor. record.mjs drives it
// through window.tv. Coordinates are page pixels of a 1920x1080 canvas.
(() => {
  const C = window.TV_CONFIG;
  const FONT = C.font, DARK = C.dark, VW = C.vw, VH = C.vh, BAR = C.bar, AH = VH - BAR;
  const PINK = "#E6A4C2", RING = "#C4AECA", INK = "#F6F1F8";
  const EASE = "cubic-bezier(.7,0,.2,1)";

  const style = document.createElement("style");
  style.textContent = `
    html,body{margin:0;width:${VW}px;height:${VH}px;overflow:hidden;background:${DARK};font-family:${FONT};color:${INK}}
    #tv-view{position:absolute;left:0;top:0;width:${VW}px;height:${AH}px;overflow:hidden;background:${DARK};transform-origin:50% 50%}
    #tv-view iframe{position:absolute;left:0;top:0;display:block;width:${VW}px;height:${AH}px;border:0;background:#fff;opacity:0;transition:opacity .45s ease}
    #tv-view iframe.on{opacity:1}
    #tv-view iframe:not(.on){pointer-events:none}
    #tv-spot{position:absolute;left:0;top:0;width:0;height:0;z-index:3;border-radius:16px;box-shadow:0 0 0 9999px rgba(18,10,22,.5),0 0 0 1.5px rgba(230,164,194,.55);opacity:0;
      transition:left .8s ${EASE},top .8s ${EASE},width .8s ${EASE},height .8s ${EASE},opacity .6s ease;pointer-events:none}
    #tv-journey{position:absolute;left:0;right:0;bottom:0;height:${BAR}px;background:#120a16;display:flex;align-items:center;justify-content:center;transform:translateY(100%);transition:transform .6s cubic-bezier(.2,.8,.2,1);z-index:2}
    #tv-journey.on{transform:none}
    #tv-journey ol{display:flex;align-items:center;list-style:none;margin:0;padding:0}
    #tv-journey li{display:flex;align-items:center;gap:10px;font:500 17px/1 ${FONT};letter-spacing:.02em;color:rgba(246,241,248,.36);transition:color .5s ease}
    #tv-journey li i{display:block;width:9px;height:9px;border-radius:50%;border:1.5px solid rgba(196,174,202,.5);box-sizing:border-box;transition:background .5s ease,border-color .5s ease,box-shadow .5s ease}
    #tv-journey li+li::before{content:"";display:block;width:54px;height:1px;background:rgba(196,174,202,.28);margin:0 16px}
    #tv-journey li.done{color:rgba(196,174,202,.78)} #tv-journey li.done i{background:${RING};border-color:${RING}}
    #tv-journey li.now{color:${INK};font-weight:600} #tv-journey li.now i{background:${PINK};border-color:${PINK};box-shadow:0 0 0 5px rgba(230,164,194,.22)}
    #tv-cap{position:absolute;left:50%;bottom:${BAR + 28}px;transform:translate(-50%,12px);max-width:1320px;padding:17px 32px;border-radius:18px;background:rgba(24,16,28,.88);backdrop-filter:blur(14px);
      color:${INK};font:500 31px/1.32 ${FONT};letter-spacing:.005em;opacity:0;transition:opacity .45s ease,transform .45s ease;z-index:3;text-align:center;box-shadow:0 14px 48px rgba(0,0,0,.28);pointer-events:none}
    #tv-cap.on{opacity:1;transform:translate(-50%,0)}
    #tv-cur{position:absolute;left:0;top:0;width:26px;height:26px;z-index:4;pointer-events:none;transform:translate(-9999px,-9999px);transition:transform .55s cubic-bezier(.3,0,.2,1);filter:drop-shadow(0 2px 4px rgba(0,0,0,.35))}
    #tv-stage{position:absolute;inset:0;background:${DARK};z-index:5;transition:opacity .8s ease}
    #tv-stage.off{opacity:0;pointer-events:none}
    #tv-radar{position:absolute;left:0;top:0}
    #rg{transform-box:view-box;transition:transform 1.1s ${EASE}}
    .axis{stroke:${RING};stroke-opacity:.12;stroke-width:1;transition:opacity .5s ease}
    .blip{opacity:0;animation:in .6s ease forwards}
    .blip text{font-family:${FONT};transition:opacity .5s ease}
    .pulse{transform-box:fill-box;transform-origin:center;animation:pulse 2.4s ease-out infinite}
    .dot{transition:r 1.25s ${EASE},opacity .3s ease}
    #centre{transition:opacity .5s ease}
    #centre text{font-family:${FONT}}
    #sw{opacity:0;transition:opacity .5s ease}
    #tv-logo{position:absolute;left:0;top:0;transform-origin:0 0;opacity:0;--mark-ring:${RING};--mark-ink:${INK};--mark-needle:${PINK}}
    #tv-logo svg{display:block;overflow:visible}
    #tv-logo svg path,#tv-logo svg circle,#tv-logo svg g{transition:fill .9s ease,stroke .9s ease,opacity .45s ease}
    #tv-logo.prep,#tv-logo.prep *{transition:none!important}
    #tv-line{position:absolute;left:50%;bottom:86px;transform:translate(-50%,10px);width:1500px;text-align:center;font:600 54px/1.15 ${FONT};letter-spacing:-.005em;opacity:0;transition:opacity .5s ease,transform .5s ease}
    #tv-line.on{opacity:1;transform:translate(-50%,0)}
    #tv-line b{color:${PINK};font-weight:700}
    .tv-flash{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:radial-gradient(circle,rgba(246,241,248,.95) 0%,rgba(230,164,194,.55) 35%,rgba(230,164,194,0) 70%);transform:scale(.2);opacity:1;transition:transform 1.3s cubic-bezier(.2,.8,.2,1),opacity 1.3s ease}
    .tv-flash.on{transform:scale(26);opacity:0}
    #tv-punch{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) scale(.96);width:1600px;text-align:center;font:700 84px/1.1 ${FONT};letter-spacing:-.015em;color:${INK};opacity:0;transition:opacity .28s ease,transform .28s cubic-bezier(.2,.8,.2,1)}
    #tv-punch.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
    #tv-punch b{color:${PINK};font-weight:700}
    #tv-tag{position:absolute;left:50%;transform:translate(-50%,10px);width:1500px;text-align:center;font:500 42px/1.2 ${FONT};color:${RING};opacity:0;transition:opacity .7s ease,transform .7s ease}
    #tv-tag.on{opacity:1;transform:translate(-50%,0)}
    @keyframes in{to{opacity:1}}
    @keyframes pulse{0%{transform:scale(1);opacity:.9}100%{transform:scale(3.2);opacity:0}}
    @keyframes pop{0%{transform:scale(0)}60%{transform:scale(1.35)}100%{transform:scale(1)}}`;
  document.head.appendChild(style);
  document.body.innerHTML = `
    <div id="tv-view"><iframe name="app" src="about:blank"></iframe><iframe name="app2" src="about:blank"></iframe><div id="tv-spot"></div></div>
    <div id="tv-journey"><ol>${C.steps.map((s) => `<li><i></i>${s}</li>`).join("")}</ol></div>
    <div id="tv-cap"></div>
    <div id="tv-cur"><svg viewBox="0 0 24 24" width="26" height="26"><path d="M4 2l16 9-7 1.5L17 21l-3 1-4-8.5L4 18z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg></div>
    <div id="tv-stage"><div id="tv-logo"></div><div id="tv-line"></div><div id="tv-punch"></div><div id="tv-tag"></div></div>`;

  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const SVG = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(SVG, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (parent) parent.appendChild(e); return e; };
  const pt = (cx, cy, r, deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const arc = (cx, cy, r, a0, a1) => { const [x0, y0] = pt(cx, cy, r, a0), [x1, y1] = pt(cx, cy, r, a1); return `M${x0} ${y0}A${r} ${r} 0 0 1 ${x1} ${y1}`; };
  const reflow = (e) => void e.getBoundingClientRect();

  let R = null;      // the radar on stage
  let logo = null;   // the header lockup, cloned from the app
  const sw = { a: 0, speed: -72, park: null, last: 0 };
  function tick(t) {
    if (R) {
      if (!sw.last) sw.last = t;
      const dt = Math.min(0.1, (t - sw.last) / 1000); sw.last = t;
      if (sw.park) { const p = Math.min(1, (t - sw.park.t0) / sw.park.ms), e = 1 - Math.pow(1 - p, 3); sw.a = sw.park.from + (sw.park.to - sw.park.from) * e; if (p >= 1) { sw.park = null; sw.speed = 0; } }
      else sw.a += sw.speed * dt;
      R.sweep.setAttribute("transform", `rotate(${sw.a} ${R.cx} ${R.cy})`);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  // Slow the sweep down until its leading edge rests on the needle angle of the mark (60° up, right).
  function park(ms) { const from = sw.a; let delta = (((from - 30) % 360) + 360) % 360; if (delta < 150) delta += 360; sw.park = { from, to: from - delta, t0: performance.now(), ms }; }

  // The radar: rings in the proportions of the mark (42, 29, 16 for 64), s pixels per unit of a
  // 32px mark, the sweep leading counter-clockwise, blips in those units around the hinge.
  function intro({ cx, cy, s, blips, fast = false, ripple = false }) {
    $("tv-radar")?.remove();
    const svg = el("svg", { id: "tv-radar", width: VW, height: VH, viewBox: `0 0 ${VW} ${VH}` });
    $("tv-stage").prepend(svg);
    const RO = (21 - 0.5) * s;
    const defs = el("defs", {}, svg);
    const grad = el("linearGradient", { id: "swg", gradientUnits: "userSpaceOnUse", x1: cx, y1: cy, x2: cx + RO * 0.62, y2: cy }, defs);
    el("stop", { offset: 0, "stop-color": PINK, "stop-opacity": 0.42 }, grad);
    el("stop", { offset: 1, "stop-color": PINK, "stop-opacity": 0 }, grad);
    const g = el("g", { id: "rg" }, svg);
    g.style.transformOrigin = `${cx}px ${cy}px`;
    const fade = [], rings = [], keep = [], other = [];
    fade.push(el("line", { class: "axis", x1: cx - RO - 40, y1: cy, x2: cx + RO + 40, y2: cy }, g));
    fade.push(el("line", { class: "axis", x1: cx, y1: cy - RO - 40, x2: cx, y2: cy + RO + 40 }, g));
    [21, 15, 8].forEach((u, i) => {
      const r = (u - 0.5) * s;
      [-90, 0, 90, 180].forEach((a0, q) => {
        const p = el("path", { d: arc(cx, cy, r, a0, a0 + 90), fill: "none", stroke: RING, "stroke-opacity": 0.3, "stroke-width": 3, "stroke-linecap": "butt" }, g);
        const len = p.getTotalLength();
        p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
        p.style.transition = `stroke-dashoffset .9s cubic-bezier(.3,0,.2,1) ${(fast ? 60 : 100) + i * (fast ? 90 : 130) + q * 35}ms, stroke-width 1.25s ${EASE}, stroke-opacity 1.25s ${EASE}, opacity .8s ease`;
        rings.push(p); (q === 0 ? keep : other).push(p);
      });
    });
    const [tx, ty] = pt(cx, cy, RO, -30);
    const sweep = el("path", { id: "sw", d: `M${cx} ${cy}L${cx} ${cy - RO}A${RO} ${RO} 0 0 1 ${tx} ${ty}Z`, fill: "url(#swg)" }, g);
    let arena = null;
    const items = [];
    blips.forEach((b, i) => {
      const bx = cx + b.u * s, by = cy + b.v * s, left = b.u < 0;
      const bg = el("g", { class: "blip", transform: `translate(${bx} ${by})` }, g);
      const delay = fast ? `${0.3 + i * 0.045}s` : `${0.5 + i * 0.07}s`;
      bg.style.animationDelay = delay;
      const r = b.big ? 11 : b.name ? 7 : 5;
      const dot = el("circle", { class: "dot", r, fill: PINK, "fill-opacity": b.name ? 1 : 0.75 }, bg);
      const pulse = el("circle", { class: "pulse", r, fill: "none", stroke: PINK, "stroke-width": 2 }, bg);
      pulse.style.animationDelay = delay;
      fade.push(pulse);
      const item = { b, dot, pulse };
      if (b.name) { const t1 = el("text", { x: left ? -20 : 20, y: b.big || b.small ? -6 : 8, "text-anchor": left ? "end" : "start", fill: INK, "font-size": b.big ? 30 : 24, "font-weight": b.big ? 600 : 500 }, bg); t1.textContent = b.name; fade.push(t1); item.t1 = t1; }
      if (b.sub) { const t2 = el("text", { x: left ? -20 : 20, y: 24, "text-anchor": left ? "end" : "start", fill: RING, "font-size": 22 }, bg); t2.textContent = b.sub; fade.push(t2); item.t2 = t2; if (b.small) { t2.style.opacity = 0; t2.style.transition = "opacity .5s ease"; } }
      if (b.big && !arena) arena = dot; else fade.push(dot);
      items.push(item);
    });
    const centre = el("g", { id: "centre", transform: `translate(${cx} ${cy})` }, g);
    el("circle", { r: 9, fill: INK }, centre);
    const bar = el("circle", { class: "pulse", r: 9, fill: "none", stroke: INK, "stroke-width": 2 }, centre); bar.style.animationDelay = ".6s";
    const label = el("text", { y: 44, "text-anchor": "middle", fill: RING, "font-size": 22, "letter-spacing": ".12em" }, centre); label.textContent = C.you;
    fade.push(centre);
    if (ripple) { g.style.transition = "none"; g.style.transform = "scale(0.03)"; }
    reflow(svg);
    if (ripple) { g.style.transition = "transform 1.3s cubic-bezier(.2,.8,.2,1)"; g.style.transform = "scale(1)"; setTimeout(() => { g.style.transition = ""; }, 1400); }
    rings.forEach((p) => (p.style.strokeDashoffset = 0));
    setTimeout(() => { sweep.style.opacity = 1; }, 700);
    sw.speed = -72; sw.park = null;
    R = { cx, cy, s, svg, g, sweep, fade, rings, keep, other, arena, items };
  }
  // Small crowds count too: the small venues light up one by one with their own line, the arena steps back.
  async function small() {
    if (!R) return;
    R.items.filter((it) => it.b.big).forEach((it) => { [it.t1, it.t2].forEach((t) => { if (t) { t.style.transition = "opacity .6s ease"; t.style.opacity = 0.45; } }); });
    for (const it of R.items.filter((it) => it.b.small)) {
      it.dot.style.transition = "r .35s cubic-bezier(.2,.8,.2,1), opacity .3s ease"; it.dot.style.r = "10px";
      it.pulse.style.animation = "none"; reflow(it.pulse); it.pulse.style.animation = "pulse 1.6s ease-out 2";
      if (it.t2) it.t2.style.opacity = 1;
      await sleep(260);
    }
  }

  // The app's header lockup, kept as markup so the stage can draw it at any size with the same geometry.
  function setLogo(html) {
    const t = document.createElement("div"); t.innerHTML = html;
    const svg = t.firstElementChild;
    ["width", "height", "class", "aria-hidden", "focusable"].forEach((a) => svg.removeAttribute(a));
    const vb = svg.getAttribute("viewBox").split(/[\s,]+/).map(Number);
    logo = { html: svg.outerHTML, w0: vb[2], h0: vb[3], hx: Math.round((12 * vb[3]) / 64), hy: Math.round((52 * vb[3]) / 64) };
  }
  function placeLogo(center, K) {
    const L = $("tv-logo");
    L.classList.add("prep");   // no transitions while the parts are set to their hidden state
    L.innerHTML = logo.html;
    const svg = L.firstElementChild;
    const w = logo.w0 * K, h = logo.h0 * K;
    svg.setAttribute("width", w); svg.setAttribute("height", h);
    const left = center[0] - w / 2, top = center[1] - h / 2;
    Object.assign(L.style, { left: left + "px", top: top + "px", transition: "none", transform: "none", opacity: 1 });
    L.style.setProperty("--mark-ring", RING); L.style.setProperty("--mark-ink", INK); L.style.setProperty("--mark-needle", PINK);
    const paths = [...svg.querySelectorAll(":scope > path")], gs = [...svg.querySelectorAll(":scope > g")];
    const parts = { trail: [paths[0], paths[1]], structure: paths[2], rings: gs[0], blip: svg.querySelector(":scope > circle"), word: gs[1] };
    parts.trail.forEach((p) => { p.style.opacity = 0; p.style.transition = "opacity .8s ease, fill .9s ease"; });
    parts.rings.style.opacity = 0; parts.rings.style.transition = "opacity .35s ease";
    Object.assign(parts.structure.style, { opacity: 0, transformBox: "view-box", transformOrigin: `${logo.hx}px ${logo.hy}px`, transform: "scale(.6)", transition: "opacity .5s ease, transform .6s cubic-bezier(.2,.8,.2,1), fill .9s ease" });
    Object.assign(parts.blip.style, { opacity: 0, transformBox: "fill-box", transformOrigin: "center", transition: "fill .9s ease" });
    parts.strokes = []; parts.solids = [];
    parts.word.querySelectorAll("path").forEach((p) => {
      if (p.getAttribute("stroke") === "none") { p.style.opacity = 0; p.style.transition = "opacity .4s ease, fill .9s ease"; parts.solids.push(p); }
      else { const len = p.getTotalLength(); p.style.strokeDasharray = len; p.style.strokeDashoffset = len; parts.strokes.push(p); }
    });
    logo.K = K; logo.left = left; logo.top = top; logo.parts = parts;
    reflow(L);
    L.classList.remove("prep");
    reflow(L);
    return parts;
  }

  // The rings collapse into the mark, the sweep becomes the needle, the door draws, the word
  // writes itself: the radar of the street becomes the logo, centred, at K times the header size.
  async function morph({ center, K, keepLine = false }) {
    const { cx, cy, s, g } = R, f = K / s;
    const toX = center[0] - (logo.w0 * K) / 2 + logo.hx * K, toY = center[1] - (logo.h0 * K) / 2 + logo.hy * K;
    if (!keepLine) line("");
    R.fade.forEach((e) => { if (e.classList.contains("pulse")) e.style.animation = "none"; e.style.opacity = 0; });
    await sleep(120);
    park(1300);
    const parts = placeLogo(center, K);
    await sleep(150);
    g.style.transition = `transform 1.1s ${EASE}, opacity 1s ease`;
    g.style.transform = `translate(${toX - cx}px, ${toY - cy}px) scale(${f})`;
    g.style.opacity = 1;   // from the dimmed state behind the statements, if any
    R.rings.forEach((p) => { p.style.strokeWidth = s + "px"; p.style.strokeOpacity = 1; });
    if (R.arena) R.arena.style.r = 1.3 * s + "px";
    await sleep(300);
    R.other.forEach((p) => (p.style.opacity = 0));
    await sleep(700);
    parts.rings.style.opacity = 1;
    await sleep(200);
    R.keep.forEach((p) => (p.style.opacity = 0));
    R.sweep.style.opacity = 0;
    parts.structure.style.opacity = 1; parts.structure.style.transform = "scale(1)";
    parts.trail.forEach((p) => (p.style.opacity = 1));
    await sleep(260);
    parts.blip.style.opacity = 1; parts.blip.style.animation = "pop .45s cubic-bezier(.3,0,.2,1) forwards";
    if (R.arena) R.arena.style.opacity = 0;
    await sleep(160);
    parts.strokes.forEach((p, i) => { p.style.transition = `stroke-dashoffset .6s cubic-bezier(.3,0,.2,1) ${i * 55}ms, stroke .9s ease`; p.style.strokeDashoffset = 0; });
    await sleep(950);
    parts.solids.forEach((p) => (p.style.opacity = 1));
    await sleep(300);
  }

  // The lockup flies into the app's header while the stage clears: same geometry, so it lands on the real logo.
  async function fly(rect) {
    const L = $("tv-logo");
    L.style.transition = `transform 1100ms cubic-bezier(.75,0,.2,1)`;
    L.style.transform = `translate(${rect.x - logo.left}px, ${rect.y - logo.top}px) scale(${rect.width / (logo.w0 * logo.K)})`;
    await sleep(300);
    L.style.setProperty("--mark-ring", "#927798"); L.style.setProperty("--mark-ink", "#3B1C42"); L.style.setProperty("--mark-needle", "#84204D");
    await sleep(150);
    $("tv-stage").classList.add("off");
    await sleep(850);
    $("tv-stage").style.display = "none";
    L.style.opacity = 0; L.innerHTML = "";
    R = null;
  }
  async function stageOn() {
    const st = $("tv-stage");
    st.style.display = "block"; st.classList.add("off"); reflow(st); st.classList.remove("off");
    await sleep(900);
  }

  // One statement at a time, big, centred: the radar steps back behind it.
  function punch(html) { const p = $("tv-punch"); p.classList.remove("on"); if (!html) return; setTimeout(() => { p.innerHTML = html; p.classList.add("on"); }, 200); }
  function dimRadar(o) { if (!R) return; R.g.style.transition = `transform 1.25s ${EASE}, opacity .6s ease`; R.g.style.opacity = o; }
  // The board collapses into one point, your place, and a flash launches the radar from it.
  async function collapse(x, y, cx, cy) {
    const v = $("tv-view"), st = $("tv-stage"), j = $("tv-journey");
    v.style.transition = "transform 1500ms cubic-bezier(.65,0,.35,1), opacity 500ms ease 1000ms";
    v.style.transformOrigin = `${x}px ${y}px`;
    v.style.transform = `translate(${cx - x}px, ${cy - y}px) scale(0.02)`;
    v.style.opacity = 0;
    j.style.transition = "opacity .6s ease"; j.style.opacity = 0;
    st.style.background = "transparent"; st.style.transition = "none"; st.classList.remove("off"); st.style.opacity = 1; st.style.display = "block";
    await sleep(1150);
    const f = document.createElement("div"); f.className = "tv-flash"; f.style.left = cx + "px"; f.style.top = cy + "px"; st.appendChild(f); reflow(f); f.classList.add("on"); setTimeout(() => f.remove(), 1500);
    await sleep(400);
    v.style.display = "none"; st.style.background = DARK;
  }
  function line(html) { const l = $("tv-line"); l.classList.remove("on"); if (!html) return; setTimeout(() => { l.innerHTML = html; l.classList.add("on"); }, 260); }
  function count(to, ms) { const n = $("num"); if (!n) return; const t0 = performance.now(); const f = (now) => { const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3); n.textContent = Math.round(to * e).toLocaleString("en-US"); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }
  function tag(text) { const t = $("tv-tag"); t.textContent = text; t.style.top = logo && logo.top != null ? logo.top + logo.h0 * logo.K + 64 + "px" : "760px"; t.classList.toggle("on", !!text); }
  function cap(text) { const c = $("tv-cap"); if (text) { c.textContent = text; c.classList.add("on"); } else c.classList.remove("on"); }
  function journey(on) { $("tv-journey").classList.toggle("on", !!on); }
  function step(i) { [...$("tv-journey").querySelectorAll("li")].forEach((li, k) => { li.classList.toggle("done", k < i); li.classList.toggle("now", k === i); }); }
  // A hidden spot appears in place; a visible one glides to its next block.
  function spot(x, y, w, h) {
    const s = $("tv-spot");
    const hidden = getComputedStyle(s).opacity === "0";
    if (hidden) { s.style.transition = "opacity .6s ease"; Object.assign(s.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px" }); reflow(s); s.style.transition = ""; }
    Object.assign(s.style, { left: x + "px", top: y + "px", width: w + "px", height: h + "px", opacity: 1 });
  }
  function unspot() { $("tv-spot").style.opacity = 0; }
  function cursor(x, y) { $("tv-cur").style.transform = `translate(${x - 2}px,${y - 2}px)`; }
  function drift(x, y, ms, scale) { const v = $("tv-view"); v.style.transition = `transform ${ms}ms cubic-bezier(.3,0,.7,1)`; v.style.transformOrigin = `${x}px ${y}px`; v.style.transform = `scale(${scale})`; }
  function undrift() { const v = $("tv-view"); v.style.transition = `transform 800ms ${EASE}`; v.style.transform = "scale(1)"; }
  // Two frames: the next page loads in the hidden one while the current one is on screen.
  const frames = () => [...document.querySelectorAll("#tv-view iframe")];
  function dim() { frames().forEach((f) => f.classList.remove("on")); }
  // Crossfade to the frame that holds the next page: it rises on top while the current one settles back.
  function swap(name) {
    const nw = frames().find((f) => f.name === name), old = frames().find((f) => f.name !== name);
    nw.style.transition = "none"; nw.style.transform = "scale(1.02)"; nw.style.zIndex = 2; old.style.zIndex = 1; reflow(nw);
    nw.style.transition = "opacity .8s ease, transform .9s cubic-bezier(.2,.8,.2,1)"; nw.classList.add("on"); nw.style.transform = "scale(1)";
    old.style.transition = "opacity .8s ease .15s, transform .9s cubic-bezier(.4,0,.6,1)"; old.style.transform = "scale(.985)"; old.classList.remove("on");
    setTimeout(() => { old.style.transform = "none"; old.style.transition = ""; nw.style.transition = ""; }, 1000);
  }
  // The close: a wave of light through the word, a ping on the mark, the whole lockup breathing in.
  async function finale() {
    const L = $("tv-logo"), parts = logo && logo.parts; if (!parts) return;
    const svg = L.firstElementChild;
    const ping = (delay) => { const c = el("circle", { cx: parts.blip.getAttribute("cx"), cy: parts.blip.getAttribute("cy"), r: parts.blip.getAttribute("r"), fill: "none", stroke: PINK, "stroke-width": 0.6 }, svg); c.style.transformBox = "fill-box"; c.style.transformOrigin = "center"; c.style.animation = `pulse 1.6s ease-out ${delay}ms 1 forwards`; c.style.opacity = 0; setTimeout(() => (c.style.opacity = 1), delay); };
    ping(200); ping(900);
    parts.strokes.forEach((p, i) => { p.style.transition = `stroke .32s ease ${300 + i * 90}ms`; p.style.stroke = PINK; setTimeout(() => { p.style.transition = "stroke .5s ease"; p.style.stroke = ""; }, 650 + i * 90); });
    L.style.transformOrigin = "50% 50%"; L.style.transition = "transform 3.2s cubic-bezier(.2,.6,.2,1)"; L.style.transform = "scale(1.035)";
    const t = $("tv-tag"); t.style.transition = "opacity .7s ease, transform 3.2s cubic-bezier(.2,.6,.2,1)"; t.style.transform = "translate(-50%,6px)";
  }
  function show(name = "app") { frames().forEach((f) => { const on = f.name === name; f.classList.toggle("on", on); f.style.zIndex = on ? 2 : 1; }); }

  window.tv = { intro, small, setLogo, morph, fly, stageOn, collapse, finale, line, punch, dimRadar, count, tag, cap, journey, step, spot, unspot, cursor, drift, undrift, dim, show, swap };
})();
