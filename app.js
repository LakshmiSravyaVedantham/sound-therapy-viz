/**
 * Sound Therapy Viz — show canvas for a small dark room (laptop or tiny projector).
 *
 * What the audience sees: ONLY the full-bleed canvas (emotion color + waves). Zero chrome.
 *   - soft "ink" color fields drifting (TeamLab-like glowing worlds)
 *   - traveling wave bands (default W): soft aurora curtains with continuous L→R energy travel
 *   - optional silk fabric ribbons (S) and reactive nebula (N)
 *   - soft ripples from sound energy (attacks, bowl strikes, voice swells)
 *   - floating light motes pushed by the ripples
 *   - Per-emotion light patterns: rising sparks + soft sunbursts for all moods
 *   - Love: shared soft rising sparks (tiny circles) + candle room (manual); no flower/petal overlays
 *   - Wave/Silk travel via pinned FLOW; Auto mood switches change COLOR only (MOTION_BASE)
 *   - silence = one slow breath (~8 s cycle)
 *   - no on-screen text/HUD in show mode (L labels only in demo panel)
 *
 * Under the hood (unchanged): mood.js song-mood detector (auto) + hotkey override.
 * Operator panel only with D. Optional per-emotion background loop/image in assets/ (see README).
 *
 * Keys: Space/click start mic · O load track · A auto · M lock · 1–8 force · Shift+1–8 teach
 *       Shift+0 reset teach · [ ] trim · L label · F / double-click fullscreen · D panel
 *       W traveling waves (default) · S silk · N nebula · Z ASMR mode (also ?mode=asmr)
 *
 * ASMR mode (Z / ?mode=asmr): same silk + mood colors, but slower travel, thinner feathered strands,
 * lower glow, slow color breathing, compressed + smoothed audio (small sounds = small ripples that
 * glide along the strands; loud peaks soft-capped), slower mood fades. Per-mood patterns stay on in a
 * soft style: sparks fall / rise / drift in from the edges at ~1/3 speed with fade in + fade out,
 * slow feathered per-mood emanations and soft blooms (no flashes, no sudden bursts). Default look is untouched: every ASMR factor is exactly 1 (or 0) when off.
 */

// Unique two-hue pair per mood (no hue reused across moods). Dual Auto blend can show all four hues.
const EMOTIONS = {
  1: { id: "joy", label: "Joy", bg: ["#030100", "#160900"], core: "#ffb81a", glow: "#ff8a00", accent: "#ff3d7f", particle: "#fff0a8", deep: "#5a2800",
       speed: 1.25, breathe: 0.6, density: 1.3, rise: 1.0, ripple: "scatter", rippleRate: 1.0, wave: 1.25, silk: 1.1 },
  2: { id: "calm", label: "Calm", bg: ["#000304", "#00131a"], core: "#22e8d2", glow: "#0a9a8c", accent: "#4aa3ff", particle: "#c4fff6", deep: "#00303a",
       speed: 0.55, breathe: 1.0, density: 0.85, rise: 0.05, ripple: "near", rippleRate: 0.7, wave: 0.8, silk: 1.3 },
  3: { id: "love", label: "Love", bg: ["#020003", "#140510"], core: "#ff7a9a", glow: "#c94a68", accent: "#ffb6a3", particle: "#ffe8f2", deep: "#5a1030",
       speed: 0.48, breathe: 1.35, density: 1.25, rise: 0.4, ripple: "petal", rippleRate: 0.85, wave: 0.95, silk: 1.55 },
  4: { id: "release", label: "Release", bg: ["#000005", "#01061c"], core: "#2f5dff", glow: "#1a35b0", accent: "#4b2fd6", particle: "#9ab4ff", deep: "#000a40",
       speed: 0.42, breathe: 1.15, density: 0.7, rise: -0.85, ripple: "center", rippleRate: 0.55, wave: 0.7, silk: 1.5 },
  5: { id: "ground", label: "Grounding", bg: ["#030100", "#170a01"], core: "#ff9433", glow: "#b86510", accent: "#c43a1a", particle: "#ffc48a", deep: "#401800",
       speed: 0.5, breathe: 0.95, density: 0.85, rise: -0.1, ripple: "low", rippleRate: 0.9, wave: 1.0, silk: 0.9 },
  6: { id: "clarity", label: "Clarity", bg: ["#000306", "#011626"], core: "#5af2ff", glow: "#1aa8b8", accent: "#dff6ff", particle: "#f0ffff", deep: "#003844",
       speed: 0.85, breathe: 0.7, density: 0.95, rise: 0.25, ripple: "scatter", rippleRate: 0.55, wave: 0.95, silk: 1.0 },
  7: { id: "spirit", label: "Spiritual", bg: ["#02000a", "#0e0328"], core: "#a259ff", glow: "#6a28c8", accent: "#6dffc4", particle: "#d4b0ff", deep: "#200060",
       speed: 0.5, breathe: 1.15, density: 0.9, rise: 0.15, ripple: "center", rippleRate: 0.7, wave: 0.9, silk: 1.4 },
  8: { id: "energy", label: "Energy", bg: ["#050000", "#200106"], core: "#ff4214", glow: "#b82008", accent: "#c8ff2e", particle: "#ff9a78", deep: "#4a1000",
       speed: 1.45, breathe: 0.45, density: 1.4, rise: 0.6, ripple: "scatter", rippleRate: 1.2, wave: 1.45, silk: 0.85 },
  // new moods (keys 9, 0, -): unique pairs grey-blue / gold-white / deep red-ember
  9: { id: "sad", label: "Sad", bg: ["#010203", "#060b12"], core: "#7d93ad", glow: "#3e5068", accent: "#b4c3d4", particle: "#cfd9e4", deep: "#141c28",
       speed: 0.38, breathe: 1.25, density: 0.65, rise: -1.0, ripple: "center", rippleRate: 0.45, wave: 0.6, silk: 1.55 },
  10: { id: "wonder", label: "Wonder", bg: ["#030200", "#141004"], core: "#ffd76a", glow: "#c9a032", accent: "#fff8e6", particle: "#fffbe8", deep: "#3a2c06",
       speed: 0.5, breathe: 1.2, density: 0.9, rise: 0.35, ripple: "center", rippleRate: 0.6, wave: 0.85, silk: 1.5 },
  11: { id: "intensity", label: "Intensity", bg: ["#040000", "#1a0303"], core: "#d2203a", glow: "#8e1020", accent: "#ff7a3c", particle: "#ffb08a", deep: "#3a0608",
       speed: 1.15, breathe: 0.6, density: 1.15, rise: 0.3, ripple: "scatter", rippleRate: 0.9, wave: 1.2, silk: 0.95 },
};
const MOOD_COUNT = 11;

// Shared motion signature for silk / nebula / sparks.
// Mood switches (especially Auto) must NOT retarget these — only colors crossfade.
// Per-mood speed/wave/rise fields on EMOTIONS are kept for reference but do not drive the viz.
const MOTION_BASE = {
  speed: 0.72,
  breathe: 1.0,
  density: 1.0,
  rise: 0.25,
  rippleRate: 0.22,
  wave: 1.0,
  silk: 1.2,
};
// How much per-mood motion mixes into MOTION_BASE (0 = color-only freeze, 1 = full Vercel thrash).
// ~0.4 adds visible Auto liveliness without wild wave reshapes.
const MOTION_BLEND = 0.4;
const NEUTRAL_SPARK = {
  dens: 0.55, rise: 0.55, speed: 0.7, burst: 0.45, size: 0.95,
  maxS: 26, maxB: 2, y0: 0.45, y1: 0.88, drift: 0.7, star: 0.35,
};
// Always-on horizontal silk travel (rad/s scale). Mood-independent; never retargeted on Auto.
// Alternating ribbon.dir makes neighbouring bands flow left vs right.
// SILK_SCROLL: spectrum/texture window shift in u-space per (SILK_FLOW * t) so live shape travels, not just bobs.
const SILK_FLOW = 3.15; // livelier L/R travel (was 2.6; Vercel felt more animated)
const SILK_FLOW_AMP = 0.026; // fraction of H: idle L/R wave height so silence still looks alive
const SILK_SCROLL = 0.17; // u-cycles of sample-window travel per unit SILK_FLOW*time

// Pre-silk traveling wave (demo look): unidirectional L→R energy, linear scrolled spectrum,
// fat soft aurora curtains + 1–2 spines (no multi-strand silk bristles).
const WAVE_FLOW = 2.15; // stronger visible travel than silk bob
const WAVE_FLOW_AMP = 0.022; // always-on travel height
const WAVE_SCROLL = 0.28; // spectrum window travel (u-cycles per WAVE_FLOW*time)
const WAVE_TD_SCROLL = 0.55; // time-domain waveform scroll rate (u per second scale)

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const canvas = $("viz");
const ctx = canvas.getContext("2d", { alpha: false });
const whisperEl = $("whisper");
const emotionLabel = $("emotion-label");
const statusEl = $("status");
const keyHints = document.querySelectorAll("#keys-hint [data-k]");
/** D-panel color names only (no hex). Swatches kept for glanceability. */
const MOOD_COLOR_NAMES = {
  joy: ["gold", "orange", "magenta"],
  calm: ["teal", "blue"],
  love: ["pink", "peach"],
  clarity: ["cyan"],
  spirit: ["purple", "lime"],
  ground: ["orange", "rust"],
  release: ["blue", "violet"],
  energy: ["red", "lime"],
  sad: ["grey-blue", "mist"],
  wonder: ["gold", "white"],
  intensity: ["deep red", "ember"],
};
const MOOD_SWATCH_SLOTS = {
  joy: ["core", "glow", "accent"],
  calm: ["core", "accent"],
  love: ["core", "accent"],
  clarity: ["core"],
  spirit: ["core", "accent"],
  ground: ["core", "accent"],
  release: ["core", "accent"],
  energy: ["core", "accent"],
  sad: ["core", "accent"],
  wonder: ["core", "accent"],
  intensity: ["core", "accent"],
};
function moodPanelLabel(em) {
  if (!em) return "";
  if (em.id === "spirit") return "Spiritual";
  if (em.id === "ground") return "Grounding";
  return em.label;
}
function colorNamesLine(id) {
  const names = MOOD_COLOR_NAMES[id] || [];
  if (!names.length) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return names[0] + " and " + names[1];
  return names.slice(0, -1).join(", ") + ", and " + names[names.length - 1];
}
function swatchDotsFromEmotion(em) {
  const slots = MOOD_SWATCH_SLOTS[em.id] || ["core", "accent"];
  return slots.map((slot) => {
    const hex = em[slot];
    if (!hex) return "";
    return `<b style="background:${hex}" title=""></b>`;
  }).join("");
}
function swatchDotsFromRgbPal(p) {
  // Live mix: show core + glow + accent as unnamed color chips (no hex text)
  return ["core", "glow", "accent"].map((slot) => {
    if (!p || !p[slot]) return "";
    return `<b style="background:${rgbToHex(p[slot])}"></b>`;
  }).join("");
}

/** D-panel featured live combination (active mood + Auto mix + fade). Names only. */
function updateLiveComboPanel() {
  const host = document.getElementById("live-combo");
  if (!host || !pal) return;
  const weights = lastMixWeights || scoreMixWeights(lastDecision);
  const title = moodMixLabelFromWeights(weights);
  const primary = EMOTIONS[targetKey];
  const pills = weights.map((w) => {
    const e = EMOTIONS[keyForMood(w.id)];
    return `<span class="mix-pill" style="--mc:${e.core}"><i style="background:${e.core}"></i>${moodPanelLabel(e)} <b>${Math.round(w.w * 100)}%</b></span>`;
  }).join("");
  const featNames = colorNamesLine(primary.id);
  const mixNames = weights.map((w) => colorNamesLine(w.id)).filter(Boolean).join(" · ");
  host.innerHTML =
    `<div class="mix-title" style="color:${primary.core}">${title}</div>` +
    `<div class="mix-pills">${pills}</div>` +
    `<div class="mix-row"><span class="mix-label">On screen</span>` +
      `<span class="mix-swatch">${swatchDotsFromRgbPal(pal)}</span>` +
      `<span class="mix-names">${mixNames || featNames}</span></div>` +
    `<div class="mix-row"><span class="mix-label">Featured</span>` +
      `<span class="mix-swatch">${swatchDotsFromEmotion(primary)}</span>` +
      `<span class="mix-names">${moodPanelLabel(primary)} · ${featNames}</span></div>`;
}

function fillMoodHexPanel() {
  keyHints.forEach((s) => {
    const em = EMOTIONS[s.dataset.k];
    const host = s.querySelector(".kh-hex") || s.querySelector(".kh-colors");
    const nameEl = s.querySelector(".kh-name");
    if (!em || !host) return;
    if (nameEl) nameEl.textContent = moodPanelLabel(em);
    const names = colorNamesLine(em.id);
    host.className = "kh-colors";
    host.innerHTML = `<span class="kh-dots">${swatchDotsFromEmotion(em)}</span><span class="kh-names">${names}</span>`;
  });
}
fillMoodHexPanel();
// Re-fill when D opens the panel (covers late DOM / cache oddities).
document.addEventListener("stv-demo-open", fillMoodHexPanel);
const btnMode = $("btn-mode");
const btnAuto = $("btn-auto");
const btnLabel = $("btn-label");
const fileInput = $("file-input");
const moodSwatch = $("mood-swatch");
const moodName = $("mood-name");
const moodConf = $("mood-conf");
const moodMode = $("mood-mode");
const moodPending = $("mood-pending");
const moodBars = $("mood-bars");
const moodFeats = $("mood-feats");
const toastEl = $("toast");

// Low-res "soft" buffer: everything drawn here is upscaled → naturally blurred glow (cheap on laptops)
const soft = document.createElement("canvas");
const sctx = soft.getContext("2d");
const SOFT_SCALE = 0.22;
// Mid buffer: soft layer is blurred here once (cheap at this size) → no blockiness / gradient dither when upscaled
const mid = document.createElement("canvas");
const mctx = mid.getContext("2d");
const MID_SCALE = 0.5;
// Glow sprites (re-tinted every frame as the palette crossfades)
const SPRITE = 64;
const spriteA = document.createElement("canvas");
const spriteB = document.createElement("canvas");
spriteA.width = spriteA.height = spriteB.width = spriteB.height = SPRITE;

const params = new URLSearchParams(location.search);
// Presenter mode: ?stage=1 = projector window (canvas only). A control window (control.html) drives it.
const STAGE_PARAM = params.get("stage") === "1";
// Beat in waves: OFF by default = waves follow loudness, spectrum and voice smoothly (no per-beat bumps,
// no AI bob, calmer built-in rhythm). ON (B key, ?beat=1) = the older behavior exactly.
let beatInWaves = params.get("beat") === "1";
const PRES = { send: null, connected: false, lastHello: 0, showLock: false, idleTimer: null };
const panelLive = () => demoMode || PRES.connected; // keep panel DOM updated when a control window mirrors it
const stageLocked = () => STAGE_PARAM || PRES.connected; // projector: panel never shows here
const STV_MOOD_MODEL = "v5-balance";
// Phone / coarse-pointer: lower DPR, leaner silk, friendlier start copy (mic still needs HTTPS on LAN).
const isPhone = (function () {
  try {
    const uaStr = navigator.userAgent || "";
    // UA phone OR (coarse AND small min side). Never coarse-only (touch MacBook stays laptop).
    const uaPhone = /iPhone|Android.+Mobile|Android.*Mobile/i.test(uaStr)
      || (/Android/i.test(uaStr) && !/Tablet|iPad/i.test(uaStr)
          && Math.min(window.innerWidth || 0, window.innerHeight || 0) < 600);
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const minSide = Math.min(window.innerWidth || 0, window.innerHeight || 0);
    return !!(uaPhone || (coarse && minSide < 520));
  } catch (_) { return false; }
})();
function isInsecureLan() {
  const h = location.hostname || "";
  if (h === "localhost" || h === "127.0.0.1") return false;
  try { if (window.isSecureContext) return false; } catch (_) {}
  return true;
}
function httpsLanUrl() {
  const path = (location.pathname || "/") + (location.search || "") + (location.hash || "");
  return "https://" + location.hostname + ":8443" + path;
}

// One-time clear of old taught prototypes that overfit Joy/Calm
(function () {
  try {
    if (localStorage.getItem("stv-mood-model") !== STV_MOOD_MODEL) {
      localStorage.removeItem("stv-prototypes");
      localStorage.setItem("stv-mood-model", STV_MOOD_MODEL);
    }
  } catch (_) {}
})();

// ---------- state ----------
let W = 0, H = 0, dpr = 1, SW = 0, SH = 0;
let targetKey = 2;
let blendMoodId = null; // secondary mood id when Auto hears two moods at once
let blendAmt = 0;       // 0..1 how much secondary hue is mixed in
let blendAmtTarget = 0;
let pal = null; // numeric crossfading palette
let lastMixWeights = [{ id: "calm", w: 1 }];
let fadeTau = 0.5;
let audioCtx = null, analyser = null, freqData = null, timeData = null;
let featAnalyser = null, featFreq = null, featTime = null;
let detector = null, decider = null;
let moodMode_ = "auto";
let lastHop = 0, lastHud = 0, lastDecision = null;
let trimDb = Number(localStorage.getItem("stv-trim") || 0);
const MOOD_HOP_MS = 50;

// ---------- AI mood layer (YAMNet + Essentia mood heads in a Web Worker; optional) ----------
// Runs about once a second next to the hand-made detector and only changes which mood is picked.
// Off with ?ai=0 or the I key / D-panel button. Any load error -> silent fallback to the hand detector.
const AI = {
  wanted: params.get("ai") !== "0",
  status: "off", // off | loading | ready | error
  backend: "", loadMs: 0, ms: 0, err: "",
  worker: null, tap: null, sink: null, tapNode: null, tapReady: null,
  fusion: null, last: null, lastAt: 0, runs: 0, msAvg: 0,
  motion: params.get("aimotion") !== "0", // AI drives color + wave motion (false = color only)
  kinds: { chant: 0, bowl: 0, drums: 0, singing: 0, speech: 0 }, kindsT: 0,
};
const AI_WEIGHT_DEFAULT = Math.max(0, Math.min(1, Number(params.get("aiw")) || 0.7));
let sourceNode = null, mediaEl = null, micStream = null;
let running = false;
let demoMode = false;
let labelOn = params.has("label") ? params.get("label") !== "0" : localStorage.getItem("stv-label") !== "0"; // soft whisper on
const t0 = performance.now();

// live audio → visual drivers (all 0..1)
const A = {
  amp: 0, ampSlow: 0, activity: 0, gate: 0, peak: 0.02,
  bass: 0, mid: 0, high: 0, bassSlow: 0, bassPeak: 0.05, midPeak: 0.05, highPeak: 0.05,
  lastOnset: -1, lastRing: -1e9, rippleAcc: 0, pulse: 0, flux: 0, fluxAvg: 0,
  spec: new Float32Array(64), // smoothed log-frequency spectrum for the waves
};
// Adaptive quality: if the laptop can't hold ~45 fps, quietly drop detail (audience never notices)
//   level 0 = full · 1 = fewer silk strands / ink trails · 2 = leaner. ?q=0|1|2 forces a level.
const QUALITY = [
  { strands: 11, trail: 7 },
  { strands: 7, trail: 5 },
  { strands: 5, trail: 3 }, // phone density floor: never below 5 strands
];
let qLevel = params.has("q")
  ? Math.max(0, Math.min(2, Number(params.get("q")) || 0))
  : (isPhone ? (Math.max(window.innerWidth || 0, window.innerHeight || 0) < 500 ? 2 : 1) : 0);
const qFixed = params.has("q");
// On phone never climb back to full 11-strand laptop quality (adaptive only drops further).
const qFloor = isPhone ? 1 : 0; // phone floor QUALITY[1]=7 strands; never thin strokes to save FPS
let qFrames = 0, qTime = 0, qSlow = 0;
function governQuality(dt) {
  if (qFixed || !running) return;
  if (qLevel < qFloor) qLevel = qFloor;
  qFrames++; qTime += dt;
  if (qTime < 2) return;
  const fps = qFrames / qTime;
  qFrames = 0; qTime = 0;
  qSlow = fps < 45 ? qSlow + 1 : 0;
  if (qSlow >= 2 && qLevel < 2) { qLevel++; qSlow = 0; }
}
let breathPhase = 0; // radians, advances slowly; silence = slow breath
let lastBreathRipple = 0;

const INKS = [];
const RIPPLES = [];
const MOTES = [];
const RIBBONS = [];
const PULSES = []; // travelling swells along the silk (spawned on strong attacks)
const PILLARS = []; // soft hanging light columns (TeamLab-style light field)
const LOVE_VOLUMES = []; // Love-only: layered parallax soft volumes (depth haze)
const LOVE_CAUSTICS = []; // Love-only: luminous liquid folds / soft caustic glows
const LOVE = {
  beat: 0, phase: 0, next: 0, strength: 0, // lub-dub heart synced to audio energy
  breath: 0, haze: 0, grain: 0, candle: 0, // intimate room drivers
};

// Per-emotion motif particles (soft, therapy-room safe — never full-frame flash/flood)
const JOY_SPARKS = [];
const JOY_BURSTS = []; // soft sunburst rays / stars
const RELEASE_RAIN = []; // falling tears / shards
const GROUND_SWELLS = []; // low mountain silhouettes
const CLARITY_RINGS = []; // diamonds / hex line shards (name kept)
const SPIRIT_RINGS = []; // sparse soft mandala layers
const ENERGY_BURSTS = []; // lightning zigzags
const CALM_SHEETS = []; // soft horizontal water sheets
const PATTERN = { acc: 0, lastBurst: -10 };

// Viz mode: wave (default, pre-silk traveling bands) | silk | nebula
let vizMode = "silk"; // "silk" | "wave" | "nebula" — yesterday showcase default is silk
const NEBULA_CLOUDS = []; // soft volumetric fog cells
const NEBULA_SPARKS = []; // high-pitch star flecks
const NEBULA = { swirl: 0, bloom: 0, presence: 0 };

// ---------- ASMR mode state ----------
// ASM is the smoothed 0..1 mix (exactly 0 when off and never toggled, so default math is unchanged).
const ASMR_SPEED = 0.35;     // wave travel speed vs normal (still travels L/R, just slow)
const ASMR_BREATH_S = 8.5;   // slow color breathing cycle (seconds)
let asmrMode = params.get("mode") === "asmr" || params.get("asmr") === "1";
let ASM = asmrMode ? 1 : 0;
let asmrLag = 0;     // accumulated time offset so wave travel slows without a phase jump
let asmrBreath = 0;  // phase of the slow color breath
let asmrSlow = 1;    // 1 normal → ASMR_SPEED in ASMR
let asmrGlow = 1;    // glow / opacity multiplier (lower + slowly breathing in ASMR)
let asmrSwell = 0;   // -1..1 * ASM
// Compressed + smoothed audio drivers used by the visuals in ASMR (mood detector never sees these).
const AS = { act: 0, bass: 0, mid: 0, high: 0, pulse: 0, spec: new Float32Array(64) };
const A_RAW = { activity: 0, pulse: 0, bass: 0, mid: 0, high: 0, spec: new Float32Array(64), saved: false };

