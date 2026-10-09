/**
 * mood.js — approximate SONG mood from live audio. Zero dependencies, offline.
 *
 * Pipeline (every ~50 ms "hop"):
 *   AnalyserNode (float dB spectrum + time samples)
 *     → frame features: loudness, spectral centroid, spectral flux, flatness, bass share, chroma
 *     → window features (last ~2–6 s): E energy, B brightness, O onset rate,
 *       S steadiness, T tonality, L low/bass weight, M major-ness, P pitch motion   (all 0..1)
 *     → per-mood weighted nearest-prototype scores for 8 emotions → softmax probabilities
 *   MoodDecider adds smoothing + hysteresis so the palette doesn't flicker.
 *
 * This is a HEURISTIC, not a trained emotion model. It hears "how the sound
 * behaves" (loud/bright/busy/steady/tonal/bassy), and maps that to a mood.
 * Singing bowls → usually Spiritual or Calm. Tune PROTOTYPES below, or teach
 * them live in the app with Shift+1..8 while a reference song plays.
 *
 * Works in the browser (window.MoodDetector / window.MoodDecider) and in Node
 * (module.exports) so it can be tested offline against audio files.
 */
(function (root) {
  "use strict";

  // Order matches hotkeys in app.js: 1..8, then 9 = Sad, 0 = Wonder, - = Intensity (EMOTIONS keys 9, 10, 11).
  const MOOD_KEYS = ["joy", "calm", "love", "release", "ground", "clarity", "spirit", "energy", "sad", "wonder", "intensity"];

  // Feature vector order: [E, B, O, S, T, L]
  //   E energy (loudness)      B brightness (spectral centroid)
  //   O onset rate (busy-ness) S steadiness (sustain, few level jumps)
  //   T tonality (pure tones vs noise)   L low/bass weight
  //   M major-ness (0 minor/sad … 1 major/bright harmony; 0.5 = unclear)
  //   P pitch motion (0 one held pitch: bowl/drone … 1 melody/chords moving)
  const FEATURE_NAMES = ["energy", "bright", "onsets", "steady", "tonal", "low", "major", "motion"];
  const FEATURE_WEIGHTS = [0.55, 1.0, 1.7, 0.9, 0.8, 0.8, 0.9, 1.2]; // energy weighted low: depends on mic gain
  const NF = FEATURE_NAMES.length;

  // Krumhansl–Kessler key profiles (C major / C minor); rotated for all 12 keys.
  const KK_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const KK_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  // Where each mood "lives" in feature space. Teach live with Shift+1..8 to adapt to your room.
  // v3 (Oct 5 eve): + M (major/minor) + P (pitch motion). Tuned with tools/mood-suite.js (22 cases:
  // Happy Vibes, calm piano/ambient, piano + bowl clips, 4 CC0 sad pieces, 4 devotional songs, synthetics);
  // checked on 3 held-out clips (node tools/mood-suite.js --holdout).
  const DEFAULT_PROTOTYPES = {
    //         E     B     O     S     T     L     M     P
    // v5-balance: stop Joy/Calm monopoly on voice; spirit/mantra, release/minor, clarity, energy can win.
    joy:     [0.68, 0.62, 0.82, 0.18, 0.38, 0.34, 0.88, 0.58], // needs real rhythm + major — not soft singing
    calm:    [0.38, 0.22, 0.12, 0.78, 0.42, 0.18, 0.50, 0.38], // soft ambient pad only (quieter, fewer attacks)
    love:    [0.42, 0.28, 0.32, 0.70, 0.68, 0.40, 0.86, 0.48], // gentle pulse, warm MAJOR ballad / soft voice
    release: [0.48, 0.34, 0.34, 0.68, 0.62, 0.30, 0.22, 0.52], // MINOR + melodic motion (sad singing)
    ground:  [0.72, 0.14, 0.62, 0.42, 0.50, 0.78, 0.62, 0.32], // bass-heavy groove
    clarity: [0.46, 0.78, 0.24, 0.68, 0.88, 0.12, 0.68, 0.36], // bright pure sparse (chimes/flute/high voice)
    spirit:  [0.50, 0.30, 0.16, 0.84, 0.88, 0.32, 0.50, 0.22], // bowls / Om / mantra (allow light syllable motion)
    energy:  [0.78, 0.80, 0.90, 0.20, 0.30, 0.44, 0.72, 0.52], // dense punchy / loud busy singing
    sad:     [0.36, 0.24, 0.24, 0.72, 0.60, 0.30, 0.16, 0.38], // quiet, dark, slow, MINOR, little motion (sad piano)
    wonder:  [0.58, 0.52, 0.34, 0.70, 0.60, 0.42, 0.68, 0.46], // wide sustained tonal, major-ish; needs a build (rules)
    intensity: [0.86, 0.60, 0.80, 0.26, 0.10, 0.55, 0.36, 0.50], // loud, noisy / distorted, busy, darker harmony
  };

  // Per-mood emphasis on top of FEATURE_WEIGHTS: what matters most for recognising each mood.
  // e.g. sad (release) is mostly "minor + dark", whatever the tempo; spirit is mostly "one held pitch".
  //                 E    B    O    S    T    L    M    P
  const MOOD_EMPHASIS = {
    joy:     [0.70, 1.00, 1.55, 1.35, 0.65, 0.60, 1.00, 1.10], // MUST have rhythm; major alone is not joy
    calm:    [1.15, 0.95, 1.05, 1.25, 0.40, 0.90, 0.25, 0.80], // soft pads only; ignore pure-tone lock
    love:    [0.95, 0.90, 1.00, 0.85, 1.05, 1.20, 1.40, 1.05], // warm major ballad with pulse / soft voice
    release: [0.55, 0.80, 0.65, 0.90, 0.80, 0.75, 2.10, 1.15], // minor + melodic motion (sad singing)
    ground:  [0.80, 1.05, 1.00, 0.70, 0.90, 2.40, 0.85, 1.00], // bass weight
    clarity: [0.80, 1.80, 0.90, 1.00, 1.70, 1.40, 0.50, 0.75], // bright + pure dominates
    spirit:  [0.90, 0.75, 1.25, 1.45, 2.20, 0.95, 0.25, 1.55], // sustained tonal; allow light mantra motion
    energy:  [1.25, 1.20, 1.35, 1.55, 0.70, 0.70, 0.40, 1.00], // busy + bright + jumpy
    sad:     [0.95, 1.00, 1.30, 0.80, 0.70, 0.60, 2.10, 1.00], // minor + slow + dark
    wonder:  [0.80, 0.90, 1.10, 1.10, 1.00, 0.70, 0.80, 0.80], // the build itself is a rule (crescendo)
    intensity: [1.30, 0.80, 1.10, 1.00, 1.80, 0.80, 0.60, 0.70], // loud + noisy dominates
  };

  // Soft priors (pre-softmax). Joy/Calm were monopolizing voice → slightly down-weight them.
  const MOOD_PRIORS = {
    joy: 0.88, calm: 0.74, love: 1.08, release: 1.15,
    ground: 1.05, clarity: 1.18, spirit: 1.22, energy: 1.08,
    sad: 1.1, wonder: 1.0, intensity: 1.0,
  };

  // Chant detector tunables (sloka / mantra / Om recitation → Spiritual)
  const CHANT = { voicedProm: 2.75, range: 2.5, vr0: 0.1, vr1: 0.3, n0: 0.85, n1: 0.92, p0: 2.2, p1: 3.5, m0: 0.55, m1: 0.7, tau: 1.0, tauDown: 2.5, s0: 0.55, s1: 0.8, c0: 0.3, c1: 0.65, mix: 0.9, runNarrow: 0.93, runChant: 0.6, run0: 3, run1: 6, runMax: 20 };

  // AI plain-speech gate (see AIFusion): speech EMA s0..s1 opens it, any chant / mantra / singing memory closes it
  // room tone (low hum with nothing above 300 Hz): smoothed share of 300-4000 Hz energy, hf0..hf1 fades it out
  const ROOM = { tau: 2, hf0: 0.015, hf1: 0.04 };
  const SPEECH_GATE = { tau: 3, up: 1, down: 12, s0: 0.5, s1: 0.85, chant: 0.04, damp: 0.8, neutral: 0.35 };

  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const emaK = (dt, tau) => 1 - Math.exp(-dt / Math.max(1e-3, tau));

  class MoodDetector {
    constructor(opts = {}) {
      this.sampleRate = opts.sampleRate || 48000;
      this.fftSize = opts.fftSize || 2048;
      this.hopSec = opts.hopSec || 0.05;
      this.trimDb = opts.trimDb || 0; // operator input trim ([ / ] keys)
      this.silenceDb = opts.silenceDb ?? -58;
      this.temperature = opts.temperature || 0.14;
      this.prototypes = clonePrototypes(opts.prototypes || DEFAULT_PROTOTYPES);
      this.moodWeights = opts.moodWeights || MOOD_EMPHASIS;
      this.reset();
    }

    reset() {
      this.prevLogMag = null;
      this.lastT = null;
      this.fluxHist = []; // [t, flux]
      this.onsets = []; // times
      this.levelHist = []; // [t, dB]
      this.lastOnsetT = -1;
      this.win = null; // EMA window features {E,B,T,L,S,M,P}
      this.chromaLong = new Float64Array(12); // ~5 s harmonic center
      this.chromaHist = []; // [t, Float64Array(12)] last ~0.6 s
      this.activeSec = 0;
      // chant detector (sloka / mantra recitation): per-hop pitch + percussion history
      this.pitchHist = []; // [t, semitone | NaN when unvoiced]
      this.percHist = []; // times of percussive (kick / drum) hits
      this.prevLow = -140;
      this.chant = 0; // smoothed 0..1
      this.chantRun = 0; // seconds of steady recitation (very narrow pitch + strong chant); talking stays under ~2.5 s
      this.state = {
        silent: true,
        features: new Array(NF).fill(0),
        probs: Object.fromEntries(MOOD_KEYS.map((k) => [k, 1 / MOOD_KEYS.length])),
        top: null,
        conf: 0,
        levelDb: -120,
        onsetRate: 0,
        centroidHz: 0,
        warm: false,
        chant: 0,
        chantParts: null,
      };
    }

    /** Pitch of the main voice for this hop (harmonic sum on sqrt-magnitude, 80-520 Hz, 1/4 semitone grid).
     *  Returns {semi, prom}; prom = how much the best candidate stands out (voicing strength). */
    _pitch(freqDb, binHz) {
      const N = freqDb.length;
      const top = Math.min(N - 2, Math.ceil(3200 / binHz));
      const m = this._pm && this._pm.length === top + 2 ? this._pm : (this._pm = new Float32Array(top + 2));
      for (let i = 0; i <= top + 1; i++) { const db = freqDb[i] > -160 ? freqDb[i] : -160; m[i] = Math.pow(10, db / 40); }
      const at = (f) => { const x = f / binHz, i = Math.floor(x), r = x - i; return i + 1 > top ? 0 : m[i] + (m[i + 1] - m[i]) * r; };
      const scores = this._ps || (this._ps = new Float32Array(160));
      let best = -1e9, bestC = 0, sum = 0, n = 0;
      for (let c = 0; ; c++) {
        const f0 = 80 * Math.pow(2, c / 48);
        if (f0 > 520) break;
        let sc = 0;
        for (let k = 1; k * f0 < 3000; k++) sc += at(k * f0) - 0.6 * at((k - 0.5) * f0);
        scores[c] = sc;
        sum += Math.abs(sc); n++;
        if (sc > best) { best = sc; bestC = c; }
      }
      // parabolic refinement between quarter-semitone grid points
      let off = 0;
      if (bestC > 0 && bestC < n - 1) {
        const a = scores[bestC - 1], b = scores[bestC], c2 = scores[bestC + 1], den = a - 2 * b + c2;
        if (den < 0) off = Math.max(-0.5, Math.min(0.5, 0.5 * (a - c2) / den));
      }
      const prom = n && sum > 0 ? best / (sum / n) : 0;
      const f0 = 80 * Math.pow(2, (bestC + off) / 48);
      return { semi: 12 * Math.log2(f0 / 440) + 69, prom, f0 };
    }

    /** Chant-likeness 0..1 over the last ~4 s: mostly voiced, narrow pitch range around a reciting
     *  tone (2-3 notes, folded by octave), little kick / drum percussion. */
    _chantUpdate(freqDb, binHz, t, dt, silent) {
      const W = 4.0;
      if (!silent) {
        const { semi, prom, f0 } = this._pitch(freqDb, binHz);
        const voicedNow = prom > CHANT.voicedProm;
        this.pitchHist.push([t, voicedNow ? semi : NaN, prom]);
      }
      while (this.pitchHist.length && t - this.pitchHist[0][0] > W) this.pitchHist.shift();
      // kick / bass-drum hit: sub-bass (35-100 Hz) jumps > 6 dB in one hop and carries real weight
      {
        const a = Math.max(1, Math.floor(35 / binHz)), b = Math.ceil(100 / binHz);
        let sb = 0, all = 0;
        for (let i = a; i <= Math.ceil(4000 / binHz) && i < freqDb.length; i++) { const pw = Math.pow(10, (freqDb[i] > -160 ? freqDb[i] : -160) / 10); all += pw; if (i <= b) sb += pw; }
        const sbDb = 10 * Math.log10(sb + 1e-14);
        if (!silent && sbDb - this.prevLow > 6 && sb / (all + 1e-14) > 0.12
          && (!this.percHist.length || t - this.percHist[this.percHist.length - 1] > 0.15)) this.percHist.push(t);
        this.prevLow = sbDb;
      }
      while (this.percHist.length && t - this.percHist[0] > W) this.percHist.shift();
      const ph = this.pitchHist;
      let voiced = 0, promSum = 0;
      const hist = new Float64Array(24);
      for (const [, s, pr] of ph) {
        promSum += pr;
        if (Number.isNaN(s)) continue;
        voiced++;
        const pc = ((s % 12) + 12) % 12;
        const b = pc * 2; const b0 = Math.floor(b) % 24, fr = b - Math.floor(b);
        hist[b0] += 1 - fr; hist[(b0 + 1) % 24] += fr;
      }
      const vr = ph.length ? voiced / ph.length : 0;
      let narrow = 0;
      if (voiced >= 8) {
        let bi = 0, bv = -1;
        for (let b = 0; b < 24; b++) { const v = hist[(b + 23) % 24] * 0.5 + hist[b] + hist[(b + 1) % 24] * 0.5; if (v > bv) { bv = v; bi = b; } }
        const mode = bi / 2;
        let inside = 0;
        for (const [, s] of ph) {
          if (Number.isNaN(s)) continue;
          const d = ((((s - mode) % 12) + 18) % 12) - 6;
          if (Math.abs(d) <= CHANT.range) inside++;
        }
        narrow = inside / voiced;
      }
      // pitch steadiness inside notes: piano / keyboard notes sit dead still, a human voice wavers and glides
      let pairs = 0, still = 0, wob = 0;
      for (let i = 1; i < ph.length; i++) {
        const a = ph[i - 1][1], b = ph[i][1];
        if (Number.isNaN(a) || Number.isNaN(b)) continue;
        const d = Math.abs(b - a);
        if (d > 0.8) continue;
        pairs++; wob += d; if (d < 0.05) still++;
      }
      const stillFrac = pairs ? still / pairs : 0, wobble = pairs ? wob / pairs : 0;
      const percRate = this.percHist.length / W;
      const parts = { vr, narrow, percRate, stillFrac, wobble, prom: ph.length ? promSum / ph.length : 0 };
      // recitation keeps moving between syllables (chroma motion P high) but stays on 2-3 notes;
      // piano / pads / pop melodies spread wider, and pop / dance music has kick drums
      const P = this.win ? this.win.P : 0;
      const ss = (x, a, b) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
      const syllabic = ss(narrow, CHANT.n0, CHANT.n1) * ss(vr, CHANT.vr0, CHANT.vr1)
        * (1 - ss(percRate, CHANT.p0, CHANT.p1)) * ss(P, CHANT.m0, CHANT.m1)
        * (1 - ss(stillFrac, CHANT.s0, CHANT.s1));
      // long held vowels (Om / sustained mantra on one note): very narrow, strongly voiced, no drums
      const held = ss(narrow, 0.93, 0.98) * ss(vr, 0.6, 0.8) * (1 - ss(percRate, 0.3, 0.8)) * (1 - ss(P, 0.35, 0.55));
      parts.syl = syllabic; parts.held = held;
      const target = Math.max(syllabic, held) * (1 - (this.roomTone || 0));
      parts.target = target;
      if (!silent) this.chant += (target - this.chant) * emaK(dt, target > this.chant ? CHANT.tau : CHANT.tauDown);
      if (!silent) {
        const ok = narrow >= CHANT.runNarrow && this.chant >= CHANT.runChant;
        this.chantRun = Math.max(0, Math.min(CHANT.runMax, this.chantRun + (ok ? dt : -2 * dt)));
      }
      this.state.chant = this.chant;
      { const u = clamp01((this.chantRun - CHANT.run0) / (CHANT.run1 - CHANT.run0)); this.state.chantSteady = u * u * (3 - 2 * u); }
      this.state.chantParts = parts;
    }

    /**
     * @param {Float32Array} freqDb  analyser.getFloatFrequencyData output (length fftSize/2)
     * @param {Float32Array} time    analyser.getFloatTimeDomainData output (length fftSize)
     * @param {number} t             seconds (monotonic)
     */
    analyze(freqDb, time, t) {
      const dt = this.lastT == null ? this.hopSec : Math.min(0.5, Math.max(0.001, t - this.lastT));
      this.lastT = t;
      const N = freqDb.length;
      const binHz = this.sampleRate / this.fftSize;

      // --- loudness (RMS dBFS + operator trim)
      let ss = 0;
      for (let i = 0; i < time.length; i++) ss += time[i] * time[i];
      const rms = Math.sqrt(ss / time.length);
      const levelDb = 20 * Math.log10(rms + 1e-9) + this.trimDb;

      // --- spectrum features
      const loBin = Math.max(1, Math.floor(40 / binHz));
      const hiBin = Math.min(N - 1, Math.floor(10000 / binHz));
      const flatLo = Math.max(1, Math.floor(100 / binHz));
      const flatHi = Math.min(N - 1, Math.floor(6000 / binHz));
      const bassHi = Math.floor(160 / binHz); // kick / bass guitar / low drone; bowls mostly sit above

      let magSum = 0, wSum = 0, bassSum = 0;
      let logPowSum = 0, powSum = 0, flatN = 0;
      let flux = 0;
      const logMag = new Float32Array(N);
      for (let i = loBin; i <= hiBin; i++) {
        const db = freqDb[i] > -160 ? freqDb[i] : -160;
        const m = Math.pow(10, db / 20);
        magSum += m;
        wSum += m * i * binHz;
        if (i <= bassHi) bassSum += m;
        if (i >= flatLo && i <= flatHi) {
          const p = m * m + 1e-14;
          logPowSum += Math.log(p);
          powSum += p;
          flatN++;
        }
        // log-compressed magnitude for onset flux (relative to frame level)
        const lm = Math.log1p(1000 * m);
        logMag[i] = lm;
        if (this.prevLogMag) {
          const d = lm - this.prevLogMag[i];
          if (d > 0) flux += d;
        }
      }
      this.prevLogMag = logMag;
      flux /= hiBin - loBin + 1;

      // --- chroma (pitch-class energy) from spectral peaks 80 Hz–2.5 kHz
      const chroma = new Float64Array(12);
      const cLo = Math.max(2, Math.floor(80 / binHz)), cHi = Math.min(N - 2, Math.floor(2500 / binHz));
      let cMax = -200;
      for (let i = cLo; i <= cHi; i++) if (freqDb[i] > cMax) cMax = freqDb[i];
      for (let i = cLo; i <= cHi; i++) {
        const db = freqDb[i];
        if (db < cMax - 40 || db <= freqDb[i - 1] || db < freqDb[i + 1]) continue; // local peaks only
        // parabolic interpolation for a better peak frequency
        const a = freqDb[i - 1], b = db, c = freqDb[i + 1];
        const den = a - 2 * b + c;
        const off = den !== 0 ? 0.5 * (a - c) / den : 0;
        const f = (i + off) * binHz;
        const pc = ((Math.round(12 * Math.log2(f / 440)) % 12) + 12 + 9) % 12; // 0 = C
        const w = Math.pow(10, (db - cMax) / 20);
        chroma[pc] += w * (f < 300 ? 0.6 : 1); // bass bins are coarse at 23 Hz/bin → trust a bit less
      }
      let cSum = 0;
      for (let i = 0; i < 12; i++) cSum += chroma[i];
      if (cSum > 0) for (let i = 0; i < 12; i++) chroma[i] /= cSum;

      const centroidHz = magSum > 0 ? wSum / magSum : 0;
      const flatDb = flatN && powSum > 0 ? 10 * Math.log10(Math.exp(logPowSum / flatN) / (powSum / flatN)) : 0;
      const bassShare = magSum > 0 ? bassSum / magSum : 0;

      const silent = levelDb < this.silenceDb;

      // --- onset detection: local-peak picking on flux vs adaptive threshold
      // (decides one hop late: hop k-1 is an onset if it's a local max above threshold)
      this.fluxHist.push([t, flux]);
      while (this.fluxHist.length && t - this.fluxHist[0][0] > 1.0) this.fluxHist.shift();
      const fh = this.fluxHist;
      if (fh.length >= 3) {
        let mean = 0;
        for (const [, f] of fh) mean += f;
        mean /= fh.length;
        const [tPrev, fPrev] = fh[fh.length - 2];
        const fPrev2 = fh[fh.length - 3][1];
        const thresh = mean * 1.15 + 0.006;
        if (!silent && fPrev > fPrev2 && fPrev >= flux && fPrev > thresh && tPrev - this.lastOnsetT > 0.09) {
          this.onsets.push(tPrev);
          this.lastOnsetT = tPrev;
        }
      }
      while (this.onsets.length && t - this.onsets[0] > 4.0) this.onsets.shift();
      const onsetRate = this.onsets.length / 4.0; // per second over last 4 s

      // --- steadiness: how much the level jumps hop-to-hop (slow decay of a bowl is fine)
      this.levelHist.push([t, levelDb]);
      while (this.levelHist.length && t - this.levelHist[0][0] > 3.0) this.levelHist.shift();
      let jump = 0;
      for (let i = 1; i < this.levelHist.length; i++) {
        jump += Math.abs(this.levelHist[i][1] - this.levelHist[i - 1][1]);
      }
      jump = this.levelHist.length > 1 ? jump / (this.levelHist.length - 1) : 0;
      jump *= 0.05 / dt; // normalise to dB per 50 ms hop

      // --- map frame features to 0..1
      const E = clamp01((levelDb + 50) / 40); // -50 dBFS→0, -10 dBFS→1
      const B = clamp01((Math.log2(Math.max(centroidHz, 1)) - Math.log2(250)) / (Math.log2(4500) - Math.log2(250)));
      const T = clamp01((-flatDb - 10) / 40); // flatness -10 dB (noisy/drums)→0, -50 dB (pure tones)→1
      const L = clamp01(bassShare / 0.6); // share of spectrum below 160 Hz
      const O = clamp01(onsetRate / 5);
      const S = clamp01(1 - jump / 4); // avg level jump per hop: drums ~3 dB, piano ~1.2, bowl ~0.7, drone ~0.3

      // --- harmony: major/minor (key-profile correlation on long chroma) + pitch motion
      let Mi = 0.5, Pi = 0;
      if (!silent && cSum > 0) {
        const kc = emaK(dt, 5.0);
        for (let i = 0; i < 12; i++) this.chromaLong[i] += (chroma[i] - this.chromaLong[i]) * kc;
        this.chromaHist.push([t, chroma]);
        while (this.chromaHist.length && t - this.chromaHist[0][0] > 0.6) this.chromaHist.shift();
        const { maj, min } = keyCorr(this.chromaLong);
        const clarity = clamp01((Math.max(maj, min) - 0.2) / 0.5); // weak/flat chroma → stay neutral
        Mi = 0.5 + Math.tanh((maj - min) * 6) * 0.5 * clarity;
        // pitch motion: how different the harmony is now vs ~0.5 s ago (bowl/drone ≈ 0, melody/chords > 0)
        const old = this.chromaHist[0][1];
        Pi = clamp01((1 - cosSim(chroma, old)) / 0.45);
      }

      if (!silent) {
        this.activeSec += dt;
        const k = emaK(dt, 3.0); // ~3 s memory: mood is a phrase-level thing
        if (!this.win) this.win = { E, B, T, L, S, M: Mi, P: Pi };
        else {
          this.win.E += (E - this.win.E) * k;
          this.win.B += (B - this.win.B) * k;
          this.win.T += (T - this.win.T) * k;
          this.win.L += (L - this.win.L) * k;
          this.win.S += (S - this.win.S) * emaK(dt, 1.5);
          this.win.M += (Mi - this.win.M) * emaK(dt, 6.0); // harmony is slow: avoid flipping on one chord
          this.win.P += (Pi - this.win.P) * emaK(dt, 3.0);
        }
      }

      // build / crescendo: loudness and brightness trending up over ~5-15 s (Wonder)
      if (!silent) {
        const kf = emaK(dt, 2.0), km = emaK(dt, 5.0), ks = emaK(dt, 15.0);
        if (this.eFast == null) { this.eFast = this.eMid = this.eSlow = E; this.bMid = this.bSlow = B; }
        this.eFast += (E - this.eFast) * kf; this.eMid += (E - this.eMid) * km; this.eSlow += (E - this.eSlow) * ks;
        this.bMid += (B - this.bMid) * km; this.bSlow += (B - this.bSlow) * ks;
        // a real build: the 5 s level sits clearly above the 15 s level and is still climbing
        const up = clamp01((this.eMid - this.eSlow - 0.05) / 0.1) * (this.eFast >= this.eMid ? 1 : 0.4)
          * (0.6 + 0.4 * clamp01((this.bMid - this.bSlow + 0.02) / 0.08));
        this.crescendo = (this.crescendo || 0) + (up - (this.crescendo || 0)) * emaK(dt, up > (this.crescendo || 0) ? 1.5 : 6.0);
      }
      // room tone: fan / AC / mains hum puts almost no energy above 300 Hz (voice, chant, bowls and drones do)
      if (!silent) {
        let lo = 0, hi = 0;
        const b300 = 300 / binHz, bEnd = Math.min(N - 1, Math.ceil(4000 / binHz));
        for (let i = Math.max(1, Math.floor(50 / binHz)); i < bEnd; i++) { const pw = Math.pow(10, (freqDb[i] > -160 ? freqDb[i] : -160) / 10); if (i < b300) lo += pw; else hi += pw; }
        const hf = hi / (lo + hi + 1e-20);
        this.highFrac = this.highFrac == null ? hf : this.highFrac + (hf - this.highFrac) * emaK(dt, ROOM.tau);
      }
      { const u = clamp01(((this.highFrac ?? 1) - ROOM.hf0) / (ROOM.hf1 - ROOM.hf0)); this.roomTone = 1 - u * u * (3 - 2 * u); }
      this._chantUpdate(freqDb, binHz, t, dt, silent);
      const st = this.state;
      st.roomTone = this.roomTone;
      st.crescendo = this.crescendo || 0;
      st.silent = silent;
      st.levelDb = levelDb;
      st.onsetRate = onsetRate;
      st.centroidHz = centroidHz;
      st.flatDb = flatDb;
      st.jumpDb = jump;
      st.bassShare = bassShare;
      st.warm = this.activeSec > 2.0;
      if (this.win) {
        st.features = [this.win.E, this.win.B, O, this.win.S, this.win.T, this.win.L, this.win.M, this.win.P];
        if (!silent) this._classify(st.features);
      }
      return st;
    }

    _classify(f) {
      const st = this.state;
      let best = null, bestP = -1, z = 0;
      const raw = {};
      // f: E B O S T L M P
      const droneLike = (1 - f[2]) * f[3] * f[4] * (1 - f[7]); // few attacks, steady, pure, locked
      const softSteady = clamp01((1 - f[0]) * f[3] * (1 - f[2]));
      const rhythmic = clamp01(f[2] * (1 - f[3]));
      const lockedPitch = f[7] < 0.22 && f[4] > 0.62 && f[2] < 0.32;
      // Om / mantra / sustained chant: allow light syllable motion (not ambient pads / pop)
      const mantraLike = f[3] > 0.55 && f[4] > 0.52 && f[2] < 0.52 && f[7] < 0.55 && rhythmic < 0.38 && f[1] < 0.62;
      const sustainedTonal = f[3] > 0.55 && f[4] > 0.52 && f[2] < 0.48 && f[7] < 0.48;
      // Melodic singing / voice phrases (not drums, not soft pads)
      const melodicVoice = f[4] > 0.4 && f[7] > 0.2 && f[2] < 0.7 && f[0] > 0.28 && f[0] < 0.85;
      const minorLean = f[6] < 0.42;
      const majorLean = f[6] > 0.58;
      for (const k of MOOD_KEYS) {
        const p = this.prototypes[k];
        const w = this.moodWeights[k];
        let d2 = 0, wsum = 0;
        for (let i = 0; i < f.length; i++) {
          const d = f[i] - p[i];
          const wi = FEATURE_WEIGHTS[i] * w[i];
          d2 += wi * d * d;
          wsum += wi;
        }
        d2 *= 8 / wsum;
        let score = Math.exp(-d2 / this.temperature);
        score *= (MOOD_PRIORS[k] || 1);

        if (k === "spirit") {
          if (droneLike > 0.22) score *= 1 + 2.8 * droneLike;
          if (lockedPitch) score *= 2.0;
          if (mantraLike) score *= 2.2; // Om / held chant / soft mantra voice
          if (sustainedTonal) score *= 1.45;
          // sustained mid voice with little rhythm (devotional drone / Om) even with some motion
          if (melodicVoice && f[3] > 0.55 && rhythmic < 0.3 && f[1] < 0.58 && f[2] < 0.4) score *= 1.55;
          // ambient pads with weak tonality — leave those to Calm
          if (f[7] > 0.5 && f[4] < 0.55 && softSteady > 0.25) score *= 0.45;
          // fan / AC / mains hum is not a drone
          score *= 1 - 0.95 * (st.roomTone || 0);
        } else if (k === "calm") {
          // soft ambient pads only — not bowls, mantra, or melodic singing
          if (droneLike > 0.28 || lockedPitch || mantraLike) score *= 0.32;
          else if (melodicVoice && f[7] > 0.28) score *= 0.55; // singing ≠ calm pad
          else if (softSteady > 0.28 && f[0] < 0.52 && f[4] < 0.7 && f[2] < 0.28 && f[7] > 0.18) score *= 1.22;
          if (f[0] > 0.62 || f[2] > 0.4) score *= 0.5;
          if (minorLean && melodicVoice) score *= 0.55; // sad singing → Release, not Calm
        } else if (k === "joy") {
          // Joy needs real rhythm — soft / melodic / mantra singing is not joy
          if (droneLike > 0.18 || lockedPitch || mantraLike) score *= 0.28;
          else if (sustainedTonal && rhythmic < 0.32) score *= 0.4;
          else if (f[2] < 0.45 || f[3] > 0.55) score *= 0.48; // need busy attacks, not sustained voice
          else if (rhythmic > 0.42 && majorLean && f[2] > 0.5) score *= 1.45;
          if (melodicVoice && rhythmic < 0.35) score *= 0.42;
        } else if (k === "love") {
          if (droneLike > 0.28 || lockedPitch) score *= 0.4;
          else if (mantraLike && !majorLean) score *= 0.55;
          else if (melodicVoice && majorLean && f[0] < 0.7 && rhythmic < 0.45) score *= 1.4;
          else if (softSteady > 0.22 && majorLean && f[7] > 0.18 && f[2] > 0.12 && f[2] < 0.5) score *= 1.28;
        } else if (k === "release") {
          // clear minor + melodic motion (sad singing / piano) — not locked mantra
          if ((lockedPitch || droneLike > 0.4) && f[7] < 0.2) score *= 0.35;
          else if (minorLean && melodicVoice) score *= 1.75;
          else if (minorLean && f[4] > 0.4 && f[7] > 0.15) score *= 1.55;
          // slow, quiet, little motion minor = Sad; Release keeps the moving / resolving cases
          if (minorLean && f[0] < 0.5 && f[2] < 0.35 && f[7] < 0.45) score *= 0.75;
          // only kill true soft pads with weak minor (false-minor chroma)
          if (softSteady > 0.3 && f[0] < 0.45 && f[2] < 0.22 && f[7] > 0.35 && f[6] > 0.4) score *= 0.4;
        } else if (k === "ground") {
          if (f[5] > 0.5 && f[1] < 0.45) score *= 1.4;
          if (f[5] > 0.62 && f[0] > 0.45) score *= 1.2;
        } else if (k === "clarity") {
          // bright pure sparse — chimes, flute, ice bells, high clear voice
          if (f[1] > 0.48 && f[4] > 0.55 && f[2] < 0.55 && !lockedPitch) score *= 1.6;
          if (f[1] > 0.62 && f[5] < 0.35 && f[4] > 0.5) score *= 1.4;
          if (melodicVoice && f[1] > 0.55 && f[5] < 0.35 && rhythmic < 0.4) score *= 1.35;
          if (mantraLike && f[1] < 0.42) score *= 0.5; // dark drones are not clarity
        } else if (k === "sad") {
          // heavy, slow, minor: sad piano / sad themes (Release keeps minor music that still moves)
          if (minorLean && f[0] < 0.6 && f[2] < 0.42) score *= 1.6;
          if (!minorLean && f[6] > 0.5) score *= 0.35;
          if (f[2] > 0.55 || f[0] > 0.72) score *= 0.4;
          if (droneLike > 0.3 || lockedPitch || mantraLike) score *= 0.4;
          if (f[7] > 0.6) score *= 0.7; // lots of melodic motion leans Release
        } else if (k === "wonder") {
          // needs a build: loudness / brightness rising over several seconds, tonal and wide
          const cr = st.crescendo || 0;
          score *= 0.25 + 4 * cr;
          if (f[4] < 0.35 || rhythmic > 0.5) score *= 0.5;
          if (droneLike > 0.3 || lockedPitch || mantraLike) score *= 0.5;
        } else if (k === "intensity") {
          // loud + noisy / distorted + busy: heavy, aggressive sound (Energy keeps upbeat / party)
          const ssf = (x, a, b) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
          const heavy = ssf(f[0], 0.74, 0.86) * (1 - ssf(f[4], 0.08, 0.2)) * ssf(f[2], 0.5, 0.7);
          score *= 0.08 + 1.7 * heavy;
          if (majorLean && f[4] > 0.3) score *= 0.6;
          if (droneLike > 0.2 || mantraLike || melodicVoice && f[0] < 0.6) score *= 0.4;
        } else if (k === "energy") {
          if (rhythmic > 0.35 && f[1] > 0.55) score *= 1.3; // bright+busy
          if (f[0] > 0.62 && f[2] > 0.45 && f[3] < 0.45) score *= 1.35;
          if (f[0] > 0.75 && rhythmic > 0.32) score *= 1.2;
          // leave mid-bright major grooves to Joy
          if (majorLean && f[1] < 0.7 && f[0] < 0.75 && rhythmic > 0.4) score *= 0.72;
          if (f[0] > 0.7 && f[4] < 0.2 && !majorLean) score *= 0.75; // heavy distorted minor -> Intensity
        }

        raw[k] = score;
        z += raw[k];
      }
      // Chant / sloka / mantra recitation → Spiritual. Blend toward Spiritual by chant strength so it wins
      // even when the 8 features look "busy, bright, major" (syllables read as rhythm, voice as joy).
      const cu = clamp01(((st.chant || 0) - CHANT.c0) / (CHANT.c1 - CHANT.c0));
      const c = cu * cu * (3 - 2 * cu) * CHANT.mix;
      const base = st.baseProbs || (st.baseProbs = {});
      st.chantMix = c;
      for (const k of MOOD_KEYS) {
        let p = z > 0 ? raw[k] / z : 1 / MOOD_KEYS.length;
        base[k] = p;
        p = p * (1 - c) + (k === "spirit" ? c : 0);
        st.probs[k] = p;
        if (p > bestP) { bestP = p; best = k; }
      }
      st.top = best;
      st.conf = bestP;
    }

    /** Current window features (for "teach" calibration). */
    getFeatures() {
      return this.state.features.slice();
    }

    /** Move a mood prototype toward the current sound (alpha 0..1). */
    teach(moodKey, alpha = 0.6) {
      const p = this.prototypes[moodKey];
      if (!p || !this.win) return false;
      const f = this.getFeatures();
      for (let i = 0; i < p.length; i++) p[i] = p[i] + (f[i] - p[i]) * alpha;
      return true;
    }

    resetPrototypes() {
      this.prototypes = clonePrototypes(DEFAULT_PROTOTYPES);
    }
  }

  /**
   * Hysteresis: smooth the probabilities, then only switch when a new mood has
   * led for `holdSec` with enough confidence, and never sooner than `minDwellSec`
   * after the previous switch.
   */
  class MoodDecider {
    constructor(opts = {}) {
      this.tau = opts.tau ?? 1.55; // toward Vercel 1.25; still steadier than full thrash
      this.holdSec = opts.holdSec ?? 2.0; // candidate must lead this long
      this.minDwellSec = opts.minDwellSec ?? 5.0; // hard floor between switches
      this.minConf = opts.minConf ?? 0.30; // keep v5 reliability (clear top probability)
      this.margin = opts.margin ?? 0.085; // slightly quicker lead than 0.10
      // first real mood after start/warm-up still arrives without long wait
      this.firstHoldSec = opts.firstHoldSec ?? 0.9;
      this.chantHoldSec = opts.chantHoldSec ?? 2.5; // chant must be steady this long before the quick Spiritual switch
      this.roomCalmSec = opts.roomCalmSec ?? 15; // after this long of only fan / AC hum, go to Calm
      this.pauseSec = opts.pauseSec ?? 1.5; // silences shorter than this do not cancel a pending switch
      this.reset(opts.initial || null);
    }

    reset(initial = null) {
      this.settled = false; // has auto made its first real decision yet?
      this.smooth = Object.fromEntries(MOOD_KEYS.map((k) => [k, 1 / MOOD_KEYS.length]));
      this.current = initial;
      this.candidate = null;
      this.candSince = 0;
      this.lastSwitchT = -1e9;
      this.lastT = null;
      this.chantSince = null; // when steady chant evidence started (fast Spiritual switch needs a few seconds of it)
      this.silentSince = null;
    }

    /** @returns {{current, top, conf, pending, pendingProgress, switched}} */
    update(det, t) {
      const dt = this.lastT == null ? 0.05 : Math.min(0.5, Math.max(0.001, t - this.lastT));
      this.lastT = t;
      let switched = false;
      const room = (det.roomTone || 0) > 0.5; // only fan / AC hum: hold the last real mood
      if (!det.silent && det.warm && !room) {
        const k = emaK(dt, this.tau);
        for (const m of MOOD_KEYS) this.smooth[m] += (det.probs[m] - this.smooth[m]) * k;
      }
      let top = MOOD_KEYS[0];
      for (const m of MOOD_KEYS) if (this.smooth[m] > this.smooth[top]) top = m;
      const conf = this.smooth[top];

      // steady chant evidence (not plain speech): needed for the quick Spiritual switch
      const speechy = (det.speech || 0) > 0.5;
      if (!det.silent) {
        if ((det.chant || 0) >= 0.5 && !speechy) { if (this.chantSince == null) this.chantSince = t; }
        else if ((det.chant || 0) < 0.4 || speechy) this.chantSince = null;
      }
      this.silentSince = det.silent ? (this.silentSince ?? t) : null;
      this.roomSince = room ? (this.roomSince ?? t) : null;
      if (room) {
        this.candidate = null;
        // only room tone for a while: settle to a neutral Calm instead of keeping the last palette forever
        if (t - this.roomSince > this.roomCalmSec && this.current !== "calm") {
          this.current = "calm"; this.lastSwitchT = t; switched = true;
        }
      } else if (det.silent || !det.warm) {
        // hold the current palette through silence / warm-up; a short pause between words or phrases
        // keeps a pending switch alive (speech with gaps used to never be able to leave the current mood)
        if (!det.warm || t - this.silentSince > this.pauseSec) this.candidate = null;
      } else if (top === this.current) {
        this.candidate = null;
      } else {
        const lead = conf - (this.current ? this.smooth[this.current] : 0);
        const first = !this.settled;
        // only a very clear lead may shorten hold/dwell slightly; no Joy/Calm leaveMono thrashing
        // clear chanting / recitation: let Spiritual take over quickly (do not wait out the dwell of the old mood)
        // (hand-only chant needs to have been steady for a while; a sacred sound heard by the AI also counts)
        const chant = top === "spirit" && (det.chant || 0) >= 0.5 && !speechy
          && this.chantSince != null && t - this.chantSince >= this.chantHoldSec
          && ((det.chantSteady || 0) > 0.2 || (det.aiChant || 0) >= 0.5);
        const strong = !first && (lead >= 0.25 || chant);
        // floors: hold >= 80% of holdSec, dwell >= 70% of minDwellSec (except first)
        let hold = first ? this.firstHoldSec : strong ? this.holdSec * 0.8 : this.holdSec;
        let dwell = first ? 0 : chant ? this.holdSec : strong ? this.minDwellSec * 0.7 : this.minDwellSec;
        const needMargin = first ? 0.02 : this.margin;
        const needConf = first ? this.minConf * 0.65 : this.minConf;
        const ok = conf >= needConf && lead >= needMargin;
        if (!ok) {
          this.candidate = null;
        } else if (this.candidate !== top) {
          this.candidate = top;
          this.candSince = t;
        } else if (t - this.candSince >= hold && t - this.lastSwitchT >= dwell) {
          this.current = top;
          this.lastSwitchT = t;
          this.candidate = null;
          this.settled = true;
          switched = true;
        }
      }
      if (!det.silent && det.warm && !room && top === this.current && conf >= this.minConf) this.settled = true;
      const pendingProgress = this.candidate ? clamp01((t - this.candSince) / this.holdSec) : 0;
      return { current: this.current, top, conf, pending: this.candidate, pendingProgress, switched, smooth: this.smooth };
    }
  }

  /**
   * Optional AI layer (YAMNet + Essentia mood heads, run in a worker about once a second).
   * push() takes each AI verdict {probs, conf, sacred}; fuse() blends it into the hand detector's
   * probabilities before the decider: fused ~ hand^(1 - w) * ai^w (log blend; linear blend optional),
   * with w = weight * AI confidence (lower when the hand detector is sure it hears chant / a drone).
   * The hand detector still runs every 50 ms (fast, smooth colour motion); the AI adds the
   * "what is this sound" judgment. No AI result (not loaded, failed, stale) -> hand detector only.
   */
  class AIFusion {
    constructor(opts = {}) {
      this.weight = opts.weight ?? 0.7; // tested 0.5-0.7; 0.7 is the first that also fixes calm ambient
      this.tau = opts.tau ?? 2.0; // smoothing of the once-a-second AI verdicts
      this.staleSec = opts.staleSec ?? 3.5; // fade the AI out if results stop arriving
      this.enabled = opts.enabled ?? true;
      this.geometric = opts.geometric ?? true; // log blend: the AI can veto a mood it clearly does not hear
      this.reset();
    }
    reset() {
      this.probs = Object.fromEntries(MOOD_KEYS.map((k) => [k, 1 / MOOD_KEYS.length]));
      this.conf = 0; this.sacred = 0; this.lastT = -1e9; this.have = false; this.last = null; this.w = 0;
      // plain-speech gate: YAMNet hears talking and no chant / mantra / singing (with a slow chant memory,
      // because recited Vedic chant often reads as "Speech" for a few seconds at a time)
      this.speechAvg = 0; this.chantMem = 0; this.speechGate = 0; this.g = 0;
    }
    push(res, t) {
      if (!res || !res.probs) return;
      const k = this.have ? emaK(Math.min(3, Math.max(0.05, t - this.lastT)), this.tau) : 1;
      for (const m of MOOD_KEYS) this.probs[m] += ((res.probs[m] || 0) - this.probs[m]) * k;
      this.conf += ((res.conf || 0) - this.conf) * k;
      this.sacred += ((res.sacred || 0) - this.sacred) * k;
      {
        const dts = this.have ? Math.min(3, Math.max(0.05, t - this.lastT)) : 1, kd = res.kinds || {};
        const sp = clamp01(res.speech || 0), ch = (kd.chant || 0) / 5 + (kd.singing || 0) / 3;
        this.speechAvg += (sp - this.speechAvg) * (this.have ? emaK(dts, SPEECH_GATE.tau) : 1);
        this.chantMem += (ch - this.chantMem) * (ch > this.chantMem ? emaK(dts, SPEECH_GATE.up) : emaK(dts, SPEECH_GATE.down));
        const ss = clamp01((this.speechAvg - SPEECH_GATE.s0) / (SPEECH_GATE.s1 - SPEECH_GATE.s0));
        this.speechGate = ss * ss * (3 - 2 * ss) * clamp01(1 - this.chantMem / SPEECH_GATE.chant);
      }
      this.lastT = t; this.have = true; this.last = res;
    }
    fuse(st, t) {
      this.w = 0; this.g = 0;
      if (!this.enabled || !this.have || !st || st.silent || !st.probs || (st.roomTone || 0) > 0.5) return st;
      const age = t - this.lastT;
      const fresh = clamp01(1 - (age - this.staleSec) / 2);
      // plain speech: take back most of the hand detector's chant push and damp Spiritual, lean calm / neutral
      // ...unless the hand detector has heard steady recitation for a while (Vedic chant often reads as "Speech")
      const g = this.speechGate * fresh * (1 - (st.chantSteady || 0));
      this.g = g;
      let hp = st.probs, stChant = st.chant || 0;
      if (g > 0.001) {
        stChant *= 1 - 0.9 * g;
        const b = st.baseProbs || st.probs, c = (st.chantMix || 0) * (1 - 0.9 * g);
        hp = {}; let z = 0;
        for (const m of MOOD_KEYS) {
          let p = (b[m] || 0) * (1 - c) + (m === "spirit" ? c : 0);
          if (m === "spirit") p *= 1 - SPEECH_GATE.damp * g;
          p = p * (1 - SPEECH_GATE.neutral * g) + SPEECH_GATE.neutral * g * (m === "calm" ? 0.6 : m === "clarity" ? 0.4 : 0);
          hp[m] = p; z += p;
        }
        for (const m of MOOD_KEYS) hp[m] /= z;
      }
      // when the hand detector is sure it hears chant / a held drone, keep the AI from overruling it
      // (music models often call a pure held tone "relaxed acoustic music")
      const handChant = clamp01((stChant - 0.3) / 0.4);
      const w = clamp01(this.weight) * clamp01(this.conf) * fresh * (1 - 0.7 * handChant);
      this.w = w;
      if (w <= 0.001) return g > 0.001 ? Object.assign({}, st, { probs: hp, chant: stChant, handProbs: st.probs, aiW: 0, speech: g }) : st;
      const probs = {};
      if (this.geometric) {
        let z = 0;
        for (const m of MOOD_KEYS) { probs[m] = Math.pow((hp[m] || 0) + 0.02, 1 - w) * Math.pow(this.probs[m] + 0.02, w); z += probs[m]; }
        for (const m of MOOD_KEYS) probs[m] /= z;
      } else {
        for (const m of MOOD_KEYS) probs[m] = (1 - w) * (hp[m] || 0) + w * this.probs[m];
      }
      // a clear sacred sound (chant / mantra / singing bowl) also unlocks the decider's quick Spiritual switch
      const aiChant = clamp01((this.sacred - 0.25) / 0.4) * fresh * (this.probs.spirit > 0.4 ? 1 : 0);
      const chant = Math.max(stChant, aiChant);
      return Object.assign({}, st, { probs, chant, aiChant, handProbs: st.probs, aiW: w, speech: g });
    }
  }

  function clonePrototypes(p) {
    const out = {};
    for (const k of MOOD_KEYS) {
      const src = Array.isArray(p[k]) ? p[k] : DEFAULT_PROTOTYPES[k];
      // older 6-feature taught prototypes: keep them, fill the new harmony features from defaults
      out[k] = DEFAULT_PROTOTYPES[k].map((d, i) => (Number.isFinite(src[i]) ? src[i] : d));
    }
    return out;
  }

  function keyCorr(c) {
    let maj = -1, min = -1;
    for (let r = 0; r < 12; r++) {
      maj = Math.max(maj, pearson(c, KK_MAJOR, r));
      min = Math.max(min, pearson(c, KK_MINOR, r));
    }
    return { maj, min };
  }
  function pearson(c, prof, r) {
    let mc = 0, mp = 0;
    for (let i = 0; i < 12; i++) { mc += c[i]; mp += prof[i]; }
    mc /= 12; mp /= 12;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < 12; i++) {
      const x = c[(i + r) % 12] - mc, y = prof[i] - mp;
      sxy += x * y; sxx += x * x; syy += y * y;
    }
    return sxx > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
  }
  function cosSim(a, b) {
    let ab = 0, aa = 0, bb = 0;
    for (let i = 0; i < 12; i++) { ab += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
    return aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : 1;
  }

  const api = { MoodDetector, MoodDecider, AIFusion, MOOD_KEYS, FEATURE_NAMES, FEATURE_WEIGHTS, DEFAULT_PROTOTYPES, MOOD_EMPHASIS, MOOD_PRIORS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else Object.assign(root, api);
})(typeof window !== "undefined" ? window : globalThis);
