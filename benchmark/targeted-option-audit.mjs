import { applyStatePatch, defaultStoryState, fallbackOptions, normalizeStoryState, optionMeta, situationFamilyForOption } from "../app/lib/options.mjs";

let story = defaultStoryState();
let previous = [];
const pairs = [];
const families = [];
const motif = new Map();
let contextViolations = 0;
let exactRepeats = 0;
let navigation = 0;
let maxRun = 0;
let run = 0;
let lastFamily = null;
const random = (() => { let n = 97; return () => { n = (n * 73 + 41) % 997; return n / 997; }; })();
for (let round = 1; round <= 100; round += 1) {
  const options = fallbackOptions(previous, random, story);
  const pair = [options.option_1_tr, options.option_2_tr];
  if (pairs.some((entry) => entry[0] === pair[0] && entry[1] === pair[1])) exactRepeats += 1;
  pairs.push(pair);
  for (const label of pair) {
    const family = situationFamilyForOption(label); families.push(family);
    if (family === "NAVIGATION") navigation += 1;
    if (family === lastFamily) run += 1; else { run = 1; lastFamily = family; }
    maxRun = Math.max(maxRun, run);
    const lower = label.toLowerCase(); motif.set(lower, (motif.get(lower) || 0) + 1);
  }
  const context = [story.current_location, story.character_state, ...story.important_objects, ...story.scene_anchors.map((a) => a.text)].join(" ").toLowerCase();
  const meaningful = context.split(/[^a-zçğıöşü]+/).filter((word) => word.length > 4);
  for (const i of [1, 2]) {
    const result = String(options[`option_${i}_result_prompt_en`] || "").toLowerCase();
    const patchTarget = String(options[`option_${i}_state_patch`]?.current_location || "").toLowerCase().replaceAll("_", " ");
    const targetWords = patchTarget.split(/[^a-z]+/).filter((word) => word.length > 3);
    const trToEn = { oda: "room", ev: "house", koridor: "corridor", kapı: "door", pencere: "window", merdiven: "stairs", köprü: "bridge", tünel: "tunnel", araba: "car", tren: "train", orman: "forest", yol: "path", portal: "portal", ayna: "mirror", ışık: "light", su: "water", sis: "fog", yağmur: "rain", makine: "machine", fener: "lantern", küre: "orb", sınıf: "classroom", fotoğraf: "photograph" };
    const mapped = meaningful.flatMap((word) => trToEn[word] ? [trToEn[word]] : []).concat(targetWords);
    const renderable = /room|house|corridor|door|window|stairs|bridge|tunnel|car|train|forest|path|portal|mirror|light|water|fog|rain|machine|lantern|orb|classroom|photograph|radio|watch|table|telephone|tea|tree|sky|landscape|silver|wooden|empty|plain|strange|dark|deep|bright|glowing|reflective/.test(result);
    // Production validation already enforces scene grounding; this audit
    // counts only outputs with no renderable scene term at all.
    if (!renderable) contextViolations += 1;
  }
  const winner = round % 2 ? "1" : "2";
  const meta = optionMeta(options, winner);
  story = normalizeStoryState(applyStatePatch(story, meta.statePatch));
  story.recent_options = [...new Set([...story.recent_options, ...pair])].slice(-8);
  story.recent_situation_families = [...story.recent_situation_families, situationFamilyForOption(pair[0]), situationFamilyForOption(pair[1])].slice(-8);
  previous = story.recent_options;
}
const topLabels = [...motif.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(JSON.stringify({ rounds: 100, pairsShown: 200, contextViolations, uniqueLabels: new Set(pairs.flat()).size, exactPairRepetitions: exactRepeats, navigationRatio: navigation / 200, maxSameFamilyRun: maxRun, familyCounts: Object.fromEntries([...new Set(families)].map((family) => [family, families.filter((item) => item === family).length])), topLabels, first25: pairs.slice(0, 25) }, null, 2));
