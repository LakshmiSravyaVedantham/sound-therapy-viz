# Sound Therapy Viz — show canvas (small dark room)

Open-source, zero-dependency, fully offline. Laptop fullscreen or a tiny projector.
**The audience sees only: emotion color + traveling light waves.** No meters, no bars, no buttons.

## Run

```bash
cd sound-therapy-viz
python3 -m http.server 8765
```

Open **http://localhost:8765** in Chrome/Edge → press **F** (or double-click) for fullscreen → **click or press Space** to start the mic.
That's it. The faint "click or press space to begin" hint disappears as soon as sound is live.

Rehearsal with a file: press **O** and pick a track, or open `http://localhost:8765/?song=1` (bundled `assets/demo.mp3`) / `?track=assets/….mp3` and press Space.


## Phone (LAN mic)

Browsers block the microphone on plain `http://192.168.x.x`. Use local HTTPS:

```bash
cd sound-therapy-viz
# Terminal A — laptop (mic OK on localhost http)
python3 -m http.server 8765

# Terminal B — phone over Wi-Fi
python3 tools/serve-https.py
```

On the phone open **https://192.168.4.47:8443** (use your Mac LAN IP if different). Accept the self-signed certificate warning once, then **tap to start**. Phone recipe: **6 waves, sharp S=1 (no strands)** + soft glow. Laptop stays 6×11.

Laptop stays on **http://localhost:8765**. Keep `:8765` and `:8443` both running if you want laptop + phone at once.

Known limits: first HTTPS visit shows a cert warning (Continue / Advanced → proceed). iOS Safari may still need a fresh tap after granting mic; fullscreen is limited on iOS (ignored quietly).

## What the audience sees

| Layer | Behaviour |
|-------|-----------|
| **Color world** | Deep near-black room with drifting "ink" light-worlds, a breathing light heart and soft hanging light columns that each listen to part of the spectrum (TeamLab-style light field). Unique two-hue pair per mood (no shared hues): Joy gold+magenta, Calm aqua+sky, Love rose+peach, **Release deep blue+indigo**, Grounding amber+earth red, Clarity ice cyan+silver, Spiritual violet+mint (no gold), Energy orange-red+lime. When Auto hears two moods, all four hues can show. Mood changes melt over ~2 s. |
| **Traveling waves** | Default (`W` or `?viz=wave`). Pre-silk demo look: soft aurora curtains with continuous left-to-right travel of wave energy (linear scrolled spectrum + time-domain packets). Fat soft body + 1–2 spines, not multi-strand silk bristles. Same highPresence gate + MOTION_BASE (Auto = color only). |
| **Silk waves** | Optional (`S` or `?viz=silk`): soft horizontal light fabric / multi-strand ribbons that swell with the live spectrum. Alternating L/R silk flow via SILK_FLOW. |
| **Reactive nebula** | Optional (`N` or `?viz=nebula`): TeamLab-style volumetric fog cloud. Bass expands size/opacity, mid swirls faster, high adds star flecks. Same high-pitch presence gate (bass-alone stays quiet). |
| **Ripples** | Rings bloom from sound attacks (voice swells, drum hits, bowl strikes) and more often as the music gets fuller. Spiritual/Release ripple from the center (bowl-like), Joy/Love/Energy scatter, Grounding rises from below. Silence never triggers attacks. |
| **Glow** | A bloom pass softens curtains, dust and ripples; bright palettes are auto-dimmed so the room stays dark. |
| **Light motes** | Floating dust; the ripples push it outward as they pass. Joy rises, Release falls slowly like rain, Calm hovers. |
| **Emotion patterns** | Same Joy spark language for every mood (sparks + soft sunbursts — no flowers/rings/shards). Distinct motion worlds: **Joy** rise · **Calm** hover · **Love** soft petal-rise · **Release** sink · **Grounding** low · **Clarity** crisp rise · **Spiritual** still-center · **Energy** scatter. |
| **Silence** | One slow breath (~8 s cycle) with a soft ripple on each exhale. Never a dead black screen. |
| **Emotion word** | Optional. On a mood change the word (e.g. `S P I R I T U A L`) fades in softly at low opacity and disappears after ~4 s. `L` turns it off for pure color. |

## Operator keys (audience never sees these)

| Key | Action |
|-----|--------|
| Space / click | Start mic |
| `O` | Load a track (rehearsal) |
| `A` | Auto: color follows the detected song mood (default) |
| `M` | Lock the current color |
| `1–8` | Force emotion + lock (1 Joy, 2 Calm, 3 Love, 4 Release, 5 Grounding, 6 Clarity, 7 Spiritual, 8 Energy) |
| `Shift+1–8` / `Shift+0` | Teach a mood from the current sound / reset teaching |
| `[` `]` | Input trim −/+3 dB |
| `L` | Emotion word on/off |
| `W` | Traveling waves (default, pre-silk aurora curtains) |
| `S` | Silk waves |
| `N` | Reactive nebula |
| `F` / double-click | Fullscreen |
| `D` | **Operator panel** (buttons, detected mood + confidence, 8 mood bars, raw features). Press `D` again to hide. |

