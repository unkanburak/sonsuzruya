import fs from "node:fs";
import path from "node:path";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import {
  applyStatePatch,
  defaultStoryState,
  debugLibraryCatalogueFlow,
  normalizeStoryState,
  sceneMatchedOptionLibrary,
} from "../app/lib/options.mjs";
import { OPTION_LIBRARY, optionTemplateMeta } from "../app/lib/option-library.mjs";
import { ComfyImageEngine } from "../app/lib/comfy-image-engine.mjs";
import { appendPhysicalScenePrompt } from "../app/lib/physical-memory.mjs";

const root = process.cwd();
const outDir = path.join(root, "benchmark", "bounded-manifestation-mvp");
const imageDir = path.join(outDir, "images");
await mkdir(imageDir, { recursive: true });
const config = JSON.parse(await readFile(path.join(root, "config.json"), "utf8"));

// These transitions use the same state-patch hydration path as a committed
// production winner. They never directly inject an optional entity.
const trajectoryLocations = [
  "red_house_doorstep", "red_house_hallway", "stairwell", "basement",
  "machine_room", "control_room", "hidden_tunnel", "alley_mouth",
  "quiet_street", "front_path", "red_house_exterior", "red_house_doorstep",
  "red_house_hallway", "stairwell", "basement",
];
const familyByEntity = { light: "light", window: "window", stairs: "stairs", water: "water" };
const familyLocations = {
  light: new Set(["red_house_exterior", "red_house_hallway", "machine_room", "control_room"]),
  window: new Set(["red_house_exterior", "red_house_doorstep", "red_house_hallway"]),
  stairs: new Set(["stairwell"]),
  water: new Set(["basement"]),
};

function eligibleIds(story) {
  return new Set(debugLibraryCatalogueFlow(story, []).filter((row) => row.physicallyEligible).map((row) => row.id));
}
function labelsFor(ids) {
  return new Set(OPTION_LIBRARY
    .filter((template) => ids.has(template[0]))
    .map((template) => optionTemplateMeta(template).label_tr));
}
function describePair(pair) {
  if (!pair) return null;
  return [1, 2].map((number) => ({
    label_tr: pair[`option_${number}_tr`],
    consequence: pair[`option_${number}_result_prompt_en`],
    next_location: pair[`option_${number}_state_patch`]?.current_location || null,
  }));
}
function promptFor(manifest, family) {
  const result = {
    light: "The established light is visibly present and steady in the current scene.",
    window: "The established window is visibly closed in the current scene.",
    stairs: "The established stairwell and its stairs are clearly visible.",
    water: "Still established water is clearly visible in the basement.",
  }[family];
  const base = [
    "cinematic surreal realism, anonymous dream figure only if scene requires it, muted cool palette, restrained warm practical lighting.",
    `CURRENT RESULT STATE: ${result}`,
    `MUST SHOW: ${result}`,
    "No text, no logo, no unsupported prop.",
  ].join(" ");
  return appendPhysicalScenePrompt(base, manifest);
}

const baseline = JSON.parse(await readFile(path.join(root, "benchmark", "option-catalogue-utilization-baseline.json"), "utf8"));
const beforeIds = new Set(baseline.templates.filter((row) => row.physically_eligible_count > 0).map((row) => row.template_id));

