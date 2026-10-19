// Studio B, Turnout. Mark geometry. Every coordinate here is written by hand or derived
// from Fraunces outlines (glyphs.json). Outputs are static SVG strings.
import fs from 'fs';
const G = JSON.parse(fs.readFileSync(new URL('./glyphs.json', import.meta.url)));

export const C = {
  paper: '#F7F4EE', panel: '#FBF9F5', line: '#E4DED3', ink: '#17150F', muted: '#6B655B',
  amber: '#B4530A', amberLight: '#E0955A', inkSoft: '#A8A196', glowPaper: '#F3E3D1',
};
const f = n => (Math.abs(n) < 1e-9 ? 0 : +n.toFixed(2));
const rad = d => (d * Math.PI) / 180;

// ---------- path utilities ----------
// Transform every coordinate pair of an M/L/C/Z/h/v path (absolute, as produced by the extractor).
export function tx(d, fn) {
  return d.replace(/([MLC])([^MLCZhv]*)|([hv])(-?[\d.]+)/g, (m, cmd, args, hv, val) => {
    if (cmd) {
      const n = args.trim().split(/[\s,]+/).map(Number); const out = [];
      for (let i = 0; i < n.length; i += 2) { const [x, y] = fn(n[i], n[i + 1]); out.push(f(x) + ' ' + f(y)); }
      return cmd + out.join(' ');
    }
    return m; // h/v only appear in Inter rectangles, handled by rectsToAbs before tx
  });
}
function rectsToAbs(d) {
  return d.replace(/M(-?[\d.]+) (-?[\d.]+)h(-?[\d.]+)v(-?[\d.]+)h(-?[\d.]+)Z/g, (m, x, y, w, h) => {
    x = +x; y = +y; w = +w; h = +h; return `M${x} ${y}L${x + w} ${y}L${x + w} ${y + h}L${x} ${y + h}Z`;
  });
}
export const scaleT = (d, s, ox, oy) => tx(rectsToAbs(d), (x, y) => [ox + x * s, oy + y * s]);
const rot180 = (d, cx, cy) => tx(d, (x, y) => [2 * cx - x, 2 * cy - y]);

