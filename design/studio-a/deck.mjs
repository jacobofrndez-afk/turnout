// Studio A, Turnout. Builds index.html (and the masters, via generate.mjs). Run: node design/studio-a/deck.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { C, IDEAS, lockup, markSvg, swing, coupe, ola, SWING, SWING_THETA, glowOps, P, arc, sector, f, pixelReport, written } from './generate.mjs';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const [I1, I2, I3] = IDEAS;
const mk = (idea, v, size, mode = 'color', extra = '') => markSvg(idea.fn(v, mode), size, extra);
const dataUri = svg => 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');

/* ---------------------------------------------------------------- copy */
const COPY = {
  '01-swing': {
    kicker: 'The radar, drawn the way an architect draws a door.',
    idea: 'On every floor plan a door is drawn as a hinge, a leaf and a quarter arc: that is exactly a radar sweep, so here the leading edge is the door leaf, the rings are its swing, and the afterglow is the light that spills across the threshold as it opens.',
    why: 'Turnout sells one moment, the crowd outside walking through your door, and this mark says it in a symbol every owner has already seen on their own plans, while keeping the rings, the trail and the crisp edge you liked.',
    fails: 'A quarter radar is less instantly "radar" than a full disc; it only reads as a door when the two wall stubs are there, so they can never be cropped.',
  },
  '02-coupe': {
    kicker: 'Half a radar hung from a line is a T. Give it a foot and it pours.',
    idea: 'A half radar hung from a straight line is a capital T, and the same four lines with a foot become a coupe glass whose drink is the afterglow, filling behind the sweep.',
    why: 'Three readings in four lines, the initial, the instrument and the drink the campaign actually sells, drawn in the calm grammar of a cocktail menu rather than a dashboard.',
    fails: 'It says bar much louder than shop or bookshop, and at 16 px it sits close to the generic "bar" icon on maps; the radar is the third thing you see, not the first.',
  },
  '03-ola': {
    kicker: 'The crowd is the radar.',
    idea: 'Thirty six ticks are the sections of a stadium bowl; the wave stands up at the leading edge and sits down behind it, amber cooling to ink like phosphor, so the afterglow is made of people showing up.',
    why: 'It is the only mark here that literally shows turnout, it is a perfect "listening" state for an agent that watches the city, and nobody in hospitality technology owns it.',
    fails: 'This is the bold one: below 24 px it collapses into a system activity spinner, and some people will read sound or loading before they read crowd.',
  },
};

/* ---------------------------------------------------------------- pieces */
function sizeStrip(idea) {
  const cells = [
    [128, 'm', '128'], [64, 'm', '64'], [32, 'm', '32'], [24, 'h', '24'], [16, 's', '16'],
  ].map(([s, v, l]) => `<div class="sz"><div class="sz-box" style="height:128px">${mk(idea, v, s)}</div><div class="cap">${l} px<span>${v === 'm' ? 'master 32' : v === 'h' ? 'master 20' : 'master 16'}</span></div></div>`).join('');
  const s16 = dataUri(mk(idea, 's', 16)), s20 = dataUri(mk(idea, 'h', 20));
  return `<div class="strip">${cells}
    <div class="sz proof"><div class="sz-box" style="height:128px"><canvas class="px" width="16" height="16" data-src="${s16}"></canvas></div><div class="cap">16 px, 8x<span>browser pixels</span></div></div>
    <div class="sz proof"><div class="sz-box" style="height:128px"><canvas class="px" width="20" height="20" data-src="${s20}"></canvas></div><div class="cap">20 px, 6.4x<span>browser pixels</span></div></div>
  </div>`;
}
function appHeader(idea) {
  return `<div class="apphdr">
    <div class="brand">${mk(idea, 'h', 20)}<span class="wm">Turnout</span></div>
    <nav><span class="on">Tonight</span><span>Campaigns</span><span>Venues</span></nav>
    <div class="chip"><i></i>The Garden, 7:30 pm, 19,500</div>
  </div>`;
}
function tab(idea) {
  return `<div class="browser">
    <div class="tabs">
      <div class="tab on">${mk(idea, 's', 16)}<span>Turnout, tonight near the Garden</span><b>&#215;</b></div>
      <div class="tab"><span class="fav-ghost"></span><span>Bookings</span><b>&#215;</b></div>
      <div class="plus">+</div>
    </div>
    <div class="bar"><span class="omni"></span></div>
  </div>`;
}

