# Final Local Staging Soak

PROFILE C ENABLED: **YES**

SOFT LOCK ENABLED: **YES**

STARTUP WARMUP: **PASS**

50 TURN SOAK: **50/50**

SDXL SUCCESS: **100% (50/50)**

SDXL P50/P95: **3.49s / 5.81s** (all 50 scene generations)

LOOP SUCCESS: **100% (50/50)**

LOOP P50/P95: **0.74s / 0.94s**

BLACK FRAMES: **0 observed**

STALE MEDIA: **0**

NODE CRASH: **0**

COMFY CRASH: **0**

OOM: **0**

DISK GROWTH: **bounded**; managed media remained at the configured recent window (24 generated/loop files; input snapshots bounded by cleanup).

FINAL VERDICT: **READY FOR PUBLIC STAGING** (local-only; YouTube/public access remains off)

## What changed

Only the approved production stack was promoted:

- SDXL-Lightning 4-step FULL
- 1024×576
- CFG 1, Euler, `sgm_uniform`
- concise Soft Lock prompt (fixed world/protagonist/style invariants; new result state has priority)
- existing deterministic CPU H.264 loop motion, asynchronous after image commit

No IPAdapter, ControlNet, img2img, AnimateDiff, video model, Qwen/story, voting, frontend, or OBS audio changes were made.

## Startup warm-up

Node now exposes `readiness` in `/health` (`warming_up` → `ready`). On startup it runs one disposable Profile C generation with a dedicated `warmup` scene prefix. The result is never published as a story scene and does not modify scene counters, votes, or story-state. Warm-up completed successfully before the soak began.

## Soak method

The local script drove 50 real `/api/debug/vote` turns against the running Node service. Each turn waited for the committed scene number to advance, then collected `/api/diagnostics`. Unique debug users alternated vote choices; normal six-second vote timing and the existing Qwen/SDXL/loop pipeline were used. Queue depth was zero at every recorded completion.

Runtime scene range: 7292–7341. Full raw measurements are in [final-local-staging-soak-results.json](<<PROJECT_ROOT>/benchmark/final-local-staging-soak-results.json>). End diagnostics are in [final-local-staging-diagnostics-end.json](<<PROJECT_ROOT>/benchmark/final-local-staging-diagnostics-end.json>).

## Results

| Metric | Result |
|---|---:|
| Scene progression | 50/50 |
| SDXL generation failures | 0 |
| SDXL latency, first 25 p50/p95 | 3.58s / 6.15s |
| SDXL latency, last 25 p50/p95 | 3.23s / 4.06s |
| Loop render p50/p95 | 0.74s / 0.94s |
| Loop errors | 0 |
| Stale loops | 0 |
| Queue max at turn completion | 0 running / 0 pending |
| Black/broken scenes | 0 |
| Story-state bytes | 724 → 741 |
| Node state bytes | 3,105 → 3,159 |
| Node RSS at end | ~76 MB |
| Managed generated media | 24 files (bounded window) |
| Managed loop media | 24 files (bounded window) |

The first half was not slower than the second half; there is no observed latency degradation. Story and state sizes remained effectively flat. Loop output was ready asynchronously while the committed static image remained visible, preserving the no-black-screen guarantee.

## Fail-safe behavior

The SDXL image is committed and broadcast first. Loop rendering never blocks story progression. If a loop fails or arrives stale, the existing CSS/image motion remains active. During this soak no loop failure or stale result occurred, but the fallback path remains enabled.

## Production state

- Profile C and Soft Lock are active locally.
- `IMAGE_MOTION` is active.
- `ANIMATEDIFF_ENABLED=false`.
- YouTube/public hosting is off.
- OBS Ambient Main audio was not changed.

This is a local staging result, not an automatic public launch approval.
