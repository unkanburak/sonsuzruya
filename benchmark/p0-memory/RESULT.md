# Three P0 changes — result

THE DREAM REMEMBERS: PARTIALLY

## Evidence

- Exact pre-patch reproductions: `reproduction-before.json` (machine on overwritten by touched/far; front-door open copied to basement door; optional glow excludes light_follow; image prompt uses old story).
- Existing test suite `node --test test/*.test.mjs`: 85 existing + 7 new = 92 passed, zero failed. New tests: `test/p0-physical-memory.test.mjs`.
- Bare `node --test` also discovers a dormant benchmark/ipadapter-simple-test.mjs requiring unavailable 8194; that invocation was aborted, not reported as a passing suite. No IPAdapter environment was started or installed.
- New-process production trace: scene 6702 -> 6717, exactly 15 real voted/generated/committed rounds, 161.55 seconds. All 15 sources library; all actual winner events match submitted votes; exactly one OPTIONS_CREATED per next scene. Raw snapshots, patches, prompts, and counts: `production-15.json`.
- Production health after test: ok=true, comfy=true, qwen=true, YouTube=false, IMAGE_MOTION, ready.

## Automated checks (15 rounds)

| Check | Count |
|---|---:|
| Physical memory corruption | 0 |
| Cross-entity physical-state leakage | 0 |
| Stale ephemeral transition leakage | 0 |
| Persistent-fact/prompt mismatch or contradictory power/aperture | 0 |
| Manifest-invalid winner/transition | 0 |
| Stuck | 0 |
| Duplicate publish | 0 |

The prompt checks verify the newly supplied facts, location, and opposite power/aperture statements; they are not a general semantic/vision validator. Manifest-invalid likewise checks transition and mutation grounding, not pixels.

## Limits and visual review

- Machine-on/touch/retreat and independent-door re-entry are proven by focused function regressions. The 15 actual rounds stayed around front_path/red_house_exterior/quiet_street; they did not visit machine_room or select an operational physical-state mutation. Do not describe that specific sequence as live-tested.
- All 15 saved PNGs (6703–6717) were visually inspected. Media is readable, but image semantics are not fully faithful: e.g. 6704/front_path and 6711/front_path depict interiors, while 6705 shows the red-house exterior and 6717 a street. Figurative/composition identity also drifts. Correct prompt facts do not guarantee exact SDXL image memory.
- Existing recurring-motif text can still refer to old symbols, e.g. a door-shadow sentence at 6713/front_path. Jung logic was not changed; the new persistent-facts section does not add that door. This is not counted as a new physical-memory field leak or presented as proof of pixel grounding.
- Legacy already-lost physical facts are not reconstructed. Only currently evidenced facts migrate; distinct location-scoped identities then persist.

## Deployment accounting

Windows Stop-Process failed on old Node PID 21040. The new process initially exited EADDRINUSE; two observations on the OLD process were aborted and preserved separately as `deployment-preflight-old-process.json`, not counted in the 15-round result. The verified old Node was then stopped at an idle boundary using taskkill and replaced by PID 27460 with the same executable/working directory. Comfy and Qwen were not restarted. The observer now refuses to vote without the new memory fields.

## Scope

Production edits: app/lib/options.mjs, new app/lib/physical-memory.mjs, app/server.mjs. Added focused tests and benchmark evidence only. Optional tags are no longer forbidden tags; no template additions. Config and option-library.mjs are byte-identical to before. No cooldown, route ranking, Jung, Qwen, SDXL, UI, audio, motion or network configuration changes. No additional long run or P1 work.
