#!/usr/bin/env node
/**
 * Offline test for mood.js. Emulates the browser AnalyserNode (Blackman window,
 * |X|/N magnitude, smoothingTimeConstant) and runs MoodDetector + MoodDecider.
 *
 *   node tools/mood-test.js                 # synthetic profiles (joy, bowl, love, energy, drone, silence)
 *   node tools/mood-test.js song.mp3 ...    # real files (needs ffmpeg on PATH)
 *   node tools/mood-test.js --trace song.mp3   # print a line every 2 s
 */
const { execFileSync } = require("child_process");
const path = require("path");
const { MoodDetector, MoodDecider, MOOD_KEYS } = require("../mood.js");

const EVERY = Number((process.argv.find((a) => a.startsWith("--every=")) || "--every=2").split("=")[1]);
const SR = 48000, FFT = 2048, HOP = 0.05, SMOOTH = 0.2;

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

const win = new Float64Array(FFT);
for (let i = 0; i < FFT; i++) {
  const a = 0.16, x = (2 * Math.PI * i) / FFT;
  win[i] = (1 - a) / 2 - 0.5 * Math.cos(x) + (a / 2) * Math.cos(2 * x);
}

function run(samples, label, trace) {
  const det = new MoodDetector({ sampleRate: SR, fftSize: FFT });
  const dec = new MoodDecider({ initial: "calm" });
  const smoothMag = new Float64Array(FFT / 2);
  const freqDb = new Float32Array(FFT / 2);
  const re = new Float64Array(FFT), im = new Float64Array(FFT);
  const hop = Math.round(HOP * SR);
  const counts = Object.fromEntries(MOOD_KEYS.map((k) => [k, 0]));
  const switches = [];
  let n = 0, lastPrint = -2, confSum = 0;
  for (let end = FFT; end <= samples.length; end += hop) {
    const t = end / SR;
    const time = samples.subarray(end - FFT, end);
    for (let i = 0; i < FFT; i++) { re[i] = time[i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let i = 0; i < FFT / 2; i++) {
      const m = Math.hypot(re[i], im[i]) / FFT;
      smoothMag[i] = SMOOTH * smoothMag[i] + (1 - SMOOTH) * m;
      freqDb[i] = 20 * Math.log10(smoothMag[i] + 1e-12);
    }
    const st = det.analyze(freqDb, time, t);
    const d = dec.update(st, t);
    if (d.switched) switches.push(`${t.toFixed(1)}s→${d.current}`);
    if (t > 3 && !st.silent) { counts[d.current] = (counts[d.current] || 0) + 1; n++; confSum += d.conf; }
    if (trace && t - lastPrint >= EVERY) {
      lastPrint = t;
      const f = st.features.map((x) => x.toFixed(2)).join(" ");
      console.log(`  ${t.toFixed(1).padStart(6)}s  lvl ${st.levelDb.toFixed(0).padStart(4)}dB  cen ${st.centroidHz.toFixed(0).padStart(5)}Hz  ons ${st.onsetRate.toFixed(2)}/s flat ${st.flatDb.toFixed(0)} jump ${st.jumpDb.toFixed(2)} bass ${st.bassShare.toFixed(2)}  [E B O S T L M P] ${f}  raw ${st.silent ? "(silent)" : st.top + " " + (st.conf * 100).toFixed(0) + "%"}  smooth ${d.top} ${(d.conf * 100).toFixed(0)}%  → ${d.current}`);
    }
  }
  const dist = Object.entries(counts).filter(([, c]) => c).sort((a, b) => b[1] - a[1])
    .map(([k, c]) => `${k} ${((100 * c) / Math.max(1, n)).toFixed(0)}%`).join(", ");
  console.log(`${label.padEnd(28)} palette time: ${dist || "(silent)"} | avg conf ${(100 * confSum / Math.max(1, n)).toFixed(0)}% | switches: ${switches.length} ${switches.slice(0, 6).join(" ")}`);
}

// ---------- synthetic profiles ----------
function synth(seconds, fn) {
  const out = new Float32Array(Math.round(seconds * SR));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SR, i);
  return out;
}
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
const env = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));
const note = (t, f, harm = 6, bright = 0.6) => {
  let s = 0;
  for (let h = 1; h <= harm; h++) s += Math.sin(2 * Math.PI * f * h * t) * Math.pow(bright, h - 1) / h;
  return s;
};

