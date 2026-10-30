// Generates one audio clip per voice-over line with edge-tts and writes out/voice/lines.json
// ({id, text, duration}). The recording script holds each shot at least as long as its line.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
export const LINES = [
  { id: "hook1", text: "Every night, a crowd walks past your door." },
  { id: "hook2", text: "Concerts, games, shows. Thousands of people, a few blocks away." },
  { id: "radar1", text: "Turnout is your marketing agent. It watches every event around your place, all week." },
  { id: "radar2", text: "And spots the moments that can fill your room." },
  { id: "today", text: process.env.TODAYV ?? "Tonight's moment: a twenty-thousand-seat show, a short walk from your door." },
  { id: "profile", text: "The agent profiles that crowd. Who they are, what they like, where they go." },
  { id: "pick", text: "Then it picks the one offer on your menu that speaks to them. Not your usual. The right one for tonight." },
  { id: "touch", text: "It writes the campaign. You add your words. The board rewrites itself." },
  { id: "approve", text: "One tap to approve. Nothing goes out without you." },
  { id: "receipt", text: "Chalkboard, a message to your regulars, a local ad. Ready. Not sent. Nothing charged." },
  { id: "board", text: "Your board, at the door, tonight." },
  { id: "other", text: "Paris, New York, any street with a crowd." },
  { id: "promise", text: "The right message, to the right people, at the right moment." },
  { id: "promise2", text: "Turn the crowd outside into customers inside." },
  { id: "sign", text: "Turnout. Your marketing agent. Your call." },
];
const VOICE = process.env.VOICE ?? "en-US-AvaMultilingualNeural";
mkdirSync(join(here, "out/voice"), { recursive: true });
const out = [];
for (const l of LINES) {
  const file = join(here, "out/voice", `${l.id}.mp3`);
  try { execFileSync(join(here, ".venv/bin/edge-tts"), ["--voice", VOICE, "--rate=+4%", "--text", l.text, "--write-media", file], { stdio: "pipe" }); }
  catch (e) { console.error(l.id, String(e.stderr).split("\n").filter(Boolean).slice(-2).join(" | ")); process.exit(1); }
  const duration = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  out.push({ ...l, file, duration });
  console.log(l.id.padEnd(8), duration.toFixed(2) + "s");
}
writeFileSync(join(here, "out/voice/lines.json"), JSON.stringify(out, null, 2));
