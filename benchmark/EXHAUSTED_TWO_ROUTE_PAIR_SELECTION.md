# Exhausted two-route pair selection

## Root cause

The persisted scene 4151 was `hidden_tunnel` with no eligible local mutation and two declared graph edges: `control_room` and `alley_mouth`.

The edge records did not reach the exhausted selector as two valid navigation candidates:

- `Ara sokağa sap` was first captured by the generic `sokağa` matcher, so its canonical route identity became `quiet_street` instead of `alley_mouth`.
- `sap` was absent from the navigation and action-normalization verb sets. The viewer label was therefore normalized to an empty string.
- Its original static consequence was 13 words; the shared bounded consequence normalizer correctly rejected it above its 12-word limit.

The same real-flow validation later exposed one other missing canonical label mapping: `Evin içine gir` did not resolve to the declared `red_house_hallway` destination. This was the same route-identity class of defect, not a library, Qwen, graph, or recovery-content change.

## Fix

Only `app/lib/options.mjs` route candidate construction/identity was adjusted:

- side-alley matching precedes generic street matching;
- `hidden_tunnel` and `red_house_hallway` canonical route labels resolve to their declared nodes;
- `sap` is recognized as a Turkish navigation verb in both normalization and navigation detection;
- the existing canonical `alley_mouth` consequence was shortened to a valid, equivalent 9-word still-image consequence;
- recovery route records now require ordinary canonical navigation validity: visible consequence, navigation type, non-self-loop destination, declared adjacency, and unique destination identity;
- normal recovery keeps its one-route-plus-local shape; exhausted recovery alone may select two distinct valid navigation candidates when there are no local futures.

No route was invented, no validator or cooldown was globally relaxed, and no scene-specific conditional was added.

## Scene 4151

With the persisted state and its recent displayed history:

| Source | Option | Next location | Route type |
|---|---|---|---|
| Exhausted recovery | Kontrol odasına gir | `control_room` | navigation |
| Exhausted recovery | Ara sokağa sap | `alley_mouth` | navigation |

Both have a static visible consequence and a canonical destination state patch. Scene 4151 resumed in production without dream drift.

## Hidden tunnel

`hidden_tunnel` is a valid canonical node. Its `control_room` and `alley_mouth` outgoing edges are both supported after the identity correction. The `Gizli tünele gir` label also resolves to canonical `hidden_tunnel` for reverse-route identity checks.

## Tests

Focused regression coverage verifies:

1. zero local futures plus two valid routes returns an exhausted pair;
2. the returned pair has two distinct destinations;
3. normal recovery does not emit a route-only two-navigation pair;
4. self-loop, duplicate-identity, and unsupported edges cannot form an exhausted pair;
5. history-only cooldown may be reused in exhausted mode, while graph/state validity remains mandatory;
6. the exact `hidden_tunnel` / scene-4151-shaped fixture succeeds.

Full test suite: **85 / 85 passed**.

## 30 real displayed rounds

Range: scenes **4171–4200** (30 completed vote → generation → committed-scene rounds; scene 4201 also opened a new pair).

| Metric | Result |
|---|---:|
| Library | 3 |
| Qwen accepted | 0 |
| Normal bounded recovery | 1 |
| Exhausted bounded recovery | 26 |
| Two-navigation exhausted recovery | 25 |
| Stuck rounds | 0 |
| Manifest-invalid published pairs | 0 |
| Duplicate `OPTIONS_CREATED` events | 0 |
| Exact pair repeats | 23 |
| Semantic pair repeats | 23 |
| Maximum recovery streak | 21 |
| Options-ready latency, p50 / p95 / max | 76 ms / 91 ms / 133 ms |

The liveness target is met: the 4151 and 4170 exhausted two-route states advance, all 30 rounds publish exactly one grounded pair, and none remains in `WAITING_FOR_OPTIONS`.

## Regressions

No SDXL, Qwen timeout, library, Jung, UI, state model, route graph, cooldown policy, or dream-drift behavior was changed. The production Node process is running with the fixed selector and has an active voting pair.

## Verdict

**NOT READY FOR LAUNCH** — the exact exhausted-route stall is fixed, but this real run showed 26/30 exhausted-recovery rounds and 23 repeated pairs. That is a creative/recovery-quality risk, not a selector-liveness or manifest-safety failure; it requires a separate, explicitly scoped quality task.
