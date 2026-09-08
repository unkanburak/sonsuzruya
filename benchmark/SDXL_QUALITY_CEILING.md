# SDXL-Lightning Quality Ceiling — Exclusive GPU

Test date: 2026-08-30

## Top summary

**TEST VALIDITY:** VALID  
**EXCLUSIVE GPU VERIFIED:** YES  
**PROFILE A:** warm p50/p95 **3.51 / 5.35 s**, peak **7514 MiB**  
**PROFILE B:** warm p50/p95 **2.98 / 3.20 s**, peak **7545 MiB**  
**PROFILE C:** warm p50/p95 **3.00 / 4.01 s**, peak **7545 MiB**  
**PROFILE D:** warm p50/p95 **3.72 / 3.72 s**, peak **7513 MiB**  
**PROFILES REJECTED BY LATENCY:** none (all warm p50 ≤ 8 s)  
**SEMANTIC WINNER:** C (provisional visual/semantic review; human confirmation recommended)  
**CONTINUITY WINNER:** A/C tied in this text-only sample; no reliable character identity advantage  
**VISUAL QUALITY WINNER:** HUMAN REVIEW REQUIRED  
**BEST LIVE PROFILE:** C (1024×576, 4-step), subject to blind human approval  
**BEST MAX-QUALITY PROFILE:** D (1024×576, 8-step)  
**RECOMMENDED OPTIMIZATION BASE:** C  
**CONFIDENCE:** MEDIUM (blind subjective review is intentionally not auto-decided)

## Exact profiles and checkpoints

| Profile | Checkpoint | Resolution | Steps | CFG | Sampler / scheduler |
|---|---|---:|---:|---:|---|
| A | `sdxl_lightning_4step.safetensors` | 768×448 | 4 | 1 | Euler / `sgm_uniform` |
| B | `sdxl_lightning_8step.safetensors` | 768×448 | 8 | 1 | Euler / `sgm_uniform` |
| C | `sdxl_lightning_4step.safetensors` | 1024×576 | 4 | 1 | Euler / `sgm_uniform` |
| D | `sdxl_lightning_8step.safetensors` | 1024×576 | 8 | 1 | Euler / `sgm_uniform` |

Only one isolated ComfyUI process ran on port 8192. 8188/8191 were stopped during the benchmark; benchmark user/temp/input/output were under `benchmark/runtime/8192`. `/system_stats` returned HTTP 200 and reported the RTX 3070 Ti with no competing Comfy inference process.

## Performance

Each profile used one disposable warm-up followed by five unique seed/prompt/output cache-miss jobs. Comfy history completion and output file were confirmed for every job. Warm-up model staging was approximately 59–61 seconds and excluded from warm statistics.

| Profile | Warm samples (s) | Warm p50 | Warm p95 | Peak VRAM | Fail/OOM |
|---|---|---:|---:|---:|---:|
| A | 5.668, 3.506, 3.158, 5.354, 2.770 | 3.506 | 5.354 | 7514 MiB | 0 |
| B | 6.666, 2.976, 3.196, 2.729, 2.689 | 2.976 | 3.196 | 7545 MiB | 0 |
| C | 6.196, 2.995, 2.708, 4.008, 2.215 | 2.995 | 4.008 | 7545 MiB | 0 |
| D | 6.632, 3.717, 2.966, 3.723, 2.936 | 3.717 | 3.723 | 7513 MiB | 0 |

Estimated vote-lock → image-ready is generation latency plus normal Node/Comfy/file handoff overhead. With the current measured handoff typically under ~0.5 s, C is approximately **3.0–4.5 s warm**, inside the excellent live band. The isolated benchmark did not include Node voting overhead, so this is an estimate rather than a Browser Source measurement.

## Semantic review (12 project scenes)

The following is an objective visual pass over the generated contact sheets, not a claim that one profile is subjectively prettier. `PASS` means the requested result is clearly visible; `PARTIAL` means recognizable but incomplete; `FAIL` means the central requested result is missing.

