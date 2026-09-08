# Two-Comfy Integrated Validation

8191 STARTUP: **PASS**
8188 HEALTH: **PASS**
SDXL ROUTED TO 8188: **YES**
ANIMATEDIFF ROUTED TO 8191: **YES (code-level; no 8188 fallback)**
DIRECT 8191 TEST: **3/3 follow-up jobs successful** (prior 0/4 series was queue-contaminated)
INTEGRATED VIDEO PLAYBACK: **0/5 (not run; gate failed)**
TEST VALIDITY: **INVALID / ABORTED**

> This update supersedes the earlier startup-failure snapshot. The manually managed 8191 instance is now healthy and was not restarted or killed.

## 1. 8191 startup diagnostic

The manually running AnimateDiff instance reports healthy on `/system_stats` (HTTP 200). It uses isolated runtime paths:

```text
user: D:\InfiniteAILive\ComfyUI_8191\user
temp: D:\InfiniteAILive\ComfyUI_8191\temp
```

The process was not restarted, replaced, or killed.

The earlier failed startup command and diagnostic are retained below for traceability:

```text
D:\InfiniteAILive\ComfyUI_windows_portable\python_embeded\python.exe -s ComfyUI\main.py --windows-standalone-build --listen 127.0.0.1 --port 8191
```

| Field | Result |
|---|---|
| PID | 20860 |
| Working directory | `D:\InfiniteAILive\ComfyUI_windows_portable` |
| Python executable | `D:\InfiniteAILive\ComfyUI_windows_portable\python_embeded\python.exe` |
| Launch elapsed | 33 ms |
| Port 8191 listening | **YES** |
| Readiness (`/system_stats`) | **HTTP 200** |
| Process exit | Not inspected/altered; existing manual process preserved |
| stdout | [`comfy8191.stdout.log`](comfy8191.stdout.log) |
| stderr | [`comfy8191.stderr.log`](comfy8191.stderr.log) |

The previous startup exception (before isolated paths were supplied) was:

```text
PermissionError: [WinError 5] Erişim engellendi:
'D:\InfiniteAILive\ComfyUI_windows_portable\ComfyUI\temp'
```

Immediately before the fatal exception, ComfyUI also reported:

```text
[ERROR] Failed to initialize database ... [WinError 5] Erişim engellendi:
'D:\InfiniteAILive\ComfyUI_windows_portable\ComfyUI\user\comfyui.db.lock'
```

Custom-node imports themselves completed (AnimateDiff-Evolved 0.2 s, VideoHelperSuite 4.2 s). The failure is therefore a Windows write/lock permission problem in the shared ComfyUI directory, not a model or CUDA exception. No permission changes were made automatically.

## 2. Direct 8191 benchmark

The existing image-conditioned workflow was submitted directly to `http://127.0.0.1:8191` with the unchanged 384×224, 16-frame, 2-step profile. Four sequential jobs were attempted (one cold, three warm) with a temporary 45-second diagnostic limit.

| Run | Prompt class | Result | Latency |
|---:|---|---|---:|
| 1 | car | timeout | 45.17 s |
| 2 | tunnel | timeout | 45.15 s |
| 3 | portal | timeout | 45.23 s |
| 4 | car | timeout | 45.02 s |

Direct success: **0/4**. Warm p50/p95: **N/A** (no successful samples). All four prompt IDs exceeded the diagnostic limit; queued jobs were cancelled after the measurement to leave the manual 8191 instance idle.

## 3. Routing and readiness changes

- `ComfyImageEngine` remains bound to `http://127.0.0.1:8188`.
- `AnimateDiffVideoEngine` is now constructed from `animatediffUrl` and rejects every URL except `127.0.0.1:8191`.
- Before any AnimateDiff enqueue, `/system_stats` readiness is checked. If it fails, the motion job is not sent anywhere and `motion_unavailable` is logged; static IMAGE_MOTION continues.
- `enginePort: 8191` is included in AnimateDiff start/unavailable events.

## 4. Required benchmark gate

Although 8191 is now healthy, the direct gate failed (`0/4`). Therefore the five-turn integrated test was correctly **not run**. This run cannot produce valid two-Comfy integrated latency or Browser-playing metrics. The earlier single-Comfy result remains explicitly invalid as a production candidate.

## 5. Final runtime safety

- `ANIMATEDIFF_ENABLED=false`
- AnimateDiff timeout `10,000 ms`
- No model, resolution, steps, Qwen, story-state, frontend, VRAM, or production architecture changes
- Main service remains IMAGE_MOTION and its 8188 health path is unchanged

## Controlled single-job diagnostics (follow-up)

The three requested single-job tests were run with empty queues, the unchanged 384×224 / 16-frame / 2-step workflow, and a 120-second client-side diagnostic limit. Comfy server-side timestamps from each history record were used for execution latency.

| Test | Condition | Client total | Server execution | Result |
|---|---|---:|---:|---|
| A | 8191 AnimateDiff alone; 8188 stopped | **16.975 s** | **16.687 s** | success, output node 11 |
| B | 8188 restored but no SDXL generation; 8191 AnimateDiff | **1.441 s** | **1.158 s** | success, output node 11 (cached/warm) |
| C | one SDXL on 8188, then AnimateDiff on 8191 | SDXL failed; AnimateDiff **1.956 s** | AnimateDiff **1.641 s** | AnimateDiff success; SDXL failed at SaveImage permission |

Queue clean before each: **YES**. Server-side completion confirmed for AnimateDiff A/B/C: **YES**. C's SDXL warm-up did not complete, so C is not a valid clean “SDXL resident” comparison; the failure was recorded rather than retried.

### Resource observations

- Test A GPU samples rose from ~1.63 GiB to a peak of **6.94 GiB / 8 GiB**, with GPU utilization reaching 100%; process RSS remained ~47–52 MB for the Node harness. This is the cold model-load path.
- Test B GPU stayed around **1.83 GiB** and server execution was ~1.16 s, indicating cached execution in the already-warm 8191 process.
- Test C AnimateDiff ran with GPU around **6.14 GiB** after the failed 8188 SDXL attempt and still completed in ~1.64 s. The 8188 SDXL failure was `SaveImage` `PermissionError` on `ComfyUI\output\live`, not an OOM.
- The Comfy process logs show normal CUDA/DynamicVRAM initialization and no AnimateDiff OOM. System-wide RAM counters were unavailable through the Windows performance-counter API; harness RSS is recorded above.

### Root cause of the earlier 45+ second contradiction

It was not reproduced by a clean single AnimateDiff job. The earlier 45-second series submitted four jobs while the first was still executing; the jobs remained queued/running after the client-side timeout. That made later requests observe queue backlog and produced misleading timeout-only results. In a clean run, cold AnimateDiff was **16.98 s**, and warm/cached runs were **1.44–1.96 s**.

Conclusion: AnimateDiff itself did not regress. The previous result was primarily benchmark/client queue behavior (with GPU coexistence and shared-output permission issues still separate operational risks). A clean SDXL-resident comparison remains blocked by the 8188 `SaveImage` ACL error and was not fabricated.
