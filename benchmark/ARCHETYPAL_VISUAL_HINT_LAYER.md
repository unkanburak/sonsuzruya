# ARCHETYPAL VISUAL HINT LAYER

## Status

**STATUS: PASS (isolated, opt-in prompt layer)**

Implementation is prompt-time only. Option library, state mutation, route graph, Qwen, voting, UI, audio, motion, networking and SDXL/Profile C settings were not changed.

`ARCHETYPAL_VISUAL_HINTS_ENABLED` defaults to off unless explicitly set to `1`; production therefore remains safely rollbackable.

## Implementation

`app/lib/jungian-dream-engine.mjs` now exports `buildArchetypalVisualHint()`. It maps the active archetype to a short visual treatment only when the current manifest contains a compatible affordance. Turkish manifest aliases (`figür`, `ışık`, `gölge`, `yansıma`, `makine`, etc.) are normalized to the same grounded vocabulary.

`app/server.mjs` calls the helper only in the existing SOFT_LOCK image prompt path. Prompt priority remains result-state, manifest/location, entity state/consequence, optional hint, then style. The archetype name is never written into the SDXL prompt; only the concrete visual instruction is.

Hints are rejected for low pressure, missing affordance, deterministic cooldown/gating, or visible-consequence conflict. They never mutate `entity_states`, create entities, open routes, or affect option eligibility.

## Mapping examples

| Archetype | Existing affordance | Visual hint family | Example |
|---|---|---|---|
| Shadow | figure/light/shadow | figure_shadow | Existing figure casts a slightly longer unreadable shadow. |
| Persona | figure/window/reflection | reflection_face | Existing figure’s face becomes unreadable in the available reflection. |
| Trickster | machine | machine_geometry | Existing machine geometry appears subtly impossible but remains the same machine. |
| Self | room/light/path | centered_light | Existing lines and light settle into a balanced central focus. |
| Wise Figure | figure | figure_guidance | Existing figure settles near the established light or route. |

No-grounding example: Persona in a scene containing only bare ground returns `null`.

## Tests

### Deterministic helper tests

`node --test test/archetypal-hints.test.mjs test/options.test.mjs`

**24/24 passed.** Covered grounded Shadow, unsupported scenes, Persona without mask invention, Wise Figure without a figure, machine-only Trickster, result-state conflict rejection, and all existing option/state regression tests.

The repository-wide `npm test` run was `60/62`: one pre-existing IPAdapter benchmark could not connect to its optional 8194 instance, and one legacy Jung prompt assertion still expects an older `DREAM MEMORY SIGNALS` diagnostic string. Neither failure is in the new hint helper or production image path.

### 30 synthetic prompt cases

Data: [synthetic-30.json](archetypal-visual-hints/synthetic-30.json)

- 30 cases evaluated
- 19 applied
- 6 low-pressure nulls
- 4 no-grounding nulls
- 1 deterministic gate null
- invented entity: **0**
- result-state conflicts accepted: **0**

`null` is an intended successful outcome when a motif is unsupported or pressure is low.

### Real Profile C A/B

12 cache-miss generations completed on Comfy 8188: six scenes × hint off/on, identical seeds per pair. All outputs were successful; no OOM or generation error.

- average generation: **3.06 s**
- minimum: **0.43 s**
- maximum: **5.24 s**
- output resolution: **1024×576**
- output data: [real-ab.json](archetypal-visual-hints/real-ab.json)
- comparison sheet: [REAL_AB_CONTACT_SHEET.png](archetypal-visual-hints/REAL_AB_CONTACT_SHEET.png)

The sixth unsupported-affordance pair intentionally produced no hint in both variants. Subjective visual winner remains **HUMAN REVIEW REQUIRED**; no automatic promotion was made.

## Regression and limitations

- The layer is not a literal rendering of Jungian theory; it is a grounded visual prompt hint.
- SDXL may still interpret or omit a subtle hint; this experiment does not add pixel-level verification.
- The feature is opt-in and currently disabled by default, so the current production image prompt is unchanged.

## Representative examples

1. **Shadow + figure/light + “The figure is now beside the bridge.”** → existing figure receives a slightly longer unreadable shadow.
2. **Persona + figure/window/reflection + “The figure is now facing the window.”** → available reflection obscures facial identity.
3. **Trickster + machine + “The machine is now running.”** → the established machine’s geometry becomes subtly impossible; no portal or new object is introduced.

Production systems remain unchanged: IMAGE_MOTION/Profile C active, AnimateDiff off, YouTube/public hosting off.

ARCHETYPAL VISUAL LAYER READY
