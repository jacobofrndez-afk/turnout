// One narration, told as one night. Lines that play over the same screen are spoken as one
// continuous clip, so the voice flows instead of restarting at every sentence. edge-tts writes
// the sentence timings of each clip (SRT); they give every line its start inside the clip and
// the subtitles their cues, so the picture and the captions follow the words. A new clip starts
// only where the scene changes (gapBefore, seconds).
// Output: out/voice/<group>.mp3 + .srt and out/voice/lines.json (flat lines with group, file,
// offset, duration, first, gapBefore, groupDuration; the first line of a clip carries its cues).
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));

export const GROUPS = [
  { id: "intro", gapBefore: 1.0, lines: [
    { id: "hook1", text: "Every day, a crowd walks past your door." },
    { id: "hook2", text: process.env.HOOK2V ?? "Like tonight: twenty thousand people, two blocks away, out at ten forty-five." },
    { id: "small", text: "Or eighty people out of a jazz club. Every crowd is yours to win." },
  ] },
  { id: "hook3", gapBefore: 0.7, lines: [{ id: "hook3", text: "Most places never see it coming." }] },
  { id: "agent", gapBefore: 0.6, lines: [
    { id: "radar1", text: "Turnout does. It's your marketing agent." },
    { id: "radar2", text: "And it knows exactly who's coming." },
  ] },
  { id: "today", gapBefore: 0.5, lines: [
    { id: "today", text: process.env.TODAYV ?? "Tonight's crowd: who they are, what they love, and where they already go." },
    { id: "pick", text: "So instead of your usual special, it picks the one offer they'll actually say yes to." },
  ] },
  { id: "campaign", gapBefore: 0.5, lines: [
    { id: "touch", text: "It writes the whole campaign for you. You just add your own words." },
    { id: "channels", text: "Then it picks the channels this crowd actually uses: a local ad a few blocks from the venue, your socials, a message to your regulars, with a budget you set, so every dollar goes where it pays." },
  ] },
  { id: "approve", gapBefore: 0.4, lines: [{ id: "approve", text: "Then, one tap. Your call." }] },
  { id: "receipt", gapBefore: 0.5, lines: [{ id: "receipt", text: "Everything is set: online, on their phones, and at your door. Nothing goes out without you." }] },
  { id: "close1", gapBefore: 0.7, lines: [{ id: "close1", text: "The right place. At the right hour. For the right people." }] },
  { id: "close2", gapBefore: 0.3, lines: [{ id: "close2", text: "Turnout. Turn the crowd outside into customers inside." }] },
];
const VOICE = process.env.VOICE ?? "en-US-EmmaMultilingualNeural";
const RATE = process.env.RATE ?? "+8%";
mkdirSync(join(here, "out/voice"), { recursive: true });

const probe = (file) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
const norm = (s) => s.replace(/\s+/g, " ").trim();
const secs = (hms) => { const [h, m, rest] = hms.split(":"); const [s, ms] = rest.split(","); return +h * 3600 + +m * 60 + +s + +ms / 1000; };
// Sentence cues from the SRT edge-tts writes next to the audio.
function sentences(srt) {
  return srt.split(/\r?\n\r?\n/).map((b) => b.trim().split(/\r?\n/)).filter((l) => l.length >= 3 && /-->/.test(l[1]))
    .map((l) => { const [a, b] = l[1].split("-->").map((x) => secs(x.trim())); return { start: a, end: b, text: norm(l.slice(2).join(" ")) }; });
}
// Silences inside the clip, the fallback when the sentences cannot be matched to the lines.
function silences(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-33dB:d=0.12", "-f", "null", "-"], { encoding: "utf8" });
  const starts = [...r.stderr.matchAll(/silence_start: ([0-9.]+)/g)].map((m) => +m[1]);
  const ends = [...r.stderr.matchAll(/silence_end: ([0-9.]+)/g)].map((m) => +m[1]);
  return starts.map((s, i) => ({ start: s, end: ends[i] ?? s }));
}
// Subtitle cues: one per sentence, long sentences split at a comma near the middle (time shared by length).
function captionCues(sents, duration) {
  const out = [];
  for (const s of sents) {
    // long sentences become subtitle-sized chunks, cut at commas and colons, up to about 58 characters each
    const parts = [];
    if (s.text.length > 62) {
      const pieces = s.text.split(/(?<=[,:;])\s+/);
      let cur = "";
      for (const piece of pieces) { if (cur && (cur + " " + piece).length > 58) { parts.push(cur); cur = piece; } else cur = cur ? cur + " " + piece : piece; }
      if (cur) parts.push(cur);
      if (parts.length === 1 && parts[0].length > 80) { const words = parts[0].split(" "); const half = Math.ceil(words.length / 2); parts.splice(0, 1, words.slice(0, half).join(" "), words.slice(half).join(" ")); }
    }
    if (!parts.length) parts.push(s.text);
    let t = s.start;
    const total = parts.reduce((a, p) => a + p.length, 0);
    for (const p of parts) { const d = (s.end - s.start) * (p.length / total); out.push({ start: t, end: t + d, text: p }); t += d; }
  }
  // a cue stays up until the next one; the last one until the clip settles
  return out.map((c, i) => ({ start: Math.max(0, c.start - 0.05), end: i + 1 < out.length ? out[i + 1].start - 0.05 : Math.min(duration, c.end + 0.3), text: c.text }));
}

