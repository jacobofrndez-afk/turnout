import { useId, type CSSProperties } from "react";
import { markDrawing, lockupDrawing, SWEEP_STOPS, FIELD_OPACITY } from "./logo-geometry";

export type MarkTone = "color" | "reverse" | "mono";
export type MarkGround = "paper" | "white";
const colors = {
  color: { ring: "var(--mark-ring, #927798)", ink: "var(--mark-ink, #3B1C42)", signal: "var(--mark-needle, #84204D)" },
  reverse: { ring: "var(--mark-ring-reverse, #C4AECA)", ink: "var(--mark-ink-reverse, #F6F1F8)", signal: "var(--mark-needle-reverse, #E6A4C2)" },
  mono: { ring: "currentColor", ink: "currentColor", signal: "currentColor" },
};

function Geometry({ tone, size, trail = true }: { tone: MarkTone; size: number; trail?: boolean }) {
  const id = `turnout-sweep-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const { ink, signal, ring } = colors[tone], m = markDrawing(size), g = m.gradient;
  return <>
    {trail && <defs><linearGradient id={id} gradientUnits="userSpaceOnUse" x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2}>{SWEEP_STOPS.map(s=><stop key={s.offset} offset={s.offset} stopColor={signal} stopOpacity={s.opacity}/>)}</linearGradient></defs>}
    {trail && <path d={m.field} fill={signal} fillOpacity={FIELD_OPACITY}/>}
    {trail && <path d={m.sweep} fill={`url(#${id})`}/>}
    <g fill={ring}>{m.ringShapes.map(d=><path key={d} d={d}/>)}</g>
    <path d={m.structure} fill={ink}/>
    <circle cx={m.blip.x} cy={m.blip.y} r={m.blip.radius} fill={signal}/>
  </>;
}

export function Mark({ size = 40, tone = "color", trail = tone !== "mono", title, className, style }: { size?: number; tone?: MarkTone; ground?: MarkGround; motion?: boolean; trail?: boolean; title?: string; className?: string; style?: CSSProperties }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="geometricPrecision" className={className} style={{ flex: "none", display: "block", ...style }} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
    {title && <title>{title}</title>}
    <Geometry tone={tone} size={size} trail={trail}/>
  </svg>;
}

function Lockup({ size, tone, mark, className }: { size: number; tone: MarkTone; mark: boolean; className: string }) {
  const l=lockupDrawing(size,mark);
  return <svg xmlns="http://www.w3.org/2000/svg" width={l.width} height={l.height} viewBox={`0 0 ${l.width} ${l.height}`} shapeRendering="geometricPrecision" aria-hidden="true" focusable="false" className={className}>
    {mark && <Geometry tone={tone} size={l.mark.size} trail={tone!=="mono"}/>}
    <g transform={`translate(${l.wordX} ${l.wordY})`} fill="none" stroke={colors[tone].ink} strokeWidth={l.lettering.stroke} strokeLinecap="butt" strokeLinejoin="round">{l.lettering.paths.map(d=><path key={d} d={d}/>)}{l.lettering.solidPaths.map(d=><path key={d} d={d} fill={colors[tone].ink} stroke="none"/>)}</g>
  </svg>;
}

export function Wordmark({ size = 44, phone, tone = "color", mark = true, className }: { size?: number; phone?: number; tone?: MarkTone; live?: boolean; motion?: boolean; tagline?: boolean; mark?: boolean; className?: string }) {
  const responsive = phone && phone !== size;
  return <span role="img" aria-label="Turnout — door and radar" className={`turnout-wordmark ${className ?? ""}`}>
    <Lockup size={size} tone={tone} mark={mark} className={responsive ? "turnout-logo-wide" : "turnout-logo"}/>
    {responsive && <Lockup size={phone} tone={tone} mark={mark} className="turnout-logo-phone"/>}
  </span>;
}
