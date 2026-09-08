import fs from "node:fs";
import path from "node:path";
import { writeFile } from "node:fs/promises";
import { debugLibraryCatalogueFlow, normalizeStoryState, psychologicalTargetForOption, psychologicalVectorForOption, sceneMatchedOptionLibrary } from "../app/lib/options.mjs";
import { OPTION_LIBRARY, optionTemplateMeta } from "../app/lib/option-library.mjs";

const mode = process.argv[2] || "baseline";
const root = process.cwd();

function loadProductionManifests() {
  const stateDir = path.join(root, "state");
  const files = fs.readdirSync(stateDir).filter((name) => name.startsWith("events.jsonl"));
  const events = [];
  for (const file of files) {
    for (const line of fs.readFileSync(path.join(stateDir, file), "utf8").split(/\r?\n/)) {
      try {
        const event = JSON.parse(line);
        if (event.type === "OPTIONS_CREATED" && event.currentSceneManifest?.location && Array.isArray(event.currentSceneManifest?.entities)) events.push(event);
      } catch {}
    }
  }
  events.sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")) || Number(a.sceneId || 0) - Number(b.sceneId || 0));
  return events.slice(-300).map((event) => ({ sceneId: event.sceneId, at: event.at, manifest: event.currentSceneManifest }));
}

const snapshotPath = path.join(root, "benchmark", "option-catalogue-manifests.json");

const inventory = OPTION_LIBRARY.map(optionTemplateMeta).filter((row) => row.route_type === "scene_local");
const stats = new Map(inventory.map((row) => [row.id, {
  template_id: row.id,
  label: row.label_tr,
  target: row.mutation?.target_entity || row.required_tags[0] || "scene",
  behavior_family: row.behavior_family,
  psychological_vector: row.psychological_vector,
  required_tags: row.required_tags,
  optional_tags: row.optional_tags,
  forbidden_tags: row.forbidden_tags,
  consequence_family: `${row.mutation?.target_entity || row.required_tags[0] || "scene"}:${row.mutation?.to_state || row.behavior_family}`,
  physically_eligible_count: 0,
  candidate_eligible_count: 0,
  ranking_considered_count: 0,
  pre_ranking_pruned_count: 0,
  selected_count: 0,
  rejected_count: 0,
  rejection_reasons: {},
}]));

const bump = (object, key) => { object[key] = (object[key] || 0) + 1; };
const pairKey = (pair) => [pair.option_1_tr, pair.option_2_tr].map((label) => String(label).toLocaleLowerCase("tr-TR")).sort().join(" || ");
// Route labels are not OPTION_LIBRARY templates.  Keep the attribution
// fallback below from mistaking a same-word local template for a navigation
// record when the library's direct pairing guard is used.
const routeLabelFor = (location) => ({
  red_house_exterior: "Kırmızı eve dön", red_house_doorstep: "Kırmızı eve yaklaş",
  front_path: "Ön yola ilerle", quiet_street: "Sokağa doğru ilerle",
  red_house_hallway: "Evin içine gir", stairwell: "Merdivene yönel",
  basement_door: "Bodrum kapısına yaklaş", basement: "Bodruma in",
  machine_room: "Makine odasına gir", alley_mouth: "Ara sokağa sap",
  control_room: "Kontrol odasına gir", hidden_tunnel: "Gizli tünele gir",
})[location] || `${String(location).replaceAll("_", " ")} yönüne ilerle`;
let manifests;
if (fs.existsSync(snapshotPath)) manifests = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
else {
  manifests = loadProductionManifests();
  fs.writeFileSync(snapshotPath, JSON.stringify(manifests, null, 2));
}
if (manifests.length < 300) throw new Error(`Only ${manifests.length} production manifests available`);

let history = normalizeStoryState({ recent_options: [], recent_option_records: [], recent_option_pairs: [], recent_situation_families: [] });
const rounds = [];
const labels = [];
const targets = [];
const behaviors = [];
const consequences = [];
const pairCounts = new Map();
let libraryPairs = 0;
let zeroPairs = 0;
let selectedNavigation = 0;
let selectedLocal = 0;
let directPairFallbacks = 0;

