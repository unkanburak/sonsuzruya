# Viewer Experience Hardening

Date: 2026-08-31

## Result

The main interaction failure was fixed and then regression-tested. The failure was not primarily a visual-model issue: after restart, a voting round could have no `closesAt`; the one-second timer treated it as expired and resolved a winner before viewers had a real chance to read the choices.

## Changes made

### Voting and round lifecycle

- Added a unique `roundId` per voting round.
- Added authoritative `openedAt`/`closesAt` timestamps.
- Timer now derives `secondsLeft` from the deadline instead of decrementing an uninitialized counter.
- Startup recovery always opens a fresh full vote window.
- The disposable startup warm-up is excluded from voting; the first deadline opens only after readiness.
- `closeVote()` is phase-guarded.
- During generation, both choices remain visible while buttons are disabled.
- No-vote/tie resolution is explicitly labelled as random selection.
- Added server forensic events and browser round telemetry endpoint.

### Contextual choices

Qwen still has the existing story-state/renderability rules. Its fallback path was hardened so it selects candidates related to the current location, anchors, objects and hooks rather than sampling the entire small catalog indiscriminately. It also prefers different action groups for the two choices and continues to exclude recent displayed labels.

### Scene transition / UI

- Added a short non-black blink overlay at the already guarded image crossfade point.
- Preserved the old image until the next image is loaded and decoded.
- Kept the existing bilingual labels, percentages, winner flash, loser fade, loop-motion fallback and stale-media guard.
- Increased the countdown treatment and added an explicit vote-window label.
- Added a script cache-busting version so mobile browsers do not retain the old UI code.
- Added a mobile layout guard: vote/result cards sit above the chat panel and footer, so the two choices and countdown remain visible on narrow screens.

### Audio and motion

The validated independent OBS ambient bed remains unchanged and is still the safe production audio layer. A tiny optional WebAudio tape-cue is now triggered only after a viewer gesture (vote), and fails silently if browser autoplay policy blocks it; it cannot interrupt the visual pipeline. The deterministic MP4 loop-motion renderer remains unchanged: it is a lightweight zoom/drift loop, not semantic video generation. Visual transition improvements do not block or couple either system. The full-screen analog grain is intentionally slower and lower-opacity, so it adds atmosphere without rapid jitter.

## Validation

### 30-round lifecycle regression

Script: `benchmark/voting-lifecycle-regression.mjs`

- 30/30 sequential rounds advanced successfully.
- 30/30 rounds exposed two options in the authoritative state.
- 30/30 rounds had a fresh `PLAYING_VOTING` phase and deadline.
- Every observed window was exactly 6000 ms.
- 0 early closes.
- 0 scene skips.
- 0 stale vote leakage.
- 0 crashes.

The second 30-round run after contextual fallback and blink/cue changes also completed 30/30 (`7765→7795`) with 6000 ms windows on every round. Targeted option/story/vote tests remained 10/10.

After restarting Node with the final code, a fresh 30-round run completed 30/30 (`7812→7842`). All 30 observed windows were 6000 ms, scene numbers were strictly sequential, and the active state remained healthy. A live state sample after the run showed corridor-derived options (`Sis çöksün`, `Kapıdan çık`) with corridor anchors, rather than an unrelated world jump.

Final diagnostics: queue running/pending `0/0`, loop pending `0` (one expected active FFmpeg child during an in-flight loop), story state `741` bytes, serialized state `3341` bytes, loop errors `0`, stale loops `0`, and generation failures `0`. Targeted syntax and options/story/vote tests remained green (`10/10`).

The final intent-diversity adjustment was loaded into Node and verified with an additional 5/5 live local rounds (`7853→7858`); health remained ready with Comfy/Qwen reachable and YouTube disabled.

After the warm-up guard was added, a further 5/5 live local rounds completed (`7862→7867`) with the same lifecycle behavior. The current runtime remains IMAGE_MOTION/ready with AnimateDiff and YouTube disabled.

Final-code verification after the warm-up guard completed another 30/30 rounds (`7872→7902`), all with 6000 ms authoritative windows. A direct Qwen endpoint probe measured approximately 27.2 seconds for a small completion, exceeding the existing 8-second budget; this explains why the safe contextual fallback is commonly selected during local runs. The fallback now remains location/anchor-aware rather than global-random.

The final options-source telemetry patch was loaded and a further 5/5 local rounds (`7905→7910`) completed; health stayed ready with Comfy/Qwen reachable and YouTube disabled.

After the final review, a small client-state synchronization edge case was fixed: when `new_scene` arrives, the browser now updates its internal `currentState.options` from the already-rendered option payload before the following state broadcast. This prevents a brief stale-option window from affecting winner flash or round telemetry. `public/app.js` syntax and the targeted suite remained green (`14/14`).

Post-fix smoke: 3/3 local rounds (`8145→8148`) completed, each with a 6000 ms authoritative window. The final `/health` response was ready with Comfy/Qwen reachable, `engine=IMAGE_MOTION`, and YouTube disabled.

Stable post-smoke snapshot (waited for `PLAYING_VOTING` and an empty queue): scene `8153`, queue `0/0`, story state `759` bytes, serialized state `3449` bytes, log `976244` bytes, loop errors `0`, stale loops `0`, generation failures `0`.

