import { mkdir, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
const exec = promisify(execFile), base = "http://127.0.0.1:8192", outDir = "benchmark/runtime/8192/output", sleep = ms => new Promise(r => setTimeout(r, ms));
const profiles = {
  A: { checkpoint: "sdxl_lightning_4step.safetensors", width: 768, height: 448, steps: 4 },
  B: { checkpoint: "sdxl_lightning_8step.safetensors", width: 768, height: 448, steps: 8 },
  C: { checkpoint: "sdxl_lightning_4step.safetensors", width: 1024, height: 576, steps: 4 },
  D: { checkpoint: "sdxl_lightning_8step.safetensors", width: 1024, height: 576, steps: 8 },
};
const style = "cinematic surreal realism, restrained palette, atmospheric volumetric light, realistic texture, coherent composition";
const scenes = [
  ["foggy bridge", "a lone protagonist standing on a foggy bridge"], ["beneath bridge", "the same protagonist beneath the bridge beside one glowing light"],
  ["red house", "an abandoned red house exterior at night"], ["wooden hallway", "the interior wooden hallway of that red house"],
  ["basement", "an underground basement beneath the house"], ["machine", "a strange large machine clearly visible in the room"],
  ["activated machine", "the same machine visibly activated with blue illumination"], ["flooded room", "a room visibly flooded with reflective water"],
  ["submerged tunnel", "a submerged tunnel entrance with water and mist"], ["portal landscape", "a surreal outdoor landscape with a clearly visible luminous portal"],
  ["three objects", "one scene clearly showing a lantern, a mirror, and a brass key"], ["spatial composition", "the protagonist standing in a corridor facing a portal while a staircase descends on the right"],
];
const chain = ["foggy bridge", "beneath the same bridge", "forest path", "red house exterior", "wooden hallway", "basement", "machine room", "activated machine"];
function workflow(p, prompt, seed, prefix) { return { "1": { class_type:"CheckpointLoaderSimple", inputs:{ckpt_name:p.checkpoint}}, "2":{class_type:"CLIPTextEncode",inputs:{text:prompt,clip:["1",1]}}, "3":{class_type:"CLIPTextEncode",inputs:{text:"text, letters, watermark, logo, brand, celebrity, copyrighted character, nsfw, gore, weapon, blurry, deformed, low quality",clip:["1",1]}}, "4":{class_type:"EmptyLatentImage",inputs:{width:p.width,height:p.height,batch_size:1}}, "5":{class_type:"KSampler",inputs:{model:["1",0],seed,steps:p.steps,cfg:1,sampler_name:"euler",scheduler:"sgm_uniform",positive:["2",0],negative:["3",0],latent_image:["4",0],denoise:1}}, "6":{class_type:"VAEDecode",inputs:{samples:["5",0],vae:["1",2]}}, "8":{class_type:"SaveImage",inputs:{images:["6",0],filename_prefix:prefix}}}; }
async function json(url, opts) { const r=await fetch(url,opts); if(!r.ok) throw Error(`${url}:${r.status}`); return r.json(); }
async function gpuSample() { try { const {stdout}=await exec("nvidia-smi",["--query-gpu=memory.used,utilization.gpu","--format=csv,noheader,nounits"],{windowsHide:true}); return stdout.trim().split(",").map(Number); } catch { return [null,null]; } }
async function queueEmpty() { for(let i=0;i<120;i++){const q=await json(base+"/queue");if(!q.queue_running?.length&&!q.queue_pending?.length)return true;await sleep(100);} return false; }
async function run(p, prompt, seed, prefix) { if(!await queueEmpty()) throw Error("queue_not_empty"); const t0=performance.now(), g0=Date.now(); let peak=0, util=0; const accepted=await json(base+"/prompt",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({prompt:workflow(p,prompt,seed,prefix),client_id:"sdxl-quality-ceiling"})}); if(!accepted.prompt_id)throw Error(JSON.stringify(accepted)); let done;
  while(true){ const [v,u]=await gpuSample(); if(Number.isFinite(v))peak=Math.max(peak,v);if(Number.isFinite(u))util=Math.max(util,u); const h=await json(base+`/history/${accepted.prompt_id}`); done=h[accepted.prompt_id]; if(done?.status?.completed)break; if(done?.status?.status_str==="error")throw Error(JSON.stringify(done.status)); await sleep(150); }
  const image=done.outputs?.["8"]?.images?.[0]; if(!image?.filename)throw Error("missing_output"); return {promptId:accepted.prompt_id, latency:(performance.now()-t0)/1000, serverLatency:(Date.now()-g0)/1000, peakVramMiB:peak, peakGpuPercent:util, filename:image.filename, path:path.join(outDir,image.subfolder||"",image.filename)};
}
async function main(){ await mkdir(outDir,{recursive:true}); const result={createdAt:new Date().toISOString(),profiles:{},quality:{},continuity:{}};
 for(const [key,p] of Object.entries(profiles)){ const warm=await run(p,`${style}. disposable warmup ${key}`,1000+key.charCodeAt(0),`bench/${key}_warmup`); const samples=[]; for(let i=0;i<5;i++)samples.push(await run(p,`${style}. cache miss profile ${key} sample ${i} unique`,20000+key.charCodeAt(0)*100+i,`bench/${key}_perf_${i}_${Date.now()}`)); const a=samples.map(x=>x.latency).sort((a,b)=>a-b); result.profiles[key]={settings:p,warmup:warm,samples,p50:a[Math.floor((a.length-1)*.5)],p95:a[Math.floor((a.length-1)*.95)],maxVram:Math.max(...samples.map(x=>x.peakVramMiB))}; await writeFile("benchmark/sdxl-quality-ceiling-progress.json",JSON.stringify(result,null,2)); }
 for(const [key,p] of Object.entries(profiles)){ if(result.profiles[key].p50>15)continue; result.quality[key]=[]; for(let i=0;i<scenes.length;i++){const [name,state]=scenes[i];const prompt=`${style}. PROJECT SCENE ${i+1}. RESULT STATE: ${state}. MUST SHOW: ${state}. No text, no logo.`; result.quality[key].push({name,state,...await run(p,prompt,50000+key.charCodeAt(0)*100+i,`quality/${key}_${String(i+1).padStart(2,"0")}`)}); } result.continuity[key]=[]; for(let i=0;i<chain.length;i++){const prompt=`WORLD: ${style}. PROTAGONIST: same lone adult protagonist, consistent dark coat. PALETTE: blue-gray with warm amber highlights. ANCHORS: red house, brass lantern. PREVIOUS STATE: preceding shot in the chain. CURRENT RESULT STATE: the protagonist is now in ${chain[i]}. MUST SHOW: ${chain[i]}. No text, no logo.`; result.continuity[key].push({state:chain[i],...await run(p,prompt,70000+key.charCodeAt(0)*100+i,`continuity/${key}_${String(i+1).padStart(2,"0")}`)}); } await writeFile("benchmark/sdxl-quality-ceiling-progress.json",JSON.stringify(result,null,2)); }
 await writeFile("benchmark/sdxl-quality-ceiling-results.json",JSON.stringify(result,null,2)); console.log(JSON.stringify(result.profiles,null,2)); }
main().catch(e=>{console.error(e.stack||e);process.exitCode=1});
