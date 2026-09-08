# Visual Trope Repetition — Targeted Narrative Patch

Date: 2026-08-31

## Scope

This was a narrow narrative/fallback patch. Frozen model, voting, media, loop-motion, audio, UI, network and endurance infrastructure were not revalidated. The production Node process was restarted once only to load the narrative code change.

## Root cause

The fallback/Jung chooser had no memory of which broad visual families had actually been rendered. Its bounded history remembered events, options and symbols, but not rendered visual motifs. As a result, safe navigation and generic dream tropes (door/portal, corridor/tunnel/bridge, light/fog, window) could remain the lowest-cost choice indefinitely. Ordinary object/context actions existed only sparsely and were not reliably reachable as the natural continuation. Raw recurring symbols were also too easy to treat as meaningful before a symbol had earned narrative significance.

The 15-scene sheet also shows a separate limitation: even when option/result text is varied, SDXL can collapse different safe prompts into a similar indoor silhouette/window/corridor composition. That is an image-engine composition bias, not evidence that the state memory is growing or that voting is repeating.

## Changes made

- Added bounded rendered motif-family detection (`THRESHOLD`, `PASSAGE`, `LIGHT_EFFECT`, `ATMOSPHERIC`, `WINDOW`, `LONE_NATURE`, `VEHICLE`, `WATER`, `MECHANICAL`, `DOMESTIC`).
- Added `storyState.recent_visual_motifs`, capped at 12 family entries.
- Recorded motif families only after a successful scene commit, so failed/pending scenes cannot teach the chooser a false visual history.
- Added a strong novelty penalty for families repeated in recent rendered history and for threshold/passage + light/atmosphere cliché clusters.
- Added a small non-navigation preference when novelty history exists.
- Added eight safe ordinary-object fallback records (radio, watch, photograph, telephone, washing machine, classroom, tea, etc.) and connected them to contextual route pools.
- Tightened recurring-symbol earning: a symbol becomes an active recurring motif only after meaningful interaction or return in a different context.
- Preserved first-round legacy fallback behavior when no rendered motif history exists; this keeps existing tests and opening behavior stable.

Files changed:

- `app/lib/jungian-dream-engine.mjs`
- `app/lib/options.mjs`
- `app/server.mjs`
- `benchmark/visual-trope-repetition.mjs`
- `benchmark/make-visual-trope-sheet.py`

## Validation

Full existing test suite: **34/34 passed**.

Deterministic 150-round comparison uses the same seeded choices and catalog. “Before” is a controlled ablation with the new motif memory cleared each round; it is not a claim about an old production log.

| Metric | Before (motif memory disabled) | After (motif memory enabled) |
|---|---:|---:|
| Exact option-pair repeats | 0 | 0 |
| Navigation-heavy option pairs | 31.33% | 25.33% |
| Generic route+glow/atmosphere cluster | 23.33% | 15.33% |
| Maximum consecutive same-family recurrence | 6 | 4 |
| THRESHOLD frequency | 30.67% | 22.00% |
| PASSAGE frequency | 50.00% | 33.33% |
| LIGHT_EFFECT frequency | 29.33% | 26.00% |
| ATMOSPHERIC frequency | 8.00% | 14.67% |
| WINDOW frequency | 20.00% | 14.00% |
| VEHICLE frequency | 13.33% | 21.33% |
| WATER frequency | 16.00% | 20.00% |
| DOMESTIC/ordinary-object family | 40.00% | 39.33% |

Raw machine-readable results: `benchmark/visual-trope-repetition-results.json`.

## Real 15-scene observation

Manifest: `benchmark/visual-trope-repetition/real-scenes.json`  
Contact sheet: `benchmark/VISUAL_TROPE_15_SCENE_CONTACT_SHEET.png`

The latest 15 scenes include classroom/table/photograph/tea/radio/watch/object interactions, water/flooded settings, a vehicle, outdoor trees/water and an exterior building. The option stream is no longer limited to a fixed portal/light/door vocabulary.

Human visual review remains required. The contact sheet still contains a noticeable SDXL composition bias toward modern interiors, windows and corridors. This patch improves the *choice/result vocabulary and recurrence rate*; it cannot guarantee that SDXL will render every distinct prompt as a radically different composition. One controlled novelty iteration was completed; further prompt/model work is outside this narrow patch.

## Result

- Narrative motif-memory patch: **PASS** — bounded, transactional and covered by tests.
- Deterministic repetition target: **PASS** — no exact pair repeats; broad cliché cluster and same-family runs decline.
- 15-scene rendered visual diversity: **BORDERLINE / HUMAN REVIEW REQUIRED** — semantic/object vocabulary is broader, but image-level indoor/window/corridor bias remains.
- Frozen infrastructure: unchanged; no endurance/model/voting/media benchmark rerun.

