"use client";
import { clock } from "@/lib/clock";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import RadarMap, { fmtKm, walkMin, type MapPoint } from "./RadarMap";
import "./radar.css";

// A moment worth knowing about: one show at a venue, several shows starting or ending together (wave),
// a game on TV, a street or city event.
export type ViewItem = {
  id: string;
  kind: string; // venue | wave | tv | street | calendar
  headliner: string;
  short: string; // label on the timeline
  blurb?: string; // what the moment is made of
  members: string[]; // event ids of a wave's shows
  w: { arrive: number; start: number; end: number; leave: number }; // when the crowd is around (ms)
  guests: number; // rough number of extra guests it could bring
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
  merchant: { id: string; name: string; lat: number; lon: number; radiusM: number; timezone: string; seats: number };
  items: ViewItem[];
  nowIso: string;
};

const H = 3_600_000;
const Q = 15 * 60_000;
const AHEAD_H = 72; // the radar: three hours back, three days ahead
const PX_PER_HOUR = 24; // the hour by hour track
type Crowd = ViewItem;
// Moments with a real place of their own go on the map; TV games and city nights are everywhere around you.
const ON_MAP = new Set(["venue", "street"]);
// Where the cursor goes for a crowd: an hour before a show starts, when people arrive; a moment at its peak.
const cursorFor = (c: Crowd) => Math.round((c.kind === "venue" ? c.w.start - H : c.w.start) / Q) * Q;