// screen angles: 0 = 3 o'clock, positive = clockwise (SVG y-down)
export const P = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))];
export function arc(cx, cy, r, a1, a2) {
  const [x1, y1] = P(cx, cy, r, a1), [x2, y2] = P(cx, cy, r, a2);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0, sweep = a2 > a1 ? 1 : 0;
  return `M${f(x1)} ${f(y1)}A${f(r)} ${f(r)} 0 ${large} ${sweep} ${f(x2)} ${f(y2)}`;
}
export function sector(cx, cy, r, a1, a2) {
  const [x1, y1] = P(cx, cy, r, a1), [x2, y2] = P(cx, cy, r, a2);
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0;
  return `M${f(cx)} ${f(cy)}L${f(x1)} ${f(y1)}A${f(r)} ${f(r)} 0 ${large} 1 ${f(x2)} ${f(y2)}Z`;
}
// Afterglow: N stacked sectors all ending at the leading edge; cumulative opacity follows max*((i+1)/N)^g.
export function afterglow(cx, cy, r, edge, span, max, color, N = 14, g = 1.35) {
  let prev = 0, out = '';
  for (let i = 0; i < N; i++) {
    const T = max * Math.pow((i + 1) / N, g);
    const o = 1 - (1 - T) / (1 - prev); prev = T;
    out += `<path d="${sector(cx, cy, r, edge - span * (1 - i / N), edge)}" fill="${color}" fill-opacity="${o.toFixed(4)}"/>`;
  }
  return out;
}
// Baked afterglow: opaque slices painted back to front, each the exact mix of background and glow
// colour. One paint per pixel, so no 8-bit drift from stacking hundreds of faint layers (which
// turns the tail pink in Chrome). Use on a known background (paper, or ink for the reverse).
export function afterglowSolid(cx, cy, r, edge, span, max, color, bg, N = 48, g = 1.35) {
  let out = '';
  for (let i = 0; i < N; i++) {
    const T = max * Math.pow((i + 1) / N, g);
    out += `<path d="${sector(cx, cy, r, edge - span * (1 - i / N), edge)}" fill="${mix(bg, color, T)}"/>`;
  }
  return out;
}
export const glowAt = (a, edge, span, max, g = 1.35) => {
  let d = edge - a; while (d < 0) d += 360; while (d >= 360) d -= 360;
  if (d > span) return 0; return max * Math.pow(1 - d / span, g);
};
export function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// ---------- wordmark ----------
// Fraunces 500, opsz 144, tracking -0.02em, outlines at font units (2000/em), baseline y = 0.
export const WM = G.wordmark;
export const CAP = 1400, XH = 890, UPEM = 2000;
export function wordmark({ size, x = 0, y = 0, fill, skipFirst = false, turnedU = false }) {
  const s = size / UPEM; let out = '';
  const n = WM.glyphs.find(g => g.ch === 'n');
  for (const g of WM.glyphs) {
    if (skipFirst && g === WM.glyphs[0]) continue;
    if (turnedU && g.ch === 'u') {
      // the u drawn as the n turned 180 degrees about its ink centre, placed on the u's ink centre
      const nb = bbox(n.d), ub = bbox(g.d);
      const d = tx(n.d, (px, py) => [(nb.x0 + nb.x1) - px + ((ub.x0 + ub.x1) / 2 - (nb.x0 + nb.x1) / 2), (-XH) - py]);
      out += `<path d="${scaleT(d, s, x + g.x * s, y)}"/>`;
      continue;
    }
    out += `<path d="${scaleT(g.d, s, x + g.x * s, y)}"/>`;
  }
  return `<g fill="${fill}">${out}</g>`;
}
export function bbox(d) {
  const n = rectsToAbs(d).match(/-?[\d.]+/g).map(Number); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); }
  return { x0, x1, y0, y1 };
}
export const wmInk = (() => { const g0 = WM.glyphs[0], gl = WM.glyphs[WM.glyphs.length - 1]; return { x0: bbox(g0.d).x0, x1: gl.x + bbox(gl.d).x1 }; })();
// Descriptor, Inter 600 caps, tracking 0.14em (2048/em)
export function descriptor({ size, x = 0, y = 0, fill }) {
  const D = G.desc, s = size / D.upem;
  return `<g fill="${fill}">${D.glyphs.filter(g => g.d).map(g => `<path d="${scaleT(g.d, s, x + g.x * s, y)}"/>`).join('')}</g>`;
}
export const descWidth = size => { const D = G.desc; const gl = D.glyphs[D.glyphs.length - 1]; return (gl.x + bbox(gl.d).x1) * size / D.upem; };

// =====================================================================
// 01 THE TURN. The Fraunces n, and the same n turned 180 degrees about the foot of its
// right stem. The right-stem foot serif is removed and the stem edges are extended to meet.
// =====================================================================
function turnHalf(glyph) {
  const c = glyph.d.match(/[MLCZ][^MLCZ]*/g);
  const last = s => { const n = s.slice(1).trim().split(/\s+/).map(Number); return [n[n.length - 2], n[n.length - 1]]; };
  // outer edge: end of cmd 35 -> end of cmd 36 ; inner edge: end of cmd 49 -> end of cmd 50 (same topology in every opsz)
  const [ox1, oy1] = last(c[35]), [ox2, oy2] = last(c[36]);
  const [ix2, iy2] = last(c[49]), [ix1, iy1] = last(c[50]);
  const so = (ox2 - ox1) / (oy2 - oy1), si = (ix2 - ix1) / (iy2 - iy1);
  const at = (x, y, s, Y) => x + (Y - y) * s;
  const E = 14; // overlap past the baseline so the two halves fuse without a seam
  const xo0 = at(ox2, oy2, so, 0), xi0 = at(ix2, iy2, si, 0);
  const d = [...c.slice(0, 37), `L${f(at(ox2, oy2, so, E))} ${E}`, `L${f(at(ix2, iy2, si, E))} ${E}`, ...c.slice(50)].join('');
  return { d, cx: (xo0 + xi0) / 2, xo0, xi0, lean: Math.atan(so) * 180 / Math.PI };
}
export const TURN = {};
for (const k of ['n144', 'n24', 'n9']) {
  const h = turnHalf(G[k]);
  const nb = bbox(G[k].d);
  // ink box of the pair: x from n's left serif to its mirror, y from arch top to its mirror
  const x0 = nb.x0, x1 = 2 * h.cx - nb.x0, y0 = nb.y0, y1 = -nb.y0;
  TURN[k] = { ...h, top: h.d, bottom: rot180(h.d, h.cx, 0), box: { x0, x1, y0, y1 } };
}
// Fit a TURN drawing into a square box of side S with height H (mark height), centred.
export function turnPaths(k, cx, cy, H) {
  const T = TURN[k], s = H / (T.box.y1 - T.box.y0);
  const m = d => scaleT(d, s, cx - T.cx * s, cy);
  return { top: m(T.top), bottom: m(T.bottom), s, width: (T.box.x1 - T.box.x0) * s };
}
export function turnMark({ k = 'n144', cx = 16, cy = 16, H = 28, top = C.ink, bottom = C.amber }) {
  const p = turnPaths(k, cx, cy, H);
  if (top === bottom) return `<path d="${p.top}${p.bottom}" fill="${top}"/>`;
  return `<path d="${p.top}" fill="${top}"/><path d="${p.bottom}" fill="${bottom}"/>`;
}
// 16 px master: one 2 px line on the 32 unit grid (4 units), straight stems on even units,
// the lean removed (at 16 px a 7 degree lean is 1.5 px of blur), slab serifs 1 px tall.
export const TURN16 = {
  line: 'M6 16V10A5 5 0 0 1 16 10V22A5 5 0 0 0 26 22V16',
  serifTop: 'M2 14H10V16H2ZM2 6H6V8H2Z',     // foot serif of the n, head spur of the n
  serifBottom: 'M22 16H30V18H22ZM26 24H30V26H26Z', // the same, turned
};
export function turn16({ top = C.ink, bottom = C.amber }) {
  // split the single line at the pivot (16,16): upper half ink, lower half amber
  return `<path d="M6 16V10A5 5 0 0 1 16 10V16" fill="none" stroke="${top}" stroke-width="4"/>` +
    `<path d="${TURN16.serifTop}" fill="${top}"/>` +
    `<path d="M16 16V22A5 5 0 0 0 26 22V16" fill="none" stroke="${bottom}" stroke-width="4"/>` +
    `<path d="${TURN16.serifBottom}" fill="${bottom}"/>`;
}

