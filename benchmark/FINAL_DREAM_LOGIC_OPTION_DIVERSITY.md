# Final Dream-Logic + Option Diversity Pass

## STATUS

**PASS — staging/benchmark implementation complete.** The existing scene-matched library architecture is preserved. No SDXL, Qwen role, Jung calculation, route graph, UI, voting, audio, motion, networking, or production feature-default change was made.

The final engine contract is now:

`current manifest + current entity state + grounded action -> visible consequence + bounded state mutation -> changed next option space`

## NON-VISUAL CLEANUP

- Static-PNG consequences are checked by `staticVisibleConsequence()`.
- Pure sound, smell, thought, feeling, temperature, memory, invisible presence, and time-passing results are rejected.
- Existing listening-style labels were retained only where their consequence is visibly renderable. Examples:
  - `Kapının ardını dinle` -> the already-established shadow under the door visibly shifts.
  - `Radyoyu dinle` -> the established radio dial visibly pulses.
  - `Pencereden gelen sesi dinle` -> the established reflection visibly shifts.
- No replacement consequence invents a new prop or location.
- 200-round result: **0 non-visual consequences**.

## STATE CONSISTENCY

- Physical scene-local futures now require a bounded `entity_state_mutation`.
- Door progression is explicit: `closed -> ajar -> open`; an already-open door cannot offer the same open future again.
- Machine and radio activation/deactivation have bounded on/off state transitions.
- Figure distance, shadow, light, path, reflection, window, water, object, and scene-local changes use a small reusable state vocabulary.
- Scene-local commits preserve all current physical manifest entities. Only a real location transition hydrates the destination vocabulary.
- `applyStatePatch()` preserves and commits the mutation instead of overwriting it during manifest normalization.
- 200-round result: **0 physical mutations with null stateChange**; **192 entity mutations**, **6 location transitions**, **56 unique state transitions**.

## OPTION DIVERSITY

- Pair selection prioritizes different target, behavior family, psychological vector, visible consequence, and resulting state.
- Semantic future identity is composite: `target + behavior + psychological vector + consequence family + resulting state`.
- Same wording can return only for a genuinely different future. Different wording for the same world future is treated as repetition.
- Scene-local selection requires both a visible consequence and a real mutation.
- The direct library completion path also rejects two candidates with the same semantic future.
- 200 rounds produced **65 unique Turkish labels** and **76 unique semantic futures**.
- Exact pair repeats: **0**.
- Same-world semantic-repeat violations: **0**.

## PSYCHOLOGICAL CONTRAST

- Archetypes remain soft ranking signals only; they cannot create candidates or bypass grounding/state gates.
- Avoidance was split into materially different vectors where behavior differs (`avoid`, `withdraw`, `abandon`).
- 200-round coverage: **13 psychological vectors**.
- Counts across 400 displayed options: approach 63, reveal 58, follow 50, explore 48, avoid 40, observe 35, accept 28, refuse 23, withdraw 21, protect 11, alter 9, control 7, abandon 7.
- No one vector forms a majority. The most common target/vector was `shadow + follow`, 17/400 (**4.25%**).

## DREAM LOGIC

- Surreal consequences remain causal: they originate from a current entity, current state, selected action, and optionally a soft archetypal preference.
- High archetypal pressure cannot make a missing machine, figure, reflection, route, or other physical entity eligible.
- State mutations close consumed futures and expose changed/new futures on the next turn.
- The engine does not spawn portals, vehicles, buildings, strangers, masks, or undeclared routes.
- 200-round manifest-invalid count: **0**.

## ROUTE/LOCAL RHYTHM

- Navigation remains limited to declared adjacent nodes and self-loops remain invalid.
- Scene-local choices do not invent destinations.
- `location_dwell_turns` is bounded. After three local commits, a valid unused route receives a soft preference rather than a forced slot.
- This preserves local interaction while avoiding indefinite stationary behavior and route-only “corridor simulator” behavior.
- The representative 20-step trajectory contains **3 real location changes** and **17 scene-local/stateful steps**.

## RECOVERY RATE