let prevSpec = null;

// ---------- palette ----------
function hexRgb(h) {
  h = h.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
const PAL_COLORS = ["core", "glow", "accent", "particle", "deep"];
const PAL_NUMS = ["speed", "breathe", "density", "rise", "rippleRate", "wave", "silk"];
function numericPal(e) {
  const p = { bg0: hexRgb(e.bg[0]), bg1: hexRgb(e.bg[1]) };
  for (const k of PAL_COLORS) p[k] = hexRgb(e[k]);
  for (const k of PAL_NUMS) p[k] = e[k];
  return p;
}
/** When Auto hears two moods close together, mix the secondary hue into accent/particle. */
function updateMoodBlend(d) {
  if (moodMode_ !== "auto" || !d || !d.smooth) {
    blendMoodId = null;
    blendAmtTarget = 0;
    return;
  }
  const primary = d.current || EMOTIONS[targetKey].id;
  let second = null, s2 = 0;
  for (const id of MOOD_IDS) {
    if (id === primary) continue;
    const s = d.smooth[id] || 0;
    if (s > s2) { s2 = s; second = id; }
  }
  const p1 = d.smooth[primary] || 0;
  // both colors only when the runner-up is clearly present (shared mood feel)
  if (second && s2 >= 0.10 && s2 >= p1 * 0.28) {
    blendMoodId = second;
    blendAmtTarget = Math.min(0.45, 0.18 + 0.40 * (s2 / Math.max(p1, 0.01)));
  } else {
    blendMoodId = null;
    blendAmtTarget = 0;
  }
}

function stepPalette(dt) {
  blendAmt = smooth(blendAmt, blendAmtTarget, dt, 1.05 * (1 + 1.4 * ASM));
  // Auto: score-weighted color mix (top 1–2 moods). Manual: locked mood only.
  // Still keep updateMoodBlend for panel dual-hue notes; viz uses full score mix.
  const mixed = buildScoreMixTarget(lastDecision);
  lastMixWeights = mixed.weights;
  let tgt = mixed.tgt;
  // Also fold classic dual blendAmt into glow/particle when runner-up is strong
  if (blendMoodId && blendAmt > 0.02) {
    const secKey = keyForMood(blendMoodId);
    if (secKey) {
      const sec = numericPal(EMOTIONS[secKey]);
      const t = Math.max(0.25, blendAmt);
      tgt = Object.assign({}, tgt);
      tgt.glow = mix(tgt.glow, sec.core, t * 0.55);
      tgt.accent = mix(tgt.accent, sec.accent, t * 0.35);
      tgt.particle = mix(tgt.particle, sec.accent, t * 0.5);
      tgt.deep = mix(tgt.deep, sec.deep, t * 0.35);
    }
  }
  // Partial mood motion (MOTION_BLEND) on top of MOTION_BASE — lively Auto without full thrash.
  for (const n of PAL_NUMS) {
    const emo = tgt[n];
    const base = MOTION_BASE[n];
    tgt[n] = base + (emo - base) * MOTION_BLEND;
  }
  if (!pal) {
    pal = tgt;
  } else {
    const k = 1 - Math.exp(-dt / fadeTau);
    const lerp = (a, b) => a.map((v, i) => v + (b[i] - v) * k);
    pal.bg0 = lerp(pal.bg0, tgt.bg0);
    pal.bg1 = lerp(pal.bg1, tgt.bg1);
    for (const c of PAL_COLORS) pal[c] = lerp(pal[c], tgt[c]);
    // Smooth-ramp motion (same fadeTau as color) so mood shifts feel alive, not snapped.
    for (const n of PAL_NUMS) pal[n] += (tgt[n] - pal[n]) * k;
  }
  // brightness normaliser: bright palettes (gold, aqua, ice) are dimmed so every mood keeps a dark room
  const c = pal.core, lum = (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
  pal.lumK = Math.min(1, 0.5 / Math.max(0.2, lum));
  if (panelLive()) updateLiveComboPanel();
}
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (cur, tgt, dt, tau) => cur + (tgt - cur) * (1 - Math.exp(-dt / tau));
function rgbToHex(c) {
  const r = Math.max(0, Math.min(255, Math.round(c[0])));
  const g = Math.max(0, Math.min(255, Math.round(c[1])));
  const b = Math.max(0, Math.min(255, Math.round(c[2])));
  return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
/** Top mood weights from Auto smooth scores (v5). Second only if meaningfully close. */
function scoreMixWeights(d) {
  if (moodMode_ !== "auto" || !d || !d.smooth) {
    return [{ id: EMOTIONS[targetKey].id, w: 1 }];
  }
  const ranked = MOOD_IDS.map((id) => [id, d.smooth[id] || 0]).sort((a, b) => b[1] - a[1]);
  const [id1, s1] = ranked[0];
  const [id2, s2] = ranked[1] || [null, 0];
  // secondary when clearly present relative to leader (label + viz mix)
  if (!id2 || s2 < 0.10 || s2 < s1 * 0.28) return [{ id: id1, w: 1 }];
  const sum = s1 + s2;
  return [
    { id: id1, w: s1 / Math.max(sum, 1e-6) },
    { id: id2, w: s2 / Math.max(sum, 1e-6) },
  ];
}
function moodMixLabelFromWeights(weights) {
  if (!weights || !weights.length) return EMOTIONS[targetKey].label;
  const a = EMOTIONS[keyForMood(weights[0].id)];
  if (weights.length === 1 || weights[1].w < 0.18) return a.label;
  const b = EMOTIONS[keyForMood(weights[1].id)];
  return a.label + " + " + b.label;
}
function moodMixLabel(d) {
  return moodMixLabelFromWeights(scoreMixWeights(d || lastDecision));
}
/** Weighted palette from Auto scores so viz leans Joy but shows Energy influence, etc. */
function buildScoreMixTarget(d) {
  const weights = scoreMixWeights(d);
  const pals = weights.map((w) => ({ w: w.w, p: numericPal(EMOTIONS[keyForMood(w.id)]) }));
  const out = Object.assign({}, pals[0].p);
  const mixChan = (key) => {
    let acc = [0, 0, 0];
    for (const { w, p } of pals) {
      const c = p[key];
      acc[0] += c[0] * w; acc[1] += c[1] * w; acc[2] += c[2] * w;
    }
    return acc;
  };
  out.bg0 = mixChan("bg0");
  out.bg1 = mixChan("bg1");
  for (const k of PAL_COLORS) out[k] = mixChan(k);
  // nums: weighted too (MOTION_BLEND applied later)
  for (const n of PAL_NUMS) {
    out[n] = 0;
    for (const { w, p } of pals) out[n] += p[n] * w;
  }
  return { tgt: out, weights };
}

function tintSprite(cv, color, core) {
  const c = cv.getContext("2d");
  c.clearRect(0, 0, SPRITE, SPRITE);
  const g = c.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
  g.addColorStop(0, rgba(mix(color, [255, 255, 255], 0.55), 1));
  g.addColorStop(0.18, rgba(color, 0.85));
  g.addColorStop(0.45, rgba(core, 0.22));
  g.addColorStop(1, rgba(core, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, SPRITE, SPRITE);
}

// ---------- scene ----------
function resize() {
  // Soft by design. Laptop caps at 1.25 DPR (?hq=1 = full). Phone caps at 1.0 (1.15 max) for silk clarity.
  const dprCap = params.get("hq") === "1" ? (isPhone ? 1.75 : 2) : (isPhone ? 1.25 : 1.25);
  dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  const vv = window.visualViewport;
  W = Math.round((vv && vv.width) || window.innerWidth || document.documentElement.clientWidth || 320);
  H = Math.round((vv && vv.height) || window.innerHeight || document.documentElement.clientHeight || 480);
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Phone showcase soft/mid (research): softScale 0.28-0.32, midScale 0.50-0.55.
  const softScale = isPhone ? 0.30 : SOFT_SCALE;
  const midScale = isPhone ? 0.52 : MID_SCALE;
  SW = Math.max(48, Math.round(W * softScale));
  SH = Math.max(28, Math.round(H * softScale));
  soft.width = SW;
  soft.height = SH;
  mid.width = Math.max(64, Math.round(W * midScale));
  mid.height = Math.max(36, Math.round(H * midScale));
  seed();
}

function seed() {
  INKS.length = 0;
  MOTES.length = 0;
  RIBBONS.length = 0;
  RIPPLES.length = 0;
  PULSES.length = 0;
  PILLARS.length = 0;
  LOVE_VOLUMES.length = 0;
  LOVE_CAUSTICS.length = 0;
  LOVE.beat = 0; LOVE.phase = 0; LOVE.next = 0; LOVE.strength = 0;
  LOVE.breath = 0; LOVE.haze = 0; LOVE.grain = 0; LOVE.candle = 0;
  JOY_SPARKS.length = 0; JOY_BURSTS.length = 0;
  RELEASE_RAIN.length = 0; GROUND_SWELLS.length = 0;
  CLARITY_RINGS.length = 0; SPIRIT_RINGS.length = 0; ENERGY_BURSTS.length = 0;
  CALM_SHEETS.length = 0;
  PATTERN.acc = 0; PATTERN.lastBurst = -10;
  // Spiritual: sparse soft mandala (3 layers only — elegant, not ring clutter)
  for (let i = 0; i < 3; i++) {
    SPIRIT_RINGS.push({
      r0: 0.12 + i * 0.11, phase: i * 0.9, w: 0.018 + i * 0.004,
      a: 0.55 - i * 0.08, lobes: 6 + i, // petal-lobed mandala
    });
  }
  // Grounding: few large low mountain silhouettes along the floor
  for (let i = 0; i < 4; i++) {
    GROUND_SWELLS.push({
      x: 0.12 + i * 0.24 + (Math.random() - 0.5) * 0.04,
      w: 0.22 + Math.random() * 0.12, h: 0.14 + Math.random() * 0.1,
      ph: Math.random() * 10, lvl: 0, tint: i % 2 ? "glow" : "core",
      peaks: 2 + (i % 2), // mountain facet count
    });
  }
  // Calm: 4 soft horizontal water sheets drifting slowly
  for (let i = 0; i < 4; i++) {
    CALM_SHEETS.push({
      y: 0.28 + i * 0.16, h: 0.035 + Math.random() * 0.025,
      ph: Math.random() * 10, drift: 0.04 + Math.random() * 0.05,
      tint: i % 2 ? "core" : "accent", lvl: 0.55,
    });
  }
  // Love depth volumes: far / mid / near soft clouds that drift at different speeds
  for (let i = 0; i < 6; i++) {
    LOVE_VOLUMES.push({
      cx: 0.2 + Math.random() * 0.6, cy: 0.25 + Math.random() * 0.5,
      ax: 0.08 + Math.random() * 0.18, ay: 0.05 + Math.random() * 0.12,
      fx: 0.15 + Math.random() * 0.25, fy: 0.12 + Math.random() * 0.2,
      ph: Math.random() * 100, r: 0.28 + Math.random() * 0.32,
      depth: i < 2 ? 0.35 : i < 4 ? 0.6 : 0.9, // far → near
      color: i % 3 === 0 ? "deep" : (i % 3 === 1 ? "glow" : "accent"),
    });
  }
  // Liquid caustic folds — long soft ellipses that fold like ink in water
  for (let i = 0; i < 8; i++) {
    LOVE_CAUSTICS.push({
      u: Math.random(), v: 0.3 + Math.random() * 0.45,
      len: 0.18 + Math.random() * 0.28, thick: 0.04 + Math.random() * 0.06,
      ang: (Math.random() - 0.5) * 0.8, ph: Math.random() * 100,
      speed: 0.08 + Math.random() * 0.12, band: Math.random(),
      tint: i % 2 ? "core" : "accent",
    });
  }
  const colorOf = ["core", "accent", "glow", "deep", "core", "accent", "deep", "glow", "core"];
  for (let i = 0; i < 9; i++) {
    INKS.push({
      cx: 0.12 + Math.random() * 0.76, cy: 0.2 + Math.random() * 0.6,
      ax: 0.12 + Math.random() * 0.24, ay: 0.08 + Math.random() * 0.2,
      fx: 0.6 + Math.random() * 0.9, fy: 0.5 + Math.random() * 0.9,
      ph: Math.random() * 100, r: 0.2 + Math.random() * 0.24, color: colorOf[i],
    });
  }
  for (let i = 0; i < 220; i++) {
    MOTES.push({ x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0, size: 0.5 + Math.random() * 1.4,
      tw: Math.random() * Math.PI * 2, alt: Math.random() < 0.3, glow: 0,
      da: Math.random() * Math.PI * 2, ds: 0.4 + Math.random() * 0.8, fo: Math.random() * 1000 });
  }
  // Laptop: 6 bands × 11 strands (center fan capped). Phone: 4×7 (Synesthesia bristle / research).
  // Yesterday silk: laptop 6 bands × 11 strands; phone denser Synesthesia path 4×7
  const nRib = isPhone ? 4 : 6;
  const ribStep = isPhone ? 0.14 : 0.060; // further zoom-out spacing
  const ribBase = isPhone ? 0.52 : 0.48;
  for (let i = 0; i < nRib; i++) {
    const midI = (nRib - 1) / 2;
    RIBBONS.push({ base: ribBase + (i - midI) * ribStep, ph: Math.random() * 10, k: 0.85 + i * 0.4, w: 0.55 + i * 0.2,
      band: nRib <= 1 ? 0 : i / (nRib - 1), dir: i % 2 ? -1 : 1,
      color: ["core", "accent", "glow", "core", "accent", "glow"][i % 6], strands: isPhone ? 7 : 11 });
  }
  for (let i = 0; i < 7; i++) {
    PILLARS.push({ x: (i + 0.5) / 7 + (Math.random() - 0.5) * 0.06, ph: Math.random() * 10, w: 0.05 + Math.random() * 0.05,
      band: Math.abs(i - 3) / 3, color: i % 2 ? "accent" : "core", lvl: 0 });
  }
  seedNebula();
}

function seedNebula() {
  NEBULA_CLOUDS.length = 0;
  NEBULA_SPARKS.length = 0;
  NEBULA.swirl = 0; NEBULA.bloom = 0; NEBULA.presence = 0;
  // Laptop denser volumetric field; phone capped for 60fps target
  const nCloud = isPhone ? 28 : 56;
  const colors = ["core", "glow", "accent", "deep", "particle", "core", "glow", "accent"];
  for (let i = 0; i < nCloud; i++) {
    const layer = i / nCloud; // 0 far → 1 near
    NEBULA_CLOUDS.push({
      ang: Math.random() * Math.PI * 2,
      rad: 0.08 + Math.random() * 0.42 + layer * 0.08,
      size: 0.14 + Math.random() * 0.28 + (1 - layer) * 0.08,
      spin: (0.04 + Math.random() * 0.12) * (Math.random() < 0.5 ? -1 : 1),
      wobble: 0.3 + Math.random() * 0.7,
      ph: Math.random() * 100,
      layer,
      color: colors[i % colors.length],
      oval: 0.55 + Math.random() * 0.55,
    });
  }
}

// ---------- emotion ----------
const MOOD_IDS = MOOD_KEYS; // from mood.js, order = EMOTIONS keys 1..11 (hotkeys 1-9, 0, -)
const keyForMood = (id) => MOOD_IDS.indexOf(id) + 1;
let whisperTimer = null;

function setEmotion(key, source = "manual") {
  const e = EMOTIONS[key];
  if (!e) return;
  const changed = key !== targetKey;
  targetKey = key;
  if (source === "manual") { blendMoodId = null; blendAmtTarget = 0; }
  // Auto: quicker melt toward Vercel liveliness (~2.2 there); still softer than hard cuts.
  // Manual: snappy so the operator sees the lock.
  fadeTau = source === "auto" ? 2.6 : (source === "start" ? 1.1 : 1.15);
  if (asmrMode) fadeTau *= 2.2; // ASMR: mood colors melt even slower
  const mixLab = moodMode_ === "auto" ? moodMixLabel(lastDecision) : e.label;
  emotionLabel.textContent = mixLab.toUpperCase();
  emotionLabel.style.color = e.core;
  keyHints.forEach((s) => {
    const em = EMOTIONS[s.dataset.k];
    s.classList.toggle("active", s.dataset.k === String(key));
    const name = s.querySelector(".kh-name");
    if (em && name) name.style.color = em.core;
    else if (em) s.style.color = em.core;
  });
  if (changed || source === "start") whisper(e);
  if (changed && e.id === "love") {
    // Soft haze cue on manual lock. Patterns = shared sparks (tiny soft circles). No flower overlays.
    if (moodMode_ !== "auto") LOVE.haze = 0.35;
  }
  // Soft pattern seed on mood change (rising circles + sunbursts). Does not retarget silk motion.
  if (changed || source === "start") seedMoodPattern(e.id);
  updateMedia();
}

function whisper(e) {
  // Projection (show mode): never put text on screen. Labels only in demo (D) when L is on.
  if (!labelOn || !running) return;
  whisperEl.hidden = false;
  const mixLab = moodMode_ === "auto" ? moodMixLabel(lastDecision) : e.label;
  whisperEl.textContent = mixLab;
  whisperEl.style.color = e.core;
  whisperEl.classList.remove("on");
  void whisperEl.offsetWidth;
  whisperEl.classList.add("on");
  clearTimeout(whisperTimer);
  whisperTimer = setTimeout(() => whisperEl.classList.remove("on"), 4200);
}

function setLabel(on) {
  labelOn = on;
  localStorage.setItem("stv-label", on ? "1" : "0");
  document.body.classList.toggle("label-off", !on);
  if (btnLabel) btnLabel.textContent = on ? "Label: ON" : "Label: OFF";
  if (!on) {
    whisperEl.classList.remove("on");
    whisperEl.textContent = "";
    whisperEl.hidden = true;
  } else if (running) {
    whisper(EMOTIONS[targetKey]);
  }
}

// ---------- optional background media per emotion (assets/<id>.mp4|webm|jpg|png|webp) ----------
const MEDIA = {}; // id → {el, kind}
const mediaAlpha = {}; // id → current alpha
async function probeMedia() {
  if (!location.protocol.startsWith("http") || params.get("media") === "0") return;
  const exts = ["mp4", "webm", "jpg", "png", "webp"];
  await Promise.all(Object.values(EMOTIONS).map(async (e) => {
    for (const ext of exts) {
      const url = `assets/${e.id}.${ext}`;
      try {
        const r = await fetch(url, { method: "HEAD", cache: "no-store" });
        if (!r.ok) continue;
      } catch (_) { continue; }
      if (ext === "mp4" || ext === "webm") {
        const v = document.createElement("video");
        v.src = url; v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
        MEDIA[e.id] = { el: v, kind: "video" };
      } else {
        const img = new Image();
        img.src = url;
        MEDIA[e.id] = { el: img, kind: "image" };
      }
      mediaAlpha[e.id] = 0;
      break;
    }
  }));
  updateMedia();
}
function updateMedia() {
  const id = EMOTIONS[targetKey].id;
  for (const [mid, m] of Object.entries(MEDIA)) {
    if (m.kind !== "video") continue;
    if (mid === id) m.el.play().catch(() => {});
  }
}
function drawMedia(dt) {
  const cur = EMOTIONS[targetKey].id;
  for (const [id, m] of Object.entries(MEDIA)) {
    const tgt = id === cur ? 1 : 0;
    mediaAlpha[id] = smooth(mediaAlpha[id], tgt, dt, fadeTau);
    if (id !== cur && mediaAlpha[id] < 0.01 && m.kind === "video" && !m.el.paused) m.el.pause();
    if (mediaAlpha[id] < 0.01) continue;
    const el = m.el;
    const iw = m.kind === "video" ? el.videoWidth : el.naturalWidth;
    const ih = m.kind === "video" ? el.videoHeight : el.naturalHeight;
    if (!iw || !ih) continue;
    const s = Math.max(W / iw, H / ih) * (1.04 + 0.02 * Math.sin(breathPhase)); // cover + gentle breathing zoom
    const loveBoost = id === "love" ? 0.18 : 0;
    ctx.globalAlpha = mediaAlpha[id] * (0.48 + loveBoost + 0.12 * A.activity + (id === "love" ? 0.06 * LOVE.breath : 0));
    ctx.globalCompositeOperation = id === "love" ? "screen" : "source-over";
    ctx.drawImage(el, (W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s);
    ctx.globalCompositeOperation = "source-over";
  }
  ctx.globalAlpha = 1;
}

// ---------- auto / manual ----------
function setMoodMode(mode) {
  moodMode_ = mode;
  document.body.classList.toggle("mood-auto", mode === "auto");
  document.body.classList.toggle("mood-manual", mode === "manual");
  if (btnAuto) btnAuto.textContent = mode === "auto" ? "Auto mood: ON" : "Auto mood: OFF";
  if (mode === "manual") {
    blendMoodId = null;
    blendAmtTarget = 0;
  } else if (mode === "auto" && decider) {
    decider.current = EMOTIONS[targetKey].id;
    decider.candidate = null;
    decider.lastSwitchT = -1e9;
  }
  renderMoodHud(true);
}

let toastTimer = null;
function toast(msg) {
  if (PRES.connected && PRES.send) PRES.send({ t: "toast", msg });
  if (!demoMode) return; // never flash operator messages over the projection
  toastEl.textContent = msg;
  toastEl.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("on"), 2200);
}

function loadTaught() {
  try {
    const p = JSON.parse(localStorage.getItem("stv-prototypes") || "null");
    if (p && detector) for (const k of MOOD_IDS) {
      if (!Array.isArray(p[k]) || p[k].length < 6) continue;
      // v2 saves had 6 features; keep them and take the new harmony features (major, motion) from defaults
      detector.prototypes[k] = DEFAULT_PROTOTYPES[k].map((d, i) => (Number.isFinite(p[k][i]) ? p[k][i] : d));
    }
  } catch (_) {}
}
function teachMood(key) {
  if (!detector || !detector.state.warm || detector.state.silent) return toast("Teach needs live sound: play a reference song first");
  detector.teach(EMOTIONS[key].id, 0.6);
  localStorage.setItem("stv-prototypes", JSON.stringify(detector.prototypes));
  toast("Taught " + EMOTIONS[key].label + " from the current sound (saved on this laptop)");
}
function resetTeaching() {
  localStorage.removeItem("stv-prototypes");
  if (detector) detector.resetPrototypes();
  toast("Mood teaching reset to defaults");
}
function setTrim(db) {
  trimDb = Math.max(-24, Math.min(24, db));
  localStorage.setItem("stv-trim", String(trimDb));
  if (detector) detector.trimDb = trimDb;
  toast("Input trim " + (trimDb >= 0 ? "+" : "") + trimDb + " dB (mood loudness only)");
}

function buildMoodBars() {
  moodBars.innerHTML = "";
  for (let k = 1; k <= MOOD_COUNT; k++) {
    const b = document.createElement("div");
    b.className = "mbar";
    b.title = EMOTIONS[k].label;
    b.innerHTML = `<i style="background:${EMOTIONS[k].core};color:${EMOTIONS[k].core}"></i><span>${k === 10 ? 0 : k === 11 ? "-" : k}</span>`;
    moodBars.appendChild(b);
  }
}

function renderMoodHud(force) {
  if (!panelLive() && !force) return; // operator panel hidden → don't spend time on DOM
  const now = performance.now();
  if (!force && now - lastHud < 120) return;
  lastHud = now;
  const st = detector && detector.state;
  const d = lastDecision;
  moodMode.textContent = moodMode_ === "auto" ? "AUTO" : "MANUAL LOCK";
  if (!st || !running) {
    moodName.textContent = "waiting for sound";
    moodName.style.color = "";
    moodConf.textContent = "";
    moodPending.textContent = "";
    moodSwatch.style.background = "transparent";
    return;
  }
  if (st.silent || !st.warm || !d) {
    moodName.textContent = st.silent ? "listening… (quiet)" : "listening…";
    moodName.style.color = "";
    moodConf.textContent = "";
    moodPending.textContent = "holding " + EMOTIONS[targetKey].label;
  } else {
    const weights = scoreMixWeights(d);
    const e = EMOTIONS[keyForMood(weights[0].id || d.current || d.top)];
    const mixLab = moodMixLabelFromWeights(weights);
    const e2 = weights.length > 1 ? EMOTIONS[keyForMood(weights[1].id)] : null;
    moodName.textContent = mixLab.toUpperCase();
    moodName.style.color = e.core;
    emotionLabel.textContent = mixLab.toUpperCase();
    emotionLabel.style.color = e.core;
    moodSwatch.style.background = e2
      ? "linear-gradient(90deg," + e.core + " " + Math.round(weights[0].w * 100) + "%," + e2.core + ")"
      : e.core;
    moodSwatch.style.boxShadow = "0 0 12px " + e.glow;
    moodConf.textContent = Math.round(d.conf * 100) + "%";
    if (moodMode_ === "manual") moodPending.textContent = "screen locked on " + EMOTIONS[targetKey].label + " · A = follow song";
    else if (d.pending) moodPending.textContent = "→ " + EMOTIONS[keyForMood(d.pending)].label + "? " + Math.round(d.pendingProgress * 100) + "%";
    else if (e2) moodPending.textContent = "mix · " + e.label + " " + Math.round(weights[0].w * 100) + "% + " + e2.label + " " + Math.round(weights[1].w * 100) + "%";
    else moodPending.textContent = "";
    // Keep projection whisper in sync with mix names when labels are on
    if (labelOn && whisperEl.classList.contains("on")) {
      whisperEl.textContent = mixLab;
      whisperEl.style.color = e.core;
    }
  }
  if (d) {
    const bars = moodBars.children;
    for (let k = 1; k <= MOOD_COUNT && k <= bars.length; k++) {
      bars[k - 1].firstChild.style.height = Math.round(4 + (d.smooth[EMOTIONS[k].id] || 0) * 56) + "px";
      bars[k - 1].classList.toggle("top", EMOTIONS[k].id === d.top);
    }
  }
  const f = st.features;
  moodFeats.textContent =
    `energy ${f[0].toFixed(2)} · bright ${f[1].toFixed(2)} (${Math.round(st.centroidHz)} Hz) · onsets ${st.onsetRate.toFixed(1)}/s · ` +
    `steady ${f[3].toFixed(2)} · tonal ${f[4].toFixed(2)} · low ${f[5].toFixed(2)} · level ${Math.round(st.levelDb)} dB · ` +
    `trim ${trimDb >= 0 ? "+" : ""}${trimDb} · wave ${A.activity.toFixed(2)}`;
}

function updateMood(now) {
  if (!running || !featAnalyser || !detector || now - lastHop < MOOD_HOP_MS) return;
  lastHop = now;
  featAnalyser.getFloatFrequencyData(featFreq);
  featAnalyser.getFloatTimeDomainData(featTime);
  const t = now / 1000;
  const st = detector.analyze(featFreq, featTime, t);
  // AI layer: blend its once-a-second verdict into the hand detector's probabilities (no-op when off / not ready)
  const d = decider.update(AI.fusion && AI.status === "ready" ? AI.fusion.fuse(st, t) : st, t);
  if (panelLive() && now - AI.lastPanel > 250) { AI.lastPanel = now; renderAIPanel(); }
  lastDecision = d;
  if (moodMode_ === "auto" && d.switched && d.current) setEmotion(keyForMood(d.current), "auto");
  updateMoodBlend(d);
  renderMoodHud(false);
}

function setDemoMode(on) {
  if (on && (stageLocked() || PRES.showLock)) on = false; // projector / show mode: panel stays away
  demoMode = on;
  document.body.classList.toggle("mode-demo", on);
  document.body.classList.toggle("mode-show", !on);
  if (on) {
    fillMoodHexPanel();
    updateLiveComboPanel();
    renderMoodHud(true);
  } else {
    // Leaving demo → wipe any operator text so projection stays clean
    whisperEl.classList.remove("on");
    whisperEl.textContent = "";
    whisperEl.hidden = true;
    toastEl.classList.remove("on");
  }
}

// ---------- AI mood layer ----------
const BUILD_Q = (() => { const m = /[?&]v=([0-9a-f]+)/.exec([...document.scripts].map((x) => x.src).join(" ")); return m ? "?v=" + m[1] : ""; })();
function initAI() {
  if (AI.worker || AI.status === "error") return;
  if (typeof AIFusion === "undefined" || typeof Worker === "undefined" || !audioCtx || !audioCtx.audioWorklet) {
    AI.status = "error"; AI.err = "browser has no Worker / AudioWorklet"; updateAIButton(); return;
  }
  AI.fusion = new AIFusion({ weight: AI_WEIGHT_DEFAULT, enabled: AI.wanted });
  AI.status = "loading"; updateAIButton();
  try {
    AI.worker = new Worker("ai-worker.js" + BUILD_Q);
  } catch (e) { AI.status = "error"; AI.err = String(e.message || e); updateAIButton(); return; }
  AI.worker.onmessage = (e) => {
    const m = e.data || {};
    if (m.type === "ready") { AI.status = "ready"; AI.backend = m.backend; AI.loadMs = m.loadMs; updateAIButton(); }
    else if (m.type === "result") {
      if (m.silent) return;
      AI.last = m; AI.lastAt = performance.now(); AI.runs++;
      AI.msAvg = AI.msAvg ? AI.msAvg * 0.8 + m.ms * 0.2 : m.ms;
      if (AI.fusion) AI.fusion.push(m, performance.now() / 1000);
      if (m.kinds) {
        const tn = performance.now() / 1000, kk = AI.kindsT ? 1 - Math.exp(-Math.min(3, tn - AI.kindsT) / 2.0) : 1;
        for (const key in AI.kinds) AI.kinds[key] += ((m.kinds[key] || 0) - AI.kinds[key]) * kk;
        AI.kindsT = tn;
      }
    } else if (m.type === "error") {
      if (m.where === "init") { AI.status = "error"; AI.err = m.message; updateAIButton(); try { AI.worker.terminate(); } catch (_) {} }
      else AI.err = m.message;
    }
  };
  AI.worker.onerror = (e) => { AI.status = "error"; AI.err = (e && e.message) || "worker failed"; updateAIButton(); };
  AI.worker.postMessage({ type: "init", sampleRate: audioCtx.sampleRate });
  AI.tapReady = audioCtx.audioWorklet.addModule("ai-tap-worklet.js" + BUILD_Q).then(() => {
    AI.tapNode = new AudioWorkletNode(audioCtx, "ai-tap", { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    AI.sink = audioCtx.createGain(); AI.sink.gain.value = 0; // keeps the tap running; adds no sound
    AI.tapNode.connect(AI.sink); AI.sink.connect(audioCtx.destination);
    const ch = new MessageChannel();
    AI.tapNode.port.postMessage({ port: ch.port1 }, [ch.port1]);
    AI.worker.postMessage({ type: "port", port: ch.port2 }, [ch.port2]);
    return AI.tapNode;
  }).catch((e) => { AI.status = "error"; AI.err = "worklet: " + (e.message || e); updateAIButton(); return null; });
}
function connectAITap(src) {
  if (!AI.tapReady || !src) return;
  AI.tapReady.then((node) => { if (node && sourceNode === src) try { src.connect(node); } catch (_) {} });
}
function setAIOn(on) {
  AI.wanted = on;
  if (on && !AI.worker && audioCtx) { initAI(); connectAITap(sourceNode); }
  if (AI.worker) AI.worker.postMessage({ type: "pause", paused: !on });
  if (AI.fusion) AI.fusion.enabled = on;
  updateAIButton();
  toast(on ? (AI.status === "error" ? "AI unavailable (" + AI.err + "), hand detector only" : "AI mood: ON") : "AI mood: OFF (hand detector only)");
}
function updateAIButton() {
  const b = $("btn-ai");
  if (b) b.textContent = "AI: " + (!AI.wanted ? "OFF" : AI.status === "ready" ? "ON" : AI.status === "loading" ? "loading" : AI.status === "error" ? "n/a" : "ON");
  renderAIPanel();
}
function renderAIPanel() {
  const box = $("ai-panel");
  if (!box) return;
  const st = $("ai-status"), top = $("ai-top"), moods = $("ai-moods"), heads = $("ai-heads"), wv = $("ai-weight-val");
  const age = AI.lastAt ? (performance.now() - AI.lastAt) / 1000 : Infinity;
  if (st) st.textContent = !AI.wanted ? "off (hand detector only)"
    : AI.status === "ready" ? `on · ${AI.backend} · ${Math.round(AI.msAvg)} ms per run · load ${(AI.loadMs / 1000).toFixed(1)} s · weight in use ${Math.round((AI.fusion ? AI.fusion.w : 0) * 100)}%` + (age > 4 && running ? " · waiting for sound" : "")
    : AI.status === "loading" ? "loading models…" : AI.status === "error" ? "not available: " + AI.err : "starts with the mic / track";
  if (wv && AI.fusion) wv.textContent = Math.round(AI.fusion.weight * 100) + "%";
  const m = AI.last;
  if (top) top.textContent = m && m.top ? m.top.map(([n, v]) => `${n} ${Math.round(v * 100)}%`).join(" · ") : "–";
  if (moods) moods.innerHTML = m && m.probs ? Object.entries(m.probs).sort((a, b) => b[1] - a[1]).map(([k, v]) => {
    const e = EMOTIONS[keyForMood(k)];
    return `<span class="ai-pill"><i style="background:${e.core}"></i>${e.label} ${Math.round(v * 100)}%</span>`;
  }).join("") + `<span class="ai-pill dim">AI sure ${Math.round((m.conf || 0) * 100)}%</span>` : "";
  if (heads) heads.textContent = m && m.heads ? Object.entries(m.heads).map(([k, v]) => `${k} ${Math.round(v * 100)}`).join(" · ") : "";
  const mo = $("ai-motion-vals");
  if (mo) {
    const f = (x) => x.toFixed(2), kd = AI.kinds;
    mo.textContent = !AI.motion ? "motion: off (AI changes color only)"
      : `motion strength ${f(AIM.str)} · speed ×${f(AIM.speed)} · wave length ×${f(AIM.wl)} · height ×${f(AIM.amp)} · ` +
        `drift ${AIM.drift > 0 ? "down" : "up"} ${Math.round(Math.abs(AIM.drift) * 100)}% · bounce ${f(AIM.bounce)} · swell ${f(AIM.swell)} · ` +
        `hits ${f(AIM.hit)} · voice ${f(AIM.voice)} · steady ${f(AIM.steady)} · patterns: rings ${f(AIM.pRing)} rise ${f(AIM.pRise)} sparks ${f(AIM.pSpark)} fall ${f(AIM.pFall)}` +
        ` · hears: chant ${f(kd.chant)} bowl ${f(kd.bowl)} drums ${f(kd.drums)} singing ${f(kd.singing)} speech ${f(kd.speech)}`;
  }
}
AI.lastPanel = 0;

// ---------- AI motion profile (AI sound type + AI mood -> wave motion and patterns) ----------
// Every value is exactly neutral (1 or 0) while AI is off, not loaded, or set to color only, so the
// look is then identical to the build without it. Targets ease over ~2.5 s and scale with AI confidence.
const AIM_NEUTRAL = { speed: 1, wl: 1, amp: 1, drift: 0, bounce: 0, swell: 0, hit: 0, voice: 0, steady: 0, pRing: 0, pRise: 0, pSpark: 0, pFall: 0, str: 0 };
const AIM = Object.assign({}, AIM_NEUTRAL, { bouncePh: 0, swellPh: 0, accRing: 0, accRise: 0, accSpark: 0, accFall: 0 });
let aiLag = 0; // wave clock offset from AI speed (0 unless the AI changed the speed)
function aiMotionTargets() {
  const T = Object.assign({}, AIM_NEUTRAL);
  if (!AI.wanted || !AI.motion || AI.status !== "ready" || !AI.fusion || !AI.fusion.have) return T;
  const age = (performance.now() - AI.lastAt) / 1000;
  const fresh = clamp01(1 - (age - 3.5) / 2);
  const str = clamp01(AI.fusion.conf) * fresh;
  if (str <= 0.01) return T;
  // mood side: the fused, smoothed mood scores (hand detector + AI), so shape matches the mood on screen
  const sm = lastDecision && lastDecision.smooth, af = AI.fusion.probs, p = {};
  for (const key in af) p[key] = sm && sm[key] != null ? 0.65 * sm[key] + 0.35 * af[key] : af[key];
  const k = AI.kinds;
  const music = AI.last ? clamp01(AI.last.music || 0) : 0;
  const sacred = clamp01(Math.max(AI.fusion.sacred, k.chant, k.bowl));
  const drums = clamp01(k.drums * 1.3) * music;
  const voice = clamp01(k.singing * 1.6) * (1 - 0.6 * sacred);
  const speech = k.speech;
  const c = asmrMode ? 0.5 : 1; // ASMR: everything softer
  const lim = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
  // what the AI hears (sound type) + how it feels (AI mood), as raw targets
  let speed = 1 + 0.4 * p.energy + 0.15 * p.joy - 0.3 * p.calm - 0.2 * p.spirit - 0.12 * p.release - 0.1 * p.love - 0.35 * sacred - 0.08 * speech;
  let wl = 1 + 0.55 * sacred + 0.4 * p.calm + 0.15 * p.spirit + 0.12 * p.love - 0.25 * p.energy - 0.1 * p.joy;
  let amp = 1 + 0.5 * p.energy + 0.15 * p.joy + 0.08 * p.love - 0.3 * p.calm - 0.12 * sacred - 0.1 * speech;
  let drift = 0.13 * p.release - 0.07 * p.spirit - 0.02 * k.chant; // + = down
  // new moods: Sad sinks slow and heavy, Wonder slow and wide, Intensity a bit taller with firmer hits
  const pSad = p.sad || 0, pWon = p.wonder || 0, pInt = p.intensity || 0;
  speed += -0.3 * pSad - 0.2 * pWon + 0.15 * pInt;
  wl += 0.2 * pSad + 0.45 * pWon - 0.1 * pInt;
  amp += -0.1 * pSad + 0.1 * pWon + 0.2 * pInt;
  drift += 0.12 * pSad - 0.03 * pWon;
  speed = lim(speed, 0.5, 1.4); wl = lim(wl, 0.75, 1.6); amp = lim(amp, 0.6, 1.5); drift = lim(drift, -0.06, 0.06);
  T.str = str;
  const e = str * c;
  T.speed = 1 + (speed - 1) * e;
  T.wl = 1 + (wl - 1) * e;
  T.amp = 1 + (amp - 1) * e;
  T.drift = drift * e;
  T.bounce = beatInWaves ? clamp01(1.1 * p.joy + 0.35 * drums) * e : 0; // beat off: no fixed-rate bob
  T.swell = clamp01(1.3 * p.love) * e;
  T.hit = clamp01(drums + 0.8 * pInt) * e;
  T.voice = voice * str * (asmrMode ? 0.7 : 1);
  T.steady = clamp01(sacred * 1.2 + 0.5 * p.calm) * e;
  T.pRing = clamp01(k.bowl * 1.5 + 1.2 * pWon) * e;
  T.pRise = clamp01(Math.max(k.chant * 1.3, p.spirit)) * e;
  T.pSpark = clamp01(p.joy + 0.7 * drums + 0.6 * p.energy + 0.8 * pInt) * e;
  T.pFall = clamp01(1.2 * p.release + 1.2 * pSad) * e;
  if (asmrMode) { T.speed = Math.min(T.speed, 1.12); T.amp = Math.min(T.amp, 1.15); T.hit *= 0.5; T.bounce *= 0.6; }
  return T;
}
function stepAIMotion(dt) {
  const T = aiMotionTargets();
  for (const key in AIM_NEUTRAL) {
    let v = AIM[key];
    if (v === T[key]) continue;
    v = smooth(v, T[key], dt, 2.5);
    if (Math.abs(v - T[key]) < 1e-4 && T[key] === AIM_NEUTRAL[key]) v = T[key]; // land exactly on neutral
    AIM[key] = v;
  }
  if (AIM.speed !== 1) aiLag += dt * (1 - AIM.speed) * (asmrMode ? asmrSlow : 1);
  if (AIM.bounce > 0) AIM.bouncePh += dt * Math.PI * 2 * 1.6; // lively ~1.6 Hz bob
  if (AIM.swell > 0) AIM.swellPh += dt * Math.PI * 2 / 5; // warm ~5 s swell
}
// extra AI-picked patterns, blended with the per-mood ones (only runs when the profile is active)
const AI_STYLE = {
  rise: { dens: 0.5, rise: 0.55, speed: 0.45, burst: 0.2, size: 1.0, maxS: 34, maxB: 2, y0: 0.55, y1: 0.95, drift: 0.35, star: 0.3 },
  spark: { dens: 1.0, rise: 1, speed: 1.15, burst: 0.8, size: 0.95, maxS: 44, maxB: 3, y0: 0.5, y1: 0.92, drift: 1.0, star: 0.55 },
  fall: { dens: 0.5, rise: -0.85, speed: 0.5, burst: 0.1, size: 0.9, maxS: 34, maxB: 1, y0: 0.05, y1: 0.4, drift: 0.4, star: 0.1 },
};
function aiPatterns(dt) {
  if (AIM.str <= 0.02) return;
  const act = A.activity, c = asmrMode ? 0.5 : 1;
  const tick = (key, rate, fn) => { AIM[key] += dt * rate * c; while (AIM[key] > 1) { AIM[key] -= 1; fn(); } };
  tick("accRing", 0.45 * AIM.pRing, () => spawnRipple(0.22 + 0.3 * act, null, asmrMode));
  tick("accRise", 1.6 * AIM.pRise, () => spawnMoodSpark(0.35 + 0.4 * act, AI_STYLE.rise));
  tick("accSpark", 2.6 * AIM.pSpark * (act > 0.05 ? 1 : 0), () => spawnMoodSpark(0.4 + 0.5 * act, AI_STYLE.spark));
  tick("accFall", 1.5 * AIM.pFall, () => spawnMoodSpark(0.3 + 0.4 * act, AI_STYLE.fall));
}
function setAIMotion(on) {
  AI.motion = on;
  const b = $("ai-motion"); if (b) b.textContent = on ? "color + motion" : "color only";
  toast(on ? "AI drives color + wave motion" : "AI drives color only");
}

// ---------- audio ----------
async function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser(); // visuals: responsive
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.55;
    analyser.minDecibels = -95;
    analyser.maxDecibels = -25;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    timeData = new Float32Array(analyser.fftSize);
    featAnalyser = audioCtx.createAnalyser(); // mood: sharp onsets
    featAnalyser.fftSize = 2048;
    featAnalyser.smoothingTimeConstant = 0.2;
    featFreq = new Float32Array(featAnalyser.frequencyBinCount);
    featTime = new Float32Array(featAnalyser.fftSize);
    detector = new MoodDetector({ sampleRate: audioCtx.sampleRate, fftSize: 2048, trimDb });
    decider = new MoodDecider({ initial: EMOTIONS[targetKey].id });
    loadTaught();
    if (AI.wanted) initAI(); // lazy: models load only after the mic / track starts, and only if AI is on
  }
  if (audioCtx.state === "suspended") await audioCtx.resume();
}

function disconnectSource() {
  if (sourceNode) { try { sourceNode.disconnect(); } catch (_) {} sourceNode = null; }
  if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  if (mediaEl) {
    mediaEl.pause();
    if (mediaEl.src.startsWith("blob:")) try { URL.revokeObjectURL(mediaEl.src); } catch (_) {}
    mediaEl.src = "";
    mediaEl = null;
  }
}
function resetMood() {
  if (detector) detector.reset();
  if (decider) decider.reset(EMOTIONS[targetKey].id);
  if (AI.fusion) AI.fusion.reset();
  if (AI.worker) AI.worker.postMessage({ type: "reset" });
  lastDecision = null;
}
function goLive(msg) {
  resetMood();
  statusEl.textContent = msg;
  document.body.classList.add("playing");
  running = true;
  setEmotion(targetKey, "start");
}

function micBlockedMessage(err) {
  const base = "Mic blocked.";
  if (isInsecureLan()) {
    return base + " On phone use " + httpsLanUrl() + " (accept the certificate warning once), or allow mic in browser settings. Laptop: http://localhost:8765 is fine.";
  }
  const detail = (err && (err.message || String(err))) || "allow mic in browser settings";
  return base + " " + detail + ". On phone prefer https://" + (location.hostname || "LAN-IP") + ":8443 or allow mic in browser settings.";
}

function showMicHelp(msg) {
  statusEl.textContent = msg;
  const hint = $("start-hint");
  if (hint && !running) {
    hint.textContent = isInsecureLan()
      ? ("Mic needs HTTPS. Open " + httpsLanUrl())
      : "Mic blocked. Allow the mic, or use HTTPS.";
    hint.classList.add("wrap");
  }
  toast(msg);
  setDemoMode(true);
}

async function getMicStream() {
  const advanced = {
    audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
  };
  const plain = { audio: true };
  try {
    return await navigator.mediaDevices.getUserMedia(advanced);
  } catch (e1) {
    return await navigator.mediaDevices.getUserMedia(plain);
  }
}

async function startMic() {
  if (isInsecureLan()) {
    const msg = micBlockedMessage({ message: "insecure context (http on LAN)" });
    showMicHelp(msg);
    return;
  }
  try {
    await ensureAudio();
    disconnectSource();
    micStream = await getMicStream();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    try {
      sourceNode = audioCtx.createMediaStreamSource(micStream);
    } catch (wireErr) {
      if (audioCtx.state === "suspended") await audioCtx.resume();
      sourceNode = audioCtx.createMediaStreamSource(micStream);
    }
    sourceNode.connect(analyser);
    sourceNode.connect(featAnalyser);
    connectAITap(sourceNode);
    goLive("Mic live");
  } catch (err) {
    showMicHelp(micBlockedMessage(err));
  }
}

async function playUrl(url, name) {
  try {
    await ensureAudio();
    disconnectSource();
    mediaEl = new Audio();
    mediaEl.src = url;
    mediaEl.loop = true;
    await mediaEl.play();
    sourceNode = audioCtx.createMediaElementSource(mediaEl);
    sourceNode.connect(analyser);
    sourceNode.connect(featAnalyser);
    sourceNode.connect(audioCtx.destination);
    connectAITap(sourceNode);
    goLive("Playing: " + name);
  } catch (err) {
    statusEl.textContent = "Track error: " + (err.message || err);
    setDemoMode(true);
  }
}
const loadFile = (file) => file && playUrl(URL.createObjectURL(file), file.name);

function begin() {
  if (running) return;
  const track = params.get("track");
  if (track) playUrl(track, track);
  else startMic();
}

/** Per-frame audio drivers. Adaptive so a quiet room mic and a loud track both "wake" the waves. */
function readAudio(dt, time) {
  if (!running || !analyser) {
    A.amp = smooth(A.amp, 0, dt, 0.3);
    A.activity = smooth(A.activity, 0, dt, 1.2);
    A.bass = A.mid = A.high = 0;
    A.pulse = smooth(A.pulse, 0, dt, 0.4);
    for (let i = 0; i < A.spec.length; i++) A.spec[i] *= 0.95;
    return;
  }
  analyser.getFloatTimeDomainData(timeData);
  analyser.getByteFrequencyData(freqData);
  let ss = 0;
  for (let i = 0; i < timeData.length; i++) ss += timeData[i] * timeData[i];
  const rms = Math.sqrt(ss / timeData.length);
  const db = 20 * Math.log10(rms + 1e-9) + trimDb;
  // silence gate (room hiss stays dark), adaptive peak (quiet mic still lights up), absolute loudness (dynamics)
  A.gate = smooth(A.gate, clamp01((db + 64) / 10), dt, 0.15);
  A.peak = rms > A.peak ? rms : Math.max(0.006, A.peak * Math.exp(-dt / 12));
  const rel = clamp01(rms / A.peak);
  const abs = clamp01((db + 60) / 40);
  A.amp = clamp01((0.6 * rel + 0.5 * abs) * A.gate);

  // bands from the visual spectrum (byte 0..255 already in dB scale)
  const binHz = audioCtx.sampleRate / analyser.fftSize;
  const band = (lo, hi) => {
    const a = Math.max(1, Math.floor(lo / binHz)), b = Math.min(freqData.length - 1, Math.ceil(hi / binHz));
    let s = 0;
    for (let i = a; i <= b; i++) s += freqData[i];
    return s / ((b - a + 1) * 255);
  };
  const rb = band(30, 200), rm = band(200, 2000), rh = band(2000, 8000);
  A.bassPeak = Math.max(rb, A.bassPeak * Math.exp(-dt / 10), 0.05);
  A.midPeak = Math.max(rm, A.midPeak * Math.exp(-dt / 10), 0.05);
  A.highPeak = Math.max(rh, A.highPeak * Math.exp(-dt / 10), 0.05);
  A.bass = clamp01((rb / A.bassPeak) ** 1.4) * A.gate;
  A.mid = clamp01((rm / A.midPeak) ** 1.4) * A.gate;
  A.high = clamp01((rh / A.highPeak) ** 1.4) * A.gate;

  // log-frequency spectrum (60 Hz–7 kHz) for the silk waves (+ spectral flux → visual onsets)
  const n = A.spec.length;
  if (!prevSpec) prevSpec = new Float32Array(n);
  let flux = 0;
  for (let i = 0; i < n; i++) {
    const f0 = 60 * Math.pow(7000 / 60, i / n), f1 = 60 * Math.pow(7000 / 60, (i + 1) / n);
    const v = band(f0, f1);
    const tgt = clamp01((v - 0.12) / 0.6) * A.gate;
    if (tgt > prevSpec[i]) flux += tgt - prevSpec[i];
    prevSpec[i] = tgt;
    // smooth attack/release: silk flows with the music (no snap flashes)
    A.spec[i] += (tgt - A.spec[i]) * (tgt > A.spec[i] ? 0.32 : 0.1);
  }
  flux /= n;
  A.flux = flux;
  A.fluxAvg = smooth(A.fluxAvg, flux, dt, 0.8);

  // activity: fast attack, slow release → waves "wake" with sound and settle into breath
  A.activity = A.amp > A.activity ? smooth(A.activity, A.amp, dt, 0.08) : smooth(A.activity, A.amp, dt, 1.4);
  A.pulse = smooth(A.pulse, 0, dt, 0.35);

  // onsets → ripples + silk swells (voice swells, drum hits, bowl strikes). Gate keeps room hiss calm.
  const prevSlow = A.ampSlow;
  A.ampSlow = smooth(A.ampSlow, A.amp, dt, 0.35);
  const prevBass = A.bassSlow;
  A.bassSlow = smooth(A.bassSlow, A.bass, dt, 0.3);
  const fluxHit = flux - A.fluxAvg * 1.6 - 0.025;
  const rise = Math.max(A.amp - prevSlow - 0.08, A.bass - prevBass - 0.15, fluxHit * 3);
  if (asmrMode) {
    asmrOnsets(time, rise, A.amp - prevSlow, fluxHit);
  } else {
  if (rise > 0 && A.gate > 0.45 && time - A.lastOnset > 0.55) {
    A.lastOnset = time;
    const st = clamp01(0.28 + rise * 1.6);
    // rare soft halo only — silk + sparks carry the show
    if (beatInWaves) {
      if (st > 0.35 && Math.random() < 0.55) spawnRipple(st * 0.7);
      A.pulse = Math.max(A.pulse, Math.min(0.2, st * 0.28)); // soft swell only — never a flash/flood
      onPatternOnset(st, time);
      if (PULSES.length > 8) PULSES.shift();
      PULSES.push({ u: (moodMode_ !== "auto" && EMOTIONS[targetKey].ripple === "center") ? 0.5 : 0.25 + Math.random() * 0.5, t0: time, s: st });
    } else {
      // beat off: onsets only feed sparks / particles; a ring only for a clear new sound event, never per beat
      onPatternOnset(st, time);
      if (st > 0.5 && time - A.lastRing > 3.5) { A.lastRing = time; spawnRipple(st * 0.6); }
    }
  }
  // continuous per-mood rings from the voice/center (rate from emotion, not MOTION_BASE)
  const ringRate = EMOTIONS[targetKey].rippleRate || 0.5;
  A.rippleAcc += dt * (0.03 + 0.45 * A.activity ** 1.5) * ringRate;
  if (beatInWaves && A.activity > 0.16 && A.rippleAcc > 1) {
    A.rippleAcc = 0;
    spawnRipple(0.22 + A.activity * 0.4);
  }
  A.rippleAcc = Math.min(A.rippleAcc, 1.2);
  }
  const pulseLife = asmrMode ? 7 : 3.5;
  for (let i = PULSES.length - 1; i >= 0; i--) if (time - PULSES[i].t0 > pulseLife) PULSES.splice(i, 1);
}

// ---------- ASMR helpers ----------
/** Soft cap: slope 1 for small values (whispers stay visible), smooth ceiling at `cap` (peaks never jump). */
const softCap = (x, cap) => cap * Math.tanh(x / cap);

/** ASMR onsets: lower threshold so whisper / bowl / soft tap / breath register, but each one only
 *  sends a small capped ripple that glides along the strands. No center rings, no sunbursts. */
function asmrOnsets(time, rise, ampRise, fluxHit) {
  const soft = Math.max(rise, ampRise - 0.03, fluxHit * 3);
  if (soft > 0 && A.gate > 0.3 && time - A.lastOnset > 0.45) {
    A.lastOnset = time;
    const st = softCap(0.12 + soft * 1.1, 0.4);
    // (no wave pulse here: per-onset swells made the strands tick with the beat; waves follow VOICE instead)
    // AI hears drums: a small, soft, capped swell per hit (only while the AI motion profile says so)
    if (beatInWaves && AIM.hit > 0.05) { if (PULSES.length > 6) PULSES.shift(); PULSES.push({ u: 0.5, t0: time, s: Math.min(0.25, st * AIM.hit) }); }
    // soft sounds add a few more gentle elements (each fades in; never a burst)
    spawnMoodSpark(0.35 + 0.4 * st);
    if (st > 0.22) spawnMoodSpark(0.35 + 0.4 * st);
    if (Math.random() < 0.3) spawnRipple(0.18 + 0.3 * st, null, true);
    if (Math.random() < 0.12 * moodSparkStyle().burst + 0.04) spawnMoodBurst(0.3 + 0.4 * st);
  }
  A.rippleAcc = 0;
}

// Live voice tracker for ASMR waves: loudness of the voice band, harmonic "voiced" amount,
// pitch (harmonic-sum peak 90-1000 Hz, log scaled 0..1) and a 32-step voice-band spectrum profile.
// Gated by tonality so drum hits / clicks (flat spectrum) barely move the waves.
const VOICE = { env: 0, tonal: 0, pitch: 0.4, phase: 0, peak: 1e-4, lin: new Float32Array(400), prof: new Float32Array(32) };
function asmrVoice(dt) {
  if (!running || !freqData || !audioCtx || !analyser) {
    VOICE.env = smooth(VOICE.env, 0, dt, 0.25);
    VOICE.tonal = smooth(VOICE.tonal, 0, dt, 0.25);
    for (let j = 0; j < 32; j++) VOICE.prof[j] = smooth(VOICE.prof[j], 0, dt, 0.25);
    return;
  }
  const binHz = audioCtx.sampleRate / analyser.fftSize;
  const top = Math.min(freqData.length - 1, VOICE.lin.length - 1, Math.ceil(4000 / binHz));
  const Lb = VOICE.lin;
  // ignore < 140 Hz (kick drums / rumble); low voices are still found from their 2nd/3rd harmonics
  const hpI = Math.ceil(140 / binHz);
  for (let i = 0; i <= top; i++) Lb[i] = i < hpI ? 0 : Math.pow(10, ((freqData[i] / 255) * 70 - 95) / 20);
  const lo = Math.max(2, Math.floor(90 / binHz)), hiF0 = Math.min(Math.ceil(1000 / binHz), Math.floor(top / 3));
  let best = 0, bestI = -1;
  for (let i = lo; i <= hiF0; i++) {
    const hs = Lb[i] + 0.8 * Lb[2 * i] + 0.6 * Lb[3 * i];
    if (hs > best) { best = hs; bestI = i; }
  }
  let sum = 0, n = 0, vsum = 0;
  const v0 = Math.floor(150 / binHz), v1 = Math.min(top, Math.ceil(3000 / binHz));
  for (let i = hpI; i <= top; i++) { sum += Lb[i]; n++; }
  for (let i = v0; i <= v1; i++) vsum += Lb[i];
  const mean = sum / Math.max(1, n);
  const tonal = clamp01((best / 2.4 / (mean + 1e-9) - 2) / 5);
  VOICE.tonal = smooth(VOICE.tonal, tonal, dt, tonal > VOICE.tonal ? 0.05 : 0.15);
  VOICE.peak = Math.max(vsum, VOICE.peak * Math.exp(-dt / 8), 1e-5);
  const voiced = VOICE.tonal * VOICE.tonal * (3 - 2 * VOICE.tonal);
  const envT = softCap(clamp01(vsum / VOICE.peak) * (0.15 + 0.85 * voiced) * A.gate, 0.85);
  VOICE.env = smooth(VOICE.env, envT, dt, envT > VOICE.env ? 0.06 : 0.18); // ~100-200 ms response
  if (bestI > lo && bestI < hiF0 && tonal > 0.35 && envT > 0.08) {
    // refine on the 2nd harmonic when the fundamental bin was filtered out (more precise anyway)
    const h2 = 2 * bestI;
    const a = Lb[h2 - 1], b = Lb[h2], c = Lb[h2 + 1];
    const den = a - 2 * b + c;
    const d = den !== 0 ? Math.max(-0.5, Math.min(0.5, 0.5 * (a - c) / den)) : 0;
    const f0 = (h2 + d) * binHz / 2;
    const pT = clamp01(Math.log(f0 / 90) / Math.log(1000 / 90));
    VOICE.pitch = smooth(VOICE.pitch, pT, dt, 0.09); // glides, no jumps
  }
  // voice-band profile (150-3000 Hz, log spaced) normalised to its own max: syllable / formant shape
  let pmax = 1e-9;
  const tmp = asmrVoice._tmp || (asmrVoice._tmp = new Float32Array(32));
  for (let j = 0; j < 32; j++) {
    const fa = 150 * Math.pow(20, j / 32), fb = 150 * Math.pow(20, (j + 1) / 32);
    const ia = Math.max(lo, Math.floor(fa / binHz)), ib = Math.max(ia, Math.min(top, Math.ceil(fb / binHz)));
    let m = 0; for (let i = ia; i <= ib; i++) if (Lb[i] > m) m = Lb[i];
    tmp[j] = m; if (m > pmax) pmax = m;
  }
  for (let j = 0; j < 32; j++) {
    const t = Math.sqrt(tmp[j] / pmax) * VOICE.env;
    VOICE.prof[j] = smooth(VOICE.prof[j], t, dt, t > VOICE.prof[j] ? 0.06 : 0.2);
  }
  VOICE.phase += dt * (0.5 + 2.0 * VOICE.pitch);
}

/** Advance ASMR mix, slow clock, color breath, and the compressed audio drivers. */
function stepAsmr(dt) {
  const tgt = asmrMode ? 1 : 0;
  if (ASM !== tgt) {
    ASM = smooth(ASM, tgt, dt, 1.1);
    if (Math.abs(ASM - tgt) < 0.002) ASM = tgt;
  }
  asmrSlow = 1 - (1 - ASMR_SPEED) * ASM;
  asmrLag += dt * (1 - asmrSlow);
  asmrBreath += dt * (Math.PI * 2 / ASMR_BREATH_S);
  asmrSwell = ASM * Math.sin(asmrBreath);
  asmrGlow = (1 - 0.08 * ASM) * (1 + 0.2 * asmrSwell);
  // long attack / longer release, soft-capped (raw A.* stays untouched for the normal path)
  const ease = (cur, t, up, down) => smooth(cur, t, dt, t > cur ? up : down);
  if (asmrMode || ASM > 0 || AIM.voice > 0) asmrVoice(dt);
  AS.act = ease(AS.act, softCap(A.activity, 0.42), 0.7, 2.6); // slow overall level only (no beat bob)
  AS.bass = ease(AS.bass, softCap(A.bass, 0.4), 0.8, 2.2);
  AS.mid = ease(AS.mid, softCap(A.mid, 0.45), 0.7, 2.0);
  AS.high = ease(AS.high, softCap(A.high, 0.45), 0.6, 2.0);
  AS.pulse = ease(AS.pulse, softCap(A.pulse, 0.08), 0.5, 1.6);
  // spectrum: fast enough to follow syllables (~120/300 ms), gated by voicing so beats/clicks stay small
  const vg = 0.3 + 0.7 * VOICE.tonal;
  for (let i = 0; i < AS.spec.length; i++) AS.spec[i] = ease(AS.spec[i], softCap(A.spec[i] * vg, 0.6), 0.12, 0.3);
}

/** For drawing only: blend A.* toward the compressed ASMR drivers. Restored after the frame,
 *  so audio smoothing state (and the mood detector) never change. No-op when ASM is 0. */
function applyAsmrView() {
  A_RAW.saved = false;
  if (ASM <= 0) return;
  A_RAW.saved = true;
  A_RAW.activity = A.activity; A_RAW.pulse = A.pulse;
  A_RAW.bass = A.bass; A_RAW.mid = A.mid; A_RAW.high = A.high;
  A_RAW.spec.set(A.spec);
  const k = ASM;
  A.activity += (AS.act - A.activity) * k;
  A.pulse += (AS.pulse - A.pulse) * k;
  A.bass += (AS.bass - A.bass) * k;
  A.mid += (AS.mid - A.mid) * k;
  A.high += (AS.high - A.high) * k;
  for (let i = 0; i < A.spec.length; i++) A.spec[i] += (AS.spec[i] - A.spec[i]) * k;
}
function restoreAsmrView() {
  if (!A_RAW.saved) return;
  A_RAW.saved = false;
  A.activity = A_RAW.activity; A.pulse = A_RAW.pulse;
  A.bass = A_RAW.bass; A.mid = A_RAW.mid; A.high = A_RAW.high;
  A.spec.set(A_RAW.spec);
}

let btnAsmr = null;
function setAsmrMode(on, fromUser) {
  asmrMode = !!on;
  document.body.classList.toggle("asmr", asmrMode);
  if (btnAsmr) btnAsmr.textContent = asmrMode ? "ASMR: ON" : "ASMR: OFF";
  if (fromUser) {
    try {
      const u = new URL(location.href);
      if (asmrMode) u.searchParams.set("mode", "asmr");
      else if (u.searchParams.get("mode") === "asmr") u.searchParams.delete("mode");
      u.searchParams.delete("asmr");
      history.replaceState(null, "", u.toString());
    } catch (_) {}
    toast(asmrMode ? "ASMR mode: soft slow waves" : "ASMR mode off: normal waves");
  }
}

// ---------- ripples ----------
function rippleOrigin() {
  // Per-mood emanation layout (center / petal / near / low / scatter).
  const mode = EMOTIONS[targetKey].ripple;
  const j = (s) => (Math.random() - 0.5) * s;
  if (mode === "center" || mode === "petal") return [W * (0.5 + j(0.05)), H * (0.52 + j(0.04))];
  if (mode === "near") return [W * (0.5 + j(0.22)), H * (0.5 + j(0.18))];
  if (mode === "low") return [W * (0.5 + j(0.55)), H * (0.78 + j(0.12))];
  return [W * (0.18 + Math.random() * 0.64), H * (0.22 + Math.random() * 0.55)];
}
function spawnRipple(strength, at, soft) {
  if (soft) { let n = 0; for (const q of RIPPLES) if (q.soft) n++; if (n >= 4) return; } // ASMR: few at a time
  // Per-mood styles + Vercel dual soft circular halos for plain moods.
  if (RIPPLES.length > 10) RIPPLES.shift();
  const [x, y] = at || rippleOrigin();
  const M = Math.min(W, H);
  const id = EMOTIONS[targetKey].id;
  const isPetal = id === "love" || EMOTIONS[targetKey].ripple === "petal";
  const isWater = id === "calm";
  const isGeo = id === "clarity";
  const isCym = id === "spirit";
  const plain = !(isPetal || isWater || isGeo || isCym);
  RIPPLES.push({
    x, y,
    r: M * (isPetal ? 0.014 : isGeo ? 0.012 : 0.02),
    strength: plain ? strength : strength * (isWater ? 0.85 : 0.9),
    v: M * (0.09 + (plain ? 0.24 : 0.22) * strength) * (0.55 + 0.45 * pal.speed) * (isPetal ? 0.85 : isCym ? 0.9 : 1),
    life: 1,
    decay: 1 / ((plain ? 4.5 : 4.2) + (plain ? 3 : 2.8) * (1 - pal.speed / 1.5) + (isPetal ? 0.6 : 0) + (isWater ? 0.8 : 0)),
    color: Math.random() < 0.35 ? "accent" : "core",
    petal: isPetal,
    water: isWater,
    geo: isGeo,
    cym: isCym,
    rot: Math.random() * Math.PI * 2,
    lobes: isPetal ? 5 + (Math.random() < 0.4 ? 1 : 0) : 0,
    sides: isGeo ? (Math.random() < 0.5 ? 6 : 5) : 0,
  });
  if (soft) {
    // ASMR emanation: same per-mood shape, ~1/3 expansion speed, longer life, fades in
    const r = RIPPLES[RIPPLES.length - 1];
    r.v *= 0.33;
    r.decay *= 0.5;
    r.soft = true;
  }
}

// ---------- Continuous per-mood tiled field (behind silk) ----------
/** Scrolling lattice that never ends; shape depends on mood id. Drawn in soft buffer. */
function drawMoodField(c, time, breath) {
  const id = moodId();
  const W0 = c.canvas.width, H0 = c.canvas.height;
  const M = Math.min(W0, H0);
  const act = A.activity;
  const a0 = (0.045 + 0.07 * act + 0.03 * breath) * pal.lumK * (1 + 0.4 * ASM); // ASMR: per-mood field reads clearly
  if (a0 < 0.01) return;
  c.save();
  c.globalCompositeOperation = "lighter";
  const col = pal.core, acc = pal.accent, glow = pal.glow;

  if (id === "calm") {
    // soft horizontal water sheets, slow L→R scroll
    const step = M * 0.085;
    const scroll = ((time * 0.08 * pal.speed) % 1) * step;
    for (let y = -step; y < H0 + step; y += step) {
      const yy = y + scroll * 0.35;
      c.beginPath();
      for (let x = 0; x <= W0; x += 8) {
        const u = x / W0;
        const yy2 = yy + Math.sin(u * Math.PI * 2 * 1.5 + time * 0.35 + y * 0.02) * M * 0.012;
        if (x === 0) c.moveTo(x, yy2); else c.lineTo(x, yy2);
      }
      c.strokeStyle = rgba(mix(col, acc, 0.35), a0 * 0.55);
      c.lineWidth = Math.max(1, M * 0.008);
      c.stroke();
    }
  } else if (id === "love") {
    // repeating soft circles (the “goes on and on” circle field)
    const step = M * 0.11;
    const ox = ((time * 0.06 * pal.speed) % 1) * step;
    const oy = ((time * 0.04 * pal.speed) % 1) * step;
    for (let row = -1; row < H0 / step + 2; row++) {
      for (let colI = -1; colI < W0 / step + 2; colI++) {
        const x = colI * step + ox + (row % 2 ? step * 0.5 : 0);
        const y = row * step + oy;
        const r = M * (0.018 + 0.01 * Math.sin(time * 0.7 + row + colI));
        const g = c.createRadialGradient(x, y, 0, x, y, r * 2.2);
        g.addColorStop(0, rgba(mix(col, [255, 220, 230], 0.35), a0 * 0.7));
        g.addColorStop(0.5, rgba(acc, a0 * 0.28));
        g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r * 2.2, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(x, y, r * 1.15, 0, Math.PI * 2);
        c.strokeStyle = rgba(mix(col, [255, 255, 255], 0.25), a0 * 0.45);
        c.lineWidth = Math.max(0.6, M * 0.0025);
        c.stroke();
      }
    }
  } else if (id === "joy") {
    // rising spark dots on a lattice
    const step = M * 0.09;
    const oy = -((time * 0.22 * pal.speed) % 1) * step;
    for (let row = -1; row < H0 / step + 2; row++) {
      for (let colI = -1; colI < W0 / step + 2; colI++) {
        const x = colI * step + (row % 2 ? step * 0.5 : 0);
        const y = row * step + oy;
        const tw = Math.sin(time * 2.2 + row * 0.7 + colI) * 0.5 + 0.5;
        const r = M * (0.006 + 0.01 * tw);
        const g = c.createRadialGradient(x, y, 0, x, y, r * 2.5);
        g.addColorStop(0, rgba(mix(col, [255, 255, 200], 0.5), a0 * (0.5 + 0.5 * tw)));
        g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r * 2.5, 0, Math.PI * 2);
        c.fill();
      }
    }
  } else if (id === "release") {
    // soft falling dots lattice
    const step = M * 0.1;
    const oy = ((time * 0.18 * pal.speed) % 1) * step;
    for (let row = -1; row < H0 / step + 2; row++) {
      for (let colI = 0; colI < W0 / step + 1; colI++) {
        const x = colI * step + Math.sin(time * 0.4 + row) * M * 0.01;
        const y = row * step + oy;
        const r = M * 0.007;
        c.fillStyle = rgba(mix(col, glow, 0.3), a0 * 0.55);
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fill();
      }
    }
  } else if (id === "ground") {
    // low rolling swell lines
    const step = M * 0.1;
    const scroll = ((time * 0.05 * pal.speed) % 1) * step;
    for (let y = H0 * 0.35; y < H0 + step; y += step) {
      c.beginPath();
      for (let x = 0; x <= W0; x += 10) {
        const yy = y + scroll + Math.sin(x * 0.008 + time * 0.25 + y) * M * 0.02;
        if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy);
      }
      c.strokeStyle = rgba(mix(col, glow, 0.25), a0 * 0.5);
      c.lineWidth = Math.max(1.2, M * 0.01);
      c.stroke();
    }
  } else if (id === "clarity") {
    // thin geometric circle + hex lattice
    const step = M * 0.12;
    const ox = ((time * 0.05 * pal.speed) % 1) * step;
    for (let row = -1; row < H0 / step + 2; row++) {
      for (let colI = -1; colI < W0 / step + 2; colI++) {
        const x = colI * step + ox + (row % 2 ? step * 0.5 : 0);
        const y = row * step;
        const r = M * 0.028;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.strokeStyle = rgba(mix(col, [255, 255, 255], 0.35), a0 * 0.4);
        c.lineWidth = Math.max(0.5, M * 0.002);
        c.stroke();
        // hex hint
        c.beginPath();
        for (let i = 0; i <= 6; i++) {
          const th = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const px = x + Math.cos(th) * r * 0.72, py = y + Math.sin(th) * r * 0.72;
          if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
        }
        c.strokeStyle = rgba(acc, a0 * 0.22);
        c.stroke();
      }
    }
  } else if (id === "spirit") {
    // soft concentric mandala tiles
    const step = M * 0.22;
    const ox = ((time * 0.03 * pal.speed) % 1) * step;
    const oy = ((time * 0.025 * pal.speed) % 1) * step;
    for (let row = -1; row < H0 / step + 2; row++) {
      for (let colI = -1; colI < W0 / step + 2; colI++) {
        const x = colI * step + ox;
        const y = row * step + oy;
        for (const scale of [0.35, 0.55, 0.78]) {
          const r = M * 0.09 * scale;
          c.beginPath();
          c.arc(x, y, r, 0, Math.PI * 2);
          c.strokeStyle = rgba(mix(col, acc, scale), a0 * (0.35 - scale * 0.12));
          c.lineWidth = Math.max(0.6, M * 0.0025);
          c.stroke();
        }
      }
    }
  } else if (id === "energy") {
    // dense diagonal dash lattice
    const step = M * 0.07;
    const ox = ((time * 0.35 * pal.speed) % 1) * step;
    c.strokeStyle = rgba(mix(col, acc, 0.4), a0 * 0.55);
    c.lineWidth = Math.max(0.8, M * 0.003);
    for (let y = -step; y < H0 + step; y += step) {
      for (let x = -step; x < W0 + step; x += step) {
        const xx = x + ox, yy = y;
        c.beginPath();
        c.moveTo(xx, yy);
        c.lineTo(xx + step * 0.45, yy + step * 0.45);
        c.stroke();
      }
    }
  } else if (id === "sad") {
    // soft rain: thin slanted streaks falling slowly
    const step = M * 0.06;
    const fall = ((time * 0.22 * pal.speed) % 1);
    c.strokeStyle = rgba(mix(col, acc, 0.4), a0 * 0.5);
    c.lineWidth = Math.max(0.6, M * 0.0018);
    for (let colI = -1; colI < W0 / step + 1; colI++) {
      const ph = (colI * 0.618) % 1;
      for (let row = -1; row < H0 / (step * 2.2) + 1; row++) {
        const y = ((row + fall + ph) * step * 2.2) % (H0 + step * 2.2) - step;
        const x = colI * step + ph * step * 0.5;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x - step * 0.08, y + step * 0.55);
        c.stroke();
      }
    }
  } else if (id === "wonder") {
    // light opening outward from the centre: slow expanding soft rings + faint rays
    const cx = W0 * 0.5, cy = H0 * 0.5, R = Math.hypot(W0, H0) * 0.55;
    for (let i = 0; i < 5; i++) {
      const u = ((time * 0.045 * pal.speed + i / 5) % 1);
      const r = R * u;
      c.beginPath();
      c.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
      c.strokeStyle = rgba(mix(col, acc, 0.5 + 0.5 * u), a0 * 0.55 * Math.sin(Math.PI * u));
      c.lineWidth = Math.max(1, M * (0.004 + 0.01 * u));
      c.stroke();
    }
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, M * 0.45);
    g.addColorStop(0, rgba(acc, a0 * (0.45 + 0.25 * breath)));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.fillRect(0, 0, W0, H0);
  } else if (id === "intensity") {
    // drifting embers: warm dots rising with a slow sway (no flashes)
    const step = M * 0.085;
    const oy = -((time * 0.16 * pal.speed) % 1) * step;
    for (let row = -1; row < H0 / step + 2; row++) {
      for (let colI = -1; colI < W0 / step + 2; colI++) {
        const x = colI * step + (row % 2 ? step * 0.5 : 0) + Math.sin(time * 0.5 + row * 1.3 + colI) * M * 0.012;
        const y = row * step + oy;
        const tw = Math.sin(time * 0.9 + row * 0.9 + colI * 1.7) * 0.5 + 0.5;
        const r = M * (0.004 + 0.006 * tw);
        const g = c.createRadialGradient(x, y, 0, x, y, r * 3);
        g.addColorStop(0, rgba(mix(acc, col, 0.3), a0 * (0.35 + 0.35 * tw)));
        g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g;
        c.beginPath();
        c.arc(x, y, r * 3, 0, Math.PI * 2);
        c.fill();
      }
    }
  } else {
    // fallback: soft dot lattice
    const step = M * 0.1;
    for (let y = 0; y < H0; y += step) {
      for (let x = 0; x < W0; x += step) {
        c.fillStyle = rgba(col, a0 * 0.35);
        c.beginPath();
        c.arc(x, y, M * 0.006, 0, Math.PI * 2);
        c.fill();
      }
    }
  }
  c.restore();
}

