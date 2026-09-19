const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
let objectURL,sourceImage,originalBlob,exportBlob,customImage;
let revision=0,renderedRevision=-1,fileRevision=0,timer,pending,copying=false,uploading=false,baseNotice='';
let selectedTab='image',wallpaper='coast',useCustom=false,customName='';
const defaults={'solid-color':'#d5e9df','gradient-start':'#ffba93','gradient-end':'#8e73d9',angle:'135',blur:'0','image-zoom':'100','background-zoom':'100','zoom-blur':'0',padding:'0',radius:'0',shadow:'0'};
const resetGroups={background:['solid-color','gradient-start','gradient-end','angle','blur'],zoom:['image-zoom','background-zoom','zoom-blur'],frame:['padding','radius','shadow']};
function options(){return{background:$('remove-background').checked?'none':selectedTab==='image'?(useCustom?'custom':'wallpaper'):selectedTab==='color'?'solid':'gradient',color:$('solid-color').value,colors:[$('gradient-start').value,$('gradient-end').value],angle:+$('angle').value,wallpaper,padding:+$('padding').value,radius:+$('radius').value,shadow:+$('shadow').value,blur:+$('blur').value,imageZoom:+$('image-zoom').value,backgroundZoom:+$('background-zoom').value,zoomBlur:+$('zoom-blur').value}}
function updateControls(){
 for(const id of ['angle','blur','image-zoom','background-zoom','zoom-blur','padding','radius','shadow']){const el=$(id),unit=id==='angle'?'°':['blur','radius'].includes(id)?' px':'%';$(id+'-value').value=el.value+unit;el.parentElement.style.setProperty('--fill',((+el.value-+el.min)/(+el.max-+el.min)*100)+'%')}
 for(const tab of ['image','color','gradient']){const active=tab===selectedTab;$(tab+'-tab').setAttribute('aria-selected',String(active));$(tab+'-tab').tabIndex=active?0:-1;$(tab+'-panel').hidden=!active}
 document.querySelectorAll('[data-wallpaper]').forEach(b=>b.setAttribute('aria-pressed',String(!useCustom&&b.dataset.wallpaper===wallpaper)));
 document.querySelectorAll('[data-color]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.color===$('solid-color').value)));
 document.querySelectorAll('[data-gradient]').forEach(b=>b.setAttribute('aria-pressed',String(KakomiCompose.palettes[b.dataset.gradient].join()===[$('gradient-start').value,$('gradient-end').value].join())));
 $('upload-name').textContent=useCustom?customName:'Original wallpapers · '+KakomiCompose.wallpapers.find(x=>x[0]===wallpaper)[1];
}
function setBusy(busy){$('download').setAttribute('aria-disabled',String(busy));if(busy)$('download').removeAttribute('href');else $('download').href=objectURL;$('stage').setAttribute('aria-busy',String(busy));$('copy').disabled=copying||uploading}
function scheduleRender(){revision++;clearTimeout(timer);updateControls();setBusy(true);timer=setTimeout(()=>flushRender().catch(showError),80)}
function showError(e){$('notice').textContent=e.message;$('stage').setAttribute('aria-busy','false')}
async function render(token){
 const o=options();let blob=originalBlob,w=sourceImage.naturalWidth,h=sourceImage.naturalHeight;
 if(o.background!=='none'||o.padding||o.radius||o.shadow||o.imageZoom!==100){const c=KakomiCompose.render(sourceImage,o,customImage);w=c.width;h=c.height;blob=await new Promise((resolve,reject)=>c.toBlob(b=>b?resolve(b):reject(Error('Could not export this image. Reduce padding and try again.')),'image/png'))}
 if(token!==revision)return;
 const nextURL=URL.createObjectURL(blob),decoded=new Image();decoded.src=nextURL;
 try{await decoded.decode()}catch(e){URL.revokeObjectURL(nextURL);throw e}
 if(token!==revision){URL.revokeObjectURL(nextURL);return}
 const old=objectURL;objectURL=nextURL;exportBlob=blob;$('capture').src=nextURL;
 $('dimensions').textContent=`${w} × ${h} PX · PNG`;renderedRevision=token;setBusy(false);if(!copying)$('notice').textContent=baseNotice;if(old)URL.revokeObjectURL(old);
}
async function flushRender(){
 clearTimeout(timer);
 if(uploading)throw Error('Wait for the background image to finish loading.');
 while(renderedRevision!==revision){const token=revision;if(!pending||pending.token!==token)pending={token,promise:render(token)};try{await pending.promise}catch(e){if(token===revision)throw e}}
 return exportBlob;
}
function enableBackground(){ $('remove-background').checked=false;if(+$('padding').value===0)$('padding').value='20' }
function selectTab(tab){selectedTab=tab;enableBackground();scheduleRender()}
function buildPresets(){
 for(const [id,name] of KakomiCompose.wallpapers){const b=document.createElement('button');b.type='button';b.className='tile';b.dataset.wallpaper=id;b.title=name;b.setAttribute('aria-label',name);const img=new Image();img.src=KakomiCompose.thumbnail(id);img.alt='';b.append(img);b.addEventListener('click',()=>{wallpaper=id;useCustom=false;enableBackground();scheduleRender()});$('wallpapers').append(b)}
 const colors=[['Mint','#d5e9df'],['Sand','#f0e5d7'],['Lavender','#dde3fa'],['White','#ffffff'],['Charcoal','#20252c'],['Rose','#f4cbd5'],['Blue','#abc5f5'],['Peach','#f5ceb1'],['Lime','#cde7ac'],['Indigo','#4c5295'],['Black','#101014'],['Cream','#fffae8'],['Teal','#4c9b96'],['Amber','#e9b15c'],['Berry','#934f76'],['Slate','#748895']];
 for(const [name,color] of colors){const b=document.createElement('button');b.type='button';b.className='tile';b.dataset.color=color;b.style.setProperty('--swatch',color);b.title=name;b.setAttribute('aria-label',name);b.addEventListener('click',()=>{$('solid-color').value=color;enableBackground();scheduleRender()});$('colors').append(b)}
 for(const [name,colors] of Object.entries(KakomiCompose.palettes)){const b=document.createElement('button');b.type='button';b.className='tile';b.dataset.gradient=name;b.title=name;b.setAttribute('aria-label',name);b.style.background=`linear-gradient(135deg,${colors.join(',')})`;b.addEventListener('click',()=>{$('gradient-start').value=colors[0];$('gradient-end').value=colors[1];enableBackground();scheduleRender()});$('gradients').append(b)}
}
function reset(group){
 for(const id of group?resetGroups[group]:Object.keys(defaults))$(id).value=defaults[id];
 if(!group||group==='background'){selectedTab='image';wallpaper='coast';useCustom=false;customName='';fileRevision++;uploading=false;customImage?.close();customImage=null;$('wallpaper-file').value='';$('remove-background').checked=true}
 if(!group||group==='zoom')$('connect-zooms').checked=true;
 scheduleRender();
}
async function copyImage(){
 if(copying||uploading)return;
 copying=true;$('edit-controls').disabled=true;$('copy').disabled=true;$('copy').textContent='Copying…';$('notice').textContent='Preparing clipboard…';
 try{
  // Pass the fresh render as a promise to preserve the click's user activation.
  // Serialize writes and freeze edits until the OS clipboard confirms completion.
  const latest=flushRender();latest.catch(()=>{});
  if(kakomiAPI.clipboard?.setImageData){const b=await latest;await kakomiAPI.clipboard.setImageData(await b.arrayBuffer(),'png')}
  else{const item=new ClipboardItem({'image/png':latest});await navigator.clipboard.write([item])}
  $('notice').textContent='Copied current screenshot.';
 }catch(e){$('notice').textContent='Copy failed. '+(e.message||'Use Download PNG instead.')}
 finally{copying=false;$('edit-controls').disabled=false;$('copy').disabled=uploading;$('copy').textContent='Copy image'}
}
async function init(){
 if(params.has('error')){$('empty-title').textContent='This page is protected by your browser.';$('empty-message').textContent='Try a regular website. Browser settings and add-on stores do not support the picker.';return}
 const id=params.get('id');if(!id)return;const record=(await kakomiAPI.storage.session.get(id))[id];
 if(!record){$('empty-title').textContent='This preview has expired.';$('empty-message').textContent='Capture the element again. Previews are temporary; download your PNG to keep it.';return}
 originalBlob=await(await fetch(record.data)).blob();sourceImage=new Image();const url=URL.createObjectURL(originalBlob);try{sourceImage.src=url;await sourceImage.decode()}finally{URL.revokeObjectURL(url)}
 $('element').textContent=record.label;$('source').textContent=record.title;$('source').title=record.title;$('download').download=`kakomi-${new Date(record.created).toISOString().replace(/[:.]/g,'-')}.png`;
 if(record.clipped)baseNotice='Visible portion captured. The selected element extends beyond its visible boundary.';
 if(params.has('copyFailed'))baseNotice='Automatic copying was blocked. Copy or download this screenshot here.';
 buildPresets();updateControls();await flushRender();$('capture').hidden=false;$('empty').hidden=true;$('download').hidden=false;$('copy').hidden=false;$('editor').hidden=false;
 document.querySelectorAll('[data-tab]').forEach(b=>{b.addEventListener('click',()=>selectTab(b.dataset.tab));b.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tabs=['image','color','gradient'],i=tabs.indexOf(selectedTab),j=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;selectTab(tabs[j]);$(tabs[j]+'-tab').focus()})});
 $('edit-controls').addEventListener('input',e=>{const id=e.target.id;if(id==='wallpaper-file')return;if(['image-zoom','background-zoom'].includes(id)&&$('connect-zooms').checked)$(id==='image-zoom'?'background-zoom':'image-zoom').value=e.target.value;if(id==='connect-zooms'&&e.target.checked)$('background-zoom').value=$('image-zoom').value;if(['solid-color','gradient-start','gradient-end','angle'].includes(id))enableBackground();scheduleRender()});
 document.querySelectorAll('[data-reset]').forEach(b=>b.addEventListener('click',()=>reset(b.dataset.reset)));$('reset').addEventListener('click',()=>reset());$('upload').addEventListener('click',()=>$('wallpaper-file').click());
 $('wallpaper-file').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;const token=++fileRevision;uploading=true;revision++;clearTimeout(timer);setBusy(true);let failure;
  try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>20*1024*1024)throw Error('Choose a PNG, JPEG or WebP smaller than 20 MB.');const bitmap=await createImageBitmap(file);if(token!==fileRevision){bitmap.close();return}if(bitmap.width*bitmap.height>64000000){bitmap.close();throw Error('Choose a background smaller than 64 megapixels.')};customImage?.close();customImage=bitmap;customName=file.name;useCustom=true;selectedTab='image';enableBackground()}
  catch(error){if(token===fileRevision){failure=error;e.target.value=''}}
  finally{if(token===fileRevision){uploading=false;scheduleRender();if(failure)flushRender().then(()=>showError(failure),showError)}}
 });
 $('copy').addEventListener('click',copyImage);$('download').addEventListener('click',e=>{if($('download').getAttribute('aria-disabled')==='true')e.preventDefault()});
}
init().catch(e=>{$('empty-title').textContent='The preview could not be loaded.';$('empty-message').textContent=e.message});
window.addEventListener('pagehide',()=>{revision++;fileRevision++;clearTimeout(timer);if(objectURL)URL.revokeObjectURL(objectURL);customImage?.close()});
