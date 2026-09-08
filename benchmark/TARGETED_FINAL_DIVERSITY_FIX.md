# Targeted Final Diversity Fix

Date: 2026-08-31

## ROOT CAUSE

The existing 15-scene run was not only an SDXL issue. Its option stream was fallback-driven (`source: fallback` in the event log) and repeatedly selected the same broad route families. At the same time, the prompt carried stale architectural continuity into unrelated results. For example, a radio/object result was accompanied by `CONTINUITY MOTIF: a long dim corridor` and a sentence that the same corridor remained. The Soft Lock invariant also repeatedly described a lone adult slim silhouette without a bounded framing preference, encouraging the model's familiar centered-figure/interior composition.

The historical 15-scene events do not contain a per-scene final-prompt snapshot, so an exact historical prompt dump would be fabricated. The classification above is based on the recorded options/winners, the persisted state/last prompt, and the prompt-construction code. The new run below was made after the targeted patch was loaded.

## OPTION/STATE CAUSE

- Added broad family cooldown across threshold, passage, glow/light, atmosphere, window, nature, vehicle, water, mechanical and domestic families.
- A family seen in the recent committed visual window receives a strong penalty; door/portal/gate and corridor/tunnel/bridge/stairs are treated as equivalent families rather than new labels.
- Added bounded ordinary-object/situation fallbacks and made them reachable after visual history exists.
- Removed unconditional `same corridor/window/door remains` propagation from object/atmosphere results.
- Added Qwen cooldown rejection for newly introduced recently cooled families; valid failures still use the safe fallback.

## PROMPT/COMPOSITION CAUSE

- Soft Lock protagonist wording now permits seated, profile, partial-body and object-focused framing instead of implying a full centered silhouette.
- Added bounded `recent_compositions` (six entries) to story state.
- Added context-sensitive, non-random composition hints: object interaction close/medium, seated/profile, asymmetric environmental wide, partial-body/over-shoulder.
- Repeated composition hints are avoided for the next few committed scenes.
- Stale architecture anchors are omitted when the result is an unrelated object/atmosphere situation.

## VALIDATION

Affected/full unit suite: **34/34 passed**.

Controlled deterministic ablation (the completed 150-round run before the final composition-only prompt pass; the final real-scene pass was intentionally limited to 12 scenes):

| Metric | No motif memory | Motif + composition patch |
|---|---:|---:|
| Generic route + glow/atmosphere cluster | 23.33% | 15.33% |
| Maximum same-family recurrence | 6 | 4 |
| THRESHOLD frequency | 30.67% | 22.00% |
| PASSAGE frequency | 50.00% | 33.33% |
| Exact option-pair repeats | 0 | 0 |

The 12-scene real run completed successfully with fresh SDXL generations. Result options included telephone, washing-machine, car, mirror, photograph, fog, stairs, water, tea, radio and outdoor/water contexts. The sheet contains forest, lake/water, exterior, stairs, machine/industrial, room and dining-table situations rather than one single corridor chain.

## FILES CHANGED

- `app/lib/options.mjs`
- `app/lib/jungian-dream-engine.mjs`
- `app/server.mjs`
- `benchmark/visual-trope-repetition.mjs`
- `benchmark/make-visual-trope-sheet.py`

## 12-SCENE CONTACT SHEET

[VISUAL_TROPE_12_SCENE_CONTACT_SHEET.png](<<PROJECT_ROOT>\benchmark\VISUAL_TROPE_12_SCENE_CONTACT_SHEET.png>)

The latest sheet is materially more varied than the pre-patch sheet, but several indoor/window/standing-silhouette compositions remain. This is residual SDXL composition bias after prompt/anchor cleanup, not an unbounded story or option-memory failure.

## HUMAN VERDICT

**BORDERLINE / HUMAN REVIEW REQUIRED.**

The option/state layer now passes the targeted diversity objective: no exact pair repetition, lower generic trope clustering, stronger ordinary-situation availability, bounded memory and no infrastructure regressions. Image-level diversity improves but does not eliminate SDXL's indoor/window/centered-figure prior. Per the requested stop rule, no further full audit, endurance run, model benchmark or video test was run.
