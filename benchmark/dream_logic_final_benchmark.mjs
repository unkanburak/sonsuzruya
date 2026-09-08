import { writeFile } from "node:fs/promises";
import { applyStatePatch, defaultStoryState, futureSignature, normalizeStoryState, optionMeta, psychologicalTargetForOption, psychologicalVectorForOption, sceneBoundRecoveryOptions, sceneMatchedOptionLibrary, staticVisibleConsequence } from "../app/lib/options.mjs";
import { defaultDreamPsyche, normalizeDreamPsyche, updateDreamPsyche } from "../app/lib/jungian-dream-engine.mjs";

process.env.ARCHETYPAL_OPTION_BIAS_ENABLED = "1";

const archetypes = ["shadow", "persona", "trickster", "self", "wise_figure", "child", "mother_field", "anima_animus"];
const baseScenarios = [
  ["red_house_exterior", ["closed front door", "window", "anonymous figure", "light"], ["red_house_doorstep", "front_path"]],
  ["front_path", ["path", "tree", "shadow", "anonymous figure"], ["red_house_exterior", "quiet_street"]],
  ["machine_room", ["machine", "button", "light", "anonymous figure"], ["basement", "control_room"]],
  ["reflection_room", ["mirror", "reflection", "window", "anonymous figure"], []],
  ["flooded_room", ["water", "stairs", "light", "anonymous figure"], []],
  ["radio_room", ["radio", "photograph", "table", "anonymous figure"], []],
  ["bridge_edge", ["bridge", "water", "shadow", "anonymous figure"], []],
  ["object_room", ["object", "door", "light", "anonymous figure"], []],
  ["stairwell", ["stairs", "door", "shadow", "anonymous figure"], ["red_house_hallway", "basement_door"]],
  ["garden_path", ["path", "plant", "light", "anonymous figure"], []],
  ["glass_room", ["glass", "reflection", "light", "anonymous figure"], []],
  ["dark_room", ["room", "wall", "shadow", "anonymous figure"], []],
  ["photo_room", ["photograph", "mirror", "table", "anonymous figure"], []],
  ["machine_gallery", ["machine", "water", "light", "anonymous figure"], []],
  ["threshold", ["door", "stairs", "light", "anonymous figure"], []],
  ["quiet_scene", ["scene", "shadow", "light", "anonymous figure"], []],
  ["water_path", ["water", "path", "reflection", "anonymous figure"], []],
  ["figure_room", ["figure", "door", "window", "light"], []],
  ["mechanical_room", ["machine", "radio", "object", "anonymous figure"], []],
  ["archive_room", ["photograph", "object", "window", "anonymous figure"], []],
];
const scenarios = Array.from({ length: 12 }, (_, cycle) => baseScenarios.map((scenario) => [...scenario, cycle + 1])).flat();
const pairKey = (pair) => [pair.option_1_tr, pair.option_2_tr].map((value) => value.toLocaleLowerCase("tr-TR")).sort().join(" || ");
const count = (values) => Object.fromEntries([...new Set(values)].map((value) => [value, values.filter((item) => item === value).length]).sort((a, b) => b[1] - a[1]));

function recordsForPair(pair, story) {
  if (pair?._selectedRecords?.length === 2) return pair._selectedRecords;
  return ["1", "2"].map((index) => {
    // optionMeta intentionally accepts the wire-level vote values "1"/"2".
    // Passing a numeric index coerces every value other than the string "1"
    // to option 2 and makes recovery mutations look like telemetry nulls.
    const meta = optionMeta(pair, String(index));
    const nextLocation = meta.statePatch?.current_location || story.current_location;
    const mutation = meta.statePatch?.entity_state_mutation || null;
    const routeType = nextLocation !== story.current_location ? "navigation" : "scene_local";
    return { label_tr: pair[`option_${index}_tr`], result_prompt_en: meta.resultPrompt, intent: meta.intent, behavior_family: meta.intent, state_patch: meta.statePatch, entity_state_mutation: mutation, route_type: routeType, next_location: nextLocation, target_entity: routeType === "navigation" ? nextLocation : (mutation?.target_entity || "scene") };
  });
}

function remember(story, pair, records, archetype, source) {
  const labels = [pair.option_1_tr, pair.option_2_tr];
  const rows = records.map((record, index) => ({ label_tr: labels[index], result_prompt_en: record.result_prompt_en, intent: record.intent, behavior_family: record.behavior_family || record.intent, route_type: record.route_type, next_location: record.next_location, source, psychological_vector: psychologicalVectorForOption(record), target_entity: psychologicalTargetForOption(record), resulting_state: record.entity_state_mutation?.to_state || record.next_location || "", future_signature: futureSignature(record), archetype }));
  return normalizeStoryState({ ...story, recent_options: [...new Set([...(story.recent_options || []), ...labels])].slice(-20), recent_option_records: [...(story.recent_option_records || []), ...rows].slice(-20), recent_option_pairs: [...(story.recent_option_pairs || []), pairKey(pair)].slice(-256) });
}