const profiles = {
  // Joy: 124 bpm, major chords in mid-high register, kick + hats + claps, bright
  "synthetic JOY (pop 124bpm)": synth(30, (t) => {
    const beat = 60 / 124, b = t % beat, e8 = t % (beat / 2);
    const chordIdx = Math.floor(t / (beat * 4)) % 4;
    const roots = [523.25, 392.0, 440.0, 349.23][chordIdx];
    const chord = (note(t, roots, 8, 0.75) + note(t, roots * 1.26, 8, 0.75) + note(t, roots * 1.5, 8, 0.75)) * 0.09 * (0.6 + 0.4 * env(e8, 0.005, 0.18));
    const kick = Math.sin(2 * Math.PI * 55 * b * (1 + 3 * Math.exp(-b * 30))) * env(b, 0.002, 0.12) * 0.5;
    const hat = rnd() * env(e8, 0.001, 0.03) * 0.18;
    const clap = (Math.floor(t / beat) % 2 === 1) ? rnd() * env(b, 0.002, 0.08) * 0.25 : 0;
    const melody = note(t, [1046.5, 1174.7, 1318.5, 1568][Math.floor(t / (beat / 2)) % 4], 5, 0.6) * env(e8, 0.01, 0.15) * 0.08;
    return chord + kick + hat + clap + melody;
  }),
  // Energy: 150 bpm, dense distorted saw bass, 16th hats, loud
  "synthetic ENERGY (150bpm)": synth(30, (t) => {
    const beat = 60 / 150, b = t % beat, s16 = t % (beat / 4);
    const saw = (f) => 2 * ((t * f) % 1) - 1;
    const bass = Math.tanh(3 * saw(82.4) * env(t % (beat / 2), 0.003, 0.2)) * 0.3;
    const lead = Math.tanh(2 * (saw(659) + saw(661))) * 0.12;
    const kick = Math.sin(2 * Math.PI * 50 * b * (1 + 4 * Math.exp(-b * 35))) * env(b, 0.002, 0.1) * 0.7;
    const hat = rnd() * env(s16, 0.001, 0.025) * 0.3;
    const snare = (Math.floor(t / beat) % 2 === 1) ? rnd() * env(b, 0.001, 0.1) * 0.45 : 0;
    return bass + lead + kick + hat + snare;
  }),
  // Love: soft piano, ~70 bpm, one note/chord per beat, mid-low register, quiet
  "synthetic LOVE (soft piano)": synth(30, (t) => {
    const beat = 60 / 70, b = t % beat, i = Math.floor(t / beat);
    const mel = [261.6, 329.6, 392.0, 349.2, 293.7, 329.6, 261.6, 220.0][i % 8];
    const bassN = [130.8, 110.0, 87.3, 98.0][Math.floor(i / 2) % 4];
    return (rnd() * env(b, 0.001, 0.012) * 0.03 + note(t, mel * 1.5, 10, 0.6) * env(b, 0.008, 0.9) * 0.08 + note(t, bassN, 8, 0.5) * env(t % (beat * 2), 0.01, 1.6) * 0.07);
  }),
  // Singing bowl: inharmonic partials, struck every 12 s, long decay, beating
  "synthetic BOWL (struck 12s)": synth(48, (t) => {
    const tt = t % 12, f0 = 220;
    const parts = [[1, 1, 9], [2.71, 0.5, 6], [5.15, 0.25, 4], [8.3, 0.12, 2.5]];
    let s = 0;
    for (const [r, a, d] of parts) s += a * Math.sin(2 * Math.PI * f0 * r * t) * (1 + 0.3 * Math.sin(2 * Math.PI * 1.3 * t)) * env(tt, 0.004, d);
    return s * 0.15 + rnd() * 0.0008; // + room noise
  }),
  // Drone / harmonium + tanpura-like sustain: steady, tonal, slow
  "synthetic DRONE (sustained)": synth(30, (t) => (note(t, 130.8, 10, 0.7) + note(t, 196, 10, 0.7) * 0.6) * 0.06 * (1 + 0.1 * Math.sin(2 * Math.PI * 0.2 * t)) + rnd() * 0.0008),
  // Sad: slow minor piano (A minor, 56 bpm), low-mid register, quiet, sparse
  "synthetic SAD (minor piano)": synth(36, (t) => {
    const beat = 60 / 56, b = t % beat, i = Math.floor(t / beat);
    const mel = [440.0, 392.0, 349.2, 329.6, 293.7, 329.6, 261.6, 246.9][i % 8];
    const bassN = [110.0, 87.3, 98.0, 82.4][Math.floor(i / 2) % 4]; // Am F G Em
    const third = [130.8, 110.0, 123.5, 98.0][Math.floor(i / 2) % 4];
    return (rnd() * env(b, 0.001, 0.01) * 0.015 + note(t, mel, 8, 0.55) * env(b, 0.01, 1.1) * 0.06 +
      (note(t, bassN, 8, 0.5) + note(t, third, 6, 0.5) * 0.6) * env(t % (beat * 2), 0.02, 2.2) * 0.05);
  }),
  // Deep pads (release): dark, quiet, very slow
  "synthetic RELEASE (dark pad)": synth(30, (t) => (note(t, 65.4, 4, 0.3) + note(t, 98, 4, 0.3) * 0.7 + note(t, 77.8, 4, 0.3) * 0.5) * 0.035 * (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.08 * t)) + rnd() * 0.0006),
  // Om / mantra-like: held vowel drones with sparse syllable attacks (live chant approximation)
  "synthetic OM (mantra chant)": synth(36, (t) => {
    const syl = 2.4, tt = t % syl; // ~ syllable every 2.4s
    const f0 = 146.8; // D3 drone
    const vowel = (note(t, f0, 8, 0.65) + note(t, f0 * 2, 6, 0.55) * 0.45 + note(t, f0 * 3, 4, 0.4) * 0.2)
      * (0.55 + 0.45 * Math.min(1, tt / 0.08)) * Math.exp(-Math.max(0, tt - 1.6) / 1.1);
    const attack = rnd() * env(tt, 0.002, 0.04) * 0.04; // consonant burst
    return vowel * 0.11 + attack + rnd() * 0.0006;
  }),
  // Silence / room tone
  "synthetic SILENCE (room)": synth(10, () => rnd() * 0.0005),
};

