/** Read only explicit clock ranges in the saved offer. Unknown hours stay unknown. */
export function offerWindow(description:string|null|undefined):{from:string;to:string}|undefined {
  const text=description??"";
  const clock=(h:number,m:number,period?:string)=>{if(m>59||h>23||h<0||(period&&(h<1||h>12)))return undefined;return period?(h%12)+(period.toLowerCase()==="pm"?12:0):h;};
  const range=text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|[–-])\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i) ?? text.match(/\b(\d{1,2}):(\d{2})\s*()\s*(?:to|[–-])\s*(\d{1,2}):(\d{2})\s*()/i);
  if(!range)return undefined;
  const from=clock(Number(range[1]),Number(range[2]??0),range[3]||range[6]),to=clock(Number(range[4]),Number(range[5]??0),range[6]);
  if(from===undefined||to===undefined)return undefined;
  const format=(h:number,m:string|undefined)=>`${String(h).padStart(2,"0")}:${m??"00"}`;
  const result={from:format(from,range[2]),to:format(to,range[5])};
  // Never guess the earlier meridiem for an ambiguous overnight range.
  return result.to<=result.from?undefined:result;
}
export function assertOfferWindow(description:string|null|undefined,startLocal:string,endLocal:string) {
  const range=offerWindow(description);if(!range)return;
  if(startLocal.slice(0,10)!==endLocal.slice(0,10)||startLocal.slice(11)<range.from||endLocal.slice(11)>range.to)throw new Error(`This offer’s saved serving window is ${range.from}–${range.to}. Choose a time within it.`);
}
