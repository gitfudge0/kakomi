const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
fs.mkdirSync('tests/artifacts', {recursive:true});
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
 const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
 try {
 const page = await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror', e=>errors.push(e.message));
 await page.addInitScript(() => {
  const c = document.createElement('canvas'); c.width=400;c.height=240;
  const x=c.getContext('2d');x.fillStyle='#e9f0f7';x.fillRect(0,0,400,240);x.fillStyle='#24543e';x.fillRect(24,24,352,60);x.fillStyle='#ffffff';x.font='24px sans-serif';x.fillText('Project overview',40,63);x.fillStyle='#97b8ac';x.fillRect(24,108,160,108);x.fillRect(208,108,168,44);x.fillRect(208,172,168,44);
  globalThis.fixtureData=c.toDataURL();
  globalThis.chrome={storage:{session:{get:async id=>({[id]:{data:fixtureData,width:400,height:240,label:'section#overview',title:'Project overview',created:Date.now()}})}}};
  Object.defineProperty(navigator,'clipboard',{value:{write:async items=>{globalThis.copied=await items[0].getType('image/png')}}});
 });
 await page.goto(pathToFileURL(path.resolve('src/preview.html')).href+'?id=editor');
 await page.locator('#editor').waitFor({state:'visible'});
 const ready=()=>page.waitForFunction(()=>document.querySelector('#download').getAttribute('aria-disabled')==='false');
 const slide=async(id,v)=>{await page.locator('#'+id).fill(String(v));await ready();};
 const pixels=()=>page.evaluate(async()=>{const b=await(await fetch(document.querySelector('#capture').src)).blob();const im=await createImageBitmap(b);const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);return {w:c.width,h:c.height,corner:[...x.getImageData(0,0,1,1).data],edge:[...x.getImageData(64,64,1,1).data],center:[...x.getImageData(c.width/2,c.height/2,1,1).data]}});
 await ready();assert.equal((await pixels()).w,400);
 await slide('radius',40);assert.equal((await pixels()).corner[3],0);
 await page.selectOption('#background','solid');await ready();
 let p=await pixels();assert.equal(p.w,528);assert.equal(p.h,368);assert.deepEqual(p.corner,[213,233,223,255]);assert.deepEqual(p.edge,p.corner);
 await slide('padding',80);assert.equal((await pixels()).w,560);
 await page.selectOption('#background','gradient');await ready();assert.notDeepEqual((await pixels()).corner,p.corner);
 for(const name of ['coast','dunes','aurora']){await page.selectOption('#background','wallpaper');await page.selectOption('#wallpaper',name);await ready();assert.equal((await pixels()).corner[3],255);}
 await slide('shadow',50);
 await page.locator('#copy').click();await page.waitForFunction(()=>globalThis.copied);
 assert.equal(await page.evaluate(async()=>{const a=new Uint8Array(await copied.arrayBuffer()),b=new Uint8Array(await(await fetch(document.querySelector('#capture').src)).arrayBuffer());return a.length===b.length&&a.every((v,i)=>v===b[i])}),true);
 const pending=page.waitForEvent('download');await page.locator('#download').click();const download=await pending;
 const downloadPath=await download.path();assert.ok(fs.statSync(downloadPath).size>0);
 await page.screenshot({path:'tests/artifacts/editor-check.png',fullPage:true});
 await page.selectOption('#background','custom');await page.waitForFunction(()=>document.querySelector('#notice').textContent.includes('Choose a background'));
 assert.equal(await page.locator('#copy').isDisabled(),true);
 const uploaded=Buffer.from((await page.evaluate(()=>fixtureData)).split(',')[1],'base64');
 await page.locator('#wallpaper-file').setInputFiles({name:'wallpaper.png',mimeType:'image/png',buffer:uploaded});await ready();assert.equal((await pixels()).w,560);
 await page.locator('#reset').click();await ready();p=await pixels();assert.equal(p.w,400);assert.equal(p.h,240);assert.equal(p.corner[3],255);
 assert.equal(await page.evaluate(async()=>{const a=await(await fetch(fixtureData)).text(),b=await(await fetch(document.querySelector('#capture').src)).text();return a===b}),true);
 await page.locator('#radius').fill('40');await page.locator('#radius').fill('0');await ready();assert.equal((await pixels()).corner[3],255);
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(errors,[]);
 console.log('PASS: rounded transparency, exact padding dimensions, solid/gradient/wallpaper backgrounds, shadow rendering, styled clipboard bytes, PNG download, custom image, reset, rapid changes, narrow layout.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
