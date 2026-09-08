import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { ComfyImageEngine } from "../app/lib/comfy-image-engine.mjs";

const c = JSON.parse(await readFile("../config.json", "utf8"));
const port = process.env.COMFY_PORT || "8188";
const url = `http://127.0.0.1:${port}`;
const mode = process.env.BENCH_MODE || `A_only_sdxl_${port}`;
const e = new ComfyImageEngine({ comfyUrl: url, comfyRoot: c.comfyRoot, profile: c.imageProfile, timeoutMs: 120000 });
function gpu() { try { return execFileSync("nvidia-smi", ["--query-gpu=memory.used,memory.free,utilization.gpu", "--format=csv,noheader,nounits"], { encoding: "utf8" }).trim(); } catch { return "unavailable"; } }
async function run(i) {
  const wf = e.workflow({ prompt: "A cinematic surreal scene. The character is now standing on a misty bridge with a red lantern, clear composition, no text, no logo.", sceneNumber: 8000 + i, seed: 900000 + i });
  wf["8"].inputs.filename_prefix = `diagnostic/overnight_sdxl_${Date.now()}_${i}`;
  const t = performance.now(); const samples = []; const timer = setInterval(() => samples.push({ elapsed: (performance.now() - t) / 1000, gpu: gpu() }), 500);
  const response = await fetch(`${url}/prompt`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt: wf, client_id: "overnight-sdxl" }) });
  const accepted = await response.json(); let item;
  for (let j = 0; j < 600 && accepted.prompt_id; j++) { item = (await (await fetch(`${url}/history/${accepted.prompt_id}`)).json())[accepted.prompt_id]; if (item?.status?.completed || item?.status?.status_str === "error") break; await new Promise((r) => setTimeout(r, 250)); }
  clearInterval(timer);
  return { run: i, promptId: accepted.prompt_id, elapsedSec: (performance.now() - t) / 1000, status: item?.status?.status_str, success: item?.status?.completed === true, error: item?.status?.messages?.find((m) => m?.[0] === "execution_error")?.[1]?.exception_message || null, gpuSamples: samples };
}
const results = []; for (let i = 1; i <= 3; i++) results.push(await run(i));
await writeFile(`overnight-${mode}-results.json`, JSON.stringify({ mode, results }, null, 2));
console.log(JSON.stringify(results.map(({ run, promptId, elapsedSec, success, error }) => ({ run, promptId, elapsedSec, success, error })), null, 2));