/* ---------------------------------------------------------------- applications */
function doorScene() {
  // Partner window cling on a bar's glass door. The symbol on the door is the door.
  const m = markSvg(swing('m', 'color'), 46, ' x="307" y="254"');
  return `<svg viewBox="0 0 560 440" width="100%" role="img" aria-label="Turnout partner cling on a bar door">
  <defs>
    <linearGradient id="room" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4E3C8"/><stop offset="1" stop-color="#E7BE8C"/></linearGradient>
    <linearGradient id="pave" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#DCD3C4"/><stop offset="1" stop-color="#EAE3D7"/></linearGradient>
    <path id="ring" d="M289 275A42 42 0 0 1 373 275"/>
  </defs>
  <rect width="560" height="440" fill="#ECE5D9"/>
  <rect x="0" y="404" width="560" height="36" fill="url(#pave)"/>
  <path d="M0 404H560" stroke="#CFC7B8" stroke-width="1"/>
  <rect x="120" y="22" width="320" height="382" fill="#E2D9CA"/>
  <rect x="138" y="38" width="284" height="366" fill="#1F1D18"/>
  <rect x="166" y="64" width="228" height="268" fill="url(#room)"/>
  <g stroke="#9C7A55" stroke-width="1" fill="none" opacity=".55">
    <path d="M214 64V118M346 64V108"/><path d="M200 130a14 14 0 0 1 28 0Z" fill="#F9EBD3"/><path d="M332 120a14 14 0 0 1 28 0Z" fill="#F9EBD3"/>
    <path d="M166 268H394M166 274H394"/>
  </g>
  <text x="280" y="96" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="500" font-size="24" letter-spacing="2" fill="#B98A3E" style="font-variation-settings:'opsz' 72">BAR NINE</text>
  <text x="280" y="114" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-style="italic" font-size="11" fill="#B98A3E">cocktails &amp; small plates</text>
  <circle cx="331" cy="275" r="56" fill="${C.paper}" fill-opacity=".97"/>
  <circle cx="331" cy="275" r="52" fill="none" stroke="${C.ink}" stroke-width=".7" stroke-opacity=".45"/>
  ${m}
  <text font-family="Inter, Arial, sans-serif" font-weight="600" font-size="8" letter-spacing="2.4" fill="${C.ink}"><textPath href="#ring" startOffset="50%" text-anchor="middle">TURNOUT PARTNER</textPath></text>
  <text x="331" y="314" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-style="italic" font-size="9.5" fill="${C.muted}">crowds welcome</text>
  <rect x="176" y="214" width="6" height="92" rx="3" fill="#C9A15E"/>
  <rect x="146" y="364" width="268" height="30" fill="#B8924F" opacity=".9"/>
  <path d="M146 364H414" stroke="#E0C48E" stroke-width="1"/>
  </svg>`;
}
function adScene() {
  // 1080 x 1080 social creative, scaled. The campaign Turnout would write for a bar near the Garden.
  const m = markSvg(coupe('m', 'color').replace(/fill-opacity="([\d.]+)"/g, (_, o) => `fill-opacity="${Math.min(0.9, o * 1.5).toFixed(4)}"`), 400, ' x="340" y="96"');
  return `<svg viewBox="0 0 1080 1080" width="100%" role="img" aria-label="Ad creative, 1080 by 1080">
  <rect width="1080" height="1080" fill="${C.paper}"/>
  <rect x="40" y="40" width="1000" height="1000" fill="none" stroke="${C.line}" stroke-width="2"/>
  <text x="540" y="104" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="22" letter-spacing="5" fill="${C.muted}">TONIGHT, TWO BLOCKS FROM THE GARDEN</text>
  ${m}
  <text x="540" y="650" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="500" font-size="104" letter-spacing="-2" fill="${C.ink}" style="font-variation-settings:'opsz' 144">Doors at 7:30.</text>
  <text x="540" y="770" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="400" font-style="italic" font-size="104" letter-spacing="-2" fill="${C.accent}" style="font-variation-settings:'opsz' 144">Coupes from 6.</text>
  <text x="540" y="868" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-weight="500" font-size="30" fill="${C.text}">Show your ticket at the bar for a second coupe on us.</text>
  <path d="M440 930H640" stroke="${C.line}" stroke-width="2"/>
  <text x="540" y="986" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="500" font-size="40" fill="${C.ink}" style="font-variation-settings:'opsz' 72">Bar Nine</text>
  <text x="1000" y="1012" text-anchor="end" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="16" letter-spacing="3" fill="${C.muted}" opacity=".7">CAMPAIGN BY TURNOUT</text>
  </svg>`;
}
function olaFrames() {
  const frames = [
    [50, 'Frame 1', 'Listening. The wave runs round the bowl while Turnout watches the venue calendar.'],
    [170, 'Frame 2', 'Crowd found. The wave has travelled; the trail is longest, 19,500 at the Garden.'],
    [290, 'Frame 3', 'Campaign ready. The wave completes its lap and the screen resolves to the offer.'],
  ];
  return `<div class="frames">${frames.map(([e, t, d]) => `<figure><div class="fr">${markSvg(ola('m', 'color', null, e), 132)}</div><figcaption><b>${t}</b>${d}</figcaption></figure>`).join('')}
  <figure class="live"><div class="fr"><div class="spin">${markSvg(ola('m', 'color'), 132)}</div></div><figcaption><b>Live</b>36 steps per lap, 2.4 s, one tick per step (CSS, the mark rotates in 10 degree steps).</figcaption></figure></div>`;
}
const APPS = {
  '01-swing': { title: 'On the door', cap: 'Window cling for partner venues, 120 mm. The symbol on the door is a door: the first thing a customer sees as they walk in is the drawing of themselves walking in.', html: () => `<div class="scene">${doorScene()}</div>` },
  '02-coupe': { title: 'In the feed', cap: '1080 x 1080 creative, shown at 40 %. The glass becomes the hero object of the campaign Turnout writes, and the afterglow is poured at 1.5x opacity for print and social.', html: () => `<div class="scene ad">${adScene()}</div>` },
  '03-ola': { title: 'As motion', cap: 'The loading state in three frames. Ola is the one mark that is better moving than still.', html: () => olaFrames() },
};

