#!/usr/bin/env node
/**
 * Mood regression suite: runs reference clips + synthetic profiles through mood.js and scores
 * "palette time on the expected mood" (after the first 3 s). Feature trajectories are cached in /tmp
 * so prototype tuning is instant.
 *   node tools/mood-suite.js            # table + overall score
 * Reference clips (CC0, not shipped): put them in ../mood-test/ or set MOOD_DIR.
 */
const fs = require("fs");
const path = require("path");
const { profiles, frames, decode } = require("./mood-test.js");
const M = require("../mood.js");

const DIR = process.env.MOOD_DIR || "/workspace/mood-test";
const NOT_SAD = ["joy", "love", "spirit", "calm", "clarity", "energy"]; // devotional: anything uplifting is fine, never "sad"
// Held out of tuning (only checked afterwards): see HOLDOUT
const HOLDOUT = [
  ["holdout/happy_arcade.mp3", ["joy", "energy"], "Happy arcade tune (OGA)"],
  ["holdout/sad_theme.mp3", ["release"], "Sad Theme (OGA, CC0)"],
  ["god-is-protecting-you.mp3", NOT_SAD, "God Is Protecting You (devotional)"],
];
const CASES = [
  ["joy_happy_vibes.mp3", ["joy"], "Happy Vibes (CC0 upbeat)"],
  ["joy.wav", ["joy"], "Happy Vibes clip"],
  ["bowl.wav", ["spirit"], "singing bowl clip"],
  ["piano.wav", ["love"], "tender piano clip"],
  ["calm-piano-1-vaporware.mp3", ["love", "calm"], "calm piano (CC0)"],
  ["calm-ambient-3-lifewave-2k.mp3", ["calm"], "calm ambient (CC0)"],
  ["sad_regret_piano.mp3", ["release"], "Regret – emotional piano (CC0)"],
  ["sad_vampires_piano.mp3", ["release"], "Vampire's Piano – sad (CC0)"],
  ["sad_chasing_despair.mp3", ["release"], "Chasing Despair (CC0)"],
  ["sad_end_of_hope.mp3", ["release", "energy"], "At the End of Hope – sad e-piano w/ beat (CC0)"],
  ["holdout/happy_tune.mp3", ["joy", "energy"], "Happy Tune (OGA, upbeat)"],
  ["love-is-my-form.mp3", NOT_SAD, "Love Is My Form (devotional)"],
  ["gayatri-once.mp3", NOT_SAD, "Gayatri (devotional)"],
  ["bhaja-govindam-sssmc.mp3", NOT_SAD, "Bhaja Govindam (devotional)"],
  ["rama-rama-rama-sita-sssmc.mp3", NOT_SAD, "Rama Rama Rama Sita (devotional)"],
  ["synthetic JOY (pop 124bpm)", ["joy"]],
  ["synthetic ENERGY (150bpm)", ["energy"]],
  ["synthetic LOVE (soft piano)", ["love"]],
  ["synthetic BOWL (struck 12s)", ["spirit"]],
  ["synthetic DRONE (sustained)", ["spirit", "calm"]],
  ["synthetic OM (mantra chant)", ["spirit"]],
  ["synthetic SAD (minor piano)", ["release"]],
  ["synthetic RELEASE (dark pad)", ["release"]],
];

function traj(name) {
  const cache = `/tmp/stv-feat-${name.replace(/[^a-z0-9]+/gi, "_")}-${fs.statSync(path.join(__dirname, "../mood.js")).mtimeMs | 0}.json`;
  if (fs.existsSync(cache)) return JSON.parse(fs.readFileSync(cache, "utf8"));
  let s;
  if (profiles[name]) s = profiles[name];
  else { const p = path.join(DIR, name); if (!fs.existsSync(p)) return null; s = decode(p); }
  const fr = frames(s);
  fs.writeFileSync(cache, JSON.stringify(fr));
  return fr;
}

function evaluate(fr, protos, weights) {
  const det = new M.MoodDetector({ prototypes: protos });
  if (weights) det.moodWeights = weights;
  const dec = new M.MoodDecider({ initial: "calm" });
  const counts = {}; let n = 0, sw = 0, first = null;
  for (const x of fr) {
    const st = det.state;
    st.silent = x.silent; st.warm = x.warm; st.features = x.f;
    if (!x.silent) det._classify(x.f);
    const d = dec.update(st, x.t);
    if (d.switched) { sw++; if (first == null) first = x.t; }
    if (x.t > 3 && !x.silent) { counts[d.current] = (counts[d.current] || 0) + 1; n++; }
  }
  return { counts, n, sw, first };
}

if (require.main === module) {
  let total = 0, cnt = 0;
  const all = process.argv.includes("--holdout") ? HOLDOUT : CASES;
  console.log("case".padEnd(48), "expect".padEnd(16), "hit%  switches  palette time");
  for (const [name, exp, label] of all) {
    const fr = traj(name);
    if (!fr) { console.log((label || name).padEnd(48), "(missing)"); continue; }
    const r = evaluate(fr, M.DEFAULT_PROTOTYPES);
    const hit = exp.reduce((a, k) => a + (r.counts[k] || 0), 0) / Math.max(1, r.n);
    total += hit; cnt++;
    const dist = Object.entries(r.counts).sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${Math.round((100 * c) / r.n)}%`).join(", ");
    console.log((label || name).padEnd(48), (exp === NOT_SAD ? "not sad" : exp.join("/")).padEnd(16), String(Math.round(hit * 100)).padStart(4), String(r.sw).padStart(8), "  ", dist);
  }
  console.log(`\nOVERALL expected-mood palette time: ${Math.round((100 * total) / cnt)}% over ${cnt} cases`);
}
module.exports = { CASES, HOLDOUT, traj, evaluate };
