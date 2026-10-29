// Turnout · Door & radar. All visible geometry is generated at its actual CSS-pixel size.
// Regenerate exported assets: node --import tsx design/identity/generate.mjs
export const LOGO_COLORS = { ink: "#3B1C42", ring: "#927798", signal: "#84204D", reverse: "#F6F1F8", reverseRing: "#C4AECA", reverseSignal: "#E6A4C2" };
export const FIELD_OPACITY = .055;
const n = (value: number) => Number(value.toFixed(5));

export function markDrawing(size = 64) {
  const scale = size / 64;
  const compact = size <= 24;
  const stroke = Math.max(1, Math.round(scale));
  const x = Math.round(12 * scale), y = Math.round(52 * scale);
  const radius = Math.round(42 * scale);
  const left = Math.round(2 * scale), end = Math.round(62 * scale);
  const top = Math.round(48 * scale), bottom = Math.round(56 * scale);
  const wallRise = y - top;
  // Closed annular shapes give exact, horizontal cuts where the outer arc meets the wall.
  // Their outer bounds sit on whole pixels. No stroked caps project into the threshold.
  const ring = (r: number, cut: number) => {
    const inner = r - stroke;
    const outerEnd = Math.sqrt(r * r - cut * cut), innerEnd = Math.sqrt(inner * inner - cut * cut);
    return `M${x} ${y-r}A${r} ${r} 0 0 1 ${n(x+outerEnd)} ${y-cut}H${n(x+innerEnd)}A${inner} ${inner} 0 0 0 ${x} ${y-inner}Z`;
  };
  const ringShapes = (compact ? [42,25] : [42,29,16]).map((r,i) => ring(Math.round(r*scale), i === 0 ? wallRise : 0));
  const innerRadius = radius - stroke;
  const right = Math.floor(x + Math.sqrt(innerRadius * innerRadius - wallRise * wallRise));
  const length = radius - stroke * .35;
  const normal = { x: Math.sqrt(3)/2, y: .5 };
  const baseWidth = Math.max(1.35, 2.4*scale), tipWidth = Math.max(.45, .55*scale);
  const tip = { x: x + length/2, y: y - length*Math.sqrt(3)/2 };
  const baseLeft = { x: x-normal.x*baseWidth/2, y: y-normal.y*baseWidth/2 };
  const baseRight = { x: x+normal.x*baseWidth/2, y: y+normal.y*baseWidth/2 };
  const tipLeft = { x: tip.x-normal.x*tipWidth/2, y: tip.y-normal.y*tipWidth/2 };
  const tipRight = { x: tip.x+normal.x*tipWidth/2, y: tip.y+normal.y*tipWidth/2 };
  const atY = (a: {x:number;y:number}, b: {x:number;y:number}, target: number) => a.x+(target-a.y)*(b.x-a.x)/(b.y-a.y);
  const upperJoin = atY(baseLeft,tipLeft,top), lowerJoin = atY(baseRight,tipRight,bottom);
  // One continuous outline joins the tapered needle to the left wall. No overlapping hinge disc.
  const structure = `M${left} ${top}H${n(upperJoin)}L${n(tipLeft.x)} ${n(tipLeft.y)}L${n(tipRight.x)} ${n(tipRight.y)}L${n(lowerJoin)} ${bottom}H${left}ZM${right} ${top}H${end}V${bottom}H${right}Z`;
  const sweepTip = { x: x+innerRadius/2, y: y-innerRadius*Math.sqrt(3)/2 };
  return {
    size, stroke, ringShapes, structure, bottom,
    hinge: { x, y },
    blip: { x: Math.round(44*scale), y: Math.round(32*scale), radius: Math.max(1, n(2.6*scale)) },
    field: `M${x} ${y}V${y-innerRadius}A${innerRadius} ${innerRadius} 0 0 1 ${x+innerRadius} ${y}Z`,
    sweep: `M${x} ${y}H${x+innerRadius}A${innerRadius} ${innerRadius} 0 0 0 ${n(sweepTip.x)} ${n(sweepTip.y)}Z`,
    gradient: { x1:x, y1:y, x2:n(x+innerRadius*.75*Math.sqrt(3)/2), y2:n(y+innerRadius*.75/2) },
  };
}

