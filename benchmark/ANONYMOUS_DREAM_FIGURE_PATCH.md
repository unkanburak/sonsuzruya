# Micro Aesthetic Patch — Anonymous Dream Figure

Date: 2026-08-31

## Scope

Prompt logic only. Existing protagonist presence gating remains enabled; no model, story-state, voting, motion, audio, UI, network or production architecture changes were made. Exactly six representative SDXL scenes were generated.

## Prompt change

Visible humans are now explicitly treated as anonymous dream figures:

- back-facing, backlit, distant, shadowed, cropped or reflected when possible;
- no recognizable faces, portrait lighting or actor-like frontal dialogue framing;
- two-figure interactions remain legible but use anonymous silhouettes, side/rear or over-the-shoulder framing;
- `ABSENT_OR_OBJECT_LED` still permits no visible protagonist;
- `OPTIONAL_PARTIAL` permits a small, partial or off-camera figure;
- `REQUIRED`/`REQUIRED_INTERACTION` show only the amount needed to understand the result.

The rule does not force a full-body standing character into every scene.

## Affected tests

Existing test suite: **34/34 passed**.

## Six-scene visual check

Locked settings: SDXL-Lightning 4-step, 1024×576, CFG 1, Euler/sgm_uniform. All six jobs succeeded. Approximate client latencies: 2.25–2.67 seconds.

| Scene | Intended treatment | Human review observation |
|---|---|---|
| object-only radio | no figure | object carries frame; no actor identity |
| environmental bridge | distant/optional | small distant figure, environment dominant |
| lone figure in rain | back-facing/backlit | anonymous silhouette, face unreadable |
| two-figure exchange | required interaction | two anonymous silhouettes; gesture readable |
| seated/partial photograph | seated/cropped | seated silhouette, no frontal portrait |
| exterior house | optional/absent | exterior carries scene; no forced character |

Contact sheet: [ANONYMOUS_DREAM_FIGURE_6_SCENES.png](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\ANONYMOUS_DREAM_FIGURE_6_SCENES.png>)  
Raw results: [results.json](<C:\Users\burak\OneDrive\Desktop\SONSUZ YAYIN\benchmark\anonymous-dream-figure-spike\results.json>)

## Result

The six scenes read as fragments of the same strange dream rather than conventional actor/portrait coverage. Object-led and environment-led shots remain possible, while required human interactions stay understandable without readable identity.

## Files changed

- `app/server.mjs` — anonymous human treatment appended to the existing presence-mode prompt logic.
- `benchmark/anonymous-dream-figure-spike.mjs` — six-scene isolated check.
- `benchmark/make-anonymous-figure-sheet.py` — contact sheet generator.

## Final state

- IMAGE_MOTION: active
- SDXL/Profile C settings: unchanged
- ANIMATEDIFF: disabled
- YouTube/public hosting: off
- Node/Comfy/Qwen: healthy after restart

