// Generates one audio clip per voice-over line with edge-tts and writes out/voice/lines.json
// ({id, text, duration}). The recording script holds each shot at least as long as its line.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
export const LINES = [
  { id: "hook1", text: process.env.HOOK1V ?? "Tonight, twenty thousand people walk out of Madison Square Garden." },
  { id: "hook2", text: process.env.HOOK2V ?? "Two blocks from your bar." },
  { id: "radar1", text: "Turnout watches what happens around your place, all week." },
  { id: "radar2", text: "Concerts, games, theatre crowds, the rhythm of your street." },
  { id: "today", text: "Today, it picks the one that matters tonight. A real listing, a real time, a short walk from your door." },
  { id: "qloo", text: "Then it asks Qloo what this crowd likes, and checks it against your street." },
  { id: "pick", text: process.env.PICKV ?? "From your own menu, it picks the offer that fits. Tonight, happy hour beats the usual beer flight." },
  { id: "touch", text: "It writes the campaign. You put your words on it, and the board rewrites itself." },
  { id: "approve", text: "You approve. Nothing goes out without you." },
  { id: "receipt", text: "Chalkboard, WhatsApp to your regulars, a local ad. Prepared, not sent, nothing charged." },
  { id: "board", text: "Your board, by the door, tonight." },
  { id: "other", text: "Paris or New York. Any street with a crowd." },
  { id: "promise", text: "Turn the crowd outside into customers inside." },
  { id: "sign", text: "Prepared by Claude. Informed by Qloo. Your call." },
];
const VOICE = process.env.VOICE ?? "en-US-AndrewNeural";
mkdirSync(join(here, "out/voice"), { recursive: true });
const out = [];
for (const l of LINES) {
  const file = join(here, "out/voice", `${l.id}.mp3`);
  try { execFileSync(join(here, ".venv/bin/edge-tts"), ["--voice", VOICE, "--rate=-5%", "--text", l.text, "--write-media", file], { stdio: "pipe" }); }
  catch (e) { console.error(l.id, String(e.stderr).split("\n").filter(Boolean).slice(-2).join(" | ")); process.exit(1); }
  const duration = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString());
  out.push({ ...l, file, duration });
  console.log(l.id.padEnd(8), duration.toFixed(2) + "s");
}
writeFileSync(join(here, "out/voice/lines.json"), JSON.stringify(out, null, 2));
