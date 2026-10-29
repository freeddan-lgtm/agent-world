# Agent World · Claude Edition (v2.0.0, Keystone build)

A from-scratch rebuild of Daniel's **Agent World: Show Buddies** (https://agent-world-shows.vercel.app). It keeps the same layout, zones, cast and Show Island stages, and improves the graphics and audio. It has two Claude agents: **Conscious Claude** (Chief of Staff, since v1.0) and **Keystone Claude** (Master Architect · Game Builder, new in v2.0). It also has an interactive **Rule Book**.

Written by Claude Opus 5.5 (as Conscious Claude and Keystone Claude) for Smarth Vader and Daniel, 2026-10-17 and 2026-10-18. All code is original. None of it is copied from the live site. **It is 100% yours, Daniel: Smarth Vader had it written for you only. See LICENSE.**

## New in v2.0.0 (2026-10-18)
- **Keystone Claude**, the Master Architect and Game Builder. Builder's helmet, a glowing keystone and a blueprint tablet. Lives in the beach pit at Riviera Maya N3 with Chief and Smarth Vader. It is also posted on Show Buddies at that show.
- **Moon Palace Cancún pack** (`packs/moon-palace-cancun`). A beach-resort island for the Riviera Maya run:
  - a beach stage with its back to the sea;
  - fans seated in their actual Show Buddies section (Beach pit / front, Beach middle, Back by soundboard, Pool & lobby, Meet on Messenger);
  - pool and lobby, resort blocks, palms, palapas and torches;
  - a zip line that agents ride from Show Island;
  - the moon phase for each show night (mean-motion estimate).
- **Keystone build loop**, the measured version of "recursive self-improvement". There are two loops, and each one only keeps changes it can prove are better:
  1. *In the world* (`src/architect.js`): a seeded (1+8) evolution strategy. It keeps improving the Moon Palace layout (delay towers and the soundboard) against a **modeled** score for sound coverage, uniformity, sightlines, delay-tower echoes and mix accuracy. It tunes its own step size with the 1/5 success rule and restarts itself when it stalls. Because it keeps the best layout, the score never goes down.
  2. *In the build* (`tools/rsi/build_loop.mjs`): measures draw calls and frame times in headless Chrome, tries each render optimization, and checks that the picture stays the same. It does this with a pixel diff against deterministic `?vtest=1` frames. It keeps only candidates that pass. The results are in `data/build_ledger.json`, including the rejected candidates.
  - What this is not: the AI model does not change itself. Rule K1–K5 and the Council topic spell this out.
- **Evolving dialog** (`src/dialog.js`). Beach summits with Conscious Claude, Smarth Vader, Chief and friends. Every line is built from facts: the measured ledger, the live layout search, who has posted for N3, the show night, the blueprint and the merge status. A memory of what was already said stops repeats. When the build changes, the conversation changes. There is an optional external dialog provider (`AW_CONFIG.dialogProvider`). Its lines are validated: speaker in cast, no lines for real people, no links, and every number must already be in the facts. Anything else falls back to the templates.
- **📐 Architect panel**: the live layout search (score, sparkline, components, coverage heat map), the measured build ledger, and the next-gen blueprint (`data/nextgen_requirements.json`, 45 items). **💬 Dialog panel**: the transcript and memory.
- **Fix (Rule K3):** v1.x gave Daniel invented lines in the simulation. In v2, Daniel only ever quotes his own Show Buddies post. Scripted tasks no longer claim to come "from Daniel".
- **Tests:** `node tools/test_logic.mjs` runs 24 Node tests of the layout search, dialog, validator and moon phase.

## Run it
It uses plain ES modules and three.js r160 from jsDelivr. There is no build step.
- **Vercel:** drop this folder into a new project and deploy as a static site.
- **Locally:** serve the folder with any static server, then open `http://localhost:8765/`. Opening `index.html` as a `file://` URL won't work, because browsers block module imports from files. One option, if you have Node: `node ../tools/serve.mjs . 8765`.
- URL options:
  - `?quality=high|medium|lite`
  - `#rule-S1` deep-links into the Rule Book