// =====================================================================
// 02 THE SEAL. A brasserie seal whose inner field is a radar. The sweep's afterglow runs on
// into the rim lettering: the letters it has just passed are still warm.
// Drawn on a 320 unit square, centre (160,160). Angles: phi clockwise from 12 o'clock.
// =====================================================================
export const SEAL = {
  R_out: 154, R_out2: 148.5, R_in: 113, R_ring: 70,
  rbTop: 123.5, rbBot: 140.5, cap: 17, edgePhi: 64, span: 116, max: 0.32,
};
const caps = G.caps; // Fraunces 600 opsz 36, 2000/em
function arcText(text, { r, centerPhi, size, track, dir, colorAt }) {
  const s = size / caps.upem; const gl = [];
  for (const ch of text) {
    if (ch === ' ') { gl.push({ space: true, adv: 0.28 * caps.upem }); continue; }
    const g = caps.glyphs.find(q => q.ch === ch); gl.push(g);
  }
  const advs = gl.map(g => g.adv * s + track * size);
  const L = advs.reduce((a, b) => a + b, 0) - track * size;
  const span = (L / r) * 180 / Math.PI; let acc = 0, out = '';
  gl.forEach((g, i) => {
    const w = g.adv * s; const mid = acc + w / 2; acc += advs[i];
    if (g.space) return;
    const phi = dir > 0 ? centerPhi - span / 2 + (mid / r) * 180 / Math.PI : centerPhi + span / 2 - (mid / r) * 180 / Math.PI;
    const a = phi - 90; const [px, py] = P(160, 160, r, a);
    const rotDeg = dir > 0 ? phi : phi - 180;
    const d = scaleT(g.d, s, -w / 2, 0);
    out += `<path transform="translate(${f(px)} ${f(py)}) rotate(${f(rotDeg)})" d="${d}" fill="${colorAt(phi)}"/>`;
  });
  return { out, span };
}
export function sealFull({ ink = C.ink, accent = C.amber, glow = C.amber, glowMax = SEAL.max, bg = C.paper, mono = false }) {
  const S = SEAL; const e = S.edgePhi - 90;
  const letterColor = phi => mono ? ink : mix(ink, accent, Math.min(1, glowAt(phi, S.edgePhi, S.span, 1, 1.4) * 1.7));
  const top = arcText('TURNOUT', { r: S.rbTop, centerPhi: 0, size: 21, track: 0.30, dir: 1, colorAt: letterColor });
  const bot = arcText('CROWD TO CAMPAIGN', { r: S.rbBot, centerPhi: 180, size: 15.5, track: 0.20, dir: -1, colorAt: () => ink });
  const dia = phi => { const [x, y] = P(160, 160, 132, phi - 90); return `<path d="M${f(x)} ${f(y - 3.4)}L${f(x + 3.4)} ${f(y)}L${f(x)} ${f(y + 3.4)}L${f(x - 3.4)} ${f(y)}Z" fill="${ink}"/>`; };
  return `${afterglowSolid(160, 160, S.R_in - 0.6, e, S.span, glowMax, glow, bg, 60)}` +
    `<circle cx="160" cy="160" r="${S.R_out}" fill="none" stroke="${ink}" stroke-width="2.6"/>` +
    `<circle cx="160" cy="160" r="${S.R_out2}" fill="none" stroke="${ink}" stroke-width="0.9"/>` +
    `<circle cx="160" cy="160" r="${S.R_in}" fill="none" stroke="${ink}" stroke-width="1.6"/>` +
    `<circle cx="160" cy="160" r="${S.R_ring}" fill="none" stroke="${ink}" stroke-width="0.9" stroke-opacity="0.55"/>` +
    `<path d="M160 160L${P(160, 160, S.R_in - 0.8, e).map(f).join(' ')}" stroke="${accent}" stroke-width="2.2" stroke-linecap="butt"/>` +
    top.out + bot.out + dia(90) + dia(270);
}
// Core seal for 24 to 64 px: the double rim survives as two rings, the letters go.
export const SEALCORE = { r1: 14.6, w1: 1.5, r2: 12.4, w2: 0.75, rg: 6.8, wg: 0.75, edgePhi: 64, span: 116, max: 0.36 };
export function sealCore({ ink = C.ink, accent = C.amber, glow = C.amber, glowMax = SEALCORE.max, header = false, bg = C.paper }) {
  const K = SEALCORE, e = K.edgePhi - 90;
  const w1 = header ? 1.7 : K.w1, w2 = header ? 1.3 : K.w2;
  return afterglowSolid(16, 16, K.r2 - 0.3, e, K.span, glowMax, glow, bg, 24) +
    `<circle cx="16" cy="16" r="${K.r1}" fill="none" stroke="${ink}" stroke-width="${w1}"/>` +
    `<circle cx="16" cy="16" r="${K.r2}" fill="none" stroke="${ink}" stroke-width="${w2}"/>` +
    (header ? '' : `<circle cx="16" cy="16" r="${K.rg}" fill="none" stroke="${ink}" stroke-width="${K.wg}" stroke-opacity="0.5"/>`) +
    `<path d="M16 16L${P(16, 16, K.r2 - w2 / 2, e).map(f).join(' ')}" stroke="${accent}" stroke-width="${header ? 1.7 : 1.3}"/>`;
}
// 16 px master: one ring 2 px, the leading edge horizontal (3 o'clock) so it lands on pixel rows,
// a two-step glow in the quadrant it has just swept.
export function seal16({ ink = C.ink, accent = C.amber, glow = C.amber, max = 0.5, bg = C.paper }) {
  return afterglowSolid(16, 16, 11.5, 0, 110, max, glow, bg, 4, 1.1) +
    `<circle cx="16" cy="16" r="13" fill="none" stroke="${ink}" stroke-width="4"/>` +
    `<path d="M16 14H27V18H16Z" fill="${accent}"/>`;
}