URL options: `?demo=1` open with the panel · `?label=0` no word · `?song=1` play bundled demo mp3 · `?track=assets/x.mp3` · `?media=0` skip background media · `?hq=1` full retina resolution · `?q=0|1|2` force quality (default: auto — drops strands/bloom only if the laptop can't hold ~45 fps) · `?viz=wave|silk|nebula` start in that viz mode (default wave).

## Song-mood detection (under the hood)

`mood.js` measures every 50 ms: loudness, brightness, onsets, steadiness, tonality, bass, **major/minor harmony** (chroma vs.
key profiles) and **pitch motion** (one held pitch like a bowl vs. a moving melody), then picks the closest of 8 moods
(each mood weighs the features that matter for it, e.g. sad = mostly "minor"). The first mood lands ~1–2 s after warm-up;
after that a new mood must lead for ~2.5 s and switches at most every ~10 s (sooner when it's very clear); silence holds the color.
Rule-based estimate, not a trained emotion model. Use `1–8` if it's wrong; calibrate in the room with `D` + `Shift+1–8`.

- `node tools/mood-suite.js` — regression table (expected mood % per reference clip); `--holdout` checks clips not used for tuning
- `node tools/mood-test.js [--trace] [song.mp3]` — one file, or the synthetic profiles

**Chanting / sloka / mantra -> Spiritual.** The detector also follows the sung pitch. Recitation stays on 2-3 notes
(narrow pitch range), the voice wavers naturally (not dead-still like piano keys), syllables keep moving, and there is
no steady kick drum. When all of that holds for a few seconds, Spiritual is boosted and can take over quickly from
Joy/Energy. Long held "Om" vowels on one note also count. Pop songs with drums, piano and wide melodies are not affected.

## AI mood layer (key `I`, D panel card "AI mood")
Next to the hand-made detector, the page runs two free open models in a background Web Worker, about once a second:
**YAMNet** (Google AudioSet, 521 sound classes such as Chant, Mantra, Singing bowl, Music, Speech, Drum; Apache 2.0) and
**Essentia mood heads** on the YAMNet embedding (happy, sad, relaxed, aggressive, danceable, party, acoustic, electronic;
MTG, **CC BY-NC-SA 4.0, non-commercial only**). Everything is in `models/` and `vendor/` (TensorFlow.js, Apache 2.0),
so it works offline; no audio leaves the device. Models load only after the mic / track starts (about 11 MB, cached after).

- `ai-mood.js` maps the AI output to the 8 moods (chant / mantra / bowl / gong -> Spiritual; happy + danceable -> Joy;
  aggressive / party -> Energy; relaxed soft music -> Calm / Love / Release, ambient leans Calm; chimes -> Clarity).
- `mood.js` `AIFusion` blends that into the hand detector's probabilities (log blend, weight 0.7 x AI confidence).
  Speech-only or silence gives low AI confidence; a clear chant / drone in the hand detector also lowers the AI weight.
- D panel: AI on/off button, blend slider, what YAMNet hears, AI mood scores, raw head values. `I` toggles AI.
  `?ai=0` starts with AI off (models are not downloaded). `?aiw=0.5` sets the blend.
- If anything fails to load, the page silently keeps using the hand detector.
- Offline tests: `/workspace/aitest/fuse-sim.js` (box only).

## Optional background loops (Grok Imagine / your own art)

Drop a file named after the emotion into `assets/`, e.g. `assets/spirit.mp4`, `assets/joy.jpg`
(ids: `joy calm love release ground clarity spirit energy`; formats: mp4, webm, jpg, png, webp — first match wins).
Plays muted + looped at low opacity under the silk waves, with a soft ~3 s crossfade on mood change.
If a file is missing, a slow procedural fog/gradient drift still lives under the waves (mood-tinted).
Disable media with `?media=0`. Everything is local — no network during the show. See `assets/README.txt`.

## Venue tips

- Room as dark as possible. Visuals are tuned for low-lumen projectors (big soft shapes, high contrast).
- Laptop-only works. A cheap USB mic near singers/bowls is steadier than the built-in mic.
- Before the show: fullscreen, press Space, check the waves move when someone sings, then leave it alone.

## Love demo (key `3`)

Press **`3`** to lock Love (or let Auto pick a tender / major ballad). Love uses the shared spark language with a soft petal-rise motion, candle-warm room tone, and slower silk. Optional under-layer: drop `assets/love.mp4` (or `.jpg` / `.webp`) — prompts in `assets/PROMPTS-love.md`. Press **`A`** to return to Auto.

## ASMR mode (Z key or ?mode=asmr)

A soft, slow version of the same silk waves. Press Z to turn it on or off, or open
`http://localhost:8765/?mode=asmr`. The normal look does not change when ASMR mode is off.

- Waves still travel left and right, but about one third as fast.
- Thinner, softer strands with a faint feathered edge and lower glow.
- Colors breathe slowly (about one 8 to 9 second swell).
- The waves follow your voice: they rise with louder syllables, lift and change shape as
  pitch goes up or down, and settle in the gaps (about 0.1 to 0.2 s response). Drum beats and
  clicks are mostly ignored, and loud peaks are softly capped so nothing jumps.
- Per-mood patterns stay on in a soft style: sparks and tiny circles keep falling, rising and
  drifting in from the edges at about one third speed, each one fading in and out gently.
  Soft sounds add a few more. Slow, feathered per-mood rings and soft blooms appear now and
  then. No flashes and no sudden bursts. A light layer of dust drifts slowly.
- Mood colors fade about twice as slowly. The mood detector itself is unchanged.

## AI motion (build after baf2054f5ecf)

When the AI layer is on and sure of itself, it also shapes the waves, not just the colors:
- chant / bowl / gong / drone: slower, longer, steadier waves, slow upward lift, rings (bowl) and rising light (chant)
- drums: gentle pulses on hits and sparks; singing: waves follow the voice more
- Energy taller and faster, Calm wider and flatter, Release drifts down with falling motes, Spiritual lifts, Joy bounces, Love swells
- Strength = AI confidence; values ease over about 2.5 s. Silence, speech, low confidence or AI off = neutral (identical to before).
- ASMR mode gets a softer, capped version.
- Toggle in the D panel AI card ("AI drives: color + motion / color only"), or URL `?aimotion=0` for color only.