// ---------- draw ----------
function drawBackground(breath) {
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = rgba(pal.bg0, 1);
  ctx.fillRect(0, 0, W, H);
  // deep room tone: dark center pool that breathes; very low so blacks stay black on a projector
  // Auto: no love-room geometry snap — palette bg0/bg1 already crossfade the color.
  const love = loveMotionOn();
  const cx = W * 0.5, cy = H * (love ? 0.55 : 0.58);
  const R = Math.hypot(W, H) * (0.55 + 0.04 * breath + (love ? 0.04 * LOVE.breath : 0));
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
  if (love) {
    // candle-warm intimate room: rose-ember core into pure black
    const warm = mix(pal.bg1, [48, 12, 22], 0.45);
    const ember = mix(pal.deep, [60, 18, 28], 0.35);
    g.addColorStop(0, rgba(warm, 1));
    g.addColorStop(0.28, rgba(ember, 1));
    g.addColorStop(0.62, rgba(mix(pal.bg1, pal.bg0, 0.55), 1));
    g.addColorStop(1, rgba(pal.bg0, 1));
  } else {
    g.addColorStop(0, rgba(pal.bg1, 1));
    g.addColorStop(0.55, rgba(mix(pal.bg1, pal.bg0, 0.6), 1));
    g.addColorStop(1, rgba(pal.bg0, 1));
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function inkPos(ink, ph) {
  return [
    (ink.cx + Math.sin(ph * ink.fx) * ink.ax + Math.sin(ph * 0.37 + ink.fy) * 0.05) * SW,
    (ink.cy + Math.cos(ph * ink.fy * 0.8) * ink.ay + Math.cos(ph * 0.29 + ink.fx) * 0.04) * SH,
  ];
}

/** Soft layer (low-res → blurred → upscaled): ink light-worlds, hanging light columns, breathing core, silk glow. */
function drawSoft(dt, time, breath, silk) {
  const act = A.activity;
  sctx.globalCompositeOperation = "source-over";
  sctx.globalAlpha = 1;
  sctx.clearRect(0, 0, SW, SH);
  sctx.globalCompositeOperation = "lighter";
  const M = Math.min(SW, SH);
  const K = pal.lumK;

  // Continuous per-mood tiled field behind the silk (scrolls forever)
  drawMoodField(sctx, time, breath);

  // drifting ink worlds with analytic trails (ink spreading in dark water); "deep" ink adds colour depth
  for (const ink of INKS) {
    ink.ph += dt * 0.12 * pal.speed * (0.5 + 1.8 * act + 0.8 * A.pulse) * asmrSlow;
    const col = pal[ink.color];
    const deep = ink.color === "deep";
    for (let k = QUALITY[qLevel].trail - 1; k >= 0; k--) {
      const [x, y] = inkPos(ink, ink.ph - k * 0.16);
      const r = M * ink.r * (deep ? 1.5 : 1) * (1 + 0.12 * breath * pal.breathe + 0.35 * act + 0.2 * A.bass + 0.15 * A.pulse) *
        (1 - k * 0.07) * (0.85 + 0.25 * pal.density);
      const a = (deep ? 0.08 : (0.045 + 0.045 * act) * K) * (1 - k * 0.14);
      const g = sctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(col, a));
      g.addColorStop(0.45, rgba(col, a * 0.4));
      g.addColorStop(1, rgba(col, 0));
      sctx.fillStyle = g;
      sctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
  }

  // hanging light columns: each one listens to its part of the spectrum (bass in the middle, highs at the sides)
  const L = A.spec.length - 1;
  for (const pl of PILLARS) {
    const lv = A.spec[Math.round(pl.band * L * 0.85)] || 0;
    pl.lvl = smooth(pl.lvl, lv * act, dt, lv * act > pl.lvl ? 0.08 : 0.6);
    const x = (pl.x + Math.sin(time * 0.11 * pal.speed + pl.ph) * 0.03) * SW;
    const w = SW * pl.w * 0.3 * (0.7 + 0.6 * pl.lvl);
    const a = (0.012 + 0.01 * breath + 0.13 * pl.lvl) * K;
    const g = sctx.createLinearGradient(0, 0, 0, SH);
    const col = pal[pl.color];
    const top = clamp01(0.5 - 0.5 * pl.lvl - 0.08 * pal.rise);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(top, rgba(col, a * 0.35));
    g.addColorStop(0.55, rgba(col, a));
    g.addColorStop(1, rgba(col, 0));
    sctx.fillStyle = g;
    // soft horizontal edge: 3 narrowing slices (the blur pass rounds them into a light column)
    sctx.globalAlpha = 0.45;
    for (let j = 0; j < 3; j++) {
      const ww = w * (1 - j * 0.3);
      sctx.fillRect(x - ww, 0, ww * 2, SH);
    }
    sctx.globalAlpha = 1;
  }

  // breathing light heart of the room (Love: candle-warm intimate core + dual-beat)
  const isLove = loveMotionOn();
  const hb = isLove ? LOVE.beat : 0;
  const cx = SW * 0.5, cy = SH * (isLove ? 0.54 : 0.52);
  const cr = M * (0.24 + 0.05 * breath * pal.breathe + 0.1 * A.bass + 0.05 * act + 0.06 * A.pulse
    + (isLove ? 0.1 * hb + 0.05 * LOVE.strength + 0.04 * LOVE.candle : 0));
  const cg = sctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
  const heartA = (0.08 + 0.05 * breath + 0.05 * act + 0.012 * A.pulse + (isLove ? 0.16 * hb + 0.06 * LOVE.candle : 0)) * K * asmrGlow;
  if (isLove) {
    // candle flame: warm white-peach core → rose → violet falloff into black
    const candle = mix(pal.particle, [255, 236, 210], 0.55);
    cg.addColorStop(0, rgba(candle, heartA * 1.15));
    cg.addColorStop(0.18, rgba(mix(pal.core, [255, 200, 180], 0.35), heartA * 0.85));
    cg.addColorStop(0.42, rgba(mix(pal.core, pal.accent, 0.4), (0.07 + 0.1 * hb) * K));
    cg.addColorStop(0.72, rgba(pal.accent, 0.03 + 0.06 * hb));
    cg.addColorStop(1, rgba(pal.deep, 0));
  } else {
    cg.addColorStop(0, rgba(mix(pal.core, [255, 255, 255], 0.1), heartA));
    cg.addColorStop(0.28, rgba(pal.glow, 0.05 + 0.05 * act));
    cg.addColorStop(0.55, rgba(pal.glow, 0.02));
    cg.addColorStop(1, rgba(pal.glow, 0));
  }
  sctx.fillStyle = cg;
  sctx.fillRect(cx - cr, cy - cr, cr * 2, cr * 2);

  // silk glow: fill each band between its outer strands (blurred → luminous fabric)
  const sx = SW / W, sy = SH / H;
  for (let r = 0; r < RIBBONS.length; r++) {
    const rb = RIBBONS[r], { c, spread } = silk[r];
    sctx.beginPath();
    sctx.moveTo(c[0][0] * sx, (c[0][1] - spread[0]) * sy);
    for (let i = 1; i < c.length; i++) sctx.lineTo(c[i][0] * sx, (c[i][1] - spread[i]) * sy);
    for (let i = c.length - 1; i >= 0; i--) sctx.lineTo(c[i][0] * sx, (c[i][1] + spread[i] * 1.6 + H * 0.01) * sy);
    sctx.closePath();
    const glowA = (isPhone ? 1.35 : 1) * (vizMode === "wave" ? 1.55 : 1) * asmrGlow;
    sctx.fillStyle = rgba(pal[rb.color], (0.045 + 0.09 * act + 0.012 * A.pulse) * K * glowA);
    sctx.fill();
    // secondary outer glow ribbon (wider, dimmer) for depth
    sctx.beginPath();
    sctx.moveTo(c[0][0] * sx, (c[0][1] - spread[0] * (isPhone ? 1.85 : 1.6)) * sy);
    for (let i = 1; i < c.length; i++) sctx.lineTo(c[i][0] * sx, (c[i][1] - spread[i] * (isPhone ? 1.85 : 1.6)) * sy);
    for (let i = c.length - 1; i >= 0; i--) sctx.lineTo(c[i][0] * sx, (c[i][1] + spread[i] * (isPhone ? 2.5 : 2.15) + H * (isPhone ? 0.016 : 0.012)) * sy);
    sctx.closePath();
    sctx.fillStyle = rgba(mix(pal[rb.color], pal.glow, isPhone ? 0.45 : 0.35), (0.02 + 0.04 * act) * K * glowA);
    sctx.fill();
    sctx.beginPath();
    tracePts(sctx, c.map(([x, y]) => [x * sx, y * sy]), 0);
    sctx.strokeStyle = rgba(mix(pal[rb.color], [255, 255, 255], isPhone ? 0.28 : 0.18), ((isPhone ? 0.18 : 0.1) + (isPhone ? 0.32 : 0.22) * act + 0.025 * A.pulse) * asmrGlow);
    // Phone showcase: thick retina CSS-px strokes (Pulse/DuWave-class line weight).
    const softPx = isPhone ? 3.2 : (vizMode === "wave" ? 3.6 : 2.2);
    sctx.lineWidth = Math.max(softPx, SH * (isPhone ? 0.028 : (vizMode === "wave" ? 0.022 : 0.014)) + SH * (isPhone ? 0.045 : (vizMode === "wave" ? 0.038 : 0.032)) * act);
    sctx.stroke();
  }

  // Love: parallax volumes + liquid caustic folds (blurred with the soft layer)
  // Love volumes/caustics retired — unified sparks language for all moods
  // drawGroundSwells no-op (retired mountain motif)

}

/**
 * One silk band (full-res coords): centre line + strand spread per point.
 * Silence: an almost flat, slowly breathing line. Music: swells with the live spectrum,
 * plus travelling swells (PULSES) that run outward from each strong attack.
 */
function silkBand(rb, time, breath, tReal) {
  const N = 96, w = W, h = H;
  // tReal: wall clock for pulse ages (time may be the slowed ASMR clock). ASMR pulses: wider, slower, longer.
  const tR = tReal === undefined ? time : tReal;
  const pTrav = 1 - 0.55 * ASM, pWid = 1 + 1.6 * ASM, pDec = 1 - 0.55 * ASM, pAmp = 1 - 0.3 * ASM;
  const act = A.activity, a2 = Math.pow(act, 0.9);
  // No per-mood Y snap (groundShift retired) — Auto switches must not shove the ribbons.
  // AI motion profile (all neutral = 1 / 0 unless the AI layer is on and sure): drift, wave length, height
  const base = (rb.base - 0.06 * pal.rise * act) * h + AIM.drift * h;
  const kA = rb.k / AIM.wl, wl3 = 3.1 / AIM.wl;
  const aiAmp = AIM.amp * (1 + 0.22 * AIM.swell * Math.sin(AIM.swellPh + rb.ph));
  const aiBob = AIM.bounce > 0 ? AIM.bounce * h * 0.018 * Math.sin(AIM.bouncePh + rb.ph * 1.7) * (0.6 + 0.4 * A.activity) : 0;
  // Laptop: H-based showcase (untouched coeffs). Phone: live/spec from min(W,H); idle sp0 denser on H.
  const M = Math.min(w, h);
  const spMul = isPhone ? 1.7 : 1;
  // Showcase: high pitch fans fabric; very low pitch stays near idle breath.
  const highPresence = clamp01(0.15 + 1.4 * A.high + 0.55 * A.mid - 0.45 * A.bass);
  const softGate = (A.high < 0.08 && A.mid < 0.12) ? 0.14 : 1;
  const liveScale = highPresence * softGate;
  const amp0 = h * (isPhone ? (0.014 + 0.022 * breath * pal.breathe) : (0.01 + 0.018 * breath * pal.breathe));
  const ampLive = (isPhone ? M : h) * (isPhone ? 0.22 : 0.105) * a2 * pal.wave * (1 + 0.38 * A.pulse) * liveScale;
  const specAmp = (isPhone ? M : h) * (isPhone ? 0.32 : 0.15) * a2 * pal.wave * liveScale * (1 - 0.45 * AIM.steady);
  const sp = A.spec, L = sp.length - 1;
  const c = new Array(N + 1), spread = new Array(N + 1);
  const sp0 = (isPhone ? h * 0.012 * spMul : h * (0.007 + 0.008 * breath)) * pal.silk
    * (isPhone ? (1 + 0.35 * breath) : 1);
  const spLive = (isPhone ? M * 0.055 : h * 0.034) * a2 * pal.silk * spMul * liveScale;
  // ASMR voice shaping (only when ASM > 0): height follows voice loudness, wave count and lift follow
  // pitch, shape along x follows the voice-band spectrum. Continuous, ~100-200 ms response.
  const vOn = ASM > 0;
  const vOn2 = vOn || AIM.voice > 0; // AI hears singing: default mode also follows the voice
  const vA = vOn2 ? ASM * VOICE.env * (1 + 0.5 * AIM.voice) + (1 - ASM) * 0.8 * AIM.voice * VOICE.env : 0;
  const vAmp = (isPhone ? M * 0.2 : h * 0.1) * vA;
  const vK = (0.9 + 3.0 * VOICE.pitch) * (0.8 + 0.4 * rb.band);
  const vLift = (isPhone ? M : h) * 0.09 * (VOICE.pitch - 0.4) * vA;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const env = Math.pow(Math.sin(Math.PI * u), 0.7); // soft edge taper
    // Continuous L/R travel from pinned SILK_FLOW * rb.dir (mood never retargets flow rate).
    // Opposite dir on neighbouring ribbons = leftward + rightward living fabric.
    const flow = SILK_FLOW * rb.dir;
    const flowAmp = h * SILK_FLOW_AMP * (1 + 0.45 * a2); // travel height grows with activity
    const flowAmpCalm = h * SILK_FLOW_AMP * (1 + 0.15 * a2);
    // Scroll spectrum sample window so live textile texture streams with the ribbon (not locked to X).
    const uSamp = ((u - time * SILK_FLOW * SILK_SCROLL * rb.dir) % 1 + 1) % 1;
    // spectrum mirrored from scrolled centre; HIGH bins dominate (edges), low bins muted
    const f = Math.abs(uSamp - 0.5) * 2 * L * (0.45 + 0.55 * rb.band);
    const i0 = Math.min(L, Math.floor(f)), fr = f - i0;
    const at = (j) => sp[Math.max(0, Math.min(L, j))];
    const v0 = (at(i0 - 1) + 2 * at(i0) + at(i0 + 1)) / 4, v1 = (at(i0) + 2 * at(i0 + 1) + at(i0 + 2)) / 4;
    let live = v0 + (v1 - v0) * fr;
    const center = 1 - Math.abs(u - 0.5) * 2; // 1 at mid, 0 at edges (screen-space taper)
    const highTilt = Math.min(1, (f / Math.max(1, L)) * 1.35); // more toward high bins
    // Weight: high bins strong; when highTilt small (bass/centre), live near 0
    live *= Math.pow(Math.max(0.001, highTilt), 1.35);
    const fanCap = isPhone ? 0.92 : (0.72 - 0.22 * center * highTilt);
    live = Math.min(live, fanCap + 0.28 * live / (live + 0.55));
    let pulse = 0;
    for (const p of PULSES) {
      const dtp = tR - p.t0;
      const d = Math.abs(u - p.u) - dtp * 0.28 * (0.6 + 0.4 * pal.speed) * pTrav;
      pulse += p.s * Math.exp(-(d * d) / (0.006 * pWid)) * Math.exp(-dtp * 1.4 * pDec);
    }
    // Traveling waves: phase - omega*t so peaks stream along X (signed flow = opposite neighbour dirs).
    let y = base + (beatInWaves
      ? Math.sin(u * Math.PI * 2 * kA - time * flow * rb.w + rb.ph) * (amp0 + flowAmp + ampLive * 0.5) * aiAmp * env +
        Math.sin(u * Math.PI * 2 * (kA * 2.15) + time * 1.35 * flow + rb.ph * 2) * (flowAmp * 0.85 + ampLive * 0.28) * aiAmp * env +
        Math.sin(u * Math.PI * wl3 - time * 0.55 * flow + rb.ph * 0.7) * (amp0 + flowAmp * 0.4) * 0.55 * aiAmp * env
      // beat off: the middle wave is slower, detuned per ribbon and no longer grows with loudness (loudness goes to the first wave)
      : Math.sin(u * Math.PI * 2 * kA - time * flow * rb.w + rb.ph) * (amp0 + flowAmp + ampLive * 0.62) * aiAmp * env +
        Math.sin(u * Math.PI * 2 * (kA * 2.15) + time * (0.3 + 0.42 * rb.w) * flow + rb.ph * 2) * flowAmpCalm * 0.85 * aiAmp * env +
        Math.sin(u * Math.PI * wl3 - time * (0.36 + 0.14 * rb.w) * flow + rb.ph * 0.7) * (amp0 + flowAmp * 0.4) * 0.55 * aiAmp * env) -
      live * specAmp * env * rb.dir -
      pulse * (isPhone ? M : h) * (isPhone ? 0.08 : 0.07) * pal.wave * env * rb.dir * pAmp * (1 + 0.9 * AIM.hit);
    if (aiBob !== 0) y += aiBob * env;
    // Laptop: original soft walls. Phone: chrome-safe fill (research lo/hi 0.06/0.90, soft knee 0.13).
    const lo = h * (isPhone ? 0.06 : 0.06), hi = h * (isPhone ? 0.90 : 0.94);
    let vProf = 0;
    if (vOn2) {
      const pf = Math.abs(u - 0.5) * 2 * 31 * (0.6 + 0.4 * rb.band);
      const j0 = Math.min(31, Math.floor(pf)), j1 = Math.min(31, j0 + 1), fr2 = pf - j0;
      vProf = VOICE.prof[j0] + (VOICE.prof[j1] - VOICE.prof[j0]) * fr2;
      y -= (vLift + vAmp * (0.55 * Math.sin(u * Math.PI * 2 * vK - VOICE.phase * rb.dir + rb.ph) + 0.8 * vProf * rb.dir)) * env;
    }
    const soft = h * (isPhone ? 0.13 : 0.08);
    if (y < lo + soft) y = lo + soft * Math.exp((y - lo - soft) / soft);
    if (y > hi - soft) y = hi - soft * Math.exp(-(y - hi + soft) / soft);
    c[i] = [u * w, y];
    // strands fan into luminous fabric ribbons (weave phase also streams with flow)
    const fan = isPhone ? 1.6 : 1;
    spread[i] = (sp0 + spLive * (0.45 + 0.9 * live) + (isPhone ? M : h) * (isPhone ? 0.020 : 0.016) * pulse) *
      (0.4 + 0.6 * Math.abs(Math.sin(u * Math.PI * (1.6 + rb.band) - time * 0.9 * flow + rb.ph))) *
      (0.85 + 0.15 * Math.sin(u * Math.PI * 5 - time * 0.45 * flow + rb.ph)) * env * fan;
    if (vOn) spread[i] += h * 0.012 * vProf * ASM * env; // voice opens the fabric a little
    const spreadCap = h * (isPhone ? 0.055 : 0.033);
    if (spread[i] > spreadCap) spread[i] = spreadCap + (spread[i] - spreadCap) * 0.25;
  }
  return { c, spread };
}

/** Smooth curve through points (quadratic through midpoints). */
function tracePts(c, pts, dy) {
  c.moveTo(pts[0][0], pts[0][1] + dy);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2 + dy;
    c.quadraticCurveTo(pts[i][0], pts[i][1] + dy, mx, my);
  }
  const lp = pts[pts.length - 1];
  c.lineTo(lp[0], lp[1] + dy);
}

