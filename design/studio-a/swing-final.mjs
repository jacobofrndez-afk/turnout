// Studio A, Turnout. "Swing" final: joint "pivot encastré" (the needle pivots on a round hub set into the end of the
// left wall), identity "Velours": walls, arc and wordmark aubergine #3B1C42, needle wine #84204D, the afterglow one flat
// wine tint #F0E4EA, on the white page #FFFFFF; reversed on the aubergine plate: #F6F1F8, dusty rose #E6A4C2 and the
// plum tint #5A3459.
// Personality "live" (from .tmp/personality): at rest the mark is the master, still; on the home hero the needle swings
// open once, the afterglow trailing behind it; a small wine dot after the word says a crowd near the place is live.
// From "signal", the needle's top is widened (1.05 to 1.35 of the 32 grid), so the wine reads as the signal next to
// aubergine walls.
// Velours, second pass: no gradient and no hairline. The afterglow is the door's swept area drawn as an architect draws
// it, one flat tint between the floor and the needle (the needle colour at 12 % over white, 18 % over the plate, written
// as a solid colour), not a fade; the ring is dropped; the arc is full ink and about two thirds of the walls' weight
// from 32 px up, so mark and word (Big Shoulders 500) carry the same weight.
// Run: node design/studio-a/swing-final.mjs
//   -> marks/01-swing-final-{16,20,32,48,hero,hero-large,hero-large-2x,hero-large-256,hero-large-512,180,mono,
//      mono-256,mono-512,mono-16,reverse,reverse-256,reverse-512,180-reverse}.svg
//      01-swing-final.svg (home hero lockup: hero-large 128, 128 px word), 01-swing-final-lockup-header.svg (the app
//      header lockup: 48 master, 44 px word), 01-swing-final-og.svg (source of src/app/opengraph-image.png),
//      swing-final.html (design sheet), ../../src/components/Logo.tsx, ../../src/app/icon.svg, ../../public/logo.svg
//      (src/app/apple-icon.png and opengraph-image.png are rasterised from the 180 reverse master and the OG card by
//      Chrome: .tmp/velours/logo/pngs.mjs)
// The word is outlines read from wordmark-outlines.json (Big Shoulders 500), so no file depends on a font.
// Size rule: a master is only ever drawn at its native size, or at a whole multiple of it through an integer
// devicePixelRatio. Native sizes: m16 16, m20 20, m32 32, m48 48, hero 64, hero-large 128, 256 and 512 (one geometry,
// the socket hinted per size), one colour and reverse 128, 256 and 512, m180 180 (apple-touch-icon). At those sizes
// every straight edge and every cut lands on a whole device pixel. A curved socket reveal needs 2 device px to read
// clean; where it is 1 px (128, 256, 180) the socket is hinted to the pixel grid instead, so the reveal is a column of
// whole background pixels. A hinted socket is right at devicePixelRatio 1 only: doubled, its 1 px steps become 2 px
// nubs. So each hinted master names a retina twin with the curved socket (128: reveal 0.25, 2 device px; 256: the 512
// socket, reveal 0.125, 2 device px), and the component draws the twin's wall at 1.5 dppx and up.
// Arc rule: from 32 px up the outer arc is full ink, two thirds of the walls' weight rounded to whole device pixels and
// never wider than the needle's top: 1 of the 32 grid at 64 px and up (2 px at 64, 4 px at 128, 8 px at 256), 2 px at
// 48, 1 px at 32, 5 px on the 180 grid. At 20 and 16 px, where walls and needle are 1 px, it is 1 device px of ink at
// 65 % over the page, written as a solid colour (#806B84 on the white page, the --mark-arc token; #B5A6B8 reversed on
// the plate), so the wine needle still leads.
// Every master is checked before it is written: exact geometry guards on the path data it emits, and a pixel model
// that composites each path the way a browser does (one coverage mask per path, painted in order). Mutation self-tests
// undo one joint at a time and the same checks must object. Exit code 1 on any FAIL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(OUT, '../..');
const WM = JSON.parse(fs.readFileSync(path.join(OUT, 'wordmark-outlines.json'), 'utf8')).runs;

/* ================================================================ Velours colours */
// INK: the mark's ink (walls, arc) and the word, aubergine; ACC: the needle, wine; PAPER: the page, white.
const INK = '#3B1C42', ACC = '#84204D', PAPER = '#FFFFFF', WHITE = '#FFFFFF', TEXT = '#3A3342', MUTED = '#635C6D', LINE = '#EFEAF1', LINE_STRONG = '#E4DFE8';
const TITLE = '#1D1424', TONE = '#F6F3F7', PLATE = '#3B1C42', ON_PLATE = '#F6F1F8', ROSE = '#E6A4C2', LILAC = '#CDBBD6';
const ARC_TONE = 0.65;
const RGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const HEX = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (fg, bg, a) => HEX(RGB(fg).map((v, i) => a * v + (1 - a) * RGB(bg)[i]));
const lum = h => RGB(h).map(v => v / 255).map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const ARC_PAPER = mix(INK, PAPER, ARC_TONE), ARC_WHITE = mix(INK, WHITE, ARC_TONE), ARC_REVERSE = mix(ON_PLATE, PLATE, ARC_TONE);
// the afterglow: one flat tint, the needle colour at gk over the ground, written as a solid colour (no opacity, no mask)
const GLOW_K = { color: 0.12, mono: 0.10, reverse: 0.18 };
const MODES = {
  color: { line: INK, acc: ACC, gk: GLOW_K.color, glow: mix(ACC, PAPER, GLOW_K.color), page: PAPER },
  mono: { line: INK, acc: INK, gk: GLOW_K.mono, glow: mix(INK, PAPER, GLOW_K.mono), page: PAPER },
  // reverse, on the aubergine plate: light walls, dusty rose needle, a plum tint for the afterglow
  reverse: { line: ON_PLATE, acc: ROSE, gk: GLOW_K.reverse, glow: mix(ROSE, PLATE, GLOW_K.reverse), page: PLATE, bg: PLATE },
};
const GLOW_PAPER = MODES.color.glow, GLOW_MONO = MODES.mono.glow, GLOW_REVERSE = MODES.reverse.glow;
// the swing ("live"): once, on first draw, closed to rest
const DUR = 900, EASE = [0.33, 1, 0.68, 1], EASE_CSS = `cubic-bezier(${EASE.join(', ')})`;
const arcColour = (q, mode) => (q.tone >= 1 ? MODES[mode].line : mix(MODES[mode].line, MODES[mode].page, q.tone));

const THETA = 58; // final2's leaf angle, degrees above the datum
const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
const r4 = n => +(+n).toFixed(4);
const P2 = p => `${r4(p[0])} ${r4(p[1])}`;
const add = (a, b) => [a[0] + b[0], a[1] + b[1]], sub = (a, b) => [a[0] - b[0], a[1] - b[1]], mul = (a, k) => [a[0] * k, a[1] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1], len = a => Math.hypot(a[0], a[1]), unit = a => mul(a, 1 / len(a));
const angAbout = (C, p) => deg(Math.atan2(C[1] - p[1], p[0] - C[0]));
const at = (C, r, a) => [C[0] + r * Math.cos(rad(a)), C[1] - r * Math.sin(rad(a))];
// polyline points of a circular arc about C, a0 -> a1 degrees (math orientation, y down), first point omitted, equal
// chords of at most `step` degrees; the last point is exact (`end`, or the axis point for 0 and 90)
function arcPts(C, r, a0, a1, step, end) {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / step - 1e-9)), out = [];
  for (let i = 1; i <= n; i++) {
    const a = a0 + (a1 - a0) * i / n;
    let p = at(C, r, a);
    if (i === n) p = end || (a1 === 90 ? [C[0], C[1] - r] : a1 === 0 ? [C[0] + r, C[1]] : p);
    out.push({ a, p });
  }
  return out;
}
const Lp = pts => pts.map(v => `L${P2(v.p || v)}`).join('');
function lineCircle(o, d, C, r) { const f = sub(o, C), b = dot(f, d), q = dot(f, f) - r * r, D = Math.sqrt(b * b - q); return [-b - D, -b + D]; }
function tangents(Q, P, R) {
  const v = sub(Q, P), d = len(v), a = Math.acos(R / d), e = mul(v, 1 / d);
  const rot = t => [e[0] * Math.cos(t) - e[1] * Math.sin(t), e[0] * Math.sin(t) + e[1] * Math.cos(t)];
  return [add(P, mul(rot(a), R)), add(P, mul(rot(-a), R))];
}
const atY = (o, d, y) => add(o, mul(d, (y - o[1]) / d[1]));
const area = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2;
const dPoly = pts => `M${P2(pts[0])}${Lp(pts.slice(1))}Z`;
const orient = (pts, sign) => (Math.sign(area(pts)) === sign ? pts : pts.slice().reverse());
const U58 = [Math.cos(rad(THETA)), -Math.sin(rad(THETA))], N58 = [Math.sin(rad(THETA)), Math.cos(rad(THETA))];

/* ================================================================ masters
   One datum: the wall-top line y = py. Walls hang below it (left x hx-L..hx, right xr..xr+L, xr = hx + rin).
   A = (hx, py) is the centre of the arc and the afterglow. The needle pivots on a hub P inscribed in the
   end of the left wall: tangent to the wall top, the wall bottom and the jamb x = hx, so wall plus hub span L like
   the right wall. The needle's edges are straight and tangent to the hub circle (P, R), width 2R at the hub and wTop
   where they meet the arc's inner edge; its axis runs from P to T, the point where final2's axis met the arc's
   inner edge, so the needle meets the arc where it did. Two joints at the hub:
   - hub (hero-large, 180, mono, reverse): the needle ends in the round hub, set into a socket cut concentric into the
     wall end with a background reveal c all round, at least 1 device px at the native size.
   - pix (hero 64, 48, 32, 20, 16): the reveal would be a fraction of a pixel, so the foot is whole pixels at the wall
     end (outer bottom corner rounded rr), zero clearance; at 16 px the foot is the pixel diagonally above the wall end.
   Arc band r rin..rin+aw about A. tone 1: full ink, one outline with the right wall. tone 0.65: its own solid colour,
   its foot run down under the right wall. Every curve is a fine polyline (Chrome/Skia flattens true SVG arcs coarsely
   enough to move a 1 px edge's coverage by tens of points). Paint order: afterglow, needle, arc, ink (a ring, when a
   master has one, between afterglow and needle; none does in Velours). */
const HUB32 = { P: [5.25, 26.75], taper: { R: 0.75, wTop: 1.35 } };
const G32 = { vb: 32, hx: 6, py: 26, sw: 1.5, L: 4, rin: 20, lw0: 1.2 };
// the arc of the 32 grid from 64 px up: 1 unit, two thirds of the walls' 1.5, full ink
const AW32 = 1;
const M = {
  // The hero-large family shares one geometry (viewBox 32, arc 1 in full ink, hub r 0.75, no ring) and differs only in
  // the socket, hinted for the size it is drawn at:
  // Native 128 (4 px per unit), colour, one colour and reverse. Reveal 0.25 = 1 px, the socket snapped to the 128
  // pixel grid: a curved 1 px reveal smears into grey and pink half-tones at 1x. Retina twin: heroLm256.
  heroL: { ...G32, native: 128, mult: [128], size: 128, aw: AW32, tone: 1, ring: null, poly: 0.5,
    needle: HUB32, foot: { type: 'hub', c: 0.25, cutX: 4.5, snap: 128, tol: 0.1 }, retina: 'heroLm256' },
  // Native 256 (8 px per unit), colour. Reveal 0.125 = 1 px, snapped to the 256 grid. Retina twin: heroL512.
  heroL256: { ...G32, native: 256, mult: [256], size: 256, aw: AW32, tone: 1, ring: null, poly: 0.5,
    needle: HUB32, foot: { type: 'hub', c: 0.125, cutX: 4.5, snap: 256, tol: 0.1 }, retina: 'heroL512' },
  // Native 512 (16 px per unit) and its whole multiples, colour. Reveal 0.125 = 2 px: the true concentric socket.
  heroL512: { ...G32, native: 512, mult: [512, 1024], size: 512, aw: AW32, tone: 1, ring: null, poly: 0.5,
    needle: HUB32, foot: { type: 'hub', c: 0.125, cutX: 4.5 } },
  // One colour and reverse keep the 128 reveal, 0.25, at every size: there the reveal alone separates hub and wall.
  // Native 256 (8 px per unit): reveal 0.25 = 2 px, the true concentric socket. Also the retina twin of the 128 (drawn
  // at 128 CSS px on a 2x screen it is 256 device px), in colour too.
  heroLm256: { ...G32, native: 256, mult: [256, 512], size: 256, aw: AW32, tone: 1, ring: null, poly: 0.5,
    needle: HUB32, foot: { type: 'hub', c: 0.25, cutX: 4.5 } },
  // Native 512 (16 px per unit) and its whole multiples: reveal 0.25 = 4 px, the true concentric socket.
  heroLm512: { ...G32, native: 512, mult: [512, 1024], size: 512, aw: AW32, tone: 1, ring: null, poly: 0.5,
    needle: HUB32, foot: { type: 'hub', c: 0.25, cutX: 4.5 } },
  // Native 64 (2 px per unit). Arc 1 = 2 px full ink, walls 3 px, pixel foot 3 x 3 px.
  hero: { ...G32, native: 64, mult: [64], size: 64, aw: AW32, tone: 1, ring: null, poly: 0.5,
    needle: HUB32, foot: { type: 'pix', box: [4.5, 26, 6, 27.5], rr: 0.5, flow: true, under: 0.25, inset: 0.125 } },
  // Native 180, apple-touch-icon, own grid (1 unit = 1 px) on a flat paper square: the hero-large at 5 px per unit,
  // 20 px margin for the iOS corner mask, every value snapped. Arc 5 px full ink, walls 8 px, hub r 4, reveal 1 px
  // hinted to the pixel grid.
  m180: { vb: 180, native: 180, size: 180, hx: 40, py: 138, sw: 8, L: 20, rin: 100, aw: 5, tone: 1, lw0: 6, ring: null, poly: 0.5, bg: PAPER,
    needle: { P: [36, 142], taper: { R: 4, wTop: 6.75 } }, foot: { type: 'hub', c: 1, cutX: 32, snap: 180, tol: 0.1 } },
  // Native 48, own grid (1 unit = 1 px), the app header. Arc 2 px full ink, walls 3 px, pixel foot 3 x 3 px.
  m48: { vb: 48, native: 48, size: 48, hx: 9, py: 39, sw: 3, L: 6, rin: 30, aw: 2, tone: 1, lw0: 1.8, ring: null, poly: 2,
    needle: { P: [7.5, 40.5], taper: { R: 1.5, wTop: 2.2 } }, foot: { type: 'pix', box: [6, 39, 9, 42], rr: 1, flow: true, under: 0.5, inset: 0.25 } },
  // Native 32 (1 unit = 1 px), the app header on phones. Arc 1 px full ink, walls 2 px, pixel foot 2 x 2 px.
  m32: { ...G32, native: 32, size: 32, sw: 2, aw: 1, tone: 1, ring: null, poly: 2,
    needle: { P: [5, 27], taper: { R: 1, wTop: 1.5 } }, foot: { type: 'pix', box: [4, 26, 6, 28], rr: 0.5, flow: true, under: 0.25, inset: 0.25 } },
  // Native 20, own grid. Arc 1 px at 65 %, walls 1 px, needle 1.2 standing on a 1 px foot.
  m20: { vb: 20, native: 20, size: 20, hx: 4, py: 16, sw: 1, L: 3, rin: 12, aw: 1, tone: ARC_TONE, lw0: 1.2, ring: null, poly: 2,
    needle: { P: [3.5, 16.5], lw: 1.2 }, foot: { type: 'pix', box: [3, 16, 4, 17], rr: 0.5, under: 0.25, inset: 0.25 } },
  // Native 16 (favicon), viewBox 32 drawn at 16 px (1 px = 2 units). Arc 1 px at 65 %, walls and needle 1 px, foot =
  // the pixel diagonally above the wall end.
  m16: { ...G32, native: 16, size: 16, sw: 2, aw: 2, tone: ARC_TONE, lw0: 2, ring: null, poly: 2,
    needle: { P: [7, 25], lw: 2 }, foot: { type: 'pix', box: [6, 24, 8, 26], rr: 0, clip: 24 } },
};
// The CSS sizes the component is drawn at, and the master each one picks.
const SIZES = [[16, 'm16'], [20, 'm20'], [32, 'm32'], [48, 'm48'], [64, 'hero'], [128, 'heroL'], [256, 'heroL256'], [512, 'heroL512']];
const SIZES_ONE = [[128, 'heroL'], [256, 'heroLm256'], [512, 'heroLm512']]; // one colour and reverse, 128 and up
const LABEL = { heroL: 'hero-large 128', heroL256: 'hero-large 256', heroL512: 'hero-large 512', heroLm256: 'one colour 256', heroLm512: 'one colour 512', hero: 'hero', m180: '180 master', m48: '48 master', m32: '32 master', m20: '20 master', m16: '16 master' };
// the master the component picks for a CSS size; one colour and reverse keep the reveal 0.25 at 256 and 512
const pickId = (n, tone = 'color') => (n >= 128 ? (tone !== 'color' ? (n >= 512 ? 'heroLm512' : n >= 256 ? 'heroLm256' : 'heroL') : n >= 512 ? 'heroL512' : n >= 256 ? 'heroL256' : 'heroL') : n >= 64 ? 'hero' : n >= 48 ? 'm48' : n >= 32 ? 'm32' : n >= 20 ? 'm20' : 'm16');
// the wall the component draws for a CSS size at a devicePixelRatio: a hinted master's retina twin at 1.5 dppx and up
const RETINA_DPPX = 1.5;
const RETINA_CSS = `.turnout-ink-2x{display:none}@media (min-resolution:${RETINA_DPPX}dppx),(-webkit-min-device-pixel-ratio:${RETINA_DPPX}){.turnout-ink-1x{display:none}.turnout-ink-2x{display:inline}}`;
const drawnWall = (Q, n, dpr, tone = 'color') => { const id = pickId(n, tone), q = Q[id]; return q.retina && dpr >= RETINA_DPPX ? { id, wallId: q.retina, d: Q[q.retina].wallL } : { id, wallId: id, d: q.wallL }; };

/* ================================================================ build */
function build(id, g) {
  const { hx, py, sw, L, rin, aw, poly } = g;
  const pyB = r4(py + sw), rout = r4(rin + aw), rmid = r4(rin + aw / 2), xr = hx + rin, A = [hx, py];
  // target: where final2's axis (right edge through A at 58 deg, width lw0) meets the arc's inner edge
  const O2 = add(A, mul(N58, -g.lw0 / 2)), T = add(O2, mul(U58, lineCircle(O2, U58, A, rin)[1]));
  const nd = g.needle, P = nd.P;
  const U = unit(sub(T, P)), N = [-U[1], U[0]];
  const theta = deg(Math.atan2(-U[1], U[0]));
  let eL, eR, R = null, TL = null, TR = null;
  if (nd.taper) {
    R = nd.taper.R;
    const Ct = add(P, mul(U, lineCircle(P, U, A, rin)[1]));
    const QL = add(Ct, mul(N, -nd.taper.wTop / 2)), QR = add(Ct, mul(N, nd.taper.wTop / 2));
    TL = tangents(QL, P, R).sort((a, b) => dot(sub(a, P), N) - dot(sub(b, P), N))[0];
    TR = tangents(QR, P, R).sort((a, b) => dot(sub(b, P), N) - dot(sub(a, P), N))[0];
    eL = { o: TL, d: unit(sub(QL, TL)) }; eR = { o: TR, d: unit(sub(QR, TR)) };
  } else {
    eL = { o: add(P, mul(N, -nd.lw / 2)), d: U }; eR = { o: add(P, mul(N, nd.lw / 2)), d: U };
  }
  const topR = g.topFlush ? rin : rmid; // mutation: the needle's top cut flush on the arc's inner edge
  const TLt = add(eL.o, mul(eL.d, lineCircle(eL.o, eL.d, A, topR)[1])), TRt = add(eR.o, mul(eR.d, lineCircle(eR.o, eR.d, A, topR)[1]));
  const TLv = add(eL.o, mul(eL.d, lineCircle(eL.o, eL.d, A, rin)[1])), TRv = add(eR.o, mul(eR.d, lineCircle(eR.o, eR.d, A, rin)[1]));
  const top = arcPts(A, topR, angAbout(A, TLt), angAbout(A, TRt), poly, TRt); // TLt excluded .. TRt
  const XL = atY(eL.o, eL.d, py), XR = atY(eR.o, eR.d, py);
  const F = g.foot, q = { id, ...g, nd, kind: F.type, pyB, rout, rmid, xr, A, T, P, U, N, theta, R, TL, TR, eL, eR, TLt, TRt, TLv, TRv, XL, XR };
  const fstep = 2;
  let needleSubs = [], wallL;
  if (F.type === 'hub') {
    const c = F.c, Rc = R + c, aTL = angAbout(P, TL), aTR = angAbout(P, TR);
    const lower = [TL, ...arcPts(P, R, aTL, aTR + 360, fstep, TR).map(v => v.p)];
    needleSubs.push(orient([...lower, TRt, ...arcPts(A, topR, angAbout(A, TRt), angAbout(A, TLt), poly, TLt).map(v => v.p)], 1));
    // socket: the needle's left edge and the hub offset by c, round to where the socket circle meets x = cutX,
    // then square down to the wall bottom
    const TLc = add(P, mul(sub(TL, P), Rc / R)), XLc = atY(TLc, eL.d, py);
    let sock;
    if (F.snap && c > 0) {
      // the concentric socket hinted to the snap grid: per device row of the wall band, the wall ink ends on the whole
      // pixel nearest the curved socket's mean x in that row, then steps back until the pixel column right of it (the
      // reveal) holds at most `tol` of needle or hub; every wall edge is horizontal or vertical on whole pixels
      const kS = F.snap / g.vb, j0 = Math.round(py * kS), j1 = Math.round(pyB * kS);
      const Ec = [F.cutX, P[1] + Math.sqrt(Rc * Rc - (P[0] - F.cutX) ** 2)];
      const sockX = y => (y <= TLc[1] ? TLc[0] + (y - TLc[1]) * eL.d[0] / eL.d[1] : y <= Ec[1] ? P[0] - Math.sqrt(Math.max(0, Rc * Rc - (y - P[1]) ** 2)) : F.cutX);
      const raspX = y => (y <= TL[1] ? TL[0] + (y - TL[1]) * eL.d[0] / eL.d[1] : Math.abs(y - P[1]) < R ? P[0] - Math.sqrt(R * R - (y - P[1]) ** 2) : Infinity);
      const S = 64, rows = [];
      for (let j = j0; j < j1; j++) {
        const ys = Array.from({ length: S }, (_, i) => (j + (i + 0.5) / S) / kS);
        const want = Math.round(ys.reduce((s, y) => s + sockX(y) * kS, 0) / S);
        const covAt = x => ys.reduce((s, y) => s + Math.min(1, Math.max(0, x + 1 - raspX(y) * kS)), 0) / S;
        let w = want;
        while (covAt(w) > F.tol) w--;
        rows.push({ j, w, want, cov: covAt(w), next: covAt(w + 1) });
      }
      const pts = [[hx - L, py]];
      for (const r of rows) pts.push([r.w / kS, r.j / kS], [r.w / kS, (r.j + 1) / kS]);
      pts.push([hx - L, pyB]);
      // drop repeated and collinear vertices
      const clean = [];
      for (const p of pts) {
        if (clean.length && near(clean.at(-1), p, 1e-12)) continue;
        if (clean.length >= 2) { const a = clean.at(-2), b = clean.at(-1); if ((a[0] === b[0] && b[0] === p[0]) || (a[1] === b[1] && b[1] === p[1])) clean.pop(); }
        clean.push(p);
      }
      wallL = `M${P2(clean[0])}${clean.slice(1).map((p, i) => (p[1] === clean[i][1] ? `H${r4(p[0])}` : `V${r4(p[1])}`)).join('')}Z`;
      q.socket = { c, Rc, snap: F.snap, kS, rows, TLc, XLc: [rows[0].w / kS, py], E: [rows.at(-1).w / kS, pyB], left: Math.min(...rows.map(r => r.w)) / kS };
    } else if (c > 0) {
      const E = [F.cutX, P[1] + Math.sqrt(Rc * Rc - (P[0] - F.cutX) ** 2)], aE = angAbout(P, E) + 360;
      sock = [TLc, ...arcPts(P, Rc, aTL, aE, fstep, E).map(v => v.p), [F.cutX, pyB]];
      q.socket = { c, Rc, TLc, XLc, E, aE, left: P[0] - Rc };
    } else {
      // mutation: no reveal, the wall end follows the hub itself round to the wall bottom
      const B = [P[0], P[1] + R];
      sock = [TLc, ...arcPts(P, R, aTL, 270, fstep, B).map(v => v.p)];
      q.socket = { c: 0, Rc: R, TLc, XLc, E: B, left: P[0] - R };
    }
    if (sock) wallL = `M${hx - L} ${py}H${r4(XLc[0])}${Lp(sock)}H${hx - L}Z`;
  } else {
    const [x0, y0, x1, y1] = F.box, rr = F.rr || 0, clip = F.clip ?? py, Cc = [x1 - rr, y1 - rr];
    const cL = atY(eL.o, eL.d, clip), cR = atY(eR.o, eR.d, clip);
    const corner = rr ? [[x1, y1 - rr], ...arcPts(Cc, rr, 0, -90, 2, [x1 - rr, y1]).map(v => v.p)] : [[x1, y1]];
    const box = orient([[x0, y0], [x1, y0], ...corner, [x0, y1]], 1);
    q.foot = { box: F.box, rr, clip, cL, cR, flow: !!F.flow, Cc };
    if (F.flow) {
      // one outline: the foot's top-left, up the left edge, the top, down the right edge past the datum to the jamb,
      // down the foot's side (outer bottom corner rounded), along the wall bottom
      const yJ = eR.o[1] + (x1 - eR.o[0]) * eR.d[1] / eR.d[0], J = [x1, yJ];
      needleSubs.push(orient([[x0, y0], cL, TLt, ...top.map(v => v.p), J, ...corner, [x0, y1]], 1));
      q.foot.J = J;
    } else {
      needleSubs.push(orient([cL, TLt, ...top.map(v => v.p), cR], 1));
      needleSubs.push(box);
    }
    if (F.under) {
      // hidden strip under the ink at the wall-to-foot edge, inset from the wall's top and bottom edges
      const ins = F.inset ?? 0.25;
      needleSubs.push(orient([[x0 - F.under, y0 + ins], [x0, y0 + ins], [x0, y1 - ins], [x0 - F.under, y1 - ins]], 1));
      q.foot.under = { w: F.under, inset: ins };
    }
    const we = F.flow || F.under ? x0 : (F.box[1] >= py ? x0 : hx);
    q.foot.wallEnd = we;
    wallL = `M${hx - L} ${py}H${we}V${pyB}H${hx - L}Z`;
  }
  const needle = needleSubs.map(dPoly).join('');
  // the motion layer ("live"): a tapered needle turns about its hub P, from closed (deg, its axis on the line through P,
  // lying in the wall band) to rest (0). Hub masters turn their own needle; pixel-foot masters keep the foot box minus
  // its quadrant past P (still) and turn the hull of the hub circle and the leaf. The afterglow turns as a sector about
  // P, one flat tint like the rest state, clipped to the half disc above the datum inside the arc centreline.
  let swing = null;
  if (R) {
    const aTL = angAbout(P, TL), aTR = angAbout(P, TR);
    const hull = orient([TL, ...arcPts(P, R, aTL, aTR + 360, fstep, TR).map(v => v.p), TRt, ...arcPts(A, topR, angAbout(A, TRt), angAbout(A, TLt), poly, TLt).map(v => v.p)], 1);
    const Rs = r4(2 * rout);
    swing = {
      P, deg: r4(theta),
      turn: F.type === 'hub' ? needle : dPoly(hull),
      still: F.type === 'hub' ? null : `M${F.box[0]} ${F.box[1]}H${F.box[2]}V${r4(P[1])}H${r4(P[0])}V${F.box[3]}H${F.box[0]}Z`,
      sector: dPoly([P, at(P, Rs, theta - 80), ...arcPts(P, Rs, theta - 80, theta, 1).map(v => v.p)]),
      clip: dPoly([at(A, rmid, 0), ...arcPts(A, rmid, 0, 180, 1).map(v => v.p)]),
    };
  }
  const band = (r0, r1) => `H${r4(hx + r1)}${Lp(arcPts(A, r1, 0, 90, poly))}V${r4(py - r0)}${Lp(arcPts(A, r0, 90, 0, poly))}`;
  const wallR = `M${xr} ${py}H${xr + L}V${pyB}H${xr}Z`;
  const wallRArc = `M${xr} ${pyB}H${xr + L}V${py}${band(rin, rout)}Z`;
  // the separate arc's foot runs down under the right wall: half the wall, rounded up to whole device pixels
  const kN = g.native / g.vb, ext = g.arcExt ?? Math.min(sw, Math.ceil(sw * kN / 2 - 1e-9) / kN);
  const arcD = `M${xr} ${r4(py + ext)}H${r4(hx + rout)}V${py}${Lp(arcPts(A, rout, 0, 90, poly))}V${r4(py - rin)}${Lp(arcPts(A, rin, 90, 0, poly))}Z`;
  const united = g.tone >= 1 && !g.splitArc;
  const ring = g.ring ? { ...g.ring, ro: r4(g.ring.ri + g.ring.w), d: `M${r4(hx + g.ring.ri)} ${py}${band(g.ring.ri, g.ring.ri + g.ring.w)}Z` } : null;
  // afterglow: floor on the datum from the needle axis, rim on the arc centreline (hidden under the arc), leaf side on
  // the needle axis (hidden under the needle). One flat fill of a solid tint (the door's swept area): no mask, no fade.
  const CB = atY(P, U, py), CM = add(P, mul(U, lineCircle(P, U, A, rmid)[1])), aCM = angAbout(A, CM);
  const rim = arcPts(A, rmid, 0, aCM, poly, CM);
  const region = `M${P2(CB)}H${r4(hx + rmid)}${Lp(rim)}Z`;
  return Object.assign(q, {
    needle, needleSubs, wallL, wallR, wallRArc, arc: united ? null : arcD, united, ink: united ? wallL + wallRArc : wallL + wallR,
    ring, region, rim, CB, CM, ext, swing,
  });
}

