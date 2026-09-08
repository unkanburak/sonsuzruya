# Scene Vocabulary Coverage Audit

**Scope:** read-only audit. No selector, template, synonym, Qwen, SDXL, UI,
state, or production configuration was changed.

**Evidence artifacts:**

- `benchmark/scene-vocabulary-coverage-audit.mjs` (diagnostic-only reader)
- `benchmark/scene-vocabulary-coverage-audit.json` (generated evidence)
- `benchmark/option-catalogue-manifests.json` (the earlier fixed 300-round snapshot)

## Executive result

The headline **31/146** is valid for the fixed recent 300-round snapshot, but
it is not a graph-wide lifetime ceiling. That snapshot exercised only six of
the twelve canonical locations and never contained a `machine_room` manifest.
The same read-only eligibility calculation over all available
`OPTIONS_CREATED` events finds **37/146** templates physically eligible at
least once and **109/146** never eligible.

The underlying bottleneck is scene vocabulary coverage, not the size of the
catalogue. `sceneMatchedOptionLibrary()` requires all of:

1. required tag match,
2. a visible static consequence,
3. a literal physical entity in the committed manifest,
4. a valid mutation/state transition.

The tag set is broader than the physical manifest. For example, a summary or
state can contribute the `light`, `shadow`, `water`, or `crack` tag while
`visiblePhysicalEntity()` still finds no corresponding current entity. This is
why a tag can match while a template remains physically ineligible.

`sceneManifestFor()` deliberately treats an explicit same-location manifest as
authoritative (`app/lib/options.mjs:360-365`); it does not inject omitted
props. Canonical defaults are hydrated on real location transitions in
`applyStatePatch()` (`app/lib/options.mjs:499-512`). This is safe grounding, but
it means an entity that is not explicitly manifested cannot activate its
template family.

## Two denominators (do not conflate them)

| Audit window | OPTIONS_CREATED events | Unique manifests | Locations represented | Ever physically eligible | Never physically eligible |
|---|---:|---:|---:|---:|---:|
| Earlier fixed snapshot | 300 | 300 sampled manifests | 6/12 | 31 | 115 |
| Full available event history | 4,489 | 1,867 | 12/12 | 37 | 109 |

The six-template difference is explained primarily by later reachability of
`machine_room` and additional physical states. It does not mean that the
catalogue suddenly grew; it means the observed scene/state sample widened.

### Full-history scene coverage

The 1,867 unique committed manifests are distributed across every canonical
node:

| Location | Unique manifest variants |
|---|---:|
| `red_house_exterior` | 336 |
| `red_house_doorstep` | 264 |
| `front_path` | 517 |
| `quiet_street` | 102 |
| `alley_mouth` | 71 |
| `hidden_tunnel` | 56 |
| `control_room` | 46 |
| `machine_room` | 111 |
| `basement` | 112 |
| `basement_door` | 63 |
| `red_house_hallway` | 112 |
| `stairwell` | 77 |

The canonical graph therefore has **12 nodes and 26 directed adjacency
entries**. The issue is not unreachable graph nodes; it is the narrow physical
entity vocabulary committed at those nodes.

Observed current entities are dominated by `anonymous figure` (1,867
manifests), `closed front door` (863), `bare tree` (914), and path/house route
entities. There are no explicit committed `window`, `stairs`, `radio`,
`photograph`, `mirror`, `light`, `shadow`, `water`, `object`, or `bridge`
entities in the full event sample. `machine` is explicit only in the 111
`machine_room` manifests.

## Never-eligible family classification

The table below uses the **115-row fixed snapshot** requested in the original
question. “Never (all history)” is the corrected result from the complete
event audit. Classifications are mutually exclusive at the family-row level;
secondary blockers are noted where useful.

| Family | Never in 300 snapshot | Never in all history | Primary class | Evidence / interpretation |
|---|---:|---:|---|---|
| `light` | 10 | 10 | **C** | `light` exists as an entity-state/default concept, but no current physical light entity is committed. |
| `shadow` | 10 | 10 | **C** | Figure/light scenes can imply a shadow, but shadow is not manifested as a current entity. |
| `sound` | 1 | 1 | **F** | Sound-only result is not a reliable still-image consequence under the static visibility gate. |
| `echo` | 1 | 1 | **E** | No current echo entity; it would need an event-driven visible manifestation (or remains non-visual). |
| `trace` | 1 | 1 | **E** | Trace appears in text/tag signals, not as a current physical entity. |
| `crack` | 1 | 1 | **C** | The canonical entity is `cracked front path`; the `crack` target is not recognized as that physical entity, and its consequence also misses the renderability vocabulary. |
| `detail` | 1 | 1 | **E** | No concrete current detail entity is committed; requires a bounded result-driven manifestation. |
| `window` | 10 | 10 | **C** | House/interior nodes can support a window, but hydration never commits one. |
| `stairs` | 10 | 10 | **C** | `stairwell` is a canonical node, yet the physical `stairs` entity is omitted. |
| `bridge` | 2 | 2 | **D** | No bridge node or bridge entity exists in the canonical graph; bridge actions require a new canonical node/entity. |
| `radio` | 10 | 10 | **E** | No canonical radio entity/state is present; it must be explicitly manifested by a bounded story event. |
| `photograph` | 10 | 10 | **E** | No canonical photograph entity/state is present; it needs an explicit result-driven manifestation. |
| `button` | 1 | 1 | **E** | No button entity is committed; a panel/button can be manifested only when a result establishes it. |
| `mirror` | 9 | 9 | **E** | No mirror-bearing manifest exists; use only as an explicitly established dynamic/entity manifestation. |
| `water` | 9 | 9 | **C** | `basement` has a `water: still` default state, but no physical water entity is committed. |
| `object` | 10 | 10 | **E** | Generic object has no concrete current entity; it needs a specific bounded manifestation to remain grounded. |
| `scene` | 3 | 3 | **F** | `scene` is always tagged, but wait/breathe/stillness consequences fail the static visible-state contract. |
| `figure` | 2 | 2 | **F** | `figure:hold_position` and `figure:hide` are grounded, but their current consequence wording fails the static visibility gate. |
| `door` | 2 | 1 | **B** | Door is canonical; `open_wide` needs an `ajar → open` state path that is not observed in the snapshot/history. |
| `path` | 2 | 2 | **F** | Path is canonical, but the `avoid/compare` consequence forms are rejected by the static visibility gate. |
| `machine` | 10 | 5 | **B** | `machine_room` and `machine` are canonical but uncommon; the five remaining rows are state/visibility-gated (notably the `on` prerequisite and consequence vocabulary). |

