/* AI mood helper (runs in a Web Worker in the browser, and in Node for tests).
 * YAMNet (Google AudioSet, Apache 2.0) gives 521 sound classes + a 1024-d embedding per 0.96 s.
 * Essentia mood heads (MTG, CC BY-NC-SA 4.0, non-commercial) turn that embedding into
 * happy / sad / relaxed / aggressive / danceable / party / acoustic / electronic.
 * mapToMoods() turns both into the 8 show moods. Nothing here touches the network except
 * loading the local model files; audio never leaves the device. */
(function (root) {
  "use strict";
  const MOOD_KEYS = ["joy", "calm", "love", "release", "ground", "clarity", "spirit", "energy", "sad", "wonder", "intensity"];
  const YAM_SR = 16000;
  const YAM_WIN = 15600; // one 0.96 s patch (+ STFT edges)
  const YAM_HOP = 7680; // 0.48 s

  // AudioSet class indices used for the mapping (yamnet_class_map.csv)
  const C = {
    speech: 0, narration: 3, singing: 24, choir: 25, childSinging: 29, percussion: 156, chant: 27, mantra: 28, humming: 32,
    music: 132, piano: 148, guitar: 135, acousticGuitar: 138, drumKit: 157, drumMachine: 158, drum: 159, snare: 160, bassDrum: 163,
    tabla: 165, sitar: 143, gong: 172, tubularBells: 173, bowl: 209, bell: 195, chime: 200, windChime: 201,
    pop: 211, hiphop: 212, rock: 214, electronic: 234, house: 235, edm: 240, ambient: 241, trance: 242,
    newAge: 248, vocalMusic: 249, christian: 253, gospel: 254, asia: 255, carnatic: 256, bollywood: 257,
    traditional: 259, background: 262, soundtrack: 265, dance: 269,
    happyMusic: 271, sadMusic: 272, tenderMusic: 273, excitingMusic: 274, angryMusic: 275, scaryMusic: 276,
    classical: 232, flute: 191, harp: 194, strings: 184, violin: 186, cello: 188, synth: 153, lullaby: 266,
    silence: 494, hum: 490, fan: 406, aircon: 407, whiteNoise: 514, pinkNoise: 515, static: 509, mainsHum: 510,
    orchestra: 179, brass: 180, timpani: 164, themeMusic: 263, heavyMetal: 215, punk: 216, grunge: 217, progRock: 218,
    electricGuitar: 136, distortion: 511, dubstep: 237,
    buzz: 125, noise: 507, envNoise: 508, windMic: 279, rumble: 487, hiss: 79,
  };
  const HEAD_KEYS = { mood_happy: "happy", mood_sad: "sad", mood_relaxed: "relaxed", mood_aggressive: "aggressive",
    danceability: "danceable", mood_party: "party", mood_acoustic: "acoustic", mood_electronic: "electronic" };
  const POSITIVE = { happy: "happy", sad: "sad", relaxed: "relaxed", aggressive: "aggressive", danceable: "danceable",
    party: "party", acoustic: "acoustic", electronic: "electronic" };

  function f16ToF32(u16) {
    const out = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) {
      const h = u16[i], s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, m = h & 0x3ff;
      out[i] = e === 0 ? s * m * 5.960464477539063e-8 : e === 31 ? (m ? NaN : s * Infinity) : s * (1 + m / 1024) * Math.pow(2, e - 15);
    }
    return out;
  }

  /** Essentia classification heads: Dense(1024->100, relu) -> Dense(100->2) -> softmax. Plain JS (tiny). */
  function loadHeads(index, buf) {
    const all = f16ToF32(new Uint16Array(buf));
    const take = ([off, shape]) => all.subarray(off, off + shape.reduce((a, b) => a * b, 1));
    return index.heads.map((h) => ({
      key: HEAD_KEYS[h.name] || h.name, classes: h.classes,
      w1: take(h.w1), b1: take(h.b1), w2: take(h.w2), b2: take(h.b2), hid: h.b1[1][0], inp: h.w1[1][0],
    }));
  }
  function runHeads(heads, emb) {
    const out = {};
    for (const h of heads) {
      const z = new Float32Array(h.hid);
      for (let j = 0; j < h.hid; j++) z[j] = h.b1[j];
      for (let i = 0; i < h.inp; i++) {
        const x = emb[i]; if (!x) continue;
        const row = i * h.hid;
        for (let j = 0; j < h.hid; j++) z[j] += x * h.w1[row + j];
      }
      let a0 = h.b2[0], a1 = h.b2[1];
      for (let j = 0; j < h.hid; j++) { const r = z[j] > 0 ? z[j] : 0; a0 += r * h.w2[j * 2]; a1 += r * h.w2[j * 2 + 1]; }
      const m = Math.max(a0, a1), e0 = Math.exp(a0 - m), e1 = Math.exp(a1 - m);
      const pos = h.classes.indexOf(POSITIVE[h.key]);
      out[h.key] = (pos === 0 ? e0 : e1) / (e0 + e1);
    }
    return out;
  }

  /** Streaming resampler to 16 kHz (windowed-sinc low-pass + fractional read). */
  class Resampler16k {
    constructor(srcRate) {
      this.src = srcRate; this.ratio = srcRate / YAM_SR;
      this.taps = 16; // half-width in output samples
      this.cut = Math.min(1, YAM_SR / srcRate) * 0.92;
      this.buf = new Float32Array(0); this.pos = 0;
    }
    push(x) {
      const b = new Float32Array(this.buf.length + x.length); b.set(this.buf); b.set(x, this.buf.length); this.buf = b;
      const out = [], half = Math.ceil(this.taps * this.ratio), c = this.cut;
      while (this.pos + half < this.buf.length) {
        const center = this.pos, i0 = Math.ceil(center - half), i1 = Math.floor(center + half);
        let acc = 0, wsum = 0;
        for (let i = Math.max(0, i0); i <= i1; i++) {
          const d = i - center, xx = d * c;
          const sinc = xx === 0 ? 1 : Math.sin(Math.PI * xx) / (Math.PI * xx);
          const w = 0.5 + 0.5 * Math.cos((Math.PI * d) / half);
          const k = sinc * w; acc += this.buf[i] * k; wsum += k;
        }
        out.push(wsum ? acc / wsum : 0);
        this.pos += this.ratio;
      }
      const drop = Math.max(0, Math.floor(this.pos - half) - 1);
      if (drop > 0) { this.buf = this.buf.slice(drop); this.pos -= drop; }
      return Float32Array.from(out);
    }
  }

  const sig = (x) => 1 / (1 + Math.exp(-x));
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

  /** AI evidence -> probabilities over the 8 show moods (sum 1), a confidence 0..1 (how much the AI
   *  should count right now) and the sacred-sound strength. The Essentia heads are music models, so their
   *  votes are scaled by how much YAMNet hears music; speech-only or silence gives low confidence and the
   *  hand-made detector decides. Piano moods (love / calm / release) are close for the heads, so the AI
   *  spreads its vote across them and leaves the order to the hand detector. */
  function mapToMoods(sc, hd) {
    const g = (k) => sc[C[k]] || 0;
    const sum = (...ks) => ks.reduce((a, k) => a + g(k), 0);
    const happy = hd.happy ?? 0.5, sad = hd.sad ?? 0.5, relaxed = hd.relaxed ?? 0.5, aggressive = hd.aggressive ?? 0.5;
    const dance = hd.danceable ?? 0.5, party = hd.party ?? 0.5, acoustic = hd.acoustic ?? 0.5;
    const music = clamp01(1.25 * Math.max(g("music"), sum("piano", "guitar", "synth", "strings", "flute", "harp", "drumKit") * 1.5));
    const speech = clamp01(g("speech") + 0.5 * g("narration"));
    const sacred = clamp01(5 * (g("chant") + g("mantra")) + 1.6 * g("bowl") + 1.2 * (g("gong") + g("tubularBells"))
      + 0.8 * (g("choir") + g("humming")) + 0.6 * (g("christian") + g("gospel")));
    const amb = clamp01(2.2 * (g("ambient") + g("newAge")));
    const bright = clamp01(1.5 * (g("chime") + g("windChime") + g("bell") + g("flute") + g("harp")));
    const drums = clamp01(sum("drumKit", "drumMachine", "drum", "snare", "bassDrum") * 1.5);
    const tender = clamp01(4 * g("tenderMusic")), sadM = clamp01(4 * g("sadMusic"));
    const groove = Math.max(dance, party);
    const still = 1 - clamp01(groove * 1.25 - 0.25 + 0.5 * aggressive); // not dance / party / aggressive

    const s = {};
    s.joy = happy * groove * (1 - 0.5 * aggressive);
    s.energy = Math.max(aggressive * dance, party * dance * (1 - 0.5 * relaxed)) * (1 - 0.3 * happy) + 0.4 * drums * groove;
    // the three soft moods share one "soft music" vote; ambient leans calm, tender leans love, sad leans release
    const soft = relaxed * (1 - happy * groove) * (1 - 0.7 * aggressive);
    s.calm = soft * (0.3 + 1.2 * amb) * (still * 0.6 + 0.4);
    s.love = soft * (0.3 + 0.5 * tender + 0.15 * acoustic) * still;
    s.release = soft * (0.3 + 0.4 * sadM) * (0.6 + 0.4 * sad) * (1 - 0.6 * happy) * (1 - 0.5 * amb);
    s.clarity = 0.6 * bright * soft;
    s.ground = 0.4 * drums * dance * (1 - happy) * (1 - party);
    // Sad (split from Release): the music heads' "sad" + sad-music class, slow and not grooving.
    // Release keeps a lighter share (letting go: minor but moving / resolving).
    const sadK = clamp01((sad - 0.6) / 0.3);
    const sadV = soft * sadK * (0.3 + 0.7 * sadM + 0.2 * (1 - groove)) * (1 - 0.7 * happy) * (1 - 0.5 * amb) * (1 - 0.5 * tender);
    s.sad = sadV;
    s.release *= 1 - 0.4 * clamp01(sadV * 3);
    // Intensity: aggressive / heavy / distorted (Energy keeps upbeat party)
    const heavy = clamp01(1.5 * (sum("heavyMetal", "punk", "grunge", "progRock", "dubstep") + 0.5 * g("rock") + g("angryMusic") + g("distortion") + 0.5 * g("electricGuitar")));
    s.intensity = aggressive * (1 - 0.6 * happy) * (0.35 + 0.65 * heavy) * (1 - 0.5 * party * happy);
    // Wonder / awe: orchestral / cinematic / choir, not dance, bright-ish (major) rather than sad
    const cine = clamp01(2.5 * (g("orchestra") + g("soundtrack") + g("themeMusic") + 0.6 * g("classical") + g("brass") + g("timpani") + 0.6 * g("choir") + 0.8 * g("excitingMusic")));
    s.wonder = cine * (1 - 0.7 * groove) * (0.4 + 0.6 * (1 - sad * 0.7)) * (1 - 0.5 * aggressive) * 0.9;
    for (const k of MOOD_KEYS) if (k !== "spirit") s[k] = (s[k] || 0) * music;
    s.spirit = 1.6 * sacred;
    // chant often reads "happy" / "danceable" to the music heads: sacred sounds damp the rest
    const damp = 1 - 0.85 * clamp01(sacred * 1.3);
    let z = 0;
    for (const k of MOOD_KEYS) { if (k !== "spirit") s[k] *= damp; s[k] += 0.02; z += s[k]; }
    const probs = {}; for (const k of MOOD_KEYS) probs[k] = s[k] / z;
    // how much to trust this verdict: clear music or clear sacred sound; speech-only / silence -> low
    let conf = clamp01(Math.max(music * (1 - 0.6 * speech), sacred * 1.2));
    // room tone / machine noise / silence: no mood vote at all (and never a sacred sound)
    const noise = clamp01(1.5 * (sum("hum", "fan", "aircon", "whiteNoise", "pinkNoise", "static", "mainsHum", "buzz", "noise", "envNoise", "windMic", "rumble", "hiss") + g("silence")));
    if (noise > 0) { const keep = 1 - noise * (1 - clamp01(music + speech)); conf *= keep; probs.spirit = probs.spirit * keep + (1 - keep) / MOOD_KEYS.length; }
    // sound type (for wave motion / patterns): what kind of sound this is, each 0..1
    const kinds = {
      chant: clamp01(5 * (g("chant") + g("mantra")) + 0.8 * g("humming")),
      bowl: clamp01(1.6 * g("bowl") + 1.2 * (g("gong") + g("tubularBells")) + 1.5 * (g("bell") + g("chime") + g("windChime"))),
      drums: clamp01(1.5 * (sum("drumKit", "drumMachine", "drum", "snare", "bassDrum") + g("tabla") + g("percussion"))),
      singing: clamp01(1.5 * (g("singing") + g("choir") + g("vocalMusic") + g("childSinging"))),
      speech: clamp01(speech * (1 - music)),
    };
    return { probs, conf, sacred, music, speech, kinds };
  }

  /** YAMNet + heads on a 16 kHz mono buffer (>= 15600 samples). tf = TensorFlow.js namespace. */
  async function analyzeWave(tf, model, heads, wave) {
    const res = tf.tidy(() => {
      const out = model.execute(tf.tensor1d(wave), ["Identity:0", "Identity_1:0"]);
      return [tf.mean(out[0], 0), tf.mean(out[1], 0)];
    });
    const [scT, emT] = res;
    const scores = await scT.data(), emb = await emT.data();
    scT.dispose(); emT.dispose();
    const hd = heads ? runHeads(heads, emb) : {};
    return { scores, heads: hd, ...mapToMoods(scores, hd) };
  }

  function topClasses(scores, names, n = 5) {
    const idx = Array.from(scores.keys()).sort((a, b) => scores[b] - scores[a]).slice(0, n);
    return idx.map((i) => [names ? names[i] : String(i), scores[i]]);
  }

  const api = { MOOD_KEYS, YAM_SR, YAM_WIN, YAM_HOP, C, loadHeads, runHeads, Resampler16k, mapToMoods, analyzeWave, topClasses, f16ToF32 };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.AIMood = api;
})(typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : globalThis);
