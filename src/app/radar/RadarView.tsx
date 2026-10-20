"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import RadarMap, { fmtKm, walkMin, type MapPoint } from "./RadarMap";
import "./radar.css";

export type ViewItem = {
  id: string;
  headliner: string;
  venue: string;
  lat: number;
  lon: number;
  startsAt: string; // ISO
  segment?: string;
  genre?: string;
  capacity: number;
  score: number;
  interesting: boolean;
  distanceKm: number;
  weather?: { label: string; kind: string };
};

type Props = {
  merchant: { id: string; name: string; lat: number; lon: number; radiusM: number; timezone: string };
  items: ViewItem[];
  nowIso: string;
  hours: number;
};

const H = 3_600_000;
const Q = 15 * 60_000;
// Presence window: the crowd gathers about 2.5 h before the start and is gone 1.5 h after the end.
function windowOf(it: ViewItem) {
  const start = Date.parse(it.startsAt);
  const showMin = (it.segment ?? "").toLowerCase() === "sports" ? 150 : 165;
  return { arrive: start - 150 * 60_000, start, end: start + showMin * 60_000, leave: start + (showMin + 90) * 60_000 };
}
type Crowd = ViewItem & { w: ReturnType<typeof windowOf> };

export default function RadarView({ merchant, items, nowIso, hours }: Props) {
  const router = useRouter();
  const now = Date.parse(nowIso);
  const tz = merchant.timezone;
  const [zoom, setZoom] = useState<24 | 72>(72);
  const t0 = now - 3 * H;
  const t1 = now + zoom * H;
  const span = t1 - t0;
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - t0) / span) * 100));

  const fmtTime = useMemo(() => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }), [tz]);
  const fmtDayKey = useMemo(() => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }), [tz]);
  const fmtWeekday = useMemo(() => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: tz }), [tz]);
  const fmtShortDay = useMemo(() => new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: tz }), [tz]);
  const fmtHour = useMemo(() => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }), [tz]);
  const todayKey = fmtDayKey.format(new Date(now));
  const tomorrowKey = fmtDayKey.format(new Date(now + 24 * H));
  const dayLabel = (t: number, short = false) => {
    const k = fmtDayKey.format(new Date(t));
    if (k === todayKey) return "Today";
    if (k === tomorrowKey) return "Tomorrow";
    return short ? fmtShortDay.format(new Date(t)) : fmtWeekday.format(new Date(t));
  };

  // Every crowd in the next 72 hours, so the street's whole activity shows.
  const all: Crowd[] = useMemo(
    () =>
      items
        .map((i) => ({ ...i, w: windowOf(i) }))
        .filter((i) => i.w.leave > now - 3 * H && i.w.arrive < now + 72 * H)
        .sort((a, b) => a.w.start - b.w.start),
    [items, now],
  );
  const inView = all.filter((c) => c.w.leave > t0 && c.w.arrive < t1);

  const firstHot = all.find((c) => c.interesting && c.w.leave > now);
  const [cursor, setCursor] = useState<number>(() => {
    const activeNow = all.some((c) => c.interesting && c.w.arrive <= now && now <= c.w.leave);
    return activeNow || !firstHot ? Math.round(now / Q) * Q : Math.round((firstHot.w.start - H) / Q) * Q;
  });
  const [selected, setSelected] = useState<string | undefined>(firstHot?.id);
  const [onlyWorth, setOnlyWorth] = useState(items.some((i) => i.interesting));
  const [full, setFull] = useState(false);
  const [radius, setRadius] = useState(merchant.radiusM);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setRadius(merchant.radiusM), [merchant.radiusM]);

  const active = all.filter((c) => c.w.arrive <= cursor && cursor <= c.w.leave).sort((a, b) => b.capacity - a.capacity);
  const hotList = all.filter((c) => c.interesting);
  const nextHot = hotList.find((c) => c.w.start - H > cursor + 5 * 60_000);
  const prevHot = [...hotList].reverse().find((c) => c.w.start - H < cursor - 5 * 60_000);

  // "People around you": crowds present per 15 minutes, weighted by distance to the merchant.
  const curve = useMemo(() => {
    const n = Math.ceil(span / Q) + 1;
    const hot = new Array(n).fill(0);
    const other = new Array(n).fill(0);
    const rKm = radius / 1000;
    for (const c of inView) {
      const weight = c.distanceKm <= rKm ? 1 : Math.max(0, 1 - (c.distanceKm - rKm) / (2 * rKm));
      if (weight <= 0) continue;
      for (let i = 0; i < n; i++) {
        const t = t0 + i * Q;
        if (t < c.w.arrive || t > c.w.leave) continue;
        // people build up while arriving, stay during the show, thin out while leaving
        const f = t < c.w.start ? (t - c.w.arrive) / (c.w.start - c.w.arrive) : t <= c.w.end ? 1 : 1 - (t - c.w.end) / (c.w.leave - c.w.end);
        (c.interesting ? hot : other)[i] += c.capacity * weight * Math.max(0, Math.min(1, f));
      }
    }
    const max = Math.max(1, ...hot.map((h, i) => h + other[i]));
    return { n, hot, other, max };
  }, [inView, t0, span, radius]);

  const curvePaths = useMemo(() => {
    const { n, hot, other, max } = curve;
    const y = (v: number) => 100 - (v / max) * 94;
    const area = (vals: number[], base?: number[]) => {
      const top = vals.map((v, i) => `${i},${y(v + (base ? base[i] : 0)).toFixed(2)}`);
      const bottom = base ? base.map((_, i) => `${n - 1 - i},${y(base[n - 1 - i]).toFixed(2)}`) : [`${n - 1},100`, `0,100`];
      return `M${top.join(" L")} L${bottom.join(" L")} Z`;
    };
    return { other: area(other), hot: area(hot, other), n };
  }, [curve]);

  const cursorPeople = useMemo(() => {
    const i = Math.round((cursor - t0) / Q);
    return Math.round(((curve.hot[i] ?? 0) + (curve.other[i] ?? 0)) / 100) * 100;
  }, [cursor, curve, t0]);

  // Event markers: hot or big crowds get a labelled lane, the others a dot on the base row.
  const markers = useMemo(() => {
    const laneEnds = [-1, -1, -1];
    return inView.map((c) => {
      const big = c.interesting || c.capacity >= 2500;
      let lane = -1;
      if (big) {
        const x = pct(c.w.start);
        const need = ((c.headliner.length * 6.5 + 26) / (span / H) / (zoom === 24 ? 52 : 24)) * 100;
        lane = laneEnds.findIndex((e) => e <= x);
        if (lane !== -1) laneEnds[lane] = x + need;
      }
      return { c, lane, size: Math.round(Math.max(7, Math.min(18, 4 + Math.sqrt(c.capacity) / 11))) };
    });
  }, [inView, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Day bands, night shading and hour ticks in the merchant's time zone.
  const { days, ticks, nights } = useMemo(() => {
    const days: { left: number; right: number; start: number }[] = [];
    const ticks: { left: number; label: string; major: boolean }[] = [];
    const nights: { left: number; right: number }[] = [];
    let dayStart = t0;
    let nightStart: number | undefined;
    const every = zoom === 24 ? 3 : 6;
    for (let t = Math.ceil(t0 / H) * H; t <= t1; t += H) {
      const h = Number(fmtHour.format(new Date(t)));
      if (h === 0) {
        days.push({ left: pct(dayStart), right: pct(t), start: dayStart });
        dayStart = t;
      }
      if (h % every === 0) ticks.push({ left: pct(t), label: `${String(h).padStart(2, "0")}:00`, major: h === 0 });
      if (h === 1 && nightStart === undefined) nightStart = t - H;
      if (h === 7 && nightStart !== undefined) {
        nights.push({ left: pct(nightStart), right: pct(t) });
        nightStart = undefined;
      }
    }
    days.push({ left: pct(dayStart), right: 100, start: dayStart });
    return { days, ticks, nights };
  }, [t0, t1, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // Day jump chips: 19:00 local of each day ahead.
  const dayJumps = useMemo(() => {
    const out: { label: string; t: number }[] = [];
    for (let t = Math.ceil(now / H) * H; t <= now + 72 * H; t += H) {
      if (Number(fmtHour.format(new Date(t))) === 19 && !out.some((o) => fmtDayKey.format(new Date(o.t)) === fmtDayKey.format(new Date(t)))) out.push({ label: `${dayLabel(t, true)} 19:00`, t });
    }
    return out;
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  const pxPerHour = zoom === 24 ? 52 : 24;
  const trackWidth = `max(100%, ${Math.round((span / H) * pxPerHour)}px)`;
  const clampT = (t: number) => Math.min(t1, Math.max(t0, t));

  // Keep the cursor in view inside the scrollable timeline.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const x = ((cursor - t0) / span) * el.scrollWidth;
    if (x < el.scrollLeft + el.clientWidth * 0.15 || x > el.scrollLeft + el.clientWidth * 0.75) el.scrollTo({ left: Math.max(0, x - el.clientWidth * 0.35), behavior: "smooth" });
  }, [cursor, zoom, full]); // eslint-disable-line react-hooks/exhaustive-deps

  function setFromPointer(clientX: number) {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setCursor(Math.round((t0 + ratio * span) / Q) * Q);
  }
  function selectCrowd(id: string) {
    setSelected(id);
    const c = all.find((x) => x.id === id);
    if (!c) return;
    if (c.w.start > now + 24 * H && zoom === 24) setZoom(72);
    setCursor(Math.round((c.w.start - H) / Q) * Q);
  }
  function onTrackKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? H : Q;
    if (e.key === "ArrowRight") setCursor((c) => clampT(c + step));
    else if (e.key === "ArrowLeft") setCursor((c) => clampT(c - step));
    else if (e.key === "PageDown" && nextHot) selectCrowd(nextHot.id);
    else if (e.key === "PageUp" && prevHot) selectCrowd(prevHot.id);
    else if (e.key === "Home") setCursor(Math.round(now / Q) * Q);
    else return;
    e.preventDefault();
  }

  async function changeRadius(r: number) {
    const next = Math.min(5000, Math.max(300, Math.round(r / 100) * 100));
    setRadius(next);
    setSaving(true);
    try {
      await fetch(`/api/merchants/${merchant.id}/radius`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ radius_m: next }) });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // Full screen for the whole radar (map + timeline): the in-page overlay always applies at once, and the
  // browser's native full screen is requested on top when the page is allowed to (some frames never answer).
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setFull(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  function toggleFull() {
    const next = !full;
    setFull(next);
    if (next) {
      const req = rootRef.current?.requestFullscreen?.();
      req?.catch(() => undefined);
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }

  // One marker per venue: the selected crowd, else the one present at the cursor, else the best scored.
  const points: MapPoint[] = useMemo(() => {
    const byVenue = new Map<string, Crowd[]>();
    for (const c of all.filter((i) => i.interesting || i.capacity >= 400)) {
      const k = `${c.venue}|${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
      byVenue.set(k, [...(byVenue.get(k) ?? []), c]);
    }
    return [...byVenue.entries()].map(([k, cs]) => {
      const isActive = (c: Crowd) => c.w.arrive <= cursor && cursor <= c.w.leave;
      const rep = cs.find((c) => c.id === selected) ?? cs.find(isActive) ?? [...cs].sort((a, b) => b.score - a.score)[0];
      return {
        key: k,
        eventId: rep.id,
        label: rep.headliner,
        time: `${dayLabel(rep.w.start)} ${fmtTime.format(new Date(rep.w.start))}`,
        venue: rep.venue,
        capacity: rep.capacity,
        distanceKm: rep.distanceKm,
        href: `/campaigns/new?merchant=${merchant.id}&event=${rep.id}`,
        lat: rep.lat,
        lon: rep.lon,
        hot: cs.some((c) => c.interesting),
        active: cs.some(isActive),
        selected: cs.some((c) => c.id === selected),
      };
    });
  }, [all, cursor, selected, fmtTime, merchant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const listItems = (onlyWorth ? all.filter((i) => i.interesting) : all).filter((i) => i.w.leave > now);
  const groups = new Map<string, Crowd[]>();
  for (const it of listItems) {
    const k = dayLabel(it.w.start);
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  const cursorLabel = `${dayLabel(cursor, true)} ${fmtTime.format(new Date(cursor))}`;
  const cursorPct = pct(cursor);

  return (
    <div ref={rootRef} className={`tm-root${full ? " is-full" : ""}`}>
      <div className="tm-bar-top">
        <p className="tm-readout" aria-live="polite">
          <b>{cursorLabel}</b> · {cursorPeople > 0 ? <>about <b>{cursorPeople.toLocaleString("en-US")}</b> people around you</> : "a quiet street"}
          {active.length > 0 && (
            <>
              {": "}
              {active.slice(0, 3).map((c, i) => (
                <span key={c.id}>
                  {i > 0 ? ", " : ""}
                  <button type="button" className="tm-inline" onClick={() => selectCrowd(c.id)}>
                    {c.headliner}
                  </button>{" "}
                  {cursor < c.w.start ? "arriving" : cursor <= c.w.end ? "inside" : "leaving"}
                </span>
              ))}
              {active.length > 3 ? `, and ${active.length - 3} more` : ""}
            </>
          )}
        </p>
        <div className="tm-grp">
          <span className="tm-radius" aria-label="Radius around your place">
            <button type="button" onClick={() => changeRadius(radius - (radius > 1000 ? 500 : 100))} disabled={radius <= 300 || saving} aria-label="Smaller radius">
              −
            </button>
            <b>{fmtKm(radius)}</b>
            <button type="button" onClick={() => changeRadius(radius + (radius >= 1000 ? 500 : 100))} disabled={radius >= 5000 || saving} aria-label="Larger radius">
              +
            </button>
            <span className="tm-hide-sm">{saving ? "updating…" : `${walkMin(radius)} min walk`}</span>
          </span>
          <button type="button" className="tm-btn" onClick={toggleFull} aria-pressed={full}>
            {full ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>

      <div className="tm-body">
        <div className="tm-maparea">
          <RadarMap merchant={{ name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: radius }} points={points} onSelect={(id) => selectCrowd(id)} onRadiusChange={changeRadius} />
        </div>

        <section className="tm-tl" aria-label="Crowds over the next hours">
          <div className="tm-tl-ctrl">
            <div className="tm-grp">
              <button type="button" className="tm-btn" onClick={() => prevHot && selectCrowd(prevHot.id)} disabled={!prevHot}>
                ← Previous crowd
              </button>
              <button type="button" className="tm-btn" onClick={() => setCursor(Math.round(now / Q) * Q)}>
                Now
              </button>
              <button type="button" className="tm-btn tm-btn-primary" onClick={() => nextHot && selectCrowd(nextHot.id)} disabled={!nextHot}>
                Next crowd →
              </button>
            </div>
            <div className="tm-grp">
              {dayJumps.map((d) => (
                <button
                  key={d.t}
                  type="button"
                  className="tm-chip-btn"
                  onClick={() => {
                    if (d.t > now + 24 * H) setZoom(72);
                    setCursor(d.t);
                  }}
                >
                  {d.label}
                </button>
              ))}
              <span className="tm-seg" role="group" aria-label="Timeline zoom">
                <button type="button" aria-pressed={zoom === 24} onClick={() => setZoom(24)}>
                  24 h
                </button>
                <button type="button" aria-pressed={zoom === 72} onClick={() => setZoom(72)}>
                  72 h
                </button>
              </span>
            </div>
          </div>
          <div ref={scrollRef} className="tm-scroll">
            <div
              ref={trackRef}
              className="tm-track"
              style={{ width: trackWidth }}
              tabIndex={0}
              role="slider"
              aria-label="Time on the radar. Arrow keys move 15 minutes, Shift and arrow one hour, Page Down the next crowd."
              aria-valuemin={t0}
              aria-valuemax={t1}
              aria-valuenow={cursor}
              aria-valuetext={`${cursorLabel}, about ${cursorPeople} people around`}
              onKeyDown={onTrackKey}
              onPointerDown={(e) => {
                if ((e.target as HTMLElement).closest(".tm-ev")) return;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                setFromPointer(e.clientX);
              }}
              onPointerMove={(e) => {
                if (e.buttons === 1 && !(e.target as HTMLElement).closest(".tm-ev")) setFromPointer(e.clientX);
              }}
            >
              <div className="tm-days" aria-hidden="true">
                {nights.map((n, i) => (
                  <span key={`n${i}`} className="tm-night" style={{ left: `${n.left}%`, width: `${n.right - n.left}%` }} />
                ))}
                {days.map((d, i) => (
                  <span key={`d${i}`} className={`tm-day${i % 2 ? " alt" : ""}`} style={{ left: `${d.left}%`, width: `${d.right - d.left}%` }}>
                    {d.right - d.left > 5 && <b>{dayLabel(d.start + 1)}</b>}
                  </span>
                ))}
                {ticks.map((t, i) => (
                  <span key={`t${i}`}>
                    <span className={`tm-tickline${t.major ? " major" : ""}`} style={{ left: `${t.left}%` }} />
                    <span className="tm-tick" style={{ left: `${t.left}%` }}>
                      {t.label}
                    </span>
                  </span>
                ))}
              </div>
              <svg className="tm-curve" viewBox={`0 0 ${Math.max(1, curvePaths.n - 1)} 100`} preserveAspectRatio="none" aria-hidden="true">
                <path d={curvePaths.other} fill="#d9d2c5" fillOpacity="0.75" />
                <path d={curvePaths.hot} fill="#e0955a" fillOpacity="0.6" />
              </svg>
              <span className="tm-curve-lbl" aria-hidden="true">
                people around you · peak {curve.max >= 1000 ? `${Math.round(curve.max / 1000)}k` : Math.round(curve.max)}
              </span>
              {markers.map(({ c, lane, size }) => (
                <button
                  key={c.id}
                  type="button"
                  className={`tm-ev${c.interesting ? " hot" : ""}${selected === c.id ? " sel" : ""}${lane >= 0 ? " lbl" : ""}`}
                  style={{ left: `${pct(c.w.start)}%`, top: lane >= 0 ? 118 + lane * 24 : 196, ["--s" as string]: `${size}px` }}
                  title={`${c.headliner} · ${c.venue} · ${fmtTime.format(new Date(c.w.start))} · ~${c.capacity.toLocaleString("en-US")} people · ${c.distanceKm.toFixed(1)} km`}
                  onClick={() => selectCrowd(c.id)}
                >
                  <i aria-hidden="true" />
                  {lane >= 0 && <span>{c.headliner}</span>}
                </button>
              ))}
              <span className="tm-now" style={{ left: `${pct(now)}%` }} aria-hidden="true">
                <i>now</i>
              </span>
              <span className={`tm-cursor${cursorPct > 80 ? " flip" : ""}`} style={{ left: `${cursorPct}%` }} aria-hidden="true">
                <i>{cursorLabel}</i>
              </span>
            </div>
          </div>
          <p className="tm-legend">
            <span>
              <i style={{ background: "#e0955a" }} />
              crowds worth a campaign
            </span>
            <span>
              <i style={{ background: "#d9d2c5" }} />
              other crowds
            </span>
            <span>Drag across the timeline or use the arrow keys. The map shows who is around you at that moment.</span>
          </p>
        </section>

        <aside className="tm-list">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="eyebrow">{onlyWorth ? "Crowds worth a campaign" : "All crowds"}, by time</p>
            <div className="flex gap-1.5">
              <button type="button" className="chip" aria-pressed={onlyWorth} style={onlyWorth ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : undefined} onClick={() => setOnlyWorth(true)}>
                Worth a campaign
              </button>
              <button type="button" className="chip" aria-pressed={!onlyWorth} style={!onlyWorth ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" } : undefined} onClick={() => setOnlyWorth(false)}>
                All
              </button>
            </div>
          </div>
          {groups.size === 0 && <p className="text-sm" style={{ color: "var(--muted)" }}>No crowd worth a campaign in the next {hours} hours. Switch to All to see smaller events.</p>}
          {[...groups.entries()].map(([day, list]) => (
            <div key={day} className="tm-daygroup">
              <h3>{day}</h3>
              {list.map((it) => {
                const isSel = selected === it.id;
                return (
                  <div key={it.id} className={`${it.interesting ? "card" : "card-flat"} p-4${isSel ? " tm-item sel" : ""}`} style={it.interesting ? { borderColor: "var(--accent)" } : undefined}>
                    <div className="flex items-start justify-between gap-4">
                      <button type="button" className="tm-item min-w-0" onClick={() => selectCrowd(it.id)} aria-pressed={isSel}>
                        <p className="tnum text-sm font-semibold" style={{ color: "var(--ink)" }}>
                          {fmtTime.format(new Date(it.w.start))} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· crowd from {fmtTime.format(new Date(it.w.arrive))} to {fmtTime.format(new Date(it.w.leave))}</span>
                        </p>
                        <p className="truncate font-display text-lg">{it.headliner}</p>
                        <p className="truncate text-sm" style={{ color: "var(--muted)" }}>
                          {it.venue} · {it.distanceKm.toFixed(1)} km · ~{it.capacity.toLocaleString("en-US")} people
                        </p>
                        {it.weather && (
                          <p className="mt-1 text-xs font-semibold" style={{ color: ["rain", "storm", "snow", "cold"].includes(it.weather.kind) ? "var(--warn)" : "var(--ok)" }}>
                            Weather at your door: {it.weather.label}
                          </p>
                        )}
                      </button>
                      <div className="score-ring shrink-0" style={{ ["--p" as string]: it.score }} title="Concentration score">
                        <span>{it.score}</span>
                      </div>
                    </div>
                    {it.interesting && (
                      <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.id}`} className="mt-3 inline-flex text-sm font-semibold" style={{ color: "var(--accent)" }}>
                        Qualify this crowd with Qloo →
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
