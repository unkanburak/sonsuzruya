# Profile C Continuity Optimization

Test date: 2026-08-30

## Summary

**BASE PROFILE:** C — SDXL-Lightning 4-step, 1024×576, CFG 1, Euler / `sgm_uniform`  
**BASELINE LATENCY:** cold 60.32 s; warm chain p50 **2.21 s**, warm p95 **5.46 s** (cold excluded from warm interpretation)  
**BEST CONTINUITY METHOD:** Text-lock C (provisional)  
**BEST METHOD LATENCY:** p50 **2.02 s**, p95 **2.22 s**  
**BASELINE SEMANTIC:** **7/8 PASS**, 1 PARTIAL, 0 FAIL  
**BEST SEMANTIC:** **6/8 PASS**, 1 PARTIAL, 1 FAIL (text-lock)  
**BASELINE CONTINUITY:** character 4/8, world 6/8, style 7/8, anchors 5/8  
**BEST CONTINUITY:** text-lock character 5/8, world 6/8, style 7/8, anchors 5/8  
**OLD-SCENE LOCK RATE:** baseline 0/8; text-lock 0/8; img2img 4/8 (obvious)  
**OOM:** 0  
**RECOMMENDED:** **BASELINE C pending human review; Text-lock C is staging candidate, not promoted**  
**CONFIDENCE:** MEDIUM

## Installed continuity audit

Installed custom nodes were only `ComfyUI-AnimateDiff-Evolved` and `ComfyUI-VideoHelperSuite`. No IPAdapter node, IPAdapter model, CLIP vision model, InstantID or related reference component was installed. Nothing was downloaded. Variant 2 (IPAdapter) is therefore reported as **UNAVAILABLE**, not benchmarked.

## Methods and exact settings

All methods used the same `sdxl_lightning_4step.safetensors`, 1024×576, 4 steps, CFG 1, Euler and `sgm_uniform` on one isolated Comfy 8192 instance with exclusive inference access.

- **Baseline C:** concise style + current result state, text-only.
- **Text-lock C:** fixed WORLD, PROTAGONIST fingerprint, palette and 3 compact anchors, plus previous/current result state.
- **Img2img C 0.75:** same structured text plus actual previous successful PNG through `LoadImage → VAEEncode`, denoise 0.75. No reset to the original image.
- **IPAdapter:** not available locally; no installation/download performed.

The first baseline turn after the clean Comfy restart was a cold model staging sample (60.32 s). All following values are real server-completed cache-miss generations. Every img2img turn used the previous turn’s actual output copied to the isolated input directory.

## Latency samples

| Method | 8 sequential samples (s) | Warm p50 | Warm p95 |
|---|---|---:|---:|
| Baseline C | **60.320**, 5.460, 3.120, 2.628, 2.357, 2.212, 2.042, 2.022 | 2.21 | 5.46 |
| Text-lock C | 2.380, 2.220, 2.180, 2.040, 2.020, 2.020, 2.020, 2.020 | 2.02 | 2.22 |
| Img2img C 0.75 | 2.041, 2.212, 2.357, 2.628, 2.642, 2.907, 3.430, 4.374 | 2.63 | 3.43 |

No failures or OOMs occurred. All methods stayed below the 8-second p50 candidate limit.

## Semantic/continuity scoring

Chain: bridge → beneath same bridge → forest path → red house → hallway → basement → machine room → activated machine.

| Method | Result-state | Character | World | Anchors | Style | Old-scene lock |
|---|---|---|---|---|---|---|
| Baseline C | 7 PASS / 1 PARTIAL | 4/8 PASS | 6/8 PASS | 5/8 PASS | 7/8 PASS | 0/8 |
| Text-lock C | 6 PASS / 1 PARTIAL / 1 FAIL | 5/8 PASS | 6/8 PASS | 5/8 PASS | 7/8 PASS | 0/8 |
| Img2img 0.75 | 4 PASS / 1 PARTIAL / 3 FAIL | 3/8 PASS | 4/8 PASS | 3/8 PASS | 5/8 PASS | **4/8** |

The img2img failures are semantic, not technical: the previous bridge/house composition remains too dominant when the requested state changes to forest, basement or machine room. It is rejected despite usable latency.

Text-lock improves the protagonist/world fingerprint modestly and preserves the result transition better than img2img, but its basement and activated-machine frames still show that pure text cannot guarantee identity/anchor persistence. Because its semantic score is one pass lower than baseline in this short chain, it is not automatically a production replacement.

## Contact sheets

- [Baseline C](C:\Users\burak\OneDrive%20Desktop\SONSUZ%20YAYIN\benchmark\profile-c-continuity\BASELINE.png)
- [Text-lock C](C:\Users\burak\OneDrive%20Desktop\SONSUZ%20YAYIN\benchmark\profile-c-continuity\TEXTLOCK.png)
- [Img2img C 0.75](C:\Users\burak\OneDrive\Desktop\SONSUZ%20YAYIN\benchmark\profile-c-continuity\IMG075.png)

The sheets use the same transition row order. Subjective quality was not auto-ranked; the relevant human question is which output feels like the next shot of the same story while clearly showing the new result state.

## Decision

**BEST CONTINUITY METHOD:** Text-lock C is the only plausible lightweight candidate, but its semantic result score is not clearly better than baseline in this 8-turn chain.  
**SHOULD PRODUCTION CONTINUITY WORKFLOW CHANGE:** **NO (not automatically)**. Keep baseline/validated structured prompting until a larger human-reviewed test confirms no semantic regression.  
**IPAdapter next step:** only consider a lightweight identity/style reference experiment if protagonist identity remains the main weakness after review. Do not install it as part of this benchmark.

## Restoration

The isolated 8192 Comfy process was stopped. Production 8188 and Node were restarted with the recorded commands.

- 8188 `/system_stats`: HTTP 200
- Node `/health`: healthy
- IMAGE_MOTION: active
- `ANIMATEDIFF_ENABLED`: false
- YouTube/public: off
- OBS Ambient Main: unchanged

**PRODUCTION RESTORED: YES**  
**PRODUCTION UNCHANGED: YES**