/* ================================================================ SVG */
function body(q, mode = 'color', opt = {}) {
  const k = MODES[mode];
  let s = `<path d="${q.region}" fill="${opt.glowFill || k.glow}"/>`;
  if (q.ring) s += `<path d="${q.ring.d}" fill="${k.line}" fill-opacity="${q.ring.op}"/>`;
  s += `<path d="${q.needle}" fill="${k.acc}"/>`;
  if (q.arc) s += `<path d="${q.arc}" fill="${opt.arcFill || arcColour(q, mode)}"/>`;
  if (opt.ink2x) s += `<style>${RETINA_CSS}</style><path class="turnout-ink-1x" d="${q.ink}" fill="${k.line}"/><path class="turnout-ink-2x" d="${opt.ink2x}" fill="${k.line}"/>`;
  else s += `<path d="${q.ink}" fill="${k.line}"/>`;
  return s;
}
function svg(q, size = q.size, mode = 'color', opt = {}) {
  const k = MODES[mode];
  const bg = opt.bg !== undefined ? opt.bg : (k.bg || q.bg);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${q.vb} ${q.vb}"${opt.attrs || ''}>${bg ? `<rect width="${q.vb}" height="${q.vb}" fill="${bg}"/>` : ''}${body(q, mode, opt)}${opt.extra || ''}</svg>`;
}
let UID = 0;
const isvg = (q, size, mode = 'color', opt = {}) => svg(q, size, mode, { ...opt, id: `g${++UID}` });

/* ================================================================ path analysis (absolute M L H V A Z, as written here) */
function arcCentre(p0, p1, r, large, sweep) {
  const x1 = (p0[0] - p1[0]) / 2, y1 = (p0[1] - p1[1]) / 2;
  const h = Math.sqrt(Math.max(0, r * r / (x1 * x1 + y1 * y1) - 1)) * (large !== sweep ? 1 : -1);
  return [(p0[0] + p1[0]) / 2 + h * y1, (p0[1] + p1[1]) / 2 - h * x1];
}
function parsePath(d) {
  const tok = d.match(/[MLHVAZQ]|-?\d*\.?\d+(?:e-?\d+)?/g);
  const subs = []; let cur = null, pt = null, i = 0;
  const num = () => +tok[i++];
  while (i < tok.length) {
    const c = tok[i++];
    if (c === 'M') { pt = [num(), num()]; cur = { start: pt, segs: [] }; subs.push(cur); continue; }
    let p;
    if (c === 'L') p = [num(), num()];
    else if (c === 'H') p = [num(), pt[1]];
    else if (c === 'V') p = [pt[0], num()];
    else if (c === 'Q') { const cp = [num(), num()]; p = [num(), num()]; cur.segs.push({ t: 'Q', a: pt, c: cp, b: p }); pt = p; continue; }
    else if (c === 'A') {
      const r = num(); num(); num(); const large = num(), sweep = num(); p = [num(), num()];
      cur.segs.push({ t: 'A', a: pt, b: p, r, large, sweep, c: arcCentre(pt, p, r, large, sweep) }); pt = p; continue;
    } else if (c === 'Z') { if (Math.hypot(pt[0] - cur.start[0], pt[1] - cur.start[1]) > 1e-12) cur.segs.push({ t: 'L', a: pt, b: cur.start, z: 1 }); pt = cur.start; continue; }
    else throw new Error('unexpected path command ' + c);
    cur.segs.push({ t: 'L', a: pt, b: p }); pt = p;
  }
  return subs;
}
function arcSeg(s, tol) {
  let a0 = Math.atan2(s.a[1] - s.c[1], s.a[0] - s.c[0]), a1 = Math.atan2(s.b[1] - s.c[1], s.b[0] - s.c[0]);
  if (s.sweep) { while (a1 <= a0) a1 += 2 * Math.PI; } else { while (a1 >= a0) a1 -= 2 * Math.PI; }
  const step = 2 * Math.acos(Math.max(-1, 1 - tol / s.r)), n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step)), pts = [];
  for (let i = 1; i < n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([s.c[0] + s.r * Math.cos(a), s.c[1] + s.r * Math.sin(a)]); }
  pts.push(s.b);
  return pts;
}
function polygons(d, tol = 2e-4) {
  return parsePath(d).map(sb => {
    const pts = [sb.start];
    for (const s of sb.segs) {
      if (s.t === 'A') pts.push(...arcSeg(s, tol));
      else if (s.t === 'Q') { for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; pts.push([u * u * s.a[0] + 2 * u * t * s.c[0] + t * t * s.b[0], u * u * s.a[1] + 2 * u * t * s.c[1] + t * t * s.b[1]]); } }
      else pts.push(s.b);
    }
    if (Math.hypot(pts[0][0] - pts.at(-1)[0], pts[0][1] - pts.at(-1)[1]) < 1e-12) pts.pop();
    return pts;
  });
}
const near = (p, q, e = 2e-4) => Math.abs(p[0] - q[0]) < e && Math.abs(p[1] - q[1]) < e;
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
// vertices of a polygon on the circle (C, r): their count and the angular span they cover
function onCircle(poly, C, r, tol = 2e-4) {
  const hit = poly.filter(p => Math.abs(dist(p, C) - r) < tol);
  const angs = hit.map(p => (angAbout(C, p) + 360) % 360).sort((a, b) => a - b);
  let span = 0;
  if (angs.length > 1) { let gap = 360 - angs.at(-1) + angs[0]; for (let i = 1; i < angs.length; i++) gap = Math.max(gap, angs[i] - angs[i - 1]); span = 360 - gap; }
  return { n: hit.length, span, maxStep: angs.length > 1 ? Math.max(...angs.slice(1).map((a, i) => a - angs[i])) : 0 };
}
function section(polys, y) {
  const xs = [];
  for (const poly of polys) for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    if ((A[1] <= y && B[1] > y) || (B[1] <= y && A[1] > y)) xs.push([A[0] + (y - A[1]) * (B[0] - A[0]) / (B[1] - A[1]), B[1] > A[1] ? 1 : -1]);
  }
  xs.sort((p, q) => p[0] - q[0]);
  const spans = []; let w = 0, x0 = 0;
  for (const [x, dw] of xs) { const was = w; w += dw; if (!was && w) x0 = x; else if (was && !w) spans.push([x0, x]); }
  return spans;
}
function inside(polys, p) { let w = 0; for (const poly of polys) for (let i = 0; i < poly.length; i++) { const A = poly[i], B = poly[(i + 1) % poly.length]; if ((A[1] <= p[1]) !== (B[1] <= p[1])) { const x = A[0] + (p[1] - A[1]) * (B[0] - A[0]) / (B[1] - A[1]); if (x > p[0]) w += B[1] > A[1] ? 1 : -1; } } return w !== 0; }
// distance from p to the infinite line through a and b
const lineDist = (p, a, b) => { const u = unit(sub(b, a)); return Math.abs((p[0] - a[0]) * u[1] - (p[1] - a[1]) * u[0]); };
function segDist(p, a, b) {
  const ab = sub(b, a), t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] * ab[0] + ab[1] * ab[1])));
  return Math.hypot(p[0] - a[0] - t * ab[0], p[1] - a[1] - t * ab[1]);
}
// the two long straight edges of a needle polygon
function needleEdges(poly) {
  const segs = poly.map((p, i) => [p, poly[(i + 1) % poly.length]]).filter(([a, b]) => Math.abs(a[1] - b[1]) > 1e-6 && Math.abs(a[0] - b[0]) > 1e-6);
  return segs.sort((s, t) => dist(...t) - dist(...s)).slice(0, 2);
}
// largest chord step (degrees) of the vertices of `poly` on the circle (C, r), within the angle window [a0, a1]
function chordStep(poly, C, r, a0 = -1e9, a1 = 1e9) {
  const angs = poly.filter(p => Math.abs(dist(p, C) - r) < 2e-4).map(p => angAbout(C, p)).filter(a => a >= a0 - 1e-6 && a <= a1 + 1e-6).sort((a, b) => a - b);
  return angs.length > 1 ? Math.max(...angs.slice(1).map((a, i) => a - angs[i])) : Infinity;
}

/* ================================================================ geometry guards, on the emitted path data */
function guards(q, out, opt = {}) {
  const tag = q.id;
  const ok = (cond, j, msg) => { out.push(`${cond ? 'ok  ' : 'FAIL'} ${tag}: ${j} ${msg}`); return cond; };
  const info = (j, msg) => out.push(`info ${tag}: ${j} ${msg}`);
  const { hx, py, pyB, L, xr, rin, rout, rmid, A, P } = q;
  const k = q.native / q.vb, onPx = (v, kk = k) => Math.abs(v * kk - Math.round(v * kk)) < 1e-6;
  const nPolys = polygons(q.needle), main = nPolys[0];
  const wallPoly = polygons(q.wallL)[0];
  const edges = needleEdges(main);
  const [e1, e2] = edges;
  const eLs = e1 && e2 ? (lineDist(P, ...e1) >= 0 && dot(sub(e1[0], P), q.N) < dot(sub(e2[0], P), q.N) ? e1 : e2) : null;
  const eRs = eLs === e1 ? e2 : e1;
  // ---- (a) hub
  if (q.kind === 'hub') {
    const hub = onCircle(main, P, q.R);
    ok(Math.abs(P[1] - q.R - py) < 1e-9 && Math.abs(P[1] + q.R - pyB) < 1e-9 && Math.abs(P[0] + q.R - hx) < 1e-9 && hub.n >= 20 && hub.span > 175, '(a) hub:',
      `the needle ends in a round hub P (${P2(P)}), r ${q.R}, ${hub.n} vertices over ${hub.span.toFixed(1)} deg: tangent to the wall top y ${py}, the wall bottom y ${pyB} and the jamb x ${hx}, so wall plus hub span x ${hx - L}..${hx} like the right wall (${xr}..${xr + L})`);
    const s = q.socket, kc = s.c * k;
    if (s.snap) {
      // hinted socket: a staircase on the native pixel grid that follows the concentric socket r Rc
      const allOn = wallPoly.every(p => onPx(p[0]) && onPx(p[1])), hv = wallPoly.every((p, i) => { const n2 = wallPoly[(i + 1) % wallPoly.length]; return p[0] === n2[0] || p[1] === n2[1]; });
      const maxCov = Math.max(...s.rows.map(r => r.cov)), moved = s.rows.filter(r => r.w !== r.want);
      const nRows = Math.round(q.sw * k);
      ok(s.c > 0 && s.snap === q.native && allOn && hv && s.rows.length === nRows && maxCov <= q.foot.tol + 1e-9 && kc >= 1 - 1e-9, '(a) socket:',
        `the wall end is the concentric socket r ${r4(s.Rc)} (reveal ${s.c}, ${r4(kc)} px) hinted to the ${q.native} px grid: per wall row the ink ends on a whole pixel, x ${s.rows.map(r => r4(r.w / k)).join(' / ')} (device px ${s.rows.map(r => r.w).join(' / ')}, ${moved.length ? `${moved.length} row${moved.length > 1 ? 's' : ''} stepped back from the curve` : 'each the nearest pixel to the curve'}); the reveal column right of it holds at most ${pct(maxCov)} of needle or hub (limit ${pct(q.foot.tol)}); ${wallPoly.length} vertices, every edge horizontal or vertical`);
      const dev = Math.max(...s.rows.map(r => Math.abs(r.w - r.want)));
      ok(dev <= 1, '(a) socket:', `the staircase stays within 1 px of the curved socket in every row (largest step back ${dev} px)`);
    } else {
      const sock = onCircle(wallPoly, P, s.Rc);
      ok(s.c > 0 && sock.n >= 10 && kc >= 2 - 1e-9, '(a) socket:', `the wall end is cut concentric with the hub, r ${r4(s.Rc)} (${sock.n} vertices over ${sock.span.toFixed(1)} deg): a background reveal ${s.c} all round, ${r4(kc)} px at the native ${q.native}${q.mult ? `, ${q.mult.map(n => r4(s.c * n / q.vb)).join(', ')} px at ${q.mult.join(', ')}` : ''} (a curved reveal needs 2 px to read clean)`);
      const par = Math.abs(dot(unit(sub(s.TLc, s.XLc)), q.eL.d)) > 1 - 1e-9, off = lineDist(s.XLc, q.eL.o, add(q.eL.o, q.eL.d));
      ok(par && Math.abs(off - s.c) < 2e-4 && near(wallPoly[1], s.XLc), '(a) socket:', `the wall top stops at x ${r4(s.XLc[0])} and runs down parallel to the needle's left edge, ${r4(off)} off it, into the socket`);
      ok(onPx(s.E[0]) && wallPoly.some(p => near(p, [s.E[0], pyB])) && s.E[1] <= pyB + 1e-9, '(a) socket:', `the socket leaves the circle at x ${s.E[0]} (y ${r4(s.E[1])}) and drops square to the wall bottom on a whole pixel (${r4(s.E[0] * k)} px)`);
    }
  } else {
    const f = q.foot, [x0, y0, x1, y1] = f.box;
    const boxOn = [x0, y0, x1, y1].every(v => onPx(v)) && (!f.rr || onPx(f.rr, 2 * k)); // the corner radius on whole pixels at 2x
    if (f.flow) {
      ok(Math.abs(x1 - hx) < 1e-9 && Math.abs(y0 - py) < 1e-9 && Math.abs(y1 - pyB) < 1e-9 && main.some(p => near(p, [x0, y0])) && main.some(p => near(p, [x0, y1])) && boxOn, '(a) foot:',
        `the needle's foot is the wall's last ${r4((x1 - x0) * k)} px, x ${x0}..${x1}, y ${y0}..${y1}, outer bottom corner rounded ${f.rr} (${r4(f.rr * k)} px), all on whole pixels; the ink wall stops at x ${x0}: wall plus foot span x ${hx - L}..${hx} like the right wall`);
      ok(f.J[1] > py && f.J[1] <= y1 - f.rr + 1e-9 && main.some(p => near(p, f.J)) && f.cL[0] >= x0 - 1e-9, '(a) foot:',
        `the needle's right edge runs on below the datum to the jamb x ${hx} at y ${r4(f.J[1])}, then the foot drops square; its left edge crosses the datum at x ${r4(f.cL[0])}, inside the foot`);
    } else {
      const fb = nPolys[1], sep = fb && Math.min(...fb.map(p => p[0])) === x0 && Math.max(...fb.map(p => p[0])) === x1 && Math.min(...fb.map(p => p[1])) === y0 && Math.max(...fb.map(p => p[1])) === y1;
      ok(sep && boxOn && f.cL[1] === f.clip, '(a) foot:', `foot box x ${x0}..${x1}, y ${y0}..${y1} (device px ${r4(x0 * k)}, ${r4(y0 * k)}) on whole pixels${f.rr ? `, outer bottom corner rounded ${f.rr}` : ''}; the needle stands on it, cut on y ${f.clip}`);
    }
    if (f.under) {
      const u = nPolys.at(-1), inWall = u.every(p => p[0] >= hx - L - 1e-9 && p[0] <= f.wallEnd + 1e-9 && p[1] >= py + f.under.inset - 1e-9 && p[1] <= pyB - f.under.inset + 1e-9);
      ok(inWall, '(a) foot:', `hidden strip x ${r4(f.wallEnd - f.under.w)}..${f.wallEnd} under the ink, ${f.under.inset} inside the wall's top and bottom edges: no paper seam where wall and foot meet at off-grid sizes`);
    }
    ok(polygons(q.wallL)[0].length === 4 && wallPoly.some(p => near(p, [f.wallEnd, py])) && wallPoly.some(p => near(p, [f.wallEnd, pyB])), '(a) wall:', `left wall ink x ${hx - L}..${f.wallEnd}, y ${py}..${pyB}, a plain rectangle`);
  }
  // ---- needle edges and axis
  if (eLs && eRs) {
    const want = q.R ?? q.nd.lw / 2;
    const dL = lineDist(P, ...eLs), dR = lineDist(P, ...eRs);
    ok(Math.abs(dL - want) < 2e-4 && Math.abs(dR - want) < 2e-4, '(a) needle edges:', q.R ? `straight, both tangent to the hub circle (P, ${q.R}): ${r4(dL)} / ${r4(dR)} from P` : `straight and parallel, ${r4(dL)} / ${r4(dR)} either side of P: width ${q.nd.lw}`);
    const dT = [lineDist(q.T, ...eLs), lineDist(q.T, ...eRs)];
    const wTop = dist(q.TLv, q.TRv) * Math.abs(dot(unit(sub(q.TRv, q.TLv)), q.N));
    ok(Math.abs(dT[0] - dT[1]) < 2e-4 && Math.abs(dist(q.T, A) - rin) < 1e-6, '(a) needle axis:', `from P to T (${P2(q.T)}) on the arc's inner edge r ${rin}, ${q.theta.toFixed(3)} deg above the datum, centred between the edges (${r4(dT[0])} / ${r4(dT[1])}); width ${r4(2 * want)} at the hub, ${r4(wTop)} at r ${rin}`);
  } else ok(false, '(a) needle edges:', 'not found');
  // ---- (c) needle top on the arc
  const topC = onCircle(main, A, rmid);
  ok(topC.n >= 2 && near(main.find(p => near(p, q.TLt)) || [NaN, NaN], q.TLt) && main.some(p => near(p, q.TRt)) && rmid > rin && rmid < rout, '(c) needle top:',
    `drawn top on r ${rmid} about A, inside the arc band ${rin}..${rout}: the visible top is cut on the arc's inner edge r ${rin}, ${r4(rmid - rin)} hidden under the arc (half the band), no needle above the arc`);
  // nothing of the needle beyond the arc centreline
  const far = Math.max(...nPolys.flat().map(p => dist(p, A)));
  ok(far <= rmid + 2e-4, '(c) needle top:', `farthest needle point ${r4(far)} from A (arc centreline r ${rmid})`);
  // ---- (b) jamb: arc on the right wall
  const arcPolys = q.united ? polygons(q.wallRArc) : polygons(q.arc);
  const ap = arcPolys[0], inner = onCircle(ap, A, rin), outer = onCircle(ap, A, rout);
  if (q.united) {
    ok(polygons(q.ink).length === 2 && inner.n > 10 && outer.n > 10 && ap.some(p => near(p, [xr, pyB])) && ap.some(p => near(p, [xr + L, py])) && ap.some(p => near(p, [hx + rout, py])), '(b) jamb:',
      `right wall and arc are one ink outline: inner edge r ${rin} leaves the wall corner (${xr}, ${py}) tangent to the jamb face, outer edge r ${rout} lands square on the wall top at x ${r4(hx + rout)}, ${r4(xr + L - hx - rout)} short of the wall end; no seam`);
  } else {
    const foot = ap.filter(p => p[1] > py + 1e-9);
    ok(inner.n > 10 && outer.n > 10 && foot.length === 2 && foot.every(p => p[0] >= xr - 1e-9 && p[0] <= xr + L + 1e-9 && p[1] <= pyB + 1e-9) && (near(foot[0], [xr, r4(py + q.ext)]) || near(foot[1], [xr, r4(py + q.ext)])), '(b) jamb:',
      `the arc stands on the right wall: inner edge r ${rin} meets the jamb face at (${xr}, ${py}), outer edge r ${rout} lands at x ${r4(hx + rout)}; its foot runs on down to y ${r4(py + q.ext)}, under the wall (painted after it): no seam on the datum`);
  }
  // ---- (d) arc top end
  ok(ap.some(p => near(p, [hx, py - rout])) && ap.some(p => near(p, [hx, py - rin])), '(d) arc top end:', `cut on the radius x ${hx}, y ${r4(py - rout)}..${r4(py - rin)}, square to both edges`);
  // ---- weights and tone (the arc rule)
  const bandPx = q.aw * k, wallPx = q.sw * k, fine = q.native <= 20, wTopN = q.nd.taper ? q.nd.taper.wTop : q.nd.lw;
  const tonePx = q.tone >= 1 ? 1 : q.tone, wantPx = fine ? 1 : Math.round(wallPx * 2 / 3);
  ok(Math.abs(bandPx - Math.round(bandPx)) < 1e-9 && Math.abs(bandPx - wantPx) < 1e-9 && (fine ? q.tone === ARC_TONE : q.tone === 1 && q.aw <= wTopN + 1e-9), 'arc rule:',
    `arc band ${rin}..${rout} = ${r4(q.aw)}, ${r4(bandPx)} px at the native ${q.native}${q.mult && q.mult.length > 1 ? ` (${q.mult.map(n => r4(q.aw * n / q.vb)).join(', ')} px at ${q.mult.join(', ')})` : ''}, ${q.tone >= 1 ? 'full ink' : `ink at ${q.tone * 100} %: solid ${ARC_PAPER} on paper, ${ARC_WHITE} on white`}${fine ? ' (20 and 16 px: 1 device px at 65 %, walls and needle being 1 px)' : ` against walls of ${r4(wallPx)} px (two thirds, ${r4(wallPx * 2 / 3)}, rounded to whole pixels) and a needle top of ${r4(wTopN * k)} px: full ink, never wider than the needle`}`);
  if (!q.united) ok(arcColour(q, 'color') === ARC_PAPER && ARC_PAPER === mix(INK, PAPER, 0.65), 'arc rule:', `arc fill ${arcColour(q, 'color')} = ${INK} at 65 % over ${PAPER} (sRGB, rounded), a solid colour so the needle's hidden top cannot show through it`);
  ok(Math.abs(q.pyB - q.py - q.sw) < 1e-9, 'weight:', `walls ${r4(q.pyB - q.py)} thick, hanging below the datum y ${py}`);
  // ---- (e) ring
  if (q.ring) {
    const rp = polygons(q.ring.d)[0], ri = onCircle(rp, A, q.ring.ri), ro = onCircle(rp, A, q.ring.ro);
    const footOk = rp.some(p => near(p, [hx + q.ring.ri, py])) && rp.some(p => near(p, [hx + q.ring.ro, py])), topOk = rp.some(p => near(p, [hx, py - q.ring.ri])) && rp.some(p => near(p, [hx, py - q.ring.ro]));
    ok(ri.n > 10 && ro.n > 10 && footOk && topOk && Math.max(...rp.map(p => p[1])) <= py + 1e-9 && Math.min(...rp.map(p => p[0])) >= hx - 1e-9, '(e) ring ends:',
      `band r ${q.ring.ri}..${q.ring.ro} about A at ${q.ring.op * 100} %: foot cut on the datum, top cut on x ${hx}; painted under the needle`);
    const wRing = q.ring.w * q.ring.op, wArc = q.aw * tonePx;
    ok(wRing <= wArc + 1e-9 && Number.isInteger(q.ring.ri), '(e) ring weight:', `${q.ring.w} x ${q.ring.op} = ${r4(wRing)} against the arc's ${q.aw} x ${tonePx} = ${r4(wArc)}: never heavier than the arc`);
    // the ring band, like the arc band, is whole device pixels wherever the master is drawn: both edges cross the datum
    // and the radius x hx on pixel boundaries, so its two cut ends fill whole pixels at its tone
    const sizesR = q.mult || [q.native], offR = sizesR.flatMap(n => [q.ring.ri, q.ring.ro].filter(v => !onPx(v, n / q.vb)).map(v => `r ${v} at ${n} (${r4(v * n / q.vb)} px)`));
    ok(!offR.length && onPx(q.ring.w) && q.ring.w * k >= 1 - 1e-9, '(e) ring band:', `r ${q.ring.ri}..${q.ring.ro} = ${q.ring.w}, ${r4(q.ring.w * k)} px at the native ${q.native}${sizesR.length > 1 ? ` (${sizesR.map(n => r4(q.ring.w * n / q.vb)).join(', ')} px at ${sizesR.join(', ')})` : ''}, at ${q.ring.op * 100} %: both edges and both cut ends on whole device pixels${offR.length ? ': OFF ' + offR.join(', ') : ''}`);
  }
  // ---- (f) afterglow
  {
    const rg = polygons(q.region)[0], rimC = onCircle(rg, A, rmid);
    const ys = rg.map(p => p[1]), rs = rg.map(p => dist(p, A));
    ok(Math.max(...ys) <= py + 1e-9 && Math.max(...rs) <= rmid + 2e-4 && rimC.n > 4 && near(rg[0], q.CB) && rg.some(p => near(p, [hx + rmid, py])), '(f) afterglow:',
      `one region: floor on the datum y ${py} from x ${r4(q.CB[0])} to ${r4(hx + rmid)}, rim on r ${rmid} about A (under the arc), nothing below the datum or past the arc centreline`);
    const ends = [add(q.CB, mul(q.U, 0.02)), add(q.CM, mul(q.U, -0.02))], hid = ends.every(p => inside(nPolys, p) || (dist(p, A) > rin && dist(p, A) < rout));
    const dIn = Math.min(...[q.CB, q.CM].map(p => Math.min(lineDist(p, q.eL.o, add(q.eL.o, q.eL.d)), lineDist(p, q.eR.o, add(q.eR.o, q.eR.d)))));
    ok(hid && dIn > 0.1 * (q.R ?? q.nd.lw), '(f) afterglow:', `leaf side on the needle axis (${P2(q.CB)})..(${P2(q.CM)}), ${r4(dIn)} inside the needle's edges at its ends: hidden under the needle${q.kind === 'pix' && !q.foot.flow ? ' and its foot' : ''}`);
    // flat: one solid colour per tone, no opacity, no mask, no second shape; quiet against its ground, and the needle
    // reads on it
    const tints = [['colour', GLOW_PAPER, PAPER, ACC], ['one colour', GLOW_MONO, PAPER, INK], ['reverse', GLOW_REVERSE, PLATE, ROSE]];
    const cg = tints.map(([nm, t, bg, fg]) => [nm, t, contrast(t, bg), contrast(fg, t)]);
    ok(polygons(q.region).length === 1 && cg.every(([, , g, n]) => g <= 1.5 && n >= 4.5), '(f) afterglow:',
      `one flat tint, a solid colour (no opacity, no mask, no fade): ${cg.map(([nm, t, g, n]) => `${nm} ${t}, ${g.toFixed(2)}:1 on its ground, needle ${n.toFixed(2)}:1 on it`).join('; ')} (limits 1.5 and 4.5)`);
  }
  // ---- curves are polylines, no SVG arcs
  {
    const all = [q.needle, q.ink, q.arc, q.ring && q.ring.d, q.region].filter(Boolean);
    const anyA = all.some(d => /[AQ]/.test(d));
    const steps = [['arc inner edge', chordStep(ap, A, rin)], ['arc outer edge', chordStep(ap, A, rout)], ['needle top', chordStep(main, A, rmid)], ['afterglow rim', chordStep(polygons(q.region)[0], A, rmid)]];
    if (q.ring) steps.push(['ring inner edge', chordStep(polygons(q.ring.d)[0], A, q.ring.ri)], ['ring outer edge', chordStep(polygons(q.ring.d)[0], A, q.ring.ro)]);
    if (q.kind === 'hub') steps.push(['hub', onCircle(main, P, q.R).maxStep]);
    if (q.kind === 'hub' && !q.socket.snap) steps.push(['socket', onCircle(wallPoly, P, q.socket.Rc).maxStep]);
    const lim = { hub: 2, socket: 2 }, bad = steps.filter(([nm, s]) => !(s <= (lim[nm] || q.poly) + 1e-3 + deg(2e-4 / rin)));
    ok(!anyA && !bad.length, 'curves:', `${steps.length} curved edges are polylines with vertices on their circles, largest steps ${steps.map(([nm, s]) => `${nm} ${s.toFixed(2)}`).join(', ')} deg (limit ${q.poly}, hub and socket 2); no SVG arc or curve commands${bad.length ? ': OVER ' + bad.map(b => b[0]).join(', ') : ''}`);
  }
  // ---- pixel grid
  const E = { datum: py, 'wall bottom': pyB, 'left wall end': hx - L, 'arc and ring top cuts, jamb of the hub': hx, jamb: xr, 'right wall end': xr + L, 'arc inner r': rin, 'arc outer r': rout, 'arc top end': py - rout };
  if (q.ring) Object.assign(E, { 'ring inner r': q.ring.ri, 'ring outer r': q.ring.ro });
  if (q.kind === 'pix') { const [x0, y0, x1, y1] = q.foot.box; Object.assign(E, { 'foot x0': x0, 'foot y0': y0, 'foot x1': x1, 'foot y1': y1, 'ink wall end': q.foot.wallEnd }); }
  else Object.assign(E, { 'socket drop': q.socket.E[0] });
  for (const n of q.mult || [q.native]) {
    const kk = n / q.vb, bad = Object.entries(E).filter(([, v]) => !onPx(v, kk));
    let offHV = [];
    if (n === q.native) {
      const hv = [q.ink, q.arc, q.ring && q.ring.d, q.region].filter(Boolean).flatMap(d => parsePath(d)).flatMap(sb => sb.segs.filter(s => s.t === 'L' && (Math.abs(s.a[0] - s.b[0]) < 1e-12 || Math.abs(s.a[1] - s.b[1]) < 1e-12)));
      offHV = hv.filter(s => (Math.abs(s.a[0] - s.b[0]) < 1e-12 ? !onPx(s.a[0], kk) : !onPx(s.a[1], kk)));
      ok(!bad.length && !offHV.length, `native ${n} px:`, `1 unit = ${r4(kk)} px; ${hv.length} straight edges of ink, arc and afterglow floor and ${Object.keys(E).length} key coordinates on whole pixels${bad.length || offHV.length ? ': OFF ' + [...bad.map(([k2, v]) => `${k2} ${v}`), ...offHV.map(s => `${P2(s.a)}-${P2(s.b)}`)].join(', ') : ''}`);
    } else ok(!bad.length, `at ${n} px:`, `every key coordinate on whole pixels (${r4(kk)} px per unit)${bad.length ? ': OFF ' + bad.map(([k2, v]) => `${k2} ${r4(v * kk)}`).join(', ') : ''}`);
  }
}

