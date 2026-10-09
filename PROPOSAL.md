# Sound Therapy Live Viz — Open Stack Proposal

**Owner:** we build and own everything. No Synesthesia, Resolume, Magic Music Visuals, or paid apps.
**Demo:** Fri Oct 9 / Sat Oct 10, 2026
**Show:** Sat Oct 17, 2026
**Today:** Mon Oct 5, 2026

**Venue:** enclosed SMALL room. Tiny projector OR laptop screen. Intimate light-bath, not a large TeamLab hall. TeamLab is inspiration for *feeling* only; we cannot replicate their hardware in a week.

---

## 1. Architecture

```
Mic or audio file
    → Web Audio API (AnalyserNode)
    ├→ Custom canvas light-field (large soft blobs, breathing core, thick glow rings, chunky sparks)
    └→ mood.js: live song-mood detector (our own heuristics) → AUTO palette
         ↑ operator override: 1–8 force + lock · A auto · M lock
Laptop fullscreen  OR  tiny projector on a dark wall
```

- **Motion** from live sound (energy + soft waveform ribbon).
- **Emotion / color** detected from the SONG live (AUTO, default). Helper overrides with 1–8 when it's wrong or a piece needs a specific color.
- **Grok Imagine** = optional pre-baked underlays only. Procedural field alone is enough.
- **No cloud** during the show. Static files on one laptop.

### Intimate-room visual rules (tiny projector / laptop)

| Do | Don't |
|---|---|
| Large soft shapes, high contrast | Thin spectrum bars / hairline waves |
| Boosted saturation + glow | Tiny speckles that wash out |
| Slow breathing for calm / spirit | Busy desktop-visualizer chrome |
| Soft vignette, edge-to-edge field | Centered small widget look |
| Dark UI that auto-hides | Big permanent HUD on show night |

Laptop fullscreen is a **first-class** path (demo + emergency show). Tiny projector: assume washed color → we oversaturate and thicken glow.

---

## 2. MVP this week

| Feature | Notes |
|---|---|
| Mic + file input | Done |
| Intimate light-field renderer | Done (custom, no VJ app) |
| Keys 1–8 emotion | Done |
| Show HUD (tiny corner) vs Demo HUD (`D`) | Done |
| Hide UI (`H`), Fullscreen (`F`) | Done |
| Offline / local | Yes |
| Live song-mood detection (AUTO) + 1–8 override, A / M | Done (`mood.js`, zero deps) |
| Teach moods to the room (Shift+1–8) | Done |
| Optional Grok underlay | Wed if time |
| Essentia.js | Not used. Own heuristics are offline, instant, and tunable; revisit after Oct 17 |

---

## 3. Day-by-day (Mon–Fri)

| Day | Work |
|---|---|
| **Mon Oct 5** | Scaffold + approve. Run on laptop fullscreen once. |
| **Tue Oct 6** | Tune glow for low lumen; test in a dark closet/room with phone torch off. Mic + voice/bowl. |
| **Wed Oct 7** | Optional Grok loops into `/assets/`. Rehearse 3 demo tracks. |
| **Thu Oct 8** | Dry run on the *actual* tiny projector or the show laptop. Fix brightness. Teach moods with the show mic (Shift+1–8). Assign who overrides. |
| **Fri Oct 9** | **Demo.** Demo HUD on. Then flip to Show HUD for a taste of night mode. |

Sat Oct 10 = buffer. Oct 17 = show (Show HUD or `H` to hide).

---

## 4. Friday demo tracks + motion + Grok prompts

