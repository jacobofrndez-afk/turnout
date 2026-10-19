// Studio A, Turnout. Generator for every static SVG and for index.html.
// Run: node design/studio-a/generate.mjs   (outputs are plain static SVG/HTML, no runtime JS needed for the marks)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const C = {
  paper: '#F7F4EE', panel: '#FFFFFF', ink: '#17150F', text: '#2A2721', muted: '#6B655B',
  line: '#E4DED3', accent: '#B4530A', accentRev: '#E39A5F', brass: '#C08A3E',
};
const f = n => +(+n).toFixed(2);
const rad = d => d * Math.PI / 180;
// math angle: counter-clockwise from +x, y up
const P = (cx, cy, r, a) => [f(cx + r * Math.cos(rad(a))), f(cy - r * Math.sin(rad(a)))];
const sector = (cx, cy, r, a, b) => {
  const [x0, y0] = P(cx, cy, r, a), [x1, y1] = P(cx, cy, r, b);
  return `M${cx} ${cy}L${x0} ${y0}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 0 ${x1} ${y1}Z`;
};
const arc = (cx, cy, r, a, b) => {
  const [x0, y0] = P(cx, cy, r, a), [x1, y1] = P(cx, cy, r, b);
  return `M${x0} ${y0}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 0 ${x1} ${y1}`;
};
// Afterglow: N stacked sectors that all end on the leading edge. Cumulative opacity follows max*((i+1)/N)^1.35.
function glowOps(N, max) {
  const T = i => (i < 0 ? 0 : max * Math.pow((i + 1) / N, 1.35));
  return Array.from({ length: N }, (_, i) => +(1 - (1 - T(i)) / (1 - T(i - 1))).toFixed(4));
}
function glow(cx, cy, r, edge, span, side, max, N, color) {
  const ops = glowOps(N, max);
  return ops.map((o, i) => {
    const start = edge + side * span * (1 - i / N);
    return `<path d="${sector(cx, cy, r, Math.min(start, edge), Math.max(start, edge))}" fill="${color}" fill-opacity="${o}"/>`;
  }).join('');
}
const mix = (a, b, t) => {
  const h = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
};

// Colour modes
const MODES = {
  color: { line: C.ink, acc: C.accent, glow: C.accent, gk: 1 },
  mono: { line: C.ink, acc: C.ink, glow: C.ink, gk: 0.6 },
  reverse: { line: C.paper, acc: C.accentRev, glow: C.accentRev, gk: 1.25 },
};

// Pixel-honesty checks for the 16 px masters (viewBox 32 => 0.5 px per unit):
// every horizontal or vertical stroke must have both edges on even units, butt caps.
const checks = [];
const hline = (x1, x2, y, w, stroke, tag, op = 1, grid = 2) => {
  if (tag) checks.push({ tag, kind: 'h', grid, edges: [x1, x2, f(y - w / 2), f(y + w / 2)] });
  return `<path d="M${x1} ${y}H${x2}" stroke="${stroke}" stroke-width="${w}"${op < 1 ? ` stroke-opacity="${op}"` : ''}/>`;
};
const vline = (x, y1, y2, w, stroke, tag, grid = 2) => {
  if (tag) checks.push({ tag, kind: 'v', grid, edges: [y1, y2, f(x - w / 2), f(x + w / 2)] });
  return `<path d="M${x} ${y1}V${y2}" stroke="${stroke}" stroke-width="${w}"/>`;
};