for (const source of manifests) {
  const manifest = source.manifest;
  const story = normalizeStoryState({
    ...history,
    current_location: manifest.location,
    current_scene_entities: manifest.entities,
    current_scene_manifest: manifest,
  });
  const coverage = debugLibraryCatalogueFlow(story, story.recent_option_records);
  for (const row of coverage) {
    const stat = stats.get(row.id);
    if (row.physicallyEligible) stat.physically_eligible_count += 1;
    if (row.accepted) stat.candidate_eligible_count += 1;
    else {
      stat.rejected_count += 1;
      bump(stat.rejection_reasons, row.rejectionReason || "other");
    }
  }

  const pair = sceneMatchedOptionLibrary(story, story.recent_option_records, {});
  if (!pair) {
    zeroPairs += 1;
    rounds.push({ sceneId: source.sceneId, location: manifest.location, pair: null });
    history = story;
    continue;
  }
  libraryPairs += 1;
  const diagnosticsById = new Map((pair._candidateDiagnostics || []).filter((row) => row.libraryId).map((row) => [row.libraryId, row]));
  const consideredIds = new Set((pair._candidateRecords || []).map((record) => record.libraryId).filter(Boolean));
  for (const row of coverage) {
    if (!row.accepted) continue;
    const stat = stats.get(row.id);
    const diagnostic = diagnosticsById.get(row.id);
    if (!diagnostic) {
      stat.pre_ranking_pruned_count += 1;
      bump(stat.rejection_reasons, "pre_ranking_dedupe_or_pool_pruning");
    } else if (!diagnostic.accepted) {
      stat.rejected_count += 1;
      bump(stat.rejection_reasons, diagnostic.reject_reason || "other_validation");
    } else if (consideredIds.has(row.id)) stat.ranking_considered_count += 1;
    else {
      stat.pre_ranking_pruned_count += 1;
      bump(stat.rejection_reasons, "pre_ranking_max_candidates");
    }
  }
  const selected = pair._selectedRecords?.length === 2
    ? pair._selectedRecords
    : [pair.option_1_tr, pair.option_2_tr].map((label) => {
      directPairFallbacks += 1 / 2;
      const routeTarget = manifest.adjacent_locations.find((location) => routeLabelFor(location) === label);
      const localTemplate = routeTarget ? null : inventory.find((row) => row.label_tr === label);
      return {
        label_tr: label,
        libraryId: localTemplate?.id || null,
        target_entity: routeTarget || localTemplate?.mutation?.target_entity || localTemplate?.required_tags?.[0] || "route",
        behavior_family: routeTarget ? "navigation" : (localTemplate?.behavior_family || "navigation"),
        route_type: routeTarget ? "navigation" : "scene_local",
        next_location: routeTarget || manifest.location,
        result_prompt_en: localTemplate?.visible_consequence || "",
      };
    });
  const selectedRows = selected.map((record, index) => {
    const label = record.label_tr || pair[`option_${index + 1}_tr`];
    const template = record.libraryId ? stats.get(record.libraryId) : [...stats.values()].find((row) => row.label === label);
    if (template) template.selected_count += 1;
    const target = record.target_entity || template?.target || record.next_location || "scene";
    const behavior = record.behavior_family || record.intent || template?.behavior_family || "navigation";
    const consequence = template?.consequence_family || `${target}:${record.entity_state_mutation?.to_state || behavior}`;
    const routeType = record.route_type || (record.next_location && record.next_location !== manifest.location ? "navigation" : "scene_local");
    if (routeType === "navigation") selectedNavigation += 1; else selectedLocal += 1;
    labels.push(label); targets.push(target); behaviors.push(behavior); consequences.push(consequence);
    return { label_tr: label, result_prompt_en: record.result_prompt_en || template?.visible_consequence || "", behavior_family: behavior, intent: behavior, route_type: routeType, next_location: record.next_location || manifest.location, target_entity: target, psychological_vector: psychologicalVectorForOption(record), source: "library", archetype: "" };
  });
  const key = pairKey(pair); pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
  rounds.push({ sceneId: source.sceneId, location: manifest.location, pair: [pair.option_1_tr, pair.option_2_tr], selected: selectedRows, trace: pair._libraryTrace || null });
  history = normalizeStoryState({
    ...story,
    recent_options: [...new Set([...(story.recent_options || []), ...selectedRows.map((row) => row.label_tr)])].slice(-20),
    recent_option_records: [...(story.recent_option_records || []), ...selectedRows].slice(-20),
    recent_option_pairs: [...(story.recent_option_pairs || []), key].slice(-256),
    recent_situation_families: [...(story.recent_situation_families || []), ...selectedRows.map((row) => row.behavior_family)].slice(-20),
  });
}

