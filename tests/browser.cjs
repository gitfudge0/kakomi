const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
require('../src/geometry.js');
const { pixelCrop } = global.ElementShotGeometry;
assert.deepEqual(pixelCrop({x:10,y:20,width:100,height:50},{width:800,height:600},{width:1600,height:1200}),{x:20,y:40,width:200,height:100});
assert.deepEqual(pixelCrop({x:-20,y:570,width:100,height:60},{width:800,height:600},{width:1000,height:750}),{x:0,y:712,width:100,height:38});
assert.throws(()=>pixelCrop({x:900,y:0,width:20,height:20},{width:800,height:600},{width:800,height:600}));
assert.throws(()=>pixelCrop({x:NaN,y:0,width:20,height:20},{width:800,height:600},{width:800,height:600}));
const base = path.resolve(__dirname, '../src');
const artifacts = process.env.TEST_ARTIFACTS || path.resolve(__dirname, 'artifacts');
fs.mkdirSync(artifacts, {recursive:true});
const read = name => fs.readFileSync(path.join(base,name),'utf8');
let browser;
(async()=>{
 browser = await chromium.launch({...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {}),headless:true});
 const context = await browser.newContext({viewport:{width:1280,height:900},deviceScaleFactor:2});
 const page = await context.newPage();
 const processor = await context.newPage();
 const clipboardUrl=pathToFileURL(path.join(base,'clipboard.html')).href;
 let clipboardMode='success';const clipboardWrites=[];
 await page.exposeFunction('clipboardBridge',async record=>{clipboardWrites.push(record);return clipboardMode});
 await processor.goto('file:///' + path.join(base,'demo.html').replaceAll('\\','/'));
 await processor.evaluate(clipboardUrl=>{
  globalThis.saved = {}; globalThis.opened = []; globalThis.activeId = 1;
  globalThis.settings = { copyClipboard: false, openPreview: true };
  globalThis.chrome = {action:{onClicked:{addListener(){}}},runtime:{onMessage:{addListener(){}},getURL:x=>x==='clipboard.html'?clipboardUrl:x},
   tabs:{query:async()=>[{id:globalThis.activeId}],captureVisibleTab:async()=>globalThis.screenshot,create:async x=>globalThis.opened.push(x)},
   storage:{local:{get:async defaults=>({...defaults,...settings})},session:{get:async key=>key?{[key]:saved[key]}:{...saved},set:async x=>Object.assign(saved,x),remove:async keys=>(Array.isArray(keys)?keys:[keys]).forEach(k=>delete saved[k])}}};
 },clipboardUrl);
 await processor.addScriptTag({content:read('geometry.js')});
 await processor.addScriptTag({content:read('api.js')});
 await processor.addScriptTag({content:read('background.js').replace("import './geometry.js';",'').replace("import './api.js';",'')});
 let lastMessage,lastCaptureResponse,lastFinishResponse;const clipboardRequests=[];
 let captureRequests=0,holdNextCapture=false,releaseHeldCapture;
 await page.exposeFunction('captureBridge', async (message,sourceUrl)=>{
  if(message.type==='ELEMENT_SHOT_CLIPBOARD_DATA'){clipboardRequests.push(message);return processor.evaluate(async({message,sourceUrl})=>{try{return await clipboardData(message,{tab:{id:1},frameId:7,url:sourceUrl.split('#')[0]})}catch(error){return{ok:false,error:error.message}}},{message,sourceUrl})}
  if(message.type==='ELEMENT_SHOT_FINISH'){lastFinishResponse=await processor.evaluate(message=>finish(message,{tab:{id:1},frameId:0}),message);return lastFinishResponse}
  captureRequests++;
  if(holdNextCapture)await new Promise(resolve=>{releaseHeldCapture=resolve});
  lastMessage = message;
  assert.equal(await page.locator('[data-element-shot]').evaluate(el=>getComputedStyle(el).visibility),'hidden');
  const screenshot = 'data:image/png;base64,'+(await page.screenshot()).toString('base64');
  await processor.evaluate(data=>{globalThis.screenshot=data},screenshot);
  lastCaptureResponse=await processor.evaluate(message=>capture(message,{tab:{id:1,windowId:1,title:'Test page'},frameId:0}),message);
  return lastCaptureResponse;
 });
 await page.addInitScript(clipboardUrl=>{
  globalThis.hostClipboardWrites = 0;globalThis.clipboardResults=[];
  addEventListener('message',event=>{if(event.data?.type==='KAKOMI_CLIPBOARD_RESULT')globalThis.clipboardResults.push(event.data)});
  Object.defineProperty(navigator,'clipboard',{value:{write:async items=>{if(!location.pathname.endsWith('/clipboard.html'))globalThis.hostClipboardWrites++;const blob=await items[0].getType('image/png');const mode=await globalThis.clipboardBridge({url:location.href,type:blob.type,signature:Array.from(new Uint8Array(await blob.slice(0,8).arrayBuffer()))});if(mode==='failure')throw Error('blocked');if(mode==='timeout')await new Promise(()=>{})}}});
  const attach = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function(options){ const root=attach.call(this,options); if(this.hasAttribute('data-element-shot'))globalThis.testRoot=root; return root; };
  globalThis.chrome = {runtime:{sendMessage:message=>globalThis.captureBridge(message,location.href),getURL:name=>name==='clipboard.html'?clipboardUrl:name}};
 },clipboardUrl);
 await page.goto(pathToFileURL(path.join(base,'demo.html')).href);
 await page.evaluate(()=>{
  globalThis.clicked=0;
  // YouTube-style layout: body overflow is propagated to the viewport, while
  // absolutely positioned content leaves the body's own height at zero.
  document.body.style.cssText='margin:0;padding:0;height:0;overflow-x:auto;overflow-y:scroll';
  document.body.innerHTML='<article id="card" style="position:absolute;left:100px;top:100px;width:400px;height:220px;background:rgb(40,140,90)"><button id="target" style="position:absolute;left:20px;top:20px;width:160px;height:60px">Capture me</button></article><div id="clip" style="position:absolute;left:600px;top:100px;width:200px;height:100px;overflow:hidden"><div id="clipped" style="width:300px;height:200px;background:red"></div></div><iframe id="frame" style="position:absolute;left:600px;top:350px;width:220px;height:120px" srcdoc="<button>Inside iframe</button>"></iframe><div id="shadow" style="position:absolute;left:100px;top:450px"></div>';
  document.querySelector('#target').onclick=()=>globalThis.clicked++;
  document.querySelector('#shadow').attachShadow({mode:'open'}).innerHTML='<button id="inner" style="width:120px;height:60px">Shadow</button>';
 });
 const inject=async()=>{await page.addScriptTag({content:read('api.js')});await page.addScriptTag({content:read('geometry.js')});await page.addScriptTag({content:read('picker.js')});};
 const label=()=>page.evaluate(()=>testRoot.querySelector('.label').textContent);
 await inject();
 assert.equal(await page.evaluate(()=>document.body.getBoundingClientRect().height),0);
 // Even an accidentally interactive highlight must never become the hit target.
 await page.evaluate(()=>{testRoot.querySelector('.box').style.pointerEvents='auto';});
 await page.mouse.move(155,150);await page.mouse.move(160,155);
 assert.match(await label(),/button#target/);
 assert.equal(await page.evaluate(()=>testRoot.querySelector('.box').style.display),'block');
 // Recover hover after a missing release rather than continuing a ghost drag.
 await page.mouse.down();await page.mouse.move(190,175);
 await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointermove',{clientX:650,clientY:150,buttons:0,bubbles:true})));
 assert.match(await label(),/div#clipped/);
 await page.mouse.up();
 // A lost pointer capture also returns to element mode.
 await page.mouse.move(150,145);await page.mouse.down();await page.mouse.move(180,165);
 await page.evaluate(()=>window.dispatchEvent(new PointerEvent('lostpointercapture',{bubbles:true})));
 assert.doesNotMatch(await label(),/Custom area/);await page.mouse.up();
 await page.keyboard.press('Escape');await inject();
 await page.mouse.move(150,145);
 assert.match(await label(),/button#target/);
 await page.keyboard.press('ArrowUp'); assert.match(await label(),/article#card/);
 await page.keyboard.press('ArrowDown'); assert.match(await label(),/button#target/);
 await page.keyboard.press('ArrowUp');
 await page.mouse.click(150,145);
 await page.locator('[data-element-shot]').waitFor({state:'detached'});
 assert.equal(await page.evaluate(()=>clicked),0);
 assert.deepEqual(lastMessage.rect,{x:100,y:100,width:400,height:220});
 const record=await processor.evaluate(()=>Object.values(saved)[0]);
 assert.equal(record.width,800);assert.equal(record.height,440);
 assert.equal(lastCaptureResponse.copyClipboard,undefined);assert.equal(lastCaptureResponse.clipboardToken,undefined);assert.equal(lastCaptureResponse.data,undefined);
 const pixel=await processor.evaluate(async data=>{const bitmap=await createImageBitmap(await(await fetch(data)).blob());const canvas=new OffscreenCanvas(bitmap.width,bitmap.height);const c=canvas.getContext('2d');c.drawImage(bitmap,0,0);return [...c.getImageData(400,350,1,1).data]},record.data);
 assert.deepEqual(pixel,[40,140,90,255]);
 // Repeated toolbar activation must preserve an in-flight picker and its request lifecycle.
 await processor.evaluate(()=>{settings={copyClipboard:false,openPreview:true};opened=[]});
 holdNextCapture=true;const requestsBeforeReinjection=captureRequests;
 await inject();await page.mouse.move(150,145);await page.mouse.click(150,145);
 while(!releaseHeldCapture)await new Promise(resolve=>setTimeout(resolve,5));
 await page.evaluate(()=>{globalThis.pickerBeforeReinjection=document.querySelector('[data-element-shot]')});
 await inject();await inject();
 assert.equal(await page.evaluate(()=>pickerBeforeReinjection.isConnected&&document.querySelector('[data-element-shot]')===pickerBeforeReinjection),true);
 assert.equal(captureRequests,requestsBeforeReinjection+1);
 releaseHeldCapture();releaseHeldCapture=undefined;holdNextCapture=false;
 await page.locator('[data-element-shot]').waitFor({state:'detached'});
 assert.equal(captureRequests,requestsBeforeReinjection+1);
 assert.deepEqual(lastFinishResponse,{ok:true,copied:false});
 assert.equal(await processor.evaluate(()=>opened.length),1);
 assert.equal(await page.locator('[role="status"]').filter({hasText:'already being prepared'}).count(),0);
 // Capture waits for exactly the paint opportunity it needs, with no application timer floor.
 await processor.evaluate(()=>{settings={copyClipboard:false,openPreview:true};opened=[]});
 await page.evaluate(()=>{
   const nativeRAF=requestAnimationFrame.bind(window),nativeCancelRAF=cancelAnimationFrame.bind(window),nativeSetTimeout=setTimeout.bind(window);
   let nextId=1,queue=[];globalThis.captureTimerDelays=[];
   globalThis.requestAnimationFrame=callback=>{const id=nextId++;queue.push({id,callback});return id};
   globalThis.cancelAnimationFrame=id=>{queue=queue.filter(item=>item.id!==id)};
   globalThis.setTimeout=(callback,delay,...args)=>{captureTimerDelays.push(delay);return nativeSetTimeout(callback,delay,...args)};
   globalThis.flushCaptureFrame=()=>{const batch=queue;queue=[];for(const item of batch)item.callback(performance.now());return batch.length};
   globalThis.restoreCaptureClock=()=>{globalThis.requestAnimationFrame=nativeRAF;globalThis.cancelAnimationFrame=nativeCancelRAF;globalThis.setTimeout=nativeSetTimeout};
 });
 const requestsBeforeClockedCapture=captureRequests;
 await inject();await page.mouse.move(150,145);await page.mouse.click(150,145);
 assert.equal(captureRequests,requestsBeforeClockedCapture);
 assert.ok(await page.evaluate(()=>flushCaptureFrame())>=1);
 assert.equal(captureRequests,requestsBeforeClockedCapture);
 assert.ok(await page.evaluate(()=>flushCaptureFrame())>=1);
 assert.equal((await page.evaluate(()=>captureTimerDelays)).includes(80),false);
 for(let attempt=0;captureRequests===requestsBeforeClockedCapture&&attempt<50;attempt++)await new Promise(resolve=>setTimeout(resolve,5));
 assert.equal(captureRequests,requestsBeforeClockedCapture+1);
 await page.evaluate(()=>restoreCaptureClock());
 await page.locator('[data-element-shot]').waitFor({state:'detached'});
 // Default destination: clipboard, with no preview. Drag in reverse to test normalization.
 await processor.evaluate(()=>{settings={};opened=[]});
 await inject();await page.mouse.move(450,300);await page.mouse.down();await page.mouse.move(250,180,{steps:8});
 assert.match(await label(),/Custom area · 200 × 120/);
 await page.mouse.up();await page.locator('[data-element-shot]').waitFor({state:'detached'});
 assert.deepEqual(lastMessage.rect,{x:250,y:180,width:200,height:120});
 assert.equal(await page.evaluate(()=>hostClipboardWrites),0);
 assert.equal(clipboardWrites.length,1);assert.match(clipboardWrites[0].url,/clipboard\.html/);assert.deepEqual({type:clipboardWrites[0].type,signature:clipboardWrites[0].signature},{type:'image/png',signature:[137,80,78,71,13,10,26,10]});
 const completedCapture={...lastCaptureResponse};assert.equal(completedCapture.copyClipboard,true);assert.equal(typeof completedCapture.clipboardToken,'string');assert.ok(completedCapture.clipboardToken.length>=32);assert.equal(completedCapture.data,undefined);
 assert.deepEqual(clipboardRequests.at(-1),{type:'ELEMENT_SHOT_CLIPBOARD_DATA',id:completedCapture.id,token:completedCapture.clipboardToken});assert.equal(clipboardRequests.at(-1).data,undefined);
 const childResult=await page.evaluate(()=>clipboardResults.at(-1));assert.equal(childResult.ok,true);assert.equal(childResult.token,completedCapture.clipboardToken);assert.equal(childResult.data,undefined);
 assert.deepEqual(lastFinishResponse,{ok:true,copied:true});assert.equal(lastFinishResponse.data,undefined);
 assert.equal(await page.locator('[data-element-shot-clipboard], iframe[src*="clipboard.html"]').count(),0);
 assert.equal(await processor.evaluate(()=>opened.length),0);
 const writesAfterSuccess=clipboardWrites.length;
 const replay=await processor.evaluate(async({id,token,clipboardUrl})=>{try{return await clipboardData({type:'ELEMENT_SHOT_CLIPBOARD_DATA',id,token},{tab:{id:1},frameId:8,url:clipboardUrl})}catch(error){return{ok:false,error:error.message}}},{id:completedCapture.id,token:completedCapture.clipboardToken,clipboardUrl});
 assert.equal(replay.ok,false);assert.equal(clipboardWrites.length,writesAfterSuccess);
 const guardedCapture=await processor.evaluate(()=>capture({rect:{x:100,y:100,width:200,height:100},viewport:{width:1280,height:900}},{tab:{id:1,windowId:1,title:'Test page'},frameId:0}));
 assert.equal(guardedCapture.data,undefined);assert.equal(typeof guardedCapture.clipboardToken,'string');
 const wrongSender=await processor.evaluate(async({id,token})=>{try{return await clipboardData({type:'ELEMENT_SHOT_CLIPBOARD_DATA',id,token},{tab:{id:1},frameId:9,url:'https://attacker.example/'})}catch(error){return{ok:false,error:error.message}}},{id:guardedCapture.id,token:guardedCapture.clipboardToken});assert.equal(wrongSender.ok,false);assert.equal(clipboardWrites.length,writesAfterSuccess);
 const wrongToken='0'.repeat(64),wrong=await processor.evaluate(async({id,token,clipboardUrl})=>{try{return await clipboardData({type:'ELEMENT_SHOT_CLIPBOARD_DATA',id,token},{tab:{id:1},frameId:9,url:clipboardUrl})}catch(error){return{ok:false,error:error.message}}},{id:guardedCapture.id,token:wrongToken,clipboardUrl});
 assert.equal(wrong.ok,false);assert.equal(clipboardWrites.length,writesAfterSuccess);
 const attack=await page.evaluate(async({clipboardUrl,id,token})=>{const iframe=document.createElement('iframe');iframe.src=clipboardUrl+'#'+new URLSearchParams({id,token});const response=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Attack iframe timed out.')),3000);addEventListener('message',event=>{if(event.source===iframe.contentWindow&&event.data?.type==='KAKOMI_CLIPBOARD_RESULT'){clearTimeout(timer);resolve(event.data)}})});await new Promise(resolve=>{iframe.addEventListener('load',resolve,{once:true});document.body.append(iframe)});iframe.contentWindow.postMessage({type:'KAKOMI_CLIPBOARD_START',token},'*');const result=await response;iframe.remove();return result},{clipboardUrl,id:guardedCapture.id,token:wrongToken});
 assert.equal(attack.ok,false);assert.equal(clipboardWrites.length,writesAfterSuccess);
 const authorized=await processor.evaluate(async({id,token,clipboardUrl})=>clipboardData({type:'ELEMENT_SHOT_CLIPBOARD_DATA',id,token},{tab:{id:1},frameId:10,url:clipboardUrl}),{id:guardedCapture.id,token:guardedCapture.clipboardToken,clipboardUrl});assert.equal(authorized.ok,true);assert.match(authorized.data,/^data:image\/png;base64,/);assert.equal(await processor.evaluate(id=>saved[id].clipboardToken,guardedCapture.id),undefined);
 const consumedReplay=await processor.evaluate(async({id,token,clipboardUrl})=>{try{return await clipboardData({type:'ELEMENT_SHOT_CLIPBOARD_DATA',id,token},{tab:{id:1},frameId:11,url:clipboardUrl})}catch(error){return{ok:false,error:error.message}}},{id:guardedCapture.id,token:guardedCapture.clipboardToken,clipboardUrl});assert.equal(consumedReplay.ok,false);assert.equal(clipboardWrites.length,writesAfterSuccess);await processor.evaluate(id=>kakomiAPI.storage.session.remove(id),guardedCapture.id);
 // Legacy both-true settings choose preview only.
 await processor.evaluate(()=>{settings={copyClipboard:true,openPreview:true}});
 await inject();await page.mouse.move(150,145);await page.mouse.click(150,145);await page.locator('[data-element-shot]').waitFor({state:'detached'});
 assert.equal(clipboardWrites.length,1);
 assert.equal(await processor.evaluate(()=>opened.length),1);
 // Legacy both-false settings normalize to clipboard only.
 await processor.evaluate(()=>{settings={copyClipboard:false,openPreview:false};opened=[]});
 await inject();await page.mouse.move(150,145);await page.mouse.click(150,145);await page.locator('[data-element-shot]').waitFor({state:'detached'});
 assert.equal(clipboardWrites.length,2);
 assert.equal(await processor.evaluate(()=>opened.length),0);
 await processor.evaluate(()=>{settings={};opened=[]});clipboardMode='failure';
 await inject();await page.mouse.move(150,145);await page.mouse.click(150,145);
 await page.waitForFunction(()=>/Could not copy.*clipboard.*try again/i.test(testRoot.querySelector('.status').textContent));
 await page.locator('[data-element-shot]').waitFor({state:'visible'});
 assert.match(await page.evaluate(()=>testRoot.querySelector('.status').textContent),/Could not copy.*clipboard.*try again/i);
 assert.equal(await processor.evaluate(()=>opened.length),0);
 assert.equal(await page.locator('[data-element-shot-clipboard], iframe[src*="clipboard.html"]').count(),0);
 await page.keyboard.press('Escape');clipboardMode='timeout';await inject();await page.mouse.move(150,145);await page.mouse.click(150,145);
 while(clipboardWrites.length<4)await new Promise(resolve=>setTimeout(resolve,20));
 assert.deepEqual(await page.evaluate(()=>{const host=document.querySelector('[data-element-shot-clipboard]');return{host:Boolean(host),closed:host?.shadowRoot===null,empty:host?.innerHTML==='',lightFrames:document.querySelectorAll('iframe[src*="clipboard.html"]').length,leaks:host?.outerHTML.includes('clipboard.html')}}),{host:true,closed:true,empty:true,lightFrames:0,leaks:false});
 await page.waitForFunction(()=>/Could not copy.*clipboard.*try again/i.test(testRoot.querySelector('.status').textContent),null,{timeout:5000});assert.equal(await page.locator('[data-element-shot-clipboard]').count(),0);
 clipboardMode='success';assert.equal(await page.evaluate(()=>hostClipboardWrites),0);
 // Cancel a drag without capturing, and ignore thin rectangles.
 const previous=lastMessage;
 await inject();await page.mouse.move(200,200);await page.mouse.down();await page.mouse.move(300,280);await page.keyboard.press('Escape');await page.mouse.up();
 assert.equal(await page.locator('[data-element-shot]').count(),0);assert.equal(lastMessage,previous);
 await inject();await page.mouse.move(200,200);await page.mouse.down();await page.mouse.move(300,200);await page.mouse.up();
 assert.match(await page.evaluate(()=>testRoot.querySelector('.status').textContent),/at least/);assert.equal(lastMessage,previous);
 await page.keyboard.press('Escape');
 await inject();await page.mouse.move(650,150);assert.match(await label(),/visible portion/);
 await page.keyboard.press('Escape');assert.equal(await page.locator('[data-element-shot]').count(),0);
 await inject();await page.mouse.move(630,380);assert.match(await label(),/iframe#frame/);
 await page.keyboard.press('Escape');
 await inject();await page.mouse.move(120,470);assert.match(await label(),/button#inner/);
 await page.evaluate(()=>{globalThis.pickerBeforeIdleReinjection=document.querySelector('[data-element-shot]')});
 await inject();assert.equal(await page.evaluate(()=>pickerBeforeIdleReinjection.isConnected&&document.querySelector('[data-element-shot]')===pickerBeforeIdleReinjection),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('[data-element-shot]').count(),0);
 const inactive=await processor.evaluate(async()=>{activeId=2;try{await capture({},{tab:{id:1,windowId:1},frameId:0})}catch(e){return e.message}finally{activeId=1}});
 assert.match(inactive,/active tab changed/);
 // Chrome may expose a distinct browser wrapper with the Firefox-shaped API even though extension access is denied.
 await processor.evaluate(clipboardUrl=>{
   globalThis.nativeAttempts=0;
   globalThis.browser={...chrome,
     runtime:{...chrome.runtime,getURL:name=>name==='clipboard.html'?clipboardUrl:'chrome-extension://kakomi-test/'+name},
     clipboard:{setImageData:async()=>{globalThis.nativeAttempts++;throw Error('Access to extension API denied.')}}};
 },clipboardUrl);
 await processor.addScriptTag({content:read('api.js')});
 const chromeClipboardApi=await processor.evaluate(async()=>{
   settings={};opened=[];
   const result=await capture({rect:{x:100,y:100,width:200,height:100},viewport:{width:1280,height:900}}, {tab:{id:1,windowId:1},frameId:0});
   await kakomiAPI.storage.session.remove(result.id);delete globalThis.browser;globalThis.kakomiAPI=chrome;
   return {copied:result.copied,copyClipboard:result.copyClipboard,tokenType:typeof result.clipboardToken,nativeAttempts};
 });
 assert.deepEqual(chromeClipboardApi,{copied:false,copyClipboard:true,tokenType:'string',nativeAttempts:0});
 // Firefox adapter: browser namespace and native PNG clipboard API.
 const nativeResult=await processor.evaluate(async clipboardUrl=>{
   globalThis.browser={...chrome,
     runtime:{...chrome.runtime,getURL:name=>name==='clipboard.html'?clipboardUrl:'moz-extension://kakomi-test/'+name},
     clipboard:{setImageData:async(buffer,type)=>{
     if(type!=='png'||new Uint8Array(buffer)[0]!==137) throw Error('Invalid PNG');
     globalThis.nativeCopies=(globalThis.nativeCopies||0)+1;
   }}};
   globalThis.kakomiAPI=browser; settings={};opened=[];
   const result=await capture({rect:{x:100,y:100,width:200,height:100},viewport:{width:1280,height:900}}, {tab:{id:1,windowId:1},frameId:0});
   await finish({id:result.id,copied:result.copied},{tab:{id:1},frameId:0});
   return {copied:result.copied,data:result.data,nativeCopies,opened:opened.length};
 },clipboardUrl);
 assert.deepEqual(nativeResult,{copied:true,data:undefined,nativeCopies:1,opened:0});
 const nativeFailure=await processor.evaluate(async()=>{
   browser.clipboard.setImageData=async()=>{throw Error('Clipboard denied')};
   const result=await capture({rect:{x:100,y:100,width:200,height:100},viewport:{width:1280,height:900}}, {tab:{id:1,windowId:1},frameId:0});
   let error;
   try { await finish({id:result.id,copied:result.copied},{tab:{id:1},frameId:0}) } catch (caught) { error=caught.message }
   globalThis.kakomiAPI=chrome;
   return {error,opened:opened.length,remaining:Boolean(saved[result.id])};
 });
 assert.match(nativeFailure.error,/Could not copy.*clipboard.*try again/i);
 assert.deepEqual(nativeFailure,{error:nativeFailure.error,opened:0,remaining:false});
 const preview=await context.newPage();
 await preview.addInitScript(record=>{globalThis.chrome={storage:{session:{get:async key=>({[key]:record})}}}},record);
 await preview.goto(pathToFileURL(path.join(base,'preview.html')).href+'?id=test');
 await preview.locator('#capture').waitFor({state:'visible'});
 assert.equal(await preview.locator('#dimensions').textContent(),'976 × 616 PX · PNG');
 assert.equal(await preview.getByRole('tab',{name:'Gradient',exact:true}).getAttribute('aria-selected'),'true');
 assert.equal(await preview.locator('#padding').inputValue(),'20');
 assert.equal(await preview.locator('#remove-background').isChecked(),false);
 const download=preview.waitForEvent('download');await preview.locator('#download').click();const file=await download;
 assert.match(file.suggestedFilename(),/^kakomi-.*\.png$/);
 await file.saveAs(path.join(artifacts,'verified-capture.png'));
 await preview.screenshot({path:path.join(artifacts,'preview-check.png')});
 const errors=[];preview.on('pageerror',e=>errors.push(e.message));
 await preview.setViewportSize({width:390,height:844});
 assert.equal(await preview.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 const openSettings=async initial=>{
  const settingsPage=await context.newPage();
  await settingsPage.addInitScript(prefs=>{globalThis.prefs={...prefs};globalThis.chrome={storage:{local:{get:async d=>({...d,...globalThis.prefs}),set:async p=>{globalThis.prefs=p}}}}},initial);
  await settingsPage.goto(pathToFileURL(path.join(base,'settings.html')).href);
  await settingsPage.locator('#controls').waitFor();
  await settingsPage.waitForFunction(()=>!document.getElementById('controls').disabled);
  return settingsPage;
 };
 const legacyPreviewPage=await openSettings({copyClipboard:true,openPreview:true});
 assert.equal(await legacyPreviewPage.getByRole('switch').count(),1);
 assert.equal(await legacyPreviewPage.locator('#openPreview').isChecked(),true);
 await legacyPreviewPage.locator('#openPreview').click();await legacyPreviewPage.waitForFunction(()=>prefs.openPreview===false);
 assert.deepEqual(await legacyPreviewPage.evaluate(()=>prefs),{copyClipboard:true,openPreview:false});
 await legacyPreviewPage.close();
 const settingsPage=await openSettings({copyClipboard:false,openPreview:false});
 assert.equal(await settingsPage.getByRole('switch').count(),1);
 assert.equal(await settingsPage.locator('#openPreview').isChecked(),false);
 await settingsPage.locator('#openPreview').click();await settingsPage.waitForFunction(()=>prefs.openPreview===true);
 assert.deepEqual(await settingsPage.evaluate(()=>prefs),{copyClipboard:false,openPreview:true});
 assert.match(await settingsPage.locator('details').textContent(),/toolbar icon/i);
 assert.match(await settingsPage.locator('details').textContent(),/Alt\s*\+\s*Shift\s*\+\s*S/i);
 await settingsPage.screenshot({path:path.join(artifacts,'settings-check.png')});
 // A presentable preview using the bundled playground's card.
 await page.goto(pathToFileURL(path.join(base,'demo.html')).href);
 await inject();await page.mouse.move(155,390);await page.keyboard.press('ArrowUp');
 await page.screenshot({path:path.join(artifacts,'picker-check.png')});
 console.log('PASS: geometry, 2x PNG pixels, element selection, reverse drag, drag cancellation, thin-area rejection, exclusive capture destinations, copy failure reporting without preview, settings save and shortcut help, overlay removal, click suppression, clipping, iframe, shadow DOM, cleanup, tab guard, preview, download, mobile layout.');
 console.log('Extension APIs were simulated; toolbar activation and captureVisibleTab permissions require a manual smoke test.');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(async()=>{await browser?.close()});
