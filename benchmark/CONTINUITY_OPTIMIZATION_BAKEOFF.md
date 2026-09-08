# Continuity Optimization Bake-off — Exclusive GPU Validation

EXCLUSIVE GPU VERIFIED: YES  
HANDOFF: PASS  
VANILLA: 12/12 successful; p50 2.60s; p95 2.84s  
STRUCTURED TEXT: 12/12 successful; p50 2.62s; p95 2.98s  
IMG2IMG 0.30: 12/12 successful; p50 2.38s; p95 2.88s  
IMG2IMG 0.45: 12/12 successful; p50 2.61s; p95 3.11s  
BEST METHOD: Structured text is the least harmful text-only candidate; no img2img method is recommended.  
BEST RESULT-STATE: HUMAN REVIEW REQUIRED  
BEST CHARACTER: HUMAN REVIEW REQUIRED  
BEST WORLD: HUMAN REVIEW REQUIRED  
BEST SCENE LOCK: Text methods moderate; img2img methods major bridge lock.  
BEST P50: 2.38s (img2img 0.30)  
BEST P95: 2.84s (vanilla)  
SHOULD PRODUCTION CONTINUITY WORKFLOW CHANGE: NO

## Validity and restoration

The benchmark ran on isolated ComfyUI port 8193 with exclusive RTX 3070 Ti access. Production Node, Qwen and Comfy 8188 were stopped; no competing inference process held material VRAM. A fresh handoff gate produced a new PNG, resolved it under the isolated output root, copied it to the isolated input directory, and verified a decodable PNG. IPAdapter was not installed or tested.

Production was restored with the recorded commands. At completion, 8188 `/system_stats`, Qwen `/health`, and Node `/health` returned successfully; Node reported `engine=IMAGE_MOTION` and `youtube=false`. `ANIMATEDIFF_ENABLED=false` remained the production default. The benchmark instance was stopped.

## Exact experiment

- Checkpoint: `sdxl_lightning_4step.safetensors`
- Methods: vanilla text-only (A), structured text with explicit WORLD/PROTAGONIST/ANCHORS (B), img2img denoise 0.30 (C1), img2img denoise 0.45 (C2)
- Resolution: 768×448; KSampler 4 steps, CFG 1, Euler, `sgm_uniform`
- Five-transition gate followed by a 12-transition chain for every method
- Unique seeds/output prefixes; queue checked empty before every job
- Img2img used the actual prior successful PNG and Comfy `[input]` filename annotation
- Success confirmed through Comfy history and output-file existence

## Latency results

| Method | Success | p50 | p95 |
|---|---:|---:|---:|
| Vanilla A | 12/12 | 2.60s | 2.84s |
| Structured B | 12/12 | 2.62s | 2.98s |
| Img2img 0.30 | 12/12 | 2.38s | 2.88s |
| Img2img 0.45 | 12/12 | 2.61s | 3.11s |

All measured runs were cache-miss generations in the ~2–3 second class. No OOM or generation failure occurred.

## Contact sheets

- [Vanilla](<<PROJECT_ROOT>/benchmark/continuity-bakeoff/VANILLA_SEQUENCE.png>)
- [Structured text](<<PROJECT_ROOT>/benchmark/continuity-bakeoff/STRUCTURED_TEXT_SEQUENCE.png>)
- [Img2img 0.30](<<PROJECT_ROOT>/benchmark/continuity-bakeoff/IMG2IMG_030_SEQUENCE.png>)
- [Img2img 0.45](<<PROJECT_ROOT>/benchmark/continuity-bakeoff/IMG2IMG_045_SEQUENCE.png>)
- [Comparison](<<PROJECT_ROOT>/benchmark/continuity-bakeoff/CONTINUITY_FAILURES.png>)

## Visual observations

Chain: `bridge → under bridge → forest → red house → hallway → basement → machine → activated machine → flooded basement → submerged tunnel → portal field → new landscape`.

| Method | Result-state adherence | Character consistency | World/anchor continuity | Scene lock |
|---|---|---|---|---|
| Vanilla A | Partial; later states often remain bridge-like | Partial | Partial | Moderate |
| Structured B | Best readable environment changes, still partial | Partial/pass silhouette | Partial/pass | Moderate; repeated frames |
| Img2img 0.30 | Partial/fail for later transitions | Stable silhouette | Fail for intended evolution | Major bridge lock |
| Img2img 0.45 | Partial/fail for later transitions | Partial/pass silhouette | Fail for intended evolution | Major bridge lock; more artifacts |

These are preliminary visual observations, not fabricated automated scores. Human review remains required for subjective quality. The contact sheets show that low-denoise img2img preserves the prior composition too aggressively; higher denoise loosens it but does not reliably produce the requested new locations.

## Decision

Exclusive isolation fixed the earlier false latency contention. All methods are technically stable, but pure text continuity is only approximate and img2img continuity causes scene lock. Keep production unchanged. If continuity is revisited, structured text is the least harmful candidate, but this bake-off does not promote it.

PRODUCTION RESTORED: YES  
PRODUCTION UNCHANGED: YES
