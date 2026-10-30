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
print("bed", round(total, 1), "s")