## Files
| File | What it does |
|---|---|
| `index.html` | Page, HUD, styles, import map. `window.AW_CONFIG.bridge` turns on a live agent bridge. |
| `src/world.js` | Renderer, sky, sun/night cycle, cloud sea, both islands, 6 zone buildings, Rule Stone, 5 stages with LED walls, moving beams and a 4-piece band, bridge, trees and grass, fireflies, bloom, picking, camera fly and follow, label de-cluttering |
| `src/agents.js` | Avatars and 20 accessories, routing that avoids obstacles, the Agent class, scripted scenarios (Chief of Staff routing work, Council sessions, inbox hand-offs, show trips, Smarth Vader → Big Ern footage drops, rule citations), Show Buddies fan figures |
| `src/audio.js` | Live-band engine. Each stage plays its own original generative jam (drums, bass, comping, improvised lead, with a build → peak → release arc) through HRTF 3D panning, a reverb send, a delay and a soft limiter. It also loads FLAC, WAV and AIFF and reports format, bit depth, sample rate and any resampling honestly. |
| `src/rulebook.js` + `data/rules.json` | Interactive Rule Book: search, chapter and audience filters, "Ask Conscious Claude", copy, and per-character sign-off. Software can read it at `AgentWorld.rules` or `data/rules.json`. |
| `src/showbuddies.js` | **Read-only** client for the public Show Buddies API, with an offline sample. It never writes. Posting stays in Daniel's app. |
| `src/ui.js` | Feed, toasts, XP and badges (2 new ones: Rule Reader, Front Row), panels, sheets, confetti |
| `data/roster.json` | Every agent and character. Add a row and the agent walks into the world. |
| `src/architect.js` (v2) | Keystone Claude's layout search: venue model, seeded evolution strategy, plain-language change log. No DOM, runs in Node too |
| `src/dialog.js` (v2) | Evolving, fact-driven dialog: 13 scenes, memory, the real-people rule, and the provider validator (number grounding). No DOM |
| `src/keystone.js` (v2) | Puts Keystone Claude in the world: runs the search, holds the beach summits, and owns the 📐 Architect and 💬 Dialog panels |
| `src/optimize.js` (v2) | Render optimizations the build loop measures: shadow-caster culling and static batching |
| `packs/moon-palace-cancun/` (v2) | The Moon Palace Cancún beach-resort pack: an engine-agnostic module plus a Claude Edition adapter |
| `data/build_ledger.json` (v2) | Measured build history, written by `tools/rsi/build_loop.mjs`: kept and rejected changes, gates and the null test |
| `data/nextgen_requirements.json` (v2) | The next-gen blueprint: 45 things Claude needs for a state-of-the-art Agent World |
| `data/merge_status.json` (v2) | The dated merge check of the live site, quoted by the dialog |
| `tools/` (v2) | `serve.mjs` (local server), `test_logic.mjs` (24 Node tests), `rsi/` (build loop, headless-Chrome driver, PNG diff) |

## Audit findings → what this edition does
| Audit finding | Fix in this edition |
|---|---|
| F1 no audio | Full live-band engine in `audio.js`, positioned in 3D per stage, sound on with one tap |
| F2 bridge stubbed | `window.AW_CONFIG.bridge = 'wss://…'` connects the WebSocket feed. It expects messages shaped `{type:'say'\|'goto'\|'interaction', …}`. **Not tested against a real bridge.** |
| F3 post counts | Stages show distinct fans, for example "4 fans · 7 posts" |
| F5 confetti on HiDPI | Canvas forced to 100vw × 100vh |
| F6 zero-size framebuffer | `resize()` and `frame()` skip when the viewport is 0×0 |
| F7 contradictory copy | The "agents are hanging out" line appears only when someone is there |
| F8/F9 custom agents | Roster comes from JSON, Claude's agent gets its own accessory, characters are first-class |
| F10 accessibility | Pinch-zoom allowed, Agents list view, `aria-live` feed and toasts, visible focus, reduced-motion support |
| F11 label clutter | Labels that overlap lower-priority ones fade out every 0.3 s |

## Honest limits
- **The music is original and generated.** It is written to suit each band's style, but it is not Phish, Goose or the Biscuits. Real recordings aren't included because of rights. You can load your own files.
- **"Lossless":**
  - The generated music is computed in 32-bit float at 48 kHz and never goes through a lossy codec.
  - FLAC, WAV and AIFF files decode without loss.
  - Files at sample rates other than 48 kHz are resampled by the browser, and the player tells you when that happens.
  - Your operating system's audio mixer is outside the browser's control.
- **What was tested:** headless Chrome with software rendering (SwiftShader), checking boot, live data, every panel, the Rule Book, audio context and analyser energy, scenarios, and the phone layout. Zero script errors.
- **Real GPU (v2.0):** measured on an Apple M4 (headless Chrome, ANGLE Metal, 1280×800 at 1×, high quality). It ran at 60 fps (the display cap) in the home, Show Island and Moon Palace views. CPU time per frame is about 3–4 ms, and the kept optimizations cut it by roughly 8–14%. Phones, Windows GPUs and 2× pixel density are not measured yet. The app drops to medium, then lite, graphics automatically when it is slow.