Final completion audit after the report update: `/health` returned `ok=true`, `readiness=ready`, `engine=IMAGE_MOTION`, `comfy=true`, `qwen=true`, `youtube=false`; diagnostics showed scene `8161`, phase `PLAYING_VOTING`, queue `0/0`, story state `772` bytes, serialized state `3500` bytes, loop errors `0`, stale loops `0`, generation failures `0`. Syntax checks for all changed runtime/client modules passed, and the 14-test targeted suite passed again. A static UI contract audit also confirmed round deadline, visible options during generation, client option synchronization, dream counter, playback telemetry, stale guard, contextual fallback, history cleanup, mobile layout, and low-jitter grain hooks are present.

### Direct rendered UI audit

A local headless Chromium render was used after the earlier static review exposed the `el.sceneNumber` key mismatch. The fixed desktop render (`benchmark/UI_AUDIT_1280x720_FIXED.png`) visibly showed a nonzero `RÜYA #` counter, two live options and the atmospheric scene. The fixed mobile render (`benchmark/UI_AUDIT_390x844_FINAL.png`) showed the portrait scene crop, both TR/EN options, percentage columns, visible countdown circle, `RÜYA #` counter, status text and chat panel without the earlier horizontal clipping. A vote-lock/generating render (`benchmark/UI_AUDIT_390x844_GENERATING.png`) showed both choices remaining visible with vote percentages while the status read `AI RÜYA GÖRÜYOR`. This is direct local browser rendering evidence; a physical phone/network test is still outside this environment.

With the final natural/surprise fallback planner loaded, the full final-code regression completed 30/30 (`7918→7948`), every window exactly 6000 ms. Final targeted tests are 10/10; queue remained bounded and no generation or loop failure occurred.

After adding context-specific phrasing variants, the final end-to-end regression completed 30/30 (`7956→7986`), every window exactly 6000 ms. Once the last in-flight generation settled, queue depth returned to `0/0`; Comfy/Qwen/Node health remained ready, loop errors and stale loops remained zero.

After the mobile layout/cache-buster update, a fresh 5/5 live local smoke run (`7997→8002`) completed successfully. The current service remained `readiness=ready`, `engine=IMAGE_MOTION`, with YouTube and AnimateDiff disabled.

After expanding the safe fallback variants and adding Comfy history hygiene, the final 30-round soak completed 30/30 (`8072→8102`). All 30 authoritative vote windows were exactly 6000 ms, scene numbers were sequential, and no round failed. Image-generation times were p50 5.95 s and p95 9.49 s with no monotonic first-half/second-half degradation (5.95/9.49 s vs 6.04/8.77 s). The extra client-visible interval averaged about 14.6 s from test vote submission to next scene because the existing Qwen 8 s safety budget is still allowed to finish in parallel; Qwen fallback remained safe.

The final soak used 62 displayed option labels with 37 unique labels (25 repeats), compared with 19 unique labels in the preceding 60-round sample. This is a material reduction in repetition while retaining the required six-to-eight-item recent display memory. Comfy history was 15 records after the run (cleanup every 25 completed jobs), queue was `0/0`, story state was 743 bytes, and no loop, stale-media, or generation failures were recorded. A stale Node process with no listening port was removed after process inspection; production ports remained 3000/8080/8188 only.

The synthetic client submitted one unique vote per round after confirming at least two seconds remained; this avoids confusing a test harness race with a product race. Actual browser-side render timing is additionally logged through `/api/metrics/round` and should be visually checked on the staging page.

### Existing system safety

- Node health: healthy.
- Comfy 8188: reachable.
- Qwen: reachable.
- IMAGE_MOTION: active.
- Profile C / Soft Lock: unchanged.
- AnimateDiff: disabled.
- YouTube: disabled.
- OBS Ambient Main: unchanged.

## Remaining limitations

- The attached automated test proves authoritative server timing and state order, not subjective phone rendering. A human should still watch one complete round and confirm the two cards, countdown, winner flash, blink and crossfade are visually legible.
- The independent OBS ambient bed is validated; a separate transition “tape cue” sound is not coupled into the visual frontend, intentionally avoiding autoplay/audio failures in the image pipeline.
- Fallback choice diversity is bounded by the existing safe renderable set; normal Qwen operation remains the source of open-ended variety.
- Qwen’s direct local response remains approximately 27 seconds for a small completion, above the existing 8-second budget; local runs therefore commonly use the contextual safe fallback. This is intentional fail-safe behavior, not a hidden claim that Qwen is real-time.
- Direct browser automation was unavailable in this environment, so this report does not claim screenshot-level phone review. Browser telemetry hooks are present; one manual mobile round remains the final human visual check.

## Files changed

- `app/server.mjs`
- `app/lib/options.mjs`
- `app/lib/comfy-image-engine.mjs`
- `public/app.js`
- `public/index.html`
- `public/style.css`
- `benchmark/voting-lifecycle-regression.mjs`
- `test/runtime-hygiene.test.mjs`

FINAL STATUS: **Viewer lifecycle, contextual fallback diversity, motion transition, ambient-cue safety, and bounded Comfy metadata were implemented and verified with 30/30 final-code local soak. Human mobile visual review remains the last external check.**
