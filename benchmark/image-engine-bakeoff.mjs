// Bir özellik yayını açmak için zorunlu değilse MVP’ye eklenmeyecek.
// Isolated SDXL vs Z-Image-Turbo bake-off. Production app/config is not modified.
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const URL = process.env.COMFY_URL || 'http://127.0.0.1:8192';
const ROOT = path.resolve('benchmark/image-engine-bakeoff');
const RESULTS = path.resolve('benchmark/image-engine-bakeoff-results.json');
const TIMEOUT = 600_000;
const STYLE = 'cinematic surreal fiction, anonymous fictional protagonist, coherent wide composition, atmospheric lighting, detailed environment, no text, no logo, no brand, no celebrity, no copyrighted character, no violence, no weapon, no gore, no nsfw';
const scenes = [
  ['lone character on a foggy bridge', 'The protagonist is standing alone on a foggy stone bridge.'],
  ['beneath bridge glowing light', 'The same protagonist is beneath the bridge beside one small glowing light.'],
  ['abandoned red house exterior', 'An abandoned red house stands ahead on a quiet misty road.'],
  ['wooden hallway interior', 'Inside the same red house, the protagonist stands in a dim wooden hallway.'],
  ['basement strange machine', 'In the basement, the protagonist stands beside one strange mechanical machine.'],
  ['machine blue illumination', 'The same machine is visibly activated and casts clear blue illumination across the basement.'],
  ['flooded room', 'The protagonist stands in a flooded room with reflective water covering the floor.'],
  ['submerged tunnel entrance', 'A submerged tunnel entrance is visible ahead, surrounded by dark water.'],
  ['surreal outdoor landscape', 'The protagonist stands in a surreal outdoor landscape of red fog, distant mountains, and a black road.'],
  ['luminous portal', 'A clearly visible luminous portal stands in the center of a red foggy field.'],
  ['lantern mirror red fog', 'A central protagonist holds an old lantern beside a large mirror in red fog.'],
  ['difficult result state', 'At night, the protagonist stands beside a glowing sphere on a wet bridge under a crimson sky.'],
];
const chain = [
  'The protagonist stands on the same foggy stone bridge.',
  'The protagonist stands beneath that bridge beside the same small glowing light.',
  'The protagonist follows a forest path away from the bridge.',
  'The protagonist faces the same abandoned red house at the end of the path.',
  'The protagonist stands inside the red house in its dim wooden hallway.',
  'The protagonist descends into the basement below the hallway.',
  'The protagonist stands beside one strange mechanical machine in the basement.',
  'The same machine is activated, filling the basement with blue illumination.',
];