function chooseWinner(records, story, index) {
  const route = records.find((record) => record.route_type === "navigation");
  const local = records.find((record) => record.route_type !== "navigation");
  if (route && (story.location_dwell_turns >= 3 || index % 4 === 3)) return route;
  return local || route || records[0];
}

const rounds = [];
const seenPairs = new Map();
const seenFutures = new Map();
const seenWorldFutures = new Set();
const stateTransitions = new Set();
let librarySourceCount = 0;
let boundedRecoveryCount = 0;
let qwenFallbackOpportunities = 0;
let zeroValidPair = 0;
let manifestInvalid = 0;
let nonVisualConsequences = 0;
let stateChangeNullPhysical = 0;
let sameWorldSemanticRepeats = 0;
let locationChanges = 0;
let entityMutations = 0;
const zeroPairStates = [];
const stateChangeNullDetails = [];
const semanticRepeatDetails = [];
let history = normalizeStoryState(defaultStoryState());

for (let scenarioIndex = 0; scenarioIndex < scenarios.length && rounds.length < 200; scenarioIndex += 1) {
  const [location, entities, adjacent, cycle] = scenarios[scenarioIndex];
  let story = normalizeStoryState({ ...history, current_location: location, location_dwell_turns: 0, current_scene_entities: entities, current_scene_manifest: { location, entities, adjacent_locations: adjacent, entity_states: {}, summary: `Grounded ${location} scene cycle ${cycle}` } });
  let psyche = normalizeDreamPsyche({ ...defaultDreamPsyche(), dominant_archetypal_field: archetypes[scenarioIndex % archetypes.length], archetypal_pressure: { ...defaultDreamPsyche().archetypal_pressure, [archetypes[scenarioIndex % archetypes.length]]: 0.82 } });
  for (let step = 0; step < 2 && rounds.length < 200; step += 1) {
    const beforeManifest = story.current_scene_manifest;
    let source = "library";
    let pair = sceneMatchedOptionLibrary(story, story.recent_option_records.slice(-8), psyche);
    if (!pair) {
      qwenFallbackOpportunities += 1;
      source = "bounded_recovery";
      pair = sceneBoundRecoveryOptions({ storyState: story, previousOptions: story.recent_option_records.slice(-8), dreamPsyche: psyche });
    }
    if (!pair) { zeroValidPair += 1; zeroPairStates.push({ scenarioIndex, location: story.current_location, entities: story.current_scene_manifest.entities, entityStates: story.current_scene_manifest.entity_states, recent: story.recent_option_records.slice(-4).map((record) => record.label_tr) }); break; }
    if (source === "library") librarySourceCount += 1; else boundedRecoveryCount += 1;
    const records = recordsForPair(pair, story);
    if (records.length !== 2) { zeroValidPair += 1; break; }
    seenPairs.set(pairKey(pair), (seenPairs.get(pairKey(pair)) || 0) + 1);
    for (const record of records) {
      const sig = futureSignature(record);
      seenFutures.set(sig, (seenFutures.get(sig) || 0) + 1);
      const worldKey = `${scenarioIndex}|${beforeManifest.location}|${JSON.stringify(beforeManifest.entity_states || {})}|${sig}`;
      if (seenWorldFutures.has(worldKey)) { sameWorldSemanticRepeats += 1; semanticRepeatDetails.push({ scenarioIndex, location: beforeManifest.location, states: beforeManifest.entity_states, signature: sig, label: record.label_tr }); }
      seenWorldFutures.add(worldKey);
      if (!staticVisibleConsequence(record.result_prompt_en)) nonVisualConsequences += 1;
      if (record.route_type !== "navigation" && !record.entity_state_mutation) { stateChangeNullPhysical += 1; stateChangeNullDetails.push({ scenarioIndex, location: beforeManifest.location, label: record.label_tr, consequence: record.result_prompt_en }); }
      if (record.route_type === "navigation") {
        if (!beforeManifest.adjacent_locations.includes(record.next_location) || record.next_location === beforeManifest.location) manifestInvalid += 1;
      } else {
        const target = psychologicalTargetForOption(record).replaceAll("_", " ");
        const physical = `${beforeManifest.location} ${beforeManifest.entities.join(" ")} scene`.toLowerCase().replaceAll("_", " ");
        if (target !== "scene" && !physical.includes(target)) manifestInvalid += 1;
      }
    }
    const winner = chooseWinner(records, story, rounds.length);
    const beforeLocation = story.current_location;
    const beforeStates = JSON.stringify(story.current_scene_manifest.entity_states || {});
    story = applyStatePatch(story, winner.state_patch || {});
    const afterStates = JSON.stringify(story.current_scene_manifest.entity_states || {});
    if (story.current_location !== beforeLocation) { locationChanges += 1; stateTransitions.add(`location:${beforeLocation}->${story.current_location}`); }
    if (afterStates !== beforeStates) { entityMutations += 1; stateTransitions.add(`${winner.entity_state_mutation?.target_entity || "scene"}:${winner.entity_state_mutation?.from_state || "*"}->${winner.entity_state_mutation?.to_state || "changed"}`); }
    rounds.push({ round: rounds.length + 1, source, scene: beforeLocation, archetype: psyche.dominant_archetypal_field, pressure: psyche.archetypal_pressure[psyche.dominant_archetypal_field] || 0, entityStatesBefore: beforeManifest.entity_states || {}, option1: pair.option_1_tr, vector1: psychologicalVectorForOption(records[0]), target1: psychologicalTargetForOption(records[0]), future1: records[0].result_prompt_en, option2: pair.option_2_tr, vector2: psychologicalVectorForOption(records[1]), target2: psychologicalTargetForOption(records[1]), future2: records[1].result_prompt_en, winner: winner.label_tr, stateBefore: beforeStates, stateAfter: afterStates, nextScene: story.current_location });
    story = remember(story, pair, records, psyche.dominant_archetypal_field, source);
    psyche = updateDreamPsyche(psyche, { label_tr: winner.label_tr, intent: winner.intent, psyche_delta: winner.psyche_delta, scene_anchors: winner.scene_anchors, symbol_delta: winner.symbol_delta, context: story.current_location }, rounds.length);
  }
  history = story;
}