/* ================================================================ pixel model
   Two composites of the same layers. "browser": one antialiased coverage mask per path, painted in order with
   source-over, which is what Chrome/Skia does, conflation artefacts included (background seams where two shapes
   abut, hidden colour peeking through a partly covered pixel). "exact": every sub-pixel span composited on its own.
   x coverage is exact (span lengths), y uses 16 sub-rows per pixel. */
function edgesOf(ds, k, n) {
  const rows = Array.from({ length: n }, () => []);
  for (const d of ds) for (const poly of polygons(d, 0.001 / k)) for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    if (A[1] === B[1]) continue;
    const e = [A[0] * k, A[1] * k, B[0] * k, B[1] * k];
    const r0 = Math.max(0, Math.floor(Math.min(e[1], e[3]))), r1 = Math.min(n - 1, Math.floor(Math.max(e[1], e[3])));
    for (let r = r0; r <= r1; r++) rows[r].push(e);
  }
  return rows;
}
function spansAt(E, y, n) {
  const xs = [];
  for (const e of E) { const [x0, y0, x1, y1] = e; if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) xs.push([x0 + (y - y0) * (x1 - x0) / (y1 - y0), y1 > y0 ? 1 : -1]); }
  xs.sort((a, b) => a[0] - b[0]);
  const out = []; let w = 0, a = 0;
  for (const [x, dw] of xs) { const was = w; w += dw; if (!was && w) a = x; else if (was && !w) { const lo = Math.max(0, a), hi = Math.min(n, x); if (hi > lo) out.push([lo, hi]); } }
  return out;
}
function raster(layers, n, vb, base = PAPER, fgI = INK, fgA = ACC, S = 16) {
  const k = n / vb, pap = RGB(base);
  const L = layers.map(l => ({ rgb: RGB(l.col), op: l.op ?? 1, rows: edgesOf(l.ds, k, n) }));
  const cov = L.map(() => new Float64Array(n * n));
  const exact = new Float64Array(n * n * 3);
  for (let j = 0; j < n * S; j++) {
    const y = (j + 0.5) / S, row = Math.floor(j / S), b0 = row * n;
    const sp = L.map(l => spansAt(l.rows[row], y, n));
    const xs = []; for (let p = 0; p <= n; p++) xs.push(p);
    sp.forEach((s, li) => { for (const [a, b] of s) { xs.push(a, b); for (let px = Math.floor(a); px < Math.min(n, Math.ceil(b)); px++) cov[li][b0 + px] += (Math.min(b, px + 1) - Math.max(a, px)) / S; } });
    xs.sort((a, b) => a - b);
    const ptr = sp.map(() => 0);
    for (let t = 0; t + 1 < xs.length; t++) {
      const a = xs[t], b = xs[t + 1];
      if (b - a < 1e-12) continue;
      const mid = (a + b) / 2, px = Math.min(n - 1, Math.floor(mid)), w = (b - a) / S;
      let c0 = pap[0], c1 = pap[1], c2 = pap[2];
      for (let li = 0; li < L.length; li++) {
        const s = sp[li];
        while (ptr[li] < s.length && s[ptr[li]][1] <= mid) ptr[li]++;
        if (ptr[li] < s.length && s[ptr[li]][0] <= mid) { const o = L[li].op, c = L[li].rgb; c0 += (c[0] - c0) * o; c1 += (c[1] - c1) * o; c2 += (c[2] - c2) * o; }
      }
      const o3 = (b0 + px) * 3; exact[o3] += c0 * w; exact[o3 + 1] += c1 * w; exact[o3 + 2] += c2 * w;
    }
  }
  const browser = new Float64Array(n * n * 3);
  for (let i = 0; i < n * n; i++) {
    let c0 = pap[0], c1 = pap[1], c2 = pap[2];
    for (let li = 0; li < L.length; li++) { const a = Math.min(1, cov[li][i]) * L[li].op, c = L[li].rgb; c0 += (c[0] - c0) * a; c1 += (c[1] - c1) * a; c2 += (c[2] - c2) * a; }
    browser[i * 3] = c0; browser[i * 3 + 1] = c1; browser[i * 3 + 2] = c2;
  }
  return { n, k, browser: unmix(browser, n, base, fgI, fgA), exact: unmix(exact, n, base, fgI, fgA) };
}
// split each pixel colour into "ink" and "accent" weights over the background (least squares); with one colour
// (accent = ink) the accent weight is folded into ink
function unmix(img, n, base, fgI, fgA) {
  const P = RGB(base), I = RGB(fgI).map((v, i) => v - P[i]), Aa = RGB(fgA).map((v, i) => v - P[i]);
  const dt = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
  const a11 = dt(I, I), a12 = dt(I, Aa), a22 = dt(Aa, Aa), det = a11 * a22 - a12 * a12;
  const ink = new Float64Array(n * n), amb = new Float64Array(n * n), pap = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) {
    const r = [img[i * 3] - P[0], img[i * 3 + 1] - P[1], img[i * 3 + 2] - P[2]];
    let wi, wa;
    if (Math.abs(det) < 1e-9) { wi = Math.min(1, Math.max(0, dt(I, r) / a11)); wa = 0; }
    else { const b1 = dt(I, r), b2 = dt(Aa, r); wi = Math.min(1, Math.max(0, (a22 * b1 - a12 * b2) / det)); wa = Math.min(1, Math.max(0, (a11 * b2 - a12 * b1) / det)); }
    ink[i] = wi; amb[i] = wa; pap[i] = Math.max(0, 1 - wi - wa);
  }
  return { ink, amb, pap };
}
const layersOf = (q, opaqueOnly, mode = 'color') => {
  const k = MODES[mode];
  return [
    ...(opaqueOnly ? [] : [{ ds: [q.region], col: k.glow }]),
    ...(!opaqueOnly && q.ring ? [{ ds: [q.ring.d], col: k.line, op: q.ring.op }] : []),
    { ds: [q.needle], col: k.acc },
    ...(q.arc ? [{ ds: [q.arc], col: arcColour(q, mode) }] : []),
    { ds: [q.ink], col: k.line },
  ];
};
const pct = v => `${Math.round(v * 100)} %`;
const AA_MAX = 0.10; // off-grid antialiasing allowance; a true seam or peek reaches 15..25 %

function pixelChecks(q, n, out, F, O, opt = {}) {
  const tag = `${q.id}${opt.mode && opt.mode !== 'color' ? ' ' + opt.mode : ''}@${n}`, k = n / q.vb, X = u => u * k;
  const ok = (cond, msg) => { out.push(`${cond ? 'ok  ' : 'FAIL'} ${tag}: ${msg}`); return cond; };
  const info = msg => out.push(`info ${tag}: ${msg}`);
  const isInt = v => Math.abs(v - Math.round(v)) < 1e-6;
  const V = (img, x, y) => (x < 0 || y < 0 || x >= n || y >= n ? 0 : img[y * n + x]);
  const rng = (a, b) => { const r = []; for (let i = Math.round(a); i < Math.round(b); i++) r.push(i); return r; };
  const maxOf = (img, xs, ys) => { let m = 0; for (const y of ys) for (const x of xs) m = Math.max(m, V(img, x, y)); return m; };
  const minOf = (img, xs, ys) => { let m = 1; for (const y of ys) for (const x of xs) m = Math.min(m, V(img, x, y)); return m; };
  const B = F.browser, tone = q.tone >= 1 ? 1 : q.tone;
  const onGrid = [q.py, q.pyB, q.hx, q.hx - q.L, q.xr].every(v => isInt(X(v)));
  // the reveal round the hub: along each ray from P (150..215 deg), from the hub edge to half a pixel past the socket,
  // the best background pixel; the weakest ray is what the eye gets where hub and wall are closest
  const REVEAL_MIN = 0.8;
  const revealRays = () => {
    const s = q.socket; let worst = [9, 0];
    for (let a = 150; a <= 215; a += 5) {
      let best = 0;
      for (let i = 0; i <= 80; i++) { const r = q.R + (s.c + 0.5 / k) * i / 80, p = at(q.P, r, a); best = Math.max(best, V(B.pap, Math.floor(X(p[0])), Math.floor(X(p[1])))); }
      if (best < worst[0]) worst = [best, a];
    }
    return worst;
  };
  if (opt.reveal) {
    // one colour: only the reveal matters here (hub and wall are the same colour)
    const worst = revealRays();
    ok(worst[0] >= REVEAL_MIN, `socket reveal between hub and wall, weakest ray ${pct(worst[0])} background at ${worst[1]} deg, limit ${pct(REVEAL_MIN)} (${r4(q.socket.c * k)} px${q.socket.snap ? `, snapped to the ${q.socket.snap} grid` : ', curved'}; one colour: the reveal alone separates hub and wall)`);
    return;
  }
  if (!onGrid) info(`walls off the pixel grid at this size: straight-edge tests skipped, seam and peek tests below still apply`);
  const yW0 = Math.round(X(q.py)), yW1 = Math.round(X(q.pyB)), wallRows = rng(yW0, yW1);
  if (onGrid) {
    // walls
    const lEnd = q.kind === 'hub' ? Math.min(q.socket.left, q.socket.XLc[0], q.socket.E[0]) : q.foot.wallEnd;
    const lw = rng(X(q.hx - q.L), Math.floor(X(lEnd) + 1e-6)), rw = rng(X(q.xr), X(q.xr + q.L));
    const wmin = Math.min(minOf(B.ink, lw, wallRows), minOf(B.ink, rw, wallRows));
    ok(wmin >= 0.98, `walls: rows ${yW0}..${yW1 - 1} solid ink, left columns ${lw[0]}..${lw.at(-1)}, right ${rw[0]}..${rw.at(-1)} (min ${pct(wmin)})`);
    // the needle's leftmost point inside the device row above the datum (sampled sections of its polygons)
    const nP = polygons(q.needle);
    let cLx = Infinity;
    for (let i = 0; i < 32; i++) { const y = q.py - (i + 0.5) / 32 / k, sp = section(nP, y); if (sp.length) cLx = Math.min(cLx, sp[0][0]); }
    const topL = rng(X(q.hx - q.L), Math.floor(X(Math.min(cLx, q.hx)) + 1e-9)), topR = rng(Math.ceil(X(q.hx + q.rout)), X(q.xr + q.L));
    const dirt = topL.length && topR.length ? Math.max(maxOf(B.ink, [...topL, ...topR], [yW0 - 1]), maxOf(B.amb, [...topL, ...topR], [yW0 - 1])) : 1;
    ok(dirt <= 0.02 && topL.length >= Math.round(X(q.L)) / 2 && topR.length > 0, `wall tops: row ${yW0 - 1} above the datum clean over the left wall (columns ${topL[0]}..${topL.at(-1)}, ${topL.length} of ${Math.round(X(q.L))}; the needle enters the row at x ${r4(cLx)}) and past the arc foot (columns ${topR[0]}..${topR.at(-1)}): max ${pct(dirt)}${topL.length && topR.length ? '' : ': NO COLUMNS TESTED'}`);
    const ends = [Math.round(X(q.hx - q.L)) - 1, Math.round(X(q.xr + q.L))];
    ok(maxOf(B.ink, ends, wallRows) <= 0.02, `wall outer ends cut on whole pixels (outside ${pct(maxOf(B.ink, ends, wallRows))})`);
    const below = Math.max(maxOf(B.ink, rng(0, n), rng(yW1, n)), maxOf(B.amb, rng(0, n), rng(yW1, n)));
    ok(below <= 0.02, `nothing below the wall bottom (row ${yW1} down): max ${pct(below)}`);
    // hub / foot
    if (q.kind === 'hub') {
      let hmin = 1, cnt = 0;
      for (let y = Math.floor(X(q.P[1] - q.R)); y < Math.ceil(X(q.P[1] + q.R)); y++) for (let x = Math.floor(X(q.P[0] - q.R)); x < Math.ceil(X(q.P[0] + q.R)); x++) {
        const cs = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].map(([a, b]) => dist([a / k, b / k], q.P));
        if (Math.max(...cs) <= q.R) { hmin = Math.min(hmin, V(B.amb, x, y)); cnt++; }
      }
      ok(cnt > 0 && hmin >= 0.97, `hub: ${cnt} pixels wholly inside the hub solid wine (min ${pct(hmin)})`);
      const s = q.socket, worst = revealRays();
      ok(worst[0] >= REVEAL_MIN, `socket: background reveal round the hub (150..215 deg), weakest ray ${pct(worst[0])} background at ${worst[1]} deg, limit ${pct(REVEAL_MIN)} (${r4(s.c * k)} px${s.snap ? `, snapped to the ${s.snap} grid` : ', curved'})`);
      if (s.snap) {
        // every wall row: ink solid up to its whole-pixel end, the next pixel column background
        // (at a whole multiple m the reveal is m px wide: its mean and its first pixel are tested)
        const m = n / s.snap; let inkMin = 1, revMin = 1, firstMin = 1, nr = 0;
        if (Number.isInteger(m)) for (const r of s.rows) for (let y = r.j * m; y < (r.j + 1) * m; y++) {
          inkMin = Math.min(inkMin, minOf(B.ink, rng(X(q.hx - q.L), r.w * m), [y]));
          const cols = rng(r.w * m, (r.w + 1) * m);
          revMin = Math.min(revMin, cols.reduce((a, x) => a + V(B.pap, x, y), 0) / m); firstMin = Math.min(firstMin, V(B.pap, r.w * m, y)); nr++;
        }
        ok(Number.isInteger(m) && nr === Math.round(X(q.sw)) && inkMin >= 0.98 && revMin >= 1 - q.foot.tol - 0.04 && firstMin >= (m > 1 ? 0.96 : 1 - q.foot.tol - 0.04), `socket rows: ${nr} wall rows, ink solid to its end in each (min ${pct(inkMin)}), the ${m > 1 ? `${m} px` : '1 px'} reveal after it background (mean min ${pct(revMin)}, first pixel min ${pct(firstMin)})`);
      }
    } else {
      const [x0, y0, x1, y1] = q.foot.box, rr = q.foot.rr;
      const fx = rng(X(x0), X(x1)), fy = rng(X(y0), X(y1));
      let fmin = 1, cmin = 1; const rp = X(rr), cx0 = Math.floor(X(x1 - rr) + 1e-9), cy0 = Math.floor(X(y1 - rr) + 1e-9);
      for (const y of fy) for (const x of fx) {
        if (rr && x >= cx0 && y >= cy0) { if (rp <= 1 + 1e-9 && x === Math.round(X(x1)) - 1 && y === Math.round(X(y1)) - 1) cmin = Math.min(cmin, V(B.amb, x, y)); continue; }
        fmin = Math.min(fmin, V(B.amb, x, y));
      }
      const cWant = rr && rp <= 1 + 1e-9 ? 1 - rp * rp * (1 - Math.PI / 4) : 1;
      ok(fmin >= 0.95 && cmin >= cWant - 0.04, `foot: device px ${fx[0]}..${fx.at(-1)} x ${fy[0]}..${fy.at(-1)} solid wine (min ${pct(fmin)})${rr ? `, outer bottom corner rounded ${r4(rp)} px${rp <= 1 + 1e-9 ? `: corner pixel ${pct(cmin)} (ideal ${pct(cWant)})` : ' (corner pixels excluded)'}` : ''}`);
      if (rr && isInt(X(rr))) { const cx = Math.round(X(x1)) - 1, cy = Math.round(X(y1)) - 1, cv = V(B.amb, cx, cy); info(`foot corner pixel (${cx}, ${cy}) ${pct(cv)} wine (rounded ${r4(X(rr))} px)`); }
    }
    // doorway: right of the jamb, below where the needle's right edge crosses it, no wine
    const yFl = q.kind === 'hub' ? q.TR[1] : (q.foot.flow ? q.foot.J[1] : q.py);
    const dRows = rng(Math.ceil(X(yFl) - 1e-6), yW1), dCols = rng(Math.ceil(X(q.hx) - 1e-6), Math.round(X(q.xr)));
    const dw = dRows.length ? maxOf(B.amb, dCols, dRows) : 0;
    const farCols = rng(Math.ceil(X(Math.max(q.XR[0], q.hx))) + 1, Math.round(X(q.xr)));
    const dw2 = maxOf(B.amb, farCols, wallRows);
    ok(dw <= 0.03 && dw2 <= 0.02, `doorway: right of the jamb x ${q.hx} below y ${r4(yFl)} max wine ${pct(dw)}; right of the needle's flank (column ${farCols[0]} on) in the wall band ${pct(dw2)}`);
    // arc top end
    const xH = Math.round(X(q.hx));
    if (isInt(X(q.py - q.rout)) && isInt(X(q.py - q.rin))) {
      const ys = rng(X(q.py - q.rout), X(q.py - q.rin));
      const l = maxOf(B.ink, [xH - 1], ys), r = minOf(B.ink, [xH], ys);
      ok(l <= 0.02 && r >= 0.9 * tone, `(d) arc top end: column ${xH - 1} ${pct(l)}, column ${xH} ${pct(r)} ink (tone ${pct(tone)}; cut on x ${q.hx})`);
    } else info(`(d) arc top end: band ${r4(X(q.rout - q.rin))} px`);
    if (isInt(X(q.xr)) && isInt(X(q.hx + q.rout))) {
      const f = minOf(B.ink, rng(X(q.xr), X(q.hx + q.rout)), [yW0 - 1]);
      const lj = maxOf(B.ink, [Math.round(X(q.xr)) - 1], wallRows);
      ok(f >= 0.9 * tone && lj <= 0.02, `(b) jamb: arc foot ${pct(f)} ink on the wall top (tone ${pct(tone)}), column left of the jamb ${pct(lj)}`);
    } else info(`(b) jamb: arc foot ${r4(X(q.rout - q.rin))} px wide`);
    if (q.ring) {
      const bl = maxOf(B.ink, rng(Math.floor(X(q.hx + q.ring.ri)) - 1, Math.ceil(X(q.hx + q.ring.ro)) + 1), [yW0]);
      const lf = maxOf(B.ink, [xH - 1], rng(Math.floor(X(q.py - q.ring.ro)), Math.ceil(X(q.py - q.ring.ri))));
      ok(bl <= 0.02 && lf <= 0.02, `(e) ring ends: below the datum ${pct(bl)}, left of x ${q.hx} ${pct(lf)} (cut on the datum and the radius)`);
    }
    // needle top: no wine past the arc
    let past = 0;
    for (let y = 0; y < Math.ceil(X(q.py)); y++) for (let x = 0; x < n; x++) { const c = [(x + 0.5) / k, (y + 0.5) / k]; if (dist(c, q.A) > q.rout + 1.5 / k) past = Math.max(past, V(B.amb, x, y)); }
    ok(past <= 0.02, `(c) needle top: no wine past the arc's outer edge (max ${pct(past)})`);
  }
  // seams and peeks: browser composite against the exact one, opaque layers only
  let seam = 0, sx = 0, sy = 0, peek = 0, px = 0, pyy = 0, nS = 0, nP = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const s = V(O.browser.pap, x, y) - V(O.exact.pap, x, y), p = V(O.browser.amb, x, y) - V(O.exact.amb, x, y);
    if (s > 0.03) nS++;
    if (p > 0.03) nP++;
    if (s > seam) { seam = s; sx = x; sy = y; }
    if (p > peek) { peek = p; px = x; pyy = y; }
  }
  ok(seam <= AA_MAX, `seams: no background line where shapes meet: worst excess background ${pct(seam)}${seam > 0.005 ? ` at (${sx}, ${sy})` : ''}, ${nS} px over 3 %`);
  ok(peek <= AA_MAX, `peeks: hidden needle parts stay hidden: worst excess wine ${pct(peek)}${peek > 0.005 ? ` at (${px}, ${pyy})` : ''}, ${nP} px over 3 %`);
}