const profiles = {
  sdxl: { name: 'SDXL-Lightning 4-step', checkpoint: 'sdxl_lightning_4step.safetensors', width: 768, height: 448, steps: 4, cfg: 1, sampler: 'euler', scheduler: 'sgm_uniform' },
  zimage: { name: 'Z-Image-Turbo W4A8', unet: 'z_image_turbo_w4a8.safetensors', clip: 'qwen_3_4b_w4a8.safetensors', vae: 'ae.safetensors', width: 1024, height: 1024, steps: 8, cfg: 1, sampler: 'res_multistep', scheduler: 'simple' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
const percentile = (xs, p) => { const a = xs.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.ceil(a.length * p) - 1)] : null; };
async function gpu() { try { const { stdout } = await execFileAsync('nvidia-smi', ['--query-gpu=memory.used,memory.total', '--format=csv,noheader,nounits']); const [used, total] = stdout.trim().split(',').map((x) => Number(x.trim())); return { usedMiB: used, totalMiB: total }; } catch { return null; } }
async function health() { const r = await fetch(`${URL}/system_stats`); if (!r.ok) throw new Error(`Comfy not ready ${URL}`); return r.json(); }
async function queueEmpty() { for (let i = 0; i < 240; i++) { const r = await fetch(`${URL}/queue`); const q = await r.json(); if (!(q.queue_running?.length || q.queue_pending?.length)) return true; await sleep(250); } return false; }
function sdxlWorkflow(prompt, seed, prefix) { return { '1': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: profiles.sdxl.checkpoint } }, '2': { class_type: 'CLIPTextEncode', inputs: { text: `${STYLE}. ${prompt}`, clip: ['1', 1] } }, '3': { class_type: 'CLIPTextEncode', inputs: { text: 'text, letters, watermark, logo, brand, celebrity, copyrighted character, nsfw, gore, weapon, blurry, deformed, low quality', clip: ['1', 1] } }, '4': { class_type: 'EmptyLatentImage', inputs: { width: profiles.sdxl.width, height: profiles.sdxl.height, batch_size: 1 } }, '5': { class_type: 'KSampler', inputs: { model: ['1', 0], seed, steps: 4, cfg: 1, sampler_name: 'euler', scheduler: 'sgm_uniform', positive: ['2', 0], negative: ['3', 0], latent_image: ['4', 0], denoise: 1 } }, '6': { class_type: 'VAEDecode', inputs: { samples: ['5', 0], vae: ['1', 2] } }, '7': { class_type: 'SaveImage', inputs: { images: ['6', 0], filename_prefix: prefix } } }; }
function zWorkflow(prompt, seed, prefix) { return { '1': { class_type: 'UNETLoader', inputs: { unet_name: profiles.zimage.unet, weight_dtype: 'default' } }, '2': { class_type: 'CLIPLoader', inputs: { clip_name: profiles.zimage.clip, type: 'lumina2', device: 'default' } }, '3': { class_type: 'VAELoader', inputs: { vae_name: profiles.zimage.vae } }, '4': { class_type: 'CLIPTextEncode', inputs: { clip: ['2', 0], text: `${STYLE}. ${prompt}` } }, '5': { class_type: 'ConditioningZeroOut', inputs: { conditioning: ['4', 0] } }, '6': { class_type: 'ModelSamplingAuraFlow', inputs: { model: ['1', 0], shift: 3 } }, '7': { class_type: 'EmptySD3LatentImage', inputs: { width: 1024, height: 1024, batch_size: 1 } }, '8': { class_type: 'KSampler', inputs: { model: ['6', 0], seed, steps: 8, cfg: 1, sampler_name: 'res_multistep', scheduler: 'simple', positive: ['4', 0], negative: ['5', 0], latent_image: ['7', 0], denoise: 1 } }, '9': { class_type: 'VAEDecode', inputs: { samples: ['8', 0], vae: ['3', 0] } }, '10': { class_type: 'SaveImage', inputs: { images: ['9', 0], filename_prefix: prefix } } }; }
async function submit(prompt, clientId) { const r = await fetch(`${URL}/prompt`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt, client_id: clientId }) }); const b = await r.json(); if (!r.ok || b.error || !b.prompt_id) throw new Error(`rejected:${JSON.stringify(b)}`); return b.prompt_id; }
async function runJob(profile, prompt, label, index, phase) {
  if (!(await queueEmpty())) throw new Error('queue_not_empty');
  const seed = 880000 + index * 7919 + (phase === 'chain' ? 400000 : phase === 'scene' ? 200000 : 0);
  const prefix = `image_engine_bakeoff/${profile === profiles.sdxl ? 'sdxl' : 'zimage'}/${phase}_${String(index).padStart(2, '0')}_${Date.now()}_${seed}`;
  const wf = profile === profiles.sdxl ? sdxlWorkflow(prompt, seed, prefix) : zWorkflow(prompt, seed, prefix);
  const t0 = performance.now(); const before = await gpu(); let pid; try { pid = await submit(wf, `bakeoff-${Date.now()}-${seed}`); } catch (e) { return { profile: profile.name, label, seed, success: false, error: String(e), clientSeconds: null, serverSeconds: null, before }; }
  let peak = before; const deadline = Date.now() + TIMEOUT; let history;
  while (Date.now() < deadline) {
    const g = await gpu(); if (g && (!peak || g.usedMiB > peak.usedMiB)) peak = g;
    const r = await fetch(`${URL}/history/${pid}`); const h = await r.json(); history = h[pid];
    if (history) {
      const failed = history.status?.status_str === 'error' || history.status?.messages?.some((x) => x?.[0] === 'execution_error');
      if (failed) return { profile: profile.name, label, seed, promptId: pid, success: false, error: JSON.stringify(history.status?.messages || []), clientSeconds: (performance.now() - t0) / 1000, serverSeconds: null, before, peak };
      if (history.status?.completed) break;
    }
    await sleep(300);
  }
  if (!history?.status?.completed) return { profile: profile.name, label, seed, promptId: pid, success: false, error: 'timeout', clientSeconds: (performance.now() - t0) / 1000, serverSeconds: null, before, peak };
  const outNode = profile === profiles.sdxl ? '7' : '10'; const image = history.outputs?.[outNode]?.images?.[0];
  const outputRoot = path.join(ROOT, 'comfy-runtime', 'output');
  const output = image ? path.join(outputRoot, String(image.subfolder || '').replace(/[\\/]+/g, path.sep), image.filename) : null;
  let bytes = null; try { bytes = (await stat(output)).size; } catch {}
  return { profile: profile.name, label, seed, promptId: pid, success: Boolean(image), output: image ? `${image.subfolder ? `${image.subfolder}/` : ''}${image.filename}` : null, bytes, clientSeconds: (performance.now() - t0) / 1000, serverSeconds: null, before, peak, historyMessages: history.status?.messages || [] };
}
async function profileRuns(profile) { const warm = await runJob(profile, 'A simple empty room with one red door.', 'warmup', 0, 'feasibility'); const runs = []; if (!warm.success) return { warmup: warm, runs, p50: null, p95: null }; for (let i = 1; i <= 3; i++) runs.push(await runJob(profile, `A clearly visible scene for cache miss ${i}: ${scenes[i - 1][1]}`, `warm_${i}`, i, 'feasibility')); return { warmup: warm, runs, p50: percentile(runs.map((r) => r.success ? r.clientSeconds : NaN), .5), p95: percentile(runs.map((r) => r.success ? r.clientSeconds : NaN), .95) }; }
async function main() {
  await mkdir(ROOT, { recursive: true }); await health();
  const report = { startedAt: new Date().toISOString(), endpoint: URL, hardware: 'RTX 3070 Ti 8GB', productionUntouched: true, productLatencyTargetSeconds: { excellent: 5, veryGood: 8, acceptable: 12, poor: 15, reject: 20 }, profiles: {} };
  const selected = process.env.PROFILE ? Object.entries(profiles).filter(([key]) => key === process.env.PROFILE) : Object.entries(profiles);
  for (const [key, p] of selected) { console.log(`feasibility ${key}`); report.profiles[key] = await profileRuns(p); await writeFile(RESULTS, JSON.stringify(report, null, 2)); if (key === 'zimage' && (report.profiles[key].p50 == null || report.profiles[key].p50 > 20)) break; }
  const z = report.profiles.zimage; if (z?.runs?.some((r) => !r.success) || !z?.runs?.length || (z.p50 ?? 999) > 20) { report.verdict = 'Z-Image not live-viable; stopped before quality bake-off'; report.finishedAt = new Date().toISOString(); await writeFile(RESULTS, JSON.stringify(report, null, 2)); return; }
  for (const [key, p] of Object.entries(profiles)) { report.profiles[key].scenes = []; for (let i = 0; i < scenes.length; i++) report.profiles[key].scenes.push(await runJob(p, `${scenes[i][1]} ${STYLE}`, scenes[i][0], i + 1, 'scene')); report.profiles[key].continuity = []; for (let i = 0; i < chain.length; i++) report.profiles[key].continuity.push(await runJob(p, `${chain[i]} ${STYLE}. Maintain the same protagonist, clothing, palette and world.` , `chain_${i + 1}`, i + 1, 'chain')); }
  report.finishedAt = new Date().toISOString(); await writeFile(RESULTS, JSON.stringify(report, null, 2));
}
main().catch(async (e) => { console.error(e); process.exitCode = 1; });