/* ---------------------------------------------------------------- I. SWING */
// A radar sector drawn as an architect's door: hinge, leaf (leading edge), swing arc, and the wall it opens through.
const SWING = {
  m: { hy: 25.5, R: 20, wall: 1.7, outer: 1.0, inner: 0.8, innerR: 11.5, innerOp: 0.55, leaf: 1.4, glow: 0.30, N: 16 },
  // 20 px header master: 1 px = 1.6 units; horizontal edges on multiples of 1.6
  h: { hx: 6.4, hy: 26.4, R: 19.2, wx: [1.6, 30.4], wall: 1.6, outer: 1.6, inner: 1.6, innerR: 11.2, innerOp: 0.45, leaf: 1.9, glow: 0.36, N: 12, px: 1.6 },
  s: { hy: 25, R: 20, wall: 2, outer: 2, inner: 0, leaf: 2, glow: 0.34, N: 6 },
};
const SWING_THETA = 58;
function swing(v = 'm', mode = 'color', tag) {
  const g = SWING[v], k = MODES[mode], hx = g.hx ?? 6, hy = g.hy, R = g.R;
  const [wl, wr] = g.wx ?? [2, 30];
  const gr = R - g.outer / 2;
  const [lx, ly] = P(hx, hy, gr, SWING_THETA);
  let s = `<g fill="none" stroke-linecap="butt">`;
  s += glow(hx, hy, gr, SWING_THETA, SWING_THETA, -1, Math.min(0.6, g.glow * k.gk), g.N, k.glow);
  if (g.inner) s += `<path d="${arc(hx, hy, g.innerR, 0, 90)}" stroke="${k.line}" stroke-width="${g.inner}" stroke-opacity="${g.innerOp}"/>`;
  s += `<path d="${arc(hx, hy, R, 0, 90)}" stroke="${k.line}" stroke-width="${g.outer}"/>`;
  s += hline(wl, hx, hy, g.wall, k.line, tag && tag + ' wall L', 1, g.px);
  s += hline(f(hx + R), wr, hy, g.wall, k.line, tag && tag + ' wall R', 1, g.px);
  s += `<path d="M${hx} ${hy}L${lx} ${ly}" stroke="${k.acc}" stroke-width="${g.leaf}"/>`;
  return s + `</g>`;
}

/* ---------------------------------------------------------------- II. COUPE */
// Half a radar hung from a line is a capital T; give it a foot and it is a coupe, filled by the afterglow.
const COUPE = {
  m: { px: 16, py: 6.5, R: 11.5, rim: 1.6, bowl: 1.1, stem: 1.3, leg: 1.3, foot: 1.6, fy: 26, fx: [10.5, 21.5], inner: 0, glow: 0.44, N: 16 },
  // 20 px header master: 1 px = 1.6 units. Rim px row 4, stem px column 9, foot px row 15.
  h: { px: 15.2, py: 7.2, R: 11.2, rim: 1.6, bowl: 1.6, stem: 1.6, leg: 1.6, foot: 1.6, fy: 24.8, fx: [9.6, 20.8], inner: 0, glow: 0.46, N: 12, rimX: [3.2, 27.2], grid: 1.6 },
  s: { px: 15, py: 7, R: 10, rim: 2, bowl: 2, stem: 2, leg: 2, foot: 2, fy: 25, fx: [10, 20], inner: 0, glow: 0.42, N: 6, rimX: [4, 26] },
};
function coupe(v = 'm', mode = 'color', tag) {
  const g = COUPE[v], k = MODES[mode], { px, py, R } = g;
  const gr = R - g.bowl / 2;
  const rx = g.rimX || [f(px - R - g.bowl / 2), f(px + R + g.bowl / 2)];
  let s = `<g fill="none" stroke-linecap="butt">`;
  s += glow(px, py, gr, -90, 90, +1, Math.min(0.6, g.glow * k.gk), g.N, k.glow);
  if (g.inner) s += `<path d="${arc(px, py, g.innerR, 180, 360)}" stroke="${k.line}" stroke-width="${g.inner}" stroke-opacity="${g.innerOp}"/>`;
  s += `<path d="${arc(px, py, R, 180, 360)}" stroke="${k.line}" stroke-width="${g.bowl}"/>`;
  s += hline(g.fx[0], g.fx[1], g.fy, g.foot, k.line, tag && tag + ' foot', 1, g.grid);
  // the sweep (accent) runs from the pivot to the bowl; below the bowl the same line is the glass stem (ink)
  const bowlY = py + R;
  s += vline(px, f(bowlY - g.bowl / 2), f(g.fy - g.foot / 2), g.leg, k.line, tag && tag + ' leg', g.grid);
  s += vline(px, v === 'm' ? py : f(py - g.rim / 2), f(bowlY - g.bowl / 2), g.stem, k.acc, tag && tag + ' sweep', g.grid);
  s += hline(rx[0], rx[1], py, g.rim, k.line, tag && tag + ' rim', 1, g.grid);
  return s + `</g>`;
}