/* ================================================================ socket smoothness on the device grid
   The wall end per device row of the wall band, from the left wall's own coverage (one path, rasterised as the browser
   does): x of the left wall end + the summed ink of the row. The curved socket moves at most 0.88 px per row (its
   steepest slope, where it meets the drop at x cutX); a hinted socket at its native size steps 1 px. A step of 1.5 px
   or more is a nub: a 1x staircase blown up by a devicePixelRatio of 2 or more. */
const NUB_MAX = 1.5;
function socketSteps(q, wallD, n) {
  const k = n / q.vb, F = raster([{ ds: [wallD], col: INK }], n, q.vb);
  const y0 = Math.round(q.py * k), y1 = Math.round(q.pyB * k), x0 = Math.round((q.hx - q.L) * k), x1 = Math.ceil(q.hx * k);
  const ends = [];
  for (let y = y0; y < y1; y++) { let s = 0; for (let x = x0; x < x1; x++) s += F.browser.ink[y * n + x]; ends.push(x0 + s); }
  let worst = 0, at = y0;
  for (let i = 1; i < ends.length; i++) { const d = Math.abs(ends[i] - ends[i - 1]); if (d > worst + 1e-9) { worst = d; at = y0 + i; } }
  return { ends, worst, at, rows: [y0, y1 - 1] };
}
function nubCheck(Q, n, dpr, tone, out, override) {
  const w = override || drawnWall(Q, n, dpr, tone), q = Q[w.id], dev = Math.round(n * dpr), s = socketSteps(q, w.d, dev);
  const tag = `${(override && override.tag) || w.id}${tone !== 'color' ? ' ' + tone : ''}@${n}${dpr > 1 ? ` x${dpr}` : ''}`;
  const ok = s.worst < NUB_MAX;
  out.push(`${ok ? 'ok  ' : 'FAIL'} ${tag}: socket nubs: drawn at ${n} CSS px, devicePixelRatio ${dpr} (${dev} device px) the component draws ${w.wallId === w.id ? `the ${LABEL[w.id] || w.id} wall` : `the retina twin's wall (${LABEL[w.wallId]}, curved socket)`}; the wall end moves at most ${r4(s.worst)} px between device rows ${s.rows[0]}..${s.rows[1]}${s.worst > 0.01 ? ` (row ${s.at})` : ''}, limit under ${NUB_MAX} px: no nub`);
  return ok;
}

/* ================================================================ wordmark outlines */
function runPath(key, x0, y0, size, dec = 3) {
  const run = WM[key];
  if (!run) throw new Error('no outline run ' + key);
  if (Math.abs(run.size - size) > 1e-9) throw new Error(`run ${key} was instanced for ${run.size} px, drawn at ${size}`);
  const f = v => +(+v).toFixed(dec);
  let d = '';
  for (const g of run.glyphs) {
    const ox = x0 + g.x * size;
    const X = p => f(ox + p[0] * size), Y = p => f(y0 - p[1] * size);
    for (const c of g.contours) {
      const n = c.length; if (!n) continue;
      let st = c.findIndex(p => p[2]), sp;
      if (st < 0) { st = 0; sp = [(c[0][0] + c[1 % n][0]) / 2, (c[0][1] + c[1 % n][1]) / 2, 1]; } else sp = c[st];
      d += `M${X(sp)} ${Y(sp)}`;
      let ctrl = null;
      for (let i = 1; i <= n; i++) {
        const p = c[(st + i) % n];
        if (p[2]) { d += ctrl ? `Q${X(ctrl)} ${Y(ctrl)} ${X(p)} ${Y(p)}` : `L${X(p)} ${Y(p)}`; ctrl = null; }
        else { if (ctrl) { const m = [(ctrl[0] + p[0]) / 2, (ctrl[1] + p[1]) / 2]; d += `Q${X(ctrl)} ${Y(ctrl)} ${X(m)} ${Y(m)}`; } ctrl = p; }
      }
      if (ctrl) d += `Q${X(ctrl)} ${Y(ctrl)} ${X(sp)} ${Y(sp)}`;
      d += 'Z';
    }
  }
  return d;
}
function runBox(key, x0, y0, size) {
  const run = WM[key]; let a = Infinity, b = Infinity, c = -Infinity, e = -Infinity;
  for (const g of run.glyphs) for (const ct of g.contours) for (const p of ct) { const x = x0 + (g.x + p[0]) * size, y = y0 - p[1] * size; a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); e = Math.max(e, y); }
  return [a, b, c, e];
}

/* ================================================================ lockups
   The mark's floor (the wall bottom) sits on the wordmark baseline. The mark is a master at its native size on an
   integer origin, so its walls, datum, arc ends and foot stay on whole pixels. Word: Big Shoulders 500, sentence case,
   tracking 0, opsz = its size (capped at 72), in the mark's ink; gap from the mark's box to the pen origin 0.19 of the
   size, as in the app (Wordmark). */
