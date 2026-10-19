// Turnout mark, "the threshold": an open doorway and three people crossing it.
// The amber dot is the one who just walked in. Inherits currentColor for the ink parts.
export function Mark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* doorway: left post, lintel, right post open at the bottom */}
      <path d="M8 29V5.5A2.5 2.5 0 0 1 10.5 3h11A2.5 2.5 0 0 1 24 5.5V14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* people crossing the threshold */}
      <circle cx="4.5" cy="23" r="2.1" fill="currentColor" opacity="0.45" />
      <circle cx="11" cy="21.5" r="2.4" fill="currentColor" opacity="0.75" />
      <circle cx="18.5" cy="20" r="3.4" fill="var(--accent)" />
      {/* floor line */}
      <path d="M2 29h28" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function Wordmark({ size = 20, tagline = false }: { size?: number; tagline?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" style={{ color: "var(--ink)" }}>
      <Mark size={size * 1.45} />
      <span className="inline-flex flex-col leading-none">
        <span className="font-display" style={{ fontSize: size, letterSpacing: "-0.02em", lineHeight: 1 }}>
          Turnout
        </span>
        {tagline && (
          <span className="mt-1 text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted)" }}>
            crowd to campaign
          </span>
        )}
      </span>
    </span>
  );
}