/** Feature trajectory only (for tools/mood-suite.js): [{t, f, silent, warm}] every hop. */
function frames(samples) {
  const det = new MoodDetector({ sampleRate: SR, fftSize: FFT });
  const smoothMag = new Float64Array(FFT / 2), freqDb = new Float32Array(FFT / 2);
  const re = new Float64Array(FFT), im = new Float64Array(FFT);
  const hop = Math.round(HOP * SR), out = [];
  for (let end = FFT; end <= samples.length; end += hop) {
    const t = end / SR, time = samples.subarray(end - FFT, end);
    for (let i = 0; i < FFT; i++) { re[i] = time[i] * win[i]; im[i] = 0; }
    fft(re, im);
    for (let i = 0; i < FFT / 2; i++) {
      smoothMag[i] = SMOOTH * smoothMag[i] + (1 - SMOOTH) * Math.hypot(re[i], im[i]) / FFT;
      freqDb[i] = 20 * Math.log10(smoothMag[i] + 1e-12);
    }
    const st = det.analyze(freqDb, time, t);
    out.push({ t, f: st.features.slice(), silent: st.silent, warm: st.warm });
  }
  return out;
}
function decode(f) {
  const buf = execFileSync("ffmpeg", ["-v", "error", "-i", f, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
  return new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
}
module.exports = { profiles, frames, decode, run };
if (require.main !== module) return;

// ---------- main ----------
const args = process.argv.slice(2);
const trace = args.includes("--trace");
const files = args.filter((a) => !a.startsWith("--"));
if (!files.length) {
  for (const [name, s] of Object.entries(profiles)) run(s, name, trace);
} else {
  for (const f of files) {
    run(decode(f), path.basename(f), trace);
  }
}
