# Option Catalogue Utilization

**Test date:** 2026-09-05  
**Scope:** scene-matched library selection only. No model, Qwen, Jung, UI, voting, audio, motion or network changes were made.

## Executive result

| Metric | Value |
|---|---:|
| TOTAL CATALOGUE | 146 scene-local templates |
| Unique viewer labels in catalogue | 126 |
| EVER ELIGIBLE | 31 templates |
| EVER SELECTED | 26 templates |
| CURRENT UTILIZATION | 83.87% of physically eligible templates |
| 300-round library pairs | 300/300 |
| Zero-pair rounds | 0 |
| Qwen fallback calls in this replay | 0 |
| Zero pair after fallback | 0 observed |
| Adjacent exact pair repeats | 0 |
| Manifest-invalid candidates selected | 0 |
| DOMINANT BOTTLENECK | pre-ranking/candidate-boundary pruning, not pool exhaustion |

**FINAL VERDICT: CATALOGUE IS BEING USED PROPERLY** for the physical manifests represented by this test. The catalogue is not 100% globally visible: 115 templates are correctly ineligible when their required entity/tag is not in the committed scene. The remaining quality ceiling is scene-vocabulary coverage, not an unbounded or stalled selector.

## 1. What was measured

The benchmark replays the last 300 production `OPTIONS_CREATED` manifest snapshots (`scene 6997` through `scene 7296`) through the production-compatible `sceneMatchedOptionLibrary()` path. It carries bounded option/event history between snapshots, uses the real committed locations/entities/adjacency, and does not call SDXL or Qwen. This isolates catalogue utilization from model latency.

The full machine-readable outputs are:

- [fixed production manifest snapshot](<<PROJECT_ROOT>\benchmark\option-catalogue-manifests.json>)
- [pre-fix replay](<<PROJECT_ROOT>\benchmark\option-catalogue-utilization-baseline-old.json>)
- [post-fix replay](<<PROJECT_ROOT>\benchmark\option-catalogue-utilization-after.json>)

Inventory is taken from the existing `OPTION_LIBRARY`; no templates or synonyms were added for this task:

- 146 scene-local templates
- 126 unique Turkish labels
- 33 behavior families
- 22 target/entity families
- 128 consequence families

## 2. Before/after result

| Metric | Before boundary fix | After boundary fix |
|---|---:|---:|
| Library pairs | 300 | 300 |
| Zero-pair rounds | 0 | 0 |
| Physically eligible templates | 31 | 31 |
| Selected eligible templates | 20 | 26 |
| Eligible-template coverage | 64.52% | **83.87%** |
| Unique labels displayed | 25 | **33** |
| Unique target families | 12 | **13** |
| Unique consequence families | 26 | **39** |
| Unique pair signatures | 131 | **228** |
| Label-level pair repeats over all 300 rounds | 169 | **72** |
| Adjacent exact pair repeats | 0 | **0** |
| Selected navigation options | 73 | **115** |
| Selected scene-local options | 527 | **485** |
| Figure-target share of selected scene-local options | 64.52% | **58.14%** |

The 72 post-fix label-pair repeats are non-adjacent repeats after the existing 20-entry pair cooldown expires (the cooldown was not changed). They are not consecutive repeats; an adjacent-repeat scan is 0/299. The increased unique-pair count (131 → 228) is the more useful long-horizon signal.

## 3. Utilization classes

### A — Never physically eligible: 115

These templates require entities/tags that do not occur in the 300 committed manifests often enough to become eligible (for example stairs, machine, radio, water, photograph or mirror). They are not “dead” because of ranking; they are correctly blocked by grounding. Memory-only entities are not counted as physical presence.

### B — Eligible but never selected: 7

The exact post-fix rows are:

| Template | Eligible turns | Why it did not surface |
|---|---:|---|
| `Sokağı takip et` | 2 | rare route; state/recent route pressure won the pair |
| duplicate `Figüre yaklaş` | 273 | same viewer label as the canonical figure approach; deterministic label dedupe/pre-ranking |
| duplicate `Figürden uzaklaş` | 140 | same viewer label as the canonical figure retreat; dedupe/pre-ranking |
| duplicate `Kapıya yaklaş` | 197 | same viewer label as canonical door approach; dedupe/pre-ranking |
| duplicate `Kapıyı arala` | 202 | same viewer label as canonical door-open action; dedupe/pre-ranking |
| duplicate `Kapının ardını dinle` | 174 | same viewer label as canonical door-listen action; dedupe/pre-ranking |
| duplicate `Yolda ilerle` | 48 | route/state cooldown and duplicate path wording; it still reached ranking in 2 turns |

This is catalogue redundancy, not a hidden physical rejection. The underlying canonical labels are selected and remain available when their state/cooldown permits.

### C — Eligible and selected: 7

Seven eligible templates had at least one selection but remained below the “frequent” threshold. Their presence confirms that the broader candidate set reaches ranking instead of being discarded at the old first-record/short-pool boundary.

### D — Frequently selected: 17

The most frequently selected rows include `Karanlıkta oyalan` (34), `Figürün arkasına bak` (33), `Figürü görmezden gel` (33), `Figürün yüzüne ışık tut` (32), `Figürün gölgesini izle` (29), `Figürü izle` (28), `Figüre elini uzat` (27), `Kapıyı arala` (26), `Figüre yaklaş` (26) and `Figürden uzaklaş` (26). These counts are a diagnostic of the supplied scene manifests: figure and threshold/path entities are common, while many other entity classes are absent.

