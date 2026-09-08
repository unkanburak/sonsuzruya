import { defaultStoryState, sceneMatchedOptionLibrary, applyStatePatch } from "../app/lib/options.mjs";

let story = defaultStoryState();
let previous = [];
const pairs = new Set();
let repeats = 0;
let nulls = 0;
const locations = new Set();

for (let turn = 0; turn < 300; turn += 1) {
  const pair = sceneMatchedOptionLibrary(story, previous);
  if (!pair) { nulls += 1; continue; }
  const labels = [pair.option_1_tr, pair.option_2_tr];
  const signature = labels.join(" || ");
  if (pairs.has(signature)) repeats += 1;
  pairs.add(signature);
  locations.add(story.current_location);
  const selected = pair._selectedRecords?.[turn % 2] || pair._selectedRecords?.[0];
  if (selected?.state_patch) story = applyStatePatch(story, selected.state_patch);
  previous = labels;
  story = { ...story, recent_option_pairs: [...story.recent_option_pairs, signature].slice(-256), recent_options: [...story.recent_options, ...labels].slice(-20), recent_option_records: [...story.recent_option_records, ...labels.map((label, index) => ({ label_tr: label, result_prompt_en: pair[`option_${index + 1}_result_prompt_en`] || "", intent: pair[`option_${index + 1}_intent`] || "" }))].slice(-20) };
}

console.log(JSON.stringify({ rounds: 300, nulls, uniquePairs: pairs.size, repeats, locations: [...locations] }, null, 2));