/* ---------------------------------------------------------------- idea section */
function ideaSection(idea, i) {
  const c = COPY[idea.id], app = APPS[idea.id];
  return `<section class="idea" id="${idea.id}">
  <header class="ihead">
    <div class="inum">${idea.n}</div>
    <div><h2>${idea.name}</h2><p class="kicker">${c.kicker}</p></div>
  </header>
  <figure class="hero">${lockup(idea, { F: 120 }).replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%"')}<figcaption>Hero lockup, <code>${idea.id}.svg</code></figcaption></figure>
  <div class="thesis">
    <div><h4>The idea</h4><p>${c.idea}</p></div>
    <div><h4>Why it is right for Turnout</h4><p>${c.why}</p></div>
    <div class="fail"><h4>Where it fails</h4><p>${c.fails}</p></div>
  </div>
  <div class="block"><h4>At size</h4>${sizeStrip(idea)}</div>
  <div class="two">
    <div class="block"><h4>App header, 1x</h4>${appHeader(idea)}<p class="note">20 px mark, 20 px Fraunces, 56 px bar on paper.</p></div>
    <div class="block"><h4>Favicon, 1x</h4>${tab(idea)}<p class="note">16 px master, pixel-snapped.</p></div>
  </div>
  <div class="two">
    <div class="block tile">${lockup(idea, { F: 52, mode: 'mono' }).replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%"')}<p class="note">One colour, ink.</p></div>
    <div class="block tile rev">${lockup(idea, { F: 52, mode: 'reverse' }).replace(/width="[\d.]+" height="[\d.]+"/, 'width="100%"')}<p class="note">Reverse on ink.</p></div>
  </div>
  <div class="block app"><h4>Living: ${app.title}</h4>${app.html()}<p class="note wide">${app.cap}</p></div>
</section>`;
}

