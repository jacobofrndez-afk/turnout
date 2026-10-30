// Lays the voice clips over the recording at the moments in out/timeline.json and writes out/turnout-demo-voice.mp4.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "out");
const video = join(OUT, "turnout-demo.mp4");
const tl = JSON.parse(readFileSync(join(OUT, "timeline.json"), "utf8"));
const lines = Object.fromEntries(JSON.parse(readFileSync(join(OUT, "voice/lines.json"), "utf8")).map((l) => [l.id, l]));
const vdur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]).toString());
// The screencast clock runs a few percent slower than the script clock (a 109 s script gives a
// 118 s file), uniformly as far as the frames show; scale the moments so the end of both match.
const scale = vdur / tl.endAt;
const clips = tl.marks.filter((m) => lines[m.id]).map((m) => ({ ...m, at: Math.max(0, m.at * scale + 0.1), file: lines[m.id].file }));
const args = ["-y", "-i", video];
for (const c of clips) args.push("-i", c.file);
const chains = clips.map((c, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(c.at * 1000)}:all=1[a${i}]`).join(";");
const mix = `${chains};${clips.map((_, i) => `[a${i}]`).join("")}amix=inputs=${clips.length}:normalize=0:dropout_transition=0,volume=1.6[mix]`;
args.push("-filter_complex", mix, "-map", "0:v", "-map", "[mix]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", join(OUT, "turnout-demo-voice.mp4"));
execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
console.log("mixed", clips.length, "clips, clock scale", scale.toFixed(3), "->", join(OUT, "turnout-demo-voice.mp4"));
