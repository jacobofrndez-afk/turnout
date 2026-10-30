// One narration, told as one night. Each segment is generated with edge-tts and measured; the
// planned pauses (gapBefore, seconds) make the track breathe at page changes. Output:
// out/voice/<id>.mp3 and out/voice/lines.json ({id, text, gapBefore, duration}).
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));

export const LINES = [
  { id: "hook1", gapBefore: 1.0, text: "Every night, a crowd walks past your door." },
  { id: "hook2", gapBefore: 0.25, text: process.env.HOOK2V ?? "Tonight: twenty thousand people, two blocks away, out at ten forty-five." },
  { id: "small", gapBefore: 0.25, text: "Or eighty people out of a jazz club. Every crowd counts." },
  { id: "hook3", gapBefore: 0.25, text: "Most places never see it coming." },
  { id: "radar1", gapBefore: 0.6, text: "Turnout does. It's your marketing agent. It watches every event around you, big or small." },
  { id: "radar2", gapBefore: 0.25, text: "And above all, it knows who is coming: what kind of people, and what they love." },
  { id: "today", gapBefore: 0.6, text: process.env.TODAYV ?? "Tonight, ten forty-five: a twenty-thousand-seat show lets out, a short walk from your door." },
  { id: "profile", gapBefore: 0.25, text: "The agent profiles that exact crowd. Who they are, what they love, the places they already go to around you." },
  { id: "pick", gapBefore: 0.25, text: "Then it opens your menu and picks the one offer that speaks to them, at that hour. Not your usual special. The right one, for them, tonight." },
  { id: "touch", gapBefore: 0.6, text: "It writes the campaign. Add your words, and the board rewrites itself." },
  { id: "approve", gapBefore: 0.3, text: "Everything is ready. You just approve." },
  { id: "receipt", gapBefore: 0.5, text: "The board at your door. A message to your regulars. A local ad within a few blocks. Nothing sent without you. Nothing charged." },
  { id: "board", gapBefore: 0.6, text: "Right place. Right hour. Right people. Tonight, the crowd outside becomes customers inside." },
  { id: "close1", gapBefore: 0.7, text: "Turnout. The right message, to the right people, at the right moment." },
  { id: "close2", gapBefore: 0.3, text: "Your marketing agent. Your call." },
];
const VOICE = process.env.VOICE ?? "en-US-EmmaMultilingualNeural";
const RATE = process.env.RATE ?? "+14%";
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
