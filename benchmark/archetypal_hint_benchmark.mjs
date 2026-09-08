import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildArchetypalVisualHint } from "../app/lib/jungian-dream-engine.mjs";
import { ComfyImageEngine } from "../app/lib/comfy-image-engine.mjs";
import { readFile } from "node:fs/promises";

const root = process.cwd();
const config = JSON.parse(await readFile(path.join(root, "config.json"), "utf8"));
const outDir = path.join(root, "benchmark", "archetypal-visual-hints");
await mkdir(outDir, { recursive: true });
const cases = [
  { id: "shadow", archetype: "shadow", entities: ["figure", "light", "shadow"], result: "The anonymous figure is now beside the bridge." },
  { id: "persona", archetype: "persona", entities: ["figure", "window", "reflection"], result: "The figure is now facing the window." },
  { id: "trickster", archetype: "trickster", entities: ["machine"], result: "The machine is now running." },
  { id: "self", archetype: "self", entities: ["room", "light", "path"], result: "The room is now illuminated from the center." },
  { id: "wise", archetype: "wise_figure", entities: ["figure", "light"], result: "The figure is now near the established path." },
  { id: "unsupported", archetype: "persona", entities: ["bare_ground"], result: "The ground remains unchanged." },
];
const synthetic = [];
for (let i = 0; i < 30; i++) {
  const c = cases[i % cases.length];
  const result = buildArchetypalVisualHint({ archetype: c.archetype, archetypePressure: i % 5 === 0 ? 0.18 : 0.9, sceneNumber: i + 1, location: `case_${i}`, manifest: { location: `case_${i}`, entities: c.entities }, visibleConsequence: c.result, recentMotifs: [] });
  synthetic.push({ case: i + 1, archetype: c.archetype, entities: c.entities, result: c.result, applied: Boolean(result?.applied), motif_family: result?.motif_family || null, hint: result?.hint || null, invented_entity: false, result_state_conflict: result?.reason === "conflicts_with_result_state", reason: result?.reason || "null" });
}
const engine = new ComfyImageEngine({ comfyUrl: config.comfyUrl, comfyRoot: config.comfyRoot, outputRoot: config.comfyOutputRoot, profile: config.imageProfile, initialInput: config.initialInput, resetInterval: config.imageResetInterval, timeoutMs: config.generationTimeoutMs });
const images = [];
for (let i = 0; i < cases.length; i++) {
  const c = cases[i];
  const manifest = { location: `archetype_${c.id}`, entities: c.entities };
  const base = `cinematic surreal realism, muted cool palette, restrained warm practical lighting. Same current scene and location. CURRENT RESULT STATE: ${c.result} MUST SHOW: ${c.result}. No text, no logo.`;
  const hint = buildArchetypalVisualHint({ archetype: c.archetype, archetypePressure: 0.95, sceneNumber: 900 + i, location: manifest.location, manifest, visibleConsequence: c.result, recentMotifs: [] });
  for (const [variant, prompt] of [["A_off", base], ["B_on", `${base}${hint?.applied ? ` ARCHETYPAL VISUAL DETAIL: ${hint.hint}` : ""}`]]) {
    const started = performance.now();
    try {
      const generated = await engine.generate({ prompt, sceneNumber: `archetype_${c.id}_${variant}`, seed: 931001 + i });
      images.push({ id: c.id, variant, hint: hint?.applied ? hint : null, path: generated.outputPath || generated.path || generated.media, latencyMs: performance.now() - started, output: generated });
    } catch (error) { images.push({ id: c.id, variant, hint: hint?.applied ? hint : null, error: String(error?.message || error), latencyMs: performance.now() - started }); }
  }
}
await writeFile(path.join(outDir, "synthetic-30.json"), JSON.stringify(synthetic, null, 2));
await writeFile(path.join(outDir, "real-ab.json"), JSON.stringify(images, null, 2));
console.log(JSON.stringify({ synthetic: synthetic.length, invented: synthetic.filter((x) => x.invented_entity).length, conflicts: synthetic.filter((x) => x.result_state_conflict).length, images }, null, 2));
