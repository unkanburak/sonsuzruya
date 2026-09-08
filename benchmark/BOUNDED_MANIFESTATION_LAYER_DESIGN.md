# Bounded Manifestation Layer — Design Only

**Status:** DESIGN ONLY. No production code, selector, template, synonym,
Jung, Qwen, recovery, graph, or configuration has been changed.

## Goal and invariant

Increase the option surface by allowing a small set of declared physical
entities to become visible in the existing twelve-node graph. The layer must
never turn memory, Qwen prose, or prompt interpretation into physical truth.

The invariant is:

```text
registry rule + current canonical location + deterministic state condition
→ commit entity into current_scene_manifest.entities
→ only then visiblePhysicalEntity() can authorize options
```

There is no reverse route. An option, memory entity, Qwen output, or image
prompt cannot introduce a physical entity by itself.

The current selector remains unchanged. It still relies on
`visiblePhysicalEntity()` and current manifest grounding.

## Minimal data model

Use a declarative registry with fixed IDs; never accept free-form entity names.
The committed manifest remains the sole physical source of truth.

```js
{
  entity_manifestations: [
    {
      id: "hallway_window",
      entity: "window",
      source: "canonical_optional:hallway_window",
      scope: "location",
      activated_by: "enter:red_house_hallway",
      persistence: "location_physical"
    }
  ]
}
```

Constraints:

- at most four manifestation records in a manifest;
- `id`, `entity`, source and scope must come from the registry;
- `entities` must contain the literal entity name for the record to matter;
- `entity_states` continues to hold current state; `entity_physical_states`
  holds only persistent physical axes;
- location transition removes location-scoped manifestations unless the target
  node's own registry rule activates them again;
- memory-only records never enter `entities` and therefore never pass
  `visiblePhysicalEntity()`;
- commit happens only inside the same pending-state transaction that currently
  calls `applyStatePatch()` before image generation.

This is bounded state, not a second world model. It is a registry-backed
overlay on the current manifest.

## Bucket A — Canonical optional entities

These are already plausible in declared nodes. They may be added only by a
location/state predicate in the registry; no random roll and no model output
decides their presence.

| Entity | Allowed locations | Deterministic activation | State schema | Commit / persistence / removal | Existing template outcome | Grounding risk | SDXL visual ambiguity |
|---|---|---|---|---|---|---|---|
| `light` | `red_house_exterior`, `red_house_hallway`, `machine_room`, `control_room` | Canonical `light` state already exists at that node (`steady`, later `dim`/`bright`) | physical: `steady/dim/bright`; local interaction: `leading/inspected/near/far/traced/held/altered` | Hydrate on node entry when its canonical light state is present; physical illumination persists location-scoped; remove on location exit or a registry-supported absence state | 9 currently static-valid template IDs / 9 labels | Low | Low–medium; constrain to practical/visible light source, not floating glow |
| `shadow` | Only the above nodes when both `anonymous figure` and committed `light` exist | Derived deterministic entity: `figure + light → shadow` | local: `faint/observed/leading/near/far/obscured/lit/mismatched/repositioned`; no cross-location physical memory | Commit after the light/figure predicate; remove whenever either source entity is absent or on location exit | 9 static-valid IDs / 8 labels | Low once both sources are committed | Medium; easy to overuse, so it must be dependent rather than default everywhere |
| `window` | `red_house_exterior`, `red_house_doorstep`, `red_house_hallway` | Fixed house-surface registry predicate at entry, not a generic-room assumption | physical: `closed/open`; local: `observed/revealed/near/far/touched/reflection_shifted/held/peripheral` | Commit only in listed house nodes; aperture persists per node; local interaction clears on exit | 8 static-valid IDs / 7 labels | Low | Low; houses and hallway can clearly render a window |
| `stairs` | `stairwell` only | Canonical stairwell hydration | local: `lower/observed/near/held/far/traced/revealed/crossed` | Commit at `stairwell` entry; local interaction clears on exit; no false stairs in hallway/basement | 6 static-valid IDs / 5 labels | Very low | Very low |
| `water` | `basement` only | Existing canonical `water: still/flooded` state is present | physical: `still/flooded`; local: `altered/touched/near/far/traced/revealed/held/mismatched/crossed` | Hydrate physical `water` only if basement's canonical water state is present; physical water persists in basement memory; remove on exit | 7 static-valid IDs / 7 labels | Low | Low–medium; require a visible reflective surface/standing water in the prompt |
| `crack` | `front_path`, `quiet_street` | Derived from already committed `cracked front path` | local: `inspected` | Commit as an explicit subentity only at these nodes; clear on exit | 0 today: its existing consequence fails the static visibility contract | Low | Low |

