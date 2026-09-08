# Final Blind A-vs-C Comparison

**TEST SET:** 12 direct A/C pairs from the completed SDXL quality-ceiling scene set (six representative scene types represented across two matched scene instances).  
**PRESENTATION:** both sides normalized to the same contact-sheet viewing dimensions; left/right randomized independently per pair.  
**SUBJECTIVE VISUAL WINNER:** HUMAN REVIEW REQUIRED  
**A SEMANTIC:** preliminary screen 10 PASS / 2 PARTIAL / 0 FAIL  
**C SEMANTIC:** preliminary screen 11 PASS / 1 PARTIAL / 0 FAIL  
**A ARTIFACT COUNT:** 1 minor  
**C ARTIFACT COUNT:** 1 minor  
**LATENCY REFERENCE A:** warm p50 2.44 s / p95 2.78 s  
**LATENCY REFERENCE C:** warm p50 2.46 s / p95 2.83 s  
**RECOMMENDATION:** Human-review the blind sheet using the 8/12 rule.  
**SHOULD C REPLACE A NOW?:** NO

## Assets

- [Blind A/C comparison](./A_C_FINAL_BLIND_COMPARISON.png)
- [Hidden mapping key](./A_C_FINAL_BLIND_KEY.json)
- Raw source benchmark: [sdxl-quality-ceiling-results.json](./sdxl-quality-ceiling-results.json)

The sheet contains no profile, resolution or checkpoint labels—only `LEFT` and `RIGHT`. Both images in each pair were resized to the same display box while preserving aspect ratio, so resolution alone cannot decide the result.

## Fairness and source

The source images are the already completed exclusive-GPU SDXL quality-ceiling outputs. They use the same world-style text and the same per-scene seed between A and C. No prompt rewriting, sampler change, step change, image conditioning or quality enhancement was applied. No new soak was run.

## Objective review

The preliminary screen checks whether the requested result, required object and spatial relationship are visibly present and whether a major artifact exists. It is intentionally conservative and is not a substitute for the blind human choice. The subjective winner remains explicitly unassigned until human review.

## Decision rule

- If C is preferred in at least 8 of 12 blind pairs and C semantic adherence is not worse, recommend C for production.
- If approximately tied, keep A.
- If C loses semantic adherence, keep A regardless of sharpness/detail.

Until that human review is completed, A remains production. C is not promoted automatically.

## Final state

- A remains the production profile (SDXL-Lightning 4-step, 768×448).
- IMAGE_MOTION active.
- `ANIMATEDIFF_ENABLED=false`.
- YouTube off.
- No ControlNet, IPAdapter, LoRA, upscaler, refiner, prompt tuning or architecture changes.
