import { applyStatePatch, defaultStoryState, fallbackGroundingScore, fallbackOptions, FALLBACK_CATALOG, normalizeStoryState, optionMeta, optionCategory, recordRenderedVisualMotifs, situationFamilyForOption } from "../app/lib/options.mjs";

const catalog = new Map(FALLBACK_CATALOG.map((item) => [item.state_id, item]));
const candidateFor = (options, index, story) => {
  const id = options[`option_${index}_id`];
  const base = catalog.get(id) || { state_id: id, group: "discovery" };
  return { ...base, label_tr: options[`option_${index}_tr`], result_prompt_en: options[`option_${index}_result_prompt_en`], state_patch: options[`option_${index}_state_patch`] };
};
const score = (options, index, story) => fallbackGroundingScore(candidateFor(options, index, story), story);
const random = (() => { let n = 97; return () => { n = (n * 73 + 41) % 997; return n / 997; }; })();

let story = defaultStoryState();
let previous = [];
const pairs = [];
const labels = [];
const families = [];
const grounding = { 0: 0, 1: 0, 2: 0 };
let recent12Repeats = 0;
let pairTooClose = 0;
let exactPairRepeats = 0;
let navigation = 0;
let genericTrope = 0;
let staleHookDerived = 0;
let surrealTotal = 0;
let surrealGrounded = 0;
const tropeRe = /portal|portala|sis|ışık|ışığı|ayna|koridor|tünel|köprü|kapı|araba|fog|light|mirror|corridor|tunnel|bridge|door|car/i;

for (let round = 1; round <= 120; round += 1) {
  const options = fallbackOptions(previous, random, story);
  const pair = [options.option_1_tr, options.option_2_tr];
  if (pairs.some((entry) => entry[0] === pair[0] && entry[1] === pair[1])) exactPairRepeats += 1;
  const previousWindow = labels.slice(-12).map((item) => item.toLowerCase());
  for (const [index, label] of [[1, pair[0]], [2, pair[1]]]) {
    const level = score(options, index, story); grounding[level] += 1;
    if (previousWindow.includes(label.toLowerCase())) recent12Repeats += 1;
    const family = situationFamilyForOption(label); families.push(family);
    if (family === "NAVIGATION") navigation += 1;
    if (tropeRe.test(label)) genericTrope += 1;
    const surreal = ["ENVIRONMENT_TRANSFORMATION", "DISCOVERY", "OBJECT_TRANSFORMATION"].includes(family);
    if (surreal) { surrealTotal += 1; if (level >= 1) surrealGrounded += 1; }
    const expired = (story.scene_anchors || []).filter((a) => Number(a?.ttl) <= 1).map((a) => String(a.text).toLowerCase());
    if (expired.some((anchor) => String(options[`option_${index}_result_prompt_en`]).toLowerCase().includes(anchor))) staleHookDerived += 1;
    labels.push(label);
  }
  if (optionCategory(pair[0]) === optionCategory(pair[1]) || situationFamilyForOption(pair[0]) === situationFamilyForOption(pair[1])) pairTooClose += 1;
  pairs.push(pair);
  const winner = round % 2 ? "1" : "2";
  const winnerMeta = optionMeta(options, winner);
  story = normalizeStoryState(applyStatePatch(story, winnerMeta.statePatch));
  story = recordRenderedVisualMotifs(story, winnerMeta.resultPrompt);
  story.recent_options = [...new Set([...story.recent_options, ...pair])].slice(-8);
  story.recent_situation_families = [...story.recent_situation_families, situationFamilyForOption(pair[0]), situationFamilyForOption(pair[1])].slice(-12);
  previous = story.recent_options;
}

const adversarialBase = defaultStoryState();
const adversarialScenes = {
  A_kitchen: { ...adversarialBase, current_location: "kitchen", important_objects: ["old_radio", "warm_tea", "old_photograph"], scene_anchors: [{ text: "kitchen table", ttl: 3 }] },
  B_classroom: { ...adversarialBase, current_location: "empty_classroom", character_state: "sitting_alone", important_objects: ["desks", "clock"] },
  C_car: { ...adversarialBase, current_location: "mysterious_car", important_objects: ["car"] },
  D_door: { ...adversarialBase, current_location: "outside_door", scene_anchors: [{ text: "a strange doorway", ttl: 3 }] },
  E_mirror: { ...adversarialBase, current_location: "mirror_room", important_objects: ["giant_mirror"], scene_anchors: [{ text: "giant mirrors in a room", ttl: 3 }] },
};
const adversarial = Object.fromEntries(Object.entries(adversarialScenes).map(([name, scene]) => {
  const options = fallbackOptions([], () => 0, scene);
  return [name, { ids: [options.option_1_id, options.option_2_id], labels: [options.option_1_tr, options.option_2_tr] }];
}));

console.log(JSON.stringify({
  rounds: 120, pairsShown: 240, grounding, recent12RepetitionRate: recent12Repeats / 240,
  pairTooCloseRate: pairTooClose / 120, exactPairRepeatRate: exactPairRepeats / 120,
  navigationRate: navigation / 240, genericTropeRate: genericTrope / 240,
  staleHookDerived, surreal: { total: surrealTotal, groundedRate: surrealTotal ? surrealGrounded / surrealTotal : 0 },
  uniqueLabels: new Set(labels).size, adversarial, first20: pairs.slice(0, 20), last10: pairs.slice(-10),
}, null, 2));
