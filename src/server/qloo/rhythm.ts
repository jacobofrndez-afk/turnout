// Recurring local contexts inferred from Qloo place descriptions, tags and hours. No live footfall is measured.
import { qlooGet, type QlooCall, type QlooEntity } from "./api";

type Slot = { opens?: string; closes?: string; closed?: boolean };
type PlaceEntity = QlooEntity & {
  tags?: { id: string; name: string; type?: string }[];
  properties?: Record<string, unknown> & { hours?: Record<string, Slot[]> };
};

export type RhythmMoment = {
  id: "afterwork" | "late_night" | "brunch" | "morning_coffee" | "lunch_break" | "afternoon_break" | "dinner" | "date_night" | "weekend_stroll";
  label: string;
  days: number[]; // 0 = Sunday
  from: string; // local "HH:MM"
  to: string;
  strength: "strong" | "medium";
  evidence: string[]; // human-readable facts, each traceable to Qloo data
  places: { id: string; name: string }[]; // source references, not identified visitors
};

export type StreetRhythm = {
  placesRead: number;
  hospitality: number;
  withHours: number;
  moments: RhythmMoment[];
  passersBy: { label: string; places: number }[]; // who Qloo's descriptions say walks past
  eventHabits: { place: string; text: string }[]; // "pre-show hub", "late-night meals after concerts"
  openByHour: Record<string, number[]>; // weekday -> 24 counts, hospitality places only
};

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOSPITALITY = /genre:place:restaurant|category:place:(bar|pub|cafe|coffee|restaurant|night_?club|wine_bar|brewery)|genre:place:(bar|pub|cafe|night_?club|wine_bar|brewery|cocktail)/;

const rawText = (p: PlaceEntity) =>
  Object.entries(p.properties ?? {})
    .filter(([k, v]) => /description|unique_selling_points/.test(k) && typeof v === "string" && v !== "None")
    .map(([, v]) => v as string)
    .join(" ");
const text = (p: PlaceEntity) => rawText(p).toLowerCase();
const tagHit = (p: PlaceEntity, re: RegExp) => (p.tags ?? []).some((t) => re.test(t.id ?? (t as {tag_id?:string}).tag_id ?? "") || re.test((t.name ?? "").toLowerCase()));
const hour = (t?: string) => (t ? Number(t.slice(1, 3)) : NaN);

