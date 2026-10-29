import { assertOfferWindow, offerWindow } from "@/lib/offer-window";
import { calendarDays } from "@/lib/calendar";
import { servicePeriod, serviceWindowHint, fitsServiceTime, fitsRhythm, nextLocalDay } from "@/lib/offer-service";
import { localStampAt, localTimeToInstant, planWindowLabel, type CampaignPlanProposal, type PlanSlot } from "@/lib/campaign-plan";
import type { DnaRecord, MenuOffer } from "@/lib/place-dna";
import type { RhythmMoment } from "@/server/qloo/rhythm";
/** A transparent menu-led proposal; no invented event, discount, opening hours or footfall. */
export function proposeCampaign(dna: DnaRecord, offers: MenuOffer[], timezone: string, moments: RhythmMoment[], now = Date.now(), preferredOfferId = dna.profile.signatureOfferId): CampaignPlanProposal | undefined {
  const offer = offers.find(o => o.id === preferredOfferId && o.price?.trim());
  if (!offer || dna.status === "suggested") return undefined;
  const earliest = Math.ceil((now + (dna.profile.leadMinutes + 5) * 60000) / 900000) * 900000;
  const days = calendarDays(earliest, timezone);
  const serving = offerWindow(offer.description);
  const fitsMenu=(s:PlanSlot)=>{try{assertOfferWindow(offer.description,s.startLocal,s.endLocal);return true;}catch{return false;}};
  const slots: PlanSlot[] = [];
  const period=servicePeriod(offer),hint=serviceWindowHint(offer);
  const compatible = moments.filter(m => fitsRhythm(offer,m.id));
  for (const day of days) for (const moment of compatible) {
    if (!moment.days.includes(day.weekday)) continue;
    try {
      const start = Math.max(earliest, localTimeToInstant(`${day.key}T${moment.from}`, timezone));
      const momentEnd = localTimeToInstant(`${moment.to<=moment.from?nextLocalDay(day.key):day.key}T${moment.to}`, timezone);
      const closing = offer.description?.match(/until (\d{1,2})(?::(\d{2}))?\s*am/i);
      const closeAt = period==="late" && closing && Number(closing[1])<=6 ? localTimeToInstant(`${nextLocalDay(day.key)}T${String(Number(closing[1])).padStart(2,"0")}:${closing[2]??"00"}`,timezone) : Infinity;
      const end = Math.min(momentEnd,start+2*3600000,closeAt);
      if (end - start < 60 * 60000) continue;
      slots.push({ id: `rhythm-${day.key}-${moment.id}`, label: moment.label, startLocal: localStampAt(start, timezone), endLocal: localStampAt(end, timezone), reason: moment.evidence.join(". "), source: "Qloo neighbourhood descriptions and opening hours. An inferred habit, not measured demand at your door." });
    } catch { /* A clock-change slot is not safe to preselect. */ }
  }
  // Prefer a relevant local habit within one day; otherwise make the evening hypothesis explicit.
  const recommended = slots.filter(fitsMenu).find(s => period!=="any" || localTimeToInstant(s.startLocal, timezone) - now <= 24 * 3600000);
  const evening = days.flatMap(day => {
    try {
    const start = Math.max(earliest, localTimeToInstant(`${day.key}T${serving?.from??hint.from}`, timezone));
    const end = serving ? localTimeToInstant(`${day.key}T${serving.to}`, timezone) : Math.min(start + 2 * 3600000, localTimeToInstant(`${period==="late"?nextLocalDay(day.key):day.key}T${hint.to}`,timezone));
    return [{ start, end, valid: end-start>=30*60000 }];
    } catch { return []; }
  }).find(s => s.valid);
  if(!evening)return undefined;
  const fallback: PlanSlot = { id: "evening", label: serving ? "Your menu’s serving window" : hint.label, startLocal: localStampAt(evening.start, timezone), endLocal: localStampAt(evening.end, timezone), reason: serving ? `The saved offer is served ${serving.from}–${serving.to}. This window leaves preparation time; check stock before sharing.` : "A service window suited to this offer, with enough time to prepare. This is a planning suggestion; your opening hours and stock are not connected.", source: "Your saved offer, voice and preparation time. No live demand forecast is used." };
  const selected = recommended ?? fallback;
  const soon: PlanSlot = { id: "soon", label: "As soon as you’re ready", startLocal: localStampAt(earliest, timezone), endLocal: localStampAt(earliest + 2 * 3600000, timezone), reason: `Allows ${dna.profile.leadMinutes} minutes of preparation, plus a small buffer. Choose this only if you can serve the offer then.`, source: "Your preparation preference. Opening hours and stock need your confirmation." };
  const invitation = dna.profile.voice === "direct" ? "Good company starts here. Make us your next stop." : dna.profile.voice === "refined" ? "Take a moment. Stay a little longer." : "Bring someone you like. We’ll make you feel at home.";
  const messages = Object.fromEntries(offers.filter(o => o.price?.trim()).map(o => [o.id, `${o.id===dna.profile.signatureOfferId ? dna.profile.exampleLine : dna.profile.voice === "direct" ? "Worth a stop. Better with good company." : dna.profile.voice === "refined" ? "A little time together, before the evening unfolds." : "A familiar welcome, something good to share."}\n${o.title} · ${o.price}.${o.description ? `\n${o.description}` : ""}\n${invitation}`]));
  return { offerId: offer.id, messages, budgetUsd: dna.profile.channels.includes("geofenced_ad") ? dna.profile.dailyBudgetUsd : 0, slots: [selected, ...(period==="any" && fitsMenu(soon) && soon.startLocal !== selected.startLocal ? [soon] : []), ...slots.filter(fitsMenu).filter(s => s.id !== selected.id && s.startLocal !== selected.startLocal && s.startLocal !== soon.startLocal).slice(0,1)] };
}


