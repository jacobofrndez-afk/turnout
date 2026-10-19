// Studio B, Turnout. Generates the SVG masters, marks/ and index.html (static outputs).
// Run: node design/studio-b/_build/gen.mjs
import fs from 'fs';
import * as M from './marks.mjs';
const { C } = M;
const OUT = new URL('..', import.meta.url).pathname;
const f = n => +(+n).toFixed(2);
const UP = 2000;

// ---------------------------------------------------------------- mark renderers (0 0 32 32)
const THEMES = {
  color: { ink: C.ink, accent: C.amber, light: C.amber, bg: C.paper, top: C.ink, bottom: C.amber, glowMax: null },
  mono: { ink: C.ink, accent: C.ink, light: C.ink, bg: C.paper, top: C.ink, bottom: C.ink, glowMax: 0.22 },
  reverse: { ink: C.paper, accent: C.amberLight, light: C.amberLight, bg: C.ink, top: C.paper, bottom: C.amberLight, glowMax: 0.42 },
};
export function mark(idea, px, theme = 'color') {
  const t = THEMES[theme];
  if (idea === 'turn') {
    if (px < 20) return M.turn16({ top: t.top, bottom: t.bottom });
    return M.turnMark({ k: px >= 48 ? 'n144' : 'n24', top: t.top, bottom: t.bottom });
  }
  if (idea === 'seal') {
    if (px < 20) return M.seal16({ ink: t.ink, accent: t.accent, glow: t.light, bg: t.bg, max: theme === 'mono' ? 0.3 : theme === 'reverse' ? 0.55 : 0.5 });
    if (px >= 96) return `<g transform="scale(0.1)">${M.sealFull({ ink: t.ink, accent: t.accent, glow: t.light, bg: t.bg, mono: theme === 'mono', ...(t.glowMax ? { glowMax: t.glowMax } : {}) })}</g>`;
    return M.sealCore({ ink: t.ink, accent: t.accent, glow: t.light, bg: t.bg, header: px <= 20, ...(t.glowMax ? { glowMax: t.glowMax + 0.04 } : {}) });
  }
  if (idea === 'open') {
    if (px < 20) return M.opening16({ ink: t.ink, light: t.light, k: theme === 'mono' ? 0.8 : 1 });
    return M.opening({ v: px >= 48 ? 'hero' : px <= 20 ? 'header' : 'm32', ink: t.ink, light: t.light, ...(theme === 'mono' ? { max: 0.85, min: 0.1 } : {}) });
  }
}
const svgInline = (body, px, cls = '', vb = '0 0 32 32', label = '') =>
  `<svg class="${cls}" viewBox="${vb}" width="${px}" height="${px}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const svgFile = (body, w, h, title, vb) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb || `0 0 ${f(w)} ${f(h)}`}" width="${f(w)}" height="${f(h)}"><title>${title}</title>${body}</svg>\n`;

// ---------------------------------------------------------------- lockups
// Wordmark size W in px. Descriptor Inter 600, caps, 0.14em, at 0.105 W.
const DESC = 0.105;
function lockupTurn(W, theme = 'color') {
  const t = THEMES[theme];
  const T = M.TURN.n144, sm = (M.CAP / UP * W) / (-T.box.y0); // arch height = cap height
  const pad = 0.12 * W, base = 0.75 * W + pad;
  const markL = pad, pivotX = markL + (T.cx - T.box.x0) * sm, markR = markL + (T.box.x1 - T.box.x0) * sm;
  const gap = 0.26 * W, s = W / UP;
  const wx = markR + gap - M.wmInk.x0 * s;
  const top = `<path d="${M.scaleT(T.top, sm, pivotX - T.cx * sm, base)}" fill="${t.top}"/>`;
  const bot = `<path d="${M.scaleT(T.bottom, sm, pivotX - T.cx * sm, base)}" fill="${t.bottom}"/>`;
  const wm = M.wordmark({ size: W, x: wx, y: base, fill: t.ink });
  const ds = M.descriptor({ size: DESC * W, x: wx + M.wmInk.x0 * s + 0.01 * W, y: base + 0.40 * W, fill: theme === 'reverse' ? C.inkSoft : C.muted });
  const width = wx + M.wmInk.x1 * s + pad, height = base + (-T.box.y0) * sm + pad;
  return { body: top + bot + wm + ds, w: width, h: height };
}
function lockupSeal(W, theme = 'color') {
  const t = THEMES[theme];
  const pad = 0.12 * W, D = 1.62 * W, s = W / UP;
  const capTop = 0.714 * W, descBase = 0.40 * W;
  const base = pad + D / 2 + (capTop - descBase) / 2 + 0.03 * W; // centre the word block on the seal
  const sealY = base - (capTop - descBase) / 2 - 0.03 * W - D / 2;
  const seal = `<g transform="translate(${f(pad)} ${f(sealY)}) scale(${f(D / 320)})">${M.sealFull({ ink: t.ink, accent: t.accent, glow: t.light, bg: t.bg, mono: theme === 'mono', ...(t.glowMax ? { glowMax: t.glowMax } : {}) })}</g>`;
  const wx = pad + D + 0.3 * W - M.wmInk.x0 * s;
  const wm = M.wordmark({ size: W, x: wx, y: base, fill: t.ink });
  const ds = M.descriptor({ size: DESC * W, x: wx + M.wmInk.x0 * s + 0.01 * W, y: base + descBase, fill: theme === 'reverse' ? C.inkSoft : C.muted });
  return { body: seal + wm + ds, w: wx + M.wmInk.x1 * s + pad, h: D + 2 * pad };
}
function lockupOpen(W, theme = 'color') {
  const t = THEMES[theme];
  const pad = 0.12 * W, base = 0.75 * W + pad;
  const ow = M.openWord({ size: W, x: 0, y: 0, ink: t.ink, light: t.light, max: theme === 'reverse' ? 0.7 : theme === 'mono' ? 0.32 : 0.6, wallDrop: 0.028 });
  const dx = pad - ow.left;
  const body = `<g transform="translate(${f(dx)} ${f(base)})">${ow.svg}</g>`;
  const ds = M.descriptor({ size: DESC * W, x: pad + 0.01 * W, y: base + 0.42 * W, fill: theme === 'reverse' ? C.inkSoft : C.muted });
  return { body: body + ds, w: ow.width + 2 * pad, h: base + 0.66 * W + pad, aperture: ow.aperture.map(a => a + dx) };
}
// compact horizontal lockup (mark + word + descriptor) for mono / reverse tiles
function lockupSmall(idea, W, theme) {
  const t = THEMES[theme], s = W / UP, mk = 1.18 * W;
  const base = 0.78 * W, blockMid = base - 0.157 * W, markY = blockMid - mk / 2;
  const m = `<g transform="translate(0 ${f(markY)}) scale(${f(mk / 32)})">${mark(idea, 64, theme)}</g>`;
  const wx = mk + 0.24 * W - M.wmInk.x0 * s;
  return { body: m + M.wordmark({ size: W, x: wx, y: base, fill: t.ink }) + M.descriptor({ size: 0.12 * W, x: wx + M.wmInk.x0 * s + 0.01 * W, y: base + 0.40 * W, fill: theme === 'reverse' ? C.inkSoft : C.muted }), w: wx + M.wmInk.x1 * s + 2, h: Math.max(markY + mk, base + 0.46 * W) };
}