export function analyzeRhythm(entities: PlaceEntity[]): StreetRhythm {
  entities=[...new Map(entities.filter(p=>p.entity_id).map(p=>[p.entity_id,p])).values()];
  const hosp = entities.filter((p) => tagHit(p, HOSPITALITY));
  const openByHour: Record<string, number[]> = Object.fromEntries(DAYS.map((d) => [d, new Array(24).fill(0)]));
  const lateBy = new Array(7).fill(0) as number[];
  const lateNames: string[][] = DAYS.map(() => []);
  let withHours = 0;
  for (const p of hosp) {
    const h = p.properties?.hours ?? {};
    const slots = DAYS.flatMap((d, di) => (h[d] ?? []).filter((s) => !s.closed && s.opens).map((s) => ({ di, s })));
    // "00:00 to 00:00 every day" is a landmark or a data gap, not opening hours.
    if (slots.length === 0 || slots.every(({ s }) => s.opens === "T00:00:00" && s.closes === "T00:00:00")) continue;
    withHours++;
    for (const { di, s } of slots) {
      const o = hour(s.opens);
      let c = s.closes ? hour(s.closes) : 24;
      if (!Number.isFinite(o) || !Number.isFinite(c)) continue;
      if (c <= o) c += 24;
      for (let x = o; x < Math.min(c, o + 24); x++) openByHour[DAYS[(di + Math.floor(x / 24)) % 7]][x % 24]++;
      // Late: closes at 02:00 or later (after midnight, before 06:00).
      if (c >= 26 && c <= 30) {
        lateBy[di]++;
        lateNames[di].push(p.name);
      }
    }
  }

  const moments: RhythmMoment[] = [];
  const ref = (p: PlaceEntity) => ({ id: p.entity_id, name: p.name });

  // After work: happy-hour offerings, explicit "afterwork" wording, and places opening for the evening on weekdays.
  const happy = hosp.filter((p) => tagHit(p, /happy_hour|happy hour/));
  const afterText = hosp.filter((p) => /after.?work|after the office|after-office|apr[eè]s le travail/.test(text(p)));
  const weekdayJump = [17, 18, 19].map((x) => ({ x, jump: [1, 2, 3, 4, 5].reduce((a, d) => a + openByHour[DAYS[d]][x] - openByHour[DAYS[d]][x - 1], 0) }));
  const start = weekdayJump.sort((a, b) => b.jump - a.jump)[0];
  if (happy.length >= 3 || afterText.length >= 1) {
    const from = afterText.length >= 1 && start.x >= 18 ? 18 : 17;
    const evidence = [
      afterText.length ? `Qloo's own descriptions say "after work" for ${afterText.length} place${afterText.length > 1 ? "s" : ""} next door: ${afterText.slice(0, 3).map((p) => p.name).join(", ")}` : "",
      happy.length ? `${happy.length} of ${hosp.length} bars and restaurants around you run a happy hour` : "",
      start.jump > 0 ? `${start.jump} more places open at ${start.x}:00 on weekdays than an hour before` : "",
    ].filter(Boolean);
    moments.push({ id: "afterwork", label: "After work", days: [1, 2, 3, 4, 5], from: `${from}:00`, to: `${from + 2}:00`, strength: afterText.length >= 2 || happy.length >= 8 ? "strong" : "medium", evidence, places: [...afterText, ...happy].filter((p, i, a) => a.indexOf(p) === i).slice(0, 5).map(ref) });
  }

  // Late nights: the days when clearly more places stay open past 2 am.
  const sorted = [...lateBy].sort((a, b) => a - b);
  const median = sorted[3];
  const lateDays = lateBy.map((n, d) => ({ n, d })).filter(({ n }) => n >= 2 && n >= median + 2).map(({ d }) => d);
  const lateText = hosp.filter((p) => /late.?night|djs? on weekend|until late|runs late/.test(text(p)));
  if (lateDays.length > 0) {
    const evidence = [
      `${lateDays.map((d) => `${DAY_SHORT[d]} ${lateBy[d]}`).join(", ")} places stay open past 2 am, against ${median} on a usual night`,
      lateText.length ? `Late-night wording in Qloo's descriptions: ${lateText.slice(0, 3).map((p) => p.name).join(", ")}` : "",
    ].filter(Boolean);
    const names = [...new Set(lateDays.flatMap((d) => lateNames[d]))];
    moments.push({ id: "late_night", label: "Late night", days: lateDays, from: "22:00", to: "02:00", strength: lateDays.every((d) => lateBy[d] >= 2 * Math.max(1, median)) ? "strong" : "medium", evidence, places: hosp.filter((p) => names.includes(p.name)).slice(0, 5).map(ref) });
  }

  // Weekend brunch: brunch tags and "weekend brunch" wording.
  const brunch = hosp.filter((p) => tagHit(p, /brunch/));
  const brunchText = hosp.filter((p) => /weekend brunch|brunch on weekends|brunch du week/.test(text(p)));
  if (brunch.length >= 3 || brunchText.length >= 1) {
    moments.push({
      id: "brunch",
      label: "Weekend brunch",
      days: [6, 0],
      from: "11:00",
      to: "15:00",
      strength: brunch.length >= 8 || brunchText.length >= 2 ? "strong" : "medium",
      evidence: [
        brunch.length ? `${brunch.length} places around you serve brunch` : "",
        brunchText.length ? `"Weekend brunch" in Qloo's descriptions: ${brunchText.slice(0, 3).map((p) => p.name).join(", ")}` : "",
      ].filter(Boolean),
      places: [...brunchText, ...brunch].filter((p, i, a) => a.indexOf(p) === i).slice(0, 5).map(ref),
    });
  }

  // An explicit topic plus corroborating tags/hours. Windows are planning conventions, not measured peaks.
  const extra:{id:RhythmMoment["id"];label:string;from:string;to:string;days:number[];topic:RegExp}[]=[
    {id:"morning_coffee",label:"Morning coffee",from:"08:00",to:"10:30",days:[1,2,3,4,5],topic:/breakfast|morning coffee|early.morning|petit.d[eé]jeuner/},
    {id:"lunch_break",label:"Lunch break",from:"12:00",to:"14:00",days:[1,2,3,4,5],topic:/\blunch\b|lunch_break|lunchtime|d[eé]jeuner/},
    {id:"afternoon_break",label:"Afternoon pause",from:"14:30",to:"17:00",days:[0,1,2,3,4,5,6],topic:/afternoon tea|afternoon coffee|afternoon break|afternoon_tea|go[uû]ter/},
    {id:"dinner",label:"Dinner in the neighbourhood",from:"19:00",to:"21:00",days:[0,1,2,3,4,5,6],topic:/\bdinner\b|dinner_service|evening meals|d[iî]ner/},
    {id:"date_night",label:"An evening for two",from:"19:00",to:"21:00",days:[0,1,2,3,4,5,6],topic:/date[ _-]?night|romantic|intimate dinner/},
    {id:"weekend_stroll",label:"Weekend discoveries",from:"15:00",to:"17:00",days:[6,0],topic:/weekend stroll|weekend walk|weekend outing/},
  ];
  for(const rule of extra){
    const matches=hosp.filter(p=>rule.topic.test(text(p))||tagHit(p,rule.topic));
    if(matches.length<2)continue;
    const minutes=(value:string)=>{const m=value.match(/^T?(\d{2}):(\d{2})/);return m&&Number(m[1])<24&&Number(m[2])<60?Number(m[1])*60+Number(m[2]):NaN;};
    const from=minutes(rule.from),to=minutes(rule.to);
    const covers=(p:PlaceEntity,day:number)=>(p.properties?.hours?.[DAYS[day]]??[]).some(s=>{
      if(s.closed||!s.opens||!s.closes)return false;
      const opens=minutes(s.opens),rawClose=minutes(s.closes),closes=rawClose<=opens?rawClose+1440:rawClose;
      return !(opens===0&&rawClose===0)&&opens<=from&&closes>=to;
    });
    const days=rule.days.filter(d=>matches.filter(p=>covers(p,d)).length>=2);
    // Without hours we can identify the context, but cannot assert which weekdays support it.
    if(!days.length)continue;
    const refs=matches.filter(p=>days.some(d=>covers(p,d)));
    moments.push({id:rule.id,label:rule.label,days,from:rule.from,to:rule.to,strength:refs.length>=5?"strong":"medium",places:refs.slice(0,5).map(ref),evidence:[`${matches.length} nearby places have ${rule.label.toLowerCase()} wording or tags in Qloo.`, `At least two matching places list opening hours covering this suggested window on ${days.map(d=>DAY_SHORT[d]).join(", ")}.`, `References: ${refs.slice(0,3).map(p=>p.name).join(", ")}. The window is a planning suggestion, not a measured busy period.`]});
  }

  // Who walks past, according to the neighbourhood descriptions of every place read (not only bars).
  const WHO: [string, RegExp][] = [
    ["Local professionals", /professionals|office workers|business crowd|working in the/],
    ["Commuters", /commuters?/],
    ["Tourists", /tourists?|visitors/],
    ["Students", /students?/],
    ["Families", /families|family-friendly/],
  ];
  const passersBy = WHO.map(([label, re]) => ({ label, places: entities.filter((p) => re.test(text(p))).length }))
    .filter((w) => w.places >= 2)
    .sort((a, b) => b.places - a.places);

  // Event habits Qloo already sees on this street: pre-show, post-show, after concerts.
  const eventHabits = entities
    .map((p) => {
      const m = rawText(p).match(/[^.]*\b(pre-show|post-show|pre-concert|after (the )?(show|concert|game)s?|after concerts|before (the )?(show|concert|game)s?)\b[^.]*/i);
      return m ? { place: p.name, text: m[0].trim().slice(0, 160) } : undefined;
    })
    .filter((x): x is { place: string; text: string } => !!x)
    .slice(0, 4);

  return { placesRead: entities.length, hospitality: hosp.length, withHours, moments, passersBy, eventHabits, openByHour };
}