const markOrigin = (q, x, y) => `<svg x="${x}" y="${y}" width="${q.native}" height="${q.native}" viewBox="0 0 ${q.vb} ${q.vb}">`;
// home hero lockup: hero-large 128 + Turnout at 128 px (cap 102.4: the mark, 90 px arc top to floor, is 0.88 of it),
// gap 24, transparent; on 2x screens the curved socket (the 256 one colour wall), as the component draws it
const LOCK = { pad: 16, F: 128, gap: 24, key: 'wordmark-128' };
function heroLockup(q, { id, bg = null, ink2x = null } = {}) {
  const { pad, F, gap, key } = LOCK, s = q.native / q.vb;
  const mx = pad, my = pad, base = my + q.pyB * s, tx = mx + q.native + gap;
  const box = runBox(key, tx, base, F), visL = mx + (q.hx - q.L) * s;
  const W = Math.ceil(box[2] + visL), H = q.native + 2 * pad;
  return {
    W, H, mx, my, base, tx, F, box,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Turnout">` +
      (bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : '') +
      `${markOrigin(q, mx, my)}${body(q, 'color', { id: id || 'turnout-glow-lockup', ink2x })}</svg>` +
      `<path d="${runPath(key, tx, base, F)}" fill="${INK}"/></svg>`,
  };
}
// header lockup, as the app header draws it (src/app/layout.tsx: <Wordmark size={44} phone={34} />, wide screens): the
// 48 master on an integer origin, "Turnout" Big Shoulders 500 at 44 px (opsz 44, tracking 0) at gap 8, its baseline on
// the mark's floor. The mark (35 px arc top to floor) is 0.99 of the 35.2 px caps: at this size its lines need the
// height to hold next to the letters. No descriptor (Velours drops it).
const HDR = { F: 44, gap: 8, key: 'wordmark-44' };
function headerLockup(q, { id, bg = null } = {}) {
  const { F, gap, key } = HDR, tx = q.native + gap;
  const my = Math.max(0, Math.ceil(-runBox(key, 0, 0, F)[1] - q.pyB - 1e-9)), base = my + q.pyB;
  const wb = runBox(key, tx, base, F);
  const W = Math.ceil(wb[2]) + 1, H = Math.max(my + q.native, Math.ceil(wb[3]));
  return {
    W, H, my, base, tx, wb,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Turnout">` +
      (bg ? `<rect width="${W}" height="${H}" fill="${bg}"/>` : '') +
      `${markOrigin(q, 0, my)}${body(q, 'color', { id: id || 'turnout-glow-header' })}</svg>` +
      `<path d="${runPath(key, tx, base, F)}" fill="${INK}"/></svg>`,
  };
}
// OG card 1200 x 630, flat, no line: the white page, as the site is, with the colour lockup (the hero-large 256 master
// at its native 256, walls and word aubergine, needle wine, the flat afterglow tint) and "Turnout" at 256 px, the promise
// in Big Shoulders 500 at 56 px under it in the title ink, aligned on the mark's left wall end. Velours keeps the
// aubergine plate for objects (the hero plate, the favicon and apple-icon chips), never for a whole surface, and the
// share card is the most seen brand surface, so it is white. plate: true draws the reverse on the plate (not shipped).
const OG = { W: 1200, H: 630, F: 256, P: 56, key: 'wordmark-256', pkey: 'promise-56', m: 256, lead: 104, plate: false };
function ogCard(q, { plate = OG.plate } = {}) {
  const { W, H, F, P, key, pkey, m, lead } = OG, s = m / q.vb, gap = Math.round(F * 0.19);
  const capTop = WM[key].capHeight * F, contentH = capTop + lead;
  const base = Math.round((H - contentH) / 2 + capTop), my = base - q.pyB * s;
  const wb0 = runBox(key, 0, 0, F), visW = m - (q.hx - q.L) * s + gap + wb0[2];
  const mx = Math.round((W - visW) / 2 - (q.hx - q.L) * s), tx = mx + m + gap, px = mx + (q.hx - q.L) * s;
  const mode = plate ? 'reverse' : 'color', bg = plate ? PLATE : WHITE, word = plate ? ON_PLATE : INK, promise = plate ? LILAC : TITLE;
  return {
    W, H, mx, my, base, tx, px, gap, plate,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Turnout. Turn the crowd outside into customers inside.">` +
      `<rect width="${W}" height="${H}" fill="${bg}"/>` +
      `<svg x="${mx}" y="${my}" width="${m}" height="${m}" viewBox="0 0 ${q.vb} ${q.vb}">${body(q, mode, { id: 'turnout-glow-og' })}</svg>` +
      `<path d="${runPath(key, tx, base, F)}" fill="${word}"/><path d="${runPath(pkey, px, base + lead, P)}" fill="${promise}"/></svg>`,
  };
}
function lockupChecks(L, q, name, want, out) {
  const s = L.svg, ok = (c, m) => { out.push(`${c ? 'ok  ' : 'FAIL'} ${name}: ${m}`); return c; };
  const root = s.match(/<svg xmlns="[^"]+" width="([\d.]+)" height="([\d.]+)" viewBox="([^"]+)"/);
  const W = +root[1], H = +root[2];
  ok(Number.isInteger(W) && Number.isInteger(H) && root[3] === `0 0 ${W} ${H}`, `canvas ${W} x ${H}, viewBox ${root[3]}: whole pixels`);
  const [x, y, w, h, vw, vh] = s.match(/<svg x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)" viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number), k = w / vw;
  const keys = { datum: q.py, 'wall bottom': q.pyB, 'arc top end': q.py - q.rout, 'arc inner r': q.py - q.rin };
  const xs = { 'left wall end': q.hx - q.L, 'arc top cut': q.hx, jamb: q.xr, 'right wall end': q.xr + q.L, 'arc foot': q.hx + q.rout };
  const off = [...Object.entries(keys).map(([nm, v]) => [nm, y + v * k]), ...Object.entries(xs).map(([nm, v]) => [nm, x + v * k])].filter(([, v]) => Math.abs(v - Math.round(v)) > 1e-9);
  ok(Number.isInteger(x) && Number.isInteger(y) && w === h && vw === vh && Math.abs(k - want.k) < 1e-12 && (w === q.native || w % q.native === 0) && !off.length,
    `mark = ${want.master} nested at ${w} x ${h} (${r4(k)} px per unit, ${w === q.native ? 'its native size' : `${w / q.native} x native`}) on the integer origin (${x}, ${y}); datum y ${y + q.py * k}, floor y ${y + q.pyB * k}, arc top y ${y + (q.py - q.rout) * k}, walls x ${x + (q.hx - q.L) * k}..${x + q.hx * k} and ${x + q.xr * k}..${x + (q.xr + q.L) * k}: whole pixels${off.length ? ': OFF ' + off.map(([nm, v]) => `${nm} ${v}`).join(', ') : ''}`);
  const floor = y + q.pyB * k;
  ok(Math.abs(L.base - floor) < 1e-9, `wordmark baseline y ${L.base} = the mark's floor (wall bottom, y ${floor})`);
  const wb = runBox(want.key, L.tx, L.base, want.F);
  const trk = WM[want.key].tracking || 0;
  ok(wb[3] - L.base < 0.02 * want.F && Math.abs(L.base - WM[want.key].capHeight * want.F - wb[1]) < 0.03 * want.F && wb[1] >= 0 && trk === (want.tracking || 0) && WM[want.key].loc.opsz === Math.min(72, want.F), `"Turnout" outlined (${WM[want.key].family} ${WM[want.key].loc.wght}, opsz ${WM[want.key].loc.opsz}, ${want.F} px, tracking ${trk ? `+${trk}em` : '0'}): caps y ${r4(wb[1])}..${r4(L.base)} inside the canvas, overshoot ${r4(wb[3] - L.base)} px below the baseline`);
  ok(!/<text|font-family|@import/.test(s), 'no live text, no font reference: renders without any font installed');
  const cols = [...new Set((s.match(/#[0-9A-F]{6}/gi) || []).map(c => c.toUpperCase()))].filter(c => !/^#([0-9A-F]{2})\1\1$/.test(c));
  const allowed = [INK, ACC, PAPER, WHITE, MUTED, ARC_PAPER, TITLE, PLATE, ON_PLATE, ROSE, LILAC, ARC_REVERSE, GLOW_PAPER, GLOW_REVERSE, GLOW_MONO];
  ok(cols.every(c => allowed.includes(c)), `colours ${cols.join(', ')} (the afterglow tints included): Velours only`);
}

/* ================================================================ run */
export { M, build, svg, body, guards, raster, layersOf, pixelChecks, MODES, heroLockup, headerLockup, ogCard, ARC_PAPER, ARC_WHITE, ARC_REVERSE, DUR, EASE, EASE_CSS };
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

function main() {
  const Q = Object.fromEntries(Object.entries(M).map(([id, g]) => [id, build(id, g)]));
  const checks = [];
  for (const q of Object.values(Q)) guards(q, checks);
  // size system
  const sz = [...SIZES, ...SIZES_ONE].map(([n, id]) => [n, id, n === Q[id].native]);
  checks.push(`${sz.every(x => x[2]) ? 'ok  ' : 'FAIL'} size system: the component draws ${SIZES.map(([n, id]) => `${n} (${LABEL[id]})`).join(', ')}; one colour and reverse ${SIZES_ONE.map(([n, id]) => `${n} (${LABEL[id]})`).join(', ')}; each is a master's native size. 180 = the 180 master (apple-touch-icon)`);
  // Velours: no ring and no hairline arc in any master
  checks.push(`${Object.values(Q).every(q => !q.ring) ? 'ok  ' : 'FAIL'} Velours: no master draws the inner ring (${Object.keys(Q).length} masters)`);
  // retina twins: the same mark but for the wall, whose socket is the true curve
  for (const [id, q] of Object.entries(Q)) {
    if (!q.retina) continue;
    const t = Q[q.retina], same = ['needle', 'wallRArc', 'region', 'ink'].filter(f => f !== 'ink').every(f => t[f] === q[f]) && (t.ring && t.ring.d) === (q.ring && q.ring.d) && t.vb === q.vb;
    const curved = t.kind === 'hub' && !t.socket.snap && t.socket.c * (2 * q.native) / t.vb >= 2 - 1e-9;
    checks.push(`${same && curved && t.native === 2 * q.native ? 'ok  ' : 'FAIL'} retina twin: ${LABEL[id]} at devicePixelRatio 2 is ${2 * q.native} device px, the native size of ${LABEL[q.retina]}: the same needle, arc, ring and afterglow, the wall cut with the curved socket (reveal ${t.socket.c}, ${r4(t.socket.c * 2 * q.native / t.vb)} device px) instead of the 1x staircase (reveal ${q.socket.c}); the component draws it at ${RETINA_DPPX} dppx and up`);
  }
  // pixel model at every shipped size: each master at its native size and at 2x, the hero-large at its multiples
  const SHIP = [['m16', 16], ['m16', 32], ['m20', 20], ['m20', 40], ['m32', 32], ['m32', 64], ['m48', 48], ['m48', 96],
    ['hero', 64], ['hero', 128], ['heroL', 128], ['heroL256', 256], ['heroLm256', 256], ['heroLm256', 512], ['heroL512', 512], ['heroL512', 1024],
    ['heroLm512', 512], ['heroLm512', 1024], ['m180', 180], ['m180', 360]];
  for (const [id, n] of SHIP) { const q = Q[id]; pixelChecks(q, n, checks, raster(layersOf(q), n, q.vb), raster(layersOf(q, true), n, q.vb)); }
  // one colour and reverse: the reveal is what separates hub and wall (the 128 at 1x; its retina twin, the one colour
  // 256, at 256 and 512; the one colour 512 at 512 and 1024)
  for (const mode of ['mono', 'reverse']) for (const [id, n] of [['heroL', 128], ['heroLm256', 256], ['heroLm256', 512], ['heroLm512', 512], ['heroLm512', 1024]]) {
    const q = Q[id], md = MODES[mode];
    pixelChecks(q, n, checks, raster(layersOf(q, false, mode), n, q.vb, md.page, md.line, md.acc), null, { reveal: 1, mode });
  }
  // socket nubs: every hub master as the component draws it, at devicePixelRatio 1, 2 and 3
  for (const tone of ['color', 'mono']) for (const n of [128, 256, 512]) for (const dpr of [1, 2, 3]) {
    if ((dpr === 3 && n === 512) || (tone === 'mono' && n === 128)) continue; // one colour at 128 draws the colour 128 walls
    nubCheck(Q, n, dpr, tone, checks);
  }
  nubCheck(Q, 180, 1, 'color', checks, { id: 'm180', wallId: 'm180', d: Q.m180.wallL });
  // the 180 reversed on the plate (the apple-touch icon): the reveal separates hub and wall there too
  pixelChecks(Q.m180, 180, checks, raster(layersOf(Q.m180, false, 'reverse'), 180, Q.m180.vb, PLATE, ON_PLATE, ROSE), null, { reveal: 1, mode: 'reverse' });
  // motion ("live"): closed, the turning needle lies in the wall band across the doorway, its top under the right wall;
  // at rest the motion layer is the master (the hand-over at DUR - 1 ms cannot jump); the turning glow at rest is the
  // master's afterglow region
  for (const [id, q] of Object.entries(Q)) {
    if (!q.swing) continue;
    const sw = q.swing, a = rad(sw.deg), ok = (c, m) => { checks.push(`${c ? 'ok  ' : 'FAIL'} ${id}: motion ${m}`); return c; };
    const rot = p => { const dx = p[0] - sw.P[0], dy = p[1] - sw.P[1]; return [sw.P[0] + dx * Math.cos(a) - dy * Math.sin(a), sw.P[1] + dx * Math.sin(a) + dy * Math.cos(a)]; };
    const closed = polygons(sw.turn).flat().map(rot), cy = closed.map(p => p[1]), reach = Math.max(...closed.map(p => p[0]));
    ok(Math.min(...cy) >= q.py - 1e-6 && Math.max(...cy) <= q.pyB + 1e-6 && reach > q.xr && reach < q.xr + q.L,
      `closed: turned ${sw.deg} deg about the hub P (${P2(sw.P)}), the needle lies in the wall band, y ${r4(Math.min(...cy))} to ${r4(Math.max(...cy))} within the walls' ${q.py} and ${q.pyB}, across the doorway; its top ends at x ${r4(reach)}, under the right wall`);
    if (!sw.still) ok(sw.turn === q.needle, 'rest: the turning needle is the master needle, byte for byte');
    else if (q.native <= 128) {
      const n = q.native, lay = ds => raster([{ ds, col: ACC }, ...(q.arc ? [{ ds: [q.arc], col: arcColour(q, 'color') }] : []), { ds: [q.ink], col: INK }], n, q.vb);
      const A0 = lay([q.needle]), B0 = lay([sw.still, sw.turn]);
      let worst = 0, wi = 0; for (let i = 0; i < n * n; i++) { const d = Math.abs(A0.browser.amb[i] - B0.browser.amb[i]); if (d > worst) { worst = d; wi = i; } }
      ok(worst <= 0.5, `rest: the still foot plus the turning hull against the master needle at ${n} px, largest difference ${pct(worst)} wine in one pixel (${wi % n}, ${Math.floor(wi / n)}): the foot's corner, rounded by the hub circle instead of the corner radius`);
    }
    const rg = polygons(q.region), sc = polygons(sw.sector), cl = polygons(sw.clip);
    let inR = 0, miss = 0; const G = 240;
    for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) { const p = [(i + 0.5) * q.vb / G, (j + 0.5) * q.vb / G], a1 = inside(rg, p), b1 = inside(sc, p) && inside(cl, p); if (a1) inR++; if (a1 !== b1) miss++; }
    ok(miss <= 0.004 * inR, `rest: the turning afterglow, clipped, covers the master's afterglow region (${miss} of ${inR} samples differ, on the polygon edges)`);
  }
  // mutation self-tests: undo one joint at a time; the same checks must object
  const mutants = [
    ['needle swung about the wall end instead of the hub (closed, it leaves the wall band)', 'heroL', {}, [], /motion closed/,
      (q, res) => { const qq = { ...q, swing: { ...q.swing, P: [q.hx - q.L, q.py] } }, sw = qq.swing, a = rad(sw.deg), rot = p => { const dx = p[0] - sw.P[0], dy = p[1] - sw.P[1]; return [sw.P[0] + dx * Math.cos(a) - dy * Math.sin(a), sw.P[1] + dx * Math.sin(a) + dy * Math.cos(a)]; }; const cy = polygons(sw.turn).flat().map(rot).map(p => p[1]); res.push(`${Math.min(...cy) >= q.py - 1e-6 && Math.max(...cy) <= q.pyB + 1e-6 ? 'ok  ' : 'FAIL'} mutant: motion closed out of the wall band`); }],
    ['hub butted against the wall end (no reveal)', 'heroL512', { foot: { ...M.heroL512.foot, c: 0 } }, [512], /socket/],
    ['curved 1 px socket at 128 (not hinted to the pixel grid)', 'heroL', { foot: { ...M.heroL.foot, snap: 0 } }, [128], /socket/],
    ['curved 1 px socket at 256 (not hinted to the pixel grid)', 'heroL256', { foot: { ...M.heroL256.foot, snap: 0 } }, [256], /socket/],
    ['hinted socket without a clear pixel column', 'heroL', { foot: { ...M.heroL.foot, c: 0.0625, tol: 1 } }, [128], /socket/],
    ['needle top cut flush on the arc inner edge', 'heroL', { topFlush: 1 }, [72, 100], /peeks|seams/],
    ['65 % arc butted on the datum (no foot under the wall)', 'hero', { tone: ARC_TONE, arcExt: 0 }, [72, 100], /seams|peeks/],
    ['full-ink arc as its own path butted onto the right wall', 'heroL', { splitArc: 1, arcExt: 0 }, [72, 100], /seams/],
    ['pixel foot without the hidden strip', 'hero', { foot: { ...M.hero.foot, under: 0 } }, [72, 96], /seams/],
    // the hub of the 128 drawn at 256 device px from its own 1x staircase, as before the retina twin
    ['128 master drawn at devicePixelRatio 2 with its 1x staircase socket', 'heroL', {}, [], /socket nubs/,
      (q, res) => nubCheck({ mutant: q }, 128, 2, 'color', res, { id: 'mutant', wallId: 'mutant', d: q.wallL, tag: 'mutant' })],
    ['one colour 512 scaled up from the 128 staircase', 'heroL', {}, [], /socket nubs/,
      (q, res) => nubCheck({ mutant: q }, 512, 1, 'color', res, { id: 'mutant', wallId: 'mutant', d: q.wallL, tag: 'mutant' })],
    ['a ring put back, 0.35 at 64 px (0.7 px band)', 'hero', { ring: { ri: 12, w: 0.35, op: 0.5 } }, [], /ring band/, (q, res) => guards(q, res)],
    ['the hairline arc put back at 128 (0.25 of the grid, 1 px against 6 px walls)', 'heroL', { aw: 0.25 }, [], /arc rule/, (q, res) => guards(q, res)],
  ];
  for (const [name, base, over, sizes, pat, run] of mutants) {
    const q = build('mutant', { ...M[base], ...over });
    const res = [];
    if (over.foot && over.foot.c === 0) guards(q, res);
    if (run) run(q, res);
    for (const n of sizes) pixelChecks(q, n, res, raster(layersOf(q), n, q.vb), raster(layersOf(q, true), n, q.vb));
    const hit = res.filter(l => l.startsWith('FAIL') && pat.test(l));
    checks.push(`${hit.length ? 'ok  ' : 'FAIL'} guard self-test: ${name} is rejected${hit.length ? ': ' + hit[0].slice(5).replace('mutant', LABEL[base]) : ' (NOT caught)'}`);
  }

  /* ---------------------------------------------------------------- files */
  const hL = Q.heroL, hL256 = Q.heroL256, hL512 = Q.heroL512, hLm256 = Q.heroLm256, hLm512 = Q.heroLm512, h = Q.hero, q48 = Q.m48, q32 = Q.m32, q20 = Q.m20, q16 = Q.m16, q180 = Q.m180;
  const ringTxt = q => q.ring ? `ring r ${q.ring.ri} to ${q.ring.ro} at ${q.ring.op * 100} %` : 'no ring';
  const arcTxt = q => `arc r ${q.rin} to ${q.rout} (${r4(q.aw * q.native / q.vb)} px, ${q.tone >= 1 ? 'full ink' : `ink at 65 %: solid ${ARC_PAPER} on paper, ${ARC_WHITE} on white`})`;
  const hubTxt = q => q.kind === 'hub'
    ? (q.socket.snap
      ? `Pivot encastré: the needle ends in a round hub P (${P2(q.P)}), r ${q.R}, set into a socket in the left wall's end: the concentric socket r ${r4(q.socket.Rc)} (reveal ${q.socket.c}, ${r4(q.socket.c * q.native / q.vb)} px) hinted to the ${q.native} px grid, the wall ink ending on a whole pixel in every row (x ${q.socket.rows.map(r => r4(r.w / q.socket.kS)).join(' / ')}) with a clear pixel column before the hub; the hub is tangent to the wall top, the wall bottom and the jamb x ${q.hx}.`
      : `Pivot encastré: the needle ends in a round hub P (${P2(q.P)}), r ${q.R}, set into a socket cut concentric into the left wall's end with a background reveal ${q.socket.c} (${r4(q.socket.c * q.native / q.vb)} px); the hub is tangent to the wall top, the wall bottom and the jamb x ${q.hx}.`)
    : q.foot.flow ? `Pivot encastré, pixel foot: the needle's foot is the wall's last ${r4((q.foot.box[2] - q.foot.box[0]) * q.native / q.vb)} px (x ${q.foot.box[0]} to ${q.foot.box[2]}), outer bottom corner rounded ${q.foot.rr}, no reveal; the needle's edges are tangent to the hub circle (P (${P2(q.P)}), r ${q.R}).`
      : `Pivot encastré, pixel foot: the needle (${q.nd.lw} wide) stands on the foot box x ${q.foot.box[0]} to ${q.foot.box[2]}, y ${q.foot.box[1]} to ${q.foot.box[3]}${q.foot.rr ? `, outer bottom corner rounded ${q.foot.rr}` : ''}.`;
  const dpr1 = (twinFile, twin) => `The socket staircase is right only at devicePixelRatio 1: doubled, its 1 px steps become 2 px nubs. On a 2x screen draw ${twinFile} at this CSS size instead (${twin}).`;
  const glowTxt = (mode = 'color') => `Afterglow: one flat tint ${MODES[mode].glow} (the ${mode === 'mono' ? 'ink' : 'needle colour'} at ${Math.round(GLOW_K[mode] * 100)} % over ${MODES[mode].page}, a solid colour), floor on the datum, rim under the arc, leaf side under the needle`;
  const ndTxt = q => `needle ${r4(2 * q.R)} at the hub to ${q.nd.taper.wTop} at the arc, ${q.theta.toFixed(3)} deg`;
  const revTxt = `Walls and arc ${ON_PLATE}, needle ${ROSE} (dusty rose), afterglow ${GLOW_REVERSE}, on the aubergine plate ${PLATE}`;
  const NOTE = {
    heroL: `hero-large 128 master. Native size 128 px (4 px per unit); draw it only at 128 CSS px at devicePixelRatio 1 (256 and 512 have their own masters). ${dpr1('01-swing-final-hero-large-2x.svg', 'the same mark with the curved socket, reveal 0.25 = 2 device px')} ${hubTxt(hL)} Datum y 26 (wall top), walls 1.5 (left x 2 to 6, right x 26 to 30). ${arcTxt(hL)}, ${ndTxt(hL)}. ${glowTxt()}. Paint order afterglow, needle, ink.`,
    heroL2x: `hero-large 128 for 2x screens. Native size 256 device px: draw it at 128 CSS px at devicePixelRatio 2 (or 3); at devicePixelRatio 1 draw 01-swing-final-hero-large.svg. ${hubTxt(hLm256)} Otherwise the hero-large 128 exactly: ${arcTxt(hL)}. ${glowTxt()}. Paint order afterglow, needle, ink.`,
    heroL256: `hero-large 256 master. Native size 256 px (8 px per unit); draw it only at 256 CSS px at devicePixelRatio 1. ${dpr1('01-swing-final-hero-large-512.svg', 'its socket is the true curve, reveal 0.125 = 2 device px at 512')} ${hubTxt(hL256)} Otherwise the hero-large geometry: datum y 26, walls 1.5, ${arcTxt(hL256)}, ${ndTxt(hL256)}. ${glowTxt()}. Paint order afterglow, needle, ink.`,
    heroL512: `hero-large 512 master. Native size 512 px (16 px per unit); draw it at 512 CSS px or a whole multiple (1024, 1536). ${hubTxt(hL512)} Otherwise the hero-large geometry: datum y 26, walls 1.5, ${arcTxt(hL512)}, ${ndTxt(hL512)}. ${glowTxt()}. Paint order afterglow, needle, ink.`,
    hero: `hero master (the home hero on phones). Native size 64 px (2 px per unit); draw it only at 64 CSS px, at an integer devicePixelRatio (128 px and up use the hero-large masters). ${hubTxt(h)} Ink wall x 2 to 4.5. ${arcTxt(h)}, ${ndTxt(h)}. ${glowTxt()}. Paint order afterglow, needle, ink.`,
    m180: `apple-touch-icon master. Native size 180 px, own 180 grid (1 unit = 1 px) on a flat white square; its twin reversed on the aubergine plate (01-swing-final-180-reverse.svg) is the one exported as apple-icon.png. The socket staircase is right only at devicePixelRatio 1, so it ships as a 180 x 180 PNG (iOS scales the PNG itself). ${hubTxt(q180)} Datum y ${q180.py}, walls ${q180.sw} px. ${arcTxt(q180)}, ${ndTxt(q180)}. ${glowTxt()}.`,
    m180reverse: `apple-touch-icon, reversed. The 180 master on a flat square of the aubergine plate, a brand chip like the hero plate (never a page background): ${revTxt}. Native size 180 px: exported as src/app/apple-icon.png at 180 x 180 (iOS rounds the corners). ${hubTxt(q180)} The socket staircase is right only at devicePixelRatio 1, which is why it ships as a 180 x 180 PNG.`,
    m48: `pixel master (the app header). Native size 48 px, own 48 grid (1 unit = 1 px); draw it only at 48 CSS px. ${hubTxt(q48)} Datum y ${q48.py}, walls ${q48.sw} px. ${arcTxt(q48)}, ${ndTxt(q48)}. ${glowTxt()}.`,
    m32: `pixel master (the app header on phones). Native size 32 px (1 unit = 1 px); draw it only at 32 CSS px. ${hubTxt(q32)} Datum y 26, walls 2 px. ${arcTxt(q32)}, ${ndTxt(q32)}. ${glowTxt()}.`,
    m20: `pixel master. Native size 20 px, own 20 grid (1 unit = 1 px); draw it only at 20 CSS px. ${hubTxt(q20)} Datum y 16, walls 1 px, ink wall x 1 to 3. ${arcTxt(q20)}. ${glowTxt()}.`,
    m16: `pixel master. Native size 16 px (favicon), viewBox 32 drawn at 16 px, 1 px = 2 units; draw it only at 16 CSS px. ${hubTxt(q16)} The foot is the pixel diagonally above the wall end. Datum y 26, walls 1 px. ${arcTxt(q16)}. ${glowTxt()}.`,
    mono: `one colour, hero-large 128 geometry. Native size 128 px; draw it only at 128 CSS px at devicePixelRatio 1 (256 and 512 have their own one colour masters). ${dpr1('01-swing-final-mono-256.svg', 'the same geometry with the curved socket')} Needle in ink; ${glowTxt('mono')}; the reveal 0.25 (1 px, hinted to whole pixels) alone separates hub and wall.`,
    mono256: `one colour, native size 256 px (8 px per unit); draw it at 256 CSS px, or at 128 CSS px on a 2x screen. ${hubTxt(hLm256)} Needle in ink; ${glowTxt('mono')}; the reveal alone separates hub and wall. ${arcTxt(hLm256)}.`,
    mono512: `one colour, native size 512 px (16 px per unit); draw it at 512 CSS px or a whole multiple, or at 256 CSS px on a 2x screen. ${hubTxt(hLm512)} Needle in ink; ${glowTxt('mono')}; the reveal alone separates hub and wall. ${arcTxt(hLm512)}.`,
    mono16: `one colour, 16 px master geometry (native size 16 px; draw it only at 16 CSS px): needle in ink, ${glowTxt('mono')}, arc ${ARC_PAPER}.`,
    reverse: `reverse on the aubergine plate, hero-large 128 geometry. Native size 128 px; draw it only at 128 CSS px at devicePixelRatio 1 (256 and 512 have their own reverse masters). ${dpr1('01-swing-final-reverse-256.svg', 'the same geometry with the curved socket')} ${revTxt}; the reveal 0.25 hinted to whole pixels.`,
    reverse256: `reverse on the aubergine plate, native size 256 px (8 px per unit); draw it at 256 CSS px, or at 128 CSS px on a 2x screen. ${hubTxt(hLm256)} ${revTxt}.`,
    reverse512: `reverse on the aubergine plate, native size 512 px (16 px per unit); draw it at 512 CSS px or a whole multiple, or at 256 CSS px on a 2x screen. ${hubTxt(hLm512)} ${revTxt}.`,
  };
  const master = (key, s) => `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Turnout, Swing final (Studio A, identity Velours), ${NOTE[key]} Generated by swing-final.mjs. -->\n${s}\n`;
  const out = {};
  const MF = [
    ['marks/01-swing-final-hero-large.svg', 'heroL', hL, 128, 'color'], ['marks/01-swing-final-hero-large-256.svg', 'heroL256', hL256, 256, 'color'],
    ['marks/01-swing-final-hero-large-512.svg', 'heroL512', hL512, 512, 'color'], ['marks/01-swing-final-hero.svg', 'hero', h, 64, 'color'],
    ['marks/01-swing-final-180.svg', 'm180', q180, 180, 'color'], ['marks/01-swing-final-48.svg', 'm48', q48, 48, 'color'],
    ['marks/01-swing-final-32.svg', 'm32', q32, 32, 'color'], ['marks/01-swing-final-20.svg', 'm20', q20, 20, 'color'],
    ['marks/01-swing-final-16.svg', 'm16', q16, 16, 'color'], ['marks/01-swing-final-mono.svg', 'mono', hL, 128, 'mono'],
    ['marks/01-swing-final-mono-256.svg', 'mono256', hLm256, 256, 'mono'], ['marks/01-swing-final-mono-512.svg', 'mono512', hLm512, 512, 'mono'],
    ['marks/01-swing-final-mono-16.svg', 'mono16', q16, 16, 'mono'], ['marks/01-swing-final-reverse.svg', 'reverse', hL, 128, 'reverse'],
    ['marks/01-swing-final-reverse-256.svg', 'reverse256', hLm256, 256, 'reverse'], ['marks/01-swing-final-reverse-512.svg', 'reverse512', hLm512, 512, 'reverse'],
    // the 128 for 2x screens: drawn at 128 CSS px, its native grid is 256 device px
    ['marks/01-swing-final-hero-large-2x.svg', 'heroL2x', hLm256, 128, 'color', 2],
    // the apple-touch icon: the 180 master reversed on the plate
    ['marks/01-swing-final-180-reverse.svg', 'm180reverse', q180, 180, 'reverse'],
  ];
  for (const [rel, key, q, n, mode] of MF) out[rel] = master(key, svg(q, n, mode));
  const lock = heroLockup(hL, { ink2x: hLm256.ink }), hdr = headerLockup(q48), og = ogCard(OG.plate ? hLm256 : hL256);
  out['01-swing-final.svg'] = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Turnout, Studio A, Swing final, identity Velours. Home hero lockup, transparent, ${lock.W} x ${lock.H}: the hero-large 128 master at its native 128 px on the integer origin (${lock.mx}, ${lock.my}), its floor (wall bottom) on the word's baseline y ${lock.base}; on 2x screens it draws the curved socket (the one colour 256 wall), as the component does. Word "Turnout": Big Shoulders 500, opsz 72, ${LOCK.F} px, tracking 0, outlined, ${INK}; pen origin x ${lock.tx} (gap ${LOCK.gap} from the mark's box). Draw it at ${lock.W} x ${lock.H} CSS px or a whole multiple. -->\n${lock.svg}\n`;
  out['01-swing-final-lockup-header.svg'] = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Turnout, Studio A, Swing final, identity Velours. App header lockup, as src/app/layout.tsx draws it on wide screens (Wordmark size 44), ${hdr.W} x ${hdr.H}, transparent: the 48 master at its native 48 px on the integer origin (0, ${hdr.my}), its floor (wall bottom) on the text baseline y ${hdr.base}. "Turnout" Big Shoulders 500, opsz ${HDR.F}, ${HDR.F} px, tracking 0, ${INK}, pen x ${hdr.tx} (gap ${HDR.gap}), caps from y ${r4(hdr.wb[1])}. No descriptor. All text outlined. Draw it at ${hdr.W} x ${hdr.H} CSS px on an integer position. -->\n${hdr.svg}\n`;
  out['01-swing-final-og.svg'] = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Turnout, Studio A, Swing final, identity Velours. Open Graph card ${OG.W} x ${OG.H}, the source of src/app/opengraph-image.png: ${og.plate ? `the flat aubergine plate ${PLATE}; the one colour 256 master reversed (walls ${ON_PLATE}, needle ${ROSE})` : `the white page; the hero-large 256 master in colour`} at its native ${OG.m} px on (${og.mx}, ${og.my}), floor on the baseline y ${og.base} of "Turnout" (Big Shoulders 500, opsz 72, ${OG.F} px, outlined, ${og.plate ? ON_PLATE : INK}); the promise in Big Shoulders 500, opsz 56, ${OG.P} px, outlined, ${og.plate ? LILAC : TITLE}, baseline y ${og.base + OG.lead}, aligned on the mark's left wall end x ${og.px}. No line, no gradient. -->\n${og.svg}\n`;
  // file-level guards
  // retired looks: the first identity, and Marquise (ink #111114, wine #E0115F, concrete paper #F2F3F3, arc #606062)
  const OLDI = /#F7F4EE|#B4530A|#17150F|#E39A5F|#6B655B|#111114|#E0115F|#F2F3F3|#606062|#646466|Fraunces|\bInter\b|IBM Plex Mono/i, OLD = { test: s => OLDI.test(s) || /CROWD TO CAMPAIGN/.test(s) };
  for (const [rel, key, q, n, mode, dpr = 1] of MF) {
    const s = out[rel], flat = !/<mask|fill-opacity|Gradient/.test(s) && s.includes(`<path d="${q.region}" fill="${MODES[mode].glow}"/>`);
    const ds = [...s.matchAll(/ d="([^"]+)"/g)].map(x => x[1]);
    const head = s.match(/<svg xmlns="[^"]+" width="([\d.]+)" height="([\d.]+)" viewBox="([^"]+)"/);
    const staircase = q.kind === 'hub' && q.socket.snap, warned = /right only at devicePixelRatio 1/.test(s);
    const okf = +head[1] === n && +head[2] === n && head[3] === `0 0 ${q.vb} ${q.vb}` && flat && !ds.some(d => /[AQ]/.test(d)) && /native size \d+ (?:device )?px/i.test(s) && n * dpr === q.native && !OLD.test(s) && (!staircase || warned);
    checks.push(`${okf ? 'ok  ' : 'FAIL'} file ${rel}: ${n} x ${n}${dpr > 1 ? ` at devicePixelRatio ${dpr} = native ${q.native} device px` : ' = native'}, viewBox 0 0 ${q.vb} ${q.vb}, the afterglow one flat ${MODES[mode].glow} (no mask, no opacity), ${ds.length} paths, no arc commands, native size stated${staircase ? ', hinted socket: the header says it is right only at devicePixelRatio 1' : ''}, no colour or font of the retired look`);
  }
  lockupChecks(lock, hL, '01-swing-final.svg', { k: 4, master: 'the hero-large 128', key: LOCK.key, F: LOCK.F }, checks);
  lockupChecks(hdr, q48, '01-swing-final-lockup-header.svg', { k: 1, master: 'the 48 master', key: HDR.key, F: HDR.F }, checks);
  lockupChecks(og, OG.plate ? hLm256 : hL256, '01-swing-final-og.svg', { k: 8, master: OG.plate ? 'the one colour 256, reversed' : 'the hero-large 256', key: OG.key, F: OG.F }, checks);
  checks.push(`${!OG.plate && og.svg.includes(`<rect width="${OG.W}" height="${OG.H}" fill="${WHITE}"/>`) && og.svg.includes(`fill="${ACC}"`) && og.svg.includes(`fill="${GLOW_PAPER}"`) ? 'ok  ' : 'FAIL'} 01-swing-final-og.svg: the share card is the white page, as the site is (the aubergine plate stays for objects: the hero plate, the favicon and apple-icon chips); the colour lockup with the wine needle and the flat afterglow`);
  {
    const ok = (c, m) => checks.push(`${c ? 'ok  ' : 'FAIL'} ${m}`);
    ok(HDR.F === 44 && HDR.gap === Math.max(6, Math.round(HDR.F * 0.19)) && hdr.H === Math.max(hdr.my + 48, Math.ceil(hdr.wb[3])) && hdr.wb[1] >= 0 && !/crowd to campaign/i.test(hdr.svg), `01-swing-final-lockup-header.svg: as the app header on wide screens (Wordmark size 44): word ${HDR.F} px, mark 48 at (0, ${hdr.my}), gap ${HDR.gap}, no descriptor; caps from y ${r4(hdr.wb[1])}, inside the ${hdr.W} x ${hdr.H} canvas`);
    const cap = f => WM[`wordmark-${f}`].capHeight * f, mh = (q, n) => (q.pyB - (q.py - q.rout)) * n / q.vb;
    ok(mh(hL, 128) / cap(128) > 0.85 && mh(hL, 128) / cap(128) < 0.9 && mh(q48, 48) / cap(44) > 0.9 && mh(q48, 48) / cap(44) < 1, `proportion: the hero mark is ${r4(mh(hL, 128))} px arc top to floor against ${r4(cap(128))} px caps (${r4(mh(hL, 128) / cap(128))}, limits 0.85 and 0.9); the header mark ${r4(mh(q48, 48))} px against ${r4(cap(44))} px caps (${r4(mh(q48, 48) / cap(44))}, limits 0.9 and 1), taller in proportion so it holds at the small size`);
    ok(Object.values(WM).every(r => r.family === 'Big Shoulders' && r.loc.wght === 500 && !r.tracking && r.loc.opsz === Math.min(72, r.size)), `wordmark-outlines.json: every run Big Shoulders 500, opsz = its size (capped at 72), tracking 0 (${Object.keys(WM).join(', ')})`);
    ok(OLD.test('Fraunces') && !OLD.test(out['01-swing-final.svg'] + out['01-swing-final-lockup-header.svg'] + out['01-swing-final-og.svg']), 'lockups and OG card: no colour or font of the retired look');
  }

  /* ---------------------------------------------------------------- React (src/components/Logo.tsx) */
  const glowKey = q => q.region;
  const LARGE = [hL, hL256, hL512, hLm256, hLm512];
  const sharedGlow = LARGE.every(q => glowKey(q) === glowKey(hL));
  const glowLit = q => `"${q.region}"`;
  // glowId: the afterglow's own name, not a per-instance id. It names the motion's clip path and keyframes; masters that
  // share a glowId have the same afterglow and motion layer, byte for byte, so whichever copy url(#...) resolves to is right.
  const swingKey = q => q.swing ? JSON.stringify({ ...q.swing, P: q.swing.P.map(r4) }) : '';
  const sharedSwing = LARGE.every(q => swingKey(q) === swingKey(hL));
  const swingLit = (q, ind) => `{ P: [${q.swing.P.map(r4).join(', ')}], deg: ${q.swing.deg}, turn: "${q.swing.turn}",${q.swing.still ? ` still: "${q.swing.still}",` : ''} sector: "${q.swing.sector}", clip: "${q.swing.clip}" }`;
  const mBlock = (key, q, note, glowId, glowRef, swingRef) => `  // ${note}
  ${key}: {
    vb: ${q.vb},
    native: ${q.native},
    floor: ${q.pyB},
    left: ${r4(q.hx - q.L)},
    glowId: "${glowId}",
    glow: ${glowRef || glowLit(q)},
    needle: "${q.needle}",${q.arc ? `\n    arc: "${q.arc}",` : ''}
    ink: "${q.ink}",${q.retina ? `\n    ink2x: "${Q[q.retina].ink}",` : ''}${q.swing ? `\n    swing: ${swingRef || swingLit(q, '    ')},` : ''}
  },`;
  const markFor = [[26, 20], [38, 32], [56, 48], [100, 64]];
  // the afterglow in the component: the same solid tints as the files, mixed by the browser from the live tokens, so a
  // retinted needle (the plum scope in globals.css sets --mark-needle and --mark-ground) retints its afterglow too
  const TONE_GLOW = {
    color: `var(--mark-glow, color-mix(in srgb, var(--mark-needle, ${ACC}) ${Math.round(GLOW_K.color * 100)}%, var(--mark-ground, ${WHITE})))`,
    mono: `color-mix(in srgb, currentColor ${Math.round(GLOW_K.mono * 100)}%, var(--mark-ground, ${WHITE}))`,
    reverse: `var(--mark-glow-reverse, color-mix(in srgb, var(--mark-needle-reverse, ${ROSE}) ${Math.round(GLOW_K.reverse * 100)}%, var(--plum, ${PLATE})))`,
  };
  const jsx = `// Turnout logo: the "Swing" mark and the wordmark, identity Velours. Generated by design/studio-a/swing-final.mjs (edit
// the generator, not this file; the design sheet is design/studio-a/swing-final.html).
// Mark: two walls on one floor, an arc from the right wall, a needle swung up from a round hub set into the end of the
// left wall ("pivot encastré"), the afterglow behind the needle.
// SIZE RULE. Each master is pixel-true at its native CSS size and at any integer devicePixelRatio: 16 (favicon), 20,
// 32 (the app header on phones), 48 (the app header), 64 (the home hero on phones), 128 (the home hero), 256 and 512
// (the hero-large family, whose socket is cut for each size; one colour and reverse have their own 256 and 512).
// Mark picks the master for the box it is given (the largest native size not above it) and draws it at its native
// size, or the largest whole multiple that fits, centred on whole pixels: a 40 px box gets the 32 master with 4 px
// around it, never a 32 master stretched to 40. Give it a native size and the mark fills the box. It never shrinks in
// a flex row (flex: none). Its parent must put it on whole CSS pixels: a box centred against a fractional line height
// lands between pixels and blurs every edge.
// RETINA. At 128 and 256 the socket round the hub is a 1 px staircase hinted to the 1x pixel grid; doubled it would
// show 2 px nubs. Those masters carry ink2x, the same walls with the true curved socket, and a resolution media query
// draws it instead at ${RETINA_DPPX} dppx and up (2x screens, and zoom of ${RETINA_DPPX * 100} % and more).
// COLOURS (Velours). tone="color", on the white page: walls and arc in var(--mark-ink), ${INK} (aubergine), the word
// in var(--wordmark), falling back to the same ink; needle and the live dot in var(--mark-needle), ${ACC} (wine); the
// afterglow one flat tint, var(--mark-glow), by default the needle at ${Math.round(GLOW_K.color * 100)} % over var(--mark-ground) (${GLOW_PAPER}
// on white). From 32 px up the arc is full ink, part of the ink path; at 20 and 16 px it is the ink at 65 % over white
// as a solid colour, var(--mark-arc), ${ARC_PAPER}.
// tone="reverse", on the aubergine plate ${PLATE}: walls, arc and word var(--mark-ink-reverse), ${ON_PLATE}; needle
// and dot var(--mark-needle-reverse), ${ROSE} (dusty rose); the afterglow var(--mark-glow-reverse), by default that
// rose at ${Math.round(GLOW_K.reverse * 100)} % over var(--plum) (${GLOW_REVERSE}); the arc at 20 and 16 px var(--mark-arc-reverse), ${ARC_REVERSE}.
// tone="mono" draws in currentColor; its afterglow (${Math.round(GLOW_K.mono * 100)} %) and its arc at 20 and 16 px (65 %) are currentColor mixed
// over var(--mark-ground) (default white; set it to the colour under the mark) into solid colours.
// No gradient, no opacity, no mask, no hairline: every shape is a solid fill, painted in this order: afterglow,
// needle, arc, ink.
// MOTION (personality "live"). motion swings the needle open once, when the mark is first drawn: from closed (the
// needle lying in the wall line, across the doorway) to rest in ${DUR} ms, ${EASE_CSS}, about the hub
// centre, the afterglow carried round behind it and clipped to the floor line. At ${DUR - 1} ms the motion layer hands
// over to the master paths, so the rest state is the master, pixel for pixel. prefers-reduced-motion: reduce (or no
// CSS animation) draws the rest state only. The masters with a tapered needle carry it (32, 48, 64, 128, 256, 512);
// the 16 and the 20 never move. Use it once per page, on the home hero lockup; the header mark stays still. Freeze a
// frame for review with the custom properties turnout-t (a time, e.g. 300ms) and turnout-ps (paused), each with the
// usual two-hyphen prefix, on an ancestor. The swing is a CSS animation, so it starts again whenever its subtree
// re-enters layout: the Wordmark's phone and wide lockups are display: none across the 640 px switch (a resize past
// 640 px replays it), and a full-page capture with captureBeyondViewport re-lays out the page and catches the needle
// closed. For review captures freeze the frame (turnout-t 900ms, turnout-ps paused on the hero wrapper) or capture a
// viewport-sized clip with captureBeyondViewport false.
// The motion's clip path and keyframes are named after the afterglow (turnout-swing-<glowId>), not per instance: ids
// from useId repeat across separately rendered server segments (after a client-side navigation two marks shared one
// id). Copies with the same id are identical, so any one of them renders correctly.
import type { CSSProperties, ReactNode } from "react";

type Master = {
  vb: number;
  native: number;
  floor: number; // the wall bottom, in viewBox units: it sits on the wordmark baseline
  left: number; // the left wall's outer end, in viewBox units: a lockup hangs the mark by it, so the ink starts flush
  glowId: string; // the afterglow's name: masters with the same glowId have the same afterglow and motion layer
  glow: string; // the afterglow: one flat region, floor on the datum, rim under the arc, leaf side under the needle
  needle: string;
  arc?: string; // the 65 % arc; absent when the arc is full ink (then it is part of ink)
  ink: string;
  ink2x?: string; // ink with the curved socket, drawn instead of ink at ${RETINA_DPPX} dppx and up
  // the motion layer: the needle that turns about the hub P by deg (closed) to 0 (rest), the foot that stays, the
  // afterglow sector that turns with it, and the half disc above the floor that clips it
  swing?: { P: [x: number, y: number]; deg: number; turn: string; still?: string; sector: string; clip: string };
};
${sharedGlow ? `
// The afterglow of the hero-large family (the same needle and arc centreline at 128, 256 and 512, one colour too).
const GLOW_LARGE: Master["glow"] = ${glowLit(hL)};
` : ''}${sharedSwing ? `
// The motion layer of the hero-large family (the same needle, hub and afterglow at 128, 256 and 512, one colour too).
const SWING_LARGE: NonNullable<Master["swing"]> = ${swingLit(hL, '')};
` : ''}
export const SWING: Record<"px16" | "px20" | "px32" | "px48" | "hero" | "heroLarge" | "heroLarge256" | "heroLarge512" | "heroLargeOne256" | "heroLargeOne512", Master> = {
${mBlock('px16', q16, `native 16, viewBox 32, 1 px = 2 units. Walls, needle, arc 1 px (arc at 65 %); foot = the pixel above the wall end; still.`, 'px16')}
${mBlock('px20', q20, `native 20, 1 unit = 1 px. Walls 1 px, needle 1.2 on a 1 px foot, arc 1 px at 65 %; still.`, 'px20')}
${mBlock('px32', q32, `native 32, 1 unit = 1 px. Walls 2 px, foot 2 x 2 px, needle 2 at the hub and ${q32.nd.taper.wTop} at the arc, arc ${q32.aw} px full ink.`, 'px32')}
${mBlock('px48', q48, `native 48, 1 unit = 1 px. Walls 3 px, foot 3 x 3 px, needle 3 at the hub and ${q48.nd.taper.wTop} at the arc, arc ${q48.aw} px full ink.`, 'px48')}
${mBlock('hero', h, `native 64, viewBox 32 (2 px per unit). Walls 1.5 (3 px), foot 3 x 3 px, needle 1.5 at the hub and ${h.nd.taper.wTop} at the arc, arc ${h.aw} (${r4(h.aw * 2)} px) full ink.`, 'hero')}
${mBlock('heroLarge', hL, `native 128, viewBox 32 (4 px per unit), colour, one colour and reverse. Hub r 0.75, socket reveal 0.25 (1 px) hinted to the 1x grid; ink2x: the curved socket, reveal 0.25 (2 device px at 2x). Walls 1.5 (6 px), arc ${hL.aw} (${r4(hL.aw * 4)} px) full ink.`, 'large', sharedGlow && 'GLOW_LARGE', sharedSwing && 'SWING_LARGE')}
${mBlock('heroLarge256', hL256, `native 256, viewBox 32 (8 px per unit), colour. Socket reveal 0.125 (1 px) hinted to the 1x grid; ink2x: the 512 socket, curved, reveal 0.125 (2 device px at 2x).`, 'large', sharedGlow && 'GLOW_LARGE', sharedSwing && 'SWING_LARGE')}
${mBlock('heroLarge512', hL512, `native 512 and its whole multiples, viewBox 32 (16 px per unit), colour. The true concentric socket, reveal 0.125 (2 px).`, 'large', sharedGlow && 'GLOW_LARGE', sharedSwing && 'SWING_LARGE')}
${mBlock('heroLargeOne256', hLm256, `native 256, one colour and reverse. The true concentric socket, reveal 0.25 (2 px): the 128's reveal, cut as a curve.`, 'large', sharedGlow && 'GLOW_LARGE', sharedSwing && 'SWING_LARGE')}
${mBlock('heroLargeOne512', hLm512, `native 512 and its whole multiples, one colour and reverse. The true concentric socket, reveal 0.25 (4 px).`, 'large', sharedGlow && 'GLOW_LARGE', sharedSwing && 'SWING_LARGE')}
};

/** The native CSS sizes: draw the mark at one of these. */
export const SWING_SIZES = [${SIZES.map(([n]) => n).join(', ')}] as const;
export type SwingSize = (typeof SWING_SIZES)[number];

// glow: the afterglow, one flat tint, the needle colour mixed over the ground into a solid colour (no opacity)
const TONES = {
  color: { ink: "var(--mark-ink, ${INK})", needle: "var(--mark-needle, ${ACC})", glow: "${TONE_GLOW.color}" },
  mono: { ink: "currentColor", needle: "currentColor", glow: "${TONE_GLOW.mono}" },
  reverse: { ink: "var(--mark-ink-reverse, ${ON_PLATE})", needle: "var(--mark-needle-reverse, ${ROSE})", glow: "${TONE_GLOW.reverse}" }, // on the aubergine plate
} as const;
export type MarkTone = keyof typeof TONES;
export type MarkGround = "paper" | "white"; // the page is white in Velours: both name it

/** The 65 % arc of the 20 and 16 px masters, as a solid colour over the ground. */
function arcFill(tone: MarkTone, ground: MarkGround): string {
  if (tone === "mono") return "color-mix(in srgb, currentColor 65%, var(--mark-ground, ${WHITE}))";
  if (tone === "reverse") return "var(--mark-arc-reverse, ${ARC_REVERSE})"; // light at 65 % over the plate
  return ground === "white" ? "var(--mark-arc-white, var(--mark-arc, ${ARC_WHITE}))" : "var(--mark-arc, ${ARC_PAPER})";
}

/** The master drawn for a CSS size. One colour and reverse have their own 256 and 512 (reveal 0.25, curved). */
export function swingMaster(size: number, tone: MarkTone = "color"): Master {
  if (size >= 128) {
    if (tone !== "color") return size >= 512 ? SWING.heroLargeOne512 : size >= 256 ? SWING.heroLargeOne256 : SWING.heroLarge;
    return size >= 512 ? SWING.heroLarge512 : size >= 256 ? SWING.heroLarge256 : SWING.heroLarge;
  }
  return size >= 64 ? SWING.hero : size >= 48 ? SWING.px48 : size >= 32 ? SWING.px32 : size >= 20 ? SWING.px20 : SWING.px16;
}

// Draws ink2x instead of ink at ${RETINA_DPPX} dppx and up. Global, but it only touches the two class names below.
const RETINA_CSS = "${RETINA_CSS}";

// The swing: the motion layer (turnout-mv) is drawn only while the needle turns, the rest layer (turnout-rs) only after,
// and only when motion is welcome; otherwise the rest layer alone, which is the master.
const swingCss = (id: string, deg: number) =>
  \`.turnout-mv{display:none}.turnout-sw{transform-box:view-box;transform-origin:0 0}@media (prefers-reduced-motion:no-preference){.turnout-mv{display:inline;animation:turnout-off 1ms linear calc(${DUR - 1}ms - var(--turnout-t,0ms)) forwards;animation-play-state:var(--turnout-ps,running)}.turnout-rs{animation:turnout-on 1ms linear calc(${DUR - 1}ms - var(--turnout-t,0ms)) backwards;animation-play-state:var(--turnout-ps,running)}.turnout-sw-\${id}{animation:turnout-swing-\${id} ${DUR}ms ${EASE_CSS} calc(0ms - var(--turnout-t,0ms)) backwards;animation-play-state:var(--turnout-ps,running)}}@keyframes turnout-swing-\${id}{from{transform:rotate(\${deg}deg)}to{transform:rotate(0deg)}}@keyframes turnout-off{to{visibility:hidden}}@keyframes turnout-on{from{visibility:hidden}}\`;

export function Mark({ size = 32, tone = "color", ground = "paper", motion = false, title, className, style }: { size?: number; tone?: MarkTone; ground?: MarkGround; motion?: boolean; title?: string; className?: string; style?: CSSProperties }) {
  const m = swingMaster(size, tone), t = TONES[tone], sw = motion ? m.swing : undefined;
  // drawn size: the native size or its largest whole multiple in the box (below 16 px the 16 master is scaled down)
  const drawn = size < m.native ? size : m.native * Math.floor(size / m.native), off = Math.floor((size - drawn) / 2), u = m.vb / drawn;
  const glow = (d: string) => <path d={d} fill={t.glow} />;
  const turn = (s: NonNullable<Master["swing"]>, el: ReactNode) => (
    <g transform={\`translate(\${s.P[0]} \${s.P[1]})\`}>
      <g className={\`turnout-sw turnout-sw-\${m.glowId}\`}>
        <g transform={\`translate(\${-s.P[0]} \${-s.P[1]})\`}>{el}</g>
      </g>
    </g>
  );
  return (
    <svg width={size} height={size} viewBox={\`\${-off * u} \${-off * u} \${size * u} \${size * u}\`} className={className} style={{ flex: "none", ...style }} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      {sw ? (
        <>
          <style>{swingCss(m.glowId, sw.deg)}</style>
          <clipPath id={\`turnout-swing-\${m.glowId}\`} clipPathUnits="userSpaceOnUse"><path d={sw.clip} /></clipPath>
          <g className="turnout-rs">{glow(m.glow)}</g>
          <g className="turnout-mv" clipPath={\`url(#turnout-swing-\${m.glowId})\`}>{turn(sw, glow(sw.sector))}</g>
        </>
      ) : (
        glow(m.glow)
      )}
      {sw ? (
        <>
          <g className="turnout-rs"><path d={m.needle} fill={t.needle} /></g>
          <g className="turnout-mv">{sw.still && <path d={sw.still} fill={t.needle} />}{turn(sw, <path d={sw.turn} fill={t.needle} />)}</g>
        </>
      ) : (
        <path d={m.needle} fill={t.needle} />
      )}
      {m.arc && <path d={m.arc} fill={arcFill(tone, ground)} />}
      {m.ink2x ? (
        <>
          <style>{RETINA_CSS}</style>
          <path className="turnout-ink-1x" d={m.ink} fill={t.ink} />
          <path className="turnout-ink-2x" d={m.ink2x} fill={t.ink} />
        </>
      ) : (
        <path d={m.ink} fill={t.ink} />
      )}
    </svg>
  );
}

// The mark that goes with a wordmark size (Big Shoulders 500): its height, arc top to floor, against the cap height is
// 0.88 at the hero sizes and 0.99 in the header, so the mark holds its own next to the letters.
const markFor = (fontSize: number) => ${markFor.map(([f, n]) => `fontSize <= ${f} ? ${n} : `).join('')}128;
const WORD = { color: "var(--wordmark, var(--mark-ink, ${INK}))", mono: "currentColor", reverse: "var(--mark-ink-reverse, ${ON_PLATE})" } as const;
const DOT = { color: "var(--mark-needle, ${ACC})", mono: "currentColor", reverse: "var(--mark-needle-reverse, ${ROSE})" } as const;
// Two lockups, one per screen width, when the phone size differs; the hidden one is display: none.
const LOCKUP_CSS = "@media (max-width:639.98px){.turnout-lockup-wide{display:none!important}}@media (min-width:640px){.turnout-lockup-phone{display:none!important}}";

type LockupProps = { size?: number; phone?: number; tone?: MarkTone; live?: boolean; motion?: boolean; tagline?: boolean; mark?: boolean; className?: string };

// Layout, so the mark lands on whole pixels wherever the lockup is centred: the outer box is the mark's own box (ms x ms,
// a whole, even number of pixels), the mark at its top; inside it a baseline row exactly as tall as the mark's floor,
// whose baseline is that floor: the mark sits in a box cut at its floor (synthesized baseline = its bottom), the word and
// the dot stand on it with line-height 0, so no font metric can change a height. The ink (caps top to floor) is then
// centred in the mark's box within a pixel. The mark hangs left by its blank margin (hang, whole pixels: 3 at 48, 8 at
// 128), so the left wall starts on the same edge as the text set under or beside the lockup.
function Lockup({ size, tone, live, motion, tagline, mark, className }: Required<Omit<LockupProps, "phone" | "className">> & { className: string }) {
  const ms = markFor(size), m = swingMaster(ms, tone), floor = (m.floor * ms) / m.vb, gap = Math.max(6, Math.round(size * 0.19)), hang = Math.round((m.left * ms) / m.vb);
  const dot = Math.max(6, Math.round(size * 0.13)), lh = mark ? 0 : 1;
  const row = (
    <>
      {mark && (
        <span style={{ display: "block", flex: "none", height: floor, marginLeft: -hang, marginRight: gap }}>
          <Mark size={ms} tone={tone} motion={motion} style={{ display: "block" }} />
        </span>
      )}
      <span style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: size, lineHeight: lh, fontOpticalSizing: "auto", letterSpacing: 0 }}>Turnout</span>
      {live && (
        <>
          <span aria-hidden="true" style={{ display: "inline-block", flex: "none", width: dot, height: dot, borderRadius: "50%", background: DOT[tone], marginLeft: Math.round(size * 0.06), position: "relative", top: -Math.round(size * 0.8 - dot) }} />
          <span style={{ position: "absolute", width: 1, height: 1, margin: -1, padding: 0, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }}>, a crowd is live near you</span>
        </>
      )}
      {tagline && (
        <span className="hidden sm:inline" style={{ marginLeft: 12, fontFamily: "var(--font-sans)", fontWeight: 500, fontSize: 15, lineHeight: lh, color: "var(--muted, ${MUTED})" }}>
          crowd to campaign
        </span>
      )}
    </>
  );
  if (!mark) return <span className={className} style={{ display: "inline-flex", alignItems: "baseline", color: WORD[tone], lineHeight: 1 }}>{row}</span>;
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "flex-start", height: ms, color: WORD[tone], lineHeight: 1 }}>
      <span style={{ display: "inline-flex", alignItems: "baseline", height: floor }}>{row}</span>
    </span>
  );
}

/**
 * The lockup: the mark, then "Turnout" in Big Shoulders 500 (sentence case, tracking 0), the weight of the Velours
 * titles, in the mark's ink. The mark's floor sits on the text baseline; gap 0.19 of the size.
 * size = the word's font size in px: 44 in the app header (mark 48, gap 8, in a 76 px bar), 128 on the home hero
 * (mark 128, gap 24, motion). phone = the size under 640 px wide: 34 in the header (mark 32), 64 on the hero (mark 64).
 * tone="reverse" on the aubergine plate. live adds a small dot after the word, on the cap line, while a crowd near the
 * place is live. tagline (the descriptor "crowd to campaign") is dropped in Velours; kept for old call sites only.
 */
export function Wordmark({ size = 44, phone, tone = "color", live = false, motion = false, tagline = false, mark = true, className }: LockupProps) {
  const extra = className ? " " + className : "";
  const one = (s: number, cls: string) => <Lockup size={s} tone={tone} live={live} motion={motion} tagline={tagline} mark={mark} className={cls + extra} />;
  if (!phone || phone === size) return one(size, "turnout-lockup");
  return (
    <>
      <style>{LOCKUP_CSS}</style>
      {one(size, "turnout-lockup turnout-lockup-wide")}
      {one(phone, "turnout-lockup turnout-lockup-phone")}
    </>
  );
}
`;
  // the React geometry must be byte-identical to the masters it claims to be
  {
    const KEY = { px16: 'm16', px20: 'm20', px32: 'm32', px48: 'm48', hero: 'hero', heroLarge: 'heroL', heroLarge256: 'heroL256', heroLarge512: 'heroL512', heroLargeOne256: 'heroLm256', heroLargeOne512: 'heroLm512' };
    const pairs = Object.entries(KEY).map(([k2, id]) => [k2, Q[id]]);
    const block = k2 => { const i = jsx.indexOf(`\n  ${k2}: {`); return i < 0 ? '' : jsx.slice(i, jsx.indexOf('\n  },', i)); };
    const bad = pairs.filter(([k2, q]) => { const b = block(k2); return !b.includes(`needle: "${q.needle}"`) || !b.includes(`ink: "${q.ink}"`) || (q.arc && !b.includes(`arc: "${q.arc}"`)) || (q.ring && !b.includes(`ring: ["${q.ring.d}", ${q.ring.op}]`)) || (!/GLOW_LARGE/.test(b) && !b.includes(`glow: "${q.region}"`)) || (q.retina ? !b.includes(`ink2x: "${Q[q.retina].ink}"`) : /ink2x/.test(b)); }).map(([k2]) => k2);
    // the glow ids: one name per distinct afterglow, never two afterglows under one name
    const gid = Object.fromEntries(pairs.map(([k2]) => [k2, (block(k2).match(/glowId: "([^"]+)"/) || [])[1]]));
    const idOk = !/useId\(|import \{[^}]*useId/.test(jsx) && /clipPath id=\{`turnout-swing-\$\{m\.glowId\}`\}/.test(jsx) && pairs.every(([a, qa]) => gid[a] && pairs.every(([b, qb]) => (gid[a] === gid[b]) === (glowKey(qa) === glowKey(qb) && qa.vb === qb.vb && swingKey(qa) === swingKey(qb))));
    checks.push(`${idOk ? 'ok  ' : 'FAIL'} Logo.tsx: the motion's clip path and keyframes are named turnout-swing-<glowId>, after the afterglow and motion layer they hold (${[...new Set(Object.values(gid))].join(', ')}): two marks share an id only when both are identical, so a client-side navigation that keeps one copy cannot hand another mark the wrong clip; no useId`);
    // the afterglow: one flat solid tint, the same colours as the files (color-mix in srgb is the same interpolation as mix())
    const pctOf = (str, re) => +((str.match(re) || [])[1]);
    const gOk = /const glow = \(d: string\) => <path d=\{d\} fill=\{t\.glow\} \/>/.test(jsx) && !/<mask|fillOpacity|Gradient/.test(jsx)
      && mix(ACC, WHITE, pctOf(TONE_GLOW.color, /\) ([\d.]+)%/) / 100) === GLOW_PAPER && mix(ROSE, PLATE, pctOf(TONE_GLOW.reverse, /\) ([\d.]+)%/) / 100) === GLOW_REVERSE && mix(INK, WHITE, pctOf(TONE_GLOW.mono, / ([\d.]+)%/) / 100) === GLOW_MONO
      && jsx.includes(`glow: "${TONE_GLOW.color}"`) && jsx.includes(`glow: "${TONE_GLOW.reverse}"`) && jsx.includes(`glow: "${TONE_GLOW.mono}"`);
    checks.push(`${gOk ? 'ok  ' : 'FAIL'} Logo.tsx: the afterglow is one flat path in a solid tint, no mask, no opacity, no gradient: colour ${TONE_GLOW.color} (${GLOW_PAPER} on white), reverse ${TONE_GLOW.reverse} (${GLOW_REVERSE}), one colour ${TONE_GLOW.mono}; the same colours as the SVG files`);
    // run the component's own picker and colour logic, lifted out of the TSX
    const lift = name => { const i = jsx.indexOf(`function ${name}(`), j = jsx.indexOf('\n}\n', i); return jsx.slice(i, j + 2).replace(/\(size: number, tone: MarkTone = "color"\): Master/, '(size, tone = "color")').replace(/\(tone: MarkTone, ground: MarkGround\): string/, '(tone, ground)'); };
    const SW = Object.fromEntries(Object.keys(KEY).map(k2 => [k2, k2]));
    const pickJsx = new Function('SWING', `${lift('swingMaster')}; return swingMaster;`)(SW);
    const arcJsx = new Function(`${lift('arcFill')}; return arcFill;`)();
    const probe = [12, 16, 20, 24, 32, 40, 48, 63, 64, 100, 128, 200, 256, 300, 512, 1024];
    const mapBad = ['color', 'mono', 'reverse'].flatMap(tone => probe.filter(n => KEY[pickJsx(n, tone)] !== pickId(n, tone)).map(n => `${tone} ${n}`));
    const mapOk = !mapBad.length && SIZES.every(([n, id]) => pickId(n) === id) && SIZES_ONE.every(([n, id]) => pickId(n, 'mono') === id && pickId(n, 'reverse') === id);
    const wm = [[34, 32, 6], [44, 48, 8], [64, 64, 12], [128, 128, 24]].every(([f, n, g]) => { const ms = markFor.find(([lim]) => f <= lim); return (ms ? ms[1] : 128) === n && Math.max(6, Math.round(f * 0.19)) === g; });
    const trackOk = /fontWeight: 500, fontSize: size, lineHeight: lh, fontOpticalSizing: "auto", letterSpacing: 0 \}/.test(jsx) && Object.values(WM).every(r => !r.tracking);
    const drawnOf = (n, tone) => { const nat = Q[pickId(n, tone)].native; return n < nat ? n : nat * Math.floor(n / nat); };
    const boxes = [12, 16, 20, 24, 32, 40, 48, 56, 64, 100, 128, 200, 256, 300, 512, 600];
    const boxOk = ['color', 'mono'].every(tone => boxes.every(n => { const d = drawnOf(n, tone), off = Math.floor((n - d) / 2); return Number.isInteger(off) && (n < 16 || d % Q[pickId(n, tone)].native === 0) && (!(tone === 'color' ? SIZES : SIZES_ONE).some(([sz]) => sz === n) || (d === n && off === 0)); }));
    checks.push(`${boxOk ? 'ok  ' : 'FAIL'} Logo.tsx: Mark in any box draws a master at its native size or a whole multiple, centred on whole pixels: ${boxes.map(n => `${n} -> ${drawnOf(n, 'color')}${drawnOf(n, 'color') !== n ? ` (+${Math.floor((n - drawnOf(n, 'color')) / 2)})` : ''}`).join(', ')}; one colour ${[128, 256, 300, 512].map(n => `${n} -> ${drawnOf(n, 'mono')}`).join(', ')}`);
    checks.push(`${!bad.length && mapOk && wm && sharedGlow ? 'ok  ' : 'FAIL'} Logo.tsx: geometry of ${pairs.length} masters identical to the SVG files (the hero-large and one colour masters share one afterglow; ink2x = the retina twin's ink)${bad.length ? ': DIFFERS ' + bad.join(', ') : ''}; its own swingMaster, run here on ${probe.length} sizes x 3 tones, maps ${SIZES.map(([n, id]) => `${n} -> ${LABEL[id]}`).join(', ')}, one colour and reverse ${SIZES_ONE.map(([n, id]) => `${n} -> ${LABEL[id]}`).join(', ')}${mapBad.length ? ': MISMATCH ' + mapBad.join(', ') : ''}; Wordmark 34 -> mark 32 gap 6, 44 -> mark 48 gap 8 (the header file), 64 -> mark 64 gap 12, 128 -> mark 128 gap 24 (the hero file)`);
    checks.push(`${trackOk ? 'ok  ' : 'FAIL'} Logo.tsx: Wordmark sets Turnout in Big Shoulders 500, opsz auto, tracking 0 at every size, as the outlined lockup files`);
    const retinaOk = jsx.includes(`const RETINA_CSS = "${RETINA_CSS}"`) && /className="turnout-ink-1x" d=\{m\.ink\}/.test(jsx) && /className="turnout-ink-2x" d=\{m\.ink2x\}/.test(jsx) && RETINA_CSS.includes(`min-resolution:${RETINA_DPPX}dppx`);
    checks.push(`${retinaOk ? 'ok  ' : 'FAIL'} Logo.tsx: masters with a hinted socket (128, 256) carry ink2x and draw it instead of ink at ${RETINA_DPPX} dppx and up (min-resolution media query), so a 2x screen never sees the 1x staircase doubled`);
    const inkOk = /color: \{ ink: "var\(--mark-ink, #3B1C42\)", needle: "var\(--mark-needle, #84204D\)"/.test(jsx) && /reverse: \{ ink: "var\(--mark-ink-reverse, #F6F1F8\)", needle: "var\(--mark-needle-reverse, #E6A4C2\)"/.test(jsx) && /mono: \{ ink: "currentColor"/.test(jsx) && /style=\{\{ flex: "none", \.\.\.style \}\}/.test(jsx) && !/color: \{ ink: "currentColor"/.test(jsx) && !/--accent/.test(jsx);
    checks.push(`${inkOk ? 'ok  ' : 'FAIL'} Logo.tsx: colour ink is var(--mark-ink, ${INK}) and the needle var(--mark-needle, ${ACC}) (no longer --accent), reverse var(--mark-ink-reverse, ${ON_PLATE}) and var(--mark-needle-reverse, ${ROSE}), so a standalone Mark never takes the surrounding text colour (currentColor only in tone="mono"); Mark carries flex: none before the caller's style, so a flex row cannot shrink it off its native size`);
    const arcs = { cp: arcJsx('color', 'paper'), cw: arcJsx('color', 'white'), mp: arcJsx('mono', 'paper'), mw: arcJsx('mono', 'white'), r: arcJsx('reverse', 'paper') };
    const arcOk = arcs.cp === `var(--mark-arc, ${ARC_PAPER})` && arcs.cw === `var(--mark-arc-white, var(--mark-arc, ${ARC_WHITE}))` && arcs.mp === `color-mix(in srgb, currentColor 65%, var(--mark-ground, ${WHITE}))` && arcs.mw === arcs.mp && arcs.r === `var(--mark-arc-reverse, ${ARC_REVERSE})` && ARC_REVERSE === mix(ON_PLATE, PLATE, ARC_TONE) && /fill=\{arcFill\(tone, ground\)\}/.test(jsx);
    const motionOk = jsx.startsWith('// Turnout logo') && /\.turnout-mv\{display:none\}[^`]*@media \(prefers-reduced-motion:no-preference\)\{\.turnout-mv\{display:inline/.test(jsx) && jsx.includes(`${DUR}ms ${EASE_CSS}`) && pairs.every(([k2, q]) => (q.swing ? /swing: /.test(block(k2)) : !/swing: /.test(block(k2)))) && sharedSwing && /motion=\{motion\}/.test(jsx) && /<g className="turnout-rs"><path d=\{m\.needle\}/.test(jsx);
    const hangs = [32, 48, 64, 128].map(n => { const q = Q[pickId(n)]; return [n, (q.hx - q.L) * n / q.vb]; });
    checks.push(`${hangs.every(([, v]) => Number.isInteger(v)) && /marginLeft: -hang/.test(jsx) && /left: \$\{r4\(q\.hx - q\.L\)\}/.test(mBlock.toString()) ? 'ok  ' : 'FAIL'} Logo.tsx: the lockup hangs the mark by its blank left margin, whole pixels (${hangs.map(([n, v]) => `${v} at ${n}`).join(', ')}), so the left wall starts on the text's edge`);
    checks.push(`${motionOk ? 'ok  ' : 'FAIL'} Logo.tsx: motion ("live"): the masters with a tapered needle carry their motion layer (${pairs.filter(([, q]) => q.swing).map(([k2]) => k2).join(', ')}; the hero-large family shares one); drawn only under prefers-reduced-motion: no-preference, ${DUR} ms ${EASE_CSS}, handing over to the master paths at ${DUR - 1} ms; otherwise the rest layer alone`);
    checks.push(`${arcOk ? 'ok  ' : 'FAIL'} Logo.tsx: the 65 % arc below 128 px, solid: colour ${arcs.cp} on the page, ${arcs.cw} with ground="white"; one colour ${arcs.mp} (currentColor, so light on a dark ground draws a light arc); reverse ${arcs.r} on the plate`);
  }
  const icon = `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Turnout favicon, identity Velours: the 16 px master (native 16, viewBox 32) reversed on a square of the aubergine plate ${PLATE} (walls ${ON_PLATE}, needle ${ROSE}): a brand chip that holds on light and dark tab strips. Generated by design/studio-a/swing-final.mjs. -->\n${svg(q16, 16, 'reverse')}\n`;
  checks.push(`${icon.includes(`<rect width="32" height="32" fill="${PLATE}"/>`) && icon.includes(`fill="${ROSE}"`) && !OLD.test(icon) ? 'ok  ' : 'FAIL'} src/app/icon.svg: 16 px master reversed on a ${PLATE} square, corners square`);

  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const uri = s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

  /* ---------------------------------------------------------------- sheet pieces */
  const GUIDE = '#2F7DD1';
  const mono11 = `font-family="'Instrument Sans', system-ui, sans-serif" font-weight="500" font-size="12" style="font-variant-numeric:tabular-nums"`;
  function construction() {
    const q = hL512, sc = 16, pad = 32, W = 32 * sc + pad * 2; // 16 px per unit: the hero-large 512 at its native size
    const X = v => +(pad + v * sc).toFixed(2);
    let g = '';
    for (let i = 0; i <= 32; i++) g += `<path d="M${X(i) + 0.5} ${X(0)}V${X(32)}M${X(0)} ${X(i) + 0.5}H${X(32)}" stroke="${i % 4 ? '#EDEEEE' : '#E0E1E1'}" stroke-width="1"/>`;
    const dash = `stroke="${GUIDE}" stroke-width="1" stroke-dasharray="4 3" fill="none"`;
    const circ = (r, d) => `<path d="M${X(q.hx + r)} ${X(q.py)}A${r * sc} ${r * sc} 0 0 0 ${X(q.hx)} ${X(q.py - r)}" ${d ? dash : `stroke="${GUIDE}" stroke-width="1" fill="none"`} opacity=".75"/>`;
    let guides = `<path d="M${X(0.5)} ${X(q.py)}H${X(31.5)}" ${dash}/><path d="M${X(q.hx)} ${X(1)}V${X(31)}" ${dash}/>`;
    guides += circ(q.rin) + circ(q.rout, 1);
    guides += `<circle cx="${X(q.P[0])}" cy="${X(q.P[1])}" r="${q.R * sc}" ${dash} opacity=".75"/><circle cx="${X(q.P[0])}" cy="${X(q.P[1])}" r="${q.socket.Rc * sc}" stroke="${GUIDE}" stroke-width="1" fill="none" opacity=".75"/>`;
    guides += `<path d="M${X(q.P[0])} ${X(q.P[1])}L${X(q.T[0])} ${X(q.T[1])}" stroke="${GUIDE}" stroke-width="1" stroke-dasharray="1 3" fill="none"/><circle cx="${X(q.P[0])}" cy="${X(q.P[1])}" r="2" fill="${GUIDE}"/><circle cx="${X(q.T[0])}" cy="${X(q.T[1])}" r="2" fill="${GUIDE}"/>`;
    const t = (x, y, s, a = 'start') => `<text x="${x}" y="${y}" text-anchor="${a}" ${mono11} fill="${MUTED}">${s}</text>`;
    let labels = t(X(31.5), X(q.py) - 6, `datum y ${q.py}`, 'end') + t(X(q.hx) + 5, X(1) + 10, `x ${q.hx}`) +
      t(X(4.1), X(30.5), `P: hub r ${q.R}, socket r ${q.socket.Rc}`) + t(X(q.T[0]) + 8, X(q.T[1]) - 16, `T, ${q.theta.toFixed(2)}°`) +
      t(X(27.6), X(9.5), `r ${q.rin} / ${q.rout}`);
    const badge = (id, bx, by, targets) => {
      const s = targets.map(([tx, ty]) => `<path d="M${X(bx)} ${X(by)}L${X(tx)} ${X(ty)}" stroke="${INK}" stroke-width="1"/><rect x="${X(tx) - 2.5}" y="${X(ty) - 2.5}" width="5" height="5" fill="${INK}"/>`).join('');
      return s + `<rect x="${X(bx) - 11}" y="${X(by) - 11}" width="22" height="22" fill="${WHITE}" stroke="${INK}" stroke-width="1.5"/><text x="${X(bx)}" y="${X(by) + 4.5}" text-anchor="middle" font-family="'Instrument Sans', sans-serif" font-weight="600" font-size="13" fill="${INK}">${id}</text>`;
    };
    const mt = [(q.TLv[0] + q.TRv[0]) / 2, (q.TLv[1] + q.TRv[1]) / 2];
    const cl = add(q.CB, mul(q.U, 9));
    labels += badge('a', 2.6, 30.2, [[q.P[0] - q.socket.Rc + 0.05, q.P[1]]]) + badge('b', 22.8, 29.8, [[q.xr, q.py]]) + badge('c', 21, 4.4, [mt]) +
      badge('d', 2.8, 3.4, [[q.hx, q.py - (q.rin + q.rout) / 2]]) +
      badge('e', 16.5, 21.6, [[cl[0] + 0.8, cl[1] + 0.3], [16.5, q.py], at(q.A, q.rin - 0.4, 28)]);
    return `<svg viewBox="0 0 ${W} ${W}" width="${W}" height="${W}" role="img" aria-label="Construction of the final Swing mark on the 32 unit grid, every joint labelled a to e">
      <rect width="${W}" height="${W}" fill="${WHITE}"/>${g}
      <g transform="translate(${pad} ${pad}) scale(${sc})">${body(q, 'color', { id: `g${++UID}` })}</g>${guides}${labels}</svg>`;
  }
  const SRC = new Map();
  const srcKey = s => { if (!SRC.has(s)) SRC.set(s, `s${SRC.size}`); return SRC.get(s); };
  const canvas = (src, n, k, crop, opt = {}) => `<canvas class="px" data-src="${srcKey(src)}" data-n="${n}"${opt.h ? ` data-h="${opt.h}"` : ''} data-k="${k}"${crop ? ` data-crop="${crop.join(' ')}"` : ''}${opt.grid ? ' data-grid' : ''}${opt.bg ? ` data-bg="${opt.bg}"` : ''}${opt.guides ? ` data-guides='${JSON.stringify(opt.guides)}'` : ''} width="${(crop ? crop[2] : n) * k}" height="${(crop ? crop[3] : (opt.h || n)) * k}"></canvas>`;
  const U512 = 16;
  const heroGuides = {
    u: U512,
    lines: [[-5, hL512.py, 40, hL512.py, 'd'], [hL512.hx, -5, hL512.hx, 40, 'd'], [hL512.P[0], hL512.P[1], hL512.T[0], hL512.T[1], 'o']],
    circles: [[hL512.hx, hL512.py, hL512.rin, ''], [hL512.hx, hL512.py, hL512.rout, 'd'], [hL512.P[0], hL512.P[1], hL512.R, 'd'], [hL512.P[0], hL512.P[1], hL512.socket.Rc, '']],
  };
  const JOINTS = [
    ['a', 'Hub in its socket', 1.5, 23.5, 6, 5, `The needle ends in a round hub, r ${hL512.R}, tangent to the wall top, the wall bottom and the jamb. The wall end is cut concentric with it, ${hL512.socket.c} away: a 2 px paper reveal at 512.`],
    ['b', 'Arc on the right wall', 23, 23, 6, 5, `Right wall and arc are one ink outline. Inner edge r ${hL.rin} leaves the wall corner tangent to the jamb face; outer edge lands square on the wall top.`],
    ['c', 'Needle top on the arc', 13.2, 6, 6, 5, `Cut on the arc's inner edge, r ${hL.rin}. Drawn on to r ${hL.rmid}, half the band, hidden under the ink.`],
    ['d', 'Arc top end', 3, 3.2, 6, 5, `Cut on the radius x ${hL.hx}, y ${hL.py - hL.rout} to ${hL.py - hL.rin}: square to both edges.`],
    ['e', 'Afterglow edges', 8.4, 15, 6, 5, `One flat tint, ${GLOW_PAPER}. Leaf side on the needle axis (inside the needle), outer edge on the arc centreline (under the arc), floor on the datum.`],
  ];
  const RAMP = [256, 128, 64, 48, 32, 20, 16];
  const pickSize = n => SIZES.find(([s]) => s === n)[1];
  // the app header as src/app/layout.tsx draws it: white bar, no line under it, the header lockup, nav links in ink
  // (Instrument Sans 500, 14 px) and "Powered by Qloo" muted at 12 px
  const header = () => `<div class="apphdr">${headerLockup(q48, { id: `g${++UID}` }).svg}<nav><span>Radar</span><span>Set up your place</span><span class="q">Powered by Qloo</span></nav></div>`;
  const tab = dark => `<div class="browser${dark ? ' dark' : ''}"><div class="tabs"><div class="tab on">${isvg(q16, 16, 'reverse')}<span>Turnout, tonight</span><b>&#215;</b></div><div class="tab"><span class="ghost"></span><span>Bookings</span></div></div><div class="bar"><span></span></div></div>`;
  const coordRows = () => {
    const row = (k2, v) => `<tr><td>${k2}</td><td>${v}</td></tr>`;
    return `<table>
      ${row('Datum', `wall-top line y ${hL512.py}; arc and afterglow about A (${hL512.hx}, ${hL512.py})`)}
      ${row('Hub', `P (${P2(hL512.P)}), r ${hL512.R}: tangent to y ${hL512.py}, y ${hL512.pyB} and x ${hL512.hx}`)}
      ${row('Needle', `edges tangent to the hub, ${r4(2 * hL512.R)} at the hub, ${hL512.nd.taper.wTop} at r ${hL512.rin}; axis P to T (${P2(hL512.T)}), ${hL512.theta.toFixed(3)}°`)}
      ${row('Socket, 512', `r ${hL512.socket.Rc} about P, reveal ${hL512.socket.c}; the wall top stops at x ${r4(hL512.socket.XLc[0])}, the socket drops square at x ${hL512.socket.E[0]}`)}
      ${row('Left wall, 512', `<code>${hL512.wallL}</code>`)}
      ${row('Socket, 256', `reveal ${hL256.socket.c} hinted to the 256 grid: <code>${hL256.wallL}</code>`)}
      ${row('Socket, 128', `reveal ${hL.socket.c} hinted to the 128 grid: <code>${hL.wallL}</code>`)}
      ${row('Right wall + arc', `right wall ${hL512.xr}..${hL512.xr + hL512.L} x ${hL512.py}..${hL512.pyB}, arc band r ${hL512.rin} to ${hL512.rout} as ${hL512.poly}° polylines, one outline`)}
      ${row('Afterglow', `one region (floor y ${hL512.py}, outer r ${hL512.rmid}, leaf side on the needle axis (${P2(hL512.CB)}) to (${P2(hL512.CM)})) as one flat tint ${GLOW_PAPER}`)}
    </table>`;
  };
  const SHIPTABLE = [
    ['16', '16 master', 'viewBox 32, 2 units per px', 'favicon, reversed on the plate (src/app/icon.svg)'],
    ['20', '20 master', '20 grid, 1 unit = 1 px', 'small UI marks'],
    ['32', '32 master', '32 grid, 1 unit = 1 px', 'app header on phones (Wordmark phone 34)'],
    ['48', '48 master', '48 grid, 1 unit = 1 px', 'app header (01-swing-final-lockup-header.svg, Wordmark 44)'],
    ['64', 'hero', 'viewBox 32, 2 px per unit', 'home hero on phones (Wordmark phone 64, motion)'],
    ['128', 'hero-large 128', 'viewBox 32, 4 px per unit; reveal 1 px hinted; on 2x screens the curved socket (hero-large-2x)', 'home hero lockup (01-swing-final.svg, public/logo.svg, Wordmark 128, motion); one colour and reverse'],
    ['256', 'hero-large 256', 'viewBox 32, 8 px per unit; reveal 1 px hinted; on 2x screens the 512 socket', 'the Open Graph card (01-swing-final-og.svg, white page), print, large marketing'],
    ['512', 'hero-large 512', 'viewBox 32, 16 px per unit; reveal 2 px curved', 'PWA icon, print, the construction above'],
    ['256, one colour', 'one colour 256', 'viewBox 32, 8 px per unit; reveal 0.25 = 2 px curved', 'one colour and reverse at 256 (and at 128 on 2x screens)'],
    ['512, one colour', 'one colour 512', 'viewBox 32, 16 px per unit; reveal 0.25 = 4 px curved', 'one colour and reverse at 512'],
    ['180', '180 master', '180 grid, white square or reversed on the plate', 'apple-touch-icon, reversed (src/app/apple-icon.png)'],
  ];

  /* ---------------------------------------------------------------- page */
  const page = (log, nOk, nFail) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Swing, final</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders:opsz,wght@10..72,400..800&amp;family=Instrument+Sans:wght@400..700&amp;display=swap" rel="stylesheet">
<link rel="icon" href="marks/01-swing-final-16.svg" type="image/svg+xml">
<style>
:root{--paper:${PAPER};--panel:${WHITE};--tone:${TONE};--line:${LINE};--line-strong:${LINE_STRONG};--ink:${TITLE};--mark-ink:${INK};--text:${TEXT};--muted:${MUTED};--accent:${ACC};--mark-needle:${ACC};--mark-arc:${ARC_PAPER}}
*{box-sizing:border-box;border-radius:0}html,body{background:var(--paper)}
body{margin:0;color:var(--text);font:15px/1.55 'Instrument Sans',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1200px;margin:0 auto;padding:0 40px}
.top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid var(--line);font-size:13px;font-weight:500;color:var(--muted)}
.top b{color:var(--ink);font-weight:600}
h1{font:500 clamp(56px,9vw,100px)/.9 'Big Shoulders','Arial Narrow',sans-serif;font-optical-sizing:auto;letter-spacing:-.012em;color:var(--ink);margin:72px 0 24px}
.lede{font-size:19px;line-height:1.5;max-width:860px;margin:0 0 56px;color:var(--text)}
h2{font:500 40px/1 'Big Shoulders','Arial Narrow',sans-serif;letter-spacing:-.005em;color:var(--ink);margin:0 0 10px}
h3{font:600 21px/1.1 'Big Shoulders','Arial Narrow',sans-serif;color:var(--ink);margin:12px 0 4px}
.lab{font-size:13px;font-weight:500;color:var(--muted);margin:0 0 10px;display:block}
section{padding:44px 0 64px;border-top:1px solid var(--line)}
.sub{margin:0 0 28px;max-width:780px;color:var(--muted)}
.board{background:var(--panel)}
.board.live{background:var(--panel)}
.cons{display:grid;grid-template-columns:auto 1fr;gap:44px;align-items:start}
.cons>*{min-width:0}.cons svg{display:block;max-width:100%;height:auto}
.rules{margin:0;padding:0;list-style:none}
.rules li{padding:12px 0 12px 40px;border-top:1px solid var(--line);position:relative;font-size:14px}
.rules li i{position:absolute;left:0;top:11px;font:600 13px/1 'Instrument Sans',sans-serif;font-style:normal;color:var(--ink);width:24px;height:24px;border:1.5px solid var(--ink);display:flex;align-items:center;justify-content:center;background:var(--panel)}
.rules b{color:var(--ink)}
code{font:500 12px 'Instrument Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums;background:var(--tone);padding:1px 4px;color:var(--ink);word-break:break-all}
.joints{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:22px}
.joint{min-width:0}.joint h3 i{font:600 14px 'Instrument Sans',sans-serif;font-style:normal;color:var(--muted);margin-right:8px}
.joint p{margin:0;font-size:13px;color:var(--muted)}
.ship{max-width:960px}.ship th{text-align:left;font-size:13px;font-weight:500;color:var(--muted);padding:0 12px 8px 0}
.ship td{padding:9px 12px 9px 0}.ship td:first-child{font:700 18px/1.2 'Big Shoulders',sans-serif;font-variant-numeric:tabular-nums;color:var(--ink);width:150px}.ship td:nth-child(2){width:150px}
.ramp{display:flex;align-items:flex-end;gap:26px;flex-wrap:wrap;padding:28px 24px 18px}
.ramp>div{display:flex;flex-direction:column;align-items:center;gap:10px}
.ramp svg{display:block;max-width:100%;height:auto}
.ramp .lab{margin:0;text-align:center}.ramp .lab b{display:block;font:700 16px 'Big Shoulders',sans-serif;color:var(--ink)}
.pxrow{display:flex;gap:26px;flex-wrap:wrap;align-items:flex-end}
.pxrow>div{display:flex;flex-direction:column;gap:8px;min-width:0}.pxrow .lab{margin:0}
canvas.px{display:block;image-rendering:pixelated;max-width:100%;height:auto}
.dec{margin:28px 0 0;padding:0;list-style:none;columns:2;column-gap:44px}
.dec li{break-inside:avoid;padding:10px 0;border-top:1px solid var(--line);font-size:14px}
.dec b{color:var(--ink)}
.use{display:grid;grid-template-columns:1fr 1fr;gap:22px}.use>div{min-width:0}.use .wide{grid-column:1/-1}
.apphdr{height:76px;background:var(--paper);display:flex;align-items:center;justify-content:space-between;gap:22px;padding:0 18px;overflow:hidden}
.apphdr>svg{display:block;flex:none}
.apphdr nav{align-self:stretch;display:flex;gap:4px;font-size:16px;color:var(--text);font-weight:500;min-width:0}.apphdr nav span{display:flex;align-items:center;padding:0 12px;white-space:nowrap}.apphdr nav .q{font-size:14px;color:var(--muted);margin-left:8px}
.browser{border:1px solid var(--line-strong);overflow:hidden;background:#DEDFE0;margin-bottom:12px}
.browser.dark{background:#1F1F22;border-color:#1F1F22}
.tabs{display:flex;align-items:flex-end;padding:7px 8px 0;gap:2px;height:40px}
.tab{display:flex;align-items:center;gap:8px;height:33px;padding:0 10px;font:12px/1 'Instrument Sans',system-ui;color:#5A5C62;flex:0 1 190px;min-width:0}
.dark .tab{color:#A9ABB0}
.tab span:not(.ghost){flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tab.on{background:#fff;color:#1d1d20}.dark .tab.on{background:#35353A;color:#F6F1F8}.tab svg{display:block;flex:none}.tab b{font-weight:400;color:#8a8c92}
.ghost{width:16px;height:16px;background:#BFC1C4;flex:none}
.bar{background:#fff;height:34px;display:flex;align-items:center;padding:0 10px}.dark .bar{background:#35353A}.bar span{flex:1;height:20px;background:#EFF0F0}.dark .bar span{background:#2A2A2E}
.mr{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}
.mr>div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:10px;padding:20px 0 12px;background:var(--panel);box-shadow:inset 0 0 0 1px var(--line)}
.mr .rev{background:${PLATE};box-shadow:none}.mr .rev .lab{color:${LILAC}}
.mr svg{display:block;max-width:100%;height:auto}.mr .lab{margin:0}
.lock{padding:44px 24px;margin-bottom:36px;display:flex;flex-direction:column;align-items:center;gap:22px}.lock svg,.lock img{display:block;max-width:100%;height:auto}
table{border-collapse:collapse;width:100%;font-size:13px;margin-top:8px}
td{border-top:1px solid var(--line);padding:7px 0;vertical-align:top}td:first-child{width:130px;font-weight:600;color:var(--ink);padding-right:10px}
pre{background:var(--tone);color:var(--text);font:500 12px/1.6 ui-monospace,Menlo,monospace;padding:24px 26px;overflow:auto;margin:14px 0 0;max-height:640px}
.log{font:500 12px/1.6 'Instrument Sans',system-ui,sans-serif;font-variant-numeric:tabular-nums;color:var(--muted);white-space:pre-wrap;margin:14px 0 0;padding:16px 18px;max-height:640px;overflow:auto}
.foot{padding:40px 0 80px;border-top:1px solid var(--line);font-size:13px;color:var(--muted)}
@media (max-width:980px){.cons,.use{grid-template-columns:1fr}.dec{columns:1}.wrap{padding:0 16px}.mr{grid-template-columns:1fr 1fr}}
</style></head>
<body><div class="wrap">
<div class="top"><span><b>Studio A</b> for Turnout</span><span>Swing, final, identity Velours</span></div>
<h1>Swing, final</h1>
<p class="lede">The needle now pivots on a round hub set into the end of the left wall: the hub is tangent to the wall's top, bottom and end, and the wall is cut around it with a fine paper reveal, so the needle reads as hinged in the wall, not lying on it. At 512 px and up the socket is the true concentric cut, a 2 px reveal; at 256 and 128 the reveal is one pixel and the socket is hinted to whole pixels, so it reads as a clean paper column instead of grey half-tones. That hinting is for 1x screens: on a 2x screen the component draws the curved socket instead, so the hub never sits in a doubled staircase. Below 128 px, where the reveal would be a fraction of a pixel, the hub becomes a foot of whole pixels at the wall end with its outer corner rounded. The outer arc is full ink at two thirds of the walls' weight from 32 px up (4 px at 128), so mark and word carry the same weight; at 20 and 16 px it is one device pixel of ink at 65 %. No gradient and no hairline: the afterglow is one flat tint, the door's swept area, and the inner ring is gone. Colours are Velours: walls, arc and word aubergine ${INK}, needle wine ${ACC}, afterglow ${GLOW_PAPER}, on the white page; reversed on the aubergine plate ${PLATE} with ${ON_PLATE}, dusty rose ${ROSE} and the plum tint ${GLOW_REVERSE}. Personality: live. The mark is still; on the home hero the needle swings open once, ${DUR} ms, the afterglow trailing behind it.</p>

<section>
  <h2>Construction</h2><p class="sub">Hero-large 512 master on the 32 unit grid, at its native 16 px per unit. One datum (y ${hL512.py}, the wall-top line); arc and afterglow about A (${hL512.hx}, ${hL512.py}); the needle about its hub P (${hL512.P.join(', ')}).</p>
  <div class="cons">
    <div class="board">${construction()}</div>
    <div><ol class="rules">
      <li><i>a</i><b>Hub in its socket.</b> The needle ends in a hub of r ${hL512.R} inscribed in the wall end: tangent to the wall top y ${hL512.py}, the wall bottom y ${hL512.pyB} and the jamb x ${hL512.hx}, so wall plus hub are ${hL512.L} long like the right wall. Its edges are straight and tangent to the hub, ${r4(2 * hL512.R)} wide there and ${hL512.nd.taper.wTop} at the arc. The wall is cut ${hL512.socket.c} around it (2 px at 512), then drops square at x ${hL512.socket.E[0]}. At 256 (reveal ${hL256.socket.c}) and 128 (reveal ${hL.socket.c}) the same socket is hinted: the wall ink ends on a whole pixel in every row, with one clear pixel column before the hub.</li>
      <li><i>b</i><b>Arc on the right wall.</b> One outline with the right wall. Inner edge r ${hL.rin} leaves the wall corner (${hL.xr}, ${hL.py}) tangent to the jamb face; outer edge r ${hL.rout} lands square on the wall top. At 20 and 16 px the arc has its own solid 65 % colour and its foot runs on under the wall.</li>
      <li><i>c</i><b>Needle top on the arc.</b> The axis runs from P to T (${P2(hL.T)}), where the previous needle met the arc. The top is cut on r ${hL.rin} and drawn on to r ${hL.rmid}, under the arc.</li>
      <li><i>d</i><b>Arc top end.</b> Cut on the radius x ${hL.hx}, from y ${hL.py - hL.rout} to ${hL.py - hL.rin}.</li>
      <li><i>e</i><b>Afterglow edges.</b> Floor on the datum, outer edge on r ${hL.rmid} under the arc, leaf side on the needle axis inside the needle. Nothing of it can show outside the needle, the arc or the datum. One flat tint, ${GLOW_PAPER} (${GLOW_REVERSE} on the plate): the door's swept area, not a fade.</li>
    </ol>
    <details style="margin-top:18px"><summary class="lab" style="cursor:pointer;display:list-item">Every coordinate</summary>${coordRows()}</details></div>
  </div>
</section>

<section>
  <h2>Every joint, close up</h2><p class="sub">The hero-large 512 rasterised at its native 512 px (16 px per unit), cropped and enlarged 3x without smoothing. Guides in blue: datum and x ${hL.hx} dashed, arc inner edge solid, arc outer edge dashed, hub dashed, socket solid, the needle axis dotted.</p>
  <div class="joints">${JOINTS.map(([id, name, x, y, w, hh, txt, opt]) => `<div class="joint">${canvas(svg(hL512, 512, 'color', opt || {}), 512, 3, [x * U512, y * U512, w * U512, hh * U512], { guides: heroGuides })}<h3><i>${id}</i>${name}</h3><p>${txt}</p></div>`).join('')}
    <div class="joint">${canvas(svg(hL512, 1280), 1280, 1, [1.5 * 40, 23.5 * 40, 6 * 40, 5 * 40])}<h3><i>a</i>Hub at 1280</h3><p>The same joint at 40 px per unit (a review size), 1:1.</p></div>
    <div class="joint">${canvas(svg(hL256, 256), 256, 6, [1.5 * 8, 24 * 8, 6 * 8, 4.5 * 8], { grid: 1 })}<h3><i>a</i>Hinted socket at 256</h3><p>The hero-large 256 at its native size, 6x: reveal ${hL256.socket.c} = 1 px, the wall ink ending on whole pixels (device columns ${hL256.socket.rows.map(r => r.w).join(', ')}).</p></div>
    <div class="joint">${canvas(svg(hL, 128), 128, 12, [1.5 * 4, 24 * 4, 6 * 4, 4.5 * 4], { grid: 1 })}<h3><i>a</i>Hinted socket at 128</h3><p>The hero-large 128 at its native size, 12x: reveal ${hL.socket.c} = 1 px, wall ink to column ${hL.socket.rows[0].w - 1} on the top and bottom rows, ${Math.min(...hL.socket.rows.map(r => r.w)) - 1} between, then one paper column.</p></div>
    <div class="joint">${canvas(svg(hLm256, 256), 256, 6, [1.5 * 8, 24 * 8, 6 * 8, 4.5 * 8], { grid: 1 })}<h3><i>a</i>128 on a 2x screen</h3><p>At 128 CSS px and devicePixelRatio 2 the mark is 256 device px. The component swaps the 1x staircase, which doubled would show 2 px nubs, for the curved socket: reveal ${hLm256.socket.c} = 2 device px, 6x.</p></div>
    <div class="joint">${canvas(svg(hLm512, 512, 'mono'), 512, 3, [1.5 * 16, 23.5 * 16, 6 * 16, 5 * 16])}<h3><i>a</i>One colour at 512</h3><p>One colour and reverse have their own 256 and 512: the 128's reveal, ${hLm512.socket.c}, cut as a true curve concentric with the hub (2 px at 256, 4 px at 512), 3x.</p></div>
    <div class="joint">${canvas(svg(h, 64), 64, 8, [6, 6, 28, 16], { grid: 1 })}<h3><i>d</i>Arc at 64</h3><p>The hero's arc is ${h.aw} = ${h.aw * 2} px of full ink against 3 px walls: both edges and its top end land on whole pixels, top end rows ${(h.py - h.rout) * 2} to ${(h.py - h.rin) * 2 - 1}, foot columns ${h.xr * 2} to ${(h.hx + h.rout) * 2 - 1}, 8x.</p></div>
    <div class="joint">${canvas(svg(h, 64), 64, 8, [0, 40, 24, 20], { grid: 1 })}<h3><i>a</i>Pixel foot at 64</h3><p>The hero at its native 64, 8x: ink wall 5 px, wine foot 3 px with its corner pixel rounded, no reveal.</p></div>
  </div>
</section>

<section>
  <h2>Sizes we ship</h2><p class="sub">A mark is only ever drawn at the native size of a master, or at a whole multiple of it through an integer device pixel ratio. At those sizes every straight edge, every cut and the foot fall on whole pixels.</p>
  <table class="ship"><tr><th>CSS size</th><th>Master</th><th>Grid at that size</th><th>Where it is used</th></tr>
  ${SHIPTABLE.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>
  <div class="ramp board" style="margin-top:28px">${RAMP.map(n => `<div>${isvg(Q[pickSize(n)], n)}<span class="lab"><b>${n}</b>${LABEL[pickSize(n)]}</span></div>`).join('')}</div>
</section>

<section>
  <h2>Every master at its native size</h2><p class="sub">Each master rasterised by this browser at its native size, one canvas pixel per CSS pixel, then enlarged without smoothing on its pixel grid; then at 2x.</p>
  <div class="pxrow">
    <div>${canvas(svg(q16, 16), 16, 8, null, { grid: 1 })}<span class="lab">16 master, 8x</span></div>
    <div>${canvas(svg(q20, 20), 20, 8, null, { grid: 1 })}<span class="lab">20 master, 8x</span></div>
    <div>${canvas(svg(q32, 32), 32, 6, null, { grid: 1 })}<span class="lab">32 master, 6x</span></div>
    <div>${canvas(svg(q48, 48), 48, 4, null, { grid: 1 })}<span class="lab">48 master, 4x</span></div>
    <div>${canvas(svg(h, 64), 64, 4, null, { grid: 1 })}<span class="lab">hero at 64, 4x</span></div>
    <div>${canvas(svg(hL, 128), 128, 2, null, { grid: 1 })}<span class="lab">hero-large 128, 2x</span></div>
    <div>${canvas(svg(hL256, 256), 256, 1, null)}<span class="lab">hero-large 256, 1:1</span></div>
    <div>${canvas(svg(q180, 180), 180, 2, null, { grid: 1 })}<span class="lab">180 master, 2x</span></div>
  </div>
  <div class="pxrow" style="margin-top:22px">
    <div>${canvas(svg(q16, 32), 32, 4, null, { grid: 1 })}<span class="lab">16 master at 2x, 4x</span></div>
    <div>${canvas(svg(q20, 40), 40, 4, null, { grid: 1 })}<span class="lab">20 master at 2x, 4x</span></div>
    <div>${canvas(svg(q32, 64), 64, 3, null, { grid: 1 })}<span class="lab">32 master at 2x, 3x</span></div>
    <div>${canvas(svg(q48, 96), 96, 2, null, { grid: 1 })}<span class="lab">48 master at 2x, 2x</span></div>
    <div>${canvas(svg(h, 128), 128, 2, null, { grid: 1 })}<span class="lab">hero at 2x, 2x</span></div>
    <div>${canvas(svg(hLm256, 256), 256, 1, null)}<span class="lab">hero-large 128 at 2x (curved socket), 1:1</span></div>
  </div>
  <ul class="dec">
    <li><b>Native sizes only.</b> 16, 20, 32, 48, the hero at 64, the hero-large masters at 128, 256 and 512, and 180 for the apple-touch icon. The component picks the master by size; give it a native size.</li>
    <li><b>Arc.</b> Full ink, two thirds of the walls' weight on whole pixels and never wider than the needle's top: ${hL.aw} of the grid at 64 px and up (2 px at 64, 4 at 128, 8 at 256, 16 at 512), ${q48.aw} px in the 48 master, ${q32.aw} px at 32, ${q180.aw} px in the 180 master. At 20 and 16 px, where walls and needle are 1 px, exactly one device pixel of ink at 65 %, written as the solid ${ARC_PAPER}, so the wine needle still leads.</li>
    <li><b>Hub and foot.</b> Hub r 0.75: reveal 0.125 at 512 (2 px, curved), 0.125 at 256 and 0.25 at 128 (1 px, hinted to whole pixels). A hinted socket is right at 1x only, so on 2x screens the 128 draws the curved socket with reveal 0.25 and the 256 draws the 512 socket, both 2 device px. One colour and reverse keep 0.25: hinted at 128, curved at 256 (2 px) and 512 (4 px). Hub r 4 with a 1 px hinted reveal in the 180 master, shipped as a 180 px PNG. Pixel foot 3 x 3 px in the hero and the 48 master, 2 x 2 px at 32, 1 px at 20, the pixel above the wall end at 16.</li>
    <li><b>No ring.</b> The inner ring of the first pass (a 1 px band at 20 to 50 %) is dropped: in Velours it read as a hairline crossing the afterglow.</li>
    <li><b>Curves as polylines.</b> ${hL.poly}° steps in the hero, the hero-large masters, mono, reverse and 180 master, 2° in the small masters and on the hub. Chrome flattens true SVG arcs coarsely enough to move a 1 px edge's coverage by tens of points.</li>
    <li><b>Afterglow.</b> One flat fill, a solid colour: the needle at ${Math.round(GLOW_K.color * 100)} % over white, ${GLOW_PAPER}; rose at ${Math.round(GLOW_K.reverse * 100)} % over the plate, ${GLOW_REVERSE}; ink at ${Math.round(GLOW_K.mono * 100)} %, ${GLOW_MONO}, in one colour. No mask, no opacity, no fade: the door's swept area as an architect tints it.</li>
  </ul>
</section>

<section>
  <h2>In use</h2><p class="sub">The header lockup in the app's 76 px bar on the white page, with its real navigation. The 16 master as the favicon, reversed on a square of the plate, a brand chip on light and dark tab strips. One colour and reverse at 128, the 180 master reversed on the plate as the apple-touch icon (iOS applies its own mask).</p>
  <div class="use"><div class="wide"><span class="lab">App header as src/app/layout.tsx draws it on wide screens: 48 master, 44 px word</span>${header()}</div><div><span class="lab">Favicon, light tab strip</span>${tab(false)}</div><div><span class="lab">Favicon, dark tab strip</span>${tab(true)}</div></div>
  <div class="mr">
    <div>${isvg(hL, 128, 'mono')}<span class="lab">One colour, 128</span></div>
    <div class="rev">${isvg(hL, 128, 'reverse')}<span class="lab">Reverse, 128</span></div>
    <div>${isvg(q16, 16, 'mono')}${canvas(svg(q16, 16, 'mono'), 16, 6, null, { grid: 1 })}<span class="lab">One colour, 16</span></div>
    <div class="rev">${isvg(q180, 180, 'reverse')}<span class="lab">Apple touch, 180, reversed</span></div>
  </div>
</section>

<section>
  <h2>Lockups</h2><p class="sub">The mark's floor sits on the word's baseline. Word Big Shoulders 500, the weight of the Velours titles, sentence case, tracking 0, in the mark's aubergine. No descriptor. Every letter is outlined in the files, so they render without the fonts.</p>
  <div class="lock board">${heroLockup(hL, { id: `g${++UID}`, ink2x: hLm256.ink }).svg}<span class="lab" style="margin:0">01-swing-final.svg and public/logo.svg, ${lock.W} x ${lock.H}: hero-large 128, word 128 px, gap 24, the home hero</span>${headerLockup(q48, { id: `g${++UID}` }).svg}<span class="lab" style="margin:0">01-swing-final-lockup-header.svg, ${hdr.W} x ${hdr.H}: 48 master, word 44 px, gap 8, as the app header</span>${canvas(headerLockup(q48, { id: 'hz' }).svg, hdr.W, 4, null, { bg: PAPER, h: hdr.H })}<span class="lab" style="margin:0">Header lockup at 1x, enlarged 4x</span></div>
  <div><img src="01-swing-final-og.svg" width="1200" height="630" alt="Open Graph card" style="display:block;max-width:100%;height:auto"><span class="lab" style="margin:12px 0 0">01-swing-final-og.svg, the source of src/app/opengraph-image.png, 1200 x 630</span></div>
</section>

<section>
  <h2>Geometry, ready for React</h2><p class="sub">Written by the generator to src/components/Logo.tsx.</p>
  <pre>${esc(jsx)}</pre>
  <h2 style="margin-top:40px">Build checks: ${nOk} ok, ${nFail} FAIL</h2>
  <div class="log board">${esc(log)}</div>
</section>
<div class="foot">Studio A for Turnout. Files: swing-final.html, 01-swing-final.svg, 01-swing-final-lockup-header.svg, 01-swing-final-og.svg, marks/01-swing-final-{hero-large,hero-large-2x,hero-large-256,hero-large-512,hero,180,48,32,20,16,mono,mono-256,mono-512,mono-16,reverse,reverse-256,reverse-512,180-reverse}.svg, wordmark-outlines.json; src/components/Logo.tsx, src/app/icon.svg, public/logo.svg. Generated by swing-final.mjs.</div>
</div>
<script>
const SRC = ${JSON.stringify(Object.fromEntries([...SRC].map(([s, key]) => [key, uri(s)])))};
// Rasterise each SVG at its own pixel size, exactly as the browser draws it, then enlarge without smoothing.
document.querySelectorAll('canvas.px').forEach(c => {
  const n = +c.dataset.n, nh = +(c.dataset.h || n), k = +c.dataset.k, cr = (c.dataset.crop || '0 0 ' + n + ' ' + nh).split(' ').map(Number);
  const img = new Image();
  img.onload = () => {
    const s = document.createElement('canvas'); s.width = n; s.height = nh;
    const sx = s.getContext('2d'); sx.fillStyle = c.dataset.bg || '${PAPER}'; sx.fillRect(0, 0, n, nh); sx.drawImage(img, 0, 0, n, nh);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, cr[0], cr[1], cr[2], cr[3], 0, 0, cr[2] * k, cr[3] * k);
    if (c.dataset.grid !== undefined) {
      x.strokeStyle = 'rgba(17,17,20,.08)'; x.lineWidth = 1; x.beginPath();
      for (let i = 1; i < cr[2]; i++) { x.moveTo(i * k + .5, 0); x.lineTo(i * k + .5, cr[3] * k); }
      for (let i = 1; i < cr[3]; i++) { x.moveTo(0, i * k + .5); x.lineTo(cr[2] * k, i * k + .5); }
      x.stroke();
    }
    if (c.dataset.guides) {
      const G = JSON.parse(c.dataset.guides), X = v => (v * G.u - cr[0]) * k, Y = v => (v * G.u - cr[1]) * k;
      x.strokeStyle = 'rgba(47,125,209,.85)'; x.lineWidth = 1;
      const dash = t => x.setLineDash(t === 'd' ? [4, 3] : t === 'o' ? [1, 3] : []);
      for (const [x0, y0, x1, y1, t] of G.lines) { dash(t); x.beginPath(); x.moveTo(X(x0) + (x0 === x1 ? .5 : 0), Y(y0) + (y0 === y1 ? .5 : 0)); x.lineTo(X(x1) + (x0 === x1 ? .5 : 0), Y(y1) + (y0 === y1 ? .5 : 0)); x.stroke(); }
      for (const [cx, cy, r, t] of G.circles) { dash(t); x.beginPath(); x.arc(X(cx), Y(cy), r * G.u * k, 0, 2 * Math.PI); x.stroke(); }
    }
  };
  img.src = SRC[c.dataset.src];
});
</script>
</body></html>
`;

  /* ---------------------------------------------------------------- wording guard, then write */
  const RANGE = /\b\d+\s*(?:\.\.|to|-)\s*\d+\s*px\b|(?:>=|<=)\s*\d+\s*px|\brange\b/i;
  const prose = [...Object.values(NOTE), jsx, page('', 0, 0).replace(/<script>[\s\S]*<\/script>/, '').replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]*>/g, ' ')];
  const hits = prose.flatMap(s => (s.match(new RegExp(RANGE.source, 'gi')) || []));
  checks.push(`${hits.length ? 'FAIL' : 'ok  '} wording: no size ranges in the file headers, the React file or the sheet; native sizes stated instead${hits.length ? ': ' + hits.join(', ') : ''}`);
  const sheetText = page('', 0, 0);
  const retired = sheetText.match(/Fraunces|\bInter\b|IBM Plex Mono|#111114|#E0115F|#F2F3F3|#F7F4EE|#B4530A|#17150F|text-transform:\s*uppercase|letter-spacing:\s*\.1\de?m|border-radius:\s*[1-9]|box-shadow:\s*0 \d+px \d+px/gi) || [];
  checks.push(`${retired.length ? 'FAIL' : 'ok  '} sheet: no font, colour, tracked caps, rounded corners or soft shadow of the retired look${retired.length ? ': ' + retired.join(', ') : ''}`);
  const fails = checks.filter(c => c.startsWith('FAIL'));
  if (fails.length) { console.error(fails.join('\n')); process.exitCode = 1; }
  const nOk = checks.filter(c => c.startsWith('ok')).length;
  out['swing-final.html'] = page(checks.join('\n'), nOk, fails.length);
  for (const [rel, s] of Object.entries(out)) fs.writeFileSync(path.join(OUT, rel), s);
  const app = { 'src/components/Logo.tsx': jsx, 'src/app/icon.svg': icon, 'public/logo.svg': out['01-swing-final.svg'] };
  if (!process.env.NO_APP) for (const [rel, s] of Object.entries(app)) fs.writeFileSync(path.join(ROOT, rel), s);
  console.log([...Object.keys(out), ...Object.keys(app)].join('\n'));
  console.log(checks.join('\n'));
  console.log(`${nOk} ok, ${fails.length} FAIL`);
}