// ---------------------------------------------------------------- write SVG masters
const masters = [
  ['01-the-turn.svg', 'Turnout, The Turn, horizontal lockup', lockupTurn(160)],
  ['02-the-seal.svg', 'Turnout, The Seal, horizontal lockup', lockupSeal(160)],
  ['03-the-opening.svg', 'Turnout, The Opening, wordmark lockup', lockupOpen(160)],
];
for (const [file, title, L] of masters) fs.writeFileSync(OUT + file, svgFile(L.body, L.w, L.h, title));
const markFiles = [
  ['01-turn-hero.svg', 'turn', 128, 'color'], ['01-turn-32.svg', 'turn', 32, 'color'], ['01-turn-16.svg', 'turn', 16, 'color'],
  ['01-turn-mono.svg', 'turn', 64, 'mono'], ['01-turn-reverse.svg', 'turn', 64, 'reverse'],
  ['02-seal-full.svg', 'seal', 128, 'color'], ['02-seal-32.svg', 'seal', 32, 'color'], ['02-seal-16.svg', 'seal', 16, 'color'],
  ['02-seal-mono.svg', 'seal', 128, 'mono'], ['02-seal-reverse.svg', 'seal', 128, 'reverse'],
  ['03-opening-hero.svg', 'open', 128, 'color'], ['03-opening-32.svg', 'open', 32, 'color'], ['03-opening-16.svg', 'open', 16, 'color'],
  ['03-opening-mono.svg', 'open', 64, 'mono'], ['03-opening-reverse.svg', 'open', 64, 'reverse'],
];
for (const [file, idea, px, theme] of markFiles) {
  const bg = theme === 'reverse' ? `<rect width="32" height="32" fill="${C.ink}"/>` : '';
  const size = px >= 64 ? 128 : px;
  fs.writeFileSync(OUT + 'marks/' + file, svgFile(bg + mark(idea, px, theme), size, size, `Turnout ${file.replace('.svg', '')}`, '0 0 32 32'));
}

// ---------------------------------------------------------------- page pieces
const IDEAS = {
  turn: { n: '01', name: 'The Turn', kicker: 'Typography. The bold one.' },
  seal: { n: '02', name: 'The Seal', kicker: 'The radar, given a house.' },
  open: { n: '03', name: 'The Opening', kicker: 'Negative space and light.' },
};
const label = s => `<div class="lbl">${s}</div>`;
function ramp(idea) {
  const sizes = [128, 64, 32, 24, 16];
  const note = {
    turn: ['opsz 144 drawing', 'opsz 144 drawing', 'opsz 24 drawing', 'opsz 24 drawing', '16 px master'],
    seal: ['full seal', 'core: rings, sweep', 'core', 'core', '16 px master'],
    open: ['hero drawing', 'hero drawing', '32 px master', '32 px master', '16 px master'],
  }[idea];
  return `<div class="ramp">${sizes.map((px, i) => `<figure>${svgInline(mark(idea, px), px, 'm', '0 0 32 32', `${IDEAS[idea].name} at ${px} px`)}<figcaption>${px}<span>${note[i]}</span></figcaption></figure>`).join('')}</div>`;
}
function pixelView(idea) {
  const svg = svgFile(mark(idea, 16), 16, 16, 'm16', '0 0 32 32').trim();
  return `<div class="pix"><canvas width="16" height="16" data-svg="${encodeURIComponent(svg)}"></canvas><div class="grid16"></div></div>`;
}
function appHeader(idea) {
  return `<div class="appbar"><div class="brand">${svgInline(mark(idea, 20), 20, 'm', '0 0 32 32', 'Turnout')}<span class="wm">Turnout</span></div>` +
    `<nav><a class="on">Tonight</a><a>Campaigns</a><a>Offers</a><a>Venues</a></nav><div class="who"><span class="venue">Bar Lumi&egrave;re</span><span class="av">BL</span></div></div>`;
}
function tab(idea) {
  return `<div class="chrome"><div class="tabs"><div class="tab on">${svgInline(mark(idea, 16), 16, 'fav', '0 0 32 32', 'favicon')}<span>Tonight near the Garden</span><i>&times;</i></div>` +
    `<div class="tab"><span class="gfav"></span><span>Inbox (3)</span><i>&times;</i></div><div class="plus">+</div></div><div class="omni"><span class="lock"></span><span class="url">Turnout</span><span class="sep">/</span><span class="path">tonight</span></div></div>`;
}
function monoTile(idea) {
  const L = lockupSmall(idea, 40, 'mono');
  return `<div class="mono-tile">${svgInline(mark(idea, 64, 'mono'), 64, 'm', '0 0 32 32', 'one colour mark')}<svg viewBox="0 0 ${f(L.w)} ${f(L.h)}" width="${f(L.w * 0.9)}" height="${f(L.h * 0.9)}" role="img" aria-label="one colour lockup">${L.body}</svg></div>`;
}
function revTile(idea) {
  const L = lockupSmall(idea, 40, 'reverse');
  return `<div class="rev-tile">${svgInline(`<rect width="32" height="32" fill="${C.ink}"/>` + mark(idea, 64, 'reverse'), 64, 'm', '0 0 32 32', 'reverse mark')}<svg viewBox="0 0 ${f(L.w)} ${f(L.h)}" width="${f(L.w * 0.9)}" height="${f(L.h * 0.9)}" role="img" aria-label="reverse lockup">${L.body}</svg></div>`;
}
function hero(idea) {
  const L = idea === 'turn' ? lockupTurn(160) : idea === 'seal' ? lockupSeal(160) : lockupOpen(160);
  return `<div class="hero-panel"><svg viewBox="0 0 ${f(L.w)} ${f(L.h)}" style="width:min(100%, ${f(L.w)}px)" role="img" aria-label="${IDEAS[idea].name} lockup">${L.body}</svg></div>`;
}

