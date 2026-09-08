import fs from 'node:fs';
import { optionMeta } from '../app/lib/options.mjs';
import { physicalAxis, visiblePhysicalEntity, physicalFactsForPrompt } from '../app/lib/physical-memory.mjs';
const base = 'http://127.0.0.1:3000';
const dir = 'benchmark/p0-memory';
fs.mkdirSync(dir+'/images', {recursive:true});
const rows = [], faults = [];
const counts = Object.fromEntries(['physical_memory_corruption','cross_entity_state_leakage','stale_ephemeral_leakage','prompt_state_contradiction','manifest_invalid','stuck','duplicate_publish'].map(k=>[k,0]));
const startedAt = new Date().toISOString();
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const get = async () => (await fetch(base+'/api/state')).json();
const fail = (type, scene, detail) => {counts[type]++;faults.push({type,scene,detail});};
const write = () => fs.writeFileSync(dir+'/production-15.json',JSON.stringify({startedAt,endedAt:new Date().toISOString(),completed:rows.length,counts,rows,faults},null,2));
async function ready(after = -1) {
  const deadline=Date.now()+90000;
  while(Date.now()<deadline){const s=await get();if(s.sceneNumber>after&&s.phase==='PLAYING_VOTING'&&s.optionsReady&&s.readiness==='ready')return s;await sleep(150)}
  fail('stuck',after,'No displayed voting round within 90 seconds');throw Error('stuck');
}
try {
  let before = await ready();
  if (!before.storyState.physical_memory || !before.storyState.current_scene_manifest.entity_physical_states) throw Error('P0 deployment is not loaded; no production votes sent');
  for(let i=0;i<15;i++){
    const scene=before.sceneNumber;
    const choices=['1','2'].map(v=>({v,meta:optionMeta(before.options,v)}));
    // Vote only on the actual displayed pair. Prefer an offered physical change;
    // otherwise alternate the displayed branches. No direct state writes.
    const chosen=choices.find(x=>physicalAxis(x.meta.statePatch?.entity_state_mutation?.to_state)) || choices[i%2];
    const response=await fetch(base+'/api/debug/vote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:`p0-memory-${startedAt}-${i}`,vote:chosen.v})});
    if(!response.ok)throw Error('vote_not_accepted_'+scene);
    const after=await ready(scene);
    if(after.sceneNumber!==scene+1)throw Error('non_consecutive_round');
    const m=after.storyState.current_scene_manifest;
    const previous=before.storyState.current_scene_manifest;
    const patch=chosen.meta.statePatch||{};
    const mutation=patch.entity_state_mutation;
    const actualWinner=after.winnerTr; // event log below is authoritative if public winner is cleared.
    const changed=m.location!==previous.location;
    const owner=(loc,t)=>t==='door'&&['red_house_exterior','red_house_doorstep'].includes(loc)?'red_house_exterior':loc;
    for(const [loc,entities] of Object.entries(before.storyState.physical_memory||{}))for(const [target,facets]of Object.entries(entities))for(const [axis,value]of Object.entries(facets)){
      const mutated=!changed&&mutation?.target_entity===target&&physicalAxis(mutation.to_state)===axis&&owner(previous.location,target)===loc;
      const expected=mutated?mutation.to_state:value;
      if(after.storyState.physical_memory?.[loc]?.[target]?.[axis]!==expected)fail('physical_memory_corruption',scene,{loc,target,axis,expected,actual:after.storyState.physical_memory?.[loc]?.[target]?.[axis]});
    }
    for(const [target,facets]of Object.entries(m.entity_physical_states||{})){
      if(!visiblePhysicalEntity(m,target))fail('cross_entity_state_leakage',scene,{target,location:m.location});
      const saved=before.storyState.physical_memory?.[owner(m.location,target)]?.[target];
      if(changed&&saved)for(const [axis,value]of Object.entries(saved))if(facets[axis]!==value)fail('physical_memory_corruption',scene,{reentry:target,axis,value,actual:facets[axis]});
    }
    if(changed)for(const [target,value]of Object.entries(m.entity_interactions||{}))if(!['far','faint'].includes(value))fail('stale_ephemeral_leakage',scene,{target,value});
    const facts=physicalFactsForPrompt(m);
    if(!after.lastPrompt.includes(facts)||!after.lastPrompt.includes(`COMMITTED SCENE: ${m.location.replaceAll('_',' ')}`))fail('prompt_state_contradiction',scene,{facts,prompt:after.lastPrompt});
    for(const [target,facets]of Object.entries(m.entity_physical_states||{})){
      const state=facets.power||facets.aperture;
      const opposite={on:'off',off:'on',open:'closed',closed:'open'}[state];
      if(opposite&&new RegExp(`(?:${target} (?:is|remains|stays)(?: now)? (?:powered )?${opposite}\\b|${opposite} (?:front )?${target}\\b)`,'i').test(after.lastPrompt))fail('prompt_state_contradiction',scene,{target,state,prompt:after.lastPrompt});
    }
    if(m.location!==after.storyState.current_location)fail('manifest_invalid',scene,'location mismatch');
    if(changed&&!previous.adjacent_locations.includes(m.location))fail('manifest_invalid',scene,'non adjacent winner');
    if(mutation&&!changed&&mutation.target_entity!=='scene'&&!visiblePhysicalEntity(previous,mutation.target_entity))fail('manifest_invalid',scene,{mutation});
    const image=await fetch(base+after.media);if(!image.ok)throw Error('media_unavailable');
    fs.writeFileSync(`${dir}/images/scene-${after.sceneNumber}.png`,Buffer.from(await image.arrayBuffer()));
    rows.push({round:i+1,scene,nextScene:after.sceneNumber,requestedVote:chosen.v,actualWinner,options:before.options,patch,before:before.storyState,after:after.storyState,prompt:after.lastPrompt,media:after.media});
    write();console.log(JSON.stringify({round:i+1,scene,nextScene:after.sceneNumber,location:m.location,states:m.entity_states,counts}));
    before=after;
  }
  await sleep(500);
  const events=fs.readdirSync('state').filter(f=>f.startsWith('events.jsonl')).flatMap(f=>fs.readFileSync('state/'+f,'utf8').split(/\r?\n/).flatMap(l=>{try{return[JSON.parse(l)]}catch{return[]}}));
  for(const row of rows){
    const selected=events.filter(e=>Number(e.sceneId)===row.scene&&e.type==='WINNER_RESOLVED').at(-1);
    row.loggedWinner=selected?.winner;
    if(String(selected?.winner)!==row.requestedVote)fail('manifest_invalid',row.scene,'Actual winner differs from requested vote; inspect trace rather than attributing requested patch');
    const publications=events.filter(e=>Number(e.sceneId)===row.nextScene&&e.type==='OPTIONS_CREATED');
    row.publishCount=publications.length;row.source=publications[0]?.source;
    if(publications.length>1)fail('duplicate_publish',row.nextScene,publications.length);
    if(publications.length===0)fail('stuck',row.nextScene,'No OPTIONS_CREATED event');
  }
  write();console.log(JSON.stringify({completed:rows.length,counts}));
}catch(error){faults.push({error:String(error)});write();console.error(error);process.exitCode=1;}
