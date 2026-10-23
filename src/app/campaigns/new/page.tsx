import { isCommercialBrand } from "@/lib/brands";
import Link from "next/link";
import { haversineKm } from "@/server/events/concentration";
import { getMerchant } from "@/server/events/radar";
import { tagId } from "@/server/qloo/api";
import { buildCrowdProfile, describeDemographics, getEvent, hasSignal, type CrowdProfile } from "@/server/qloo/crowd";
import { nb } from "@/lib/nbsp";
import { getDb } from "@/server/db/client";
import { getCampaign, getDraft } from "@/server/agent/run";

export const dynamic = "force-dynamic";

// What Qloo read each signal through, in a merchant's words. Unknown types are not shown.
const READ_THROUGH: Record<string, string> = { tv_show: "its TV series", movie: "its film", artist: "the act", tag: "a taste", brand: "the brand", place: "the place", book: "the book", videogame: "the game" };
// Offer fit as a word, from the gap to the best offer. Decimals in the same band meant nothing to a merchant.
const fitWord = (affinity: number, top: number, index: number) => (index === 0 ? "Strongest fit" : top - affinity <= 0.02 ? "Close" : top - affinity <= 0.06 ? "Further" : "Weak");

// "A, B and C": the way a merchant lists names.
const andList = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
// An offer title inside a sentence: "Your pre-show happy hour fits them best". An acronym keeps its capitals.
const inSentence = (s: string) => (/^[A-Z][A-Z]/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
// Tags that say nothing about this crowd in particular: every crowd likes bars and restaurants.
const GENERIC_TAG = /^(bar|bars|restaurant|restaurants|cafe|pub|food|drink|drinks|nightlife|place|places)$/i;
// A cuisine says what they eat, not what kind of place they look for; the sentence under the title names the bars anyway.
const CUISINE_TAG = /^(european|american|new american|french|italian|mexican|japanese|chinese|thai|indian|spanish|greek|british|mediterranean|asian|latin|latin american|korean|vietnamese|middle eastern|german|irish|caribbean|african|turkish|lebanese|peruvian|brazilian|argentin\w*|portuguese|polish|russian|scandinavian|cuban|filipino|hawaiian|cajun|southern|soul food|modern|contemporary|international|fusion|steakhouse|seafood|sushi|pizza|burgers?)$/i;
// Tag families that are not a taste a merchant can act on (a card accepted, a hotel's stars, a dish).
const NOISE_TAG_ID = /:(credit_card|inclusivity|hotel_rating|specialty_dish|cost_description|amenity|accessibility):/;

// Age bands in words, in age order, adjacent bands merged: "25 to 34", "under 30", "35 and over", "under 25 and 35 to 44".
const AGE_ORDER = ["24_and_younger", "25_to_29", "30_to_34", "35_to_44", "45_to_54", "55_and_older"];
const AGE_BOUNDS: Record<string, [number | undefined, number | undefined]> = { "24_and_younger": [undefined, 24], "25_to_29": [25, 29], "30_to_34": [30, 34], "35_to_44": [35, 44], "45_to_54": [45, 54], "55_and_older": [55, undefined] };
function ageWords(keys: string[], aged = false): string {
  const runs: string[][] = [];
  for (const k of AGE_ORDER.filter((k) => keys.includes(k))) {
    const last = runs[runs.length - 1];
    if (last && AGE_ORDER.indexOf(last[last.length - 1]) === AGE_ORDER.indexOf(k) - 1) last.push(k);
    else runs.push([k]);
  }
  return andList(
    runs.map((r) => {
      const [lo] = AGE_BOUNDS[r[0]];
      const [, hi] = AGE_BOUNDS[r[r.length - 1]];
      if (lo === undefined && hi === undefined) return "every age";
      if (lo === undefined) return `under ${hi! + 1}`;
      if (hi === undefined) return `${lo} and over`;
      return `${aged ? "aged " : ""}${lo} to ${hi}`;
    }),
  );
}

type Fact = { title: string; sentence: string };

// Who: "Women, 25 to 34" and one sentence in words. Never a signed number.
function whoFact(p: CrowdProfile): Fact {
  const d = p.demographics;
  const demo = describeDemographics(d);
  if (!d || !demo) return { title: "Every age, men and women", sentence: "Qloo has no age or gender data for this crowd. The campaign leans on their tastes alone." };
  const ages = Object.entries(d.age).sort((a, b) => b[1] - a[1]);
  const up = ages.filter(([, v]) => v > 0.1).slice(0, 2).map(([k]) => k);
  const down = ages.filter(([, v]) => v < -0.2).map(([k]) => k);
  const women = demo.gender.startsWith("skews female");
  const men = demo.gender.startsWith("skews male");
  const upWords = up.length ? ageWords(up) : "every age";
  const numeric = /^\d/.test(upWords);
  const title = women || men ? (numeric ? `${women ? "Women" : "Men"}, ${upWords}` : `${cap(upWords)}, mostly ${women ? "women" : "men"}`) : numeric ? `Men and women, ${upWords}` : `${cap(upWords)}, men and women alike`;
  const parts = [women ? "more women" : men ? "more men" : "as many men as women", up.length ? `more people ${ageWords(up, true)}` : "", down.length ? `fewer people ${ageWords(down, true)}` : ""].filter(Boolean);
  return { title, sentence: `Compared with everyone, this crowd has ${andList(parts)}.` };
}

export default async function NewCampaignPage({ searchParams }: { searchParams: Promise<{ merchant?: string; event?: string; pick?: string }> }) {
  const sp = await searchParams;
  const merchant = sp.merchant ? getMerchant(sp.merchant) : undefined;
  const event = sp.event ? getEvent(sp.event) : undefined;
  if (!merchant || !event) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <Link href={merchant ? `/today?merchant=${merchant.id}` : "/today"} className="link text-sm">Today</Link>
        <h1 className="t-display mt-5">Missing place or event</h1>
        <p className="t-body mt-5">This link names no place or no crowd. Start again from Today.</p>
      </main>
    );
  }
  let profile: CrowdProfile;
  try {
    profile = await buildCrowdProfile(merchant, event, sp.pick);
  } catch (e) {
    // Qloo unreachable or rate limited: say so plainly instead of a blank error page.
    return (
      <main className="mx-auto max-w-3xl px-5 py-16">
        <Link href={`/today?merchant=${merchant.id}`} className="link text-sm">Today</Link>
        <h1 className="t-display mt-5">{event.name}</h1>
        <p className="t-body mt-6 bg-[var(--danger-soft)] px-5 py-4 text-[var(--danger)]">
          Qloo could not be reached, so this crowd cannot be read yet. Nothing was sent. Try again in a minute.
        </p>
        <p className="t-meta mt-2">{String((e as Error).message).slice(0, 160)}</p>
      </main>
    );
  }

  // Where and when, in one sentence: "Madison Square Garden, tonight at 20:00, two blocks from Penn & Pour."
  const tz = merchant.timezone;
  const starts = new Date(event.starts_at);
  const fmtTime = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
  const fmtHour = new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz });
  const fmtDayKey = new Intl.DateTimeFormat("en-CA", { timeZone: tz });
  const fmtDate = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "short", timeZone: tz });
  const now = Date.now();
  const dayKey = fmtDayKey.format(starts);
  const day = dayKey === fmtDayKey.format(new Date(now)) ? (Number(fmtHour.format(starts)) >= 17 ? "tonight" : "today") : dayKey === fmtDayKey.format(new Date(now + 86_400_000)) ? "tomorrow" : `on ${fmtDate.format(starts)}`;
  // A show has one venue at a distance from the door; a wave or a moment is already "around you".
  const isShow = (event.origin ?? "ticketmaster") === "ticketmaster";
  const km = haversineKm(merchant.lat, merchant.lon, event.lat, event.lon);
  const walk = km <= 0.25 ? "a block from" : km <= 0.5 ? "two blocks from" : km <= 0.9 ? "a few blocks from" : undefined;
  const radius = merchant.radius_m >= 1000 ? `${(merchant.radius_m / 1000).toLocaleString("en-US")} km` : `${merchant.radius_m} m`;

  const ageLabel = (k: string) => k.replace("24_and_younger", "<25").replace("55_and_older", "55+").replace("_to_", "‑");
  const placeTags = profile.tags.filter((t) => tagId(t).startsWith("urn:tag:genre:place:restaurant"));
  const placesKnown = placeTags.length >= 4;
  // "Musical Theater", "Musical Theatre" and "Musical Theatre Performances" are one idea for a merchant: keep the first spelling.
  const seenTag = new Set<string>();
  const shownTags = (placesKnown ? placeTags : profile.tags)
    .filter((t) => {
      const k = t.name.toLowerCase().replace(/theater/g, "theatre").replace(/[^a-z]/g, "").replace(/(performances?|s)$/, "");
      if (seenTag.has(k)) return false;
      seenTag.add(k);
      return true;
    })
    .slice(0, 8);
  const brands = profile.brands.filter(isCommercialBrand).slice(0, 8).map((b) => b.name);

  // The three facts: who, what they like, what fits.
  const who = whoFact(profile);
  const isTaste = (n: string) => !GENERIC_TAG.test(n) && !CUISINE_TAG.test(n);
  let likeTags = shownTags.map((t) => t.name).filter(isTaste).slice(0, 3);
  if (likeTags.length < 2) likeTags = profile.tags.filter((t) => !NOISE_TAG_ID.test(tagId(t))).map((t) => t.name).filter(isTaste).slice(0, 3);
  // "Moderately expensive" is the one price word Qloo gives; it leads the title when it exists.
  const costTag = profile.tags.find((t) => tagId(t).includes(":cost_description:"))?.name;
  const likeTitle = [...(costTag ? [`${costTag.toLowerCase()} places`] : []), ...likeTags.map((n) => n.toLowerCase())].slice(0, 3);
  const bars = profile.places.slice(0, 3).map((p) => p.name);
  const like: Fact = {
    title: likeTitle.length >= 2 ? cap(andList(likeTitle)) : andList(brands.slice(0, 3)) || "Their tastes, through Qloo",
    sentence: bars.length && brands.length ? `They already go to ${andList(bars)}, and like ${andList(brands.slice(0, 3))}.` : bars.length ? `They already go to ${andList(bars)}.` : brands.length ? `They like ${andList(brands.slice(0, 3))}.` : "Qloo lists no bar nearby and no brand for this crowd yet.",
  };
  // When Turnout already wrote the campaign for this crowd, its choice is the one that fits (it weighs the ages and the
  // brands too); otherwise the offer whose places this crowd likes most.
  const written = getDb().prepare("SELECT id FROM campaigns WHERE merchant_id = ? AND event_id = ? AND status IN ('drafted', 'approved', 'sent') ORDER BY created_at DESC LIMIT 1").get(merchant.id, event.id) as { id: string } | undefined;
  const chosenId = written ? getDraft(getCampaign(written.id)!)?.chosen_offer_id : undefined;
  const top = profile.offerFits.find((f) => f.offerId === chosenId) ?? profile.offerFits[0];
  const topFits = !!top && (top.matches > 0 && top.affinity > 0 || top.offerId === chosenId);
  // Two offers within a hair of each other, and no campaign yet: say so, rather than crown one on a compressed score.
  const second = profile.offerFits[1];
  const tooClose = !chosenId && !!top && !!second && second.matches > 0 && top.affinity - second.affinity <= 0.02;
  const fit: Fact = tooClose
    ? { title: `Your ${inSentence(top.title)} or your ${inSentence(second.title)}`, sentence: `Both match places they already like. Turnout picks one from their ages and their brands when it writes your campaign.` }
    : topFits
    ? { title: `Your ${inSentence(top.title)} fits them best`, sentence: top.topPlaces.length ? `${cap(andList(top.tagNames.map((n) => n.toLowerCase())))}, like ${andList(top.topPlaces)}, which they already like.` : `${cap(andList(top.tagNames.map((n) => n.toLowerCase())))}: the choice Turnout made for this crowd.` }
    : { title: "None of your offers fits them yet", sentence: "No place near you carrying your offers' tags is one they like. Add an offer closer to their tastes and Turnout will match it." };
  const signalNames = profile.entity ? profile.headlinerName : [...profile.signal.entities, ...profile.signal.tags].map((x) => x.name).join(", ");

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link href={`/today?merchant=${merchant.id}`} className="link text-sm">Today</Link>
      <h1 className="t-display mt-5">{profile.headlinerName}</h1>
      <p className="t-lead mt-5">
        {event.venue_name}, {day} {isShow ? "at" : "from"} <span className="mono">{fmtTime.format(starts)}</span>
        {isShow && <>, {walk ?? <><span className="mono">{nb(km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`)}</span> from</>} {merchant.name}</>}.
      </p>

      {profile.status === "needs_input" && (
        <section className="stack-section">
          <h2 className="t-title">Which one plays tonight?</h2>
          <p className="t-body mt-3">Qloo knows several entities named like “{profile.headlinerName}”. Pick the right one so the taste data describes the right crowd.</p>
          <ul className="mt-8 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {profile.candidates.map((c) => (
              <li key={c.id}>
                <Link href={`/campaigns/new?merchant=${merchant.id}&event=${event.id}&pick=${c.id}`} className="block bg-[var(--tone)] px-5 py-4 transition-colors hover:bg-[var(--tone-2)]">
                  <p className="t-body font-semibold text-[var(--ink)]">{c.name} <span className="chip ml-2">{c.type.replace("urn:entity:", "")}</span></p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{c.description || "no description"} · popularity {((c.popularity ?? 0) * 100).toFixed(0)}%</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.status === "unresolved" && (
        <section className="stack-section">
          <h2 className="t-title">Qloo does not know this headliner</h2>
          <p className="t-body mt-3">No entity matched “{profile.headlinerName}”. The campaign can still run on the event's genre and venue, but without taste evidence.</p>
        </section>
      )}

      {hasSignal(profile) && (
        <>
          <section className="stack-section">
            {[who, like, fit].map((f) => (
              <div key={f.title} className="stack-block">
                <h2 className="t-title">{nb(f.title)}</h2>
                <p className="t-body mt-3">{nb(f.sentence)}</p>
              </div>
            ))}
          </section>
          <form action="/api/campaigns" method="post" className="stack-section">
            <input type="hidden" name="merchant" value={merchant.id} />
            <input type="hidden" name="event" value={event.id} />
            {sp.pick && <input type="hidden" name="pick" value={sp.pick} />}
            <button className="btn btn-accent btn-lg">Write my campaign</button>
          </form>
        </>
      )}

      <details className="stack-section">
        <summary className="text-base font-semibold text-[var(--ink)]">All the evidence from Qloo</summary>

        {hasSignal(profile) && (
          <>
            <section className="stack-block">
              <h3 className="t-title">What Qloo was asked about</h3>
              {profile.entity ? (
                <p className="t-body mt-3">
                  {profile.entity.name}{READ_THROUGH[profile.entity.subtype?.replace("urn:entity:", "") ?? ""] ? `, ${READ_THROUGH[profile.entity.subtype?.replace("urn:entity:", "") ?? ""]}` : ""}, {profile.status === "auto" ? "found by Qloo" : "picked by you"}.
                </p>
              ) : (
                <>
                  <ul className="mt-3 space-y-1.5 text-base">
                    {[...profile.signal.entities, ...profile.signal.tags].map((x) => (
                      <li key={x.id}>
                        <span className="font-semibold text-[var(--ink)]">{x.name}</span>
                        <span className="text-[var(--muted)]">{x.type === "tag" ? `, a taste Qloo knows${x.note ? `: ${x.note}` : ""}` : `${x.note ? `, ${x.note}` : ""}${READ_THROUGH[x.type] ? `, read through ${READ_THROUGH[x.type]}` : ""}`}.</span>
                      </li>
                    ))}
                  </ul>
                  <p className="t-body mt-3 text-[var(--muted)]">One crowd made of several audiences, read by Qloo as a whole.</p>
                </>
              )}
            </section>

            {profile.demographics && (
              <section className="stack-block">
                <h3 className="t-title">Each age, against everyone</h3>
                <p className="t-body mt-3 text-[var(--muted)]">A bar that rises means more of that age than in the city as a whole, a bar that hangs means fewer.</p>
                <div className="mt-8 grid max-w-2xl grid-cols-6 gap-3 text-center text-sm">
                  {Object.entries(profile.demographics.age).map(([k, v]) => (
                    <div key={k}>
                      <div className="mx-auto flex h-14 w-full items-end justify-center">{v >= 0 && <div className="w-12" style={{ height: `${Math.max(4, Math.min(100, v * 100))}%`, background: "var(--bar-hot)" }} />}</div>
                      <div className="mx-auto flex h-14 w-full items-start justify-center">{v < 0 && <div className="w-12" style={{ height: `${Math.max(4, Math.min(100, -v * 100))}%`, background: "var(--muted)" }} />}</div>
                      <p className="mt-1.5 font-semibold text-[var(--ink)]">{ageLabel(k)}</p>
                      <p className="tnum text-[var(--muted)]">{v >= 0 ? "+" : "−"}{Math.abs(v).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="stack-block">
              <h3 className="t-title">Brands this crowd likes</h3>
              <p className="t-body mt-3">{brands.join(", ") || "None that Qloo names."}</p>
            </section>

            <section className="stack-block">
              <h3 className="t-title">{placesKnown ? "Kinds of places this crowd likes" : "What this crowd likes"}</h3>
              <p className="t-body mt-3">{shownTags.map((t) => t.name).join(", ") || "Nothing Qloo names."}</p>
            </section>

            <section className="stack-block">
              <h3 className="t-title">Bars within <span className="mono">{radius}</span> this crowd already likes, in order of affinity</h3>
              <ol className="mt-4 space-y-2 text-base">
                {profile.places.slice(0, 8).map((p) => (
                  <li key={p.entity_id} className="truncate">
                    {p.name} <span className="text-sm text-[var(--muted)]">{(p.properties?.geocode as { name?: string } | undefined)?.name}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="stack-block">
              <h3 className="t-title">Your offers against this crowd</h3>
              <p className="t-body mt-3 text-[var(--muted)]">How much this crowd already seeks places near you that carry each offer's tags. One clue among several: Turnout also weighs the ages and the brands.</p>
              <table className="data mt-6 w-full text-base">
                <tbody>
                  {profile.offerFits.map((f, i) => (
                    <tr key={f.offerId}>
                      <td className="font-semibold text-[var(--ink)]">{f.title}<span className="mt-1 block text-sm font-normal text-[var(--muted)] md:hidden">{f.tagNames.join(", ")}. e.g. {f.topPlaces.join(", ")}</span></td>
                      <td className="hidden text-sm text-[var(--muted)] md:table-cell">{f.tagNames.join(", ")}</td>
                      <td className="hidden text-sm text-[var(--muted)] md:table-cell">e.g. {f.topPlaces.join(", ")}</td>
                      {f.matches === 0 || f.affinity === 0 ? <td className="text-right text-sm text-[var(--muted)]">no match nearby</td> : <td className="text-right font-semibold text-[var(--ink)]">{fitWord(f.affinity, profile.offerFits[0].affinity, i)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}

        <section className="stack-block">
          <h3 className="t-title">How Turnout got here, {profile.provenance.length} steps</h3>
          <table className="data mt-6 w-full text-sm">
            <thead>
              <tr><th>#</th><th>Kind</th><th>Workflow</th><th>Status</th><th className="text-right">Results</th><th>Source</th><th>Note</th></tr>
            </thead>
            <tbody>
              {profile.provenance.map((r) => (
                <tr key={r.seq}>
                  <td>{r.seq}</td><td>{r.kind}</td><td><code>{r.workflow}</code></td><td>{r.status}</td><td className="text-right">{r.resultCount}</td>
                  <td>{r.kind === "qloo" ? (r.cacheHit ? "cache" : "Qloo live") : "local"}</td><td className="text-[var(--muted)]">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="t-meta mt-6 tnum">Qloo calls: {profile.qlooCalls.live} live, {profile.qlooCalls.cached} cached.</p>
          <p className="t-body mt-6 text-[var(--muted)]">
            What this does not establish: Qloo describes what people who like {signalNames || "this crowd"} tend to like as a group. It says nothing about any individual guest, and a strong taste is not a promise that anyone will visit.
          </p>
        </section>
      </details>
    </main>
  );
}
