// One narration, told as one night. Lines that play over the same screen are spoken as one
// continuous clip, so the voice flows instead of restarting at every sentence; the pauses inside
// the clip are measured and give each line its start, so the picture still follows every
// sentence. A new clip starts only where the scene changes (gapBefore, seconds).
// Output: out/voice/<group>.mp3 and out/voice/lines.json (flat lines with group, file, offset,
// duration, first, gapBefore, groupDuration).
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));

export const GROUPS = [
  { id: "intro", gapBefore: 1.0, lines: [
    { id: "hook1", text: "Every night, a crowd walks past your door." },
    { id: "hook2", text: process.env.HOOK2V ?? "Tonight: twenty thousand people, two blocks away, out at ten forty-five." },
    { id: "small", text: "Or eighty people out of a jazz club. Every crowd counts." },
    { id: "hook3", text: "Most places never see it coming." },
  ] },
  { id: "agent", gapBefore: 0.6, lines: [
    { id: "radar1", text: "Turnout does. It's your marketing agent. It watches every event around you, big or small." },
    { id: "radar2", text: "And above all, it knows who is coming: what kind of people, and what they love." },
  ] },
  { id: "today", gapBefore: 0.6, lines: [
    { id: "today", text: process.env.TODAYV ?? "Tonight, ten forty-five: a twenty-thousand-seat show lets out, a short walk from your door." },
    { id: "profile", text: "The agent profiles that exact crowd: who they are, what they love, the places they already go to around you." },
    { id: "pick", text: "Then it opens your menu and picks the one offer that speaks to them, at that hour. Not your usual special. The right one, tonight." },
  ] },
  { id: "campaign", gapBefore: 0.6, lines: [
    { id: "touch", text: "It writes the campaign. Add your words, and the board rewrites itself." },
    { id: "channels", text: "It also picks the channels where this crowd really is, and caps the budget. Every dollar goes where it pays." },
  ] },
  { id: "approve", gapBefore: 0.3, lines: [{ id: "approve", text: "Everything is ready. You just approve." }] },
  { id: "receipt", gapBefore: 0.5, lines: [{ id: "receipt", text: "The board at your door. A message to your regulars. A local ad within a few blocks. Nothing sent without you. Nothing charged." }] },
  { id: "board", gapBefore: 0.6, lines: [{ id: "board", text: "Right place. Right hour. Right people. Tonight, the crowd outside becomes customers inside." }] },
  { id: "close1", gapBefore: 0.7, lines: [{ id: "close1", text: "Turnout. The right message, to the right people, at the right moment." }] },
  { id: "close2", gapBefore: 0.3, lines: [{ id: "close2", text: "Your marketing agent. Your call." }] },
];
const VOICE = process.env.VOICE ?? "en-US-EmmaMultilingualNeural";
const RATE = process.env.RATE ?? "+14%";
mkdirSync(join(here, "out/voice"), { recursive: true });

const probe = (file) => parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
// Silences inside the clip (start, end), from ffmpeg's silencedetect.
function silences(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-i", file, "-af", "silencedetect=noise=-33dB:d=0.12", "-f", "null", "-"], { encoding: "utf8" });
  const starts = [...r.stderr.matchAll(/silence_start: ([0-9.]+)/g)].map((m) => +m[1]);
  const ends = [...r.stderr.matchAll(/silence_end: ([0-9.]+)/g)].map((m) => +m[1]);
  return starts.map((s, i) => ({ start: s, end: ends[i] ?? s }));
}
const out = [];
for (const g of GROUPS) {
  const file = join(here, "out/voice", `${g.id}.mp3`);
  const text = g.lines.map((l) => l.text).join(" ");
  try { execFileSync(join(here, ".venv/bin/edge-tts"), ["--voice", VOICE, `--rate=${RATE}`, "--text", text, "--write-media", file], { stdio: "pipe" }); }
  catch (e) { console.error(g.id, String(e.stderr).split("\n").filter(Boolean).slice(-2).join(" | ")); process.exit(1); }
  const duration = probe(file);
  const sil = silences(file);
  const lead = sil[0]?.start === 0 ? sil[0].end : 0;
  const tail = sil.length && Math.abs(sil[sil.length - 1].end - duration) < 0.05 ? sil[sil.length - 1].start : duration;
  const inner = sil.filter((s) => s.start > 0.2 && s.end < duration - 0.2 && !(s.start === 0));
  // Each boundary between two lines is the inner silence nearest to where the text proportion puts it.
  const chars = g.lines.map((l) => l.text.length), total = chars.reduce((a, b) => a + b, 0);
  const starts = [0];
  let cum = 0, used = new Set();
  for (let i = 0; i < g.lines.length - 1; i++) {
    cum += chars[i];
    const expected = lead + (cum / total) * (tail - lead);
    const pick = inner.filter((s) => !used.has(s)).sort((a, b) => Math.abs((a.start + a.end) / 2 - expected) - Math.abs((b.start + b.end) / 2 - expected))[0];
    if (pick) { used.add(pick); starts.push(pick.end - 0.04); } else starts.push(expected);
  }
  g.lines.forEach((l, i) => {
    const offset = starts[i], next = i + 1 < starts.length ? starts[i + 1] : duration;
    out.push({ id: l.id, text: l.text, group: g.id, file, first: i === 0, gapBefore: i === 0 ? g.gapBefore : 0, offset, duration: next - offset, groupDuration: duration });
    console.log(l.id.padEnd(8), "at", offset.toFixed(2).padStart(5), "for", (next - offset).toFixed(2) + "s", i === 0 ? `(${g.id}, ${duration.toFixed(2)}s)` : "");
  });
}
writeFileSync(join(here, "out/voice/lines.json"), JSON.stringify(out, null, 2));
