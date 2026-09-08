import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {ComfyImageEngine}from'../app/lib/comfy-image-engine.mjs';
const config=JSON.parse(fs.readFileSync('config.json'));
const baseline=JSON.parse(fs.readFileSync('benchmark/visual-memory/baseline/trace.json')).rows;
const input=baseline.filter(r=>r.step===(r.chain.startsWith('machine')?3:r.chain.startsWith('door')?7:2));
assert.equal(input.length,9);
const root='benchmark/visual-memory/order-ab';fs.mkdirSync(root,{recursive:true});
const engine=new ComfyImageEngine({comfyUrl:config.comfyUrl,comfyRoot:config.comfyRoot,outputRoot:config.comfyOutputRoot,profile:config.imageProfile,timeoutMs:config.generationTimeoutMs});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];
for(const row of input){
 const p=row.prompt;
 const resultStart=p.indexOf('CURRENT RESULT STATE:');
 const resultEnd=p.indexOf(' New result state has priority;',resultStart);
 const sceneStart=p.indexOf('COMMITTED SCENE:');
 assert.ok(resultStart>=0&&resultEnd>resultStart&&sceneStart>resultEnd);
 const prompt=[p.slice(resultStart,resultEnd),p.slice(sceneStart),p.slice(0,resultStart),p.slice(resultEnd,sceneStart)].map(s=>s.trim()).join(' ');
 // Same words, same seed/profile. Only block order changes.
 const words=s=>s.split(/\s+/).filter(Boolean).sort();assert.deepEqual(words(prompt),words(p));
 const queueDeadline=Date.now()+120000;
 while(true){const q=await(await fetch(config.comfyUrl+'/queue')).json();if(!q.queue_running?.length&&!q.queue_pending?.length)break;if(Date.now()>queueDeadline)throw Error('queue_busy');await sleep(200)}
 const workflow=engine.workflow({prompt,sceneNumber:row.id,seed:row.seed});workflow['8'].inputs.filename_prefix=`benchmark_visual_memory/order-ab/${row.id}_${Date.now()}`;
 const response=await fetch(config.comfyUrl+'/prompt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:workflow,client_id:'visual-memory-order-ab'})});
 const accepted=await response.json();assert.ok(response.ok&&accepted.prompt_id);
 const history=await engine.wait(accepted.prompt_id);const image=history.outputs['8'].images[0];
 const png=path.resolve(root+'/'+row.id+'.png');const r=await fetch(config.comfyUrl+'/view?'+new URLSearchParams(image));assert.ok(r.ok);fs.writeFileSync(png,Buffer.from(await r.arrayBuffer()));
 rows.push({...row,prompt,png,baselinePng:row.png,promptId:accepted.prompt_id,history,workflow});fs.writeFileSync(root+'/trace.json',JSON.stringify({rows},null,2));console.log(row.id);
}
