import fs from 'node:fs';
const events=[]; for(const f of fs.readdirSync('state').filter(f=>f.startsWith('events.jsonl'))) for(const line of fs.readFileSync(`state/${f}`,'utf8').split(/\r?\n/)){try{const e=JSON.parse(line);if(e.type==='OPTIONS_CREATED'&&Number(e.sceneId)>=4596&&Number(e.sceneId)<=4895)events.push(e)}catch{}}
events.sort((a,b)=>Number(a.sceneId)-Number(b.sceneId));
const norm=s=>String(s||'').toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim();
const key=e=>e.finalOptions.map(o=>norm(`${o.action} :: ${o.consequence}`)).sort().join(' || ');
const map=new Map(); for(const e of events){const k=key(e); if(!map.has(k))map.set(k,[]);map.get(k).push({scene:e.sceneId,location:e.currentSceneManifest?.location,source:e.source,options:e.finalOptions.map(o=>o.action)});}
console.log(JSON.stringify({events:events.length,uniquePairs:map.size,top:[...map.entries()].sort((a,b)=>b[1].length-a[1].length).slice(0,25).map(([pair,rows])=>({count:rows.length,pair,rows}))},null,2));
