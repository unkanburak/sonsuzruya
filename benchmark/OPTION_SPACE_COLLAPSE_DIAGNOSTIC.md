# Normal Option Space Collapse — Root Cause and Validation

## Scope

The historical production window was scenes **4171–4200** (30 displayed
rounds). No Qwen, validator, timeout, SDXL, Jung, UI, route, or recovery
content was changed. One narrowly scoped library cooldown fix was applied
after the read-only diagnosis.

## Root cause

The dominant cause was **A — history too global**.

`sceneMatchedOptionLibrary()` converted the bounded display ledger into a hard
exact-label blacklist. A label shown in another location, or many turns ago,
could therefore remove a currently grounded route/local candidate. The
structured semantic/future and route-repeat gates already provide the longer
horizon protection; the exact-label gate was duplicating that protection and
starving the pair selector.

Secondary evidence was **B/C**, but not the dominant cause:

- `basement_door`: 3/3 historical manifests omitted the canonical `basement
  door` entity even though the destination vocabulary defines it. This is a
  thin persisted manifest in that old run.
- `basement`: 3 manifests were canonical; `stairwell` (11) and
  `red_house_hallway` (10) were sparse by design but internally consistent.
  Their local pools were small, yet the full-history label blacklist was what
  removed otherwise valid candidates.
- No evidence of an invalid state, graph terminal state, or manifest-invalid
  publication was found.

## Historical 4171–4200 evidence

All 26 exhausted rounds emitted `QWEN_LIVENESS_DEADLINE` and then
`bounded_recovery_exhausted`; the persisted `QWEN_OPTIONS_REJECTED` events had
no candidate diagnostics because the user-facing deadline won before a usable
Qwen trace was available. Thus the event log cannot honestly claim per-candidate
Qwen reject counts for this old window. It does prove the recovery trigger and
the committed manifest for every round.

| Location | Exhausted rounds | Entities observed | Adjacent locations | Classification |
|---|---:|---|---|---|
| basement | 3 | underground basement, anonymous figure, basement | basement_door, machine_room | A (history starvation; canonical vocabulary present) |
| basement_door | 3 | anonymous figure | red_house_hallway, basement | B + A (thin persisted entity list plus history starvation) |
| stairwell | 11 | stairwell, anonymous figure | red_house_hallway, basement | A/C (small local pool, then globally blacklisted) |
| red_house_hallway / hallway | 10 | hallway entity, anonymous figure | stairwell, basement_door | A/C (small local pool, then globally blacklisted) |

The repeated hallway/stairwell recovery alternation was therefore a feedback
loop after normal library pair selection had been starved; it was not a graph
terminal condition. There were **0 stuck rounds**, **0 manifest-invalid pairs**,
and **0 duplicate `OPTIONS_CREATED` events** in the window.

## Minimal fix

In `app/lib/options.mjs`, only the exact-label set used by
`sceneMatchedOptionLibrary()` was changed from the entire ledger to
`previous.slice(-NEAR_REPEAT_WINDOW)` (`NEAR_REPEAT_WINDOW = 2`).

Unchanged: semantic future history, route identity/repeat logic, pair
selection diversity, parser, Qwen prompt/model/timeout/retry, recovery content,
state graph, SDXL, UI, Jung and audio.

## Regression and 50-round validation

- Focused options tests: **24/24 PASS**
- Full project tests: **85/85 PASS**
- Real rounds: scenes **4291–4340**, **50/50** scene commits/votes
- Source (from the authoritative `OPTIONS_CREATED` events): **36 library**,
  **1 Qwen**, **1 normal bounded recovery**, **12 exhausted recovery**; total
  **50/50** published pairs.
- Unique viewer labels: **33**
- Unique option pairs: **47**
- Exact pair repeats: **3** (not consecutive; semantic/route gates remained
  active)
- Semantic pair repeats: **3** (same normalized visible-consequence pair; none
  were consecutive)
- Maximum consecutive recovery streak: **2** rounds
- Two-navigation exhausted recovery count: **2**
- Options-ready latency: p50 **8 ms**, p95 **75 ms**, max **142 ms**
- Production health after validation: Node/Comfy/Qwen ready; YouTube false;
  IMAGE_MOTION unchanged.

Representative post-fix library flow:

```text
machine_room → control_room → hidden_tunnel → alley_mouth
```

with grounded pairs such as `Kontrol odasına gir / Makinenin sesini takip et`,
`Gizli tünele gir / Figüre yaklaş`, and `Ara sokağa sap / Figürden uzaklaş`.

## Verdict

**FIXED — the normal option space no longer collapses primarily because of a
20-item exact-label blacklist.** The narrow patch materially restored the
library path (49/50 rounds in the validation window). Three non-consecutive
pair repeats remain a quality concern for a separate task, not a liveness or
grounding failure, and no further patch was made here.
