import { writeFile } from 'node:fs/promises';
const base='http://127.0.0.1:3000'; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(p){const r=await fetch(base+p); if(!r.ok) throw Error(`${p} ${r.status}`); return r.json()}
async function waitScene(n){for(let i=0;i<240;i++){const s=await get('/api/state');if(s.sceneNumber>n)return s;await sleep(500)}throw Error('scene_timeout')}
const rows=[]; const started=new Date().toISOString();
for(let i=0;i<50;i++){
  const before=await get('/api/state'); const t=performance.now();
  const vr=await fetch(base+'/api/debug/vote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:`staging-soak-${i}`,vote:i%2?'1':'2'})});
  if(!vr.ok) throw Error(`vote_failed_${i}`);
  const after=await waitScene(before.sceneNumber);
  const d=await get('/api/diagnostics');
  const row={turn:i+1,fromScene:before.sceneNumber,toScene:after.sceneNumber,seconds:(performance.now()-t)/1000,media:after.media,diagnostics:{generationFailures:d.metrics.generationFailures,loopSuccess:d.metrics.loopSuccess,loopErrors:d.metrics.loopErrors,staleLoops:d.metrics.staleLoops,queue:d.queue,storyStateBytes:d.storyStateBytes,stateBytes:d.stateBytes,logBytes:d.logBytes}};
  rows.push(row); console.log(`${i+1}/50 scene=${after.sceneNumber} ${row.seconds.toFixed(2)}s loops=${row.diagnostics.loopSuccess}`);
}
await writeFile('benchmark/final-local-staging-soak-results.json',JSON.stringify({started,finished:new Date().toISOString(),rows},null,2));
