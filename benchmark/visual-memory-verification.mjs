import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import { ComfyImageEngine } from '../app/lib/comfy-image-engine.mjs';
import { applyStatePatch, defaultStoryState, normalizeStoryState, recordRenderedComposition, recordRenderedVisualMotifs } from '../app/lib/options.mjs';
import { OPTION_LIBRARY, optionTemplateMeta } from '../app/lib/option-library.mjs';
import { defaultDreamPsyche, normalizeDreamPsyche, updateDreamPsyche, recurringMotifForPrompt, buildArchetypalVisualHint } from '../app/lib/jungian-dream-engine.mjs';
import { appendPhysicalScenePrompt, physicalFactsForPrompt } from '../app/lib/physical-memory.mjs';

const phase=process.argv[2]||'baseline';
const root=`benchmark/visual-memory/${phase}`;
fs.mkdirSync(root,{recursive:true});
const config=JSON.parse(fs.readFileSync('config.json'));
const source=fs.readFileSync('app/server.mjs','utf8');
const ctx=vm.createContext({config,structuredPromptEnabled:process.env.STRUCTURED_PROMPT_ENABLED!=='0',archetypalVisualHintsEnabled:process.env.ARCHETYPAL_VISUAL_HINTS_ENABLED==='1',appendPhysicalScenePrompt,recurringMotifForPrompt,buildArchetypalVisualHint});
// Evaluate the actual pure production functions, including composition/presence.
// Do not import the server entry point or start another production loop.
vm.runInContext(source.slice(source.indexOf('function chooseComposition('),source.indexOf('async function closeVote()')),ctx);
const engine=new ComfyImageEngine({comfyUrl:config.comfyUrl,comfyRoot:config.comfyRoot,outputRoot:config.comfyOutputRoot,profile:config.imageProfile,timeoutMs:config.generationTimeoutMs});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const rows=[];
const save=()=>fs.writeFileSync(root+'/trace.json',JSON.stringify({phase,profile:config.imageProfile,productionPromptHash:crypto.createHash('sha256').update(source).digest('hex'),rows},null,2));
function local(id){const t=optionTemplateMeta(OPTION_LIBRARY.find(t=>t[0]===id));assert.ok(t.id);return{label:t.label_tr,result:t.visible_consequence,intent:t.behavior_family,patch:{entity_state_mutation:t.mutation}};}
function route(location){return{label:`Enter ${location}`,result:`The figure is now in the established ${location.replaceAll('_',' ')}`,intent:'move',patch:{current_location:location}};}
const open={label:'Ön kapıyı aç',result:'The established front door is now open',intent:'open',patch:{entity_state_mutation:{target_entity:'door',from_state:'closed',to_state:'open'}}};
const chains=[];
for(let i=1;i<=3;i++){
 chains.push({id:`machine-${i}`,initial:'machine_room',actions:[local('machine_start'),local(['expanded_machine_touch_103','machine_leave','expanded_machine_inspect_100'][i-1]),route('basement'),route('machine_room')]});
 chains.push({id:`door-${i}`,initial:'red_house_exterior',actions:[open,route('red_house_doorstep'),route('red_house_hallway'),route('basement_door'),local(['expanded_door_hold_position_56','door_approach','expanded_door_ignore_57'][i-1]),route('red_house_hallway'),route('red_house_doorstep'),route('red_house_exterior')]});
 const a=['control_room','red_house_exterior','red_house_hallway'][i-1];
 const b=['hidden_tunnel','front_path','stairwell'][i-1];
 chains.push({id:`location-${i}`,initial:a,actions:[{...route(a),patch:{}},route(b),route(a)]});
}
async function generate(prompt,seed,id){
 const deadline=Date.now()+120000;
 while(true){const q=await(await fetch(config.comfyUrl+'/queue')).json();if(!q.queue_running?.length&&!q.queue_pending?.length)break;if(Date.now()>deadline)throw Error('queue_not_idle');await sleep(200);}
 const workflow=engine.workflow({prompt,sceneNumber:id,seed});
 // Only the isolated output prefix differs from the production workflow.
 workflow['8'].inputs.filename_prefix=`benchmark_visual_memory/${phase}/${id}_${Date.now()}`;
 const r=await fetch(config.comfyUrl+'/prompt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:workflow,client_id:'visual-memory-verification'})});
 const accepted=await r.json();assert.ok(r.ok&&accepted.prompt_id,JSON.stringify(accepted));
 const history=await engine.wait(accepted.prompt_id);
 const img=history.outputs['8'].images[0];
 const url=config.comfyUrl+'/view?'+new URLSearchParams(img);
 const image=await fetch(url);assert.ok(image.ok);
 const png=`${root}/${id}.png`;fs.writeFileSync(png,Buffer.from(await image.arrayBuffer()));
 return {png:path.resolve(png),promptId:accepted.prompt_id,history,workflow};
}
for(const [chainIndex,chain]of chains.entries()){
 let state=normalizeStoryState(chain.initial==='red_house_exterior'?defaultStoryState():applyStatePatch(defaultStoryState(),{current_location:chain.initial}));
 let psyche=normalizeDreamPsyche(defaultDreamPsyche());
 for(const [step,action]of chain.actions.entries()){
  const previous=structuredClone(state);const patch={...action.patch,result_summary:action.result,recent_event:action.result,scene_anchors:[action.result]};
  if(patch.current_location&&patch.current_location!==state.current_location)assert.ok(state.current_scene_manifest.adjacent_locations.includes(patch.current_location),'non-adjacent test action');
  const pending=applyStatePatch(state,patch);
  const number=9000+chainIndex*20+step;
  const pendingPsyche=updateDreamPsyche(psyche,{label_tr:action.label,intent:action.intent,scene_anchors:[action.result],context:pending.current_location},number);
  const prompt=ctx.buildImagePrompt(pending,action.result,action.label,pendingPsyche,number);
  const physicalFacts=physicalFactsForPrompt(pending.current_scene_manifest);
  assert.ok(prompt.includes(physicalFacts));
  if(chain.id.startsWith('machine'))assert.equal(pending.physical_memory.machine_room.machine.power,'on');
  if(chain.id.startsWith('door')){
   assert.equal(pending.physical_memory.red_house_exterior.door.aperture,'open');
   if(pending.current_location==='basement_door')assert.equal(pending.current_scene_manifest.entity_states.door,'closed');
  }
  const id=`${chain.id}-step${step}`;const seed=860000+chainIndex*100+step;
  const output=await generate(prompt,seed,id);
  // Commit the fixture only after the actual PNG has successfully rendered.
  state=recordRenderedComposition(recordRenderedVisualMotifs(pending,action.result),ctx.chooseComposition(previous,action.result)[0]);psyche=pendingPsyche;
  const firstFactsWord=prompt.slice(0,prompt.indexOf('PERSISTENT PHYSICAL FACTS:')).split(/\s+/).length;
  rows.push({chain:chain.id,step,id,seed,previous,winner:action.label,consequence:action.result,statePatch:patch,committedState:state,physicalFacts,prompt,factsWordOffset:firstFactsWord,...output});save();
  console.log(JSON.stringify({id,location:state.current_location,facts:physicalFacts,png:output.png}));
 }
}
console.log(JSON.stringify({phase,chains:chains.length,images:rows.length}));
