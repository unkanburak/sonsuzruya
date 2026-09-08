# Single-Stage Last-Frame → I2V Feasibility

SINGLE-STAGE ENGINE TESTED: AnimateDiff-Lightning 2-step (approximate image-conditioned motion)
TRUE I2V: NO — the installed workflow VAE-encodes the input frame and repeats its latent across 16 frames
SDXL USED: NO
COLD LATENCY: 31.46 s client / 30.07 s Comfy server log
WARM P50: 9.70 s client / 8.47 s Comfy server log
WARM P95: 22.02 s client / 20.83 s Comfy server log
SEMANTIC PASS: 0 / 10
CONTINUITY PASS: 10 / 10 (visual doorway/character composition remained, but the requested state did not change)
LAST-FRAME CHAIN: PARTIAL — technically chained for all 10 turns; semantically failed
OOM: 0
MAIN FAILURE MODE: AnimateDiff preserved the source composition and did not visibly realize the new result-state prompts.
VERDICT: REJECT as a single-stage story I2V engine; RETAIN as a motion-enhancer candidate only.

## 1. Existing local engine audit

- `DreamShaper_8_pruned.safetensors` is installed locally.
- `animatediff_lightning_2step_comfyui.safetensors` is installed locally.
- ComfyUI-AnimateDiff-Evolved and VideoHelperSuite are installed and loaded by the isolated 8191 instance.
- The installed AnimateDiff workflow is approximate image-conditioned motion, not native first-frame I2V: `LoadImage → VAEEncode → RepeatLatentBatch → KSampler`.
- `ltxv-2b-0.9.6-distilled-04-25.safetensors` and `t5xxl_fp8_e4m3fn.safetensors` are present, but previous LTX tests were minute-class (>30 seconds warm for short clips). No new LTX test or model installation was performed in this spike.
- No production file imports this experiment.

## 2. Exact workflow and conditions

- Isolated ComfyUI: `http://127.0.0.1:8191`
- Isolated writable paths: `benchmark/single-stage/input`, `output`, `temp`, `user`
- Base checkpoint: `DreamShaper_8_pruned.safetensors`
- Motion model: `animatediff_lightning_2step_comfyui.safetensors`
- Resolution: 384×224 requested by workflow; Comfy output encoded at 512×288
- 16 frames, 8 fps, 2 steps, CFG 1, Euler, `sgm_uniform`, denoise 0.55
- Unique seed, input filename, prompt identifier and output prefix per turn
- Queue empty before every turn; history completion and non-empty MP4 were required
- No SDXL generation was used anywhere in the chain

Script: `benchmark/single-stage-i2v-feasibility.mjs`
Raw results: `benchmark/single-stage-i2v-results.json`
Server log: `benchmark/single-stage/comfy8191.stderr.log`
Final-frame contact sheet: `benchmark/single-stage/contact-sheet.png`

## 3. Latency

### Client measurements

| Sample | Seconds |
|---|---:|
| Cold turn 1 | 31.46 |
| Warm turn 2 | 12.12 |
| Warm turn 3 | 14.70 |
| Warm turn 4 | 5.85 |
| Warm turn 5 | 9.70 |
| Warm turn 6 | 8.57 |
| Warm turn 7 | 12.72 |
| Warm turn 8 | 22.02 |
| Warm turn 9 | 6.32 |
| Warm turn 10 | 9.55 |

Warm client p50 is 9.70 seconds and warm client p95 is 22.02 seconds.

### Comfy server execution log

The clean chain’s server-side `Prompt executed in` values were:

`30.07, 10.72, 13.37, 4.53, 8.47, 7.43, 10.99, 20.83, 5.18, 8.18` seconds.

For the nine warm observations, server-log warm p50 is **8.47 s** and p95 is **20.83 s**. Earlier failed/retried jobs remain in the log but are excluded from these clean-chain metrics.

All 10 jobs produced a non-empty MP4 and a decoded final PNG. No OOM or execution error occurred.

## 4. Ten semantic transitions

| Turn | Requested transition | Semantic | Continuity | Observation |
|---:|---|---|---|---|
| 1 | Outside house → inside hallway | FAIL | PASS | Doorway/figure remained; interior state was not clearly changed |
| 2 | Hallway → underground basement | FAIL | PASS | Same doorway composition |
| 3 | Basement → glowing machine | FAIL | PASS | No machine appeared |
| 4 | Machine → machine switched on | FAIL | PASS | No machine/blue-light state appeared |
| 5 | Room → flooded room | FAIL | PASS | No visible flooding |
| 6 | Flooded room → submerged tunnel entrance | FAIL | PASS | No tunnel appeared |
| 7 | Tunnel → misty stone bridge | FAIL | PASS | No bridge appeared |
| 8 | Bridge → light beneath bridge | FAIL | PASS | No under-bridge light appeared |
| 9 | Light → red-fog portal | FAIL | PASS | No portal/red field appeared |
| 10 | Portal → alien landscape | FAIL | PASS | No alien landscape appeared |

Human review was performed from the generated final-frame contact sheet. The subject silhouette and doorway/room geometry were stable, so continuity in the narrow visual sense passed, but this stability was caused by prompt non-adherence rather than useful world continuation.

## 5. Real last-frame chain

The chain used the actual extracted final frame from each successful MP4 as the next `LoadImage` input. It did not reset to the initial frame. All 10 handoffs were technically valid and decodable.

The chain therefore proves that last-frame file handoff works, but not that the engine can transform the scene into the selected result. The repeated doorway composition persisted across the chain while semantic state transitions were ignored.

## 6. Failure cases and limitations

- AnimateDiff-Lightning is being used as a motion layer around a repeated input latent, not as a true image-to-video continuation model.
- The result-state prompt can influence style/lighting weakly, but it did not reliably create a new location or object in this chain.
- Continuity and semantic adherence are coupled here: the model kept continuity by refusing the requested transition.
- The first clean run required a cold model initialization; warm latency was variable and server p95 exceeded 30 seconds.

## 7. Comparison with current architecture

| Architecture | Strength | Weakness |
|---|---|---|
| Current SDXL → AnimateDiff | SDXL can explicitly create a new result-state image; AnimateDiff adds motion | Two stages, GPU contention and high integrated latency |
| Single-stage last-frame → AnimateDiff | One stage; real final-frame handoff works; no SDXL latency | Installed AnimateDiff workflow is not semantic I2V; selected outcomes were 0/10 |

## 8. Recommendation

Do not promote this single-stage path. It fails the required semantic threshold (`0/10 < 5/10`) despite successful technical chaining and acceptable median warm timing.

Keep the production `IMAGE_MOTION` system unchanged. AnimateDiff may remain an optional motion-enhancer experiment, but it is not suitable for generating the next story scene directly from `last frame + selected result` with the currently installed workflow.

## 9. Final production state

- `IMAGE_MOTION` remains active.
- `ANIMATEDIFF_ENABLED=false` remains the default.
- Production AnimateDiff timeout remains 10 seconds.
- YouTube remains off.
- No Qwen, story-state, voting, frontend, model, or production workflow changes were made.
- The isolated 8191 process was stopped after the experiment; 8188 production Comfy health was preserved.
