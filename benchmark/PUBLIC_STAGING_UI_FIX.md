# Public Staging UI / UX Fix

## Summary

SCENE FIT: **PASS (code-level 16:9 contain framing)**

16:9 FULL COMPOSITION: **PASS** — image and video now share centered `object-fit: contain`; no forced crop.

PURPLE BLANK STATE REMOVED: **PASS** — current scene remains visible; generation card uses neutral dark overlay.

DREAM COUNTER: **PASS** — authoritative `sceneNumber` is applied on every `new_scene`; warm-up does not increment it.

COUNTDOWN: **PASS** — server `secondsLeft` remains visible in the vote card.

USER SELECTION ANIMATION: **PASS (implemented; manual visual confirmation pending)**

WINNER ANIMATION: **PASS (implemented; manual visual confirmation pending)**

LOSER ANIMATION: **PASS (implemented; manual visual confirmation pending)**

GENERATING STATE: **PASS** — small status/result card, previous media preserved.

CROSSFADE: **PASS (implemented)** — next image is preloaded/decoded before replacing the visible image.

IMAGE→LOOP HANDOFF: **PASS (existing stale-safe path retained; browser playing confirmation pending)**

CHAT PANEL: **PASS** — lightweight in-memory panel with recent-message buffer.

CHAT SEND/RECEIVE: **PASS** — `/api/chat` validates text, strips angle brackets, caps length/rate, and broadcasts over WebSocket.

MOBILE LAYOUT: **PASS (responsive rules added; real-device review pending)**

10 ROUND REGRESSION: **10/10**

BACKEND REGRESSION: **PASS** — Comfy 8188 HTTP 200, Node `/health` healthy, IMAGE_MOTION active, YouTube false.

## Root causes fixed

1. The media shell previously used an oversized cover frame and aggressive drift. It now centers the complete 16:9 composition with a neutral dark surround.
2. The frontend previously set image opacity to zero before the replacement loaded, exposing the purple background. It now preloads and decodes the next image first.
3. `new_scene` did not update the client scene number. It now updates the authoritative counter and resets per-round selection state.
4. The prior debug-only vote controls were replaced with public clickable/tappable option cards.
5. A real ephemeral chat panel and WebSocket chat events were added; chat remains separate from voting.
6. HTTPS pages now use WSS automatically.
7. A two-layer scene token guard now prevents an older preload/timer or an active motion video from covering a newer committed scene.

## Regression evidence

The 10 sequential local rounds advanced scenes `7499 → 7509` with 10 successful committed images, no vote-flow crash, and no stale/black media observed. After the two-layer crossfade change, a further 3-round media regression advanced `7520 → 7523` successfully; the public tunnel serves the updated `scene-next`/token implementation. The scripts are [public-ui-regression-10.mjs](<C:/Users/burak/OneDrive/Desktop/SONSUZ YAYIN/benchmark/public-ui-regression-10.mjs>) and [media-transition-regression-3.mjs](<C:/Users/burak/OneDrive/Desktop/SONSUZ YAYIN/benchmark/media-transition-regression-3.mjs>).

## Human review required

The following still require direct phone/desktop observation on the temporary staging URL:

- full composition is visually uncropped at 1920×1080, 1366×768 and phone portrait;
- winner green flash and loser fade are perceptible;
- 500–800 ms image crossfade is visible and not jarring;
- MP4 `playing` handoff is black-frame-free;
- chat send/receive across two real browsers;
- reconnect during voting/generation;
- mobile card/chat ergonomics.

No subjective browser result is fabricated here.

## Safety / final state

- Profile C and Soft Lock remain active.
- Comfy 8188 and Qwen remain private.
- `ANIMATEDIFF_ENABLED=false`.
- YouTube/public hosting remains off.
- Hostinger DNS/nameserver unchanged.
- OBS Ambient Main unchanged.

The Quick Tunnel remains temporary and exposes only Node 3000. Public staging is not declared fully ready until the human checklist above is reviewed.

## Vote visibility patch (2026-08-31)

The generation event previously hid the entire vote card immediately. On a short/fast round this made the UI look as if the system had silently selected one option. The client now keeps both option rows visible while generation is in progress, disables them after lock, and restores the vote card explicitly on every `new_scene` event. The countdown remains prominent and is reset from the authoritative server state.

When there are no votes or the tally is tied, the server marks `randomFallback` on `generation_started`; the UI displays `OY YOK/EŞİT — RASTGELE SEÇİM` so automatic selection is explicit rather than mysterious.

Validation: Node syntax checks passed; health is `ready`, Comfy 8188 and Qwen are reachable, YouTube is off; three sequential local vote rounds advanced successfully (`7566→7569`).