### A — Joy (`1`)
- Audio: [Happy Vibes (CC0)](https://opengameart.org/content/happy-vibes)
- Motion: warm gold core surges; rising chunky sparks; energetic blob wash
- Grok (optional): `Seamless looping warm golden liquid light filling a dark room, soft large glowing shapes, intimate light bath, locked camera, no text, 16:9`

### B — Spiritual / bowls (`7`)
- Audio: [Singing Bowl (CC0)](https://freesound.org/people/hollandm/sounds/573805/)
- Motion: violet core; slow breathing rings; white-gold orbs
- Grok: `Seamless looping violet and white-gold soft light orbs breathing in darkness, cymatic calm, intimate room projection, locked camera, no text, 16:9`

### C — Love (`3`)
- Audio: [Relaxing Piano Peaceful (Pixabay)](https://pixabay.com/music/meditationspiritual-relaxing-piano-music-peaceful-240748/)
- Motion: rose/peach bloom; gentle breathe; soft ribbon
- Grok: `Seamless looping rose peach soft light bloom in a dark intimate room, gentle fluid glow, locked camera, no text, 16:9`

Then one live mic moment (voice or real bowl).

---

## 5. Emotion color table

| Key | Emotion | Core color | Feel in small room |
|---|---|---|---|
| 1 | Joy | gold | rising, bright wash |
| 2 | Calm | soft teal | slow breath |
| 3 | Love | rose / peach | soft bloom |
| 4 | Release | deep blue | dissolve |
| 5 | Grounding | amber | rooted pulse |
| 6 | Clarity | cool blue-green | crisp glow |
| 7 | Spiritual | violet → white-gold | breathing rings |
| 8 | Energy | orange-red | surge |

---

## 6. Open libs

MVP: **zero dependencies**. Plain HTML / CSS / JS we wrote.

Later optional (not required): p5.js, Three.js (MIT). Essentia.js = experiment only (check AGPL before ship). Do **not** depend on butterchurn as the product.

---

## 7. Song-mood detection (Raj decision, Oct 5)

Emotion comes **from the song**, not body sensors, not paid apps.

**How:** every 50 ms, from a Web Audio AnalyserNode: loudness, brightness (spectral centroid), onset rate (spectral flux peaks),
steadiness (sustain), tonality (spectral flatness), bass weight. Nearest-prototype match to the 8 emotions gives a mood +
confidence. Hysteresis: new mood must lead ~1.5 s with ≥30 % confidence, max one auto switch per ~8 s, colors crossfade ~2 s,
silence holds the current color.

**Checked Oct 5** (offline harness + headless Chrome with the clip as a fake mic):

| Input | Result |
|---|---|
| Happy Vibes (CC0, upbeat) | Joy ~97 % of the time, ~90 % confidence |
| Calm piano (CC0) | Love ~80 %, rest Calm/Grounding; slow dark passages wobble Love ↔ Calm ↔ Release |
| Calm ambient (CC0) | Calm ~80 %, Love ~16 % |
| Singing bowl (synthetic, struck every 12 s) | Spiritual (Calm for the first few seconds) |
| Drone / dark pad / dense 150 bpm | Spiritual / Release / Energy |

**Honest limits:** heuristic, not a trained emotion model; no lyrics or major/minor. On-screen label says *"Song mood (approx)"*.
Bowls → Spiritual/Calm. Operator keeps `1–8` override.

**Tue/Wed tuning:** play 1 reference piece per mood through the *show mic* and press `Shift+<key>` to teach. `[ ]` trims mic level.

**Friday demo script:** Demo HUD (`D`) → play Joy track (watch it go gold within ~5 s) → bowl (goes violet) → piano (rose/calm) →
press `3` to show manual override → `A` back to auto. Then `D` for Show HUD.

---

## 8. File layout

```
/workspace/sound-therapy-viz/
  index.html
  style.css
  app.js          # intimate light-field renderer + auto/manual mood control
  mood.js         # live song-mood detector (features → 8 emotions, hysteresis)
  tools/mood-test.js  # offline test against files / synthetic profiles
  PROPOSAL.md
  README.md
  assets/         # optional Grok loops + demo mp3s
```

---

## 9. Venue setup (compact)

1. Darken the small room (lights off, curtains).
2. **Path A (preferred emergency):** laptop fullscreen facing the circle / wall.
3. **Path B:** tiny projector short-throw onto one wall; laptop feeds HDMI; browser fullscreen.
4. One helper beside the laptop: AUTO runs by itself; helper presses 1–8 only to correct, A to return to auto.
5. Mic from laptop built-in OR cheap USB mic aimed at bowls/vocals.

Immersion here = people in a dark cocoon bathed in color that breathes with the sound. Not wrapping the architecture.

---

## 10. Run

```bash
cd /workspace/sound-therapy-viz
python3 -m http.server 8765
# open http://localhost:8765  → Fullscreen → Start Mic
```

Keys: `A` auto mood · `M` manual lock · `1–8` force emotion · `Shift+1–8` teach · `[ ]` trim · `D` demo/show HUD · `H` hide UI · `F` fullscreen · mouse reveals controls briefly in show mode.