/* ---------------------------------------------------------------- III. OLA */
// The crowd is the radar: one tick per section of seats; the stadium wave stands at the leading edge and sits down behind it.
const OLA = {
  m: { N: 36, off: 0, rin: 9.2, seat: 1.8, peak: 6.4, w: 0.95, tau: 3.4, ant: 0.5, fade: 12 },
  h: { N: 20, off: 9, rin: 8.4, seat: 2.4, peak: 6.8, w: 1.6, tau: 2.0, ant: 0.6, fade: 6 },
  s: { N: 8, off: 22.5, rin: 6.5, seat: 3.0, peak: 8.5, w: 2, tau: 0.8, ant: 0.0, fade: 2, edge: 22.5 },
};
const OLA_EDGE = 50; // clock degrees, clockwise from 12
function ola(v = 'm', mode = 'color', _tag, edge = OLA_EDGE) {
  const g = OLA[v], k = MODES[mode], step = 360 / g.N, cx = 16, cy = 16;
  const seatCol = mode === 'reverse' ? C.paper : C.ink;
  let s = `<g fill="none" stroke-linecap="round" stroke-width="${g.w}">`;
  if (g.edge != null && edge === OLA_EDGE) edge = g.edge;
  const e = g.off + Math.round((edge - g.off) / step) * step; // snap the leading edge onto a tick
  edge = e;
  for (let i = 0; i < g.N; i++) {
    const c = g.off + i * step;
    let d = Math.round(((edge - c) / step % g.N + g.N) % g.N); // steps behind the leading edge
    let len;
    if (d === g.N - 1) len = g.seat + g.ant; // the section just ahead is starting to rise
    else len = g.seat + (g.peak - g.seat) * Math.exp(-d / g.tau);
    const r0 = g.rin, r1 = g.rin + len;
    const x0 = f(cx + r0 * Math.sin(rad(c))), y0 = f(cy - r0 * Math.cos(rad(c)));
    const x1 = f(cx + r1 * Math.sin(rad(c))), y1 = f(cy - r1 * Math.cos(rad(c)));
    const col = mode === 'mono' ? C.ink : (d < g.N - 1 ? mix(k.acc, seatCol, Math.min(1, d / g.fade)) : seatCol);
    s += `<path d="M${x0} ${y0}L${x1} ${y1}" stroke="${col}"/>`;
  }
  return s + `</g>`;
}

const IDEAS = [
  { id: '01-swing', n: 'I', name: 'Swing', fn: swing },
  { id: '02-coupe', n: 'II', name: 'Coupe', fn: coupe },
  { id: '03-ola', n: 'III', name: 'Ola', fn: ola },
];

