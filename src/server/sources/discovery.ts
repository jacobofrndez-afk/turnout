import { calendarDays } from "@/lib/calendar";
import { localTimeToInstant } from "@/lib/campaign-plan";
import { distanceKm, type OpportunitySignal, type SourceCoverage, type SignalSource } from "@/lib/opportunity-signals";
import { openAgendaSignals, parseTrends, socialObservations, trendObservations, trendSignals, type Observation, type OpenAgendaListing } from "@/lib/discovery-signals";
import { sourceSettings } from "./settings";
import { publicFeed } from "./public-feed";
import { getOffers } from "@/server/qloo/crowd";
import type { Merchant } from "@/server/events/radar";
const OPEN_AGENDA = "https://public.opendatasoft.com/explore/dataset/evenements-publics-openagenda/";
export type DiscoveryResult = { signals: OpportunitySignal[]; observations: Observation[]; coverage: SourceCoverage[] };
export async function discoverySources(merchant: Merchant, now: number): Promise<DiscoveryResult> {
  const settings = sourceSettings(merchant.id), offers = getOffers(merchant.id);
  const country = merchant.timezone === "Europe/Paris" ? "FR" : merchant.timezone === "America/New_York" ? "US" : null;
  const days = calendarDays(now, merchant.timezone, 8), until = localTimeToInstant(`${days[7].key}T00:00`, merchant.timezone);
  const results = await Promise.all([
    (async (): Promise<DiscoveryResult> => {
      const name = `Google Trends${country ? ` · ${country === "FR" ? "France" : "United States"}` : ""}`, url = `https://trends.google.com/trending${country ? `?geo=${country}` : ""}`;
      const result: DiscoveryResult = { signals: [], observations: [], coverage: [] };
      if (!settings.trends || !country) { result.coverage.push({name,url,state:settings.trends?"unsupported":"disabled",checkedAt:null,detail:settings.trends?"National trend coverage currently supports France and the United States.":"Paused for this place. Enable in Account → Sources."}); return result; }
      try {
        const response = await publicFeed(new URL(`https://trends.google.com/trending/rss?geo=${country}`), 900, "text");
        const trends = parseTrends(response.data as string, now);
        const source: SignalSource = {id:"google-trends",name,url,checkedAt:response.checkedAt,mode:response.mode};
        result.observations = trendObservations(trends, offers, source, country);
        result.signals = trendSignals(result.observations, now);
        result.coverage.push({name,url,state:"available",checkedAt:source.checkedAt,detail:`${trends.length} recent national search topics checked; ${result.observations.length} match a food or drink theme on your priced menu. Checked on page load; cached for up to 15 minutes. Unrelated news, unsafe topics and trends older than 24 hours are excluded. A match suggests a message angle, never local demand.`});
      } catch { result.coverage.push({name,url,state:"unavailable",checkedAt:null,detail:"The national trend feed could not be read. No trend is inferred from a failed request."}); }
      return result;
    })(),
    (async (): Promise<DiscoveryResult> => {
      const result: DiscoveryResult = {signals:[],observations:[],coverage:[]}, name = "OpenAgenda · public local agendas", url = OPEN_AGENDA;
      if (!settings.openAgenda) { result.coverage.push({name,url,state:"disabled",checkedAt:null,detail:"Paused for this place. Enable in Account → Sources."}); return result; }
      if (distanceKm(merchant,{lat:48.8566,lon:2.3522}) >= 25) { result.coverage.push({name,url,state:"unsupported",checkedAt:null,detail:"This connector currently covers Greater Paris. NYC city permits and Ticketmaster cover the New York demo."}); return result; }
      try {
        const endpoint = new URL("https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/evenements-publics-openagenda/records");
        endpoint.searchParams.set("where",`within_distance(location_coordinates, geom'POINT(${merchant.lon} ${merchant.lat})', ${Math.min(merchant.radius_m,5000)}m) AND lastdate_end >= '${days[0].key}' AND firstdate_begin < '${days[7].key}'`);
        endpoint.searchParams.set("select","uid,title_fr,description_fr,keywords_fr,timings,location_name,location_coordinates,canonicalurl,updatedat,originagenda_title");
        endpoint.searchParams.set("limit","100"); endpoint.searchParams.set("order_by","firstdate_begin ASC");
        const response = await publicFeed(endpoint, 3600);
        const data = response.data as {results:OpenAgendaListing[];total_count:number}; if (!Array.isArray(data.results)) throw new Error("Invalid agenda");
        const source: SignalSource = {id:"openagenda",name,url,checkedAt:response.checkedAt,mode:response.mode};
        result.signals = openAgendaSignals(data.results,merchant,source,now,until);
        result.coverage.push({name,url,state:"available",checkedAt:source.checkedAt,detail:`${result.signals.length} usable cultural sessions within ${(merchant.radius_m/1000).toFixed(1)} km. ${data.total_count > 100 ? "First 100 listings sampled; coverage is partial. " : ""}Individual session times and coordinates are required. Repeated sessions across sources are deduplicated. OpenAgenda via Opendatasoft · Licence Ouverte v1.0; upstream update frequency is not guaranteed. Checked on page load; cached for up to an hour.`});
      } catch { result.coverage.push({name,url,state:"unavailable",checkedAt:null,detail:"The public agenda catalogue could not be read. City sources and menu-led campaigns remain available."}); }
      return result;
    })(),
    (async (): Promise<DiscoveryResult> => {
      const result: DiscoveryResult = {signals:[],observations:[],coverage:[]};
      if (!settings.social || !settings.accounts.length) { result.coverage.push({name:"Bluesky · public publishers",url:"https://bsky.app",state:settings.social?"unsupported":"disabled",checkedAt:null,detail:settings.social?"Choose public organisers or neighbourhood accounts in Account → Sources. No account is followed for this place yet.":"Paused for this place. Your followed accounts are kept."}); return result; }
      const feeds = await Promise.all(settings.accounts.map(async account => {
        const name = `Bluesky · ${account.name}`, url = `https://bsky.app/profile/${account.did}`;
        try {
          const endpoint = new URL("https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed"); endpoint.searchParams.set("actor",account.did);endpoint.searchParams.set("filter","posts_no_replies");endpoint.searchParams.set("limit","50");
          const response = await publicFeed(endpoint,900); const source: SignalSource = {id:`bluesky-${account.did}`,name,url,checkedAt:response.checkedAt,mode:response.mode};
          const parsed = socialObservations(response.data,account,offers,source,now);
          return {observations:parsed.observations,coverage:{name,url,state:"available" as const,checkedAt:source.checkedAt,detail:`${parsed.recent} original posts from the last 7 days in the latest 50 posts; ${parsed.observations.length} menu matches.${parsed.latestAt ? ` Latest original post: ${parsed.latestAt.slice(0,10)}.` : " No original post returned."} Checked on page load; cached for up to 15 minutes. Selected publisher only, not a network-wide trend or local audience measurement.`}};
        } catch { return {observations:[],coverage:{name,url,state:"unavailable" as const,checkedAt:null,detail:"This public publisher could not be checked. Its posts are not used in your suggestions."}}; }
      }));
      for (const feed of feeds) { result.observations.push(...feed.observations); result.coverage.push(feed.coverage); }
      return result;
    })(),
  ]);
  return { signals: results.flatMap(r=>r.signals), observations: results.flatMap(r=>r.observations), coverage: results.flatMap(r=>r.coverage) };
}
