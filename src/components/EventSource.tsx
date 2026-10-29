import { sourceCheck, sourceUrl } from "@/lib/event-evidence";

type SourceEvent = { origin?: string | null; url?: string | null; meta?: Record<string, unknown>; meta_json?: string | null };

export function EventSource({ event, timezone }: { event: SourceEvent; timezone: string }) {
  let meta = event.meta;
  if (!meta && event.meta_json) { try { meta = JSON.parse(event.meta_json); } catch { /* Unknown provenance stays unknown. */ } }
  const check = sourceCheck(meta);
  const url = sourceUrl(event.url);
  const checked = check ? new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(check.checkedAt)) : undefined;
  const derived = event.origin && event.origin !== "ticketmaster";
  return (
    <p className="event-source t-small">
      {derived ? (event.origin === "wave" ? "Modelled crowd from several scheduled events. Arrival times and attendance are estimates." : event.origin === "tv" ? "Game schedule: ESPN. Nearby viewers and crowd size are estimates." : event.origin === "street" ? `Schedule: ${String(meta?.source ?? "city open data")}. Crowd size is an estimate.` : "Calendar assumption, not a sourced local event.") : <>
        {url ? <a href={url} target="_blank" rel="noreferrer" className="link">Source listing ↗</a> : "Source listing"} · Ticketmaster
        {checked ? <> · Checked {checked}{check?.mode === "stored" ? " · saved source record" : check?.mode === "cache" ? " · cached response" : ""}</> : " · current schedule not yet verified"}
      </>}
    </p>
  );
}
