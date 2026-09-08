# Bounded Manifestation MVP

## Verdict

**BOUNDED MANIFESTATION MVP READY**

Scope was limited exactly to the approved registry entities: `light`, `window`, `stairs`, and `water`. No selector, Jung, Qwen, recovery, route graph, cooldown, option-library template, or SDXL Profile C behavior was changed.

## Registry invariant

Physical appearance follows one path only:

`canonical location + deterministic canonical state → registry hydration → committed manifest.entities → visiblePhysicalEntity()`

The hydrator is called only when creating the default canonical scene or applying a real location transition. It does not read memory, Qwen text, prompts, or arbitrary patch additions. Untrusted patches may retain a word such as `water` in memory, but cannot add it to current physical entities or create a manifestation record.

| Entity | Legal locations | Deterministic activation | State / scope |
|---|---|---|---|
| light | `red_house_exterior`, `red_house_hallway`, `machine_room`, `control_room` | canonical `entity_states.light` exists | illumination; location-owned physical |
| window | `red_house_exterior`, `red_house_doorstep`, `red_house_hallway` | canonical house-surface rule | aperture; location-owned physical |
| stairs | `stairwell` | canonical stairwell rule | location-scoped presence |
| water | `basement` | canonical `entity_states.water` exists | water state; location-owned physical |

## Targeted regression tests

`node --test test/*.mjs` completed **100/100 passing**.

The new focused cases cover:

1. All four entities absent before their legal canonical hydration.
2. Legal transition commits the correct entity and enables its existing templates.
3. Illegal locations cannot commit it.
4. Memory text, Qwen-style manifest patch data, and prompt text cannot make an entity physical.
5. Location-owned state restores on re-entry without leaking to another location.
6. Pending state remains transaction-local until a successful commit.

## 15-step production-compatible trajectory

The isolated trajectory used the real `applyStatePatch()` hydration route, canonical graph locations, library pair selection, and production Profile C image engine. It never writes to the live story transaction or publishes a voting round.

Route:

`doorstep → hallway → stairwell → basement → machine room → control room → hidden tunnel → alley → quiet street → front path → exterior → doorstep → hallway → stairwell → basement`

| Family | First committed location | Activation | Existing templates newly eligible | Selected pair at first observation | PNG |
|---|---|---|---:|---|---|
| window | `red_house_doorstep` | `canonical_house_surface` | 8 | Kapıyı arala / Figüre yaklaş | [window.png](</<PROJECT_ROOT>/benchmark/bounded-manifestation-mvp/images/window.png>) |
| light | `red_house_hallway` | `canonical_light_state` | 9 | Pencerenin önünde bekle / Pencereye dokun | [light.png](</<PROJECT_ROOT>/benchmark/bounded-manifestation-mvp/images/light.png>) |
| stairs | `stairwell` | `canonical_stairwell` | 6 | Figürü izle / Figürün arkasına bak | [stairs.png](</<PROJECT_ROOT>/benchmark/bounded-manifestation-mvp/images/stairs.png>) |
| water | `basement` | `canonical_water_state` | 7 | Figürü görmezden gel / Figürün gölgesini izle | [water.png](</<PROJECT_ROOT>/benchmark/bounded-manifestation-mvp/images/water.png>) |

Each listed PNG is a real 1024×576 output generated with the unchanged Profile C engine. The complete before/after manifests, every newly eligible ID, full 15-step route, and PNG paths are in [results.json](</<PROJECT_ROOT>/benchmark/bounded-manifestation-mvp/results.json>).

## Catalogue eligibility rerun

| Measurement | Before | After |
|---|---:|---:|
| Physically eligible template IDs | 31 | 64 |
| Unique local viewer-facing labels | 24 | 55 |
| Route action ceiling | 12 | 12 |
| Estimated viewer-facing action ceiling | 36 | 67 |

The expected design estimate was roughly `37 → 67` IDs and `41 → 69` viewer-facing actions. The measured first value is lower because the current checked-in baseline snapshot has 31 rather than 37 ever-eligible IDs; the after value is 64 because three of the theoretical design slots are not currently realized by the existing template/state metadata. The measured viewer-facing ceiling is 67 because the four approved families add 31 local labels to the existing 24, while the unchanged graph contributes 12 route labels.

## Validation counters

| Check | Result |
|---|---:|
| TESTS | 100/100 pass |
| STUCK | 0 |
| MANIFEST_INVALID | 0 |
| DUPLICATE_PUBLISH | 0* |
| UNGROUNDED_OPTIONS | 0 |
| CROSS_LOCATION_LEAKAGE | 0 |

\* The 15-step run is deliberately isolated: it does not invoke the WebSocket publisher, so duplicate publish is zero by construction. Existing production publish behavior was not changed.

## Changed files

- [manifestation-layer.mjs](</<PROJECT_ROOT>/app/lib/manifestation-layer.mjs>) — allow-listed registry and trusted hydrator.
- [options.mjs](</<PROJECT_ROOT>/app/lib/options.mjs>) — calls hydration only on canonical default/transition paths and rejects untrusted MVP entity additions.
- [manifestation-layer.test.mjs](</<PROJECT_ROOT>/test/manifestation-layer.test.mjs>) — focused regression coverage.
- [bounded-manifestation-mvp.mjs](</<PROJECT_ROOT>/benchmark/bounded-manifestation-mvp.mjs>) — reproducible trajectory, PNG, and catalogue measurement harness.

No Phase 2 family was implemented.

## Live 50-round verification

After the implementation was loaded by a controlled Node restart, a real local run used the normal sequence `displayed vote → SDXL → committed scene → OPTIONS_CREATED` for 50 rounds. The run did not fabricate state, invoke a frozen snapshot, or bypass the server transaction.

| Metric | Result |
|---|---:|
| Completed displayed rounds | 50 / 50 |
| Library-sourced rounds | 50 |
| Location changes | 2 |
| Entity-state changes | 39 |
| Unique option pairs | 49 |
| Exact pair repeats | 1, non-adjacent |
| Adjacent exact pair repeats | 0 |
| Options-ready latency after image commit, p50 / p95 / max | 8 ms / 20 ms / 57 ms |
| Generation failures | 0 |
| Stuck rounds | 0 |
| Manifest-invalid | 0 |
| Ungrounded options | 0 |
| Cross-location manifestation leakage | 0 |
| Broken/black media fetches | 0 |
| Duplicate `OPTIONS_CREATED` publishes | 0 |

The only repeated pair was `Figürün gölgesini izle || Merdivende bekle`, observed twice with other pairs between them; it was not an adjacent loop. This is a small long-horizon diversity warning rather than a liveness, grounding, state, or media reliability error. The source transaction data is [live-50-results.json](</<PROJECT_ROOT>/benchmark/bounded-manifestation-mvp/live-50-results.json>).
