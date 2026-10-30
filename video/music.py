"""Generates out/music-bed.wav: a warm pad over a soft pulse, used under the voice when video/music/ is empty."""
import json, math, os, struct, wave
import numpy as np
here = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(here, "out")
try:
    tl = json.load(open(os.path.join(out, "timeline.json")))
    total = tl["endAt"] + 2.0
    logo_at = tl.get("logoAt") or 0
except Exception:
    total, logo_at = 96.0, 0
sr = 48000
n = int(total * sr)
t = np.arange(n) / sr
bpm = 92.0
beat = 60.0 / bpm
bar = beat * 4
# A minor, F, C, G: warm and forward-moving
chords = [[57, 60, 64, 69], [53, 57, 60, 65], [55, 60, 64, 67], [55, 59, 62, 67]]
f = lambda m: 440.0 * 2 ** ((m - 69) / 12)
pad = np.zeros(n)
pos = 0.0
i = 0
while pos < total:
    chord = chords[i % len(chords)]
    a, b = int(pos * sr), int(min(total, pos + bar) * sr)
    seg = t[a:b] - pos
    env = np.minimum(1, seg / 0.9) * np.minimum(1, (bar - seg + 0.3) / 0.9)
    for midi in chord:
        fr = f(midi) / 2
        for det in (-0.6, 0.6):
            pad[a:b] += 0.11 * env * (np.sin(2 * np.pi * (fr + det) * t[a:b]) + 0.35 * np.sin(2 * np.pi * 2 * (fr + det) * t[a:b] + 0.3) + 0.08 * np.sin(2 * np.pi * 3 * (fr + det) * t[a:b]))
    pos += bar
    i += 1
# slow breathing on the pad
pad *= 0.86 + 0.14 * np.sin(2 * np.pi * t / 9.0)
# no drum: a soft pluck every other beat keeps the pulse without a beat that would stutter under the voice
pulse = np.zeros(n)
k = 0
while k * beat < total:
    a = int(k * beat * sr)
    if k % 2 == 0:
        chord = chords[int(k * beat // bar) % len(chords)]
        fr = f(chord[(k // 2) % len(chord)] + 12)
        L2 = int(0.6 * sr); seg2 = t[:L2]
        pluck = (np.sin(2 * np.pi * fr * seg2) + 0.3 * np.sin(2 * np.pi * 2 * fr * seg2)) * np.exp(-seg2 * 4.5) * np.minimum(1, seg2 / 0.01)
        pulse[a:a + L2] += 0.045 * pluck[: min(L2, n - a)]
    k += 1
# the close: a bright chord rises over 2.4 s to the moment the logo completes, rings for a beat, then settles
swell = np.zeros(n)
if logo_at:
    rise, hold, decay = 2.4, 0.5, 4.2
    t0 = logo_at - rise
    env = np.where(t < t0, 0, np.where(t < logo_at, ((t - t0) / rise) ** 2, np.where(t < logo_at + hold, 1, np.exp(-(t - logo_at - hold) / (decay / 3)))))
    for midi in [69, 72, 76, 81, 88]:
        fr = f(midi)
        swell += 0.07 * env * (np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(2 * np.pi * 2 * fr * t))
    swell *= 0.9 + 0.1 * np.sin(2 * np.pi * 5.5 * t)
# the bed keeps its own level; the swell is added on top, capped so the sum never clips
base = pad + pulse
base /= np.max(np.abs(base)) + 1e-9
base *= 0.6
if np.max(np.abs(swell)) > 0:
    swell = swell / np.max(np.abs(swell)) * 0.36
mix = base + swell
mix *= np.minimum(1, t / 2.5)
mix *= np.minimum(1, np.maximum(0, (total - t) / 4.5))
mix = np.clip(mix, -0.98, 0.98)
data = (mix * 32767).astype(np.int16)
with wave.open(os.path.join(out, "music-bed.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(data.tobytes())
# Sonar: pings and whooshes at the moments record.mjs logged, moved up by the cuts the mix makes.
events = tl.get("sfx", []) if isinstance(globals().get("tl"), dict) else []
cuts = sorted([c for c in (tl.get("cuts", []) if events else []) if c["to"] - c["from"] > 0.3], key=lambda c: c["from"])
def shifted(x):
    return x - sum((c["to"] - c["from"]) + 0.45 for c in cuts if c["to"] <= x)
sfx = np.zeros(n)
def ping(at, freq=1046.5, decay=0.9, gain=0.5):
    a = int(at * sr); L = int(decay * 4 * sr); seg = t[:L]
    tone = (np.sin(2 * np.pi * freq * seg) + 0.35 * np.sin(2 * np.pi * freq * 2.01 * seg) + 0.12 * np.sin(2 * np.pi * freq * 3.0 * seg)) * np.exp(-seg / decay * 3) * np.minimum(1, seg / 0.004)
    for d, g in ((0.19, 0.4), (0.38, 0.16)):
        k = int(d * sr); echo = np.zeros(L); echo[k:] = tone[: L - k] * g; tone = tone + echo
    end = min(L, n - a)
    if 0 <= a < n and end > 0:
        sfx[a:a + end] += gain * tone[:end]
def whoosh(at, dur=1.4, gain=0.3):
    a = int(at * sr); L = int(dur * sr); seg = t[:L]
    noise = np.random.default_rng(7).standard_normal(L)
    band = np.convolve(noise, np.ones(10) / 10, mode="same") - np.convolve(noise, np.ones(140) / 140, mode="same")
    env = np.sin(np.pi * np.minimum(1, seg / dur)) ** 2 * (1 - 0.45 * seg / dur)
    end = min(L, n - a)
    if 0 <= a < n and end > 0:
        sfx[a:a + end] += gain * band[:end] * env[:end]
for e in events:
    at = shifted(e["at"])
    if e["kind"] == "ping": ping(at)
    elif e["kind"] == "ping-soft": ping(at, 1318.5, 0.6, 0.26)
    elif e["kind"] == "ping-deep": ping(at, 523.25, 1.5, 0.6)
    elif e["kind"] == "whoosh": whoosh(at)
sfx = np.clip(sfx, -0.95, 0.95)
with wave.open(os.path.join(out, "sfx.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((sfx * 32767).astype(np.int16).tobytes())
print("bed", round(total, 1), "s,", len(events), "sonar events")
