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

// Scores in brackets, such as "(+0.75)" or "(0.92)", are analyst words: strip them from prose shown to a merchant.
export const noScores = (s: string) => s.replace(/\s?\([+−-]?\d+\.\d+\)/g, "");