| Profile | Result state | Required objects | Spatial relationship | Major artifacts |
|---|---:|---:|---:|---:|
| A | 7 PASS / 2 PARTIAL / 3 FAIL | 7 / 12 PASS | 6 / 12 PASS | 0 major |
| B | 6 PASS / 2 PARTIAL / 4 FAIL | 6 / 12 PASS | 5 / 12 PASS | 1 minor stylized drift |
| C | 9 PASS / 2 PARTIAL / 1 FAIL | 8 / 12 PASS | 8 / 12 PASS | 0 major |
| D | 8 PASS / 2 PARTIAL / 2 FAIL | 8 / 12 PASS | 7 / 12 PASS | 0 major |

The recurring miss across profiles was the difficult multi-object/spatial prompt (for example, all three named objects or a portal plus staircase in one frame), not a runtime failure.

## Text-only continuity chain

Chain: bridge → beneath bridge → forest → red house → hallway → basement → machine room → activated machine. No image conditioning was used.

| Profile | Character consistency | World consistency | Style consistency | Anchor retention | Result-state adherence |
|---|---|---|---|---|---|
| A | 5 PASS / 3 PARTIAL | 6 / 8 PASS | 7 / 8 PASS | 5 / 8 PASS | 6 / 8 PASS |
| B | 3 PASS / 5 PARTIAL | 4 / 8 PASS | 5 / 8 PASS | 3 / 8 PASS | 5 / 8 PASS |
| C | 5 PASS / 3 PARTIAL | 6 / 8 PASS | 7 / 8 PASS | 5 / 8 PASS | 6 / 8 PASS |
| D | 4 PASS / 4 PARTIAL | 6 / 8 PASS | 7 / 8 PASS | 4 / 8 PASS | 6 / 8 PASS |

This short chain does not establish a statistically meaningful continuity winner; A and C were effectively tied. Pure text prompting remains the limiting factor for persistent character identity.

## Blind review assets

- [BLIND_QUALITY_CONTACT_SHEET.png](<USER_HOME>\OneDrive\Desktop\SONSUZ%20YAYIN\benchmark\sdxl-quality-ceiling\BLIND_QUALITY_CONTACT_SHEET.png)
- [BLIND_KEY.json](<USER_HOME>\OneDrive\Desktop\SONSUZ%20YAYIN\benchmark\sdxl-quality-ceiling\BLIND_KEY.json)
- Continuity sheets: `CONTINUITY_A.png`, `CONTINUITY_B.png`, `CONTINUITY_C.png`, `CONTINUITY_D.png`
- Per-profile semantic sheets: `QUALITY_A.png`, `QUALITY_B.png`, `QUALITY_C.png`, `QUALITY_D.png`

The blind sheet randomizes left/right profile placement and exposes only neutral IDs. Human review should choose based on “which feels like the next shot of the same story while clearly showing the new result,” not merely pixel count or sharpness.

## Trade-off and recommendation

C is the best live candidate: it raises output to 1024×576 while retaining 4-step speed and shows the strongest result-state adherence in this sample. D is the maximum-quality candidate and remains technically fast here, but its visible improvement over C must be confirmed by the blind sheet before accepting the extra 8-step profile. B showed more stylized variance without a semantic advantage.

No profile was promoted automatically. No model, sampler, prompt architecture, loop motion, audio, Qwen, story-state or frontend code was changed.

## Production restoration

The isolated 8192 process was stopped after outputs were written. Production Comfy 8188 was restarted with its recorded command and Node was restarted with `node app/server.mjs`.

- 8188 `/system_stats`: HTTP 200
- Node `/health`: healthy
- IMAGE_MOTION: active
- `ANIMATEDIFF_ENABLED`: false
- YouTube/public: off
- OBS Ambient Main/audio configuration: unchanged

**PRODUCTION RESTORED: YES**  
**AUDIO UNCHANGED: YES**  
**IMAGE_MOTION HEALTH: PASS**

No benchmark winner was auto-promoted. Keep the current 768×448 A profile until the blind human review is accepted; C is the recommended staging candidate.
