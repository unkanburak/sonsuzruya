import fs from 'node:fs';
const p='benchmark/long-horizon-300-result.json';
const s=fs.readFileSync(p,'utf8'); let depth=0,start=-1,inStr=false,esc=false,end=-1;
for(let i=0;i<s.length;i++){const c=s[i]; if(inStr){if(esc)esc=false; else if(c==='\\')esc=true; else if(c==='"')inStr=false; continue;} if(c==='"'){inStr=true;continue;} if(c==='{'){if(start<0)start=i;depth++;} else if(c==='}'){depth--;if(start>=0&&depth===0){end=i+1;break;}}}
if(start<0||end<0) throw new Error('no complete JSON object'); const obj=JSON.parse(s.slice(start,end)); if(Array.isArray(obj.rows)){const seen=new Set(); obj.rows=obj.rows.filter(r=>{const k=String(r.scene); if(seen.has(k)) return false; seen.add(k); return true;});} fs.writeFileSync(p,JSON.stringify(obj,null,2)); console.log(JSON.stringify({rows:obj.rows?.length,endScene:obj.endScene}));