const out = [];
for (const g of GROUPS) {
  const file = join(here, "out/voice", `${g.id}.mp3`), srt = join(here, "out/voice", `${g.id}.srt`);
  const text = g.lines.map((l) => l.text).join(" ");
  try { execFileSync(join(here, ".venv/bin/edge-tts"), ["--voice", VOICE, `--rate=${RATE}`, "--text", text, "--write-media", file, "--write-subtitles", srt], { stdio: "pipe" }); }
  catch (e) { console.error(g.id, String(e.stderr).split("\n").filter(Boolean).slice(-2).join(" | ")); process.exit(1); }
  const duration = probe(file);
  const sents = sentences(readFileSync(srt, "utf8"));
  // Each line starts with the sentence whose text opens it; the sentences are consumed in order.
  const starts = [0];
  let p = 0, ok = sents.length > 0;
  for (let i = 1; i < g.lines.length && ok; i++) {
    let covered = "";
    const target = norm(g.lines[i - 1].text);
    while (p < sents.length && covered.length < target.length - 2) covered = norm(covered + " " + sents[p++].text);
    if (p < sents.length && norm(g.lines[i].text).startsWith(sents[p].text.split(" ")[0])) starts.push(Math.max(0, sents[p].start - 0.04));
    else ok = false;
  }
  if (!ok) {
    // fallback: the inner silence nearest to where the text proportion puts each boundary
    starts.length = 1;
    const sil = silences(file);
    const lead = sil[0]?.start === 0 ? sil[0].end : 0;
    const tail = sil.length && Math.abs(sil[sil.length - 1].end - duration) < 0.05 ? sil[sil.length - 1].start : duration;
    const inner = sil.filter((s) => s.start > 0.2 && s.end < duration - 0.2);
    const chars = g.lines.map((l) => l.text.length), total = chars.reduce((a, b) => a + b, 0);
    let cum = 0; const used = new Set();
    for (let i = 0; i < g.lines.length - 1; i++) {
      cum += chars[i];
      const expected = lead + (cum / total) * (tail - lead);
      const pick = inner.filter((s) => !used.has(s)).sort((a, b) => Math.abs((a.start + a.end) / 2 - expected) - Math.abs((b.start + b.end) / 2 - expected))[0];
      if (pick) { used.add(pick); starts.push(pick.end - 0.04); } else starts.push(expected);
    }
    console.error(g.id, "sentence match failed, used silences");
  }
  const cues = captionCues(sents, duration);
  g.lines.forEach((l, i) => {
    const offset = starts[i], next = i + 1 < starts.length ? starts[i + 1] : duration;
    out.push({ id: l.id, text: l.text, group: g.id, file, first: i === 0, gapBefore: i === 0 ? g.gapBefore : 0, offset, duration: next - offset, groupDuration: duration, ...(i === 0 ? { cues } : {}) });
    console.log(l.id.padEnd(8), "at", offset.toFixed(2).padStart(5), "for", (next - offset).toFixed(2) + "s", i === 0 ? `(${g.id}, ${duration.toFixed(2)}s, ${cues.length} cues)` : "");
  });
}
writeFileSync(join(here, "out/voice/lines.json"), JSON.stringify(out, null, 2));