// ---- applications
function appTurn() {
  const T = M.turnPaths('n144', 16, 16, 28);
  const frame = (k) => {
    if (k === 0) return `<path d="${T.top}" fill="${C.ink}"/>`;
    if (k === 1) return `<path d="${T.top}" fill="${C.ink}"/><g transform="rotate(90 16 16)"><path d="${T.top}" fill="${C.amber}" fill-opacity="0.55"/></g>`;
    return `<path d="${T.top}" fill="${C.ink}"/><path d="${T.bottom}" fill="${C.amber}"/>`;
  };
  const caps = ['0 ms. The arch: the crowd at the arena.', '420 ms. A copy of the n turns about the foot of its stem.', '840 ms. Half a turn: the glass. Hold, fade, repeat.'];
  return `<div class="app app-turn"><div class="live">${svgInline(`<path d="${T.top}" fill="${C.ink}"/><g class="spin"><path d="${T.top}" fill="${C.amber}"/></g>`, 132, 'm', '0 0 32 32', 'loading animation')}<p>Live, 2.8 s loop. Respects reduced motion.</p></div>` +
    `<div class="frames">${[0, 1, 2].map(k => `<figure>${svgInline(frame(k), 76, 'm', '0 0 32 32', 'frame ' + (k + 1))}<figcaption><b>${k + 1}</b>${caps[k]}</figcaption></figure>`).join('')}</div></div>`;
}
function appSeal() {
  const icon = (bg, glyph, name) => `<div class="ic"><span class="sq" style="background:${bg}">${glyph}</span><em>${name}</em></div>`;
  const g = {
    cal: `<svg viewBox="0 0 32 32"><rect x="7" y="9" width="18" height="16" rx="2" fill="none" stroke="#fff" stroke-width="2"/><path d="M7 14H25" stroke="#fff" stroke-width="2"/></svg>`,
    sun: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="6" fill="#fff"/></svg>`,
    book: `<svg viewBox="0 0 32 32"><path d="M9 8H21L23 10V24H9Z" fill="none" stroke="#fff" stroke-width="2"/></svg>`,
    note: `<svg viewBox="0 0 32 32"><path d="M9 11H23M9 16H23M9 21H18" stroke="#fff" stroke-width="2"/></svg>`,
    cam: `<svg viewBox="0 0 32 32"><rect x="7" y="11" width="18" height="13" rx="2" fill="none" stroke="#fff" stroke-width="2"/><circle cx="16" cy="17.5" r="3.5" fill="none" stroke="#fff" stroke-width="2"/></svg>`,
    till: `<svg viewBox="0 0 32 32"><path d="M8 22H24M10 22V12H22V22" fill="none" stroke="#fff" stroke-width="2"/></svg>`,
    msg: `<svg viewBox="0 0 32 32"><path d="M8 10H24V20H8Z" fill="none" stroke="#fff" stroke-width="2"/></svg>`,
    set: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="5" fill="none" stroke="#fff" stroke-width="2"/></svg>`,
  };
  const turnoutIcon = `<div class="ic"><span class="sq tq">${svgInline(`<g transform="translate(3.2 3.2) scale(0.8)">${M.sealCore({})}</g>`, 46, '', '0 0 32 32', 'Turnout app icon')}</span><em>Turnout</em></div>`;
  return `<div class="app app-phone"><div class="phone"><div class="status"><b>22:41</b><span>&#9679;&#9679;&#9679;&#9679; 5G</span></div>` +
    `<div class="widget">${svgInline(M.sealCore({}), 40, '', '0 0 32 32', '')}<div><b>The Garden lets out at 22:40</b><span>1,900 people within 6 min. Campaign live.</span></div></div>` +
    `<div class="icons">${icon('#8E9B86', g.cal, 'Calendar')}${icon('#C9A46A', g.sun, 'Weather')}${icon('#7C8DA6', g.book, 'Bookings')}${turnoutIcon}` +
    `${icon('#B98A73', g.note, 'Notes')}${icon('#6F6A62', g.cam, 'Camera')}${icon('#9A8FB0', g.till, 'Till')}${icon('#8AA3A0', g.msg, 'Suppliers')}</div>` +
    `<div class="dock">${['#7C8DA6', '#8E9B86', '#C9A46A', '#6F6A62'].map((c, i) => `<span class="sq" style="background:${c}">${[g.msg, g.cal, g.sun, g.set][i]}</span>`).join('')}</div></div>` +
    `<div class="side"><span class="sq big tq">${svgInline(`<g transform="translate(3.2 3.2) scale(0.8)">${M.sealCore({})}</g>`, 150, '', '0 0 32 32', 'Turnout app icon, large')}</span>` +
    `<p class="cap">Home screen, 22:41. The icon is the seal's core on a paper tile: double rim, one leading edge, the afterglow. The widget is where the sweep earns its keep, and where the full seal would sit on the lock screen.</p></div></div>`;
}
function appOpen() {
  // 1080 x 1080 ad, scaled. Text set live in Fraunces and Inter; the facade, door and light are geometry.
  const doorX0 = 478, doorX1 = 602, wy = 566, ww = 9;
  const light = M.lightPatch({ x0: doorX0, x1: doorX1, y: wy + ww, depth: 360, spread: 120, color: C.amber, max: 0.62, id: 'adlight' });
  const s = 46 / UP;
  const mk = `<g transform="translate(84 930) scale(${f(64 / 32)})">${M.opening({ v: 'm32' })}</g>`;
  const ad = `<svg class="ad" viewBox="0 0 1080 1080" role="img" aria-label="Campaign ad, 1080 by 1080"><rect width="1080" height="1080" fill="${C.paper}"/>` +
    `<text x="84" y="152" class="ad-eyebrow">TONIGHT  &#183;  MADISON SQUARE GARDEN</text>` +
    `<text x="80" y="300" class="ad-h">The Garden lets out</text><text x="80" y="410" class="ad-h">at 22:40.</text>` +
    light + `<path d="M84 ${wy}H${doorX0}V${wy + ww}H84ZM${doorX1} ${wy}H996V${wy + ww}H${doorX1}Z" fill="${C.ink}"/>` +
    `<text x="84" y="690" class="ad-i">Four minutes later,</text><text x="84" y="752" class="ad-i">they are at your door.</text>` +
    `<text x="676" y="680" class="ad-b">Turnout sees the crowd</text><text x="676" y="718" class="ad-b">before it gathers, writes</text><text x="676" y="756" class="ad-b">the offer, and counts who</text><text x="676" y="794" class="ad-b">actually turns up.</text>` +
    mk + M.wordmark({ size: 46, x: 170 - M.wmInk.x0 * s, y: 978, fill: C.ink }) +
    `<text x="996" y="978" text-anchor="end" class="ad-eyebrow">CROWD TO CAMPAIGN</text></svg>`;
  return `<div class="app app-ad">${ad}<div class="side"><p class="cap">1080 &times; 1080 social ad for owners, shown at about half size. The facade line and its open door are the layout: copy above is the street, copy below is the room, and the light falls on the promise. The same frame takes any venue, any time, so every campaign the agent writes is recognisably Turnout without a logo in the middle.</p></div></div>`;
}

