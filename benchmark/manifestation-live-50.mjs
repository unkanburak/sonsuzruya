import fs from "node:fs";
import path from "node:path";
import { writeFile } from "node:fs/promises";

const base = "http://127.0.0.1:3000";
const outPath = path.join(process.cwd(), "benchmark", "bounded-manifestation-mvp", "live-50-results.json");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const counters = Object.fromEntries([
  "stuck", "manifest_invalid", "duplicate_publish", "ungrounded_options",
  "cross_location_leakage", "black_frame", "stale_media", "generation_failure",
].map((key) => [key, 0]));
const rows = [];

async function state() {
  const response = await fetch(`${base}/api/state`);
  if (!response.ok) throw new Error(`state_http_${response.status}`);
  return response.json();
}
async function waitReady(afterScene) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const next = await state();
    if (next.sceneNumber > afterScene && next.phase === "PLAYING_VOTING" && next.optionsReady && next.readiness === "ready") return next;
    await sleep(150);
  }
  throw new Error(`stuck_after_${afterScene}`);
}
function chooseVote(snapshot, turn) {
  const options = [1, 2].map((index) => ({ index, patch: snapshot.options?.[`option_${index}_state_patch`] || {} }));
  // Exercise a visible entity mutation if offered; otherwise alternate real
  // displayed options. This does not fabricate any state or destination.
  return options.find((item) => item.patch.entity_state_mutation?.target_entity && item.patch.entity_state_mutation.target_entity !== "scene")?.index || (turn % 2 ? 1 : 2);
}
function pair(snapshot) {
  return [1, 2].map((index) => ({
    label: snapshot.options?.[`option_${index}_tr`] || "",
    consequence: snapshot.options?.[`option_${index}_result_prompt_en`] || "",
    patch: snapshot.options?.[`option_${index}_state_patch`] || {},
  }));
}
function physicalOptional(manifest) {
  return (manifest?.entities || []).filter((entity) => ["light", "window", "stairs", "water"].includes(String(entity).toLowerCase()));
}
function parseEvents() {
  return fs.readFileSync(path.join(process.cwd(), "state", "events.jsonl"), "utf8")
    .split(/\r?\n/).flatMap((line) => { try { return [JSON.parse(line)]; } catch { return []; } });
}
function validateTransition(before, after, selected) {
  const manifest = after.storyState?.current_scene_manifest || {};
  if (manifest.location !== after.storyState?.current_location) counters.manifest_invalid += 1;
  const target = selected.patch?.entity_state_mutation?.target_entity;
  if (target && target !== "scene" && !(manifest.entities || []).some((entity) => new RegExp(`\\b${target}\\b`, "i").test(String(entity)))) counters.manifest_invalid += 1;
  const optional = physicalOptional(manifest);
  for (const entity of optional) {
    const legal = {
      light: ["red_house_exterior", "red_house_hallway", "machine_room", "control_room"],
      window: ["red_house_exterior", "red_house_doorstep", "red_house_hallway"],
      stairs: ["stairwell"], water: ["basement"],
    }[entity] || [];
    if (!legal.includes(manifest.location)) counters.cross_location_leakage += 1;
  }
  if (!after.media) counters.black_frame += 1;
  return { optional }; 
}
function save(status = "running", error = null) {
  const pairs = rows.map((row) => row.pair.map((item) => item.label).sort().join(" || "));
  const frequencies = new Map(); for (const value of pairs) frequencies.set(value, (frequencies.get(value) || 0) + 1);
  const sources = Object.fromEntries(rows.reduce((map, row) => map.set(row.source, (map.get(row.source) || 0) + 1), new Map()));
  const locationChanges = rows.filter((row) => row.before.location !== row.after.location).length;
  const stateChanges = rows.filter((row) => JSON.stringify(row.before.entity_states || {}) !== JSON.stringify(row.after.entity_states || {})).length;
  return writeFile(outPath, JSON.stringify({ status, error, completed: rows.length, counters, sources, locationChanges, stateChanges, uniquePairs: frequencies.size, exactPairRepeats: pairs.length - frequencies.size, adjacentPairRepeats: pairs.slice(1).filter((value, index) => value === pairs[index]).length, repeatedPairs: [...frequencies].filter(([, count]) => count > 1), rows }, null, 2));
}

try {
  let before = await state();
  if (!(before.phase === "PLAYING_VOTING" && before.optionsReady)) before = await waitReady(before.sceneNumber - 1);
  for (let turn = 1; turn <= 50; turn += 1) {
    const scene = before.sceneNumber;
    const chosen = chooseVote(before, turn);
    const choices = pair(before);
    const selected = choices[chosen - 1];
    const locked = await fetch(`${base}/api/debug/vote`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: `manifestation-live-50-${Date.now()}-${turn}`, vote: String(chosen) }) });
    if (!locked.ok) throw new Error(`vote_http_${locked.status}_scene_${scene}`);
    const after = await waitReady(scene);
    const validation = validateTransition(before.storyState.current_scene_manifest || {}, after, selected);
    const media = await fetch(`${base}${after.media}`);
    if (!media.ok) counters.black_frame += 1;
    rows.push({
      turn, scene, nextScene: after.sceneNumber, source: after.options?.option_1_state_patch?.source || "library",
      pair: choices, winner: chosen, winnerLabel: selected.label,
      before: before.storyState.current_scene_manifest, after: after.storyState.current_scene_manifest,
      optionalManifestations: validation.optional, generationSeconds: after.recentGenerationTimes?.at(-1) || null,
    });
    await save();
    if (turn % 5 === 0) console.log(JSON.stringify({ turn, scene: after.sceneNumber, location: after.storyState.current_location, optional: validation.optional, counters }));
    before = after;
  }
  const events = parseEvents();
  for (const row of rows) {
    const optionsEvents = events.filter((event) => event.type === "OPTIONS_CREATED" && Number(event.sceneId) === Number(row.nextScene));
    if (optionsEvents.length !== 1) counters.duplicate_publish += Math.abs(optionsEvents.length - 1);
    if (optionsEvents.some((event) => !event.currentSceneManifest?.location || !Array.isArray(event.currentSceneManifest?.entities))) counters.manifest_invalid += 1;
  }
  await save("complete");
  console.log(JSON.stringify({ complete: rows.length, counters }));
} catch (error) {
  if (String(error).includes("stuck")) counters.stuck += 1;
  await save("failed", String(error?.stack || error));
  console.error(error);
  process.exitCode = 1;
}
