# Structured-Text Continuity — 30-Turn Validation

STRUCTURED STATUS: PASS (staging recommendation; not auto-promoted)  
RESULT PASS/PARTIAL/FAIL: 26 / 3 / 1 (provisional visual review)  
CHARACTER PASS/PARTIAL/FAIL: 23 / 6 / 1 (provisional visual review)  
WORLD PASS/PARTIAL/FAIL: 24 / 5 / 1 (provisional visual review)  
SCENE LOCK: No severe lock; occasional environment repetition  
LATENCY P50/P95: 2.45s / 2.81s (30 warm cache-miss generations)  
MAIN REMAINING FAILURE SOURCE: MIXED — mostly SDXL random drift/ambiguous spatial wording  
SHOULD STRUCTURED TEXT REPLACE CURRENT VANILLA PROMPTING: YES, staging-only pending human review

## Scope and validity

The test compared current vanilla production prompting (A) with concise structured continuity prompting (B). No image conditioning, IPAdapter, model, sampler, resolution, Qwen, story-state, frontend or voting changes were made. The test ran on isolated ComfyUI 8193 with production GPU processes temporarily stopped, so latency was not contaminated by GPU contention.

Each method completed 30/30 generations. Every measured job used a unique seed and output prefix; Comfy history and output-file existence confirmed execution. No broken images or OOM occurred.

## Prompt structure

Structured prompts used only:

```text
WORLD: persistent style/palette
PROTAGONIST: short identity/clothing/silhouette
CONTINUITY ANCHORS: last few relevant locations/objects
PREVIOUS STATE: one sentence
CURRENT RESULT STATE: exact new state
MUST SHOW: key required elements
```

No full history was repeated.

## Latency

| Method | Technical success | p50 | p95 | Notes |
|---|---:|---:|---:|---|
| Vanilla A | 30/30 | 2.30s | 3.49s | One cold start and one 12.16s outlier |
| Structured B | 30/30 | 2.45s | 2.81s | Stable warm distribution |

Cold first-run latency was ~45.7s for A because the isolated Comfy process loaded the model. It is excluded from warm p50/p95 interpretation.

## 30-turn story chain

`bridge → under bridge → forest path → red house → hallway → basement → machine → activated machine → flooded basement → submerged tunnel → portal field → new landscape → road → train station → train → mountain pass → cave → shore → lighthouse → stairwell → mirrors → corridor → glass bridge → floating garden → observatory → dome → snow field → cabin → blue door → new world`.

The structured sequence shows readable large scene transitions and a recurring protagonist silhouette. It does not guarantee exact object persistence; some turns repeat similar architectural compositions or drift in spatial details.

## Failure labels

| Pattern | Likely label | Observation |
|---|---|---|
| Required spatial relation softened or omitted | IMAGE_ENGINE / AMBIGUOUS | SDXL sometimes renders the destination but not the exact relation |
| Similar architecture appears for adjacent turns | RANDOM_DRIFT / IMAGE_ENGINE | Repetition without a technical failure |
| Small anchor not visibly retained | STATE / PROMPT | Anchor wording is present but may be visually weak |
| Broken output | — | None observed (0/30) |

The structured format made the result-state and protagonist constraints more explicit than vanilla. Remaining misses are not caused by a pipeline error; they are the expected limitation of text-only SDXL continuity.

## Human-review assets

- [Structured 30-turn sequence](<<PROJECT_ROOT>/benchmark/STRUCTURED_30_TURN_SEQUENCE.png>)
- [Problem-turn sheet](<<PROJECT_ROOT>/benchmark/STRUCTURED_PROBLEM_TURNS.png>)
- [Blind vanilla-vs-structured comparison](<<PROJECT_ROOT>/benchmark/VANILLA_VS_STRUCTURED_CONTINUITY.png>)

Human question: “Which output feels more like the next shot of the same story while still clearly showing the new result-state?” The provisional counts above should be replaced if human review disagrees.

## Recommendation

Structured prompting meets the technical acceptance gate: 30/30 success, result-state FAIL provisionally ≤2/30, warm p50 under 4s, and no severe scene lock. It is a reasonable staging candidate and appears more story-directed than vanilla. Do not auto-promote it until the blind sheet is reviewed.

If human review confirms that protagonist identity remains the main weakness, the next experiment may be a lightweight IPAdapter/reference-conditioning spike. IPAdapter was not installed or tested here. If result-state/world transitions are judged the main weakness, refine state/prompt wording instead.

## Final state

Production remains unchanged: Profile A, IMAGE_MOTION active, `ANIMATEDIFF_ENABLED=false`, YouTube off.  
PRODUCTION UNCHANGED: YES
