// Studio A, Turnout. Swing refinement: three executions differing only in finesse.
// Run: node design/studio-a/swing-final.mjs  -> swing-final.html, marks/01-swing-final-*.svg, 01-swing-final.svg
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, lockup, glowOps } from './generate.mjs';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const r3 = n => +(+n).toFixed(3);
const rad = d => d * Math.PI / 180;
const REV = '#E39A5F';
const MODES = {
  color: { line: C.ink, acc: C.accent, glow: C.accent, gk: 1 },
  mono: { line: C.ink, acc: C.ink, glow: C.ink, gk: 0.6 },
  reverse: { line: C.paper, acc: REV, glow: REV, gk: 1.25 },
};
const THETA = 58; // leaf angle above the hinge line, degrees

/* Shared construction (same idea, three finesses).
   Every grid: hinge H on the wall centreline; r_in = arc inner edge = door width = leaf length;
   arc centreline R = r_in + arc/2 so the inner edge is a whole unit; right stub starts on the arc's inner edge,
   so the arc's inner edge drops straight into the stub's inner face. */
const GRIDS = {
  main: { vb: 32, hx: 6, hy: 26, rin: 20, L: 4, N: 16 },
  s16: { vb: 32, hx: 6, hy: 27, rin: 20, L: 4, N: 6, px: 2, sw: 2 },   // 16 px: 1 px = 2 units
  s20: { vb: 20, hx: 4, hy: 16.5, rin: 12, L: 3, N: 10, px: 1, sw: 1 }, // 20 px: native 20 unit grid, 1 px = 1 unit
};
const V = {
  S1: { name: 'Fine', main: { aw: 1.0, lw: 1.2, sw: 1.4, ring: [12, 0.7, 0.5], glow: 0.22 },
    s16: { aw: 2, lw: 2, glow: 0.30 }, s20: { aw: 0.94, lw: 1.0, ring: [7, 0.7, 0.45], glow: 0.26 } },
  S2: { name: 'Hairline', main: { aw: 0.8, lw: 1.0, sw: 1.2, ring: [12, 0.6, 0.5], glow: 0.26 },
    s16: { aw: 1.6, lw: 1.8, glow: 0.34 }, s20: { aw: 0.75, lw: 0.9, ring: [7, 0.6, 0.45], glow: 0.30 } },
  S3: { name: 'Balanced', main: { aw: 1.2, lw: 1.4, sw: 1.6, ring: [12, 0.8, 0.5], glow: 0.24 },
    s16: { aw: 2, lw: 2.4, glow: 0.32 }, s20: { aw: 1.0, lw: 1.15, ring: [7, 0.75, 0.45], glow: 0.28 } },
};

function geom(vid, gid) {
  const G = GRIDS[gid], S = V[vid][gid];
  const g = { ...G, ...S, sw: S.sw ?? G.sw };
  const { hx, hy, rin } = g, R = r3(rin + g.aw / 2), h = g.lw / 2;
  const c = Math.cos(rad(THETA)), s = Math.sin(rad(THETA));
  const t = Math.sqrt(rin * rin - h * h);
  const leaf = {
    bp: [r3(hx + h / s), hy], bm: [r3(hx - h / s), hy],
    tp: [r3(hx + t * c + h * s), r3(hy - t * s + h * c)],
    tm: [r3(hx + t * c - h * s), r3(hy - t * s - h * c)],
  };
  const sectors = glowOps(g.N, g.glow).map((o, i) => {
    const a = THETA * i / g.N;
    const p = ang => [r3(hx + rin * Math.cos(rad(ang))), r3(hy - rin * Math.sin(rad(ang)))];
    const [x0, y0] = p(a), [x1, y1] = p(THETA);
    return { a: r3(a), o, d: `M${hx} ${hy}L${x0} ${y0}A${rin} ${rin} 0 0 0 ${x1} ${y1}Z` };
  });
  return {
    ...g, R,
    stubL: `M${hx - g.L} ${hy}H${hx}`, stubR: `M${hx + rin} ${hy}H${hx + rin + g.L}`,
    arc: `M${r3(hx + R)} ${hy}A${R} ${R} 0 0 0 ${hx} ${r3(hy - R)}`,
    ring: g.ring ? { d: `M${hx + g.ring[0]} ${hy}A${g.ring[0]} ${g.ring[0]} 0 0 0 ${hx} ${hy - g.ring[0]}`, w: g.ring[1], op: g.ring[2] } : null,
    leaf, leafD: `M${leaf.bp.join(' ')}L${leaf.tp.join(' ')}A${rin} ${rin} 0 0 0 ${leaf.tm.join(' ')}L${leaf.bm.join(' ')}Z`,
    sectors,
  };
}