// ---- construction drawing for the recommended mark
function construction() {
  const T = M.TURN.n144, Hm = 250, sc = Hm / (T.box.y1 - T.box.y0);
  const W = 560, Hh = 400, cx = 372, cy = 200;
  const tr = d => M.scaleT(d, sc, cx - T.cx * sc, cy);
  const xh = cy - 890 * sc, xhb = cy + 890 * sc;
  const ar = 34, [ax0, ay0] = M.P(cx, cy, ar, 200), [ax1, ay1] = M.P(cx, cy, ar, 340);
  return `<svg class="construct" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Construction of The Turn">
  <g stroke="${C.line}" stroke-width="1"><path d="M20 ${f(xh)}H${W - 20}" stroke-dasharray="3 4"/><path d="M20 ${f(xhb)}H${W - 20}" stroke-dasharray="3 4"/></g>
  <path d="M20 ${f(cy)}H${W - 20}" stroke="${C.muted}" stroke-width="0.8"/>
  <path d="${tr(T.top)}" fill="${C.ink}" fill-opacity="0.06" stroke="${C.ink}" stroke-width="1"/>
  <path d="${tr(T.bottom)}" fill="${C.amber}" fill-opacity="0.08" stroke="${C.amber}" stroke-width="1"/>
  <path d="M${f(ax0)} ${f(ay0)}A${ar} ${ar} 0 0 1 ${f(ax1)} ${f(ay1)}" fill="none" stroke="${C.amber}" stroke-width="1"/>
  <path d="M${f(ax1)} ${f(ay1)}l-7 -1.5M${f(ax1)} ${f(ay1)}l-1.5 7" stroke="${C.amber}" stroke-width="1" fill="none" transform="rotate(14 ${f(ax1)} ${f(ay1)})"/>
  <circle cx="${cx}" cy="${cy}" r="4" fill="${C.paper}" stroke="${C.ink}" stroke-width="1.2"/>
  <g class="ann">
  <text x="24" y="34" class="k">n &#183; Fraunces 500 &#183; opsz 144</text>
  <text x="24" y="${f(xh - 7)}">x-height 0.445 em</text>
  <text x="24" y="${f(cy - 8)}">street line: the n's own baseline</text>
  <text x="24" y="${f(cy + 18)}">pivot: foot of the leaning stem</text>
  <text x="24" y="${f(cy + 34)}">turned 180&#176;, so the mark is point-symmetric</text>
  <text x="24" y="${f(xhb + 18)}">x-height, turned</text>
  <text x="24" y="${Hh - 22}" class="a">the same n, turned: the cup</text>
  </g></svg>`;
}

