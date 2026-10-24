// Prose helpers for agent-written text on customer screens.

// Whole sentences only, up to about `max` characters: a cut mid-word reads as a bug. A full stop counts as a
// sentence end only when a space and a capital letter follow it, so "0.92" or "5 to 7 pm. The" behave.
export function firstSentences(text: string, max: number): string {
  if (text.length <= max) return text;
  let out = "";
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c !== "." && c !== "!" && c !== "?") continue;
    const atEnd = i === text.length - 1;
    const next = text[i + 1];
    const after = text[i + 2];
    const capital = !!after && after !== after.toLowerCase();
    if (!atEnd && !(next === " " && capital)) continue;
    const sentence = text.slice(start, i + 1);
    if ((out + sentence).length > max) break;
    out += sentence + " ";
    start = i + 2;
  }
  return out.trim() || `${text.slice(0, max - 1).trim()}…`;
}

// Scores are analyst words. Bracketed ones go, such as "(+0.75)"; a bare 0.NN becomes a band so the sentence still reads:
// "scores 0.92" reads "scores high", "at 0.92" reads "strongly", a stray "0.92" reads "high".
export function noScores(s: string): string {
  const band = (n: string, w: [string, string, string, string]) => (Number(n) >= 0.9 ? w[0] : Number(n) >= 0.8 ? w[1] : Number(n) >= 0.7 ? w[2] : w[3]);
  const adverb = (n: string) => band(n, ["very strongly", "strongly", "well", "moderately"]);
  const adjective = (n: string) => band(n, ["very high", "high", "good", "moderate"]);
  return s
    .replace(/\s?\([+−-]?\d+\.\d+\)/g, "")
    .replace(/\b(is|was|of|scores?|reaches|hits|sits at|lands at) \+?(0\.\d\d)\b/g, (_, v, n) => `${v} ${adjective(n)}`)
    .replace(/\bat \+?(0\.\d\d)\b/g, (_, n) => adverb(n))
    .replace(/\+?\b0\.\d\d\b/g, (n) => adjective(n.replace("+", "")));
}

// Analyst words read as a system talking. The agent is told not to use them; this catches stored drafts.
export function plainWords(s: string): string {
  return s
    .replace(/\baggregate (tastes?)\b/gi, "shared $1")
    .replace(/The offer fits are affinities of places with the offer's tags nearby;\s*they compare offers, they do not forecast sales\./gi, "Which of your offers fits best only compares them with each other; it is not a sales forecast.")
    .replace(/\ba high affinity\b/gi, "a strong match")
    .replace(/[^.]*\bwins on (?:two|three|four) (?:signals|reasons) that agree\.\s*/gi, "")
    .replace(/\bDemographics: an? (female|male)-skew(?:ing|ed)\b/g, "A mostly $1")
    .replace(/\b(?:Demographics|Places|Brands): (\p{L})/gu, (_m, c: string) => c.toUpperCase())
    .replace(/\band the ([^.,;]+?)'s own tags map to the same places(?:, a strong fit)?/gi, "and your $1 suits the same places")
    .replace(/\b(female|male)-skew(?:ing|ed)\b/gi, "mostly $1")
    .replace(/[^.]*\bcompressed\b[^.]*\./gi, "")
    .replace(/\bover-?index(?:es|ed)? on ([^,.;]*?) and on\b/gi, "lean toward $1 and toward")
    .replace(/\bover-?index(?:es|ed)? on\b/gi, "lean toward")
    .replace(/\bunder-?index(?:es|ed)? on\b/gi, "lean away from")
    .replace(/\bover-?index(?:es|ed)?\b/gi, "stand out")
    .replace(/\baudience tags\b/gi, "crowds")
    .replace(/\bambience tags\b/gi, "moods")
    .replace(/\btaste tags\b/gi, "tastes")
    .replace(/\b(offer's|offers') tags\b/gi, "$1 kinds of places")
    .replace(/\btags\b/gi, "tastes")
    .replace(/\b(crowds are|moods run) ([^:.;]+)/g, (_m: string, a: string, b: string) => `${a} ${b.toLowerCase()}`)
    .replace(/\bsignals\b/gi, "reasons")
    .replace(/\bsignal\b/gi, "reason")
    .replace(/\baggregate affinities\b/gi, "shared tastes")
    .replace(/\baffinities\b/gi, "tastes")
    .replace(/\baffinity\b/gi, "taste")
    .trim();
}

// Ad interests arrive in Qloo's capitals. A common phrase of two or more words with no capital after the first letter gets
// lowercased. Single words keep their capital, because they are often names (Broadway, Aladdin, Hamilton, Gradur).
export const plainList = (xs: string[]) => xs.map((t) => (/^\p{Lu}[\p{Ll}-]+( [\p{Ll}&-]+)+$/u.test(t) ? t.toLowerCase() : t)).join(", ");

// Ticketmaster shouts some names ("ASAKE", "ACCOR ARENA"): a run of capitals with a word of four letters or more is
// title-cased; short acronyms (UFC, NBA, AC/DC) keep their capitals.
export function unshout(s: string): string {
  return s.replace(/\b\p{Lu}[\p{Lu}'’.&\/-]*(?:\s+\p{Lu}[\p{Lu}'’.&\/-]*)*\b/gu, (run) => (/\p{Lu}{4,}/u.test(run) ? run.toLowerCase().replace(/(^|[\s\-'’\/&])(\p{L})/gu, (_, p, c) => p + c.toUpperCase()) : run));
}

