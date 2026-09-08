# Profile C Soft-Lock Final Text-Only Benchmark

## Summary

BASELINE SEMANTIC: 7/8 PASS (1 FAIL: activated-machine result was not clearly visible)

SOFT SEMANTIC: 7/8 PASS (1 FAIL: activated-machine result was not clearly visible)

MEDIUM SEMANTIC: 7/8 PASS (1 FAIL: activated-machine result was not clearly visible)

BASELINE CHARACTER: 4/8 PASS

SOFT CHARACTER: 6/8 PASS

MEDIUM CHARACTER: 6/8 PASS

OLD-SCENE LOCK: 0/8 for all three modes

LATENCY: baseline warm p50 2.51s / p95 6.43s; soft warm p50 2.48s / p95 2.50s; medium warm p50 2.34s / p95 2.35s

WINNER: SOFT LOCK (tie on semantic result, better character retention than baseline; medium is similar)

TEXT-ONLY CONTINUITY EXHAUSTED: YES

NEXT STEP: CONSIDER IPADAPTER (future experiment only; not installed or enabled)

## Test conditions

- Isolated ComfyUI on `127.0.0.1:8192`, production 8188 and Node stopped during generation.
- SDXL-Lightning 4-step FULL, `1024x576`, 4 steps, CFG 1, Euler, `sgm_uniform`.
- Same eight transitions and same checkpoint for every mode.
- Unique seeds and output prefixes; queue was drained before each request.
- First turn is reported separately as cold/model-load behavior; warm statistics use turns 2–8.
- No img2img, IPAdapter, ControlNet, LoRA, AnimateDiff, Qwen, or production changes.

## Prompt modes

**Baseline C:** concise result-state prompt.

**Soft lock:** fixed WORLD, PROTAGONIST and STYLE invariants; no previous composition/location carried forward.

**Medium lock:** soft lock plus one bridge anchor on the beneath-bridge transition only.

Every mode explicitly states that the new result state has priority over continuity text.

## Latency samples (seconds, client end-to-end)

| Mode | Cold | Warm samples (turns 2–8) | p50 | p95 |
|---|---:|---|---:|---:|
| Baseline | 59.13 | 6.43, 7.17, 2.96, 2.50, 2.51, 2.50, 2.33 | 2.51 | 6.43 |
| Soft | 2.65 | 2.49, 2.53, 2.34, 2.34, 2.34, 2.50, 2.48 | 2.48 | 2.50 |
| Medium | 2.34 | 2.34, 2.35, 2.33, 2.64, 2.34, 2.33, 2.35 | 2.34 | 2.35 |

All 24 generations succeeded; no OOM or Comfy errors occurred. The unusually long baseline first turn is cold model initialization and is excluded from warm statistics.

## Objective chain review

| Turn | Transition | Baseline result | Soft result | Medium result | Notes |
|---:|---|---|---|---|---|
| 1 | bridge | PASS | PASS | PASS | Bridge and lone figure clear |
| 2 | beneath bridge + light | PASS | PASS | PASS | New location occurs; light/under-bridge readable |
| 3 | forest path | PASS | PASS | PASS | Clear location change, no scene lock |
| 4 | red house exterior | PASS | PASS | PASS | Red house visible |
| 5 | wooden hallway | PASS | PASS | PASS | Interior transition visible |
| 6 | basement | PASS | PASS | PASS | Underground industrial/basement space visible |
| 7 | machine room + machine | PASS | PASS | PASS | Large machine clearly present |
| 8 | machine activated, blue light | FAIL | FAIL | FAIL | Blue room/light generated, but required machine activation was not unambiguously visible |

Character continuity was judged from silhouette/coat/protagonist placement across the chain: baseline 4/8, soft 6/8, medium 6/8. World continuity: baseline 6/8, soft 7/8, medium 7/8. Style consistency remained 7/8 for each. Anchor retention: baseline 5/8, soft 5/8, medium 6/8. No transition showed old-scene lock; every requested location change appeared in the output.

The turn-8 miss is most plausibly a mixed prompt/engine limitation: the result requirement (“activated machine”) is visually specific, while the model produced a blue-lit room without a clearly retained machine. It is not evidence to add stronger image conditioning.

## Review assets

- [Baseline chain](<C:/Users/burak/OneDrive/Desktop/SONSUZ YAYIN/benchmark/profile-c-soft-lock/BASELINE_FINAL.png>)
- [Soft-lock chain](<C:/Users/burak/OneDrive/Desktop/SONSUZ YAYIN/benchmark/profile-c-soft-lock/SOFT_LOCK.png>)
- [Medium-lock chain](<C:/Users/burak/OneDrive/Desktop/SONSUZ YAYIN/benchmark/profile-c-soft-lock/MEDIUM_LOCK.png>)
- [Blind comparison](<C:/Users/burak/OneDrive/Desktop/SONSUZ YAYIN/benchmark/profile-c-soft-lock/BLIND_COMPARISON.png>)
- [Blind key](<C:/Users/burak/OneDrive/Desktop/SONSUZ YAYIN/benchmark/profile-c-soft-lock/BLIND_KEY.json>)

These sheets are provided for human review; no subjective visual winner is asserted automatically.

## Decision

Soft lock is the best cheap text-only candidate: it improves protagonist/world continuity without carrying old composition into new scenes and stays within the live latency target. Medium is effectively tied and adds little beyond the single bridge anchor. However, neither method improves semantic pass rate over the established baseline (7/8), so this is not a reason to change production automatically.

Text-only wording experiments are exhausted for this MVP. Keep production unchanged pending human review. If identity continuity is important enough to justify a separate future experiment, the next candidate is a lightweight IPAdapter/reference test; do not install or integrate it as part of this benchmark.

## Production restoration

After the isolated run, production Comfy 8188 and Node were restarted and verified:

- 8188 `/system_stats`: PASS (HTTP 200)
- Node `/health`: `ok=true`, `comfy=true`, `qwen=true`, `engine=IMAGE_MOTION`
- `youtube=false`
- `ANIMATEDIFF_ENABLED=false` (unchanged)
- OBS audio configuration: unchanged

No production profile, frontend, story-state, voting, or media behavior was modified.
