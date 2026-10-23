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