### Bucket A eligibility impact

The six families contain 50 currently never-eligible template IDs. With the
existing static visibility contract unchanged, **39 IDs / 36 distinct labels**
can realistically become eligible:

| Family | Static-valid IDs | Distinct labels |
|---|---:|---:|
| light | 9 | 9 |
| shadow | 9 | 8 |
| window | 8 | 7 |
| stairs | 6 | 5 |
| water | 7 | 7 |
| crack | 0 | 0 |
| **A total** | **39** | **36** |

`crack` is deliberately in the registry design but does not raise current
eligibility until its existing consequence/visibility contract is addressed in
a separate task.

## Bucket B — Bounded manifested entities

These are not generic defaults. They are introduced only by a registry event
that has a deterministic prior condition and then are explicitly committed.
The event is a state transition owned by Node, never a Qwen proposal.

| Entity | Allowed locations | Activation condition | State schema | Commit / persistence / removal | Existing template outcome | Grounding risk | SDXL visual ambiguity |
|---|---|---|---|---|---|---|---|
| `radio` | `machine_room` only in first release | `machine:on` is committed, then registry exposes an established receiver module in that same room | physical: `on/off`; local: `dial_pulsing/inspected/near/far/touched/held` | Commit only after the machine-on transaction has succeeded; state persists while machine-room context remains; remove on exit unless re-established | 10 static-valid IDs / 8 labels | Medium; must be described as a machine receiver, not an unrelated radio | Medium |
| `photograph` | `red_house_hallway` only in first release | Deterministic `entered_house` flag set by the canonical doorstep → hallway transition; photograph appears as a fixed hallway fixture | physical: `intact/broken`; local: `altered/protected/inspected/near/abandoned/mismatched/held/revealed` | Commit on the first qualifying hallway entry; fixture remains location-scoped; local interaction clears on exit | 8 static-valid IDs / 6 labels | Low–medium | Low; a framed photo is a stable, recognizable still-image object |
| `mirror` | `red_house_hallway` only | Only after a committed, registry-owned hallway reflection event; never simply because a prompt says reflection | physical: `intact/broken`; local: `observed/inspected/near/far/touched/revealed/mismatched/held/peripheral` | Commit after the defined reflection event; remove on exit unless the fixture is explicitly persistent | 1 static-valid ID / 1 label today | Medium | Medium–high; reflection coherence is fragile in SDXL |
| `button` | `control_room` only | A committed control-panel activation exposes a declared button | physical: `on/off`; local: `altered` | Commit only with a control-panel state transition; remove on exit | 0 today under static gate | Low | Low |
| `trace` | `front_path`, `quiet_street`, `alley_mouth`, `hidden_tunnel` | A committed path/figure result has `traced` or `leading` state | local: `inspected` | Commit as a short-lived mark only after the source state commits; remove after one subsequent local turn or exit | 0 today under static gate | Low | Medium; must be an actual visible mark, never a textual clue |
| `detail` | `red_house_hallway`, `basement`, `machine_room`, `control_room` | A committed `reveal/inspected` transition on a declared source entity | local: `inspected` | Commit with `source_entity` provenance; remove after it is consumed or on exit | 0 today under static gate | Medium | Medium; generic “detail” is visually underspecified |
| `object` | `basement`, `machine_room`, `control_room` | Only a specific registry event may expose it, e.g. a declared panel component or machine part; never a generic random object | physical: `intact/broken`; local: `moved/inspected/touched/protected/abandoned/mismatched/revealed/held` | Commit with a fixed registry object ID and source; location-scoped unless explicitly marked physical | 3 static-valid IDs / 2 labels | Medium–high | High; generic object wording is weak without a specific visual identity |