export function letteringDrawing(size = 76) {
  const scale = size / 76;
  const stroke = Math.max(1, Math.round(6.5 * scale));
  const half = stroke % 2 ? .5 : 0;
  const p = (v: number) => Math.round(v * scale - half) + half;
  // A 60° terminal on each t crossbar echoes the radar needle. Solid outlines
  // keep the cut transparent and avoid masks or background-coloured overlays.
  const crossbar = (start: number, end: number) => {
    const left = Math.round(start*scale), right = Math.round(end*scale);
    const top = p(27)-stroke/2, bottom = p(27)+stroke/2;
    return `M${left} ${top}H${right}L${n(right-stroke/Math.sqrt(3))} ${bottom}H${left}Z`;
  };
  const cx = p(178), cy = p(45), rx = Math.round(16*scale), ry = Math.round(18*scale);
  return { stroke, baseline: p(64) + stroke/2, width: Math.ceil(p(277)+stroke/2), solidPaths: [crossbar(4,32), crossbar(248,276)], paths: [
    `M${p(16)} ${p(10)}V${p(49)}Q${p(16)} ${p(62)} ${p(29)} ${p(62)}H${p(33)}`,
    `M${p(46)} ${p(27)}V${p(48)}Q${p(46)} ${p(62)} ${p(60)} ${p(62)}Q${p(74)} ${p(62)} ${p(74)} ${p(48)}V${p(27)}`,
    `M${p(88)} ${p(64)}V${p(28)}M${p(88)} ${p(40)}Q${p(89)} ${p(24)} ${p(107)} ${p(27)}`,
    `M${p(119)} ${p(64)}V${p(28)}M${p(119)} ${p(41)}Q${p(119)} ${p(26)} ${p(133)} ${p(26)}Q${p(147)} ${p(26)} ${p(147)} ${p(41)}V${p(64)}`,
    `M${cx+rx} ${cy}A${rx} ${ry} 0 1 1 ${cx-rx} ${cy}A${rx} ${ry} 0 1 1 ${cx+rx} ${cy}Z`,
    `M${p(209)} ${p(27)}V${p(48)}Q${p(209)} ${p(62)} ${p(223)} ${p(62)}Q${p(237)} ${p(62)} ${p(237)} ${p(48)}V${p(27)}`,
    `M${p(260)} ${p(10)}V${p(49)}Q${p(260)} ${p(62)} ${p(273)} ${p(62)}H${p(277)}`,
  ] };
}

export function lockupDrawing(size = 44, withMark = true) {
  const markSize = size <= 36 ? 32 : Math.round(size * 1.1 / 8) * 8;
  const mark = markDrawing(markSize);
  const lettering = letteringDrawing(size);
  const wordX = withMark ? markSize + Math.round(size * .2) : 0;
  const wordY = withMark ? Math.round(mark.bottom - lettering.baseline) : 0;
  return { mark, lettering, wordX, wordY, width: 2 * Math.ceil((wordX + lettering.width + 2) / 2), height: withMark ? markSize : 2*Math.ceil(size/2) };
}

export const SWEEP_STOPS = [{ offset: 0, opacity: .38 }, { offset: .35, opacity: .2 }, { offset: .75, opacity: .05 }, { offset: 1, opacity: 0 }];

export function markMarkup({ ink = LOGO_COLORS.ink, signal = LOGO_COLORS.signal, ring = ink === LOGO_COLORS.reverse ? LOGO_COLORS.reverseRing : ink === LOGO_COLORS.ink ? LOGO_COLORS.ring : ink, size = 64, id = "turnout-sweep", trail = true }: { ink?: string; signal?: string; ring?: string; size?: number; id?: string; trail?: boolean } = {}): string {
  const m = markDrawing(size), g = m.gradient;
  const sweep = trail ? `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}">${SWEEP_STOPS.map(s => `<stop offset="${s.offset}" stop-color="${signal}" stop-opacity="${s.opacity}"/>`).join("")}</linearGradient></defs><path d="${m.field}" fill="${signal}" fill-opacity="${FIELD_OPACITY}"/><path d="${m.sweep}" fill="url(#${id})"/>` : "";
  return sweep + `<g fill="${ring}">${m.ringShapes.map(d => `<path d="${d}"/>`).join("")}</g><path d="${m.structure}" fill="${ink}"/><circle cx="${m.blip.x}" cy="${m.blip.y}" r="${m.blip.radius}" fill="${signal}"/>`;
}

export function letteringMarkup(ink: string = LOGO_COLORS.ink, size = 76): string {
  const lettering = letteringDrawing(size);
  return `<g fill="none" stroke="${ink}" stroke-width="${lettering.stroke}" stroke-linecap="butt" stroke-linejoin="round">${lettering.paths.map(d => `<path d="${d}"/>`).join("")}${lettering.solidPaths.map(d => `<path d="${d}" fill="${ink}" stroke="none"/>`).join("")}</g>`;
}

export function lockupMarkup(ink: string = LOGO_COLORS.ink, signal: string = LOGO_COLORS.signal, size = 152, id = "turnout-lockup"): string {
  const l = lockupDrawing(size);
  return markMarkup({ ink, signal, size: l.mark.size, id }) + `<g transform="translate(${l.wordX} ${l.wordY})">${letteringMarkup(ink,size)}</g>`;
}
