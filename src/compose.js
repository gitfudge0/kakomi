// Locally generated original wallpapers and shared PNG composition.
globalThis.KakomiCompose = (() => {
 const palettes={dawn:['#ffba93','#8e73d9'],ocean:['#69e4dd','#3454ac'],orchid:['#e8a4ec','#5148a8'],forest:['#d3e9ba','#22796d'],sunset:['#ffac48','#ba3261'],ice:['#e0f4ff','#4389af'],night:['#222750','#815fb8'],rose:['#ffd6d6','#b4789e']};
 const wallpapers=[
 ['coast','Coastal light','#fee2b5','#e28d8a','#244969',0],['dunes','Desert dusk','#f6c575','#b45667','#34284e',1],['aurora','Aurora','#071535','#33bb9a','#5d40a4',2],['ribbon','Amber ribbon','#ed7723','#a21f35','#141e42',3],
 ['tide','Blue tide','#66d6ef','#2757a1','#151549',0],['peach','Peach silk','#ffd5a8','#f48186','#733a89',3],['twilight','Twilight','#bd689a','#504899','#12214a',1],['petal','Petal','#f6a3d1','#a350b5','#313773',2],
 ['alpine','Alpine','#cde7ea','#58a5a7','#164948',1],['lagoon','Lagoon','#acd8c0','#3bafb6','#183b76',0],['ember','Ember','#ffd572','#d44a39','#552f61',2],['glacier','Glacier','#d6f5f4','#58bdd7','#4f5b9d',3],
 ['moss','Moss','#ced793','#6a9365','#263e48',1],['cobalt','Cobalt','#b2d0ff','#5285f5','#25286e',2],['canyon','Canyon','#ffc795','#ce7853','#7a4362',0],['iris','Iris','#e4b9ff','#897acb','#323c7c',3],
 ['sand','Sand','#f2e3be','#c8ad82','#937a71',1],['mint','Mint folds','#d1ffe2','#5bbda5','#255864',3],['solar','Solar','#ffd473','#f98b65','#d34975',0],['midnight','Midnight','#2d5088','#26294e','#101728',2],
 ['lilac','Lilac mist','#f1dcf5','#baabd8','#727fac',0],['sage','Sage','#d7e7d7','#94b8ae','#4c7681',1],['coral','Coral','#ffe6cc','#eb9c8c','#9c698a',3],['arctic','Arctic','#eaf7fc','#9cc7d2','#43788c',2]
 ];
 function gradient(ctx,w,h,colors,angle=135){const a=angle*Math.PI/180,dx=Math.cos(a),dy=Math.sin(a),l=Math.abs(w*dx)+Math.abs(h*dy);const g=ctx.createLinearGradient(w/2-dx*l/2,h/2-dy*l/2,w/2+dx*l/2,h/2+dy*l/2);colors.forEach((c,i)=>g.addColorStop(i/(colors.length-1),c));return g}
 function wallpaper(ctx,w,h,name){
  const p=wallpapers.find(x=>x[0]===name)||wallpapers[0],colors=p.slice(2,5),kind=p[5];
  ctx.fillStyle=gradient(ctx,w,h,colors,80);ctx.fillRect(0,0,w,h);
  for(let i=0;i<5;i++){
   const y=h*(.2+i*.15);ctx.beginPath();
   if(kind===1){ctx.moveTo(0,y+h*.35);ctx.lineTo(w*.22,y-h*.07);ctx.lineTo(w*.48,y+h*.16);ctx.lineTo(w*.72,y-h*.19);ctx.lineTo(w,y+h*.12)}
   else if(kind===2){ctx.moveTo(0,h);ctx.bezierCurveTo(w*(.1+i*.08),-h*.4,w*(.4+i*.06),h*1.3,w,y-h*.22)}
   else if(kind===3){ctx.moveTo(0,y);ctx.bezierCurveTo(w*.7,y-h*.6,w*.15,y+h*.8,w,y+h*.1)}
   else{ctx.moveTo(0,y+h*.22);ctx.bezierCurveTo(w*.28,y-h*.4,w*.52,y+h*.35,w,y-h*.12)}
   ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();ctx.fillStyle=gradient(ctx,w,h,[colors[i%3],colors[(i+1)%3]],40+i*33);ctx.fill();
  }
 }
 const clamp=(n,low,high)=>Math.max(low,Math.min(high,Number(n)||0));
 function render(source,o,custom){
  const w=source.naturalWidth||source.width,h=source.naturalHeight||source.height;
  const pad=Math.round(Math.min(w,h)*clamp(o.padding,0,100)/100),width=w+2*pad,height=h+2*pad;
  if(width>32767||height>32767||width*height>32000000)throw Error('This image is too large to style. Reduce padding or capture a smaller area.');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Could not create the image.');
  if(o.background!=='none'){
   const scale=Math.min(1,1600/Math.max(width,height));const bg=document.createElement('canvas');bg.width=Math.max(1,Math.round(width*scale));bg.height=Math.max(1,Math.round(height*scale));const b=bg.getContext('2d'),bw=bg.width,bh=bg.height;
   if(o.background==='solid'){b.fillStyle=o.color;b.fillRect(0,0,bw,bh)}
   if(o.background==='gradient'){b.fillStyle=gradient(b,bw,bh,o.colors,o.angle);b.fillRect(0,0,bw,bh)}
   if(o.background==='wallpaper')wallpaper(b,bw,bh,o.wallpaper);
   if(o.background==='custom'){if(!custom)throw Error('Choose a background image first.');const z=Math.max(bw/custom.width,bh/custom.height);b.drawImage(custom,(bw-custom.width*z)/2,(bh-custom.height*z)/2,custom.width*z,custom.height*z)}
   // Overscan keeps blur edges filled; zoom below 100% never leaves blank edges.
   const blur=clamp(o.blur,0,40),z=Math.max(1,clamp(o.backgroundZoom||100,50,250)/100),extra=blur*3;
   ctx.save();ctx.filter=`blur(${blur}px)`;ctx.drawImage(bg,(width-width*z)/2-extra,(height-height*z)/2-extra,width*z+extra*2,height*z+extra*2);ctx.restore();
   const motion=clamp(o.zoomBlur,0,100)/100;
   if(motion){ctx.save();ctx.filter=`blur(${blur}px)`;for(let i=1;i<=12;i++){const k=z*(1+motion*.4*i/12);ctx.globalAlpha=1/(i+1);ctx.drawImage(bg,(width-width*k)/2-extra,(height-height*k)/2-extra,width*k+extra*2,height*k+extra*2)}ctx.restore()}
  }
  const zoom=clamp(o.imageZoom||100,50,200)/100,dw=w*zoom,dh=h*zoom,x=(width-dw)/2,y=(height-dh)/2;
  const radius=clamp(o.radius,0,Math.min(dw,dh)/2),shadow=clamp(o.shadow,0,100)/100;
  const outline=()=>{ctx.beginPath();ctx.roundRect(x,y,dw,dh,radius)};
  if(shadow){ctx.save();ctx.shadowColor=`rgba(0,0,0,${shadow*.6})`;ctx.shadowBlur=40*shadow;ctx.shadowOffsetY=16*shadow;ctx.beginPath();ctx.rect(0,0,width,height);ctx.roundRect(x,y,dw,dh,radius);ctx.clip('evenodd');outline();ctx.fillStyle='#000';ctx.fill();ctx.restore()}
  ctx.save();outline();ctx.clip();ctx.drawImage(source,x,y,dw,dh);ctx.restore();return canvas;
 }
 function thumbnail(name){const c=document.createElement('canvas');c.width=80;c.height=80;wallpaper(c.getContext('2d'),80,80,name);return c.toDataURL()}
 return{render,palettes,wallpapers,thumbnail};
})();
