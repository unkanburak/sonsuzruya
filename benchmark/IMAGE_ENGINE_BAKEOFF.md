# Image Engine Bake-off

**CURRENT ENGINE:** SDXL-Lightning 4-step  
**CHALLENGER:** Z-Image-Turbo W4A8 (ComfyUI-native quantized)  
**Z-IMAGE RUNS ON 8GB:** YES  
**SDXL WARM P50:** 1.70 s (12-run clean reference set)  
**SDXL WARM P95:** 33.57 s (one queue/GPU-contention outlier; prior clean 10-run reference p95 2.04 s)  
**Z-IMAGE WARM P50:** 62.67 s  
**Z-IMAGE WARM P95:** 76.57 s  
**SDXL SEMANTIC PASS:** not re-scored in this gate; prior production bake-off: 4/10 clear, 4/10 partial, 2/10 fail  
**Z-IMAGE SEMANTIC PASS:** not run (feasibility gate failed)  
**SDXL CONTINUITY:** not run in this bake-off  
**Z-IMAGE CONTINUITY:** not run (feasibility gate failed)  
**VISUAL QUALITY WINNER:** HUMAN REVIEW REQUIRED  
**LIVE-VIABILITY:** SDXL remains viable; Z-Image rejected for this MVP (>20 s warm p50)  
**RECOMMENDED BASE MODEL:** SDXL-Lightning 4-step  
**CONFIDENCE:** HIGH for latency rejection; MEDIUM for visual comparison (no A/B quality review because gate stopped)

## Decision

Z-Image successfully ran on the RTX 3070 Ti 8 GB with W4A8 diffusion and W4A8 Qwen text encoder, but it is not live-viable at the requested product target. The three real cache-miss warm samples were 76.57 s, 47.80 s and 62.67 s (p50 62.67 s). Therefore the planned 12-scene quality bake-off and continuity chain were correctly not started. Production remains unchanged.

## 1. Exact conditions

All jobs ran sequentially on an isolated ComfyUI instance at `http://127.0.0.1:8192`, with a separate user/temp/input/output runtime. The production 8188 process and application configuration were not edited.

| Profile | Checkpoint/files | Resolution | Steps | CFG | Sampler/scheduler |
|---|---|---:|---:|---:|---|
| SDXL baseline | `sdxl_lightning_4step.safetensors` | 768×448 | 4 | 1 | Euler / `sgm_uniform` |
| Z-Image challenger | `z_image_turbo_w4a8.safetensors`, `qwen_3_4b_w4a8.safetensors`, `ae.safetensors` | 1024×1024 (official workflow default) | 8 | 1 | `res_multistep` / `simple`, AuraFlow shift 3 |

Every prompt used a unique seed, prompt id and output prefix. Comfy history showed KSampler execution; the samples were not accepted as cached-only latency. Output files were non-empty PNGs.

## 2. Feasibility latency

| Engine | Cold/client | Warm 1 | Warm 2 | Warm 3 | Warm p50 | Warm p95 | Peak VRAM observed |
|---|---:|---:|---:|---:|---:|---:|---:|
| SDXL (isolated rerun) | 118.65 s* | — | — | — | — | — | 7,653 MiB |
| Z-Image W4A8 | 127.05 s | 76.57 s | 47.80 s | 62.67 s | 62.67 s | 76.57 s | 7,724 MiB |

`*` The isolated SDXL rerun shared the GPU with the already-running production Comfy processes and is not used as the clean baseline. The clean production-profile reference set is recorded in `benchmark/image-model-benchmark-results.json`: 12 successful cache-miss runs, p50 1.70 s and p95 33.57 s (the prior 10-run summary was p95 2.04 s).

## 3. Vote-lock → image-ready target

For this image-only path, `vote_lock → image_ready` is the Comfy client round trip plus Node/HTTP/file-write overhead. In the clean SDXL reference, typical generation is about 1.4–3.0 s, so the expected image-ready time is approximately **2–4 s in the normal case**; the measured outlier raises the observed p95 to **33.57 s** when GPU contention/queue pressure occurs. Z-Image would add its measured warm generation time plus the same small overhead, yielding roughly **48–77 s warm** and therefore unacceptable live UX (>20 s reject threshold).

## 4. Z-Image output audit

The candidate loaded successfully using Comfy’s W4A8 mixed-precision path (`asym_w4a8_int8` capability). Server logs showed the Lumina2/Qwen text encoder, FLOW model and AutoencodingEngine loading. No OOM or execution error occurred in the four jobs. Representative outputs:

- `benchmark/image-engine-bakeoff/comfy-runtime/output/image_engine_bakeoff/zimage/feasibility_00_1788082025098_880000_00001_.png`
- `benchmark/image-engine-bakeoff/comfy-runtime/output/image_engine_bakeoff/zimage/feasibility_01_1788082152153_887919_00001_.png`
- `benchmark/image-engine-bakeoff/comfy-runtime/output/image_engine_bakeoff/zimage/feasibility_02_1788082228725_895838_00001_.png`
- `benchmark/image-engine-bakeoff/comfy-runtime/output/image_engine_bakeoff/zimage/feasibility_03_1788082276528_903757_00001_.png`

Raw measurements are in [image-engine-bakeoff-results.json](./image-engine-bakeoff-results.json), and the executable benchmark is [image-engine-bakeoff.mjs](./image-engine-bakeoff.mjs).

## 5. Quality and continuity scope

The challenger failed the explicit feasibility gate (`warm p50 > 20 s`), so the planned 12 semantic comparison scenes, A/B contact sheets, and 8-scene continuity chains were not run. No visual winner is claimed. This avoids treating a newer model as better without measuring result-state adherence and human-visible quality.

## 6. Recommendation

Keep SDXL-Lightning 4-step as the production base model. Its existing image-ready path is within the intended live range in normal operation, while Z-Image W4A8 is a successful but 48–77-second warm generator on this shared 8 GB setup. Do not add quantization, ControlNet, img2img, LoRA, upscaling, or prompt optimization in this bake-off. A future Z-Image investigation would be a separate, explicitly approved experiment.

## Final production state

- `IMAGE_MOTION` remains active.
- `ANIMATEDIFF_ENABLED=false` remains the default.
- YouTube remains off.
- Qwen, story-state, voting, frontend and the production SDXL workflow were not changed.
- The isolated benchmark Comfy process is not part of production.
