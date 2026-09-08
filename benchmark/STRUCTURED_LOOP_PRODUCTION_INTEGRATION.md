# Structured Prompt + Loop Motion Production Integration

STRUCTURED PROMPT ACTIVE: YES  
LOOP MOTION ACTIVE: YES  
30-TURN SUCCESS: 30/30  
SDXL P50/P95: 4.23s / 6.05s (generation time, 30 validated turns)  
LOOP P50/P95: 0.73s / 0.92s  
LOOP SUCCESS: 30/30 (100%)  
BLACK FRAMES: 0 observed  
STALE MEDIA: 0 discarded  
FALLBACK: CSS IMAGE_MOTION remains active when loop is unavailable; 0 loop errors in the validated 30-turn window  
PRODUCTION HEALTH: Node, Comfy 8188 and Qwen healthy; YouTube off; AnimateDiff disabled  
RECOMMENDATION: READY for local production use; keep YouTube/public rollout manual

## What changed

The image prompt now uses a bounded structured form: WORLD, PROTAGONIST, CONTINUITY ANCHORS (maximum three), PREVIOUS STATE, CURRENT RESULT STATE and MUST SHOW. If the structured state is disabled or unavailable, the prior concise vanilla prompt is used. No model, resolution, sampler, Qwen, story-state semantics, voting or frontend layout changed.

After each successful SDXL commit, the same verified PNG handoff is sent asynchronously to a deterministic FFmpeg zoom/drift renderer. The static image is broadcast immediately and remains visible. A valid four-second H.264 MP4 is broadcast only after it exists and is readable. The browser switches to it only when playback can begin; a failure leaves CSS IMAGE_MOTION in place.

Every loop has a scene number/scene ID. A late result whose scene ID no longer matches the active scene is discarded and can never replace newer media.

Feature flags:

- `STRUCTURED_PROMPT_ENABLED` (default on; set `0` to roll back prompting)
- `LOOP_MOTION_ENABLED` (default on; set `0` to roll back to CSS IMAGE_MOTION)
- `ANIMATEDIFF_ENABLED` remains false

## Local validation

Thirty sequential real debug-vote turns completed successfully. The first smoke after the handoff fix produced valid MP4s (0.74s and 1.45s); the subsequent 30-turn window produced 30/30 valid loops. Unique scene IDs were checked through event logs. No black frame, stale media event, broken scene, or loop error was recorded.

The 30-turn driver measured full vote-to-next-scene progression separately; the SDXL and loop values above are server-side event timings. The observed SDXL p50 is slightly above the 4-second preferred target in this long-running local session, while loop rendering stays comfortably below 3 seconds. This is a performance observation, not a model or architecture change.

## Relevant implementation files

- `app/server.mjs` — structured prompt construction, static-first commit, asynchronous loop dispatch, stale-scene guard and feature flags
- `app/lib/comfy-image-engine.mjs` — safe native Comfy output fallback and verified PNG handoff
- `app/lib/loop-motion-engine.mjs` — deterministic MP4 zoom/drift renderer
- `public/app.js` — static-preserving video load/play handling and `loop_scene` event support

## Rollback

Set `STRUCTURED_PROMPT_ENABLED=0` and/or `LOOP_MOTION_ENABLED=0`, restart Node, and the existing vanilla prompt/CSS image-motion path remains available. No YouTube or public hosting was enabled.

FINAL STATE: IMAGE_MOTION active; structured prompting and loop motion validated locally; AnimateDiff false; YouTube off.