### Classification totals

For the stated **115 never-eligible rows**:

| Class | Rows | Meaning in this audit |
|---|---:|---|
| A | 0 | No family was treated as intentionally fine while exposed as a general library family. |
| B | 12 | Existing canonical entity exists, but the required state/path is rarely or never reached (`machine`, `door`). |
| C | 50 | Existing graph locations already make the entity plausible, but hydration/physical entity recognition omits it (`light`, `shadow`, `crack`, `window`, `stairs`, `water`). |
| D | 2 | Requires a new canonical graph location/entity (`bridge`). |
| E | 43 | Requires an explicit bounded dynamic/entity manifestation (`echo`, `trace`, `detail`, `radio`, `photograph`, `button`, `mirror`, `object`). |
| F | 8 | Effectively dead under the current still-image consequence/state contract (`sound`, `scene`, `figure`, `path`). |
| **Total** | **115** | — |

The full-history correction changes only the B bucket in this accounting:
five machine rows and one door row become eligible once additional valid
states/locations appear, reducing the never count from 115 to 109.

## Direct answers

### 1. How many of the 115 can become usable without adding a template?

**All 115 are already defined templates, so no new template is required.**
With the selector and current validator left exactly as-is, **107 rows** (B + C
+ D + E) are potentially recoverable through state reachability and explicit
manifest/dynamic manifestation. The remaining **8 F rows** are operationally
dead until their existing visible-consequence/state contract is changed; that
is a validator/metadata contract issue, not a catalogue-size issue.

### 2. How many require only better use of existing canonical entities?

**62 rows (B + C).** They need either:

- better hydration/recognition of entities already implied by existing nodes,
  or
- valid state evolution for already-canonical `machine`/`door` entities.

No new graph node is required for this bucket.

### 3. How many require new canonical scene/entity manifestations?

**45 rows (E + D).** Forty-three need explicit bounded manifestations in an
existing graph node; two bridge rows need a new canonical graph location/entity
if bridge actions are a product requirement.

### 4. Realistic ceiling with the current world graph

Across the complete event history, the current graph has demonstrated:

- **37 physically eligible template IDs**,
- **29 unique scene-local viewer labels**, and
- **12 declared route labels** (one per canonical destination),

for an evidence-backed ceiling of approximately **41 distinct viewer-facing
actions** before cooldown, state depletion, or repeated labels reduce the
long-run set. The existing 200-round replay's 42-label figure is consistent
with this being an approximate operational ceiling (it includes the route and
library attribution paths); it is not evidence that all 146 templates are
reachable.

The current graph can therefore produce meaningful route/local combinations,
but it cannot expose the absent radio/photo/mirror/window/stairs/light/shadow
families without adding those entities to committed scene manifests.

### 5. Smallest safe change for long-run variety

The smallest change is **a bounded manifestation layer over the existing 12
nodes**, not a selector rewrite:

1. add only explicit, location-scoped physical overlays where the world already
   supports them (for example light/window/stairs/water in declared house,
   stairwell, or basement nodes);
2. introduce radio/photo/mirror/object only when a committed result explicitly
   establishes that entity, keeping it out of unrelated scenes;
3. keep transient trace/detail/echo as bounded event manifestations and never
   promote memory-only text into physical presence;
4. retain the current `visiblePhysicalEntity` and adjacent-route gates.

This raises the eligible surface while preserving grounding. A new bridge node
is a separate graph expansion and is not necessary for the first increase in
variety.

## Recommendation

**C) add a bounded manifestation layer.**

The current scene vocabulary is not sufficient for the advertised 146-template
surface, but a broad graph rewrite would be disproportionate. A small,
explicit, state-driven manifestation layer activates existing templates without
inventing props, without changing cooldown/selection logic, and without making
Qwen or a new model responsible for physical truth.

## Production safety

No production code or configuration was modified by this audit. The only new
artifacts are the benchmark reader and its JSON evidence under `benchmark/`.
IMAGE_MOTION, Profile C, Qwen/Jung flow, voting, UI, audio, networking, and
YouTube state remain unchanged.
