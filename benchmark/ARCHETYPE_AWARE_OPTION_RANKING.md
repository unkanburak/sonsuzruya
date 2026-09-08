# ARCHETYPE-AWARE OPTION RANKING + OPTION RICHNESS

## STATUS

**PASS — implementation and deterministic validation complete.**

Production recommendation: **KEEP DISABLED by default** until the 15-step trajectory is reviewed by a human. The layer is ready for an opt-in local/staging trial with `ARCHETYPAL_OPTION_BIAS_ENABLED=1`.

Core rule preserved:

> Jung does not generate options. Jung only scores options that are already physically valid in the current world state.

## IMPLEMENTATION

Changed files:

- `app/lib/option-library.mjs`
  - Maps the existing bounded behavior families to bounded psychological vectors.
  - Exposes `psychologicalVectorForBehavior()`.
  - Adds `psychological_vector` to normalized option-template metadata.
- `app/lib/options.mjs`
  - Adds archetype/vector affinity heuristics.
  - Adds psychological vector and target extraction for valid candidates.
  - Applies archetype scoring only after the existing grounding, route, entity-state, cooldown, future-signature and repeat gates.
  - Adds pair bonuses for different psychological vectors and, where possible, an aligned/counter-vector pair.
  - Adds an 8-record `archetype + vector + target` soft cooldown.
  - Preserves psychological metadata in bounded `recent_option_records`.
- `app/server.mjs`
  - Records the displayed options' vector, target and active archetype.
  - Adds non-invasive `psychologicalTrace` telemetry to `OPTIONS_CREATED` forensic logs.
- `app/lib/jungian-dream-engine.mjs`
  - Tightens Persona and Wise Figure visual-hint wording to treatment-only instructions.
  - Persona keeps the existing window/glass geometry and entity state unchanged.
  - Wise Figure keeps all architecture, structures and environment unchanged.
- `test/archetypal-option-ranking.test.mjs`
  - Adds focused ranking, grounding, pressure, contrast, cooldown and disabled-flag regression tests.
- `test/jungian-dream-engine.test.mjs`
  - Updates one stale Qwen request assertion to the current bounded, current-scene-only fallback contract. Runtime behavior is unchanged.
- `benchmark/archetypal_option_ranking_benchmark.mjs`
  - Adds deterministic enabled/disabled 100-round comparison and a readable 15-step trajectory.

No SDXL, Qwen, route graph, voting, UI, audio, motion, public deployment or Jung psyche-calculation behavior was changed.

## PSYCHOLOGICAL VECTOR MODEL

The library remains the source of truth. Its existing behavior metadata is mapped to a bounded vocabulary:

`approach`, `confront`, `avoid`, `reveal`, `conceal`, `follow`, `refuse`, `protect`, `abandon`, `interrupt`, `observe`, `alter`, `control`, `separate`, `wait`, `explore`.

Coverage in the current library:

- templates: **146**
- distinct viewer-facing Turkish labels: **126**
- behavior families: **32**
- mapped psychological vectors: **16**
- psychological vectors observed in the 100-round flow: **13**

This mapping does not create new wording, entities or routes. It classifies already-existing grounded options.

## ARCHETYPE AFFINITY

Affinity is a lightweight creative heuristic, not a Jung theory simulator and not an eligibility gate.

Examples of configured tendencies:

- Shadow: aligned with `confront`, `reveal`, `approach`, `refuse`; countered by `avoid`, `conceal`, `withdraw`.
- Persona: aligned with `reveal`, `conceal`, `observe`, `separate`; countered by `accept`, `integrate`.
- Trickster: aligned with `interrupt`, `alter`, `refuse`, `explore`; countered by `protect`, `wait`, `accept`.
- Self: aligned with `integrate`, `accept`, `wait`, `approach`; countered by `separate`, `abandon`, `refuse`.
- Wise Figure: aligned with `follow`, `observe`, `accept`, `explore`; countered by `interrupt`, `refuse`, `abandon`.
- Child: aligned with `protect`, `approach`, `explore`; countered by `avoid`, `withdraw`.
- Mother Field: aligned with `protect`, `accept`, `integrate`, `withdraw`; countered by `abandon`, `separate`, `interrupt`.
- Anima/Animus: aligned with `approach`, `reveal`, `follow`, `integrate`; countered by `withdraw`, `conceal`, `separate`.

The bonus scales with the existing `archetypal_pressure`. Low pressure produces little or no practical ranking movement. High pressure still cannot bypass an invalid route, absent entity, entity-state rule, future-signature guard or cooldown.

## PAIR CONTRAST

The existing physical pair rules remain higher priority. After those rules pass, the scorer softly prefers:

- different behavior families,
- different visible consequences,
- different target entities,
- different psychological vectors,
- and, when the pool supports it, one archetype-aligned vector plus one compensatory vector.

Result in the enabled 100-round run: **99/100 pairs** had two different psychological vectors.

No archetype name is exposed in the viewer-facing label or consequence.

## GROUNDING

Ranking order is strictly:

1. current manifest/entity grounding,
2. current entity state,
3. real route validation,
4. exact/near repeat and future-signature guards,
5. pair physical diversity,
6. archetypal soft scoring.

Therefore an archetype cannot:

- introduce a prop,
- introduce a figure,
- introduce a location,
- create a route,
- revive a memory-only entity as physically present,
- or turn an invalid candidate into a valid one.

The 100-round run produced **0 manifest-invalid candidates**.

## DIVERSITY

The 100-round enabled run was compared with the same deterministic harness while the flag was disabled:

| Metric | Bias enabled | Bias disabled |
|---|---:|---:|
| Completed displayed rounds | 100 | 100 |
| Unique labels | 57 | 56 |
| Unique future signatures | 59 | 57 |
| Psychological vectors observed | 13 | 13 |
| Psychologically contrasted pairs | 99 | 94 |
| Library exhaustion opportunities | 8 | 9 |
| Exact pair repeats | 0 | 0 |
| Manifest-invalid | 0 | 0 |

The archetype bias did not reduce label/future diversity in this deterministic comparison.

The most frequent vector was `avoid`: **38/200 displayed options (19%)**. The most frequent exact target/vector combination was `figure + follow`: **11/200 (5.5%)**. No single vector or target/vector combination dominated the run.

## TESTS

Application test suite:

- **69/69 passed**
- syntax checks passed for all modified runtime and benchmark modules

Focused coverage includes:

- Shadow affinity can favor grounded confront/reveal behavior.
- Manifest-invalid candidates remain ineligible under high pressure.
- Persona cannot invent glass, a mirror, a window or a mask.
- High pressure cannot bypass exact/future cooldown rules.
- Rich candidate pools prefer different psychological vectors.
- Repeated `archetype + vector + target` combinations are softly deprioritized.
- With the flag disabled, baseline selection behavior is preserved.

## 100-ROUND RESULT

| Metric | Result |
|---|---:|
| Requested displayed rounds | 100 |
| Completed displayed rounds | 100 |
| Library pair success | 100 displayed pairs |
| Library exhaustion opportunities | 8 |
| Unique labels | 57 |
| Unique future signatures | 59 |
| Unique psychological vectors | 13 |
| Unique archetype/vector combinations | 72 |
| Psychologically contrasted pairs | 99/100 |
| Exact pair repeats | 0 |
| Manifest-invalid | 0 |
| Location changes | 5 |
| Entity-state mutations | 92 |
| Archetype-aligned selections | 70 |
| Compensatory selections | 16 |
| Most repeated vector | avoid — 38/200 |
| Most repeated target/vector | figure + follow — 11/200 |

`futureSignatureRepeats = 141` is the raw cross-context reuse count across 200 displayed options. It includes a valid reusable future appearing after the harness explicitly establishes a new scenario/world state. It is not a same-state guard failure. The separately measured **same-world-state future-signature guard violations are 0**.

The 8 library-exhaustion opportunities are not stalled displayed rounds. In real production they proceed to the existing Qwen fallback. The benchmark remained deterministic and did not call Qwen; it moved to the next declared production-compatible manifest until 100 displayed library pairs were collected.

Raw data:

- `benchmark/archetypal-option-ranking-results.json`
- `benchmark/archetypal-option-ranking-baseline.json`

## 15-STEP TRAJECTORY