## 4. Why valid options were not surfacing before

The fixed-snapshot before/after replay identifies three narrow bottlenecks:

1. Library scene-local candidates were sent through the stricter free-form Qwen grounding/evaluation path. Valid local actions such as a door/figure interaction could be marked as grounding/location failures even though the library had already matched the manifest tags.
2. Only a short route/local prefix reached pair scoring (`records.slice(0, 1)` plus the small candidate limit). Later declared adjacent routes and eligible local templates were therefore invisible to ranking.
3. There was no soft recent-label frequency penalty, so the same high-ranked labels repeatedly won as soon as their short cooldown expired.

**Dominant bottleneck:** the early candidate boundary (legacy grounding plus short pre-ranking pools) was the largest avoidable loss. The scene vocabulary itself was the largest unavoidable limit: 115 templates never became physically eligible because their entities were not in the committed manifests.

The minimal boundary fix in `app/lib/options.mjs` now:

- validates library candidates against their exact manifest-grounded target/state,
- sends all declared route records and the eligible local set to the existing pair scorer,
- keeps the one-navigation-per-pair rule,
- adds only a soft recent-label-use penalty and a small physical-state-progress preference,
- retains existing semantic/future/route cooldowns.

No new creative text was introduced; Node still does not invent a prop or location.

## 5. Figure-target dominance

Figure-target share fell from **64.52% to 58.14%** of selected scene-local options in the same 300-manifest replay. This is a reduction, not elimination: the production snapshots contain an anonymous figure in most scenes and the library has many legitimate figure behaviors. A figure option in those scenes is therefore grounded, not an invented motif. The remaining dominance is a manifest-composition constraint; making it lower would require different committed entities or a separate ranking/product decision, which was outside this patch.

Post-fix displayed coverage was:

- 33 unique labels
- 18 behavior families
- 13 target families
- 39 consequence families
- 228 pair signatures

The ten most-used labels were: Karanlıkta oyalan (34), Figürün arkasına bak (33), Figürü görmezden gel (33), Figürün yüzüne ışık tut (32), Kırmızı eve dön (30), Figürün gölgesini izle (29), Figürü izle (28), Figüre elini uzat (27), Kapıyı arala (26), Figüre yaklaş (26).

## 6. Selection and grounding rules now exercised

- Required tags must be present in the current committed manifest; forbidden tags still reject.
- Optional tags remain non-blocking.
- Historical/memory entities are not physical grounding.
- Navigation candidates are real adjacent graph nodes, never a self-loop; at most one navigation option is selected per pair.
- Scene-local candidates stay in the current location and target a visible entity or the committed scene.
- Existing label/future/route/pair cooldowns remain in force.
- Candidate rotation is deterministic from location, bounded display/event history and scene number inputs; it does not use unbounded randomness.

The post-fix run used the production library path and produced 300 library pairs, so no Qwen or recovery source was needed in this controlled manifest replay. In a real future scene with no valid library pair, the existing Qwen/recovery orchestration remains the secondary path; this benchmark observed **0** such invocations and **0** no-pair-after-fallback events.

## 7. Tests and regressions

Targeted additions in `test/options.test.mjs`:

- physically grounded library-local actions reach pair ranking,
- all declared routes reach ranking while final pairs retain one-navigation maximum.

Results:

- targeted options/P0 suite: **43/43 pass**
- full Node test suite: **94/94 pass**
- deterministic 300-manifest replay after fix: **300/300 library pairs**, zero zero-pair rounds
- adjacent exact pair repeats: **0**
- manifest-invalid selected options: **0**

Production health was read-only checked after the benchmark: Node `/health` HTTP 200 (`comfy=true`, `qwen=true`, `youtube=false`, `engine=IMAGE_MOTION`), Comfy `/system_stats` HTTP 200, Qwen `/health` HTTP 200.

**Runtime reload note:** the source patch is saved, but the already-running Node PID could not be stopped from this sandbox (Windows access denied; escalation was rejected by the environment quota). No force-kill workaround was used. The current process remains healthy; the updated selector will load on the next normal Node restart.

## 8. Files changed

- `app/lib/options.mjs` — narrow library grounding/candidate-boundary and soft ranking changes; diagnostic trace exports.
- `test/options.test.mjs` — two deterministic regression tests.
- `benchmark/option-catalogue-utilization.mjs` — fixed-snapshot utilization replay and route-attribution diagnostics.
- `benchmark/option-catalogue-manifests.json` — immutable 300-event manifest snapshot used by the replay.
- `benchmark/option-catalogue-utilization-baseline-old.json` — pre-fix replay evidence.
- `benchmark/option-catalogue-utilization-after.json` — post-fix replay evidence.
- `benchmark/OPTION_CATALOGUE_UTILIZATION.md` — this report.

## Recommendation

The catalogue is being used correctly for the physical vocabulary actually present in current scenes: every replay turn produced a grounded library pair, eligible-template coverage improved from 64.52% to 83.87%, and no round stalled. Do not add more synonyms to solve the remaining visible repetition. If more surface variety is required, the next bounded decision should be to broaden committed scene entities/locations or explicitly revise ranking; that is a separate product experiment, not part of this completed utilization fix.
