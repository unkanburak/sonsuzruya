import { writeFile } from "node:fs/promises";
import { applyStatePatch, archetypeAffinityScore, defaultStoryState, futureSignature, normalizeStoryState, optionMeta, psychologicalTargetForOption, psychologicalVectorForOption, sceneBoundRecoveryOptions, sceneMatchedOptionLibrary } from "../app/lib/options.mjs";
import { defaultDreamPsyche, normalizeDreamPsyche, updateDreamPsyche } from "../app/lib/jungian-dream-engine.mjs";

const archetypalOptionBiasEnabled = process.env.ARCHETYPAL_OPTION_BIAS_ENABLED !== "0";
process.env.ARCHETYPAL_OPTION_BIAS_ENABLED = archetypalOptionBiasEnabled ? "1" : "0";
const psycheOrder = ["shadow", "persona", "trickster", "self", "wise_figure", "child", "mother_field", "anima_animus"];
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
const scenarios = Array.from({ length: 4 }, (_, cycle) => baseScenarios.map(([location, entities, adjacent]) => [location, entities, adjacent, cycle + 1])).flat();

const pairKey = (pair) => [pair.option_1_tr, pair.option_2_tr].map((x) => x.toLocaleLowerCase("tr-TR")).sort().join(" || ");
function remember(current, pair, records, archetype) {
  const labels = [pair.option_1_tr, pair.option_2_tr];
  const rows = records.map((record, index) => ({ label_tr: labels[index], result_prompt_en: record.result_prompt_en || "", intent: record.intent || "", source: "library", psychological_vector: psychologicalVectorForOption(record), target_entity: psychologicalTargetForOption(record), archetype }));
  return normalizeStoryState({ ...current, recent_options: [...new Set([...(current.recent_options || []), ...labels])].slice(-20), recent_option_records: [...(current.recent_option_records || []), ...rows].slice(-20), recent_option_pairs: [...(current.recent_option_pairs || []), pairKey(pair)].slice(-256) });
}

const rounds=[]; const seenPairs=new Map(); const seenFutures=new Map(); const seenWorldFutures=new Set(); let misses=0, locationChanges=0, stateMutations=0, manifestInvalid=0, futureGuardViolations=0, aligned=0, compensatory=0;
let carriedHistory = normalizeStoryState(defaultStoryState());
for (let s=0; s<scenarios.length && rounds.length<100; s++) {
  const [location, entities, adjacent, cycle] = scenarios[s];
  let story=normalizeStoryState({ ...carriedHistory, current_location:location, current_scene_entities:entities, current_scene_manifest:{location,entities,adjacent_locations:adjacent,entity_states:{},summary:`A grounded ${location.replaceAll("_"," ")} scene, cycle ${cycle}`} });
  let psyche=normalizeDreamPsyche({ ...defaultDreamPsyche(), dominant_archetypal_field:psycheOrder[s%psycheOrder.length], archetypal_pressure:{ ...defaultDreamPsyche().archetypal_pressure, [psycheOrder[s%psycheOrder.length]]:0.82 } });
  for(let step=0; step<2 && rounds.length<100; step++) {
    const archetype=psyche.dominant_archetypal_field; const pressure=psyche.archetypal_pressure[archetype]||0; const manifest=story.current_scene_manifest;
    const pair=sceneMatchedOptionLibrary(story,story.recent_option_records.slice(-8),psyche); if(!pair){misses++; break}
    const records=pair._selectedRecords||[]; if(records.length!==2){misses++;break}
    seenPairs.set(pairKey(pair),(seenPairs.get(pairKey(pair))||0)+1);
    for(const record of records){const sig=futureSignature(record);seenFutures.set(sig,(seenFutures.get(sig)||0)+1);const worldFutureKey=`${s}|${manifest.location}|${JSON.stringify(manifest.entity_states||{})}|${sig}`;if(seenWorldFutures.has(worldFutureKey))futureGuardViolations++;seenWorldFutures.add(worldFutureKey);const target=psychologicalTargetForOption(record);const physical=`${manifest.location} ${(manifest.entities||[]).join(" ")}`.toLowerCase().replaceAll("_"," ");if(record.route_type==="navigation"?!manifest.adjacent_locations.includes(record.next_location):(target!=="scene"&&!physical.includes(target.replaceAll("_"," "))))manifestInvalid++;const affinity=archetypeAffinityScore(record,archetype,pressure);if(affinity>=pressure*1.5&&affinity>0)aligned++;else if(affinity>0)compensatory++}
    const winner=records[(rounds.length+s)%2];const beforeLocation=story.current_location;const beforeStates=JSON.stringify(story.current_scene_manifest.entity_states||{});story=applyStatePatch(story,winner.state_patch||{});if(story.current_location!==beforeLocation)locationChanges++;if(JSON.stringify(story.current_scene_manifest.entity_states||{})!==beforeStates)stateMutations++;
    rounds.push({round:rounds.length+1,scene:beforeLocation,archetype,pressure,option1:pair.option_1_tr,option1Vector:psychologicalVectorForOption(records[0]),option1Target:psychologicalTargetForOption(records[0]),option2:pair.option_2_tr,option2Vector:psychologicalVectorForOption(records[1]),option2Target:psychologicalTargetForOption(records[1]),winner:winner.label_tr,visibleConsequence:winner.result_prompt_en,stateChange:winner.entity_state_mutation||null,nextScene:story.current_location});
    story=remember(story,pair,records,archetype);psyche=updateDreamPsyche(psyche,{label_tr:winner.label_tr,intent:winner.intent,psyche_delta:winner.psyche_delta,scene_anchors:winner.scene_anchors,symbol_delta:winner.symbol_delta,context:story.current_location},rounds.length);
  }
  carriedHistory=story;
}

