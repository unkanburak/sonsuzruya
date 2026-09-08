# Micro Spike — Protagonist Presence / Shot Diversity

Date: 2026-08-31

## Scope

Exactly six matched result-states were rendered with the locked Profile C settings (12 images total). No endurance, narrative audit, model search, video test, voting/audio/network test or model setting change was run.

## Test conditions

- Checkpoint: `sdxl_lightning_4step.safetensors`
- Resolution: `1024x576`
- Steps: `4`
- CFG: `1`
- Sampler/scheduler: `euler` / `sgm_uniform`
- Same seed per A/B pair
- A: current Soft Lock protagonist wording
- B: result-state-gated presence and result-serving composition wording

Results and output paths: [results.json](<<PROJECT_ROOT>\benchmark\protagonist-presence-spike\results.json>)

## A/B result

| Metric | A — current Soft Lock | B — presence gated |
|---|---:|---:|
| Technical success | 6/6 | 6/6 |
| Warm-like p50 | 2.51 s | 2.48 s |
| Warm-like p95 | 3.11 s | 3.13 s |
| Result-state semantic PASS (manual) | 3/6 | 5/6 |
| Result-state PARTIAL | 1/6 | 1/6 |
| Result-state FAIL | 2/6 | 0/6 |
| Required-object adherence PASS (manual) | 3/6 | 5/6 |
| Spatial relationship PASS (manual) | 3/6 | 5/6 |
| Centered standing silhouette | 4/6 | 1/6 |
| Object/interaction-led shot | 1/6 | 4/6 |
| Two-figure interaction | 0/6 | 1/6 |

The machine result remains the weak case in both profiles; B still makes the machine the intended visual subject more reliably, but the generated frame is only partial in this sample. Subjective aesthetic quality is not auto-ranked.

## Interpretation

B materially improves shot diversity without a latency cost or a semantic regression. It allows the result to be carried by an object, hands/tabletop, a seated interaction, a partial/off-camera figure or two anonymous figures. The protagonist remains part of the story; visible full-body presence is no longer imposed when it is not needed to read the result.

## Implemented production change

Because B passed the stated gate, the small Soft Lock change is now active in `app/server.mjs`:

- `ABSENT_OR_OBJECT_LED` for radio, photograph, tea, receipt, watch and similar object/event results.
- `OPTIONAL_PARTIAL` for environmental/distant-figure results.
- `REQUIRED_INTERACTION` for exchanges/two-figure actions.
- `REQUIRED` otherwise, with profile/partial/object framing preferred over a centered standing silhouette.

The existing model, story-state, voting, loop-motion, audio and frontend architecture remain unchanged.

## Contact sheet

[PROTAGONIST_PRESENCE_AB_CONTACT_SHEET.png](<<PROJECT_ROOT>\benchmark\PROTAGONIST_PRESENCE_AB_CONTACT_SHEET.png>)

The sheet is labeled A/B for review; both columns use identical final viewing dimensions and matched seeds.

## Confirmation limit

The instruction capped this spike at 12 generated images. Therefore the conditional eight-scene confirmation soak was not run; no additional images were generated beyond the matched 12-image A/B set.

## Final state

- IMAGE_MOTION: active
- Profile C production settings: unchanged
- ANIMATEDIFF: disabled
- YouTube/public hosting: off
- Node/Comfy/Qwen health: ready

**Decision: B is a strong small Soft Lock improvement and is now loaded, but should receive a longer real-scene confirmation only in a separately approved test.**

