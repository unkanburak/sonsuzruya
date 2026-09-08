# Long-Horizon Option Pool Depletion — Validation

TEST WINDOW: scenes 5748–6047; displayed events captured: 300/300

## LONG-HORIZON ROOT CAUSE

The collapse was caused by location transitions carrying interaction-history state into later manifests, while sparse recovery manifests could omit canonical destination entities. In the later trace, unrelated keys such as `figure:far`, `path:held`, `machine:touched`, `street:moved`, and `scene:far` persisted across locations. These are ephemeral interaction outcomes, but `mutationEligible()` treats their values as current entity state, permanently closing local futures. A second, narrower issue was sparse manifest hydration: explicit recovery manifests such as `basement_door` sometimes contained only `anonymous figure`, omitting the node vocabulary.

## STATE FIELD CLASSIFICATION

- **Persistent physical:** `current_location`; physical entity states such as `door:closed|ajar|open`, `machine:idle|on|off`, `radio:on|off`, `window:open|closed`, `water:still|flooded`, and stable light states.
- **Ephemeral interaction:** `near`, `far`, `leading`, `peripheral`, `obscured`, `lit`, `repositioned`, `held`, `touched`, `altered`, `mismatched`, `revealed`, `inspected`, `observed`, `traced`, `advanced`, `marked`, `changed`, `moved`, `lower`, `crossed`, `still` when produced by an interaction.
- **Mixed:** the flat `current_scene_manifest.entity_states` map is the container; before this fix it had no location/physical-vs-ephemeral scope, so keys from prior scenes were mixed into the current manifest.

## MISSING HYDRATION EVIDENCE

Later windows contained sparse committed manifests (notably `basement_door` with only `anonymous figure`, and variants of `quiet_street`/`front_path` missing canonical props). The fix hydrates canonical entities on actual location transition without inventing props in an explicitly committed same-location manifest.

## MINIMAL FIX

`applyStatePatch()` now filters location-crossing state to a small persistent physical allowlist, hydrates destination entities/adjacency from the existing canonical scene definitions, then applies explicit destination physical states. Same-location mutations and all validators/library/Qwen/recovery rules are unchanged.

## SAFETY

Physical progress is retained: e.g. `machine:on` and `door:open` survive leaving and re-entering. Interaction history is still bounded by existing recent records/cooldowns. No new entities, routes, prompts, models, UI or recovery content were added.

## TESTS

- `node --test test/*.mjs`: 85/85 passed after patch.
- Deterministic transition check: destination `machine_room` contains canonical `machine`; stale interaction keys are removed; explicit sparse same-location manifests remain authoritative.

## 300-ROUND WINDOW TABLE

| Window | Rounds | Library | Normal recovery | Exhausted recovery | Two-nav exhausted | Exact repeats | Semantic repeats | Max recovery streak | Unique futures | Locations |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| 5748-5797 | 50 | 50 | 0 | 0 | 0 | 6 | 6 | 0 | 18 | basement:18, basement_door:6, machine_room:20, control_room:6 |
| 5798-5847 | 50 | 50 | 0 | 0 | 0 | 7 | 7 | 0 | 19 | machine_room:8, control_room:14, hidden_tunnel:14, alley_mouth:10, basement:4 |
| 5848-5897 | 50 | 50 | 0 | 0 | 0 | 1 | 1 | 0 | 35 | hidden_tunnel:4, alley_mouth:4, quiet_street:2, front_path:10, red_house_exterior:2, red_house_doorstep:6, red_house_hallway:8, stairwell:4, basement:6, machine_room:4 |
| 5898-5947 | 50 | 50 | 0 | 0 | 0 | 11 | 11 | 0 | 18 | basement_door:4, basement:2, machine_room:2, control_room:6, hidden_tunnel:18, alley_mouth:18 |
| 5948-5997 | 50 | 50 | 0 | 0 | 0 | 4 | 4 | 0 | 27 | alley_mouth:4, hidden_tunnel:4, quiet_street:2, red_house_exterior:4, red_house_doorstep:2, red_house_hallway:2, stairwell:4, basement:9, machine_room:17, control_room:2 |
| 5998-6047 | 50 | 50 | 0 | 0 | 0 | 9 | 9 | 0 | 18 | basement:19, machine_room:20, basement_door:8, control_room:3 |

## FULL 300 SOURCE DISTRIBUTION

{"library":300}

- Exact pair repeats: 165/300 (55.0%)
- Semantic pair repeats: 165/300 (55.0%)
- Two-navigation exhausted recoveries: 0
- Maximum recovery streak: 0
- Stuck: 0 (all 300 displayed rounds reached a committed scene)
- Manifest-invalid: 0 recorded in the captured displayed flow
- Duplicate publish: 0 observed in captured OPTIONS_CREATED sequence

## QUALITY DECAY OVER TIME

Window percentages and recovery streaks above are the decay check. A later-window jump in exhausted recovery or repeats indicates remaining depletion; otherwise resource/state behavior is plateauing. The captured source metrics are authoritative for the completed run.

## VERDICT

300-round capture complete. Metrics above are computed from the authoritative OPTIONS_CREATED events for the captured window. The patch is limited to bounded pair recency/frequency selection, location-entry state normalization, and canonical hydration; no creative or validation behavior was changed.

## POST-CAPTURE ASSESSMENT

- Technical regression suite after the bounded append-only pair-ledger change: **85/85 passed**.
- A follow-up live run was intentionally stopped at 43 rounds to avoid repeating another full 300-round soak; its early sample was 36 unique pairs / 2 repeats. It is not used as a 300-round acceptance claim.
- The authoritative 300-round run above still demonstrates a quality limitation: **165/300 semantic pair repeats (55.0%)** despite 300/300 library rounds and zero recovery/stuck/manifest-invalid events.
- Therefore the technical state/queue fix is complete, but the long-horizon creativity target is **not yet met**. Production remains on the existing bounded behavior; no unverified cooldown expansion was promoted.
