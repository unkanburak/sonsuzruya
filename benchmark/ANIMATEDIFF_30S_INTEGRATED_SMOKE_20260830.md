# AnimateDiff 30s Integrated Playback Smoke Test

## Scope

- Main architecture unchanged; two-Comfy design retained as production architecture.
- This was a local-only feasibility run.
- Temporary test settings: `ANIMATEDIFF_ENABLED=true`, AnimateDiff timeout `30,000 ms`.
- No model, resolution, step, Qwen, story-state, frontend, VRAM, or workflow optimization was performed.
- Final settings restored: `ANIMATEDIFF_ENABLED=false`, timeout `10,000 ms`.

The second Comfy instance (8191) did not come up during this particular run, so the integrated run used the main 8188 instance. The two-instance architecture was not removed or redesigned; prior isolated two-instance measurements remain in the overnight report.

## Event timeline

`video file ready`, `Browser canplay`, and `Browser playing` are shown as `—` when no successful motion video was produced. Browser automation was unavailable in this environment, and no playback event was emitted because every motion job timed out.

| Scene | vote_lock | SDXL ready | AnimateDiff start | video file ready | Browser canplay | Browser playing | Result |
|---:|---|---|---|---|---|---|---|
| 2211 | 2026-08-29 22:14:35.230Z | 22:14:43.236Z | 22:14:43.239Z | — | — | — | timeout/discard |
| 2212 | 2026-08-29 22:15:18.621Z | 22:16:03.932Z | 22:16:03.935Z | — | — | — | timeout/discard |
| 2213 | 2026-08-29 22:16:39.400Z | 22:17:36.580Z | 22:17:36.582Z | — | — | — | timeout/discard |
| 2214 | 2026-08-29 22:18:12.075Z | 22:19:11.097Z | 22:19:11.098Z | — | — | — | timeout/discard |
| 2215 | 2026-08-29 22:19:46.880Z | 22:20:44.920Z | 22:20:44.922Z | — | — | — | timeout/discard |

## Metrics

Percentiles use the five observed values; p95 is the highest observed sample (small-sample proxy).

| Metric | Values (s) | p50 (s) | p95 (s) |
|---|---|---:|---:|
| SDXL generation | 2.321, 45.309, 57.177, 59.019, 58.039 | **57.177** | **59.019** |
| AnimateDiff attempt to timeout | 30.264, 30.253, 30.343, 30.303, 30.197 | **30.264** | **30.343** |
| Browser-playing E2E | no samples | **N/A** | **N/A** |

Video success rate: **0/5 (0%)**. Motion fallback/discard: **5/5 (100%)**. Browser-playing E2E could not be measured because no video reached `video file ready`.

## Decision

The 30-second timeout was not an acceptance problem: AnimateDiff did not complete within the temporary limit in any of the five integrated turns. The observed attempt latency is above the `30s` cutoff and far above the preferred `<=15s p95` target. Keep AnimateDiff disabled by default and retain the existing static image-motion/fallback path. Do not promote the single-Comfy experiment.

## Final runtime state

- `ANIMATEDIFF_ENABLED=false`
- AnimateDiff timeout: `10,000 ms`
- Existing story-state, SDXL commit, Qwen and fallback behavior unchanged.