/** Sharp silk strands at full resolution (dense TeamLab light threads). */
function drawSilkSharp(silk) {
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const act = A.activity;
  for (let r = 0; r < RIBBONS.length; r++) {
    const rb = RIBBONS[r], { c, spread } = silk[r];
    const S = Math.max(isPhone ? 5 : 1, Math.min(rb.strands, QUALITY[qLevel].strands));
    for (let k = 0; k < S; k++) {
      const sN = S <= 1 ? 0 : (k / (S - 1)) * 2 - 1; // -1..1
      const centre = 1 - Math.abs(sN);
      // slight longitudinal weave so strands don't look parallel-ruled
      const weave = 0.12 * Math.sin(k * 1.7 + r);
      const pts = c.map(([x, y], i) => [x, y + (sN + weave * Math.sin(i * 0.18)) * spread[i]]);
      ctx.beginPath();
      tracePts(ctx, pts, 0);
      const col = mix(pal[rb.color], [255, 255, 255], (isPhone ? 0.14 : 0.08) + (isPhone ? 0.42 : 0.32) * centre * centre);
      let alpha = ((isPhone ? 0.12 : 0.07) + (isPhone ? 0.30 : 0.2) * act + 0.03 * A.pulse) * (0.3 + 0.7 * centre);
      const sharpBase = isPhone ? 1.8 : 0.75;
      let lw = Math.max(isPhone ? 1.4 : 0.55, (sharpBase + (isPhone ? 1.6 : 1.15) * act) * (0.5 + 0.95 * centre));
      if (ASM > 0) {
        // ASMR: thinner, softer core + faint wide feather underneath (reads as slightly blurred silk)
        alpha *= asmrGlow * (1 + 0.35 * ASM); // compressed audio is quieter; keep strands visible
        lw = Math.max(isPhone ? 1.0 : 0.45, lw * (1 - 0.42 * ASM));
        ctx.strokeStyle = rgba(col, alpha * 0.2 * ASM);
        ctx.lineWidth = lw * (3 + 1.5 * ASM);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(col, alpha);
      ctx.lineWidth = lw;
      ctx.stroke();
    }
  }
}

/**
 * Pre-silk traveling wave band (demo look restored as mode W / default).
 * Continuous horizontal travel of wave energy across the screen:
 *   - unidirectional L→R flow (neighbouring bands do not cancel)
 *   - linear scrolled spectrum (not center-mirrored silk body)
 *   - time-domain waveform contribution for scrolling energy packets
 *   - fat soft aurora curtain body; sharp pass draws ONE clear spine per band
 * Keeps highPresence gate + MOTION_BASE (Auto = color only).
 */
function waveBand(rb, time, breath, tReal) {
  const N = 96, w = W, h = H;
  const tR = tReal === undefined ? time : tReal;
  const pTrav = 1 - 0.55 * ASM, pWid = 1 + 1.6 * ASM, pDec = 1 - 0.55 * ASM, pAmp = 1 - 0.3 * ASM;
  const tdK = 1 - 0.8 * ASM; // raw waveform is jittery; ASMR mutes it
  const act = A.activity, a2 = Math.pow(act, 0.9);
  const base = (rb.base - 0.05 * pal.rise * act) * h + AIM.drift * h;
  const kA = rb.k / AIM.wl, wl3 = 3.35 / AIM.wl;
  const aiAmp = AIM.amp * (1 + 0.22 * AIM.swell * Math.sin(AIM.swellPh + rb.ph));
  const aiBob = AIM.bounce > 0 ? AIM.bounce * h * 0.018 * Math.sin(AIM.bouncePh + rb.ph * 1.7) * (0.6 + 0.4 * A.activity) : 0;
  const vAw = AIM.voice > 0 ? AIM.voice * VOICE.env * h * 0.09 : 0; // AI hears singing: follow the voice
  const vKw = (0.9 + 3.0 * VOICE.pitch) * (0.8 + 0.4 * rb.band);
  const highPresence = clamp01(0.15 + 1.4 * A.high + 0.55 * A.mid - 0.45 * A.bass);
  const softGate = (A.high < 0.08 && A.mid < 0.12) ? 0.14 : 1;
  const liveScale = highPresence * softGate;
  const amp0 = h * (0.014 + 0.024 * breath * pal.breathe);
  const ampLive = h * 0.12 * a2 * pal.wave * (1 + 0.32 * A.pulse) * liveScale;
  const specAmp = h * 0.175 * a2 * pal.wave * liveScale * (1 - 0.45 * AIM.steady);
  const tdAmp = h * 0.085 * a2 * pal.wave * liveScale * (1 - 0.6 * AIM.steady);
  const sp = A.spec, L = Math.max(1, sp.length - 1);
  const c = new Array(N + 1), spread = new Array(N + 1);
  // Fat soft curtain body (pre-silk aurora sheet, not silk bristle fan)
  const sp0 = h * (0.014 + 0.012 * breath) * pal.silk;
  const spLive = h * 0.06 * a2 * pal.silk * liveScale;
  const flow = WAVE_FLOW; // SAME direction on every band so travel reads clearly
  const flowAmp = h * WAVE_FLOW_AMP;
  const lag = rb.band * 0.42; // cascade: lower bands trail slightly
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const env = Math.pow(Math.sin(Math.PI * u), 0.62);
    // Linear scroll of spectrum window → energy packets travel across X
    const uSamp = ((u - time * WAVE_FLOW * WAVE_SCROLL - lag) % 1 + 1) % 1;
    const f = uSamp * L * (0.5 + 0.5 * rb.band);
    const i0 = Math.min(L, Math.floor(f)), fr = f - i0;
    const at = (j) => sp[Math.max(0, Math.min(L, j))];
    const v0 = (at(i0 - 1) + 2 * at(i0) + at(i0 + 1)) / 4;
    const v1 = (at(i0) + 2 * at(i0 + 1) + at(i0 + 2)) / 4;
    let live = Math.max(0, v0 + (v1 - v0) * fr);
    live = Math.min(live, 0.92 + 0.2 * live / (live + 0.5));
    // Scrolling time-domain waveform (v1 soft ribbon lineage)
    let td = 0;
    if (timeData && timeData.length) {
      const tn = timeData.length;
      const ti = Math.floor((((u - time * WAVE_TD_SCROLL - lag * 0.4) % 1 + 1) % 1) * tn);
      td = timeData[ti] || 0;
    }
    let pulse = 0;
    for (const p of PULSES) {
      const dtp = tR - p.t0;
      const d = Math.abs(u - p.u) - dtp * 0.34 * (0.6 + 0.4 * pal.speed) * pTrav;
      pulse += p.s * Math.exp(-(d * d) / (0.005 * pWid)) * Math.exp(-dtp * 1.25 * pDec);
    }
    // Traveling sinusoids: phase - omega*t so crests stream left→right
    let y = base +
      Math.sin(u * Math.PI * 2 * kA - time * flow * rb.w + rb.ph) * (amp0 + flowAmp + ampLive * 0.5) * aiAmp * env +
      (beatInWaves
        ? Math.sin(u * Math.PI * 2 * (kA * 1.65) - time * flow * 1.35 + rb.ph * 1.6) * (flowAmp * 0.8 + ampLive * 0.28) * aiAmp * env +
          Math.sin(u * Math.PI * wl3 - time * flow * 0.5 + rb.ph * 0.8) * (amp0 + flowAmp * 0.35) * 0.5 * aiAmp * env
        : Math.sin(u * Math.PI * 2 * (kA * 1.65) - time * flow * (0.3 + 0.42 * rb.w) + rb.ph * 1.6) * (flowAmp * 0.8 + ampLive * 0.12) * aiAmp * env +
          Math.sin(u * Math.PI * wl3 - time * flow * (0.33 + 0.14 * rb.w) + rb.ph * 0.8) * (amp0 + flowAmp * 0.35) * 0.5 * aiAmp * env) -
      live * specAmp * env -
      td * tdAmp * env * tdK * (beatInWaves ? 1 : 0.35) -
      pulse * h * 0.09 * pal.wave * env * pAmp * (1 + 0.9 * AIM.hit);
    if (aiBob !== 0) y += aiBob * env;
    if (vAw !== 0) y -= vAw * Math.sin(u * Math.PI * 2 * vKw - VOICE.phase + rb.ph) * env;
    const lo = h * 0.06, hi = h * 0.94, soft = h * 0.09;
    if (y < lo + soft) y = lo + soft * Math.exp((y - lo - soft) / soft);
    if (y > hi - soft) y = hi - soft * Math.exp(-(y - hi + soft) / soft);
    c[i] = [u * w, y];
    spread[i] = (sp0 + spLive * (0.55 + 0.95 * live) + h * 0.02 * pulse + Math.abs(td) * h * 0.012) *
      (0.55 + 0.45 * Math.abs(Math.sin(u * Math.PI * (1.35 + rb.band) - time * flow + rb.ph))) * env;
    const spreadCap = h * (isPhone ? 0.07 : 0.068);
    if (spread[i] > spreadCap) spread[i] = spreadCap + (spread[i] - spreadCap) * 0.22;
  }
  return { c, spread };
}

