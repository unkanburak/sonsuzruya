# Lightweight Loop-Motion Feasibility

LOOP MOTION FEASIBLE: YES
TESTED FORMATS: MP4 (H.264), WebM (VP9), animated WebP
BEST FORMAT: MP4 for OBS/browser compatibility; WebM is the smallest optional web asset
AVERAGE RENDER TIME: 1.20 s MP4 / 2.54 s WebM / 2.35 s WebP
P95 RENDER TIME: 1.96 s MP4 / 3.46 s WebM / 2.68 s WebP
AVERAGE FILE SIZE: 58.4 KB MP4 / 22.0 KB WebM / 395.5 KB WebP
SAMPLES PASSING: 10 / 10 (MP4, WebM and WebP after the pixel-format fix)
MAIN FAILURE MODE: Initial WebM attempt rejected RGBA input; yuv420p output resolved it. No model or pipeline failure.
VERDICT: KEEP

## 1. Tested approach

The experiment uses one already-generated SDXL image and applies a deterministic 4-second camera loop:

- 12 fps, 48 frames
- slow 3.5% push-in and return
- sub-pixel horizontal/vertical drift
- scale/pad to 768×448
- no new semantic content, objects, characters or actions
- no AnimateDiff, I2V, diffusion model or story continuation

The current Browser Source already has a comparable zero-render-time CSS motion language (`drift`, `fog`, `noise`). The exported assets tested here are the same idea made portable as short media files.

Script: `benchmark/loop-motion-feasibility.mjs`
Raw results: `benchmark/loop-motion-results.json`
Output directory: `benchmark/loop-motion/`

## 2. Why this differs from video continuation

This loop never tries to make the character walk, open a door, enter a car, change location or create a new scene. It preserves the exact SDXL result image and only animates the camera framing. Therefore it cannot solve semantic continuation, but it can make a successful static result feel alive without a second AI generation stage.

## 3. Benchmark conditions

- 10 existing project images
- indoor corridor/room, darker and brighter scenes, outdoor/transition samples, central figures, portal/glowing-object and tunnel samples
- 768×448 output, 4 seconds, 12 fps
- local FFmpeg CPU render
- no model downloads
- no production process or configuration changes

## 4. Benchmark table

| Sample | Source category | MP4 time / size | WebM time / size | WebP time / size | Evaluation |
|---|---|---:|---:|---:|---|
| initial-room | indoor corridor / central figure | 0.87s / 50.6KB | 1.36s / 13.4KB | 1.63s / 186.1KB | all PASS |
| run1-a | indoor / dark | 1.17s / 58.5KB | 2.73s / 22.9KB | 2.39s / 441.8KB | all PASS |
| run1-b | indoor / brighter | 1.01s / 62.8KB | 2.78s / 26.8KB | 2.38s / 507.2KB | all PASS |
| run1-c | indoor / central figure | 1.96s / 62.5KB | 2.96s / 25.5KB | 2.44s / 501.5KB | all PASS |
| run2-a | outdoor / transition | 0.99s / 41.0KB | 2.03s / 16.9KB | 2.24s / 294.4KB | all PASS |
| run2-b | outdoor / atmospheric | 1.41s / 37.4KB | 2.76s / 14.4KB | 2.39s / 266.3KB | all PASS |
| run2-c | darker scene | 1.07s / 36.8KB | 2.16s / 13.9KB | 2.14s / 261.1KB | all PASS |
| run3-a | surreal / central figure | 1.25s / 49.3KB | 2.00s / 15.9KB | 2.68s / 301.2KB | all PASS |
| i2v-portal | surreal portal / glow | 1.20s / 92.8KB | 3.46s / 35.2KB | 2.58s / 597.1KB | all PASS |
| i2v-tunnel | tunnel / dark transition | 1.10s / 92.7KB | 3.21s / 35.3KB | 2.65s / 598.7KB | all PASS |

## 5. Visual evaluation

All ten source images were reviewed with representative first/middle/last-frame contact sheets.

| Criterion | Result |
|---|---|
| LIVELINESS | 10/10 PASS — slow push/drift is visibly more alive than an unmoving frame |
| SCENE PRESERVATION | 10/10 PASS — no new objects or semantic mutations |
| LOOP QUALITY | 10/10 PASS — sinusoidal zoom returns to its start framing without a hard cut |
| USABILITY IN LIVE PRODUCT | 10/10 PASS — subtle, deterministic, lightweight and clearly not fake continuation |

The effect is intentionally restrained. It will not create the impression of a character performing a new action; it creates ambient camera life around the already-selected result.

## 6. Format comparison

- **MP4/H.264:** average 58.4KB, average render 1.20s, p95 1.96s. Best default for OBS Browser Source compatibility.
- **WebM/VP9:** average 22.0KB, average render 2.54s, p95 3.46s. Smallest files; viable optional web delivery if the target browser is known to support it.
- **Animated WebP:** average 395.5KB, average render 2.35s, p95 2.68s. Works, but is much larger and offers no benefit for this MVP.
- **GIF:** not tested; it is not preferred because it is normally larger and lower quality for this use case.

No GPU-heavy work was introduced. FFmpeg used CPU rendering; the experiment did not start ComfyUI, AnimateDiff or another model.

## 7. Integration assessment

This is worth integrating later, but not as a production architecture change in this spike. The minimal future path is:

```text
winner selected
→ existing SDXL result image committed
→ deterministic loop asset generated from that image
→ loop shown in Browser Source
```

The static image remains the semantic source of truth. If loop generation fails, the existing static/CSS motion fallback remains visible.

## 8. Exact next step if approved

Add one isolated, feature-flagged post-processing step after SDXL success that generates an MP4 loop into the existing generated-media directory, then expose it only after the file exists. Keep static image visible until the loop is loadable; on any error, retain the current image-motion behavior. No Qwen, story-state, voting, AnimateDiff or YouTube changes are required.

## 9. Final state

- Production `IMAGE_MOTION` path unchanged.
- `ANIMATEDIFF_ENABLED=false` unchanged.
- YouTube remains off.
- No production promotion was performed.