/* ---------------------------------------------------------------- spec for React */
const g = SWING.m, hx = 6, hy = g.hy, gr = g.R - g.outer / 2;
const [lx, ly] = P(hx, hy, gr, SWING_THETA);
const ops = glowOps(g.N, g.glow);
const sectors = ops.map((o, i) => {
  const a = SWING_THETA - SWING_THETA * (1 - i / g.N);
  return { d: sector(hx, hy, gr, f(a), SWING_THETA), o };
});
const jsx = `// Turnout mark, "Swing". viewBox 0 0 32 32. Colours come from CSS tokens.
const GLOW = [
${sectors.map(s => `  ["${s.d}", ${s.o}],`).join('\n')}
];

export function TurnoutMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      {GLOW.map(([d, o]) => (
        <path key={d} d={d} fill="var(--accent)" fillOpacity={o} />
      ))}
      <path d="${arc(hx, hy, g.innerR, 0, 90)}" stroke="var(--ink)" strokeWidth={0.8} strokeOpacity={0.55} />
      <path d="${arc(hx, hy, g.R, 0, 90)}" stroke="var(--ink)" strokeWidth={1} />
      <path d="M2 ${hy}H6M26 ${hy}H30" stroke="var(--ink)" strokeWidth={1.7} />
      <path d="M6 ${hy}L${lx} ${ly}" stroke="var(--accent)" strokeWidth={1.4} />
    </svg>
  );
}`;
const H = SWING.h;
const [hlx, hly] = P(H.hx, H.hy, H.R - H.outer / 2, SWING_THETA);
const S = SWING.s;
const [slx, sly] = P(6, S.hy, S.R - S.outer / 2, SWING_THETA);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const specRows = [
  ['Grid', 'viewBox 0 0 32 32. Hinge (pivot) at (6, 25.5). No dots anywhere: the hinge is implied by the lines meeting.'],
  ['Walls', `Two butt-capped lines, <code>M2 25.5H6</code> and <code>M26 25.5H30</code>, stroke 1.7, <code>--ink</code>. The doorway is exactly the swing radius: 20.`],
  ['Swing arc', `<code>${arc(hx, hy, g.R, 0, 90)}</code>, r 20, from 0 to 90 degrees, stroke 1.0, <code>--ink</code>.`],
  ['Ring', `<code>${arc(hx, hy, g.innerR, 0, 90)}</code>, r 11.5, stroke 0.8, <code>--ink</code> at 55 %.`],
  ['Leading edge', `The door leaf, <code>M6 25.5L${lx} ${ly}</code>: 58 degrees above the wall, length 19.5 (stops on the inner side of the arc), stroke 1.4, <code>--accent</code>, butt caps.`],
  ['Afterglow', `${g.N} stacked sectors, r 19.5, every one ending on the leaf at 58 degrees; sector i starts at 58 x i / ${g.N} degrees, so the widest touches the wall. Fill <code>--accent</code>, opacity <code>1 - (1 - T<sub>i</sub>) / (1 - T<sub>i-1</sub>)</code>, <code>T<sub>i</sub> = 0.30 ((i + 1) / ${g.N})<sup>1.35</sup></code>: cumulative 0.30 at the leaf, fading to 0 at the threshold.`],
  ['20 px master', `Header only. 1 px = 1.6 units, so every straight edge sits on a multiple of 1.6: hinge (6.4, 26.4), r 19.2, walls <code>M1.6 26.4H6.4</code> and <code>M25.6 26.4H30.4</code> at 1.6 (one crisp pixel), arcs 1.6 (ring at 45 %), leaf 1.9 to (${hlx}, ${hly}), glow 12 sectors, max 0.36.`],
  ['16 px master', `Hinge (6, 25); walls <code>M2 25H6</code>, <code>M26 25H30</code> at 2 (one pixel, edges on even units, verified); arc r 20 at 2; no ring; leaf 2 to (${slx}, ${sly}); glow 6 sectors, max 0.34.`],
  ['Mono / reverse', 'Mono: leaf ink, glow ink at 0.6x (max 0.18). Reverse on <code>--panel-ink</code>: lines paper, leaf and glow <code>#E39A5F</code> (7.9:1 on ink), glow 1.25x.'],
  ['Clear space and minimum', 'Clear space: the doorway width / 4 (5 units) on all sides. Minimum: 16 px with the 16 px master; never crop the walls.'],
];