// =====================================================================
// 03 THE OPENING. Turnout is two words, turn and out. A door is opened between them: the baseline
// becomes a facade seen from above (a floor plan), it breaks where the door is, and warm light
// falls through the opening onto the pavement. The afterglow, read literally as light.
// =====================================================================
let gid = 0;
// light patch: trapezoid from the aperture (x0..x1 at y) widening by `spread` each side over `depth`
export function lightPatch({ x0, x1, y, depth, spread, color = C.amber, max = 0.6, id }) {
  id = id || 'lt' + (++gid);
  return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y)}" x2="0" y2="${f(y + depth)}">` +
    `<stop offset="0" stop-color="${color}" stop-opacity="${max}"/><stop offset="0.55" stop-color="${color}" stop-opacity="${f(max * 0.32)}"/>` +
    `<stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>` +
    `<path d="M${f(x0)} ${f(y)}H${f(x1)}L${f(x1 + spread)} ${f(y + depth)}H${f(x0 - spread)}Z" fill="url(#${id})"/>`;
}
// The mark is a crop of the wordmark's doorway, and it is a T: the crossbar is the facade wall
// (ink), parted where the door is; the stem is the light falling through it (accent, fading).
// 32 unit grid, proportions of the Fraunces T (width / height 0.86).
export const OPEN = {
  m32: { y: 3.4, wall: 3.0, l: 4.4, r: 27.6, x0: 13.4, x1: 18.6, bottom: 29, spread: 1.4, max: 1, min: 0.16 },
  header: { y: 3.2, wall: 3.6, l: 4.2, r: 27.8, x0: 13.2, x1: 18.8, bottom: 29, spread: 1.4, max: 1, min: 0.22 },
  hero: { y: 3.4, wall: 2.6, l: 4.4, r: 27.6, x0: 13.5, x1: 18.5, bottom: 29, spread: 1.6, max: 1, min: 0.1 },
};
export function opening({ v = 'm32', ink = C.ink, light = C.amber, max, min, id }) {
  const O = OPEN[v]; id = id || 'op' + (++gid);
  const y1 = O.y + O.wall, mx = max ?? O.max, mn = min ?? O.min;
  return `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${f(y1)}" x2="0" y2="${O.bottom}">` +
    `<stop offset="0" stop-color="${light}" stop-opacity="${mx}"/><stop offset="0.45" stop-color="${light}" stop-opacity="${f(mn + (mx - mn) * 0.38)}"/>` +
    `<stop offset="1" stop-color="${light}" stop-opacity="${mn}"/></linearGradient></defs>` +
    `<path d="M${O.x0} ${f(y1)}H${O.x1}L${f(O.x1 + O.spread)} ${O.bottom}H${f(O.x0 - O.spread)}Z" fill="url(#${id})"/>` +
    `<path d="M${O.l} ${O.y}H${O.x0}V${f(y1)}H${O.l}ZM${O.x1} ${O.y}H${O.r}V${f(y1)}H${O.x1}Z" fill="${ink}"/>`;
}
// 16 px master: crossbar 2 px on rows 2-3, parted by a 4 px door; the stem is light in four
// bands on pixel rows, 4 px wide, opacity 1 / 0.6 / 0.36 / 0.18. Every edge lands on a pixel.
export const OPEN16 = {
  wall: 'M2 4H12V8H2ZM20 4H30V8H20Z',
  bands: [['M12 8H20V14H12Z', 1], ['M12 14H20V20H12Z', 0.6], ['M12 20H20V26H12Z', 0.36], ['M12 26H20V30H12Z', 0.18]],
};
export function opening16({ ink = C.ink, light = C.amber, k = 1 }) {
  return OPEN16.bands.map(([d, o]) => `<path d="${d}" fill="${light}" fill-opacity="${f(Math.min(1, o * k))}"/>`).join('') +
    `<path d="${OPEN16.wall}" fill="${ink}"/>`;
}
// Wordmark with the opening: "Turn" and "out" parted by `gap` font units; facade line under the word.
export function openWord({ size, x = 0, y = 0, ink = C.ink, light = C.amber, max = 0.6, gap = 300, wallW = 0.034, wallDrop = 0, depth = 0.62, spread = 0.2, id }) {
  const s = size / UPEM; let out = '';
  WM.glyphs.forEach((g, i) => { out += `<path d="${scaleT(g.d, s, x + (g.x + (i >= 4 ? gap : 0)) * s, y)}"/>`; });
  const n = WM.glyphs[3], o = WM.glyphs[4], t = WM.glyphs[6], T0 = WM.glyphs[0];
  const nR = x + (n.x + bbox(n.d).x1) * s, oL = x + (o.x + gap + bbox(o.d).x0) * s;
  const a0 = nR + 0.012 * size, a1 = oL - 0.012 * size;
  const L = x + bbox(T0.d).x0 * s, R = x + (t.x + gap + bbox(t.d).x1) * s;
  const wy = y + wallDrop * size, ww = wallW * size;
  return {
    svg: lightPatch({ x0: a0, x1: a1, y: wy + ww, depth: depth * size, spread: spread * size, color: light, max, id }) +
      `<path d="M${f(L)} ${f(wy)}H${f(a0)}V${f(wy + ww)}H${f(L)}ZM${f(a1)} ${f(wy)}H${f(R)}V${f(wy + ww)}H${f(a1)}Z" fill="${ink}"/>` +
      `<g fill="${ink}">${out}</g>`,
    width: R - L, left: L, right: R, aperture: [a0, a1], wallBottom: wy + ww,
  };
}
