// Local verification helper only; no npm packages and no app backend required.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const server=http.createServer((req,res)=>{
 const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!file.startsWith(root+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()){res.writeHead(404);res.end('Not found');return;}
 const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.glb':'model/gltf-binary','.mp3':'audio/mpeg'};
 res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Content-Length',fs.statSync(file).size);
 if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
});
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let browser,socket;
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const profile=fs.mkdtempSync(path.join(os.tmpdir(),'animal-books-test-'));
 browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--mute-audio','--no-first-run','--remote-debugging-port=0','--remote-debugging-address=127.0.0.1','--enable-unsafe-swiftshader',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
 let port;
 for(let i=0;i<60;i++){try{port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];break;}catch{await pause(500)}}
 if(!port)throw Error('Chrome could not start');
 const tabs=await(await fetch('http://127.0.0.1:'+port+'/json')).json();
 socket=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j});
 let seq=0;const pending=new Map();socket.onmessage=e=>{const msg=JSON.parse(e.data);if(msg.id){const task=pending.get(msg.id);pending.delete(msg.id);msg.error?task.reject(Error(msg.error.message)):task.resolve(msg.result)}};
 const call=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
 const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Page.enable');

 await call('Page.addScriptToEvaluateOnNewDocument',{source:`
 window.cameraRequests=0;window.testPage='elephant';window.hideTestCard=false;
 navigator.mediaDevices.getUserMedia=async()=>{
 window.cameraRequests++;
 const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=960;const ctx=canvas.getContext('2d');const images={};
 for(const id of ['elephant','frog','kitten','lion','monkey','rooster','tiger','wolf']){const im=new Image();im.src='/assets/markers/'+id+'.png';images[id]=im;}
 const draw=()=>{ctx.fillStyle='#dddddd';ctx.fillRect(0,0,1280,960);const im=images[window.testPage];if(!window.hideTestCard&&im?.complete&&im.naturalWidth)ctx.drawImage(im,340,180,600,600);};draw();
 const timer=setInterval(draw,80);const stream=canvas.captureStream(15);stream.getTracks().forEach(track=>{const stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop()}});return stream;
 };`});
 await call('Page.navigate',{url:origin+'/?preview=1'});
 const until=async(expression,message,seconds=60)=>{for(let i=0;i<seconds;i++){if(await evaluate(expression))return;await pause(1000)}throw Error(message+': '+await evaluate('ui.status.textContent'))};
 await until('typeof entries!=="undefined" && entries.size===8 && !entries.get("elephant").placeholder','Initial model');
 const ids=await evaluate('BOOK_CONFIG.animals.map(a=>a.id)');
 fs.mkdirSync(path.join(root,'verification'),{recursive:true});
 for(const id of ids){
  await evaluate(`selectPreview('${id}')`);await pause(300);
  assert.equal(await evaluate(`entries.get('${id}').placeholder`),false,'Model '+id);
  assert.equal(await evaluate('[...entries.values()].filter(e=>e.group.visible).length'),1);
  const hit=await evaluate(`(()=>{content.updateWorldMatrix(true,true);const entry=entries.get('${id}');const rect=previewRenderer.domElement.getBoundingClientRect();for(let y=-.85;y<.9;y+=.025){for(let x=-.9;x<.9;x+=.025){raycaster.setFromCamera(new THREE.Vector2(x,y),previewCamera);if(raycaster.intersectObject(entry.visual,true).length){hitAnimal({clientX:rect.left+(x+1)*rect.width/2,clientY:rect.top+(1-y)*rect.height/2});return true}}}return false})()`);
  assert(hit,'Raycast '+id);await until('activeAudio && activeAudio.currentTime>0','Audio started '+id,15);
  const audio=await evaluate('({src:activeAudio?.src,playing:activeAudio && !activeAudio.paused,time:activeAudio?.currentTime,duration:activeAudio?.duration})');
  assert(audio.src?.endsWith(id+'.mp3')&&audio.playing&&audio.time>0&&audio.duration>0,'Audio '+id+JSON.stringify(audio));
  await evaluate('window.lastAudio=activeAudio;stopSound()');assert(await evaluate('lastAudio.paused && lastAudio.currentTime===0 && activeAudio===null'));
  console.log('PASS model, raycast, real MP3 playback and stop: '+id);
 }

 assert(await evaluate('[...entries.values()].every(e=>e.labels?.children.length===2 && e.labels.children[0].position.y>0 && e.labels.children[1].position.y<0)'));
 assert.equal(await evaluate('document.getElementById("stop-audio")'),null);
 await evaluate('selectPreview("lion");playAnimal("lion")');
 await until('activeAudio && activeAudio.currentTime>0','Long audio started');
 assert(await evaluate('activeAudio.duration>15'));
 await evaluate('window.cappedAudio=activeAudio');
 await until('activeAudio===null','15 second cutoff',18);
 assert(await evaluate('cappedAudio.paused && cappedAudio.currentTime===0'));
 console.log('PASS bilingual labels above/below models and no stop control and real long audio automatically stops after 15 seconds');
 assert.equal(await evaluate('assetIssues.size'),0);
 await evaluate('selectPreview("elephant")');
 const png=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'verification/preview-mobile.png'),Buffer.from(png.data,'base64'));
 await call('Emulation.setDeviceMetricsOverride',{width:900,height:700,deviceScaleFactor:1,mobile:false});
 await evaluate('startAR()');assert.equal(await evaluate('mode'),'ar');
 for(const id of ids){
  await evaluate(`window.testPage='${id}';window.hideTestCard=false`);
  await until(`tracking && activeId==='${id}' && content.visible`,'Track '+id,60);
  assert.equal(await evaluate('[...entries.values()].filter(e=>e.group.visible).length'),1);
  console.log('PASS real MindAR recognition with synthetic camera: '+id);
  if(id==='elephant'){const shot=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'verification/ar-elephant.png'),Buffer.from(shot.data,'base64'));}
  await evaluate(`playAnimal('${id}');window.hideTestCard=true`);
  await until('!tracking && !content.visible && activeAudio===null','Target loss and audio stop',30);
 }
 await evaluate('usePreview()');assert.equal(await evaluate('mode'),'preview');
 await call('Page.navigate',{url:origin});
 await until('typeof mindar!=="undefined" && mode==="ar" && !starting','Automatic camera startup');
 assert(await evaluate('ui["start-ar"].hidden && ui.preview.hidden && getComputedStyle(ui["animal-buttons"]).display==="none" && ui["asset-details"].hidden'));
 await evaluate('window.testPage="elephant";window.hideTestCard=false');
 await until('tracking && activeId==="elephant" && !entries.get("elephant").placeholder','Automatic scan');
 const minimal=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(root,'verification/camera-minimal.png'),Buffer.from(minimal.data,'base64'));
 assert.equal(await evaluate('window.cameraRequests'),1);
 assert(await evaluate('entries.get(activeId).visual.getWorldQuaternion(new THREE.Quaternion()).angleTo(mindar.camera.getWorldQuaternion(new THREE.Quaternion()))<0.001'));
 console.log('PASS single camera acquisition, camera-facing orientation, automatic scan and minimal UI');
 const point=await evaluate(`(()=>{content.updateWorldMatrix(true,true);const r=mindar.renderer.domElement.getBoundingClientRect();for(let y=-.7;y<.7;y+=.025)for(let x=-.7;x<.7;x+=.025){const e={clientX:r.left+(x+1)*r.width/2,clientY:r.top+(1-y)*r.height/2};if(pickAnimal(e))return {x:e.clientX,y:e.clientY}}})()`);
 assert(point,'Find model for drag');
 await call('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
 await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+65,y:point.y,button:'left',buttons:1});
 await call('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+65,y:point.y,button:'left',clickCount:1});
 assert(await evaluate('Math.abs(entries.get(activeId).yaw)>0.5 && activeAudio===null'));
 await pause(300);
 assert(await evaluate('entries.get(activeId).visual.getWorldQuaternion(new THREE.Quaternion()).angleTo(mindar.camera.getWorldQuaternion(new THREE.Quaternion()).multiply(entries.get(activeId).userRotation))<0.001'));
 console.log('PASS drag rotates model without audio and preserves camera-relative orientation');

 await call('Page.addScriptToEvaluateOnNewDocument',{source:'navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Denied","NotAllowedError")};'});
 await call('Page.navigate',{url:origin});
 await until('typeof ui!=="undefined" && ui.status.textContent.includes("Izinkan")','Camera denied message');
 assert(await evaluate('!ui["start-ar"].hidden && !ui["start-ar"].disabled'));
 console.log('PASS camera permission error and retry control');
 console.log('PASS all eight targets, hide-on-loss, stop audio, return to preview');
 await call('Browser.close').catch(()=>{});
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{socket?.close();browser?.kill();server.closeAllConnections();server.close()});
