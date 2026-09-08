const base='http://127.0.0.1:3000', sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function g(p){return (await fetch(base+p)).json()}
const rows=[];
for(let i=0;i<10;i++){let b=await g('/api/state');while(b.phase!=='PLAYING_VOTING'){await sleep(500);b=await g('/api/state')}const r=await fetch(base+'/api/debug/vote',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({userId:`ui-reg-${Date.now()}-${i}`,vote:i%2?'1':'2'})});if(!r.ok)throw Error('vote');let s;for(let k=0;k<240;k++){s=await g('/api/state');if(s.sceneNumber>b.sceneNumber)break;await sleep(500)}rows.push({turn:i+1,from:b.sceneNumber,to:s.sceneNumber,phase:s.phase,media:s.media});console.log(`${i+1}/10 ${b.sceneNumber}->${s.sceneNumber}`)}
console.log(JSON.stringify({rows,success:rows.filter(x=>x.to>x.from).length},null,2));
