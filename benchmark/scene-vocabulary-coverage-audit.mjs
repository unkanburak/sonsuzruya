import fs from "node:fs";
import path from "node:path";
import { debugLibraryCatalogueFlow, normalizeStoryState } from "../app/lib/options.mjs";
import { OPTION_LIBRARY, optionTemplateMeta } from "../app/lib/option-library.mjs";

const root = process.cwd();
const events = [];
for (const file of fs.readdirSync(path.join(root, "state")).filter((name) => name.startsWith("events.jsonl"))) {
  for (const line of fs.readFileSync(path.join(root, "state", file), "utf8").split(/\r?\n/)) {
    try {
      const event = JSON.parse(line);
      const manifest = event.type === "OPTIONS_CREATED" ? event.currentSceneManifest : null;
      if (manifest?.location && Array.isArray(manifest.entities)) events.push({ sceneId: event.sceneId, at: event.at, manifest });
    } catch {}
  }
}
events.sort((a, b) => String(a.at || "").localeCompare(String(b.at || "")) || Number(a.sceneId || 0) - Number(b.sceneId || 0));
const key = (manifest) => JSON.stringify({ location: manifest.location, entities: manifest.entities, adjacent_locations: manifest.adjacent_locations, entity_states: manifest.entity_states });
const unique = [...new Map(events.map((event) => [key(event.manifest), event.manifest])).values()];
const inventory = OPTION_LIBRARY.map(optionTemplateMeta).filter((row) => row.route_type === "scene_local");
const rows = new Map(inventory.map((row) => [row.id, { ...row, eligible: 0, tagMatch: 0, missingEntity: 0, stateVisibility: 0, stateValidity: 0 }]));
const locations = {};
const entities = {};
for (const manifest of unique) {
  locations[manifest.location] = (locations[manifest.location] || 0) + 1;
  for (const entity of manifest.entities) entities[entity] = (entities[entity] || 0) + 1;
  const story = normalizeStoryState({ current_location: manifest.location, current_scene_entities: manifest.entities, current_scene_manifest: manifest, recent_options: [], recent_option_records: [] });
  for (const item of debugLibraryCatalogueFlow(story, [])) {
    const row = rows.get(item.id);
    if (!row) continue;
    if (item.tagMatch) row.tagMatch += 1;
    if (!item.grounded) row.missingEntity += 1;
    if (!item.visible) row.stateVisibility += 1;
    if (!item.stateReady || !item.hasMutation) row.stateValidity += 1;
    if (item.physicallyEligible) row.eligible += 1;
  }
}
const neverEligible = [...rows.values()].filter((row) => row.eligible === 0).map((row) => ({ id: row.id, label_tr: row.label_tr, behavior_family: row.behavior_family, required_tags: row.required_tags, optional_tags: row.optional_tags, tagMatch: row.tagMatch, missingEntity: row.missingEntity, stateVisibility: row.stateVisibility, stateValidity: row.stateValidity }));
const result = { events: events.length, uniqueManifests: unique.length, sceneLocations: locations, committedEntities: entities, totalTemplates: inventory.length, everEligible: inventory.filter((row) => rows.get(row.id).eligible > 0).length, neverEligibleCount: neverEligible.length, neverEligible, rows: [...rows.values()] };
fs.writeFileSync(path.join(root, "benchmark", "scene-vocabulary-coverage-audit.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ events: result.events, uniqueManifests: result.uniqueManifests, locations, committedEntities: entities, totalTemplates: result.totalTemplates, everEligible: result.everEligible, neverEligibleCount: result.neverEligibleCount, neverEligible: result.neverEligible }, null, 2));