/** Sharp cores for wave mode: one luminous spine per band (6 laptop / 4 phone). */
function drawWaveSharp(bands) {
  ctx.globalCompositeOperation = "lighter";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  const act = A.activity;
  for (let r = 0; r < RIBBONS.length; r++) {
    const rb = RIBBONS[r], { c } = bands[r];
    // One spine per ribbon so all bands read as separate traveling waves
    // (dual spines + heavy blur used to merge into ~2 visible curtains).
    ctx.beginPath();
    tracePts(ctx, c, 0);
    const col = mix(pal[rb.color], [255, 255, 255], 0.28);
    let alpha = 0.22 + 0.38 * act + 0.05 * A.pulse;
    let lw = Math.max(isPhone ? 2.2 : 2.8, (isPhone ? 2.6 : 3.4) + (isPhone ? 2.2 : 3.0) * act);
    if (ASM > 0) {
      alpha *= asmrGlow * (1 - 0.2 * ASM);
      lw *= 1 - 0.45 * ASM;
      ctx.strokeStyle = rgba(col, alpha * 0.2 * ASM);
      ctx.lineWidth = lw * (2.6 + 1.2 * ASM);
      ctx.stroke();
    }
    ctx.strokeStyle = rgba(col, alpha);
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

/** Ripples are drawn into the half-res mid buffer (soft anyway; 4× fewer pixels to fill). */
function drawRipples(dt) {
  const c = mctx, S = MID_SCALE;
  c.globalCompositeOperation = "lighter";
  for (let i = RIPPLES.length - 1; i >= 0; i--) {
    const r = RIPPLES[i];
    r.r += r.v * dt;
    r.v *= Math.exp(-dt * 0.25);
    r.life -= dt * r.decay;
    if (r.life <= 0) { RIPPLES.splice(i, 1); continue; }
    const col = pal[r.color];
    let a = r.strength * r.life ** 1.4 * (r.petal ? 0.55 : r.water ? 0.5 : r.geo ? 0.48 : r.cym ? 0.4 : 0.42);
    if (r.soft) a *= Math.min(1, (1 - r.life) / 0.18) * 0.85; // ASMR emanation: fade in, then slow fade out
    else if (ASM > 0) a *= 1 - ASM; // ASMR: loud-style rings from normal mode fade away
    let w = (12 + 34 * r.strength) * (1 + (1 - r.life) * 1.6) * (r.water ? 1.35 : r.geo ? 0.7 : 1);
    if (r.soft) w *= 1.3; // wider = more feathered edge
    if (r.petal) {
      drawPetalRipple(c, r, col, a, w, S);
      continue;
    }
    if (r.water) {
      drawWaterRipple(c, r, col, a, w, S);
      continue;
    }
    if (r.geo) {
      drawGeoRipple(c, r, col, a, w, S);
      continue;
    }
    if (r.cym) {
      drawCymRipple(c, r, col, a, w, S);
      continue;
    }
    // Vercel circular patterns: dual nested soft expanding annuli (outer + inner halo)
    for (const [rr, aa, ww] of [[r.r, a, w], [r.r * 0.78, a * 0.4, w * 0.6]]) {
      const inner = Math.max(0, rr - ww), outer = rr + ww;
      const g = c.createRadialGradient(r.x * S, r.y * S, inner * S, r.x * S, r.y * S, outer * S);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(0.5, rgba(mix(col, [255, 255, 255], 0.2), aa));
      g.addColorStop(1, rgba(col, 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(r.x * S, r.y * S, outer * S, 0, Math.PI * 2);
      c.arc(r.x * S, r.y * S, inner * S, 0, Math.PI * 2, true); // annulus only
      c.fill();
    }
  }
}

function drawMotes(dt, time) {
  ctx.globalCompositeOperation = "lighter";
  const act = A.activity;
  // ASMR: fewer, dimmer, smaller, slower motes = faint drifting dust
  const dustN = 1 - 0.45 * ASM, dustV = 1 - 0.65 * ASM, dustA = 1 - 0.35 * ASM, dustS = 1 - 0.25 * ASM;
  const count = Math.min(MOTES.length, Math.round((100 * pal.density + 90 * act) * dustN));
  const base = (8 + 80 * act + 40 * A.pulse) * pal.speed * dustV;
  const M = Math.min(W, H);
  for (let i = 0; i < count; i++) {
    const m = MOTES[i];
    // gentle flow field + each mote's own slow wander (prevents motes collecting into lines)
    const ang = Math.sin(m.x * 0.0023 + time * 0.07 + m.fo) * Math.cos(m.y * 0.0019 - time * 0.05) * Math.PI * 2;
    m.da += dt * (Math.sin(time * 0.3 + m.fo) * 0.6);
    let ax = (Math.cos(ang) * 0.5 + Math.cos(m.da) * m.ds) * base;
    let ay = (Math.sin(ang) * 0.5 + Math.sin(m.da) * m.ds) * base - pal.rise * (8 + 30 * act) * pal.speed * m.ds;
    // ripples push the light outward as they pass
    for (const r of RIPPLES) {
      const dx = m.x - r.x, dy = m.y - r.y;
      const d = Math.hypot(dx, dy) + 1e-3;
      const band = Math.abs(d - r.r);
      if (band < 60) {
        const f = (1 - band / 60) * r.strength * r.life;
        ax += (dx / d) * f * 220;
        ay += (dy / d) * f * 220;
        m.glow = Math.max(m.glow, f);
      }
    }
    m.vx = smooth(m.vx, ax, dt, 0.6);
    m.vy = smooth(m.vy, ay, dt, 0.6);
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.glow *= Math.exp(-dt * 2);
    if (m.x < -40) m.x = W + 30; else if (m.x > W + 40) m.x = -30;
    if (m.y < -40) m.y = H + 30; else if (m.y > H + 40) m.y = -30;
    m.tw += dt * (0.8 + 2 * act) * dustV;
    const tw = 0.55 + 0.45 * Math.sin(m.tw);
    const s = M * 0.028 * m.size * (0.75 + 0.4 * act + 0.3 * A.high + 0.6 * m.glow) * dustS;
    ctx.globalAlpha = clamp01((0.22 + 0.45 * act + 0.6 * m.glow) * tw * dustA);
    ctx.drawImage(m.alt ? spriteB : spriteA, m.x - s / 2, m.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

// ---------- Love world (key 3): cinematic intimate room ----------
function isLoveMood() { return EMOTIONS[targetKey].id === "love"; }
/** Manual-only Love geometry extras (candle core, silk boost, grain vignette).
 *  Off in Auto so mood fades stay color-only. Shared sparks stay on for Love in Auto. */
function loveMotionOn() { return moodMode_ !== "auto" && isLoveMood(); }

/** Lub-dub + intimate-room drivers when Love is active (Auto or manual).
 *  Does NOT retarget silk amp/speed (MOTION_BASE + SILK_FLOW stay pinned).
 *  Patterns: shared mood sparks (tiny soft rising circles). No flower/orb overlays. */
function updateLoveHeart(dt, time) {
  if (!isLoveMood()) {
    LOVE.beat = smooth(LOVE.beat, 0, dt, 0.35);
    LOVE.strength = smooth(LOVE.strength, 0, dt, 0.5);
    LOVE.breath = smooth(LOVE.breath, 0, dt, 0.8);
    LOVE.haze = smooth(LOVE.haze, 0, dt, 1.2);
    LOVE.candle = smooth(LOVE.candle, 0, dt, 0.6);
    LOVE.grain = smooth(LOVE.grain, 0, dt, 0.8);
    return;
  }
  const energy = clamp01(0.3 * A.activity + 0.4 * A.bass + 0.25 * A.amp + 0.2 * A.pulse);
  LOVE.strength = smooth(LOVE.strength, energy, dt, 0.28);
  LOVE.breath = 0.5 + 0.5 * Math.sin(time * (Math.PI * 2 / 8.2));
  LOVE.haze = smooth(LOVE.haze, 0.45 + 0.4 * LOVE.strength + 0.15 * LOVE.breath, dt, 0.6);
  LOVE.candle = smooth(LOVE.candle, 0.55 + 0.35 * LOVE.strength + 0.2 * A.bassSlow, dt, 0.4);
  LOVE.grain = smooth(LOVE.grain, 0.35 + 0.25 * LOVE.strength, dt, 0.8);
  const bpm = 44 + 28 * LOVE.strength;
  const period = 60 / Math.max(38, bpm);
  if (time >= LOVE.next) {
    LOVE.phase = 0;
    LOVE.next = time + period * (0.94 + Math.random() * 0.1);
    // Soft circle halo on the beat (same language as other moods)
    if (beatInWaves && LOVE.strength > 0.15 && A.gate > 0.15 && (!asmrMode || Math.random() < 0.3)) {
      // ASMR: only some beats, as a slow soft emanation
      spawnRipple((0.32 + 0.5 * LOVE.strength) * (asmrMode ? 0.7 : 1), [W * 0.5, H * 0.54], asmrMode);
    }
  }
  LOVE.phase += dt;
  const p = period;
  const lub = Math.exp(-Math.pow((LOVE.phase - 0.02) / 0.06, 2));
  const dub = 0.5 * Math.exp(-Math.pow((LOVE.phase - p * 0.2) / 0.055, 2));
  const env = (lub + dub) * (0.4 + 0.6 * LOVE.strength) * (beatInWaves ? 1 : 0.35); // beat off: subtle glow pulse
  LOVE.beat = smooth(LOVE.beat, clamp01(env), dt, 0.045);
}

/** Far / mid / near parallax volumes — soft rose haze drifting at different depths. */
function drawLoveVolumes(dt, time) {
  if (!isLoveMood() || !LOVE_VOLUMES.length) return;
  sctx.globalCompositeOperation = "lighter";
  const M = Math.min(SW, SH);
  const K = pal.lumK;
  const haze = LOVE.haze;
  for (const v of LOVE_VOLUMES) {
    v.ph += dt * v.fx * (0.35 + 0.4 * LOVE.strength) * (0.5 + v.depth);
    const x = (v.cx + Math.sin(v.ph) * v.ax + Math.sin(time * 0.07 + v.fy) * 0.03 * v.depth) * SW;
    const y = (v.cy + Math.cos(v.ph * 0.85) * v.ay + Math.cos(time * 0.05 + v.fx) * 0.025) * SH;
    // parallax: far volumes are larger & dimmer; near are smaller & brighter
    const r = M * v.r * (1.4 - 0.35 * v.depth) * (0.9 + 0.2 * LOVE.breath + 0.15 * A.bass);
    const col = pal[v.color] || pal.glow;
    const a = (0.018 + 0.04 * haze * v.depth + 0.025 * LOVE.beat * v.depth) * K;
    const g = sctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(mix(col, pal.particle, 0.25 * v.depth), a));
    g.addColorStop(0.45, rgba(col, a * 0.45));
    g.addColorStop(1, rgba(col, 0));
    sctx.fillStyle = g;
    sctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

/**
 * Luminous liquid folds — soft caustic-like glows that fold with bass / mid energy.
 * Drawn into the soft buffer so blur turns them into ink-in-water light.
 */
function drawLoveCaustics(dt, time) {
  if (!isLoveMood() || !LOVE_CAUSTICS.length) return;
  sctx.globalCompositeOperation = "lighter";
  const K = pal.lumK;
  const L = A.spec.length - 1;
  for (const c of LOVE_CAUSTICS) {
    const lv = A.spec[Math.round(c.band * L)] || 0;
    c.ph += dt * c.speed * (0.5 + 1.2 * A.activity + 0.8 * LOVE.strength);
    // fold: position drifts; length swells with audio
    const u = (c.u + Math.sin(c.ph) * 0.08 + Math.sin(time * 0.11 + c.ph) * 0.04) % 1;
    const v = c.v + Math.cos(c.ph * 0.7) * 0.06 + 0.03 * LOVE.breath;
    const x = u * SW, y = v * SH;
    const swell = 0.7 + 0.5 * lv * A.activity + 0.35 * LOVE.beat + 0.2 * A.bass;
    const len = c.len * SW * swell;
    const thick = c.thick * SH * (0.85 + 0.4 * lv + 0.25 * LOVE.candle);
    const ang = c.ang + Math.sin(c.ph * 0.5) * 0.25;
    const col = pal[c.tint] || pal.core;
    const a = (0.03 + 0.06 * LOVE.haze + 0.05 * lv * A.activity + 0.04 * LOVE.beat) * K;
    sctx.save();
    sctx.translate(x, y);
    sctx.rotate(ang);
    // soft elongated ellipse = liquid light fold
    const g = sctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(len, thick));
    g.addColorStop(0, rgba(mix(col, [255, 230, 240], 0.4), a * 1.1));
    g.addColorStop(0.35, rgba(col, a * 0.55));
    g.addColorStop(0.75, rgba(mix(col, pal.accent, 0.4), a * 0.18));
    g.addColorStop(1, rgba(col, 0));
    sctx.fillStyle = g;
    sctx.scale(1, Math.max(0.15, thick / Math.max(8, len)));
    sctx.beginPath();
    sctx.ellipse(0, 0, len, len, 0, 0, Math.PI * 2);
    sctx.fill();
    sctx.restore();
  }
}

/** Extra Love silk: wider rose fabric ribbons that breathe with the room. */
function loveSilkBoost(rb, silkItem) {
  if (!loveMotionOn()) return;
  const boost = 1.22 + 0.12 * LOVE.breath + 0.1 * LOVE.beat;
  for (let i = 0; i < silkItem.spread.length; i++) silkItem.spread[i] *= boost;
}

/**
 * Soft film grain + intimate edge falloff — subtle realism for Love only.
 * Keeps blacks deep; grain is very light so projection still looks clean.
 */
function drawLoveAtmosphere() {
  if (!loveMotionOn() || LOVE.grain < 0.05) return;
  // intimate vignette (stronger than default — candle room)
  ctx.globalCompositeOperation = "source-over";
  const v = ctx.createRadialGradient(
    W * 0.5, H * 0.52, Math.min(W, H) * 0.22,
    W * 0.5, H * 0.52, Math.hypot(W, H) * 0.58
  );
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(0.6, "rgba(8,0,6,0.1)");
  v.addColorStop(0.88, "rgba(0,0,0,0.42)");
  v.addColorStop(1, "rgba(0,0,0,0.78)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
  // subtle grain (few sparse soft dots — cheap, reads as film on projector)
  if (LOVE.grain > 0.15) {
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.045 * LOVE.grain;
    const n = 40;
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W, y = Math.random() * H;
      const s = 0.6 + Math.random() * 1.4;
      ctx.fillStyle = Math.random() < 0.5 ? "rgba(255,230,240,1)" : "rgba(20,0,15,1)";
      ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
}


/** Love petal-lobed rings — voice blooming from center. */
function drawPetalRipple(c, r, col, a, w, S) {
  const cx = r.x * S, cy = r.y * S;
  const lobes = r.lobes || 5;
  const soft = mix(col, [255, 220, 240], 0.25);
  c.beginPath();
  for (let i = 0; i <= 72; i++) {
    const th = (i / 72) * Math.PI * 2 + r.rot;
    const wave = 0.72 + 0.28 * Math.cos(lobes * th);
    const rr = (r.r + w * 0.35) * wave * S;
    const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * 0.92;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.moveTo(cx + r.r * 0.55 * S, cy);
  for (let i = 0; i <= 72; i++) {
    const th = (i / 72) * Math.PI * 2 + r.rot;
    const wave = 0.78 + 0.22 * Math.cos(lobes * th);
    const rr = Math.max(2, (r.r - w * 0.55) * wave * S);
    const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr * 0.92;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  const g = c.createRadialGradient(cx, cy, Math.max(1, r.r * 0.2 * S), cx, cy, (r.r + w) * 1.15 * S);
  g.addColorStop(0, rgba(soft, 0));
  g.addColorStop(0.45, rgba(soft, a * 0.85));
  g.addColorStop(0.75, rgba(col, a * 0.55));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.fill("evenodd");
}

/** Soft water ripples — Calm: wide gentle concentric bands like a still pool. */
function drawWaterRipple(c, r, col, a, w, S) {
  const cx = r.x * S, cy = r.y * S;
  for (const [scale, aa, ww] of [[1, a, w], [0.72, a * 0.45, w * 0.7], [1.22, a * 0.25, w * 0.5]]) {
    const rr = r.r * scale;
    const inner = Math.max(0, rr - ww), outer = rr + ww;
    const g = c.createRadialGradient(cx, cy, inner * S, cx, cy, outer * S);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.45, rgba(mix(col, [200, 255, 255], 0.25), aa * 0.9));
    g.addColorStop(0.7, rgba(col, aa * 0.55));
    g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, outer * S, 0, Math.PI * 2);
    c.arc(cx, cy, inner * S, 0, Math.PI * 2, true);
    c.fill();
  }
}

/** Crisp geometric rings — Clarity: thin polygon / circle outlines. */
function drawGeoRipple(c, r, col, a, w, S) {
  const cx = r.x * S, cy = r.y * S;
  const sides = r.sides || 6;
  const soft = mix(col, [255, 255, 255], 0.35);
  c.save();
  c.translate(cx, cy);
  c.rotate(r.rot + (1 - r.life) * 0.15);
  // outer polygon ring
  for (const [scale, aa, lw] of [[1, a, 1.4], [0.78, a * 0.4, 0.9]]) {
    const rr = r.r * scale * S;
    c.beginPath();
    for (let i = 0; i <= sides; i++) {
      const th = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(th) * rr, y = Math.sin(th) * rr;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.strokeStyle = rgba(soft, aa);
    c.lineWidth = Math.max(0.6, (w * 0.04 + lw) * S * 2);
    c.stroke();
  }
  // thin circle companion
  c.beginPath();
  c.arc(0, 0, r.r * 0.92 * S, 0, Math.PI * 2);
  c.strokeStyle = rgba(col, a * 0.35);
  c.lineWidth = Math.max(0.5, w * 0.025 * S);
  c.stroke();
  c.restore();
}

/** Soft concentric cymatic band — Spiritual (transient from onsets). */
function drawCymRipple(c, r, col, a, w, S) {
  const cx = r.x * S, cy = r.y * S;
  const lobes = 8;
  c.beginPath();
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2 + r.rot;
    const wave = 1 + 0.04 * Math.sin(lobes * th) * r.strength;
    const rr = r.r * wave * S;
    const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.strokeStyle = rgba(mix(col, [255, 240, 200], 0.2), a * 0.85);
  c.lineWidth = Math.max(1, w * 0.06 * S);
  c.stroke();
  // inner harmonic
  c.beginPath();
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2 + r.rot;
    const wave = 1 + 0.03 * Math.sin(lobes * th + 0.5);
    const rr = r.r * 0.62 * wave * S;
    const x = cx + Math.cos(th) * rr, y = cy + Math.sin(th) * rr;
    if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
  }
  c.closePath();
  c.strokeStyle = rgba(col, a * 0.4);
  c.lineWidth = Math.max(0.7, w * 0.04 * S);
  c.stroke();
}

// ---------- Per-emotion pattern motifs ----------
// ALL moods use Joy's visual language: rising sparks + soft local sunbursts.
// Silk motion: MOTION_BASE (Auto color-only on waves). Patterns: per-mood rising circles + sunbursts.
// Love candle extras stay behind loveMotionOn(). No crude flower overlays.

function moodId() { return EMOTIONS[targetKey].id; }

/** Spark choreography — per-mood dens/speed/rise/sunbursts (yesterday). Silk amp stays MOTION_BASE. */
function moodSparkStyle() {
  const id = moodId();
  // dens = spawn rate scale · rise = vy sign (+up/-down) · speed · burst = sunburst chance/size
  // size = spark scale · maxS/maxB = caps · y0/y1 = spawn band · drift = horizontal wander
  switch (id) {
    case "joy":
      return { dens: 1.0, rise: 1, speed: 1.15, burst: 1.0, size: 1.0, maxS: 40, maxB: 3, y0: 0.50, y1: 0.92, drift: 1.0, star: 0.55 };
    case "calm":
      return { dens: 0.35, rise: 0.35, speed: 0.45, burst: 0.25, size: 0.85, maxS: 18, maxB: 1, y0: 0.45, y1: 0.85, drift: 0.5, star: 0.15 };
    case "love":
      return { dens: 0.55, rise: 0.55, speed: 0.55, burst: 0.45, size: 1.05, maxS: 26, maxB: 2, y0: 0.48, y1: 0.90, drift: 0.7, star: 0.35 };
    case "release":
      return { dens: 0.5, rise: -0.85, speed: 0.5, burst: 0.2, size: 0.9, maxS: 28, maxB: 1, y0: 0.05, y1: 0.45, drift: 0.45, star: 0.1 };
    case "ground":
      return { dens: 0.45, rise: 0.15, speed: 0.4, burst: 0.3, size: 1.1, maxS: 22, maxB: 1, y0: 0.62, y1: 0.95, drift: 0.9, star: 0.2 };
    case "clarity":
      return { dens: 0.5, rise: 0.7, speed: 0.85, burst: 0.55, size: 0.8, maxS: 24, maxB: 2, y0: 0.35, y1: 0.8, drift: 0.4, star: 0.65 };
    case "spirit":
      return { dens: 0.4, rise: 0.4, speed: 0.5, burst: 0.4, size: 1.0, maxS: 20, maxB: 2, y0: 0.3, y1: 0.75, drift: 0.6, star: 0.4 };
    case "energy":
      return { dens: 1.35, rise: 0.9, speed: 1.45, burst: 1.25, size: 1.05, maxS: 48, maxB: 4, y0: 0.4, y1: 0.9, drift: 1.2, star: 0.5 };
    case "sad": // soft rain: falling, slow, no bursts
      return { dens: 0.6, rise: -1.0, speed: 0.55, burst: 0.0, size: 0.75, maxS: 34, maxB: 0, y0: 0.0, y1: 0.3, drift: 0.15, star: 0.0 };
    case "wonder": // gentle light rising outward
      return { dens: 0.5, rise: 0.5, speed: 0.5, burst: 0.55, size: 1.05, maxS: 26, maxB: 2, y0: 0.35, y1: 0.7, drift: 0.9, star: 0.45 };
    case "intensity": // ember sparks: warm, rising, no star flashes (audience-safe)
      return { dens: 1.0, rise: 0.8, speed: 1.0, burst: 0.35, size: 0.85, maxS: 36, maxB: 1, y0: 0.55, y1: 0.95, drift: 0.9, star: 0.0 };
    default:
      return { dens: 0.6, rise: 0.7, speed: 0.8, burst: 0.5, size: 1, maxS: 28, maxB: 2, y0: 0.45, y1: 0.9, drift: 0.8, star: 0.4 };
  }
}

function seedMoodPattern(id) {
  PATTERN.acc = 0;
  const st = moodSparkStyle();
  const n = asmrMode ? 4 : Math.max(4, Math.round(6 * st.dens));
  for (let i = 0; i < n; i++) spawnMoodSpark(0.45 + Math.random() * 0.4);
  if (st.burst > 0.3) spawnMoodBurst(0.4 + 0.2 * st.burst);
}

function onPatternOnset(stAmp, time) {
  if (time - PATTERN.lastBurst < 0.26) return;
  PATTERN.lastBurst = time;
  const st = moodSparkStyle();
  const n = Math.max(1, Math.floor(1 + stAmp * 3 * st.dens));
  for (let i = 0; i < n; i++) spawnMoodSpark(0.45 + 0.5 * stAmp);
  if (Math.random() < 0.35 + 0.45 * st.burst * stAmp) {
    spawnMoodBurst(0.35 + 0.55 * stAmp * st.burst);
  }
}

function spawnMoodSpark(strength, style) {
  const st = style || moodSparkStyle();
  while (JOY_SPARKS.length > st.maxS) JOY_SPARKS.shift();
  const up = st.rise >= 0;
  const riseAbs = Math.abs(st.rise);
  if (asmrMode) {
    // ASMR: same per-mood direction / band / drift / stars, ~1/3 speed, long soft life with fade in + out.
    // Mix: 60% mood direction (some entering from the screen edge), 20% drift in from left/right,
    // 20% gentle counter-flow, so things are always both falling and coming in.
    if (JOY_SPARKS.length >= Math.round(st.maxS * 1.25)) return; // never pop old ones out
    const rnd = Math.random;
    const vyMag = 10 + 0.35 * (35 + rnd() * 90) * (0.55 + 0.5 * strength) * riseAbs * st.speed;
    const dir = up ? -1 : 1;
    let x, y, vx, vy;
    const r = rnd();
    if (r < 0.6) {
      x = W * (0.06 + rnd() * 0.88);
      y = rnd() < 0.4 ? (up ? H + 12 : -12) : H * (st.y0 + rnd() * Math.max(0.05, st.y1 - st.y0));
      vx = (rnd() - 0.5) * 12 * st.drift;
      vy = dir * vyMag;
    } else if (r < 0.8) {
      const left = rnd() < 0.5;
      x = left ? -12 : W + 12;
      y = H * (0.12 + rnd() * 0.76);
      vx = (left ? 1 : -1) * (22 + rnd() * 26) * (0.6 + 0.4 * st.drift);
      vy = dir * vyMag * 0.35;
    } else {
      x = W * (0.06 + rnd() * 0.88);
      y = up ? -12 : H + 12;
      vx = (rnd() - 0.5) * 10 * st.drift;
      vy = -dir * vyMag * 0.75;
    }
    JOY_SPARKS.push({
      x, y, vx, vy,
      life: 1, age: 0, soft: true,
      decay: 1 / (6 + rnd() * 4.5),
      size: (0.55 + rnd() * 1.1) * st.size,
      tw: rnd() * Math.PI * 2,
      tint: rnd() < 0.35 ? "accent" : (rnd() < 0.5 ? "core" : "particle"),
      star: rnd() < st.star * 0.6,
    });
    return;
  }
  JOY_SPARKS.push({
    x: W * (0.12 + Math.random() * 0.76),
    y: H * (st.y0 + Math.random() * Math.max(0.05, st.y1 - st.y0)),
    vx: (Math.random() - 0.5) * 28 * st.drift,
    vy: (up ? -1 : 1) * (35 + Math.random() * 90) * (0.55 + 0.5 * strength) * riseAbs * st.speed,
    life: 1,
    decay: 1 / ((2.0 + Math.random() * 2.2) / Math.max(0.35, st.speed * 0.85 + 0.3)),
    size: (0.5 + Math.random() * 1.25) * st.size,
    tw: Math.random() * Math.PI * 2,
    tint: Math.random() < 0.35 ? "accent" : (Math.random() < 0.5 ? "core" : "particle"),
    star: Math.random() < st.star,
  });
}

function spawnMoodBurst(strength) {
  const st = moodSparkStyle();
  if (asmrMode) {
    // ASMR: soft bloom: swells in, slowly turns, fades out (no flash)
    if (JOY_BURSTS.length >= st.maxB) return;
    JOY_BURSTS.push({
      x: W * (0.25 + Math.random() * 0.5),
      y: H * (st.rise < 0 ? (0.22 + Math.random() * 0.3) : (0.28 + Math.random() * 0.4)),
      life: 1, soft: true,
      decay: 1 / (5 + Math.random() * 2.5),
      rays: 6 + Math.floor(Math.random() * 4),
      rot: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.12 * st.speed,
      strength: strength * (0.7 + 0.4 * st.burst),
      tint: Math.random() < 0.5 ? "core" : "accent",
    });
    return;
  }
  while (JOY_BURSTS.length > st.maxB) JOY_BURSTS.shift();
  JOY_BURSTS.push({
    x: W * (0.32 + Math.random() * 0.36),
    y: H * (st.rise < 0 ? (0.25 + Math.random() * 0.25) : (0.32 + Math.random() * 0.3)),
    life: 1,
    decay: 1 / ((1.4 + Math.random() * 0.7) / Math.max(0.4, 0.5 + 0.5 * st.speed)),
    rays: 6 + Math.floor(Math.random() * 4),
    rot: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.4 * st.speed,
    strength: strength * (0.7 + 0.4 * st.burst),
    tint: Math.random() < 0.5 ? "core" : "accent",
  });
}

// Back-compat aliases used nowhere critical
function spawnJoySpark(s) { spawnMoodSpark(s); }
function spawnJoySunburst(s) { spawnMoodBurst(s); }

function updateMoodPatterns(dt, time) {
  const act = A.activity;
  const st = moodSparkStyle();
  // continuous spark rain tuned per mood
  if (asmrMode) {
    asmrPatterns(dt, act, st);
  } else if (act > 0.06 || st.rise < 0) {
    const base = (st.rise < 0 ? 0.55 : 0.35) + act * (2.8 * st.dens);
    PATTERN.acc += dt * base * st.dens;
    while (PATTERN.acc > 1) {
      PATTERN.acc -= 1;
      spawnMoodSpark(0.3 + 0.55 * Math.max(act, st.rise < 0 ? 0.25 : 0));
    }
  } else {
    PATTERN.acc *= Math.exp(-dt * 1.4);
  }
  // rare soft sunbursts while active
  if (!asmrMode && act > 0.15 && st.burst > 0.2 && Math.random() < dt * (0.15 + 0.55 * act) * st.burst) {
    if (JOY_BURSTS.length < st.maxB) spawnMoodBurst(0.3 + 0.5 * act);
  }

  // Keep unused motif arrays quiet / fading (no new shape clutter)
  for (const s of GROUND_SWELLS) s.lvl = smooth(s.lvl, 0, dt, 1.2);
  for (const s of CALM_SHEETS) s.lvl = smooth(s.lvl, 0, dt, 1.2);
  for (const r of SPIRIT_RINGS) r.a = smooth(r.a, 0, dt, 1.2);
  CLARITY_RINGS.length = 0;
  ENERGY_BURSTS.length = 0;
  RELEASE_RAIN.length = 0;
}

/** ASMR: continuous gentle flow even in silence (things keep falling and coming in);
 *  sound adds a little more. Soft per-mood emanations and blooms now and then. */
function asmrPatterns(dt, act, st) {
  PATTERN.acc += dt * (0.9 + 2.4 * act) * (0.55 + 0.45 * st.dens);
  while (PATTERN.acc > 1) {
    PATTERN.acc -= 1;
    spawnMoodSpark(0.3 + 0.5 * act);
  }
  const ringRate = EMOTIONS[targetKey].rippleRate || 0.5;
  PATTERN.ringAcc = (PATTERN.ringAcc || 0) + dt * (0.06 + 0.28 * act) * ringRate;
  if (PATTERN.ringAcc > 1) {
    PATTERN.ringAcc = 0;
    spawnRipple(0.2 + 0.3 * act, null, true);
  }
  if (st.burst > 0.2 && Math.random() < dt * (0.025 + 0.1 * act) * st.burst) spawnMoodBurst(0.3 + 0.4 * act);
}

function drawJoySparks(dt, time) {
  if (!JOY_SPARKS.length && !JOY_BURSTS.length) return;
  const st = moodSparkStyle();
  const active = true; // always draw while particles live (crossfade handled by life)
  ctx.globalCompositeOperation = "lighter";
  const M = Math.min(W, H);

  for (let i = JOY_BURSTS.length - 1; i >= 0; i--) {
    const b = JOY_BURSTS[i];
    b.life -= dt * b.decay;
    if (b.life <= 0) { JOY_BURSTS.splice(i, 1); continue; }
    b.rot += dt * b.spin;
    const col = pal[b.tint] || pal.core;
    // soft bloom: sin envelope (swell in, fade out); normal bursts fade away while ASMR is on
    const a = b.soft ? Math.sin(Math.PI * (1 - b.life)) * b.strength * 0.3
      : b.life ** 1.3 * b.strength * 0.4 * (1 - ASM);
    const reach = M * (0.12 + 0.11 * b.strength) * (0.7 + 0.3 * (1 - b.life)) * (b.soft ? 0.9 : 1);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.rot);
    for (let k = 0; k < b.rays; k++) {
      const th = (k / b.rays) * Math.PI * 2;
      const len = reach * (0.55 + 0.45 * Math.sin(time * (b.soft ? 1 : 3) + k));
      const g = ctx.createLinearGradient(0, 0, Math.cos(th) * len, Math.sin(th) * len);
      g.addColorStop(0, rgba(mix(col, [255, 255, 220], 0.4), a));
      g.addColorStop(0.45, rgba(col, a * 0.38));
      g.addColorStop(1, rgba(col, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = b.soft ? 1 + 1.2 * b.strength : 1.3 + 1.6 * b.strength * b.life;
      ctx.beginPath();
      ctx.moveTo(Math.cos(th) * 4, Math.sin(th) * 4);
      ctx.lineTo(Math.cos(th) * len, Math.sin(th) * len);
      ctx.stroke();
    }
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, reach * 0.32);
    cg.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.4), a * 0.55));
    cg.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(0, 0, reach * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  for (let i = JOY_SPARKS.length - 1; i >= 0; i--) {
    const p = JOY_SPARKS[i];
    p.life -= dt * p.decay;
    if (p.life <= 0 || p.y < -30 || p.y > H + 30) { JOY_SPARKS.splice(i, 1); continue; }
    if (p.soft) {
      // ASMR spark: slow drift, fade in over ~1.2 s, hold, fade out over the last ~45% of life
      if (p.x < -40 || p.x > W + 40) { JOY_SPARKS.splice(i, 1); continue; }
      p.age += dt;
      p.tw += dt * (1.1 + 0.5 * st.speed);
      p.x += p.vx * dt + Math.sin(time * 0.6 + p.tw) * 3 * st.drift * dt;
      p.y += p.vy * dt;
      p.vy *= Math.exp(-dt * 0.03);
      const fi = Math.min(1, p.age / 1.2), fo = Math.min(1, p.life / 0.45);
      const env = fi * fi * (3 - 2 * fi) * fo;
      const col = pal[p.tint] || pal.core;
      const a = env * (0.36 + 0.3 * A.activity) * (0.85 + 0.15 * Math.sin(p.tw));
      const s = M * 0.014 * p.size * (0.9 + 0.15 * Math.sin(p.tw));
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 2.8);
      g.addColorStop(0, rgba(mix(col, [255, 255, 230], 0.4), a * (p.star ? 0.55 : 1)));
      g.addColorStop(0.35, rgba(col, a * 0.42));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 2.8, 0, Math.PI * 2);
      ctx.fill();
      if (p.star) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.tw * 0.15);
        ctx.beginPath();
        for (let k = 0; k < 8; k++) {
          const th = (k / 8) * Math.PI * 2 - Math.PI / 2;
          const rr = (k % 2 === 0 ? s * 1.6 : s * 0.5);
          if (k === 0) ctx.moveTo(Math.cos(th) * rr, Math.sin(th) * rr); else ctx.lineTo(Math.cos(th) * rr, Math.sin(th) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = rgba(mix(col, [255, 255, 230], 0.3), a * 0.38);
        ctx.fill();
        ctx.restore();
      }
      continue;
    }
    p.tw += dt * (3.2 + 1.5 * st.speed) * (1 - 0.7 * ASM);
    p.x += p.vx * dt + Math.sin(time * 1.8 + p.tw) * 7 * st.drift * dt;
    p.y += p.vy * dt;
    p.vy *= Math.exp(-dt * 0.12);
    const col = pal[p.tint] || pal.core;
    const a = p.life ** 1.15 * (0.48 + 0.4 * A.activity) * (1 - 0.6 * ASM);
    const s = M * 0.013 * p.size * (0.8 + 0.3 * Math.sin(p.tw));
    if (p.star) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.tw * 0.25);
      ctx.beginPath();
      for (let k = 0; k < 8; k++) {
        const th = (k / 8) * Math.PI * 2 - Math.PI / 2;
        const rr = (k % 2 === 0 ? s * 1.75 : s * 0.5);
        const x = Math.cos(th) * rr, y = Math.sin(th) * rr;
        if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(mix(col, [255, 255, 230], 0.4), a);
      ctx.fill();
      ctx.restore();
    } else {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 2.3);
      g.addColorStop(0, rgba(mix(col, [255, 255, 230], 0.5), a));
      g.addColorStop(0.4, rgba(col, a * 0.48));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

// Retired motif drawers — no-ops so any leftover call sites stay safe
function drawCalmSheets() {}
function drawGroundSwells() {}
function drawGroundMountains() {}
function drawClarityRings() {}
function drawSpiritCymatics() {}
function drawEnergyBursts() {}
function drawReleaseRain() {}

function drawMoodPatterns(dt, time) {
  drawJoySparks(dt, time);
}

function setVizMode(mode) {
  if (mode !== "wave" && mode !== "silk" && mode !== "nebula") return;
  const labels = { wave: "Traveling waves", silk: "Silk waves", nebula: "Reactive nebula" };
  if (vizMode === mode) {
    toast(labels[mode]);
    return;
  }
  vizMode = mode;
  toast(labels[mode]);
}

/** Shared high-pitch presence gate (same spirit as silkBand): high shows more, bass-alone stays quiet. */
function nebulaPresence() {
  const highPresence = clamp01(0.15 + 1.4 * A.high + 0.55 * A.mid - 0.45 * A.bass);
  const softGate = (A.high < 0.08 && A.mid < 0.12) ? 0.14 : 1;
  return highPresence * softGate;
}

/**
 * Soft volumetric nebula on the low-res bloom buffer: layered radial fog cells that
 * pulse with bass, swirl with mid, and wake with highPresence (TeamLab / Spectra feel).
 */
function drawSoftNebula(dt, time, breath) {
  const act = A.activity;
  const presence = nebulaPresence();
  NEBULA.presence = smooth(NEBULA.presence, presence, dt, 0.25);
  const p = NEBULA.presence;
  // mid drives swirl rate; bass expands bloom; high brightens core
  const swirlTgt = (0.12 + 1.6 * A.mid + 0.35 * A.activity) * (0.15 + 0.85 * p) * pal.speed;
  NEBULA.swirl = smooth(NEBULA.swirl, swirlTgt * asmrSlow, dt, 0.35);
  const bloomTgt = (0.35 + 0.9 * A.bass + 0.35 * A.pulse + 0.25 * breath * pal.breathe) * (0.2 + 0.8 * p);
  NEBULA.bloom = smooth(NEBULA.bloom, bloomTgt, dt, 0.2);

  sctx.globalCompositeOperation = "source-over";
  sctx.globalAlpha = 1;
  sctx.clearRect(0, 0, SW, SH);
  sctx.globalCompositeOperation = "lighter";
  const M = Math.min(SW, SH);
  const cx = SW * 0.5, cy = SH * (isPhone ? 0.48 : 0.52);
  const K = pal.lumK;

  // Deep ambient pool (mood-tinted) — quiet when presence is low
  {
    const poolR = M * (0.55 + 0.35 * NEBULA.bloom + 0.08 * breath);
    const g = sctx.createRadialGradient(cx, cy, 0, cx, cy, poolR);
    const a0 = (0.04 + 0.10 * NEBULA.bloom + 0.06 * act) * K * (0.25 + 0.75 * p);
    g.addColorStop(0, rgba(mix(pal.core, pal.glow, 0.4), a0));
    g.addColorStop(0.45, rgba(pal.deep, a0 * 0.55));
    g.addColorStop(1, rgba(pal.deep, 0));
    sctx.fillStyle = g;
    sctx.beginPath();
    sctx.arc(cx, cy, poolR, 0, Math.PI * 2);
    sctx.fill();
  }

  // Volumetric cloud cells
  for (let i = 0; i < NEBULA_CLOUDS.length; i++) {
    const c = NEBULA_CLOUDS[i];
    c.ang += dt * c.spin * NEBULA.swirl * (0.6 + 0.8 * c.wobble);
    const wob = Math.sin(time * (0.15 + 0.25 * c.wobble) + c.ph);
    const rad = c.rad * (1 + 0.55 * NEBULA.bloom + 0.12 * wob) * (isPhone ? 1.15 : 1);
    const px = cx + Math.cos(c.ang + time * 0.02 * c.spin) * rad * M * (isPhone ? 1.05 : 0.95);
    const py = cy + Math.sin(c.ang * 0.92 + time * 0.018 * c.spin) * rad * M * c.oval * (isPhone ? 1.25 : 1);
    const sz = M * c.size * (0.7 + 0.9 * NEBULA.bloom) * (0.55 + 0.45 * c.layer) * (isPhone ? 1.2 : 1);
    const col = pal[c.color] || pal.core;
    const tint = mix(col, pal.glow, 0.25 + 0.2 * c.layer);
    const a = (0.018 + 0.055 * NEBULA.bloom + 0.04 * act + 0.02 * A.high * p)
      * K * (0.2 + 0.8 * p) * (0.45 + 0.55 * c.layer) * pal.density;
    if (a < 0.004 || sz < 1) continue;
    const g = sctx.createRadialGradient(px, py, 0, px, py, sz);
    g.addColorStop(0, rgba(mix(tint, [255, 255, 255], 0.15 + 0.25 * A.high * p), a * 1.35));
    g.addColorStop(0.4, rgba(tint, a * 0.7));
    g.addColorStop(1, rgba(tint, 0));
    sctx.fillStyle = g;
    sctx.beginPath();
    sctx.ellipse(px, py, sz, sz * (0.7 + 0.35 * c.oval), c.ang * 0.3, 0, Math.PI * 2);
    sctx.fill();
  }

  // Soft breathing core
  {
    const cr = M * (0.12 + 0.08 * NEBULA.bloom + 0.04 * breath * pal.breathe + 0.05 * A.pulse);
    const g = sctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    const ca = (0.06 + 0.14 * NEBULA.bloom + 0.08 * A.bass * p) * K * (0.3 + 0.7 * p);
    g.addColorStop(0, rgba(mix(pal.particle, [255, 255, 255], 0.35), ca));
    g.addColorStop(0.5, rgba(pal.core, ca * 0.55));
    g.addColorStop(1, rgba(pal.glow, 0));
    sctx.fillStyle = g;
    sctx.beginPath();
    sctx.arc(cx, cy, cr, 0, Math.PI * 2);
    sctx.fill();
  }

  sctx.globalCompositeOperation = "source-over";
  sctx.globalAlpha = 1;
}

/** High-pitch star flecks at full resolution (capped on phone). */
function drawNebulaSparks(dt, time) {
  const p = NEBULA.presence;
  const maxSparks = isPhone ? 40 : 120;
  // spawn rate scales with high + presence; bass-alone stays quiet
  const spawnRate = (0.5 + 18 * A.high + 6 * A.mid) * p * (0.4 + 0.6 * pal.density);
  let acc = (drawNebulaSparks._acc || 0) + dt * spawnRate;
  while (acc >= 1 && NEBULA_SPARKS.length < maxSparks) {
    acc -= 1;
    const ang = Math.random() * Math.PI * 2;
    const rad = 0.05 + Math.random() * 0.48;
    NEBULA_SPARKS.push({
      ang, rad,
      spin: (0.2 + Math.random() * 0.8) * (Math.random() < 0.5 ? -1 : 1),
      size: 0.6 + Math.random() * 1.8,
      life: 0.5 + Math.random() * 0.5,
      decay: 1 / (0.6 + Math.random() * 1.4),
      tw: Math.random() * Math.PI * 2,
      tint: Math.random() < 0.45 ? "particle" : (Math.random() < 0.5 ? "core" : "accent"),
    });
  }
  drawNebulaSparks._acc = Math.min(acc, 3);

  const M = Math.min(W, H);
  const cx = W * 0.5, cy = H * (isPhone ? 0.48 : 0.52);
  ctx.globalCompositeOperation = "lighter";
  for (let i = NEBULA_SPARKS.length - 1; i >= 0; i--) {
    const s = NEBULA_SPARKS[i];
    s.life -= dt * s.decay;
    if (s.life <= 0) { NEBULA_SPARKS.splice(i, 1); continue; }
    s.ang += dt * s.spin * (0.3 + NEBULA.swirl);
    s.rad += dt * 0.02 * A.bass * p;
    const px = cx + Math.cos(s.ang) * s.rad * M * (isPhone ? 1.1 : 1);
    const py = cy + Math.sin(s.ang * 0.95) * s.rad * M * 0.85 * (isPhone ? 1.2 : 1);
    const tw = 0.5 + 0.5 * Math.sin(time * 6 + s.tw);
    const a = s.life * (0.25 + 0.55 * A.high * p + 0.2 * tw) * pal.lumK;
    if (a < 0.02) continue;
    const col = mix(pal[s.tint] || pal.particle, [255, 255, 255], 0.35 + 0.4 * A.high);
    const r = s.size * (0.7 + 0.8 * tw) * (isPhone ? 1.3 : 1);
    ctx.fillStyle = rgba(col, a);
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    // tiny cross sparkle for brightest flecks
    if (a > 0.45 && r > 1.2) {
      ctx.strokeStyle = rgba(col, a * 0.55);
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(px - r * 2.2, py); ctx.lineTo(px + r * 2.2, py);
      ctx.moveTo(px, py - r * 2.2); ctx.lineTo(px, py + r * 2.2);
      ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = "source-over";
}

function drawVignette() {
  ctx.globalCompositeOperation = "source-over";
  const v = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.3, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.55);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(0.7, "rgba(0,0,0,0.35)");
  v.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}


let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const time = (now - t0) / 1000;
  stepPalette(dt);
  governQuality(dt);
  updateMood(now);
  readAudio(dt, time);
  stepAsmr(dt);
  stepAIMotion(dt);
  applyAsmrView(); // ASMR only: visuals read compressed drivers this frame (restored below)
  const vt = time - asmrLag - aiLag; // wave clock: equals time unless ASMR / AI motion changed the speed

  // silence = slow breath (~8 s cycle); music speeds it a little
  breathPhase += dt * (Math.PI * 2 / 8) * (0.8 + 0.4 * pal.speed) * (1 + 0.6 * A.activity);
  const breath = 0.5 + 0.5 * Math.sin(breathPhase);
  // silence: rare soft breath halo (not every exhale)
  if (!asmrMode && A.activity < 0.05 && breath > 0.98 && time - lastBreathRipple > 14) {
    lastBreathRipple = time;
    spawnRipple(0.18, [W * (0.42 + Math.random() * 0.16), H * (0.45 + Math.random() * 0.12)]);
  }

  tintSprite(spriteA, pal.particle, pal.core);
  tintSprite(spriteB, pal.accent, pal.glow);

  updateLoveHeart(dt, time);
  updateMoodPatterns(dt, time);
  aiPatterns(dt);
  drawBackground(breath);
  drawMedia(dt);

  if (vizMode === "nebula") {
    drawSoftNebula(dt, vt, breath);
    mctx.globalCompositeOperation = "copy";
    mctx.imageSmoothingQuality = "high";
    mctx.filter = "blur(" + Math.max(2, Math.round(mid.width / 180)) + "px)";
    mctx.drawImage(soft, 0, 0, mid.width, mid.height);
    mctx.filter = "none";
    ctx.globalCompositeOperation = "screen";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 0.88 * (0.55 + 0.45 * pal.lumK);
    ctx.drawImage(mid, 0, 0, W, H);
    ctx.globalAlpha = 1;
    drawNebulaSparks(dt, time);
    drawMoodPatterns(dt, time);
  } else {
    const useWave = vizMode === "wave";
    const bands = RIBBONS.map((rb) => useWave ? waveBand(rb, vt, breath, time) : silkBand(rb, vt, breath, time));
    drawSoft(dt, vt, breath, bands);
    mctx.globalCompositeOperation = "copy";
    mctx.imageSmoothingQuality = "high";
    mctx.filter = "blur(" + Math.max(2, Math.round(mid.width / (useWave ? 320 : 220) * (1 + 0.7 * ASM))) + "px)";
    mctx.drawImage(soft, 0, 0, mid.width, mid.height);
    mctx.filter = "none";
    drawRipples(dt);
    ctx.globalCompositeOperation = "screen";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = (useWave ? 0.88 : 0.82) * (0.6 + 0.4 * pal.lumK) * asmrGlow; // keep the room dark between the light worlds
    ctx.drawImage(mid, 0, 0, W, H);
    ctx.globalAlpha = 1;
    if (useWave) drawWaveSharp(bands);
    else drawSilkSharp(bands);
    drawMotes(dt, vt);
    drawMoodPatterns(dt, time);
  }
  drawVignette();
  restoreAsmrView();
  requestAnimationFrame(frame);
}

// ---------- input ----------
// Show mode: fullscreen + panel away + cursor hides when idle. Esc leaves it.
function enterShowMode() {
  PRES.showLock = true;
  if (demoMode) setDemoMode(false);
  document.body.classList.add("show-lock");
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  pokeCursor();
}
function toggleShowMode() {
  if (PRES.showLock && document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
  enterShowMode();
}
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && PRES.showLock) { PRES.showLock = false; document.body.classList.remove("show-lock"); }
  sendStageState(true);
});
function pokeCursor() {
  document.body.classList.remove("idle");
  clearTimeout(PRES.idleTimer);
  PRES.idleTimer = setTimeout(() => document.body.classList.add("idle"), 2000);
}
window.addEventListener("mousemove", pokeCursor, { passive: true });

function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  else document.exitFullscreen().catch(() => {});
}
function tryBeginFromGesture() {
  if (!running && !demoMode) begin();
}
$("btn-mic").addEventListener("click", startMic);
fileInput.addEventListener("change", (e) => loadFile(e.target.files && e.target.files[0]));
$("btn-fs").addEventListener("click", toggleShowMode);
btnMode.addEventListener("click", () => setDemoMode(false));
btnAuto.addEventListener("click", () => setMoodMode(moodMode_ === "auto" ? "manual" : "auto"));
btnLabel.addEventListener("click", () => setLabel(!labelOn));
btnAsmr = $("btn-asmr");
if (btnAsmr) btnAsmr.addEventListener("click", () => setAsmrMode(!asmrMode, true));
if ($("btn-ai")) $("btn-ai").addEventListener("click", () => setAIOn(!AI.wanted));
if ($("ai-motion")) { $("ai-motion").textContent = AI.motion ? "color + motion" : "color only"; $("ai-motion").addEventListener("click", () => setAIMotion(!AI.motion)); }
if ($("ai-weight")) {
  $("ai-weight").value = String(Math.round(AI_WEIGHT_DEFAULT * 100));
  $("ai-weight").addEventListener("input", (e) => { if (AI.fusion) AI.fusion.weight = Number(e.target.value) / 100; renderAIPanel(); });
}
updateAIButton();
canvas.addEventListener("click", tryBeginFromGesture);
// iOS Safari: keep mic start inside the same user-gesture path (touch/pointer).
canvas.addEventListener("pointerup", (e) => {
  if (e.pointerType === "touch" || e.pointerType === "pen") tryBeginFromGesture();
}, { passive: true });
canvas.addEventListener("touchend", tryBeginFromGesture, { passive: true });
canvas.addEventListener("dblclick", toggleFullscreen);

window.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const dm = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
  const dash = e.code === "Minus" || e.code === "NumpadSubtract";
  if (dm || dash) {
    const d = dash ? 11 : Number(dm[1]);
    const n = d === 0 ? 10 : d; // 0 = Wonder (key 10), - = Intensity (key 11)
    if (e.shiftKey) { if (d === 0) resetTeaching(); else teachMood(n); }
    else { setEmotion(n, "manual"); setMoodMode("manual"); toast("Locked " + EMOTIONS[n].label + " · A = follow song"); }
    return;
  }
  const key = e.key.toLowerCase();
  if (key === "d" && (stageLocked() || PRES.showLock)) return; // projector / show mode: no panel here
  if (e.code === "Space") { e.preventDefault(); begin(); }
  else if (key === "o") fileInput.click();
  else if (key === "a") { setMoodMode("auto"); toast("AUTO: color follows the song mood"); }
  else if (key === "m") { setMoodMode("manual"); toast("MANUAL LOCK on " + EMOTIONS[targetKey].label); }
  else if (e.key === "[") setTrim(trimDb - 3);
  else if (e.key === "]") setTrim(trimDb + 3);
  else if (key === "f") toggleShowMode();
  else if (key === "d") setDemoMode(!demoMode);
  else if (key === "l") { setLabel(!labelOn); toast("Emotion label " + (labelOn ? "ON" : "OFF")); }
  else if (key === "w") setVizMode("wave");
  else if (key === "s") setVizMode("silk");
  else if (key === "n") setVizMode("nebula");
  else if (key === "z") setAsmrMode(!asmrMode, true);
  else if (key === "i") setAIOn(!AI.wanted);
  else if (key === "b") setBeatInWaves(!beatInWaves);
});
window.addEventListener("resize", resize);
window.addEventListener("orientationchange", () => setTimeout(resize, 120));
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", resize);
  window.visualViewport.addEventListener("scroll", resize);
}

function setBeatInWaves(on) {
  beatInWaves = !!on;
  if (!on) { PULSES.length = 0; A.pulse = 0; }
  const b = $("btn-beat"); if (b) b.textContent = "Beat in waves: " + (on ? "ON" : "OFF");
  toast("Beat in waves " + (on ? "ON (waves bump with hits)" : "OFF (smooth waves)"));
}
if ($("btn-beat")) { $("btn-beat").addEventListener("click", () => setBeatInWaves(!beatInWaves)); $("btn-beat").textContent = "Beat in waves: " + (beatInWaves ? "ON" : "OFF"); }

// ---------- presenter link (stage <-> control window) ----------
function presTransport(onMsg) {
  if (typeof BroadcastChannel !== "undefined") {
    const ch = new BroadcastChannel("stv-presenter");
    ch.onmessage = (e) => onMsg(e.data || {});
    return (m) => { try { ch.postMessage(m); } catch (_) { const c = Object.assign({}, m); delete c.file; ch.postMessage(c); } };
  }
  window.addEventListener("storage", (e) => { if (e.key === "stv-pres-c" && e.newValue) { try { onMsg(JSON.parse(e.newValue).m || {}); } catch (_) {} } });
  return (m) => { if (m.file) return; try { localStorage.setItem("stv-pres-s", JSON.stringify({ m, n: Math.random() })); } catch (_) {} };
}
function setPresConnected(on) {
  if (PRES.connected === on) return;
  PRES.connected = on;
  document.body.classList.toggle("stage", stageLocked());
  if (on) {
    if (demoMode) setDemoMode(false);
    fillMoodHexPanel(); updateLiveComboPanel(); renderMoodHud(true); renderAIPanel();
  }
}
let lastStateSent = 0;
function sendStageState(force) {
  if (!PRES.send || !PRES.connected) return;
  const now = performance.now();
  if (!force && now - lastStateSent < 140) return;
  lastStateSent = now;
  const ops = $("ops");
  PRES.send({
    t: "state", html: ops ? ops.innerHTML : "",
    info: {
      build: (BUILD_Q || "").replace("?v=", ""), running, audio: audioCtx ? audioCtx.state : "none",
      fullscreen: !!document.fullscreenElement, show: PRES.showLock, stageParam: STAGE_PARAM,
      mood: EMOTIONS[targetKey].label, auto: moodMode_ === "auto", asmr: asmrMode, ai: !!AI.wanted,
      beat: beatInWaves, aiWeight: $("ai-weight") ? Number($("ai-weight").value) : 70, viz: vizMode, label: labelOn,
      title: document.title,
    },
  });
}
function onControlMsg(m) {
  if (m.t === "hello") { PRES.lastHello = performance.now(); setPresConnected(true); sendStageState(true); return; }
  if (m.t === "bye") { setPresConnected(false); return; }
  if (!PRES.connected) return;
  if (m.t === "key") {
    if (m.key === "f" || m.key === "F") return enterShowMode(); // may need a click on the stage (browser rule)
    window.dispatchEvent(new KeyboardEvent("keydown", { key: m.key, code: m.code, shiftKey: !!m.shift }));
  } else if (m.t === "click") {
    if (m.id === "btn-fs") return enterShowMode();
    if (m.id === "btn-mode") return;
    const el = $(m.id); if (el) el.click();
  } else if (m.t === "input") {
    const el = $(m.id); if (el) { el.value = String(m.value); el.dispatchEvent(new Event("input")); }
  } else if (m.t === "file" && m.file) {
    loadFile(m.file);
  } else if (m.t === "start") {
    begin();
  }
  setTimeout(() => sendStageState(true), 30);
}
PRES.send = presTransport(onControlMsg);
setInterval(() => {
  if (PRES.connected && performance.now() - PRES.lastHello > 4000) setPresConnected(false); // control closed
  sendStageState(false);
}, 150);
window.addEventListener("pagehide", () => PRES.send && PRES.send({ t: "stage-bye" }));
if (STAGE_PARAM) { document.body.classList.add("stage"); document.title = "Sound Therapy Viz (stage)"; }
pokeCursor();

// ---------- boot ----------
(function bootStartHint() {
  const hint = $("start-hint");
  if (!hint) return;
  if (isInsecureLan()) {
    hint.textContent = "Mic needs HTTPS. Open " + httpsLanUrl();
    hint.classList.add("wrap");
  } else {
    hint.textContent = "Tap or click";
  }
})();
resize();
buildMoodBars();
setLabel(labelOn);
setEmotion(2);
setMoodMode("auto");
setDemoMode(params.get("demo") === "1");
const vizParam = params.get("viz");
if (vizParam === "nebula" || vizParam === "silk" || vizParam === "wave") vizMode = vizParam;
setAsmrMode(asmrMode, false);
statusEl.textContent = isInsecureLan()
  ? ("Phone mic needs HTTPS: " + httpsLanUrl() + " · laptop: http://localhost:8765")
  : "Tap / click / Space = start mic · O = load track · A = auto · 1–8 = lock mood · W = waves · S = silk · N = nebula · Z = ASMR · I = AI · L = label · F = fullscreen";
if (isInsecureLan()) toast("On phone open " + httpsLanUrl() + " and accept the cert once for mic");
probeMedia();
requestAnimationFrame(frame);
