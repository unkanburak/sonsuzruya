const base='http://127.0.0.1:8194';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function j(u,o){const r=await fetch(base+u,o);if(!r.ok)throw Error(`${u} ${r.status} ${await r.text()}`);return r.json()}
const wf={
 '1':{class_type:'CheckpointLoaderSimple',inputs:{ckpt_name:'sdxl_lightning_4step.safetensors'}},
 '2':{class_type:'CLIPTextEncode',inputs:{text:'cinematic surreal realism, foggy bridge, lone adult figure in a dark long coat, atmospheric haze, CURRENT RESULT STATE: the protagonist is beneath the same bridge beside a glowing light, MUST SHOW the under-bridge location and light, no text, no logo',clip:['1',1]}},
 '3':{class_type:'CLIPTextEncode',inputs:{text:'text, letters, watermark, logo, brand, celebrity, copyrighted character, nsfw, gore, weapon, blurry, deformed, low quality',clip:['1',1]}},
 '4':{class_type:'EmptyLatentImage',inputs:{width:1024,height:576,batch_size:1}},
 '5':{class_type:'LoadImage',inputs:{image:'ref.png'}},
 '6':{class_type:'IPAdapterUnifiedLoader',inputs:{model:['1',0],preset:'STANDARD (medium strength)'}},
 '7':{class_type:'IPAdapter',inputs:{model:['6',0],ipadapter:['6',1],image:['5',0],weight:0.15,start_at:0,end_at:1,weight_type:'prompt is more important'}},
 '8':{class_type:'KSampler',inputs:{model:['7',0],seed:928374,steps:4,cfg:1,sampler_name:'euler',scheduler:'sgm_uniform',positive:['2',0],negative:['3',0],latent_image:['4',0],denoise:1}},
 '9':{class_type:'VAEDecode',inputs:{samples:['8',0],vae:['1',2]}},
 '10':{class_type:'SaveImage',inputs:{images:['9',0],filename_prefix:'ipadapter_smoke'}}
};
const a=await j('/prompt',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({prompt:wf,client_id:'ipadapter-spike'})});
for(;;){const h=await j('/history/'+a.prompt_id),x=h[a.prompt_id];if(x?.status?.completed){console.log(JSON.stringify({promptId:a.prompt_id,outputs:x.outputs,status:x.status},null,2));break}if(x?.status?.status_str==='error'){console.error(JSON.stringify(x.status,null,2));process.exit(1)}await sleep(500)}