export async function streetRhythm(merchant: { lat: number; lon: number }, opts: { onCall?: (c: QlooCall) => void } = {}): Promise<StreetRhythm> {
  const point = `POINT(${merchant.lon} ${merchant.lat})`;
  const body = await qlooGet<{ results?: { entities?: PlaceEntity[] } }>(
    "/v2/insights",
    { "filter.type": "urn:entity:place", "signal.location": point, "filter.location": point, "filter.location.radius": "1500", take: "50" },
    opts,
  );
  return analyzeRhythm(body.results?.entities ?? []);
}

// Next occurrence of a rhythm moment, as UTC instants, from `now` in the merchant's time zone.
export function nextOccurrence(m: RhythmMoment, now: Date, timeZone: string, zonedToUtc: (local: string, tz: string) => Date): { start: Date; end: Date } | undefined {
  for (let i = 0; i < 8; i++) {
    const day = new Date(now.getTime() + i * 86_400_000);
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).formatToParts(day).map((p) => [p.type, p.value]));
    const dow = DAY_SHORT.indexOf(parts.weekday);
    if (!m.days.includes(dow)) continue;
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const start = zonedToUtc(`${date}T${m.from.padStart(5, "0")}:00`, timeZone);
    let end = zonedToUtc(`${date}T${m.to.padStart(5, "0")}:00`, timeZone);
    if (end <= start) end = new Date(end.getTime() + 86_400_000);
    if (end.getTime() > now.getTime()) return { start, end };
  }
  return undefined;
}
