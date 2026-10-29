import { SourceWatch } from "@/components/SourceWatch";
import Link from "next/link";
import { cookies } from "next/headers";
import { getMerchant, listMerchants } from "@/server/events/radar";
import { getDna } from "@/server/merchants/dna";
import { getOffers } from "@/server/qloo/crowd";
import { weatherWindow } from "@/server/weather/openmeteo";
import { workspaceAgenda } from "@/server/workspace/agenda";
import { workspaceCampaigns } from "@/server/workspace/campaigns";
import { proposeAheadCampaign, proposeImmediateCampaign } from "@/server/workspace/proposal";
import { opportunitySources } from "@/server/workspace/opportunity-sources";
import { evergreenProposals } from "@/server/workspace/evergreen-proposals";
import { rhythmProposals, weatherProposal, menuEvidenceProposals } from "@/server/workspace/context-proposals";
import { localTimeToInstant } from "@/lib/campaign-plan";
import { signalProposals } from "@/server/workspace/signal-proposals";
import { TodayOpportunity } from "@/components/TodayOpportunity";
import { campaignChannelAffinities } from "@/server/workspace/channel-affinity";
import { marketingIntelligence } from "@/server/workspace/marketing-intelligence";
import { intelligenceProposals } from "@/server/workspace/intelligence-proposals";
import { dailyQloo } from "@/server/workspace/daily-qloo";
import { matchOffer, potentialFor, type PotentialContext } from "@/lib/daily-potential";
import { WorkspaceContext } from "@/components/WorkspaceContext";
import { WeekAgenda } from "@/components/WeekAgenda";
import { Icon } from "@/components/Icon";
import { DemoCampaignHistory } from "@/components/DemoCampaignHistory";
export const dynamic = "force-dynamic";
export default async function TodayPage({ searchParams }: { searchParams: Promise<{ merchant?: string; refresh?: string }> }) {
  const sp = await searchParams; const merchants = listMerchants();
  const m = getMerchant(sp.merchant ?? (await cookies()).get("merchant")?.value ?? "m_penn_pour") ?? merchants[0];
  if (!m) return <main className="app-page"><h1>Welcome to Turnout</h1><Link className="action-button" href="/start">Set up your place</Link></main>;
  const [agenda, weather, snapshot, sources] = await Promise.all([workspaceAgenda(m, sp.refresh === "1"), weatherWindow(m.lat, m.lon, new Date().toISOString(), new Date(Date.now()+6*3600000).toISOString(), m.timezone).catch(() => undefined), dailyQloo(m), opportunitySources(m)]);
  const dna = getDna(m.id); const offers = getOffers(m.id); const offer = offers.find(o => o.id === dna.profile.signatureOfferId);
  const evidence = offers.filter(o=>o.price?.trim()).map(o=>matchOffer(o,snapshot));
  const intelligence = await marketingIntelligence({merchant:m,snapshot,evidence,offers,dna,now:agenda.now});
  const channelAffinities = await campaignChannelAffinities(intelligence.audiences,evidence);
  const opportunities = signalProposals(sources.signals,dna,offers,evidence,m.timezone,agenda.now);
  const context: PotentialContext = {timezone:m.timezone,now:agenda.now,dna,moments:agenda.moments,events:agenda.entries.filter(e=>e.kind==="event").map(e=>({title:e.title,date:e.date,time:e.sortTime}))};
  const proposals = Object.fromEntries(offers.flatMap(o=>{const p=proposeAheadCampaign(dna,offers,m.timezone,agenda.moments,agenda.now,o.id);return p?[[o.id,p]]:[];}));
  const immediateProposals = Object.fromEntries(offers.flatMap(o=>{const p=proposeImmediateCampaign(dna,offers,m.timezone,agenda.now,o.id);return p?[[o.id,p]]:[];}));
  const ranked = evidence.filter(o=>proposals[o.offerId]).map(o=>({id:o.offerId,score:potentialFor(o,snapshot,context,proposals[o.offerId].slots[0].startLocal,proposals[o.offerId].slots[0].endLocal).score})).sort((a,b)=>(b.score??-1)-(a.score??-1)||Number(b.id===dna.profile.signatureOfferId)-Number(a.id===dna.profile.signatureOfferId));
  const initialOfferId = ranked[0]?.score != null ? ranked[0].id : dna.profile.signatureOfferId;
  const localContext={dna,offers,evidence,timezone:m.timezone,now:agenda.now,placeName:m.name};
  opportunities.push(...rhythmProposals(localContext,agenda.moments,snapshot));
  const weatherPlan=ranked.filter(r=>r.score!==null).map(r=>proposals[r.id]).find(p=>localTimeToInstant(p.slots[0].startLocal,m.timezone)<=agenda.now+24*3600000);
  const immediatePlan=evidence.filter(e=>immediateProposals[e.offerId]).map(e=>({proposal:immediateProposals[e.offerId],score:potentialFor(e,snapshot,context,immediateProposals[e.offerId].slots[0].startLocal,immediateProposals[e.offerId].slots[0].endLocal).score})).sort((a,b)=>(b.score??-1)-(a.score??-1))[0]?.proposal;
  const weatherPlans=[weatherPlan,immediatePlan].filter((p):p is NonNullable<typeof p>=>!!p).filter((p,i,all)=>all.findIndex(other=>other.offerId===p.offerId&&other.slots[0].startLocal===p.slots[0].startLocal)===i);
  const weatherIdeas=await Promise.all(weatherPlans.map(async plan=>{
    const slot=plan.slots[0];
    const exactForecast=await weatherWindow(m.lat,m.lon,new Date(localTimeToInstant(slot.startLocal,m.timezone)).toISOString(),new Date(localTimeToInstant(slot.endLocal,m.timezone)).toISOString(),m.timezone).catch(()=>undefined);
    return weatherProposal(localContext,plan,exactForecast,new Date().toISOString());
  }));
  for(const idea of weatherIdeas)if(idea)opportunities.push(idea);
  opportunities.push(...menuEvidenceProposals(localContext,proposals,snapshot,initialOfferId,opportunities));
  opportunities.push(...evergreenProposals({...localContext,merchantId:m.id,moments:agenda.moments}));
  opportunities.push(...intelligenceProposals({...localContext,merchantId:m.id,moments:agenda.moments},intelligence));
  const campaigns = workspaceCampaigns(m.id).filter(c => !c.legacy); const q = `?merchant=${m.id}`;
  const firstRhythm = agenda.entries.find(e => e.kind === "rhythm");
  const wet = weather && ["rain", "storm", "snow"].includes(weather.kind);
  const signals = <><SourceWatch observations={sources.observations} coverage={sources.coverage} offers={offers} merchantId={m.id} timezone={m.timezone}/><section className="daily-signals"><div className="section-title"><h2>The little things that matter</h2></div><p className="section-intro">A change in the weather. A habit on your street. A reason to say hello.</p>
        <div className="signal-grid"><article className="signal-card signal-weather"><span className="icon-tile"><Icon name={wet ? "rain" : "sun"} size={24}/></span><span className="overline">The next 6 hours</span><h3>{weather?.label ?? "Weather unavailable"}</h3><p>{weather ? wet ? "Give people a reason to come inside. Put an indoor offer in your next message." : "Make your signature offer the reason to stop by. Check what you can serve before sharing." : "We couldn’t check the local forecast. Your saved offers are still ready to use."}</p>{weather && <Link className="text-link" href={`/campaigns/from-photo${q}${offer ? `&offer=${encodeURIComponent(offer.id)}` : ""}`}>Prepare a message <Icon name="arrow" size={16}/></Link>}<small>Open-Meteo · hourly forecast</small></article>
        <article className="signal-card signal-street"><span className="icon-tile"><Icon name="coffee" size={24}/></span><span className="overline">Around your place</span><h3>{firstRhythm?.title ?? "Get to know your street"}</h3><p>{firstRhythm ? `${firstRhythm.time} · A recurring pattern in nearby places. Adapt your offer to this moment.` : "Explore the tastes and habits of the neighbourhood, even when there is no big event."}</p><Link className="text-link" href={firstRhythm?.href ?? `/pulse${q}`}>{firstRhythm ? "Prepare for this moment" : "Explore local tastes"}<Icon name="arrow" size={16}/></Link><details><summary>What tells us this?</summary><p>{firstRhythm?.evidence ?? "Qloo describes nearby places and group preferences. It does not measure who is outside your door."}</p></details><small>Qloo · inferred local habits, not live footfall</small></article></div>
      </section></>;
  const aside = <><WeekAgenda now={agenda.now} timezone={m.timezone} entries={agenda.entries} merchantId={m.id} unavailable={agenda.unavailable}/><Link className="photo-shortcut" href={`/campaigns/from-photo${q}`}><span className="icon-tile"><Icon name="camera" size={24}/></span><span><strong>Something new on the board?</strong><small>Take a photo. Turn it into a campaign.</small></span><Icon name="arrow"/></Link></>;
  return <main className="app-page today-page"><WorkspaceContext merchant={m} merchants={merchants} destination="/today" />
    <header className="page-heading"><div><h1>Your next campaign</h1><p className="today-assistant-note">Ready-made content. Your channels. Your call. <Link href="/about" className="assistant-how-link">How it works <Icon name="arrow" size={12}/></Link></p></div><span className="date-stamp"><Icon name="calendar" />{new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: m.timezone }).format(agenda.now)}</span></header>
    {proposals[initialOfferId] ? <TodayOpportunity channelAffinities={channelAffinities} key={m.id} merchantId={m.id} merchantName={m.name} offers={offers} proposals={proposals} immediateProposals={immediateProposals} initialOfferId={initialOfferId} snapshot={snapshot} evidence={evidence} context={context} opportunities={opportunities} coverage={[...sources.coverage,...Object.entries(intelligence.sources).map(([name,s])=>({name:`Qloo ${name}`,url:"https://docs.qloo.com/reference/api-overview",state:s.status==="unavailable"?"unavailable" as const:"available" as const,checkedAt:s.retrievedAt,detail:s.detail}))]} signals={signals} aside={aside}/> : <div className="home-grid"><div className="home-main"><section className="next-move"><h2>A few essentials, then your campaign.</h2><p>Confirm your place DNA and a priced signature offer to compare your menu with local tastes.</p><Link className="action-button" href={`/dna${q}`}>Review place DNA <Icon name="arrow" size={17}/></Link></section>{signals}</div><aside className="home-aside">{aside}</aside></div>}
    {m.id==="m_penn_pour"&&<details className="today-more"><summary><Icon name="campaign" size={18}/><span>Past campaigns<small>Demo history & performance</small></span><Icon name="chevron" size={16}/></summary><div><DemoCampaignHistory merchantId={m.id} compact/></div></details>}
    <section className="recent-section"><div className="section-title"><h2><Icon name="campaign"/>Pick up where you left off</h2><Link className="text-link" href={`/campaigns${q}`}>All campaigns <Icon name="arrow" size={16}/></Link></div>{campaigns.length ? <div className="recent-list">{campaigns.slice(0,3).map(c => <Link href={c.href} className="recent-item" key={c.id}><span className="icon-tile"><Icon name={c.kind === "menu" ? "menu" : "ticket"}/></span><span><strong>{c.title}</strong><small>{c.status}</small></span><Icon name="chevron" size={18}/></Link>)}</div> : <p className="muted">Your saved drafts will appear here. Start with the offer above.</p>}</section>
  </main>;
}
