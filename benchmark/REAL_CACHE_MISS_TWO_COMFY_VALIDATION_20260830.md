# Real Cache-Miss Two-Comfy Validation

## Executive result

```text
8188 SDXL output path: FIXED / PASS
8191 cache-miss AnimateDiff: 4/4 PASS
TRUE TWO-COMFY routing: PASS
5-turn integrated video file success: 3/5
Browser canplay / playing samples: 0 (not instrumented/observed)
Production decision: AnimateDiff remains optional and disabled by default
```

## 1. SDXL output-path fix

The 8188 Comfy instance was started with a dedicated writable output directory:

```text
<PROJECT_ROOT>\runtime\comfy8188-output
```

Node now resolves SDXL output through `comfyOutputRoot`. A fresh SDXL generation with a new prompt and seed completed successfully:

```text
scene_99003_...png
generationTime: 6.307 s
handoffError: null
```

The PNG was non-empty and the SDXL → AnimateDiff input handoff produced a verified input snapshot. No SaveImage permission error occurred on this fresh run.

## 2. Real cache-miss AnimateDiff benchmark

The exact existing workflow was retained:

- 384×224
- 16 frames
- 2 steps
- existing DreamShaper checkpoint
- existing AnimateDiff-Lightning motion model
- Euler / `sgm_uniform`

Each of four jobs used a unique input filename (`cachemiss_1.png` … `cachemiss_4.png`), unique seed, unique prompt identifier, unique output prefix, and an empty queue before submission. Comfy history confirmed the generation path executed; only reusable loader nodes were cached. KSampler and downstream decode/video nodes were not returned as cached results.

| Run | Seed | Client total | Server execution | Output | Peak GPU |
|---:|---:|---:|---:|---|---:|
| 1 | 19083001 | 41.003 s | 40.762 s | PNG + MP4 | 7,566 MiB |
| 2 | 19083002 | 19.421 s | 19.136 s | PNG + MP4 | 6,670 MiB |
| 3 | 19083003 | 21.600 s | 21.325 s | PNG + MP4 | 7,630 MiB |
| 4 | 19083004 | 21.408 s | 21.197 s | PNG + MP4 | 7,630 MiB |

All outputs were written successfully under `runtime/comfy8191-output/benchmark/`.

**Real cache-miss AnimateDiff:** 4/4 success.  
**Server execution p50:** 21.325 s.  
**Server execution p95:** 40.762 s (four-sample maximum proxy).  

The first run is a cold/model-load sample. Warm cache-miss runs (2–4) were approximately 19.14–21.33 seconds server-side. These are real inference measurements, not cached-result latency.

## 3. True two-Comfy integrated test

Both ports were healthy before testing:

```text
8188 /system_stats: HTTP 200
8191 /system_stats: HTTP 200
```

Routing was verified in code and event logs:

```text
SDXL enginePort: 8188
AnimateDiff enginePort: 8191
```

Five local turns ran with unique vote users and clean sequential state transitions. No job was sent to 8188 for AnimateDiff.

| Scene | vote_lock → SDXL ready | SDXL generation | AnimateDiff start | Motion result | vote_lock → video ready |
|---:|---:|---:|---|---|---:|
| 2334 | 16.193 s | 16.184 s | 23:11:24.091Z | discarded: static-delay timeout | — |
| 2335 | 8.048 s | 8.046 s | 23:12:00.374Z | discarded: static-delay timeout | — |
| 2336 | 9.394 s | 9.390 s | 23:12:31.938Z | ready | 14.987 s |
| 2337 | 12.610 s | 12.606 s | 23:12:55.320Z | ready | 18.480 s |
| 2338 | 8.013 s | 4.114 s | 23:13:14.976Z | ready | 14.213 s |

The two discarded clips exceeded the existing `maxDelayAfterStaticMs=10000` rule; no model, step, resolution, timeout, or quality optimization was performed.

### Integrated metrics

- **SDXL time-to-static-result p50:** 9.394 s
- **SDXL time-to-static-result p95:** 16.193 s
- **SDXL generation p50:** 9.390 s
- **SDXL generation p95:** 16.184 s
- **AnimateDiff successful video latency p50:** 14.987 s
- **AnimateDiff successful video latency p95:** 18.480 s
- **Video file success:** 3/5 (60%)
- **Fallback/discard:** 2/5 (40%)
- **Browser canplay:** no samples observed
- **Browser playing:** no samples observed
- **Black-frame errors:** none logged
- **Stale-media errors:** none logged

Because the frontend/browser did not emit observable `canplay` or `playing` telemetry during this run, a real Browser-playing E2E p50/p95 cannot honestly be calculated. The values above are server-side video-ready timings only.

## 4. Why the earlier results differed

The old 45-second series submitted multiple jobs and allowed timed-out server work to continue. Later requests measured queue backlog. The cache-miss run also shows that “warm” must mean a unique seed/input/prompt with actual KSampler execution; loader-node cache hits alone do not make the result free.

## 5. Final safety state

After testing:

```text
ANIMATEDIFF_ENABLED=false
production AnimateDiff timeout=10 seconds
IMAGE_MOTION active
Node /health: ok=true, comfy=true, qwen=true, youtube=false
8188 listening; 8191 diagnostic process stopped
```

No YouTube activation, frontend change, Qwen/story-state change, model change, resolution change, step change, or architecture optimization was made.