// precision checks
const checks = [];
function verify(vid, gid, q) {
  const tag = `${vid} ${gid}`;
  const whole = n => Math.abs(n - Math.round(n)) < 1e-9, half = n => whole(n * 2);
  const ok = (cond, msg) => checks.push(`${cond ? 'ok  ' : 'FAIL'} ${tag}: ${msg}`);
  ok(whole(q.hx) && (gid === 's20' ? half(q.hy) : whole(q.hy)), `hinge (${q.hx}, ${q.hy}) ${gid === 's20' ? 'x whole, y on the pixel centre' : 'on whole units'}`);
  ok(whole(q.hx - q.L) && whole(q.hx + q.rin + q.L) && q.L === q.L, `stubs ${q.hx - q.L}..${q.hx} and ${q.hx + q.rin}..${q.hx + q.rin + q.L}: identical length ${q.L}, outer ends whole`);
  ok(whole(q.rin), `arc inner edge r ${q.rin} whole; arc centreline R ${q.R} = r_in + ${q.aw}/2, centred on the hinge`);
  const dist = p => Math.hypot(p[0] - q.hx, p[1] - q.hy);
  ok(Math.abs(dist(q.leaf.tp) - q.rin) < 0.003 && Math.abs(dist(q.leaf.tm) - q.rin) < 0.003, `leaf top corners on r ${q.rin} (${dist(q.leaf.tp).toFixed(3)}, ${dist(q.leaf.tm).toFixed(3)}), never crossing`);
  ok(q.leaf.bp[1] === q.hy && q.leaf.bm[1] === q.hy, `leaf base cut on the hinge line y ${q.hy}: no overshoot below the wall line`);
  if (q.px) {
    const e = [q.hy - q.sw / 2, q.hy + q.sw / 2, q.hx - q.L, q.hx, q.hx + q.rin, q.hx + q.rin + q.L];
    ok(e.every(v => Math.abs(v / q.px - Math.round(v / q.px)) < 1e-9), `stub edges ${e.join(', ')} on the pixel grid (${q.px} unit = 1 px): crisp`);
  }
}

