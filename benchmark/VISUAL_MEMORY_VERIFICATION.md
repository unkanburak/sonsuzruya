# Visual Memory Verification

## Final summary

STATE MEMORY: **PASS — 9/9 chains**

PROMPT MEMORY: **PASS — all physical-state steps**

VISUAL MEMORY: **FAIL — systematic SDXL adherence weakness**

LOCATION CONTINUITY: **PARTIAL**

PROMPT PATCH NEEDED: **NO**

THE DREAM REMEMBERS: **PARTIALLY**

## Conditions

- Production SDXL Profile C unchanged: `sdxl_lightning_4step.safetensors`, 1024x576, four steps, CFG 1, Euler / sgm_uniform.
- Actual production `buildImagePrompt()` functions were evaluated without importing/starting another Node server.
- Actual production `ComfyImageEngine.workflow()` was used against the existing private Comfy 8188 instance.
- Nine deterministic, production-compatible chains: three machine, three door, three canonical-location re-entry.
- Each transition rendered only after applying the winner patch. State was committed in the harness only after a successful PNG.
- 45 baseline PNGs cover every transition, not only the nine final re-entry frames.
- An additional nine same-seed A/B frames kept identical words/profile and changed only block order: production order vs result/committed facts first.
- Live production story state was not reset or modified. No option/Jung/Qwen/route/UI/model code changed.

## Full-chain result

| Scenario | State | Prompt | Physical fact after re-entry | Canonical location | Winner/route consequence | Clear contradiction |
|---|---|---|---|---|---|---|
| Machine 1 — touch | YES | YES | PARTIAL — machinery exists, powered-on state is not visually clear | PARTIAL | YES | NO |
| Machine 2 — move away | YES | YES | PARTIAL — machine/control equipment exists, active state is unclear | PARTIAL | YES | NO |
| Machine 3 — inspect | YES | YES | NO — return reads as a generic control room; powered machine is not visibly established | PARTIAL | YES | NO |
| Door 1 — basement wait | YES | YES | PARTIAL — exterior return, front door not clearly readable | YES | YES | NO at final frame; closed basement state had an open-looking render earlier |
| Door 2 — basement approach | YES | YES | YES — a dark/open entrance is visible on return | YES | YES | NO |
| Door 3 — basement ignore | YES | YES | NO — return entrance reads closed despite `door=open` | YES | YES | YES |
| Control room re-entry | YES | YES | N/A | YES — same canonical room type, changed composition | YES | NO |
| Red-house exterior re-entry | YES | YES | N/A (`door=closed` is visibly compatible) | PARTIAL — red house remains, architecture changes substantially | YES | NO |
| Red-house hallway re-entry | YES | YES | N/A | YES — recognizable red interior/hallway family | YES | NO |

These are human visual judgements from the actual PNGs. “PARTIAL” is used where a physical state is absent/ambiguous rather than visibly reversed.

## State → prompt → image failure breakdown

| Layer | Failures |
|---|---:|
| A — state memory failure | 0/9 chains |
| B — prompt omission/conflict | 0 physical-state steps |
| C — model/render adherence | 4 material weak/failed physical readings; includes one clear final contradiction |
| D — canonical-location drift | 3 partial cases, 0 clear unrelated-location failures at the nine final re-entry frames |
| E — ambiguous/subjective | Several active-machine and doorway readings; retained as PARTIAL, not promoted to PASS |

All three machine chains retain `physical_memory.machine_room.machine.power=on` through the local interaction, departure and return. All three door chains retain `physical_memory.red_house_exterior.door.aperture=open`; basement door remains a separate `closed` state during that visit. Ephemeral touch/far/inspect/door interaction values do not appear in the destination prompt as persistent facts.

## Prompt ordering diagnosis

In production order, the persistent physical fact appears around word 139–159 of prompts that total roughly 146–167 words. That established a plausible “buried instruction” hypothesis.

The nine-frame same-seed A/B moved the exact result, canonical scene and physical-fact blocks to the front without adding/removing words. It did **not** reliably improve adherence:

- Machine returns remained visually ambiguous/inactive-looking in both orders.
- Open-door returns remained mixed; fact-first variants still produced closed-looking entrances.
- Canonical location identity was broadly similar in both orders.

Therefore prompt ordering/wording is not proven as the controlling cause. Under the task rule, no prompt patch is justified. The observed failure is classified primarily as **C: model/render adherence**, with some **D/E** location/visual ambiguity.

## Evidence

- Raw baseline chain data, full prompts, states, patches, Comfy workflow/history and paths: `benchmark/visual-memory/baseline/trace.json`
- Same-seed order-only A/B: `benchmark/visual-memory/order-ab/trace.json`
- Per-chain contact sheets: `benchmark/visual-memory/baseline/*-sheet.png`
- A/B contact sheets: `benchmark/visual-memory/order-ab/*-ab-sheet.png`

Representative sheets:

- Machine: `benchmark/visual-memory/baseline/machine-1-sheet.png`
- Door: `benchmark/visual-memory/baseline/door-1-sheet.png`
- Location: `benchmark/visual-memory/baseline/location-1-sheet.png`
- Order A/B: `benchmark/visual-memory/order-ab/machine-ab-sheet.png`, `door-ab-sheet.png`, `location-ab-sheet.png`

## Files changed

Production code/config: **none**.

Benchmark-only additions:

- `benchmark/visual-memory-verification.mjs`
- `benchmark/visual-memory-order-ab.mjs`
- `benchmark/visual-memory-sheets.py`
- `benchmark/visual-memory-order-sheets.py`
- this report and generated evidence under `benchmark/visual-memory/`

## Tests

- 3 machine-memory image chains
- 3 door-memory image chains
- 3 location-reentry image chains
- 45 full-chain baseline PNGs
- 9 same-seed prompt-order A/B PNGs
- State memory: 9/9 correct
- Physical facts in prompt: 100%, with no opposite power/aperture statement detected by the harness
- Visual no-contradiction acceptance: **FAIL**

## Final verdict

Logical/state memory and its prompt handoff are working. Canonical location identity is generally present but is category-level rather than a stable remembered space. Profile C does not reliably render persistent `machine=on` / `door=open` facts even when they are explicit, and facts-first ordering did not solve it. No production patch was made because the only allowed prompt-level intervention was not supported by the A/B evidence.
