# Exhausted-Scene Safe Recovery

## Result

**STATUS: PASS**

The persisted `scene 4033` case now receives a safe pair when the normal
library, Qwen, and normal bounded recovery are exhausted by history/cooldown.

## Scene 4033

- Normal recovery: `null`
- Cause: history/repeat exhaustion; physical routes remained valid.
- Emergency pair: `Kırmızı eve yaklaş` / `Çatlak yolda ilerle`
- Source: `bounded_recovery_exhausted`
- Both destinations are declared adjacent graph nodes.
- No invented entity or location was introduced.

The emergency resolver relaxes only history filters. Manifest grounding,
static visibility, entity-state validity, adjacency, and self-loop protections
remain active. An already-open door cannot produce `Ön kapıyı aç`.

## Implementation

- `sceneBoundRecoveryOptions({ exhausted: true })` adds a history-relaxed
  selection mode.
- Priority is route + valid local mutation, then two local futures, then two
  real adjacent routes.
- Normal recovery behavior is unchanged when `exhausted` is omitted.
- Server tries exhausted recovery only after normal recovery returns `null`.
- Telemetry source is explicitly `bounded_recovery_exhausted`.
- Failure emits `NO_SAFE_EXHAUSTED_RECOVERY_PAIR` without inventing content.

## Tests

- Focused options tests: **21/21 PASS**.
- Full project test files: **82/82 PASS**.
- Closed-door cooldown-only future can be reused in exhausted mode.
- Open-door state still rejects the open action.
- Two-navigation emergency pair works only when no local future exists.
- Real production rounds: **10/10 advanced successfully**.

## Ten real rounds

| Round scene | Source | Options | Next scene |
|---:|---|---|---:|
| 4037 | scene_bound_recovery | Kırmızı eve dön / Evin içine gir | 4038 |
| 4038 | scene_bound_recovery | Ön kapıyı aç / Figürden uzaklaş | 4039 |
| 4039 | scene_bound_recovery | Kırmızı eve yaklaş / Çatlak yolda ilerle | 4040 |
| 4040 | bounded_recovery_exhausted | Kırmızı eve dön / Ön kapıyı aç | 4041 |
| 4041 | bounded_recovery_exhausted | Kırmızı eve dön / Evin içine gir | 4042 |
| 4042 | library | Ön yola ilerle / Kapıyı kapat | 4043 |
| 4043 | scene_bound_recovery | Kırmızı eve yaklaş / Çatlak yolda ilerle | 4044 |
| 4044 | bounded_recovery_exhausted | Kırmızı eve dön / Ön kapıyı aç | 4045 |
| 4045 | bounded_recovery_exhausted | Kırmızı eve dön / Evin içine gir | 4046 |
| 4046 | library | Figürü takip et / Figürün arkasına bak | 4047 |

All ten votes were accepted, all ten next scenes committed, and all ten next
option pairs became available. No permanent `WAITING_FOR_OPTIONS` state or
late-Qwen overwrite was observed. A separate stale-result event was logged
for late Qwen responses, as designed.

## Metrics

- Exhausted recovery rounds in the observed ten-round window: **5**
- Normal bounded recovery rounds: **5**
- Library rounds: **2**
- Scene commits: **10/10**
- Stuck rounds: **0**
- `NO_SAFE_EXHAUSTED_RECOVERY_PAIR`: **0** after the patch
- Manifest-invalid options: **0 observed**
- Max post-`scene_ready` option publish delay: **103 ms**
- User-facing liveness ceiling: **6000 ms**

## Production state

Node health remains `ok=true`, `comfy=true`, `qwen=true`, `youtube=false`.
No model, prompt, validator, route, Jung, UI, audio, or production image
settings were changed.

**EXHAUSTED-SCENE RECOVERY READY**
