"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import RadarMap, { type MapPoint } from "./RadarMap";
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
// Presence window: the crowd gathers about 2.5 h before the start and is gone 1.5 h after the end.
function windowOf(it: ViewItem) {
  const start = Date.parse(it.startsAt);
  const showMin = (it.segment ?? "").toLowerCase() === "sports" ? 150 : 165;
  return { arrive: start - 150 * 60_000, start, end: start + showMin * 60_000, leave: start + (showMin + 90) * 60_000 };
}

export default function RadarView({ merchant, items, nowIso, hours }: Props) {
  const now = Date.parse(nowIso);
  const t0 = now - 3 * H;
  const t1 = now + hours * H;
  const span = t1 - t0;
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - t0) / span) * 100));
  const tz = merchant.timezone;

  const fmtTime = useMemo(() => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }), [tz]);
  const fmtDayKey = useMemo(() => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: tz }), [tz]);
  const fmtWeekday = useMemo(() => new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: tz }), [tz]);
  const fmtHour = useMemo(() => new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: tz }), [tz]);
  const todayKey = fmtDayKey.format(new Date(now));
  const tomorrowKey = fmtDayKey.format(new Date(now + 24 * H));
  const dayLabel = (t: number) => {
    const k = fmtDayKey.format(new Date(t));
    if (k === todayKey) return "Today";
    if (k === tomorrowKey) return "Tomorrow";
    return fmtWeekday.format(new Date(t));
  };

  // Crowds shown on the timeline: every crowd worth a campaign, plus the bigger ones for context.
  const crowds = useMemo(() => {
    const worth = items.filter((i) => i.interesting);
    // Context crowds: only the big ones, so the timeline stays readable.
    const context = items.filter((i) => !i.interesting && i.capacity >= 3000).slice(0, 8);
    return [...worth, ...context]
      .map((i) => ({ ...i, w: windowOf(i) }))
      .filter((i) => i.w.leave > t0 && i.w.arrive < t1)
      .sort((a, b) => a.w.arrive - b.w.arrive);
  }, [items, t0, t1]);

  // Lanes: greedy packing so bars never overlap.
  const lanes = useMemo(() => {
    const ends: number[] = [];
    const map = new Map<string, number>();
    for (const c of crowds) {
      const gap = 20 * 60_000;
      let lane = ends.findIndex((e) => e + gap <= c.w.arrive);
      if (lane === -1) {
        lane = ends.length;
        ends.push(0);
      }
      ends[lane] = c.w.leave;
      map.set(c.id, lane);
    }
    return { map, count: Math.max(1, ends.length) };
  }, [crowds]);

  const firstHot = crowds.find((c) => c.interesting && c.w.leave > now);
  const [cursor, setCursor] = useState<number>(() => {
    const activeNow = crowds.some((c) => c.w.arrive <= now && now <= c.w.leave);
    return activeNow || !firstHot ? now : Math.max(now, firstHot.w.arrive + 90 * 60_000);
  });
  const [selected, setSelected] = useState<string | undefined>(firstHot?.id);
  const [onlyWorth, setOnlyWorth] = useState(items.some((i) => i.interesting));
  const trackRef = useRef<HTMLDivElement>(null);

  const active = crowds.filter((c) => c.w.arrive <= cursor && cursor <= c.w.leave).sort((a, b) => b.capacity - a.capacity);
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackWidth = `max(100%, ${Math.round((span / H) * 26)}px)`;
  // Keep the cursor in view inside the horizontally scrollable timeline.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const x = ((cursor - t0) / span) * el.scrollWidth;
    if (x < el.scrollLeft + el.clientWidth * 0.15 || x > el.scrollLeft + el.clientWidth * 0.7) el.scrollTo({ left: Math.max(0, x - el.clientWidth * 0.3), behavior: "smooth" });
  }, [cursor]); // eslint-disable-line react-hooks/exhaustive-deps
  const nextHot = crowds.find((c) => c.interesting && c.w.arrive > cursor + 5 * 60_000);
  const prevHot = [...crowds].reverse().find((c) => c.interesting && c.w.arrive + 90 * 60_000 < cursor - 5 * 60_000);

  // Day bands and hour ticks, in the merchant's time zone.
  const { days, ticks, nights } = useMemo(() => {
    const days: { left: number; right: number; label: string }[] = [];
    const ticks: { left: number; label: string }[] = [];
    const nights: { left: number; right: number }[] = [];
    let dayStart = t0;
    let nightStart: number | undefined;
    for (let t = Math.ceil(t0 / H) * H; t <= t1; t += H) {
      const h = Number(fmtHour.format(new Date(t)));
      if (h === 0) {
        days.push({ left: pct(dayStart), right: pct(t), label: dayLabel(dayStart + 1) });
        dayStart = t;
      }
      if (h % 6 === 0) ticks.push({ left: pct(t), label: `${String(h).padStart(2, "0")}:00` });
      if (h === 1 && nightStart === undefined) nightStart = t - H;
      if (h === 7 && nightStart !== undefined) {
        nights.push({ left: pct(nightStart), right: pct(t) });
        nightStart = undefined;
      }
    }
    days.push({ left: pct(dayStart), right: 100, label: dayLabel(dayStart + 1) });
    return { days, ticks, nights };
  }, [t0, t1]); // eslint-disable-line react-hooks/exhaustive-deps

  const laneH = 32;
  const trackH = 34 + lanes.count * laneH + 26;

  function setFromPointer(clientX: number) {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setCursor(Math.round((t0 + ratio * span) / (15 * 60_000)) * 15 * 60_000);
  }
  function selectCrowd(id: string, moveCursor = true) {
    setSelected(id);
    const c = crowds.find((x) => x.id === id) ?? items.map((i) => ({ ...i, w: windowOf(i) })).find((x) => x.id === id);
    if (c && moveCursor) setCursor(Math.max(t0, Math.min(t1, c.w.start - 60 * 60_000)));
  }

  // One marker per venue: the selected crowd, else the crowd present at the cursor, else the best scored.
  const points: MapPoint[] = useMemo(() => {
    const byVenue = new Map<string, (typeof crowds)[number][]>();
    const pool = items.map((i) => ({ ...i, w: windowOf(i) })).filter((i) => i.w.leave > t0 && i.w.arrive < t1 && (i.interesting || i.capacity >= 500));
    for (const c of pool) {
      const k = `${c.venue}|${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
      byVenue.set(k, [...(byVenue.get(k) ?? []), c]);
    }
    return [...byVenue.entries()].map(([k, cs]) => {
      const isActive = (c: (typeof cs)[number]) => c.w.arrive <= cursor && cursor <= c.w.leave;
      const rep = cs.find((c) => c.id === selected) ?? cs.find(isActive) ?? [...cs].sort((a, b) => b.score - a.score)[0];
      return {
        key: k,
        eventId: rep.id,
        label: rep.headliner,
        sub: `${rep.venue} · ${fmtTime.format(new Date(rep.startsAt))} · ~${rep.capacity.toLocaleString("en-US")}`,
        lat: rep.lat,
        lon: rep.lon,
        hot: cs.some((c) => c.interesting),
        active: cs.some(isActive),
        selected: cs.some((c) => c.id === selected),
      };
    });
  }, [items, cursor, selected, t0, t1, fmtTime]);

  const listItems = (onlyWorth ? items.filter((i) => i.interesting) : items).slice().sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  const groups = new Map<string, ViewItem[]>();
  for (const it of listItems) {
    const k = dayLabel(Date.parse(it.startsAt));
    groups.set(k, [...(groups.get(k) ?? []), it]);
  }
  const cursorLabel = `${dayLabel(cursor)} ${fmtTime.format(new Date(cursor))}`;
  const cursorPct = pct(cursor);

  return (
    <div className="grid gap-6">
      {/* Timeline */}
      <section className="tm-tl" aria-label="Crowds over the next hours">
        <div className="tm-ctrl">
          <p className="tm-readout" aria-live="polite">
            <b>{cursorLabel}</b>
            {" · "}
            {active.length === 0
              ? "no crowd around you at this time"
              : active.slice(0, 3).map((c, i) => (
                  <span key={c.id}>
                    {i > 0 ? ", " : ""}
                    <b>{c.headliner}</b> ~{c.capacity.toLocaleString("en-US")} {c.w.arrive <= cursor && cursor < c.w.start ? "arriving" : cursor <= c.w.end ? "inside" : "leaving"}
                  </span>
                ))}
            {active.length > 3 ? `, and ${active.length - 3} more` : ""}
          </p>
          <div className="grp">
            <button type="button" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => prevHot && selectCrowd(prevHot.id)} disabled={!prevHot}>
              ← Previous crowd
            </button>
            <button type="button" className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => setCursor(now)}>
              Now
            </button>
            <button type="button" className="btn btn-primary" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={() => nextHot && selectCrowd(nextHot.id)} disabled={!nextHot}>
              Next crowd →
            </button>
          </div>
        </div>
        <div ref={scrollRef} className="tm-scroll">
        <div
          ref={trackRef}
          className="tm-track"
          style={{ height: trackH, width: trackWidth }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest(".tm-bar")) return;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setFromPointer(e.clientX);
          }}
          onPointerMove={(e) => {
            if (e.buttons === 1 && !(e.target as HTMLElement).closest(".tm-bar")) setFromPointer(e.clientX);
          }}
        >
          <div className="tm-days" aria-hidden="true">
            {nights.map((n, i) => (
              <span key={`n${i}`} className="tm-night" style={{ left: `${n.left}%`, width: `${n.right - n.left}%` }} />
            ))}
            {days.map((d, i) => (
              <span key={`d${i}`} className={`tm-day${i % 2 ? " alt" : ""}`} style={{ left: `${d.left}%`, width: `${d.right - d.left}%` }}>
                {d.right - d.left > 9 && <b>{d.label}</b>}
              </span>
            ))}
            {ticks.map((t, i) => (
              <span key={`t${i}`}>
                <span className="tm-tickline" style={{ left: `${t.left}%` }} />
                <span className="tm-tick" style={{ left: `${t.left}%` }}>
                  {t.label}
                </span>
              </span>
            ))}
          </div>
          <span className="tm-now" style={{ left: `${pct(now)}%` }} aria-hidden="true">
            <i>now</i>
          </span>
          {crowds.map((c) => {
            const left = pct(c.w.arrive);
            const width = Math.max(1.2, pct(c.w.leave) - left);
            const showL = ((pct(c.w.start) - left) / width) * 100;
            const showW = ((pct(c.w.end) - pct(c.w.start)) / width) * 100;
            return (
              <button
                key={c.id}
                type="button"
                className={`tm-bar${c.interesting ? " hot" : ""}${selected === c.id ? " sel" : ""}`}
                style={{ left: `${left}%`, width: `${width}%`, top: 34 + (lanes.map.get(c.id) ?? 0) * laneH }}
                title={`${c.headliner} · ${c.venue} · arrive ${fmtTime.format(new Date(c.w.arrive))}, start ${fmtTime.format(new Date(c.w.start))}, gone ${fmtTime.format(new Date(c.w.leave))} · ~${c.capacity.toLocaleString("en-US")} people`}
                onClick={() => selectCrowd(c.id)}
              >
                <span className="show" style={{ left: `${showL}%`, width: `${showW}%` }} aria-hidden="true" />
                <span className="lbl">
                  {c.headliner} · {c.capacity >= 1000 ? `${Math.round(c.capacity / 1000)}k` : c.capacity}
                </span>
              </button>
            );
          })}
          <span className={`tm-cursor${cursorPct > 82 ? " flip" : ""}`} style={{ left: `${cursorPct}%` }} aria-hidden="true">
            <i>{cursorLabel}</i>
          </span>
        </div>
        </div>
        <label className="sr-only" htmlFor="tm-range">
          Time on the radar
        </label>
        <input
          id="tm-range"
          className="tm-range"
          type="range"
          min={t0}
          max={t1}
          step={15 * 60_000}
          value={cursor}
          onChange={(e) => setCursor(Number(e.target.value))}
          aria-valuetext={cursorLabel}
        />
        <div className="tm-legend">
          <span>
            <i style={{ background: "#fbe9d9", border: "1px solid #e0955a" }} />
            crowd worth a campaign
          </span>
          <span>
            <i style={{ background: "#efebe3", border: "1px solid #d9d2c5" }} />
            other crowd
          </span>
          <span>
            <i style={{ background: "rgba(180,83,10,.22)" }} />
            the show itself; before it people arrive, after it they leave
          </span>
          <span>Drag the line or the slider: the map shows who is around you at that moment.</span>
        </div>
      </section>

      {/* Map + list */}
      <section className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <RadarMap merchant={{ name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: merchant.radiusM }} points={points} onSelect={(id) => selectCrowd(id)} />
        <div className="grid content-start gap-4">
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
                const w = windowOf(it);
                const isSel = selected === it.id;
                return (
                  <div key={it.id} className={`${it.interesting ? "card" : "card-flat"} p-4${isSel ? " tm-item sel" : ""}`} style={it.interesting ? { borderColor: "var(--accent)" } : undefined}>
                    <div className="flex items-start justify-between gap-4">
                      <button type="button" className="tm-item min-w-0" onClick={() => selectCrowd(it.id)} aria-pressed={isSel}>
                        <p className="tnum text-sm font-semibold" style={{ color: "var(--ink)" }}>
                          {fmtTime.format(new Date(it.startsAt))} <span style={{ color: "var(--muted)", fontWeight: 400 }}>· crowd from {fmtTime.format(new Date(w.arrive))} to {fmtTime.format(new Date(w.leave))}</span>
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
        </div>
      </section>
    </div>
  );
}