/* ---------------------------------------------------------------- page */
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Turnout, Studio A</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;1,9..144,300;1,9..144,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="icon" href="marks/01-swing-16.svg" type="image/svg+xml">
<style>
:root{--paper:${C.paper};--panel:#FBF9F5;--white:#fff;--ink:${C.ink};--text:${C.text};--muted:${C.muted};--line:${C.line};--accent:${C.accent}}
*{box-sizing:border-box}
html{background:var(--paper)}
body{margin:0;background:var(--paper);color:var(--text);font:15px/1.6 Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:1200px;margin:0 auto;padding:0 40px}
.serif,h1,h2,h3,.kicker,.pov,.inum,.rec-big{font-family:Fraunces,Georgia,serif;font-variation-settings:'opsz' 144}
.top{display:flex;justify-content:space-between;align-items:center;padding:28px 0 22px;border-bottom:1px solid var(--line);font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.top b{color:var(--ink)}
.cover{padding:120px 0 64px;display:grid;grid-template-columns:1fr;gap:48px}
h1{font-weight:400;font-size:clamp(48px,8vw,104px);line-height:.98;letter-spacing:-.035em;color:var(--ink);margin:0;max-width:11ch}
h1 em{font-style:italic;font-weight:300;color:var(--accent)}
.pov{font-size:24px;line-height:1.5;font-weight:300;font-variation-settings:'opsz' 24;color:var(--text);max-width:820px;margin:0}
.pov::first-letter{font-weight:500}
.index{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--ink);margin-top:32px}
.index a{display:flex;gap:18px;align-items:flex-start;padding:22px 0;color:inherit;text-decoration:none;border-right:1px solid var(--line);padding-left:20px}
.index a:first-child{padding-left:0}.index a:last-child{border-right:0}
.index .n{font:italic 300 15px Fraunces,serif;color:var(--muted)}
.index .t{font:500 26px/1 Fraunces,serif;color:var(--ink);font-variation-settings:'opsz' 144;letter-spacing:-.02em}
.index .d{font-size:12.5px;color:var(--muted);line-height:1.4;margin-top:6px}
.idea{padding:120px 0 40px;border-top:1px solid var(--line)}
.ihead{display:grid;grid-template-columns:140px 1fr;align-items:end;gap:24px;margin-bottom:40px}
.inum{font-size:120px;line-height:.8;font-weight:300;font-style:italic;color:var(--accent);letter-spacing:-.04em}
h2{font-weight:500;font-size:72px;line-height:1;letter-spacing:-.03em;margin:0;color:var(--ink)}
.kicker{font-style:italic;font-weight:300;font-size:26px;line-height:1.3;color:var(--muted);margin:10px 0 0;font-variation-settings:'opsz' 36}
.hero{margin:0;background:var(--panel);border:1px solid var(--line);padding:100px 12% 70px;position:relative}
.hero svg{display:block;max-width:820px;margin:0 auto}
figcaption,.note,.cap,h4{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.hero figcaption{position:absolute;left:20px;bottom:14px;font-weight:500;letter-spacing:.06em;text-transform:none}
figcaption code,.note code{font:500 11px ui-monospace,Menlo,monospace}
h4{margin:0 0 14px}
.thesis{display:grid;grid-template-columns:1fr 1fr .85fr;gap:40px;padding:44px 0 56px}
.thesis p{margin:0;font-family:Fraunces,Georgia,serif;font-variation-settings:'opsz' 24;font-size:18.5px;line-height:1.5;color:var(--ink);font-weight:400}
.thesis .fail{border-left:2px solid var(--accent);padding-left:22px}
.thesis .fail p{font-size:15.5px;font-style:italic;color:var(--text)}
.block{background:var(--white);border:1px solid var(--line);padding:26px 28px 22px;margin-bottom:20px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.two>*,.spec>*,.thesis>*,.rec-cols>*{min-width:0}
.two .block{margin-bottom:20px}
.note{margin:14px 0 0;font-weight:500;letter-spacing:.04em;text-transform:none;font-size:12px}
.note.wide{max-width:720px;font-size:13px;line-height:1.5;color:var(--text)}
.strip{display:flex;align-items:flex-end;gap:34px;flex-wrap:wrap}
.sz-box{display:flex;align-items:flex-end;justify-content:center}
.sz svg{display:block}
.cap{margin-top:12px;text-align:center;letter-spacing:.06em;text-transform:none;font-weight:600;color:var(--ink)}
.cap span{display:block;font-weight:500;color:var(--muted);font-size:10.5px}
.proof{padding-left:28px;border-left:1px solid var(--line)}
canvas.px{width:128px;height:128px;image-rendering:pixelated;background:var(--paper);outline:1px solid var(--line)}
.apphdr{overflow:hidden;height:56px;background:var(--paper);border:1px solid var(--line);border-radius:10px;display:flex;align-items:center;padding:0 18px;gap:28px}
.apphdr .brand{display:flex;align-items:center;gap:8px}
.apphdr svg{display:block}
.apphdr .wm{font:500 20px/1 Fraunces,serif;font-variation-settings:'opsz' 144;letter-spacing:-.02em;color:var(--ink);transform:translateY(-1px)}
.apphdr nav{display:flex;gap:18px;font-size:13px;color:var(--muted);font-weight:500}
.apphdr nav .on{color:var(--ink)}
.apphdr .chip{margin-left:auto;font-size:11.5px;color:var(--text);border:1px solid var(--line);background:#fff;border-radius:99px;padding:5px 10px;display:flex;gap:7px;align-items:center;white-space:nowrap}
.apphdr .chip i{width:6px;height:6px;border-radius:50%;background:var(--accent)}
.browser{border:1px solid #DAD4CA;border-radius:10px;overflow:hidden;background:#E9E5DE}
.tabs{display:flex;align-items:flex-end;padding:8px 10px 0;gap:2px;height:42px}
.tab{display:flex;align-items:center;gap:8px;height:34px;padding:0 12px;font:12px/1 Inter,system-ui;color:#5b564d;flex:0 1 230px;min-width:0;border-radius:9px 9px 0 0}
.tab span:not(.fav-ghost){flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tab.on{background:#fff;color:#1d1b17}
.tab svg{flex:none;display:block}
.tab b{font-weight:400;color:#8a857c}
.fav-ghost{width:16px;height:16px;border-radius:4px;background:#C9C3B8;flex:none}
.plus{padding:0 10px 9px;color:#7a756c}
.bar{background:#fff;height:40px;display:flex;align-items:center;padding:0 14px;border-top:1px solid #fff}
.omni{height:24px;border-radius:12px;background:#F1EEE8;flex:1}
.tile{display:flex;flex-direction:column;justify-content:center;padding:44px 40px 22px;background:var(--paper)}
.tile svg{max-width:440px;display:block;margin:0 auto}
.tile.rev{background:var(--ink);border-color:var(--ink)}
.tile.rev .note{color:#A39C8F}
.app .scene{max-width:640px;margin:0 auto;border:1px solid var(--line)}
.app .scene.ad{max-width:432px;box-shadow:0 1px 0 var(--line),0 18px 40px -24px rgba(23,21,15,.35)}
.app .scene svg{display:block}
.app .note.wide{margin:18px auto 0;text-align:center}
.frames{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}
.frames figure{margin:0}
.frames .fr{background:var(--paper);aspect-ratio:1;display:flex;align-items:center;justify-content:center;border:1px solid var(--line)}
.frames figcaption{text-transform:none;letter-spacing:0;font-weight:400;font-size:12.5px;line-height:1.45;color:var(--text);margin-top:10px}
.frames figcaption b{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);font-weight:600;margin-bottom:4px}
.frames .live .fr{background:#fff}
.spin{width:132px;height:132px;animation:lap 2.4s steps(36) infinite}
.spin svg{display:block}
@keyframes lap{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.spin{animation:none}}
.aside{display:grid;grid-template-columns:1fr 1.2fr;gap:56px;align-items:center;padding:72px 0;border-top:1px solid var(--line)}
.turns{font:500 120px/1 Fraunces,serif;font-variation-settings:'opsz' 144;letter-spacing:-.02em;color:var(--ink);display:flex;align-items:baseline;justify-content:center;gap:0}
.turns .r{display:inline-block;transform:rotate(180deg);transform-origin:50% 62.5%;color:var(--accent)}
.turns .k{color:var(--line)}
.aside p{margin:0;font-family:Fraunces,serif;font-variation-settings:'opsz' 24;font-size:19px;line-height:1.5;color:var(--ink)}
.rec{padding:120px 0 60px;border-top:1px solid var(--ink)}
.rec-big{font-size:clamp(40px,6vw,76px);line-height:1.02;letter-spacing:-.03em;font-weight:400;color:var(--ink);margin:0 0 40px;max-width:16ch}
.rec-big em{font-style:italic;font-weight:300;color:var(--accent)}
.rec-cols{display:grid;grid-template-columns:1.1fr 1fr;gap:56px;margin-bottom:64px}
.rec-cols p{margin:0 0 18px;font-family:Fraunces,serif;font-variation-settings:'opsz' 24;font-size:18.5px;line-height:1.55;color:var(--ink)}
.rec-cols .risk{border-left:2px solid var(--accent);padding-left:22px}
.rec-cols .risk p{font-style:italic}
.spec{display:grid;grid-template-columns:300px 1fr;gap:48px;align-items:start}
.spec .big{background:var(--panel);border:1px solid var(--line);padding:24px;position:sticky;top:24px}
.spec .big svg{display:block;width:100%;height:auto}
.spec .big .cap{text-align:left}
table{border-collapse:collapse;width:100%;font-size:13.5px}
td{border-top:1px solid var(--line);padding:12px 0;vertical-align:top}
td:first-child{width:150px;font-weight:600;color:var(--ink);padding-right:18px;font-size:12px;letter-spacing:.04em}
code{font:12px ui-monospace,Menlo,monospace;color:var(--ink);background:#EFEBE3;padding:1px 4px;border-radius:3px;word-break:break-all}
pre{background:var(--ink);color:#EDE7DC;font:12px/1.55 ui-monospace,Menlo,monospace;padding:24px 26px;overflow:auto;border-radius:4px;margin:28px 0 0}
.foot{padding:40px 0 80px;border-top:1px solid var(--line);display:flex;justify-content:space-between;font-size:12px;color:var(--muted)}
@media (max-width:860px){.wrap{padding:0 16px}.thesis,.two,.rec-cols,.spec,.aside,.index{grid-template-columns:1fr}.frames{grid-template-columns:1fr 1fr}.ihead{grid-template-columns:1fr}.inum{font-size:72px}h2{font-size:52px}.hero{padding:56px 16px 48px}.index a{border-right:0;padding-left:0;border-bottom:1px solid var(--line)}.apphdr .chip{display:none}.spec .big{position:static}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top"><span><b>Studio A</b> for Turnout</span><span>Identity, final round</span></div>

  <section class="cover">
    <h1>A radar with<br><em>a second life.</em></h1>
    <p class="pov">Turnout is not a marketing tool; it is a sense. A good bar two streets from the Garden already feels a show coming, the room goes quiet and then the pavement fills, and Turnout makes that instinct precise and gives it a voice. So the identity should feel like hospitality first and instrument second: drawn with the restraint of a good menu, with one moving part that tells you something is on its way. The previous sheets got the instrument right and stopped there. Our view is that the mark must be a radar and, in the same lines, something that belongs to the room you are trying to fill: a door, a glass, a crowd. Each idea below gives the sweep that second life.</p>
    <div class="index">
      ${IDEAS.map(id => `<a href="#${id.id}">${mk(id, 'm', 56)}<div><div><span class="n">${id.n}.</span> <span class="t">${id.name}</span></div><div class="d">${COPY[id.id].kicker}</div></div></a>`).join('')}
    </div>
  </section>

  ${IDEAS.map(ideaSection).join('\n')}

  <section class="aside">
    <div class="turns"><span class="k">Tur</span>n<span>o</span><span class="r">n</span><span class="k">t</span></div>
    <p>One thing we found and kept for the wordmark. The name does what it says: across the hinge between <em>Turn</em> and <em>out</em>, the u is an n turned half a turn around the o. In the final drawing of the wordmark we recommend cutting the u as the exact 180 degree rotation of the n (Fraunces is within a hair of it already). Nobody will notice; everyone will feel the word is balanced.</p>
  </section>

  <section class="rec" id="recommendation">
    <h4>Recommendation</h4>
    <p class="rec-big">Swing. <em>The door is the promise.</em></p>
    <div class="rec-cols">
      <div>
        <p>Swing keeps every signal you responded to, real rings, an afterglow that fades like a screen, one crisp leading edge, nothing dark or loud, and adds the one thing the radar never had: a reason to exist in hospitality. Every owner reads the door at a glance because it is on their own plans, and every customer reads it without knowing why. It survives 16 px as a door, 20 px next to the serif as a radar, and it goes on an actual door without looking like software.</p>
        <p>Keep Ola. Not as the logo, as the motion: it is the loading and "listening" state inside the product, the thing that moves while the agent watches the city. Swing is what Turnout is; Ola is what it does. Coupe is the strongest campaign object of the three and can live in the creative templates.</p>
      </div>
      <div class="risk">
        <h4>The one risk</h4>
        <p>A quarter radar asks for half a second more than a full disc. If the brand is ever shown without the two wall stubs, or rotated, it stops being a door and becomes a generic fan; the walls are the idea, and they need to be protected in the guidelines from day one.</p>
      </div>
    </div>

    <h4>Geometry for React</h4>
    <div class="spec">
      <div class="big">${markSvg(swing('m'), 300, ' style="width:100%;height:auto"')}<div class="cap" style="margin-top:14px">Swing, master 32<span>viewBox 0 0 32 32</span></div></div>
      <div>
        <table>${specRows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
        <pre>${esc(jsx)}</pre>
      </div>
    </div>
  </section>

  <div class="foot"><span>Studio A for Turnout. Marks: hand-written geometry on a 32 unit grid; 16 px and 20 px masters pixel-snapped and checked.</span><span>Files: ${IDEAS.map(i => i.id + '.svg').join(', ')}, marks/</span></div>
</div>
<script>
// Pixel proof: rasterise the real 16 px and 20 px masters at 1x, then enlarge without smoothing.
document.querySelectorAll('canvas.px').forEach(c => {
  const img = new Image();
  img.onload = () => { const x = c.getContext('2d'); x.fillStyle = '${C.paper}'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); };
  img.src = c.dataset.src;
});
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log(['index.html', ...written].join('\n'));
console.log(pixelReport.join('\n'));
