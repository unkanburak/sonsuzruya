# AnimateDiff / Two-Comfy Complete Diagnostic Report

**Date:** 2026-08-30  
**Scope:** Local diagnosis only. No YouTube test, model tuning, or production architecture change.

## Executive status

```text
MAIN ARCHITECTURE: preserved
PRODUCTION MODE: IMAGE_MOTION
ANIMATEDIFF_ENABLED: false
PRODUCTION ANIMATEDIFF TIMEOUT: 10 seconds
8188 SDXL: healthy
8191 AnimateDiff: healthy
TRUE TWO-COMFY INTEGRATED PLAYBACK: not accepted yet
```

The apparent contradiction—earlier AnimateDiff measurements around 8–20 seconds versus a later 45+ second result—was isolated. A clean AnimateDiff-only cold run completed in **16.98 seconds**. The 45-second series was contaminated by queued jobs that continued executing after client-side timeout; it was not evidence of a permanent AnimateDiff regression.

## Architecture and hard routing

- `ComfyImageEngine` is bound only to `http://127.0.0.1:8188`.
- `AnimateDiffVideoEngine` is bound only to `http://127.0.0.1:8191` and rejects every other port.
- AnimateDiff has no implicit fallback to 8188.
- Before enqueue, `/system_stats` readiness is checked. If 8191 is unavailable, `motion_unavailable` is logged and static IMAGE_MOTION continues.
- Node.js, SDXL, Qwen, story-state, fallback semantics, and OBS architecture were not redesigned.

## 8191 startup history

The first failed startup used:

```text
D:\InfiniteAILive\ComfyUI_windows_portable\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --listen 127.0.0.1 --port 8191
```

Real exceptions:

```text
PermissionError: [WinError 5] Access denied:
'D:\InfiniteAILive\ComfyUI_windows_portable\ComfyUI\temp'
```

and an access error for `ComfyUI\user\comfyui.db.lock`. AnimateDiff-Evolved and VideoHelperSuite imports completed, so this was a Windows write/lock permission problem, not a model/CUDA/custom-node import problem.

The manually corrected 8191 instance uses:

```text
user: D:\InfiniteAILive\ComfyUI_8191\user
temp: D:\InfiniteAILive\ComfyUI_8191\temp
```

It returns HTTP 200 from `http://127.0.0.1:8191/system_stats` and was not restarted, replaced, or killed during final diagnostics.

## Earlier invalid 30-second integrated test

That test temporarily enabled AnimateDiff while 8191 was unavailable. AnimateDiff jobs were sent to 8188, so SDXL latency rose from about 2 seconds to 45–59 seconds. It is invalid as a TWO-COMFY benchmark. Video success was 0/5 and Browser playback events were never reached. It must not be used to judge the two-process architecture.

## Controlled single-job diagnostics

Every test used the exact existing image-conditioned workflow: 384×224, 16 frames, 2 steps, unchanged checkpoint/motion model, empty queue, and a 120-second diagnostic window. Comfy history timestamps supplied server-side execution timing.

### Test A — AnimateDiff alone

8188 was stopped; the manual 8191 instance remained unchanged.

| Metric | Result |
|---|---:|
| Client total | **16.975 s** |
| Server execution | **16.687 s** |
| Success/output | **YES**, node 11 |
| Peak GPU | **6.94 GiB / 8 GiB** |
| GPU utilization | up to 100% |
| OOM | none |

This returned to the expected 8–20 second class.

### Test B — Two processes, SDXL not warmed

8188 was restored and healthy, but no SDXL job was run first. One AnimateDiff job ran on 8191.

| Metric | Result |
|---|---:|
| Client total | **1.441 s** |
| Server execution | **1.158 s** |
| Success/output | **YES**, node 11 |
| GPU observation | approximately **1.83 GiB** |
| OOM | none |

This was cached/warm execution in the already-running 8191 process.

### Test C — SDXL resident/warm attempt

One SDXL job was submitted to 8188, followed immediately by one AnimateDiff job on 8191. SDXL failed at node 8 `SaveImage` with a Windows `PermissionError` for `ComfyUI\output\live\...png`. AnimateDiff still completed on 8191.

| Metric | Result |
|---|---:|
| SDXL | failed at SaveImage permission |
| AnimateDiff client total | **1.956 s** |
| AnimateDiff server execution | **1.641 s** |
| AnimateDiff success | **YES** |
| GPU observation | approximately **6.14 GiB** |
| OOM | none |

Because SDXL did not finish, C is not a clean SDXL-resident comparison; the failure was recorded and not hidden or retried.

## Queue and server confirmation

```text
QUEUE CLEAN BEFORE EACH: YES
SERVER-SIDE COMPLETION CONFIRMED FOR ANIMATEDIFF A/B/C: YES
```

The harness recorded GPU samples and process RSS (~47–52 MB). Windows system-wide RAM performance counters were unavailable; no fabricated RAM figure is reported. Comfy logs showed normal CUDA/DynamicVRAM initialization and no AnimateDiff OOM.

## Root cause of the contradiction

The earlier 45+ second series was primarily a **benchmark queue/client-timeout problem**: multiple jobs were submitted, the client stopped waiting at 45 seconds without cancelling server work, and later requests measured queue backlog. A clean cold run was 16.98 seconds, while clean warm runs were 1.44–1.96 seconds.

Separate issue: 8188 still has a `SaveImage` permission problem with the shared output path. This affects SDXL output, not AnimateDiff generation speed.

## Validation decision

AnimateDiff is not abandoned because of the misleading 45-second series. It remains an experimental optional layer. A valid five-turn TWO-COMFY Browser playback benchmark still requires a writable 8188 output path, both healthy instances, a clean direct 8191 gate, and then integrated playback measurement. No integrated voting/playback test was run after the direct gate was evaluated.

## Deliberately unchanged

No model, resolution, step, sampler/CFG, Qwen, story-state, frontend, VRAM, timeout production default, YouTube state, or architecture optimization was made.

## Final runtime verification

```text
8188 /system_stats: HTTP 200
8191 /system_stats: HTTP 200
Node /health: ok=true, comfy=true, qwen=true, youtube=false
engine: IMAGE_MOTION
ANIMATEDIFF_ENABLED: false
production timeout: 10,000 ms
```

Raw artifacts: `controlled-A-result.json`, `controlled-B-result.json`, `controlled-C-result.json`, `two-comfy-direct-8191-results.json`, `comfy8191.stdout.log`, `comfy8191.stderr.log`, `comfy8188.controlled.stdout.log`, and `comfy8188.controlled.stderr.log`.
