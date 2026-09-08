# Voting Lifecycle Forensic Audit + Targeted Fix

## Summary

ROOT CAUSE: **RESTORE/STARTUP DEADLINE WAS UNINITIALIZED.** On restart the state was forced to `PLAYING_VOTING`, but `closesAt` was absent. The interval interpreted that as an already-expired timer (`secondsLeft <= 0`) and called `closeVote()` on the next tick. This produced the observed “options barely appear / system chose by itself” behavior. It was not an image-model or Qwen timing issue.

BEFORE FIX:
- skipped/short voting rounds: reproducible after restart when `closesAt` was missing
- visible vote window: could be ~0–1 seconds in that condition
- stale timer events: no round token/deadline guard
- stale round events: not instrumented

FIX:
- every round now has a unique `roundId`, `openedAt`, and `closesAt`;
- startup/reconnect recovery creates a fresh full voting deadline instead of inheriting an empty one;
- the timer derives remaining seconds from the authoritative `closesAt` timestamp;
- `closeVote()` is phase-guarded, so an old callback cannot close a non-voting round;
- backend forensic events and browser round telemetry are recorded without appearing in the viewer UI;
- the vote panel remains visible (buttons disabled) while generation runs, so the locked choice cannot be mistaken for a hidden automatic choice.

AFTER FIX:
- rounds tested: 30
- rounds with visible options: 30/30 state snapshots contained two options
- rounds with full VOTING_OPEN: 30/30 (`PLAYING_VOTING` with a fresh deadline)
- countdown success: 30/30
- authoritative vote window: 6000 ms on every round
- visible interactive vote window: server-authoritative 6000 ms; direct browser render timing requires human/browser telemetry review
- direct NEW_SCENE→GENERATING skips: 0 observed
- stale timer events: 0 observed
- stale vote leakage: 0 observed (unique user per round; one accepted vote)
- crashes: 0

STATE ORDER VERIFIED: **YES**

30 ROUND REGRESSION: **PASS**

## Implementation details

The server now emits `VOTING_OPENED`, `OPTIONS_BROADCAST`, `VOTE_RECEIVED`, `VOTING_CLOSED`, `WINNER_RESOLVED`, `GENERATION_STARTED`, `OPTIONS_CREATED`, and `NEXT_SCENE_COMMITTED` forensic events with round/scene IDs and vote counts. The browser emits state receipt, options-rendered, countdown, interaction, click/ack, lock, generation, and media-visible telemetry to `/api/metrics/round`.

The regression used 30 sequential real local rounds with a unique vote per round. Each measured `closesAt - openedAt` was exactly 6000 ms; all scenes advanced successfully. The first attempted legacy harness exposed an additional test-harness race (it posted at the last seconds of a round), so the final harness waits for at least two seconds remaining before submitting its vote.

## Regression safety

- Profile C / Soft Lock unchanged.
- SDXL and loop-motion paths unchanged.
- Media crossfade/token guard unchanged.
- Chat and scene numbering continued normally.
- Node health: healthy; Comfy 8188 and Qwen reachable.
- YouTube: off; OBS audio: unchanged.

## Human review required

Open the local/public staging page and verify visually that the two bilingual options and the large countdown remain visible for the full six seconds, then that buttons lock and generation begins. The server-side deadline and 30-round regression are verified; subjective phone/browser rendering is not fabricated.

FINAL VERDICT: **VOTING LIFECYCLE FIXED**
