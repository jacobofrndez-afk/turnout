import { localTimeToInstant } from "@/lib/campaign-plan";
import { servicePeriod } from "@/lib/offer-service";
import type { DnaRecord, MenuOffer } from "@/lib/place-dna";
import type { OfferEvidence } from "@/lib/daily-potential";
import type { SourcedOpportunity } from "@/lib/sourced-opportunity";
import type { RhythmMoment } from "@/server/qloo/rhythm";
import { proposeCampaign } from "./proposal";

type Context={merchantId:string;placeName:string;dna:DnaRecord;offers:MenuOffer[];evidence:OfferEvidence[];timezone:string;now:number;moments:RhythmMoment[]};
/** Reusable campaign angles; each launch still gets a valid service window and owner review. */
export function evergreenProposals(context:Context):SourcedOpportunity[]{
 const {merchantId,placeName,dna,offers,evidence,timezone,now,moments}=context;
 if(dna.status==="suggested")return [];
 const available=offers.filter(o=>o.price?.trim()&&servicePeriod(o)!=="game");
 const points=(id:string)=>{const e=evidence.find(e=>e.offerId===id);return (e?.matchingTastes.length?30:0)+Math.min(e?.matchingPlaces.length??0,5)*4;};
 const ranked=[...available].sort((a,b)=>points(b.id)-points(a.id));
 const signature=available.find(o=>o.id===dna.profile.signatureOfferId)??ranked[0];
 if(!signature)return [];
 const refined=dna.profile.voice==="refined";
 const recipes=[
  {id:"signature",title:"Meet your next favourite",label:"Signature discovery",offer:signature,opening:refined?"A signature worth taking a moment for.":"First time here? Start with something we love.",purpose:"Introduce a real signature offer to people discovering your place."},
  {id:"discovery",title:"Something different, same good place",label:"Menu discovery",offer:ranked.find(o=>o.id!==signature.id),opening:refined?"A different choice. The same familiar welcome.":"Know your usual? Try a new favourite next time.",purpose:"Give another menu offer a turn, using local taste matches where they exist."},
  {id:"regulars",title:"A reason to come back",label:"Welcome back",offer:signature,opening:refined?"A familiar place. A little time to yourself again.":"Been a little while? Make your next stop a familiar one.",purpose:"Invite returning guests without inventing loyalty points, discounts or a customer list."},
  {id:"together",title:"Better with someone you like",label:"Bring someone",offer:ranked.find(o=>/for two|sharing|board|plateau|partager/i.test(`${o.title} ${o.description??""}`)),opening:refined?"Something to share. Someone to share it with.":"Bring someone you like. We’ve got something worth sharing.",purpose:"Use an actual sharing offer; no group deal or extra service is invented."},
  {id:"makers",title:"A little taste of local",label:"Local makers",offer:ranked.find(o=>/\blocal\b|brooklyn|queens/i.test(`${o.title} ${o.description??""}`)),opening:refined?"Local character, a little closer to home.":"A taste of the neighbourhood. Find it right here.",purpose:"Tell the local story already present in your menu description, without inventing suppliers."},
 ];
 return recipes.flatMap(recipe=>{
  const offer=recipe.offer;if(!offer)return [];
  const base=proposeCampaign(dna,offers,timezone,moments,now,offer.id);if(!base)return [];
  const slot=base.slots[0],match=evidence.find(e=>e.offerId===offer.id);
  const qloo=match?.matchingTastes.length?`Qloo’s neighbourhood profile includes ${match.matchingTastes.map(t=>t.name).join(", ")}, matching this offer.`:match?.matchingPlaces.length?`${match.matchingPlaces.length} nearby Qloo references carry this offer’s menu tags.`:"This is a menu-led campaign. No matching Qloo evidence is available for this offer.";
  return [{id:`evergreen-${recipe.id}-${offer.id}`,title:recipe.title,fit:recipe.purpose,signal:{id:`evergreen-${recipe.id}`,title:`Evergreen · ${recipe.label}`,scope:"local" as const,category:"evergreen" as const,startAt:localTimeToInstant(slot.startLocal,timezone),endAt:localTimeToInstant(slot.endLocal,timezone),location:placeName,timeBasis:"menu" as const,source:{id:"place-dna",name:"Your menu & place DNA",url:`/dna?merchant=${merchantId}`,checkedAt:new Date(now).toISOString(),mode:"reference" as const},caution:"A reusable campaign, independent of events. This launch uses the suggested service window; check hours and stock. Nothing is recurring or automatically published."},proposal:{...base,slots:[slot],messages:{...base.messages,[offer.id]:`${recipe.opening}\n${offer.title} · ${offer.price}.\n${recipe.id==="makers"?offer.description??dna.profile.exampleLine:dna.profile.exampleLine}`}},why:[{label:"The purpose",text:recipe.purpose},{label:"Your place, your offer",text:`${offer.title} at ${offer.price}, using your saved voice and menu. ${dna.profile.boundaries}`},{label:"What Qloo adds",text:qloo},{label:"Use it again",text:"Reuse the idea whenever it suits your business. Choose and review the timing for each launch; this is not an always-on ad or a recurring schedule."}]}];
 });
}