/** An actionable near-term window, never tomorrow's happy hour relabelled as "now". */
export function proposeImmediateCampaign(dna: DnaRecord, offers: MenuOffer[], timezone: string, now: number, offerId: string): CampaignPlanProposal | undefined {
  const offer=offers.find(o=>o.id===offerId&&o.price?.trim());
  if(!offer||dna.status==="suggested")return;
  const start=Math.ceil((now+(dna.profile.leadMinutes+5)*60000)/900000)*900000;
  if(start>now+2*3600000)return;
  const startLocal=localStampAt(start,timezone),day=startLocal.slice(0,10),hour=startLocal.slice(11);
  const period=servicePeriod(offer),serving=offerWindow(offer.description);
  if(!fitsServiceTime(offer,hour))return;
  // Without explicit hours, avoid proposing a generic lunch/evening offer overnight or at breakfast.
  // This is a conservative drafting guard, not a claim about the business opening hours.
  if(period==="any"&&!serving&&(hour<"11:00"||hour>="23:00"))return;
  let end=start+2*3600000;
  try {
    if(serving){if(hour<serving.from||hour>=serving.to)return;end=Math.min(end,localTimeToInstant(`${day}T${serving.to}`,timezone));}
    if(period!=="any"&&period!=="late")end=Math.min(end,localTimeToInstant(`${day}T${serviceWindowHint(offer).to}`,timezone));
    const closing=offer.description?.match(/until (\d{1,2})(?::(\d{2}))?\s*am/i);
    if(period==="late"&&closing&&Number(closing[1])<=6)end=Math.min(end,localTimeToInstant(`${nextLocalDay(day)}T${String(Number(closing[1])).padStart(2,"0")}:${closing[2]??"00"}`,timezone));
    if(end-start<30*60000)return;
    const endLocal=localStampAt(end,timezone);assertOfferWindow(offer.description,startLocal,endLocal);
    const base=proposeCampaign(dna,offers,timezone,[],now,offerId);if(!base)return;
    return {...base,slots:[{id:`now-${offerId}`,label:"As soon as you’re ready",startLocal,endLocal,reason:`A near-term action allowing ${dna.profile.leadMinutes} minutes of preparation. Confirm you are open and can serve this offer; stock and live footfall are not connected.`,source:"Your menu, preparation time and current local clock. No event is assumed."}],messages:{...base.messages,[offerId]:`${dna.profile.voice==="refined"?"A little time together, close to home.":"In the neighbourhood? Make us your next stop."}\n${offer.title} · ${offer.price}.\n${offer.description??dna.profile.exampleLine}`}};
  } catch {return;}
}


/** A future service gets an advance invitation, never the immediate draft with a later date. */
export function proposeAheadCampaign(dna: DnaRecord, offers: MenuOffer[], timezone: string, moments: RhythmMoment[], now: number, offerId: string): CampaignPlanProposal | undefined {
  const offer=offers.find(o=>o.id===offerId&&o.price?.trim());
  if(!offer||servicePeriod(offer)==="game")return;
  const futureSlot=(plan:CampaignPlanProposal|undefined)=>plan?.slots.find(slot=>slot.id!=="soon"&&localTimeToInstant(slot.startLocal,timezone)>now+2*3600000);
  let base=proposeCampaign(dna,offers,timezone,moments,now,offerId);
  let slot=futureSlot(base);
  if(!slot){base=proposeCampaign(dna,offers,timezone,moments,now+2*3600000,offerId);slot=futureSlot(base);}
  if(!base||!slot)return;
  const period=servicePeriod(offer),voice=dna.profile.voice;
  const label=period==="breakfast"?"Plan a better start":period==="coffee"?"Make time for a coffee":period==="lunch"?"A lunch break to look forward to":period==="afternoon"?"Make room for an afternoon pause":period==="brunch"?"Make a date for brunch":period==="late"?"Plan your late-night stop":/happy hour/i.test(offer.title)?"Make plans for happy hour":voice==="refined"?"An evening worth making time for":"Your next neighbourhood get-together";
  const invitation=period==="breakfast"?"Start the day with something good.":period==="coffee"?"Put a little coffee break in your day.":period==="lunch"?"Make your next lunch break a good one.":period==="afternoon"?"An afternoon pause to look forward to.":period==="brunch"?"Make time for brunch. Bring someone you like.":period==="late"?"Making evening plans? Keep a good last bite in mind.":voice==="refined"?"Something to look forward to. Make a little time together.":"Get your people together. Put your next visit in the diary.";
  const when=planWindowLabel(localTimeToInstant(slot.startLocal,timezone),localTimeToInstant(slot.endLocal,timezone),timezone);
  return {...base,slots:[{...slot,label,reason:`Prepare an invitation ahead of this service. ${slot.reason}`}],messages:{...base.messages,[offerId]:`${invitation}\n${offer.title} · ${offer.price}.\n${when}.\n${dna.profile.exampleLine}`}};
}
