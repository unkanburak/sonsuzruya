import WebSocket from 'ws';
const url='wss://dispatch-adware-regarded-rate.trycloudflare.com';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(n){
  const clients=[]; let connected=0, messages=0, errors=0; const t=performance.now();
  for(let i=0;i<n;i++) await new Promise(resolve=>{const s=new WebSocket(url); clients.push(s); s.on('open',()=>{connected++;resolve()}); s.on('message',()=>messages++); s.on('error',()=>{errors++;resolve()}); setTimeout(resolve,15000)});
  await sleep(1500); const elapsed=(performance.now()-t)/1000; clients.forEach(s=>s.close());
  return {clients:n,connected,messages,errors,seconds:elapsed};
}
const results=[]; for(const n of [25,50,100]){const r=await run(n); results.push(r); console.log(JSON.stringify(r));}
console.log(JSON.stringify({results},null,2));
