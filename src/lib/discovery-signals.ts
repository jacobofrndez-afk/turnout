import { distanceKm, FAMILY_OR_SERVICE, type OpportunitySignal, type SignalArea, type SignalSource } from "./opportunity-signals";
import type { MenuOffer } from "./place-dna";
import { localDateKey } from "./calendar";
export type Observation = { id: string; kind: "trend" | "social"; title: string; publishedAt: string; source: SignalSource; offerIds: string[]; explanation: string };
export type Trend = { title: string; publishedAt: string; traffic: string };
const EXCLUDE = /\b(recall|poison|death|died|dead|shoot|war|attack|protest|scandal|fraud|cancer|health|rappel|mort|deces|guerre|attaque|greve|sante|intoxication|enfant|kids|children|school|baby|teen|mineur)\w*/i;
const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
function xmlText(value: string) {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => { const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n); return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ""; }).replace(/&(amp|lt|gt|quot|apos);/g, (_, n: string) => ({amp:"&",lt:"<",gt:">",quot:'"',apos:"'"}[n]!)).replace(/<[^>]*>/g, "").trim();
}
export function parseTrends(xml: string, now: number): Trend[] {
  if (xml.length > 2_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || !/<rss\b/.test(xml)) throw new Error("Invalid RSS");
  const result: Trend[] = [];
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    if (result.length >= 200) break;
    const field = (name: string) => xmlText(match[1].match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`))?.[1] ?? "");
    const title = field("title"), publishedAt = field("pubDate"), when = Date.parse(publishedAt);
    if (!title || title.length > 240 || !Number.isFinite(when) || when > now + 5 * 60000 || when < now - 24 * 3600000) continue;
    result.push({ title, publishedAt: new Date(when).toISOString(), traffic: field("ht:approx_traffic").slice(0, 20) });
  }
  return [...new Map(result.map(t => [normal(t.title), t])).values()];
}
const THEMES = [
  { label: "craft beer", topic: /\b(craft beer|biere artisanale|biere locale|beer festival|fete de la biere)\b/, menu: /\b(beer|biere|brew|brewed|brewing)\b/ },
  { label: "wine", topic: /\b(natural wine|wine tasting|beaujolais nouveau|vin naturel|degustation de vins?)\b/, menu: /\b(wine|vin|vins)\b/ },
  { label: "cocktails", topic: /\b(cocktails?|negroni|spritz|margarita|mojito)\b/, menu: /\b(cocktails?|negroni|spritz|margarita|mojito)\b/ },
  { label: "cheese", topic: /\b(cheese board|cheese tasting|plateau de fromages|degustation de fromages)\b/, menu: /\b(cheese|fromage|fromages|aperitif board)\b/ },
  { label: "coffee", topic: /\b(specialty coffee|iced coffee|cafe de specialite)\b/, menu: /\b(coffee|cafe)\b/ },
];
export function topicMatch(text: string, offers: MenuOffer[]) {
  const clean = normal(text); if (EXCLUDE.test(clean) || FAMILY_OR_SERVICE.test(clean)) return null;
  for (const theme of THEMES) if (theme.topic.test(clean)) {
    const offerIds = offers.filter(o => o.price?.trim() && theme.menu.test(normal(`${o.title} ${o.description ?? ""}`))).map(o => o.id);
    if (offerIds.length) return { label: theme.label, offerIds };
  }
  return null;
}
export function trendObservations(trends: Trend[], offers: MenuOffer[], source: SignalSource, country: string): Observation[] {
  return trends.flatMap(t => {
    const match = topicMatch(t.title, offers); if (!match) return [];
    const url = new URL("https://trends.google.com/trending"); url.searchParams.set("geo", country); url.searchParams.set("q", t.title);
    return [{ id: `trend-${country}-${encodeURIComponent(t.title)}`, kind: "trend" as const, title: t.title, publishedAt: t.publishedAt, source: { ...source, url: url.href }, offerIds: match.offerIds, explanation: `A national search trend about ${match.label}, with a matching priced offer on your menu. This is an angle to test, not measured interest around your place.` }];
  }).slice(0, 6);
}
export function trendSignals(observations: Observation[], now: number): OpportunitySignal[] {
  return observations.filter(o => o.kind === "trend").map(o => ({ id: o.id, title: o.title, scope: "global", category: "trend", startAt: now, endAt: Date.parse(o.publishedAt) + 24 * 3600000, location: "National search interest", timeBasis: "interest", source: o.source, offerIds: o.offerIds, caution: "Recent national Google search interest. No local audience size, visits or sales are inferred. The proposed time comes from your menu and preparation time, not from Google." }));
}
export type OpenAgendaListing = { uid: string; title_fr: string; description_fr?: string; keywords_fr?: string[] | string; timings?: string; location_coordinates?: {lat:number;lon:number}; location_name?: string; canonicalurl?: string; updatedat?: string; originagenda_title?: string };
export function openAgendaSignals(rows: OpenAgendaListing[], area: SignalArea, source: SignalSource, now: number, until: number): OpportunitySignal[] {
  const result: OpportunitySignal[] = [];
  for (const row of rows) {
    if (!row.title_fr || !row.location_coordinates || !row.timings) continue;
    const text = `${row.title_fr} ${row.description_fr ?? ""} ${row.keywords_fr ?? ""}`;
    if (FAMILY_OR_SERVICE.test(text) || EXCLUDE.test(normal(text)) || !/expo|photo|cin[eé]ma|concert|musique|music|jazz|disco|house|th[eé][aâ]tre|lecture|litt[eé]rature|festival/i.test(text)) continue;
    const distance = distanceKm(area, row.location_coordinates); if (!Number.isFinite(distance) || distance > area.radius_m / 1000) continue;
    let url: URL; try { url = new URL(row.canonicalurl ?? ""); if (url.protocol !== "https:" || url.hostname !== "openagenda.com") continue; } catch { continue; }
    let timings: {begin?:string;end?:string}[]; try { timings = JSON.parse(row.timings); if (!Array.isArray(timings)) continue; } catch { continue; }
    for (const t of timings.slice(0, 1000)) {
      if (!t || !t.begin || !t.end || !/(Z|[+-]\d{2}:\d{2})$/.test(t.begin) || !/(Z|[+-]\d{2}:\d{2})$/.test(t.end)) continue;
      const startAt = Date.parse(t.begin), endAt = Date.parse(t.end);
      if (!Number.isFinite(startAt + endAt) || endAt <= now || startAt >= until || endAt <= startAt || endAt - startAt > 14 * 3600000) continue;
      result.push({id:`oa-${row.uid}-${startAt}`,title:row.title_fr,scope:"local",category:"culture",startAt,endAt,location:row.location_name || "Local venue",distanceKm:distance,timeBasis:"published",source:{...source,url:url.href},caution:`Published by ${row.originagenda_title || "an OpenAgenda contributor"}; distributed through the Opendatasoft public catalogue under Licence Ouverte v1.0.${row.updatedat && Number.isFinite(Date.parse(row.updatedat)) ? ` Listing updated ${row.updatedat.slice(0,10)}.` : ""} Confirm the session with its organiser. No attendance is measured.`});
    }
  }
  return [...new Map(result.map(s => [s.id, s])).values()];
}
/** Repeated listings are one occasion, including feeds with conflicting DST offsets. */
export function dedupeSignals(signals: OpportunitySignal[], timezone: string) {
  const chosen: OpportunitySignal[] = [];
  const titleKey = (s: OpportunitySignal) => normal(s.title).replace(/\(?\b(?:18|19|20)\d{2}\s*[-–—]\s*(?:18|19|20)\d{2}\b\)?/g, "").replace(/[^a-z0-9]/g, "");
  for (const signal of [...signals].sort((a,b) => Number(!!a.timeConflict)-Number(!!b.timeConflict))) {
    const duplicate = chosen.some(other => titleKey(other) === titleKey(signal) && localDateKey(other.startAt, timezone) === localDateKey(signal.startAt, timezone) &&
      (normal(other.location) === normal(signal.location) || (other.distanceKm != null && signal.distanceKm != null && Math.abs(other.distanceKm-signal.distanceKm) < 0.15)));
    if (!duplicate) chosen.push(signal);
  }
  return chosen;
}
export function socialObservations(data: unknown, account: {did:string;handle:string;name:string}, offers: MenuOffer[], source: SignalSource, now: number): { observations: Observation[]; recent: number; latestAt: string | null } {
  if (!data || typeof data !== "object" || !Array.isArray((data as {feed:unknown}).feed)) throw new Error("Invalid social feed");
  const observations: Observation[] = []; let recent = 0, latestAt: string | null = null;
  for (const item of (data as {feed:Record<string,unknown>[]}).feed.slice(0, 50)) {
    if (!item || item.reason) continue; // Reposts are not the selected publisher's own statements.
    const post = item.post as {author?:{did?:string};uri?:string;record?:{text?:string;createdAt?:string;reply?:unknown}} | undefined;
    if (post?.author?.did !== account.did || !post.record || post.record.reply || typeof post.record.text !== "string") continue;
    const when = Date.parse(post.record.createdAt ?? ""); if (!Number.isFinite(when) || when > now + 5*60000) continue;
    const date = new Date(when).toISOString(); if (!latestAt || date > latestAt) latestAt = date;
    if (when < now - 7*86400000) continue; recent++;
    const match = topicMatch(post.record.text, offers); if (!match) continue;
    const rkey = post.uri?.match(/^at:\/\/[^/]+\/app\.bsky\.feed\.post\/([a-zA-Z0-9]+)$/)?.[1]; if (!rkey) continue;
    observations.push({id:`social-${account.did}-${rkey}`,kind:"social",title:`${account.name} mentioned ${match.label}`,publishedAt:date,source:{...source,url:`https://bsky.app/profile/${account.did}/post/${rkey}`},offerIds:match.offerIds,explanation:`A recent public post from a publisher you follow matches ${match.label} on your menu. Read the post before using this angle; its location, event time and audience are not established.`});
  }
  return { observations: [...new Map(observations.map(o => [o.id, o])).values()].slice(0, 6), recent, latestAt };
}