| # | Scene | Archetype / pressure | Option 1 (vector) | Option 2 (vector) | Winner | Visible consequence | State change / next scene |
|---:|---|---|---|---|---|---|---|
| 1 | red_house_exterior | Shadow / 0.350 | Kapının ardını dinle (observe) | Figüre yaklaş (approach) | Kapının ardını dinle | A quiet sound is now audible beyond the established door | same scene |
| 2 | red_house_exterior | Shadow / 0.318 | Karanlıkta oyalan (avoid) | Figürü görmezden gel (refuse) | Karanlıkta oyalan | Darkness gathers at the scene edges | scene state mutated |
| 3 | red_house_exterior | Shadow / 0.289 | Kapıyı tamamen aç (confront) | Kapının arkasına bak (reveal) | Kapıyı tamamen aç | The established doorway opens to the same threshold | same scene |
| 4 | red_house_exterior | Shadow / 0.264 | Kırmızı eve yaklaş (explore) | Figürün arkasına bak (reveal) | Kırmızı eve yaklaş | The figure reaches the red-house doorstep | red_house_doorstep |
| 5 | red_house_doorstep | Shadow / 0.242 | Kapıya yaklaş (approach) | Figürün gölgesini izle (follow) | Kapıya yaklaş | The established door is directly before the figure | door state mutated |
| 6 | red_house_doorstep | Shadow / 0.222 | Figürden uzaklaş (avoid) | Sessizce bekle (wait) | Figürden uzaklaş | The anonymous figure is farther away | figure state mutated |
| 7 | red_house_doorstep | Shadow / 0.205 | Kırmızı eve dön (explore) | Kapıyı kapat (conceal) | Kapıyı kapat | The established door closes | door state mutated |
| 8 | red_house_doorstep | Shadow / 0.190 | Evin içine gir (explore) | Figürü takip et (follow) | Evin içine gir | The figure reaches the hallway | red_house_hallway |
| 9 | red_house_hallway | Shadow / 0.177 | Kırmızı eve yaklaş (approach) | Merdivene yönel (follow) | Kırmızı eve yaklaş | The figure returns to the doorstep | red_house_doorstep |
| 10 | red_house_doorstep | Shadow / 0.165 | Ön kapıyı aç (explore) | Kapının ardını dinle (observe) | Ön kapıyı aç | The established front door is open | same scene |
| 11 | red_house_doorstep | Trickster / 0.168 | Figürden uzaklaş (abandon) | Evin içine gir (follow) | Figürden uzaklaş | The figure is farther from the current scene | same scene |
| 12 | red_house_doorstep | Trickster / 0.177 | Kırmızı eve dön (approach) | Evin içine gir (follow) | Kırmızı eve dön | The figure is outside the red house | red_house_exterior |
| 13 | red_house_exterior | Trickster / 0.165 | Ön yola ilerle (explore) | Figürü görmezden gel (refuse) | Figürü görmezden gel | The figure remains at the edge of attention | figure state mutated |
| 14 | red_house_exterior | Trickster / 0.174 | Figüre yaklaş (approach) | Kapının arkasına bak (reveal) | Figüre yaklaş | The anonymous figure is closer | figure state mutated |
| 15 | red_house_exterior | Trickster / 0.163 | Kırmızı eve yaklaş (approach) | Çatlak yolda ilerle (follow) | Kırmızı eve yaklaş | The figure reaches the doorstep | red_house_doorstep |

Trajectory source distribution: **10 library / 5 bounded recovery**. Recovery remained the existing emergency liveness layer; the new archetype scorer did not create recovery text or alter its rules.

## VISUAL HINT TIGHTENING

The option scorer and image visual-hint layer remain independent feature flags.

Minimal wording changes were made only to address the prior A/B review risks:

- Persona hints may change reflection/lighting treatment while explicitly preserving the existing window/glass geometry, architecture and entity state.
- Wise Figure hints may change only established figure/light/framing treatment while explicitly preserving architecture, walls, structures and environment.
- A psychologically aligned winner does not force an archetypal visual hint.

The existing grounded visual-hint tests remain green.

## REGRESSIONS

- Application tests: **69 passed, 0 failed**.
- Enabled vs disabled deterministic comparison shows no loss of unique labels, future signatures, exact-pair safety or grounding.
- Qwen remains fallback-only and its runtime contract was not changed.
- `ARCHETYPAL_OPTION_BIAS_ENABLED` is read independently from the visual-hint flag.
- Unset/anything other than `1` means disabled, so current production behavior remains unchanged.

## KNOWN LIMITATION

- The scorer can only create psychological contrast when the grounded candidate pool already contains real behavioral contrast. It deliberately does not invent a counter-option.
- The 15-step human-readable trajectory reaches the existing bounded recovery layer in 5 steps. This reflects underlying scene-pool exhaustion/route history, not archetype-created content.
- `accept`, `integrate`, `surrender` and `withdraw` do not appear as separate library vectors because the current physical behavior catalog has no safe, distinct grounded behaviors requiring those classifications. Synonym templates were not added merely to inflate counts.
- The 100-round run is deterministic and production-compatible, but it is not a substitute for a human watching a live voting session.

## RECOMMENDATION

**KEEP DISABLED in production for now.**

The implementation is technically safe and meets the requested simulation gates. The next appropriate step is a short human-reviewed local/staging session with only `ARCHETYPAL_OPTION_BIAS_ENABLED=1`. If viewers perceive the pairs as more meaningfully contrasted without feeling forced, the flag can then be considered for production. The independent visual-hint flag should remain governed by its own review.