### Bucket B eligibility impact

Bucket B contains 43 never-eligible IDs. With no selector/visibility-contract
change, only **22 IDs / 17 labels** are presently static-valid:

| Family | Static-valid IDs | Distinct labels |
|---|---:|---:|
| radio | 10 | 8 |
| photograph | 8 | 6 |
| mirror | 1 | 1 |
| button | 0 | 0 |
| trace | 0 | 0 |
| detail | 0 | 0 |
| object | 3 | 2 |
| **B total** | **22** | **17** |

The remaining 21 B rows are not fixed merely by adding an entity: their
existing still-image consequence fails the current static visibility gate.
They should remain deferred rather than weakening that gate in this task.

## Bucket C — Out-of-scope graph expansion

`bridge` is intentionally out of the manifestation layer.

| Entity family | Why excluded | Required future work |
|---|---|---|
| `bridge` (2 templates) | No bridge node, entity, route or physical transition exists in the twelve-node graph. Adding it as a manifest overlay would fabricate a location. | Add a canonical bridge node with declared adjacency, entities, state defaults, prompt grounding and return path in a separately reviewed graph-expansion task. |

## Expected coverage and action ceilings

Baseline evidence from the full event history is **37 eligible template IDs**,
**29 unique local labels**, and **12 route labels**: approximately **41
viewer-facing actions**.

| Configuration | Expected eligible template IDs | Expected local labels | Approx. viewer-facing ceiling incl. routes | Important caveat |
|---|---:|---:|---:|---|
| Current graph | 37/146 | 29 | ~41 | Observed full-history ceiling |
| All Bucket A | 76/146 | 65 | ~77 | Assumes each allowed entity is actually committed at its allowed node |
| All Bucket A + static-valid Bucket B | 98/146 | 82 | ~94 | Radio/photo/mirror/object require their explicit deterministic activation chains |
| Recommended initial MVP: light + window + stairs + water | 67/146 | 57 | ~69 | Lowest risk/highest immediate return |

These are eligibility ceilings, not promises that every label will appear in a
short run. Cooldowns, entity states, pair diversity and location distribution
will correctly reduce the instantaneous option set.

## Direct answers

### 1. Additional existing templates with A only

**39 additional template IDs** are realistically usable under the current
static contract, taking coverage from 37 to **76/146**.

### 2. Additional existing templates with A + B

**61 additional template IDs** are realistically usable with all A plus the
static-valid part of B, taking coverage to **98/146**. The other 21 B rows stay
ineligible until a separate visible-consequence contract review.

### 3. New viewer-facing ceiling after A

Approximately **77 actions**: 65 local labels plus 12 declared route labels.
The practical long-run range is closer to 60–70 because state/cooldown rules
properly constrain simultaneous choices.

### 4. New viewer-facing ceiling after A + B

Approximately **94 actions**: 82 local labels plus 12 route labels. A more
conservative production expectation is 75–85 until radio/photo state chains
have real trajectory evidence.

### 5. Minimum implementation with the largest safe gain

Implement only **light, window, stairs and water** first. They activate 30
existing static-valid IDs / 28 labels, move the ceiling from ~41 to ~69, and
require no new location, free-form object naming, Qwen behavior, or selector
change.

### 6. Can this avoid selector/Jung/Qwen/recovery changes?

**Yes for the recommended MVP and the static-valid A/B subset.** The selector
continues to inspect only committed manifests; Jung/Qwen/recovery never decide
physical truth. Full Bucket B coverage cannot be achieved without a later
separate review of the existing static visibility contract, because 21 rows are
currently rejected even after a valid entity would be present.

### 7. First entity families, ranked