let trajectoryStory = normalizeStoryState(defaultStoryState());
let trajectoryPsyche = normalizeDreamPsyche(defaultDreamPsyche());
const trajectory = [];
for (let index = 0; index < 20; index += 1) {
  const beforeManifest = trajectoryStory.current_scene_manifest;
  let source = "library";
  let pair = sceneMatchedOptionLibrary(trajectoryStory, trajectoryStory.recent_option_records.slice(-8), trajectoryPsyche);
  if (!pair) { source = "bounded_recovery"; pair = sceneBoundRecoveryOptions({ storyState: trajectoryStory, previousOptions: trajectoryStory.recent_option_records.slice(-8), dreamPsyche: trajectoryPsyche }); }
  if (!pair) break;
  const records = recordsForPair(pair, trajectoryStory);
  const winner = chooseWinner(records, trajectoryStory, index);
  const stateBefore = { ...(trajectoryStory.current_scene_manifest.entity_states || {}) };
  const beforeLocation = trajectoryStory.current_location;
  trajectoryStory = applyStatePatch(trajectoryStory, winner.state_patch || {});
  trajectory.push({ step: index + 1, source, scene: beforeLocation, activeArchetype: trajectoryPsyche.dominant_archetypal_field, pressure: trajectoryPsyche.archetypal_pressure[trajectoryPsyche.dominant_archetypal_field] || 0, entityStates: beforeManifest.entity_states || {}, option1: pair.option_1_tr, vector1: psychologicalVectorForOption(records[0]), future1: records[0].result_prompt_en, option2: pair.option_2_tr, vector2: psychologicalVectorForOption(records[1]), future2: records[1].result_prompt_en, winner: winner.label_tr, stateBefore, stateAfter: trajectoryStory.current_scene_manifest.entity_states || {}, nextScene: trajectoryStory.current_location });
  trajectoryStory = remember(trajectoryStory, pair, records, trajectoryPsyche.dominant_archetypal_field, source);
  trajectoryPsyche = updateDreamPsyche(trajectoryPsyche, { label_tr: winner.label_tr, intent: winner.intent, psyche_delta: winner.psyche_delta, scene_anchors: winner.scene_anchors, symbol_delta: winner.symbol_delta, context: trajectoryStory.current_location }, index + 1);
}

const labels = rounds.flatMap((round) => [round.option1, round.option2]);
const vectors = rounds.flatMap((round) => [round.vector1, round.vector2]);
const targets = rounds.flatMap((round) => [round.option1, round.option2]);
const futureFamilies = rounds.flatMap((round) => [futureSignature({ label_tr: round.option1, result_prompt_en: round.future1 }), futureSignature({ label_tr: round.option2, result_prompt_en: round.future2 })].map((sig) => sig.split("|").slice(0, 4).join("|")));
const result = {
  requestedRounds: 200,
  completedRounds: rounds.length,
  uniqueLabels: new Set(labels).size,
  uniqueSemanticFutures: seenFutures.size,
  uniquePsychologicalVectors: new Set(vectors).size,
  uniqueStateTransitions: stateTransitions.size,
  exactPairRepeats: [...seenPairs.values()].filter((value) => value > 1).reduce((sum, value) => sum + value - 1, 0),
  sameWorldSemanticRepeats,
  manifestInvalid,
  nonVisualConsequences,
  stateChangeNullPhysical,
  locationChanges,
  entityMutations,
  librarySourceCount,
  boundedRecoveryCount,
  qwenFallbackOpportunities,
  zeroValidPair,
  mostRepeatedTargetVector: Object.entries(count(rounds.flatMap((round) => [`${round.target1}|${round.vector1}`, `${round.target2}|${round.vector2}`])))[0] || null,
  mostRepeatedFutureFamily: Object.entries(count(futureFamilies))[0] || null,
  vectorCounts: count(vectors),
  zeroPairStates,
  stateChangeNullDetails,
  semanticRepeatDetails,
  trajectory,
  rounds,
};

await writeFile("benchmark/dream-logic-final-results.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, rounds: undefined }, null, 2));
