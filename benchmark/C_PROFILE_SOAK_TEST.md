# Profile C Staging Soak Test

**TEST VALIDITY:** VALID  
**TURNS COMPLETED:** 30  
**TOTAL SUCCESS:** 30  
**TOTAL FAIL:** 0  
**FALLBACK COUNT:** 0  
**BROKEN FRAME COUNT:** 0  
**LATENCY AVG:** 4.12 s (includes first cold model load)  
**LATENCY P50:** 2.57 s  
**LATENCY P95:** 3.64 s  
**SEMANTIC PASS / PARTIAL / FAIL:** 27 / 3 / 0 (preliminary ordered-sheet review)  
**CONTINUITY PASS / PARTIAL / FAIL:** 23 / 7 / 0 (preliminary ordered-sheet review)  
**CANDIDATE C STATUS:** BORDERLINE  
**RECOMMENDATION:** Keep C as staging candidate; perform a quick blind A-vs-C six-scene comparison before promotion.  
**SHOULD C REPLACE A NOW?:** NO

## Test conditions

Profile C was run in an isolated ComfyUI instance on port 8192 with exclusive RTX 3070 Ti access. Node, production Comfy 8188 and Qwen were temporarily stopped using the recorded commands in [C_SOAK_RESTORATION_CHECKLIST.json](./C_SOAK_RESTORATION_CHECKLIST.json). Production configuration, story-state semantics, voting, frontend and AnimateDiff settings were not changed.

Settings: `sdxl_lightning_4step.safetensors`, 1024×576, 4 steps, CFG 1, Euler, `sgm_uniform`. Every turn used a unique seed, unique output prefix and an empty queue. The actual Comfy history contained `execution_success` for all 30 jobs.

## Per-turn result

Raw per-turn data, prompts, result-state labels, output paths, seeds, latency and VRAM are in [c-profile-soak-results.json](./c-profile-soak-results.json). The 30 generated PNGs are under `benchmark/c-profile-soak/comfy-runtime/output/`.

| Metric | Result |
|---|---:|
| Attempts | 30 |
| Successful images | 30 |
| Failed images | 0 |
| Non-empty output files | 30 |
| Fallbacks | 0 |
| Broken/corrupt/blank frames | 0 |
| Average latency | 4.12 s |
| Warm-like p50 | 2.57 s |
| Warm-like p95 | 3.64 s |

The first turn included model initialization (45.91 s). Turns 2–30 were 2.22–3.64 s, so the average is intentionally not treated as the normal live latency.

## Visual review

The ordered sequence shows a coherent, understandable progression: bridge → beneath bridge → forest path → red house → hallway → basement → machine → blue activation → flooded room → submerged tunnel → portal → new world → tower/elevator/roof → cloud bridge → mirror/forest gate → clock/water chamber → dawn road. No output was blank or severely malformed.

Preliminary strict review of the contact sheet found 27 clear result states and 3 partial states; no complete semantic failures. Continuity was generally usable, with seven partial transitions where lighting, architecture or protagonist presentation drifted. Because this is not a blinded A/B review against A, these counts are evidence for staging stability, not a final quality claim.

Full ordered sheet: [FULL_C_SOAK_SEQUENCE.png](./c-profile-soak/FULL_C_SOAK_SEQUENCE.png)  
Problem/slow-turn sheet: [C_SOAK_PROBLEM_TURNS.png](./c-profile-soak/C_SOAK_PROBLEM_TURNS.png)

The two flagged turns are latency outliers rather than broken visuals. There were no fallback, stale-media or file-write errors.

## Promotion decision

C is technically strong as a staging profile: stable 30/30, zero broken frames, and excellent warm latency. The remaining uncertainty is whether 1024×576 produces a sufficiently visible quality/adherence gain over production A. The requested soak did not include a new A-vs-C comparison, so automatic promotion would be unjustified.

Recommended next step: one small blind A-vs-C comparison on six representative scenes. If C is visibly better without increasing semantic misses, it can replace A; otherwise retain A.

## Final state

**PRODUCTION RESTORED: YES**  
**PRODUCTION UNCHANGED: YES**

- 8188 `/system_stats`: HTTP 200
- Qwen `/health`: HTTP 200
- Node `/health`: `ok=true`, `comfy=true`, `qwen=true`, `youtube=false`
- `IMAGE_MOTION` active
- `ANIMATEDIFF_ENABLED=false`
- YouTube off
- C was not auto-promoted
