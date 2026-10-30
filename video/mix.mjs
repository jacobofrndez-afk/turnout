// Lays the narration on the recording. The screencast clock runs a few percent slow, so the
// video is first retimed to the script clock (setpts), then each line is placed at its planned
// moment, or at the real one when the shot came late. A track in video/music/ is ducked under
// the voice. Output: out/turnout-demo-voice.mp4.
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, "out");
const webm = join(OUT, "turnout-demo.webm");
const tl = JSON.parse(readFileSync(join(OUT, "timeline.json"), "utf8"));
const lines = Object.fromEntries(JSON.parse(readFileSync(join(OUT, "voice/lines.json"), "utf8")).map((l) => [l.id, l]));
const vdur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", webm]).toString());
const lead = tl.lead ?? 0;                     // recording before the narration clock started
const k = (tl.endAt + lead) / vdur;            // retime factor, about 0.93
const clips = tl.marks.filter((m) => lines[m.id]).map((m) => ({ ...m, start: m.at + 0.05, file: lines[m.id].file }));
const musicDir = join(here, "music");
const bed = join(OUT, "music-bed.wav");
const music = (existsSync(musicDir) ? readdirSync(musicDir).filter((f) => /\.(mp3|m4a|wav|aac)$/i.test(f)).map((f) => join(musicDir, f))[0] : undefined) ?? (existsSync(bed) ? bed : undefined);
const args = ["-y", "-i", webm];
for (const c of clips) args.push("-i", c.file);
if (music) args.push("-stream_loop", "-1", "-i", music);
const end = tl.endAt;
let f = `[0:v]setpts=PTS*${k.toFixed(5)},trim=start=${lead.toFixed(3)},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.6,format=yuv420p[v];`;   // no fade out: the film ends on its last image
f += clips.map((c, i) => `[${i + 1}:a]aresample=48000,adelay=${Math.round(c.start * 1000)}:all=1[a${i}]`).join(";") + ";";
f += clips.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${clips.length}:normalize=0:dropout_transition=0,volume=1.5[voice]`;
if (music) {
  f += `;[${clips.length + 1}:a]aresample=48000,atrim=0:${end.toFixed(2)},volume=${music === bed ? 0.5 : 0.16},afade=t=in:st=0:d=1.5,afade=t=out:st=${(end - 2.5).toFixed(2)}:d=2.5[m];`;
  f += `[voice]asplit=2[vo][sc];[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=40:release=700[md];[vo][md]amix=inputs=2:normalize=0:dropout_transition=0[mix]`;
} else f += `;[voice]anull[mix]`;
args.push("-filter_complex", f, "-map", "[v]", "-map", "[mix]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-r", "30", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "192k", "-t", end.toFixed(2), join(OUT, "turnout-demo-voice.mp4"));
execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
console.log("mixed", clips.length, "lines, retime", k.toFixed(3), "lead", lead.toFixed(2) + "s", music ? "with music" : "no music", "->", join(OUT, "turnout-demo-voice.mp4"));
