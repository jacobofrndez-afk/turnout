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
// One clip per group of lines: the first line of a clip places the whole clip.
// Dead waits recorded by record.mjs (a slow server) are cut out with a short crossfade; everything after moves up.
const XF = 0.45;
const cuts = (tl.cuts ?? []).filter((c) => c.to - c.from > 0.3).sort((a, b) => a.from - b.from);
const shifted = (t) => t - cuts.filter((c) => c.to <= t).reduce((a, c) => a + (c.to - c.from) + XF, 0);
const clips = tl.marks.filter((m) => lines[m.id] && lines[m.id].first !== false).map((m) => ({ ...m, start: shifted(m.at) + 0.05, file: lines[m.id].file, dur: lines[m.id].groupDuration ?? lines[m.id].duration }));
const musicDir = join(here, "music");
const bed = join(OUT, "music-bed.wav");
const music = (existsSync(musicDir) ? readdirSync(musicDir).filter((f) => /\.(mp3|m4a|wav|aac)$/i.test(f)).map((f) => join(musicDir, f))[0] : undefined) ?? (existsSync(bed) ? bed : undefined);
const args = ["-y", "-i", webm];
for (const c of clips) args.push("-i", c.file);
if (music) args.push("-stream_loop", "-1", "-i", music);
const end = shifted(tl.endAt);
let f = `[0:v]setpts=PTS*${k.toFixed(5)},trim=start=${lead.toFixed(3)},setpts=PTS-STARTPTS,format=yuv420p[v0];`;
if (cuts.length) {
  // segments between cuts, chained with crossfades
  const bounds = [0, ...cuts.flatMap((c) => [c.from, c.to]), tl.endAt + 1];
  const segs = [];
  for (let i = 0; i < bounds.length; i += 2) segs.push([bounds[i], bounds[i + 1]]);
  f += `[v0]split=${segs.length}` + segs.map((_, i) => `[p${i}]`).join("") + ";";
  f += segs.map(([a, b], i) => `[p${i}]trim=start=${a.toFixed(3)}:end=${b.toFixed(3)},setpts=PTS-STARTPTS[s${i}]`).join(";") + ";";
  let acc = segs[0][1] - segs[0][0], prev = "s0";
  segs.slice(1).forEach(([a, b], j) => { const out = j === segs.length - 2 ? "v" : `x${j + 1}`; f += `[${prev}][s${j + 1}]xfade=transition=fade:duration=${XF}:offset=${(acc - XF).toFixed(3)}[${out}];`; acc += (b - a) - XF; prev = out; });
  f = f.replace(/\[v\];$/, "[vx];") + `[vx]fade=t=in:st=0:d=0.6[v];`;
} else f += `[v0]fade=t=in:st=0:d=0.6[v];`;   // no fade out: the film ends on its last image
f += clips.map((c, i) => `[${i + 1}:a]aresample=48000,afade=t=in:d=0.02,afade=t=out:st=${Math.max(0, c.dur - 0.05).toFixed(3)}:d=0.05,adelay=${Math.round(c.start * 1000)}:all=1[a${i}]`).join(";") + ";";
f += clips.map((_, i) => `[a${i}]`).join("") + `amix=inputs=${clips.length}:normalize=0:dropout_transition=0,volume=1.5[voice]`;
if (music) {
  // Gentle ducking: slow attack and release so the music breathes with the voice instead of pumping.
  f += `;[${clips.length + 1}:a]aresample=48000,atrim=0:${end.toFixed(2)},volume=${music === bed ? 0.4 : 0.14},afade=t=in:st=0:d=1.5,afade=t=out:st=${(end - 2.5).toFixed(2)}:d=2.5[m];`;
  f += `[voice]asplit=2[vo][sc];[m][sc]sidechaincompress=threshold=0.06:ratio=2.2:attack=250:release=1800:knee=4[md];[vo][md]amix=inputs=2:normalize=0:dropout_transition=0[mix]`;
} else f += `;[voice]anull[mix]`;
args.push("-filter_complex", f, "-map", "[v]", "-map", "[mix]", "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-r", "30", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "192k", "-t", end.toFixed(2), join(OUT, "turnout-demo-voice.mp4"));
execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });
console.log("mixed", clips.length, "clips, retime", k.toFixed(3), "lead", lead.toFixed(2) + "s", "cuts", cuts.map((c) => (c.to - c.from).toFixed(1) + "s").join("+") || "none", music ? "with music" : "no music", "->", join(OUT, "turnout-demo-voice.mp4"));
