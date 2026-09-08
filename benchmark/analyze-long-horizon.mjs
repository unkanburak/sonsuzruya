import fs from 'node:fs';
import path from 'node:path';
import { sceneManifestFor, normalizeStoryState, sceneMatchedOptionLibrary } from '../app/lib/options.mjs';
import { OPTION_LIBRARY, optionTemplateMeta } from '../app/lib/option-library.mjs';

const root = process.cwd();
const files = fs.readdirSync(path.join(root,'state')).filter(f=>f.startsWith('events.jsonl')).sort();
const events=[];
for (const f of files) for (const line of fs.readFileSync(path.join(root,'state',f),'utf8').split(/\r?\n/)) { try { const e=JSON.parse(line); if(e.type==='OPTIONS_CREATED'&&Number(e.sceneId)>=4389&&Number(e.sceneId)<=4489) events.push(e); } catch {} }
events.sort((a,b)=>Number(a.sceneId)-Number(b.sceneId));
const byLoc=new Map();
for(const e of events){const m=e.currentSceneManifest||{}; const loc=m.location||'unknown'; if(!byLoc.has(loc))byLoc.set(loc,[]); byLoc.get(loc).push(e);}
console.log('EVENTS',events.length);
for(const [loc,es] of byLoc){
 const manifests=[...new Map(es.map(e=>[JSON.stringify({entities:e.currentSceneManifest?.entities,states:e.currentSceneManifest?.entity_states,adj:e.currentSceneManifest?.adjacent_locations}),e.currentSceneManifest])).values()];
 console.log('\nLOCATION',loc,'count',es.length,'sources',Object.entries(Object.groupBy(es,e=>e.source)).map(([k,v])=>`${k}:${v.length}`).join(','));
 for(const m of manifests) console.log(' MANIFEST',JSON.stringify({entities:m.entities,entity_states:m.entity_states,adjacent_locations:m.adjacent_locations}));
}

// Template inventory grouped by required tag / family, useful for explaining effective pool.
const groups={};
for(const t of OPTION_LIBRARY){const meta=optionTemplateMeta(t); if(meta.route_type!=='scene_local')continue; for(const tag of meta.required_tags){(groups[tag]??=[]).push({id:meta.id,label:meta.label_tr,family:meta.behavior_family,mutation:meta.mutation});}}
console.log('\nTEMPLATE_GROUPS'); for(const [k,v] of Object.entries(groups)) console.log(k,JSON.stringify(v));

// Replay each displayed manifest as a diagnostic snapshot. The replay is read-only;
// it reports whether a pair can be formed from that committed scene and bounded history.
let previous=[]; const counts={};
for(const e of events){ const state=normalizeStoryState({current_location:e.currentSceneManifest?.location,current_scene_manifest:e.currentSceneManifest,current_scene_entities:e.currentSceneManifest?.entities,recent_option_records:previous.map(label=>({label_tr:label})),recent_options:previous}); const pair=sceneMatchedOptionLibrary(state,previous,{}); const loc=e.currentSceneManifest?.location; counts[loc]??={n:0,pair:0}; counts[loc].n++; if(pair)counts[loc].pair++; previous.push(...(e.finalOptions||[]).map(x=>x.action)); previous=previous.slice(-20); }
console.log('\nREPLAY_COUNTS',JSON.stringify(counts));
