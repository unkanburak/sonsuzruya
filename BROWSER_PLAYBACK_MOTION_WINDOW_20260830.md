# Browser Playback & Motion Window Validation

**Scope:** 10-turn local integrated diagnostic. No model, resolution, frames, steps, sampler, CFG, Qwen, story state, vote logic, YouTube, or public hosting changes.

## Final status

```text
ANIMATEDIFF_ENABLED=false
production timeout=10s
production maxDelayAfterStaticMs=10s
IMAGE_MOTION healthy
```

## Browser telemetry implementation

The motion `<video>` now reports, per scene, through the existing `/api/metrics/playback` endpoint:

```text
loadstart
loadedmetadata
canplay
playing
play_resolved
play_rejected
error
ended
```

Each event includes `sceneId/sceneNumber`, client timestamp, elapsed time, and error details where available. The static SDXL image remains visible until `playing`. A rejected `play()` or media error keeps the static IMAGE_MOTION scene visible.

The in-app browser control connection was unavailable in this environment, so no real browser event reached the server during this run. Therefore Browser `canplay`, `playing`, play errors, and browser E2E metrics are reported as **unobserved**, not as successes.

## Warm-up and readiness

- 8188 `/system_stats`: HTTP 200
- 8191 `/system_stats`: HTTP 200
- One disposable AnimateDiff warm-up completed on 8191.
- Queue was empty before benchmark turns and after each completed turn.
- Warm-up was excluded from metrics.
- AnimateDiff diagnostic timeout: 45 seconds.
- Diagnostic `maxDelayAfterStaticMs`: 25 seconds.

## Ten integrated turns

SDXL ran only on 8188; AnimateDiff ran only on 8191. Event logs include `enginePort: 8191` for every AnimateDiff start. Unique scene IDs and generated immutable media filenames were used by the normal engine.

| Scene | T1 static result (s after vote lock) | SDXL (s) | AnimateDiff result | T3−T2 (s) | Server vote-lock→video-ready (s) |
|---:|---:|---:|---|---:|---:|
| 4312 | 22.661 | 22.658 | ready | 22.417 | 45.100 |
| 4313 | 20.143 | 20.140 | ready | 21.657 | 41.833 |
| 4314 | 19.424 | 19.420 | discarded: static-delay | 43.006 | — |
| 4315 | 16.776 | 16.773 | discarded: static-delay | 35.008 | — |
| 4316 | 18.628 | 18.626 | discarded: 45s timeout | 45.552 | — |
| 4317 | 20.526 | 20.523 | ready | 16.688 | 37.227 |
| 4318 | 16.899 | 16.895 | discarded: 45s timeout | 45.460 | — |
| 4319 | 28.146 | 28.144 | ready | 21.804 | 49.970 |
| 4320 | 8.109 | 8.108 | discarded: static-delay | 36.895 | — |
| 4321 | 19.744 | 19.743 | discarded: 45s timeout | 45.255 | — |

## Metrics

Percentiles use the ten samples; p95 is the nearest-rank high sample for this small run.

- **Time to visible static result (T1−T0):** p50 **19.584 s**, p95 **28.146 s**
- **SDXL generation:** p50 **19.582 s**, p95 **28.144 s**
- **True AnimateDiff generation (successful T3−T2 only):** p50 **21.731 s**, p95 **22.417 s**
- **Server vote-lock→video-ready (successful only):** p50 **43.467 s**, p95 **49.970 s**
- **MP4/video file success:** **4/10 (40%)**
- **Fallback/discard:** **6/10 (60%)**
- **Browser canplay:** unobserved (0 telemetry samples)
- **Browser playing:** unobserved (0 telemetry samples)
- **Browser play() errors:** unobserved
- **Static→playing (T5−T1):** N/A; no Browser `playing` timestamps
- **Vote-lock→playing (T5−T0):** N/A; no Browser `playing` timestamps
- **Black frames:** 0 logged
- **Stale media:** 0 logged

For successful server-side videos, T5−T3 and T5−T1 cannot be calculated without Browser events. The server-side video-ready values are not being presented as Browser-playing E2E.

## Hypothetical discard-window comparison

Using the observed motion completion/timeout distribution:

| Static→motion window | Videos that would be discarded | Kept |
|---:|---:|---:|
| 10 s | **10/10** | 0/10 |
| 15 s | **10/10** | 0/10 |
| 20 s | **9/10** | 1/10 |
| 25 s | **6/10** | 4/10 |

The 25-second diagnostic window kept the four clips that actually completed within 25 seconds. The other six either exceeded the window or hit the 45-second diagnostic timeout.

## Interpretation

The asynchronous enhancement model works as intended at the static-scene level: static imagery appears first, and late motion is discarded without replacing the visible static scene. However, only 40% of the ten attempts produced an MP4 inside the 25-second window. Browser playback acceptance remains unproven because the browser connection was unavailable; no final motion window is recommended from this run alone.

## Raw event evidence

The ten benchmark scenes are 4312–4321 in `state/events.jsonl`. They contain `round_locked`, `sdxl_image_ready`, `animatediff_start` with `enginePort:8191`, and either `motion_ready` or `motion_discarded`. No `video_playback_telemetry` records were present.

## Restored final state

- `ANIMATEDIFF_ENABLED=false`
- production AnimateDiff timeout: 10 seconds
- production static-delay window: 10 seconds
- 8188 remains the only running Comfy process for IMAGE_MOTION
- 8191 diagnostic process stopped
- Node health: `ok=true`, Comfy reachable, Qwen reachable, YouTube unconfigured
