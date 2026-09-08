import { readFile, copyFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { ComfyImageEngine } from "../app/lib/comfy-image-engine.mjs";
import { AnimateDiffVideoEngine } from "../app/lib/animatediff-video-engine.mjs";

const c = JSON.parse(await readFile("../config.json", "utf8"));
const url = "http://127.0.0.1:8188";
const image = new ComfyImageEngine({ comfyUrl: url, comfyRoot: c.comfyRoot, profile: c.imageProfile, timeoutMs: 120000 });
const video = new AnimateDiffVideoEngine({ comfyUrl: url, comfyRoot: c.comfyRoot, timeoutMs: 60000, profile: c.animatediff });
async function submit(workflow) { const a = await (await fetch(`${url}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: workflow, client_id: "overnight-single-instance" }) })).json(); let item; for (let i = 0; i < 600; i++) { item = (await (await fetch(`${url}/history/${a.prompt_id}`)).json())[a.prompt_id]; if (item?.status?.completed || item?.status?.status_str === "error") break; await new Promise((r) => setTimeout(r, 250)); } return { id: a.prompt_id, item }; }
const results = [];
for (let i = 1; i <= Number(process.env.RUNS || 1); i++) {
  const prompt = "A cinematic surreal scene. The character is now standing at the entrance of a foggy tunnel with a red lantern, no text, no logo.";
  const t0 = performance.now();
  const imageResult = await submit(image.workflow({ prompt, sceneNumber: 8500 + i, seed: 910000 + i }));
  const imageMeta = imageResult.item?.outputs?.["8"]?.images?.[0];
  const imagePath = imageMeta && path.join(c.comfyRoot, "output", imageMeta.subfolder || "", imageMeta.filename);
  const handoff = path.join(c.comfyRoot, "input", `single_instance_${Date.now()}_${i}.png`);
  if (imagePath) await copyFile(imagePath, handoff);
  const t1 = performance.now();
  const videoResult = await submit(video.workflow({ prompt, inputImage: handoff, sceneNumber: 8500 + i, seed: 920000 + i }));
  const t2 = performance.now();
  results.push({ run: i, sdxlSec: (t1 - t0) / 1000, animatediffSec: (t2 - t1) / 1000, totalSec: (t2 - t0) / 1000, sdxlSuccess: imageResult.item?.status?.completed === true, videoSuccess: videoResult.item?.status?.completed === true, videoError: videoResult.item?.item?.status?.status_str === "error" ? "execution_error" : null });
}
await writeFile("overnight-single-instance-results.json", JSON.stringify({ mode: "single_instance_sequential", results }, null, 2));
console.log(JSON.stringify(results, null, 2));