| Rank | Family | Creative benefit | Implementation complexity | Grounding safety | State complexity | SDXL reliability | Decision |
|---:|---|---|---|---|---|---|---|
| 1 | `light` | High | Low | High | Low | High | MVP |
| 2 | `window` | High | Low | High | Medium | High | MVP |
| 3 | `stairs` | High | Very low | Very high | Low | High | MVP |
| 4 | `water` | High | Low | High | Medium | Medium–high | MVP |
| 5 | `shadow` | High | Low–medium | High if dependent on light+figure | Low | Medium | Phase 1b, gated |
| 6 | `photograph` | High narrative value | Medium | Medium–high | Medium | High | Phase 2 |
| 7 | `radio` | High atmosphere | Medium | Medium | Medium | Medium | Phase 2 |
| 8 | `mirror` | Medium | Medium | Medium | Medium | Medium–low | Defer |
| 9 | `object`, `trace`, `detail`, `button` | Low under current contract | Medium | Varies | Medium | Varies | Defer |

## Files and functions that would change in a future implementation

No changes have been made. The smallest future implementation would be:

| File | Narrow responsibility |
|---|---|
| New `app/lib/manifestation-layer.mjs` | Immutable registry; allow-list lookup; bounded record normalization; deterministic hydrate/apply/remove functions. |
| `app/lib/options.mjs` | Call the manifestation hydrate function only from `sceneManifestFor()` / `applyStatePatch()` commit and transition paths. Do **not** alter `sceneMatchedOptionLibrary()`, ranking, cooldown or route selection. |
| `test/manifestation-layer.test.mjs` | Registry allow-list, pre-commit rejection, commit visibility, location cleanup, physical-memory isolation and rollback tests. |
| `app/server.mjs` | No required behavioral change: it already builds the image prompt from `pendingStoryState` after `applyStatePatch()` (`app/server.mjs:510-513`). Optional telemetry only. |
| `app/lib/physical-memory.mjs` | No MVP change required; it remains authoritative once an entity is explicitly present. A later shared-owner rule would be reviewed separately, not bundled in MVP. |

## Risks and controls

| Risk | Control |
|---|---|
| Manifest begins inventing props | Registry IDs only; fixed location allow-list; no free-form entity additions. |
| Memory leaks into physical scene | Manifestations derive only from pending transaction state; memory entities never feed `entities`. |
| SDXL omits committed entity | Prompt includes committed entities already; treat this as image-model visual uncertainty, not permission for options before commit. |
| Generic shadow/light loop returns | Shadow is dependent on `figure + light`; use existing cooldowns and begin it after the core four-family MVP. |
| Physical state leaks between rooms | Location-scoped records; use current physical-memory ownership rules; discard local interaction on transition. |
| B category becomes a prop-spawn system | Require a named registry event and source entity/state for every B record. |

## Implementation plan (future task, not performed)

1. Add the declarative registry and pure normalizer; no selector change.
2. Integrate only the four MVP A families into pending/commit hydration.
3. Add targeted tests: entity absent before commit, visible after commit,
   invalid outside allowed node, no memory leakage, rollback does not commit.
4. Run a 15-step real trajectory with one visit to each relevant location and
   measure changed eligible pool after each commit.
5. Review actual PNGs for the committed entity before enabling `shadow`.
6. Only then consider photo/radio deterministic chains as a separately gated
   Phase 2.

## Final recommendation

**RECOMMENDED MVP MANIFESTATION SET:** `light`, `window`, `stairs`, `water`.

**EXPECTED TEMPLATE COVERAGE:** ~**67/146** for the initial MVP; ~**76/146**
after the optional shadow phase; up to ~**98/146** only after the static-valid
Bucket B chains are added.

**EXPECTED VIEWER-FACING ACTION CEILING:** ~**69** initial, ~**77** with all
Bucket A, ~**94** with static-valid A+B.

**RISKS:** no broad prop spawning if registry-only activation, commit-before-
reference, location scope, and current `visiblePhysicalEntity()` checks remain
mandatory.