const table = [...stats.values()].map((row) => ({ ...row, utilization_class: row.physically_eligible_count === 0 ? "A_NEVER_PHYSICALLY_ELIGIBLE" : row.selected_count === 0 ? "B_ELIGIBLE_NEVER_SELECTED" : row.selected_count >= 8 ? "D_FREQUENTLY_SELECTED" : "C_ELIGIBLE_SELECTED" }));
const everEligible = table.filter((row) => row.physically_eligible_count > 0);
const everSelected = table.filter((row) => row.selected_count > 0);
const figureSelected = table.filter((row) => row.target === "figure").reduce((sum, row) => sum + row.selected_count, 0);
const result = {
  mode,
  sample: { rounds: manifests.length, firstScene: manifests[0]?.sceneId, lastScene: manifests.at(-1)?.sceneId },
  inventory: {
    totalTemplates: inventory.length,
    totalUniqueLabels: new Set(inventory.map((row) => row.label_tr)).size,
    totalBehaviorFamilies: new Set(inventory.map((row) => row.behavior_family)).size,
    totalTargetFamilies: new Set(inventory.map((row) => row.mutation?.target_entity || row.required_tags[0] || "scene")).size,
    totalConsequenceFamilies: new Set(inventory.map((row) => `${row.mutation?.target_entity || row.required_tags[0] || "scene"}:${row.mutation?.to_state || row.behavior_family}`)).size,
  },
  utilization: {
    everEligibleTemplates: everEligible.length,
    everSelectedTemplates: everSelected.length,
    selectionCoveragePercent: Number((everSelected.length / Math.max(1, everEligible.length) * 100).toFixed(2)),
    neverPhysicallyEligible: table.filter((row) => row.utilization_class.startsWith("A_")).length,
    eligibleNeverSelected: table.filter((row) => row.utilization_class.startsWith("B_")).length,
    eligibleSelected: table.filter((row) => row.utilization_class.startsWith("C_")).length,
    frequentlySelected: table.filter((row) => row.utilization_class.startsWith("D_")).length,
  },
  displayed: {
    libraryPairs,
    zeroPairs,
    uniqueLabels: new Set(labels).size,
    uniqueBehaviors: new Set(behaviors).size,
    uniqueTargets: new Set(targets).size,
    uniqueConsequenceFamilies: new Set(consequences).size,
    uniquePairs: pairCounts.size,
    exactPairRepeats: [...pairCounts.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0),
    navigation: selectedNavigation,
    sceneLocal: selectedLocal,
    directPairFallbacks: Math.round(directPairFallbacks),
    figureTargetSharePercent: Number((figureSelected / Math.max(1, selectedLocal) * 100).toFixed(2)),
  },
  top10: [...table].sort((a, b) => b.selected_count - a.selected_count || a.label.localeCompare(b.label, "tr")).slice(0, 10),
  bottomEligibleUsed: everSelected.slice().sort((a, b) => a.selected_count - b.selected_count || b.physically_eligible_count - a.physically_eligible_count).slice(0, 20),
  eligibleNeverUsed: table.filter((row) => row.physically_eligible_count > 0 && row.selected_count === 0),
  templates: table,
  rounds,
};

await writeFile(`benchmark/option-catalogue-utilization-${mode}.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ inventory: result.inventory, utilization: result.utilization, displayed: result.displayed, top10: result.top10.map((row) => ({ id: row.template_id, label: row.label, target: row.target, behavior: row.behavior_family, eligible: row.physically_eligible_count, selected: row.selected_count })), eligibleNeverUsed: result.eligibleNeverUsed.map((row) => ({ id: row.template_id, label: row.label, target: row.target, behavior: row.behavior_family, eligible: row.physically_eligible_count })) }, null, 2));
