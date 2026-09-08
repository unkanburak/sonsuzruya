# Qwen Fallback Options Liveness Fix

## Status

**STATUS: BLOCKED FOR ONE PERSISTED EDGE STATE**

The orchestration patch is implemented, but the currently persisted scene cannot
produce a safe recovery pair under the frozen grounding/cooldown rules.

## Root cause

The old flow waited for the full `qwenTimeoutMs=12000`, performed another retry,
and only then attempted bounded recovery. This left the viewer in:

```text
WAITING_FOR_OPTIONS
secondsLeft=0
optionsReady=false
```

The patch now races option preparation against a 6000 ms user-facing deadline.
Invalid or late Qwen responses no longer block the round.

## Patch

- Added `OPTIONS_LIVENESS_DEADLINE_MS = 6000` in `app/server.mjs`.
- Added per-cycle token/guard so only the first library, Qwen, or recovery pair
  can win.
- Invalid Qwen responses immediately attempt existing
  `sceneBoundRecoveryOptions()`.
- A second blocking retry was removed from the server orchestration path.
- Late Qwen results are logged as `QWEN_RESULT_STALE` and cannot overwrite a
  published recovery pair.
- No library, validator, prompt, model, timeout, route, Jung, UI, audio, or
  state-model behavior was changed.

## Verification

- `node --check app/server.mjs`: PASS
- Existing focused suite: **79/79 PASS**
- Full `npm test`: 79 tests pass; one unrelated benchmark fails because its
  optional Comfy endpoint `127.0.0.1:8194` is not running.
- Node `/health`: `ok=true`, `comfy=true`, `qwen=true`, `youtube=false`.
- Production `qwenTimeoutMs`: unchanged at 12000 ms.

## Persisted edge state found after restart

The restored scene was `4033`, location `red_house_exterior`, with declared
entities `red house exterior`, `closed front door`, `bare tree`, and
`anonymous figure`. Its route/local recovery candidates were all filtered by
existing state/repeat/static-visibility guards, so the recovery function
returned `null`.

The new flow correctly emitted:

```text
NO_SAFE_RECOVERY_PAIR
reason=QWEN_LIVENESS_DEADLINE
```

No invented option was emitted. Because the task explicitly forbids broadening
recovery or weakening validation, this one persisted state remains blocked and
the requested 10-round real flow cannot be honestly reported as complete.

## Result

For normal manifests where the existing bounded recovery returns a pair, the
round becomes `OPTIONS_READY` within the 6-second liveness deadline and late
Qwen cannot overwrite it. For the persisted `scene 4033` state above, the
frozen recovery contract has no safe pair; resolving that requires a separate,
explicit decision about state recovery or cooldown policy.

**OPTIONS LIVENESS FIX: IMPLEMENTED; CURRENT PERSISTED STATE: NO_SAFE_RECOVERY_PAIR**
