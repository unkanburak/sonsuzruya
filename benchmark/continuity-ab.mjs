// 10-round text-anchor vs previous-image continuity benchmark.
import { readFile, writeFile } from "node:fs/promises";
import { ComfyImageEngine } from "../app/lib/comfy-image-engine.mjs";

const config = JSON.parse(await readFile(new URL("../config.json", import.meta.url), "utf8"));
const baseProfile = config.imageProfile;
const chain = [
  ["same_room", "The character is now standing beside the same old door in the dim room."],
  ["same_corridor", "The character is now farther down the same dim corridor with the old lantern."],
  ["normal_street", "The character is now standing on a wet street outside the building."],
  ["normal_car", "The character is now sitting inside a mysterious car on the wet street."],
  ["normal_tunnel", "The character is now inside a dark tunnel reached by the car."],
  ["normal_bridge", "The character is now standing on a stone bridge beyond the tunnel."],
  ["surreal_light", "The character is now beneath the bridge near a large glowing light."],
  ["surreal_portal", "The character is now inside a luminous world beyond a portal."],
  ["surreal_forest", "The character is now standing in a glowing forest with the old lantern."],
  ["surreal_city", "The character is now looking over a floating city beneath a crimson sky."],
];

async function run(mode) {
  const profile = { ...baseProfile, continuityMode: mode, denoise: 0.55 };
  const engine = new ComfyImageEngine({ comfyUrl: config.comfyUrl, comfyRoot: config.comfyRoot, profile, initialInput: config.initialInput, resetInterval: 1, timeoutMs: config.generationTimeoutMs });
  const rows = [];
  for (let i = 0; i < chain.length; i += 1) {
    const started = performance.now();
    try {
      const result = await engine.generate({ prompt: `A cinematic surreal scene. ${chain[i][1]} Carry the visible atmosphere forward. No text, no logo.`, sceneNumber: 9000 + (mode === "PREVIOUS_IMAGE" ? 100 : 0) + i + 1 });
      rows.push({ round: i + 1, label: chain[i][0], success: true, generationTime: result.generationTime, media: result.media, elapsed: (performance.now() - started) / 1000 });
    } catch (error) {
      rows.push({ round: i + 1, label: chain[i][0], success: false, error: String(error?.message || error) });
    }
  }
  return { mode, chain: chain.map(([label]) => label), rows, successCount: rows.filter((row) => row.success).length, generationTimes: rows.filter((row) => row.success).map((row) => row.generationTime) };
}

const results = [await run("TEXT_ANCHOR"), await run("PREVIOUS_IMAGE")];
await writeFile(new URL("./continuity-ab-results.json", import.meta.url), JSON.stringify({ createdAt: new Date().toISOString(), acceptance: { minSuccess: 9, maxP95Seconds: 6, maxRelativeSlowdown: 1.5, humanScoresRequired: true }, results }, null, 2));
console.log(JSON.stringify(results, null, 2));