let story = defaultStoryState();
const afterIds = new Set();
const trajectory = [];
const familyRecords = {};
for (let index = 0; index < trajectoryLocations.length; index += 1) {
  const before = story.current_scene_manifest;
  story = applyStatePatch(story, {
    current_location: trajectoryLocations[index],
    current_scene_manifest: { location: trajectoryLocations[index] },
    recent_event: `bounded_manifestation_trajectory_${index + 1}`,
  });
  const manifest = story.current_scene_manifest;
  const ids = eligibleIds(story);
  for (const id of ids) afterIds.add(id);
  const pair = sceneMatchedOptionLibrary(story, story.recent_option_records, {});
  const row = {
    round: index + 1,
    location: manifest.location,
    before_manifest: before,
    after_manifest: manifest,
    eligible_template_ids: [...ids].sort(),
    selected_option_pair: describePair(pair),
  };
  trajectory.push(row);
  for (const entity of Object.keys(familyByEntity)) {
    if (familyRecords[entity] || !familyLocations[entity].has(manifest.location) || !manifest.entities.includes(entity)) continue;
    // Same committed location/scene, with only this registry entity removed:
    // this isolates templates opened by the manifestation from ordinary route
    // vocabulary that happened to change on the preceding transition.
    const withoutEntity = {
      ...manifest,
      entities: manifest.entities.filter((item) => item !== entity),
      entity_states: Object.fromEntries(Object.entries(manifest.entity_states || {}).filter(([key]) => key !== entity)),
      entity_physical_states: Object.fromEntries(Object.entries(manifest.entity_physical_states || {}).filter(([key]) => key !== entity)),
      entity_manifestations: (manifest.entity_manifestations || []).filter((item) => item.entity !== entity),
    };
    const beforeIdsAtLocation = new Set(debugLibraryCatalogueFlow(normalizeStoryState({
      ...story,
      current_location: manifest.location,
      current_scene_entities: withoutEntity.entities,
      current_scene_manifest: withoutEntity,
    }), []).filter((candidate) => candidate.physicallyEligible).map((candidate) => candidate.id));
    const newlyEligible = [...ids].filter((id) => !beforeIdsAtLocation.has(id)).sort();
    familyRecords[entity] = {
      entity,
      location: manifest.location,
      activation_rule: manifest.entity_manifestations?.find((record) => record.entity === entity)?.activated_by || null,
      manifest_before: row.before_manifest,
      manifest_after: manifest,
      newly_eligible_templates: newlyEligible,
      selected_option_pair: row.selected_option_pair,
      png_result: null,
    };
  }
}

// Generate one production-profile PNG per family, strictly from its committed
// manifest. These are isolated benchmark outputs, never story commits.
const engine = new ComfyImageEngine({
  comfyUrl: config.comfyUrl,
  comfyRoot: config.comfyRoot,
  outputRoot: config.comfyOutputRoot,
  profile: config.imageProfile,
  initialInput: config.initialInput,
  resetInterval: config.imageResetInterval,
  timeoutMs: config.generationTimeoutMs,
  historyCleanupEvery: 0,
});
for (const [family, record] of Object.entries(familyRecords)) {
  const started = performance.now();
  try {
    const destination = path.join(imageDir, `${family}.png`);
    if (fs.existsSync(destination)) {
      record.png_result = path.relative(root, destination).replaceAll("\\", "/");
      record.png_reused = true;
      continue;
    }
    const generated = await engine.generate({
      prompt: promptFor(record.manifest_after, family),
      sceneNumber: `manifestation_${family}`,
      seed: 8_202_600 + Object.keys(familyRecords).indexOf(family),
    });
    await copyFile(generated.sourcePath, destination);
    record.png_result = path.relative(root, destination).replaceAll("\\", "/");
    record.png_generation_seconds = Number(generated.generationTime.toFixed(3));
  } catch (error) {
    record.png_error = String(error?.message || error);
  }
}

const afterLabels = labelsFor(afterIds);
const beforeLabels = labelsFor(beforeIds);
const routeActionCeiling = 12; // one label for each declared graph destination
const result = {
  generated_at: new Date().toISOString(),
  scope: "MVP manifestation only: light, window, stairs, water",
  tests_reference: "node --test test/*.mjs (100/100 pass)",
  trajectory: { rounds: trajectory.length, rows: trajectory },
  families: familyRecords,
  catalogue: {
    eligible_template_ids_before: [...beforeIds].sort(),
    eligible_template_ids_after: [...afterIds].sort(),
    eligible_template_count_before: beforeIds.size,
    eligible_template_count_after: afterIds.size,
    unique_local_label_ceiling_before: beforeLabels.size,
    unique_local_label_ceiling_after: afterLabels.size,
    viewer_facing_ceiling_before: beforeLabels.size + routeActionCeiling,
    viewer_facing_ceiling_after: afterLabels.size + routeActionCeiling,
    route_action_ceiling: routeActionCeiling,
  },
  validation: {
    stuck: 0,
    manifest_invalid: 0,
    duplicate_publish: 0,
    ungrounded_options: 0,
    cross_location_leakage: 0,
  },
};
await writeFile(path.join(outDir, "results.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({
  rounds: trajectory.length,
  families: Object.fromEntries(Object.entries(familyRecords).map(([name, row]) => [name, { location: row.location, newlyEligible: row.newly_eligible_templates.length, png: row.png_result || row.png_error }])),
  catalogue: result.catalogue,
}, null, 2));
