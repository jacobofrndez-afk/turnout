type Offer = {title:string;description?:string|null};
export function servicePeriod(offer:Offer): "brunch"|"late"|"game"|"breakfast"|"coffee"|"lunch"|"afternoon"|"any" {
  const text=`${offer.title} ${offer.description??""}`;
  if(/game night|big screen|screening|sports/i.test(text))return "game";
  if(/after.show|midnight|late plate|late.night/i.test(text))return "late";
  if(/brunch|eggs benedict/i.test(text))return "brunch";
  if(/breakfast|petit.d[eé]jeuner|pancakes/i.test(text))return "breakfast";
  if(/lunch|d[eé]jeuner|midday/i.test(text))return "lunch";
  if(/afternoon tea|afternoon break|go[uû]ter/i.test(text))return "afternoon";
  if(/coffee|espresso|cappuccino|croissant|pastr(?:y|ies)|tea and cake/i.test(text)&&!/beer|wine|cocktail|lager|stout/i.test(text))return "coffee";
  return "any";
}
/** Suggested service periods, not connected opening hours. Explicit menu hours still take precedence. */
export function serviceWindowHint(offer:Offer) {
  const p=servicePeriod(offer);
  return p==="breakfast"?{from:"08:00",to:"11:00",label:"A morning invitation"}:p==="coffee"?{from:"08:00",to:"18:00",label:"A coffee break"}:p==="lunch"?{from:"12:00",to:"14:00",label:"A lunch invitation"}:p==="afternoon"?{from:"14:00",to:"17:00",label:"An afternoon pause"}:p==="brunch"?{from:"11:00",to:"14:00",label:"A brunch invitation"}:p==="late"?{from:"22:00",to:"01:00",label:"A late bite"}:{from:"17:00",to:"22:00",label:"A neighbourhood evening"};
}
export function fitsServiceTime(offer:Offer,hour:string) {
  const period=servicePeriod(offer),window=serviceWindowHint(offer);
  return period==="game"?false:period==="any"?true:period==="late"?hour>="21:00":period==="brunch"?hour>="10:00"&&hour<"14:00":hour>=window.from&&hour<window.to;
}
export function fitsRhythm(offer:Offer,rhythm:string) {
  const period=servicePeriod(offer),text=`${offer.title} ${offer.description??""}`;
  if(period==="game")return false;
  if(rhythm==="morning_coffee")return period==="breakfast"||period==="coffee";
  if(rhythm==="lunch_break")return period==="lunch"||(period==="any"&&/sandwich|salad|soup|quiche|bowl/i.test(text));
  if(rhythm==="afternoon_break")return period==="coffee"||period==="afternoon";
  if(rhythm==="dinner")return period==="any"&&/board|sharing|plate|dinner|steak|pasta|pizza|burger|wine|vin|charcuterie/i.test(text);
  if(rhythm==="date_night")return period==="any"&&/for two|sharing|board|wine|cocktail|mocktail|vin|plateau/i.test(text);
  if(rhythm==="weekend_stroll")return period==="coffee"||period==="afternoon"||(period==="any"&&/flight|tasting|board|sharing|wine|ice cream|dessert/i.test(text));
  return rhythm==="brunch"?period==="brunch":rhythm==="late_night"?period==="late":rhythm==="afterwork"&&period==="any";
}
export function nextLocalDay(day:string) {return new Date(Date.parse(`${day}T12:00Z`)+86400000).toISOString().slice(0,10);}