function body(q, mode = 'color') {
  const k = MODES[mode];
  const gmax = k.gk;
  let s = '';
  s += q.sectors.map(x => `<path d="${x.d}" fill="${k.glow}" fill-opacity="${Math.min(0.6, +(x.o * gmax).toFixed(4))}"/>`).join('');
  if (q.ring) s += `<path d="${q.ring.d}" fill="none" stroke="${k.line}" stroke-width="${q.ring.w}" stroke-opacity="${q.ring.op}"/>`;
  s += `<path d="${q.arc}" fill="none" stroke="${k.line}" stroke-width="${q.aw}"/>`;
  s += `<path d="${q.stubL}${q.stubR}" fill="none" stroke="${k.line}" stroke-width="${q.sw}"/>`;
  s += `<path d="${q.leafD}" fill="${k.acc}"/>`;
  return s;
}
const svg = (q, size, mode = 'color', bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${q.vb} ${q.vb}">${bg ? `<rect width="${q.vb}" height="${q.vb}" fill="${bg}"/>` : ''}${body(q, mode)}</svg>`;
const uri = s => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

const Q = {};
for (const vid of Object.keys(V)) { Q[vid] = {}; for (const gid of Object.keys(GRIDS)) { Q[vid][gid] = geom(vid, gid); verify(vid, gid, Q[vid][gid]); } }
const bad = checks.filter(c => c.startsWith('FAIL'));
if (bad.length) { console.error(bad.join('\n')); process.exitCode = 1; }

/* ---------------------------------------------------------------- pick and files */
const PICK = 'S1';
const P = Q[PICK];
const files = [];
const write = (rel, s) => { fs.writeFileSync(path.join(OUT, rel), `<?xml version="1.0" encoding="UTF-8"?>\n${s}\n`); files.push(rel); };
write('marks/01-swing-final-32.svg', svg(P.main, 32));
write('marks/01-swing-final-20.svg', svg(P.s20, 20));
write('marks/01-swing-final-16.svg', svg(P.s16, 16));
write('marks/01-swing-final-mono.svg', svg(P.main, 32, 'mono'));
write('marks/01-swing-final-mono-16.svg', svg(P.s16, 16, 'mono'));
write('marks/01-swing-final-reverse.svg', svg(P.main, 32, 'reverse', C.ink));
const finalIdea = { fn: (v, mode) => body(P.main, mode) };
write('01-swing-final.svg', `<!-- Turnout, Studio A, Swing final (${PICK} ${V[PICK].name}). Hero lockup master on paper. Wordmark: Fraunces 500, opsz 144, -0.02em (live text: outline before print). -->\n` +
  lockup(finalIdea, { F: 96, bg: C.paper, standalone: true }));

/* ---------------------------------------------------------------- page pieces */
function construction() {
  const q = Q.S1.main, sc = 16, pad = 24, W = 32 * sc + pad * 2;
  const X = v => pad + v * sc;
  let grid = '';
  for (let i = 0; i <= 32; i++) grid += `<path d="M${X(i)} ${X(0)}V${X(32)}M${X(0)} ${X(i)}H${X(32)}" stroke="${i % 4 ? '#ECE6DB' : '#DDD5C7'}" stroke-width="1"/>`;
  const lab = (x, y, t, anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="ui-monospace, Menlo, monospace" font-size="11" fill="${C.muted}">${t}</text>`;
  return `<svg viewBox="0 0 ${W} ${W}" width="100%" role="img" aria-label="Construction of Swing on the 32 unit grid">
    <rect width="${W}" height="${W}" fill="#FBF9F5"/>${grid}
    <g transform="translate(${pad} ${pad}) scale(${sc})">${body(q)}</g>
    <g stroke="${C.accent}" stroke-width="1" fill="none" opacity=".9">
      <circle cx="${X(6)}" cy="${X(26)}" r="5"/><path d="M${X(6) - 9} ${X(26)}H${X(6) + 9}M${X(6)} ${X(26) - 9}V${X(26) + 9}"/>
      <path d="M${X(6)} ${X(26)}L${X(26)} ${X(26)}" stroke-dasharray="3 3"/>
    </g>
    ${lab(X(6) + 8, X(26) + 22, 'hinge (6, 26)')}
    ${lab(X(2), X(26) + 40, 'stub 2..6')}${lab(X(30), X(26) + 40, 'stub 26..30', 'end')}
    ${lab(X(16), X(26) - 8, 'r_in 20 = door = leaf', 'middle')}
    ${lab(X(21), X(4.2), 'arc R 20.5, w 1.0')}
    ${lab(X(2), X(4.2), 'arc ends at (6, 5.5)')}
    ${lab(X(6) + 6, X(14) - 8, 'ring r 12')}
    ${lab(X(15.4), X(8.6), 'leaf 58°, ends on r 20', 'end')}
  </svg>`;
}
function proof(src, n) {
  return `<canvas class="px" data-n="${n}" data-src="${uri(src)}" width="${n * 8}" height="${n * 8}"></canvas>`;
}
function header(q) {
  return `<div class="apphdr"><div class="brand">${svg(q.s20, 20)}<span class="wm">Turnout</span></div><nav><span class="on">Tonight</span><span>Campaigns</span></nav></div>`;
}
function tab(q) {
  return `<div class="browser"><div class="tabs"><div class="tab on">${svg(q.s16, 16)}<span>Turnout, tonight</span><b>&#215;</b></div><div class="tab"><span class="ghost"></span><span>Bookings</span></div></div><div class="bar"><span></span></div></div>`;
}
const coords = (vid) => {
  const m = Q[vid].main, a = Q[vid].s20, b = Q[vid].s16;
  const row = (k, v) => `<tr><td>${k}</td><td>${v}</td></tr>`;
  return `<table>
    ${row('Hinge', `(${m.hx}, ${m.hy})`)}
    ${row('Stubs', `<code>${m.stubL}</code> <code>${m.stubR}</code> w ${m.sw}, butt`)}
    ${row('Arc', `<code>${m.arc}</code> w ${m.aw}; inner edge r ${m.rin}`)}
    ${row('Ring', `<code>${m.ring.d}</code> w ${m.ring.w} at ${m.ring.op * 100} %`)}
    ${row('Leaf', `w ${m.lw}: base (${m.leaf.bm.join(', ')}) to (${m.leaf.bp.join(', ')}); top (${m.leaf.tm.join(', ')}) and (${m.leaf.tp.join(', ')}) on r ${m.rin}`)}
    ${row('Afterglow', `${m.N} sectors r ${m.rin}, 0 to 58°, max ${m.glow}`)}
    ${row('20 px', `vb 20: hinge (${a.hx}, ${a.hy}), stubs <code>${a.stubL}</code> <code>${a.stubR}</code> w 1, arc R ${a.R} w ${a.aw}, leaf ${a.lw}, ring r 7 w ${a.ring.w}, glow ${a.glow}`)}
    ${row('16 px', `vb 32: hinge (${b.hx}, ${b.hy}), stubs <code>${b.stubL}</code> <code>${b.stubR}</code> w 2, arc R ${b.R} w ${b.aw}, leaf ${b.lw}, no ring, glow ${b.glow}`)}
  </table>`;
};
const VERDICT = {
  S1: 'The elegant one. At 256 px the arc and the stubs finally have the same family weight as the Fraunces hairlines; the 1.4 stubs read as finished architectural wall ends, not blocks. At 20 px the 0.94 px arc holds as a full-strength line.',
  S2: 'Honest test result: at 20 px the 0.75 px arc does read, but as a grey line rather than ink, a step quieter than the walls and the serif. It still shows the door; it no longer shows the radar ring with conviction, and the ring itself is barely there. Beautiful at 128 px and above only.',
  S3: 'The safest. Every line is a full pixel at 20 px and the mark sits at the same visual weight as the wordmark. At 256 px it is correct but a touch heavier than the founder asked for; this is close to the previous sheet.',
};

function variantCol(vid) {
  const q = Q[vid], v = V[vid];
  const sizes = [[128, 'main'], [64, 'main'], [32, 'main'], [24, 's20'], [20, 's20'], [16, 's16']];
  return `<article class="col">
    <header><span class="vid">${vid}</span><h3>${v.name}</h3><p class="spec">arc ${v.main.aw} · leaf ${v.main.lw} · stubs ${v.main.sw} · glow ${v.main.glow}</p></header>
    <div class="big">${svg(q.main, 256)}<span class="cap">256 px</span></div>
    <div class="sizes">${sizes.map(([n, gid]) => `<div><div class="b">${svg(q[gid], n)}</div><span class="cap">${n}<i>${gid === 'main' ? '32' : gid === 's20' ? '20' : '16'}</i></span></div>`).join('')}</div>
    <div class="proofs"><div>${proof(svg(q.s16, 16), 16)}<span class="cap">16 px master, 8x</span></div><div>${proof(svg(q.s20, 20), 20)}<span class="cap">20 px master, 8x</span></div></div>
    ${header(q)}
    ${tab(q)}
    <div class="mr"><div class="mono">${svg(q.main, 72, 'mono')}<span class="cap">one colour</span></div><div class="rev">${svg(q.main, 72, 'reverse')}<span class="cap">reverse</span></div></div>
    <p class="verdict">${VERDICT[vid]}</p>
    <details open><summary>Every coordinate</summary>${coords(vid)}</details>
  </article>`;
}

/* ---------------------------------------------------------------- final geometry block */
const m = P.main, a = P.s20, b = P.s16;
const glowArr = q => q.sectors.map(x => `    ["${x.d}", ${x.o}],`).join('\n');
const jsx = `// Turnout mark, "Swing" final (${PICK} ${V[PICK].name}). Three masters; pick by rendered size.
// Colours: var(--ink), var(--accent). Reverse: ink -> var(--paper), accent -> #E39A5F, glow x1.25.
type Master = {
  vb: number; glow: [string, number][]; ring?: [string, number, number];
  arc: [string, number]; stubs: [string, number]; leaf: string;
};

export const SWING: Record<"main" | "px20" | "px16", Master> = {
  // >= 24 px. viewBox 0 0 32 32. Hinge (6, 26). Arc inner edge r 20 = door width = leaf length.
  main: {
    vb: 32,
    glow: [
${glowArr(m)}
    ],
    ring: ["${m.ring.d}", ${m.ring.w}, ${m.ring.op}],
    arc: ["${m.arc}", ${m.aw}],
    stubs: ["${m.stubL}${m.stubR}", ${m.sw}],
    leaf: "${m.leafD}",
  },
  // exactly 20 px (app header). viewBox 0 0 20 20, 1 unit = 1 px. Hinge (4, 16.5): the 1 px wall is centred on a pixel row.
  px20: {
    vb: 20,
    glow: [
${glowArr(a)}
    ],
    ring: ["${a.ring.d}", ${a.ring.w}, ${a.ring.op}],
    arc: ["${a.arc}", ${a.aw}],
    stubs: ["${a.stubL}${a.stubR}", 1],
    leaf: "${a.leafD}",
  },
  // <= 18 px (favicon). viewBox 0 0 32 32, 1 px = 2 units. Hinge (6, 27). No ring.
  px16: {
    vb: 32,
    glow: [
${glowArr(b)}
    ],
    arc: ["${b.arc}", ${b.aw}],
    stubs: ["${b.stubL}${b.stubR}", 2],
    leaf: "${b.leafD}",
  },
};

export function TurnoutMark({ size = 32, title }: { size?: number; title?: string }) {
  const m = size <= 18 ? SWING.px16 : size <= 22 ? SWING.px20 : SWING.main;
  return (
    <svg width={size} height={size} viewBox={\`0 0 \${m.vb} \${m.vb}\`} fill="none" role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {m.glow.map(([d, o]) => <path key={d} d={d} fill="var(--accent)" fillOpacity={o} />)}
      {m.ring && <path d={m.ring[0]} stroke="var(--ink)" strokeWidth={m.ring[1]} strokeOpacity={m.ring[2]} />}
      <path d={m.arc[0]} stroke="var(--ink)" strokeWidth={m.arc[1]} />
      <path d={m.stubs[0]} stroke="var(--ink)" strokeWidth={m.stubs[1]} strokeLinecap="butt" />
      <path d={m.leaf} fill="var(--accent)" />
    </svg>
  );
}`;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------------------------------------------------------------- page */
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Swing, final</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" href="marks/01-swing-final-16.svg" type="image/svg+xml">
<style>
:root{--paper:${C.paper};--panel:#FBF9F5;--ink:${C.ink};--text:${C.text};--muted:${C.muted};--line:${C.line};--accent:${C.accent}}
*{box-sizing:border-box}html,body{background:var(--paper)}
body{margin:0;color:var(--text);font:14px/1.55 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1200px;margin:0 auto;padding:0 40px}
.top{display:flex;justify-content:space-between;padding:28px 0 22px;border-bottom:1px solid var(--line);font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.top b{color:var(--ink)}
h1{font:400 clamp(44px,7vw,88px)/1 Fraunces,serif;font-variation-settings:'opsz' 144;letter-spacing:-.035em;color:var(--ink);margin:96px 0 28px}
h1 em{font-style:italic;font-weight:300;color:var(--accent)}
.lede{font:300 22px/1.5 Fraunces,serif;font-variation-settings:'opsz' 24;max-width:800px;margin:0 0 56px;color:var(--text)}
h4,.cap{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 14px}
.cons{display:grid;grid-template-columns:1.1fr 1fr;gap:48px;align-items:start;padding:40px 0 72px;border-top:1px solid var(--line)}
.cons>*{min-width:0}
.cons svg{display:block;border:1px solid var(--line)}
.rules{margin:0;padding:0;list-style:none;counter-reset:r}
.rules li{counter-increment:r;padding:12px 0 12px 36px;border-top:1px solid var(--line);position:relative;font-size:14px}
.rules li::before{content:counter(r);position:absolute;left:0;top:10px;font:italic 300 20px Fraunces,serif;color:var(--accent)}
.rules code,td code{font:11.5px ui-monospace,Menlo,monospace;background:#EFEBE3;padding:1px 4px;border-radius:3px;color:var(--ink);word-break:break-all}
.cols{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding-top:40px;border-top:1px solid var(--ink)}
.col{min-width:0;background:#fff;border:1px solid var(--line);padding:22px 20px 18px}
.col.pick{outline:2px solid var(--accent);outline-offset:-1px}
.col header{margin-bottom:16px}
.vid{font:italic 300 15px Fraunces,serif;color:var(--accent)}
h3{font:500 40px/1 Fraunces,serif;font-variation-settings:'opsz' 144;letter-spacing:-.02em;color:var(--ink);margin:2px 0 6px}
.spec{margin:0;font:12px ui-monospace,Menlo,monospace;color:var(--muted)}
.big{background:var(--paper);border:1px solid var(--line);display:flex;flex-direction:column;align-items:center;padding:20px 0 10px}
.big svg{display:block;max-width:100%;height:auto}
.big .cap{margin:8px 0 0}
.sizes{display:flex;align-items:flex-end;justify-content:space-between;gap:6px;padding:20px 2px 6px;border-bottom:1px solid var(--line)}
.sizes .b{display:flex;align-items:flex-end;justify-content:center;height:128px}
.sizes svg{display:block}
.sizes .cap{display:block;text-align:center;margin:8px 0 0;letter-spacing:.04em;color:var(--ink)}
.sizes .cap i{display:block;font-style:normal;color:var(--muted);font-weight:500;font-size:10px}
.proofs{display:flex;gap:14px;padding:18px 0;border-bottom:1px solid var(--line);align-items:flex-end}
.proofs>div{display:flex;flex-direction:column;gap:8px}
.proofs .cap{margin:0;letter-spacing:.06em}
canvas.px{display:block;image-rendering:pixelated;width:auto;max-width:100%}
.apphdr{margin-top:18px;height:56px;background:var(--paper);border:1px solid var(--line);border-radius:10px;display:flex;align-items:center;gap:22px;padding:0 16px;overflow:hidden}
.apphdr .brand{display:flex;align-items:center;gap:8px}.apphdr svg{display:block}
.apphdr .wm{font:500 20px/1 Fraunces,serif;font-variation-settings:'opsz' 144;letter-spacing:-.02em;color:var(--ink);transform:translateY(-1px)}
.apphdr nav{display:flex;gap:14px;font-size:13px;color:var(--muted);font-weight:500}.apphdr .on{color:var(--ink)}
.browser{margin-top:12px;border:1px solid #DAD4CA;border-radius:10px;overflow:hidden;background:#E9E5DE}
.tabs{display:flex;align-items:flex-end;padding:7px 8px 0;gap:2px;height:40px}
.tab{display:flex;align-items:center;gap:8px;height:33px;padding:0 10px;font:12px/1 Inter,system-ui;color:#5b564d;flex:0 1 190px;min-width:0;border-radius:9px 9px 0 0}
.tab span:not(.ghost){flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tab.on{background:#fff;color:#1d1b17}.tab svg{display:block;flex:none}.tab b{font-weight:400;color:#8a857c}
.ghost{width:16px;height:16px;border-radius:4px;background:#C9C3B8;flex:none}
.bar{background:#fff;height:34px;display:flex;align-items:center;padding:0 10px}.bar span{flex:1;height:20px;border-radius:10px;background:#F1EEE8}
.mr{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.mr>div{display:flex;flex-direction:column;align-items:center;padding:16px 0 8px;border:1px solid var(--line);background:var(--paper)}
.mr .rev{background:var(--ink);border-color:var(--ink)}.mr .rev .cap{color:#A39C8F}
.mr svg{display:block}.mr .cap{margin:8px 0 0}
.verdict{font:400 15px/1.5 Fraunces,serif;font-variation-settings:'opsz' 24;color:var(--ink);margin:18px 0 12px}
details{border-top:1px solid var(--line);padding-top:10px}
summary{cursor:pointer;font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
table{border-collapse:collapse;width:100%;font-size:12px;margin-top:8px}
td{border-top:1px solid var(--line);padding:7px 0;vertical-align:top}
td:first-child{width:72px;font-weight:600;color:var(--ink)}
.final{padding:110px 0 40px;margin-top:80px;border-top:1px solid var(--ink)}
.final .big2{font:400 clamp(40px,6vw,72px)/1.02 Fraunces,serif;font-variation-settings:'opsz' 144;letter-spacing:-.03em;color:var(--ink);margin:0 0 32px;max-width:18ch}
.final .big2 em{font-style:italic;font-weight:300;color:var(--accent)}
.fcols{display:grid;grid-template-columns:1.15fr 1fr;gap:48px;margin-bottom:40px}.fcols>*{min-width:0}
.fcols p{font:400 18px/1.55 Fraunces,serif;font-variation-settings:'opsz' 24;color:var(--ink);margin:0 0 16px}
.lock{background:var(--panel);border:1px solid var(--line);padding:56px 8%}.lock svg{display:block;width:100%;height:auto;max-width:700px;margin:0 auto}
pre{background:var(--ink);color:#EDE7DC;font:11.5px/1.55 ui-monospace,Menlo,monospace;padding:24px 26px;overflow:auto;border-radius:4px;margin:24px 0 0}
.log{font:11.5px/1.6 ui-monospace,Menlo,monospace;color:var(--muted);white-space:pre-wrap;margin:16px 0 0;background:#fff;border:1px solid var(--line);padding:16px 18px}
.foot{padding:40px 0 80px;border-top:1px solid var(--line);margin-top:56px;font-size:12px;color:var(--muted)}
@media (max-width:980px){.cols,.cons,.fcols{grid-template-columns:1fr}.wrap{padding:0 16px}}
</style></head>
<body><div class="wrap">
<div class="top"><span><b>Studio A</b> for Turnout</span><span>Swing, refinement</span></div>
<h1>Swing, <em>sharpened.</em></h1>
<p class="lede">Same idea, three finesses. What changed in every execution: the door is now one construction rather than four drawings. The leaf is exactly as long as the doorway is wide, it ends on the arc's inner edge, the arc's inner edge drops straight into the face of the right wall, and both walls are the same length and sit on the hinge line. The founder judges elegance at 256 px; we made sure the 16 and 20 px masters keep the same drawing pixel for pixel.</p>

<section class="cons">
  <div><h4>The construction, S1 on the 32 unit grid</h4>${construction()}</div>
  <div><h4>Precision rules, met in all three</h4>
  <ol class="rules">
    <li>Hinge on a whole unit: <code>(6, 26)</code>. Nothing is drawn there: the hinge is where the lines meet.</li>
    <li>Arc centred on the hinge. Its <b>inner edge</b> is the whole number, r 20; the centreline is r 20 + arc/2 (20.5 in S1). It starts on the hinge line and ends exactly above the hinge, at x 6.</li>
    <li>Leaf drawn as a closed shape, not a stroke: its base is cut on the hinge line (no sliver below the wall line, ever), its top is an arc on r 20, so it ends exactly on the arc's inner edge and never crosses it. Leaf length = door width = 20.</li>
    <li>Walls: <code>M2 26H6</code> and <code>M26 26H30</code>, butt caps, both 4 units, both centred on the hinge line, outer ends on whole units (2 and 30, symmetric in the 32 box). The left wall stops on the hinge; the right wall starts on the arc's inner edge, so the arc lands on it flush.</li>
    <li>Afterglow clipped by construction: sectors of radius 20 (the arc's inner edge) from the hinge line to the leaf. It never touches the arc stroke or goes below the wall line.</li>
    <li>Pixel masters: at 16 px (1 px = 2 units) the walls are 2 units on y 26..28, x 2..6 and 26..30. At 20 px no 32 unit grid can be crisp, so the 20 px master is drawn natively on a 20 unit grid: walls 1 px on row 16..17, x 1..4 and 16..19. To centre a 1 px wall, the 20 px hinge sits on a pixel centre, (4, 16.5): x whole, y half.</li>
  </ol></div>
</section>

<section class="cols">${['S1', 'S2', 'S3'].map(variantCol).join('').replace('<article class="col">', '<article class="col pick">')}</section>

<section class="final">
  <h4>Our pick</h4>
  <p class="big2">S1, Fine. <em>Thin enough to be elegant, strong enough for the header.</em></p>
  <div class="fcols">
    <div>
      <p>At 256 px S1 has the same weight as the hairlines of the Fraunces wordmark: arc 1.0, leaf 1.2, walls 1.4. The walls read as finished wall ends, the leaf is the only colour, and the afterglow at 0.22 is a glow rather than a fill.</p>
      <p>S2 is the most beautiful above 128 px, but at 20 px its arc turns grey. S3 is the safest at 20 px and the heaviest at 256. S1's 20 px master gets S3's safety anyway: walls 1 px, arc 0.94 px, so the header never pays for the elegance of the large mark.</p>
    </div>
    <div class="lock">${lockup(finalIdea, { F: 64 }).replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%"')}<div class="cap" style="text-align:center;margin:18px 0 0">01-swing-final.svg</div></div>
  </div>
  <h4>Final geometry, ready for React</h4>
  <pre>${esc(jsx)}</pre>
  <h4 style="margin-top:32px">Build checks</h4>
  <div class="log">${checks.join('\n')}</div>
</section>
<div class="foot">Studio A for Turnout. Files: swing-final.html, 01-swing-final.svg, marks/01-swing-final-{32,20,16,mono,mono-16,reverse}.svg. Generated by swing-final.mjs.</div>
</div>
<script>
// Rasterise each master at 1x exactly as the browser draws it, enlarge 8x without smoothing, draw the pixel grid.
document.querySelectorAll('canvas.px').forEach(c => {
  const n = +c.dataset.n, img = new Image();
  img.onload = () => {
    const s = document.createElement('canvas'); s.width = s.height = n;
    const sx = s.getContext('2d'); sx.fillStyle = '${C.paper}'; sx.fillRect(0, 0, n, n); sx.drawImage(img, 0, 0, n, n);
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(s, 0, 0, n * 8, n * 8);
    x.strokeStyle = 'rgba(23,21,15,.08)'; x.lineWidth = 1;
    for (let i = 1; i < n; i++) { x.beginPath(); x.moveTo(i * 8 + .5, 0); x.lineTo(i * 8 + .5, n * 8); x.moveTo(0, i * 8 + .5); x.lineTo(n * 8, i * 8 + .5); x.stroke(); }
  };
  img.src = c.dataset.src;
});
</script>
</body></html>
`;
fs.writeFileSync(path.join(OUT, 'swing-final.html'), html);
files.unshift('swing-final.html');
console.log(files.join('\n'));
console.log(checks.join('\n'));
