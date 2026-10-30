// One narration, told as one night. Each segment is generated with edge-tts and measured; the
// planned pauses (gapBefore, seconds) make the track breathe at page changes. Output:
// out/voice/<id>.mp3 and out/voice/lines.json ({id, text, gapBefore, duration}).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));

export const LINES = [
  { id: "hook1", gapBefore: 1.8, text: "Every night, a crowd walks past your door." },
  { id: "hook2", gapBefore: 0.5, text: process.env.HOOK2V ?? "Tonight, it's twenty thousand people, two blocks away." },
  { id: "hook3", gapBefore: 0.5, text: "Most places never see it coming." },
  { id: "radar1", gapBefore: 1.1, text: "Turnout does. It's your marketing agent." },
  { id: "radar2", gapBefore: 0.4, text: "It watches every event around your place, all week, and spots the moments that can fill your room." },
  { id: "today", gapBefore: 1.1, text: process.env.TODAYV ?? "Tonight, that moment is a twenty-thousand-seat show, a short walk from your door." },
  { id: "profile", gapBefore: 0.5, text: "The agent profiles the crowd. Who they are, what they like, where they go." },
  { id: "pick", gapBefore: 0.5, text: "Then it opens your menu, and picks the one offer that speaks to them. Not your usual. The right one for tonight." },
  { id: "touch", gapBefore: 1.1, text: "It writes the campaign. You add your words, and the board rewrites itself." },
  { id: "approve", gapBefore: 0.6, text: "One tap, and it's ready." },
  { id: "receipt", gapBefore: 0.9, text: "The board at the door. A message to your regulars. A local ad. Nothing sent without you. Nothing charged." },
  { id: "board", gapBefore: 1.1, text: "Tonight, the crowd outside becomes customers inside." },
  { id: "other", gapBefore: 1.1, text: "Paris, New York. Any street with a crowd." },
  { id: "close1", gapBefore: 1.2, text: "Turnout. The right message, to the right people, at the right moment." },
  { id: "close2", gapBefore: 0.5, text: "Your marketing agent. Your call." },
];
const VOICE = process.env.VOICE ?? "en-US-AvaMultilingualNeural";
const RATE = process.env.RATE ?? "+0%";
mkdirSync(join(here, "out/voice"), { recursive: true });
const out = [];
for (const l of LINES) {
  const file = join(here, "out/voice", `${l.id}.mp3`);
  try { execFileSync(join(here, ".venv/bin/edge-tts"), ["--voice", VOICE, `--rate=${RATE}`, "--text", l.text, "--write-media", file], { stdio: "pipe" }); }
  catch (e) { console.error(l.id, String(e.stderr).split("\n").filter(Boolean).slice(-2).join(" | ")); process.exit(1); }
  const duration = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  out.push({ ...l, file, duration });
  console.log(l.id.padEnd(8), duration.toFixed(2) + "s");
}
writeFileSync(join(here, "out/voice/lines.json"), JSON.stringify(out, null, 2));