// ---- React spec for the recommended mark
function reactSpec() {
  const p32 = M.turnPaths('n24', 16, 16, 28), p44 = M.turnPaths('n144', 16, 16, 28);
  const code = `// TurnoutMark.tsx  (viewBox 0 0 32 32, pivot at 16,16, point-symmetric)
// >= 48 px: drawn from Fraunces opsz 144.  20 to 47 px: opsz 24.  < 20 px: 16 px master.
type Props = { size?: number; ink?: string; accent?: string; title?: string };

const ARCH_24 = "${p32.top}";
const CUP_24  = "${p32.bottom}";
const ARCH_144 = "${p44.top}";
const CUP_144  = "${p44.bottom}";

export function TurnoutMark({ size = 20, ink = "var(--ink)", accent = "var(--accent)", title = "Turnout" }: Props) {
  if (size < 20) {
    // 16 px master: one 4-unit (2 px) line, stems on even units, 2-unit slab serifs
    return (
      <svg viewBox="0 0 32 32" width={size} height={size} role="img" aria-label={title}>
        <path d="M6 16V10A5 5 0 0 1 16 10V16" fill="none" stroke={ink} strokeWidth={4} />
        <path d="${M.TURN16.serifTop}" fill={ink} />
        <path d="M16 16V22A5 5 0 0 0 26 22V16" fill="none" stroke={accent} strokeWidth={4} />
        <path d="${M.TURN16.serifBottom}" fill={accent} />
      </svg>
    );
  }
  const big = size >= 48;
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} role="img" aria-label={title}>
      <path d={big ? ARCH_144 : ARCH_24} fill={ink} />
      <path d={big ? CUP_144 : CUP_24} fill={accent} />
    </svg>
  );
}`;
  return code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------- page
const idx = id => {
  const I = IDEAS[id];
  return `<a class="toc-item" href="#${id}"><span class="toc-mark">${svgInline(mark(id, 64), 56, 'm', '0 0 32 32', I.name)}</span><span class="toc-n">${I.n}</span><span class="toc-name">${I.name}</span><span class="toc-k">${I.kicker}</span></a>`;
};
const TEXT = {
  turn: {
    idea: 'The n of Fraunces and the same n turned half a revolution, joined through its leaning stem: an arch standing on the street line, a cup hanging below it. The arch is the arena, the cup is the glass, and Turnout is the turn between them, drawn from the wordmark\'s own letter so the mark and the name speak with one voice.',
    why: 'It is the only mark of the three that survives the gesture it names: turn it upside down and it is still Turnout. It needs no picture of a crowd, no screen, no icon; a typographer would recognise the n in a second, and everyone else sees a line that goes in and comes out warm.',
    fail: 'Read left to right it spells "nu", French for naked, and someone will make that joke once. It carries no radar, so the product\'s first screen has to do that job.',
  },
  seal: {
    idea: 'A brasserie seal, the kind pressed into a menu or the back of a matchbook, whose inner field is a working radar: rings, one crisp leading edge, and an afterglow that runs on into the lettering, so the letters the sweep has just passed are still warm. It reads TURN in ink and OUT in amber, because that is what the radar just saw.',
    why: 'It keeps everything you liked in the radar sheets and gives it a house: premium, hospitable, something an owner would frame behind the bar. Below 96 px it sheds its words and becomes the plain radar, so the small sizes are already proven.',
    fail: 'It is the most expected of the three: seals are a known hospitality device, and at 24 px it is one more radar icon among many.',
  },
  open: {
    idea: 'Turnout is two words, turn and out; we open a door between them. The baseline becomes a facade seen from above, it breaks where the door is, and the afterglow becomes what it always wanted to be: warm light falling through an open door onto the pavement. Cropped, that doorway is a T: the crossbar is the wall, the stem is the light.',
    why: 'It is the only idea that shows outside and inside at once, and it hands the brand a layout gesture (one line, one opening, one pool of light) that scales from a favicon to every campaign the agent publishes.',
    fail: 'Splitting the name is a real risk: some will read "Turn out" as an instruction, and alone at 24 px the T of light can look like a T running out of ink.',
  },
};
const NUMS = {
  turn: `<dt>Letter</dt><dd>Fraunces n, wght 500, opsz 144 (24 at 20 to 47 px)</dd><dt>Turn</dt><dd>180&#176; about the foot of the leaning stem</dd><dt>Lean</dt><dd>${M.TURN.n144.lean.toFixed(1)}&#176;, the font's own</dd><dt>Height</dt><dd>2 x-heights; in the lockup the arch is cap height and the cup hangs to the descriptor</dd><dt>Colour</dt><dd>arch ink #17150F, cup amber #B4530A</dd>`,
  seal: `<dt>Rings</dt><dd>r 154 / 148.5 / 113 / 70 of 320; 2.6, 0.9, 1.6, 0.9 at 55%</dd><dt>Edge</dt><dd>64&#176; from 12 o'clock, 2.2, amber</dd><dt>Afterglow</dt><dd>116&#176;, to 32%, 60 baked slices</dd><dt>Rim</dt><dd>Fraunces 600 opsz 36; TURNOUT tracked 0.30 em, CROWD TO CAMPAIGN 0.20 em</dd><dt>Warm letters</dt><dd>ink mixed to amber by the glow at each letter's angle</dd>`,
  open: `<dt>Wall</dt><dd>3.0 of 32, parted by a 5.2 door (the Fraunces T's stem ratio)</dd><dt>Light</dt><dd>100% to 16% over 22.6 units, 1.4 flare each side</dd><dt>In the word</dt><dd>0.15 em between n and o, facade 0.034 em, light 0.62 em deep</dd><dt>16 px</dt><dd>four bands, 100 / 60 / 36 / 18%</dd><dt>Colour</dt><dd>wall ink, light amber; reverse light #E0955A</dd>`,
};
function section(id) {
  const I = IDEAS[id], X = TEXT[id];
  const app = id === 'turn' ? appTurn() : id === 'seal' ? appSeal() : appOpen();
  const appLabel = { turn: 'Application: loading, three frames and live', seal: 'Application: phone home screen', open: 'Application: 1080 &times; 1080 ad' }[id];
  const pixNote = {
    turn: 'One 2 px line, stems on whole pixel columns, slab serifs one pixel tall. The 7&#176; lean is removed: at this size it is blur, not gesture. Arcs anti-alias, as every curve does.',
    seal: 'Ring 2 px, anti-aliased like every circle. The leading edge is turned to 3 o\'clock so it lands on rows 7 and 8; glow in four baked steps.',
    open: 'Crossbar on rows 2 and 3, door 4 px, light in four bands on whole rows. Every edge is on a pixel: zero partial pixels, verified.',
  }[id];
  return `
<section class="idea" id="${id}">
  <header class="idea-head"><span class="num">${I.n}</span><div><h2>${I.name}</h2><p class="kicker">${I.kicker}</p></div></header>
  ${hero(id)}
  <div class="story"><p class="lede">${X.idea}</p><p class="why">${X.why}</p><p class="fail"><span>Where it fails</span>${X.fail}</p></div>
  <div class="tiles">
    <div class="tile span2">${label('The mark at 128, 64, 32, 24 and 16 px, actual size')}${ramp(id)}</div>
    <div class="tile">${label('16 px master, rendered by your browser, at 800%')}${pixelView(id)}<p class="cap">${pixNote}</p></div>
    <div class="tile span2">${label('App header: 56 px bar, 20 px mark, 20 px Fraunces')}${appHeader(id)}</div>
    <div class="tile">${label('Favicon')}${tab(id)}</div>
    <div class="tile">${label('One colour, ink')}${monoTile(id)}</div>
    <div class="tile">${label('Reverse, on ink')}${revTile(id)}</div>
    <div class="tile">${label('Numbers')}<dl class="nums">${NUMS[id]}</dl></div>
    <div class="tile span3 apptile">${label(appLabel)}${app}</div>
  </div>
</section>`;
}

const css = `
:root{--paper:${C.paper};--panel:${C.panel};--line:${C.line};--line-strong:#CFC7B8;--ink:${C.ink};--text:#2A2721;--muted:${C.muted};--amber:${C.amber};--amber-text:#A54A07}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--text);font:15px/1.55 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1200px;margin:0 auto;padding:0 40px}
.serif{font-family:Fraunces,Georgia,serif}
.mast{display:flex;justify-content:space-between;align-items:center;padding:22px 0;border-bottom:1px solid var(--line);font:600 11px/1 Inter;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.mast b{color:var(--ink);font-weight:600}
.intro{padding:88px 0 56px;display:grid;grid-template-columns:1fr;gap:36px}
.intro h1{font:400 clamp(44px,7.4vw,96px)/0.98 Fraunces,serif;font-variation-settings:"opsz" 144;letter-spacing:-0.025em;color:var(--ink);margin:0;max-width:11ch}
.intro h1 em{font-style:italic;color:var(--amber);font-weight:300}
.pov{font:400 clamp(19px,2.1vw,24px)/1.5 Fraunces,serif;font-variation-settings:"opsz" 24;color:var(--text);max-width:820px;margin:0}
.pov::first-letter{font-size:1em}
.toc{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink);border-bottom:1px solid var(--line);margin:24px 0 0}
.toc-item{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto auto;column-gap:18px;padding:22px 20px 24px 0;text-decoration:none;color:inherit;border-right:1px solid var(--line)}
.toc-item+.toc-item{padding-left:22px}.toc-item:last-child{border-right:0}
.toc-mark{grid-row:1/4;align-self:center}
.toc-n{font:600 11px Inter;letter-spacing:.14em;color:var(--muted);align-self:end}
.toc-name{font:500 26px/1.1 Fraunces,serif;font-variation-settings:"opsz" 72;color:var(--ink);grid-column:2}
.toc-k{grid-column:2;font:400 14px/1.4 Inter;color:var(--muted)}
.idea{padding:104px 0 24px;border-top:1px solid var(--line)}
.idea-head{display:flex;align-items:flex-end;gap:28px;margin-bottom:36px}
.num{font:300 clamp(80px,12vw,150px)/0.8 Fraunces,serif;font-style:italic;font-variation-settings:"opsz" 144;color:var(--amber);letter-spacing:-0.04em}
.idea-head h2{font:500 clamp(36px,5vw,60px)/1 Fraunces,serif;font-variation-settings:"opsz" 144;letter-spacing:-0.02em;color:var(--ink);margin:0 0 8px}
.kicker{margin:0;font:600 11px/1 Inter;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.hero-panel{background:var(--panel);border:1px solid var(--line);border-radius:2px;padding:clamp(28px,7vw,96px) clamp(16px,6vw,80px);display:flex;justify-content:center;align-items:center;min-height:360px}
.hero-panel svg{height:auto;display:block}
.story{display:grid;grid-template-columns:1.25fr 1fr;gap:28px 56px;padding:40px 0 44px}
.lede{font:400 22px/1.45 Fraunces,serif;font-variation-settings:"opsz" 24;color:var(--ink);margin:0;grid-row:1/3}
.why{margin:0;color:var(--text);font-size:15.5px}
.fail{margin:0;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:14.5px}
.fail span{display:block;font:600 10.5px/1 Inter;letter-spacing:.14em;text-transform:uppercase;color:var(--amber-text);margin-bottom:8px}
.tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:var(--line);border:1px solid var(--line)}
.tile{background:var(--paper);padding:22px 22px 24px;min-width:0}
.span2{grid-column:span 2}.span3{grid-column:span 3}
.lbl{font:600 10.5px/1.3 Inter;letter-spacing:.13em;text-transform:uppercase;color:var(--muted);margin-bottom:18px}
.cap{font-size:13px;line-height:1.5;color:var(--muted);margin:14px 0 0}
.ramp{display:flex;align-items:flex-end;gap:clamp(14px,3vw,36px);flex-wrap:wrap}
.ramp figure{margin:0;display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.ramp svg{display:block}
.ramp figcaption{font:600 12px/1.2 Inter;color:var(--ink)}.ramp figcaption span{display:block;font-weight:400;color:var(--muted);font-size:11.5px;margin-top:2px}
.pix{position:relative;width:128px;height:128px;border:1px solid var(--line);background:var(--paper)}
.pix canvas{width:128px;height:128px;image-rendering:pixelated;display:block}
.grid16{position:absolute;inset:0;background-image:linear-gradient(to right,rgba(23,21,15,.08) 1px,transparent 1px),linear-gradient(to bottom,rgba(23,21,15,.08) 1px,transparent 1px);background-size:8px 8px;pointer-events:none}
.appbar{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:var(--paper);border:1px solid var(--line);border-radius:2px;box-shadow:0 1px 0 rgba(23,21,15,.03)}
.brand{display:flex;align-items:center;gap:9px}
.brand svg{display:block}
.wm{font-family:Fraunces,serif;font-weight:500;font-variation-settings:"opsz" 144;letter-spacing:-0.02em;font-size:20px;line-height:1;color:var(--ink)}
.appbar nav{display:flex;gap:22px;font:500 13px Inter;color:var(--muted)}.appbar nav a.on{color:var(--ink);box-shadow:inset 0 -2px 0 var(--amber);padding-bottom:17px;margin-bottom:-19px}
.who{display:flex;align-items:center;gap:10px;font:500 13px Inter;color:var(--ink)}.av{width:28px;height:28px;border-radius:50%;background:#EFEBE3;display:grid;place-items:center;font:600 10.5px Inter;color:var(--muted)}
.chrome{border:1px solid var(--line);border-radius:6px;overflow:hidden;background:#E9E4DA}
.tabs{display:flex;align-items:flex-end;gap:2px;padding:8px 8px 0;height:40px}
.tab{display:flex;align-items:center;gap:8px;height:32px;padding:0 10px 0 12px;border-radius:8px 8px 0 0;font:400 12px Inter;color:#4A463E;min-width:0;flex:0 1 190px;white-space:nowrap}
.tab span{overflow:hidden;text-overflow:ellipsis;flex:1}.tab i{font-style:normal;color:#857E71;font-size:14px}
.tab.on{background:#FFFFFF;color:var(--ink)}.tab .fav{flex:none;display:block}
.gfav{flex:none!important;width:16px;height:16px;border-radius:4px;background:#C9C1B3}
.plus{color:#6B655B;padding:0 6px 8px;font-size:16px}
.omni{background:#FFFFFF;height:38px;display:flex;align-items:center;gap:6px;padding:0 14px;font:400 12.5px Inter;color:#6B655B;border-top:1px solid #FFFFFF}
.omni .url{color:var(--ink)}.lock{width:9px;height:10px;border:1.5px solid #857E71;border-radius:2px;margin-right:4px}
.mono-tile,.rev-tile{display:flex;align-items:center;gap:22px;flex-wrap:wrap}
.rev-tile{background:var(--ink);margin:-4px -6px;padding:22px;border-radius:2px}
.mono-tile svg,.rev-tile svg{max-width:100%;height:auto;display:block}
.apptile{padding-bottom:30px}
.app-turn{display:grid;grid-template-columns:auto 1fr;gap:48px;align-items:center}
.app-turn .live{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 36px;background:var(--panel);border:1px solid var(--line)}
.app-turn .live p{margin:0;font-size:12px;color:var(--muted)}
.frames{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.frames figure{margin:0;display:flex;flex-direction:column;gap:12px}
.frames figcaption{font-size:13px;color:var(--muted);line-height:1.45}.frames b{display:block;font:500 22px Fraunces,serif;color:var(--ink);margin-bottom:2px}
.spin{transform-box:view-box;transform-origin:16px 16px;animation:turn 2.8s cubic-bezier(.65,0,.35,1) infinite}
@keyframes turn{0%,10%{transform:rotate(0);opacity:0}16%{opacity:1}58%{transform:rotate(180deg);opacity:1}86%{transform:rotate(180deg);opacity:1}100%{transform:rotate(180deg);opacity:0}}
@media (prefers-reduced-motion:reduce){.spin{animation:none;transform:rotate(180deg)}}
.app-phone{display:grid;grid-template-columns:auto 1fr;gap:40px;align-items:end}
.phone{width:280px;height:540px;border-radius:44px;padding:16px 18px;background:linear-gradient(170deg,#EFE7DA 0%,#E7D8C3 55%,#DCC6A8 100%);border:8px solid #2A2721;position:relative;box-shadow:0 30px 60px -30px rgba(23,21,15,.35)}
.status{display:flex;justify-content:space-between;font:600 13px Inter;color:var(--ink);padding:2px 10px 14px}.status span{font-size:9px;letter-spacing:1px}
.widget{display:flex;gap:12px;align-items:center;background:rgba(251,249,245,.86);border-radius:20px;padding:12px 14px;margin-bottom:22px}
.widget b{display:block;font:500 13.5px/1.25 Fraunces,serif;font-variation-settings:"opsz" 24;color:var(--ink)}.widget span{font-size:11px;line-height:1.35;color:var(--muted);display:block;margin-top:2px}
.icons{display:grid;grid-template-columns:repeat(4,1fr);row-gap:18px;justify-items:center}
.ic{display:flex;flex-direction:column;align-items:center;gap:5px}.ic em{font-style:normal;font:500 10px Inter;color:#2A2721}
.sq{width:52px;height:52px;border-radius:13px;display:grid;place-items:center}.sq svg{width:32px;height:32px}
.sq.tq{background:var(--paper);box-shadow:0 1px 2px rgba(23,21,15,.18)}.sq.tq svg{width:46px;height:46px}
.sq.big{width:170px;height:170px;border-radius:40px;box-shadow:0 2px 6px rgba(23,21,15,.12),0 20px 40px -24px rgba(23,21,15,.3)}.sq.big svg{width:150px;height:150px}
.side{display:flex;flex-direction:column;gap:24px;align-self:center;max-width:420px}
.nums{margin:0;display:grid;grid-template-columns:86px 1fr;gap:8px 12px;font-size:12.5px;line-height:1.4}.nums dt{color:var(--muted)}.nums dd{margin:0;color:var(--ink)}
.dock{position:absolute;left:14px;right:14px;bottom:14px;height:76px;border-radius:26px;background:rgba(251,249,245,.45);display:flex;justify-content:space-around;align-items:center}
.app-ad{display:grid;grid-template-columns:minmax(0,560px) 1fr;gap:40px;align-items:end}
.ad{width:min(560px,100%);height:auto;border:1px solid var(--line);display:block}
.ad-eyebrow{font:600 22px Inter;letter-spacing:.14em;fill:${C.muted}}
.ad-h{font:500 96px Fraunces,serif;font-variation-settings:"opsz" 144;letter-spacing:-0.02em;fill:${C.ink}}
.ad-i{font:italic 400 46px Fraunces,serif;font-variation-settings:"opsz" 72;fill:${C.ink}}
.ad-b{font:400 25px Inter;fill:${C.muted}}
.rec{padding:110px 0 40px;border-top:1px solid var(--ink)}
.rec h2{font:400 clamp(40px,6vw,76px)/1 Fraunces,serif;font-variation-settings:"opsz" 144;letter-spacing:-0.025em;color:var(--ink);margin:0 0 28px;max-width:16ch}
.rec h2 em{font-style:italic;color:var(--amber);font-weight:300}
.rec-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px 64px}
.rec p{margin:0 0 16px;font-size:16px}.rec .big{font:400 22px/1.45 Fraunces,serif;font-variation-settings:"opsz" 24;color:var(--ink)}
.construct{width:100%;height:auto;background:var(--panel);border:1px solid var(--line)}
.ann text{font:500 11.5px Inter;fill:${C.muted}}.ann .k{fill:${C.ink};font-weight:600}.ann .a{fill:${C.amber};font-weight:600}
.spec{border-top:1px solid var(--ink);margin-top:56px;padding-top:32px;display:grid;grid-template-columns:1fr 2fr;gap:40px}
.spec>*{min-width:0}.spec h3{font:500 28px/1.1 Fraunces,serif;font-variation-settings:"opsz" 72;color:var(--ink);margin:0 0 14px}
.spec dl{margin:0;display:grid;grid-template-columns:150px 1fr;gap:9px 18px;font-size:13.5px}.spec dt{color:var(--muted)}.spec dd{margin:0;color:var(--ink)}
pre{background:#FFFDF9;border:1px solid var(--line);padding:20px 22px;overflow:auto;font:12px/1.6 ui-monospace,SFMono-Regular,Menlo,monospace;color:#2A2721;max-height:520px;margin:0}
.risk{margin-top:48px;background:var(--ink);color:var(--paper);padding:36px 40px;display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:center}
.risk span{font:600 11px Inter;letter-spacing:.14em;text-transform:uppercase;color:${C.amberLight}}
.risk p{margin:0;font:400 21px/1.45 Fraunces,serif;font-variation-settings:"opsz" 24}
.colophon{padding:56px 0 80px;color:var(--muted);font-size:13px;border-top:1px solid var(--line);margin-top:96px;display:grid;grid-template-columns:1fr 1fr;gap:32px}
@media (max-width:900px){.wrap{padding:0 16px}.toc{grid-template-columns:1fr}.toc-item{border-right:0;border-bottom:1px solid var(--line);padding-left:0!important}
.story,.rec-grid,.spec,.colophon{grid-template-columns:1fr}.lede{grid-row:auto}
.tiles{grid-template-columns:1fr}.span2,.span3{grid-column:auto}.app-turn,.app-phone,.app-ad{grid-template-columns:1fr}.frames{grid-template-columns:1fr 1fr 1fr;gap:12px}
.appbar nav,.who .venue{display:none}.mast span:nth-child(2){display:none}.risk{grid-template-columns:1fr;padding:28px 22px}.spec dl{grid-template-columns:110px 1fr}}
`;

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Turnout, Studio B</title>
<meta name="description" content="Studio B: three identity ideas for Turnout, and one recommendation.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
<div class="wrap">
  <div class="mast"><span><b>Studio B</b></span><span>Turnout &#183; identity, final sheet</span><span>19 October 2026</span></div>

  <section class="intro">
    <h1>The name is already a <em>gesture.</em></h1>
    <p class="pov">Turnout is a verb before it is a noun: the moment a crowd turns, out of the arena, round the corner, through somebody's door. The sheets so far drew that moment as a picture inside a 32 pixel circle, and drew it well. We think it belongs in the letters. Turnout will be read in a header beside a serif, on a receipt, on a lock screen at 22:41, by owners who run good rooms and have no patience for software that looks like software; it should feel like a house that has been on the corner for forty years, and it should carry its idea in the type people already read. So we started from Fraunces itself, its leaning n and its hairline T, and from the pavement outside a venue at the hour the doors open. Three ideas follow. One is pure typography and risks being wrong. One is the radar you liked, given a house to live in. One opens a door in the middle of the name.</p>
    <div class="toc">${idx('turn')}${idx('seal')}${idx('open')}</div>
  </section>
${section('turn')}
${section('seal')}
${section('open')}

  <section class="rec" id="recommendation">
    <h2>We recommend <em>The Turn.</em></h2>
    <div class="rec-grid">
      <div>
        <p class="big">It is the one idea here that could only belong to Turnout. The arch and the cup are the same letter, the letter is from the wordmark, and the mark survives the very gesture it names. It is calm at 20 px beside the serif, it is a glyph rather than a pictogram, and it gives the brand a story an owner can repeat across the bar: the arena and the glass are the same shape, turned.</p>
        <p>Keep the radar where it is strongest: as the product's first screen and its loading state, drawn exactly as the sixth sheet left it. The Turn is what Turnout means; the radar is what it does. If you need the radar in the logo itself, The Seal is the fallback and it is ready. The Opening is the gesture we would keep either way, as the layout device for campaigns.</p>
      </div>
      <div>${construction()}<p class="cap">Construction. The two halves meet on the n's own baseline, so the mark has a street line through its middle: outside above, inside below. Ink is the crowd, amber is the room.</p></div>
    </div>

    <div class="spec">
      <div><h3>Geometry for React</h3>
        <dl>
          <dt>viewBox</dt><dd>0 0 32 32, pivot (16, 16), point-symmetric</dd>
          <dt>Mark box</dt><dd>height 28 units (y 2 to 30), width ${f(M.turnPaths('n144', 16, 16, 28).width)} units, centred</dd>
          <dt>Source</dt><dd>Fraunces n, wght 500: opsz 144 at 48 px and up, opsz 24 from 20 to 47 px. Right foot serif removed, stem edges extended ${'14'} font units past the baseline so the halves fuse without a seam.</dd>
          <dt>Stem lean</dt><dd>${M.TURN.n144.lean.toFixed(1)}&#176; (opsz 144), ${M.TURN.n24.lean.toFixed(1)}&#176; (opsz 24)</dd>
          <dt>Colour</dt><dd>arch var(--ink) #17150F, cup var(--accent) #B4530A; one colour: both ink; reverse: arch paper, cup #E0955A</dd>
          <dt>Below 20 px</dt><dd>16 px master: path M6 16V10A5 5 0 0 1 16 10V22A5 5 0 0 0 26 22V16, stroke 4, butt caps, split at (16,16); slab serifs 2 units tall</dd>
          <dt>Header</dt><dd>20 px mark, 9 px gap, 20 px wordmark; mark centred on the bar, cap height of the word centred on the bar</dd>
          <dt>Clear space</dt><dd>half the mark's width on every side</dd>
        </dl>
      </div>
      <pre><code>${reactSpec()}</code></pre>
    </div>

    <div class="risk"><span>The one risk</span><p>There is no radar in it. A founder, an investor or a juror who expects to see the product in the logo will not find it; the mark asks them to read a letter instead of a picture. We think that is the point, and the product's first screen answers them in one second.</p></div>
  </section>

  <footer class="colophon">
    <div>Studio B for Turnout. Every mark is SVG geometry. The wordmark and The Turn are Fraunces outlines (Google Fonts build, wght 500, opsz 144 and 24), read back from the font as paths so the mark and the word come from the same drawing; the seal lettering is Fraunces 600 at opsz 36, the descriptor Inter 600 at 0.14 em. Afterglows are baked, solid slices; the light of The Opening is one linear gradient. No raster anywhere in the marks.</div>
    <div>Files: 01-the-turn.svg, 02-the-seal.svg, 03-the-opening.svg (lockup masters), marks/ (hero, 32 px, 16 px, mono and reverse for each idea), NOTES.md. The 16 px views on this page are rasterised live by your own browser, so what you see is what a favicon will be.</div>
  </footer>
</div>
<script>
// draw each 16 px master at 16 x 16 on a canvas, shown at 800% with a pixel grid
document.querySelectorAll('.pix canvas').forEach(function (cv) {
  var img = new Image();
  img.onload = function () { var x = cv.getContext('2d'); x.clearRect(0, 0, 16, 16); x.drawImage(img, 0, 0, 16, 16); };
  img.src = 'data:image/svg+xml;charset=utf-8,' + cv.getAttribute('data-svg');
});
</script>
</body>
</html>
`;
fs.writeFileSync(OUT + 'index.html', html);
console.log('wrote index.html', (html.length / 1024).toFixed(0) + ' KB');
