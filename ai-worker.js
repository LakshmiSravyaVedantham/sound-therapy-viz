/* AI mood worker: YAMNet (Apache 2.0) + Essentia mood heads (CC BY-NC-SA 4.0) via TensorFlow.js.
 * Gets raw audio from the AudioWorklet tap, resamples to 16 kHz, runs about once a second,
 * and posts the verdict to the page. All files are local (vendor/, models/); nothing is uploaded. */
const V = self.location.search || "";
importScripts("vendor/tf-core.min.js" + V, "vendor/tf-backend-cpu.min.js" + V, "vendor/tf-backend-wasm.min.js" + V,
  "vendor/tf-converter.min.js" + V, "ai-mood.js" + V);
const A = self.AIMood;
let model = null, heads = null, names = null, rs = null, ready = false, busy = false, backend = "";
const RING = 16000 * 3;
const ring = new Float32Array(RING); let wpos = 0, filled = 0, sinceRun = 0;
let intervalSec = 1.0, paused = false;

function pushAudio(x) {
  if (!rs) return;
  const y = rs.push(x);
  for (let i = 0; i < y.length; i++) { ring[wpos] = y[i]; wpos = (wpos + 1) % RING; }
  filled = Math.min(RING, filled + y.length); sinceRun += y.length;
  if (ready && !busy && !paused && sinceRun >= intervalSec * 16000 && filled >= A.YAM_WIN + A.YAM_HOP) run();
}

async function run() {
  busy = true; sinceRun = 0;
  const n = A.YAM_WIN + A.YAM_HOP, seg = new Float32Array(n);
  for (let i = 0; i < n; i++) seg[i] = ring[(wpos - n + i + RING * 2) % RING];
  let ss = 0; for (let i = 0; i < n; i++) ss += seg[i] * seg[i];
  const rmsDb = 10 * Math.log10(ss / n + 1e-12);
  try {
    if (rmsDb < -70) { postMessage({ type: "result", silent: true, rmsDb }); return; }
    const t0 = performance.now();
    const r = await A.analyzeWave(tf, model, heads, seg);
    const ms = performance.now() - t0;
    postMessage({ type: "result", probs: r.probs, conf: r.conf, sacred: r.sacred, music: r.music, speech: r.speech, kinds: r.kinds,
      heads: r.heads, top: A.topClasses(r.scores, names, 5), ms, rmsDb, backend });
  } catch (e) {
    postMessage({ type: "error", where: "run", message: String(e && e.message || e) });
  } finally { busy = false; }
}

async function init(sampleRate) {
  const t0 = performance.now();
  try {
    tf.wasm.setWasmPaths(new URL("vendor/", self.location.href).href);
    try { await tf.setBackend("wasm"); } catch (e) { /* fall through */ }
    if (tf.getBackend() !== "wasm") await tf.setBackend("cpu");
    await tf.ready(); backend = tf.getBackend();
    const base = new URL("models/", self.location.href).href;
    const q = V;
    const [m, hj, hb, nm] = await Promise.all([
      tf.loadGraphModel(base + "yamnet/model.json" + q),
      fetch(base + "essentia-heads.json" + q).then((r) => { if (!r.ok) throw new Error("heads.json " + r.status); return r.json(); }),
      fetch(base + "essentia-heads-f16.bin" + q).then((r) => { if (!r.ok) throw new Error("heads.bin " + r.status); return r.arrayBuffer(); }),
      fetch(base + "yamnet/class-names.json" + q).then((r) => { if (!r.ok) throw new Error("class-names " + r.status); return r.json(); }),
    ]);
    model = m; heads = A.loadHeads(hj, hb); names = nm;
    // warm-up run so the first real verdict is not slow
    const w = tf.tidy(() => model.execute(tf.zeros([A.YAM_WIN + A.YAM_HOP]), ["Identity:0"]));
    await w.data(); w.dispose();
    rs = new A.Resampler16k(sampleRate);
    ready = true;
    postMessage({ type: "ready", backend, loadMs: performance.now() - t0 });
  } catch (e) {
    postMessage({ type: "error", where: "init", message: String(e && e.message || e) });
  }
}

self.onmessage = (e) => {
  const d = e.data || {};
  if (d.type === "init") init(d.sampleRate);
  else if (d.type === "port") d.port.onmessage = (ev) => pushAudio(ev.data);
  else if (d.type === "audio") pushAudio(d.data);
  else if (d.type === "interval") intervalSec = Math.max(0.5, +d.sec || 1);
  else if (d.type === "reset") { filled = 0; sinceRun = 0; }
  else if (d.type === "pause") paused = !!d.paused;
};
