import fs from "node:fs/promises";
const base="http://127.0.0.1:3000";
const result=JSON.parse(await fs.readFile("benchmark/long-horizon-300-result.json","utf8"));
const rows=result.rows||[]; let last="";
while(rows.length<300){
 const state=await (await fetch(`${base}/api/state`)).json();
 if(state.phase==="PLAYING_VOTING"&&state.optionsReady&&state.roundId&&state.roundId!==last){
  const labels=[state.options?.option_1_tr,state.options?.option_2_tr].filter(Boolean);
  const records=state.storyState?.recent_option_records||[];
  const shown=records.filter(r=>labels.includes(r.label_tr)).slice(-2);
  const response=await fetch(`${base}/api/debug/vote`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({userId:`long-horizon-300-final-${state.sceneNumber}-${state.roundId}`,vote:String((rows.length%2)+1)})});
  rows.push({scene:Number(state.sceneNumber),location:state.storyState?.current_location,options:labels,source:shown.map(r=>r.source).filter(Boolean).at(-1)||"unknown",status:response.status,optionsReady:Boolean(state.optionsReady)});
  last=state.roundId;
  await fs.writeFile("benchmark/long-horizon-300-progress.json",JSON.stringify({startScene:result.startScene,targetScene:result.targetScene,rows},null,2));
 }
 await new Promise(r=>setTimeout(r,250));
}
const s=await (await fetch(`${base}/api/state`)).json();
await fs.writeFile("benchmark/long-horizon-300-result.json",JSON.stringify({...result,endScene:Number(s.sceneNumber),timeout:false,rows},null,2));
console.log(JSON.stringify({status:"complete",rows:rows.length,endScene:s.sceneNumber}));
