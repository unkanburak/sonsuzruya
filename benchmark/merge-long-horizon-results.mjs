import fs from 'node:fs';
const a=JSON.parse(fs.readFileSync('benchmark/long-horizon-300-result.json','utf8'));
const b=JSON.parse(fs.readFileSync('benchmark/long-horizon-300-cont-result.json','utf8'));
const rows=[...(a.rows||[]),...(b.rows||[])].slice(0,300);
fs.writeFileSync('benchmark/long-horizon-300-result.json',JSON.stringify({startScene:a.startScene,targetScene:a.startScene+300,endScene:b.endScene,rows},null,2));
console.log(JSON.stringify({rows:rows.length,startScene:a.startScene,endScene:b.endScene}));