/* ---------------------------------------------------------------- wrappers */
const FONT_IMPORT = `<style>@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&amp;family=Inter:wght@600&amp;display=swap');</style>`;
const markSvg = (body, size = 32, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32"${extra}>${body}</svg>`;

// Fraunces 500 @ opsz 144, measured in Chrome: cap 0.714 em, x 0.4365 em, "Turnout" ink width 3.112 em at -0.02 em.
const FR = { cap: 0.714, width: 3.112, lsb: 0.0155 };
function lockup(idea, { F = 96, mode = 'color', bg = null, standalone = false } = {}) {
  const k = MODES[mode];
  const textCol = mode === 'reverse' ? C.paper : C.ink;
  const descCol = mode === 'reverse' ? '#B9B1A3' : C.muted;
  const M = 1.3 * F, gap = 0.26 * F, pad = 0.5 * F;
  const D = 0.205 * F;
  const yb = pad + 0.714 * F + 0.06 * F;   // wordmark baseline
  const yd = yb + 0.46 * F;               // descriptor baseline
  const mid = (yb - 0.714 * F + yd) / 2;
  const my = mid - M / 2 + 0.02 * F;
  const tx = pad + M + gap - FR.lsb * F;
  const W = f(pad + M + gap + FR.width * F + pad);
  const H = f(yd + pad * 0.9);
  const body = idea.fn('m', mode);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Turnout, crowd to campaign">` +
    (standalone ? FONT_IMPORT : '') +
    (bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : '') +
    `<svg x="${f(pad)}" y="${f(my)}" width="${f(M)}" height="${f(M)}" viewBox="0 0 32 32" overflow="visible">${body}</svg>` +
    `<text x="${f(tx)}" y="${f(yb)}" font-family="Fraunces, 'Iowan Old Style', Georgia, serif" font-weight="500" font-size="${F}" letter-spacing="${f(-0.02 * F)}" fill="${textCol}" style="font-variation-settings:'opsz' 144">Turnout</text>` +
    `<text x="${f(tx + 0.012 * F)}" y="${f(yd)}" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-weight="600" font-size="${f(D)}" textLength="${f(FR.width * F - 0.03 * F)}" lengthAdjust="spacing" fill="${descCol}">CROWD TO CAMPAIGN</text>` +
    `</svg>`;
}

/* ---------------------------------------------------------------- write SVG masters */
const written = [];
const write = (rel, s) => {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s.startsWith('<?xml') ? s : `<?xml version="1.0" encoding="UTF-8"?>\n${s}\n`);
  written.push(rel);
};
for (const idea of IDEAS) {
  write(`${idea.id}.svg`, `<!-- Turnout, Studio A, ${idea.name}. Hero lockup master on paper. Wordmark: Fraunces 500, opsz 144, -0.02em (live text: outline before print). -->\n` + lockup(idea, { F: 96, bg: C.paper, standalone: true }));
  write(`marks/${idea.id}-32.svg`, markSvg(idea.fn('m', 'color'), 32));
  write(`marks/${idea.id}-20.svg`, markSvg(idea.fn('h', 'color', idea.name + ' 20'), 20));
  write(`marks/${idea.id}-16.svg`, markSvg(idea.fn('s', 'color', idea.name + ' 16'), 16));
  write(`marks/${idea.id}-mono.svg`, markSvg(idea.fn('m', 'mono'), 32));
  write(`marks/${idea.id}-mono-16.svg`, markSvg(idea.fn('s', 'mono'), 16));
  write(`marks/${idea.id}-reverse.svg`, markSvg(`<rect width="32" height="32" fill="${C.ink}"/>` + idea.fn('m', 'reverse'), 32));
}

// pixel check
const onGrid = (e, g) => Math.abs(e / g - Math.round(e / g)) < 1e-6;
const bad = checks.filter(c => !c.edges.every(e => onGrid(e, c.grid || 2)));
const pixelReport = checks.map(c => `${c.tag}: ${c.kind === 'h' ? 'x' : 'y'} ${c.edges[0]}..${c.edges[1]}, ${c.kind === 'h' ? 'y' : 'x'} ${c.edges[2]}..${c.edges[3]} (grid ${c.grid || 2} units = 1 px) ${bad.includes(c) ? 'FAIL' : 'ok'}`);
if (bad.length) { console.error('PIXEL CHECK FAILED', bad); process.exitCode = 1; }

export { C, IDEAS, MODES, lockup, markSvg, swing, coupe, ola, SWING, COUPE, OLA, SWING_THETA, OLA_EDGE, glowOps, P, arc, sector, f, glow, written, pixelReport, write, FR, mix };

if (process.argv.includes('--masters-only')) console.log(written.join('\n') + '\n' + pixelReport.join('\n'));
