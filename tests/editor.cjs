const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
fs.mkdirSync('tests/artifacts',{recursive:true});
(async()=>{const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});try{
const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(() => {
 const c=document.createElement('canvas');c.width=400;c.height=240;const x=c.getContext('2d');x.fillStyle='#e9f0f7';x.fillRect(0,0,400,240);x.fillStyle='#24543e';x.fillRect(24,24,352,60);x.fillStyle='#fff';x.font='24px sans-serif';x.fillText('Project overview',40,63);x.fillStyle='#97b8ac';x.fillRect(24,108,160,108);x.fillRect(208,108,168,44);x.fillRect(208,172,168,44);
 globalThis.fixtureData=c.toDataURL();globalThis.chrome={storage:{session:{get:async id=>({[id]:{data:fixtureData,width:400,height:240,label:'section#overview',title:'Project overview',created:Date.now()}})}}};
 globalThis.copyCount=0;Object.defineProperty(navigator,'clipboard',{value:{write:async items=>{globalThis.copyCount++;const b=await items[0].getType('image/png');await new Promise(r=>setTimeout(r,globalThis.copyDelay||0));if(globalThis.copyFail)throw Error('Clipboard unavailable');globalThis.copied=b}}});
 const toBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(cb,...args){return toBlob.call(this,b=>setTimeout(()=>cb(b),globalThis.renderDelay||0),...args)};
 });
await page.goto(pathToFileURL(path.resolve('src/preview.html')).href+'?id=editor');await page.locator('#editor').waitFor({state:'visible'});
const ready=()=>page.waitForFunction(()=>document.querySelector('#download').getAttribute('aria-disabled')==='false');
const slide=async(id,v)=>{await page.locator('#'+id).fill(String(v));await ready()};
const bytes=()=>page.evaluate(async()=>Array.from(new Uint8Array(await(await fetch(document.querySelector('#capture').src)).arrayBuffer())));
const pixels=()=>page.evaluate(async()=>{const im=await createImageBitmap(await(await fetch(document.querySelector('#capture').src)).blob());const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);return{w:c.width,h:c.height,corner:[...x.getImageData(0,0,1,1).data],edge:[...x.getImageData(48,48,1,1).data],center:[...x.getImageData(200,120,1,1).data]}});
await ready();const original=await bytes();assert.equal((await pixels()).w,400);await slide('radius',32);assert.equal((await pixels()).corner[3],0);
await page.getByRole('tab',{name:'Color',exact:true}).click();await ready();let p=await pixels();assert.equal(p.w,496);assert.equal(p.h,336);assert.deepEqual(p.corner,[213,233,223,255]);assert.deepEqual(p.edge,p.corner);
await page.getByRole('button',{name:'Rose',exact:true}).click();await ready();assert.notDeepEqual((await pixels()).corner,p.corner);
await page.getByRole('tab',{name:'Gradient',exact:true}).click();await ready();const before=await bytes();await slide('angle',45);assert.notDeepEqual(await bytes(),before);
await page.getByRole('tab',{name:'Image',exact:true}).click();await ready();assert.equal(await page.locator('[data-wallpaper], #image-zoom, #background-zoom, #zoom-blur, #connect-zooms').count(),0);
assert.match(await page.locator('#upload-name').textContent(),/No image uploaded/);assert.equal((await pixels()).corner[3],0);
const uploaded=Buffer.from((await page.evaluate(()=>fixtureData)).split(',')[1],'base64');await page.locator('#wallpaper-file').setInputFiles({name:'wallpaper.png',mimeType:'image/png',buffer:uploaded});await ready();assert.equal(await page.locator('#upload-name').textContent(),'wallpaper.png');assert.equal((await pixels()).corner[3],255);
const sharp=await bytes();await slide('blur',16);assert.notDeepEqual(await bytes(),sharp);
await slide('shadow',67);await slide('padding',35);await slide('radius',12);
// Copy during a deliberately slow render must wait for the current image, not the previous blob.
await page.evaluate(()=>{globalThis.renderDelay=160;globalThis.copyDelay=250});await page.locator('#radius').fill('44');await page.locator('#copy').click();
assert.equal(await page.locator('#radius').isDisabled(),true);assert.equal(await page.locator('#copy').isDisabled(),true);
await page.locator('#copy').dispatchEvent('click');await page.waitForFunction(()=>document.querySelector('#notice').textContent==='Copied current screenshot.');
assert.equal(await page.evaluate(()=>copyCount),1);assert.deepEqual(await page.evaluate(async()=>Array.from(new Uint8Array(await copied.arrayBuffer()))),await bytes());
assert.equal(await page.locator('#radius').isDisabled(),false);
// A second edit/copy cycle must replace the first image.
const firstCopy=await bytes();await page.evaluate(()=>{globalThis.renderDelay=80;globalThis.copyDelay=0});await page.locator('#padding').fill('45');await page.locator('#copy').click();await page.waitForFunction(()=>copyCount===2&&document.querySelector('#notice').textContent==='Copied current screenshot.');assert.notDeepEqual(await bytes(),firstCopy);assert.deepEqual(await page.evaluate(async()=>Array.from(new Uint8Array(await copied.arrayBuffer()))),await bytes());
const downloading=page.waitForEvent('download');await page.locator('#download').click();const download=await downloading;assert.deepEqual(Array.from(fs.readFileSync(await download.path())),await bytes());
// Failure never claims clipboard success, and the user can retry.
await page.evaluate(()=>globalThis.copyFail=true);await page.locator('#copy').click();await page.waitForFunction(()=>document.querySelector('#notice').textContent.startsWith('Copy failed.'));assert.equal(await page.locator('#copy').isDisabled(),false);await page.evaluate(()=>globalThis.copyFail=false);
// Firefox native adapter receives the identical current PNG bytes.
await page.evaluate(()=>{kakomiAPI.clipboard={setImageData:async data=>{globalThis.nativeCopy=Array.from(new Uint8Array(data))}}});await page.locator('#copy').click();await page.waitForFunction(()=>globalThis.nativeCopy);assert.deepEqual(await page.evaluate(()=>nativeCopy),await bytes());
await page.locator('#reset').click();await ready();assert.deepEqual(await bytes(),original);
await page.getByRole('tab',{name:'Gradient',exact:true}).click();await slide('padding',25);await slide('radius',12);await slide('shadow',67);await page.screenshot({path:'tests/artifacts/editor-check.png',fullPage:true});
await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.deepEqual(errors,[]);console.log('PASS: upload-only Image, no zoom controls, tabs, solids, gradients, background blur, percent padding, rounded alpha, serialized current-render copy, overlapping click guard, repeat copy, clipboard failure/retry, Firefox adapter, exact PNG download, upload, lossless reset, narrow layout.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