// The radar in the order of docs/UX-ONE-PATH.md: the map first and full width, the hours folded under a link,
// then the crowds worth a campaign, one link each.
export default function RadarView({ merchant, items, nowIso }: Props) {
  const router = useRouter();
  const now = Date.parse(nowIso);
  const nowQ = Math.round(now / Q) * Q;
  const tz = merchant.timezone;
  const t0 = now - 3 * H;
  const t1 = now + AHEAD_H * H;
  const span = t1 - t0;
  const pct = (t: number) => Math.min(100, Math.max(0, ((t - t0) / span) * 100));

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

  // Every crowd on the radar, so the street's whole activity shows.
  const all: Crowd[] = useMemo(
    () =>
      items
        .filter((i) => i.w.leave > t0 && i.w.arrive < t1)
        .sort((a, b) => a.w.start - b.w.start),
    [items, t0, t1],
  );

  const firstHot = all.find((c) => c.interesting && c.w.leave > now);
  const [selected, setSelected] = useState<string | undefined>(firstHot?.id);
  const [cursor, setCursor] = useState(nowQ);
  const [hourly, setHourly] = useState(false);
  const [full, setFull] = useState(false);
  // Full screen is the whole radar, map and hours; on the page the hours open under their link.
  const timelineOpen = hourly || full;
  const [radius, setRadius] = useState(merchant.radiusM);
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const placed = useRef(false);
  const [edge, setEdge] = useState<{ cursor: boolean; left: Set<string> }>({ cursor: false, left: new Set() });
  const edgeRef = useRef(edge);

  useEffect(() => setRadius(merchant.radiusM), [merchant.radiusM]);

  // Shows that belong to a wave worth a campaign count as hot; the selected wave lights up its shows on the map.
  const hotMembers = useMemo(() => new Set(all.filter((c) => c.interesting && c.kind === "wave").flatMap((c) => c.members)), [all]);
  const selWave = all.find((c) => c.id === selected && c.kind === "wave");
  const isHot = (c: Crowd) => c.interesting || hotMembers.has(c.id);
  const isTonight = (c: Crowd) => isHot(c) && fmtDayKey.format(new Date(c.w.start)) === todayKey && c.w.leave > now;
  const hotList = all.filter((c) => c.interesting);
  const nextHot = hotList.find((c) => c.w.start - H > cursor + 5 * 60_000);
  const prevHot = [...hotList].reverse().find((c) => c.w.start - H < cursor - 5 * 60_000);

  // The hours open on the chosen crowd (or now); folded, the cursor stays at now so the map shows the present.
  useEffect(() => {
    const c = timelineOpen ? all.find((x) => x.id === selected) : undefined;
    setCursor(c && c.w.leave > now ? cursorFor(c) : nowQ);
  }, [timelineOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // "People around you": crowds present per 15 minutes, weighted by distance to the merchant.
  const curve = useMemo(() => {
    const n = Math.ceil(span / Q) + 1;
    const hot = new Array(n).fill(0);
    const other = new Array(n).fill(0);
    const rKm = radius / 1000;
    for (const c of all) {
      if (c.kind === "wave") continue; // its shows are already counted one by one
      const weight = c.distanceKm <= rKm ? 1 : Math.max(0, 1 - (c.distanceKm - rKm) / (2 * rKm));
      if (weight <= 0) continue;
      for (let i = 0; i < n; i++) {
        const t = t0 + i * Q;
        if (t < c.w.arrive || t > c.w.leave) continue;
        // people build up while arriving, stay during the show, thin out while leaving
        const f = t < c.w.start ? (t - c.w.arrive) / (c.w.start - c.w.arrive) : t <= c.w.end ? 1 : 1 - (t - c.w.end) / (c.w.leave - c.w.end);
        (isHot(c) ? hot : other)[i] += c.capacity * weight * Math.max(0, Math.min(1, f));
      }
    }
    const max = Math.max(1, ...hot.map((h, i) => h + other[i]));
    return { n, hot, other, max };
  }, [all, t0, span, radius, hotMembers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Square columns per 15-minute slot: other crowds in grey, the window worth a campaign in plum on top.
  const columns = useMemo(() => {
    const { n, hot, other, max } = curve;
    const h = (v: number) => (v / max) * 94;
    const out: { i: number; o: number; h: number }[] = [];
    for (let i = 0; i < n; i++) if (hot[i] + other[i] > 0) out.push({ i, o: h(other[i]), h: h(hot[i]) });
    return { n, out };
  }, [curve]);

  const cursorPeople = useMemo(() => {
    const i = Math.round((cursor - t0) / Q);
    return Math.round(((curve.hot[i] ?? 0) + (curve.other[i] ?? 0)) / 100) * 100;
  }, [cursor, curve, t0]);

  // Event markers: hot or big crowds get a labelled lane, the others a dot on the base row.
  const markers = useMemo(() => {
    const laneEnds = [-1, -1, -1];
    return all.map((c) => {
      const big = c.interesting || (c.kind === "venue" && c.capacity >= 2500) || c.kind === "calendar";
      let lane = -1;
      if (big) {
        const x = pct(c.w.start);
        const need = ((c.short.length * 6.5 + 26) / (span / H) / PX_PER_HOUR) * 100;
        lane = laneEnds.findIndex((e) => e <= x);
        if (lane !== -1) laneEnds[lane] = x + need;
      }
      return { c, lane, size: Math.round(Math.max(7, Math.min(18, 4 + Math.sqrt(c.capacity) / 11))) };
    });
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  // Day bands and hour ticks in the merchant's time zone.
  const { days, ticks } = useMemo(() => {
    const days: { left: number; right: number; start: number }[] = [];
    const ticks: { left: number; label: string; major: boolean }[] = [];
    let dayStart = t0;
    for (let t = Math.ceil(t0 / H) * H; t <= t1; t += H) {
      const h = Number(fmtHour.format(new Date(t)));
      if (h === 0) {
        days.push({ left: pct(dayStart), right: pct(t), start: dayStart });
        dayStart = t;
      }
      if (h % 6 === 0) ticks.push({ left: pct(t), label: `${String(h).padStart(2, "0")}:00`, major: h === 0 });
    }
    days.push({ left: pct(dayStart), right: 100, start: dayStart });
    return { days, ticks };
  }, [t0, t1]); // eslint-disable-line react-hooks/exhaustive-deps

  const trackWidth = `max(100%, ${Math.round((span / H) * PX_PER_HOUR)}px)`;
  const clampT = (t: number) => Math.min(t1, Math.max(t0, t));

  // Keep the cursor in view inside the scrollable timeline. Folded, there is no scroller: it places itself again
  // when the hours open.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) {
      placed.current = false;
      return;
    }
    if (el.scrollWidth <= el.clientWidth) return;
    const x = ((cursor - t0) / span) * el.scrollWidth;
    if (!placed.current) {
      placed.current = true;
      el.scrollLeft = Math.max(0, x - el.clientWidth * 0.3);
      return;
    }
    if (x < el.scrollLeft + el.clientWidth * 0.15 || x > el.scrollLeft + el.clientWidth * 0.75) el.scrollTo({ left: Math.max(0, x - el.clientWidth * 0.3), behavior: "smooth" });
  }, [cursor, full, timelineOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // A label that would run past the visible edge of the scroller goes to the left of its line or dot.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const check = () => {
      const lo = el.scrollLeft + 8;
      const right = el.scrollLeft + el.clientWidth - 8;
      const lbl = el.querySelector<HTMLElement>(".tm-cursor i");
      const cursorOut = ((cursor - t0) / span) * el.scrollWidth + 8 + (lbl?.offsetWidth ?? 0) > right;
      const left = new Set<string>();
      for (const b of el.querySelectorAll<HTMLElement>(".tm-ev.lbl")) {
        const x = (parseFloat(b.style.left) / 100) * el.scrollWidth;
        // A dot outside the visible window takes its name with it: flipped, the name would still be cut at the edge.
        const name = b.querySelector<HTMLElement>("span");
        if (name) name.style.visibility = x < lo || x > right ? "hidden" : "";
        if (x + b.offsetWidth > right) left.add(b.dataset.id ?? "");
      }
      // A clock that would cross either edge of the window is hidden, never cut to ":00".
      for (const t of el.querySelectorAll<HTMLElement>(".tm-tick")) {
        const x = (parseFloat(t.style.left) / 100) * el.scrollWidth;
        t.style.visibility = x - t.offsetWidth / 2 < el.scrollLeft || x + t.offsetWidth / 2 > el.scrollLeft + el.clientWidth ? "hidden" : "";
      }
      const p = edgeRef.current;
      if (p.cursor === cursorOut && p.left.size === left.size && [...left].every((k) => p.left.has(k))) return;
      edgeRef.current = { cursor: cursorOut, left };
      setEdge(edgeRef.current);
    };
    check();
    el.addEventListener("scroll", check, { passive: true });
    return () => el.removeEventListener("scroll", check);
  }, [cursor, full, timelineOpen, cursorPeople, markers]); // eslint-disable-line react-hooks/exhaustive-deps

  function setFromPointer(clientX: number) {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const ratio = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setCursor(Math.round((t0 + ratio * span) / Q) * Q);
  }
  function selectCrowd(id: string) {
    setSelected(id);
    const c = all.find((x) => x.id === id);
    if (c && timelineOpen) setCursor(cursorFor(c));
  }
  function onTrackKey(e: KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? H : Q;
    if (e.key === "ArrowRight") setCursor((c) => clampT(c + step));
    else if (e.key === "ArrowLeft") setCursor((c) => clampT(c - step));
    else if (e.key === "PageDown" && nextHot) selectCrowd(nextHot.id);
    else if (e.key === "PageUp" && prevHot) selectCrowd(prevHot.id);
    else if (e.key === "Home") setCursor(nowQ);
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
  // While full screen is on, everything outside the overlay is inert: Tab stays inside the radar and the rest of
  // the page leaves the accessibility tree. Focus lands on the Exit button and goes back where it was on exit.
  useEffect(() => {
    const root = rootRef.current;
    if (!full || !root) return;
    const prev = document.activeElement;
    const made: Element[] = [];
    for (let a: Element | null = root; a && a !== document.body; a = a.parentElement) {
      for (const s of a.parentElement?.children ?? []) {
        if (s !== a && !s.hasAttribute("inert")) {
          s.setAttribute("inert", "");
          made.push(s);
        }
      }
    }
    root.querySelector<HTMLElement>(".tm-fs")?.focus();
    return () => {
      for (const s of made) s.removeAttribute("inert");
      const back = prev instanceof HTMLElement && prev !== document.body ? prev : root.querySelector<HTMLElement>(".tm-fs");
      back?.focus();
    };
  }, [full]);
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
  // Waves have no venue of their own: selecting one lights up its shows, and the peek card describes the wave.
  const points: MapPoint[] = useMemo(() => {
    const byVenue = new Map<string, Crowd[]>();
    for (const c of all.filter((i) => ON_MAP.has(i.kind) && (isHot(i) || i.capacity >= 400))) {
      const k = `${c.venue}|${c.lat.toFixed(4)},${c.lon.toFixed(4)}`;
      byVenue.set(k, [...(byVenue.get(k) ?? []), c]);
    }
    const inSel = (c: Crowd) => c.id === selected || (selWave?.members.includes(c.id) ?? false);
    const pts = [...byVenue.entries()].map(([k, cs]) => {
      const isActive = (c: Crowd) => c.w.arrive <= cursor && cursor <= c.w.leave;
      const rep = cs.find(inSel) ?? cs.find(isActive) ?? [...cs].sort((a, b) => b.score - a.score)[0];
      return {
        key: k,
        eventId: rep.id,
        label: rep.headliner,
        time: `${dayLabel(rep.w.start)} ${clock(rep.w.start, tz)}`,
        venue: rep.venue,
        capacity: rep.capacity,
        distanceKm: rep.distanceKm,
        href: `/campaigns/new?merchant=${merchant.id}&event=${rep.id}`,
        lat: rep.lat,
        lon: rep.lon,
        hot: cs.some(isHot),
        tonight: cs.some(isTonight),
        active: cs.some(isActive),
        selected: cs.some(inSel),
      };
    });
    if (selWave) {
      // The peek card sits on the wave's biggest show and speaks for the whole wave.
      const anchor = pts.filter((p) => p.selected).sort((a, b) => b.capacity - a.capacity)[0];
      if (anchor) {
        Object.assign(anchor, {
          eventId: selWave.id,
          label: selWave.headliner,
          time: `${dayLabel(selWave.w.start)} ${clock(selWave.w.start, tz)}`,
          venue: selWave.blurb ?? selWave.venue,
          capacity: selWave.capacity,
          href: `/campaigns/new?merchant=${merchant.id}&event=${selWave.id}`,
          hot: selWave.interesting,
        });
        pts.splice(pts.indexOf(anchor), 1);
        pts.unshift(anchor);
      }
    }
    return pts;
  }, [all, cursor, selected, tz, merchant.id, hotMembers]); // eslint-disable-line react-hooks/exhaustive-deps

  const crowds = hotList.filter((c) => c.w.leave > now);
  const cursorLabel = `${dayLabel(cursor, true)} ${clock(cursor, tz)}`;
  const cursorPct = pct(cursor);

  // One crowd in the list: the soonest six show, the rest fold. Round figures, no percentages.
  const row = (it: Crowd) => {
    const isSel = selected === it.id;
    const onMap = ON_MAP.has(it.kind);
    return (
      <li key={it.id} className={isSel ? "tone" : undefined}>
        <button type="button" className="tm-item t-body" onClick={() => selectCrowd(it.id)} aria-pressed={isSel}>
          <span className="mono">{dayLabel(it.w.start, true)} {clock(it.w.start, tz)}</span> · <b>{it.headliner}</b> ·{" "}
          {onMap ? <>{it.venue}, <span className="mono">{it.distanceKm.toFixed(1)}&nbsp;km</span></> : (it.blurb ?? it.venue)}
        </button>
        <p className="t-body mt-1 text-[var(--muted)]">
          About <span className="mono">{(Math.round(it.capacity / 100) * 100).toLocaleString("en-US")}</span> people, could bring about {it.guests} guests
          {it.guests >= merchant.seats ? `, enough to fill your ${merchant.seats} seats` : it.guests * 2 >= merchant.seats ? ", enough for half your seats" : ", enough for a few tables"}.
          {isSel && it.weather ? ` Weather at your door: ${it.weather.label}.` : ""}{" "}
          <Link href={`/campaigns/new?merchant=${merchant.id}&event=${it.id}`} className="link">See who is coming</Link>
        </p>
      </li>
    );
  };

  return (
    <div ref={rootRef} className={`tm-root${full ? " is-full" : ""}`}>
      <div className="tm-maparea">
        <button type="button" className="tm-fs" onClick={toggleFull} aria-label={full ? "Exit full screen" : "Full screen"} title={full ? "Exit full screen" : "Full screen"}>
          {full ? "Exit full screen" : "Full screen"}
        </button>
        <RadarMap merchant={{ name: merchant.name, lat: merchant.lat, lon: merchant.lon, radiusM: radius }} points={points} onSelect={(id) => selectCrowd(id)} onRadiusChange={changeRadius} />
        <p className="tm-maphint">{saving ? "Updating your radius…" : <>Drag the white handle to change your radius&nbsp;· <span className="tm-mono">{fmtKm(radius)}, {walkMin(radius)}&nbsp;min</span> walk</>}</p>
      </div>

      <button type="button" className="link tm-fold" aria-expanded={hourly} onClick={() => setHourly((v) => !v)}>
        Hour by hour
      </button>

      {timelineOpen && (
        <section className="tm-tl" aria-label="Crowds over the next hours">
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
                {days.map((d, i) => (
                  <span key={`d${i}`} className={`tm-day${i % 2 ? " alt" : ""}`} style={{ left: `${d.left}%`, width: `${d.right - d.left}%` }}>
                    {d.right - d.left > 5 && <b>{dayLabel(d.start + 1)}</b>}
                  </span>
                ))}
                {ticks.map((t, i) => (
                  <span key={`t${i}`}>
                    <span className="tm-tick" style={{ left: `${t.left}%` }}>
                      {t.label}
                    </span>
                  </span>
                ))}
              </div>
              <svg className="tm-curve" viewBox={`0 0 ${Math.max(1, columns.n)} 100`} preserveAspectRatio="none" aria-hidden="true">
                {columns.out.map((c) => (
                  <g key={c.i}>
                    <rect x={c.i + 0.08} y={100 - c.o} width={0.84} height={c.o} style={{ fill: "var(--line-strong)" }} />
                    <rect x={c.i + 0.08} y={100 - c.o - c.h} width={0.84} height={c.h} style={{ fill: "var(--accent)" }} />
                  </g>
                ))}
              </svg>
              {markers.map(({ c, lane, size }) => (
                <button
                  key={c.id}
                  type="button"
                  tabIndex={lane >= 0 ? undefined : -1}
                  data-id={c.id}
                  className={`tm-ev${isTonight(c) ? " hot" : isHot(c) ? " later" : ""}${c.kind !== "venue" ? " moment" : ""}${selected === c.id || (selWave?.members.includes(c.id) ?? false) ? " sel" : ""}${lane >= 0 ? " lbl" : ""}${edge.left.has(c.id) ? " left" : ""}`}
                  style={{ left: `${pct(c.w.start)}%`, top: lane >= 0 ? 118 + lane * 24 : 196, ["--s" as string]: `${size}px` }}
                  title={`${c.headliner} · ${c.kind === "venue" ? c.venue : (c.blurb ?? c.venue)} · ${clock(c.w.start, tz)} · ~${c.capacity.toLocaleString("en-US")} people · could bring ~${c.guests} guests`}
                  onClick={() => selectCrowd(c.id)}
                  onFocus={(e) => {
                    // A flipped label can stay in view while its dot and focus ring sit past the scroller edge; Chrome will not scroll then.
                    const dot = e.currentTarget.querySelector("i");
                    const sc = scrollRef.current;
                    if (!dot || !sc) return;
                    const d = dot.getBoundingClientRect(), s = sc.getBoundingClientRect();
                    if (d.left < s.left + 8 || d.right > s.right - 8) dot.scrollIntoView({ block: "nearest", inline: "center" });
                  }}
                >
                  <i aria-hidden="true" />
                  {lane >= 0 && <span>{c.short}</span>}
                </button>
              ))}
              <span className="tm-now" style={{ left: `${pct(now)}%` }} aria-hidden="true">
                <i>Now</i>
              </span>
              <span className={`tm-cursor${edge.cursor ? " flip" : ""}`} style={{ left: `${cursorPct}%` }} aria-hidden="true">
                <i>{cursorLabel} · {cursorPeople > 0 ? <>{cursorPeople.toLocaleString("en-US")} <span className="tm-wide">people </span>around</> : "quiet"}</i>
              </span>
            </div>
          </div>
        </section>
      )}

      <section className="tm-list stack-block" aria-labelledby="tm-crowds-head">
        <h2 id="tm-crowds-head" className="t-title">Crowds worth a campaign</h2>
        {crowds.length === 0 ? (
          <p className="t-body text-[var(--muted)]">Nothing big enough for your {merchant.seats} seats in the next three days. Hour by hour still shows the smaller events.</p>
        ) : (
          <>
            <ul className="tm-crowds">{crowds.slice(0, 6).map(row)}</ul>
            {crowds.length > 6 && (
              <details className="mt-5">
                <summary className="link">All {crowds.length} crowds</summary>
                <ul className="tm-crowds mt-5">{crowds.slice(6).map(row)}</ul>
              </details>
            )}
          </>
        )}
      </section>
    </div>
  );
}