let tStory=normalizeStoryState(defaultStoryState());let tPsyche=normalizeDreamPsyche(defaultDreamPsyche());const trajectory=[];
for(let i=0;i<15;i++){
  const archetype=tPsyche.dominant_archetypal_field;const pressure=tPsyche.archetypal_pressure[archetype]||0;let source="library";let pair=sceneMatchedOptionLibrary(tStory,tStory.recent_option_records.slice(-8),tPsyche);let records=pair?._selectedRecords||[];
  if(!pair||records.length!==2){source="bounded_recovery";pair=sceneBoundRecoveryOptions({storyState:tStory,previousOptions:tStory.recent_option_records.slice(-8),dreamPsyche:tPsyche});if(!pair)break;records=["1","2"].map((index)=>{const meta=optionMeta(pair,index);const next=meta.statePatch?.current_location||tStory.current_location;return{label_tr:pair[`option_${index}_tr`],result_prompt_en:meta.resultPrompt,intent:meta.intent,state_patch:meta.statePatch,next_location:next,route_type:next!==tStory.current_location?"navigation":"scene_local",psychological_vector:psychologicalVectorForOption({label_tr:pair[`option_${index}_tr`],intent:meta.intent})}})}
  const route=records.find((r)=>r.route_type==="navigation");const local=records.find((r)=>r.route_type!=="navigation");const winner=(i%2===1&&route)?route:(local||route||records[0]);const before=tStory.current_location;tStory=applyStatePatch(tStory,winner.state_patch||{});
  trajectory.push({step:i+1,source,scene:before,activeArchetype:archetype,pressure,option1:pair.option_1_tr,option1Vector:psychologicalVectorForOption(records[0]),option2:pair.option_2_tr,option2Vector:psychologicalVectorForOption(records[1]),winner:winner.label_tr,visibleConsequence:winner.result_prompt_en,stateChange:winner.entity_state_mutation||(before!==tStory.current_location?{location:`${before}->${tStory.current_location}`} : null),nextScene:tStory.current_location});
  tStory=remember(tStory,pair,records,archetype);tPsyche=updateDreamPsyche(tPsyche,{label_tr:winner.label_tr,intent:winner.intent,psyche_delta:winner.psyche_delta,scene_anchors:winner.scene_anchors,symbol_delta:winner.symbol_delta,context:tStory.current_location},i+1);
}

const vectors=rounds.flatMap(r=>[r.option1Vector,r.option2Vector]);const labels=rounds.flatMap(r=>[r.option1,r.option2]);const targetVectors=rounds.flatMap(r=>[`${r.option1Target}|${r.option1Vector}`,`${r.option2Target}|${r.option2Vector}`]);const counts=(values)=>Object.fromEntries([...new Set(values)].map(v=>[v,values.filter(x=>x===v).length]).sort((a,b)=>b[1]-a[1]));
const result={archetypalOptionBiasEnabled,requestedDisplayedRounds:100,completedDisplayedRounds:rounds.length,libraryMisses:misses,uniqueLabels:new Set(labels).size,uniqueFutureSignatures:seenFutures.size,uniquePsychologicalVectors:new Set(vectors).size,uniqueArchetypeVectorCombinations:new Set(rounds.flatMap(r=>[`${r.archetype}|${r.option1Vector}`,`${r.archetype}|${r.option2Vector}`])).size,psychologicallyContrastedPairs:rounds.filter((round)=>round.option1Vector!==round.option2Vector).length,exactPairRepeats:[...seenPairs.values()].filter(c=>c>1).reduce((n,c)=>n+c-1,0),futureSignatureRepeats:[...seenFutures.values()].filter(c=>c>1).reduce((n,c)=>n+c-1,0),futureSignatureGuardViolations:futureGuardViolations,manifestInvalid,locationChanges,stateMutations,archetypeAlignedSelections:aligned,compensatorySelections:compensatory,mostRepeatedVector:Object.entries(counts(vectors))[0]||null,mostRepeatedTargetVector:Object.entries(counts(targetVectors))[0]||null,vectorCounts:counts(vectors),targetVectorCounts:counts(targetVectors),trajectory,rounds};
await writeFile(process.env.ARCHETYPE_BENCHMARK_OUTPUT || "benchmark/archetypal-option-ranking-results.json",JSON.stringify(result,null,2));console.log(JSON.stringify({...result,rounds:undefined},null,2));