- Representative 20-step trajectory: **3/20 bounded recovery = 15%**, meeting the `<=20%` target.
- 200-round matrix: library produced all **200 measured pairs**; bounded recovery supplied **0 measured pairs**.
- During scenario probing, library exhaustion occurred in 3 synthetic `dark_room` states. Those states are recorded as Qwen-fallback opportunities; the benchmark continued with later scenarios and still collected 200 complete measured rounds.
- This is not hidden as a success: if Qwen were also unavailable in exactly those saturated synthetic states, the deterministic layers alone would have no pair. Production behavior is to invoke the preserved Qwen fallback. No evidence from this benchmark shows a normal production stall, but this is the remaining liveness limitation.

## TESTS

Focused tests added/confirmed:

- A — non-visual consequence rejected: PASS
- B — visible door-open future must carry mutation: PASS
- C — state mutation closes the old option: PASS
- D — mutation opens/changes at least one next candidate: PASS
- E — same wording/different real future handled correctly: PASS
- F — different wording/same future treated as repeat: PASS
- G — archetype pressure cannot bypass grounding/state: PASS
- H — navigation self-loop and near route repetition impossible: PASS
- I — recovery cannot introduce a missing manifest entity: PASS

Full regression suite: **78/78 PASS**, 0 failed, 0 skipped.

## 200-ROUND

| Metric | Result |
|---|---:|
| Requested measured rounds | 200 |
| Completed measured rounds | 200 |
| Unique labels | 65 |
| Unique semantic futures | 76 |
| Unique psychological vectors | 13 |
| Unique state transitions | 56 |
| Exact pair repeats | 0 |
| Same-world semantic-repeat violations | 0 |
| Manifest-invalid options | 0 |
| Non-visual consequences | 0 |
| Physical mutation with null stateChange | 0 |
| Location changes | 6 |
| Entity mutations | 192 |
| Library-source measured pairs | 200 |
| Bounded-recovery measured pairs | 0 |
| Qwen fallback opportunities | 3 |
| Synthetic deterministic zero-pair states | 3 |
| Most repeated target/vector | shadow/follow — 17/400 |
| Most repeated future family | 16/400 (4.0%) |

Raw machine-readable results: `benchmark/dream-logic-final-results.json`.

## 20-STEP HUMAN TRAJECTORY

All consequences below are visible in a still image. `before -> after` shows the committed state mutation or physical route result.

