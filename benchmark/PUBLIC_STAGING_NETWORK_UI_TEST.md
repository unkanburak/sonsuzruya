# Controlled Public Staging — Network / UI Test

## Summary

PUBLIC HTTPS: **PASS**

PUBLIC WSS: **PASS** (100/100 synthetic connections through tunnel)

COMFY EXTERNAL EXPOSURE: **SAFE** — only Node `localhost:3000` is tunnelled; `/system_stats` is not externally reachable.

NETWORK:

- EXTERNAL TESTERS: 0 real users (not yet performed from a second device/network)
- EXTERNAL STORY TURNS: 0
- MAX REAL CLIENTS: 0
- VOTE FLOW: NOT TESTED externally
- RECONNECT: NOT TESTED with a real browser
- MEDIA DELIVERY: HTTPS page and `/health` PASS; image/MP4 browser playback not independently observed

UI:

- BILINGUAL OPTIONS: IMPLEMENTED (TR primary + EN subtitle)
- LIVE PERCENTAGES: IMPLEMENTED server-authoritatively; zero-vote state is `—`
- USER VOTE FEEDBACK: IMPLEMENTED with per-session disable/highlight
- COUNTDOWN: IMPLEMENTED from server state
- WINNER ANIMATION: IMPLEMENTED
- LOSER ANIMATION: IMPLEMENTED
- GENERATING STATE: IMPLEMENTED while prior scene remains visible
- SCENE CROSSFADE: IMPLEMENTED
- IMAGE→LOOP HANDOFF: Existing stale-safe handoff retained; browser `playing` telemetry was not independently observed in this run
- MOBILE: responsive CSS added; real-device review pending
- RECONNECT UX: WebSocket auto-reconnect and authoritative state replay implemented; real-browser verification pending

STABILITY:

- BLACK FRAMES: 0 observed in existing local validation
- STALE MEDIA: 0 in existing local validation and current smoke
- NODE CRASH: 0
- COMFY CRASH: 0
- OOM: 0
- NODE PEAK RSS: ~73 MB during current test

STRESS:

- SYNTHETIC 25: PASS — 25/25 connected, 0 errors
- SYNTHETIC 50: PASS — 50/50 connected, 0 errors
- SYNTHETIC 100: PASS — 100/100 connected, 0 errors
- SYNTHETIC 200: NOT RUN
- SYNTHETIC 300: NOT RUN

SECURITY:

- SECURITY FINDINGS: no Comfy/Qwen exposure detected; tunnel URL is ephemeral
- NOTABLE NETWORK LIMIT: `/api/debug/vote` is the existing lightweight vote endpoint; no account/auth system was added. Keep the temporary URL private.

## Tunnel

Cloudflare Quick Tunnel was started with:

```text
cloudflared tunnel --url http://127.0.0.1:3000 --no-autoupdate
```

Temporary URL:

`https://dispatch-adware-regarded-rate.trycloudflare.com`

The tunnel exposes only Node 3000. Hostinger DNS/nameserver records were not changed. Comfy 8188/8191/8192/8194 and Qwen remain local.

## Implementation notes

- Node continues listening locally; the tunnel reaches it without binding Comfy/Qwen to `0.0.0.0`.
- Browser WebSocket URL now derives from the loaded origin (`wss://` on HTTPS, `ws://` locally).
- Vote cards are clickable/tappable and use a per-session identifier; VoteManager still accepts only one exact `1` or `2` per round.
- Existing generation/loop fallback and sceneId stale guard remain unchanged.
- Startup `readiness` (`warming_up` → `ready`) is exposed to the viewer state.

## Blocking items before limited public launch

No genuine 5–10-person external session has been run yet, and browser automation was unavailable in this environment. Therefore external vote flow, mobile layout, browser `canplay/playing`, reconnect timing, and real media playback are **not claimed as passed**. The next safe step is a human-controlled phone-on-mobile-data session using the temporary URL, followed by this report update.

FINAL:

- NETWORK: **PARTIAL**
- UI: **PARTIAL (implemented, human browser review pending)**
- VOTING UX: **NOT YET VERIFIED EXTERNALLY**
- PUBLIC STAGING: **NOT READY**

FINAL VERDICT: **NOT READY**

The local production system remains healthy with Profile C, Soft Lock, IMAGE_MOTION, AnimateDiff off, YouTube off, and OBS Ambient Main unchanged. The temporary tunnel is still running for the requested manual review; stop it with `Stop-Process -Name cloudflared` when finished.
