"use client";
import { useState } from "react";
import Link from "next/link";
import { Icon } from "./Icon";
import { calendarDays, localDateKey } from "@/lib/calendar";
import { localTimeToInstant } from "@/lib/campaign-plan";
import { EventPotential } from "./EventPotential";
import type { EventPotential as Potential } from "@/lib/event-potential";
export type AgendaEntry = { id: string; title: string; detail: string; date: string; time: string; sortTime: string; kind: "event" | "rhythm" | "draft"; href: string; source: string; evidence?: string; potential?: Potential };
const KINDS = [["event", "Events"], ["rhythm", "Local rhythms"], ["draft", "Your plans"]] as const;
export function WeekAgenda({ now, timezone, entries, merchantId, full = false, unavailable = false, initialDate, initialFilter = "all" }: { now: number; timezone: string; entries: AgendaEntry[]; merchantId: string; full?: boolean; unavailable?: boolean; initialDate?: string; initialFilter?: "all" | "draft" }) {
  const today=localDateKey(now,timezone);
  const [anchor,setAnchor]=useState(()=>{
    if(full && initialDate && !calendarDays(now,timezone).some(d=>d.key===initialDate)) {
      try {return localTimeToInstant(`${initialDate}T12:00`,timezone);} catch {return now;}
    }
    return now;
  });
  const days = calendarDays(anchor, timezone);
  const [selection, setSelected] = useState(days.some(d => d.key === initialDate) ? initialDate! : days[0].key);
  const selected = days.some(d => d.key === selection) ? selection : days[0].key;
  const [filter, setFilter] = useState<"all" | AgendaEntry["kind"]>(initialFilter);
  const [order,setOrder] = useState<"time" | "potential">("time");
  const [assessments,setAssessments] = useState<Record<string,Potential>>({});
  const [limit, setLimit] = useState(full ? 8 : 3);
  const chosen = days.find(d => d.key === selected)!;
  const visible = entries.filter(e => e.date === selected && (filter === "all" || e.kind === filter));
  if(full && order === "potential") visible.sort((a,b) => ((assessments[`${merchantId}:${b.id}`] ?? b.potential)?.score ?? -1) - ((assessments[`${merchantId}:${a.id}`] ?? a.potential)?.score ?? -1) || a.sortTime.localeCompare(b.sortTime));
  if(!full) visible.sort((a,b)=>Number(b.kind==="draft")-Number(a.kind==="draft"));
  // The month follows the chosen day, not the week anchor: jumping to 2 November must not leave "October" on the title.
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${selected}T12:00:00Z`));
  return <section className={`week-agenda surface ${full ? "calendar-full" : ""}`} aria-label="Seven-day calendar">
    <div className="section-title calendar-title"><h2><Icon name="calendar" />{full ? month : "Your next 7 days"}</h2>{full ? <div className="calendar-date-jump"><label>Go to date<input type="date" value={selected} onInput={e=>{if(!e.currentTarget.value)return;try{setAnchor(localTimeToInstant(`${e.currentTarget.value}T12:00`,timezone));setSelected(e.currentTarget.value);setLimit(8);}catch{}}}/></label><button className="text-link" onClick={()=>{setAnchor(now);setSelected(today);setLimit(8);}}>This week</button></div> : <Link href={`/calendar?merchant=${merchantId}&date=${selected}`} className="text-link">Open calendar <Icon name="arrow" size={16} /></Link>}</div>
    {full && !calendarDays(now,timezone).some(d=>d.key===days[0].key) && <p className="calendar-note">Your saved plans are shown here. Nearby event listings and local habits currently cover the next seven days.</p>}
    <div className="week-days" role="group" aria-label="Choose a day">{days.map((day) => {
      const kinds = [...new Set(entries.filter(e => e.date === day.key).map(e => e.kind))];
      return <button type="button" key={day.key} aria-pressed={selected === day.key} aria-label={`${day.label}${day.key === today ? ", today" : ""}`} onClick={() => { setSelected(day.key); setLimit(full ? 8 : 3); }}><span>{day.short}</span><strong>{day.number}</strong><span className="day-dots">{kinds.length ? kinds.map(kind => <i key={kind} className={`dot dot-${kind}`} />) : <i className="dot dot-empty" />}</span></button>;
    })}</div>
    {full ? <div className="filter-tabs" role="group" aria-label="Calendar items">{[["all", "All"] as const, ...KINDS].map(([id, label]) => <button key={id} aria-pressed={filter === id} onClick={() => { setFilter(id); setLimit(8); }}>{id !== "all" && <i className={`dot dot-${id}`} />}{label}</button>)}</div>
      : <div className="calendar-legend">{KINDS.map(([id, label]) => <span key={id}><i className={`dot dot-${id}`} />{label}</span>)}</div>}
    <div className="calendar-day-title"><h3>{selected === localDateKey(now, timezone) ? "Today" : chosen.short}, {chosen.label.split(", ").pop()?.replace(/^\w+ /, "")}<span>{visible.length} {visible.length === 1 ? "item" : "items"}</span></h3>{full && visible.some(item => item.kind === "event") && <label className="calendar-potential-order">Sort by<select value={order} onChange={e => setOrder(e.target.value as "time" | "potential")}><option value="time">Event time</option><option value="potential">Highest campaign potential</option></select></label>}</div>
    {unavailable && <p className="notice">Event listings are unavailable. Your menu and drafts are still accessible.</p>}
    <div aria-live="polite" aria-atomic="false"><ul className="calendar-items">{visible.slice(0, limit).map(item => <li key={item.id} className={`calendar-item kind-${item.kind}`}><div className="item-time">{item.time}<span>{item.kind === "rhythm" ? "Local habit" : item.kind === "draft" ? "Your plan" : "Event"}</span></div><div className="item-body"><Link href={item.href} prefetch={false}>{item.title}<Icon name="chevron" size={15} /></Link><p>{item.detail}</p>{item.kind === "event" && <EventPotential key={`${merchantId}-${item.id}`} merchantId={merchantId} eventId={item.id} href={item.href} initial={assessments[`${merchantId}:${item.id}`] ?? item.potential} onChecked={potential => setAssessments(previous => ({...previous,[`${merchantId}:${item.id}`]:potential}))} compact={!full}/>}{full && item.kind !== "draft" && <details><summary>{item.kind === "event" ? "Event source & context" : "Why it’s here"}</summary><p>{item.evidence ?? item.source}</p><p className="muted">{item.source}</p></details>}</div></li>)}</ul>
    {!visible.length && <div className="calendar-empty"><Icon name="calendar" size={26} /><p>{filter === "draft" ? "No dated campaign plans here yet." : "No upcoming items returned for this day."}</p><span>Your own menu can still be a reason to visit.</span><Link className="text-link" href={`/campaigns/from-photo?merchant=${merchantId}&date=${selected}`}>Create a menu campaign <Icon name="arrow" size={16} /></Link></div>}</div>
    {visible.length > limit && (full ? <button className="quiet-button calendar-more" onClick={() => setLimit(n => n + 8)}>Show more · {visible.length - limit} remaining</button> : <Link href={`/calendar?merchant=${merchantId}&date=${selected}`} className="text-link calendar-more">View all {visible.length} items <Icon name="arrow" size={16} /></Link>)}
    <p className="calendar-note">{timezone.replaceAll("_", " ")} · {!full && visible.some(e=>e.kind==="draft") ? "Your plans first. " : ""}Plans are not scheduled sends.</p>
  </section>;
}