| # | Scene | Archetype / pressure | Option 1 — vector — visible future | Option 2 — vector — visible future | Winner | State before -> after | Next scene | Source |
|---:|---|---|---|---|---|---|---|---|
| 1 | red_house_exterior | shadow / .350 | Kırmızı eve yaklaş — explore — figure at doorstep | Kapının arkasına bak — reveal — space behind door visible | Kapının arkasına bak | door closed -> revealed | red_house_exterior | library |
| 2 | red_house_exterior | shadow / .318 | Figürü görmezden gel — refuse — figure at attention edge | Figürün arkasına bak — reveal — detail behind figure visible | Figürü görmezden gel | figure far -> peripheral | red_house_exterior | library |
| 3 | red_house_exterior | shadow / .289 | Figüre yaklaş — approach — figure closer | Figürün gölgesini izle — follow — shadow reaches across scene | Figüre yaklaş | figure peripheral -> near | red_house_exterior | library |
| 4 | red_house_exterior | shadow / .264 | Ön yola ilerle — explore — figure on front path | Figürden uzaklaş — avoid — figure farther away | Ön yola ilerle | location transition | front_path | library |
| 5 | front_path | shadow / .242 | Kırmızı eve dön — explore — figure at house exterior | Kapıya yaklaş — approach — door directly before figure | Kapıya yaklaş | door revealed -> near | front_path | library |
| 6 | front_path | shadow / .222 | Sokağa doğru ilerle — explore — figure on quiet street | Yoldan kenara çekil — avoid — figure leaves path center | Yoldan kenara çekil | path unset -> far | front_path | library |
| 7 | front_path | shadow / .205 | Yolun başında bekle — accept — path remains open | Yoldaki izi ortaya çıkar — reveal — existing trace becomes visible | Yolun başında bekle | path far -> held | front_path | library |
| 8 | front_path | shadow / .190 | Yolun çatlağını izle — follow — crack forms direction | Yolda ilerle — explore — figure farther along path | Yolun çatlağını izle | path held -> traced | front_path | library |
| 9 | front_path | shadow / .177 | Karanlıkta oyalan — avoid — darkness gathers at edges | Kapının ardını dinle — observe — door shadow visibly shifts | Karanlıkta oyalan | scene unset -> far | front_path | library |
| 10 | front_path | trickster / .175 | Yolun çevresinde dolaş — explore — path differs from other side | Figürü takip et — follow — figure leads through scene | Yolun çevresinde dolaş | path traced -> repositioned | front_path | library |
| 11 | front_path | trickster / .183 | Figürden uzaklaş — abandon — figure farther from scene | Ön kapıyı aç — explore — established door open | Figürden uzaklaş | figure near -> far | front_path | bounded_recovery |
| 12 | front_path | trickster / .190 | Kırmızı eve dön — observe — figure outside house | Sokağa doğru ilerle — approach — figure on quiet street | Kırmızı eve dön | location transition | red_house_exterior | bounded_recovery |
| 13 | red_house_exterior | trickster / .177 | Kapının arkasına bak — reveal — rear space visible | Figürü görmezden gel — refuse — figure at attention edge | Kapının arkasına bak | door near -> revealed | red_house_exterior | library |
| 14 | red_house_exterior | trickster / .184 | Kırmızı eve yaklaş — explore — figure at doorstep | Figürün arkasına bak — reveal — rear detail visible | Figürün arkasına bak | figure far -> revealed | red_house_exterior | library |
| 15 | red_house_exterior | trickster / .191 | Ön yola ilerle — explore — figure on front path | Figüre yaklaş — approach — figure closer | Figüre yaklaş | figure revealed -> near | red_house_exterior | library |
| 16 | red_house_exterior | trickster / .178 | Figürün gölgesini izle — follow — shadow reaches across scene | Kapıya yaklaş — approach — door directly before figure | Figürün gölgesini izle | figure near -> leading | red_house_exterior | library |
| 17 | red_house_exterior | trickster / .185 | Kırmızı eve yaklaş — approach — figure at doorstep | Çatlak yolda ilerle — approach — figure farther along path | Çatlak yolda ilerle | location transition | front_path | bounded_recovery |
| 18 | front_path | trickster / .192 | Yoldan kenara çekil — avoid — figure outside path center | Yolun başında bekle — accept — path remains open | Yoldan kenara çekil | path repositioned -> far | front_path | library |
| 19 | front_path | trickster / .198 | Yolun çatlağını izle — follow — crack forms direction | Yoldaki izi ortaya çıkar — reveal — existing trace visible | Yolun çatlağını izle | path far -> traced | front_path | library |
| 20 | front_path | trickster / .203 | Kapının ardını dinle — observe — door shadow visibly shifts | Yolda ilerle — explore — figure farther along path | Kapının ardını dinle | scene far -> door_shadow_shifted | front_path | library |

Human-read conclusion:

- Options describe two materially different futures in normal library rounds.
- Winners leave a bounded state trace and affect the next pool.
- Surrealism is derived from existing light, shadow, reflection, machine, figure, path, water, or object affordances.
- No silent-PNG-incompatible consequence appears.
- Route/local rhythm remains mostly local but advances after sustained dwell.
- The three recovery rounds are clustered around exhausted local option space; they do not exceed the acceptance limit.

## REGRESSIONS

- Scene-matched option library architecture: unchanged.
- Manifest and memory separation: preserved.
- Route graph and self-loop rejection: preserved.
- Future-signature and recent-history guards: preserved and made state-aware.
- Jung/archetype engine: preserved as soft scoring only.
- Qwen: still fallback-only.
- SDXL Profile C, voting, UI, audio, motion, networking: untouched.
- Archetypal option bias remains independently flaggable; archetypal visual hints remain a separate feature.

## KNOWN LIMITATION

The option engine reasons from the committed scene manifest, not from image pixels. If SDXL visibly deviates from that manifest, this layer cannot detect the mismatch. Three saturated synthetic `dark_room` states exhausted both deterministic library and bounded recovery, so those cases still depend on the existing Qwen fallback for liveness. This is bounded and did not affect the 20-step recovery acceptance rate, but it should be watched during real-user testing.

## RECOMMENDATION

**LOCK ENGINE.** The defined acceptance gates pass. Do not add more option/Jung features unless real user sessions expose one repeatable, state-specific failure.

DREAM LOGIC ENGINE READY