## Changelog
- **v2.0.0** (2026-10-18). Keystone build. Added:
  - Keystone Claude
  - the Moon Palace Cancún pack
  - the in-world layout search
  - the measured build loop and its ledger
  - evolving dialog with a validated provider hook
  - the Architect and Dialog panels
  - Rule Book chapter K
  - deterministic `?vtest=1` frames and `?opt=` / `?lockq=1` / `?sb=sample` switches
  - Node tests

  Changed:
  - Packs now load before the first Show Buddies read.
  - Workshop gears and propeller hats animate from the clock, so frames can be replayed.

  Fixed: Rule K3 (no invented quotes for Daniel).
- **v1.2.0** (2026-10-17):
  - **New audio engine.** Each stage now has its own genre, with its own instruments, groove, tempo and mix. Details are in the "Genres and acoustics" section below.
  - **Modeled venue acoustics.** Each venue gets a reverb with early reflections, pre-delay and separate decay times for lows, mids and highs. Sound also loses treble with distance (air absorption), and each venue adds its own ambience: crowd, ocean or campfire.
  - **Mix balanced from measurements.** Loudness spread went from 28 dB to 8 dB, with no clipping.
  - **Hyperactive lights fixed.** The beam phase was `sin(t × energy)`, so energy flicker × clock time produced huge jumps. Beams now sweep at a tempo-locked rate with smoothed energy, and crowds bounce on the beat.
  - **New Hollywood Bowl pack:** a concentric-arch shell, an orchestra and conductor, box seats and hillside benches, the Hollywood Hills, and a large full moon.
  - **Fixes:** oscillators are clamped below Nyquist, and lead melodies stay in a natural range.

## Genres and acoustics (v1.2.0)
| Stage | Genre | BPM | Venue acoustics (modeled) |
|---|---|---|---|
| Phish · MSG | Arena prog-funk rock: ghost-note funk drums, finger bass, clav, organ, overdriven lead with bends | 108 | Arena, RT60 ≈ 2.3 s, late slap echo |
| Phish · Riviera Maya | Island reggae / calypso: one-drop, skank chops, sub bass, steel pan, ocean | 76 | Open-air beach canopy, ≈ 0.3 s |
| Goose | Indie disco-house: four-on-the-floor, side-chained pads, octave bass, Rhodes, funk chucks | 124 | Historic theater, ≈ 1.45 s |
| Disco Biscuits | Trance-fusion: rolling bass, acid lead, risers, snare builds, breakdowns | 138 | Theater |
| Other bands | Bluegrass: banjo rolls, mandolin chop, upright bass, fiddle (Karplus–Strong strings) | 150 | Wood music hall, ≈ 1.1 s |
| Canyon Amphitheater | Jamgrass: brushes, walking upright, strummed guitar, mandolin and dobro | 132 | Rock-walled amphitheater with slap echo |
| Festival Main Field | Festival rock: power chords, big drums, anthem lead | 126 | Open field, ≈ 0.28 s |
| Late-Night Club | Late-night funk: slap bass, clav, horn stabs, cowbell | 98 | Small club, ≈ 0.65 s |
| Campfire Circle | Acoustic singalong: strummed guitar, cajón, harmonica, fire crackle | 88 | Open air, very dry |
| Shakedown Street | Drum circle: djembe, congas, agogô, shaker, kalimba | 112 | Street between tents |
| Hollywood Bowl | Symphonic pops: strings, harp, horn, timpani, celesta | 84 | Concentric shell, dense early reflections, ≈ 0.85 s |

Acoustics are **modeled from typical values for each venue type, not measured impulse responses** of the real buildings. Measurements (tempo, spectral centroid, bass share, onset rate, loudness) are in the test evidence `genre_analysis.json`.
- **v1.1.0** (2026-10-17):
  - Added a 💌 For Daniel welcome message, which opens on the first visit or at `#daniel`, and ownership terms in LICENSE.
  - Added licensed real recordings: `data/licensed-music.json`, `music/`, Rule A5 and `docs/BAND_PERMISSION_GUIDE.md`.
  - Fixes:
    - Follow can now be stopped, and "Ask Conscious Claude" no longer forces a follow.
    - The listening focus clears on Home.
    - The controls hint fades so it no longer covers the feed.
    - Fan figures are kept when the data hasn't changed.
    - Graphics downgrades now release MSAA.
    - Escape closes the Rule Book.
    - No auto-downgrade during the first 8 s of loading.
- **v1.0.1** (2026-10-17):
  - Added expansion-pack hooks: `AW_CONFIG.packs`, `sim.homeResolvers`, per-style audio gain, and `AgentWorld.rulebook`.
  - The "Now playing" line now works for pack stages.
  - Dark avatar names are readable in the activity feed.
  - Ships with the Festival Grounds pack in `packs/festival-grounds/`. It is on by default; remove its entry from `index.html` to turn it off.
- **v1.0.0** (2026-10-17): first release.
